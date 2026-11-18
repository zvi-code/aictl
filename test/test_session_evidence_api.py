import json
import threading
import time
import urllib.error
import urllib.request

import pytest

from aictl.dashboard.session_evidence import EvidenceInputError, session_evidence
from aictl.storage import CallFacts, HistoryDB, SessionStepRow


def test_session_evidence_search_is_scoped_paged_and_capture_aware(tmp_path):
    db = HistoryDB(tmp_path / "history.db", flush_interval=0)
    ts = time.time() - 3
    try:
        db.write_call_facts(CallFacts(steps=[
            SessionStepRow("a", ts, "mine", "message", text="pytest\n" + "x" * 800, turn_id="turn"),
            SessionStepRow("b", ts + 1, "mine", "command", text="pytest -q", tool_call_id="call"),
            SessionStepRow("c", ts + 2, "mine", "context", context_tokens=0, estimated=0),
            SessionStepRow("z", ts, "other", "message", text="pytest not in scope"),
        ]))
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
    finally:
        db.close()


def test_local_evidence_http_returns_no_store_and_rejects_foreign_host(tmp_path):
    from aictl.dashboard.web_server import _DashboardHandler, _DashboardHTTPServer
    from aictl.orchestrator import AllowedPaths, SnapshotStore

    db = HistoryDB(tmp_path / "test.db", flush_interval=0)
    server = _DashboardHTTPServer(("127.0.0.1", 0), _DashboardHandler, SnapshotStore(db=db),
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
        db.close()
