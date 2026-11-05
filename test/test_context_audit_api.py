# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""GET /api/context-audit routes to the audit and reports failure as an error body."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from aictl import context_audit as ca
from aictl.dashboard.web_server import _DashboardHandler


class _Stub:
    def __init__(self, root, query=None):
        self.server = SimpleNamespace(root=root)
        self.query = query or {}
        self.sent = None

    def _qs_get(self, key, default=None):
        return self.query.get(key, default)

    def _json_response(self, data, indent=None, status=200):
        self.sent = (data, status)


def _run(monkeypatch, tmp_path, stub):
    monkeypatch.setenv("HOME", str(tmp_path / "home"))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "home" / ".config"))
    _DashboardHandler._serve_context_audit(stub)
    return stub.sent


def test_route_returns_the_report_contract_for_the_served_root(monkeypatch, tmp_path):
    root = tmp_path / "repo"
    root.mkdir()
    (root / "CLAUDE.md").write_text("Rules.\n", encoding="utf-8")
    body, status = _run(monkeypatch, tmp_path, _Stub(root))
    assert status == 200
    assert {"sources", "findings", "drift", "unattributed", "scanned_at", "duration_ms"} <= set(body)
    assert body["project"] == str(root.resolve())
    assert any(s["path"] == str(root.resolve() / "CLAUDE.md") for s in body["sources"])


def test_route_ignores_a_project_that_is_not_a_directory(monkeypatch, tmp_path):
    root = tmp_path / "repo"
    root.mkdir()
    body, _status = _run(monkeypatch, tmp_path, _Stub(root, {"project": str(tmp_path / "missing")}))
    assert body["project"] == str(root.resolve())


def test_route_turns_a_failure_into_an_error_body(monkeypatch, tmp_path):
    def boom(*a, **k):
        raise RuntimeError("scan broke")

    monkeypatch.setattr(ca, "run_audit", boom)
    body, status = _run(monkeypatch, tmp_path, _Stub(Path(tmp_path)))
    assert status == 500 and "scan broke" in body["error"]
