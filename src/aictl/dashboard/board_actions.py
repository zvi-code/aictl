"""Validate and execute local dashboard actions."""

from __future__ import annotations

import logging
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from ..records import EventRow
from .projection_utils import _names_another_machine, mask_secrets

logger = logging.getLogger(__name__)


ACTION_TIMEOUT_S = 120


_CLI_ENTRY = "from aictl.cli import main; main()"


def _run_cli(*args: str) -> dict:
    """Run one aictl command in a child process, the same code the terminal runs."""
    done = subprocess.run(
        [sys.executable, "-c", _CLI_ENTRY, *args],
        capture_output=True,
        text=True,
        timeout=ACTION_TIMEOUT_S,
        check=False,
    )
    return {"ok": done.returncode == 0, "exit_code": done.returncode, "output": mask_secrets((done.stdout + done.stderr)[-4000:])}


def _action_hooks_repair(_db: Any, _root: Any, _args: dict, _port: int | None) -> dict:
    return _run_cli("hooks", "repair")


def _action_otel_enable(_db: Any, _root: Any, _args: dict, port: int | None) -> dict:
    return _run_cli("otel", "enable", *(("--port", str(port)) if port else ()))


def _action_baseline_update(_db: Any, root: Any, args: dict, _port: int | None) -> dict:
    from ..context_audit import run_audit

    wanted = str(args.get("project") or "")
    project = wanted if wanted and not _names_another_machine(wanted) and Path(wanted).is_dir() else root
    report = run_audit(project, args.get("tool") or None, update_baseline=True)
    return {"ok": True, "baseline_updated": bool(report.get("baseline_updated", True))}


def _action_db_compact(_db: Any, _root: Any, _args: dict, _port: int | None) -> dict:
    return {"ok": False, "error": "Kusto retention policies replace local compaction."}


def _action_ctx_deploy(_db: Any, root: Any, _args: dict, _port: int | None) -> dict:
    return _run_cli("ctx", "deploy", "-r", str(root))


_ACTIONS = {
    "ctx-deploy": _action_ctx_deploy,
    "hooks-repair": _action_hooks_repair,
    "otel-enable": _action_otel_enable,
    "baseline-update": _action_baseline_update,
    "db-compact": _action_db_compact,
}


def run_action(db: Any, root: Any, data: Any, port: int | None = None) -> tuple[int, dict]:
    """``POST /api/board/action``. A request must carry ``confirm: true``."""
    if not isinstance(data, dict):
        return 400, {"error": "Request body must be a JSON object"}
    action = str(data.get("action") or "")
    if action not in _ACTIONS:
        return 400, {"error": "action must be one of " + ", ".join(sorted(_ACTIONS))}
    if data.get("confirm") is not True:
        return 400, {"error": f"{action} requires confirm:true"}
    args = data.get("args") if isinstance(data.get("args"), dict) else {}
    try:
        result = _ACTIONS[action](db, root, args, port)
    except subprocess.TimeoutExpired:
        return 504, {"action": action, "ok": False, "error": "The command did not finish in time"}
    if facts := getattr(db, "session_facts", None):
        try:
            facts.events(
                [EventRow(ts=time.time(), tool="aictl", kind=f"action:{action.replace('-', '_')}",
                          detail={"ok": result.get("ok")})], source="dashboard"
            )
        except Exception:  # noqa: BLE001 - audit logging must not block the action
            logger.debug("Could not record board action %s", action, exc_info=True)
    status = 200 if result.get("ok") else 400 if action == "db-compact" else 500
    return status, {"action": action, **result}
