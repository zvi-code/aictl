# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""AI tool configuration and startup detection driven by tool-configs.yaml.

Reads tool-specific settings files to extract operational config.
The YAML schema defines tool name and config file locations; per-tool
parser functions handle the tool-specific extraction logic.

Parsers are registered in _CONFIG_PARSER_REGISTRY by tool name.
collect_tool_configs() iterates over YAML entries and dispatches to
registered parsers — no hardcoded tool names in the collection loop.
"""

from __future__ import annotations

import dataclasses
import json
import logging
import os
import re
import shutil
import subprocess
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from ..data.schema import load_tool_configs
from ..fsutil import safe_iterdir
from ..platforms import (
    IS_MACOS,
    IS_WINDOWS,
    claude_desktop_config,
    claude_global_dir,
    codex_global_dir,
    copilot_desktop_windows_version,
    copilot_global_dir,
    cursor_user_dir,
    vscode_user_dir,
    windsurf_global_dir,
)

log = logging.getLogger(__name__)


@dataclass
class OTelConfig:
    """Standardized OpenTelemetry configuration state."""

    enabled: bool = False
    exporter: str = ""  # "otlp-http", "otlp-grpc", "console", "file", ""
    endpoint: str = ""  # e.g. "http://localhost:4318"
    file_path: str = ""  # For "file" exporter — the JSON-lines path
    capture_content: bool = False
    source: str = ""  # "vscode-settings", "codex-toml", "env-var", etc.
    # Field -> environment variable the value came from, e.g. {"enabled": "COPILOT_OTEL_ENABLED"}.
    # Read by normalize_sections() for the rows' sources; not part of to_dict().
    env_names: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            k: v
            for k, v in {
                "enabled": self.enabled,
                "exporter": self.exporter,
                "endpoint": self.endpoint,
                "file_path": self.file_path,
                "capture_content": self.capture_content,
                "source": self.source,
            }.items()
            if v
        }


@dataclass
class ToolConfig:
    """Parsed configuration state for one AI tool."""

    tool: str
    settings: dict = field(default_factory=dict)  # Key settings as flat dict
    launch_at_startup: bool | None = None  # True/False/None(unknown)
    auto_update: bool | None = None
    model: str = ""
    mcp_servers: list[str] = field(default_factory=list)  # Server names
    features: dict = field(default_factory=dict)  # Feature flags
    extensions: list[str] = field(default_factory=list)  # Installed extensions
    otel: OTelConfig = field(default_factory=OTelConfig)
    hints: list[str] = field(default_factory=list)  # Actionable suggestions
    feature_groups: dict[str, dict] = field(default_factory=dict)  # Grouped features by mode/category
    # User-configurable model overrides surfaced for the dashboard. Each entry:
    #   {"label", "key" (full setting key), "value", "source" (user|workspace|default),
    #    "default_hint", "description"}
    configurable_models: list[dict] = field(default_factory=list)
    # Filesystem locations the user can edit to change these settings.
    config_files: list[str] = field(default_factory=list)
    # What aictl can read from this machine for the tool, as explicit booleans,
    # e.g. {"sessions": False, "tokens": False}. False means "not available from
    # this machine" (cloud-hosted data), which is different from "zero". Empty
    # for tools that do not declare it; consumers must tolerate a missing key.
    local_data: dict[str, bool] = field(default_factory=dict)
    # One shape for every tool: ordered sections of rows, built by
    # normalize_sections(). Always present in to_dict(), possibly empty.
    sections: list[dict] = field(default_factory=list)
    # Settings key -> config file the value was read from, when the parser
    # knows it. Read by normalize_sections(); not part of to_dict().
    setting_sources: dict[str, str] = field(default_factory=dict)
    # Flat settings keys whose values a feature group or model row already
    # shows; normalize_sections() leaves them out. Not part of to_dict().
    covered_keys: list[str] = field(default_factory=list)
    # Row key -> the value of that setting in each file the parser read, lowest
    # priority first, as (scope, value, path, key as written in the file). An
    # empty scope is derived from the path. Group rows use "<group>/<key>".
    # Read by normalize_sections() to build each row's chain; not part of to_dict().
    setting_values: dict[str, list[tuple[str, object, str, str]]] = field(default_factory=dict)
    # Project root the config was read for; paths under it are project scope.
    # Not part of to_dict().
    project_root: str = ""
    # Scope layers the tool reads, lowest precedence first. Each entry:
    #   {"id", "label", "path", "exists", "changeable", "note"}. Always in to_dict().
    scopes: list[dict] = field(default_factory=list)
    # Row lookup key -> key as written in the file, where the row key differs.
    # Not part of to_dict().
    file_keys: dict[str, str] = field(default_factory=dict)
    # Flat settings key -> section id / label / note chosen by the parser.
    # Not part of to_dict().
    key_sections: dict[str, str] = field(default_factory=dict)
    key_labels: dict[str, str] = field(default_factory=dict)
    key_notes: dict[str, str] = field(default_factory=dict)
    # Flat settings keys added by the read-every-key pass. Not part of to_dict().
    generic_keys: set[str] = field(default_factory=set)
    # Keys a winning managed value locks (a key or a dotted prefix); None means
    # every managed value locks. Not part of to_dict().
    managed_floors: tuple[str, ...] | None = None
    # Finished rows of the "agents" section, built by the parser. Not part of to_dict().
    agent_rows: list[dict] = field(default_factory=list)
    # Every environment variable the tool reads, set ones first, built by
    # env_var_rows(). Each entry: {"name", "set", "value", "masked", "source",
    # "in_process", "persisted": [{"origin", "kind", "value"}], "drives": [{"key", "label"}],
    # "label", "description", "section", "documented"}. Always in to_dict().
    env_vars: list[dict] = field(default_factory=list)
    # Variables a settings file sets for the tool's sessions (Claude Code's
    # ``env`` key), as {path: {name: value}}. Read by env_var_rows(); not part of to_dict().
    env_blocks: dict[str, dict[str, str]] = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = dataclasses.asdict(self)
        d["otel"] = self.otel.to_dict()  # use filtered version (omits falsy values)
        del d["setting_sources"]
        del d["covered_keys"]
        del d["setting_values"]
        del d["project_root"]
        for internal in ("file_keys", "key_sections", "key_labels", "key_notes", "generic_keys", "managed_floors", "agent_rows", "env_blocks"):
            del d[internal]
        if not self.feature_groups:
            del d["feature_groups"]
        if not self.configurable_models:
            del d["configurable_models"]
        if not self.config_files:
            del d["config_files"]
        if not self.local_data:
            del d["local_data"]
        return d


# ─── Uniform sections (one shape for every tool) ────────────────

# (id, title) in display order. Sections without rows are left out.
SECTION_ORDER: list[tuple[str, str]] = [
    ("model", "Model"),
    ("agents", "Agents"),
    ("telemetry", "Telemetry"),
    ("autonomy", "Autonomy and safety"),
    ("context", "Context files"),
    ("hooks", "Hooks"),
    ("mcp", "MCP servers"),
    ("extensions", "Extensions and plugins"),
    ("startup", "Updates and startup"),
    ("other", "Other settings"),
]

# feature_groups name -> section id. Unknown groups go to "other".
_GROUP_SECTIONS: dict[str, str] = {
    "Agent": "autonomy",
    "Agent Mode": "autonomy",
    "Code (Agent)": "autonomy",
    "Cowork (Autonomous)": "autonomy",
    "Safety": "autonomy",
    "Claude (Anthropic)": "autonomy",
    "Session Targets": "autonomy",
    "CLI Mode": "autonomy",
    "Hooks": "hooks",
    "Context Files": "context",
    "File Locations": "context",
    "MCP": "mcp",
    "Debug Logging": "other",
    "Chat": "other",
    "General": "other",
    "UI": "other",
    "Memory & Tools": "other",
}

# Flat settings key -> section id, by substring of the lowercased key. First match wins.
_KEY_SECTIONS: list[tuple[str, tuple[str, ...]]] = [
    ("model", ("model", "effort", "reasoning", "temperature", "thinking")),
    ("telemetry", ("otel", "telemetry")),
    (
        "autonomy",
        ("permission", "approv", "autopilot", "sandbox", "skippermissions", "dangerously", "autoreply", "trusted"),
    ),
    ("hooks", ("hook",)),
    ("mcp", ("mcp",)),
    ("context", ("instruction", "claudemd", "agentsmd", "contextfile")),
    ("startup", ("version", "installmethod", "update", "launch", "startup", "onboarding")),
]

# Leading tool prefixes removed before keys are compared.
_KEY_PREFIXES = ("github.copilot.", "chat.", "agent_", "agent.", "debug_", "debug.")

_LABELS: dict[str, str] = {
    "otlpEndpoint": "OTLP endpoint",
    "maxRequests": "Max requests per turn",
    "globalAutoApprove": "Approve every tool call",
    "skipPermissions": "Skip permission checks",
    "allowDangerouslySkipPermissions": "Skip permission checks",
    "autoReply": "Answer agent questions automatically",
    "terminalSandbox": "Terminal sandbox",
    "terminalAutoApprove": "Auto-approve terminal commands",
    "autoApproveNpmScripts": "Auto-approve workspace npm scripts",
    "allBrowserActions": "Allow all browser actions",
    "hasCompletedOnboarding": "Onboarding completed",
    "installMethod": "Install method",
    "effortLevel": "Reasoning effort",
    "effort": "Reasoning effort",
    "model_reasoning_effort": "Reasoning effort",
    "disabled_mcp_servers": "Disabled MCP servers",
    "global_instructions": "Global instructions file",
    "trustedFolders": "Trusted folders",
    "useResponsesApi": "Responses API",
    "claudeMd": "CLAUDE.md files",
    "agentsMd": "AGENTS.md files",
    "nestedAgentsMd": "Nested AGENTS.md files",
}

# Words kept as written in generic labels (lowercased word -> form).
_ACRONYMS: dict[str, str] = {
    "mcp": "MCP",
    "otel": "OTel",
    "otlp": "OTLP",
    "api": "API",
    "url": "URL",
    "ui": "UI",
    "npm": "npm",
    "typescript": "TypeScript",
    "vscode": "VS Code",
}

# Normalized key -> (dangerous value, note). The note says what the setting does.
_DANGER: dict[str, tuple[object, str]] = {
    "globalautoapprove": (True, "Every tool call runs without asking you for approval."),
    "skippermissions": (True, "The agent runs tools without any permission check."),
    "allowdangerouslyskippermissions": (True, "The agent runs tools without any permission check."),
    "autoreply": (True, "Questions the agent asks are answered automatically, without waiting for you."),
    "terminalautoapprove": (True, "Terminal commands that match the auto-approve rules run without asking."),
    "autoapprovenpmscripts": (True, "npm scripts from the workspace package.json run without asking."),
    "allbrowseractions": (True, "The agent can take any browser action without asking."),
    "allowallbrowseractions": (True, "The agent can take any browser action without asking."),
    "terminalsandbox": (False, "Terminal commands run outside the sandbox, with full access to this machine."),
    "capturecontent": (True, "Full prompt and response text is sent to the telemetry collector."),
    "defaultmode": ("autopilot", "Tool calls run without a confirmation each time."),
    "defaultpermissionmode": ("allow-all", "Every tool call is allowed without asking."),
    "sandboxallowbypass": (True, "Commands can run outside the sandbox when the agent asks to bypass it."),
}

# Keys whose values are never put in a row (credentials).
_SECRET_RE = re.compile(r"(secret|password|passwd|apikey|accesstoken|authtoken|bearer|token)$")
_PATH_RE = re.compile(r"^(/|~[/\\]|\.{1,2}[/\\]|[A-Za-z]:[/\\]|\\\\|[A-Za-z][A-Za-z0-9+.-]*://)")
_WORD_RE = re.compile(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+\d*|[A-Z]+\d*|\d+")


def _strip_prefixes(key: str) -> str:
    changed = True
    while changed:
        changed = False
        for prefix in _KEY_PREFIXES:
            if key.startswith(prefix) and len(key) > len(prefix):
                key = key[len(prefix) :]
                changed = True
    return key


def normalize_key(key: str) -> str:
    """Comparison form of a key: tool prefixes removed, then only lowercase letters and digits."""
    return re.sub(r"[^a-z0-9]", "", _strip_prefixes(key).lower())


def setting_label(key: str) -> str:
    """Human label for a settings key: table entry, else words from camelCase, snake_case and dots."""
    key = key.removeprefix("ws:")
    stripped = _strip_prefixes(key)
    for candidate in (key, stripped, stripped.rsplit(".", 1)[-1]):
        if candidate in _LABELS:
            return _LABELS[candidate]
    words = [w.lower() for w in _WORD_RE.findall(stripped)]
    out: list[str] = []
    i = 0
    while i < len(words):
        if words[i] == "vs" and i + 1 < len(words) and words[i + 1] == "code":
            out.append("VS Code")
            i += 2
            continue
        out.append(_ACRONYMS.get(words[i], words[i]))
        i += 1
    if not out:
        return key.rstrip("?")
    if out[0] not in _ACRONYMS.values():  # acronyms keep their form
        out[0] = out[0][:1].upper() + out[0][1:]
    return " ".join(out).rstrip("?")


def value_kind(value: object) -> str:
    """Row kind for a value: flag, number, list, map, path or text."""
    if isinstance(value, bool):
        return "flag"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, (list, tuple)):
        return "list"
    if isinstance(value, dict):
        return "map"
    if isinstance(value, str) and _PATH_RE.match(value.strip()):
        return "path"
    return "text"


def _key_section(key: str) -> str:
    low = key.lower()
    for section, needles in _KEY_SECTIONS:
        if any(n in low for n in needles):
            return section
    return "other"


def _matches(value: object, bad: object) -> bool:
    """True when *value* is the risky value *bad*, or one of them when *bad* is a list."""
    if isinstance(bad, list):
        return any(_matches(value, b) for b in bad)
    if isinstance(bad, bool) or isinstance(value, bool):
        return value is bad
    return value == bad


def _danger(key: str, value: object) -> tuple[bool, str]:
    for norm in (normalize_key(key), normalize_key(key.rsplit(".", 1)[-1])):
        if norm in _DANGER:
            bad, note = _DANGER[norm]
            if _matches(value, bad):
                return True, note
            return False, ""
    return False, ""


def _row(key: str, value: object, source: str, label: str = "", note: str = "") -> dict:
    danger, danger_note = _danger(key, value)
    return {
        "key": key,
        "label": label or setting_label(key),
        "value": value,
        "kind": value_kind(value),
        "source": source,
        "danger": danger,
        "note": danger_note or note,
    }


def _otel_source_file(cfg: ToolConfig, first_file: str) -> str:
    src = cfg.otel.source
    if src == "aictl-env-file":
        return str(Path.home() / ".config" / "aictl" / "env.sh")
    if src in ("env-var", "claude-env"):
        return ""
    if src == "vscode-workspace":
        ws = [f for f in cfg.config_files if f.replace("\\", "/").endswith(".vscode/settings.json")]
        return ws[0] if ws else first_file
    return first_file


# Source of a value read from an environment variable: "env:<NAME>". The same
# form as the origins in effective_config and context_audit.
ENV_SOURCE = "env:"


def env_source(name: str) -> str:
    return ENV_SOURCE + name


SCOPES = (
    "default",
    "system",
    "user",
    "profile",
    "project",
    "project-local",
    "workspace",
    "env",
    "cli",
    "policy",
    "managed",
)
# Scopes the user cannot edit; a winning value from "managed" or "policy" locks its row.
FIXED_SCOPES = frozenset({"managed", "system", "policy"})
SCOPE_LABELS = {
    "managed": "Managed",
    "system": "System",
    "user": "User",
    "profile": "Profile",
    "project": "Project",
    "project-local": "Project (local)",
    "workspace": "Workspace",
    "env": "Environment",
    "cli": "Command line",
    "policy": "Policy",
}

# Row keys that the parsers make up; they name no single key in the file.
_NO_FILE_KEY = {"project_settings", "mcp_servers", "launch_at_startup", "global_instructions", "version"}
# Row key -> key as written in the file, where the parser renames it.
_FILE_KEYS = {
    "auto_update": "autoUpdates",
    "project_permissions": "permissions",
    "effort": "effortLevel",
    "disabled_mcp_servers": "disabledMcpServers",
    "extensions": "enabledPlugins",
}
_LINE_SUFFIXES = (".json", ".jsonc", ".toml")


def _norm_path(path: str) -> str:
    return os.path.normpath(os.path.expanduser(path)).replace("\\", "/")


def _under(path: str, folder: str) -> bool:
    return bool(folder) and (path == folder or path.startswith(folder.rstrip("/") + "/"))


def _is_managed(path: str) -> bool:
    name = path.rsplit("/", 1)[-1].lower()
    low = path.lower()
    return (
        name.startswith("managed-settings")
        or name == "managed-mcp.json"
        or "managedsettings" in low
        or "/library/application support/claudecode/" in low
        or "/library/application support/githubcopilot/" in low
        or low.startswith("/etc/claude-code/")
        or low.startswith("/etc/github-copilot/")
        or "/programdata/claudecode/" in low
        or ("codex" in low and name in ("requirements.toml", "managed_config.toml"))
    )


def _is_system(path: str) -> bool:
    low = path.lower()
    return low.startswith("/etc/") or "/programdata/" in low or "/program files" in low


_DRIVE_RE = re.compile(r"^[A-Za-z]:[\\/]")


def setting_scope(source: str, project_root: str = "") -> str:
    """Scope a setting was read at, from the file it came from.

    A scope name is kept as it is. No source is "default"; a managed-settings or
    requirements file is "managed"; ``/etc/vscode/`` is "policy"; under
    ``<root>/.vscode/`` is "workspace"; a ``*.local.json`` file under the root
    is "project-local"; elsewhere under the root is "project"; a file under
    ``/etc``, ``%ProgramData%`` or ``%ProgramFiles%`` is "system"; a
    ``<profile>.config.toml`` file is "profile"; any other file is "user".
    """
    if source in SCOPES:
        return source
    if source.startswith(ENV_SOURCE):
        return "env"
    if not source or not (os.path.isabs(os.path.expanduser(source)) or _DRIVE_RE.match(source)):
        return "default"
    path = _norm_path(source)
    if _is_managed(path):
        return "managed"
    if path.lower().startswith("/etc/vscode/"):
        return "policy"
    name = path.rsplit("/", 1)[-1].lower()
    root = _norm_path(project_root) if project_root else ""
    if root and _under(path, root):
        if _under(path, root + "/.vscode"):
            return "workspace"
        return "project-local" if name.endswith((".local.json", ".local.toml")) else "project"
    if _is_system(path):
        return "system"
    if name.endswith(".config.toml") and name != "config.toml":
        return "profile"
    return "user"


def find_key_line(text: str, key: str) -> int:
    """1-based line of *key* in JSON or TOML text, 0 when it is not found.

    Tries the full dotted key as one JSON key, then its last segment as a JSON
    key, then the last segment as a TOML key at the start of a line.
    """
    key = key.removeprefix("ws:")
    if not key or not text:
        return 0
    segment = key.rsplit(".", 1)[-1]
    patterns = []
    if "." in key:
        patterns.append(r'"' + re.escape(key) + r'"\s*:')
    patterns.append(r'"' + re.escape(segment) + r'"\s*:')
    patterns.append(r'^[ \t]*"?' + re.escape(segment) + r'"?[ \t]*=')
    for i, pattern in enumerate(patterns):
        if i == 1 and "." in key:
            nested = _nested_json_line(text, key.split(".")) or _nested_toml_line(text, key.split("."))
            if nested:
                return nested
        m = re.search(pattern, text, re.MULTILINE)
        if m:
            return text.count("\n", 0, m.start()) + 1
    return 0


def _toml_part(part: str) -> str:
    return r"""(?:%s|"%s"|'%s')""" % ((re.escape(part),) * 3)


def _nested_toml_line(text: str, parts: list[str]) -> int:
    """1-based line of a dotted key in TOML text: under its ``[table]`` header, or as a dotted key; 0 when not found."""
    for split in range(len(parts) - 1, 0, -1):
        header = re.compile(
            r"^[ \t]*\[[ \t]*" + r"[ \t]*\.[ \t]*".join(_toml_part(p) for p in parts[:split]) + r"[ \t]*\][ \t]*(?:#.*)?$",
            re.MULTILINE,
        )
        m = header.search(text)
        if not m:
            continue
        body_end = re.compile(r"^[ \t]*\[", re.MULTILINE).search(text, m.end())
        body = text[m.end() : body_end.start() if body_end else len(text)]
        key = re.compile(
            r"^[ \t]*" + r"[ \t]*\.[ \t]*".join(_toml_part(p) for p in parts[split:]) + r"[ \t]*=", re.MULTILINE
        )
        k = key.search(body)
        if k:
            return text.count("\n", 0, m.end() + k.start()) + 1
    return 0


def _nested_json_line(text: str, parts: list[str]) -> int:
    """1-based line of the last of *parts* found as JSON keys one after another, 0 when one is missing."""
    pos, start = 0, -1
    for part in parts:
        m = re.compile(r'"' + re.escape(part) + r'"\s*:').search(text, pos)
        if not m:
            return 0
        pos, start = m.end(), m.start()
    return text.count("\n", 0, start) + 1 if start >= 0 else 0


def _safe_value(value: object) -> object:
    if isinstance(value, str) and "secret://" in value:
        return "configured"
    return value


def _row_file_key(cfg: ToolConfig, lookup: str, key: str, entries: list, wins: int) -> str:
    """Key as written in the tool's file for a row, for catalog lookups."""
    if lookup in cfg.file_keys:
        return cfg.file_keys[lookup]
    if entries:
        return str(entries[min(wins, len(entries) - 1)][3])
    return _FILE_KEYS.get(key, key).removeprefix("ws:")


def _locks(cfg: ToolConfig, scope: str, file_key: str, catalog: dict[str, dict]) -> bool:
    """True when a winning value at *scope* cannot be changed by the user."""
    if scope == "policy":
        return True
    if scope != "managed":
        return False
    if cfg.managed_floors is None:
        return True
    if (catalog.get(file_key) or {}).get("locked_floor"):
        return True
    return any(file_key == f or file_key.startswith(f + ".") for f in cfg.managed_floors)


def _catalog_danger(entry: dict, value: object) -> tuple[bool, str]:
    if "danger_when" not in entry or not _matches(value, entry["danger_when"]):
        return False, ""
    return True, str(entry.get("note") or entry.get("description") or "")


def _finish_rows(
    cfg: ToolConfig,
    sections: dict[str, list[dict]],
    texts: dict[str, str | None],
    catalog: dict[str, dict] | None = None,
) -> None:
    """Add scope, line, chain, wins, locked, set and documented to every row; drop internal keys.

    Rows already finished by the parser (agent rows) keep their chain; only
    ``locked`` is derived for them.
    """
    catalog = catalog or {}
    root = cfg.project_root
    allowed = {_norm_path(f): f for f in cfg.config_files}

    def line_of(path: str, key: str) -> int:
        norm = _norm_path(path) if path else ""
        if not key or norm not in allowed or not norm.lower().endswith(_LINE_SUFFIXES):
            return 0  # only the tool's own config files are read
        if norm not in texts:
            try:
                texts[norm] = Path(allowed[norm]).read_text(encoding="utf-8", errors="replace")
            except OSError:
                texts[norm] = None
        text = texts[norm]
        return find_key_line(text, key) if text else 0

    telemetry_env = cfg.otel.source == "env-var"
    for section, rows in sections.items():
        for row in rows:
            if row.pop("_done", False):
                winner = row["chain"][row["wins"]] if row["chain"] else {"scope": row["scope"]}
                row["locked"] = _locks(cfg, str(winner["scope"]), row["key"], catalog)
                continue
            lookup = row.pop("_lookup", row["key"])
            key = row["key"]
            source = row["source"]
            if section == "telemetry" and key.startswith("otel.") and telemetry_env and not source:
                scope = "env"  # an OTel record that does not name its variables
            else:
                scope = setting_scope(source, root)
            entries = cfg.setting_values.get(lookup) or cfg.setting_values.get(key) or []
            if entries:
                chain = [
                    {
                        "scope": e_scope or setting_scope(e_path, root),
                        "value": _safe_value(e_value),
                        "source": e_path,
                        "line": line_of(e_path, e_key),
                    }
                    for e_scope, e_value, e_path, e_key in entries
                ]
                wins = len(chain) - 1
                for i in range(len(chain) - 1, -1, -1):
                    if chain[i]["value"] == row["value"]:
                        wins = i
                        break
                winner = chain[wins]
                if winner["source"] == source and source:
                    scope = str(winner["scope"])  # the layer the parser named, e.g. a redirected managed file
                if winner["source"] == source or source in SCOPES or not source:
                    line = winner["line"]
                else:
                    line = line_of(source, entries[wins][3])
            else:
                file_key = "" if key in _NO_FILE_KEY or key.startswith("otel.") else _FILE_KEYS.get(key, key)
                line = line_of(source, file_key)
                chain = [{"scope": scope, "value": _safe_value(row["value"]), "source": source, "line": line}]
                wins = 0
            row["scope"] = scope
            row["line"] = line
            row["chain"] = chain
            row["wins"] = wins
            file_key = _row_file_key(cfg, lookup, key, entries, wins)
            entry = catalog.get(file_key) or {}
            if entry:
                if not row["note"] and entry.get("description"):
                    row["note"] = str(entry["description"])
                if not row["danger"]:
                    bad, bad_note = _catalog_danger(entry, row["value"])
                    if bad:
                        row["danger"] = True
                        row["note"] = bad_note or row["note"]
            row["locked"] = _locks(cfg, str(chain[wins]["scope"]), file_key, catalog)
            is_set = row.pop("_set", None)
            row["set"] = scope != "default" if is_set is None else bool(is_set)
            row["documented"] = bool(row.pop("_documented", True)) or bool(entry)
            if not row["set"]:
                # An unset knob has nothing behind it; the one default entry is implied by the row itself.
                row["chain"] = []
                row["wins"] = 0


def normalize_sections(cfg: ToolConfig, texts: dict[str, str | None] | None = None) -> list[dict]:
    """Build the uniform section list for one tool.

    Rows come, in order of precedence, from: the model, telemetry, configurable
    models, MCP servers, extensions and startup fields; feature_groups; flat
    settings; and flat features (only when the tool has no feature_groups).
    Feature-group rows are all kept. A flat row is dropped when its normalized
    key was already seen, when it is in cfg.covered_keys, when it is an OTel
    setting already shown by the telemetry rows, or when its key names a credential.

    Every row also gets its scope, the line of its key in its source file (0
    when unknown), the chain of values across scopes and the index of the
    winning entry. *texts* keeps file texts between calls, so each config file
    is read once per collect; no text is kept in the result.
    """
    first_file = cfg.config_files[0] if cfg.config_files else ""
    rows: dict[str, list[dict]] = {sid: [] for sid, _t in SECTION_ORDER}
    seen: set[str] = set()
    catalog = settings_catalog(cfg.tool)

    def add(section: str, row: dict) -> None:
        rows[section].append(row)
        seen.add(normalize_key(row["key"]))

    def source_of(key: str) -> str:
        return cfg.setting_sources.get(key, first_file)

    # Model
    if cfg.model:
        add("model", _row("model", cfg.model, source_of("model"), label="Model"))
    for entry in cfg.configurable_models:
        key = str(entry.get("key", ""))
        add(
            "model",
            _row(
                key,
                entry.get("value"),
                str(entry.get("source", "")),
                label=str(entry.get("label", "")),
                note=str(entry.get("description", "")),
            ),
        )

    # Agents: rows the parser already finished.
    for row in cfg.agent_rows:
        add("agents", dict(row, _done=True))

    # Telemetry
    otel = cfg.otel.to_dict()
    telemetry_flat = [k for k in cfg.settings if _key_section(k) == "telemetry" and k not in cfg.generic_keys]
    if otel:
        otel_src = _otel_source_file(cfg, first_file)
        names = cfg.otel.env_names

        def otel_source(attr: str) -> str:
            # A value from an environment variable names it; the rest follow the variable that turned export on.
            name = names.get(attr) or (names.get("enabled") if cfg.otel.source == "env-var" else "")
            return env_source(name) if name else otel_src

        add("telemetry", _row("otel.enabled", cfg.otel.enabled, otel_source("enabled"), label="Export enabled"))
        for attr, label in (
            ("exporter", "Exporter"),
            ("endpoint", "Endpoint"),
            ("file_path", "File path"),
            ("capture_content", "Capture content"),
            ("source", "Detected from"),
        ):
            if attr in otel:
                add("telemetry", _row("otel." + attr, otel[attr], otel_source(attr), label=label))
    elif telemetry_flat:
        key = telemetry_flat[0]
        add("telemetry", _row(key, False, source_of(key), label="Telemetry", note="Telemetry: off."))
    if otel or telemetry_flat:
        seen.update(normalize_key(k) for k in telemetry_flat)

    # MCP, extensions, startup
    if cfg.mcp_servers:
        mcp_files = [f for f in cfg.config_files if "mcp" in Path(f).name.lower()]
        add("mcp", _row("mcp_servers", list(cfg.mcp_servers), mcp_files[0] if mcp_files else "", label="MCP servers"))
    if cfg.extensions and "extensions" not in cfg.covered_keys:
        add("extensions", _row("extensions", list(cfg.extensions), cfg.setting_sources.get("extensions", "")))
    if cfg.auto_update is not None:
        auto_src = cfg.setting_sources.get("auto_update", "")
        add("startup", _row("auto_update", cfg.auto_update, auto_src, label="Auto update"))
    if cfg.launch_at_startup is not None:
        add("startup", _row("launch_at_startup", cfg.launch_at_startup, "", label="Launch at startup"))

    # Feature groups: every row kept, except a repeat of a key in the same section.
    for group, values in cfg.feature_groups.items():
        section = _GROUP_SECTIONS.get(group, "other")
        in_section = {normalize_key(r["key"]) for r in rows[section]}
        for key, value in (values or {}).items():
            norm = normalize_key(key)
            if norm in in_section or _SECRET_RE.search(norm) or key.startswith("secret://"):
                continue
            in_section.add(norm)
            # A bare "enabled" key is named after its group, e.g. "Debug logging enabled".
            label = f"{setting_label(group)} enabled" if norm == "enabled" else ""
            qualified = f"{group}/{key}"
            src = cfg.setting_sources[qualified] if qualified in cfg.setting_sources else source_of(key)
            row = _row(key, value, src, label=label)
            row["_lookup"] = qualified
            add(section, row)

    # Flat settings, then flat features when there are no groups.
    covered = set(cfg.covered_keys)
    flat: list[tuple[str, object]] = list(cfg.settings.items())
    if not cfg.feature_groups:
        flat += list(cfg.features.items())
    for key, value in flat:
        norm = normalize_key(key)
        if key in covered or norm in seen or _SECRET_RE.search(norm) or key.startswith("secret://"):
            continue
        entries = cfg.setting_values.get(key) or []
        entry = catalog.get(_row_file_key(cfg, key, key, entries, len(entries) - 1)) or {}
        section = cfg.key_sections.get(key) or _catalog_section(entry) or _key_section(key)
        if section == "telemetry" and (otel or key not in cfg.generic_keys):
            continue  # shown by the telemetry rows above
        note = cfg.key_notes.get(key) or ("Workspace override" if key.startswith("ws:") else "")
        label = cfg.key_labels.get(key) or _table_label(key) or str(entry.get("label") or "")
        row = _row(key, value, source_of(key), label=label, note=note)
        if key in cfg.generic_keys and key not in cfg.key_labels:
            row["_documented"] = False  # catalog entries mark it documented in _finish_rows
        add(section, row)

    # Catalog keys no file sets: shown with their default so every knob is visible.
    shown = {fk for sid in rows for r in rows[sid] for fk in _row_file_keys(cfg, r)}
    for ckey, entry in catalog.items():
        if ckey in shown or normalize_key(ckey) in seen or _SECRET_RE.search(normalize_key(ckey)):
            continue
        if ckey.startswith("env.") and _ENV_NAME_RE.match(ckey[4:]):
            continue  # an environment variable: listed in env_vars, with whether it is set

        default = entry.get("default")
        section = _catalog_section(entry) or _key_section(ckey)
        row = _row(ckey, default, "", label=str(entry.get("label") or ""))
        if default is None:
            row["kind"] = _CATALOG_KINDS.get(str(entry.get("type") or ""), "text")
        row["_set"] = False
        add(section, row)

    _finish_rows(cfg, rows, {} if texts is None else texts, catalog)
    return [{"id": sid, "title": title, "rows": rows[sid]} for sid, title in SECTION_ORDER if rows[sid]]


_CATALOG_KINDS = {
    "boolean": "flag",
    "bool": "flag",
    "number": "number",
    "integer": "number",
    "list": "list",
    "array": "list",
    "map": "map",
    "object": "map",
}
_SECTION_IDS = frozenset(sid for sid, _t in SECTION_ORDER)


def _catalog_section(entry: dict) -> str:
    """Section a catalog entry names; "agents" holds only agent rows, so a setting there uses the keyword rule."""
    section = str(entry.get("section") or "")
    return section if section in _SECTION_IDS and section != "agents" else ""


def _table_label(key: str) -> str:
    """Label from the curated label table, or "" when the key has none."""
    bare = key.removeprefix("ws:")
    for candidate in (bare, _strip_prefixes(bare)):
        if candidate in _LABELS:
            return _LABELS[candidate]
    return ""


def _row_file_keys(cfg: ToolConfig, row: dict) -> set[str]:
    """Every key as written in a file that a row shows."""
    lookup = row.get("_lookup", row["key"])
    keys = {row["key"].removeprefix("ws:"), _FILE_KEYS.get(row["key"], row["key"])}
    if lookup in cfg.file_keys:
        keys.add(cfg.file_keys[lookup])
    for e in cfg.setting_values.get(lookup) or cfg.setting_values.get(row["key"]) or []:
        keys.add(str(e[3]))
    return keys


def _record(
    cfg: ToolConfig,
    row_key: str,
    file_key: str,
    layers: list[tuple[str, dict | None, Path]],
    value_fn: Callable[[object], object] | None = None,
) -> None:
    """Note the value of *file_key* in each parsed file, lowest priority first."""
    for scope, data, path in layers:
        if isinstance(data, dict) and file_key in data:
            value = data[file_key] if value_fn is None else value_fn(data[file_key])
            cfg.setting_values.setdefault(row_key, []).append((scope, value, str(path), file_key))


def _read_json(path: Path) -> dict | None:
    """Parsed JSON of *path*; a file that is not strict JSON is retried without its ``//`` comment lines."""
    if not path.is_file():
        return None
    try:
        text = path.read_text(errors="replace", encoding="utf-8")
    except OSError:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    stripped = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("//"))
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        return None


def _read_toml(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        import tomllib
    except ModuleNotFoundError:
        try:
            import tomli as tomllib  # type: ignore[no-redef]
        except ModuleNotFoundError:
            return None
    try:
        with open(path, "rb") as f:
            return tomllib.load(f)
    except (OSError, tomllib.TOMLDecodeError):
        return None


def _pick(get_fn: Callable, pairs: list[tuple[str, str]]) -> dict:
    """Build a dict from (source_key, dest_label) pairs, skipping None values."""
    return {dst: v for src, dst in pairs if (v := get_fn(src)) is not None}


# ─── Settings catalog, every-key reading, scopes and agents ────

SETTINGS_CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "settings-catalog.yaml"
_catalog_cache: tuple[str, float, dict[str, dict[str, dict]]] | None = None


def settings_catalog(tool: str) -> dict[str, dict]:
    """Catalog entries of *tool* by key as written in the file.

    Empty when the catalog file is missing or cannot be parsed. The file is
    parsed again only when its modification time changes.
    """
    global _catalog_cache
    path = SETTINGS_CATALOG_PATH
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return {}
    if _catalog_cache is None or _catalog_cache[0] != str(path) or _catalog_cache[1] != mtime:
        tools: dict[str, dict[str, dict]] = {}
        try:
            import yaml

            with open(path, encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
        except Exception:  # noqa: BLE001 - an unreadable catalog is an empty one
            data = {}
        spec = data.get("tools") if isinstance(data, dict) else None
        for tool_id, tool_spec in (spec if isinstance(spec, dict) else {}).items():
            keys = tool_spec.get("keys") if isinstance(tool_spec, dict) else None
            tools[str(tool_id)] = {
                str(e["key"]): e for e in (keys if isinstance(keys, list) else []) if isinstance(e, dict) and e.get("key")
            }
        _catalog_cache = (str(path), mtime, tools)
    return _catalog_cache[2].get(tool) or _catalog_cache[2].get(_CATALOG_FALLBACK.get(tool, ""), {})


# ─── Environment variables ──────────────────────────────────────
# The catalog of variables a tool reads is its ``env.<NAME>`` entries in
# settings-catalog.yaml (from each tool's documentation). Variables that are set
# and start with one of the tool's prefixes are listed too, as undocumented.
_ENV_PREFIXES: dict[str, tuple[str, ...]] = {
    "copilot-cli": ("COPILOT_",),
    "copilot-desktop": ("COPILOT_",),
    "copilot": ("COPILOT_OTEL_",),
    "vscode": ("COPILOT_OTEL_",),
    "claude-code": ("ANTHROPIC_", "CLAUDE_CODE_", "CLAUDE_"),
    "codex-cli": ("CODEX_", "OPENAI_"),
    "cursor": ("CURSOR_",),
    "gemini-cli": ("GEMINI_",),
}
_ENV_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
# A variable whose name says it holds a credential, or whose value can carry one.
_ENV_SECRET_RE = re.compile(r"TOKEN|KEY|SECRET|PASSWORD|PASSWD|AUTH|CREDENTIAL|HEADERS|COOKIE|EMAIL", re.I)
ENV_MASK = "<hidden>"
ENV_VALUE_MAX = 300


# VS Code's own AI settings and the Copilot Chat extension read the same variables.
_ENV_CATALOG_OF = {"vscode": "copilot"}


def env_catalog(tool: str) -> dict[str, dict]:
    """Documented environment variables of *tool*, by name, in catalog order."""
    return {
        key[4:]: entry
        for key, entry in settings_catalog(_ENV_CATALOG_OF.get(tool, tool)).items()
        if key.startswith("env.") and _ENV_NAME_RE.match(key[4:])
    }


def _related(tool: str, name: str) -> bool:
    prefixes = _ENV_PREFIXES.get(tool, ())
    return bool(prefixes) and name.startswith(prefixes)


def env_names_of(tool: str, environ: dict[str, str] | None = None) -> list[str]:
    """The catalog's names, then set variables with one of the tool's prefixes."""
    environ = os.environ if environ is None else environ
    names = list(env_catalog(tool))
    return names + sorted(n for n in environ if _related(tool, n) and n not in names)


def env_display(name: str, value: object) -> tuple[str, bool]:
    """(text to show, masked): a credential name or a secret-shaped value is never shown."""
    from ..context_audit import _redact

    text = str(value)
    if _ENV_SECRET_RE.search(name) or _redact(text) != text:
        return ENV_MASK, True
    return text[:ENV_VALUE_MAX], False


def env_var_rows(
    cfg: ToolConfig,
    persisted: dict[str, dict[str, str]] | None = None,
    environ: dict[str, str] | None = None,
) -> list[dict]:
    """Every environment variable *cfg*'s tool reads: set ones first, each group in catalog order.

    *persisted* is ``context_audit._persistent_env()``: values a shell profile
    or the registry sets for new shells, by origin; ``cfg.env_blocks`` are the
    values a settings file sets for the tool's sessions. ``persisted`` lists
    both, each with its ``kind``. ``drives`` names the rows whose chain has an
    entry from the variable.
    """
    environ = os.environ if environ is None else environ
    persisted = persisted or {}
    catalog = env_catalog(cfg.tool)
    drives: dict[str, list[dict]] = {}
    for section in cfg.sections:
        for row in section.get("rows") or []:
            sources = {str(c.get("source") or "") for c in row.get("chain") or []} | {str(row.get("source") or "")}
            for src in sorted(sources):
                if src.startswith(ENV_SOURCE):
                    drives.setdefault(src[len(ENV_SOURCE) :], []).append(
                        {"key": row["key"], "label": row.get("label") or row["key"]}
                    )
    names = env_names_of(cfg.tool, environ)
    names += [n for n in drives if n not in names]
    names += sorted({n for values in persisted.values() for n in values if _related(cfg.tool, n) and n not in names})
    names += sorted({n for values in cfg.env_blocks.values() for n in values if n not in names})
    out = []
    for name in names:
        entry = catalog.get(name) or {}
        here = environ.get(name)
        saved = [
            {"origin": origin, "kind": kind, "value": env_display(name, values[name])[0]}
            for kind, origins in (("settings", cfg.env_blocks), ("persisted", persisted))
            for origin, values in origins.items()
            if name in values
        ]
        later = [v[name] for v in [*cfg.env_blocks.values(), *persisted.values()] if name in v]
        raw = here if here is not None else (later[0] if later else None)
        value, masked = env_display(name, raw) if raw is not None else ("", False)
        out.append(
            {
                "name": name,
                "set": raw is not None,
                "value": value,
                "masked": masked,
                "source": env_source(name),
                "in_process": here is not None,
                "persisted": saved,
                "drives": drives.get(name, []),
                "label": str(entry.get("label") or name),
                "description": str(entry.get("description") or ""),
                "section": str(entry.get("section") or ""),
                "documented": bool(entry),
            }
        )
    out.sort(key=lambda e: not e["set"])  # stable sort: set first
    return out


def env_scope_fill(cfg: ToolConfig) -> None:
    """Name on the Environment layer every set variable of the tool, in this process or persisted."""
    names = [e["name"] for e in cfg.env_vars if e["set"]]
    for scope in cfg.scopes:
        if scope.get("id") == "env":
            head = _env_scope_head(list(scope.get("vars") or []))
            note = str(scope.get("note") or "")
            _env_scope_text(scope, names, note[len(head) :].strip() if note.startswith(head) else note)


# Tools that read another tool's settings file use that tool's catalog when they have none.
_CATALOG_FALLBACK = {"copilot-desktop": "copilot-cli"}


# An object with more keys than this is one map row instead of one row per key.
MAP_ROW_MAX_KEYS = 12
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
# Object keys never read at any depth: their values can hold credentials or commands.
_SKIP_SEGMENTS = frozenset({"env", "headers", "http_headers", "env_http_headers", "mcpServers", "mcp_servers"})


def _secret_name(name: object) -> bool:
    return bool(_SECRET_RE.search(re.sub(r"[^a-z0-9]", "", str(name).lower())))


def _scrub(value: object) -> object:
    """*value* with credential-named object keys removed, at any depth."""
    if isinstance(value, dict):
        return {k: _scrub(v) for k, v in value.items() if not _secret_name(k) and k not in _SKIP_SEGMENTS}
    if isinstance(value, list):
        return [_scrub(v) for v in value]
    return value


def flatten_settings(
    data: dict,
    skip: tuple[str, ...] | frozenset[str] = (),
    whole: tuple[str, ...] | frozenset[str] = (),
    open_keys: tuple[str, ...] | frozenset[str] = (),
    prefix: str = "",
) -> dict[str, object]:
    """Nested settings as dotted keys, e.g. ``{"sandbox": {"allowBypass": true}}`` -> ``sandbox.allowBypass``.

    Lists stay one value. An object stays one value (a map row) when it has more
    than MAP_ROW_MAX_KEYS keys, when one of its keys is a name rather than an
    identifier (a plugin id, a model id, a path), or when it is named in
    *whole*; an object named in *open_keys* is always split. Keys in *skip*,
    keys named like credentials, the _SKIP_SEGMENTS keys and ``auth`` command
    objects are left out.
    """
    out: dict[str, object] = {}
    for k, v in data.items():
        key = f"{prefix}{k}"
        if key in skip or k in _SKIP_SEGMENTS or _secret_name(k):
            continue
        if isinstance(v, dict) and "command" in v and "args" in v and k == "auth":
            continue  # a command that prints a credential; its arguments can hold one
        split = key in open_keys or (
            len(v) <= MAP_ROW_MAX_KEYS and key not in whole and all(_IDENT_RE.match(str(n)) for n in v)
            if isinstance(v, dict)
            else False
        )
        if isinstance(v, dict) and v and split:
            out.update(flatten_settings(v, skip, whole, open_keys, key + "."))
        else:
            out[key] = _scrub(v)
    return out


Layer = tuple[str, "dict | None", "Path | str"]


def _add_layers(
    cfg: ToolConfig,
    layers: list[Layer],
    *,
    skip: tuple[str, ...] = (),
    whole: tuple[str, ...] = (),
    open_keys: tuple[str, ...] = (),
    exclude: set[str] | frozenset[str] = frozenset(),
    prefixes: tuple[str, ...] = (),
    flatten: bool = True,
    value_fns: dict[str, Callable[[object], object]] | None = None,
) -> None:
    """Read every key of every layer (lowest precedence first) as a flat setting with its chain.

    Keys the parser already handled (in cfg.settings, cfg.setting_values or
    cfg.covered_keys, or in *exclude*) are left alone. With *prefixes*, only
    keys starting with one of them are read. With ``flatten=False`` the keys of
    the layer are used as they are (VS Code settings are already dotted).
    """
    fns = value_fns or {}
    taken = set(cfg.settings) | set(cfg.setting_values) | set(cfg.covered_keys) | set(exclude)
    per_key: dict[str, list[tuple[str, object, str, str]]] = {}
    for scope, data, path in layers:
        if not isinstance(data, dict):
            continue
        if flatten:
            flat = flatten_settings(data, skip, whole, open_keys)
        else:
            flat = {
                k: _scrub(v)
                for k, v in data.items()
                if k not in skip and not _secret_name(k.rsplit(".", 1)[-1])
            }
        for key, value in flat.items():
            if key in taken or (prefixes and not key.startswith(prefixes)):
                continue
            fn = fns.get(key)
            per_key.setdefault(key, []).append((scope, fn(value) if fn else value, str(path), key))
    for key, entries in per_key.items():
        cfg.setting_values[key] = entries
        cfg.settings[key] = entries[-1][1]
        cfg.setting_sources[key] = entries[-1][2]
        cfg.generic_keys.add(key)


def _effective(layers: list[Layer], key: str) -> tuple[object, str, str] | None:
    """(value, scope, path) of *key* in the highest layer that sets it."""
    for scope, data, path in reversed(layers):
        if isinstance(data, dict) and key in data:
            return data[key], scope, str(path)
    return None


def _fixed_file(path: Path) -> bool:
    """A managed, system or policy file that exists and is not a symbolic link."""
    try:
        return not os.path.islink(path) and path.is_file()
    except OSError:
        return False


def _program_dir(var: str, default: str) -> Path:
    return Path(os.environ.get(var) or default)


def _per_os(windows: list[Path], macos: list[Path], linux: list[Path]) -> list[Path]:
    return windows if IS_WINDOWS else macos if IS_MACOS else linux


# Managed and system files per tool, for this OS. Module-level so they can be redirected.
COPILOT_MANAGED_FILES: list[Path] = _per_os(
    [_program_dir("ProgramFiles", r"C:\Program Files") / "GitHubCopilot" / "managed-settings.json"],
    [Path("/Library/Application Support/GitHubCopilot/managed-settings.json")],
    [Path("/etc/github-copilot/managed-settings.json")],
)
# Managed Copilot keys that are floors: they win over every other scope.
COPILOT_FLOOR_KEYS: tuple[str, ...] = ("sandbox", "permissions.disableBypassPermissionsMode")

CLAUDE_MANAGED_FILES: list[Path] = _per_os(
    [_program_dir("ProgramFiles", r"C:\Program Files") / "ClaudeCode" / "managed-settings.json"],
    [Path("/Library/Application Support/ClaudeCode/managed-settings.json")],
    [Path("/etc/claude-code/managed-settings.json")],
)
CLAUDE_MANAGED_DIRS: list[Path] = _per_os([], [Path("/Library/Application Support/ClaudeCode/managed-settings.d")], [])
CLAUDE_POLICY_REGISTRY = r"SOFTWARE\Policies\ClaudeCode"

CODEX_SYSTEM_FILES: list[Path] = _per_os([], [Path("/etc/codex/config.toml")], [Path("/etc/codex/config.toml")])
CODEX_REQUIREMENTS_FILES: list[Path] = _per_os(
    [_program_dir("ProgramData", r"C:\ProgramData") / "OpenAI" / "Codex" / "requirements.toml"],
    [Path("/etc/codex/requirements.toml"), Path("/etc/codex/managed_config.toml")],
    [Path("/etc/codex/requirements.toml"), Path("/etc/codex/managed_config.toml")],
)

# VS Code policy files probed on this OS; macOS policies come from configuration profiles and are not probed.
VSCODE_POLICY_FILES: list[Path] = _per_os([], [], [Path("/etc/vscode/policy.json")])
VSCODE_POLICY_REGISTRY = r"SOFTWARE\Policies\Microsoft\VSCode"


def _hklm_value_names(subkey: str) -> list[str] | None:
    """Value names under ``HKLM\\<subkey>``; None when the key is missing or this is not Windows."""
    if not IS_WINDOWS:
        return None
    try:
        import winreg  # type: ignore[import-not-found]
    except ImportError:
        return None
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, subkey) as handle:
            names: list[str] = []
            index = 0
            while True:
                try:
                    names.append(str(winreg.EnumValue(handle, index)[0]))
                except OSError:
                    return names
                index += 1
    except OSError:
        return None


def _hklm_string(subkey: str, name: str) -> str | None:
    """String value *name* under ``HKLM\\<subkey>``; None when absent or not on Windows."""
    if not IS_WINDOWS:
        return None
    try:
        import winreg  # type: ignore[import-not-found]

        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, subkey) as handle:
            value, _kind = winreg.QueryValueEx(handle, name)
    except (ImportError, OSError):
        return None
    return value if isinstance(value, str) else None


def _scope(sid: str, path: Path | str, exists: bool, note: str = "", label: str = "") -> dict:
    return {
        "id": sid,
        "label": label or SCOPE_LABELS.get(sid, sid),
        "path": str(path),
        "exists": bool(exists),
        "changeable": sid not in FIXED_SCOPES,
        "note": note,
    }


def _env_scope(tool: str, note: str = "") -> dict:
    """The Environment layer: no file, so no path; ``vars`` names the variables of *tool* that are set.

    collect_tool_configs() adds the variables persisted for new shells (env_scope_fill).
    """
    scope = _scope("env", "", False)
    _env_scope_text(scope, [n for n in env_names_of(tool) if os.environ.get(n)], note)
    return scope


def _env_scope_head(names: list[str]) -> str:
    return f"{len(names)} set: {', '.join(names)}." if names else "No variable of this tool is set."


def _env_scope_text(scope: dict, names: list[str], note: str) -> None:
    scope["vars"] = names
    scope["exists"] = bool(names)
    scope["note"] = f"{_env_scope_head(names)} {note}".strip()


def _file_scope(sid: str, path: Path, note: str = "", label: str = "") -> dict:
    return _scope(sid, path, path.is_file(), note, label)


def _first_fixed(paths: list[Path]) -> Path | None:
    return next((p for p in paths if _fixed_file(p)), None)


def _vscode_policy_scope() -> dict:
    if IS_WINDOWS:
        names = _hklm_value_names(VSCODE_POLICY_REGISTRY)
        note = f"{len(names)} policy values" if names else ""
        return _scope("policy", "HKLM\\" + VSCODE_POLICY_REGISTRY, names is not None, note)
    if not VSCODE_POLICY_FILES:
        return _scope("policy", "configuration profiles", False, "Not checked: policies come from configuration profiles.")
    found = _first_fixed(VSCODE_POLICY_FILES)
    if not found:
        return _scope("policy", VSCODE_POLICY_FILES[0], False)
    data = _read_json(found)
    count = len(data) if isinstance(data, dict) else 0
    return _scope("policy", found, True, f"{count} policies")


_SCOPE_RANK = {sid: i for i, sid in enumerate(("system", "user", "profile", "project", "project-local", "workspace", "env", "cli", "policy", "managed"))}


def _scopes_from_files(cfg: ToolConfig) -> list[dict]:
    """Scope list for a tool whose parser names none: one entry per config file, lowest precedence first."""
    out = []
    for f in cfg.config_files:
        sid = setting_scope(f, cfg.project_root)
        if sid != "default":
            out.append(_scope(sid, f, Path(f).is_file()))
    return sorted(out, key=lambda e: _SCOPE_RANK.get(e["id"], 0))


# ── Agents ──────────────────────────────────────────────────────

AGENT_FILE_MAX_BYTES = 64 * 1024
AGENT_FILES_MAX = 200
_AGENT_KEYS = (
    "name",
    "description",
    "model",
    "model-policy",
    "modelPolicy",
    "reasoning-effort",
    "reasoningEffort",
    "effort",
    "context-tier",
    "contextTier",
    "tools",
    "target",
)


def _read_head(path: Path) -> str:
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read(AGENT_FILE_MAX_BYTES)
    except OSError:
        return ""


def _text_of(value: object) -> str:
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return str(value).strip() if value is not None else ""


def _tool_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [t.strip() for t in value.strip("[]").split(",") if t.strip()]
    return []


def _agent_file(path: Path, scope: str) -> dict | None:
    """Agent definition from a Markdown file with YAML front matter or a TOML file."""
    if path.suffix == ".toml":
        data = _read_toml(path) or {}
        text = _read_head(path)
        fields = {k: data[k] for k in ("name", "description", "model", "model_reasoning_effort", "tools") if k in data}
        if "model_reasoning_effort" in fields:
            fields["reasoning-effort"] = fields.pop("model_reasoning_effort")
        line = find_key_line(text, "model") if "model" in fields else 0
    else:
        from ..effective_config import frontmatter_fields

        found = frontmatter_fields(_read_head(path), _AGENT_KEYS)
        fields = {k: v for k, (v, _line) in found.items()}
        line = found["model"][1] if "model" in found else 0
    stem = path.name.removesuffix(".agent.md").removesuffix(".md").removesuffix(".toml")
    return {
        "name": _text_of(fields.get("name")) or stem,
        "fields": fields,
        "path": str(path),
        "scope": scope,
        "line": line or 1,
    }


def _agent_files(folders: list[tuple[Path, str, tuple[str, ...]]]) -> dict[str, dict]:
    """Agent definitions by name. *folders* go lowest precedence first: (folder, scope, file patterns)."""
    out: dict[str, dict] = {}
    count = 0
    for folder, scope, patterns in folders:
        if not folder.is_dir():
            continue
        files: list[Path] = []
        for pattern in patterns:
            try:
                files.extend(p for p in sorted(folder.glob(pattern)) if p.is_file() and p not in files)
            except OSError:
                continue
        for path in files:
            if count >= AGENT_FILES_MAX:
                return out
            agent = _agent_file(path, scope)
            if agent:
                out[agent["name"]] = agent
                count += 1
    return out


def _first_field(fields: dict, *names: str) -> object:
    for name in names:
        if name in fields:
            return fields[name]
    return None


def _agent_row(
    cfg: ToolConfig,
    name: str,
    defined: dict | None,
    pins: list[dict],
    inherits_from: str,
    fallback: tuple[str, str] | None = None,
) -> dict:
    """One finished "agents" row.

    *defined* is the agent file (or None); *pins* are the settings entries that
    pin the agent, lowest precedence first, each {scope, path, line, values};
    *fallback* is (variable, value) of an environment variable used when no
    file or pin names a model. A pin wins over the file's model unless the
    file's model policy is "required"; "inherit" or no model means the agent
    uses *inherits_from*.
    """
    fields = defined["fields"] if defined else {}
    file_model = fields.get("model")
    file_model_text = _text_of(file_model)
    policy = _text_of(_first_field(fields, "model-policy", "modelPolicy"))
    pin = pins[-1] if pins else None
    pin_values = pin["values"] if pin else {}
    pin_model = _text_of(pin_values.get("model"))
    required = policy.lower() == "required" and bool(file_model_text) and file_model_text != "inherit"

    chain: list[dict] = []
    if fallback:
        chain.append({"scope": "env", "value": fallback[1], "source": env_source(fallback[0]), "line": 0})
    file_index = -1
    if defined:
        file_index = len(chain)
        chain.append(
            {"scope": defined["scope"], "value": file_model, "source": defined["path"], "line": defined["line"]}
        )
    pin_indexes = []
    for p in pins:
        if "model" in p["values"]:
            pin_indexes.append(len(chain))
            chain.append({"scope": p["scope"], "value": p["values"]["model"], "source": p["path"], "line": p["line"]})

    note = ""
    if pin_model and pin_indexes and not required:
        model, wins = pin_model, pin_indexes[-1]
    elif file_model_text:
        model, wins = file_model_text, file_index
        if required and pin_model:
            note = "The agent file's model policy is required, so the settings pin is not used."
    elif fallback:
        model, wins = fallback[1], 0
        note = f"No model in the agent file; {fallback[0]} sets it."
    else:
        model, wins = "", file_index if file_index >= 0 else (pin_indexes[-1] if pin_indexes else 0)
    inherits = not model or model == "inherit"
    if inherits:
        note = f"Inherits {inherits_from}."
    if not chain:
        chain.append({"scope": pin["scope"] if pin else "default", "value": None, "source": "", "line": 0})
        wins = 0
    winner = chain[wins]
    effort = _text_of(pin_values.get("effortLevel")) or _text_of(
        _first_field(fields, "reasoning-effort", "reasoningEffort", "effort")
    )
    context_tier = _text_of(pin_values.get("contextTier")) or _text_of(_first_field(fields, "context-tier", "contextTier"))
    description = _text_of(fields.get("description"))
    agent = {
        "name": name,
        "description": description[:300],
        "model": "" if inherits else model,
        "model_policy": policy or _text_of(pin_values.get("modelPolicy")),
        "effort": effort,
        "context_tier": context_tier,
        "tools": _tool_list(fields.get("tools")),
        "target": _text_of(fields.get("target")),
        "defined_in": defined["path"] if defined else "",
        "defined_line": defined["line"] if defined else 0,
        "pinned_in": pin["path"] if pin else "",
        "pinned_line": pin["line"] if pin else 0,
        "inherits": inherits,
        "scope_defined": defined["scope"] if defined else "",
        "scope_pinned": pin["scope"] if pin else "",
    }
    return {
        "key": f"agent/{name}",
        "label": name,
        "value": "inherits" if inherits else model,
        "kind": "agent",
        "source": str(winner["source"]),
        "danger": False,
        "note": note,
        "scope": str(winner["scope"]),
        "line": int(winner["line"]),
        "chain": [dict(e, value=_safe_value(e["value"])) for e in chain],
        "wins": wins,
        "locked": False,
        "set": True,
        "documented": True,
        "agent": agent,
    }


def _settings_pins(layers: list[Layer], texts: dict[str, str]) -> dict[str, list[dict]]:
    """``subagents.agents.<name>`` entries per agent, lowest precedence first."""
    out: dict[str, list[dict]] = {}
    for scope, data, path in layers:
        agents = ((data or {}).get("subagents") or {}).get("agents") if isinstance(data, dict) else None
        if not isinstance(agents, dict):
            continue
        for name, values in agents.items():
            if not isinstance(values, dict):
                continue
            path_s = str(path)
            if path_s not in texts:
                texts[path_s] = _read_head(Path(path_s)) if path_s else ""
            field_name = "model" if "model" in values else next(iter(values), "")
            line = _nested_json_line(texts[path_s], ["subagents", "agents", str(name), field_name]) if field_name else 0
            if not line:
                line = _nested_json_line(texts[path_s], ["subagents", "agents", str(name)])
            keep = {k: values[k] for k in ("model", "modelPolicy", "effortLevel", "contextTier") if k in values}
            out.setdefault(str(name), []).append({"scope": scope, "path": path_s, "line": line, "values": keep})
    return out


def _main_model_text(model: str, default: str) -> str:
    return f"the main model ({model})" if model else default


# ─── macOS login item / launch agent detection ──────────────────


def _count_md_agents(root: Path, tool_dir: Path | None = None) -> int:
    """Count .agent.md and AGENTS.md files in root and tool_dir/agents/."""
    count = 0
    # Root files
    if (root / "AGENTS.md").is_file():
        count += 1
    if (root / ".agent.md").is_file():
        count += 1
    # Tool-specific agent dir
    if tool_dir and (tool_dir / "agents").is_dir():
        count += len([f for f in safe_iterdir(tool_dir / "agents") if f.suffix == ".md"])
    return count


_login_items_cache: tuple[float, set[str]] | None = None
_LOGIN_ITEMS_TTL_S = 3600.0


def _macos_login_items() -> set[str]:
    """Get macOS login items (app names); spawns osascript at most once per TTL."""
    global _login_items_cache
    now = time.monotonic()
    if _login_items_cache is not None and now - _login_items_cache[0] < _LOGIN_ITEMS_TTL_S:
        return _login_items_cache[1]
    items = _read_macos_login_items()
    _login_items_cache = (now, items)
    return items


def _read_macos_login_items() -> set[str]:
    if not IS_MACOS:
        return set()
    try:
        result = subprocess.run(
            ["osascript", "-e", 'tell application "System Events" to get the name of every login item'],
            capture_output=True,
            text=True,
            timeout=3,
        )
        return set(result.stdout.strip().split(", ")) if result.returncode == 0 else set()
    except Exception:
        return set()


def _mcp_server_names(data: dict | None) -> list[str]:
    """Extract MCP server names from a config dict with an 'mcpServers' key."""
    return list((data or {}).get("mcpServers", {}).keys())


def _finish(cfg: ToolConfig, has_data: bool) -> ToolConfig | None:
    """Generate hints, then return cfg if has_data, else None."""
    cfg.hints = _generate_hints(cfg)
    return cfg if has_data else None


def _find_extensions(ext_dir: Path, *keywords: str, limit: int | None = None) -> list[str]:
    """List extension directory names that match any of the given keywords."""
    exts = [d.name for d in safe_iterdir(ext_dir) if d.is_dir() and any(k in d.name.lower() for k in keywords)]
    return exts[:limit] if limit else exts


# ─── Generic OTel detection ─────────────────────────────────────


def _detect_otel_from_vscode_settings(settings: dict) -> OTelConfig:
    """Extract OTel config from VS Code settings dict (github.copilot.chat.otel.* keys)."""
    otel = OTelConfig(source="vscode-settings")
    otel.enabled = bool(settings.get("github.copilot.chat.otel.enabled", False))
    otel.exporter = str(settings.get("github.copilot.chat.otel.exporterType", ""))
    otel.endpoint = str(settings.get("github.copilot.chat.otel.otlpEndpoint", ""))
    otel.file_path = str(settings.get("github.copilot.chat.otel.outfile", ""))
    otel.capture_content = bool(settings.get("github.copilot.chat.otel.captureContent", False))
    # Also check env-var overrides
    if not otel.enabled and os.environ.get("COPILOT_OTEL_ENABLED", "").lower() in ("true", "1"):
        otel.enabled = True
        otel.source = "env-var"
        otel.env_names["enabled"] = "COPILOT_OTEL_ENABLED"
    if not otel.endpoint and os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        otel.endpoint = os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"]
        otel.env_names["endpoint"] = "OTEL_EXPORTER_OTLP_ENDPOINT"
    return otel


def _detect_otel_from_codex_toml(data: dict) -> OTelConfig:
    """Extract OTel config from Codex config.toml.

    Codex's schema is ``[otel] exporter = none | { otlp-http = { endpoint,
    protocol } } | { otlp-grpc = { endpoint } }`` (plus ``metrics_exporter``
    and ``trace_exporter`` in the same shape). There are no ``enabled`` /
    ``endpoint`` keys — an earlier aictl wrote and then "detected" those,
    reporting OTel active while Codex exported nothing.
    """
    otel_section = data.get("otel", {})
    otel = OTelConfig(source="codex-toml")
    if not isinstance(otel_section, dict) or not otel_section:
        return otel
    exporter = otel_section.get("exporter") or otel_section.get("metrics_exporter")
    if isinstance(exporter, dict) and exporter:
        kind, spec = next(iter(exporter.items()))
        otel.enabled = True
        otel.exporter = str(kind)
        if isinstance(spec, dict):
            otel.endpoint = str(spec.get("endpoint", ""))
    elif isinstance(exporter, str) and exporter and exporter != "none":
        otel.enabled = True
        otel.exporter = exporter
    otel.capture_content = bool(otel_section.get("log_user_prompt", False))
    return otel


def _read_aictl_env_file() -> dict[str, str]:
    """Env vars from ``~/.config/aictl/env.sh`` (``export K=V`` lines).

    The dashboard daemon is often launched from a GUI/service context whose
    environment never sourced the shell profile, so the process env alone
    can't tell whether ``aictl enable`` configured Claude Code's exporter.
    """
    path = Path.home() / ".config" / "aictl" / "env.sh"
    if not path.is_file():
        return {}
    out: dict[str, str] = {}
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line.strip())
            if m:
                out[m.group(1)] = m.group(2).strip().strip("'\"")
    except OSError:
        return {}
    return out


COPILOT_CLI_OTEL_VAR = "OTEL_EXPORTER_OTLP_ENDPOINT"
_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", "0.0.0.0"})


def copilot_cli_otel_endpoint(port: int | None, env: dict[str, str] | None = None) -> dict:
    """Whether Copilot CLI's OpenTelemetry export reaches aictl on *port*.

    Copilot CLI takes its endpoint from ``OTEL_EXPORTER_OTLP_ENDPOINT`` only; it
    ignores ``COPILOT_OTEL_ENDPOINT`` (VS Code's Copilot Chat reads that one). The
    value is the environment's, else ``~/.config/aictl/env.sh``'s, which new shells
    source. Returns ``{status: ok|missing|elsewhere, variable, value, source, text}``.
    """
    if env is None:
        file_env = _read_aictl_env_file()
        env = {**file_env, **os.environ}
        source = "environment" if COPILOT_CLI_OTEL_VAR in os.environ else ("~/.config/aictl/env.sh" if COPILOT_CLI_OTEL_VAR in file_env else "")
    else:
        source = "environment" if COPILOT_CLI_OTEL_VAR in env else ""
    value = str(env.get(COPILOT_CLI_OTEL_VAR) or "").strip()
    out = {"variable": COPILOT_CLI_OTEL_VAR, "value": value, "source": source}
    if not value:
        ignored = " COPILOT_OTEL_ENDPOINT is set, but Copilot CLI ignores it." if env.get("COPILOT_OTEL_ENDPOINT") else ""
        return {
            **out,
            "status": "missing",
            "text": f"Copilot CLI sends no OTel to aictl: {COPILOT_CLI_OTEL_VAR} is not set.{ignored} Run aictl enable, then open a new terminal.",
        }
    from urllib.parse import urlparse

    try:
        url = urlparse(value)
        host, at = (url.hostname or "").lower(), url.port
    except ValueError:
        host, at = "", None
    want = f"http://localhost:{port}" if port else "aictl"
    if host in _LOCAL_HOSTS and (port is None or at == port):
        return {**out, "status": "ok", "text": f"Copilot CLI sends its OTel to aictl: {COPILOT_CLI_OTEL_VAR}={value}."}
    return {
        **out,
        "status": "elsewhere",
        "text": f"Copilot CLI sends its OTel to {value}, not to aictl at {want}: {COPILOT_CLI_OTEL_VAR} points elsewhere.",
    }


def _detect_otel_from_claude() -> OTelConfig:
    """Detect whether Claude Code is configured to export OpenTelemetry.

    Claude Code exports only when ``CLAUDE_CODE_ENABLE_TELEMETRY=1`` and an
    ``OTEL_*_EXPORTER`` is set; the endpoint/protocol come from the standard
    ``OTEL_EXPORTER_OTLP_*`` variables. The mere presence of
    ``~/.claude/stats-cache.json`` (Claude's local usage cache, written on
    every install) used to count as "OTel enabled, built-in" — a green badge
    on every machine regardless of export configuration. The cache path is
    still reported as ``file_path`` so the Tool Config card can show it.
    """
    env = {**_read_aictl_env_file(), **os.environ}
    otel = OTelConfig(source="claude-env")
    stats = claude_global_dir() / "stats-cache.json"
    if stats.is_file():
        otel.file_path = str(stats)
    telemetry_on = env.get("CLAUDE_CODE_ENABLE_TELEMETRY", "").strip().lower() in ("1", "true")
    metrics_exp = env.get("OTEL_METRICS_EXPORTER", "").strip().lower()
    logs_exp = env.get("OTEL_LOGS_EXPORTER", "").strip().lower()
    active_exporters = [e for e in (metrics_exp, logs_exp) if e and e != "none"]
    if telemetry_on and active_exporters:
        otel.enabled = True
        protocol = env.get("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc").strip().lower()
        if "otlp" in active_exporters:
            otel.exporter = "otlp-grpc" if protocol == "grpc" else "otlp-http"
        else:
            otel.exporter = active_exporters[0]  # console / prometheus
        otel.endpoint = env.get("OTEL_EXPORTER_OTLP_ENDPOINT", "")
        otel.capture_content = env.get("OTEL_LOG_USER_PROMPTS", "").strip() in ("1", "true")
        otel.source = "env-var" if "CLAUDE_CODE_ENABLE_TELEMETRY" in os.environ else "aictl-env-file"
        names = {
            "enabled": "CLAUDE_CODE_ENABLE_TELEMETRY",
            "exporter": "OTEL_METRICS_EXPORTER" if metrics_exp else "OTEL_LOGS_EXPORTER",
            "endpoint": "OTEL_EXPORTER_OTLP_ENDPOINT",
            "capture_content": "OTEL_LOG_USER_PROMPTS",
        }
        otel.env_names = {k: n for k, n in names.items() if n in os.environ}
    return otel


def _generate_hints(cfg: ToolConfig) -> list[str]:
    """Generate actionable suggestions based on tool configuration state."""
    hints: list[str] = []

    # OTel hints
    if not cfg.otel.enabled:
        if cfg.tool == "claude-code":
            hints.append(
                "OTel export not configured — run `aictl enable` (sets CLAUDE_CODE_ENABLE_TELEMETRY "
                "+ OTEL_*_EXPORTER=otlp) and restart Claude Code"
            )
        elif cfg.tool == "copilot":
            hints.append(
                "OTel disabled — enable for verified token counts: "
                'set "github.copilot.chat.otel.enabled": true in VS Code settings'
            )
        elif cfg.tool == "codex-cli":
            hints.append("OTel not configured — set [otel] exporter in ~/.codex/config.toml for telemetry export")
    else:
        if cfg.otel.exporter == "file" and cfg.otel.file_path:
            hints.append(f"OTel active — writing to {cfg.otel.file_path}")
        elif cfg.otel.exporter in ("otlp-http", "otlp-grpc") and cfg.otel.endpoint:
            hints.append(f"OTel active — exporting to {cfg.otel.endpoint}")
        elif cfg.otel.exporter == "console":
            hints.append("OTel exporter is 'console' — telemetry logs to stdout only, not collected")
        elif cfg.otel.exporter == "built-in":
            pass  # Claude built-in stats — no hint needed
        elif cfg.otel.enabled:
            hints.append("OTel enabled")

    # Agent debug logging hints
    if cfg.features.get("agentDebugLog"):
        hints.append("Agent debug logging active — /troubleshoot available; fileLogging writes events to disk")
    if cfg.features.get("agentDebugLog_fileLogging") and not cfg.features.get("agentDebugLog"):
        hints.append("agentDebugLog.fileLogging enabled but agentDebugLog.enabled is false — no output will be written")

    # CLI mode hints
    if cfg.features.get("cli_autoCommit"):
        hints.append("CLI autoCommit enabled — agent will commit changes to git automatically after tool runs")
    if cfg.features.get("cli_worktreeIsolation") is False and cfg.features.get("cli_autoCommit"):
        hints.append("CLI worktree isolation disabled with autoCommit on — agent edits land directly in working tree")

    return hints


# ─── Tool-specific parsers ──────────────────────────────────────


def _permission_lists(value: object) -> object:
    if not isinstance(value, dict):
        return "configured"
    return {bucket: list(value.get(bucket) or []) for bucket in ("allow", "deny", "ask")}


def _claude_managed_layers() -> tuple[list[Layer], list[str], str]:
    """Managed Claude Code settings, lowest precedence first, the files read and the scope path shown."""
    layers: list[Layer] = []
    files: list[str] = []
    shown = str(CLAUDE_MANAGED_FILES[0]) if CLAUDE_MANAGED_FILES else ""
    for path in CLAUDE_MANAGED_FILES:
        if _fixed_file(path):
            layers.append(("managed", _read_json(path), path))
            files.append(str(path))
            shown = str(path)
    for folder in CLAUDE_MANAGED_DIRS:
        if os.path.islink(folder) or not folder.is_dir():
            continue
        for path in sorted(folder.glob("*.json")):
            if _fixed_file(path):
                layers.append(("managed", _read_json(path), path))
                files.append(str(path))
    raw = _hklm_string(CLAUDE_POLICY_REGISTRY, "Settings")
    if raw:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = None
        if isinstance(data, dict):
            layers.append(("managed", data, "HKLM\\" + CLAUDE_POLICY_REGISTRY))
            shown = shown or "HKLM\\" + CLAUDE_POLICY_REGISTRY
    return [layer for layer in layers if isinstance(layer[1], dict)], files, shown


def _parse_claude_code_config(root: Path, tool: str = "claude-code") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    # Global settings
    user_path = claude_global_dir() / "settings.json"
    account_path = Path.home() / ".claude.json"
    proj_path = root / ".claude" / "settings.json"
    local_path = root / ".claude" / "settings.local.json"
    settings = _read_json(user_path)
    if settings:
        cfg.config_files.append(str(user_path))
        for k in ("model", "effortLevel", "env", "hooks", "permissions"):
            cfg.setting_sources[k] = str(user_path)
        # ``model`` is the documented settings key (/model saves here);
        # ANTHROPIC_MODEL in the environment overrides any file.
        cfg.model = str(os.environ.get("ANTHROPIC_MODEL") or settings.get("model") or "")
        cfg.settings["effortLevel"] = settings.get("effortLevel", "default")
        for k in ("env", "hooks"):
            if k in settings:
                cfg.settings[k] = "configured"
        # Surface the real allow/deny/ask permission rules so the dashboard can
        # classify per-capability access — not just a "configured" marker.
        global_perms = settings.get("permissions")
        if isinstance(global_perms, dict):
            cfg.settings["permissions"] = {
                "allow": list(global_perms.get("allow") or []),
                "deny": list(global_perms.get("deny") or []),
                "ask": list(global_perms.get("ask") or []),
            }

    # Account config (.claude.json)
    account = _read_json(account_path)
    if account:
        cfg.config_files.append(str(account_path))
        for k in ("auto_update", "installMethod", "hasCompletedOnboarding"):
            cfg.setting_sources[k] = str(account_path)
        cfg.auto_update = bool(account.get("autoUpdates", True))
        cfg.settings["installMethod"] = account.get("installMethod", "unknown")
        cfg.settings["hasCompletedOnboarding"] = account.get("hasCompletedOnboarding", False)

    # Project settings
    proj_settings = _read_json(proj_path)
    if proj_settings:
        cfg.config_files.append(str(proj_path))
        for k in ("project_settings", "project_permissions"):
            cfg.setting_sources[k] = str(proj_path)
        cfg.setting_sources.setdefault("permissions", str(proj_path))
        cfg.settings["project_settings"] = "configured"
        proj_perms = proj_settings.get("permissions")
        if isinstance(proj_perms, dict):
            cfg.settings["project_permissions"] = "configured"

    # Project-local and managed settings
    local_settings = _read_json(local_path)
    if isinstance(local_settings, dict):
        cfg.config_files.append(str(local_path))
    managed_layers, managed_files, managed_shown = _claude_managed_layers()
    cfg.config_files.extend(managed_files)

    # Value of each setting per file, lowest precedence first; managed wins over every file.
    layers: list[Layer] = [
        ("user", settings, user_path),
        ("project", proj_settings, proj_path),
        ("project-local", local_settings if isinstance(local_settings, dict) else None, local_path),
        *managed_layers,
    ]
    above_user = layers[1:]
    if (top := _effective(above_user, "model")) is not None and top[0]:
        cfg.setting_sources["model"] = top[2]
        if not os.environ.get("ANTHROPIC_MODEL"):
            cfg.model = str(top[0])
    if (top := _effective(above_user, "effortLevel")) is not None:
        cfg.settings["effortLevel"] = top[0]
        cfg.setting_sources["effortLevel"] = top[2]
    for k in ("env", "hooks"):
        if k not in cfg.settings and (top := _effective(above_user, k)) is not None:
            cfg.settings[k] = "configured"
            cfg.setting_sources[k] = top[2]
    merged = cfg.settings.get("permissions")
    for _scope_id, data, _path in above_user:
        perms = data.get("permissions") if isinstance(data, dict) else None
        if not isinstance(perms, dict):
            continue
        if not isinstance(merged, dict):
            merged = {"allow": [], "deny": [], "ask": []}
        for bucket in ("allow", "deny", "ask"):
            existing = list(merged.get(bucket) or [])
            for item in perms.get(bucket) or []:
                if item not in existing:
                    existing.append(item)
            merged[bucket] = existing
        cfg.settings["permissions"] = merged

    if os.environ.get("ANTHROPIC_MODEL"):
        cfg.model = os.environ["ANTHROPIC_MODEL"]
    for k in ("model", "effortLevel"):
        _record(cfg, k, k, layers)
    if os.environ.get("ANTHROPIC_MODEL"):
        cfg.setting_values.setdefault("model", []).append(
            ("env", os.environ["ANTHROPIC_MODEL"], env_source("ANTHROPIC_MODEL"), "ANTHROPIC_MODEL")
        )
        cfg.setting_sources["model"] = env_source("ANTHROPIC_MODEL")
    for k in ("env", "hooks"):
        _record(cfg, k, k, layers, value_fn=lambda _v: "configured")  # values can hold commands and tokens
    for _scope_id, data, path in layers:
        block = data.get("env") if isinstance(data, dict) else None
        if isinstance(block, dict):
            cfg.env_blocks[str(path)] = {str(k): str(v) for k, v in block.items() if _ENV_NAME_RE.match(str(k))}
    _record(cfg, "permissions", "permissions", layers, value_fn=_permission_lists)
    # Every other key of every settings file.
    _add_layers(cfg, layers, skip=("permissions.allow", "permissions.deny", "permissions.ask", "hooks", "env"))

    # MCP servers from .mcp.json
    cfg.mcp_servers = _mcp_server_names(_read_json(root / ".mcp.json"))

    # VS Code extension check
    cfg.extensions = _find_extensions(Path.home() / ".vscode" / "extensions", "claude")

    # OTel / telemetry
    cfg.otel = _detect_otel_from_claude()

    # Startup: check if claude is in login items
    if IS_MACOS:
        login_items = _macos_login_items()
        cfg.launch_at_startup = "Claude" in login_items

    # Scope layers, lowest precedence first.
    managed_note = "Wins over every settings file."
    if IS_WINDOWS:
        managed_note += f" Also read: HKLM\\{CLAUDE_POLICY_REGISTRY} value Settings."
    cfg.scopes = [
        _file_scope("user", user_path),
        _file_scope("project", proj_path),
        _file_scope("project-local", local_path),
        _env_scope(tool, "ANTHROPIC_MODEL overrides the model key of every file."),
        _scope("managed", managed_shown, bool(managed_layers), managed_note),
    ]

    # Agents: user folder, then the project folder (same name: project wins).
    defs = _agent_files(
        [(claude_global_dir() / "agents", "user", ("*.md",)), (root / ".claude" / "agents", "project", ("*.md",))]
    )
    sub_env = os.environ.get("CLAUDE_CODE_SUBAGENT_MODEL", "")
    for name, defined in defs.items():
        model = _text_of(defined["fields"].get("model"))
        fallback = ("CLAUDE_CODE_SUBAGENT_MODEL", sub_env) if sub_env and not model else None
        cfg.agent_rows.append(
            _agent_row(cfg, name, defined, [], _main_model_text(cfg.model, "the main conversation's model"), fallback)
        )

    return _finish(cfg, bool(cfg.settings or cfg.mcp_servers or cfg.extensions or cfg.agent_rows))


def _parse_claude_desktop_config(root: Path | None = None, tool: str = "claude-desktop") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    config_path = claude_desktop_config()

    data = _read_json(config_path)
    if not data:
        return None
    cfg.config_files.append(str(config_path))

    # MCP servers
    cfg.mcp_servers = _mcp_server_names(data)

    # Preferences — grouped by mode
    prefs = data.get("preferences", {})

    # Chat mode
    chat = {}
    if "sidebarMode" in prefs:
        chat["sidebarMode"] = prefs["sidebarMode"]
    if chat:
        cfg.feature_groups["Chat"] = chat

    # Code mode (agent)
    code = {}
    trusted = prefs.get("localAgentModeTrustedFolders", [])
    if trusted:
        code["trustedFolders"] = len(trusted)
    if "launchPreviewPersistSession" in prefs:
        code["livePreview"] = prefs["launchPreviewPersistSession"]
    if code:
        cfg.feature_groups["Code (Agent)"] = code

    # Cowork mode (autonomous)
    cowork = {}
    for key in ("coworkWebSearchEnabled", "coworkScheduledTasksEnabled", "allowAllBrowserActions"):
        if key in prefs:
            label = key.replace("cowork", "").replace("Enabled", "").replace("allow", "")
            label = label[0].lower() + label[1:] if label else key
            cowork[label] = prefs[key]
    if cowork:
        cfg.feature_groups["Cowork (Autonomous)"] = cowork

    # Flat features for backward compat
    for key in (
        "keepAwakeEnabled",
        "coworkScheduledTasksEnabled",
        "allowAllBrowserActions",
        "sidebarMode",
        "coworkWebSearchEnabled",
        "launchPreviewPersistSession",
    ):
        if key in prefs:
            cfg.features[key] = prefs[key]

    if trusted:
        cfg.settings["trustedFolders"] = len(trusted)

    # Every other key of the file; preferences already shown by a group are left out.
    grouped = (
        "sidebarMode",
        "localAgentModeTrustedFolders",
        "launchPreviewPersistSession",
        "coworkWebSearchEnabled",
        "coworkScheduledTasksEnabled",
        "allowAllBrowserActions",
    )
    _add_layers(
        cfg,
        [("user", data, config_path)],
        open_keys=("preferences",),
        exclude={f"preferences.{k}" for k in grouped},
    )

    # Startup
    if IS_MACOS:
        login_items = _macos_login_items()
        cfg.launch_at_startup = "Claude" in login_items

    return _finish(cfg, bool(cfg.mcp_servers or cfg.features or cfg.settings or cfg.feature_groups))


def _parse_vscode_config(root: Path, tool: str = "vscode") -> ToolConfig | None:
    """Collect VS Code platform-level AI settings (chat.* namespace).

    These affect ALL AI tools running inside VS Code, not just Copilot.
    """
    cfg = ToolConfig(tool=tool)

    user_dir = vscode_user_dir()
    if not user_dir.exists():
        return None  # VS Code not installed

    user_path = user_dir / "settings.json"
    ws_path = root / ".vscode" / "settings.json"
    user_settings = _read_json(user_path) or {}
    ws_settings = _read_json(ws_path) or {}
    layers = [("user", user_settings, user_path), ("workspace", ws_settings, ws_path)]
    for path in (user_dir / "settings.json", root / ".vscode" / "settings.json"):
        if path.is_file():
            cfg.config_files.append(str(path))
    # Workspace overrides user
    vscode_settings: dict = {**user_settings, **ws_settings}

    # Known VS Code defaults for all important chat.* settings.
    # Shown when the user hasn't explicitly set the key — gives full visibility
    # even on a default install.
    _DEFAULTS: dict = {
        "chat.agent.enabled": True,
        "chat.agent.maxRequests": 50,
        "chat.autopilot.enabled": True,
        "chat.autoReply": False,
        "chat.useHooks": True,
        "chat.useClaudeHooks": False,
        "chat.useCustomAgentHooks": False,
        "chat.useClaudeMdFile": True,
        "chat.useAgentsMdFile": True,
        "chat.useNestedAgentsMdFiles": False,
        "chat.includeApplyingInstructions": True,
        "chat.tools.global.autoApprove": False,
        "chat.tools.terminal.sandbox.enabled": False,
        "chat.tools.terminal.enableAutoApprove": True,
        "chat.tools.terminal.autoApproveWorkspaceNpmScripts": True,
        "chat.mcp.access": "all",
        "chat.mcp.autostart": "newAndOutdated",
    }

    def get(key: str):
        """Return explicit setting if present, else known default, else None."""
        if key in vscode_settings:
            return vscode_settings[key]
        return _DEFAULTS.get(key)

    for group_name, pairs in (
        (
            "Agent",
            [
                ("chat.agent.enabled", "enabled"),
                ("chat.autopilot.enabled", "autopilot"),
                ("chat.autoReply", "autoReply"),
                ("chat.agent.maxRequests", "maxRequests"),
            ],
        ),
        (
            "Hooks",
            [
                ("chat.useHooks", "enabled"),
                ("chat.useClaudeHooks", "claudeHooks"),
                ("chat.useCustomAgentHooks", "customAgentHooks"),
                ("chat.hookFilesLocations", "locations"),
            ],
        ),
        (
            "Safety",
            [
                ("chat.tools.global.autoApprove", "globalAutoApprove"),
                ("chat.tools.terminal.sandbox.enabled", "terminalSandbox"),
                ("chat.tools.terminal.enableAutoApprove", "terminalAutoApprove"),
                ("chat.tools.terminal.autoApproveWorkspaceNpmScripts", "autoApproveNpmScripts"),
            ],
        ),
        (
            "Context Files",
            [
                ("chat.useClaudeMdFile", "claudeMd"),
                ("chat.useAgentsMdFile", "agentsMd"),
                ("chat.useNestedAgentsMdFiles", "nestedAgentsMd"),
                ("chat.includeApplyingInstructions", "applyingInstructions"),
            ],
        ),
        (
            "File Locations",
            [
                ("chat.instructionsFilesLocations", "instructions"),
                ("chat.agentFilesLocations", "agents"),
                ("chat.agentSkillsLocations", "skills"),
                ("chat.promptFilesLocations", "prompts"),
            ],
        ),
        (
            "MCP",
            [
                ("chat.mcp.access", "access"),
                ("chat.mcp.autostart", "autostart"),
                ("chat.mcp.discovery.enabled", "discovery"),
            ],
        ),
    ):
        if group := _pick(get, pairs):
            cfg.feature_groups[group_name] = group
        for full, short in pairs:
            qualified = f"{group_name}/{short}"
            _record(cfg, qualified, full, layers)
            cfg.file_keys[qualified] = full
            entries = cfg.setting_values.get(qualified)
            cfg.setting_sources[qualified] = entries[-1][2] if entries else ""  # no file: a VS Code default

    # ── Every other AI setting of the user and workspace files ──
    _add_layers(
        cfg,
        layers,
        flatten=False,
        prefixes=VSCODE_AI_PREFIXES,
        skip=("claudeCode.environmentVariables",),
        exclude=set(cfg.file_keys.values()),
    )

    # ── OTel ────────────────────────────────────────────────────
    cfg.otel = _detect_otel_from_vscode_settings(vscode_settings)
    cfg.scopes = _vscode_scopes(user_path, ws_path, cfg.tool)

    return cfg  # always show if VS Code is installed


# VS Code settings read by the "vscode" tool besides its groups (Copilot reads github.copilot.*).
VSCODE_AI_PREFIXES: tuple[str, ...] = ("chat.", "inlineChat.", "mcp.", "claudeCode.")


def _vscode_scopes(user_path: Path, ws_path: Path, tool: str = "vscode") -> list[dict]:
    return [
        _file_scope("user", user_path),
        _file_scope("workspace", ws_path),
        _env_scope(tool, "Read for telemetry export only."),
        _vscode_policy_scope(),
    ]


_COPILOT_FEATURES: list[tuple[str, str]] = [
    ("github.copilot.chat.agent.enabled", "agent_mode"),
    ("github.copilot.chat.agent.autoFix", "agent_autoFix"),
    ("github.copilot.chat.agent.currentEditorContext.enabled", "agent_editorContext"),
    ("github.copilot.chat.agent.largeToolResultsToDisk.enabled", "agent_largeResultsToDisk"),
    ("github.copilot.chat.agentDebugLog.enabled", "agentDebugLog"),
    ("github.copilot.chat.agentDebugLog.fileLogging.enabled", "agentDebugLog_fileLogging"),
    ("github.copilot.chat.tools.memory.enabled", "local_memory"),
    ("github.copilot.chat.copilotMemory.enabled", "github_memory"),
    ("github.copilot.chat.tools.viewImage.enabled", "tool_viewImage"),
    ("github.copilot.chat.claudeAgent.enabled", "claude_agent"),
    ("github.copilot.chat.cli.mcp.enabled", "cli_mcp"),
    ("github.copilot.chat.cli.isolationOption.enabled", "cli_worktreeIsolation"),
    ("github.copilot.chat.cli.autoCommit.enabled", "cli_autoCommit"),
    ("github.copilot.chat.cli.branchSupport.enabled", "cli_branchSupport"),
    ("chat.useHooks", "hooks_enabled"),
    ("chat.useClaudeHooks", "hooks_claude"),
    ("chat.useCustomAgentHooks", "hooks_custom_agent"),
    ("chat.autopilot.enabled", "autopilot"),
    ("chat.tools.global.autoApprove", "global_autoApprove"),
    ("chat.autoReply", "autoReply"),
    ("chat.tools.terminal.autoApprove", "autoApprove"),
    ("chat.tools.terminal.sandbox.enabled", "terminal_sandbox"),
    ("chat.plugins.enabled", "plugins"),
    ("chat.useCustomizationsInParentRepositories", "parent_repo_discovery"),
    ("chat.useClaudeMdFile", "ctx_claudeMd"),
    ("chat.useAgentsMdFile", "ctx_agentsMd"),
    ("chat.useNestedAgentsMdFiles", "ctx_nestedAgentsMd"),
    ("github.copilot.chat.anthropic.tools.websearch.enabled", "anthropic_websearch"),
    ("github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions", "claudeAgent_skipPermissions"),
    ("chat.mcp.discovery.enabled", "mcp_discovery"),
]

_COPILOT_SETTINGS: list[tuple[str, str]] = [
    ("chat.agent.maxRequests", "agent_maxRequests"),
    ("github.copilot.chat.agentHistorySummarizationMode", "agent_historySummarizationMode"),
    ("github.copilot.chat.debug.requestLogger.maxEntries", "debug_requestLoggerMaxEntries"),
    ("chat.hookFilesLocations", "hookFilesLocations"),
    ("github.copilot.chat.anthropic.thinking.budgetTokens", "anthropic_thinkingBudget"),
    ("github.copilot.chat.anthropic.thinking.effort", "anthropic_thinkingEffort"),
    ("github.copilot.chat.agent.temperature", "agent_temperature"),
    ("chat.mcp.access", "mcp_access"),
    ("chat.planAgent.defaultModel", "planModel"),
    ("github.copilot.chat.implementAgent.model", "implementModel"),
    ("chat.instructionsFilesLocations", "instructionsFilesLocations"),
    ("chat.agentFilesLocations", "agentFilesLocations"),
    ("chat.agentSkillsLocations", "agentSkillsLocations"),
    ("chat.promptFilesLocations", "promptFilesLocations"),
]


# Configurable model overrides surfaced as a dedicated dashboard section.
# Each entry is (vscode_settings_key, short_label, default_hint, description).
# These are the *only* model knobs Copilot exposes as VS Code settings; other
# model selection (e.g. the gpt-4o-mini summary helper that drives
# copilotLanguageModelWrapper) is hard-coded inside the Copilot extension and
# cannot be reconfigured by the user.
_COPILOT_CONFIGURABLE_MODELS: list[tuple[str, str, str, str]] = [
    (
        "chat.planAgent.defaultModel",
        "Plan agent",
        "default model",
        "Default model used by the Plan agent for research/planning turns.",
    ),
    (
        "github.copilot.chat.implementAgent.model",
        "Implement agent (Plan handoff)",
        "default model",
        "Model used when the Plan agent hands off to implementation. "
        "Format: `Model Name (vendor)` — e.g. `GPT-5 (copilot)`.",
    ),
    (
        "github.copilot.chat.askAgent.model",
        "Ask agent",
        "default model",
        "Override the language model used by the Ask agent.",
    ),
    (
        "github.copilot.chat.exploreAgent.model",
        "Explore subagent",
        "fast, small model (fallback list)",
        "Override the model used by the Explore (code-research) subagent.",
    ),
    (
        "github.copilot.chat.executionSubagent.model",
        "Execution subagent",
        "default model",
        "Model used by the Execution subagent (runs terminal commands).",
    ),
    (
        "github.copilot.chat.searchSubagent.model",
        "Search subagent",
        "agentic-search-v3 if useAgenticProxy else main agent model",
        "Model used by the Search subagent for iterative code exploration.",
    ),
    (
        "github.copilot.chat.workspace.preferredEmbeddingsModel",
        "Workspace embeddings",
        "default embeddings model",
        "Preferred embeddings model used by workspace semantic search.",
    ),
    (
        "github.copilot.nextEditSuggestions.preferredModel",
        "Next-edit suggestions",
        "none",
        "Preferred model for the inline next-edit suggestion feature.",
    ),
    (
        "inlineChat.defaultModel",
        "Inline chat",
        "default model",
        "Default model used by inline chat in the editor.",
    ),
    (
        "chat.utilityModel",
        "Utility model",
        "default utility model",
        "Model used for helper tasks such as titles and summaries.",
    ),
    (
        "chat.utilitySmallModel",
        "Small utility model",
        "default small model",
        "Small model used for the lightest helper tasks.",
    ),
    (
        "chat.subagents.defaultToAuto",
        "Subagents default to auto",
        "off",
        "Subagents without a model of their own use automatic model selection.",
    ),
    (
        "github.copilot.selectedCompletionModel",
        "Inline completions",
        "default completion model",
        "Currently selected inline-completion model. Change via the “Change Completions Model” command in VS Code.",
    ),
]


def _collect_copilot_configurable_models(
    user_settings: dict,
    ws_settings: dict | None,
) -> list[dict]:
    """Build the list of configurable model overrides + their effective values.

    For each known key, record:
      - label / description / default_hint (static)
      - key (the exact VS Code settings.json key)
      - value (workspace override wins; falls back to user; "" if neither)
      - source: "workspace" | "user" | "default"
    """
    out: list[dict] = []
    ws = ws_settings or {}
    for key, label, default_hint, description in _COPILOT_CONFIGURABLE_MODELS:
        if key in ws:
            value, source = ws[key], "workspace"
        elif key in user_settings:
            value, source = user_settings[key], "user"
        else:
            value, source = "", "default"
        out.append(
            {
                "label": label,
                "key": key,
                "value": value,
                "source": source,
                "default_hint": default_hint,
                "description": description,
            }
        )
    return out


# Copilot feature groups: (group, [(store key, label)], store) where store "f"
# reads cfg.features and "s" reads cfg.settings.
_COPILOT_GROUPS: list[tuple[str, list[tuple[str, str]], str]] = [
    ("Session Targets", [("claude_agent", "claudeTarget"), ("autopilot", "autopilot")], "f"),
    (
        "Agent Mode",
        [
            ("agent_mode", "enabled"),
            ("agent_autoFix", "autoFix"),
            ("agent_editorContext", "editorContext"),
            ("agent_largeResultsToDisk", "largeResultsToDisk"),
            ("plugins", "plugins"),
        ],
        "f",
    ),
    (
        "Agent Mode",
        [
            ("agent_maxRequests", "maxRequests"),
            ("agent_historySummarizationMode", "historySummarizationMode"),
        ],
        "s",
    ),
    (
        "Debug Logging",
        [
            ("agentDebugLog", "enabled"),
            ("agentDebugLog_fileLogging", "fileLogging"),
        ],
        "f",
    ),
    ("Debug Logging", [("debug_requestLoggerMaxEntries", "requestLoggerMaxEntries")], "s"),
    (
        "Memory & Tools",
        [
            ("local_memory", "local"),
            ("github_memory", "github"),
            ("tool_viewImage", "viewImage"),
        ],
        "f",
    ),
    (
        "CLI Mode",
        [
            ("cli_mcp", "mcp"),
            ("cli_worktreeIsolation", "worktreeIsolation"),
            ("cli_autoCommit", "autoCommit"),
            ("cli_branchSupport", "branchSupport"),
        ],
        "f",
    ),
    (
        "Hooks",
        [
            ("hooks_enabled", "enabled"),
            ("hooks_claude", "claudeHooks"),
            ("hooks_custom_agent", "customAgentHooks"),
        ],
        "f",
    ),
    ("Hooks", [("hookFilesLocations", "locations")], "s"),
    (
        "Safety",
        [
            ("autoApprove", "autoApprove"),
            ("terminal_sandbox", "terminalSandbox"),
            ("global_autoApprove", "globalAutoApprove"),
            ("autoReply", "autoReply"),
        ],
        "f",
    ),
    (
        "Context Files",
        [
            ("ctx_claudeMd", "claudeMd"),
            ("ctx_agentsMd", "agentsMd"),
            ("ctx_nestedAgentsMd", "nestedAgentsMd"),
        ],
        "f",
    ),
    (
        "Claude (Anthropic)",
        [
            ("anthropic_websearch", "webSearch"),
            ("claudeAgent_skipPermissions", "skipPermissions"),
        ],
        "f",
    ),
    (
        "Claude (Anthropic)",
        [
            ("anthropic_thinkingBudget", "thinkingBudget"),
            ("anthropic_thinkingEffort", "thinkingEffort"),
            ("agent_temperature", "temperature"),
        ],
        "s",
    ),
]


def _parse_copilot_config(root: Path, tool: str = "copilot") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    # ── Global VS Code settings ─────────────────────────────────
    vscode_settings = _read_json(vscode_user_dir() / "settings.json") or {}

    if copilot_enable := vscode_settings.get("github.copilot.enable", {}):
        cfg.features["enable"] = copilot_enable
    for k, v in vscode_settings.items():
        if k.startswith("github.copilot.") and k != "github.copilot.enable":
            cfg.settings[k.replace("github.copilot.", "")] = v

    for src, dst in _COPILOT_FEATURES:
        if (v := vscode_settings.get(src)) is not None:
            cfg.features[dst] = v
    for src, dst in _COPILOT_SETTINGS:
        if (v := vscode_settings.get(src)) is not None:
            cfg.settings[dst] = v

    # OTel detection (global settings)
    cfg.otel = _detect_otel_from_vscode_settings(vscode_settings)

    # ── Workspace VS Code settings ──────────────────────────────
    ws_settings = _read_json(root / ".vscode" / "settings.json")
    if ws_settings:
        for k, v in ws_settings.items():
            if k.startswith("github.copilot."):
                cfg.settings["ws:" + k.replace("github.copilot.", "")] = v
        ws_otel = _detect_otel_from_vscode_settings(ws_settings)
        if ws_otel.enabled and not cfg.otel.enabled:
            cfg.otel = ws_otel
            cfg.otel.source = "vscode-workspace"

    # ── Configurable model overrides + locations ────────────────
    cfg.configurable_models = _collect_copilot_configurable_models(vscode_settings, ws_settings)
    user_settings_path = vscode_user_dir() / "settings.json"
    ws_settings_path = root / ".vscode" / "settings.json"
    if user_settings_path.is_file():
        cfg.config_files.append(str(user_settings_path))
    if ws_settings_path.is_file():
        cfg.config_files.append(str(ws_settings_path))

    # ── Extensions ──────────────────────────────────────────────
    cfg.extensions = _find_extensions(Path.home() / ".vscode" / "extensions", "copilot")

    # ── MCP config (check all locations) ────────────────────────
    seen_servers: set[str] = set()
    for mcp_path in (
        vscode_user_dir() / "mcp.json",
        root / ".copilot" / "mcp-config.json",
        root / ".copilot-mcp.json",
        root / ".vscode" / "mcp.json",
    ):
        mcp = _read_json(mcp_path)
        if not mcp:
            continue
        for name in mcp.get("mcpServers", mcp.get("servers", {})):
            if name not in seen_servers:
                cfg.mcp_servers.append(name)
                seen_servers.add(name)

    # ── Feature groups for structured display ───────────────────
    stores = {"f": cfg.features.get, "s": cfg.settings.get}
    for group_name, pairs, store in _COPILOT_GROUPS:
        if chunk := _pick(stores[store], pairs):
            cfg.feature_groups[group_name] = cfg.feature_groups.get(group_name, {}) | chunk

    # ── Value of each setting per file, for the override chain ──
    layers = [("user", vscode_settings, user_settings_path), ("workspace", ws_settings, ws_settings_path)]
    for k in list(vscode_settings) + list(ws_settings or {}):
        if k.startswith("github.copilot.") and k != "github.copilot.enable":
            short = k.removeprefix("github.copilot.")
            if short not in cfg.setting_values:
                _record(cfg, short, k, layers)
                if ws_settings and k in ws_settings:
                    cfg.setting_values["ws:" + short] = list(cfg.setting_values[short])
    for key, *_rest in _COPILOT_CONFIGURABLE_MODELS:
        _record(cfg, key, key, layers)
    file_key_of = {("f", dst): src for src, dst in _COPILOT_FEATURES}
    file_key_of.update({("s", dst): src for src, dst in _COPILOT_SETTINGS})
    for (_store, dst), src in file_key_of.items():
        if dst not in cfg.setting_values:
            _record(cfg, dst, src, layers)
    for group_name, pairs, store in _COPILOT_GROUPS:
        for dst, label in pairs:
            src = file_key_of.get((store, dst))
            if src:
                cfg.file_keys[f"{group_name}/{label}"] = src
                cfg.file_keys[dst] = src
            if src and (entries := cfg.setting_values.get(dst)):
                cfg.setting_values[f"{group_name}/{label}"] = entries

    # Raw github.copilot.* settings whose values a group or model row shows.
    grouped = {(store, key) for _g, pairs, store in _COPILOT_GROUPS for key, _label in pairs}
    model_keys = {key for key, *_rest in _COPILOT_CONFIGURABLE_MODELS}
    for table, store in ((_COPILOT_FEATURES, "f"), (_COPILOT_SETTINGS, "s")):
        for src, dst in table:
            if (store, dst) in grouped or src in model_keys:
                if store == "s":
                    cfg.covered_keys.append(dst)
                if src.startswith("github.copilot."):
                    cfg.covered_keys.append(src.removeprefix("github.copilot."))
    cfg.covered_keys.extend(k.removeprefix("github.copilot.") for k in model_keys if k.startswith("github.copilot."))
    if ws_settings and ws_settings_path.is_file():
        for k in cfg.settings:
            if k.startswith("ws:"):
                cfg.setting_sources[k] = str(ws_settings_path)

    cfg.scopes = _vscode_scopes(user_settings_path, ws_settings_path, cfg.tool)

    # ── Agents: agent files, plus folders named by chat.agentFilesLocations ──
    folders: list[tuple[Path, str, tuple[str, ...]]] = [
        (claude_global_dir() / "agents", "user", ("*.md",)),
        (copilot_global_dir() / "agents", "user", ("*.agent.md", "*.md")),
    ]
    merged = {**vscode_settings, **(ws_settings or {})}
    locations = merged.get("chat.agentFilesLocations")
    for loc, enabled in (locations.items() if isinstance(locations, dict) else []):
        if enabled is not True:
            continue
        folder = Path(os.path.expanduser(str(loc)))
        if not folder.is_absolute():
            folder = root / folder
        scope = setting_scope(str(folder / "x"), str(root))
        folders.append((folder, "user" if scope == "default" else scope, ("*.agent.md", "*.md")))
    folders.append((root / ".github" / "agents", "project", ("*.agent.md", "*.md")))
    for name, defined in _agent_files(folders).items():
        cfg.agent_rows.append(_agent_row(cfg, name, defined, [], "the model picked in the chat view"))

    return _finish(cfg, bool(cfg.settings or cfg.extensions or cfg.features or cfg.otel.enabled or cfg.feature_groups))


def _parse_cursor_config(root: Path, tool: str = "cursor") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    settings = _read_json(cursor_user_dir() / "settings.json")
    if settings:
        cfg.config_files.append(str(cursor_user_dir() / "settings.json"))
        for k, v in settings.items():
            if any(x in k.lower() for x in ("cursor", "ai", "copilot", "model", "agent")):
                cfg.settings[k] = v

    # MCP config
    cfg.mcp_servers = _mcp_server_names(_read_json(root / ".cursor" / "mcp.json"))

    # Extensions
    cfg.extensions = _find_extensions(Path.home() / ".cursor" / "extensions", "copilot", "claude", "ai", limit=10)

    return _finish(cfg, bool(cfg.settings or cfg.mcp_servers))


def _codex_trusted(user: dict | None, root: Path | None) -> bool:
    projects = (user or {}).get("projects")
    if root is None or not isinstance(projects, dict):
        return False
    want = _norm_path(str(root))
    return any(
        _norm_path(str(path)) == want and isinstance(spec, dict) and spec.get("trust_level") == "trusted"
        for path, spec in projects.items()
    )


def _parse_codex_config(root: Path | None = None, tool: str = "codex-cli") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)
    home = codex_global_dir()
    user_path = home / "config.toml"
    user = _read_toml(user_path)
    if user:
        cfg.config_files.append(str(user_path))

    # Layers, lowest precedence first: system, user, profile, trusted project, requirements.
    system_path = _first_fixed(CODEX_SYSTEM_FILES)
    system = _read_toml(system_path) if system_path else None
    if system:
        cfg.config_files.insert(0, str(system_path))
    layers: list[Layer] = [("system", system, system_path or ""), ("user", user, user_path)]
    profile = _effective(layers, "profile")
    profile_name = str(profile[0]) if profile and isinstance(profile[0], str) else ""
    profile_path = home / f"{profile_name}.config.toml" if profile_name else None
    if profile_name:
        table = ((user or {}).get("profiles") or {}).get(profile_name)
        if isinstance(table, dict):
            layers.append(("profile", table, user_path))
        if profile_path and (profile_data := _read_toml(profile_path)):
            layers.append(("profile", profile_data, profile_path))
            cfg.config_files.append(str(profile_path))
    proj_path = root / ".codex" / "config.toml" if root else None
    trusted = _codex_trusted(user, root)
    if proj_path and trusted and (proj := _read_toml(proj_path)):
        layers.append(("project", proj, proj_path))
        cfg.config_files.append(str(proj_path))
    req_files = list(CODEX_REQUIREMENTS_FILES)
    if IS_WINDOWS:
        req_files.append(home / "managed_config.toml")
    requirements = [(p, d) for p in req_files if _fixed_file(p) and (d := _read_toml(p))]
    for path, data in requirements:
        layers.append(("managed", data, path))
        cfg.config_files.append(str(path))

    if not any(isinstance(d, dict) and d for _s, d, _p in layers):
        return None

    model = _effective(layers, "model")
    cfg.model = str(model[0]) if model else ""
    effort = _effective(layers, "model_reasoning_effort")
    cfg.settings["model_reasoning_effort"] = effort[0] if effort else ""
    for key in ("model", "model_reasoning_effort"):
        _record(cfg, key, key, layers)
        if (top := _effective(layers, key)) is not None:
            cfg.setting_sources[key] = top[2]

    features: dict = {}
    for scope, data, path in layers:
        table = data.get("features") if isinstance(data, dict) else None
        if isinstance(table, dict):
            features.update(table)
            for k, v in table.items():
                cfg.setting_values.setdefault(k, []).append((scope, v, str(path), k))
    for k, v in features.items():
        cfg.features[k] = v
        cfg.setting_sources[k] = cfg.setting_values[k][-1][2]

    # [agents] defaults for subagents, as ordinary model rows.
    for key, label in (
        ("default_subagent_model", "Subagent default model"),
        ("default_subagent_reasoning_effort", "Subagent default reasoning effort"),
    ):
        cfg.key_labels[f"agents.{key}"] = label
        cfg.key_sections[f"agents.{key}"] = "model"

    projects = (user or {}).get("projects")
    if isinstance(projects, dict):
        trusted_list = [p for p, spec in projects.items() if isinstance(spec, dict) and spec.get("trust_level") == "trusted"]
        cfg.settings["trustedProjects"] = trusted_list
        cfg.setting_sources["trustedProjects"] = str(user_path)
        cfg.key_labels["trustedProjects"] = "Trusted projects"
        cfg.key_sections["trustedProjects"] = "autonomy"
        cfg.key_notes["trustedProjects"] = f"{len(trusted_list)} of {len(projects)} projects are trusted."
        cfg.file_keys["trustedProjects"] = "projects"

    servers: dict = {}
    for _scope_id, data, _path in layers:
        table = data.get("mcp_servers") if isinstance(data, dict) else None
        if isinstance(table, dict):
            servers.update(table)
    cfg.mcp_servers = list(servers)

    # Every other key of every layer.
    _add_layers(cfg, layers, skip=("features", "otel", "projects", "profiles", "shell_environment_policy.set"))

    # OTel detection
    merged: dict = {}
    for _scope_id, data, _path in layers:
        if isinstance(data, dict):
            merged.update(data)
    cfg.otel = _detect_otel_from_codex_toml(merged)

    cfg.managed_floors = None  # every key a requirements file sets is locked
    project_note = "Read only for trusted projects."
    if proj_path and proj_path.is_file() and not trusted:
        project_note += " This project is not trusted, so the file is not read."
    req_shown = next((p for p, _d in requirements), req_files[0] if req_files else "")
    cfg.scopes = [
        _scope("system", system_path or (CODEX_SYSTEM_FILES[0] if CODEX_SYSTEM_FILES else ""), bool(system)),
        _file_scope("user", user_path),
        _scope(
            "profile",
            profile_path or "",
            bool(profile_name),
            f"Profile {profile_name}." if profile_name else "No profile is selected.",
        ),
        _scope("project", proj_path or "", bool(proj_path and proj_path.is_file()), project_note),
        _env_scope(tool),
        _scope("managed", req_shown, bool(requirements), "Requirements: every key set here is locked.", "Requirements"),
    ]

    # Agents: user folder, then the project folder (same name: project wins).
    folders = [(home / "agents", "user", ("*.toml",))]
    if root:
        folders.append((root / ".codex" / "agents", "project", ("*.toml",)))
    sub_default = _effective(layers, "agents")
    default_model = ""
    if sub_default and isinstance(sub_default[0], dict):
        default_model = str(sub_default[0].get("default_subagent_model") or "")
    inherit_text = (
        f"the subagent default model ({default_model})"
        if default_model
        else _main_model_text(cfg.model, "the parent session's model")
    )
    for name, defined in _agent_files(folders).items():
        cfg.agent_rows.append(_agent_row(cfg, name, defined, [], inherit_text))

    return _finish(cfg, True)


def _parse_windsurf_config(root: Path, tool: str = "windsurf") -> ToolConfig | None:
    cfg = ToolConfig(tool=tool)

    # Global MCP
    cfg.mcp_servers = _mcp_server_names(_read_json(windsurf_global_dir() / "mcp_config.json"))

    # Project MCP
    cfg.mcp_servers.extend(_mcp_server_names(_read_json(root / ".windsurf" / "mcp.json")))

    for mcp_path in (windsurf_global_dir() / "mcp_config.json", root / ".windsurf" / "mcp.json"):
        if mcp_path.is_file():
            cfg.config_files.append(str(mcp_path))

    # Global rules
    rules = windsurf_global_dir() / "memories" / "global_rules.md"
    if rules.is_file():
        cfg.settings["global_rules"] = "configured"
        cfg.config_files.append(str(rules))
        cfg.setting_sources["global_rules"] = str(rules)

    # ── Cascade agent features ───────────────────────────────────
    # Cascade is Windsurf's autonomous coding agent. Detection points:
    #   * legacy .windsurfrules at the project root
    #   * modern per-rule files under .windsurf/rules/
    #   * Cascade auto-memory store at <project-root>/cascade-memories/
    #   * Global .codeiumignore / project .codeiumignore (Cascade respects them)
    legacy_rules = root / ".windsurfrules"
    if legacy_rules.is_file():
        cfg.features["cascade_legacy_rules"] = True
    rules_dir = root / ".windsurf" / "rules"
    if rules_dir.is_dir():
        try:
            rule_count = sum(1 for _ in rules_dir.glob("*.md"))
        except OSError:
            rule_count = 0
        if rule_count:
            cfg.features["cascade_rules_modern"] = True
            cfg.settings["cascade_rules_count"] = rule_count
    cascade_mem = root / "cascade-memories"
    if cascade_mem.is_dir():
        cfg.features["cascade_memories"] = True
        try:
            cfg.settings["cascade_memories_count"] = sum(1 for _ in cascade_mem.iterdir())
        except OSError:
            pass
    if (root / ".codeiumignore").is_file() or (windsurf_global_dir() / ".." / ".codeiumignore").exists():
        cfg.features["codeiumignore"] = True

    return _finish(cfg, bool(cfg.mcp_servers or cfg.settings or cfg.features))


# ─── Microsoft 365 Copilot (Teams Toolkit / M365 Agents) ────────

# Simple capability name → feature flag (normalised to lowercase + underscores)
_CAP_FEATURE_FLAGS: dict[str, str] = {
    "websearch": "web_search",
    "web_search": "web_search",
    "codeinterpreter": "code_interpreter",
    "code_interpreter": "code_interpreter",
    "graphskills": "graph_skills",
    "graph_skills": "graph_skills",
}


# ── Microsoft 365 Copilot: install detection and declarative-agent validation ──
#
# Sources (Microsoft Learn, checked 2026-11-05):
#   declarative agent schema 1.9 (latest) / 1.6 limits:
#     https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.9
#   Windows package name MICROSOFT.COPILOT (AppLocker policy):
#     https://learn.microsoft.com/windows/client-management/manage-windows-copilot
COPILOT365_LATEST_SCHEMA = (1, 9)
# Package family folders under %LOCALAPPDATA%\Packages. The first is the
# documented package name (publisher id 8wekyb3d8bbwe is the Microsoft Store
# publisher id seen in documented paths). The second is carried over from the
# path tables and is UNVERIFIED as a Copilot package.
COPILOT365_PACKAGE_FAMILIES = (
    "Microsoft.Copilot_8wekyb3d8bbwe",
    "Microsoft.MicrosoftOfficeHub_8wekyb3d8bbwe",
)
_DA_LIMITS = {"name": 100, "description": 1000, "instructions": 8000}


def detect_copilot365_install(local_app_data: Path | None) -> list[str]:
    """Return package folders that show the Windows Copilot app is installed.

    Looks only at ``%LOCALAPPDATA%\\Packages`` (readable by the user). The
    ``Program Files\\WindowsApps`` folder is not read: it is access-restricted.
    Pass None where there is no such folder (non-Windows): returns [].
    """
    if not local_app_data:
        return []
    pkgs = local_app_data / "Packages"
    return [fam for fam in COPILOT365_PACKAGE_FAMILIES if (pkgs / fam).is_dir()]


def validate_declarative_agent(data: object) -> list[str]:
    """Check a declarative agent manifest against the documented required fields and limits.

    Returns human-readable issues; empty list means no documented rule is broken.
    """
    if not isinstance(data, dict):
        return ["manifest is not a JSON object"]
    issues: list[str] = []
    ver = data.get("version")
    if not isinstance(ver, str) or not re.fullmatch(r"v\d+\.\d+", ver):
        issues.append("version missing or not of the form vN.M")
    for key, limit in _DA_LIMITS.items():
        val = data.get(key)
        if not isinstance(val, str) or not val.strip():
            issues.append(f"{key} is required and must not be blank")
        elif len(val) > limit:
            issues.append(f"{key} is {len(val)} characters (limit {limit})")
    caps = data.get("capabilities")
    if isinstance(caps, list):
        names = [c.get("name") for c in caps if isinstance(c, dict)]
        dupes = sorted({n for n in names if names.count(n) > 1 and n})
        if dupes:
            issues.append(f"capabilities repeat: {', '.join(dupes)} (one of each allowed)")
    starters = data.get("conversation_starters")
    if isinstance(starters, list) and len(starters) > 12:
        issues.append(f"{len(starters)} conversation_starters (limit 12)")
    actions = data.get("actions")
    if isinstance(actions, list) and not 1 <= len(actions) <= 10:
        issues.append(f"{len(actions)} actions (allowed 1-10)")
    return issues


def _schema_tuple(version: object) -> tuple[int, int] | None:
    m = re.fullmatch(r"v(\d+)\.(\d+)", version) if isinstance(version, str) else None
    return (int(m.group(1)), int(m.group(2))) if m else None


def _declarative_agent_files(app_pkg: Path) -> list[Path]:
    """Declarative agent manifests of an app package.

    Follows ``copilotAgents.declarativeAgents[].file`` in manifest.json when it
    resolves to a file; falls back to ``declarativeAgent*.json`` (environment
    placeholders such as ``${{VAR}}`` in the file name cannot be resolved here).
    """
    found: list[Path] = []
    app = _read_json(app_pkg / "manifest.json") or {}
    agents = (app.get("copilotAgents") or {}).get("declarativeAgents") if isinstance(app, dict) else None
    for ent in agents if isinstance(agents, list) else []:
        f = ent.get("file") if isinstance(ent, dict) else None
        if isinstance(f, str) and "${{" not in f and (app_pkg / f).is_file():
            found.append(app_pkg / f)
    if not found:
        found = sorted(p for p in app_pkg.glob("declarativeAgent*.json") if p.is_file())
    return found


def _parse_copilot365_config(root: Path, tool: str = "copilot365") -> ToolConfig | None:
    """Parse M365 Copilot / M365 Agents Toolkit config from project files.

    Handles both the new ``m365agents.yml`` format (ATK v5.12+) and the
    legacy ``teamsapp.yml`` (Teams Toolkit name).  New format takes
    precedence when both exist.

    Also parses ``appPackage/`` manifests including declarative agent
    capabilities and ``ai-plugin.json`` function definitions.
    """
    cfg = ToolConfig(tool=tool)

    # ── Project manifest (YAML) ────────────────────────────────
    # New format first, legacy fallback
    manifest_files = [
        ("m365agents.yml", "m365agents.local.yml"),  # new (ATK v5.12+)
        ("teamsapp.yml", "teamsapp.local.yml"),  # legacy
    ]
    found_manifest = False
    for main_name, local_name in manifest_files:
        for name in (main_name, local_name):
            manifest = root / name
            if not manifest.is_file():
                continue
            try:
                import yaml

                data = yaml.safe_load(manifest.read_text(errors="replace", encoding="utf-8")) or {}
                cfg.config_files.append(str(manifest))
                if name == main_name:
                    cfg.setting_sources["version"] = str(manifest)
                    cfg.settings["version"] = data.get("version", "")
                    for _feat in ("provision", "deploy", "publish"):
                        if data.get(_feat):
                            cfg.features[_feat] = True
                base = name.replace(".yml", "").replace(".local", "")
                cfg.features[base] = True
                found_manifest = True
            except Exception:
                cfg.features[name.replace(".yml", "")] = True
                found_manifest = True
        if found_manifest:
            break  # use new format if found, don't also parse legacy

    # Detect deprecated format still in use
    if "teamsapp" in cfg.features and (root / "m365agents.yml").is_file():
        cfg.hints.append("teamsapp.yml is deprecated — m365agents.yml also exists, consider removing the legacy file")
    elif "teamsapp" in cfg.features and not (root / "m365agents.yml").is_file():
        cfg.hints.append("teamsapp.yml is the legacy Teams Toolkit name — Microsoft 365 Agents Toolkit uses m365agents.yml")

    # ── appPackage/ manifests ──────────────────────────────────
    app_pkg = root / "appPackage"
    if app_pkg.is_dir():
        cfg.features["appPackage"] = True

        # Declarative agent manifest
        agent_data = _read_json(app_pkg / "declarativeAgent.json")
        if agent_data:
            cfg.features["declarative_agent"] = True
            instructions = agent_data.get("instructions", "")
            if instructions:
                cfg.settings["instructions_length"] = len(instructions)
            caps = agent_data.get("capabilities", [])
            if isinstance(caps, list):
                cap_names = [c.get("name", "") for c in caps if isinstance(c, dict)]
                if cap_names:
                    cfg.settings["capabilities"] = cap_names
                # Map to feature flags
                for cn in cap_names:
                    low = cn.lower().replace(" ", "_")
                    if feat := _CAP_FEATURE_FLAGS.get(low):
                        cfg.features[feat] = True
                    elif low in ("graphconnectors", "graph_connectors"):
                        ids = [
                            conn["connection_id"]
                            for item in caps
                            if isinstance(item, dict)
                            and item.get("name", "").lower().replace(" ", "") == "graphconnectors"
                            for conn in item.get("connections", [])
                            if isinstance(conn, dict) and conn.get("connection_id")
                        ]
                        if ids:
                            cfg.settings["graph_connector_ids"] = ids
                        cfg.features["graph_connectors"] = True
            actions = agent_data.get("actions", [])
            if actions:
                cfg.settings["actions_count"] = len(actions)
            starters = agent_data.get("conversation_starters", [])
            if starters:
                cfg.settings["starters_count"] = len(starters)

        # App manifest
        app_data = _read_json(app_pkg / "manifest.json")
        if app_data:
            cfg.settings["manifest_version"] = app_data.get("manifestVersion", "")
            cfg.settings["app_name"] = (app_data.get("name", {}) or {}).get("short", "")

        # ai-plugin.json — function definitions
        plugin_data = _read_json(app_pkg / "ai-plugin.json") or _read_json(app_pkg / "apiPlugin.json")
        if plugin_data:
            cfg.features["api_plugin"] = True
            cfg.settings["plugin_name"] = plugin_data.get("name_for_human", "")
            fns = plugin_data.get("functions", [])
            if isinstance(fns, list) and fns:
                fn_defs = [
                    {"name": fn.get("name", ""), "description": (fn.get("description", "") or "")[:100]}
                    for fn in fns
                    if isinstance(fn, dict)
                ]
                cfg.settings["functions"] = fn_defs
                cfg.settings["function_count"] = len(fn_defs)
            runtimes = [rt for rt in plugin_data.get("runtimes", []) if isinstance(rt, dict)]
            if rt_types := sorted({rt.get("type", "") for rt in runtimes} - {""}):
                cfg.settings["runtime_types"] = rt_types
            if auth_types := sorted(
                {rt["auth"]["type"] for rt in runtimes if isinstance(rt.get("auth"), dict) and rt["auth"].get("type")}
                - {""}
            ):
                cfg.settings["auth_types"] = auth_types

        # Every declarative agent in the package: schema version, size, rule check
        packages = []
        for f in _declarative_agent_files(app_pkg):
            data = _read_json(f)
            if data is None:
                packages.append({"file": f.name, "issues": ["not readable as JSON"]})
                continue
            issues = validate_declarative_agent(data)
            sv = _schema_tuple(data.get("version") if isinstance(data, dict) else None)
            if sv and sv < COPILOT365_LATEST_SCHEMA:
                cfg.hints.append(
                    f"{f.name} uses declarative agent schema v{sv[0]}.{sv[1]}; "
                    f"latest documented is v{COPILOT365_LATEST_SCHEMA[0]}.{COPILOT365_LATEST_SCHEMA[1]}"
                )
            for i in issues:
                cfg.hints.append(f"{f.name}: {i}")
            packages.append(
                {
                    "file": f.name,
                    "name": str(data.get("name", "")) if isinstance(data, dict) else "",
                    "schema_version": data.get("version", "") if isinstance(data, dict) else "",
                    "instructions_chars": len(data.get("instructions", "") or "") if isinstance(data, dict) else 0,
                    "issues": issues,
                }
            )
        if packages:
            cfg.settings["agent_packages"] = packages

    # ── Windows app install (user-readable package data folder only) ──
    lad = os.environ.get("LOCALAPPDATA") if IS_WINDOWS else None
    evidence = detect_copilot365_install(Path(lad) if lad else None)
    cfg.features["installed"] = bool(evidence)
    if evidence:
        cfg.settings["install_evidence"] = evidence
    cfg.hints.append(
        "Microsoft 365 Copilot is cloud-hosted: sessions, tokens, cost, prompts and responses "
        "are not available from this machine"
    )

    # ── Environment files ──────────────────────────────────────
    if (env_dir := root / "env").is_dir():
        if envs := sorted(f.name.replace(".env.", "") for f in safe_iterdir(env_dir) if f.name.startswith(".env.")):
            cfg.settings["environments"] = envs

    # ── Legacy .fx/ directory ──────────────────────────────────
    if (root / ".fx").is_dir():
        cfg.features["legacy_fx"] = True

    cfg.hints.extend(_generate_hints(cfg))
    return cfg


# ─── Public API ─────────────────────────────────────────────────


def _get_nested(data: dict, key_path: str) -> Any | None:
    """Resolve a dot-notated key (e.g. 'general.vimMode') against a nested dict."""
    parts = key_path.split(".")
    curr = data
    for p in parts:
        if not isinstance(curr, dict) or p not in curr:
            return None
        curr = curr[p]
    return curr


_GEMINI_GROUP_PAIRS: dict[str, list[tuple[str, str]]] = {
    "General": [
        ("vim_mode", "vimMode"),
        ("approval_mode", "approvalMode"),
        ("auto_update", "autoUpdate"),
        ("notifications", "notifications"),
        ("max_attempts", "maxAttempts"),
    ],
    "UI": [
        ("line_numbers", "lineNumbers"),
        ("alternate_screen", "alternateScreen"),
        ("hide_context", "hideContext"),
        ("theme", "theme"),
    ],
}


def _hook_summary(value: object) -> object:
    """Hooks as a count of events and rules; the commands are never copied."""
    if isinstance(value, dict):
        rules = sum(len(v) for v in value.values() if isinstance(v, list))
        return f"{len(value)} events, {rules} rules"
    return "configured"


def _parse_generic_config(root: Path, tool_name: str, spec: dict) -> ToolConfig | None:
    """Generic parser that uses extraction rules from tool-configs.yaml."""
    from ..platforms import (
        claude_global_dir,
        codex_global_dir,
        cursor_user_dir,
        gemini_global_dir,
        vscode_user_dir,
        windsurf_global_dir,
    )

    _PATH_FNS = {
        "claude_global_dir": claude_global_dir,
        "vscode_user_dir": vscode_user_dir,
        "codex_global_dir": codex_global_dir,
        "cursor_user_dir": cursor_user_dir,
        "windsurf_global_dir": windsurf_global_dir,
        "gemini_global_dir": gemini_global_dir,
    }

    cfg = ToolConfig(tool=tool_name)
    has_data = False
    file_layers: list[Layer] = []
    extracted: set[str] = set()

    # 0. Check if tool is likely installed
    # Check binary
    if shutil.which(tool_name.split("-")[0]):
        has_data = True

    # Check global config dir
    path_fn_name = None
    for f_spec in spec.get("config_files", []):
        if "path_fn" in f_spec:
            path_fn_name = f_spec["path_fn"]
            break
    if path_fn_name:
        fn = _PATH_FNS.get(path_fn_name)
        if fn and fn().is_dir():
            has_data = True

    # 1. Process config files
    for f_spec in spec.get("config_files", []):
        path = None
        if "path_fn" in f_spec:
            fn = _PATH_FNS.get(f_spec["path_fn"])
            if fn:
                path = fn() / f_spec["file"]
        elif "path" in f_spec:
            p_str = f_spec["path"].replace("{project-root}", str(root)).replace("{home}", str(Path.home()))
            path = Path(p_str)

        if not path or not path.is_file():
            continue

        data = _read_json(path) if f_spec.get("format") == "json" else _read_toml(path)
        if not data:
            continue

        has_data = True
        cfg.config_files.append(str(path))
        file_layers.append(("", data, path))
        extracted.update(str(v) for v in f_spec.get("extract", {}).values())

        # Extraction
        for attr, key_path in f_spec.get("extract", {}).items():
            val = _get_nested(data, key_path)
            if val is not None:
                cfg.setting_sources[attr] = str(path)
                cfg.setting_values.setdefault(attr, []).append(("", val, str(path), key_path))
                if attr == "model":
                    cfg.model = str(val)
                else:
                    cfg.settings[attr] = val

    # Every other key of every file read, lowest precedence first.
    _add_layers(cfg, file_layers, whole=("hooks",), exclude=extracted, value_fns={"hooks": _hook_summary})

    # 2. Apply defaults for missing settings
    defaults = spec.get("defaults", {})
    for attr, default_val in defaults.items():
        if attr not in cfg.settings and (not hasattr(cfg, attr) or not getattr(cfg, attr)):
            if hasattr(cfg, attr):
                setattr(cfg, attr, default_val)
            else:
                cfg.settings[attr] = default_val
            cfg.setting_sources.setdefault(attr, "")  # no file: a default value

    # 3. Special feature discovery
    feat_spec = spec.get("features", {})

    # Hooks
    if "hooks" in feat_spec and feat_spec["hooks"].get("type") == "count_events":
        hook_data = cfg.settings.get("hooks") or {}
        if isinstance(hook_data, dict) and hook_data:
            rule_count = sum(len(rules) for rules in hook_data.values() if isinstance(rules, list))
            cfg.settings["hooks"] = f"{len(hook_data)} events, {rule_count} rules"
            has_data = True

    # MD Agents
    if "agents" in feat_spec and feat_spec["agents"].get("type") == "md_agent_discovery":
        # Guess prefix from tool name (claude-code -> .claude, gemini-cli -> .gemini)
        prefix = tool_name.split("-")[0]
        count = _count_md_agents(root, root / f".{prefix}")
        if count > 0:
            cfg.feature_groups.setdefault("Agent", {})["customAgents"] = count
            has_data = True

    # 4. Map settings to feature groups for UI
    # We now drive this from YAML if possible, or fall back to tool-specific logic
    group_spec = spec.get("ui_groups", {})
    if group_spec:
        for group_name, pairs in group_spec.items():
            chunk = _pick(cfg.settings.get, [(p[0], p[1]) for p in pairs.items()])
            if chunk:
                cfg.feature_groups[group_name] = cfg.feature_groups.get(group_name, {}) | chunk

    # Fallback/Legacy hardcoded groups for gemini-cli if not in YAML
    if tool_name == "gemini-cli" and not group_spec:
        for group_name, pairs in _GEMINI_GROUP_PAIRS.items():
            cfg.feature_groups[group_name] = _pick(cfg.settings.get, pairs)

    # Group rows carry the chain of the setting they show.
    for group_name, values in cfg.feature_groups.items():
        pairs = group_spec.get(group_name, {}).items() if group_spec else _GEMINI_GROUP_PAIRS.get(group_name, [])
        for attr, label in pairs:
            if label in values and attr in cfg.setting_values:
                cfg.setting_values[f"{group_name}/{label}"] = cfg.setting_values[attr]
            if label in values and attr in cfg.setting_sources:
                cfg.setting_sources[f"{group_name}/{label}"] = cfg.setting_sources[attr]

    return _finish(cfg, has_data)


def _parse_gemini_config(root: Path, tool: str = "gemini-cli") -> ToolConfig | None:
    # Delegate to generic parser using YAML spec
    from ..data.schema import load_tool_configs

    spec = load_tool_configs().get(tool)
    if not spec:
        return None
    return _parse_generic_config(root, tool, spec)



def _copilot_cli_version() -> str:
    """Version of the npm-installed Copilot CLI, read from its package.json (never launches the binary)."""
    exe = shutil.which("copilot")
    if not exe:
        return ""
    try:
        resolved = Path(exe).resolve()
    except OSError:
        return ""
    for pkg in (
        resolved.parent / "package.json",
        resolved.parent.parent / "package.json",
        resolved.parent.parent / "node_modules" / "@github" / "copilot" / "package.json",
        resolved.parent / "node_modules" / "@github" / "copilot" / "package.json",  # Windows npm prefix layout
    ):
        data = _read_json(pkg)
        if data and data.get("name") == "@github/copilot":
            return str(data.get("version", ""))
    return ""


def _copilot_desktop_version() -> str:
    """Version of the GitHub Copilot desktop app, from file metadata; never by launching it."""
    if IS_WINDOWS:
        return copilot_desktop_windows_version()

    import plistlib

    plist = Path("/Applications/GitHub Copilot.app/Contents/Info.plist")
    try:
        return str(plistlib.loads(plist.read_bytes()).get("CFBundleShortVersionString", ""))
    except (OSError, plistlib.InvalidFileException, ValueError):
        return ""


# Copilot CLI settings.json keys with a curated section and label.
_COPILOT_CLI_KEYS: dict[str, tuple[str, str]] = {
    "model": ("model", "Model"),
    "effortLevel": ("model", "Reasoning effort"),
    "contextTier": ("model", "Context tier"),
    "planModel": ("model", "Plan model"),
    "planEffortLevel": ("model", "Plan reasoning effort"),
    "planContextTier": ("model", "Plan context tier"),
    "defaultMode": ("autonomy", "Default mode"),
    "defaultPermissionMode": ("autonomy", "Default permission mode"),
    "sandbox.allowBypass": ("autonomy", "Allow sandbox bypass"),
    "sandbox.allowDevToolAccess": ("autonomy", "Allow developer tool access in the sandbox"),
    "customAgents.defaultLocalOnly": ("autonomy", "Custom agents local only by default"),
    "subagents.maxConcurrency": ("autonomy", "Max concurrent subagents"),
    "subagents.maxDepth": ("autonomy", "Max subagent depth"),
    "subagents.disabledSubagents": ("autonomy", "Disabled subagents"),
    "enabledPlugins": ("extensions", "Enabled plugins"),
    "extraKnownMarketplaces": ("extensions", "Extra plugin marketplaces"),
    "extensions.disabledExtensions": ("extensions", "Disabled extensions"),
    "disabledSkills": ("extensions", "Disabled skills"),
    "disabledMcpServers": ("mcp", "Disabled MCP servers"),
    "hooks": ("hooks", "Hooks"),
    "includeCoAuthoredBy": ("other", "Co-authored-by trailer"),
    "showReasoning": ("other", "Show reasoning"),
    "streamerMode": ("other", "Streamer mode"),
    "logLevel": ("other", "Log level"),
    "toolSearch": ("other", "Tool search"),
    "experimental": ("other", "Experimental features"),
    "footer": ("other", "Footer"),
}
# Objects kept as one row: maps of names, folded groups, and hooks (never their commands).
_COPILOT_WHOLE = ("footer", "experimental", "enabledPlugins", "extraKnownMarketplaces", "hooks")


def _enabled_names(value: object) -> object:
    if isinstance(value, dict):
        return sorted(str(k) for k, v in value.items() if v is True)
    if isinstance(value, list):
        return [str(v) for v in value]
    return value


def _marketplace_names(value: object) -> object:
    if isinstance(value, dict):
        return sorted(str(k) for k in value)
    if isinstance(value, list):
        return [str(v.get("name", "")) if isinstance(v, dict) else str(v) for v in value]
    return value


_COPILOT_VALUE_FNS: dict[str, Callable[[object], object]] = {
    "enabledPlugins": _enabled_names,
    "extraKnownMarketplaces": _marketplace_names,
    "hooks": lambda _v: "configured",
}


def _approval_counts(data: dict | None) -> dict[str, int]:
    """Location -> number of saved tool approvals, from ``permissions-config.json``."""
    locations = (data or {}).get("locations") if isinstance(data, dict) else None
    out: dict[str, int] = {}
    for loc, spec in (locations.items() if isinstance(locations, dict) else []):
        if isinstance(spec, dict):
            out[str(loc)] = sum(len(v) for v in spec.values() if isinstance(v, (list, dict)))
        elif isinstance(spec, list):
            out[str(loc)] = len(spec)
    return out


def _parse_copilot_home_config(root: Path, tool: str = "copilot-cli") -> ToolConfig | None:
    """Copilot CLI and the Copilot desktop app: both read ``~/.copilot`` (``COPILOT_HOME``).

    Only files that exist are parsed; absent facts are reported as ``not configured``.
    Layers, lowest precedence first: managed baseline, user ``settings.json``,
    ``.github/copilot/settings.json``, ``.github/copilot/settings.local.json``,
    ``COPILOT_MODEL``, then the managed floor keys. ``config.json`` is read for
    ``trustedFolders`` only; credential and database files are never opened.
    """
    home = copilot_global_dir()
    cfg = ToolConfig(tool=tool)
    catalog = settings_catalog(tool)
    settings_path = home / "settings.json"
    proj_path = root / ".github" / "copilot" / "settings.json"
    local_path = root / ".github" / "copilot" / "settings.local.json"
    managed_path = _first_fixed(COPILOT_MANAGED_FILES)
    settings = _read_json(settings_path) or {}
    if not isinstance(settings, dict):
        settings = {}
    if settings_path.is_file():
        cfg.config_files.append(str(settings_path))

    def flat(data: object) -> dict | None:
        if not isinstance(data, dict):
            return None
        return flatten_settings(data, skip=("subagents.agents",), whole=_COPILOT_WHOLE)

    raw: dict[str, dict | None] = {"user": settings}
    for name, path in (("project", proj_path), ("project-local", local_path)):
        data = _read_json(path)
        raw[name] = data if isinstance(data, dict) else None
        if raw[name] is not None:
            cfg.config_files.append(str(path))
    managed = _read_json(managed_path) if managed_path else None
    managed = managed if isinstance(managed, dict) else None
    if managed is not None and managed_path:
        cfg.config_files.append(str(managed_path))
    floors = tuple(COPILOT_FLOOR_KEYS) + tuple(k for k, e in catalog.items() if e.get("locked_floor"))
    cfg.managed_floors = floors

    def is_floor(key: str) -> bool:
        return any(key == f or key.startswith(f + ".") for f in floors)

    managed_flat = flat(managed) or {}
    base = {k: v for k, v in managed_flat.items() if not is_floor(k)}
    top = {k: v for k, v in managed_flat.items() if is_floor(k)}
    env_model = os.environ.get("COPILOT_MODEL", "")
    layers: list[Layer] = [
        ("managed", base or None, managed_path or ""),
        ("user", flat(settings), settings_path),
        ("project", flat(raw["project"]), proj_path),
        ("project-local", flat(raw["project-local"]), local_path),
        ("env", {"model": env_model} if env_model else None, env_source("COPILOT_MODEL")),
        ("managed", top or None, managed_path or ""),
    ]
    for key, (section, label) in _COPILOT_CLI_KEYS.items():
        cfg.key_sections[key] = section
        cfg.key_labels[key] = label
    _add_layers(cfg, layers, whole=_COPILOT_WHOLE, value_fns=_COPILOT_VALUE_FNS)

    cfg.model = str(cfg.settings.get("model") or "")
    for k in ("model", "extensions"):
        if k == "model" and "model" in cfg.setting_sources:
            continue
        cfg.setting_sources[k] = str(settings_path) if settings_path.is_file() else ""
    if env_model:
        cfg.setting_sources["model"] = env_source("COPILOT_MODEL")

    # Earlier flat rows, kept in settings; the labelled rows above win in the sections.
    if settings.get("effortLevel"):
        cfg.settings["effort"] = settings["effortLevel"]
        cfg.setting_sources["effort"] = str(settings_path)
    disabled = settings.get("disabledMcpServers", [])
    cfg.settings["disabled_mcp_servers"] = list(disabled) if isinstance(disabled, (list, dict)) else []
    cfg.setting_sources["disabled_mcp_servers"] = str(settings_path) if settings_path.is_file() else ""
    for old, new in (("effort", "effortLevel"), ("disabled_mcp_servers", "disabledMcpServers")):
        if new in cfg.settings:
            cfg.covered_keys.append(old)
    plugins = cfg.settings.get("enabledPlugins")
    cfg.extensions = list(plugins) if isinstance(plugins, list) else []
    if "enabledPlugins" in cfg.settings:
        cfg.covered_keys.append("extensions")

    # Trusted folders: config.json is written by Copilot; only this key is used.
    config_json = home / "config.json"
    trusted = (_read_json(config_json) or {}).get("trustedFolders") if config_json.is_file() else None
    if isinstance(trusted, list):
        cfg.settings["trustedFolders"] = [str(t) for t in trusted]
        cfg.setting_sources["trustedFolders"] = str(config_json)
        cfg.key_sections["trustedFolders"] = "autonomy"
        cfg.key_notes["trustedFolders"] = f"{len(trusted)} folders. Written by Copilot; edit with the tool."

    # Saved tool approvals, as a count per location.
    approvals_path = home / "permissions-config.json"
    approvals = _approval_counts(_read_json(approvals_path)) if approvals_path.is_file() else {}
    if approvals:
        cfg.settings["savedToolApprovals"] = approvals
        cfg.setting_sources["savedToolApprovals"] = str(approvals_path)
        cfg.key_labels["savedToolApprovals"] = "Saved tool approvals"
        cfg.key_sections["savedToolApprovals"] = "autonomy"
        cfg.key_notes["savedToolApprovals"] = f"{len(approvals)} locations with saved approvals."

    # Models a repository allows.
    allowed_path = root / ".github" / "allowed_models.txt"
    if allowed_path.is_file():
        try:
            lines = allowed_path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            lines = []
        cfg.settings["allowedModels"] = [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
        cfg.setting_sources["allowedModels"] = str(allowed_path)
        cfg.key_labels["allowedModels"] = "Allowed models"
        cfg.key_sections["allowedModels"] = "model"

    for mcp_path in (home / "mcp-config.json", root / ".copilot" / "mcp-config.json", root / ".copilot-mcp.json"):
        if mcp_path.is_file():
            cfg.config_files.append(str(mcp_path))
        for name in _mcp_server_names(_read_json(mcp_path)):
            if name not in cfg.mcp_servers:
                cfg.mcp_servers.append(name)

    instr = home / "copilot-instructions.md"
    cfg.settings["global_instructions"] = "configured" if instr.is_file() else "not configured"
    if instr.is_file():
        cfg.config_files.append(str(instr))
        cfg.setting_sources["global_instructions"] = str(instr)

    version = _copilot_desktop_version() if tool == "copilot-desktop" else _copilot_cli_version()
    cfg.settings["version"] = version or "not detected"
    cfg.settings["telemetry"] = "not configured"  # no documented Copilot CLI/desktop OTel setting is read

    # Scope layers, lowest precedence first.
    managed_shown = managed_path or (COPILOT_MANAGED_FILES[0] if COPILOT_MANAGED_FILES else "")
    cfg.scopes = [
        _scope(
            "managed",
            managed_shown,
            managed is not None,
            "Baseline for most keys, which the other scopes can override; "
            + ", ".join(f"{f}.*" if f == "sandbox" else f for f in floors)
            + " are floors that win over every scope.",
        ),
        _file_scope("user", settings_path),
        _file_scope("project", proj_path),
        _file_scope("project-local", local_path, "Wins over the committed project file."),
        _env_scope(tool, "COPILOT_MODEL overrides the model key of every file."),
    ]

    # Agents: settings pins and agent files (project wins over user for the same name).
    texts: dict[str, str] = {}
    pin_layers: list[Layer] = [
        ("managed", managed, managed_path or ""),
        ("user", settings, settings_path),
        ("project", raw["project"], proj_path),
        ("project-local", raw["project-local"], local_path),
    ]
    pins = _settings_pins(pin_layers, texts)
    defs = _agent_files(
        [
            (home / "agents", "user", ("*.agent.md",)),
            (root / ".claude" / "agents", "project", ("*.md",)),
            (root / ".github" / "agents", "project", ("*.agent.md", "*.md")),
        ]
    )
    inherit_text = _main_model_text(cfg.model, "the session's model")
    for name in list(defs) + [n for n in pins if n not in defs]:
        cfg.agent_rows.append(_agent_row(cfg, name, defs.get(name), pins.get(name, []), inherit_text))

    present = (
        settings_path.is_file()
        or bool(version)
        or raw["project"] is not None
        or raw["project-local"] is not None
        or (tool == "copilot-desktop" and (home / "data.db").is_file())
        or (tool == "copilot-cli" and (home / "session-state").is_dir())
    )
    return _finish(cfg, present)


# ─── Config parser registry (tool name → parser function) ────────
_CONFIG_PARSER_REGISTRY: dict[str, Callable] = {
    "vscode": _parse_vscode_config,
    "claude-code": _parse_claude_code_config,
    "claude-desktop": _parse_claude_desktop_config,
    "copilot": _parse_copilot_config,
    "copilot365": _parse_copilot365_config,
    "copilot-cli": _parse_copilot_home_config,
    "copilot-desktop": _parse_copilot_home_config,
    "cursor": _parse_cursor_config,
    "codex-cli": _parse_codex_config,
    "windsurf": _parse_windsurf_config,
    "gemini-cli": _parse_gemini_config,
}


def collect_tool_configs(root: Path) -> list[ToolConfig]:
    """Collect config state from tools defined in tool-configs.yaml.

    Iterates YAML entries, dispatches to registered parsers.
    Tool names come from YAML keys. Safe — never raises.
    """
    tool_configs_yaml = load_tool_configs()
    configs = []
    texts: dict[str, str | None] = {}
    try:
        from ..context_audit import _persistent_env

        persisted = _persistent_env([])
    except Exception as exc:  # noqa: BLE001 - the registry or a profile that cannot be read hides nothing else
        log.debug("Persistent environment not read: %s", exc)
        persisted = {}
    for tool_name in tool_configs_yaml:
        parser = _CONFIG_PARSER_REGISTRY.get(tool_name)
        if parser is None:
            log.debug("No config parser registered for tool %s", tool_name)
            continue
        try:
            result = parser(root, tool=tool_name)
            declared = tool_configs_yaml[tool_name].get("local_data") if isinstance(tool_configs_yaml[tool_name], dict) else None
            if declared:
                result = result or ToolConfig(tool=tool_name)
                result.local_data = {str(k): bool(v) for k, v in declared.items()}
            if result:
                result.project_root = str(root)
                if not result.scopes:
                    result.scopes = _scopes_from_files(result)
                result.sections = normalize_sections(result, texts)
                result.env_vars = env_var_rows(result, persisted)
                env_scope_fill(result)
                configs.append(result)
        except Exception as exc:
            log.error("Error parsing config for %s: %s", tool_name, exc)
    return configs
