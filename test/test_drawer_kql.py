import pytest

from aictl.dashboard.drawer_kql import kql_templates


def test_catalog_presets_build_queries_for_their_declared_sources():
    catalog = kql_templates({})
    ids = {item["id"] for item in catalog["presets"]}
    assert ids == {"steps", "nodes", "requests", "tools", "failures", "context", "spans", "prompts", "assistant",
                   "commands", "longest", "subagents", "sizes", "mcp", "reasoning", "costMain", "costTree", "costAll"}
    for preset in catalog["presets"]:
        query = kql_templates({"preset": preset["id"], "reporting_node": "node-a", "session": "sid-1",
                               "include_all_sessions": "1"})["query"]
        assert any(f"[]), {table}\n" in query for table in catalog["tables"])
        if not preset["fleet"]:
            assert "node-a" in query
    assert {"node_id", "session_id", "StartTime", "request_key"} <= set(catalog["fields"])


def test_retained_text_and_cost_use_current_rows_and_exact_links():
    options = {"reporting_node": "node-a", "session": "sid-1", "since": "100", "until": "200"}
    prompt = kql_templates({**options, "preset": "prompts", "keyword": 'two"\\lines\n'})["query"]
    assert r'two\"\\lines\n' in prompt
    assert "text_status in" in prompt and "arg_max(_v, *) by step_key" in prompt
    assert "ts >= 100.0" in prompt and "ts < 200.0" in prompt
    cost = kql_templates({**options, "preset": "costTree"})["query"]
    assert "variants == 1" in cost
    assert "root_session_id == sid" in cost
    assert "coverage" in cost and "positive recorded USD" in cost


@pytest.mark.parametrize(("options", "error"), [
    ({"preset": "unknown"}, "Unknown"),
    ({"reporting_node": "node-a' | take 1"}, "reporting node"),
    ({"session": ""}, "Select a session"),
    ({"since": "NaN"}, "time bound"),
    ({"since": "2", "until": "1"}, "end must be after"),
    ({"preset": "costAll"}, "explicit consent"),
])
def test_rejects_invalid_or_unapproved_scope(options, error):
    with pytest.raises(ValueError, match=error):
        kql_templates({"preset": "steps", "reporting_node": "node-a", "session": "sid-1", **options})


@pytest.mark.parametrize("preset", ["requests", "subagents", "spans"])
def test_the_model_filter_matches_every_spelling_of_the_model(preset):
    """Copilot stores claude-opus-5.5 and Claude Code claude-opus-5-5: one model, one filter."""
    options = {"reporting_node": "node-a", "session": "sid-1", "preset": preset}
    dotted = kql_templates({**options, "model": "claude-opus-5.5"})["query"]
    dashed = kql_templates({**options, "model": "Claude-Opus-5-5"})["query"]
    assert dotted == dashed
    assert '"claude-opus-5-5"' in dotted and "claude-opus-5.5" not in dotted
    assert "replace_string(" in dotted and 'startswith "claude-"' in dotted


def test_the_model_filter_of_another_id_keeps_its_exact_spelling():
    query = kql_templates({"reporting_node": "node-a", "session": "sid-1", "preset": "requests", "model": "gpt-5.5"})["query"]
    assert '== "gpt-5.5"' in query
