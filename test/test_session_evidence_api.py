import json
import threading
import urllib.error
import urllib.request

import pytest

from aictl.dashboard.session_evidence import EvidenceInputError, session_evidence


def test_session_evidence_search_is_scoped_paged_and_capture_aware(kusto_store):
    db = kusto_store
    for key, ts, sid, kind, text, fields in (
        ("a", 100, "mine", "message", "pytest\n" + "x" * 800, {"turn_id": "turn"}),
        ("b", 101, "mine", "command", "pytest -q", {"tool_call_id": "call"}),
        ("c", 102, "mine", "context", "", {"context_tokens": 0, "estimated": 0}),
        ("z", 100, "other", "message", "pytest not in scope", {}),
    ):
        db.insert("session_steps", step_key=key, ts=ts, session_id=sid, kind=kind,
                  text_status="captured" if text else "not_reported", **fields)
        if text:
            db.insert("session_step_text", step_key=key, ts=ts, session_id=sid, text=text)
    db.insert("session_step_text", step_key="c", ts=102, session_id="mine", node_id="another-node",
              text="pytest not on this node")
    p = {"session_id": ["mine"], "q": ["pytest"], "limit": ["1"]}
    first = session_evidence(db, p)
    assert first["rows"][0]["turn_id"] == "turn" and first["has_more"]
    assert len(first["rows"][0]["text_preview"]) == 240 and "text" not in first["rows"][0]
    second = session_evidence(db, {**p, "offset": ["1"]})
    assert not second["has_more"] and second["rows"][0]["tool_call_id"] == "call"
    detail = session_evidence(db, {"session_id": ["mine"], "step_key": ["a"]})["rows"][0]
    assert len(detail["text"]) == 807 and detail["text_status"] == "captured"
    measured, = session_evidence(db, {"session_id": ["mine"], "kind": ["context"]})["rows"]
    assert measured["context_tokens"] == 0 and measured["context_limit"] is None
    db.capture = "metadata"
    assert not session_evidence(db, p)["rows"]
    detail = session_evidence(db, {"session_id": ["mine"], "step_key": ["b"]})["rows"][0]
    assert detail["text"] == "" and detail["text_status"] == "withheld"
    with pytest.raises(EvidenceInputError):
        session_evidence(db, {"q": ["pytest"]})


def test_local_evidence_http_returns_no_store_and_rejects_foreign_host(tmp_path, kusto_store, monkeypatch):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    db = kusto_store
    snapshot = SnapshotStore(db=db, history_store=db.history_store)
    monkeypatch.setattr(snapshot.session_facts, "text_floor", lambda: 0.0)
    server = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, snapshot,
                                  AllowedPaths(), tmp_path, start_ingesters_now=False)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}/api/session-evidence?session_id=s"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            assert resp.headers["Cache-Control"] == "no-store" and json.load(resp)["rows"] == []
        with pytest.raises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(urllib.request.Request(url, headers={"Host": "not-local.example"}), timeout=5)
        assert error.value.code == 403
    finally:
        server.shutdown()
        server.server_close()
        thread.join(2)


def test_context_history_distinguishes_requests_transitions_and_actual_resets(kusto_store):
    db = kusto_store
    for key, ts, kind, fields in (
        ("request", 100, "session_command", {"name": "clear", "phase": "requested"}),
        ("reset", 101, "context", {"name": "reset", "phase": "applied"}),
        ("usage", 102, "round", {"input_tokens": 0, "output_tokens": 4}),
        ("skill", 103, "skill", {"name": "testing", "phase": "invoked"}),
    ):
        db.insert("session_steps", step_key=key, ts=ts, session_id="s", kind=kind, **fields)

    def group(name):
        return session_evidence(db, {"session_id": ["s"], "context_group": [name]})["rows"]

    assert [(r["name"], r["phase"]) for r in group("changes")] == [("reset", "applied"), ("clear", "requested")]
    assert group("usage")[0]["input_tokens"] == 0 and group("usage")[0]["context_tokens"] is None
    assert [r["name"] for r in group("inputs")] == ["testing"]
