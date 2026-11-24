"""The usage panels split by model, vendor, project and tool, and the usage table (board_projection._split_series,
_usage_by): one vendor rule, groups that add up to the board's totals, and the cache hit rate's gap rule."""

from __future__ import annotations

import json

import pytest

from aictl.data.model_vendor import OTHER_VENDOR, model_vendor

DAY = 86400
# 2026-11-24 12:00 UTC.
NOW = 1_795_521_600
SINCE = NOW - 2 * DAY
FLEET = f"scope=fleet&since={SINCE}&until={NOW}&buckets=2"


@pytest.mark.parametrize(
    ("model", "vendor"),
    [
        ("claude-opus-5-5", "Anthropic"),
        ("claude-opus-5.5", "Anthropic"),
        ("Claude-Sonnet-5", "Anthropic"),
        ("us.anthropic.claude-sonnet-4-5-20250929-v1:0", "Anthropic"),
        ("anthropic/claude-haiku-4-5", "Anthropic"),
        ("gpt-6.1-sol", "OpenAI"),
        ("gpt-5-mini", "OpenAI"),
        ("openai/gpt-4o", "OpenAI"),
        ("o3", "OpenAI"),
        ("o3-pro", "OpenAI"),
        ("o4-mini", "OpenAI"),
        ("o1-preview", "OpenAI"),
        ("gpt-5.3-codex", "OpenAI"),
        ("gemini-4-argon", "Google"),
        ("gemini-3.1-pro-preview", "Google"),
        ("grok-4.7", "xAI"),
        ("mai-code-2", "Microsoft"),
        ("llama-4-maverick", "Meta"),
        ("qwen3-coder", "Alibaba"),
        ("deepseek-v4", "DeepSeek"),
    ],
)
def test_a_model_id_names_the_company_that_makes_the_model(model, vendor):
    assert model_vendor(model) == vendor


@pytest.mark.parametrize(
    "model", ["", None, "unknown", "<synthetic>", "auto", "omni-1", "gptx", "o30", "claudette", "my-fine-tune"]
)
def test_an_id_no_rule_matches_is_other_not_dropped(model):
    assert model_vendor(model) == OTHER_VENDOR


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch):
    from aictl.dashboard import board_projection, history_board

    for name in ("_cache", "_inflight", "_latest", "_selections", "_viewers", "_latest_selection"):
        monkeypatch.setattr(history_board, name, {})
    for name in ("_facts_memo", "_facts_inflight", "_sources_memo"):
        monkeypatch.setattr(board_projection, name, {})


@pytest.fixture
def stored(kusto_store):
    """Requests on two nodes, of four vendors' models and an unknown one, in seven projects, by two tools."""
    from aictl.stores.kusto.tables import TABLES

    def add(table, node, key, **fields):
        schema = TABLES[table]
        columns = dict(schema.columns)
        row = {k: v for k, v in fields.items() if k in columns}
        row.update(node_id=node, _v="2026-01-01")
        if schema.tombstone:
            row[schema.tombstone] = False
        if "dedup_key" in columns:
            row.setdefault("dedup_key", str(key))
        kusto_store.insert(table, **row)

    sessions = {}

    def request(n, node, project, tool, model, ts, i, cr, o=10, cost=None, error=0):
        sid = sessions.get((node, project, tool))
        if sid is None:
            sid = sessions[(node, project, tool)] = f"5b1a0000-0000-4000-8000-{len(sessions) + 1:012d}"
            add(
                "sessions",
                node,
                sid,
                session_id=sid,
                tool=tool,
                project=project,
                project_path=project,
                started_at=SINCE + 60,
                ended_at=NOW - 60,
            )
        add(
            "requests",
            node,
            n,
            id=n,
            session_id=sid,
            ts=ts,
            tool=tool,
            model=model,
            project=project,
            project_path=project,
            input_tokens=i,
            cache_read_tokens=cr,
            output_tokens=o,
            cost_usd=cost,
            is_error=error,
        )

    first, second = SINCE + 3600, SINCE + DAY + 3600
    # Bucket 0: Anthropic with plenty of input (a rate); OpenAI with too little (a gap).
    request(1, "host-a", "/p/alpha", "claude-code", "claude-opus-5-5", first, 2_000, 18_000, cost=1.0)
    request(2, "host-b", "/p/beta", "copilot-cli", "gpt-6.1-sol", first, 1_000, 3_000, cost=0.5)
    # Bucket 1: every vendor, and an id no rule matches.
    request(3, "host-a", "/p/alpha", "claude-code", "claude-opus-5.5", second, 5_000, 15_000, cost=2.0, error=1)
    request(4, "host-b", "/p/beta", "copilot-cli", "gpt-6.1-sol", second, 10_000, 30_000, cost=0.25)
    request(5, "host-b", "/p/gamma", "copilot-cli", "gemini-4-argon", second, 4_000, 6_000, cost=0.75)
    request(6, "host-a", "/p/delta", "copilot-cli", "grok-4.7", second, 1_000, 0, cost=0.1)
    request(7, "host-a", "/p/epsilon", "copilot-cli", "unknown", second, 500, 0)
    request(8, "host-b", "/p/zeta", "claude-code", "claude-haiku-4-5", second, 300, 0, cost=0.01)
    request(9, "host-b", "/p/eta", "claude-code", "claude-haiku-4-5", second, 200, 0, cost=0.02)
    return sessions


def _section(store, section, query=FLEET):
    from aictl.dashboard.history_board import read_section

    return json.loads(read_section(store, f"{query}&section={section}", now=NOW))["fields"]


def _bucket_sums(entries):
    return [sum(entry["values"][i] or 0 for entry in entries) for i in range(2)]


def test_each_split_adds_up_to_the_boards_totals(kusto_store, stored):
    usage = _section(kusto_store, "usage")
    tools = _section(kusto_store, "tools")
    tokens = usage["series"]["tokens"]
    per_bucket = [sum(tokens[kind][i] or 0 for kind in tokens) for i in range(2)]
    for dim in ("model", "vendor", "project", "tool"):
        split = usage["series"]["split"][dim]
        assert _bucket_sums(split["tokens"]) == per_bucket, dim
        assert sum(_bucket_sums(split["cost"])) == pytest.approx(usage["kpis"]["cost_usd"]), dim
        assert _bucket_sums(split["requests"]) == tools["series"]["messages"]["assistant"], dim
    assert sum(per_bucket) == usage["kpis"]["tokens"]


def test_the_vendor_split_names_its_models_and_keeps_an_unknown_id(kusto_store, stored):
    vendor = _section(kusto_store, "usage")["series"]["split"]["vendor"]
    by_key = {entry["key"]: entry for entry in vendor["tokens"]}
    assert set(by_key) == {"Anthropic", "OpenAI", "Google", "xAI", "Other"}
    # Two spellings of one model are one model id.
    assert by_key["Anthropic"]["models"] == ["claude-haiku-4-5", "claude-opus-5-5"]
    assert by_key["Other"]["models"] == ["unknown"]
    assert by_key["Other"]["values"] == [0, 510]


def test_groups_past_the_top_five_are_one_other_entry(kusto_store, stored):
    project = _section(kusto_store, "usage")["series"]["split"]["project"]["tokens"]
    assert [entry["key"] for entry in project] == ["/p/beta", "/p/alpha", "/p/gamma", "/p/delta", "/p/epsilon", None]
    other = project[-1]
    assert other["other"] == 2 and sorted(other["members"]) == ["/p/eta", "/p/zeta"]
    assert other["values"] == [0, 300 + 10 + 200 + 10]


def test_a_groups_cache_hit_rate_is_a_gap_where_it_had_too_little_input(kusto_store, stored):
    from aictl.dashboard.board_projection import MIN_CACHE_RATE_INPUT

    rates = {
        entry["key"]: entry["values"]
        for entry in _section(kusto_store, "usage")["series"]["split"]["vendor"]["cached_share"]
    }
    assert 1_000 + 3_000 < MIN_CACHE_RATE_INPUT <= 2_000 + 18_000
    assert rates["Anthropic"] == [pytest.approx(18_000 / 20_000), pytest.approx(15_000 / 20_500, abs=1e-4)]
    # Bucket 0 holds 4,000 input tokens of OpenAI: a gap, not 75 %.
    assert rates["OpenAI"] == [None, pytest.approx(30_000 / 40_000, abs=1e-4)]
    assert rates["Google"] == [None, pytest.approx(0.6)]
    assert rates["xAI"] == [None, None] and rates["Other"] == [None, None]


def test_the_usage_table_is_sorted_by_cost_and_its_shares_add_up(kusto_store, stored):
    usage = _section(kusto_store, "usage")
    rows = usage["usage_by"]["model"]
    assert [row["key"] for row in rows] == [
        "claude-opus-5-5",
        "gpt-6.1-sol",
        "gemini-4-argon",
        "grok-4.7",
        "claude-haiku-4-5",
        "unknown",
    ]
    opus = rows[0]
    assert opus["requests"] == 2 and opus["errors"] == 1 and opus["error_share"] == 0.5
    assert opus["cost_usd"] == pytest.approx(3.0) and opus["cost_per_request"] == pytest.approx(1.5)
    assert opus["cached_share"] == pytest.approx(33_000 / 40_000)
    assert rows[-1]["cost_usd"] is None and rows[-1]["cost_share"] is None
    assert sum(row["cost_share"] or 0 for row in rows) == pytest.approx(1.0, abs=1e-3)
    for dim in ("model", "vendor", "project"):
        table = usage["usage_by"][dim]
        assert sum(row["tokens"] for row in table) == usage["kpis"]["tokens"], dim
    assert usage["usage_by"]["vendor"][0]["key"] == "Anthropic"


def test_the_project_filter_narrows_every_split(kusto_store, stored):
    usage = _section(kusto_store, "usage", f"{FLEET}&project=/p/beta")
    split = usage["series"]["split"]
    assert [entry["key"] for entry in split["project"]["tokens"]] == ["/p/beta"]
    assert [entry["key"] for entry in split["vendor"]["tokens"]] == ["OpenAI"]
    assert [row["key"] for row in usage["usage_by"]["model"]] == ["gpt-6.1-sol"]
    assert sum(_bucket_sums(split["model"]["tokens"])) == usage["kpis"]["tokens"] == 4_010 + 40_010


def test_one_node_shows_only_its_own_groups(kusto_store, stored):
    usage = _section(kusto_store, "usage", FLEET.replace("scope=fleet", "scope=node&node_id=host-a"))
    keys = {entry["key"] for entry in usage["series"]["split"]["tool"]["tokens"]}
    assert keys == {"claude-code", "copilot-cli"}
    assert {row["key"] for row in usage["usage_by"]["model"]} == {"claude-opus-5-5", "grok-4.7", "unknown"}
