"""Discover all resources for AI coding tools in a project.

CSV-driven discovery engine: loads path and process specifications from
bundled CSV data files and resolves them against the project tree.
Enriches results with metadata for deployment guidance, monitoring,
anomaly detection, and token cost analysis.
"""

from __future__ import annotations

import json
import os
import platform
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from .registry import (
    TOOL_LABELS,
    PRUNE_DIRS,
    PathSpec,
    ProcessSpec,
    batch_resolve_paths,
    expand_tool_filter,
    find_dirs_in_tree,
    find_in_tree,
    get_registry,
)
from .utils import estimate_tokens


# ─── Data classes ─────────────────────────────────────────────────

@dataclass
class ResourceFile:
    """A file resource belonging to a tool."""
    path: str
    kind: str          # instructions, rules, command, skill, agent, mcp, settings, memory, prompt, config
    size: int = 0
    tokens: int = 0
    # CSV-enriched metadata
    tool: str = ""
    scope: str = ""               # global, project, parent, shadow, session
    sent_to_llm: str = ""         # yes, no, on-demand, partial, conditional
    loaded_when: str = ""         # every-call, session-start, on-demand, etc.
    cacheable: str = ""           # yes, no, n/a
    survives_compaction: str = "" # yes, no, n/a
    mtime: float = 0.0           # file modification time (epoch seconds)


@dataclass
class ProcessInfo:
    """A running process associated with a tool."""
    pid: int
    name: str
    cmdline: str
    cpu_pct: str = ""
    mem_mb: str = ""
    # CSV-enriched metadata
    tool: str = ""
    process_type: str = ""       # app, helper, mcp-server, cli, subagent, etc.
    expected_mem_mb: str = ""    # from CSV memory_active_mb
    known_leak: bool = False
    zombie_risk: str = ""        # none, low, medium, high
    cleanup_cmd: str = ""
    anomalies: list[str] = field(default_factory=list)


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
    mtime: float = 0.0           # file modification time (epoch seconds)


@dataclass
class ToolResources:
    """All discovered resources for a single tool."""
    tool: str
    label: str
    files: list[ResourceFile] = field(default_factory=list)
    processes: list[ProcessInfo] = field(default_factory=list)
    mcp_servers: list[dict] = field(default_factory=list)
    memory: dict | None = None


# ─── File helpers ────────────────────────────────────────────────

def _file_resource(path: Path, kind: str) -> ResourceFile | None:
    """Create a ResourceFile if path exists, else None."""
    if not path.is_file():
        return None
    try:
        st = path.stat()
        size = st.st_size
        mtime = st.st_mtime
    except OSError:
        return None
    tokens = 0
    if size < 1_000_000:
        try:
            text = path.read_text(errors="replace")
            tokens = estimate_tokens(text)
        except OSError:
            pass
    rf = ResourceFile(str(path), kind, size, tokens)
    rf.mtime = mtime
    return rf


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


# ─── MCP helpers ────────────────────────────────────────────────

_MCP_FILENAMES = {".mcp.json", "mcp.json", ".copilot-mcp.json",
                  "mcp_config.json", "mcp-config.json"}


def _load_mcp(path: Path, res: ToolResources) -> None:
    """Parse an MCP JSON config and append servers to res."""
    try:
        data = json.loads(path.read_text("utf-8"))
        for name, config in data.get("mcpServers", {}).items():
            res.mcp_servers.append({"name": name, "config": config})
    except (json.JSONDecodeError, KeyError, OSError):
        pass


# ─── Top-level API ───────────────────────────────────────────────

def discover_all(
    root: Path,
    include_processes: bool = False,
    tools: list[str] | None = None,
) -> list[ToolResources]:
    """Discover resources for all known tools using CSV-driven resolution."""
    registry = get_registry()
    results_by_tool: dict[str, ToolResources] = {}

    # Phase 1: CSV-driven file discovery via batch resolution
    specs = registry.path_specs(tools=tools)
    resolved = batch_resolve_paths(specs, root)

    for spec, paths in resolved:
        tool_name = spec.ai_tool
        if tool_name not in results_by_tool:
            results_by_tool[tool_name] = ToolResources(
                tool=tool_name,
                label=TOOL_LABELS.get(tool_name, tool_name),
            )
        for path in paths:
            rf = _file_resource(path, spec.category)
            if rf:
                rf.tool = tool_name
                rf.scope = spec.scope
                rf.sent_to_llm = spec.sent_to_llm
                rf.loaded_when = spec.loaded_when
                rf.cacheable = spec.cacheable
                rf.survives_compaction = spec.survives_compaction
                results_by_tool[tool_name].files.append(rf)

    # Phase 2: Special-case enrichments
    _enrich_mcp_servers(results_by_tool)
    _enrich_claude_memory(root, results_by_tool)

    # Phase 3: Dedup files within each tool
    for tr in results_by_tool.values():
        tr.files = _dedup_files(tr.files)

    # Phase 4: Process detection
    if include_processes:
        _discover_processes_csv(registry, results_by_tool, tools)

    # Phase 5: discover_project_env (dynamic hidden dir scan — not CSV-driven)
    if tools is None or "project-env" in expand_tool_filter(tools or []):
        env_res = _discover_project_env(root)
        if env_res.files:
            existing = results_by_tool.get("project-env")
            if existing:
                existing.files.extend(env_res.files)
                existing.files = _dedup_files(existing.files)
            else:
                results_by_tool["project-env"] = env_res

    # Phase 6: discover_aictl (uses .aictx scanner — separate system)
    if tools is None or "aictl" in expand_tool_filter(tools or []):
        aictl_res = _discover_aictl(root)
        if aictl_res.files:
            results_by_tool.setdefault("aictl", aictl_res)

    return list(results_by_tool.values())


# ─── Special-case enrichments ────────────────────────────────────

def _enrich_mcp_servers(results: dict[str, ToolResources]) -> None:
    """Parse discovered MCP config files and populate mcp_servers."""
    for tr in results.values():
        for f in tr.files:
            if Path(f.path).name in _MCP_FILENAMES:
                _load_mcp(Path(f.path), tr)


def _enrich_claude_memory(root: Path, results: dict[str, ToolResources]) -> None:
    """Add memory summary to Claude Code tool resources."""
    claude_tr = results.get("claude-code")
    if not claude_tr:
        return
    from .memory import get_summary
    summary = get_summary(root)
    if summary:
        claude_tr.memory = summary


# ─── Project environment / hidden config ─────────────────────────

def _discover_project_env(root: Path) -> ToolResources:
    """Discover unknown hidden dirs that may contain AI-relevant config."""
    res = ToolResources("project-env", "Project Environment")

    known_tool_dirs = {".claude", ".cursor", ".windsurf", ".github", ".git",
                       ".venv", ".vscode", ".ai-deployed", ".copilot",
                       ".promptflow", ".fx", ".azure", ".opencode", ".junie"}
    skip = PRUNE_DIRS | known_tool_dirs
    for dirpath_str, dirnames, _ in os.walk(str(root)):
        dirnames[:] = [d for d in dirnames if d not in PRUNE_DIRS]
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


# ─── aictl itself ────────────────────────────────────────────────

def _discover_aictl(root: Path) -> ToolResources:
    """Discover aictl's own deployment state and .aictx files."""
    res = ToolResources("aictl", "aictl")
    from .scanner import scan
    for _rel, parsed in scan(root):
        r = _file_resource(parsed.path, "context")
        if r:
            res.files.append(r)
    r = _file_resource(root / ".ai-deployed" / "manifest.json", "manifest")
    if r:
        res.files.append(r)
    return res


# ─── CSV-driven process detection ────────────────────────────────

_SKIP_COMMS = frozenset({
    "zsh", "bash", "sh", "fish", "grep", "ps", "awk", "sed",
    "python", "python3",
})


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
                cpu_val = info["cpu_percent"]
                cpu = f"{cpu_val:.1f}" if cpu_val is not None else "0.0"
                rss_kb = str((info["memory_info"].rss // 1024) if info["memory_info"] else 0)
                comm = info["name"] or ""
                args = " ".join(info["cmdline"] or []) or comm
                rows.append((pid, cpu, rss_kb, comm, args))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return rows
    except ImportError:
        pass

    # Fallback: POSIX ps
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
    from .platforms import IS_MACOS
    exe = args.split()[0] if args else "?"
    if IS_MACOS:
        m = re.search(r"/([^/]+?)\.app", args)
        if m:
            return m.group(1)
    return Path(exe).name


def _discover_processes_csv(
    registry,
    results: dict[str, ToolResources],
    tools: list[str] | None,
) -> None:
    """Detect running processes using CSV-defined patterns with anomaly detection."""
    specs = registry.process_specs(tools=tools)
    if not specs:
        return

    compiled: list[tuple[ProcessSpec, re.Pattern]] = []
    for spec in specs:
        if spec.ps_grep_pattern:
            try:
                compiled.append((spec, re.compile(spec.ps_grep_pattern)))
            except re.error:
                pass
    if not compiled:
        return

    rows = _parse_ps_output()
    matched_pids: set[int] = set()

    for pid_s, cpu, rss, comm, args in rows:
        basename = Path(comm).name
        if basename in _SKIP_COMMS:
            continue
        pid = int(pid_s)
        if pid in matched_pids:
            continue

        for spec, pattern in compiled:
            if pattern.search(comm) or pattern.search(args):
                try:
                    mem_mb_actual = int(rss) / 1024
                    mem_mb_str = f"{mem_mb_actual:.1f}"
                except ValueError:
                    mem_mb_actual = 0.0
                    mem_mb_str = "?"

                anomalies = _detect_anomalies(mem_mb_actual, pid, spec)

                pi = ProcessInfo(
                    pid=pid,
                    name=_process_display_name(args),
                    cmdline=args[:200],
                    cpu_pct=cpu,
                    mem_mb=mem_mb_str,
                    tool=spec.ai_tool,
                    process_type=spec.process_type,
                    expected_mem_mb=spec.memory_active_mb,
                    known_leak=spec.known_leak,
                    zombie_risk=spec.zombie_risk,
                    cleanup_cmd=spec.cleanup_command,
                    anomalies=anomalies,
                )

                tool_name = spec.ai_tool
                if tool_name not in results:
                    results[tool_name] = ToolResources(
                        tool=tool_name,
                        label=TOOL_LABELS.get(tool_name, tool_name),
                    )
                results[tool_name].processes.append(pi)
                matched_pids.add(pid)
                break

    # Also run MCP process matching (uses config data, not patterns)
    for tr in results.values():
        tr.processes.extend(_find_mcp_processes(tr.mcp_servers, tr.processes))


def _detect_anomalies(actual_mem_mb: float, pid: int, spec: ProcessSpec) -> list[str]:
    """Flag process anomalies based on CSV expectations."""
    anomalies: list[str] = []

    # Memory anomaly: > 2x expected active memory
    try:
        expected = float(spec.memory_active_mb)
        if expected > 0 and actual_mem_mb > expected * 2:
            anomalies.append(
                f"memory {actual_mem_mb:.0f}MB >> expected {expected:.0f}MB"
            )
    except (ValueError, TypeError):
        pass

    # Zombie risk: check if parent is init (ppid=1 or ppid=0)
    if spec.zombie_risk in ("high", "medium"):
        try:
            import psutil
            proc = psutil.Process(pid)
            if proc.ppid() in (0, 1):
                anomalies.append(f"orphaned (ppid={proc.ppid()}), zombie_risk={spec.zombie_risk}")
        except Exception:
            pass

    # Known leak: only flag if process is actually orphaned or has memory bloat
    if spec.known_leak and spec.leak_pattern:
        is_orphaned = any("orphaned" in a for a in anomalies)
        is_bloated = any("memory" in a and ">>" in a for a in anomalies)
        if is_orphaned or is_bloated:
            anomalies.append(f"known leak: {spec.leak_pattern}")

    return anomalies


def _find_mcp_processes(
    mcp_servers: list[dict], already: list[ProcessInfo],
) -> list[ProcessInfo]:
    """Try to find running processes matching configured MCP servers."""
    if not mcp_servers:
        return []

    search_terms: list[tuple[str, str]] = []
    for srv in mcp_servers:
        name = srv.get("name", "")
        config = srv.get("config", {})
        cmd = config.get("command", "")
        args = config.get("args", [])
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
                    name=f"[mcp:{srv_name}] {Path(comm).name}",
                    cmdline=args[:200],
                    cpu_pct=cpu,
                    mem_mb=mem_mb,
                ))
                already_pids.add(pid)
                break
    return found


# ─── Token cost aggregation ──────────────────────────────────────

def compute_token_budget(tools: list[ToolResources]) -> dict:
    """Estimate token overhead from accumulated state/memory.

    Groups resources by loading behavior using CSV metadata:
    - always: sent_to_llm="yes" and loaded_when contains "every-call"
    - on_demand: sent_to_llm="on-demand"
    - conditional: sent_to_llm in ("conditional", "partial")
    - never: sent_to_llm="no"
    """
    always = 0
    on_demand = 0
    conditional = 0
    never_count = 0
    cacheable = 0
    survives_compaction = 0

    for tr in tools:
        for f in tr.files:
            stl = f.sent_to_llm
            lw = f.loaded_when

            if stl == "yes" and "every-call" in lw:
                always += f.tokens
            elif stl == "on-demand" or "on-demand" in lw:
                on_demand += f.tokens
            elif stl in ("conditional", "partial"):
                conditional += f.tokens
            elif stl == "no" or not stl:
                never_count += 1
                continue
            else:
                # "yes" with non-every-call loading
                always += f.tokens

            if f.cacheable == "yes":
                cacheable += f.tokens
            if f.survives_compaction == "yes":
                survives_compaction += f.tokens

    return {
        "always_loaded_tokens": always,
        "on_demand_tokens": on_demand,
        "conditional_tokens": conditional,
        "never_sent_count": never_count,
        "cacheable_tokens": cacheable,
        "survives_compaction_tokens": survives_compaction,
        "total_potential_tokens": always + on_demand + conditional,
    }


# ─── Agent memory & policy collection ────────────────────────────

def _read_memory_file(path: Path, source: str, profile: str) -> MemoryEntry | None:
    """Read a memory file and return a MemoryEntry with mtime, or None."""
    try:
        content = path.read_text(errors="replace")
        if not content.strip():
            return None
        mtime = 0.0
        try:
            mtime = path.stat().st_mtime
        except OSError:
            pass
        entry = MemoryEntry(
            source=source,
            profile=profile,
            file=str(path),
            content=content,
            tokens=estimate_tokens(content),
            lines=len([l for l in content.splitlines() if l.strip()]),
        )
        entry.mtime = mtime
        return entry
    except OSError:
        return None


def collect_agent_memory(root: Path) -> list[MemoryEntry]:
    """Collect all agent memory, policies, and decisions from multiple sources."""
    entries: list[MemoryEntry] = []

    # 1. User memory — ~/.claude/CLAUDE.md
    user_memory = Path.home() / ".claude" / "CLAUDE.md"
    if user_memory.is_file():
        entry = _read_memory_file(user_memory, "claude-user-memory", "(global)")
        if entry:
            entries.append(entry)

    # 2. Project memory — <root>/CLAUDE.md
    project_memory = root / "CLAUDE.md"
    if project_memory.is_file():
        entry = _read_memory_file(project_memory, "claude-project-memory", "(project)")
        if entry:
            entries.append(entry)

    local_memory = root / "CLAUDE.local.md"
    if local_memory.is_file():
        entry = _read_memory_file(local_memory, "claude-project-memory", "(local)")
        if entry:
            entries.append(entry)

    # 3. Auto-memory — ~/.claude/projects/<hash>/memory/*.md
    from .memory import _find_project_dir, list_stashes
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
            readable = proj_dir.name.lstrip("-").split("-")[-1] if not is_active_project else ""
            profile_tag = "(active)" if is_active_project else f"({readable})"
            for md in sorted(mem_dir.glob("*.md")):
                entry = _read_memory_file(md, "claude-auto-memory", profile_tag)
                if entry:
                    entries.append(entry)

    for stash in list_stashes(root):
        if stash["profile"] == "(active)":
            continue
        stash_dir = Path(stash["dir"])
        if stash_dir.is_dir():
            for md in sorted(stash_dir.glob("*.md")):
                entry = _read_memory_file(md, "claude-auto-memory", stash["profile"])
                if entry:
                    entries.append(entry)

    return entries


# ─── MCP extended status ─────────────────────────────────────────

def collect_mcp_status(all_tools: list[ToolResources]) -> list[McpServerInfo]:
    """Build enriched MCP server info with connectivity status."""
    servers: list[McpServerInfo] = []
    seen: set[str] = set()

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

            matched = _match_mcp_to_process(name, config, all_procs)
            if matched:
                info.status = "running"
                info.pid = matched.pid
                info.cpu_pct = matched.cpu_pct
                info.mem_mb = matched.mem_mb
            else:
                if transport == "http":
                    info.status = _probe_http_mcp(endpoint)
                else:
                    info.status = "stopped"

            servers.append(info)

    return servers


def _classify_mcp_transport(config: dict) -> tuple[str, str]:
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
    cmd = config.get("command", "")
    args = config.get("args", [])
    terms = [t for t in [name, cmd] + [a for a in args if not a.startswith("-")] if t]
    if not terms:
        return None
    for _tool, proc in all_procs:
        matches = sum(1 for t in terms if t in proc.cmdline)
        if matches >= 2 or (matches == 1 and name in proc.cmdline):
            return proc
    return None


def _probe_http_mcp(url: str) -> str:
    if not url:
        return "unknown"
    try:
        import urllib.request
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return "running" if resp.status < 500 else "error"
    except Exception:
        return "stopped"


# ─── Process backtrace ───────────────────────────────────────────

def backtrace_process(pid: int) -> str | None:
    """Get a stack sample of a process."""
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
        try:
            result = subprocess.run(
                ["eu-stack", "-p", str(pid)],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode == 0:
                return result.stdout
        except FileNotFoundError:
            pass
        try:
            result = subprocess.run(
                ["gdb", "-batch", "-ex", "thread apply all bt", "-p", str(pid)],
                capture_output=True, text=True, timeout=10,
            )
            return result.stdout if result.returncode == 0 else None
        except FileNotFoundError:
            return None

    return None
