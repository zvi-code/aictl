"""Publish catalog definitions and component status without store reads."""

import json
import logging
import threading
import time
from pathlib import Path

from .state_file import StateFile
from .stores import writer_or_discard

log = logging.getLogger(__name__)


def load_state(state: StateFile | None) -> dict:
    if state is not None:
        try:
            return state.read()
        except (OSError, ValueError):
            log.warning("Cannot read collection state: %s", state.path, exc_info=True)
    return {}


class CollectionStatus:
    def __init__(self, writer, state: StateFile | None = None) -> None:
        self.writer = writer_or_discard(writer)
        self.state = state
        self.rows = load_state(state)
        self.lock = threading.Lock()
        self.dirty = False

    def save(self) -> None:
        with self.lock:
            if self.state is not None and self.dirty:
                self.state.replace(self.rows)
                self.dirty = False

    def record_data_quality(self, component, status, *, source="", kind="", severity="",
                            message="", detail=None, ts=None) -> None:
        if not component or not status:
            return
        with self.lock:
            key = json.dumps([component, source])
            previous = self.rows.get(key, {})
            now = time.time() if ts is None else ts
            if (ts is None and (status, message) == (previous.get("status"), previous.get("message"))
                    and 0 <= now - previous["updated_at"] < 60):
                return
            row = dict(component=component, source=source, status=status, kind=kind, severity=severity,
                       message=message, detail=json.dumps(detail or {}, default=str), updated_at=now,
                       last_ok_at=now if status == "ok" else previous.get("last_ok_at", 0.0),
                       count=previous.get("count", 0) + 1, project="")
            self.writer.upsert("data_quality_status", [row])
            self.rows[key] = row
            self.dirty = True


_CATALOG_FIELDS = ("key", "label", "tab", "section", "explanation", "source_static", "source_type",
                   "unit", "update_freq", "otel_metric", "dynamic_source", "query", "calc")
_CATALOG_CACHE = {}


def _catalog_rows():
    """Load catalog definitions, caching until either source file changes."""
    data = Path(__file__).parent / "data"
    paths = (data / "datapoint-catalog.yaml", data / "datapoint-queries.yaml")
    stamps = []
    for path in paths:
        try:
            stat = path.stat()
            stamps.append((stat.st_mtime_ns, stat.st_size))
        except FileNotFoundError:
            stamps.append(None)
    if stamps[0] is None:
        return ()
    cache_key = tuple(stamps)
    if cache_key in _CATALOG_CACHE:
        return _CATALOG_CACHE[cache_key]

    import yaml

    loader = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
    with paths[0].open(encoding="utf-8") as file:
        catalog = yaml.load(file, Loader=loader) or {}
    queries = {}
    if stamps[1] is not None:
        with paths[1].open(encoding="utf-8") as file:
            queries = yaml.load(file, Loader=loader) or {}
    rows = []
    for key, entry in catalog.items():
        query = queries.get(key, {})
        explanation = entry.get("explanation", "").strip()
        rows.append((key, explanation.split("\n")[0][:120], entry.get("tab", ""), entry.get("section", ""),
                     explanation, entry.get("source", "").strip(), entry.get("source_type", "raw"),
                     entry.get("unit", ""), entry.get("update_freq", ""), entry.get("otel_metric", ""),
                     int(bool(entry.get("dynamic_source"))), query.get("query", "").strip(), query.get("calc", "").strip()))
    _CATALOG_CACHE.clear()
    _CATALOG_CACHE[cache_key] = tuple(rows)
    return _CATALOG_CACHE[cache_key]


class DatapointCatalog:
    def __init__(self, writer, state: StateFile | None = None) -> None:
        self.writer = writer_or_discard(writer)
        self.state = state
        self.rows = load_state(state)
        self.last_refresh = -float("inf")
        self.changed = False

    def sync(self, builders=None) -> int:
        definitions = _catalog_rows()
        if not definitions:
            return 0
        now = time.time()
        rows = {}
        changed = []
        for definition in definitions:
            data = dict(zip(_CATALOG_FIELDS, definition), project="")
            key = data["key"]
            previous = self.rows.get(key, {})
            data["source_dynamic"] = (previous.get("source_dynamic", "{}") if builders is None else
                                      json.dumps(builders.get(key, {}), sort_keys=True, default=str))
            rows[key] = data
            if data != previous:
                changed.append(dict(data, updated_at=now))
        removed = self.rows.keys() - rows.keys()
        self.changed = bool(changed or removed)
        if changed:
            self.writer.upsert("datapoint_catalog", changed)
        if removed:
            self.writer.delete("datapoint_catalog", [dict(project="", key=key) for key in sorted(removed)])
        if self.changed and self.state is not None:
            self.state.replace(rows)
        self.rows = rows
        return len(changed)

    def refresh(self, snapshot) -> int:
        now = time.monotonic()
        if now - self.last_refresh < 30:
            return 0
        from .sink import _build_provenance

        self.last_refresh = now
        return self.sync(_build_provenance(snapshot))
