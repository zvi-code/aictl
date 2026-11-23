"""The program a shell command ran first, read by the rule of the UI's drawer/shellCommand.ts.

The cases mirror ui/test for programOf, so both sides read one command the same way; the
board counts a test run only when that first program is a test runner.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from aictl.dashboard.shell_program import TEST_RUNNERS, first_program, is_test_run

SRC = Path(__file__).resolve().parents[1] / "src" / "aictl"


@pytest.mark.parametrize(("command", "program"), [
    ("git status", "git"),
    ("cd /repo && git log -1 | head -5", "git"),
    ("FOO=1 BAR='a b' npm test", "npm"),
    ("bash -lc 'cd x && pytest -q'", "pytest"),
    ("cmd /c dir", "dir"),
    ("pwsh -Command Get-ChildItem", "Get-ChildItem"),
    ("C:\\Tools\\rg.exe -n foo", "rg"),
    ("python3 -m pytest -q", "pytest"),
    ("python3 - <<'EOF'\nimport os\nos.system('pytest')\nEOF\nls", "python3"),
    ("(cd ui && npm run build)", "npm"),
])
def test_the_first_program_is_read_as_the_ui_reads_it(command, program):
    assert first_program(command)[0] == program


@pytest.mark.parametrize("command", ["$x.Method()", "for f in *; do echo $f; done", "[IO.File]::ReadAllText('a')", ""])
def test_a_command_that_names_no_plain_program_is_unknown(command):
    assert first_program(command) is None


def test_a_test_run_is_a_command_whose_first_program_is_a_test_runner():
    assert is_test_run("cd repo && FOO=1 python -m pytest -q")
    assert not is_test_run("sed -i '' 's/a/b/' x.py && pytest -q")
    assert {"pytest", "vitest", "jest"} <= TEST_RUNNERS


def test_no_other_module_classifies_test_commands():
    """The board, the session detail and the testing panel all reach shell_program.is_test_run."""
    found = [str(p.relative_to(SRC)) for p in SRC.rglob("*.py")
             if p.name != "shell_program.py" and '{"pytest", "vitest"' in p.read_text(encoding="utf-8")]
    assert not found, found
