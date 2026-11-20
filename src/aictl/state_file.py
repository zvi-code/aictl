"""Bounded local JSON objects, one per consumer and store/node.

These files hold checkpoints and metadata, not rows waiting for ingestion.
Missing or corrupt files are equivalent to an empty object.
"""

import functools
import json
import logging
import os
import threading
from pathlib import Path
from uuid import uuid4

MAX_STATE_BYTES = 32 * 1024 * 1024
log = logging.getLogger(__name__)


@functools.lru_cache(maxsize=256)
def _warn_bad_state(path: Path) -> None:
    log.warning("Invalid restart state at %s; starting empty", path)


def _invalid_constant(value: str) -> None:
    raise ValueError(f"Invalid JSON constant: {value}")


class StateFile:
    def __init__(self, path: Path) -> None:
        self.path = path

    def read(self) -> dict:
        try:
            with self.path.open("rb") as file:
                raw = file.read(MAX_STATE_BYTES + 1)
        except FileNotFoundError:
            return {}
        try:
            if len(raw) > MAX_STATE_BYTES:
                raise ValueError("File exceeds restart state limit")
            data = json.loads(raw.decode("utf-8"), parse_constant=_invalid_constant)
            if isinstance(data, dict):
                return data
        except (ValueError, RecursionError):
            pass
        _warn_bad_state(self.path)
        return {}

    def replace(self, data: dict) -> None:
        """Replace only after the new JSON is complete. A failed write keeps the old file."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        pending = self.path.with_name(f".{self.path.name}.{uuid4().hex}")
        try:
            with pending.open("xb") as file:
                size = 0
                encoder = json.JSONEncoder(ensure_ascii=True, separators=(",", ":"), allow_nan=False)
                for chunk in encoder.iterencode(data):
                    raw = chunk.encode("ascii")
                    size += len(raw)
                    if size > MAX_STATE_BYTES:
                        raise OSError(f"{self.path} exceeds the restart state limit")
                    file.write(raw)
                file.flush()
                os.fsync(file.fileno())
            os.replace(pending, self.path)
        finally:
            pending.unlink(missing_ok=True)


def restart_directory(cluster: str, database: str, node: str) -> Path:
    from .platforms import config_dir
    from .tool_calls import call_key

    return config_dir() / call_key(cluster, ":", database, ":", node)


class TextWatermark:
    """Share the admin trim cutoff with a running collector."""

    def __init__(self, state: StateFile) -> None:
        self.state = state
        self._lock = threading.Lock()
        self._signature = None
        self._cutoff = 0.0

    def __call__(self) -> float:
        with self._lock:
            try:
                st = self.state.path.stat()
            except FileNotFoundError:
                return self._cutoff
            signature = (st.st_mtime_ns, st.st_size, st.st_ino)
            if signature != self._signature:
                self._cutoff = max(self._cutoff, float(self.state.read().get("before", 0)))
                self._signature = signature
            return self._cutoff

    def advance(self, cutoff: float) -> None:
        self.state.replace({"before": max(cutoff, self())})
