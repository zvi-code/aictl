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


EPOCH_FILE = "data_epoch.json"
_checked: dict[Path, str] = {}
_checked_lock = threading.Lock()


class RestartStateError(RuntimeError):
    """Restart state of an earlier data epoch could not be removed."""


def sync_data_epoch(directory: Path, epoch: str | None, *, kept_data: bool) -> Path:
    """Keep the restart state in *directory* only if it belongs to the database's data epoch.

    The data epoch changes when the database is created or reset. Checkpoints, session merge
    state and one-time-pass markers of another epoch describe rows that are gone: they are
    removed, and this node reads its history again as a new node. State with no recorded
    epoch predates the epoch record; it is kept only if the epoch kept older data
    (*kept_data*: the database was migrated or upgraded, not created or reset since).
    Checked once per process and directory; a different epoch later is checked again.
    Returns *directory*.
    """
    if not epoch:
        return directory
    with _checked_lock:
        if _checked.get(directory) == epoch:
            return directory
        marker = StateFile(directory / EPOCH_FILE)
        recorded = marker.read().get("data_epoch")
        files = [p for p in directory.iterdir() if p.is_file() and p.name != EPOCH_FILE] if directory.is_dir() else []
        if recorded != epoch and files and (recorded or not kept_data):
            reason = (f"belongs to data epoch {recorded}" if recorded
                      else "has no recorded data epoch and the database was created or reset since")
            failed = []
            for path in files:
                try:
                    path.unlink()
                except FileNotFoundError:
                    pass
                except OSError as exc:  # a file another process holds open, on Windows
                    failed.append(f"{path} ({exc.strerror or exc})")
            if failed:
                raise RestartStateError(
                    f"Restart state in {directory} {reason}, but the database has data epoch {epoch}. "
                    "These files could not be removed; stop every other aictl process of this node and "
                    "start again:\n  " + "\n  ".join(failed))
            log.warning("Restart state in %s %s; the database has data epoch %s. Removed %d files: "
                        "this node reads its history again as a new node.", directory, reason, epoch, len(files))
        if recorded != epoch:
            marker.replace({"data_epoch": epoch})
        _checked[directory] = epoch
    return directory


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
