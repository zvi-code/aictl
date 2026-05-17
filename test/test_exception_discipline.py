# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Static-analysis tests for exception-handling discipline.

These tests scan source files to catch patterns that systematically produce
silent failures.  They complement the ruff BLE001/S110 lint rules and run in
CI even when ruff is not installed.

Two dangerous patterns are checked in command / utility code:

  Pattern A — no-op swallow:
      except Exception:
          pass
      Completely hides bugs.  catch.Abort (RuntimeError subclass) was caught
      this way in write_safe(), preventing the user's "N" response from
      aborting the write.

  Pattern B — broad catch in click-aware code without re-raising Abort:
      except Exception:
          <anything other than raise>
      click.Abort inherits from RuntimeError → Exception.  Any broad handler
      that does not explicitly re-raise click.Abort will suppress the user's
      abort intent.

The daemon / monitoring layer is explicitly excluded; those components must
survive individual metric / event failures and use broad catches intentionally.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Files under test
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).parent.parent

# Command / utility layer: every broad exception here is suspect.
COMMAND_FILES = sorted(
    [
        *Path(REPO_ROOT / "src" / "aictl" / "commands").glob("*.py"),
        REPO_ROOT / "src" / "aictl" / "utils.py",
    ]
)

# Daemon / monitoring layer: intentionally broad, excluded from checks.
EXCLUDED_PATTERNS = [
    "src/aictl/orchestrator.py",
    "src/aictl/sink.py",
    "src/aictl/storage.py",
    "src/aictl/dashboard/tui.py",
    "src/aictl/dashboard/web_server.py",
    "src/aictl/dashboard/html_report.py",
    "src/aictl/monitoring/",
    "src/aictl/client.py",
    "src/aictl/memory.py",
]


def _is_excluded(path: Path) -> bool:
    rel = path.relative_to(REPO_ROOT).as_posix()
    return any(rel.startswith(p) or rel == p for p in EXCLUDED_PATTERNS)


# ---------------------------------------------------------------------------
# Pattern A: no-op swallow via regex
# ---------------------------------------------------------------------------

# Matches:  except Exception:  (possibly with trailing whitespace)
# followed by a body that is only whitespace/blank lines and 'pass'.
_NOOP_SWALLOW_RE = re.compile(
    r"except\s+Exception\s*:\s*\n(\s*\n)*\s*pass\b",
    re.MULTILINE,
)
# Matches:  except Exception: pass  (single line)
_NOOP_SWALLOW_INLINE_RE = re.compile(
    r"except\s+Exception\s*:\s+pass\b",
)
# Matches bare: except:   followed by pass
_BARE_NOOP_RE = re.compile(
    r"except\s*:\s*\n(\s*\n)*\s*pass\b|except\s*:\s+pass\b",
    re.MULTILINE,
)


def _find_noop_swallows(path: Path) -> list[tuple[int, str]]:
    """Return (line_number, snippet) for every no-op exception swallow."""
    source = path.read_text(encoding="utf-8")
    hits = []
    for pattern in (_NOOP_SWALLOW_RE, _NOOP_SWALLOW_INLINE_RE, _BARE_NOOP_RE):
        for m in pattern.finditer(source):
            lineno = source[: m.start()].count("\n") + 1
            hits.append((lineno, m.group(0).strip()))
    return hits


@pytest.mark.parametrize("path", COMMAND_FILES, ids=lambda p: p.relative_to(REPO_ROOT).as_posix())
def test_no_noop_exception_swallow(path: Path):
    """No-op exception swallows (except Exception: pass) must not appear in command code.

    This pattern completely hides bugs and was the root cause of write_safe()
    catching click.Abort and silently continuing after the user chose 'N'.

    If a broad catch is genuinely needed (e.g. infrastructure check that must
    not crash the command), catch the specific exception type(s) instead.
    If truly unavoidable, add:  # noqa: S110  with a comment explaining why.
    """
    if _is_excluded(path):
        pytest.skip(f"{path.name} is in the daemon layer — broad catches allowed")

    source = path.read_text(encoding="utf-8")
    hits = _find_noop_swallows(path)

    # Allow lines with explicit noqa markers (ruff S110 acknowledgement)
    hits = [(ln, snip) for ln, snip in hits if "# noqa" not in source.splitlines()[ln - 1]]

    assert not hits, f"{path.relative_to(REPO_ROOT)} contains no-op exception swallows:\n" + "\n".join(
        f"  line {ln}: {snip}" for ln, snip in hits
    )


# ---------------------------------------------------------------------------
# Pattern B: broad catch without re-raising click.Abort (AST-based)
# ---------------------------------------------------------------------------


class _BroadCatchVisitor(ast.NodeVisitor):
    """Collect ExceptHandler nodes that catch Exception broadly.

    A handler is 'safe' if it either:
    - Catches a specific exception type (not Exception / BaseException)
    - Contains a bare 'raise' statement (re-raises)
    - Contains 'raise' of click.Abort specifically
    - Is inside an except clause that re-raises Abort before the broad catch
    """

    def __init__(self, source_lines: list[str]) -> None:
        self.violations: list[tuple[int, str]] = []
        self._source_lines = source_lines

    def _handler_reraises(self, handler: ast.ExceptHandler) -> bool:
        """Return True if the handler body contains any bare raise."""
        for node in ast.walk(ast.Module(body=handler.body, type_ignores=[])):
            if isinstance(node, ast.Raise):
                return True
        return False

    def _is_broad(self, handler: ast.ExceptHandler) -> bool:
        """Return True if the handler catches Exception or BaseException broadly."""
        if handler.type is None:
            return True  # bare except:
        if isinstance(handler.type, ast.Name) and handler.type.id in ("Exception", "BaseException"):
            return True
        if isinstance(handler.type, ast.Attribute) and handler.type.attr in ("Exception", "BaseException"):
            return True
        return False

    def visit_Try(self, node: ast.Try) -> None:
        for handler in node.handlers:
            if self._is_broad(handler) and not self._handler_reraises(handler):
                line = handler.lineno
                src = self._source_lines[line - 1].strip() if line <= len(self._source_lines) else ""
                self.violations.append((line, src))
        self.generic_visit(node)


def _broad_catches_without_reraise(path: Path) -> list[tuple[int, str]]:
    """Return (line, source_line) for broad exception catches that never re-raise."""
    source = path.read_text(encoding="utf-8")
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []
    visitor = _BroadCatchVisitor(source.splitlines())
    visitor.visit(tree)
    # Filter out lines with explicit noqa markers
    lines = source.splitlines()
    return [(ln, snip) for ln, snip in visitor.violations if "# noqa" not in lines[ln - 1]]


@pytest.mark.parametrize("path", COMMAND_FILES, ids=lambda p: p.relative_to(REPO_ROOT).as_posix())
def test_broad_catch_reraises_abort(path: Path):
    """Broad exception handlers in command code must re-raise (not swallow silently).

    click.Abort inherits from RuntimeError → Exception.  Any broad handler that
    does not re-raise will suppress the user's 'N' response from WriteGuard and
    any other click.Abort raised by Click internals.

    Allowed exceptions (must be acknowledged with # noqa: BLE001):
    - Infrastructure probes where failure is expected (e.g. server not running)
    - Best-effort operations where partial failure is gracefully reported

    Preferred fix: catch specific types (OSError, json.JSONDecodeError, etc.)
    rather than broad Exception.
    """
    if _is_excluded(path):
        pytest.skip(f"{path.name} is in the daemon layer — broad catches allowed")

    violations = _broad_catches_without_reraise(path)
    assert not violations, (
        f"{path.relative_to(REPO_ROOT)} has broad exception catches that never re-raise.\n"
        f"Either narrow to specific types or add '# noqa: BLE001' with explanation:\n"
        + "\n".join(f"  line {ln}: {snip}" for ln, snip in violations)
    )


# ---------------------------------------------------------------------------
# Pattern C: exit code discipline — commands with FAILED actions must exit 1
# ---------------------------------------------------------------------------


def test_otel_enable_exits_1_on_partial_failure(tmp_path, monkeypatch):
    """otel enable must exit 1 if any action fails, so CI/scripts detect partial failure."""
    from click.testing import CliRunner

    from aictl.commands.integrations import otel

    monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [])
    monkeypatch.setenv("AICTL_PORT", "8484")

    # Inject a VS Code path that is a file (unwritable as a directory) to force FAILED
    bad_vscode = tmp_path / "bad"
    bad_vscode.write_text("I am a file, not a directory")
    monkeypatch.setattr("aictl.commands.integrations.vscode_user_dir", lambda: bad_vscode)

    runner = CliRunner()
    result = runner.invoke(otel, ["enable", "--tool", "copilot"])
    assert result.exit_code != 0, "otel enable must return non-zero exit code when an action fails"


def test_enable_exits_1_on_partial_failure(tmp_path, monkeypatch):
    """aictl enable must exit 1 if any integration fails."""
    from click.testing import CliRunner

    from aictl.commands.integrations import enable

    monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [])
    monkeypatch.setattr("aictl.commands.integrations.claude_global_dir", lambda: tmp_path / "claude")
    monkeypatch.setenv("AICTL_PORT", "8484")

    # Force VS Code to fail
    bad_vscode = tmp_path / "bad_vscode_file"
    bad_vscode.write_text("not a directory")
    monkeypatch.setattr("aictl.commands.integrations.vscode_user_dir", lambda: bad_vscode)
    monkeypatch.setattr("aictl.commands.integrations.vscode_user_dir", lambda: bad_vscode)

    runner = CliRunner()
    result = runner.invoke(enable, ["--scope", "user"])
    assert result.exit_code != 0, "enable must return non-zero exit code when any integration fails"


# ---------------------------------------------------------------------------
# Pattern D: ratchet — BLE001/S110 ignore list must not grow
# ---------------------------------------------------------------------------

# Snapshot of files granted BLE001 or S110 exemption in pyproject.toml.
# Every entry is documented with a one-line justification in pyproject.toml.
# Adding to this set requires a deliberate edit in both places so reviewers
# see the carve-out in code review.
EXPECTED_BLE_S110_IGNORED_FILES = frozenset(
    {
        "src/aictl/orchestrator.py",
        "src/aictl/sink.py",
        "src/aictl/storage.py",
        "src/aictl/dashboard/tui.py",
        "src/aictl/dashboard/web_server.py",
        "src/aictl/dashboard/html_report.py",
        "src/aictl/dashboard/api_handlers.py",
        "src/aictl/monitoring/**",
        "src/aictl/client.py",
        "src/aictl/memory.py",
        "src/aictl/platforms.py",
        "src/aictl/tools.py",
    }
)


def _parse_ruff_per_file_ignores() -> dict[str, list[str]]:
    """Return {glob: [rule,...]} from pyproject.toml's ruff per-file-ignores."""
    try:
        import tomllib  # Python 3.11+
    except ImportError:
        import tomli as tomllib  # type: ignore[no-redef]

    data = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    return data.get("tool", {}).get("ruff", {}).get("lint", {}).get("per-file-ignores", {})


def test_ble001_s110_ignore_list_does_not_grow():
    """Ratchet: the set of files allowed broad exception catches cannot expand silently.

    If you're adding a file here, first try narrowing the catches to specific
    types (OSError, json.JSONDecodeError, sqlite3.Error, etc.).  If the file
    genuinely belongs on the daemon layer, update
    EXPECTED_BLE_S110_IGNORED_FILES *and* add a one-line comment in
    pyproject.toml explaining WHY.
    """
    ignores = _parse_ruff_per_file_ignores()
    actual = {
        glob
        for glob, rules in ignores.items()
        if ("BLE001" in rules or "S110" in rules) and not glob.startswith("test/")
    }
    extras = actual - EXPECTED_BLE_S110_IGNORED_FILES
    assert not extras, (
        f"New files granted BLE001/S110 exemption without updating the ratchet:\n"
        f"  {sorted(extras)}\n"
        f"Narrow the catches first; only update EXPECTED_BLE_S110_IGNORED_FILES if truly daemon-layer."
    )
    # Also catch the inverse: entries removed from pyproject but still in the ratchet.
    # Missing entries are fine (means someone did narrowing work) — only warn in output.
    missing = EXPECTED_BLE_S110_IGNORED_FILES - actual
    if missing:
        # Not a hard failure — narrowing is always welcome — but surface it so
        # the ratchet stays truthful.  Update EXPECTED_BLE_S110_IGNORED_FILES
        # when you remove entries from pyproject.toml.
        import warnings

        warnings.warn(
            f"Ratchet out of date: these files no longer need BLE001/S110 exemption — "
            f"remove from EXPECTED_BLE_S110_IGNORED_FILES: {sorted(missing)}",
            stacklevel=1,
        )
