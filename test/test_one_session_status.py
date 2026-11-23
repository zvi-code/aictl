"""Guard: a session's status is decided in one place, aictl.session_lifecycle.session_status.

The board, the session finder and the runtime report call it; no other module turns the
lifecycle into a status word. The finder's query (sessions.search.kql) mirrors only the live
rule of ``assess`` so that its filter and counts match the rows; the rows themselves get
their status from session_status. Subagents have their own rule (dashboard/subagents.py),
which starts from the parent's status.
"""

from __future__ import annotations

import re
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src" / "aictl"

# Calling assess directly, or turning liveness into a word inline, is a second status rule.
_DIRECT = re.compile(r"session_lifecycle\.assess\(|\blifecycle\.live\s+else\b|\"running\" if \w*\.?live\b")
_ALLOWED = {SRC / "session_lifecycle.py"}


def test_no_module_derives_a_session_status_outside_session_lifecycle():
    found = []
    for path in sorted(SRC.rglob("*.py")):
        if path in _ALLOWED:
            continue
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if _DIRECT.search(line):
                found.append(f"{path.relative_to(SRC)}:{number}: {line.strip()}")
    assert not found, "derive the status with session_lifecycle.session_status:\n" + "\n".join(found)


def test_the_status_callers_are_the_board_the_finder_and_the_runtime_report():
    callers = sorted(str(p.relative_to(SRC)) for p in SRC.rglob("*.py")
                     if p not in _ALLOWED and "session_status(" in p.read_text(encoding="utf-8"))
    assert callers == ["dashboard/board_projection.py", "dashboard/session_record.py", "monitoring/live_sources.py"]


def test_the_ui_takes_the_status_from_the_history_when_the_runtime_does_not_know_it():
    """The UI holds no rule of its own: with no activity report it uses the history's process_status."""
    ui = SRC / "dashboard" / "ui" / "src"
    overlay = (ui / "data" / "runtimeAgents.ts").read_text(encoding="utf-8")
    assert "process_status" in overlay
    rules = [str(p.relative_to(ui)) for p in ui.rglob("*.ts*")
             if re.search(r"last_activity_at[^\n]*(?:<|>)[^\n]*(?:900|idle_window)", p.read_text(encoding="utf-8"))]
    assert not rules, f"status decided from the idle window in the UI: {rules}"
