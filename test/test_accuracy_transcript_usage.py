"""Golden numbers: usage parsed from synthetic transcripts of each tool.

Each fixture repeats a trap the real stores contain: streamed lines repeating
one message's usage, sub-agent files, replayed history, cumulative totals, and
input counts that include cache tokens. The expected numbers are worked out by
hand here, not by the code under test.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timedelta

import pytest

from aictl.dashboard.analytics import compute_usage_summary
from aictl.ingesters.transcript_usage import TranscriptUsageIngester, local_day
from aictl.storage import HistoryDB, SessionRow

CLAUDE_SID = "11111111-1111-4111-8111-111111111111"
SIBLING_SID = "22222222-2222-4222-8222-222222222222"
CODEX_SID = "33333333-3333-4333-8333-333333333333"
COPILOT_SID = "44444444-4444-4444-8444-444444444444"

NOW = time.time()


def iso(ago_s: float) -> str:
    return datetime.fromtimestamp(NOW - ago_s).astimezone().isoformat()


def assistant(msg_id, req, model, ago, *, inp=0, out=0, read=0, write=0, write_1h=0, tools=(), **extra):
    usage = {
        "input_tokens": inp,
        "output_tokens": out,
        "cache_read_input_tokens": read,
        "cache_creation_input_tokens": write,
        "cache_creation": {"ephemeral_1h_input_tokens": write_1h, "ephemeral_5m_input_tokens": write - write_1h},
        **extra,
    }
    content = [{"type": "tool_use", "id": t, "name": "Bash"} for t in tools]
    return {
        "type": "assistant",
        "timestamp": iso(ago),
        "requestId": req,
        "cwd": "/synthetic/project",
        "gitBranch": "main",
        "message": {"id": msg_id, "model": model, "usage": usage, "content": content},
    }


def user(ago, text="hello"):
    return {"type": "user", "timestamp": iso(ago), "message": {"role": "user", "content": text}}


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows))


@pytest.fixture
def stores(tmp_path):
    return {"claude_projects": tmp_path / "claude", "codex_sessions": tmp_path / "codex", "copilot_state": tmp_path / "copilot"}


@pytest.fixture
def db(tmp_path):
    d = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    yield d
    d.close()


def ingest(db, stores):
    ing = TranscriptUsageIngester(db, **stores)
    ing.poll()
    return ing


def usage_of(db, sid):
    rows = db.query_session_usage(session_ids=[sid])
    assert rows, f"no usage row for {sid}"
    return rows[0]


def claude_fixture(stores):
    project = stores["claude_projects"] / "-synthetic-project"
    write_jsonl(
        project / f"{CLAUDE_SID}.jsonl",
        [
            user(3000),
            # One streamed request: three lines. Output grows; the last line is final.
            assistant("m1", "r1", "claude-opus-5-5", 2990, inp=10, out=5, read=1000, write=100, write_1h=100, tools=["t1"]),
            assistant("m1", "r1", "claude-opus-5-5", 2989, inp=10, out=50, read=1000, write=100, write_1h=100, tools=["t1"]),
            assistant("m1", "r1", "claude-opus-5-5", 2988, inp=10, out=200, read=1000, write=100, write_1h=100),
            {"type": "user", "timestamp": iso(2980), "toolUseResult": {}, "message": {"content": [{"type": "tool_result"}]}},
            assistant("m2", "r2", "claude-opus-5-5", 2970, inp=20, out=100, read=2000, tools=["t2"]),
            # A placeholder written locally: no tokens and nothing billed.
            assistant("m3", "r3", "<synthetic>", 2960),
        ],
    )
    write_jsonl(
        project / CLAUDE_SID / "subagents" / "agent-a1.jsonl",
        [
            {**user(2950), "isSidechain": True},
            assistant("m4", "r4", "claude-haiku-5-5", 2940, inp=30, out=40, read=50, tools=["t3"]),
        ],
    )


class TestClaude:
    def test_streaming_lines_count_once_and_subagents_are_included(self, db, stores):
        claude_fixture(stores)
        ingest(db, stores)
        u = usage_of(db, CLAUDE_SID)
        assert (u["input_tokens"], u["output_tokens"]) == (10 + 20 + 30, 200 + 100 + 40)
        assert u["cache_read_tokens"] == 1000 + 2000 + 50
        assert u["cache_creation_tokens"] == 100
        assert u["request_count"] == 4  # the <synthetic> message is one line, not billed
        assert u["tool_call_count"] == 3  # t1 repeats across streamed lines
        assert u["turn_count"] == 1  # tool results and sidechain prompts are not turns
        assert u["model"] == "claude-opus-5-5"
        assert u["quality"] == "exact"

    def test_cost_uses_each_class_rate_and_the_1h_write_rate(self, db, stores):
        claude_fixture(stores)
        ingest(db, stores)
        # opus-5-5: $4 in, $20 out, $0.20 read, $8 1h write; haiku-5-5: 0.10/0.50/0.01.
        expected = (
            (30 * 4 + 300 * 20 + 3000 * 0.20 + 100 * 8)  # m1 + m2
            + (30 * 0.10 + 40 * 0.50 + 50 * 0.01)  # m4
        ) / 1e6
        assert usage_of(db, CLAUDE_SID)["cost_usd"] == pytest.approx(expected, abs=1e-6)

    def test_haiku_long_prompt_tier_survives_a_streamed_correction(self, db, stores):
        project = stores["claude_projects"] / "p"
        write_jsonl(
            project / f"{CLAUDE_SID}.jsonl",
            [
                assistant("m", "r", "claude-haiku-5-5", 100, inp=1000, out=10, read=150_000),
                assistant("m", "r", "claude-haiku-5-5", 99, inp=1000, out=100, read=150_000),
            ],
        )
        ingest(db, stores)
        # Prompt 151K > 100K: $0.50 in, $2.50 out, $0.05 read for the whole request.
        expected = (1000 * 0.50 + 100 * 2.50 + 150_000 * 0.05) / 1e6
        assert usage_of(db, CLAUDE_SID)["cost_usd"] == pytest.approx(expected, abs=1e-6)

    def test_fast_mode_rates(self, db, stores):
        write_jsonl(
            stores["claude_projects"] / "p" / f"{CLAUDE_SID}.jsonl",
            [assistant("m", "r", "claude-opus-5-5", 100, inp=1000, out=1000, speed="fast")],
        )
        ingest(db, stores)
        assert usage_of(db, CLAUDE_SID)["cost_usd"] == pytest.approx((1000 * 8 + 1000 * 40) / 1e6)

    def test_replayed_history_in_a_resumed_session_counts_once(self, db, stores):
        project = stores["claude_projects"] / "p"
        original = assistant("m1", "r1", "claude-sonnet-5-5", 500, inp=10, out=100)
        write_jsonl(project / f"{CLAUDE_SID}.jsonl", [original])
        ingest_first = project / f"{CLAUDE_SID}.jsonl"
        old = time.time() - 100
        import os

        os.utime(ingest_first, (old, old))
        write_jsonl(project / f"{SIBLING_SID}.jsonl", [original, assistant("m2", "r2", "claude-sonnet-5-5", 400, inp=1, out=1)])
        ingest(db, stores)
        total = usage_of(db, CLAUDE_SID)["output_tokens"] + usage_of(db, SIBLING_SID)["output_tokens"]
        assert total == 101

    def test_polling_again_changes_nothing_and_a_new_line_adds_once(self, db, stores):
        claude_fixture(stores)
        ing = ingest(db, stores)
        before = usage_of(db, CLAUDE_SID)["output_tokens"]
        assert ing.poll() == 0
        path = stores["claude_projects"] / "-synthetic-project" / f"{CLAUDE_SID}.jsonl"
        with path.open("a") as fh:
            fh.write(json.dumps(assistant("m9", "r9", "claude-opus-5-5", 10, out=7)) + "\n")
            fh.write('{"type": "assistant", "half written')
        assert ing.poll() == 1
        assert usage_of(db, CLAUDE_SID)["output_tokens"] == before + 7


def rollout(path, *, session_id, thread_id, source="vscode", total_steps=(), models=("gpt-6.1-sol",)):
    rows = [
        {
            "type": "session_meta",
            "timestamp": iso(2000),
            "payload": {"id": thread_id, "session_id": session_id, "source": source, "cwd": "/synthetic/project", "model_provider": "openai"},
        },
        {"type": "event_msg", "timestamp": iso(1999), "payload": {"type": "task_started"}},
        {"type": "turn_context", "timestamp": iso(1999), "payload": {"model": models[0]}},
    ]
    for i, step in enumerate(total_steps):
        if i < len(models) and i:
            rows.append({"type": "turn_context", "timestamp": iso(1500 - i), "payload": {"model": models[i]}})
        rows.append({"type": "response_item", "timestamp": iso(1500 - i), "payload": {"type": "function_call"}})
        rows.append(
            {
                "type": "event_msg",
                "timestamp": iso(1500 - i),
                "payload": {"type": "token_count", "info": {"total_token_usage": step, "model_context_window": 800_000}},
            }
        )
    write_jsonl(path, rows)


def total(inp, cached, out):
    return {"input_tokens": inp, "cached_input_tokens": cached, "cache_write_input_tokens": 0, "output_tokens": out}


class TestCodex:
    def test_cumulative_totals_split_cached_input_and_follow_the_model(self, db, stores):
        rollout(
            stores["codex_sessions"] / "2026" / "rollout-a.jsonl",
            session_id=CODEX_SID,
            thread_id=CODEX_SID,
            total_steps=[total(1000, 800, 50), total(1000, 800, 50), total(3000, 2500, 80)],
            models=("gpt-6.1-sol", "gpt-6.1-sol", "gpt-6-astra"),
        )
        ingest(db, stores)
        u = usage_of(db, CODEX_SID)
        assert u["input_tokens"] == 500  # 3000 includes the 2500 cached
        assert u["cache_read_tokens"] == 2500
        assert u["output_tokens"] == 80
        assert u["request_count"] == 2  # the repeated token_count is not a request
        assert u["turn_count"] == 1
        assert u["tool_call_count"] == 3
        assert u["models"]["gpt-6.1-sol"]["output_tokens"] == 50
        assert u["models"]["gpt-6-astra"]["output_tokens"] == 30
        expected = (200 * 2 + 800 * 0.10 + 50 * 10 + 300 * 10 + 1700 * 1.0 + 30 * 50) / 1e6
        assert u["cost_usd"] == pytest.approx(expected)

    def test_subagent_rollout_rolls_up_to_the_root_session(self, db, stores):
        rollout(
            stores["codex_sessions"] / "rollout-root.jsonl",
            session_id=CODEX_SID,
            thread_id=CODEX_SID,
            total_steps=[total(100, 0, 10)],
        )
        rollout(
            stores["codex_sessions"] / "rollout-child.jsonl",
            session_id=CODEX_SID,
            thread_id="55555555-5555-4555-8555-555555555555",
            source={"subagent": {"thread_spawn": {"parent_thread_id": CODEX_SID}}},
            total_steps=[total(200, 0, 20)],
        )
        ingest(db, stores)
        u = usage_of(db, CODEX_SID)
        assert (u["input_tokens"], u["output_tokens"]) == (300, 30)
        assert u["turn_count"] == 1  # the sub-agent's task is not a user turn
        assert len(db.query_session_usage(active_since=0)) == 1

    def test_long_context_rate_applies_per_request(self, db, stores):
        rollout(
            stores["codex_sessions"] / "rollout-a.jsonl",
            session_id=CODEX_SID,
            thread_id=CODEX_SID,
            total_steps=[total(300_000, 290_000, 100)],
        )
        ingest(db, stores)
        # 300K > 272K: gpt-6.1-sol long rates, $4 in, $0.20 cached, $15 out.
        expected = (10_000 * 4 + 290_000 * 0.20 + 100 * 15) / 1e6
        assert usage_of(db, CODEX_SID)["cost_usd"] == pytest.approx(expected)


def copilot_record(ago, model, inp, out, read, write):
    return {
        "type": "session.usage_record",
        "timestamp": iso(ago),
        "data": {"usage": {"model": model, "inputTokens": inp, "outputTokens": out, "cacheReadTokens": read, "cacheWriteTokens": write, "cost": 1.0}},
    }


class TestCopilot:
    def test_records_are_counted_without_a_shutdown(self, db, stores):
        write_jsonl(
            stores["copilot_state"] / COPILOT_SID / "events.jsonl",
            [
                {"type": "session.start", "timestamp": iso(900), "data": {"context": {"cwd": "/synthetic/project"}}},
                {"type": "user.message", "timestamp": iso(899), "data": {}},
                copilot_record(800, "gpt-6.1-sol", 1000, 20, 700, 200),
                {"type": "tool.execution_complete", "timestamp": iso(790), "data": {}},
            ],
        )
        ingest(db, stores)
        u = usage_of(db, COPILOT_SID)
        assert u["input_tokens"] == 100  # 1000 includes 700 read + 200 written
        assert (u["cache_read_tokens"], u["cache_creation_tokens"], u["output_tokens"]) == (700, 200, 20)
        assert (u["turn_count"], u["tool_call_count"], u["request_count"]) == (1, 1, 1)

    def test_compaction_calls_are_counted_once(self, db, stores):
        path = stores["copilot_state"] / COPILOT_SID / "events.jsonl"
        compaction = {
            "type": "session.compaction_complete",
            "timestamp": iso(700),
            "data": {
                "requestId": "c1",
                "compactionTokensUsed": {"inputTokens": 500, "outputTokens": 50, "cacheReadTokens": 0, "cacheWriteTokens": 400, "model": "gpt-6.1-sol"},
            },
        }
        write_jsonl(path, [copilot_record(800, "gpt-6.1-sol", 1000, 20, 700, 200), compaction])
        ing = ingest(db, stores)
        with path.open("a") as fh:
            fh.write(json.dumps(copilot_record(600, "gpt-6.1-sol", 10, 1, 0, 0)) + "\n")
        ing.poll()  # a later poll must not add the compaction again
        u = usage_of(db, COPILOT_SID)
        assert u["output_tokens"] == 20 + 50 + 1
        assert u["input_tokens"] == 100 + 100 + 10
        assert u["cache_creation_tokens"] == 200 + 400
        assert u["request_count"] == 3

    def test_shutdown_and_records_are_one_source_not_two(self, db, stores):
        write_jsonl(
            stores["copilot_state"] / COPILOT_SID / "events.jsonl",
            [
                copilot_record(800, "gpt-6.1-sol", 1000, 20, 700, 200),
                {
                    "type": "session.shutdown",
                    "timestamp": iso(700),
                    "data": {"modelMetrics": {"gpt-6.1-sol": {"requests": {"count": 1, "cost": 1}, "usage": {"inputTokens": 1000, "outputTokens": 20, "cacheReadTokens": 700, "cacheWriteTokens": 200}}}},
                },
            ],
        )
        ingest(db, stores)
        assert usage_of(db, COPILOT_SID)["output_tokens"] == 20

    def test_shutdown_only_transcript_uses_its_metrics(self, db, stores):
        write_jsonl(
            stores["copilot_state"] / COPILOT_SID / "events.jsonl",
            [
                {
                    "type": "session.shutdown",
                    "timestamp": iso(700),
                    "data": {"modelMetrics": {"gpt-6.1-sol": {"requests": {"count": 3, "cost": 1}, "usage": {"inputTokens": 1000, "outputTokens": 20, "cacheReadTokens": 700, "cacheWriteTokens": 200}}}},
                }
            ],
        )
        ing = ingest(db, stores)
        ing.poll()  # a repeat must not add the shutdown metrics twice
        u = usage_of(db, COPILOT_SID)
        assert (u["input_tokens"], u["request_count"]) == (100, 3)

    def test_transcript_with_no_usage_says_partial(self, db, stores):
        write_jsonl(
            stores["copilot_state"] / COPILOT_SID / "events.jsonl",
            [{"type": "user.message", "timestamp": iso(9), "data": {}}, {"type": "assistant.message", "timestamp": iso(8), "data": {"model": "gpt-6.1-sol"}}],
        )
        ingest(db, stores)
        assert usage_of(db, COPILOT_SID)["quality"] == "partial"


class TestMergeAcrossSources:
    """One session seen by hook, OTel, correlator and transcript: one count."""

    def seed_other_sources(self, db):
        started = NOW - 3000
        db.upsert_session(SessionRow(session_id=CLAUDE_SID, tool="claude-code", source="hook", started_at=started, input_tokens=9, output_tokens=9, cache_read_tokens=9, cost_usd=99.0))
        db.upsert_session(SessionRow(session_id=f"claude-code:4242:{CLAUDE_SID}", tool="claude-code", source="otel", pid=4242, started_at=started + 5, input_tokens=500, output_tokens=500))
        db.upsert_session(SessionRow(session_id="claude-code:4242:1700000000", tool="claude-code", source="correlator", pid=4242, started_at=started + 8, input_tokens=700, output_tokens=700))

    def test_headline_is_the_transcript_alone(self, db, stores):
        claude_fixture(stores)
        self.seed_other_sources(db)
        ingest(db, stores)
        summary = compute_usage_summary(db, NOW - 86400 * 2)
        assert [t["tool"] for t in summary["tools"]] == ["claude-code"]
        tool = summary["tools"][0]
        assert (tool["input_tokens"], tool["output_tokens"]) == (60, 340)
        assert tool["cache_read_tokens"] == 3050
        assert tool["sessions"] == 1
        assert tool["tokens_source"] == ["transcript"]
        assert tool["tokens_quality"] == "exact"
        assert summary["ignored_rows"] >= 0

    def test_profiles_merge_to_one_row_with_transcript_numbers(self, db, stores):
        claude_fixture(stores)
        self.seed_other_sources(db)
        ingest(db, stores)
        rows = db.query_session_profiles(since=NOW - 86400)
        assert len(rows) == 1
        p = rows[0]
        assert (p["input_tokens"], p["output_tokens"]) == (60, 340)
        assert p["tokens_source"] == "transcript"
        assert p["cost_quality"] == "estimated"

    def test_transcript_wins_over_a_later_hook_write(self, db, stores):
        claude_fixture(stores)
        ingest(db, stores)
        db.upsert_session(SessionRow(session_id=CLAUDE_SID, tool="claude-code", source="hook", input_tokens=1, output_tokens=1))
        row = db.get_session(CLAUDE_SID)
        assert (row["input_tokens"], row["output_tokens"]) == (60, 340)
        assert row["tokens_source"] == "transcript"

    def test_two_sessions_started_together_in_one_cwd_stay_separate(self, db, stores):
        project = stores["claude_projects"] / "p"
        write_jsonl(project / f"{CLAUDE_SID}.jsonl", [assistant("a", "ra", "claude-opus-5-5", 2000, inp=1, out=100)])
        write_jsonl(project / f"{SIBLING_SID}.jsonl", [assistant("b", "rb", "claude-opus-5-5", 1999, inp=1, out=30)])
        ingest(db, stores)
        rows = db.query_session_profiles(since=NOW - 86400)
        assert sorted(r["output_tokens"] for r in rows) == [30, 100]

    def test_session_without_a_transcript_is_labelled_partial(self, db):
        db.upsert_session(SessionRow(session_id=COPILOT_SID, tool="codex-cli", source="hook", started_at=NOW - 100, model="gpt-6.1-sol", input_tokens=1000))
        row = db.get_session(COPILOT_SID)
        assert (row["tokens_source"], row["tokens_quality"]) == ("hook", "partial")
        assert row["cost_quality"] == "estimated"
        assert row["cost_usd"] == pytest.approx(0.002)


class TestUnknownModels:
    def test_unknown_model_has_null_cost_and_names_the_model(self, db, stores):
        write_jsonl(
            stores["claude_projects"] / "p" / f"{CLAUDE_SID}.jsonl",
            [assistant("m", "r", "claude-future-9", 100, inp=1000, out=1000)],
        )
        ingest(db, stores)
        u = usage_of(db, CLAUDE_SID)
        assert u["cost_usd"] is None
        assert u["cost_quality"] == "unknown"
        assert u["unpriced_models"] == ["claude-future-9"]
        assert "claude-future-9" in u["cost_reason"]
        assert db.get_session(CLAUDE_SID)["cost_usd"] is None

    def test_mixed_session_prices_what_it_can_and_says_partial(self, db, stores):
        write_jsonl(
            stores["claude_projects"] / "p" / f"{CLAUDE_SID}.jsonl",
            [
                assistant("m1", "r1", "claude-future-9", 100, out=1000),
                assistant("m2", "r2", "claude-sonnet-5-5", 99, out=1000),
            ],
        )
        ingest(db, stores)
        u = usage_of(db, CLAUDE_SID)
        assert u["cost_usd"] == pytest.approx(10 * 1000 / 1e6)
        assert u["cost_quality"] == "partial"
        summary = compute_usage_summary(db, NOW - 86400)
        assert summary["totals"]["cost_quality"] == "partial"
        assert summary["totals"]["unpriced_models"] == ["claude-future-9"]
        by_model = {m["model"]: m for m in summary["tools"][0]["by_model"]}
        assert by_model["claude-future-9"]["cost_usd"] is None


class TestLocalDays:
    def test_session_across_local_midnight_lands_on_both_days(self, db, stores):
        midnight = datetime.fromtimestamp(NOW).replace(hour=0, minute=0, second=0, microsecond=0)
        before, after = midnight - timedelta(minutes=30), midnight + timedelta(minutes=30)

        def at(when, msg, out):
            row = assistant(msg, msg, "claude-sonnet-5-5", 0, out=out)
            row["timestamp"] = when.astimezone().isoformat()
            return row

        write_jsonl(
            stores["claude_projects"] / "p" / f"{CLAUDE_SID}.jsonl",
            [at(before, "m1", 10), at(after, "m2", 20)],
        )
        ingest(db, stores)
        summary = compute_usage_summary(db, before.timestamp() - 3600, after.timestamp() + 3600)
        assert {d["date"]: d["output_tokens"] for d in summary["daily"]} == {
            local_day(before.timestamp()): 10,
            local_day(after.timestamp()): 20,
        }
        assert summary["day_boundary"] == "local"


class TestSummaryLayer:
    """The classic failure sits above ingestion: each summary sums what it finds."""

    def seed(self, db, stores):
        claude_fixture(stores)
        started = NOW - 3000
        db.upsert_session(SessionRow(session_id=CLAUDE_SID, tool="claude-code", source="hook", started_at=started))
        db.upsert_session(SessionRow(session_id=f"claude-code:4242:{CLAUDE_SID}", tool="claude-code", source="otel", pid=4242, started_at=started + 5, input_tokens=500, output_tokens=500))
        db.upsert_session(SessionRow(session_id="claude-code:4242:1700000000", tool="claude-code", source="correlator", pid=4242, started_at=started + 8, input_tokens=700, output_tokens=700))
        ingest(db, stores)

    def test_usage_summary_counts_one_session_once(self, db, stores):
        self.seed(db, stores)
        data = compute_usage_summary(db, NOW - 2 * 86400)
        assert data["totals"]["output_tokens"] == 340
        assert data["totals"]["sessions"] == 1
        assert data["totals"]["tokens_quality"] == "exact"
        assert data["pricing"]["as_of"]


def test_totals_do_not_depend_on_stored_text(db, stores):
    """Capture modes may trim text, so nothing is derived from it at query time."""
    claude_fixture(stores)
    ingest(db, stores)
    assert db._conn().execute("SELECT COUNT(*) FROM session_usage WHERE models_json LIKE '%hello%'").fetchone()[0] == 0
    columns = [r[1] for r in db._conn().execute("PRAGMA table_info(session_usage)")]
    assert not {"prompt", "response", "content", "text"} & set(columns)
    assert usage_of(db, CLAUDE_SID)["turn_count"] == 1


def test_summary_source_survives_trimmed_prompt_text():
    from aictl.analysis.transcript import SessionTranscript

    t = SessionTranscript(session_id="s")
    t.start_turn(1.0, "", prompt_event=True)
    summary = t.build_summary()
    assert summary.source == "hooks"
    assert summary.total_turns == 1


def test_a_large_transcript_is_read_line_by_line(db, stores, monkeypatch):
    """The first poll must not hold whole files: real backfill peaked at 570 MB."""
    path = stores["claude_projects"] / "p" / f"{CLAUDE_SID}.jsonl"
    write_jsonl(path, [assistant(f"m{i}", f"r{i}", "claude-sonnet-5-5", 100, out=1) for i in range(50)])
    ing = TranscriptUsageIngester(db, **stores)
    assert ing.poll() == 1
    assert usage_of(db, CLAUDE_SID)["request_count"] == 50
    assert ing._offsets[path] == path.stat().st_size


def test_phantom_verify_row_never_reaches_a_read(db):
    db.upsert_session(SessionRow(session_id="aictl-verify", tool="claude-code", source="hook", started_at=NOW - 10))
    assert db.get_session("aictl-verify") is None
    assert db.query_sessions() == []
    assert db.query_session_profiles(since=NOW - 100) == []
