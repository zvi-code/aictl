# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Effective configuration: which settings are in force, and where each comes from.

Copilot model resolution, as far as it could be confirmed:

* CLI reference: custom agent ``model`` > ``--model`` > ``COPILOT_MODEL`` >
  ``model`` in ``settings.json`` > the CLI default.
* Config directory reference: built-in < MDM < user < repository < local <
  environment < flags, for settings in general. The model reference names the
  user file only, and the installed CLI's startup resolver reads the user file,
  so a ``model`` key in a repository settings file is marked unverified.
* ``subagents.agents.<name>.model`` is read from the settings file by the CLI.
  ``planModel`` has no reader in the CLI package, so it is marked unverified.
* VS Code: an agent's or prompt file's ``model`` replaces the picker. For a
  subagent: the explicit tool parameter > the agent's ``model`` > Auto > the
  main conversation's model. The picker's choice is not in a settings file.
* No local file was found that records an organization's model allow-list. Such
  a restriction shows only as an error in session logs.

Everything here is read-only and nothing found is ever run. Session logs are read
for model names and error categories only, and prompt text is never kept.
"""

from __future__ import annotations

import contextlib
import csv
import glob
import json
import ntpath
import os
import re
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .context_audit import (
    COPILOT_SESSIONS_SCANNED,
    Finding,
    _copilot_home,
    _file_facts,
    _path_key,
    _persistent_env,
    _read_json,
    _read_text,
    _redact,
    _registry_values,
)
from .data.model_pricing import MODEL_PRICING, normalize_model_id, resolve_pricing
from .platforms import IS_WINDOWS, vscode_insiders_user_dir, vscode_user_dir

COPILOT_TOOLS = ("copilot-cli", "copilot-desktop", "copilot-vscode")
MAX_FRONTMATTER_LINES = 200
MAX_MODEL_FILES = 300
MAX_SESSION_BYTES = 8_000_000
MAX_EVENT_LINE = 256_000
MAX_RAN_DIFFERENTLY = 5

_NOT_A_PIN = {"", "auto", "inherit", "default"}
_FAMILY_WORDS = {key.split("-")[1] for key in MODEL_PRICING if key.startswith("claude-")}
_SECRET_KEY_RE = re.compile(r"token|secret|password|passwd|credential|cookie|api.?key|auth(?!or)", re.I)

_REPO_UNVERIFIED = (
    "GitHub Copilot CLI config directory reference: the settings table lists model as repo-overridable, "
    "repository replaces user, and local replaces repository."
)
_DESKTOP_UNVERIFIED = "No published order for the desktop app. It shares this directory with the CLI, so the CLI order is assumed."


def _in_project(path: str, project: Path) -> bool:
    """True when ``path`` is inside ``project``. Case rules follow the platform's path keys."""
    key, root = _path_key(path), _path_key(project)
    sep = "\\" if "\\" in root else "/"
    return key == root or key.startswith(root.rstrip(sep) + sep)


def why_in_effect(tool: str, scope: str, in_project: bool, path: str = "") -> str:
    """Say plainly why a source applies here."""
    if in_project:
        return "In this project."
    if scope in ("flag",):
        return "Passed on the command line of a running process."
    if scope == "env":
        return f"Not in this project, still in effect: an environment variable that {tool} reads at start."
    if scope in ("machine-policy", "managed"):
        return f"Not in this project, still in effect: machine policy at {path}, applied to every project on this machine."
    if scope == "parent-dir":
        return f"Not in this project, still in effect: {tool} walks up the parent directories and reads {path}."
    if scope in ("plugin", "memory", "dynamic"):
        return f"Not in this project, still in effect: {scope} content that {tool} loads at run time."
    return f"Not in this project, still in effect: {tool} reads {path} for every project (scope {scope})."


# ─── Model names ──────────────────────────────────────────────────


def canonical_model(value: str) -> str:
    """Reduce an id or a display name such as ``Claude Sonnet 5 (preview)`` to one comparable id."""
    text = re.sub(r"\(.*$", "", str(value or "")).strip()
    if " " in text:
        text = re.sub(r"\s+", "-", text)
    return normalize_model_id(text)


def same_model(a: str, b: str) -> bool:
    left, right = canonical_model(a), canonical_model(b)
    if left == right:
        return True
    for word, other in ((left, right), (right, left)):
        if word in _FAMILY_WORDS and word in other.split("-"):
            return True
    return False


def is_pin(value: str) -> bool:
    return canonical_model(value) not in _NOT_A_PIN


# ─── Frontmatter and instruction text ─────────────────────────────


def _scalar(raw: str) -> str:
    text = raw.strip()
    if text[:1] in "\"'":
        end = text.find(text[0], 1)
        return text[1:end] if end > 0 else text[1:]
    return text.split(" #", 1)[0].strip()


def frontmatter_model(text: str) -> tuple[list[str], int]:
    """``model:`` from YAML frontmatter, as a scalar, an inline list or a block list, with its line."""
    lines = text.lstrip("﻿").splitlines()
    if not lines or lines[0].strip() != "---":
        return [], 0
    for index, line in enumerate(lines[1:MAX_FRONTMATTER_LINES], start=2):
        if line.strip() == "---":
            return [], 0
        match = re.match(r"model\s*:(.*)$", line)
        if not match:
            continue
        rest = match.group(1).strip()
        if rest.startswith("["):
            return [v for v in (_scalar(p) for p in rest.strip("[]").split(",")) if v], index
        if rest and not rest.startswith("#"):
            return [_scalar(rest)], index
        values = []
        for item in lines[index : MAX_FRONTMATTER_LINES]:
            block = re.match(r"\s*-\s+(.+)$", item)
            if not block:
                break
            values.append(_scalar(block.group(1)))
        return values, index
    return [], 0


_MODEL_TOKEN = r"(?:claude-[\w.-]*\d[\w.-]*|gpt-[\w.-]*\d[\w.-]*|o[134](?:-[\w.-]+)?|gemini-[\w.-]*\d[\w.-]*)"
_REQUEST_RES = (
    re.compile(rf"--model[= ]+[\"'`]?({_MODEL_TOKEN})", re.I),
    re.compile(
        rf"\b(?:use|using|run with|runs with|run on|runs on|switch to|must use|requires?|set the model to|model\s*[:=])"
        rf"\s+(?:the\s+)?(?:model\s+)?[\"'`*]*({_MODEL_TOKEN})",
        re.I,
    ),
)
_NEGATED_RE = re.compile(r"\b(not|never|don'?t|avoid|instead of|rather than|except|unless|e\.g\.|for example|such as|retired|deprecated)\b", re.I)


def instruction_requests(text: str) -> list[tuple[str, int]]:
    """Models that instruction text asks for, such as ``use model X`` or ``--model X``, with lines."""
    out: list[tuple[str, int]] = []
    for number, line in enumerate(text.splitlines(), start=1):
        for regex in _REQUEST_RES:
            for match in regex.finditer(line):
                if not _NEGATED_RE.search(line[max(0, match.start() - 50) : match.start()]):
                    out.append((match.group(1).rstrip(".,;:)`'\"*-"), number))
    return out


# ─── Sources of a model ───────────────────────────────────────────


@dataclass
class ModelPin:
    tool: str
    setting: str
    value: str
    scope: str  # flag | env | repo-local | repo | user | machine-policy | vscode-* | *-frontmatter | instruction
    path: str
    line: int = 0
    rank: int = 99
    in_project: bool = False
    why_in_effect: str = ""
    verified: bool = True
    basis: str = ""
    applies: str = "session"  # session, or the agent, prompt or setting it is limited to
    values: list[str] = field(default_factory=list)


def _key_line(text: str, key: str, after: int = 0) -> int:
    """The line of ``key``: the first one after line ``after``, or else the least indented."""
    pattern = re.compile(rf"[\"']{re.escape(key)}[\"']\s*:")
    hits = [(len(line) - len(line.lstrip()), number) for number, line in enumerate(text.splitlines(), start=1) if number > after and pattern.search(line)]
    if not hits:
        return 0
    return hits[0][1] if after else min(hits)[1]


def _settings_pins(tool: str, project: Path, path: Path, scope: str, rank: int, *, verified: bool = True, basis: str = "") -> tuple[list[ModelPin], list[ModelPin]]:
    """The session pin and the per-agent pins in one Copilot settings file."""
    if not path.is_file():
        return [], []
    data = _read_json(path)
    text = _read_text(path)
    inside = _in_project(str(path), project)
    why = why_in_effect(tool, scope, inside, str(path))
    session: list[ModelPin] = []
    limited: list[ModelPin] = []
    if isinstance(data.get("model"), str) and data["model"]:
        session.append(ModelPin(tool, "model", data["model"], scope, str(path), _key_line(text, "model"), rank, inside, why, verified, basis))
    if isinstance(data.get("planModel"), str) and data["planModel"]:
        limited.append(ModelPin(tool, "planModel", data["planModel"], scope, str(path), _key_line(text, "planModel"), rank, inside, why, False, "Set in the file. The CLI package has no reader for this key.", "plan mode"))
    agents = (data.get("subagents") or {}).get("agents") if isinstance(data.get("subagents"), dict) else None
    if isinstance(agents, dict):
        for name, cfg in agents.items():
            if isinstance(cfg, dict) and isinstance(cfg.get("model"), str) and cfg["model"]:
                line = _key_line(text, "model", _key_line(text, str(name)))
                limited.append(ModelPin(tool, f"subagents.agents.{name}.model", cfg["model"], scope, str(path), line, rank, inside, why, verified, basis, f"subagent:{name}"))
    return session, limited


def _copilot_process_models(ps_output: str | None, project: Path) -> list[tuple[str, str]]:
    """``(pid, model)`` for ``copilot --model X`` in live command lines, limited to this project when live."""
    lines: list[tuple[str, str]] = []
    if ps_output is not None:
        for raw in ps_output.splitlines():
            pid, _, command = raw.strip().partition(" ")
            lines.append((pid, command))
    else:
        with contextlib.suppress(ImportError):
            import psutil

            for process in psutil.process_iter(["pid", "cmdline", "cwd"]):
                command, cwd = process.info.get("cmdline"), process.info.get("cwd")
                if command and cwd and _in_project(cwd, project):
                    lines.append((str(process.info["pid"]), " ".join(command)))
    out = []
    for pid, command in lines:
        words = command.split()
        heads = [re.split(r"[\\/]", w)[-1].lower() for w in words[:2]]
        if not any(h in ("copilot", "copilot.exe", "copilot.cmd", "npm-loader.js") for h in heads):
            continue
        match = re.search(r"(?:^|\s)--model(?:=|\s+)[\"']?([^\s\"']+)", command)
        if match:
            out.append((pid, match.group(1)))
    return out


def _env_pins(tool: str, env: dict[str, str]) -> list[ModelPin]:
    pins = []
    if env.get("COPILOT_MODEL"):
        pins.append(ModelPin(tool, "COPILOT_MODEL", env["COPILOT_MODEL"], "env", "env:COPILOT_MODEL", 0, 20, False, why_in_effect(tool, "env", False)))
    for origin, values in _persistent_env([]).items():
        if values.get("COPILOT_MODEL"):
            pins.append(ModelPin(tool, "COPILOT_MODEL", values["COPILOT_MODEL"], "env", origin, 0, 21, False, why_in_effect(tool, "env", False), True, "Set for new shells by this profile or registry key."))
    return pins


def _glob_files(patterns: list[str]) -> list[str]:
    from .context_audit import _bounded_glob

    out: list[str] = []
    for pattern in patterns:
        out.extend(sorted(_bounded_glob(pattern)))
    return out[:MAX_MODEL_FILES]


def _vscode_user_trees(env: dict[str, str]) -> list[Path]:
    trees = [vscode_user_dir(), vscode_insiders_user_dir()]
    if IS_WINDOWS:
        trees += [Path(row["expanded"]).parents[0] for row in windows_locations(env) if row["id"].endswith("msix-vscode-settings") or row["id"] == "vscode-portable-settings"]
    return trees


def _conditional_files(tool: str, project: Path, env: dict[str, str]) -> list[tuple[str, str, str]]:
    """``(path, kind, scope)`` for agent, prompt and chat mode files that this tool can read."""
    home = _copilot_home(env)
    groups: list[tuple[list[str], str, str]] = [
        ([str(project / ".github" / "agents" / "*.md")], "agent-frontmatter", "repo"),
        ([str(home / "agents" / "*.md")], "agent-frontmatter", "user"),
    ]
    if tool == "copilot-vscode":
        groups += [
            ([str(project / ".claude" / "agents" / "*.md")], "agent-frontmatter", "repo"),
            ([str(Path.home() / ".claude" / "agents" / "*.md")], "agent-frontmatter", "user"),
            ([str(project / ".github" / "prompts" / "*.prompt.md")], "prompt-frontmatter", "repo"),
            ([str(project / ".github" / "chatmodes" / "*.chatmode.md")], "chatmode-frontmatter", "repo"),
        ]
        for tree in _vscode_user_trees(env):
            groups += [
                ([str(tree / "prompts" / "*.prompt.md")], "prompt-frontmatter", "user"),
                ([str(tree / "prompts" / "*.agent.md")], "agent-frontmatter", "user"),
                ([str(tree / "globalStorage" / "github.copilot-chat" / "*-agent" / "*.agent.md")], "agent-frontmatter", "user"),
            ]
    rows = []
    for patterns, kind, scope in groups:
        rows += [(path, kind, scope) for path in _glob_files(patterns)]
    return rows


def _instruction_files(project: Path, env: dict[str, str]) -> list[str]:
    return _glob_files(
        [
            str(project / "AGENTS.md"),
            str(project / "CLAUDE.md"),
            str(project / ".github" / "copilot-instructions.md"),
            str(project / ".github" / "instructions" / "**" / "*.instructions.md"),
            str(_copilot_home(env) / "copilot-instructions.md"),
            str(_copilot_home(env) / "instructions" / "**" / "*.instructions.md"),
        ]
    )


_VSCODE_MODEL_KEY_RE = re.compile(r"^(chat|inlineChat|github\.copilot)\b.*model", re.I)


def _vscode_setting_pins(project: Path, env: dict[str, str]) -> tuple[list[ModelPin], list[dict]]:
    """Model settings in VS Code, by key. Workspace beats profile beats user, and policy beats them all."""
    tool = "copilot-vscode"
    files: list[tuple[Path, str, int, str]] = [(project / ".vscode" / "settings.json", "vscode-workspace", 30, "session")]
    for tree in _vscode_user_trees(env):
        files.append((tree / "settings.json", "vscode-user", 40, "session"))
        for profile in sorted(glob.glob(str(tree / "profiles" / "*" / "settings.json"))):
            files.append((Path(profile), "vscode-profile", 35, f"profile:{Path(profile).parent.name}"))
    pins = []
    for path, scope, rank, applies in files:
        if not path.is_file():
            continue
        text = _read_text(path)
        inside = _in_project(str(path), project)
        for key, value in _read_json(path).items():
            if isinstance(value, str) and value and _VSCODE_MODEL_KEY_RE.search(key):
                pins.append(ModelPin(tool, key, value, scope, str(path), _key_line(text, key), rank, inside, why_in_effect(tool, scope, inside, str(path)), True, "VS Code settings order: workspace, profile, user.", key.rsplit(".", 1)[0] if applies == "session" else applies))
    restrictions = []
    for hive in ("HKEY_LOCAL_MACHINE", "HKEY_CURRENT_USER"):
        for key, value in _registry_values(hive, r"SOFTWARE\Policies\Microsoft\VSCode").items():
            if re.search(r"model|copilot|chat", key, re.I):
                where = f"registry:{hive}\\SOFTWARE\\Policies\\Microsoft\\VSCode\\{key}"
                restrictions.append({"tool": tool, "name": key, "value": _redact(str(value))[:120], "path": where, "scope": "machine-policy", "why_in_effect": why_in_effect(tool, "machine-policy", False, where)})
    for path in ("/Library/Managed Preferences/com.microsoft.VSCode.plist", "/etc/vscode/policy.json"):
        if Path(path).is_file():
            restrictions.append({"tool": tool, "name": "policy file", "value": "present", "path": path, "scope": "machine-policy", "why_in_effect": why_in_effect(tool, "machine-policy", False, path)})
    return pins, restrictions


_PICKER_KEY_PREFIX = "chat.currentLanguageModel."
_PICKER_BASIS = "Key names and values seen in a VS Code state.vscdb. Not documented, so a later VS Code can rename them."


def _picker_rows(db: Path, scope: str) -> tuple[list[dict], str]:
    """The picker's choice per chat location in one ``state.vscdb``, and its state.

    Only ``chat.currentLanguageModel.*`` keys are queried; ``secret://`` keys are never touched.
    State is ``ok``, ``absent`` (no file) or ``not readable`` (corrupt, locked or not a VS Code database).
    """
    if not db.is_file():
        return [], "absent"
    conn = None
    try:
        from .ingesters._common import open_readonly

        conn = open_readonly(db, "effective-model")
        if conn is None:
            return [], "not readable"
        raw = conn.execute("SELECT key, value FROM ItemTable WHERE key LIKE ? AND key NOT LIKE 'secret://%'", (_PICKER_KEY_PREFIX + "%",)).fetchall()
    except Exception:  # sqlite3.Error, but also a bad row type; a locked or corrupt file must never raise
        return [], "not readable"
    finally:
        if conn is not None:
            with contextlib.suppress(Exception):
                conn.close()
    values = {k: (v.decode("utf-8", "replace") if isinstance(v, bytes) else str(v)) for k, v in raw}
    rows = []
    for key, value in sorted(values.items()):
        location = key[len(_PICKER_KEY_PREFIX):]
        if location.endswith(".isDefault") or not value:
            continue
        vendor, _, model = value.partition("/")
        rows.append({"location": location, "value": model or value, "vendor": vendor if model else "", "key": key, "path": str(db), "scope": scope, "is_default": values.get(key + ".isDefault") == "true", "basis": _PICKER_BASIS})
    return rows, "ok"


def _vscode_picker(project: Path, env: dict[str, str]) -> tuple[list[dict], list[str]]:
    """What the model picker selects, global and for this project's workspace. Not a pinned setting."""
    from urllib.parse import unquote, urlparse

    rows: list[dict] = []
    notes: list[str] = []
    for tree in _vscode_user_trees(env):
        db = tree / "globalStorage" / "state.vscdb"
        found, state = _picker_rows(db, "global")
        rows += found
        if state == "not readable":
            notes.append(f"{db} is not readable.")
        for meta in sorted(glob.glob(str(tree / "workspaceStorage" / "*" / "workspace.json"))):
            folder = _read_json(Path(meta)).get("folder")
            if not isinstance(folder, str) or not folder.startswith("file://"):
                continue
            target = unquote(urlparse(folder).path)
            if IS_WINDOWS:
                target = target.lstrip("/")
            if Path(target).resolve() != project:
                continue
            wdb = Path(meta).parent / "state.vscdb"
            found, state = _picker_rows(wdb, "workspace")
            rows += found
            if state == "not readable":
                notes.append(f"{wdb} is not readable.")
    return rows, notes


def _vscode_custom_models(env: dict[str, str]) -> list[dict]:
    """Providers and models in ``chatLanguageModels.json``: models that can be selected or added. Names only."""
    out = []
    for tree in _vscode_user_trees(env):
        path = tree / "chatLanguageModels.json"
        if not path.is_file():
            continue
        try:
            data = json.loads(_read_text(path))
        except ValueError:
            continue
        for entry in data if isinstance(data, list) else []:
            if not isinstance(entry, dict):
                continue
            ids = list(entry["settings"]) if isinstance(entry.get("settings"), dict) else []
            if isinstance(entry.get("models"), list):
                ids += [m.get("id") or m.get("name") for m in entry["models"] if isinstance(m, dict)]
            out.append({"provider": str(entry.get("name", "")), "vendor": str(entry.get("vendor", "")), "models": [str(i) for i in ids if i], "path": str(path)})
    return out


# ─── Session logs ─────────────────────────────────────────────────

# The wording comes from the Copilot CLI package: 'Model "x" is not available.',
# "No model available. Check policy enablement ...", and 'model "x" is not
# available; will use current model instead'. "Model 'x' not found" with status
# 404 was seen in a session log. The other phrases are a guess at what a service returns.
_MODEL_ERROR_RE = re.compile(r"\bmodels?\b|model_", re.I)
_ERROR_SHAPES = (
    ("not-allowed", re.compile(r"not allowed|not enabled|policy|forbidden|not authori[sz]ed|access denied", re.I)),
    ("unsupported", re.compile(r"not supported|unsupported", re.I)),
    ("not-available", re.compile(r"not available|unavailable|no model|not found|unknown model|invalid model|model_not", re.I)),
)
_NOT_MODEL_ERROR_RE = re.compile(r"\b(image|vision|reasoning effort|attachment|context limit|tool '|rate.?limit)\b", re.I)
_MODEL_IN_ERROR_RE = re.compile(r"\bmodel\s+[\"'`]([^\"'`\s]{1,80})[\"'`]", re.I)
_ERROR_EVENTS = {"session.error": "message", "subagent.failed": "error", "session.warning": "message", "session.info": "message"}
_AUTO_SWITCH_RE = re.compile(r"auto|fallback|rate|quota|policy|limit|retry|unavailable", re.I)


def classify_model_error(message: str) -> str:
    """The error category for a model failure, or empty. The message itself is never kept."""
    if not _MODEL_ERROR_RE.search(message) or _NOT_MODEL_ERROR_RE.search(message):
        return ""
    return next((name for name, regex in _ERROR_SHAPES if regex.search(message)), "")


@dataclass
class SessionFacts:
    session_id: str
    path: str
    cwd: str = ""
    git_root: str = ""
    started: str = ""
    selected: str = ""
    errors: list[dict] = field(default_factory=list)
    mismatches: dict[tuple[str, str], int] = field(default_factory=dict)
    switches: list[dict] = field(default_factory=list)
    subagent_requests: list[dict] = field(default_factory=list)
    fusion: bool = False


def read_session(events: Path) -> SessionFacts:
    """Model facts from one ``events.jsonl``. It reads named fields of named events and never prompt text."""
    facts = SessionFacts(session_id=events.parent.name, path=str(events))
    requested = ""
    task_models: dict[str, str] = {}
    seen = 0
    with open(events, "rb") as handle:
        for raw in handle:
            seen += len(raw)
            if seen > MAX_SESSION_BYTES:
                break
            if len(raw) > MAX_EVENT_LINE:
                continue
            try:
                record = json.loads(raw)
            except ValueError:
                continue
            kind, data = record.get("type"), record.get("data")
            if not isinstance(data, dict):
                continue
            if kind in ("session.start", "session.resume"):
                ctx = data.get("context") if isinstance(data.get("context"), dict) else {}
                facts.cwd = str(ctx.get("cwd") or facts.cwd)
                facts.git_root = str(ctx.get("gitRoot") or facts.git_root)
                facts.started = str(record.get("timestamp") or facts.started)
                if data.get("selectedModel"):
                    requested = facts.selected = str(data["selectedModel"])
            elif kind == "session.model_change":
                previous, new = str(data.get("previousModel") or ""), str(data.get("newModel") or "")
                cause = str(data.get("cause") or "")
                if new:
                    requested = new
                if previous and new and not same_model(previous, new):
                    facts.switches.append({"previous": previous, "new": new, "cause": cause[:40]})
            elif kind == "assistant.message":
                ran = str(data.get("model") or "")
                if ran and requested and not data.get("parentToolCallId") and is_pin(requested) and not same_model(requested, ran):
                    key = (requested, ran)
                    facts.mismatches[key] = facts.mismatches.get(key, 0) + 1
            elif isinstance(kind, str) and kind.startswith("session.fusion"):
                facts.fusion = True
            elif kind == "tool.execution_start" and isinstance(data.get("arguments"), dict) and data["arguments"].get("model"):
                task_models[str(data.get("toolCallId") or "")] = str(data["arguments"]["model"])
            elif kind == "subagent.started":
                name = str(data.get("agentName") or "")
                asked = task_models.get(str(data.get("toolCallId") or ""), "")
                facts.subagent_requests.append({"agent": name, "requested": asked, "ran": str(data.get("model") or "")})
            field_name = _ERROR_EVENTS.get(str(kind))
            if field_name:
                message = str(data.get(field_name) or "")
                category = classify_model_error(message)
                if category:
                    named = _MODEL_IN_ERROR_RE.search(message)
                    facts.errors.append(
                        {
                            "category": category,
                            "requested": (named.group(1) if named else str(data.get("model") or requested))[:80],
                            "error_type": str(data.get("errorType") or kind)[:40],
                            "status": data.get("statusCode") if isinstance(data.get("statusCode"), int) else None,
                        }
                    )
    return facts


def read_sessions(env: dict[str, str], project: Path) -> list[SessionFacts]:
    """The newest sessions that ran in this project, bounded by file count and bytes."""
    base = _copilot_home(env) / "session-state"
    if not base.is_dir():
        return []
    candidates = []
    with os.scandir(base) as entries:
        for entry in entries:
            events = Path(entry.path) / "events.jsonl"
            with contextlib.suppress(OSError):
                candidates.append((events.stat().st_mtime, events))
    candidates.sort(reverse=True)
    out = []
    for _mtime, events in candidates[:COPILOT_SESSIONS_SCANNED]:
        with contextlib.suppress(OSError):
            facts = read_session(events)
            if (facts.cwd and _in_project(facts.cwd, project)) or (facts.git_root and _in_project(facts.git_root, project)):
                out.append(facts)
    return out


# ─── Effective model ──────────────────────────────────────────────


def _pin_row(pin: ModelPin) -> dict:
    return asdict(pin)


def _models_in(path: str) -> dict:
    """Model facts for one file, through the audit's cache, so an unchanged file is not read again."""
    facts = _file_facts(Path(path), config=False)
    return (facts or {}).get("text_models") or {"frontmatter": [], "line": 0, "requests": []}


def _collect_model(tool: str, project: Path, env: dict[str, str], ps_output: str | None) -> dict:
    home = _copilot_home(env)
    session: list[ModelPin] = []
    limited: list[ModelPin] = []
    restrictions: list[dict] = []
    unverified: list[str] = []
    extra: dict = {}
    if tool == "copilot-vscode":
        settings, restrictions = _vscode_setting_pins(project, env)
        limited.extend(settings)
        picker, picker_notes = _vscode_picker(project, env)
        extra["picker"] = picker
        extra["custom_models"] = _vscode_custom_models(env)
        extra["picker_notes"] = picker_notes
        if not picker:
            unverified.append("The model picker's choice was not found in VS Code state, so it is not shown.")
        unverified.append("Picker keys come from the state.vscdb of one installed VS Code. They are not documented.")
    else:
        desktop = tool == "copilot-desktop"
        if not desktop:
            for pid, model in _copilot_process_models(ps_output, project):
                session.append(ModelPin(tool, "--model", model, "flag", f"process:{pid}", 0, 10, False, why_in_effect(tool, "flag", False)))
            session.extend(_env_pins(tool, env))
        for rel, scope, rank in ((".github/copilot/settings.local.json", "repo-local", 30), (".github/copilot/settings.json", "repo", 31)):
            found, per_agent = _settings_pins(tool, project, project / rel, scope, rank, verified=True, basis=_REPO_UNVERIFIED)
            session.extend(found)
            limited.extend(per_agent)
        found, per_agent = _settings_pins(tool, project, home / "settings.json", "user", 40, verified=not desktop, basis=_DESKTOP_UNVERIFIED if desktop else "CLI model reference.")
        session.extend(found)
        limited.extend(per_agent)
        unverified.append("MDM managed settings are a documented baseline below user settings. The documented files are managed-settings.json under /Library/Application Support/GitHubCopilot, %ProgramFiles%\\GitHubCopilot and /etc/github-copilot. They are not read. planModel is in no reference.")
    unverified.append("An organization's model allow-list is held by the service. It shows here only as an error in session logs.")

    requests: list[dict] = []
    for path, kind, scope in _conditional_files(tool, project, env):
        facts = _models_in(path)
        values, line = facts["frontmatter"], facts["line"]
        inside = _in_project(path, project)
        name = Path(path).name.split(".")[0]
        if values:
            limited.append(ModelPin(tool, "model", values[0], kind, path, line, 5, inside, why_in_effect(tool, scope, inside, path), True, "Custom agent and prompt file references.", f"{kind.split('-')[0]}:{name}", values))
            requests.append({"kind": kind, "name": name, "value": values[0], "values": values, "path": path, "line": line, "in_project": inside})
        for value, number in facts["requests"]:
            requests.append({"kind": "instruction", "name": name, "value": value, "values": [value], "path": path, "line": number, "in_project": inside})
    for path in _instruction_files(project, env):
        inside = _in_project(path, project)
        for value, number in _models_in(path)["requests"]:
            requests.append({"kind": "instruction", "name": Path(path).name, "value": value, "values": [value], "path": path, "line": number, "in_project": inside})

    session.sort(key=lambda p: p.rank)
    return {"session": session, "limited": limited, "requests": requests, "restrictions": restrictions, "unverified": unverified, **extra}


def _overrides_of(winner: ModelPin | None, others: list[ModelPin]) -> list[dict]:
    if winner is None:
        return []
    return [{"value": p.value, "scope": p.scope, "path": p.path, "line": p.line, "setting": p.setting} for p in others]


def effective_model(project: str | Path | None = None, tool: str = "copilot-cli", *, env: dict[str, str] | None = None, ps_output: str | None = None) -> dict:
    """The model in force for ``tool`` in ``project``, where it comes from, and what it overrides.

    ``value`` is empty when no file or variable pins a model. Then the tool's own
    default or, in VS Code, the picker decides. Read-only.
    """
    root = Path(project).expanduser().resolve() if project else Path.cwd().resolve()
    env = dict(os.environ) if env is None else env
    found = _collect_model(tool, root, env, ps_output)
    session: list[ModelPin] = found["session"]
    winner = session[0] if session else None
    conflicts = []
    if winner and is_pin(winner.value):
        for request in found["requests"]:
            if not any(same_model(v, winner.value) for v in request["values"]):
                conflicts.append({"request": request, "pin": _pin_row(winner)})
    return {
        "tool": tool,
        "project": str(root),
        "value": winner.value if winner else "",
        "canonical": canonical_model(winner.value) if winner else "",
        "setting": winner.setting if winner else "",
        "source": winner.path if winner else "",
        "line": winner.line if winner else 0,
        "scope": winner.scope if winner else "",
        "in_project": winner.in_project if winner else False,
        "why_in_effect": winner.why_in_effect if winner else "No file or variable pins a model, so the tool's own default or picker decides.",
        "verified": winner.verified if winner else True,
        "basis": winner.basis if winner else "",
        "overrides": _overrides_of(winner, session[1:]),
        "candidates": [_pin_row(p) for p in session],
        "limited": [_pin_row(p) for p in found["limited"]],
        "requests": found["requests"],
        "conflicts": conflicts,
        "restrictions": found["restrictions"],
        "unverified": found["unverified"],
        "picker": found.get("picker", []),
        "picker_notes": found.get("picker_notes", []),
        "custom_models": found.get("custom_models", []),
    }


def model_summary(project: str | Path | None = None, tool: str = "copilot-cli", *, env: dict[str, str] | None = None) -> dict:
    """The fields a one-line display needs from ``effective_model``."""
    eff = effective_model(project, tool, env=env)
    return {
        "tool": tool,
        "value": eff["value"],
        "source": eff["source"],
        "line": eff["line"],
        "scope": eff["scope"],
        "in_project": eff["in_project"],
        "why_in_effect": eff["why_in_effect"],
        "verified": eff["verified"],
        "narrower_pins": len(eff["limited"]),
        "conflicts": [
            {
                "requested": c["request"]["values"],
                "requested_at": _at(c["request"]["path"], c["request"]["line"]),
                "pinned": c["pin"]["value"],
            }
            for c in eff["conflicts"]
        ],
    }


def annotate_models(doc: dict, *, full: bool = False, env: dict[str, str] | None = None) -> None:
    """Add ``model_in_force`` to the Copilot rows of an ``aictl ps`` document, and to sessions when ``full``."""
    for row in doc.get("tools", []):
        if row.get("tool") not in COPILOT_TOOLS:
            continue
        row["model_in_force"] = model_summary(None, row["tool"], env=env)
        if full:
            for session in row.get("sessions", []):
                if session.get("cwd") and Path(session["cwd"]).is_dir():
                    session["model_in_force"] = model_summary(session["cwd"], row["tool"], env=env)


# ─── Findings ─────────────────────────────────────────────────────


def _at(path: str, line: int) -> str:
    return f"{path}:{line}" if line else path


def _conflict_finding(tool: str, request: dict, pin_value: str, pin_path: str, pin_line: int, why: str, action: str, session_id: str = "") -> Finding:
    asked = ", ".join(request["values"])
    return Finding(
        rule="model.pin-conflicts-request",
        severity="high",
        tool=tool,
        path=request["path"],
        line=request["line"],
        snippet=f"requested {asked} at {_at(request['path'], request['line'])}; pinned {pin_value} at {_at(pin_path, pin_line)}",
        why=why,
        action=action,
        session_id=session_id,
        tools=[tool],
    )


def _model_findings_for(tool: str, eff: dict, sessions: list[SessionFacts]) -> list[Finding]:
    out: list[Finding] = []
    candidates = eff["candidates"]
    pin = candidates[0] if candidates else None
    limited = eff["limited"]
    panel = next((r for r in eff.get("picker", []) if r["location"] == "panel"), None)
    if panel and is_pin(panel["value"]):
        for row in limited:
            if is_pin(row["value"]) and not same_model(row["value"], panel["value"]):
                out.append(
                    Finding(
                        rule="model.differs-from-picker",
                        severity="medium",
                        tool=tool,
                        path=row["path"],
                        line=row["line"],
                        snippet=f"{row['setting']} = {row['value']} at {_at(row['path'], row['line'])}; picker selects {panel['value']} ({panel['scope']}, {panel['path']})",
                        why="The picker's selection and this setting or agent file ask for different models. A setting applies to its own feature or agent, the picker to the chat panel.",
                        action="Align the two, or confirm the difference is intended.",
                        tools=[tool],
                    )
                )
    if pin and is_pin(pin["value"]):
        if pin["scope"] != "flag" and not pin["in_project"]:
            out.append(
                Finding(
                    rule="model.outside-project",
                    # A variable in this shell ends with the shell. A profile, a registry key or a file stays.
                    severity="low" if pin["path"].startswith("env:") else "medium",
                    tool=tool,
                    path=pin["path"],
                    line=pin["line"],
                    snippet=f"{pin['setting']} = {pin['value']}",
                    why=f"{pin['why_in_effect']} A session here runs this model unless something above it in the order applies.",
                    action="Check that this pin is still wanted. Pin a model in the project or remove it here.",
                    tools=[tool],
                )
            )
        for item in eff["conflicts"]:
            request = item["request"]
            wins = "This agent's own model wins when it is available. If not, the CLI warns and uses the current model." if request["kind"] == "agent-frontmatter" else f"The {pin['scope']} pin decides unless this is passed explicitly."
            out.append(_conflict_finding(tool, request, pin["value"], pin["path"], pin["line"], f"Two models are asked for here. {wins} A flow that depends on one of them can fail or run on the other.", "Make the two agree, or remove the pin that nobody needs."))
        agreeing = [r for r in eff["requests"] if any(same_model(v, pin["value"]) for v in r["values"])]
        for request in agreeing:
            out.append(Finding(rule="model.pin-agrees", severity="info", tool=tool, path=request["path"], line=request["line"], snippet=f"requested {request['value']}; pinned {pin['value']} at {_at(pin['path'], pin['line'])}", why="The request and the pin name the same model.", tools=[tool]))
    in_force = candidates[:1]
    repo_pins = [c for c in candidates if c["scope"] in ("repo", "repo-local")]
    user_pins = [c for c in candidates if c["scope"] == "user"]
    for repo in repo_pins[:1]:
        for user in user_pins[:1]:
            if is_pin(repo["value"]) and is_pin(user["value"]) and not same_model(repo["value"], user["value"]):
                request = {"values": [repo["value"]], "path": repo["path"], "line": repo["line"]}
                out.append(_conflict_finding(tool, request, user["value"], user["path"], user["line"], f"The repository and the user file pin different models. {_REPO_UNVERIFIED}", "Remove one of the two pins."))
    by_agent = {p["applies"].split(":", 1)[1]: p for p in limited if p["applies"].startswith("subagent:")}
    for request in eff["requests"]:
        pin_for = by_agent.get(request["name"]) if request["kind"] == "agent-frontmatter" else None
        if pin_for and is_pin(pin_for["value"]) and not any(same_model(v, pin_for["value"]) for v in request["values"]):
            out.append(_conflict_finding(tool, request, pin_for["value"], pin_for["path"], pin_for["line"], f"The agent file and {pin_for['setting']} name different models for the same agent. Which one wins is not documented.", "Make the two agree."))
    out.extend(_grouped_limited(tool, limited))
    seen_unknown: set[tuple[str, int, str]] = set()
    for row in [*in_force, *limited]:
        for value in row.get("values") or [row["value"]]:
            key = (row["path"], row["line"], canonical_model(value))
            if is_pin(value) and resolve_pricing(canonical_model(value))[0] is None and canonical_model(value) not in _FAMILY_WORDS and key not in seen_unknown:
                seen_unknown.add(key)
                out.append(Finding(rule="model.unrecognized", severity="medium", tool=tool, path=row["path"], line=row["line"], snippet=f"{row['setting']} = {value}", why="This pinned model id is not in aictl's table, so it may be misspelled, new or old. aictl cannot tell which.", action="Check the id against the tool's model list.", tools=[tool]))
    out.extend(_session_findings(tool, eff, sessions))
    return out


def _grouped_limited(tool: str, limited: list[dict]) -> list[Finding]:
    """One line per file and value for pins kept outside the project, so many agents read as one fact."""
    groups: dict[tuple[str, str], list[dict]] = {}
    for row in limited:
        if not row["in_project"] and is_pin(row["value"]) and not row["scope"].endswith("-frontmatter") and not row["applies"].startswith("profile:"):
            groups.setdefault((row["path"], canonical_model(row["value"])), []).append(row)
    out = []
    for rows in groups.values():
        first = rows[0]
        names = ", ".join(r["setting"] for r in rows[:4]) + (" ..." if len(rows) > 4 else "")
        out.append(Finding(rule="model.outside-project", severity="medium", tool=tool, path=first["path"], line=first["line"], snippet=f"{first['value']} for {len(rows)} setting(s): {names}", why=first["why_in_effect"], action="Check that these pins are still wanted.", count=len(rows), tools=[tool]))
    return out


def _session_findings(tool: str, eff: dict, sessions: list[SessionFacts]) -> list[Finding]:
    if tool == "copilot-vscode":
        return []
    out: list[Finding] = []
    differing = 0
    by_agent = {p["applies"].split(":", 1)[1]: p for p in eff["limited"] if p["applies"].startswith("subagent:")}
    for facts in sessions:
        for error in facts.errors:
            status = f", status {error['status']}" if error["status"] else ""
            out.append(Finding(rule="model.request-failed", severity="high", tool=tool, path=facts.path, snippet=f"requested {error['requested'] or 'unknown'}: {error['category']} ({error['error_type']}{status})", why="A session log records that the requested model could not be used.", action="Compare the requested model with the pins above and with your plan's or organization's model policy.", session_id=facts.session_id, tools=[tool]))
        for request in facts.subagent_requests:
            pin = by_agent.get(request["agent"])
            if pin and request["requested"] and is_pin(pin["value"]) and not same_model(request["requested"], pin["value"]):
                out.append(Finding(rule="model.pin-conflicts-request", severity="high", tool=tool, path=pin["path"], line=pin["line"], snippet=f"requested {request['requested']} for subagent {request['agent']}; pinned {pin['value']} at {_at(pin['path'], pin['line'])}", why="A session asked for one model for this subagent while a setting pins another.", action="Make the two agree.", session_id=facts.session_id, tools=[tool]))
        if facts.fusion or differing >= MAX_RAN_DIFFERENTLY:
            continue
        for (requested, ran), count in facts.mismatches.items():
            differing += 1
            switches = "; ".join(f"{s['previous']} to {s['new']}" + (f" ({s['cause']})" if s["cause"] else "") for s in facts.switches)
            out.append(Finding(rule="model.ran-differently", severity="medium", tool=tool, path=facts.path, snippet=f"requested {requested}, ran {ran}" + (f"; switches: {switches}" if switches else ""), why="The model in the session log's replies differs from the one selected.", action="Check for a fallback or an auto route.", session_id=facts.session_id, count=count, tools=[tool]))
        for switch in facts.switches:
            if not facts.mismatches and _AUTO_SWITCH_RE.search(switch["cause"]):
                differing += 1
                out.append(Finding(rule="model.ran-differently", severity="medium", tool=tool, path=facts.path, snippet=f"switched {switch['previous']} to {switch['new']} ({switch['cause']})", why="The session moved to another model without a person choosing it.", action="Check quota and availability for the first model.", session_id=facts.session_id, tools=[tool]))
        for request in facts.subagent_requests:
            if request["requested"] and request["ran"] and not same_model(request["requested"], request["ran"]):
                differing += 1
                out.append(Finding(rule="model.ran-differently", severity="medium", tool=tool, path=facts.path, snippet=f"subagent {request['agent']}: requested {request['requested']}, ran {request['ran']}", why="The subagent ran on a different model from the one asked for.", action="Check the pins for this subagent.", session_id=facts.session_id, tools=[tool]))
    return out


def model_findings(project: str | Path, *, env: dict[str, str] | None = None, ps_output: str | None = None, tools: tuple[str, ...] = COPILOT_TOOLS) -> tuple[dict[str, dict], list[Finding]]:
    """``({tool: effective_model}, findings)`` for the Copilot tools. Read-only."""
    root = Path(project).expanduser().resolve()
    env = dict(os.environ) if env is None else env
    sessions = read_sessions(env, root)
    effective: dict[str, dict] = {}
    merged: dict[tuple, Finding] = {}
    for tool in tools:
        eff = effective_model(root, tool, env=env, ps_output=ps_output)
        if tool == "copilot-desktop" and not (_copilot_home(env) / "data.db").is_file():
            continue
        effective[tool] = eff
        for finding in _model_findings_for(tool, eff, sessions if tool != "copilot-desktop" else []):
            key = (finding.rule, finding.path, finding.line, finding.session_id, finding.snippet)
            if key in merged:
                merged[key].tools = sorted({*merged[key].tools, tool})
            else:
                merged[key] = finding
    return effective, list(merged.values())


# ─── User-level sources ───────────────────────────────────────────

_BEHAVIOUR_KINDS = {"instructions", "settings", "hooks", "mcp", "rules", "config"}
_OUTSIDE_SCOPES = {"user", "managed", "parent-dir"}


def _settings_pairs(project: Path, env: dict[str, str]) -> list[tuple[Path, Path]]:
    return [
        (_copilot_home(env) / "settings.json", project / ".github" / "copilot" / "settings.json"),
        (_copilot_home(env) / "settings.json", project / ".github" / "copilot" / "settings.local.json"),
        (Path.home() / ".claude" / "settings.json", project / ".claude" / "settings.json"),
        (vscode_user_dir() / "settings.json", project / ".vscode" / "settings.json"),
    ]


def _contradictions(project: Path, env: dict[str, str]) -> dict[str, str]:
    """User-level settings files whose scalar keys differ from a file in the repo, by user path."""
    out: dict[str, str] = {}
    for user, repo in _settings_pairs(project, env):
        if not (user.is_file() and repo.is_file()):
            continue
        left, right = _read_json(user), _read_json(repo)
        differing = sorted(k for k in left.keys() & right.keys() if not isinstance(left[k], (dict, list)) and left[k] != right[k])
        if differing:
            shown = ", ".join(differing[:5])
            out[_path_key(user)] = f"Differs from {repo} on: {shown}"
    return out


def annotate_sources(sources: list, project: Path, findings: list[Finding], env: dict[str, str]) -> None:
    """Fill ``in_project`` and ``why_in_effect`` on every source, and flag the ones outside the root."""
    contradictions = _contradictions(project, env)
    for source in sources:
        if source.scope == "dynamic" or not source.readable:
            source.in_project = False
            source.why_in_effect = why_in_effect(source.tool, "dynamic", False, source.path)
            continue
        source.in_project = _in_project(source.path, project)
        source.why_in_effect = why_in_effect(source.tool, source.scope, source.in_project, source.path)
        if source.in_project or source.scope not in _OUTSIDE_SCOPES or source.loading not in ("always", "config") or source.kind not in _BEHAVIOUR_KINDS:
            continue
        contradiction = contradictions.get(_path_key(source.path), "")
        findings.append(
            Finding(
                rule="source.user-level-outside-root",
                severity="medium" if contradiction else "low",
                tool=source.tool,
                path=source.path,
                snippet=contradiction or f"scope {source.scope}, {source.kind}",
                why=source.why_in_effect,
                action="Check that this should apply to this project." if contradiction else "",
            )
        )


# ─── Settings table ───────────────────────────────────────────────


def _setting_files(tool: str, project: Path, env: dict[str, str]) -> list[tuple[str, Path, bool]]:
    """``(scope, path, order_confirmed)``, strongest first."""
    home = _copilot_home(env)
    if tool in ("copilot-cli", "copilot-desktop"):
        return [("repo-local", project / ".github/copilot/settings.local.json", True), ("repo", project / ".github/copilot/settings.json", True), ("user", home / "settings.json", True)]
    if tool == "copilot-vscode":
        return [("vscode-workspace", project / ".vscode/settings.json", True), ("vscode-user", vscode_user_dir() / "settings.json", True)]
    if tool == "claude-code":
        return [("repo-local", project / ".claude/settings.local.json", False), ("repo", project / ".claude/settings.json", False), ("user", Path.home() / ".claude/settings.json", False)]
    if tool == "gemini-cli":
        return [("repo", project / ".gemini/settings.json", False), ("user", Path.home() / ".gemini/settings.json", False)]
    return []


SETTING_TOOLS = ("copilot-cli", "copilot-desktop", "copilot-vscode", "claude-code", "gemini-cli")


def settings_table(tool: str, project: Path, env: dict[str, str]) -> list[dict]:
    """Scalar settings, each with its value, source, scope and what it overrode. Secret-like values are hidden."""
    rows: dict[str, dict] = {}
    for scope, path, confirmed in _setting_files(tool, project, env):
        if not path.is_file():
            continue
        inside = _in_project(str(path), project)
        for key, value in _read_json(path).items():
            if tool == "copilot-vscode" and not re.match(r"chat|inlineChat|github\.copilot|mcp", key):
                continue
            if isinstance(value, (dict, list)) or value is None:
                continue
            shown = "<hidden>" if _SECRET_KEY_RE.search(key) else _redact(str(value))[:120]
            if key in rows:
                rows[key]["overrode"].append({"value": shown, "scope": scope, "path": str(path)})
            else:
                rows[key] = {"tool": tool, "setting": key, "value": shown, "scope": scope, "path": str(path), "in_project": inside, "why_in_effect": why_in_effect(tool, scope, inside, str(path)), "order_confirmed": confirmed, "overrode": []}
    return [rows[k] for k in sorted(rows)]


# ─── Search path and Windows locations ────────────────────────────


def _env_lookup(env: dict[str, str]) -> Callable[[str], str]:
    upper = {k.upper(): v for k, v in env.items()}
    return lambda name: upper.get(name.upper(), "")


def expand_windows(raw: str, env: dict[str, str]) -> str:
    """Expand ``%VAR%`` in any case. Empty when a variable is not set, so nothing is guessed."""
    get = _env_lookup(env)
    missing = False

    def replace(match: re.Match) -> str:
        nonlocal missing
        value = get(match.group(1))
        missing = missing or not value
        return value

    expanded = re.sub(r"%([^%]+)%", replace, raw)
    return "" if missing else ntpath.normpath(expanded)


def inside_windows(path: str, root: str) -> bool:
    """Case-insensitive and backslash-aware containment, whichever platform runs it."""
    left, right = ntpath.normcase(ntpath.normpath(path)), ntpath.normcase(ntpath.normpath(root))
    return left == right or left.startswith(right.rstrip("\\") + "\\")


_VSCODE_TREE_FILES = ("settings.json", "mcp.json", "chatLanguageModels.json", r"globalStorage\state.vscdb", r"workspaceStorage\<hash>\state.vscdb", r"prompts\*.prompt.md", r"globalStorage\github.copilot-chat\*-agent\*.agent.md", r"profiles\<id>\settings.json")
_COPILOT_HOME_FILES = ("settings.json", "config.json", "copilot-instructions.md", "mcp-config.json", "permissions-config.json", r"agents\*.md", r"instructions\**\*.instructions.md", "session-state")
_PS_PROFILE = r"PowerShell\Microsoft.PowerShell_profile.ps1"
_PS5_PROFILE = r"WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
_PARENT_FILES = ("AGENTS.md", "CLAUDE.md", r".github\copilot-instructions.md", r".github\agents", r".github\copilot\settings.json")
_UNVERIFIED_ON_WINDOWS = "From the path tables or vendor docs. Not yet checked on a real Windows machine."


def _csv_windows_rows() -> list[dict]:
    path = Path(__file__).parent / "data" / "paths-windows.csv"
    try:
        with open(path, newline="", encoding="utf-8") as handle:
            return [r for r in csv.DictReader(handle) if r.get("ai_tool") in COPILOT_TOOLS or r.get("ai_tool") in ("copilot", "copilot-chat")]
    except OSError:
        return []


def windows_locations(env: dict[str, str], project: str = "", *, list_dir: Callable[[str], list[str]] | None = None, exists: Callable[[str], bool] | None = None) -> list[dict]:
    """Every Windows location that can force settings on a project, raw and expanded.

    Pure over ``env``, ``list_dir`` and ``exists``, so it can be tested on any platform.
    """
    if list_dir is None:

        def list_dir(path: str) -> list[str]:
            try:
                return sorted(os.listdir(path))
            except OSError:
                return []

    check = exists or os.path.exists
    rows: list[dict] = []
    seen: set[str] = set()

    def add(ident: str, raw: str, scope: str, tool: str, verified: bool, note: str = "", expanded: str | None = None) -> None:
        full = expand_windows(raw, env) if expanded is None else expanded
        key = (full or raw).lower()
        if key in seen:
            return
        seen.add(key)
        in_project = bool(project and full and inside_windows(full, project))
        present = bool(full and "*" not in full and "<" not in full and check(full))
        rows.append(
            {
                "id": ident,
                "raw": raw,
                "expanded": full,
                "scope": scope,
                "tool": tool,
                "exists": present,
                "in_project": in_project,
                "why_in_effect": "In this project." if in_project else f"Not in this project, still in effect if present: {tool} reads it at {scope} scope.",
                "verified": verified,
                "note": note or (_UNVERIFIED_ON_WINDOWS if verified else "Not confirmed in any doc. Listed so it can be checked."),
            }
        )

    for editor in ("Code", "Code - Insiders"):
        base = rf"%APPDATA%\{editor}\User"
        for name in _VSCODE_TREE_FILES:
            add(f"vscode-{name}", rf"{base}\{name}", "user", "copilot-vscode", True)
        tree = expand_windows(base, env)
        for profile in list_dir(ntpath.join(tree, "profiles")) if tree else []:
            raw = rf"{base}\profiles\{profile}\settings.json"
            add("vscode-profile-settings", raw, "user", "copilot-vscode", True, "Applies only while this profile is active.")
    packages = expand_windows(r"%LOCALAPPDATA%\Packages", env)
    add("msix-packages", r"%LOCALAPPDATA%\Packages\<package>\LocalCache\Roaming", "user", "any packaged app", True, "A packaged app, such as a Store Python, reads this copy of AppData, not %APPDATA%.")
    add("msix-packages-local", r"%LOCALAPPDATA%\Packages\<package>\LocalCache\Local", "user", "any packaged app", True, "A packaged app reads this copy of LocalAppData, not %LOCALAPPDATA%.")
    for package in list_dir(packages) if packages else []:
        for editor in ("Code", "Code - Insiders"):
            raw = rf"%LOCALAPPDATA%\Packages\{package}\LocalCache\Roaming\{editor}\User\settings.json"
            full = expand_windows(raw, env)
            if full and check(full):
                add("msix-vscode-settings", raw, "user", "copilot-vscode", True, "Packaged copy of VS Code settings. A packaged process sees this one, an unpackaged one sees %APPDATA%.")
        raw = rf"%LOCALAPPDATA%\Packages\{package}\LocalCache\Local\.copilot\settings.json"
        full = expand_windows(raw, env)
        if full and check(full):
            add("msix-copilot-settings", raw, "user", "copilot-cli", False)
    add("vscode-portable-settings", r"%VSCODE_PORTABLE%\user-data\User\settings.json", "user", "copilot-vscode", True, "Portable mode replaces %APPDATA%\\Code entirely.")
    add("vscode-portable-data", r"<install>\data\user-data\User\settings.json", "user", "copilot-vscode", True, "Portable mode, where the install folder has a data folder.")
    get = _env_lookup(env)
    if get("COPILOT_HOME"):
        for name in _COPILOT_HOME_FILES:
            add(f"copilot-home-{name}", rf"%COPILOT_HOME%\{name}", "user", "copilot-cli", True, "COPILOT_HOME replaces %USERPROFILE%\\.copilot.")
    for name in _COPILOT_HOME_FILES:
        note = "Ignored while COPILOT_HOME is set." if get("COPILOT_HOME") else ""
        add(f"copilot-{name}", rf"%USERPROFILE%\.copilot\{name}", "user", "copilot-cli", True, note)
    add("mdm-copilot-managed-settings", r"%ProgramFiles%\GitHubCopilot\managed-settings.json", "machine", "copilot-cli", True, "Documented MDM file in the Copilot CLI config reference. Registry alternative: HKLM\\SOFTWARE\\Policies\\GitHubCopilot.")
    add("registry-copilot-policy", r"HKEY_LOCAL_MACHINE\SOFTWARE\Policies\GitHubCopilot", "machine-policy", "copilot-cli", True, "Documented MDM registry key. Registry keys are not files.", expanded=r"HKEY_LOCAL_MACHINE\SOFTWARE\Policies\GitHubCopilot")
    add("programdata-vscode", r"%PROGRAMDATA%\Microsoft\VSCode\policy.json", "machine", "copilot-vscode", False)
    for base in (r"%USERPROFILE%\Documents", r"%OneDrive%\Documents", r"%OneDriveCommercial%\Documents", r"%OneDriveConsumer%\Documents", r"%USERPROFILE%\OneDrive\Documents"):
        for profile in (_PS_PROFILE, _PS5_PROFILE):
            add("powershell-profile", rf"{base}\{profile}", "user", "env", True, "A profile can set COPILOT_MODEL for every new shell. OneDrive can move Documents here.")
    for hive in ("HKEY_LOCAL_MACHINE", "HKEY_CURRENT_USER"):
        add("registry-vscode-policy", rf"{hive}\SOFTWARE\Policies\Microsoft\VSCode", "machine-policy", "copilot-vscode", True, "Read through winreg. Registry keys are not files.", expanded=rf"{hive}\SOFTWARE\Policies\Microsoft\VSCode")
        add("registry-environment", rf"{hive}\Environment", "machine-policy" if hive.endswith("MACHINE") else "user", "env", True, "Persistent variables, including COPILOT_MODEL.", expanded=rf"{hive}\Environment")
    if project:
        current = ntpath.normpath(project)
        while True:
            parent = ntpath.dirname(current)
            if parent == current or not parent:
                break
            current = parent
            for name in _PARENT_FILES:
                add("parent-dir", ntpath.join(current, name), "parent-dir", "copilot-cli", False, "Parent directory up to the drive root. Tools differ on how far they walk.", expanded=ntpath.join(current, name))
    for row in _csv_windows_rows():
        raw = row.get("path") or ""
        if raw.startswith("%") and "{" not in raw and row.get("scope") == "global":
            add(f"table-{row.get('category')}", raw, "user", row.get("ai_tool") or "copilot", True, row.get("description") or "")
    return rows


def posix_locations(project: Path, env: dict[str, str]) -> list[dict]:
    """The same list for macOS and Linux."""
    home = _copilot_home(env)
    rows = []

    def add(ident: str, raw: str, path: Path, scope: str, tool: str, verified: bool = True, note: str = "") -> None:
        inside = _in_project(str(path), project)
        rows.append({"id": ident, "raw": raw, "expanded": str(path), "scope": scope, "tool": tool, "exists": path.exists(), "in_project": inside, "why_in_effect": "In this project." if inside else f"Not in this project, still in effect if present: {tool} reads it at {scope} scope.", "verified": verified, "note": note})

    for name in ("settings.json", "config.json", "copilot-instructions.md", "mcp-config.json", "permissions-config.json", "agents", "instructions", "session-state"):
        add(f"copilot-{name}", f"$COPILOT_HOME/{name}" if env.get("COPILOT_HOME") else f"~/.copilot/{name}", home / name, "user", "copilot-cli")
    for rel, scope in ((".github/copilot/settings.local.json", "repo-local"), (".github/copilot/settings.json", "repo"), (".github/agents", "repo"), (".github/prompts", "repo"), (".github/chatmodes", "repo"), (".vscode/settings.json", "repo"), ("AGENTS.md", "repo"), (".github/copilot-instructions.md", "repo")):
        add(f"repo-{rel}", rel, project / rel, scope, "copilot")
    for label, tree in (("Code", vscode_user_dir()), ("Code - Insiders", vscode_insiders_user_dir())):
        for name in ("settings.json", "mcp.json", "chatLanguageModels.json", "prompts", "globalStorage/github.copilot-chat", "profiles"):
            add(f"vscode-{name}", f"<{label} user dir>/{name}", tree / name, "user", "copilot-vscode")
    add("macos-vscode-policy", "/Library/Managed Preferences/com.microsoft.VSCode.plist", Path("/Library/Managed Preferences/com.microsoft.VSCode.plist"), "machine-policy", "copilot-vscode")
    add("linux-vscode-policy", "/etc/vscode/policy.json", Path("/etc/vscode/policy.json"), "machine-policy", "copilot-vscode")
    current = project
    for parent in project.parents:
        current = parent
        for name in ("AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"):
            add("parent-dir", str(current / name), current / name, "parent-dir", "copilot-cli", False, "Tools differ on how far they walk.")
    return rows


def search_path(project: Path, env: dict[str, str]) -> list[dict]:
    if IS_WINDOWS:
        return windows_locations(env, str(project))
    return posix_locations(project, env)


def effective_report(project: str | Path | None = None, tool: str | None = None, *, env: dict[str, str] | None = None, ps_output: str | None = None, include_search_path: bool = False) -> dict:
    """Everything ``aictl ctx effective`` prints. Read-only: it writes no baseline and runs nothing."""
    root = Path(project).expanduser().resolve() if project else Path.cwd().resolve()
    env = dict(os.environ) if env is None else env
    wanted = tuple(t for t in COPILOT_TOOLS if not tool or t == tool or t.startswith(f"{tool}-") or t.split("-")[0] == tool)
    effective, findings = model_findings(root, env=env, ps_output=ps_output, tools=wanted) if wanted else ({}, [])
    setting_tools = [t for t in SETTING_TOOLS if not tool or t == tool or t.startswith(f"{tool}-") or t.split("-")[0] == tool]
    report = {
        "project": str(root),
        "effective_models": effective,
        "settings": {t: settings_table(t, root, env) for t in setting_tools},
        "findings": [asdict(f) for f in findings],
    }
    if include_search_path:
        report["search_path"] = search_path(root, env)
    return report
