# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Retention per class of table: defaults, the setting, the import cut-off and `aictl db retention`."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone

import click
import pytest
from click.testing import CliRunner

from aictl.commands import admin
from aictl.platforms import load_config, set_retention_setting
from aictl.records import CallFacts, SessionDigestRow, SessionPromptRow, SessionThinkingRow
from aictl.session_facts import SessionFacts
from aictl.stores.kusto import retention as kusto_retention
from aictl.stores.kusto.client import Result
from aictl.stores.kusto.tables import (
    RETENTION_CLASSES,
    RETENTION_DEFAULTS,
    RETIRED_RETENTION_CLASSES,
    TABLE_RETENTION_CLASS,
    TABLES,
    TEXT_OF,
    format_period,
    parse_period,
    tables_with_retention,
    validate_retention,
)
from aictl.stores.testing import MemoryWriter

DAY = 86400


class TestClasses:
    def test_every_class_keeps_a_year_except_large_payloads(self):
        assert dict(RETENTION_DEFAULTS) == {**dict.fromkeys(RETENTION_CLASSES, 365 * 24), "large_payload": 24}
        short = {name for name, cls in TABLE_RETENTION_CLASS.items() if cls == "large_payload"}
        assert short == {"text_payloads"}
        assert {TABLES[name].retention_literal for name in short} == {"24h"}
        assert {TABLES[name].retention_literal for name in TABLES.keys() - short} == {"365d"}

    def test_the_text_of_a_data_point_is_kept_as_long_as_its_figures(self):
        assert TEXT_OF.keys() <= TABLES.keys() and set(TEXT_OF.values()) <= TABLES.keys()
        assert {text: TABLE_RETENTION_CLASS[text] for text in TEXT_OF} == {
            text: TABLE_RETENTION_CLASS[figures] for text, figures in TEXT_OF.items()}
        # Every text table named after a figures table is in TEXT_OF.
        paired = {name for name in TABLES if name.endswith("_text") and name.removesuffix("_text") in TABLES}
        assert paired | {"tool_invocations_text"} <= TEXT_OF.keys()
        assert not RETIRED_RETENTION_CLASSES.keys() & RETENTION_DEFAULTS.keys()

    def test_every_table_has_exactly_one_class(self):
        assert TABLE_RETENTION_CLASS.keys() == TABLES.keys()
        assert set(TABLE_RETENTION_CLASS.values()) == set(RETENTION_CLASSES)

    def test_the_large_kinds_of_data_can_be_shortened_on_their_own(self):
        expected = {
            "session_prompts": "prompt", "session_thinking": "thinking", "tool_invocations_text": "history",
            "vscode_chat_messages": "message", "file_blobs": "file_text", "session_digests": "text",
            "OTELLogs": "otel", "OTELPayloads": "otel", "OTELTraces": "otel", "OTELMetrics": "otel",
            "system_snapshots": "metrics", "process_snapshots": "metrics", "requests": "history",
            "tool_invocations": "history", "file_write_events": "history", "text_payloads": "large_payload",
        }
        assert {name: TABLE_RETENTION_CLASS[name] for name in expected} == expected
        shorter = tables_with_retention({"otel": 7 * 24, "thinking": 30 * 24, "large_payload": 12})
        assert shorter["OTELPayloads"].retention_literal == "7d" and shorter["session_thinking"].retention_days == 30
        assert shorter["text_payloads"].retention_literal == "12h"
        assert shorter["text_payloads"].retention_timespan == "12:00:00"
        assert tables_with_retention({"otel": 36})["OTELLogs"].retention_timespan == "1.12:00:00"
        assert shorter["requests"].retention_timespan == "365.00:00:00"


class TestSetting:
    def test_periods_in_hours_or_days(self):
        assert [parse_period(v) for v in ("24h", "36H", "7d", " 365d ", 2)] == [24, 36, 168, 8760, 48]
        assert format_period(24) == "24h" and format_period(48) == "2d" and format_period(36) == "36h" and format_period(8760) == "365d"
        for bad in ("0h", "3651d", "1w", "1.5d", 1.5, True, "", None):
            with pytest.raises(ValueError):
                parse_period(bad)

    def test_validation(self):
        assert validate_retention({"prompt": "200d", "otel": "1h", "thinking_days": 30}) == {
            "prompt": 4800, "otel": 1, "thinking": 720}
        with pytest.raises(ValueError, match="unknown setting 'prompts'.*large_payload"):
            validate_retention({"prompts": "3d"})
        with pytest.raises(ValueError, match="text_days must be a whole number of days"):
            validate_retention({"text_days": "24h"})
        with pytest.raises(ValueError, match="out of range"):
            validate_retention({"text": "0d"})

    def test_config_file_is_read_and_written(self, tmp_path, monkeypatch):
        monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
        monkeypatch.setattr("aictl.platforms.IS_WINDOWS", False)
        path = tmp_path / "aictl" / "config.toml"
        path.parent.mkdir()
        path.write_text('[storage]\ncapture = "full"\n\n[storage.retention]\n# thinking = "365d"\notel_days = 30\n\n'
                        '[logging]\nenabled = false\n')
        assert load_config().retention == {"otel": 720}
        set_retention_setting("thinking", "30d")
        set_retention_setting("otel", "14d")
        set_retention_setting("large_payload", "12h")
        set_retention_setting("thinking", 60)
        cfg = load_config()
        assert cfg.retention == {"thinking": 1440, "otel": 336, "large_payload": 12}
        assert cfg.retention_by_class()["prompt"] == 8760 and cfg.large_payload_bytes == 32768
        text = path.read_text()
        assert text.count("thinking") == 1 and 'otel = "14d"' in text and "otel_days" not in text and "[logging]" in text

    def test_a_class_of_an_older_aictl_is_ignored_with_one_warning(self, tmp_path, monkeypatch, caplog):
        monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
        monkeypatch.setattr("aictl.platforms.IS_WINDOWS", False)
        path = tmp_path / "aictl" / "config.toml"
        path.parent.mkdir()
        path.write_text('[storage.retention]\ntool_content = "24h"\notel = "30d"\n')
        with caplog.at_level("WARNING"):
            assert load_config().retention == {"otel": 720}
        warnings = [r.getMessage() for r in caplog.records if r.levelname == "WARNING"]
        assert len(warnings) == 1 and "tool_content is ignored" in warnings[0] and "history" in warnings[0]
        assert validate_retention({"tool_content_days": 1}) == {}
        with pytest.raises(click.BadParameter):
            admin.retention_set.params[0].type.convert("tool_content", None, None)

    def test_a_bad_setting_is_refused(self, tmp_path, monkeypatch):
        monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
        monkeypatch.setattr("aictl.platforms.IS_WINDOWS", False)
        path = tmp_path / "aictl" / "config.toml"
        path.parent.mkdir()
        path.write_text('[storage.retention]\nprompt_dayz = 10\n')
        with pytest.raises(ValueError, match="unknown setting 'prompt_dayz'"):
            load_config()
        path.write_text('[storage]\nlarge_payload_bytes = 10\n')
        with pytest.raises(ValueError, match="large_payload_bytes"):
            load_config()


class TestImportCutOff:
    def test_each_kind_of_text_follows_the_retention_of_its_class(self):
        facts = SessionFacts(MemoryWriter(), keeps_text=lambda: True,
                             retention={"prompt": 365 * 24, "thinking": 30 * 24, "text": 14 * 24})
        now = time.time()
        facts.write(CallFacts(
            prompts=[SessionPromptRow("p-old", now - 200 * DAY, "s", text="an old prompt")],
            thinking=[SessionThinkingRow("s", "t-new", now - 10 * DAY, text="recent"),
                      SessionThinkingRow("s", "t-old", now - 40 * DAY, text="old")],
            digests=[SessionDigestRow("s", "task_summary", 1, now - 20 * DAY, text="too old for text")],
        ))
        assert [r["text"] for r in facts.writer.written("session_prompts")] == ["an old prompt"]
        assert [r["thinking_key"] for r in facts.writer.written("session_thinking")] == ["t-new"]
        assert facts.writer.written("session_digests") == []

    def test_capture_off_writes_no_text_whatever_the_retention(self):
        facts = SessionFacts(MemoryWriter(), keeps_text=lambda: False, retention={"prompt": 8760, "thinking": 8760})
        now = time.time()
        facts.write(CallFacts(prompts=[SessionPromptRow("p", now, "s", text="hello")],
                              thinking=[SessionThinkingRow("s", "t", now, text="hm")]))
        assert [r["text"] for r in facts.writer.written("session_prompts")] == [""]
        assert facts.writer.written("session_thinking") == []


# ─── `aictl db retention` ────────────────────────────────────────


def _result(names, rows):
    return Result(list(names), ["string"] * len(names), [tuple(r) for r in rows])


class FakeCluster:
    """Answers the management commands and count queries of the retention commands. Periods in hours."""

    def __init__(self, periods: dict[str, int]):
        self.periods = dict(periods)
        self.commands: list[str] = []

    def mgmt(self, text):
        self.commands.append(text)
        if text == kusto_retention.POLICY_QUERY:
            return _result(("TableName", "RetentionPolicy", "TotalRowCount", "TotalExtentSize"), [
                (name, json.dumps({"SoftDeletePeriod": tables_with_retention({TABLE_RETENTION_CLASS[name]: hours})[name]
                                   .retention_timespan}),
                 1000, 4_000_000 if name == "OTELPayloads" else 1_000_000)
                for name, hours in self.periods.items()])
        if text.startswith(".alter-merge table"):
            name = text.split("['", 1)[1].split("']", 1)[0]
            self.periods[name] = parse_period(text.rsplit("= ", 1)[1])
        return _result((), ())

    def query(self, text):
        self.commands.append(text)
        return _result(("rows", "oldest"), [(42, datetime(2026, 1, 2, tzinfo=timezone.utc))])


@pytest.fixture
def cluster(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
    monkeypatch.setattr("aictl.platforms.IS_WINDOWS", False)
    fake = FakeCluster({"OTELLogs": 8760, "OTELPayloads": 8760, "requests": 8760, "session_thinking": 720,
                        "tool_invocations_text": 24, "text_payloads": 24})
    settings = type("S", (), {"uri": "https://fake/aictl"})()
    monkeypatch.setattr(admin, "_retention_commands", lambda ctx: (settings, fake.mgmt, fake.query))
    return fake


def _run(*args, input=None):
    return CliRunner().invoke(admin.db, ["retention", *args], input=input)


def _line(output: str, first: str) -> str:
    return next(line for line in output.splitlines() if line.strip().startswith(first + " "))


class TestRetentionCommand:
    def test_show_lists_classes_with_units_tables_sizes_and_differences(self, cluster):
        result = _run()
        assert result.exit_code == 0, result.output
        assert _line(result.output, "large_payload").split()[1] == "24h"
        assert not any(line.strip().startswith("tool_content ") for line in result.output.splitlines())
        assert _line(result.output, "prompt").split()[1] == "365d"
        assert "large_payload_bytes = 32768" in result.output
        line = _line(result.output, "session_thinking")
        assert line.split()[1:4] == ["thinking", "365d", "30d"] and line.endswith("differs")
        # Tool call text has the period of its calls (class history); a cluster still at 24h differs.
        assert _line(result.output, "tool_invocations_text").split()[1:4] == ["history", "365d", "24h"]
        assert "44.4%" in _line(result.output, "OTELPayloads")  # 4 MB of 9 MB
        assert cluster.commands == [kusto_retention.POLICY_QUERY]
        # Table details leave out rows still in the row store: no row count, and the size says what it is.
        assert "TotalRowCount" not in kusto_retention.POLICY_QUERY and "Rows" not in result.output
        assert "Sealed MB" in result.output

    def test_raising_applies_without_asking(self, cluster, tmp_path):
        result = _run("set", "thinking", "365d")
        assert result.exit_code == 0, result.output
        assert cluster.commands[-1] == ".alter-merge table ['session_thinking'] policy retention softdelete = 365d"
        assert not any("ingestion_time" in c for c in cluster.commands)
        assert 'thinking = "365d"' in (tmp_path / "aictl" / "config.toml").read_text()

    def test_lowering_reports_what_it_deletes_and_refuses_without_confirmation(self, cluster, tmp_path):
        result = _run("set", "otel", "30")
        assert result.exit_code != 0
        assert "OTELLogs: 42 rows, oldest 2026-01-02" in result.output and "--yes" in result.output
        assert "['OTELPayloads'] | where ingestion_time() < ago(30d)" in "\n".join(cluster.commands)
        assert not any(c.startswith(".alter-merge") for c in cluster.commands)
        assert not (tmp_path / "aictl" / "config.toml").exists()

    def test_lowering_with_yes_applies_in_hours(self, cluster):
        result = _run("set", "large_payload", "12h", "--yes")
        assert result.exit_code == 0, result.output
        assert "['text_payloads'] | where ingestion_time() < ago(12h)" in "\n".join(cluster.commands)
        assert cluster.commands[-1] == ".alter-merge table ['text_payloads'] policy retention softdelete = 12h"
        assert cluster.periods["text_payloads"] == 12 and cluster.periods["requests"] == 8760

    def test_bad_values_are_refused(self, cluster):
        assert _run("set", "otel", "0h").exit_code != 0
        assert _run("set", "otel", "2w").exit_code != 0
        assert _run("set", "nope", "10").exit_code != 0
        assert cluster.commands == []
