"""Discover all resources for AI coding tools in a project.

Scans for configuration files, memory, MCP servers, settings, and
running processes associated with Claude Code, GitHub Copilot, Cursor,
and Windsurf.
"""

from __future__ import annotations

import json
import os
import platform
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from .platforms import (
    claude_global_dir,
    claude_account_config,
    claude_projects_dir,
    copilot_session_dir,
    cursor_user_dir,
    vscode_user_dir,
    vscode_extensions_dir,
    windsurf_global_dir,
    gh_config_dir,
    azd_config_dir,
    promptflow_global_dir,
)
from .utils import estimate_tokens


# ─── Tree-walk helpers ──────────────────────────────────────────────

# Directories that are never relevant for AI tool config
_PRUNE_DIRS = frozenset({
    ".git", ".venv", "venv", ".env", "node_modules", ".npm", ".yarn",
    "__pycache__", ".mypy_cache", ".pytest_cache", ".tox", ".ruff_cache",
    "dist", "build", ".cargo", "target", ".idea", ".vs",
    "Pods", "DerivedData",  # Xcode / CocoaPods
})


def _find_in_tree(root: Path, filename: str) -> list[Path]:
    """Find every file named *filename* under root, skipping irrelevant dirs."""
    results = []
    for dirpath_str, dirnames, filenames in os.walk(str(root)):
        dirnames[:] = [d for d in dirnames if d not in _PRUNE_DIRS]
        if filename in filenames:
            results.append(Path(dirpath_str) / filename)
    return sorted(results)


def _find_dirs_in_tree(root: Path, dirname: str) -> list[Path]:
    """Find every directory named *dirname* under root.

    Does NOT recurse into found dirs (avoids descending into e.g. all of
    .github/actions/subdir/.github); still visits all other branches.
    """
    results = []
    for dirpath_str, dirnames, _ in os.walk(str(root)):
        if dirname in dirnames:
            results.append(Path(dirpath_str) / dirname)
        dirnames[:] = [d for d in dirnames
                       if d not in _PRUNE_DIRS and d != dirname]
    return sorted(results)




@dataclass
class ResourceFile:
    """A file resource belonging to a tool."""
    path: str
    kind: str          # instructions, rules, command, skill, agent, mcp, settings, memory, prompt, config
    size: int = 0
    tokens: int = 0


@dataclass
class ProcessInfo:
    """A running process associated with a tool."""
    pid: int
    name: str
    cmdline: str
    cpu_pct: str = ""
    mem_mb: str = ""


@dataclass
class McpServerInfo:
    """Extended info about a configured MCP server."""
    name: str
    tool: str              # which AI tool owns this config
    config: dict = field(default_factory=dict)
    status: str = "unknown"  # unknown | running | stopped | error
    pid: int | None = None
    cpu_pct: str = ""
    mem_mb: str = ""
    transport: str = ""    # stdio | http | sse
    endpoint: str = ""     # command or URL


@dataclass
class MemoryEntry:
    """A piece of agent memory / policy / decision."""
    source: str            # "claude-memory" | "aictx-hint" | "aictx-instruction"
    profile: str           # which profile this applies to
    file: str = ""         # filename or .aictx path
    content: str = ""
    tokens: int = 0
    lines: int = 0


@dataclass
class ToolResources:
    """All discovered resources for a single tool."""
    tool: str
    label: str
    files: list[ResourceFile] = field(default_factory=list)
    processes: list[ProcessInfo] = field(default_factory=list)
    mcp_servers: list[dict] = field(default_factory=list)
    memory: dict | None = None


# ─── Top-level API ──────────────────────────────────────────────────

_DISCOVERERS = []  # populated at module level below


def discover_all(root: Path, include_processes: bool = False) -> list[ToolResources]:
    """Discover resources for all known tools."""
    results = []
    for fn in _DISCOVERERS:
        res = fn(root)
        if include_processes:
            res.processes = _find_processes(res.tool)
            # also look for MCP server processes
            res.processes.extend(_find_mcp_processes(res.mcp_servers, res.processes))
        results.append(res)
    return results


# ─── File helpers ───────────────────────────────────────────────────

def _file_resource(path: Path, kind: str) -> ResourceFile | None:
    """Create a ResourceFile if path exists, else None."""
    if not path.is_file():
        return None
    try:
        size = path.stat().st_size
    except OSError:
        return None
    tokens = 0
    if size < 1_000_000:
        try:
            text = path.read_text(errors="replace")
            tokens = estimate_tokens(text)
        except OSError:
            pass
    return ResourceFile(str(path), kind, size, tokens)


def _dir_resources(directory: Path, pattern: str, kind: str) -> list[ResourceFile]:
    """Collect ResourceFiles from a directory glob."""
    out = []
    if directory.is_dir():
        for f in sorted(directory.glob(pattern)):
            if f.is_file():
                r = _file_resource(f, kind)
                if r:
                    out.append(r)
    return out


def _dedup_files(files: list[ResourceFile]) -> list[ResourceFile]:
    """Remove duplicate paths, keeping first occurrence."""
    seen: set[str] = set()
    out = []
    for f in files:
        if f.path not in seen:
            out.append(f)
            seen.add(f.path)
    return out


# ─── MCP helpers ────────────────────────────────────────────────────

def _load_mcp(path: Path, res: ToolResources) -> None:
    """Parse an MCP JSON config and append servers to res."""
    try:
        data = json.loads(path.read_text("utf-8"))
        for name, config in data.get("mcpServers", {}).items():
            res.mcp_servers.append({"name": name, "config": config})
    except (json.JSONDecodeError, KeyError, OSError):
        pass


# ─── Claude Code ────────────────────────────────────────────────────

def discover_claude(root: Path) -> ToolResources:
    res = ToolResources("claude", "Claude Code")

    # User-global memory file
    user_memory = claude_global_dir() / "CLAUDE.md"
    r = _file_resource(user_memory, "memory (user-global)")
    if r:
        res.files.append(r)

    # CLAUDE.md / CLAUDE.local.md in parent directories (Claude reads up)
    home = Path.home()
    parent = root.parent
    visited: set[Path] = set()
    while parent != parent.parent and parent not in visited:
        visited.add(parent)
        if parent == home or len(visited) > 10:
            break
        for name in ("CLAUDE.md", "CLAUDE.local.md"):
            r = _file_resource(parent / name, "instructions (parent)")
            if r:
                res.files.append(r)
        parent = parent.parent

    # Instruction files — recursively across the whole tree
    for path in _find_in_tree(root, "CLAUDE.md"):
        r = _file_resource(path, "instructions")
        if r:
            res.files.append(r)
    for path in _find_in_tree(root, "CLAUDE.local.md"):
        r = _file_resource(path, "instructions (local)")
        if r:
            res.files.append(r)

    # .claude/ dirs anywhere in the tree → rules, commands, skills, settings
    for claude_dir in _find_dirs_in_tree(root, ".claude"):
        res.files.extend(_dir_resources(claude_dir / "rules", "*.md", "rules"))
        res.files.extend(_dir_resources(claude_dir / "commands", "*.md", "command"))
        skills_dir = claude_dir / "skills"
        if skills_dir.is_dir():
            for sd in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
                r = _file_resource(sd / "SKILL.md", "skill")
                if r:
                    res.files.append(r)
        for name in ("settings.json", "settings.local.json"):
            r = _file_resource(claude_dir / name, "settings")
            if r:
                res.files.append(r)

    # Global settings
    claude_home = claude_global_dir()
    for name in ("settings.json", "settings.local.json"):
        r = _file_resource(claude_home / name, "settings (global)")
        if r:
            res.files.append(r)

    # MCP / LSP configs anywhere in tree
    for path in _find_in_tree(root, ".mcp.json"):
        r = _file_resource(path, "mcp")
        if r:
            res.files.append(r)
            _load_mcp(path, res)
    for path in _find_in_tree(root, ".lsp.json"):
        r = _file_resource(path, "lsp")
        if r:
            res.files.append(r)

    # Memory — discover via Claude Code project directory
    from .memory import _find_project_dir, get_summary
    proj = _find_project_dir(root)
    if proj:
        mem_dir = proj / "memory"
        if mem_dir.is_dir():
            r = _file_resource(mem_dir / "MEMORY.md", "memory (index)")
            if r:
                res.files.append(r)
            res.files.extend(_dir_resources(mem_dir, "*.md", "memory"))
        summary = get_summary(root)
        if summary:
            res.memory = summary

    # Global account config (model prefs, tool usage, project registry)
    r = _file_resource(claude_account_config(), "config (account)")
    if r:
        res.files.append(r)

    # Global plugins
    claude_plugins = claude_global_dir() / "plugins"
    for name, kind in [
        ("blocklist.json", "plugins (blocklist)"),
        ("known_marketplaces.json", "plugins (marketplaces)"),
    ]:
        r = _file_resource(claude_plugins / name, kind)
        if r:
            res.files.append(r)

    res.files = _dedup_files(res.files)
    return res

def discover_copilot(root: Path) -> ToolResources:
    res = ToolResources("copilot", "GitHub Copilot")

    # AGENTS.md anywhere in the tree
    for path in _find_in_tree(root, "AGENTS.md"):
        r = _file_resource(path, "instructions")
        if r:
            res.files.append(r)

    # .github/ dirs anywhere in tree → instructions, agents, skills, prompts
    for gh in _find_dirs_in_tree(root, ".github"):
        r = _file_resource(gh / "copilot-instructions.md", "instructions")
        if r:
            res.files.append(r)
        res.files.extend(_dir_resources(gh / "instructions", "*.instructions.md", "instructions"))
        res.files.extend(_dir_resources(gh / "agents", "*.agent.md", "agent"))
        res.files.extend(_dir_resources(gh / "prompts", "*.prompt.md", "prompt"))
        skills_dir = gh / "skills"
        if skills_dir.is_dir():
            for sd in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
                r = _file_resource(sd / "SKILL.md", "skill")
                if r:
                    res.files.append(r)

    # .vscode/settings.json in each project dir in the tree
    for vscode_dir in _find_dirs_in_tree(root, ".vscode"):
        r = _file_resource(vscode_dir / "settings.json", "settings (vscode)")
        if r:
            res.files.append(r)
        r = _file_resource(vscode_dir / "extensions.json", "extensions (vscode)")
        if r:
            res.files.append(r)

    # .copilot-mcp.json anywhere in tree
    for path in _find_in_tree(root, ".copilot-mcp.json"):
        r = _file_resource(path, "mcp")
        if r:
            res.files.append(r)
            _load_mcp(path, res)

    # VS Code user settings (global, contains github.copilot.* options)
    r = _file_resource(vscode_user_dir() / "settings.json", "settings (vscode user)")
    if r:
        res.files.append(r)

    # Installed Copilot extension version (from ~/.vscode/extensions)
    vscode_ext_dir = vscode_extensions_dir()
    if vscode_ext_dir.is_dir():
        for ext_dir in sorted(vscode_ext_dir.iterdir()):
            if "github.copilot" in ext_dir.name.lower() and (ext_dir / "package.json").is_file():
                pkg = ext_dir / "package.json"
                version_str = ""
                try:
                    data = json.loads(pkg.read_text("utf-8"))
                    version_str = data.get("version", "")
                except (json.JSONDecodeError, OSError):
                    pass
                label = f"extension v{version_str}" if version_str else f"extension ({ext_dir.name})"
                r = ResourceFile(str(pkg), label, pkg.stat().st_size, 0)
                res.files.append(r)

    # Active Copilot agent sessions for this root
    copilot_sessions = copilot_session_dir()
    if copilot_sessions.is_dir():
        root_str = str(root)
        for session_dir in sorted(copilot_sessions.iterdir()):
            workspace = session_dir / "workspace.yaml"
            if workspace.is_file():
                try:
                    text = workspace.read_text(errors="replace")
                    if f"cwd: {root_str}" in text or f"git_root: {root_str}" in text:
                        r = _file_resource(workspace, "session (copilot agent)")
                        if r:
                            res.files.append(r)
                except OSError:
                    pass

    # GitHub CLI config (hosts.yml contains Copilot auth tokens scope)
    gh_cfg = gh_config_dir()
    for name in ("config.yml", "hosts.yml"):
        r = _file_resource(gh_cfg / name, "config (gh cli)")
        if r:
            res.files.append(r)

    return res


# ─── Cursor ─────────────────────────────────────────────────────────

def discover_cursor(root: Path) -> ToolResources:
    res = ToolResources("cursor", "Cursor")

    # .cursorrules anywhere in tree (legacy)
    for path in _find_in_tree(root, ".cursorrules"):
        r = _file_resource(path, "instructions (legacy)")
        if r:
            res.files.append(r)

    # .cursor/ dirs anywhere in tree → rules, mcp
    for cursor_dir in _find_dirs_in_tree(root, ".cursor"):
        res.files.extend(_dir_resources(cursor_dir / "rules", "*.mdc", "rules"))
        mcp = cursor_dir / "mcp.json"
        r = _file_resource(mcp, "mcp")
        if r:
            res.files.append(r)
            _load_mcp(mcp, res)

    # Global settings
    r = _file_resource(cursor_user_dir() / "settings.json", "settings (global)")
    if r:
        res.files.append(r)

    return res


# ─── Windsurf ───────────────────────────────────────────────────────

def discover_windsurf(root: Path) -> ToolResources:
    res = ToolResources("windsurf", "Windsurf")

    # .windsurfrules anywhere in tree
    for path in _find_in_tree(root, ".windsurfrules"):
        r = _file_resource(path, "instructions")
        if r:
            res.files.append(r)

    # .windsurf/ dirs anywhere in tree → rules, mcp
    for ws_dir in _find_dirs_in_tree(root, ".windsurf"):
        res.files.extend(_dir_resources(ws_dir / "rules", "*.md", "rules"))
        mcp = ws_dir / "mcp.json"
        r = _file_resource(mcp, "mcp")
        if r:
            res.files.append(r)
            _load_mcp(mcp, res)

    # Global rules / MCP
    ws_global = windsurf_global_dir()
    r = _file_resource(ws_global / "memories" / "global_rules.md", "instructions (global)")
    if r:
        res.files.append(r)
    global_mcp = ws_global / "mcp_config.json"
    r = _file_resource(global_mcp, "mcp (global)")
    if r:
        res.files.append(r)
        _load_mcp(global_mcp, res)

    return res


# ─── Microsoft 365 Copilot / Teams ──────────────────────────────────

def discover_copilot365(root: Path) -> ToolResources:
    """Discover Microsoft 365 Copilot and Teams AI artifacts.

    Covers:
    - Declarative Agent manifests (appPackage/declarativeAgent.json)
    - Teams app manifests referencing Copilot extensions
    - Teams Toolkit project config (teamsapp.yml, m365agents.yml)
    - Azure AD app registration manifests
    - Teams Toolkit environment variable files
    - Older .fx/ (Teams Toolkit v4) project layouts
    """
    res = ToolResources("copilot365", "Microsoft 365 Copilot")

    # Declarative agent manifest and instruction files inside appPackage/
    for app_pkg in _find_dirs_in_tree(root, "appPackage"):
        r = _file_resource(app_pkg / "manifest.json", "manifest (teams app)")
        if r:
            res.files.append(r)
        r = _file_resource(app_pkg / "declarativeAgent.json", "agent (declarative)")
        if r:
            res.files.append(r)
        r = _file_resource(app_pkg / "instruction.txt", "instructions (agent)")
        if r:
            res.files.append(r)
        # Additional action plugins referenced by declarative agents
        res.files.extend(_dir_resources(app_pkg, "*.json", "plugin (action)"))

    # Teams Toolkit / M365 Agents Toolkit project config at any level
    for name in ("teamsapp.yml", "teamsapp.local.yml", "teamsapp.testtool.yml",
                 "m365agents.yml", "m365agents.local.yml"):
        for path in _find_in_tree(root, name):
            r = _file_resource(path, "config (teams toolkit)")
            if r:
                res.files.append(r)

    # Azure AD app registration manifest
    for path in _find_in_tree(root, "aad.manifest.json"):
        r = _file_resource(path, "manifest (aad)")
        if r:
            res.files.append(r)

    # Teams Toolkit env vars (env/ subdirs with .env.* files)
    for env_dir in _find_dirs_in_tree(root, "env"):
        for f in sorted(env_dir.glob(".env.*")):
            if f.is_file():
                r = _file_resource(f, "env (teams toolkit)")
                if r:
                    res.files.append(r)

    # Older Teams Toolkit v4 layout: .fx/ directory
    for fx_dir in _find_dirs_in_tree(root, ".fx"):
        res.files.extend(_dir_resources(fx_dir, "*.json", "config (teams fx)"))
        res.files.extend(_dir_resources(fx_dir / "configs", "*.json", "config (teams fx)"))
        res.files.extend(_dir_resources(fx_dir / "states", "*.json", "state (teams fx)"))

    res.files = _dedup_files(res.files)
    return res


# ─── Semantic Kernel ─────────────────────────────────────────────────

def discover_semantic_kernel(root: Path) -> ToolResources:
    """Discover Microsoft Semantic Kernel plugin and prompt artifacts.

    Covers:
    - Semantic function prompt templates (skprompt.txt)
    - Semantic function config files (config.json beside skprompt.txt)
    - Plugin directories (Plugins/, sk_plugins/, SemanticPlugins/, Skills/)
    - appsettings.json files used to configure the SK kernel
    """
    res = ToolResources("semantic_kernel", "Semantic Kernel")

    # skprompt.txt files define semantic functions — find them anywhere
    for path in _find_in_tree(root, "skprompt.txt"):
        r = _file_resource(path, "prompt (sk)")
        if r:
            res.files.append(r)
        # config.json sibling describes the function's execution settings
        cfg = path.parent / "config.json"
        r2 = _file_resource(cfg, "config (sk function)")
        if r2:
            res.files.append(r2)

    # Named plugin directories at any level
    for plugin_dirname in ("Plugins", "sk_plugins", "SemanticPlugins", "Skills"):
        for plugins_dir in _find_dirs_in_tree(root, plugin_dirname):
            if plugins_dir.is_dir():
                for plugin_dir in sorted(p for p in plugins_dir.iterdir() if p.is_dir()):
                    for fn_dir in sorted(p for p in plugin_dir.iterdir() if p.is_dir()):
                        r = _file_resource(fn_dir / "skprompt.txt", "prompt (sk)")
                        if r:
                            res.files.append(r)
                        r = _file_resource(fn_dir / "config.json", "config (sk function)")
                        if r:
                            res.files.append(r)

    # appsettings.json / appsettings.Development.json used to configure SK
    for name in ("appsettings.json", "appsettings.Development.json",
                 "appsettings.Local.json"):
        for path in _find_in_tree(root, name):
            r = _file_resource(path, "settings (appsettings)")
            if r:
                res.files.append(r)

    res.files = _dedup_files(res.files)
    return res


# ─── Azure AI Foundry / PromptFlow ───────────────────────────────────

def discover_promptflow(root: Path) -> ToolResources:
    """Discover Azure AI Foundry PromptFlow artifacts.

    Covers:
    - DAG flow definitions (flow.dag.yaml)
    - Flex flow definitions (flow.flex.yaml)
    - .promptflow/ hidden dirs (connection and run cache)
    - Global PromptFlow user config
    """
    res = ToolResources("promptflow", "Azure PromptFlow")

    # DAG and Flex flow definition files
    for name in ("flow.dag.yaml", "flow.flex.yaml"):
        for path in _find_in_tree(root, name):
            r = _file_resource(path, "flow (promptflow)")
            if r:
                res.files.append(r)

    # .promptflow/ hidden dirs — connection configs and run metadata
    for pf_dir in _find_dirs_in_tree(root, ".promptflow"):
        res.files.extend(_dir_resources(pf_dir, "*.yaml", "config (promptflow)"))
        res.files.extend(_dir_resources(pf_dir, "*.json", "config (promptflow)"))

    # Global PromptFlow config
    pf_global = promptflow_global_dir()
    r = _file_resource(pf_global / "pf.yaml", "config (promptflow global)")
    if r:
        res.files.append(r)
    res.files.extend(_dir_resources(pf_global / "connections", "*.yaml", "connection (promptflow)"))

    res.files = _dedup_files(res.files)
    return res


# ─── Azure AI / Developer CLI ────────────────────────────────────────

def discover_azure_ai(root: Path) -> ToolResources:
    """Discover Azure AI and Azure Developer CLI (azd) artifacts.

    Covers:
    - Azure Developer CLI manifest (azure.yaml)
    - .azure/ state directory (environment configs, subscription info)
    - Azure Functions local settings (local.settings.json)
    - AI Foundry network/model config files
    """
    res = ToolResources("azure_ai", "Azure AI")

    # Azure Developer CLI manifest (root-level)
    r = _file_resource(root / "azure.yaml", "manifest (azd)")
    if r:
        res.files.append(r)

    # .azure/ — azd environment state (subscription, resource group, etc.)
    azure_dir = root / ".azure"
    if azure_dir.is_dir():
        for env_dir in sorted(p for p in azure_dir.iterdir() if p.is_dir()):
            r = _file_resource(env_dir / ".env", "env (azd)")
            if r:
                res.files.append(r)
            r = _file_resource(env_dir / "config.json", "config (azd env)")
            if r:
                res.files.append(r)
        r = _file_resource(azure_dir / "config.json", "config (azd)")
        if r:
            res.files.append(r)

    # Azure Functions local settings (contains AI service connection strings)
    for path in _find_in_tree(root, "local.settings.json"):
        r = _file_resource(path, "settings (azure functions)")
        if r:
            res.files.append(r)

    # AI Foundry / Azure AI project config files
    for name in ("ai.network.yaml", "ai.project.yaml", "ai_project.yaml"):
        for path in _find_in_tree(root, name):
            r = _file_resource(path, "config (azure ai foundry)")
            if r:
                res.files.append(r)

    # Global azd config
    azd_cfg = azd_config_dir()
    r = _file_resource(azd_cfg / "config.json", "config (azd global)")
    if r:
        res.files.append(r)

    res.files = _dedup_files(res.files)
    return res


# ─── Project environment / hidden config ────────────────────────────

def discover_project_env(root: Path) -> ToolResources:
    """Discover environment and hidden config files that affect LLM tools.

    Covers .env/.envrc files anywhere in the tree, and unknown hidden dirs
    at each directory level that may contain AI-relevant config.
    """
    res = ToolResources("env", "Project Environment")

    # .env / .envrc files anywhere in the tree
    for name in (".env", ".envrc", ".env.local", ".env.development"):
        for path in _find_in_tree(root, name):
            r = _file_resource(path, "env")
            if r:
                res.files.append(r)

    # Unknown hidden dirs at each level of the tree (not covered by other tools)
    known_tool_dirs = {".claude", ".cursor", ".windsurf", ".github", ".git",
                       ".venv", ".vscode", ".ai-deployed", ".copilot",
                       ".promptflow", ".fx", ".azure"}
    skip = _PRUNE_DIRS | known_tool_dirs
    for dirpath_str, dirnames, _ in os.walk(str(root)):
        dirnames[:] = [d for d in dirnames if d not in _PRUNE_DIRS]
        dp = Path(dirpath_str)
        for d in sorted(dirnames):
            if d.startswith(".") and d not in skip:
                item = dp / d
                for pat, kind in [("*.json", "config"), ("*.yaml", "config"),
                                   ("*.yml", "config"), ("*.md", "instructions")]:
                    for f in sorted(item.glob(pat)):
                        if f.is_file() and f.stat().st_size < 500_000:
                            rf = _file_resource(f, f"hidden ({d})")
                            if rf:
                                res.files.append(rf)

    return res


# ─── aictl itself ───────────────────────────────────────────────────

def discover_aictl(root: Path) -> ToolResources:
    """Discover aictl's own deployment state and .aictx files."""
    res = ToolResources("aictl", "aictl")

    # .context.aictx files
    from .scanner import scan
    for rel, parsed in scan(root):
        r = _file_resource(parsed.path, "context")
        if r:
            res.files.append(r)

    # Deployment manifest
    r = _file_resource(root / ".ai-deployed" / "manifest.json", "manifest")
    if r:
        res.files.append(r)

    return res


# ─── Register discoverers ──────────────────────────────────────────

_DISCOVERERS = [
    discover_claude,
    discover_copilot,
    discover_copilot365,
    discover_semantic_kernel,
    discover_promptflow,
    discover_azure_ai,
    discover_cursor,
    discover_windsurf,
    discover_project_env,
    discover_aictl,
]


# ─── Process detection ──────────────────────────────────────────────

_PROCESS_PATTERNS: dict[str, list[str]] = {
    "claude": [r"\bclaude\b"],
    "copilot": [r"copilot-agent", r"copilot-language-server", r"copilot-server",
                r"github\.copilot", r"copilot-typescript-server"],
    "copilot365": [r"teamsappdevtunnel", r"teamsfx", r"ttk-",
                   r"@microsoft/teams", r"teams-toolkit"],
    "semantic_kernel": [r"semantic.kernel", r"SemanticKernel"],
    "promptflow": [r"\bpf\b.*flow", r"promptflow", r"prompt.flow"],
    "azure_ai": [r"\bazd\b", r"azure-dev", r"func\s+(host|start)",
                 r"azure-functions-core-tools", r"Microsoft\.Azure"],
    "cursor": [r"Cursor Helper", r"Cursor\.app", r"\bCursor$"],
    "windsurf": [r"[Ww]indsurf"],
}


def _parse_ps_output() -> list[tuple[str, str, str, str, str]]:
    """Return process rows as (pid, cpu, rss_kb, comm, args).

    Uses psutil when available (cross-platform); falls back to POSIX `ps`.
    """
    try:
        import psutil
        rows = []
        for proc in psutil.process_iter(["pid", "cpu_percent", "memory_info", "name", "cmdline"]):
            try:
                info = proc.info
                pid = str(info["pid"])
                cpu = f"{info['cpu_percent']:.1f}"
                rss_kb = str((info["memory_info"].rss // 1024) if info["memory_info"] else 0)
                comm = info["name"] or ""
                args = " ".join(info["cmdline"] or []) or comm
                rows.append((pid, cpu, rss_kb, comm, args))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return rows
    except ImportError:
        pass

    # Fallback: POSIX ps (macOS / Linux only)
    try:
        result = subprocess.run(
            ["ps", "axo", "pid,pcpu,rss,comm,args"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return []
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []

    rows = []
    for line in result.stdout.splitlines()[1:]:
        parts = line.split(None, 4)
        if len(parts) >= 5:
            rows.append((parts[0], parts[1], parts[2], parts[3], parts[4]))
        elif len(parts) == 4:
            rows.append((parts[0], parts[1], parts[2], parts[3], parts[3]))
    return rows


def _process_display_name(args: str) -> str:
    """Extract a readable process name from the full command line."""
    exe = args.split()[0] if args else "?"
    # For .app bundles, pick the outermost app name (e.g. "Visual Studio Code")
    m = re.search(r"/([^/]+?)\.app", args)
    if m:
        return m.group(1)
    return Path(exe).name


def _find_processes(tool: str) -> list[ProcessInfo]:
    """Find running processes associated with a tool by name patterns."""
    patterns = _PROCESS_PATTERNS.get(tool, [])
    if not patterns:
        return []

    # Shells and helpers that may reference tool names in args but aren't the tool
    _SKIP_COMMS = {"zsh", "bash", "sh", "fish", "grep", "ps", "awk", "sed", "python", "python3"}

    rows = _parse_ps_output()
    processes = []
    for pid_s, cpu, rss, comm, args in rows:
        basename = comm.split("/")[-1]
        if basename in _SKIP_COMMS:
            continue
        for pat in patterns:
            if re.search(pat, comm) or re.search(pat, args):
                try:
                    mem_mb = f"{int(rss) / 1024:.1f}"
                except ValueError:
                    mem_mb = "?"
                processes.append(ProcessInfo(
                    pid=int(pid_s),
                    name=_process_display_name(args),
                    cmdline=args[:200],
                    cpu_pct=cpu,
                    mem_mb=mem_mb,
                ))
                break
    return processes


def _find_mcp_processes(
    mcp_servers: list[dict], already: list[ProcessInfo],
) -> list[ProcessInfo]:
    """Try to find running processes matching configured MCP servers."""
    if not mcp_servers:
        return []

    # Build search terms from MCP server configs
    search_terms: list[tuple[str, str]] = []
    for srv in mcp_servers:
        name = srv.get("name", "")
        config = srv.get("config", {})
        cmd = config.get("command", "")
        args = config.get("args", [])
        # Use the server name and last meaningful arg as search terms
        terms = [name, cmd] + [a for a in args if not a.startswith("-")]
        search_terms.append((name, "|".join(re.escape(t) for t in terms if t)))

    if not search_terms:
        return []

    already_pids = {p.pid for p in already}
    rows = _parse_ps_output()
    found = []
    for pid_s, cpu, rss, comm, args in rows:
        pid = int(pid_s)
        if pid in already_pids:
            continue
        for srv_name, pattern in search_terms:
            if pattern and re.search(pattern, args):
                try:
                    mem_mb = f"{int(rss) / 1024:.1f}"
                except ValueError:
                    mem_mb = "?"
                found.append(ProcessInfo(
                    pid=pid,
                    name=f"[mcp:{srv_name}] {comm.split('/')[-1]}",
                    cmdline=args[:200],
                    cpu_pct=cpu,
                    mem_mb=mem_mb,
                ))
                already_pids.add(pid)
                break
    return found


# ─── Agent memory & policy collection ─────────────────────────────

def collect_agent_memory(root: Path) -> list[MemoryEntry]:
    """Collect all agent memory, policies, and decisions from multiple sources.

    Claude Code memory tiers (https://code.claude.com/docs/en/memory):
      1. User memory     — ~/.claude/CLAUDE.md  (global, all projects)
      2. Project memory  — <root>/CLAUDE.md     (checked into repo)
      3. Auto-memory     — ~/.claude/projects/<hash>/memory/*.md (auto-learned)

    Plus aictl-specific sources:
      4. Memory hints from .aictx files ([memory:profile] sections)
      5. Profile instructions from .aictx files (policies/decisions)
    """
    entries: list[MemoryEntry] = []

    # 1. User memory — ~/.claude/CLAUDE.md
    user_memory = Path.home() / ".claude" / "CLAUDE.md"
    if user_memory.is_file():
        try:
            content = user_memory.read_text(errors="replace")
            if content.strip():
                entries.append(MemoryEntry(
                    source="claude-user-memory",
                    profile="(global)",
                    file=str(user_memory),
                    content=content,
                    tokens=estimate_tokens(content),
                    lines=len([l for l in content.splitlines() if l.strip()]),
                ))
        except OSError:
            pass

    # 2. Project memory — <root>/CLAUDE.md
    project_memory = root / "CLAUDE.md"
    if project_memory.is_file():
        try:
            content = project_memory.read_text(errors="replace")
            if content.strip():
                entries.append(MemoryEntry(
                    source="claude-project-memory",
                    profile="(project)",
                    file=str(project_memory),
                    content=content,
                    tokens=estimate_tokens(content),
                    lines=len([l for l in content.splitlines() if l.strip()]),
                ))
        except OSError:
            pass

    # Also check CLAUDE.local.md (local overrides, not checked in)
    local_memory = root / "CLAUDE.local.md"
    if local_memory.is_file():
        try:
            content = local_memory.read_text(errors="replace")
            if content.strip():
                entries.append(MemoryEntry(
                    source="claude-project-memory",
                    profile="(local)",
                    file=str(local_memory),
                    content=content,
                    tokens=estimate_tokens(content),
                    lines=len([l for l in content.splitlines() if l.strip()]),
                ))
        except OSError:
            pass

    # 3. Auto-memory — ~/.claude/projects/<hash>/memory/*.md
    # Scan ALL project dirs under ~/.claude/projects/ for memory files,
    # not just the one matching root (user may have global/parent memories too)
    from .memory import _find_project_dir, get_summary, list_stashes
    claude_projects = Path.home() / ".claude" / "projects"
    if claude_projects.is_dir():
        proj_for_root = _find_project_dir(root)
        for proj_dir in sorted(claude_projects.iterdir()):
            if not proj_dir.is_dir():
                continue
            mem_dir = proj_dir / "memory"
            if not mem_dir.is_dir():
                continue
            is_active_project = proj_dir == proj_for_root
            # Convert encoded dir name back to a readable project name
            # e.g. "-Users-zvi-Projects-aictl" → "aictl"
            readable = proj_dir.name.lstrip("-").split("-")[-1] if not is_active_project else ""
            profile_tag = "(active)" if is_active_project else f"({readable})"
            for md in sorted(mem_dir.glob("*.md")):
                try:
                    content = md.read_text(errors="replace")
                    if content.strip():
                        entries.append(MemoryEntry(
                            source="claude-auto-memory",
                            profile=profile_tag,
                            file=str(md),
                            content=content,
                            tokens=estimate_tokens(content),
                            lines=len([l for l in content.splitlines() if l.strip()]),
                        ))
                except OSError:
                    pass

    # Also get stashed auto-memories for other profiles within the active project
    for stash in list_stashes(root):
        if stash["profile"] == "(active)":
            continue  # already captured above
        stash_dir = Path(stash["dir"])
        if stash_dir.is_dir():
            for md in sorted(stash_dir.glob("*.md")):
                try:
                    content = md.read_text(errors="replace")
                    entries.append(MemoryEntry(
                        source="claude-auto-memory",
                        profile=stash["profile"],
                        file=str(md),
                        content=content,
                        tokens=estimate_tokens(content),
                        lines=len([l for l in content.splitlines() if l.strip()]),
                    ))
                except OSError:
                    pass

    return entries


# ─── MCP extended status ──────────────────────────────────────────

def collect_mcp_status(all_tools: list[ToolResources]) -> list[McpServerInfo]:
    """Build enriched MCP server info with connectivity status.

    For each configured MCP server across all tools:
      - Determine transport type (stdio vs http)
      - Check if a matching process is running (→ "running" / "stopped")
      - Attach process metrics (pid, CPU, mem) if found
    """
    servers: list[McpServerInfo] = []
    seen: set[str] = set()  # dedup by name

    # Gather all processes for matching
    all_procs: list[tuple[str, ProcessInfo]] = []
    for tr in all_tools:
        for p in tr.processes:
            all_procs.append((tr.tool, p))

    for tr in all_tools:
        for srv_dict in tr.mcp_servers:
            name = srv_dict.get("name", "?")
            if name in seen:
                continue
            seen.add(name)

            config = srv_dict.get("config", {})
            transport, endpoint = _classify_mcp_transport(config)

            info = McpServerInfo(
                name=name,
                tool=tr.tool,
                config=config,
                transport=transport,
                endpoint=endpoint,
            )

            # Try to match to a running process
            matched = _match_mcp_to_process(name, config, all_procs)
            if matched:
                info.status = "running"
                info.pid = matched.pid
                info.cpu_pct = matched.cpu_pct
                info.mem_mb = matched.mem_mb
            else:
                # For HTTP servers, try a quick connectivity check
                if transport == "http":
                    info.status = _probe_http_mcp(endpoint)
                else:
                    info.status = "stopped"

            servers.append(info)

    return servers


def _classify_mcp_transport(config: dict) -> tuple[str, str]:
    """Determine transport type and endpoint from MCP config."""
    if "url" in config:
        return ("http", config["url"])
    if config.get("type") == "http":
        return ("http", config.get("url", ""))
    if config.get("type") == "sse":
        return ("sse", config.get("url", ""))
    cmd = config.get("command", "")
    args = " ".join(config.get("args", []))
    return ("stdio", f"{cmd} {args}".strip())


def _match_mcp_to_process(
    name: str, config: dict, all_procs: list[tuple[str, ProcessInfo]],
) -> ProcessInfo | None:
    """Try to find a running process that matches an MCP server."""
    cmd = config.get("command", "")
    args = config.get("args", [])

    # Build search terms
    terms = [t for t in [name, cmd] + [a for a in args if not a.startswith("-")] if t]
    if not terms:
        return None

    for _tool, proc in all_procs:
        matches = sum(1 for t in terms if t in proc.cmdline)
        if matches >= 2 or (matches == 1 and name in proc.cmdline):
            return proc
    return None


def _probe_http_mcp(url: str) -> str:
    """Quick health probe for HTTP-based MCP servers."""
    if not url:
        return "unknown"
    try:
        import urllib.request
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return "running" if resp.status < 500 else "error"
    except Exception:
        # Connection refused → stopped; timeout → unknown
        return "stopped"


def backtrace_process(pid: int) -> str | None:
    """Get a stack sample of a process.

    macOS: uses `sample` (no root needed for same-user processes).
    Linux: tries `eu-stack`, falls back to `gdb`.
    """
    system = platform.system()

    if system == "Darwin":
        try:
            result = subprocess.run(
                ["sample", str(pid), "1", "-mayDie"],
                capture_output=True, text=True, timeout=15,
            )
            return result.stdout if result.returncode == 0 else result.stderr
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return None

    if system == "Linux":
        # Try eu-stack (elfutils)
        try:
            result = subprocess.run(
                ["eu-stack", "-p", str(pid)],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode == 0:
                return result.stdout
        except FileNotFoundError:
            pass
        # Fallback: gdb batch backtrace
        try:
            result = subprocess.run(
                ["gdb", "-batch", "-ex", "thread apply all bt", "-p", str(pid)],
                capture_output=True, text=True, timeout=10,
            )
            return result.stdout if result.returncode == 0 else None
        except FileNotFoundError:
            return None

    return None
