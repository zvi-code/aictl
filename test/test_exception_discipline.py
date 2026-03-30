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
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Files under test
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).parent.parent

# Command / utility layer: every broad exception here is suspect.
COMMAND_FILES = sorted(
    [
        *Path(REPO_ROOT / "aictl" / "commands").glob("*.py"),
        REPO_ROOT / "aictl" / "utils.py",
        REPO_ROOT / "aictl" / "guard.py",
    ]
)

# Daemon / monitoring layer: intentionally broad, excluded from checks.
EXCLUDED_PATTERNS = [
    "aictl/orchestrator.py",
    "aictl/sink.py",
    "aictl/storage.py",
    "aictl/store.py",
    "aictl/dashboard/tui.py",
    "aictl/dashboard/web_server.py",
    "aictl/dashboard/html_report.py",
    "aictl/dashboard/models.py",
    "aictl/monitoring/",
    "aictl/client.py",
    "aictl/discovery.py",
    "aictl/datapoint_provenance.py",
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

    assert not hits, (
        f"{path.relative_to(REPO_ROOT)} contains no-op exception swallows:\n"
        + "\n".join(f"  line {ln}: {snip}" for ln, snip in hits)
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
    return [
        (ln, snip)
        for ln, snip in visitor.violations
        if "# noqa" not in lines[ln - 1]
    ]


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
    from aictl.commands.otel import otel
    from click.testing import CliRunner

    monkeypatch.setattr("aictl.commands.otel._shell_profiles", lambda: [])
    monkeypatch.setenv("AICTL_PORT", "8484")

    # Inject a VS Code path that is a file (unwritable as a directory) to force FAILED
    bad_vscode = tmp_path / "bad"
    bad_vscode.write_text("I am a file, not a directory")
    monkeypatch.setattr("aictl.platforms.vscode_user_dir", lambda: bad_vscode)

    runner = CliRunner()
    result = runner.invoke(otel, ["enable", "--tool", "copilot"])
    assert result.exit_code != 0, (
        "otel enable must return non-zero exit code when an action fails"
    )


def test_enable_exits_1_on_partial_failure(tmp_path, monkeypatch):
    """aictl enable must exit 1 if any integration fails."""
    from aictl.commands.enable_cmd import enable
    from click.testing import CliRunner

    monkeypatch.setattr("aictl.commands.enable_cmd._shell_profiles", lambda: [])
    monkeypatch.setattr(
        "aictl.commands.enable_cmd.claude_global_dir", lambda: tmp_path / "claude"
    )
    monkeypatch.setenv("AICTL_PORT", "8484")

    # Force VS Code to fail
    bad_vscode = tmp_path / "bad_vscode_file"
    bad_vscode.write_text("not a directory")
    monkeypatch.setattr("aictl.commands.enable_cmd.vscode_user_dir", lambda: bad_vscode)
    monkeypatch.setattr("aictl.platforms.vscode_user_dir", lambda: bad_vscode)

    runner = CliRunner()
    result = runner.invoke(enable, ["--scope", "user"])
    assert result.exit_code != 0, (
        "enable must return non-zero exit code when any integration fails"
    )
