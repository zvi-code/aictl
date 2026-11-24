"""Full request diagnostics for failed Kusto SDK calls."""

from __future__ import annotations

import logging
from collections.abc import Iterator
from typing import Any

log = logging.getLogger(__name__)


def _causes(error: BaseException | None) -> Iterator[BaseException]:
    seen: set[int] = set()
    while error is not None and id(error) not in seen:
        seen.add(id(error))
        yield error
        error = error.__cause__ or error.__context__


def log_failure(
    error: Exception,
    *,
    cluster: str,
    database: str,
    operation: str,
    kql: str | None = None,
    request: str | None = None,
    response: Any = None,
    client_request_id: str | None = None,
    elapsed_s: float | None = None,
) -> None:
    """Log the unabridged response body, not the SDK's shortened error message."""
    causes = list(_causes(error))
    for cause in causes:
        raw = getattr(cause, "http_response", None)
        if raw is None:
            raw = getattr(cause, "response", None)
        if raw is not None:
            response = raw
            break
    status = getattr(response, "status_code", None)
    if response is not None:
        try:
            text = getattr(response, "text", None)
            body = text() if callable(text) else text
            if body is None:
                body = repr(getattr(response, "content", None))
        except Exception as read_error:  # noqa: BLE001 - diagnostics must not replace the original request failure
            log.warning("Could not read the failed Kusto response body", exc_info=True)
            body = f"Response body unavailable: {type(read_error).__name__}: {read_error}"
    else:
        body = "No HTTP response was received or exposed by the SDK."
        for cause in causes:
            partial = getattr(cause, "kusto_response", None)
            if partial is not None:
                body += f"\nSDK partial response (not raw HTTP): {partial!r}"
    log.error(
        "Kusto %s failed\nCluster: %s\nDatabase: %s\nClient request ID: %s\nElapsed: %s\n%s\n"
        "HTTP status: %s\nResponse body:\n%s",
        operation,
        cluster,
        database,
        client_request_id or "unavailable",
        f"{elapsed_s:.3f} s" if elapsed_s is not None else "unavailable",
        f"KQL:\n{kql}" if kql is not None else f"Request (no KQL):\n{request}",
        status if status is not None else "unavailable",
        body,
        exc_info=(type(error), error, error.__traceback__),
    )


def log_memory_refusal(*, cluster: str, database: str, client_request_id: str | None, elapsed_s: float) -> None:
    """One line for a query the cluster refused for lack of memory (E_LOW_MEMORY_CONDITION, a memory budget).

    The refusal says how loaded the cluster is, not that the request is wrong: its caller repeats it in smaller
    parts or reports a narrower read. The client request ID finds the query in ``.show queries``."""
    log.warning(
        "Kusto had no memory for a query after %.3f s; the reader repeats it in smaller parts. "
        "Cluster: %s, database: %s, client request ID: %s",
        elapsed_s, cluster, database, client_request_id or "unavailable",
    )
