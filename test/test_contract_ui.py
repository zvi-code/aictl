"""Use the backend validators for both UI fixture families."""

import json
import re
import shutil
import subprocess

import pytest
from test_contract import ENTITY_VALIDATORS, INDEX, SCHEMAS, UI, VALIDATORS, _validate


@pytest.fixture(scope="module")
def ui_fixtures():
    if not shutil.which("node"):
        pytest.skip("Node is required to load the dashboard's JavaScript fixtures")
    data = subprocess.run(
        ["node", "--experimental-strip-types", r"scripts\contract-fixtures.mjs"],
        cwd=UI,
        check=True,
        capture_output=True,
        encoding="utf-8",
    )
    return json.loads(data.stdout)


def _check_fixture(validator, data, *, missing=(), types=()):
    # Legacy fixtures predate the wire contract. Pin each known omission and
    # type mismatch; a new mismatch (or a repaired fixture) changes the set.
    accepted = {("required", path) for path in missing} | {("type", path) for path in types}
    actual = set()
    for error in validator.iter_errors(data):
        path = re.sub(r"\[\d+\]", "[]", error.json_path)
        if error.validator == "required":
            prop = error.message.split(" is a required property", 1)[0].strip("'")
            path = f"{path}.{prop}"
        actual.add((error.validator, path))
    assert actual == accepted


def test_synthetic_board_fixture(ui_fixtures):
    board = ui_fixtures["board"]
    assert set(INDEX["board"]) - board.keys() == {
        "node_scope", "tool_labels", "settings_at", "unpriced", "prompts_total",
        "tests_piped", "credits", "project_prompts_searched",
    }
    missing = {
        "range": ("$.partial_bucket",),
        "scope": ("$.shown_sessions",),
        "kpis": ("$.idle",),
        "prompts": ("$[].session_id",),
        "tools": ("$[].mcp_server", "$[].avg_input_bytes", "$[].avg_output_bytes", "$[].output_bytes"),
        "confirms": ("$.blocked", "$.by_tool[].blocked"),
        "loops": ("$[].at_end",),
        "sources": ("$[].locations",),
        "coverage": ("$.notes",),
        "self": ("$.history_live_bytes",),
    }
    for key, value in board.items():
        validator = VALIDATORS["board"][key]
        if key == "self":
            validator = validator.evolve(schema=SCHEMAS[INDEX["board"][key]]["anyOf"][0])
        _check_fixture(
            validator, value, missing=missing.get(key, ()),
            types=("$[].pids",) if key == "agents" else (),
        )


def test_synthetic_detail_fixtures(ui_fixtures):
    details = VALIDATORS["details"]
    shared = VALIDATORS["shared"]
    _check_fixture(
        details["/api/board/agent"], ui_fixtures["agent"],
        missing=(
            "$.artifacts_total", "$.artifacts_bytes", "$.prs_note", "$.artifacts", "$.commits",
            "$.git", "$.runs", "$.tool_totals", "$.skills", "$.sources", "$.context_files",
            "$.resources", "$.context", "$.by_model[].tokens", "$.by_model[].cached_share",
            "$.turns[].cache_write", "$.turns[].cost_usd", "$.turns[].subagent_calls",
            "$.tool_calls[].input_bytes", "$.tool_calls[].output_bytes",
        ),
        types=("$.agent.pids", "$.process.pids", "$.subagents[].pids", "$.turns[].tools"),
    )


def test_synthetic_live_fixtures(ui_fixtures):
    capabilities = ui_fixtures["capabilities"]
    _check_fixture(
        VALIDATORS["shared"]["live-capabilities"], capabilities,
        missing=(
            "$.contract_version", "$.legacy_stream", "$.datapoint_catalog",
            "$.history", "$.configuration", "$.sequence",
        ),
    )
    assert set(capabilities["topics"]) == INDEX["topics"].keys()
    _validate(ENTITY_VALIDATORS["history.board"], ui_fixtures["entity"], "liveField fixture")


def test_gallery_recording_fixture():
    path = UI / "test" / "fixtures" / "gallery" / "recording.json"
    recordings = json.loads(path.read_text(encoding="utf-8"))
    assert recordings.keys() == {"quiet", "busy"}
    agent = SCHEMAS[INDEX["shared"]["history-agent-row"]]["properties"]
    machine = SCHEMAS[INDEX["shared"]["machine-local"]]["properties"]
    entry = next(
        row["properties"] for row in SCHEMAS[INDEX["topics"]["history.board"]]["oneOf"]
        if row["properties"]["field"]["const"] == "agents" and "key" in row["properties"]
    )
    validator = VALIDATORS["shared"]["history-agent-row"]
    for window in recordings.values():
        assert window["agents"] and window["cpu"] and window["excerpt"]
        assert window["topics"] == ["runtime.machine"]
        for row in window["agents"]:
            assert row.keys() == {"key", "tool", "msgs", "input", "output"}
            for key, value in row.items():
                validator.evolve(schema=entry["key"] if key == "key" else agent[key]).validate(value)
        for sample in window["cpu"]:
            assert sample.keys() == {"x", "values"}
            validator.evolve(schema=machine["generated_at"]).validate(sample["x"])
            validator.evolve(schema=machine["cpu_per_core"]).validate(sample["values"])
        for line in window["excerpt"]:
            VALIDATORS["shared"]["excerpt-line"].validate(line)
