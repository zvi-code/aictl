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

    res.files = _dedup_files(res.files)
    return res


# ─── GitHub Copilot ─────────────────────────────────────────────────

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

    # MCP config
    r = _file_resource(root / ".copilot-mcp.json", "mcp")
    if r:
        res.files.append(r)
        _load_mcp(root / ".copilot-mcp.json", res)

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

_DISCOVERERS = [discover_claude, discover_copilot, discover_cursor, discover_windsurf, discover_aictl]


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
