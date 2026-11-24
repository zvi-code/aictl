"""Check dashboard contracts without a daemon or a Kusto connection."""

from __future__ import annotations

import gzip
import json
import re
from copy import deepcopy
from importlib.resources import files
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from jsonschema.exceptions import best_match
from referencing import Registry, Resource

from aictl.dashboard.contract import CONTRACT_VERSION
from aictl.dashboard.live.protocol import TOPICS

ROOT = Path(__file__).resolve().parents[1]
RECORDINGS = ROOT / "test" / "recordings"
UI = ROOT / "src" / "aictl" / "dashboard" / "ui"
PACKAGE = files("aictl.dashboard.contract")
INDEX = json.loads(PACKAGE.joinpath("index.json").read_text(encoding="utf-8"))
SCHEMAS = {
    name: json.loads(PACKAGE.joinpath(name).read_text(encoding="utf-8"))
    for group in ("board", "topics", "details", "shared")
    for name in INDEX[group].values()
}
REGISTRY = Registry().with_resources(
    (schema["$id"], Resource.from_contents(schema)) for schema in SCHEMAS.values()
)
VALIDATORS = {
    group: {key: Draft202012Validator(SCHEMAS[name], registry=REGISTRY) for key, name in INDEX[group].items()}
    for group in ("board", "topics", "details", "shared")
}
ENTITY_SCHEMA = SCHEMAS[INDEX["shared"]["live-entity"]]
ENTITY_VALIDATORS = {
    branch["properties"]["topic"]["const"]: VALIDATORS["shared"]["live-entity"].evolve(
        schema={"$id": ENTITY_SCHEMA["$id"], **branch}
    )
    for branch in ENTITY_SCHEMA["oneOf"]
}
TERMINAL_DETAILS = {
    "/api/board/terminal/events", "/api/board/terminal/file", "/api/board/terminal/metrics",
    "/api/board/terminal/resources", "/api/board/terminal/sessions",
}

# Read on demand by the drawer; their bodies are checked against Kusto replay in test_memory_views.py.
MEMORY_DETAILS = {
    "/api/board/memory/diff", "/api/board/memory/versions", "/api/board/agent/recalls", "/api/board/agent/checkpoint/files",
}

# Read on demand by the flow; their bodies are checked against Kusto replay in test_thinking.py.
THINKING_DETAILS = {"/api/board/thinking", "/api/board/thinking/search"}


# Routes whose contract gained required fields after the tapes of 2026-11-20 were captured.
# A capture cannot hold a field that did not exist yet, so these taped bodies are not checked.
# What the current code returns for them is checked against the same schemas where each names
# its test, so the contract itself is not loosened:
#   /api/board/sessions  test_session_finder.py (validate_detail on search_sessions output)
#   /api/board/agent     check_history_projections below (session_details.agent_detail)
#   /api/board/context   test_board_api.py TestContext.test_files_list_context_and_count_the_rest_by_kind
CHANGED_SINCE_CAPTURE = {"/api/board/sessions", "/api/board/agent", "/api/board/context"}


def _validate(validator, value, label):
    error = next(validator.iter_errors(value), None)
    if error is not None:
        # Report rule and location, not values from the capture.
        error = best_match([error])
        detail = f" ({error.message})" if error.validator == "required" else ""
        pytest.fail(f"{label}: {error.json_path}: {error.validator}{detail}", pytrace=False)


def validate_board(body, label="board"):
    schemas = VALIDATORS["board"]
    assert set(schemas) - {"node_scope"} <= body.keys()
    assert body.keys() <= set(schemas), f"{label}: unindexed fields {body.keys() - schemas.keys()}"
    for key, value in body.items():
        _validate(schemas[key], value, f"{label}#{key}")


def validate_detail(route, payload, label=None):
    _validate(VALIDATORS["details"][route], payload, label or route)


@pytest.mark.parametrize("filename", SCHEMAS)
def test_schema_is_valid(filename):
    Draft202012Validator.check_schema(SCHEMAS[filename])


def test_index_lists_every_schema_and_topic():
    assert set(SCHEMAS) == {path.name for path in PACKAGE.iterdir() if path.name.endswith(".schema.json")}
    assert set(INDEX["topics"]) == ENTITY_VALIDATORS.keys() == TOPICS.keys()
    for branch in ENTITY_SCHEMA["oneOf"]:
        props = branch["properties"]
        topic = props["topic"]["const"]
        assert props["source"]["enum"] == TOPICS[topic]["sources"]
        assert props["data"]["$ref"] == INDEX["topics"][topic]


def test_capabilities_advertise_the_contract_version():
    from test_live_routes import handler

    request = handler("/api/live/capabilities", object())
    request._do_GET()
    assert request.status == 200
    payload = json.loads(request.wfile.getvalue())
    _validate(VALIDATORS["shared"]["live-capabilities"], payload, "/api/live/capabilities")
    assert payload["contract_version"] == CONTRACT_VERSION == INDEX["contract_version"]
    assert payload["stream"] is not None


def _tapes(suffix):
    return sorted(RECORDINGS.glob(f"**/*-{suffix}.jsonl.gz"))


def _records(path):
    with gzip.open(path, "rt", encoding="utf-8") as file:
        yield from map(json.loads, file)


def test_recorded_rest_payloads():
    # Playwright serves the same quiet/busy tapes, plus the supplemental main tape.
    seen, taped = set(), set()
    for tape in _tapes("rest"):
        for record in _records(tape):
            route = record["route"].partition("#")[0]
            route = re.sub(r"^(/api/copilot-sessions)/[^/]+", r"\1/{id}", route)
            route = re.sub(r"^(/api/tool-config)/[^/]+$", r"\1/{tool}", route)
            if record.get("status") != 200 or "body" not in record:
                continue
            taped.add(route)
            label = f"{tape.relative_to(RECORDINGS)}: {record['route']}"
            if route in CHANGED_SINCE_CAPTURE:
                continue
            if route == "/api/board":
                validate_board(record["body"], label)
            elif route in VALIDATORS["details"]:
                validate_detail(route, record["body"], label)
            else:
                continue
            seen.add(route)
    # Board error and prompt success bodies come from Kusto replay. The remaining
    # exceptions read local files; the HTTP captures did not return success bodies.
    local_file_routes = {
        "/api/copilot-sessions", "/api/copilot-sessions/{id}", "/api/copilot-sessions/{id}/artifact",
        "/api/copilot-sessions/{id}/artifacts", "/api/tool-config/{tool}",
    }
    # Board history is exercised against seeded local and scoped readers.
    no_capture = local_file_routes | {
        "/api/board/error", "/api/board/prompt", "/api/board/agent/kql", "/api/history/board", "/api/history/board/section",
    } | TERMINAL_DETAILS | MEMORY_DETAILS | THINKING_DETAILS
    assert (set(VALIDATORS["details"]) | {"/api/board"}) - seen <= no_capture | CHANGED_SINCE_CAPTURE
    # A route leaves the list when a new capture has it; an entry no tape holds is stale.
    assert CHANGED_SINCE_CAPTURE <= taped


def test_terminal_detail_contracts(tmp_path):
    from types import SimpleNamespace
    from urllib.parse import urlencode

    from aictl.dashboard.board_routes import handle_get
    from aictl.dashboard.models import DashboardSnapshot, DashboardTool
    from aictl.stores import Store
    from aictl.stores.testing import FixtureReader
    from aictl.tools import McpServerInfo, MemoryEntry, ProcessInfo, ResourceFile

    file = tmp_path / "guide [1].md"
    file.write_text("test file\n", encoding="utf-8")
    snapshot = DashboardSnapshot(
        123, str(tmp_path),
        [DashboardTool("copilot-cli", "Copilot CLI", files=[ResourceFile(str(file), "instructions")],
                       processes=[ProcessInfo(42, "copilot", "copilot --help")],
                       mcp_servers=[{"name": "mcp", "config": {}}])],
        agent_memory=[MemoryEntry("source", "default")],
        mcp_detail=[McpServerInfo("mcp", "copilot-cli")],
        sessions=[{"session_id": "s1", "tool": "copilot-cli", "pids": [42], "file_events": 3}],
    )
    reader = FixtureReader({
        "events.page": [{"ts": 100, "tool": "copilot-cli", "kind": "hook", "detail": "{}",
                         "session_id": "s1", "pid": 42}],
        "samples.metrics": [{"metric": "aictl.cpu", "count": 1, "latest_ts": 100, "last_value": 5}],
        "samples.page": [{"ts": 100, "value": 5}],
    })
    owner = SimpleNamespace(snapshot=snapshot, history_store=Store(reader=reader))
    cases = {
        "events": ("limit=1", [{"ts": 100, "tool": "copilot-cli", "kind": "hook", "detail": {},
                                "session_id": "s1", "pid": 42}]),
        "file": (urlencode({"path": str(file)}), {"text": "test file\n", "truncated": False}),
        "metrics": ("", [{"metric": "aictl.cpu", "count": 1, "latest_ts": 100, "last_value": 5}]),
        "resources": ("export=1", None),
        "sessions": ("", snapshot.sessions),
    }
    assert {f"/api/board/terminal/{view}" for view in cases} == TERMINAL_DETAILS
    for view, (query, expected) in cases.items():
        path = f"/api/board/terminal/{view}"
        status, body = handle_get(path, query, owner, owner, now=123, is_allowed=lambda p: p == str(file))
        assert status == 200, (path, body)
        payload = json.loads(body)
        validate_detail(path, payload)
        if expected is not None:
            assert payload == expected

    path = "/api/board/terminal/metrics"
    status, body = handle_get(path, "metric=aictl.cpu&since=60", owner, owner, now=123)
    assert status == 200
    series = json.loads(body)
    validate_detail(path, series)
    assert series == {"ts": [100], "value": [5]}
    assert reader.calls[-1][1]["since"] == 60
    assert handle_get("/api/board/terminal/file", cases["file"][0], owner, owner, now=123)[0] == 403


def test_health_store_reader_and_writer_counters():
    store = VALIDATORS["shared"]["health-store"]
    payload = {"kind": "kusto", "destination": None, "reader": None, "writer": None}
    store.validate(payload)
    table = {
        "mode": "queued", "queue_depth": 0, "queue_bytes": 0, "in_flight": 0, "rows_sent": 0,
        "rows_dropped": 0, "lost_at_exit": 0, "last_error": None, "ingest_requests": 0,
        "ingest_failures": 0, "bytes_sent": 0, "last_sent_at": None, "last_error_at": None,
    }
    payload["reader"] = {"status": "ready", "queries": 1, "query_failures": 0, "last_latency_ms": 1.5}
    payload["writer"] = {"status": "active", "warning": None, "tables": {"events": table}}
    store.validate(payload)
    table["rows_sent"] = "0"
    assert not store.is_valid(payload)


def _restore_recorded_literals(topic, data):
    # Phase-0 captures masked these literals. The live producer does not.
    if topic == "source.status" and data.get("component", "").startswith("anon_"):
        if data.get("topic") == "configuration.file":
            return {**data, "component": "configuration"}
        if "frontier" in data and "details" in data:
            return {**data, "component": "history_reader"}
    if topic == "history.board" and data.get("field") == "credits":
        value = data["value"]
        if value and value.get("unit", "").startswith("anon_"):
            return {**data, "value": {**value, "unit": "ai_credits"}}
    return data


def test_recorded_live_entity_payloads():
    seen = set()
    for tape in _tapes("sse"):
        for record in _records(tape):
            body = record.get("data") or {}
            for entity in (*body.get("entities", []), *body.get("upserts", [])):
                topic = entity["topic"]
                data = _restore_recorded_literals(topic, entity["data"])
                _validate(
                    ENTITY_VALIDATORS[topic], {**entity, "data": data},
                    f"{tape.relative_to(RECORDINGS)}: {topic}",
                )
                seen.add(topic)
    # Historic captures predate opt-in agent watches. Exercise that envelope separately.
    assert seen == TOPICS.keys() - {"history.agent"}


def test_agent_watch_entity_contract():
    topic = "history.agent"
    _validate(ENTITY_VALIDATORS[topic], {
        "topic": topic, "id": "watched-agent", "revision": 1, "source": "kusto.queryable",
        "data": {"agent_id": "example", "view": "transcript", "status": 404, "value": None},
    }, topic)


@pytest.fixture(scope="module")
def kusto_tape():
    # Use the same frozen seed and read tape as the board API regression tests.
    # Do not record into that module when the optional database test runs.
    from kusto_replay import Tape

    with pytest.MonkeyPatch.context() as patch:
        patch.delenv("AICTL_RECORD_KUSTO", raising=False)
        return Tape("test_board_api")


def check_history_projections(store):
    from test_board_api import DAY, NOW, seed

    from aictl.dashboard import artifact_details, board_filters, board_projection, session_details
    seed(store, NOW)
    board = board_projection.compute_board(store, board_filters.Filters(since=NOW - 7 * DAY, until=NOW), now=NOW)
    validate_board(board)
    assert board["agents"] and board["prompts"]
    cases = (
        ("/api/board/agent", session_details.agent_detail(store, "done", now=NOW)),
        ("/api/board/tool", artifact_details.tool_detail(store, "Edit", now=NOW)),
        ("/api/board/error", artifact_details.error_detail(store, "tool:Bash:No such file #", now=NOW)),
        ("/api/board/file", artifact_details.file_detail(store, "/p/alpha/src/a.py", now=NOW)),
        ("/api/board/prompt", artifact_details.prompt_detail(store, NOW - 2 * DAY + 25, "done", now=NOW)),
    )
    for path, (status, body) in cases:
        assert status == 200, path
        validate_detail(path, body)


def test_recorded_kusto_projections(kusto_store):
    check_history_projections(kusto_store)


def test_required_board_and_topic_fields():
    scope = VALIDATORS["board"]["scope"]
    value = {"shown_agents": 1, "shown_sessions": 1, "all_agents": 2}
    scope.validate(value)
    del value["shown_sessions"]
    assert not scope.is_valid(value)
    history = VALIDATORS["topics"]["history.board"]
    marker = {"scope": "", "field": "agents", "value": [], "collection": True}
    history.validate(marker)
    assert not history.is_valid({**marker, "value": [{}]})
    assert not history.is_valid({"scope": "", "field": "agents", "value": {"id": "missing-row-key"}})


def test_required_detail_field():
    excerpt = VALIDATORS["details"]["/api/board/excerpt"]
    value = {"path": "example.py", "line": 1, "lines": [{"n": 1, "text": "pass"}]}
    excerpt.validate(value)
    invalid = deepcopy(value)
    del invalid["lines"][0]["n"]
    assert not excerpt.is_valid(invalid)
