"""Fixtures for real-tool E2E tests.

Reuses the aictl server fixture from test/e2e/ and adds:
- Tool detection and skip markers
- Temporary project dirs with hooks pre-installed
- Tool runner helpers (subprocess wrappers)
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

# ── Server fixture is in test/conftest.py (auto-discovered) ───────
# Tool-specific fixtures below add project dirs with hooks installed.

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# ── Tool detection ────────────────────────────────────────────────

CLAUDE_BIN = shutil.which("claude")
GEMINI_BIN = shutil.which("gemini")
CODEX_BIN = shutil.which("codex")

requires_claude = pytest.mark.skipif(
    not CLAUDE_BIN, reason="claude CLI not installed"
)
requires_gemini = pytest.mark.skipif(
    not GEMINI_BIN, reason="gemini CLI not installed"
)
requires_codex = pytest.mark.skipif(
    not CODEX_BIN, reason="codex CLI not installed"
)


# ── Tool runner helpers (exposed as fixtures) ─────────────────────

def _run_claude(
    prompt: str,
    *,
    cwd: str | Path = ".",
    max_turns: int = 1,
    timeout: float = 60,
    env: dict | None = None,
) -> dict:
    """Run ``claude -p`` in non-interactive mode, return parsed JSON output."""
    cmd = [
        CLAUDE_BIN, "-p", prompt,
        "--max-turns", str(max_turns),
        "--output-format", "json",
    ]
    run_env = {**os.environ, **(env or {})}
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=timeout, cwd=str(cwd), env=run_env,
        )
        if result.stdout.strip():
            return json.loads(result.stdout.strip())
        return {
            "error": "no output",
            "returncode": result.returncode,
            "stderr": result.stderr[:500],
        }
    except subprocess.TimeoutExpired:
        return {"error": "timeout", "timeout": timeout}
    except json.JSONDecodeError:
        return {"error": "invalid json", "stdout": result.stdout[:500]}


def _run_gemini(
    prompt: str,
    *,
    cwd: str | Path = ".",
    timeout: float = 60,
    env: dict | None = None,
) -> dict:
    """Run ``gemini -p`` in non-interactive mode, return parsed JSON output."""
    cmd = [GEMINI_BIN, "-p", prompt, "-o", "json"]
    run_env = {**os.environ, **(env or {})}
    stdout = ""
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            input=prompt,
            timeout=timeout, cwd=str(cwd), env=run_env,
        )
        stdout = result.stdout.strip()
        if stdout:
            # Find the first '{' and parse only the first JSON object
            # (gemini may append trailing data after the main JSON)
            for line_start in range(len(stdout)):
                if stdout[line_start] == '{':
                    decoder = json.JSONDecoder()
                    obj, _ = decoder.raw_decode(stdout[line_start:])
                    return obj
            return {"error": "no json in output", "stdout": stdout[:500]}
        return {
            "error": "no output",
            "returncode": result.returncode,
            "stderr": result.stderr[:500],
        }
    except subprocess.TimeoutExpired:
        return {"error": "timeout", "timeout": timeout}
    except json.JSONDecodeError:
        return {"error": "invalid json", "stdout": stdout[:500]}


@pytest.fixture()
def run_claude():
    """Fixture providing the Claude runner callable."""
    return _run_claude


@pytest.fixture()
def run_gemini():
    """Fixture providing the Gemini runner callable."""
    return _run_gemini


# ── Project fixture with hooks installed ──────────────────────────

def _install_claude_hooks(project_dir: Path, port: int) -> None:
    """Write Claude hook config directly into project settings."""
    settings_dir = project_dir / ".claude"
    settings_dir.mkdir(parents=True, exist_ok=True)
    settings_path = settings_dir / "settings.local.json"

    from aictl.commands.integrations import _build_hook_config
    hook_config = _build_hook_config(port, None)

    settings = {"hooks": hook_config}
    settings_path.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")


def _install_gemini_hooks(project_dir: Path, port: int) -> None:
    """Write Gemini hook config directly into project settings."""
    settings_dir = project_dir / ".gemini"
    settings_dir.mkdir(parents=True, exist_ok=True)
    settings_path = settings_dir / "settings.json"

    from aictl.commands.integrations import (
        _build_hook_config,
        HOOK_EVENTS,
        GEMINI_HOOK_MAP,
    )
    gemini_events = [e for e in HOOK_EVENTS if e in GEMINI_HOOK_MAP]
    hook_config = _build_hook_config(port, gemini_events, event_map=GEMINI_HOOK_MAP, matcher="*")

    settings = {"hooks": hook_config}
    settings_path.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")


@pytest.fixture()
def claude_project(aictl_server, tmp_path) -> Path:
    """Temp project dir with Claude hooks pointing at the test server."""
    project = tmp_path / "claude_project"
    project.mkdir()
    # Minimal project files
    (project / "README.md").write_text("# Test project for Claude E2E\n")
    (project / "hello.py").write_text("print('hello')\n")
    _install_claude_hooks(project, aictl_server.port)
    return project


@pytest.fixture()
def gemini_project(aictl_server, tmp_path) -> Path:
    """Temp project dir with Gemini hooks pointing at the test server."""
    project = tmp_path / "gemini_project"
    project.mkdir()
    (project / "README.md").write_text("# Test project for Gemini E2E\n")
    (project / "hello.py").write_text("print('hello')\n")
    # Init as git repo (gemini may need it)
    subprocess.run(["git", "init"], cwd=str(project), capture_output=True)
    subprocess.run(["git", "add", "."], cwd=str(project), capture_output=True)
    subprocess.run(
        ["git", "commit", "-m", "init", "--allow-empty"],
        cwd=str(project), capture_output=True,
        env={**os.environ, "GIT_AUTHOR_NAME": "test", "GIT_AUTHOR_EMAIL": "t@t",
             "GIT_COMMITTER_NAME": "test", "GIT_COMMITTER_EMAIL": "t@t"},
    )
    _install_gemini_hooks(project, aictl_server.port)
    return project
