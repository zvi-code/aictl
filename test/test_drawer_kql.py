import re
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest

from aictl.dashboard.drawer_kql import kql_templates
from aictl.dashboard.flow_filters import session_kql_url


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


# ── the session link of Flow, and the guard for the idioms every generated query shares ─────────

_SETTINGS = SimpleNamespace(cluster="https://c.westeurope.kusto.windows.net", database="aictl", node_id="node-a")


def _flow_link_query() -> str:
    url = session_kql_url(_SETTINGS, "sid-1", 100.0, 200.0)
    return parse_qs(urlsplit(url).query)["query"][0]


def _generated_queries() -> dict[str, str]:
    options = {"reporting_node": "node-a", "session": "sid-1", "include_all_sessions": "1"}
    queries = {f"preset {item['id']}": kql_templates({**options, "preset": item["id"]})["query"]
               for item in kql_templates({})["presets"]}
    return {**queries, "flow link": _flow_link_query()}


def test_no_generated_query_drops_rows_whose_deleted_flag_is_null():
    """``_deleted`` is null on rows written before tombstones: ``not(_deleted)`` is null there and drops the row."""
    for name, query in _generated_queries().items():
        assert not re.search(r"not\(\s*_deleted\s*\)", query), f"{name} reads a bare not(_deleted)"


def test_the_flow_link_keeps_rows_with_a_null_deleted_flag_and_reads_like_the_kql_tab():
    query = _flow_link_query()
    assert "not(coalesce(column_ifexists('_deleted', false), false))" in query
    # Keyword columns are bracketed, so a reserved word cannot break the query.
    assert "['kind']" in query and ", kind," not in query
    # The latest 500 steps, listed oldest first, as the KQL tab's Steps preset does.
    assert "top 500 by ts desc\n| order by ts asc, step_key asc" in query
    assert "top 500 by event_time" not in query


@pytest.mark.parametrize("preset", ["steps", "requests", "tools", "failures", "context", "subagents", "sizes", "mcp"])
def test_a_preset_reads_one_sessions_versions_not_the_nodes_whole_table(preset):
    query = kql_templates({"reporting_node": "node-a", "session": "sid-1", "preset": preset, "since": "100"})["query"]
    dedup = query.index("summarize arg_max(_v, *)")
    assert query.index("session_id == sid") < dedup
    # A filter on a column the tombstone does not carry stays after the reduction.
    assert re.search(r"(ts|started_at) >= 100\.0", query).start() > dedup


def test_the_requests_and_subagents_presets_show_what_the_tables_record():
    options = {"reporting_node": "node-a", "session": "sid-1"}
    requests = kql_templates({**options, "preset": "requests"})["query"]
    assert "cache_read_tokens=" in requests and "cache_creation_tokens=" in requests
    subagents = kql_templates({**options, "preset": "subagents"})["query"]
    for column in ("description", "status", "resolved_model", "parent_agent_id"):
        assert column in subagents
    assert "ai_credits=CopilotNanoAiu / 1e9" in kql_templates({**options, "preset": "spans"})["query"]
