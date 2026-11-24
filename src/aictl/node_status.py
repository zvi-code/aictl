"""What a node's daemon is doing: its history read, its readers, its writer queues and its background tasks.

Each daemon keeps one status record of itself and publishes it to the store (``maintenance_state``, key
``node_status``, one row per node), so the Health screen of any node can show every node in fleet scope.
The record is published when something in it changed, at most once a minute, and once every
``HEARTBEAT_S`` when nothing did, so that the age of a node's last report tells whether its daemon runs.

The history read figures come from the scan the Index screen makes (``index_breakdown.scan_sessions``),
so the two screens never disagree. The scan takes a few hundred milliseconds on a large home; it runs
every ``SCAN_INTERVAL_S`` while files wait to be read and every ``IDLE_SCAN_INTERVAL_S`` otherwise,
and less often when one scan takes longer than ``SLOW_SCAN_S``.

The daemon console gets a line when the history read starts (files and bytes to read per tool), a
progress line at most once a minute while it reads, and a line when everything is read. Background
tasks print a start and an end line with their result.
"""

from __future__ import annotations

import json
import logging
import sys
import threading
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from typing import Any

log = logging.getLogger(__name__)

SNAPSHOT_KEY = "node_status"
RECORD_VERSION = 1
SCAN_INTERVAL_S = 30.0
IDLE_SCAN_INTERVAL_S = 60.0
# A scan slower than this runs at most once per SLOW_SCAN_FACTOR times its own duration.
SLOW_SCAN_S = 2.0
SLOW_SCAN_FACTOR = 30.0
PROGRESS_LINE_EVERY_S = 60.0
PUBLISH_MIN_S = 60.0
HEARTBEAT_S = 300.0
# A report older than this marks the node's daemon as not reporting (two missed heartbeats).
STALE_AFTER_S = 2 * HEARTBEAT_S + PUBLISH_MIN_S
RATE_WINDOW_S = 600.0
TICK_S = 5.0
PENDING_STATES = ("waiting", "reread", "changed")
READER_LABELS = {
    "transcript-usage": "Transcript reader",
    "copilot-session-store": "Copilot session store",
    "vscode-chat-logs": "VS Code chat logs",
    "session-artifacts": "Session artifacts",
    "cursor-conversations": "Cursor conversations",
    "otel": "OTel receiver",
}


def say(line: str) -> None:
    """One line on the daemon console (and the log): what the daemon does in the background."""
    print(f"  {time.strftime('%H:%M:%S')} {line}", file=sys.stderr, flush=True)
    log.info("%s", line)


# ── formatting of console lines ───────────────────────────────────────


def _size(n: Any) -> str:
    from .index_breakdown import _size as size

    return size(n)


def _num(n: Any) -> str:
    from .index_breakdown import _num as num

    return num(n)


def duration(seconds: float | None) -> str:
    """A duration as the console shows it: 45 s, 12 min, 2 h 40 min, 3 d 4 h."""
    if seconds is None:
        return "-"
    s = max(0, int(round(seconds)))
    if s < 60:
        return f"{s} s"
    m = s // 60
    if m < 60:
        return f"{m} min"
    h, m = divmod(m, 60)
    if h < 48:
        return f"{h} h {m} min" if m else f"{h} h"
    d, h = divmod(h, 24)
    return f"{d} d {h} h" if h else f"{d} d"


# ── the history read ──────────────────────────────────────────────────

_COUNTS = (
    "files",
    "complete",
    "reading",
    "waiting",
    "outside_window",
    "unreadable",
    "bytes",
    "bytes_read",
    "bytes_skipped",
    "bytes_to_read",
)


def progress_of(locations: list[dict]) -> dict:
    """Per tool and in total: the files and bytes of the reader's locations and how far they are read.

    *locations* are the Index screen's rows (``index_breakdown.scan_sessions``). ``waiting`` counts every
    file the reader still has to read from its start or from a saved position (waiting, reread, changed);
    ``bytes_to_read`` leaves out the files it does not read (outside history_days, unreadable)."""
    tools: dict[str, dict] = {}
    for loc in locations:
        t = tools.setdefault(loc["tool"], {"tool": loc["tool"], **dict.fromkeys(_COUNTS, 0)})
        states = loc.get("states") or {}
        t["files"] += loc.get("files") or 0
        t["complete"] += states.get("complete", 0)
        t["reading"] += states.get("reading", 0)
        t["waiting"] += sum(states.get(s, 0) for s in PENDING_STATES)
        t["outside_window"] += states.get("outside_window", 0)
        t["unreadable"] += states.get("unreadable", 0)
        t["bytes"] += loc.get("bytes") or 0
        t["bytes_read"] += loc.get("bytes_read") or 0
        t["bytes_skipped"] += loc.get("bytes_skipped") or 0
    for t in tools.values():
        t["bytes_to_read"] = max(0, t["bytes"] - t["bytes_read"] - t["bytes_skipped"])
    by_tool = sorted(tools.values(), key=lambda t: t["tool"])
    total = {k: sum(t[k] for t in by_tool) for k in _COUNTS}
    return {**total, "by_tool": by_tool}


def scan_progress(ing: Any, *, live: bool, history_days: int, now: float) -> dict:
    """The progress figures of the transcript reader, from the Index screen's own scan."""
    from . import index_breakdown as ib

    started = time.perf_counter()
    cutoff = now - history_days * 86400 if history_days else 0.0
    locations, _, _ = ib.scan_sessions(ing, ib.reader_state(ing, live), cutoff)
    return {**progress_of(locations), "computed_at": now, "scan_ms": round((time.perf_counter() - started) * 1000, 1)}


def _in_window(p: dict) -> int:
    return p["complete"] + p["reading"] + p["waiting"]


def _percent(p: dict) -> float | None:
    readable = p["bytes"] - p["bytes_skipped"]
    return round(100.0 * p["bytes_read"] / readable, 1) if readable > 0 else None


class HistoryRead:
    """Follows the history read across scans: its state, rate and time left, and the console lines."""

    def __init__(self) -> None:
        self.active = False
        self.started_at: float | None = None
        self.finished_at: float | None = None
        self.samples: list[tuple[float, int]] = []
        self.last_line_at: float | None = None
        self.last_line_key: tuple | None = None
        self.progress: dict | None = None

    def rate(self) -> float | None:
        """Bytes per second over the last RATE_WINDOW_S, None until two scans show bytes read."""
        if len(self.samples) < 2:
            return None
        (t0, b0), (t1, b1) = self.samples[0], self.samples[-1]
        if t1 <= t0 or b1 < b0:
            return None
        return (b1 - b0) / (t1 - t0)

    def update(self, p: dict, now: float) -> list[str]:
        """Take one scan; return the console lines it calls for."""
        self.progress = p
        pending = p["reading"] + p["waiting"] > 0
        lines: list[str] = []
        if pending and not self.active:
            self.active, self.started_at, self.finished_at = True, now, None
            self.samples = []
            self.last_line_at, self.last_line_key = None, None
            lines.append(self.start_line(p))
        if self.active:
            self.samples = [s for s in self.samples if s[0] >= now - RATE_WINDOW_S] + [(now, p["bytes_read"])]
            if self.samples[-1][1] < self.samples[0][1]:  # files read again: their bytes count from zero
                self.samples = self.samples[-1:]
        if self.active and not pending:
            self.active, self.finished_at = False, now
            lines.append(self.done_line(p, now))
        elif self.active and lines == []:
            key = (p["complete"], p["bytes_read"], p["files"])
            due = self.last_line_at is None or now - self.last_line_at >= PROGRESS_LINE_EVERY_S
            if due and key != self.last_line_key:
                lines.append(self.progress_line(p))
                self.last_line_at, self.last_line_key = now, key
        return lines

    def eta(self) -> float | None:
        rate = self.rate()
        p = self.progress
        if p is None or not rate:
            return None
        return p["bytes_to_read"] / rate

    def start_line(self, p: dict) -> str:
        parts = [
            f"{t['tool']} {_num(t['reading'] + t['waiting'])} files {_size(t['bytes_to_read'])}"
            for t in p["by_tool"]
            if t["reading"] + t["waiting"]
        ]
        return (
            f"history read: {_num(p['reading'] + p['waiting'])} of {_num(_in_window(p))} files to read, "
            f"{_size(p['bytes_to_read'])} ({'; '.join(parts)})"
        )

    def progress_line(self, p: dict) -> str:
        pct = _percent(p)
        rate = self.rate()
        eta = self.eta()
        return (
            f"history read: {_num(p['complete'])} of {_num(_in_window(p))} files complete, "
            f"{_size(p['bytes_read'])} of {_size(p['bytes'] - p['bytes_skipped'])} read"
            f"{f' ({pct:.0f}%)' if pct is not None else ''}, "
            f"{f'{_size(rate * 60)}/min' if rate is not None else 'rate not known yet'}"
            f"{f', about {duration(eta)} left' if eta is not None else ''}"
        )

    def done_line(self, p: dict, now: float) -> str:
        took = now - self.started_at if self.started_at is not None else None
        return (
            f"history read: done, {_num(p['complete'])} files complete, {_size(p['bytes_read'])} read"
            f" in {duration(took)}"
        )

    def summary(self) -> dict | None:
        p = self.progress
        if p is None:
            return None
        rate = self.rate()
        return {
            "state": "reading" if self.active else "done",
            **{k: p[k] for k in _COUNTS},
            "percent": _percent(p),
            "rate_bps": round(rate, 1) if rate is not None else None,
            "eta_s": round(self.eta()) if self.eta() is not None else None,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "computed_at": p.get("computed_at"),
            "scan_ms": p.get("scan_ms"),
            "by_tool": p["by_tool"],
        }


# ── background tasks ──────────────────────────────────────────────────


@dataclass
class Task:
    name: str
    label: str
    state: str = "running"  # queued, running, done, failed
    started_at: float | None = None
    ended_at: float | None = None
    progress: str = ""
    result: str = ""
    last_error: str | None = None


@dataclass
class Tasks:
    """The daemon's background tasks, each with a start and an end line on the console."""

    say: Callable[[str], None] = say
    clock: Callable[[], float] = time.time
    tasks: dict[str, Task] = field(default_factory=dict)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def begin(self, name: str, label: str, detail: str = "", *, state: str = "running", quiet: bool = False) -> None:
        with self.lock:
            self.tasks[name] = Task(name, label, state, self.clock(), progress=detail)
        if not quiet:
            self.say(f"{label}: {'queued' if state == 'queued' else 'started'}{f' ({detail})' if detail else ''}")

    def progress(self, name: str, text: str) -> None:
        with self.lock:
            if name in self.tasks:
                self.tasks[name].progress = text

    def end(self, name: str, result: str = "", *, error: str | None = None, quiet: bool = False) -> None:
        with self.lock:
            task = self.tasks.get(name)
            if task is None:
                return
            task.ended_at = self.clock()
            task.state = "failed" if error else "done"
            task.result, task.last_error, task.progress = result, error, ""
            took = task.ended_at - (task.started_at or task.ended_at)
        if not quiet:
            if error:
                self.say(f"{task.label}: failed after {duration(took)}: {error}")
            else:
                self.say(f"{task.label}: done in {duration(took)}{f', {result}' if result else ''}")

    def get(self, name: str) -> Task | None:
        with self.lock:
            return self.tasks.get(name)

    def snapshot(self) -> list[dict]:
        with self.lock:
            return [asdict(t) for t in self.tasks.values()]


TASKS = Tasks()


def _masked(text: Any) -> str | None:
    if not text:
        return None
    from .dashboard.projection_utils import mask_secrets

    return mask_secrets(str(text))[:300]


# ── the record ────────────────────────────────────────────────────────


def _version() -> str:
    from .mutation_ledger import _aictl_version

    return _aictl_version()


def writer_summary(writer: Any) -> dict | None:
    health = getattr(writer, "health", None)
    if health is None:
        return None
    try:
        h = health()
    except Exception as exc:  # noqa: BLE001 - the record stands without the writer
        return {"status": "unknown", "last_error": _masked(exc)}
    tables = h.get("tables") or {}
    failing = sorted(
        (t.get("last_error_at") or 0, name, t.get("last_error")) for name, t in tables.items() if t.get("last_error")
    )
    return {
        "status": h.get("status"),
        "rows_queued": sum(t.get("queue_depth") or 0 for t in tables.values()),
        "bytes_queued": sum(t.get("queue_bytes") or 0 for t in tables.values()),
        "in_flight": sum(t.get("in_flight") or 0 for t in tables.values()),
        "failures": sum(t.get("ingest_failures") or 0 for t in tables.values()),
        "rows_dropped": sum(t.get("rows_dropped") or 0 for t in tables.values()),
        "tables_failing": [name for _, name, _ in failing],
        "last_error": _masked(failing[-1][2]) if failing else None,
        "last_error_at": failing[-1][0] or None if failing else None,
    }


def reader_rows(handles: dict | None, otel: Any, history: dict | None) -> list[dict]:
    from .dashboard.runtime_health import _ingester_rows

    out = []
    for row in _ingester_rows(handles or {}, []):
        name = row["name"]
        entry = {
            "name": name,
            "label": READER_LABELS.get(name, name),
            "state": row["status"],
            "last_poll_at": row.get("last_poll"),
            "last_success_at": row.get("last_ok"),
            "last_error": _masked(row.get("error")),
            "rows_total": row.get("rows_total"),
            "progress": None,
        }
        if name == "transcript-usage" and history is not None:
            entry["progress"] = {
                k: history[k]
                for k in (
                    "state",
                    "files",
                    "complete",
                    "reading",
                    "waiting",
                    "bytes",
                    "bytes_read",
                    "bytes_to_read",
                    "percent",
                    "rate_bps",
                    "eta_s",
                )
            }
            if history["state"] == "reading" and entry["state"] in ("ok", "running", "waiting"):
                entry["state"] = "reading history"
        out.append(entry)
    if otel is not None:
        try:
            s = otel.status()
        except Exception:  # noqa: BLE001 - the record stands without the receiver
            s = None
        if s is not None:
            out.append(
                {
                    "name": "otel",
                    "label": READER_LABELS["otel"],
                    "state": "receiving" if s.get("active") else "idle",
                    "last_poll_at": None,
                    "last_success_at": s.get("last_receive_at") or None,
                    "last_error": f"{s.get('errors')} malformed exports" if s.get("errors") else None,
                    "rows_total": (s.get("metrics_received") or 0) + (s.get("events_received") or 0),
                    "progress": None,
                }
            )
    return out


def overall_state(history: dict | None, readers: list[dict], writer: dict | None, tasks: list[dict]) -> str:
    if history is not None and history["state"] == "reading":
        return "reading history"
    if (
        any(r["state"] not in ("ok", "off", "waiting", "running", "idle", "receiving", "no source") for r in readers)
        or (writer or {}).get("last_error")
        or any(t["state"] == "failed" for t in tasks)
    ):
        return "errors"
    if any(t["state"] in ("running", "queued") for t in tasks):
        return "working"
    return "current"


def change_key(record: dict) -> str:
    """What makes a record worth publishing: not its times, rates or the exact rows in the writer's queues."""
    h = record.get("history") or {}
    w = record.get("writer") or {}
    return json.dumps(
        [
            record.get("state"),
            record.get("version"),
            record.get("layout"),
            record.get("daemon_started_at"),
            [h.get(k) for k in ("state", "files", "complete", "reading", "waiting", "bytes", "bytes_read")],
            [(r["name"], r["state"], r["last_error"]) for r in record.get("readers") or ()],
            [w.get(k) for k in ("status", "failures", "rows_dropped", "last_error")],
            bool(w.get("rows_queued")),
            [(t["name"], t["state"], t["progress"], t["last_error"]) for t in record.get("tasks") or ()],
        ],
        default=str,
    )


class NodeStatus:
    """The daemon's status reporter: scans, prints, keeps the record and publishes it."""

    def __init__(
        self,
        store: Any,
        *,
        ingesters: Callable[[], dict | None],
        otel: Callable[[], Any] = lambda: None,
        writer: Any = None,
        tasks: Tasks = TASKS,
        clock: Callable[[], float] = time.time,
        say: Callable[[str], None] = say,
        history_days: int | None = None,
        node_id: str | None = None,
        started_at: float | None = None,
    ) -> None:
        self.store = store
        self.ingesters = ingesters
        self.otel = otel
        self.writer = writer
        self.tasks = tasks
        self.clock = clock
        self.say = say
        self.history_days = history_days
        self.node_id = node_id
        self.started_at = started_at
        self.history = HistoryRead()
        self.next_scan = 0.0
        self.last_scan_s = 0.0
        self.published_at: float | None = None
        self.published_key: str | None = None
        self.publish_error: str | None = None
        self.stop = threading.Event()
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._run, name="aictl-node-status", daemon=True)

    def start(self) -> NodeStatus:
        self.thread.start()
        return self

    # the parts

    def _transcript_reader(self) -> Any:
        handle = (self.ingesters() or {}).get("transcript-usage")
        return getattr(handle, "ingester", None)

    def _days(self) -> int:
        if self.history_days is None:
            from .platforms import load_config

            self.history_days = int(load_config().history_days or 0)
        return self.history_days

    def scan(self, now: float) -> None:
        ing = self._transcript_reader()
        if ing is None:
            return
        try:
            p = scan_progress(ing, live=True, history_days=self._days(), now=now)
        except Exception:  # noqa: BLE001 - a failed scan is tried again at the next interval
            log.exception("node status: the history scan failed")
            self.next_scan = now + IDLE_SCAN_INTERVAL_S
            return
        with self.lock:
            lines = self.history.update(p, now)
        for line in lines:
            self.say(line)
        self.last_scan_s = p["scan_ms"] / 1000
        interval = SCAN_INTERVAL_S if self.history.active else IDLE_SCAN_INTERVAL_S
        if self.last_scan_s > SLOW_SCAN_S:
            interval = max(interval, self.last_scan_s * SLOW_SCAN_FACTOR)
        self.next_scan = now + interval

    def check_reread(self) -> None:
        """A queued ``aictl db reread``: queued while its request files wait, applied when the reader took them."""
        restart = getattr(self.store, "restart_dir", None)
        if restart is None:
            return
        from .ingesters.transcript_usage import REREAD_REQUEST_GLOB

        try:
            waiting = len(list(restart.glob(REREAD_REQUEST_GLOB)))
        except OSError:
            return
        task = self.tasks.get("reread")
        if waiting and (task is None or task.state not in ("queued", "running")):
            self.tasks.begin(
                "reread", "aictl db reread", f"{waiting} request(s) waiting for the reader", state="queued"
            )
        elif not waiting and task is not None and task.state in ("queued", "running"):
            self.tasks.end("reread", "the named files are read again as part of the history read")

    def record(self, now: float | None = None) -> dict:
        now = self.clock() if now is None else now
        from . import index_breakdown as ib
        from .stores import local_node_id, normalize_node_id

        history_store = getattr(self.store, "history_store", None)
        layout = getattr(history_store, "layout", None) or {}
        with self.lock:
            history = self.history.summary()
        readers = reader_rows(self.ingesters(), self.otel(), history)
        writer = writer_summary(self.writer)
        if writer is not None and self.publish_error:
            writer["status_publish_error"] = self.publish_error
        tasks = self.tasks.snapshot()
        if self.started_at is None:
            self.started_at = ib._started_at()
        record = {
            "record_version": RECORD_VERSION,
            "node_id": self.node_id or normalize_node_id(local_node_id()),
            "version": _version(),
            "layout": {"version": layout.get("version"), "data_epoch": layout.get("data_epoch")} if layout else None,
            "daemon_started_at": self.started_at,
            "reported_at": now,
            "history": history,
            "readers": readers,
            "writer": writer,
            "tasks": tasks,
        }
        record["state"] = overall_state(history, readers, writer, tasks)
        return record

    def publish(self, now: float, *, force: bool = False) -> bool:
        """Write the record when it changed (at most once per PUBLISH_MIN_S) or every HEARTBEAT_S."""
        if self.writer is None:
            return False
        record = self.record(now)
        key = change_key(record)
        since = None if self.published_at is None else now - self.published_at
        due = since is None or force or since >= HEARTBEAT_S or (key != self.published_key and since >= PUBLISH_MIN_S)
        if not due:
            return False
        try:
            self.writer.upsert(
                "maintenance_state",
                [
                    {
                        "project": "",
                        "key": SNAPSHOT_KEY,
                        "value": float(now),
                        "text": json.dumps(record, separators=(",", ":"), default=str),
                    }
                ],
            )
        except Exception as exc:  # noqa: BLE001 - publishing must never stop the daemon
            self.publish_error = _masked(exc)
            log.warning("node status: publishing failed: %s", exc)
            self.published_at = now  # try again after PUBLISH_MIN_S, not at every tick
            return False
        self.publish_error = None
        self.published_at, self.published_key = now, key
        return True

    def tick(self, now: float | None = None) -> None:
        now = self.clock() if now is None else now
        if now >= self.next_scan:
            self.scan(now)
        self.check_reread()
        self.publish(now)

    def _run(self) -> None:
        while True:
            try:
                self.tick()
            except Exception:  # noqa: BLE001 - the status must never stop the daemon
                log.exception("node status: a tick failed")
            if self.stop.wait(TICK_S):
                return
