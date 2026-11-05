# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Routes that read conversations answer this machine only, and never touch a path on another one."""

from __future__ import annotations

import http.client
import os
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl.dashboard.web_server import (
    _LOCAL_ONLY_ROUTES,
    _DashboardHandler,
    _local_request,
    _names_another_machine,
)
from aictl.observe.sessions import ArtifactRefused, confine


@pytest.mark.parametrize(
    "client, host, expected",
    [
        ("127.0.0.1", "127.0.0.1:8484", True),
        ("127.0.0.1", "localhost:8484", True),
        ("::1", "[::1]:8484", True),
        ("::ffff:127.0.0.1", "localhost:8484", True),
        ("192.168.1.20", "127.0.0.1:8484", False),  # another machine, bound to all interfaces
        ("127.0.0.1", "attacker.example:8484", False),  # a page that rebound its name to loopback
        ("127.0.0.1", "", False),
        ("127.0.0.1", None, False),
        ("not-an-address", "localhost", False),
    ],
)
def test_local_request(client, host, expected):
    assert _local_request(client, host) is expected


def _get(port: int, path: str, host: str) -> int:
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
    conn.putrequest("GET", path, skip_host=True)
    conn.putheader("Host", host)
    conn.endheaders()
    status = conn.getresponse().status
    conn.close()
    return status


@pytest.mark.parametrize("route", _LOCAL_ONLY_ROUTES)
def test_each_route_refuses_a_rebound_name_through_the_real_handler(route, tmp_path):
    server = ThreadingHTTPServer(("127.0.0.1", 0), _DashboardHandler)
    server.root = tmp_path
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        assert _get(server.server_address[1], route, "attacker.example") == 403
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.parametrize(
    "path, expected",
    [
        (r"\\evil\share", True),
        ("//evil/share", True),
        (r"\\?\UNC\evil\share\x", True),
        (r"C:\work\repo", False),
        ("/home/me/repo", False),
        ("repo", False),
    ],
)
def test_names_another_machine(path, expected):
    assert _names_another_machine(path) is expected


def test_context_audit_does_not_stat_a_unc_project(monkeypatch, tmp_path):
    touched: list[str] = []
    real_is_dir = Path.is_dir

    def spy(self):
        touched.append(str(self))
        return real_is_dir(self)

    monkeypatch.setattr(Path, "is_dir", spy)
    used: list = []
    monkeypatch.setattr("aictl.context_audit.run_audit", lambda project, tool: used.append(project) or {})
    stub = SimpleNamespace(
        server=SimpleNamespace(root=tmp_path),
        _qs_get=lambda key, default=None: {"project": r"\\evil\share"}.get(key, default),
        _json_response=lambda *a, **k: None,
    )
    _DashboardHandler._serve_context_audit(stub)
    assert used == [tmp_path]
    assert not any("evil" in item for item in touched)


@pytest.mark.parametrize(
    "requested",
    [
        r"\\evil\share\events.jsonl",
        "//evil/share/events.jsonl",
        r"\\?\UNC\evil\share\events.jsonl",
        r"Z:\other\events.jsonl",
    ],
)
def test_confine_refuses_a_foreign_path_before_touching_the_filesystem(monkeypatch, tmp_path, requested):
    touched: list[str] = []
    for name in ("lexists", "exists", "isfile"):
        monkeypatch.setattr(os.path, name, lambda p, name=name: touched.append(str(p)) or False)
    rec = {"roots": [str(tmp_path)], "folder": str(tmp_path)}
    with pytest.raises(ArtifactRefused) as caught:
        confine(rec, requested)
    assert caught.value.status == 403
    assert touched == []


def test_confine_still_accepts_an_absolute_path_inside_the_folder(tmp_path):
    target = tmp_path / "events.jsonl"
    target.write_text("{}\n", encoding="utf-8")
    rec = {"roots": [str(tmp_path)], "folder": str(tmp_path)}
    assert confine(rec, str(target)) == Path(os.path.realpath(target))
