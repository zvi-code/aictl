"""Regression tests for the dashboard/CLI security-fix batch.

Covers (one class per fix):
  1. SQL injection via tag keys in HistoryDB.query_samples / /api/samples
  2. Path traversal in static asset serving (/assets/..)
  3. CORS: Access-Control-Allow-Origin reflected for loopback origins only
  4. CSRF guard: POST/PUT with a non-loopback Origin header is rejected
  5. Shell quoting of env values written by `aictl otel enable`
  6. Malformed Content-Length on POST/PUT bodies

Uses the same real-HTTP-server harness as test_api_endpoints.py.
"""

from __future__ import annotations

import json
import shlex
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import pytest

from aictl.dashboard.models import DashboardSnapshot
from aictl.orchestrator import AllowedPaths, SnapshotStore
from aictl.storage import HistoryDB, Sample

# ── Harness ───────────────────────────────────────────────────────


def _make_snapshot(sessions=None):
    return DashboardSnapshot(
        timestamp=time.time(),
        root="/tmp/test-project",
        tools=[],
        sessions=sessions or [],
    )


@pytest.fixture()
def db(tmp_path):
    """File-based DB with one tagged sample (in-memory DBs are per-thread)."""
    db = HistoryDB(db_path=str(tmp_path / "sec.db"), flush_interval=0)
    db.append_samples([Sample(ts=time.time(), metric="mem.total", value=8192, tags={"tool": "claude-code"})])
    yield db
    db.close()


@pytest.fixture()
def server(db):
    """Real HTTP server on a random port with one live session, yields base URL."""
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer

    store = SnapshotStore(db=db)
    store.update(
        _make_snapshot(
            sessions=[{"session_id": "live-001", "tool": "claude-code", "duration_s": 1, "pids": [1234]}]
        )
    )
    srv = _DashboardHTTPServer(
        ("127.0.0.1", 0),
        _DashboardHandler,
        store,
        AllowedPaths(),
        Path("/tmp/test-project"),
    )
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}"
    srv.shutdown()


def _request(url, method="GET", headers=None, data=None):
    """Issue a request, returning (status, headers, body) even on HTTP errors."""
    req = urllib.request.Request(url, method=method, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, resp.headers, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read()


def _raw_status(base_url, raw: bytes) -> int:
    """Send raw request bytes over a socket and return the response status.

    urllib normalises URL paths and validates headers, so traversal and
    malformed-header requests must be sent on a raw socket — exactly what a
    hostile client would do.
    """
    parsed = urllib.parse.urlparse(base_url)
    with socket.create_connection((parsed.hostname, parsed.port), timeout=5) as sock:
        sock.sendall(raw)
        sock.settimeout(5)
        buf = b""
        while b"\r\n" not in buf:
            chunk = sock.recv(4096)
            if not chunk:
                break
            buf += chunk
        # e.g. b"HTTP/1.0 404 Not Found\r\n..."
        return int(buf.split(b" ", 2)[1])


# ── 1. SQL injection via tag keys ─────────────────────────────────

HOSTILE_TAG_KEY = "x') OR 1=1 --"


class TestQuerySamplesTagKeyInjection:
    def test_storage_rejects_hostile_tag_key(self, db):
        with pytest.raises(ValueError, match="Invalid tag key"):
            db.query_samples(tag_filter={HOSTILE_TAG_KEY: "v"})

    def test_storage_accepts_legit_tag_key(self, db):
        rows = db.query_samples(tag_filter={"tool": "claude-code"})
        assert len(rows) == 1
        assert rows[0].tags["tool"] == "claude-code"

    def test_api_returns_400_for_hostile_tag_key(self, server):
        key = urllib.parse.quote("tag." + HOSTILE_TAG_KEY, safe="")
        status, _, body = _request(f"{server}/api/samples?since=0&{key}=v")
        assert status == 400
        assert "Invalid tag key" in json.loads(body)["error"]

    def test_api_still_serves_legit_tag_filter(self, server):
        status, _, body = _request(f"{server}/api/samples?since=0&tag.tool=claude-code")
        assert status == 200
        data = json.loads(body)
        assert len(data) == 1
        assert data[0]["tags"]["tool"] == "claude-code"


# ── 2. Path traversal in static serving ───────────────────────────


class TestStaticPathTraversal:
    @pytest.fixture()
    def static_dist(self, tmp_path, monkeypatch):
        """Temp dist dir with one asset, plus a secret file OUTSIDE it."""
        import aictl.dashboard.web_server as ws

        dist = tmp_path / "dist"
        (dist / "assets").mkdir(parents=True)
        (dist / "assets" / "app.js").write_text("console.log('ok')\n")
        (tmp_path / "secret.txt").write_text("TOP SECRET\n")
        # Module global resolved at call time → patch is seen by server thread.
        monkeypatch.setattr(ws, "_static_dist_candidates", lambda: [dist])
        return dist

    def test_normal_asset_is_served(self, server, static_dist):
        status, _, body = _request(f"{server}/assets/app.js")
        assert status == 200
        assert b"console.log" in body

    def test_dotdot_escaping_dist_is_404(self, server, static_dist):
        status = _raw_status(
            server,
            b"GET /assets/../../secret.txt HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
        )
        assert status == 404

    def test_dotdot_within_dist_still_confined(self, server, static_dist):
        # Resolves to dist/assets/app.js — inside the dist dir, so allowed.
        status = _raw_status(
            server,
            b"GET /assets/../assets/app.js HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
        )
        assert status == 200


# ── 3. CORS: loopback-only origin reflection ──────────────────────


class TestCorsLoopbackOnly:
    def test_evil_origin_gets_no_acao(self, server):
        status, headers, _ = _request(
            f"{server}/api/samples?list=1", headers={"Origin": "http://evil.example"}
        )
        assert status == 200  # GETs are not blocked — just not CORS-readable
        assert headers.get("Access-Control-Allow-Origin") is None

    def test_loopback_origin_is_reflected(self, server):
        status, headers, _ = _request(
            f"{server}/api/samples?list=1", headers={"Origin": "http://127.0.0.1:5173"}
        )
        assert status == 200
        assert headers.get("Access-Control-Allow-Origin") == "http://127.0.0.1:5173"
        assert "Origin" in (headers.get("Vary") or "")

    def test_localhost_origin_is_reflected(self, server):
        _, headers, _ = _request(
            f"{server}/api/samples?list=1", headers={"Origin": "http://localhost:5173"}
        )
        assert headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"

    def test_no_origin_header_means_no_acao(self, server):
        status, headers, _ = _request(f"{server}/api/samples?list=1")
        assert status == 200
        assert headers.get("Access-Control-Allow-Origin") is None

    def test_evil_subdomain_lookalike_gets_no_acao(self, server):
        _, headers, _ = _request(
            f"{server}/api/samples?list=1", headers={"Origin": "http://localhost.evil.example"}
        )
        assert headers.get("Access-Control-Allow-Origin") is None


# ── 4. CSRF guard on state-changing endpoints ─────────────────────


class TestCsrfOriginGuard:
    def test_session_kill_with_evil_origin_is_403(self, server, monkeypatch):
        import aictl.dashboard.api_handlers as ah

        monkeypatch.setattr(ah, "_kill_session_pids", lambda *a: pytest.fail("must not signal"))
        status, _, _ = _request(
            f"{server}/api/session-kill",
            method="POST",
            data=json.dumps({"session_id": "live-001", "confirm": True}).encode(),
            headers={"Origin": "http://evil.example", "Content-Type": "application/json"},
        )
        assert status == 403

    def test_session_kill_without_origin_passes_guard(self, server):
        # Unknown session → 404 proves the request got past the CSRF guard.
        status, _, _ = _request(
            f"{server}/api/session-kill",
            method="POST",
            data=json.dumps({"session_id": "nope", "confirm": True}).encode(),
            headers={"Content-Type": "application/json"},
        )
        assert status != 403
        assert status == 404

    def test_hook_post_with_evil_origin_is_403(self, server):
        status, _, _ = _request(
            f"{server}/api/hooks",
            method="POST",
            data=b'{"event": "SessionStart", "session_id": "s1"}',
            headers={"Origin": "http://evil.example", "Content-Type": "application/json"},
        )
        assert status == 403

    def test_hook_post_without_origin_succeeds(self, server):
        # aictl's own hook_handler sends no Origin header — must keep working.
        status, _, body = _request(
            f"{server}/api/hooks",
            method="POST",
            data=b'{"event": "SessionStart", "session_id": "s1"}',
            headers={"Content-Type": "application/json"},
        )
        assert status == 200
        assert json.loads(body) == {"ok": True}

    def test_hook_post_with_loopback_origin_succeeds(self, server):
        status, _, _ = _request(
            f"{server}/api/hooks",
            method="POST",
            data=b'{"event": "SessionStart", "session_id": "s1"}',
            headers={"Origin": "http://127.0.0.1:5173", "Content-Type": "application/json"},
        )
        assert status == 200

    def test_same_origin_non_loopback_passes_guard(self, server):
        # A dashboard deliberately served on a LAN interface: browsers send
        # Origin on every POST, and Origin == Host must count as same-origin.
        body = b'{"event": "SessionStart", "session_id": "s1"}'
        raw = (
            b"POST /api/hooks HTTP/1.1\r\n"
            b"Host: 192.168.1.5:8484\r\n"
            b"Origin: http://192.168.1.5:8484\r\n"
            b"Content-Type: application/json\r\n"
            b"Content-Length: " + str(len(body)).encode() + b"\r\n"
            b"Connection: close\r\n\r\n" + body
        )
        assert _raw_status(server, raw) == 200

    def test_put_with_evil_origin_is_403(self, server):
        status, _, _ = _request(
            f"{server}/api/tool-config/claude-code",
            method="PUT",
            data=b"{}",
            headers={"Origin": "https://evil.example", "Content-Type": "application/json"},
        )
        assert status == 403


# ── 5. Shell quoting of env exports ───────────────────────────────

HOSTILE_VALUE = 'x"; rm -rf $HOME'


class TestEnvExportQuoting:
    def test_env_file_value_round_trips(self, tmp_path, monkeypatch):
        from aictl.commands import integrations

        env_sh = tmp_path / "env.sh"
        monkeypatch.setattr(integrations, "_aictl_env_file", lambda: env_sh)
        integrations._write_env_file({"AICTL_TEST": HOSTILE_VALUE})

        line = next(
            ln for ln in env_sh.read_text(encoding="utf-8").splitlines() if ln.startswith("export AICTL_TEST=")
        )
        # A POSIX shell tokenizes the line back to exactly the original value.
        tokens = shlex.split(line)
        assert tokens[0] == "export"
        key, _, value = tokens[1].partition("=")
        assert key == "AICTL_TEST"
        assert value == HOSTILE_VALUE

    def test_env_file_rejects_hostile_key(self, tmp_path, monkeypatch):
        from aictl.commands import integrations

        monkeypatch.setattr(integrations, "_aictl_env_file", lambda: tmp_path / "env.sh")
        with pytest.raises(ValueError, match="Invalid environment variable name"):
            integrations._write_env_file({'EVIL"; rm -rf /': "v"})

    def test_print_exports_bash_quotes_value(self, capsys):
        from aictl.commands.integrations import _print_exports

        _print_exports(8484, "agent-workspace", "bash", HOSTILE_VALUE)
        out = capsys.readouterr().out
        line = next(ln for ln in out.splitlines() if ln.startswith("export AW_CONTEXT_PROFILE="))
        assert shlex.split(line)[1].partition("=")[2] == HOSTILE_VALUE

    def test_print_exports_fish_quotes_value(self, capsys):
        from aictl.commands.integrations import _print_exports

        _print_exports(8484, "agent-workspace", "fish", HOSTILE_VALUE)
        out = capsys.readouterr().out
        line = next(ln for ln in out.splitlines() if ln.startswith("set -x AW_CONTEXT_PROFILE "))
        assert shlex.split(line)[3] == HOSTILE_VALUE

    def test_print_exports_powershell_single_quotes(self, capsys):
        from aictl.commands.integrations import _print_exports

        _print_exports(8484, "agent-workspace", "powershell", "it's; rm -rf $HOME")
        out = capsys.readouterr().out
        line = next(ln for ln in out.splitlines() if ln.startswith("$env:AW_CONTEXT_PROFILE"))
        # Single-quoted with embedded quotes doubled — nothing interpolates.
        assert line == "$env:AW_CONTEXT_PROFILE = 'it''s; rm -rf $HOME'"


# ── 6. Malformed Content-Length ───────────────────────────────────


class TestMalformedContentLength:
    def test_hook_post_bad_content_length_is_400(self, server):
        status = _raw_status(
            server,
            b"POST /api/hooks HTTP/1.1\r\nHost: x\r\nContent-Length: abc\r\nConnection: close\r\n\r\n",
        )
        assert status == 400

    def test_hook_post_negative_content_length_is_400(self, server):
        status = _raw_status(
            server,
            b"POST /api/hooks HTTP/1.1\r\nHost: x\r\nContent-Length: -5\r\nConnection: close\r\n\r\n",
        )
        assert status == 400

    def test_session_kill_bad_content_length_is_400(self, server):
        status = _raw_status(
            server,
            b"POST /api/session-kill HTTP/1.1\r\nHost: x\r\nContent-Length: abc\r\nConnection: close\r\n\r\n",
        )
        assert status == 400

    def test_tool_config_put_bad_content_length_is_400(self, server):
        status = _raw_status(
            server,
            b"PUT /api/tool-config/claude-code HTTP/1.1\r\nHost: x\r\nContent-Length: abc\r\nConnection: close\r\n\r\n",
        )
        assert status == 400

    def test_server_survives_malformed_request(self, server):
        _raw_status(
            server,
            b"POST /api/hooks HTTP/1.1\r\nHost: x\r\nContent-Length: abc\r\nConnection: close\r\n\r\n",
        )
        # Server must still answer normal requests afterwards.
        status, _, _ = _request(f"{server}/api/samples?list=1")
        assert status == 200
