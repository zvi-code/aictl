import json
from urllib.parse import parse_qs, urlsplit

from scripts.recording.scrub import Scrubber, verify_text


def test_scrub_hides_private_values_but_keeps_schema_and_numbers():
    scrubber = Scrubber(key=b"test", identities=("example-person", "workstation-42"))
    home = r"C:\Users\example-person\repo\setup.toml"
    value = {
        "node_id": "workstation-42",
        "path": home,
        "author": "sample@example.invalid",
        "remote": "git@example.invalid:team/private.git",
        "details": {"api_key": "sample-credential", "message": "A private prompt", "status": "active"},
        "events": [{"text": "A private prompt", "ts": 1720000000.53, "tokens": 53}],
        "meta_json": json.dumps({"cwd": home, "refresh": True}),
    }

    clean = scrubber.scrub(value)

    assert clean.keys() == value.keys()
    assert clean["details"]["message"] == clean["events"][0]["text"] != value["details"]["message"]
    assert clean["events"][0]["ts"] == 1720000000.53
    assert clean["events"][0]["tokens"] == 53
    assert clean["details"]["status"] == "active"
    assert clean["path"].endswith(".toml")
    assert json.loads(clean["meta_json"]) == {"cwd": clean["path"], "refresh": True}
    encoded = json.dumps(clean)
    assert not verify_text(encoded, ("example-person", "workstation-42"))
    for private in (value["author"], value["remote"], value["details"]["api_key"]):
        assert private not in encoded


def test_scrub_correlates_kql_rest_and_row_ids():
    scrubber = Scrubber(key=b"test", identities=())
    scrubber.identifiers.add("session_id")
    sid = "private-session-id"
    row = scrubber.scrub({"session_id": sid, "tool": "copilot-cli"})
    route = scrubber.route("/api/copilot-sessions/private-session-id/artifacts?session_id=private-session-id")
    query = scrubber.kql("sessions | where ['session_id'] == 'private-session-id' | take 5 // personal note")

    assert f"/{row['session_id']}/artifacts" in route
    assert parse_qs(urlsplit(route).query)["session_id"] == [row["session_id"]]
    assert f"['session_id'] == \"{row['session_id']}\" | take 5" in query
    assert "private-session-id" not in query
    assert "personal note" not in query
    assert sid not in scrubber.kql(f"print value=dynamic(['{sid}'])")


def test_scrub_preserves_wire_names_and_rejects_common_secret_form():
    scrubber = Scrubber(key=b"test", identities=())
    response = {
        "stream": "/api/live/stream",
        "topics": {"runtime.agent": {"sources": ["runtime.collector"], "delivery": "latest"}},
        "epoch": "epoch",
        "cursor": "epoch:42",
        "sequence": 42,
    }

    clean = scrubber.envelope(response)

    assert clean["stream"] == response["stream"]
    assert clean["topics"] == response["topics"]
    assert clean["cursor"] == clean["epoch"] + ":42"
    example = "gh" + "p_" + ("Z0" * 20)
    assert verify_text(example)
    assert not verify_text(scrubber.scrub({"value": example})["value"])
