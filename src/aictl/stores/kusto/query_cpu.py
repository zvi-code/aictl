"""Client-side totals from Kusto query responses, without extra requests."""

import json
import re
import threading
import time
from collections.abc import Callable, Mapping
from typing import Any

_TICKS_PER_SECOND = 10_000_000
_TIMESPAN = re.compile(r"(?:(\d{1,8})\.)?(\d{1,8}):([0-5]\d):([0-5]\d)(?:\.(\d{1,7}))?", re.ASCII)


def _cpu_ticks(response: Any) -> int | None:
    for table in getattr(response, "tables", ()):
        if table.table_kind != "QueryCompletionInformation":
            continue
        for row in table:
            data = row.to_dict()
            if data.get("EventTypeName") != "QueryResourceConsumption":
                continue
            payload = data.get("Payload")
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except (ValueError, RecursionError):
                    continue
            for key in ("resource_usage", "cpu", "total cpu"):
                payload = payload.get(key) if isinstance(payload, Mapping) else None
            if isinstance(payload, str) and (parts := _TIMESPAN.fullmatch(payload.strip())):
                days, hours, minutes, seconds, fraction = parts.groups()
                whole = int(days or 0) * 86400 + int(hours) * 3600 + int(minutes) * 60 + int(seconds)
                return whole * _TICKS_PER_SECOND + int((fraction or "").ljust(7, "0"))
    return None


class QueryCpuStats:
    """Track completed query attempts, including retries, for one daemon client."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._started_at = time.time()
        self._queries = self._failed = self._reported = self._ticks = 0

    def call(self, fn: Callable[[], Any]) -> Any:
        try:
            response = fn()
        except Exception:
            self._record(None, failed=True)
            raise

        # Optional SDK metadata must not change the result or mask a transport error.
        try:
            ticks = _cpu_ticks(response)
        except Exception:  # noqa: BLE001
            ticks = None
        try:
            failed = bool(getattr(response, "errors_count", 0))
        except Exception:  # noqa: BLE001
            failed = False
        self._record(ticks, failed=failed)
        return response

    def _record(self, ticks: int | None, *, failed: bool) -> None:
        with self._lock:
            self._queries += 1
            self._failed += failed
            if ticks is not None:
                self._reported += 1
                self._ticks += ticks

    def snapshot(self) -> dict[str, int | float | None]:
        with self._lock:
            return {
                "started_at": self._started_at,
                "queries": self._queries,
                "failed": self._failed,
                "reported": self._reported,
                "total_cpu_s": self._ticks / _TICKS_PER_SECOND if self._reported else None,
            }
