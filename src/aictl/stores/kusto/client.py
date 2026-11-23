"""Kusto client connections, retries and result conversion."""

from __future__ import annotations

import contextlib
import json
import logging
import math
import threading
import time
from collections.abc import Callable, Iterator, Mapping
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from ...kusto import KustoSettings
    from .ingest import RowIngester
    from .recorded import RecordedKustoClient

QUERY_TIMEOUT = timedelta(seconds=60)
ROWID = "rowid"
VERSION = "_v"


def quote(name: str) -> str:
    """Quote a Kusto identifier."""
    return "['" + name.replace("\\", "\\\\").replace("'", "\\'") + "']"


def _server_message(exc: BaseException) -> str:
    return str(getattr(exc, "message_text", "") or exc)


# A small cluster throttles (HTTP 429) when ingestion commands or queries arrive
# faster than it takes them, and streaming ingestion into a table created moments
# ago can fail inside the service (a 5xx whose error says ``@permanent: false``,
# such as a RowStore "trimmable stream" exception) until its row store is ready.
# Either request is sound and succeeds a little later; wait up to about a minute.
log = logging.getLogger(__name__)
RETRY_DELAYS_S = (0.5, 1.0, 2.0, 4.0, 8.0, 15.0, 30.0)
RETRY_BUDGET_S = 60.0


def _throttled(exc: BaseException) -> bool:
    if type(exc).__name__ == "KustoThrottlingError":
        return True
    response = getattr(exc, "http_response", None)
    status = getattr(response, "status_code", None)
    return status in (429, 503) or "throttled" in str(exc).lower()


def _api_errors(exc: BaseException) -> list:
    errors = []
    for getter in ("get_api_error", "get_api_errors"):
        fn = getattr(exc, getter, None)
        if callable(fn):
            try:
                got = fn()
            except Exception:  # noqa: BLE001 - a malformed error body is not a reason to retry
                got = None
            errors.extend(got if isinstance(got, list) else [got] if got is not None else [])
    return errors


def query_memory_error(exc: BaseException) -> bool:
    parts = [str(exc), _server_message(exc)]
    for error in _api_errors(exc):
        parts.extend(str(getattr(error, attr, "")) for attr in ("code", "description", "message"))
    return any(marker in part.lower() for part in parts for marker in (
        "e_low_memory_condition", "lowmemorycondition", "e_runaway_query", "memory budget", "80da0007",
    ))


def _transient(exc: BaseException) -> bool:
    """Whether the service itself says the request may succeed when repeated."""
    if _throttled(exc):
        return True
    if type(exc).__name__ == "KustoAuthenticationError" and "failed to invoke the azure cli" in str(exc).lower():
        return True
    permanence = [e.permanent for e in _api_errors(exc) if getattr(e, "permanent", None) is not None]
    if permanence:
        return not all(permanence)
    response = getattr(exc, "http_response", None)
    status = getattr(response, "status_code", None)
    if status is not None:
        return status >= 500
    return type(exc).__name__ == "KustoNetworkError"


def schema_cache_behind(exc: BaseException) -> bool:
    """Whether streaming ingestion answered that a table the database has does not exist.

    Each engine node caches the schemas it streams into. For up to a minute and a half
    after ``.create-merge table`` a node may still answer HTTP 400
    ``BadRequest_EntityNotFound`` for the new table; ``ensure_schema`` clears that cache,
    and a request that still meets a stale node succeeds when repeated.
    """
    return "BadRequest_EntityNotFound" in _server_message(exc) or "BadRequest_EntityNotFound" in str(exc)


def retrying(
    call: Callable[[], Any],
    what: str,
    also: Callable[[BaseException], bool] | None = None,
    *,
    delays: tuple[float, ...] | None = None,
    budget: float | None = None,
    stop: Callable[[BaseException], bool] | None = None,
) -> Any:
    """Run *call*, waiting out throttling and transient service errors before giving up.

    *also* names a failure that is worth repeating for this call only, on top of what
    the service itself marks as transient. *stop* vetoes retries even for those failures.
    Time spent in failed requests consumes
    the retry budget too; an individual request is bounded by its SDK timeout.
    """
    deadline = time.monotonic() + (RETRY_BUDGET_S if budget is None else budget)
    for attempt, delay in enumerate(RETRY_DELAYS_S if delays is None else delays):
        try:
            return call()
        except Exception as exc:  # noqa: BLE001 - only a transient failure is retried; the rest is raised below
            if stop is not None and stop(exc):
                raise
            if not _transient(exc) and not (also is not None and also(exc)):
                raise
            if time.monotonic() + delay >= deadline:
                raise
            # The first failure and the long waits are shown: a start that is slow because
            # the cluster keeps refusing rows must say so in the log.
            say = log.warning if attempt == 0 or delay >= 8 else log.debug
            say(
                "Kusto %s failed transiently (%s); retrying in %.1f s",
                what,
                (_server_message(exc).splitlines() or [type(exc).__name__])[0][:160],
                delay,
            )
            time.sleep(delay)
            if time.monotonic() >= deadline:
                raise
    return call()


_version_lock = threading.Lock()
_last_version_us = 0

def next_version() -> str:
    """A ``_v`` value: now in UTC, strictly later than the last one this process wrote.

    A read keeps the version with the largest ``_v``; two versions of a key written
    in one batch must not tie, or the cluster would pick either.
    """
    global _last_version_us
    with _version_lock:
        us = max(int(time.time() * 1_000_000), _last_version_us + 1)
        _last_version_us = us
    stamp = datetime.fromtimestamp(us // 1_000_000, tz=timezone.utc).replace(microsecond=us % 1_000_000, tzinfo=None)
    return stamp.isoformat(timespec="microseconds") + "Z"


def coerce(value: object, kusto_type: str) -> object:
    """A value for a column of *kusto_type*, converted the way SQLite's type affinity would.

    Kusto drops a JSON value of the wrong type to null, where SQLite would have kept
    it; converting first keeps ``True`` in an INTEGER column as 1 and 5 in a TEXT
    column as ``'5'``.
    """
    if value is None:
        return None
    if kusto_type == "string":
        if isinstance(value, str):
            return value
        if isinstance(value, bool):
            return str(int(value))
        if isinstance(value, (bytes, bytearray, memoryview)):
            return bytes(value).decode("utf-8", errors="replace")
        if isinstance(value, float):
            return repr(value)
        if isinstance(value, (dict, list, tuple)):
            return json.dumps(value)
        return str(value)
    if kusto_type == "long":
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                try:
                    f = float(value)
                except ValueError:
                    return value
                return int(f) if f.is_integer() else f
        return value
    if kusto_type == "real":
        if isinstance(value, (bool, int)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return value
        return value
    if kusto_type == "bool":
        return bool(value)
    return value


def kql_literal(value: object, kusto_type: str) -> str:
    """A KQL literal of *kusto_type*. A JSON string literal is a valid KQL string, escapes included."""
    value = coerce(value, kusto_type)
    if kusto_type == "string":
        return json.dumps("" if value is None else str(value))
    if value is None:
        return f"{kusto_type}(null)"
    if kusto_type == "bool":
        return "true" if value else "false"
    if kusto_type == "datetime":
        if isinstance(value, (int, float)):
            value = datetime.fromtimestamp(value, tz=timezone.utc)
        if isinstance(value, datetime):
            if value.tzinfo is not None:
                value = value.astimezone(timezone.utc).replace(tzinfo=None)
            value = value.isoformat() + "Z"
        return f"datetime({value})"
    if kusto_type == "long" and isinstance(value, int):
        return f"long({value})"
    if isinstance(value, (int, float)):
        f = float(value)
        if math.isnan(f):
            return "real(nan)"
        if math.isinf(f):
            return "real(+inf)" if f > 0 else "real(-inf)"
        return f"real({f!r})" if kusto_type == "real" else f"{kusto_type}({f!r})"
    # Text in a numeric column: Kusto parses it or yields null, as ingestion would.
    return f"{kusto_type}({json.dumps(str(value))})"


def to_python(value: object, kusto_type: str) -> object:
    """A Kusto result value as SQLite would have returned it."""
    if value is None:
        return None
    t = kusto_type.lower()
    if t == "dynamic":
        return json.dumps(value)
    if t == "datetime":
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value.timestamp()
        return value
    if t == "timespan":
        return value.total_seconds() if isinstance(value, timedelta) else value
    if t in ("long", "int"):
        return int(value)  # type: ignore[call-overload]
    if t in ("real", "double", "decimal"):
        return float(value)  # type: ignore[arg-type]
    if t == "bool":
        return bool(value)
    if t in ("string", "guid"):
        return str(value)
    return value


_azcli_patch_lock = threading.Lock()
_azcli_token_lock = threading.Lock()
_azcli_tokens: dict[str, Any] = {}
_azcli_patched = False
# Refresh 2 minutes before expiry (Azure CLI refreshes at ~5 minutes, so a 10-minute
# cutoff in the SDK re-spawned `az` on every request for 5 minutes straight).
_AZCLI_REFRESH_BUFFER_S = 120.0


def _ensure_azcli_token_cache() -> None:
    """Serialize Azure CLI token acquisition across threads and clients in this process."""
    global _azcli_patched
    if _azcli_patched:
        return
    with _azcli_patch_lock:
        if _azcli_patched:
            return
        try:
            from azure.kusto.data._token_providers import AzCliTokenProvider, TokenConstants
        except ImportError:
            return

        def _best_token(provider: Any) -> Any:
            scope = provider._scopes[0] if getattr(provider, "_scopes", None) else getattr(provider, "_kusto_uri", "")
            candidates = [
                t
                for t in (getattr(provider, "_az_token", None), _azcli_tokens.get(scope))
                if t is not None and getattr(t, "expires_on", 0)
            ]
            if not candidates:
                return None
            best = max(candidates, key=lambda t: t.expires_on)
            provider._az_token = best
            if scope:
                _azcli_tokens[scope] = best
            return best

        def _cached(provider: Any) -> dict[str, str] | None:
            tok = _best_token(provider)
            if tok is not None and (tok.expires_on - _AZCLI_REFRESH_BUFFER_S) > time.time():
                return {
                    TokenConstants.MSAL_TOKEN_TYPE: TokenConstants.BEARER_TYPE,
                    TokenConstants.MSAL_ACCESS_TOKEN: tok.token,
                }
            return None

        orig_get_impl = AzCliTokenProvider._get_token_impl

        def _get_token_impl(provider: Any) -> dict[str, str] | None:
            with _azcli_token_lock:
                hit = _cached(provider)
                if hit is not None:
                    return hit
                scope = (
                    provider._scopes[0] if getattr(provider, "_scopes", None) else getattr(provider, "_kusto_uri", "")
                )
                try:
                    res = orig_get_impl(provider)
                except Exception:  # noqa: BLE001 - fall back to an unexpired cached token if az CLI fails transiently
                    # If a still-unexpired token exists in memory, use it when az CLI invocation fails transiently.
                    tok = _best_token(provider)
                    if tok is not None and (tok.expires_on - 15.0) > time.time():
                        return {
                            TokenConstants.AZ_TOKEN_TYPE: TokenConstants.BEARER_TYPE,
                            TokenConstants.AZ_ACCESS_TOKEN: tok.token,
                        }
                    raise
                if getattr(provider, "_az_token", None) is not None and scope:
                    _azcli_tokens[scope] = provider._az_token
                return res

        AzCliTokenProvider._get_token_from_cache_impl = _cached
        AzCliTokenProvider._get_token_impl = _get_token_impl
        _azcli_patched = True


def connection_string(settings: KustoSettings, *, cluster: str | None = None) -> Any:
    """The SDK's connection string builder for the settings' sign-in mode."""
    from azure.kusto.data import KustoConnectionStringBuilder as K

    mode = settings.auth_mode
    endpoint = cluster if cluster is not None else settings.cluster
    if mode == "none":
        return K.with_no_authentication(endpoint)
    if mode == "azcli":
        _ensure_azcli_token_cache()
        return K.with_az_cli_authentication(endpoint)
    if mode == "device":
        return K.with_aad_device_authentication(endpoint)
    if mode == "managed-identity":
        return K.with_aad_managed_service_identity_authentication(endpoint)
    raise ValueError(f"unknown Kusto auth mode {mode!r}")


class KustoClientFactory:
    """Share query clients per destination and ingesters per destination and ingestion settings.

    The SDK clients are thread-safe and hold a connection pool and a token cache;
    one per connection would sign in again on every thread.
    """

    _lock = threading.Lock()
    _clients: dict[tuple[str, str, str], Any] = {}
    _ingesters: dict[tuple[str, str, str, str, tuple[tuple[str, str], ...]], RowIngester] = {}
    _recording: RecordedKustoClient | None = None

    @classmethod
    @contextlib.contextmanager
    def replay(cls, path: str | Path) -> Iterator[RecordedKustoClient]:
        """Use a recording instead of all network clients in this test process."""
        from .recorded import RecordedKustoClient

        recording = RecordedKustoClient(path)
        with cls._lock:
            if cls._recording is not None:
                raise RuntimeError("A Kusto recording is already active")
            cls._recording = recording
        try:
            yield recording
        finally:
            with cls._lock:
                cls._recording = None

    @staticmethod
    def key(settings: KustoSettings) -> tuple[str, str, str]:
        return (settings.cluster, settings.database, settings.auth_mode)

    @classmethod
    def client(cls, settings: KustoSettings) -> Any:
        key = cls.key(settings)
        with cls._lock:
            if cls._recording is not None:
                return cls._recording
            client = cls._clients.get(key)
            if client is None:
                from azure.kusto.data import KustoClient

                from ...health import ObservedKustoClient

                client = cls._clients[key] = ObservedKustoClient(
                    KustoClient(connection_string(settings)), cluster=settings.cluster
                )
            return client

    @classmethod
    def health_objects(cls, settings: KustoSettings) -> tuple[Any, Any]:
        """Return already-created shared clients only, without waiting for discovery."""
        key = (*cls.key(settings), settings.ingestion, tuple(sorted(settings.table_ingestion.items())))
        if not cls._lock.acquire(blocking=False):
            return None, None
        try:
            if cls._recording is not None:
                return cls._recording, cls._recording
            return cls._clients.get(cls.key(settings)), cls._ingesters.get(key)
        finally:
            cls._lock.release()

    @classmethod
    def ingester(cls, settings: KustoSettings) -> RowIngester:
        from .ingest import ingestion_capacity, make_ingester, uses_inline

        client = cls.client(settings)
        key = (*cls.key(settings), settings.ingestion, tuple(sorted(settings.table_ingestion.items())))
        with cls._lock:
            if cls._recording is not None:
                return cls._recording
            ingester = cls._ingesters.get(key)
            if ingester is None:
                slots = ingestion_capacity(client, settings.database) if uses_inline(settings) else None
                ingester = cls._ingesters[key] = make_ingester(settings, client, inline_slots=slots)
            return ingester

    @classmethod
    def native_ingester(cls, settings: KustoSettings, tables: Mapping[str, str] | None = None) -> RowIngester:
        """Use one ingestion attempt per call; the writer owns the retry budget.

        *tables* maps the logical tables the writer names to this node's physical tables.
        """
        from .ingest import InlineIngester, QueuedIngester, StreamingIngester, TableIngester

        client = cls.client(settings)
        with cls._lock:
            if cls._recording is not None:
                return cls._recording
        modes = set(settings.table_ingestion.values())
        ingesters: dict[str, RowIngester] = {}
        if "inline" in modes:
            ingesters["inline"] = InlineIngester(client, settings.database, retry=False)
        if "streaming" in modes:
            ingesters["streaming"] = StreamingIngester(settings, retry=False)
        if "queued" in modes:
            ingesters["queued"] = QueuedIngester(settings, client)
        return TableIngester(settings, ingesters, tables=tables)


class Result:
    """Column names, Kusto types and Python rows of one result table."""

    def __init__(self, names: list[str], types: list[str], rows: list[tuple[Any, ...]]):
        self.names = names
        self.types = types
        self.rows = rows

    @classmethod
    def from_response(cls, response: Any) -> Result:
        tables = getattr(response, "primary_results", None) or []
        if not tables:
            return cls([], [], [])
        table = tables[0]
        names = [c.column_name for c in table.columns]
        types = [str(c.column_type or "string") for c in table.columns]
        rows = [tuple(to_python(v, t) for v, t in zip(row, types, strict=False)) for row in table]
        return cls(names, types, rows)

    def dicts(self) -> list[dict[str, Any]]:
        return [dict(zip(self.names, r, strict=False)) for r in self.rows]
