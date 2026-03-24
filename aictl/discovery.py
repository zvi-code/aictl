"""Discover all resources for AI coding tools in a project.

Scans for configuration files, memory, MCP servers, settings, and
running processes associated with Claude Code, GitHub Copilot, Cursor,
and Windsurf.
"""

from __future__ import annotations

import json
import platform
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from .utils import estimate_tokens


# ─── Data models ────────────────────────────────────────────────────

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
    user_memory = Path.home() / ".claude" / "CLAUDE.md"
    r = _file_resource(user_memory, "memory (user-global)")
    if r:
        res.files.append(r)

    # CLAUDE.md in parent directories (Claude reads up the directory tree)
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

    # Project instruction files
    for name in ("CLAUDE.md", "CLAUDE.local.md"):
        r = _file_resource(root / name, "instructions")
        if r:
            res.files.append(r)

    # Rules
    res.files.extend(_dir_resources(root / ".claude" / "rules", "*.md", "rules"))

    # Commands
    res.files.extend(_dir_resources(root / ".claude" / "commands", "*.md", "command"))

    # Skills
    skills_dir = root / ".claude" / "skills"
    if skills_dir.is_dir():
        for sd in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
            r = _file_resource(sd / "SKILL.md", "skill")
            if r:
                res.files.append(r)

    # Project settings
    for name in ("settings.json", "settings.local.json"):
        r = _file_resource(root / ".claude" / name, "settings")
        if r:
            res.files.append(r)

    # Global settings
    claude_home = Path.home() / ".claude"
    for name in ("settings.json", "settings.local.json"):
        r = _file_resource(claude_home / name, "settings (global)")
        if r:
            res.files.append(r)

    # MCP config
    r = _file_resource(root / ".mcp.json", "mcp")
    if r:
        res.files.append(r)
        _load_mcp(root / ".mcp.json", res)

    # LSP config
    r = _file_resource(root / ".lsp.json", "lsp")
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

    # ~/.claude.json — global account config (model prefs, tool usage, project registry)
    r = _file_resource(Path.home() / ".claude.json", "config (account)")
    if r:
        res.files.append(r)

    # ~/.claude plugins
    claude_plugins = Path.home() / ".claude" / "plugins"
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
    gh = root / ".github"

    # Root instructions
    for path, kind in [
        (gh / "copilot-instructions.md", "instructions"),
        (root / "AGENTS.md", "instructions"),
    ]:
        r = _file_resource(path, kind)
        if r:
            res.files.append(r)

    # Sub-scope instructions
    res.files.extend(_dir_resources(gh / "instructions", "*.instructions.md", "instructions"))

    # Agents
    res.files.extend(_dir_resources(gh / "agents", "*.agent.md", "agent"))

    # Skills
    skills_dir = gh / "skills"
    if skills_dir.is_dir():
        for sd in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
            r = _file_resource(sd / "SKILL.md", "skill")
            if r:
                res.files.append(r)

    # Prompts
    res.files.extend(_dir_resources(gh / "prompts", "*.prompt.md", "prompt"))

    # AGENTS.md in subdirectories (Copilot reads these for sub-scope context)
    for agents_md in sorted(root.rglob("AGENTS.md")):
        if agents_md.parent != root:  # root already handled above
            r = _file_resource(agents_md, "instructions (sub-scope)")
            if r:
                res.files.append(r)

    # VS Code settings (often contains github.copilot.* configuration)
    r = _file_resource(root / ".vscode" / "settings.json", "settings (vscode)")
    if r:
        res.files.append(r)

    # MCP config
    r = _file_resource(root / ".copilot-mcp.json", "mcp")
    if r:
        res.files.append(r)
        _load_mcp(root / ".copilot-mcp.json", res)

    # VS Code user settings (global, contains github.copilot.* options)
    if platform.system() == "Darwin":
        vscode_user = Path.home() / "Library" / "Application Support" / "Code" / "User"
        r = _file_resource(vscode_user / "settings.json", "settings (vscode user)")
        if r:
            res.files.append(r)

    # Installed Copilot extension version (from ~/.vscode/extensions)
    vscode_ext_dir = Path.home() / ".vscode" / "extensions"
    if vscode_ext_dir.is_dir():
        for ext_dir in sorted(vscode_ext_dir.iterdir()):
            name = ext_dir.name.lower()
            if "github.copilot" in name and (ext_dir / "package.json").is_file():
                pkg = ext_dir / "package.json"
                # Extract version only — don't count the full 200KB package.json tokens
                version_str = ""
                try:
                    data = json.loads(pkg.read_text("utf-8"))
                    version_str = data.get("version", "")
                except (json.JSONDecodeError, OSError):
                    pass
                label = f"extension ({ext_dir.name})" if not version_str else f"extension v{version_str}"
                r = ResourceFile(str(pkg), label, pkg.stat().st_size, 0)
                res.files.append(r)

    # Active Copilot agent sessions for this root
    copilot_sessions = Path.home() / ".copilot" / "session-state"
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

    return res


# ─── Cursor ─────────────────────────────────────────────────────────

def discover_cursor(root: Path) -> ToolResources:
    res = ToolResources("cursor", "Cursor")
    cursor_dir = root / ".cursor"

    # Legacy .cursorrules
    r = _file_resource(root / ".cursorrules", "instructions (legacy)")
    if r:
        res.files.append(r)

    # Rules
    res.files.extend(_dir_resources(cursor_dir / "rules", "*.mdc", "rules"))

    # MCP config
    r = _file_resource(cursor_dir / "mcp.json", "mcp")
    if r:
        res.files.append(r)
        _load_mcp(cursor_dir / "mcp.json", res)

    # Global settings (macOS)
    if platform.system() == "Darwin":
        cursor_app = Path.home() / "Library" / "Application Support" / "Cursor" / "User"
        r = _file_resource(cursor_app / "settings.json", "settings (global)")
        if r:
            res.files.append(r)

    return res


# ─── Windsurf ───────────────────────────────────────────────────────

def discover_windsurf(root: Path) -> ToolResources:
    res = ToolResources("windsurf", "Windsurf")

    # .windsurfrules
    r = _file_resource(root / ".windsurfrules", "instructions")
    if r:
        res.files.append(r)

    # Rules directory
    res.files.extend(_dir_resources(root / ".windsurf" / "rules", "*.md", "rules"))

    # Global rules (macOS)
    if platform.system() == "Darwin":
        global_rules = Path.home() / ".codeium" / "windsurf" / "memories" / "global_rules.md"
        r = _file_resource(global_rules, "instructions (global)")
        if r:
            res.files.append(r)

    # MCP config — project level, then global fallback
    mcp_path = root / ".windsurf" / "mcp.json"
    if not mcp_path.is_file() and platform.system() == "Darwin":
        mcp_path = Path.home() / ".codeium" / "windsurf" / "mcp_config.json"
    r = _file_resource(mcp_path, "mcp")
    if r:
        res.files.append(r)
        _load_mcp(mcp_path, res)

    return res


# ─── Project environment / hidden config ────────────────────────────

# Hidden directories to skip (not AI-related, noise)
_SKIP_HIDDEN_DIRS = {
    ".git", ".venv", ".env", "venv", ".tox", ".mypy_cache",
    ".pytest_cache", ".ruff_cache", "__pycache__", ".cache",
    ".idea", ".vs", "node_modules", ".npm", ".yarn",
}

def discover_project_env(root: Path) -> ToolResources:
    """Discover environment and hidden config files in the project that affect LLM tools.

    Covers:
      - .env / .envrc — environment variables (may set API keys, tool config)
      - Hidden dirs with AI-relevant config (e.g. .claude/, already in Claude discovery
        but we surface other hidden config files here as a cross-cutting view)
    """
    res = ToolResources("env", "Project Environment")

    # Environment files that LLM tools may read
    for name in (".env", ".envrc", ".env.local", ".env.development"):
        r = _file_resource(root / name, "env")
        if r:
            res.files.append(r)

    # Hidden dirs at project root that aren't tool-specific above
    # but may contain AI config (e.g. .github/copilot-extensions/, .ai/, etc.)
    known_tool_dirs = {".claude", ".cursor", ".windsurf", ".github", ".git",
                       ".venv", ".vscode", ".ai-deployed"}
    if root.is_dir():
        for item in sorted(root.iterdir()):
            if (item.is_dir()
                    and item.name.startswith(".")
                    and item.name not in known_tool_dirs
                    and item.name not in _SKIP_HIDDEN_DIRS):
                # Collect any .json/.yaml/.md files one level deep
                for pat, kind in [("*.json", "config"), ("*.yaml", "config"),
                                   ("*.yml", "config"), ("*.md", "instructions")]:
                    for f in sorted(item.glob(pat)):
                        if f.is_file() and f.stat().st_size < 500_000:
                            rf = _file_resource(f, f"hidden ({item.name})")
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

_DISCOVERERS = [discover_claude, discover_copilot, discover_cursor, discover_windsurf, discover_project_env, discover_aictl]


# ─── Process detection ──────────────────────────────────────────────

_PROCESS_PATTERNS: dict[str, list[str]] = {
    "claude": [r"\bclaude\b"],
    "copilot": [r"copilot-agent", r"copilot-language-server", r"copilot-server",
                r"github\.copilot", r"copilot-typescript-server"],
    "cursor": [r"Cursor Helper", r"Cursor\.app", r"\bCursor$"],
    "windsurf": [r"[Ww]indsurf"],
}


def _parse_ps_output() -> list[tuple[str, str, str, str, str]]:
    """Run ps and return parsed rows: (pid, cpu, rss, comm, args)."""
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
