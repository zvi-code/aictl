"""The program a stored command call names (tool_invocations.command_name), for Windows and POSIX command lines.

These command lines are invented. Before the fix a PowerShell environment assignment was read as the program,
with its punctuation stripped (``envPYTHONPATHsrc``, ``envPATH``, ``src``, ``bin``), and PowerShell's call
operator ``&`` gave an empty name, which the time card counts as "Command not recorded".
"""

from __future__ import annotations

import re

import pytest

from aictl.tool_targets import describe_call, program_name

_SHELL = re.compile(r"^[^A-Za-z0-9_]|^[A-Z_][A-Z0-9_]*$")  # the time card's "shell construct" test (insights.time_split)


@pytest.mark.parametrize(("command", "program"), [
    ('$env:PYTHONPATH="src"; python -m pytest test/test_x.py -q', "pytest"),
    ("$env:PYTHONPATH = 'src'; python scripts/run.py", "python"),
    ('$env:PYTHONPATH="$PWD\\src"; .venv\\Scripts\\python.exe -m aictl serve', "aictl"),
    ('$env:PATH="$HOME\\.local\\bin;$env:PATH"; npm test', "npm"),
    ('$env:PATH += ";C:\\tools\\bin"; git status', "git"),
    ('& "C:\\Program Files\\Git\\bin\\git.exe" log -1', "git"),
    ('& .\\.venv\\Scripts\\python.exe -m pytest', "pytest"),
    ("Set-Location C:\\work\\proj; dotnet build", "dotnet"),
    ("cd C:\\work\\proj && npm run build", "npm"),
    ("set PYTHONPATH=src && python -m pytest", "pytest"),
    ('cmd /c "set A=1 && node build.js"', "node"),
    ('pwsh -NoProfile -Command "Get-ChildItem src"', "Get-ChildItem"),
    ("PYTHONPATH=src python3 -m pytest -q", "pytest"),
    ("cd /work && ./node_modules/.bin/vitest run", "vitest"),
    ("sudo env FOO=1 make test", "make"),
])
def test_the_program_is_the_command_actually_run(command, program):
    assert program_name(command) == program
    assert describe_call("powershell", {"command": command}, keep_text=False)["command_name"] == program


@pytest.mark.parametrize("command", [
    "for f in a b; do echo $f; done",
    "$PY scripts/x.py",
    '$env:PATH -split ";"',
    "[System.IO.File]::ReadAllText('x')",
])
def test_a_command_that_names_no_plain_program_stays_a_shell_construct_and_is_never_empty(command):
    name = program_name(command)
    assert name and _SHELL.match(name) or name in {"for"}, name


def test_none_of_the_wrong_names_comes_back():
    commands = ['$env:PYTHONPATH="src"; python -m pytest', '$env:PATH="C:\\x\\bin;$env:PATH"; node a.js',
                '$env:PYTHONPATH="$PWD\\src"; pytest', '$env:PATH="$HOME\\.local\\bin"; uv run pytest']
    assert {program_name(command) for command in commands} & {"envPYTHONPATHsrc", "envPATH", "src", "bin", ""} == set()


def test_a_windows_setup_part_before_a_test_runner_still_counts_as_a_test_run():
    from aictl.dashboard.shell_program import is_test_run

    assert is_test_run("set PYTHONPATH=src && python -m pytest -q")
    assert is_test_run('$env:PATH += ";C:\\tools"; npx vitest run')
    assert is_test_run('cmd /c "set CI=1 && npm test"')
    assert not is_test_run("set PYTHONPATH=src && python build.py")
