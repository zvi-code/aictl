# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""aictl has no SQLite store of its own; SQLite is only read, from other tools' files, read-only.

``test_no_sqlite.py`` runs the daemon without the module. This file guards the source: a new
``sqlite3.connect`` must be read-only, and the words of the removed own store must not return.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from pathlib import Path

from click.testing import CliRunner

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "aictl"

# The one place aictl opens a SQLite file. Every reader of another tool's database goes through it.
CONNECT_ALLOWED = {"ingesters/_common.py"}

# Files that import sqlite3, and the other tool's database each one reads (never aictl's own).
IMPORT_ALLOWED = {
    "index_breakdown.py": "Copilot session-store.db",
    "context_audit.py": "Copilot desktop data.db",
    "effective_config.py": "Copilot session-store.db (through open_readonly)",
    "ingesters/_common.py": "any tool's file, opened read-only here",
    "ingesters/copilot_session_store.py": "Copilot session-store.db",
    "ingesters/copilot_store_content.py": "Copilot session-store.db",
    "ingesters/cursor_conversations.py": "Cursor conversations database",
    "ingesters/transcript_usage.py": "Copilot session-store.db and data.db",
    "ingesters/session_outcomes.py": "Copilot session-store.db",
    "ingesters/session_titles.py": "Copilot session-store.db and Cursor state",
    "observe/collect.py": "Copilot session-store.db",
    "observe/sessions.py": "Copilot session-store.db",
    "monitoring/tool_telemetry.py": "Copilot data.db and Cursor state.vscdb",
    "monitoring/tool_config.py": "Copilot desktop data.db",
}
WRITE_STATEMENT = re.compile(
    r"""["'\s(](INSERT\s+(OR\s+\w+\s+)?INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|VIEW)|DROP\s+(TABLE|INDEX)|"""
    r"""ALTER\s+TABLE|REPLACE\s+INTO|VACUUM|ATTACH\s+DATABASE)\b|executescript|executemany|\.commit\(\)|PRAGMA\s+\w+\s*=""",
    re.IGNORECASE,
)


def _sources():
    for path in sorted(SRC.rglob("*.py")):
        relative = path.relative_to(SRC).as_posix()
        if not relative.startswith("stores/"):
            yield relative, path.read_text(encoding="utf-8")


def test_only_the_read_only_helper_connects_to_sqlite():
    connects = {rel for rel, text in _sources() if re.search(r"\bsqlite3\.connect\(", text)}
    assert connects <= CONNECT_ALLOWED, f"Open other tools' databases with open_readonly: {sorted(connects - CONNECT_ALLOWED)}"
    helper = (SRC / "ingesters" / "_common.py").read_text(encoding="utf-8")
    assert "mode=ro&immutable=1" in helper


def test_every_sqlite_import_is_listed_with_the_tool_database_it_reads():
    importers = {rel for rel, text in _sources() if re.search(r"^\s*import sqlite3\b", text, re.MULTILINE)}
    assert importers <= IMPORT_ALLOWED.keys(), f"Name the tool database the new reader opens: {sorted(importers - IMPORT_ALLOWED.keys())}"


def test_no_code_that_imports_sqlite_writes():
    found = {}
    for rel, text in _sources():
        if rel in IMPORT_ALLOWED:
            for number, line in enumerate(text.splitlines(), 1):
                if not line.lstrip().startswith("#") and WRITE_STATEMENT.search(line):
                    found.setdefault(rel, []).append(number)
    assert not found, f"A write statement against another tool's database: {found}"


def test_open_readonly_creates_nothing_and_cannot_write(tmp_path):
    from aictl.ingesters._common import open_readonly

    missing = tmp_path / "missing.db"
    assert open_readonly(missing, "test") is None
    assert list(tmp_path.iterdir()) == []

    path = tmp_path / "other.db"
    with sqlite3.connect(path) as conn:
        conn.execute("CREATE TABLE t (a)")
        conn.execute("INSERT INTO t VALUES (1)")
    conn.close()
    before = path.read_bytes()
    reader = open_readonly(path, "test")
    assert reader is not None
    assert reader.execute("SELECT a FROM t").fetchall() == [(1,)]
    try:
        reader.execute("INSERT INTO t VALUES (2)")
    except sqlite3.OperationalError:
        pass
    else:
        raise AssertionError("The connection accepted a write")
    reader.close()
    assert path.read_bytes() == before and sorted(p.name for p in tmp_path.iterdir()) == ["other.db"]


def test_cursor_telemetry_reads_read_only_and_a_missing_file_stays_missing(tmp_path, monkeypatch):
    from aictl.monitoring import tool_telemetry

    monkeypatch.setattr(tool_telemetry, "IS_WINDOWS", False)
    monkeypatch.setattr(tool_telemetry, "cursor_user_dir", lambda: tmp_path)
    storage = tmp_path / "globalStorage"
    assert tool_telemetry.parse_cursor_telemetry() is None
    storage.mkdir()
    assert tool_telemetry.parse_cursor_telemetry() is None
    assert list(storage.iterdir()) == []

    vscdb = storage / "state.vscdb"
    with sqlite3.connect(vscdb) as conn:
        conn.execute("CREATE TABLE ItemTable (key TEXT, value TEXT)")
        conn.execute(
            "INSERT INTO ItemTable VALUES ('usage', '{\"usage\": {\"inputTokens\": 5, \"outputTokens\": 7}}')"
        )
    conn.close()
    before = vscdb.read_bytes()
    report = tool_telemetry.parse_cursor_telemetry()
    assert report is not None and (report.input_tokens, report.output_tokens) == (5, 7)
    assert vscdb.read_bytes() == before and sorted(p.name for p in storage.iterdir()) == ["state.vscdb"]


def test_copilot_desktop_audit_does_not_create_a_missing_database(tmp_path):
    from aictl import context_audit

    inventory = context_audit._Inventory(tmp_path)
    context_audit._collect_copilot_desktop(inventory, [], tmp_path / "data.db")
    assert list(tmp_path.iterdir()) == []


# ── the words of the removed own store ──

_REMOVED_WORDS = {
    "history.db": re.compile(r"history\.db"),
    "effective_db_path": re.compile(r"effective_db_path"),
    "a SQLite history database": re.compile(r"SQLite history database"),
    "the SQLite fallback of the Kusto settings": re.compile(r"\(none: SQLite\)|instead of SQLite|Empty = SQLite"),
    "db_path as a setting": re.compile(r"^db_path\s*=|\(\s*\"db_path\"\s*,\s*\"db_path\"|\bdb_path:\s*str\b", re.MULTILINE),
    "a --db option other than the removed one": re.compile(r"option\(\s*\"--db\""),
}
_DOCS = [ROOT / "README.md", *sorted((ROOT / "docs").glob("*.md"))]


def test_the_own_sqlite_store_words_do_not_return():
    found = []
    texts = [(rel, text) for rel, text in _sources() if rel != "cli_context.py"]
    # The datapoint catalog still describes a datapoint of the old store; it has its own sync.
    texts += [(path.name, path.read_text(encoding="utf-8")) for path in _DOCS if path.name != "datapoint-catalog.md"]
    for name, text in texts:
        for label, pattern in _REMOVED_WORDS.items():
            if pattern.search(text):
                found.append(f"{name}: {label}")
    assert not found, found
    declared = [rel for rel, text in _sources() if re.search(r"option\(\s*\"--db\"", text)]
    assert declared == ["cli_context.py"]


def test_an_old_config_with_db_path_is_ignored_with_one_message(tmp_path, monkeypatch, caplog):
    from aictl import platforms

    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
    monkeypatch.setattr(platforms, "IS_WINDOWS", False)
    monkeypatch.setattr(platforms, "_REMOVED_DB_PATH_WARNED", set())
    path = tmp_path / "aictl" / "config.toml"
    path.parent.mkdir()
    path.write_text('[storage]\ndb_path = "/old/history.db"\ncapture = "metadata"\n')
    with caplog.at_level(logging.WARNING, logger="aictl.platforms"):
        cfg = platforms.load_config()
        platforms.load_config()
    assert cfg.capture == "metadata" and not hasattr(cfg, "db_path")
    messages = [r.getMessage() for r in caplog.records if "db_path" in r.getMessage()]
    assert len(messages) == 1 and "kusto_cluster" in messages[0]
    assert "db_path" not in platforms.show_config()


def test_an_old_db_option_is_refused_naming_the_kusto_settings():
    from aictl.cli import main

    for args in (["daemon", "serve", "--db", "x.db"], ["db", "--db", "x.db", "stats"], ["catalog", "--db", "x.db"]):
        result = CliRunner().invoke(main, args)
        assert result.exit_code == 2, (args, result.output)
        assert "kusto_cluster" in result.output and "kusto_database" in result.output, (args, result.output)
