"""Source scan for constructs that break on Windows.

These fail only on Windows, so nothing else in a suite that runs on POSIX notices them.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parent.parent / "src" / "aictl"

POSIX_MODULES = {"fcntl", "pwd", "grp", "resource", "termios"}
POSIX_ATTRS = {("os", "getuid"), ("os", "geteuid"), ("os", "fork"), ("os", "setsid"), ("signal", "SIGKILL"), ("signal", "SIGHUP")}
POSIX_COMMANDS = {"lsof", "ps", "nettop", "launchctl", "sh", "bash", "which"}
SUBPROCESS_CALLS = {"run", "Popen", "call", "check_call", "check_output"}
GUARD_RE = re.compile(r"IS_WINDOWS|IS_MACOS|os\.name|sys\.platform|platform\.system|hasattr|getattr")

# (path relative to src/aictl, finding) -> why it is safe.
ALLOWLIST = {
    ("monitoring/collectors/network.py", "subprocess:nettop"): "only runs after is_available() finds nettop with shutil.which",
}


def _with_parents(tree: ast.AST) -> ast.AST:
    for node in ast.walk(tree):
        for child in ast.iter_child_nodes(node):
            child.parent = node  # type: ignore[attr-defined]
    return tree


def _ancestors(node: ast.AST):
    while hasattr(node, "parent"):
        node = node.parent  # type: ignore[attr-defined]
        yield node


def _is_guarded(node: ast.AST) -> bool:
    """Under a platform check, or after an early-exit platform check in the same function."""
    previous = node
    for parent in _ancestors(node):
        if isinstance(parent, ast.If) and GUARD_RE.search(ast.unparse(parent.test)):
            return True
        if isinstance(parent, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Module)):
            for stmt in parent.body:
                if stmt is previous:
                    break
                if (
                    isinstance(stmt, ast.If)
                    and GUARD_RE.search(ast.unparse(stmt.test))
                    and isinstance(stmt.body[-1], (ast.Return, ast.Raise))
                ):
                    return True
            if not isinstance(parent, ast.Module):
                return False
        previous = parent
    return False


def _docstrings(tree: ast.AST) -> set[int]:
    ids: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                ids.add(id(body[0].value))
    return ids


def _missing_encoding(call: ast.Call) -> bool:
    func = call.func
    name = func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", "")
    kwargs = {k.arg: k.value for k in call.keywords}
    if "encoding" in kwargs:
        return False
    if name == "read_text":
        return not call.args
    if name == "write_text":
        return len(call.args) < 2
    if name != "open":
        return False
    if isinstance(func, ast.Attribute):
        if ast.unparse(func.value) in {"webbrowser", "os", "gzip", "tarfile", "zipfile"}:
            return False
        positional = call.args
    else:
        positional = call.args[1:]
    mode = kwargs.get("mode") or (positional[0] if positional else None)
    if mode is None:
        return True
    if isinstance(mode, ast.Constant):
        return "b" not in str(mode.value)
    return False


def scan(source: str) -> list[str]:
    tree = _with_parents(ast.parse(source))
    docs = _docstrings(tree)
    findings: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name in POSIX_MODULES and not _is_guarded_import(node):
                    findings.append(f"import:{alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if node.module in POSIX_MODULES and not _is_guarded_import(node):
                findings.append(f"import:{node.module}")
        elif isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
            if (node.value.id, node.attr) in POSIX_ATTRS and not _is_guarded(node):
                findings.append(f"attr:{node.value.id}.{node.attr}")
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            if id(node) not in docs and re.search(r"(^|[\s\"'=:])/tmp(/|\b)", node.value):
                findings.append("tmp")
        elif isinstance(node, ast.Call):
            if _missing_encoding(node):
                findings.append("encoding")
            func = node.func
            if (
                isinstance(func, ast.Attribute)
                and ast.unparse(func.value) == "os"
                and func.attr == "kill"
                and len(node.args) == 2
                and isinstance(node.args[1], ast.Constant)
                and node.args[1].value == 0
                and not _is_guarded(node)
            ):
                findings.append("kill0")
            if (
                isinstance(func, ast.Attribute)
                and func.attr in SUBPROCESS_CALLS
                and ast.unparse(func.value) == "subprocess"
                and node.args
                and isinstance(node.args[0], ast.List)
                and node.args[0].elts
                and isinstance(node.args[0].elts[0], ast.Constant)
                and node.args[0].elts[0].value in POSIX_COMMANDS
                and not _is_guarded(node)
            ):
                findings.append(f"subprocess:{node.args[0].elts[0].value}")
            if (
                isinstance(func, ast.Attribute)
                and func.attr in SUBPROCESS_CALLS
                and ast.unparse(func.value) == "subprocess"
                and node.args
                and isinstance(node.args[0], ast.List)
                and node.args[0].elts
                and isinstance(node.args[0].elts[0], ast.Constant)
                and node.args[0].elts[0].value in {"npm", "npx"}
                and not any(k.arg == "shell" for k in node.keywords)
            ):
                findings.append("npm-without-shell")  # npm is npm.cmd on Windows
    return findings


def _is_guarded_import(node: ast.AST) -> bool:
    """A POSIX import is safe inside a platform check or a try block."""
    return _is_guarded(node) or any(isinstance(p, ast.Try) for p in _ancestors(node))


def test_source_has_no_unguarded_posix_constructs():
    problems = []
    used = set()
    for path in sorted(SRC.rglob("*.py")):
        rel = path.relative_to(SRC).as_posix()
        for finding in scan(path.read_text(encoding="utf-8")):
            if (rel, finding) in ALLOWLIST:
                used.add((rel, finding))
            else:
                problems.append(f"{rel}: {finding}")
    assert problems == []
    assert used == set(ALLOWLIST), "stale allowlist entries"


@pytest.mark.parametrize(
    "snippet,expected",
    [
        ("open('x')", "encoding"),
        ("open('x', 'w')", "encoding"),
        ("p.read_text()", "encoding"),
        ("p.write_text('x')", "encoding"),
        ("import fcntl", "import:fcntl"),
        ("import os\nos.fork()", "attr:os.fork"),
        ("import signal\nsignal.SIGKILL", "attr:signal.SIGKILL"),
        ("x = '/tmp/a'", "tmp"),
        ("import os\nos.kill(1, 0)", "kill0"),
        ("import subprocess\nsubprocess.run(['lsof', '-i'])", "subprocess:lsof"),
        ("import subprocess\nsubprocess.run(['npm', 'install'])", "npm-without-shell"),
    ],
)
def test_scan_detects(snippet, expected):
    assert expected in scan(snippet)


@pytest.mark.parametrize(
    "snippet",
    [
        "open('x', 'rb')",
        "open('x', encoding='utf-8')",
        "p.read_text('utf-8')",
        "p.write_text('x', encoding='utf-8')",
        "webbrowser.open('http://x')",
        "if IS_WINDOWS:\n    import msvcrt\nelse:\n    import fcntl",
        "try:\n    import fcntl\nexcept ImportError:\n    fcntl = None",
        "def f():\n    if IS_WINDOWS:\n        return\n    os.fork()",
        "def f():\n    '''Path such as /tmp/a.'''",
        "if os.name == 'posix':\n    subprocess.run(['ps'])",
    ],
)
def test_scan_accepts(snippet):
    assert scan(snippet) == []
