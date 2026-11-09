# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""What keeps the dashboard fast: compressed responses, small live updates, a kept audit."""

from __future__ import annotations

import gzip
import io
import json
import threading
import urllib.request
from email.message import Message
from pathlib import Path

import pytest

from aictl.dashboard import web_server
from aictl.dashboard.audit_cache import AuditCache
from aictl.dashboard.models import DashboardSnapshot, DashboardTool, tools_revision
from aictl.dashboard.web_server import (
    _accepts_gzip,
    _DashboardHandler,
    _DashboardHTTPServer,
)
from aictl.orchestrator import AllowedPaths, SnapshotStore
from aictl.tools import ResourceFile

# ── Data ──────────────────────────────────────────────────────────


def _snapshot(tick: int = 0, sessions: int = 150, files: int = 1500) -> DashboardSnapshot:
    """A large state: many files, many sessions with process trees, a busy live monitor."""
    tools = [
        DashboardTool(
            tool=name,
            label=name,
            files=[
                ResourceFile(
                    path=f"/p/{name}/rules/f{i}.md", kind="rules", size=900 + i, tokens=200 + i % 50, mtime=1.0 + i
                )
                for i in range(files // 3)
            ],
            processes=[{"pid": 10 * n + 1, "name": "helper", "cpu_pct": str(tick % 7), "mem_mb": "100"}],
            mcp_servers=[{"name": "mcp-fs"}],
            live={
                "tool": name,
                "cpu_percent": float(tick % 9),
                "session_count": 3,
                "processes": [{"pid": 1, "cpu_pct": tick}],
            },
        )
        for n, name in enumerate(["claude-code", "copilot-cli", "cursor"])
    ]
    rows = []
    for i in range(sessions):
        active = (i + tick) % 10 == 0  # a tenth of the sessions change on a tick
        rows.append(
            {
                "session_id": f"s{i:04d}",
                "tool": "claude-code",
                "label": "Claude Code",
                "project": f"/p/{i % 20}",
                "started_at": 100.0,
                "last_seen_at": 160.0 + (tick if active else 0),
                "duration_s": 60.0 + (tick if active else 0),
                "cpu_percent": float(tick % 13) if active else 0.0,
                "pids": [1, 2, 3],
                "exact_input_tokens": 5,
                "exact_output_tokens": 2,
                "file_events": 1,
                "files_touched": [f"/p/{i}/a.py", f"/p/{i}/b.py"],
                "recent_subprocesses": [{"ts": float(k), "name": "git"} for k in range(30)],
                "subprocess_count": {"git": 30},
                "process_tree": [
                    {
                        "pid": 1,
                        "name": "claude",
                        "mem_mb": 120.5,
                        "cpu_pct": 1.0,
                        "cwd": "/p",
                        "role": "lead",
                        "children": [{"pid": 2, "name": "node", "mem_mb": 40.0, "cpu_pct": 0.1, "children": []}],
                    },
                ],
            }
        )
    monitor = {
        "platform": "darwin",
        "diagnostics": {"process:psutil": {"status": "active", "mode": "polling", "detail": "ok"}},
        "workspace_paths": ["/p"],
        "state_paths": ["/s"],
        "tools": [t.live for t in tools],
        "events": [{"ts": float(k), "kind": "x"} for k in range(50)],
        "sessions": rows,
    }
    return DashboardSnapshot(
        timestamp=1000.0 + tick,
        root="/p",
        tools=tools,
        live_monitor=monitor,
        sessions=rows,
        events=[{"ts": 1.0, "kind": "x", "tool": "claude-code"}],
    )


def test_tools_rev_moves_with_the_lists_not_with_the_numbers():
    base = tools_revision(_snapshot(0).tools)
    assert tools_revision(_snapshot(3).tools) == base  # CPU figures changed
    more = _snapshot(0)
    more.tools[0].files.append(ResourceFile(path="/p/new.md", kind="rules", size=1, tokens=1))
    assert tools_revision(more.tools) != base
    gone = _snapshot(0)
    gone.tools[1].mcp_servers = []
    assert tools_revision(gone.tools) != base
    assert json.loads(_snapshot(0).to_json_slim())["tools_rev"] == base


# ── Compression ───────────────────────────────────────────────────


class _Recorder(_DashboardHandler):
    """A handler that writes into memory instead of a socket."""

    def __init__(self, accept_encoding: str | None = None):  # noqa: D107 - no socket
        self.headers = Message()
        if accept_encoding is not None:
            self.headers["Accept-Encoding"] = accept_encoding
        self.sent_headers: dict[str, str] = {}
        self.command = "GET"
        self.status = 0
        self.wfile = io.BytesIO()

    def send_response(self, code, message=None):
        self.status = code

    def send_header(self, key, value):
        self.sent_headers[key] = value

    def end_headers(self):
        pass


BIG = json.dumps({"rows": [{"name": f"row-{i}", "value": i} for i in range(400)]}).encode()


def test_json_is_gzipped_for_a_client_that_accepts_it():
    h = _Recorder("gzip, deflate, br")
    h._json_response_raw(BIG)
    assert h.sent_headers["Content-Encoding"] == "gzip"
    assert "Accept-Encoding" in h.sent_headers["Vary"]
    body = h.wfile.getvalue()
    assert int(h.sent_headers["Content-Length"]) == len(body) < len(BIG) / 3
    assert gzip.decompress(body) == BIG


@pytest.mark.parametrize("header", [None, "", "identity", "br", "gzip;q=0", "deflate"])
def test_json_is_plain_for_a_client_without_gzip(header):
    h = _Recorder(header)
    h._json_response_raw(BIG)
    assert "Content-Encoding" not in h.sent_headers
    assert h.sent_headers["Vary"] == "Accept-Encoding"
    assert h.wfile.getvalue() == BIG


def test_an_unchanged_json_answer_costs_a_304_not_the_body():
    first = _Recorder("gzip")
    first._json_response_raw(BIG)
    etag = first.sent_headers["ETag"]
    again = _Recorder("gzip")
    again.headers["If-None-Match"] = etag
    again._json_response_raw(BIG)
    assert again.status == 304 and again.wfile.getvalue() == b""
    changed = _Recorder("gzip")
    changed.headers["If-None-Match"] = etag
    changed._json_response_raw(BIG + b" ")
    assert changed.status == 200
    # The tag of the gzip form is not the tag of the plain form.
    plain = _Recorder(None)
    plain.headers["If-None-Match"] = etag
    plain._json_response_raw(BIG)
    assert plain.status == 200 and plain.wfile.getvalue() == BIG


def test_a_304_does_not_compress_the_body(monkeypatch):
    first = _Recorder("gzip")
    first._json_response_raw(BIG)
    etag = first.sent_headers["ETag"]

    def fail(*_args, **_kwargs):
        raise AssertionError("compressed a body that a 304 does not send")

    monkeypatch.setattr("aictl.dashboard.web_server._gzip_bytes", fail)
    again = _Recorder("gzip")
    again.headers["If-None-Match"] = etag
    again._json_response_raw(BIG)
    assert again.status == 304


def test_a_loopback_origin_and_gzip_share_one_vary_header():
    h = _Recorder("gzip")
    h.headers["Origin"] = "http://127.0.0.1:3000"
    h._json_response_raw(BIG)
    assert h.sent_headers["Access-Control-Allow-Origin"] == "http://127.0.0.1:3000"
    assert h.sent_headers["Vary"] == "Origin, Accept-Encoding"
    foreign = _Recorder("gzip")
    foreign.headers["Origin"] = "http://example.org"
    foreign._json_response_raw(BIG)
    assert "Access-Control-Allow-Origin" not in foreign.sent_headers


def test_small_bodies_are_not_compressed():
    h = _Recorder("gzip")
    h._json_response_raw(b'{"ok":true}')
    assert "Content-Encoding" not in h.sent_headers and h.wfile.getvalue() == b'{"ok":true}'


def test_accept_encoding_parsing():
    assert _accepts_gzip("gzip") and _accepts_gzip("br, GZIP;q=0.5") and _accepts_gzip("x-gzip")
    assert not _accepts_gzip("gzip;q=0") and not _accepts_gzip("identity") and not _accepts_gzip(None)


def test_static_assets_are_compressed_once_and_cached_by_name(tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    source = ("export const a = 1;\n" * 400).encode()
    (dist / "assets" / "index-AbCd1234.js").write_bytes(source)
    (dist / "assets" / "logo.js").write_bytes(source)
    monkeypatch.setattr(web_server, "_static_dist_candidates", lambda: [dist])
    calls = []
    real = web_server._gzip_bytes
    monkeypatch.setattr(web_server, "_gzip_bytes", lambda b, level=6: calls.append(1) or real(b, level))

    for _ in range(3):
        h = _Recorder("gzip")
        h._serve_static("/assets/index-AbCd1234.js")
        assert gzip.decompress(h.wfile.getvalue()) == source
        assert h.sent_headers["Cache-Control"] == "public, max-age=31536000, immutable"
        assert "Accept-Encoding" in h.sent_headers["Vary"]
    assert len(calls) == 1  # not compressed again on every request

    plain = _Recorder(None)
    plain._serve_static("/assets/index-AbCd1234.js")
    assert plain.wfile.getvalue() == source and "Content-Encoding" not in plain.sent_headers

    unhashed = _Recorder("gzip")
    unhashed._serve_static("/assets/logo.js")
    assert unhashed.sent_headers["Cache-Control"] == "no-cache" and "ETag" in unhashed.sent_headers


def _serve(snapshot: DashboardSnapshot, tmp_path):
    store = SnapshotStore()
    store.update(snapshot)
    srv = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, store, AllowedPaths(), tmp_path)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, store


def _get(url: str, **headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.headers, resp.read()


def test_snapshot_over_http_with_and_without_gzip(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    srv, _store = _serve(_snapshot(0), tmp_path)
    try:
        url = f"http://127.0.0.1:{srv.server_address[1]}/api/snapshot"
        # urllib sends no Accept-Encoding, so this is the client without gzip.
        plain_headers, plain = _get(url)
        assert "Content-Encoding" not in plain_headers
        packed_headers, packed = _get(url, **{"Accept-Encoding": "gzip"})
        assert packed_headers["Content-Encoding"] == "gzip"
        assert len(packed) < len(plain) / 4
        assert gzip.decompress(packed) == plain
        assert packed_headers["ETag"] != plain_headers["ETag"]
    finally:
        srv.shutdown()
        srv.server_close()


def test_a_tick_over_the_wire_is_small(tmp_path, monkeypatch):
    """Through the real handler: a message is a timestamp and a version, nothing more."""
    monkeypatch.setenv("HOME", str(tmp_path))
    srv, store = _serve(_snapshot(0), tmp_path)
    try:
        resp = urllib.request.urlopen(f"http://127.0.0.1:{srv.server_address[1]}/api/stream", timeout=10)

        def message() -> bytes:
            lines = []
            while True:
                line = resp.readline()
                if line in (b"\n", b""):
                    return b"".join(lines)
                lines.append(line)

        first = message()
        store.update(_snapshot(1))
        second = message()
        assert second.startswith(b"data: ") and len(second) < 200
        assert set(json.loads(second[6:])) == {"timestamp", "version"}
        assert json.loads(second[6:])["version"] == json.loads(first[6:])["version"] + 1
        resp.close()
    finally:
        srv.shutdown()
        srv.server_close()


# ── Audit is kept ─────────────────────────────────────────────────


def test_a_second_audit_inside_the_window_does_not_walk_the_disk(tmp_path, monkeypatch):
    from aictl import context_audit

    runs = []
    monkeypatch.setattr(
        context_audit, "run_audit", lambda project, tool=None: runs.append((project, tool)) or {"n": len(runs)}
    )
    now = [0.0]
    cache = AuditCache(ttl_s=60, clock=lambda: now[0])
    assert cache.get(tmp_path)["n"] == 1
    now[0] = 59
    assert cache.get(tmp_path)["n"] == 1
    assert len(runs) == 1
    cache.get(tmp_path, "cursor")  # another tool is another entry
    assert len(runs) == 2
    now[0] = 61
    assert cache.get(tmp_path)["n"] == 3  # the window ended


def test_refresh_bypasses_the_kept_audit(tmp_path, monkeypatch):
    from aictl import context_audit

    runs = []
    monkeypatch.setattr(context_audit, "run_audit", lambda project, tool=None: runs.append(1) or {"n": len(runs)})
    cache = AuditCache(ttl_s=60, clock=lambda: 0.0)
    cache.get(tmp_path)
    assert cache.get(tmp_path, refresh=True)["n"] == 2
    assert cache.get(tmp_path)["n"] == 2


def test_requests_for_one_audit_share_a_single_run_and_do_not_block_others(tmp_path, monkeypatch):
    from aictl import context_audit

    started, release, runs = threading.Event(), threading.Event(), []

    def slow(project, tool=None):
        runs.append(1)
        started.set()
        release.wait(5)
        return {"n": 1}

    monkeypatch.setattr(context_audit, "run_audit", slow)
    cache = AuditCache(ttl_s=60)
    results = []
    threads = [threading.Thread(target=lambda: results.append(cache.get(tmp_path))) for _ in range(4)]
    for t in threads:
        t.start()
    assert started.wait(5)
    # While the cold audit runs, the cache lock is free: another key is answered at once.
    monkeypatch.setattr(context_audit, "run_audit", lambda project, tool=None: {"n": 2})
    assert cache.get(tmp_path / "other")["n"] == 2
    release.set()
    for t in threads:
        t.join(5)
    assert len(runs) == 1 and len(results) == 4


def test_audit_route_passes_refresh_through(monkeypatch, tmp_path):
    from aictl import context_audit
    from aictl.dashboard.audit_cache import AUDIT_CACHE

    runs = []
    monkeypatch.setattr(context_audit, "run_audit", lambda project, tool=None: runs.append(1) or {"n": len(runs)})
    monkeypatch.setenv("HOME", str(tmp_path / "home"))
    AUDIT_CACHE.clear()

    class Stub:
        def __init__(self, query):
            self.server = type("S", (), {"root": Path(tmp_path)})()
            self.query = query
            self.sent = None

        def _qs_get(self, key, default=None):
            return self.query.get(key, default)

        def _json_response(self, data, indent=None, status=200):
            self.sent = data

    for query in ({}, {}, {"refresh": "1"}, {}):
        stub = Stub(query)
        _DashboardHandler._serve_context_audit(stub)
    assert len(runs) == 2
    AUDIT_CACHE.clear()


def _wait_for(check, seconds=5.0):
    import time

    end = time.monotonic() + seconds
    while time.monotonic() < end:
        value = check()
        if value:
            return value
        time.sleep(0.01)
    raise AssertionError("condition not met in time")


def test_poll_answers_at_once_and_says_which_step_runs(tmp_path, monkeypatch):
    import threading

    from aictl import context_audit
    from aictl.dashboard.audit_cache import AuditCache

    release = threading.Event()

    def slow(project, tool=None, progress=None):
        progress("project tree")
        release.wait(5)
        return {"n": 1}

    monkeypatch.setattr(context_audit, "run_audit", slow)
    cache = AuditCache()
    first = cache.poll(tmp_path)
    assert first["status"] == "scanning"
    during = _wait_for(lambda: (r := cache.poll(tmp_path))["step"] == "project tree" and r)
    assert during["status"] == "scanning"
    release.set()
    assert _wait_for(lambda: (r := cache.poll(tmp_path)).get("n") and r) == {"n": 1}


def test_poll_reports_a_failed_scan_once_and_can_run_again(tmp_path, monkeypatch):
    from aictl import context_audit
    from aictl.dashboard.audit_cache import AuditCache

    def broken(project, tool=None, progress=None):
        raise OSError("disk gone")

    monkeypatch.setattr(context_audit, "run_audit", broken)
    cache = AuditCache()
    cache.poll(tmp_path)
    answer = _wait_for(lambda: (r := cache.poll(tmp_path)).get("error") and r)
    assert "disk gone" in answer["error"]
    monkeypatch.setattr(context_audit, "run_audit", lambda project, tool=None, progress=None: {"n": 2})
    assert _wait_for(lambda: (r := cache.poll(tmp_path)).get("n") and r) == {"n": 2}


def test_bounded_glob_matches_like_a_recursive_glob_and_skips_large_folders(tmp_path):
    from aictl.context_audit import _bounded_glob

    for rel in ["a.md", "x/b.md", "x/y/c.md", "x/y/c.txt", "node_modules/z/d.md", ".hidden/e.md", "x/rules/f.md"]:
        path = tmp_path / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("t")
    names = {Path(p).name for p in _bounded_glob(str(tmp_path / "**" / "*.md"))}
    assert names == {"a.md", "b.md", "c.md", "f.md"}
    assert {Path(p).name for p in _bounded_glob(str(tmp_path / "**" / "rules" / "*.md"))} == {"f.md"}
    assert {Path(p).name for p in _bounded_glob(str(tmp_path / "x" / "*.md"))} == {"b.md"}


def test_bounded_glob_stops_at_the_folder_limit(tmp_path, monkeypatch):
    from aictl import context_audit

    for i in range(20):
        (tmp_path / f"d{i}").mkdir()
        (tmp_path / f"d{i}" / "a.md").write_text("t")
    monkeypatch.setattr(context_audit, "MAX_WALK_DIRS", 5)
    assert len(list(context_audit._bounded_glob(str(tmp_path / "**" / "*.md")))) < 5


def test_an_audit_past_its_time_budget_returns_and_lists_what_it_skipped(tmp_path, monkeypatch):
    from aictl import context_audit

    monkeypatch.setattr(context_audit, "AUDIT_BUDGET_S", -1.0)
    steps = []
    result = context_audit.run_audit(tmp_path, baseline_file=tmp_path / "base.json", progress=steps.append)
    assert steps == []
    assert "project tree" in result["incomplete"]
    assert "models in force" in result["incomplete"]


def test_an_update_while_the_first_message_is_sent_is_not_missed(tmp_path, monkeypatch):
    """An update that lands between the first message and the wait still reaches the client."""
    from aictl.dashboard import web_server

    monkeypatch.setenv("HOME", str(tmp_path))
    srv, store = _serve(_snapshot(0), tmp_path)
    real = web_server.DashboardHandler._write_sse if hasattr(web_server, "DashboardHandler") else None
    handler_cls = srv.RequestHandlerClass
    real = handler_cls._write_sse
    sent = []

    def write_then_update(self, snap, *args):
        real(self, snap, *args)
        if not sent:
            sent.append(1)
            store.update(_snapshot(1))  # lands before the handler starts to wait

    monkeypatch.setattr(handler_cls, "_write_sse", write_then_update)
    try:
        resp = urllib.request.urlopen(f"http://127.0.0.1:{srv.server_address[1]}/api/stream", timeout=5)

        def message() -> bytes:
            lines = []
            while True:
                line = resp.readline()
                if line in (b"\n", b""):
                    return b"".join(lines)
                lines.append(line)

        message()
        assert message().startswith(b"data: ")  # the update, not a 30 s keepalive
        resp.close()
    finally:
        srv.shutdown()
        srv.server_close()
