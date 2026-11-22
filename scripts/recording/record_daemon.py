"""Record two live windows and instrument a separate, test-only aictl daemon."""

import argparse
import gzip
import json
import logging
import os
import re
import shutil
import socket
import sys
import threading
import time
import traceback
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from record_http import Dashboard, Jsonl, utc_now
from scrub import Scrubber, relative_path

DATABASE = "aictl_perf_test"
CLUSTER = os.environ.get("AICTL_KUSTO_CLUSTER", "https://example.swedencentral.dev.kusto.windows.net")
INLINE = re.compile(r"""^\.ingest inline into table (?:\[')?([a-zA-Z0-9_]+)(?:'\])?[^\n]*<\|\n""")
SDK_DISCOVERY = {".show version", ".get ingestion resources", ".get kusto identity token"}


def guard(database, statement=""):
    if database != DATABASE or re.search(r"\baictl_current\b|\b(?:cluster|database)\s*\(", statement, re.I):
        raise ValueError("recorder may use only the test database")


def lines_to_rows(lines):
    return [json.loads(line) for line in lines.splitlines() if line.strip()]


class KustoTape:
    def __init__(self, scrubber):
        self.scrubber = scrubber
        self.active = None
        self.lock = threading.Lock()

    def attach(self, writer):
        with self.lock:
            self.active = writer

    def measure(self, invoke, record, result=None):
        writer = self.active
        if writer is None:
            return invoke()
        start = time.monotonic()
        record["requested_at"] = utc_now()

        def finish():
            return {"received_at": utc_now(), "elapsed_ms": round((time.monotonic() - start) * 1000)}

        try:
            answer = invoke()
        except Exception as exc:  # noqa: BLE001 - do not change the SDK result
            record.update(finish(), outcome="error", error_type=type(exc).__name__)
            raise
        else:
            record.update(finish(), outcome="ok")
            if result is not None:
                try:
                    record["response"] = result(answer)
                except Exception as exc:  # noqa: BLE001 - report only the exception class
                    record["capture_error"] = type(exc).__name__
            return answer
        finally:
            with self.lock:
                if writer is self.active:
                    writer.write(record)

    def install(self):
        from azure.kusto.ingest import QueuedIngestClient

        from aictl.health import ObservedKustoClient

        scrub = self.scrubber

        def result(response):
            tables = []
            for table in getattr(response, "primary_results", []) or []:
                names = [c.column_name for c in table.columns]
                tables.append({
                    "columns": [{"name": scrub.key_name(c.column_name), "type": str(c.column_type)}
                                for c in table.columns],
                    "rows": [[scrub.scrub(value, field) for field, value in zip(names, row, strict=True)]
                             for row in table],
                })
            return tables

        def query_wrapper(method, kind):
            def call(client, database, text, *args, **kwargs):
                head = text.partition("<|\n")[0]
                discovery = database == "NetDefaultDB" and head.strip().lower() in SDK_DISCOVERY
                if not discovery:
                    guard(database, head)
                operation = lambda: method(client, database, text, *args, **kwargs)
                if self.active is None:
                    return operation()
                record = {"kind": "command" if head.lstrip().startswith(".") else kind, "database": database}
                if (match := INLINE.match(text)) is not None:
                    record.update(kind="ingest", table=match[1], mode="inline", format="multijson",
                                  rows=scrub.scrub(lines_to_rows(text[match.end():])))
                else:
                    record["kql"] = scrub.kql(text)
                props = args[0] if args else kwargs.get("properties")
                if parameters := getattr(props, "_parameters", None):
                    record["parameters"] = scrub.scrub(parameters)
                # The SDK reads authorization and resource URLs from a virtual DM database.
                # Record the operation and status, but never serialize either credential payload.
                return self.measure(operation, record, None if discovery else result)
            return call

        for name, kind in (("execute", "query"), ("execute_query", "query"), ("execute_mgmt", "command")):
            setattr(ObservedKustoClient, name, query_wrapper(getattr(ObservedKustoClient, name), kind))

        streaming = ObservedKustoClient.execute_streaming_ingest

        def stream(client, database, table, stream, mapping, data_format, *args, **kwargs):
            guard(database)
            operation = lambda: streaming(client, database, table, stream, mapping, data_format, *args, **kwargs)
            if self.active is None:
                return operation()
            payload = stream.read()
            stream.seek(0)
            if payload.startswith(b"\x1f\x8b"):
                payload = gzip.decompress(payload)
            return self.measure(operation, {
                "kind": "ingest", "database": database, "table": table, "mode": "streaming",
                "format": data_format.name.lower(), "rows": scrub.scrub(lines_to_rows(payload.decode("utf-8"))),
            })

        queued = QueuedIngestClient.ingest_from_stream

        def enqueue(client, descriptor, props):
            guard(props.database)
            operation = lambda: queued(client, descriptor, props)
            if self.active is None:
                return operation()
            stream = descriptor.stream
            payload = stream.read()
            stream.seek(0)
            return self.measure(operation, {
                "kind": "ingest", "database": props.database, "table": props.table, "mode": "queued",
                "format": props.format.name.lower(), "rows": scrub.scrub(lines_to_rows(payload.decode("utf-8"))),
            })

        ObservedKustoClient.execute_streaming_ingest = stream
        QueuedIngestClient.ingest_from_stream = enqueue


def start_isolated(port, state, tape):
    from aictl import orchestrator, platforms
    from aictl.monitoring.config import MonitorConfig
    from aictl.stores.kusto.tables import TABLES

    tape.scrubber.identifiers.update({*TABLES, *(name for table in TABLES.values() for name, _ in table.columns)})
    tape.install()
    os.environ.update(AICTL_KUSTO_CLUSTER=CLUSTER, AICTL_KUSTO_DATABASE=DATABASE, AICTL_CAPTURE="metadata",
                      AICTL_PORT=str(port))
    for name in ("AICTL_KUSTO_TABLE_INGESTION", "AICTL_KUSTO_INGESTION", platforms.DAEMON_PID_ENV):
        os.environ.pop(name, None)
    platforms.config_dir = lambda: state
    lookup = MonitorConfig.for_root
    MonitorConfig.for_root = staticmethod(
        lambda *args, **kwargs: lookup(*args, **(kwargs | {"repo_state_path": None}))
    )
    # Never displace a listener. A port collision must fail at bind().
    orchestrator._kill_stale_server = lambda _port: None
    logging.disable(logging.CRITICAL)
    previous_stderr = sys.stderr
    null = open(os.devnull, "w", encoding="utf-8")
    sys.stderr = null

    def serve():
        try:
            orchestrator.start_server(Path.cwd(), port=port, open_browser=False)
        except Exception as exc:  # noqa: BLE001 - raw service errors can contain private data
            print(f"Isolated daemon startup failed: {type(exc).__name__}", file=previous_stderr, flush=True)

    worker = threading.Thread(target=serve, name="recording-daemon", daemon=True)
    worker.start()
    deadline = time.monotonic() + 180
    while worker.is_alive() and time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                print("Isolated dashboard listening", flush=True)
                return
        except OSError:
            time.sleep(0.5)
    raise RuntimeError("isolated dashboard did not start")


def activity(counter):
    return counter["change"]


def capture(output, seconds, dashboards, tape, index, preopened=None):
    directory = output / f"window-{index}"
    directory.mkdir(exist_ok=True)
    kusto = preopened or Jsonl(directory / "kusto.jsonl.gz", 2_800_000)
    writers = {
        (source, kind): Jsonl(directory / f"{source}-{kind}.jsonl.gz", limit)
        for source in dashboards
        for kind, limit in (("sse", 4_000_000 if source == "main" else 1_650_000), ("rest", 700_000))
    }
    stats = {source: Counter() for source in dashboards}
    started_at = utc_now()
    start = time.monotonic()
    stop = threading.Event()
    reason = "duration"
    failures = []
    tape.attach(kusto)
    print(f"Window {index} started: {started_at}", flush=True)
    try:
        with ThreadPoolExecutor(max_workers=6) as pool:
            streams = [pool.submit(d.stream, "/api/live/stream?history=1", start, seconds,
                                   writers[s, "sse"], stats[s], stop)
                       for s, d in dashboards.items()]
            snapshots = [pool.submit(d.snapshot, "start", writers[s, "rest"]) for s, d in dashboards.items()]
            monitored = [kusto, *(w for (_source, kind), w in writers.items() if kind == "sse")]
            while time.monotonic() < start + seconds:
                limited = next((w for w in monitored if w.path.stat().st_size >= w.byte_limit * 0.96), None)
                if limited is not None:
                    reason = f"size limit: {limited.path.name}"
                    break
                time.sleep(min(0.25, max(0, start + seconds - time.monotonic())))
            stop.set()
            ended_at = utc_now()
            elapsed = time.monotonic() - start
            snapshots += [pool.submit(d.snapshot, "end", writers[s, "rest"]) for s, d in dashboards.items()]
            for future in [*snapshots, *streams]:
                try:
                    future.result()
                except Exception as exc:  # noqa: BLE001 - keep other completed capture files
                    failures.append(type(exc).__name__)
    finally:
        tape.attach(None)
        kusto.close()
        for writer in writers.values():
            writer.close()

    metadata = {
        "started_at": started_at, "ended_at": ended_at, "duration_seconds": round(elapsed, 3),
        "stop_reason": reason, "messages": stats,
        "capture_errors": failures,
        "activity_per_minute": {source: round(activity(counts) * 60 / elapsed, 2)
                                for source, counts in stats.items()},
        "records_dropped": {w.path.name: w.dropped for w in [kusto, *writers.values()]},
        "privacy_rejected": {w.path.name: w.privacy_rejected for w in [kusto, *writers.values()]},
    }
    (directory / "window.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Window {index} ended: {metadata['activity_per_minute']}", flush=True)
    return directory, activity(stats["main"]) / elapsed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--main-port", type=int, default=8484)
    parser.add_argument("--isolated-port", type=int, default=18484)
    parser.add_argument("--seconds", type=int, default=600)
    parser.add_argument("--gap-seconds", type=int, default=20)
    parser.add_argument("--output", default=Path("test") / "recordings")
    parser.add_argument("--single", action="store_true", help="Record one window without assigning an activity label")
    args = parser.parse_args()
    if args.main_port == args.isolated_port or not 1 <= args.isolated_port <= 65535 or args.seconds <= 0:
        parser.error("use distinct valid ports and a positive duration")
    output = relative_path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    for name in ("window-1", "window-2", "quiet", "busy"):
        if (output / name).exists():
            parser.error("output already contains a recording")
    state = relative_path(Path("scripts") / "recording" / (".isolated-" + uuid.uuid4().hex))
    state.mkdir()
    try:
        # Check before startup so that even the readiness probe cannot attach to another daemon.
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", args.isolated_port))
        scrub = Scrubber()
        tape = KustoTape(scrub)
        directory = output / "window-1"
        directory.mkdir()
        first = Jsonl(directory / "kusto.jsonl.gz", 2_800_000)
        tape.attach(first)
        try:
            start_isolated(args.isolated_port, state, tape)
        except BaseException:
            tape.attach(None)
            first.close()
            raise
        dashboards = {"main": Dashboard(args.main_port, scrub), "isolated": Dashboard(args.isolated_port, scrub)}
        first_window = capture(output, args.seconds, dashboards, tape, 1, first)
        if args.single:
            return
        time.sleep(args.gap_seconds)
        second_window = capture(output, args.seconds, dashboards, tape, 2)
        quiet, busy = sorted((first_window, second_window), key=lambda window: window[1])
        quiet[0].rename(output / "quiet")
        busy[0].rename(output / "busy")
    finally:
        shutil.rmtree(state, ignore_errors=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - raw service errors can contain private data
        location = traceback.extract_tb(exc.__traceback__)[-1]
        print(f"Recording failed: {type(exc).__name__} at {Path(location.filename).name}:{location.lineno}",
              file=sys.__stderr__, flush=True)
        os._exit(1)
    # Stop all in-process daemon threads as soon as the closed capture files are ready.
    os._exit(0)
