"""The program a shell command ran first, read by the rule of the UI's drawer/shellCommand.ts.

The cases mirror ui/test for programOf, so both sides read one command the same way; the
board counts a test run only when that first program is a test runner.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from aictl.dashboard.shell_program import TEST_RUNNERS, first_program, is_test_run, run_label

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


# Invented command lines. The Testing panel showed the start of each, so rows read "cd /Users/…"
# or "$env:PYTHONPATH='C:\…" and none named the test that ran.
@pytest.mark.parametrize(("command", "label"), [
    ("cd /home/dev/proj && pytest test/test_x.py -q 2>&1 | tail -5", "pytest test/test_x.py -q"),
    ("PYTHONPATH=src:/tmp/deps /home/dev/.venv/bin/python -m pytest test/test_a.py -q", "python -m pytest test/test_a.py -q"),
    ("Set-Location -LiteralPath 'C:\\work\\proj'; $env:PYTHONPATH='C:\\work\\proj\\src'; python -m pytest tests\\test_a.py -q",
     "python -m pytest tests/test_a.py -q"),
    ("& 'C:\\work\\proj\\.venv\\Scripts\\python.exe' -m pytest C:\\work\\proj\\tests\\test_b.py", "python -m pytest tests/test_b.py"),
    ("set CI=1 && npm test", "npm test"),
    ("cmd /c \"cd /d C:\\work && set A=b && npm test\"", "npm test"),
    ("pushd C:\\src\\app && dotnet test Foo.sln --no-build", "dotnet test Foo.sln --no-build"),
    ("timeout 600 uv run pytest -x", "pytest -x"),
    ("poetry run pytest > out.txt", "pytest"),
    ("npx vitest run test/a.test.ts", "vitest run test/a.test.ts"),
    ("bash -lc 'cd x && pytest -q'", "pytest -q"),
    ("$PY -m pytest -q", "python -m pytest -q"),
    ("pytest a b c d e f g h", "pytest a b c d e f …"),
    # No recognisable runner: its program name, never an empty label.
    ("./run_checks.sh --fast | grep FAIL", "run_checks.sh --fast"),
    ("for f in a b; do pytest $f; done", "pytest $f"),
    ("$x.Method()", "$x.Method()"),
    ("", "command"),
])
def test_a_test_run_is_named_by_its_runner_and_target(command, label):
    assert run_label(command) == label


def test_one_test_run_from_two_folders_has_one_label():
    assert run_label("cd /a/one && PYTHONPATH=src pytest test/test_x.py") == run_label(
        "Set-Location C:\\b\\two; $env:PYTHONPATH='src'; pytest test\\test_x.py")
