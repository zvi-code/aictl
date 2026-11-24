# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The board's panel facts of a call (is_test_run, test_label, failed, is_edit) are stored at ingest by the
board's own rules, so a panel view can count and list calls without reading their text."""

from __future__ import annotations

import time

import pytest
from core_store_fakes import current

from aictl.dashboard.board_projection import (
    TEST_LABEL_CHARS,
    _test_failed,
    is_command_tool,
    is_edit_tool,
    is_test_command,
)
from aictl.dashboard.projection_utils import _one_line
from aictl.dashboard.shell_program import run_label
from aictl.records import ToolInvocationRow
from aictl.stores.testing import MemoryWriter
from aictl.tool_calls import ToolCalls

NOW = time.time()


def stored(*rows, keeps_text=True):
    writer = MemoryWriter()
    ToolCalls(writer, keeps_text=lambda: keeps_text).record(rows)
    return {r["source_event_id"]: r for r in current(writer, "tool_invocations")}


def call(event, name, args=None, **kw):
    return ToolInvocationRow(
        ts=NOW,
        session_id="s",
        tool="claude-code",
        tool_name=name,
        input=args or {},
        source="transcript",
        source_event_id=event,
        **kw,
    )


@pytest.mark.parametrize(
    "name, command, is_error, exit_code",
    [
        ("Bash", "cd /w && python -m pytest -q test/test_x.py", 0, 0),
        ("Bash", "npm run test", 0, 1),
        ("Bash", "grep pytest log.txt", 1, None),
        ("Bash", "git status", 0, 2),
        ("run_in_terminal", "make test", 0, None),
        ("Edit", "", 0, None),
        ("mcp__fs__write_file", "", 1, None),
    ],
)
def test_the_stored_flags_are_the_boards_rules(name, command, is_error, exit_code):
    args = {"command": command} if command else {"file_path": "/w/a.py"}
    row = stored(call("t", name, args, is_error=is_error, exit_code=exit_code))["t"]
    test = is_command_tool(name) and is_test_command(command)
    assert row["is_test_run"] is test
    assert row["failed"] is (_test_failed(is_error, exit_code) if test else bool(is_error))
    assert row["is_edit"] is is_edit_tool(name)
    assert row["test_label"] == (_one_line(run_label(row["target"]), TEST_LABEL_CHARS) if test else "")


def test_a_test_run_is_known_when_its_command_text_is_not_kept():
    row = stored(call("t", "Bash", {"command": "uv run pytest -x"}, exit_code=1), keeps_text=False)["t"]
    assert row["is_test_run"] and row["failed"]


def test_a_completion_without_the_command_keeps_the_test_run_and_sets_failed_by_its_exit_code():
    rows = stored(call("t", "Bash", {"command": "pytest -q"}), call("t", "Bash", exit_code=3))
    assert rows["t"]["is_test_run"] and rows["t"]["failed"] and rows["t"]["test_label"]
