# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Declared MCP servers per tool, from every file the tool reads them from.

Each entry says what a reader needs to know about one declaration: its name,
transport, the command or URL (masked through ``secret_mask``), the scope and
file it is declared in, the plugin that provides it, and whether the tool will
use it (enabled, disabled, approved, rejected, waiting for approval). Values
of ``env`` and ``headers`` are never kept: only their names.

The file locations come from each tool's documentation:

- Claude Code: user and local scope in ``~/.claude.json`` (``mcpServers`` and
  ``projects[<root>].mcpServers``), project scope in ``<root>/.mcp.json`` with its
  approval state (``enabledMcpjsonServers``, ``disabledMcpjsonServers``,
  ``enableAllProjectMcpServers``), plugin ``.mcp.json`` files and ``managed-mcp.json``.
- Copilot CLI (``docs: add-mcp-servers.md``, ``cli-plugin-reference.md``):
  ``~/.copilot/mcp-config.json``, ``<root>/.mcp.json``, ``<root>/.github/mcp.json``
  and the MCP files of plugins under ``installed-plugins``; ``enabledPlugins: false``
  and ``disabledMcpServers`` turn a server off.
- VS Code: ``User/mcp.json`` and ``.vscode/mcp.json`` (``servers``) and the
  ``mcp`` settings key.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from ..secret_mask import mask_mcp_config, mask_text

# MCP states, in words a reader understands.
MCP_STATES = (
    "enabled",  # declared and used
    "disabled",  # declared, turned off by a setting
    "plugin-disabled",  # the plugin that provides it is turned off
    "approved",  # a project server the user approved
    "rejected",  # a project server the user turned down
    "needs-approval",  # a project server not approved yet: the tool asks before starting it
    "declared",  # declared; the tool keeps its start/stop state outside its files
)

_TRANSPORTS = {"stdio": "stdio", "local": "stdio", "http": "http", "streamable-http": "http", "sse": "sse"}


def read_json(path: Path) -> dict | None:
    """A JSON object from *path*; a file that is not strict JSON is retried without ``//`` comment lines."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    for candidate in (text, re.sub(r"(?m)^\s*//.*$", "", text)):
        try:
            data = json.loads(candidate)
        except ValueError:
            continue
        return data if isinstance(data, dict) else None
    return None


def server_map(data: object, *keys: str, bare: bool = False) -> dict[str, dict]:
    """The servers of an MCP file: under the first of *keys* present, else (``bare``) the top level."""
    if not isinstance(data, dict):
        return {}
    for key in keys:
        if isinstance(data.get(key), dict):
            return {str(k): v for k, v in data[key].items() if isinstance(v, dict)}
    if bare:
        return {str(k): v for k, v in data.items() if isinstance(v, dict) and not str(k).startswith("$")
                and ("command" in v or "url" in v)}
    return {}


def _transport(config: dict) -> str:
    declared = str(config.get("type") or config.get("transport") or "").lower()
    if declared in _TRANSPORTS:
        return _TRANSPORTS[declared]
    if config.get("command"):
        return "stdio"
    if config.get("url") or config.get("serverUrl"):
        return "http"
    return declared or "unknown"


def mcp_entry(name: str, config: dict, *, scope: str, source: str, plugin: str = "", state: str = "enabled",
              state_source: str = "", note: str = "") -> dict:
    """One declared server, safe to show: command line and URL masked, env and header values dropped."""
    shown = mask_mcp_config(config)
    command = shown.get("command")
    args = shown.get("args") if isinstance(shown.get("args"), list) else []
    target = ""
    if isinstance(command, str) and command:
        target = mask_text(" ".join([command, *(str(a) for a in args)]))
    url = shown.get("url") or shown.get("serverUrl") or ""
    env = config.get("env") if isinstance(config.get("env"), dict) else {}
    headers = config.get("headers") if isinstance(config.get("headers"), dict) else {}
    return {
        "name": name,
        "transport": _transport(config),
        "command": target,
        "url": str(url) if isinstance(url, str) else "",
        "env_names": sorted(str(k) for k in env),
        "header_names": sorted(str(k) for k in headers),
        "scope": scope,
        "source": source,
        "plugin": plugin,
        "state": state,
        "state_source": state_source,
        "note": note,
    }


def _names(value: object) -> set[str]:
    if isinstance(value, list):
        return {str(v) for v in value}
    if isinstance(value, dict):
        return {str(k) for k, v in value.items() if v}
    return set()


# ─── Plugins ────────────────────────────────────────────────────

# Manifest locations, in the order the Copilot CLI checks them (cli-plugin-reference.md).
_MANIFESTS = (".plugin/plugin.json", "plugin.json", ".github/plugin/plugin.json", ".claude-plugin/plugin.json")
# Plugin MCP files: Agent Plugins ``mcp.json``; legacy ``.mcp.json`` and ``.github/mcp.json``.
_PLUGIN_MCP_FILES = ("mcp.json", ".mcp.json", ".github/mcp.json")


def plugin_mcp_files(plugin_dir: Path) -> list[tuple[Path, dict]]:
    """(file, servers) of a plugin: its MCP files, else the manifest's ``mcpServers`` (path or inline)."""
    out: list[tuple[Path, dict]] = []
    for rel in _PLUGIN_MCP_FILES:
        path = plugin_dir / rel
        if path.is_file():
            servers = server_map(read_json(path), "mcpServers", "servers", bare=True)
            if servers:
                out.append((path, servers))
    if out:
        return out
    for rel in _MANIFESTS:
        manifest = plugin_dir / rel
        data = read_json(manifest) if manifest.is_file() else None
        if not isinstance(data, dict):
            continue
        field = data.get("mcpServers")
        if isinstance(field, dict):
            out.append((manifest, server_map({"mcpServers": field}, "mcpServers")))
        elif isinstance(field, str):
            target = (plugin_dir / field).resolve()
            if target.is_file() and plugin_dir.resolve() in target.parents:
                out.append((target, server_map(read_json(target), "mcpServers", "servers", bare=True)))
        break
    return out


def copilot_plugins(home: Path) -> list[tuple[str, Path]]:
    """(spec, folder) of every installed Copilot CLI plugin; spec is ``name@marketplace`` (``_direct`` keeps its id)."""
    root = home / "installed-plugins"
    out: list[tuple[str, Path]] = []
    if not root.is_dir():
        return out
    for market in sorted(p for p in root.iterdir() if p.is_dir()):
        for plugin in sorted(p for p in market.iterdir() if p.is_dir()):
            spec = plugin.name if market.name == "_direct" else f"{plugin.name}@{market.name}"
            out.append((spec, plugin))
    return out


def claude_plugins(claude_home: Path) -> list[tuple[str, Path]]:
    """(spec, folder) of every installed Claude Code plugin, from ``plugins/installed_plugins.json``."""
    data = read_json(claude_home / "plugins" / "installed_plugins.json")
    plugins = data.get("plugins") if isinstance(data, dict) else None
    out: list[tuple[str, Path]] = []
    for spec, installs in (plugins.items() if isinstance(plugins, dict) else []):
        for install in installs if isinstance(installs, list) else [installs]:
            path = install.get("installPath") if isinstance(install, dict) else None
            if isinstance(path, str) and path:
                out.append((str(spec), Path(path)))
    return out


def _plugin_state(spec: str, enabled: dict[str, tuple[object, str]], absent_enabled: bool) -> tuple[bool, str]:
    """(on, the file that decides) for a plugin, from the merged ``enabledPlugins``."""
    value, where = enabled.get(spec, (None, ""))
    if value is None:
        return absent_enabled, ""
    return value is not False, where


def merged_enabled_plugins(layers: list[tuple[str, dict | None, str]]) -> dict[str, tuple[object, str]]:
    """Plugin spec -> (value, file) of ``enabledPlugins``, the highest layer winning per spec."""
    out: dict[str, tuple[object, str]] = {}
    for _scope, data, path in layers:
        value = data.get("enabledPlugins") if isinstance(data, dict) else None
        if isinstance(value, dict):
            for spec, on in value.items():
                out[str(spec)] = (on, str(path))
        elif isinstance(value, list):
            for spec in value:
                out[str(spec)] = (True, str(path))
    return out


# ─── Copilot CLI ────────────────────────────────────────────────


def copilot_cli_mcp(home: Path, root: Path, layers: list[tuple[str, dict | None, str]]) -> list[dict]:
    """Every MCP server the Copilot CLI declares for *root*, with its state.

    *layers* are the settings files, lowest precedence first, as (scope, data, path).
    """
    disabled: dict[str, str] = {}
    for _scope, data, path in layers:
        if isinstance(data, dict) and "disabledMcpServers" in data:
            disabled = {name: str(path) for name in _names(data.get("disabledMcpServers"))}
    enabled = merged_enabled_plugins(layers)
    out: list[dict] = []

    def add(servers: dict, scope: str, source: Path, plugin: str = "", plugin_on: bool = True, decided: str = "") -> None:
        for name, config in servers.items():
            if not plugin_on:
                state, where, note = "plugin-disabled", decided, f"The plugin {plugin} is turned off in enabledPlugins."
            elif name in disabled:
                state, where, note = "disabled", disabled[name], "Listed in disabledMcpServers."
            else:
                state, where, note = "enabled", "", ""
            out.append(mcp_entry(name, config, scope=scope, source=str(source), plugin=plugin, state=state,
                                 state_source=where, note=note))

    user = home / "mcp-config.json"
    add(server_map(read_json(user), "mcpServers"), "user", user)
    for spec, folder in copilot_plugins(home):
        on, where = _plugin_state(spec, enabled, absent_enabled=True)
        for path, servers in plugin_mcp_files(folder):
            add(servers, "plugin", path, plugin=spec, plugin_on=on, decided=where)
    for rel in (".github/mcp.json", ".mcp.json"):  # .mcp.json wins over .github/mcp.json in one folder
        path = root / rel
        if path.is_file():
            add(server_map(read_json(path), "mcpServers", bare=True), "project", path)
    return out


# ─── Claude Code ────────────────────────────────────────────────


def claude_code_mcp(
    root: Path,
    claude_home: Path,
    account: dict | None,
    account_path: Path,
    layers: list[tuple[str, dict | None, str]],
    managed_mcp: list[Path],
) -> list[dict]:
    """Every MCP server Claude Code declares for *root*, with its approval or enabled state.

    *layers* are the settings files (user, project, local, managed), lowest precedence first.
    """
    project_entry: dict = {}
    projects = (account or {}).get("projects") if isinstance(account, dict) else None
    if isinstance(projects, dict):
        for key in (str(root), str(root).rstrip("/\\")):
            if isinstance(projects.get(key), dict):
                project_entry = projects[key]
                break
    # Approval of project (.mcp.json) servers: settings files, then the project entry of ~/.claude.json.
    approval_layers = [*layers, ("local", project_entry, str(account_path))]
    approved: dict[str, str] = {}
    rejected: dict[str, str] = {}
    approve_all = ""
    for _scope, data, path in approval_layers:
        if not isinstance(data, dict):
            continue
        for name in _names(data.get("enabledMcpjsonServers")):
            approved[name] = str(path)
        for name in _names(data.get("disabledMcpjsonServers")):
            rejected[name] = str(path)
        if data.get("enableAllProjectMcpServers") is True:
            approve_all = str(path)
    turned_off = {name: str(account_path) for name in _names(project_entry.get("disabledMcpServers"))}
    out: list[dict] = []

    def plain(servers: dict, scope: str, source: Path, plugin: str = "", plugin_on: bool = True, decided: str = "") -> None:
        for name, config in servers.items():
            if not plugin_on:
                state, where, note = "plugin-disabled", decided, f"The plugin {plugin} is not enabled in enabledPlugins."
            elif name in turned_off:
                state, where, note = "disabled", turned_off[name], "Turned off for this project (disabledMcpServers)."
            else:
                state, where, note = "enabled", "", ""
            out.append(mcp_entry(name, config, scope=scope, source=str(source), plugin=plugin, state=state,
                                 state_source=where, note=note))

    for path in managed_mcp:
        if path.is_file():
            plain(server_map(read_json(path), "mcpServers"), "managed", path)
    plain(server_map(account, "mcpServers"), "user", account_path)
    plain(server_map(project_entry, "mcpServers"), "local", account_path)
    mcp_json = root / ".mcp.json"
    for name, config in server_map(read_json(mcp_json) if mcp_json.is_file() else None, "mcpServers").items():
        if name in rejected:
            state, where, note = "rejected", rejected[name], "Listed in disabledMcpjsonServers."
        elif name in approved:
            state, where, note = "approved", approved[name], "Listed in enabledMcpjsonServers."
        elif approve_all:
            state, where, note = "approved", approve_all, "enableAllProjectMcpServers is true."
        else:
            state, where, note = "needs-approval", "", "Claude Code asks before it starts this project server."
        out.append(mcp_entry(name, config, scope="project", source=str(mcp_json), state=state, state_source=where,
                             note=note))
    enabled = merged_enabled_plugins(layers)
    for spec, folder in claude_plugins(claude_home):
        on, where = _plugin_state(spec, enabled, absent_enabled=False)
        for path, servers in plugin_mcp_files(folder):
            plain(servers, "plugin", path, plugin=spec, plugin_on=on, decided=where)
    return out


# ─── VS Code ────────────────────────────────────────────────────


def vscode_mcp(layers: list[tuple[str, Path, dict | None]]) -> list[dict]:
    """MCP servers VS Code declares: ``mcp.json`` files (``servers``) and the ``mcp`` settings key.

    *layers* are (scope, file, parsed file), lowest precedence first. VS Code keeps whether a
    server runs in its own storage, so each entry is ``declared``.
    """
    out: list[dict] = []
    note = "VS Code keeps whether this server is started in its own storage, not in a file."
    for scope, path, data in layers:
        if not isinstance(data, dict):
            continue
        if path.name.lower() == "mcp.json":
            servers = server_map(data, "servers")
        else:
            block = data.get("mcp")
            servers = server_map(block, "servers") if isinstance(block, dict) else {}
        for name, config in servers.items():
            out.append(mcp_entry(name, config, scope=scope, source=str(path), state="declared", note=note))
    return out
