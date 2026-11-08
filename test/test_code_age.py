# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A daemon whose code changed on disk after it started says so, so the board can ask for a restart."""

from __future__ import annotations

from types import SimpleNamespace

from aictl import code_age
from aictl.dashboard import board_api


def test_code_changed_after_start_is_reported_and_checked_once_a_minute(monkeypatch):
    newest = [code_age.STARTED_AT - 100]
    calls = []
    monkeypatch.setattr(code_age, "_newest_change", lambda: calls.append(1) or newest[0])
    monkeypatch.setattr(code_age, "_checked", (0.0, None))
    t0 = code_age.STARTED_AT + 10
    assert code_age.code_changed_at(t0) is None
    newest[0] = code_age.STARTED_AT + 50
    assert code_age.code_changed_at(t0 + 30) is None  # checked again only after a minute
    assert code_age.code_changed_at(t0 + 61) == code_age.STARTED_AT + 50
    assert len(calls) == 2


def test_the_real_package_is_read(monkeypatch):
    monkeypatch.setattr(code_age, "_checked", (0.0, None))
    assert code_age._newest_change() > 0


def test_the_machine_payload_carries_it(tmp_path, monkeypatch):
    from aictl.storage import HistoryDB

    monkeypatch.setattr(code_age, "code_changed_at", lambda now=None: 123.0)
    db = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    try:
        me = board_api.compute_machine(db, SimpleNamespace(snapshot=None))["pipeline"]["self"]
    finally:
        db.close()
    assert me["code_changed_at"] == 123.0 and me["started_at"] == code_age.STARTED_AT
