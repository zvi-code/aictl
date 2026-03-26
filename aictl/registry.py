"""CSV-driven registry for AI tool resource discovery.

Loads path and process specifications from bundled CSV data files and
provides a resolution engine that expands path templates into actual
filesystem paths.
"""

from __future__ import annotations

import csv
import os
import platform
import re
from dataclasses import dataclass
from pathlib import Path


# ─── Tool naming ──────────────────────────────────────────────────

TOOL_GROUPS: dict[str, list[str]] = {
    "claude": ["claude-code", "claude-desktop"],
    "copilot": ["copilot", "copilot-vscode", "copilot-cli", "copilot-jetbrains", "copilot-vs"],
    "codex": ["codex-cli"],
    "cursor": ["cursor"],
    "windsurf": ["windsurf"],
    "copilot365": ["copilot365"],
    "semantic-kernel": ["semantic-kernel"],
    "azure-promptflow": ["azure-promptflow"],
    "azure-ai": ["azure-ai"],
    "project-env": ["project-env"],
    "aictl": ["aictl"],
}

TOOL_LABELS: dict[str, str] = {
    "claude-code": "Claude Code",
    "claude-desktop": "Claude Desktop",
    "claude-mcp-memory": "Claude MCP Memory",
    "copilot": "GitHub Copilot",
    "copilot-vscode": "Copilot (VS Code)",
    "copilot-cli": "Copilot CLI",
    "copilot-jetbrains": "Copilot (JetBrains)",
    "copilot-vs": "Copilot (Visual Studio)",
    "copilot365": "Microsoft 365 Copilot",
    "cursor": "Cursor",
    "windsurf": "Windsurf",
    "semantic-kernel": "Semantic Kernel",
    "azure-promptflow": "Azure PromptFlow",
    "azure-ai": "Azure AI",
    "project-env": "Project Environment",
    "aictl": "aictl",
    "gemini-cli": "Gemini CLI",
    "codex-cli": "Codex CLI",
    "chatgpt-desktop": "ChatGPT Desktop",
    "chatgpt-lencx": "ChatGPT (lencx)",
    "openai-api": "OpenAI API",
    "aider": "Aider",
    "continue": "Continue",
    "openclaw": "OpenClaw",
    "opencode": "OpenCode",
    "tabnine": "Tabnine",
    "junie": "Junie",
    "cross-tool": "Cross-Tool",
}


# Single source of truth for tool display colors (hex).
# Dashboard (web + TUI) both read from here — no duplicates.
TOOL_COLORS: dict[str, str] = {
    "claude-code": "#a78bfa",
    "claude-desktop": "#c4b5fd",
    "claude-mcp-memory": "#c4b5fd",
    "copilot": "#60a5fa",
    "copilot-vscode": "#93c5fd",
    "copilot-cli": "#3b82f6",
    "copilot-jetbrains": "#60a5fa",
    "copilot-vs": "#60a5fa",
    "copilot365": "#60a5fa",
    "codex-cli": "#f97316",
    "cursor": "#34d399",
    "windsurf": "#2dd4bf",
    "project-env": "#fbbf24",
    "aictl": "#94a3b8",
    "cross-tool": "#cbd5e1",
    "gemini-cli": "#34d399",
    "chatgpt-desktop": "#10b981",
    "chatgpt-lencx": "#10b981",
    "openai-api": "#10b981",
    "aider": "#f472b6",
    "continue": "#818cf8",
    "openclaw": "#94a3b8",
    "opencode": "#94a3b8",
    "tabnine": "#e879f9",
    "junie": "#fb923c",
    "semantic-kernel": "#a78bfa",
    "azure-promptflow": "#60a5fa",
    "azure-ai": "#60a5fa",
    "claude-mem": "#c4b5fd",
}

DEFAULT_TOOL_COLOR = "#94a3b8"

# Product icons — emoji for now, can upgrade to SVG data-URIs later.
TOOL_ICONS: dict[str, str] = {
    "claude-code": "🟣",
    "claude-desktop": "🟣",
    "claude-mcp-memory": "🟣",
    "copilot": "🤖",
    "copilot-vscode": "🤖",
    "copilot-cli": "🤖",
    "copilot-jetbrains": "🤖",
    "copilot-vs": "🤖",
    "copilot365": "🤖",
    "codex-cli": "🟠",
    "cursor": "🟢",
    "windsurf": "🌊",
    "gemini-cli": "💎",
    "chatgpt-desktop": "🟢",
    "openai-api": "🟢",
    "aider": "🔧",
    "continue": "🔵",
    "openclaw": "🦞",
    "opencode": "⚡",
    "tabnine": "🟪",
    "junie": "🟧",
}

DEFAULT_TOOL_ICON = "🔹"


def tool_color(tool: str) -> str:
    """Return the hex color for a tool, with fallback."""
    return TOOL_COLORS.get(tool, DEFAULT_TOOL_COLOR)


def tool_icon(tool: str) -> str:
    """Return the icon for a tool, with fallback."""
    return TOOL_ICONS.get(tool, DEFAULT_TOOL_ICON)


def expand_tool_filter(tools: list[str]) -> set[str]:
    """Expand group names and individual tool names into CSV tool names."""
    result: set[str] = set()
    for t in tools:
        if t in TOOL_GROUPS:
            result.update(TOOL_GROUPS[t])
        else:
            result.add(t)
    return result


# ─── Dataclasses ──────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class PathSpec:
    """One row from the paths CSV."""
    path_template: str
    ai_tool: str
    platform: str
    hidden: bool
    scope: str
    category: str
    sent_to_llm: str
    approx_tokens: str
    read_write: str
    survives_compaction: str
    cacheable: str
    loaded_when: str
    path_args: str
    description: str
    resolution: str
    root_strategy: str


@dataclass(frozen=True, slots=True)
class ProcessSpec:
    """One row from the processes CSV."""
    process_name: str
    ai_tool: str
    process_type: str
    runtime: str
    parent_process: str
    starts_at: str
    stops_at: str
    is_daemon: bool
    auto_start: bool
    listens_port: str
    outbound_targets: str
    memory_idle_mb: str
    memory_active_mb: str
    known_leak: bool
    leak_pattern: str
    zombie_risk: str
    cleanup_command: str
    ps_grep_pattern: str
    platform: str
    description: str


# ─── CSV loading ──────────────────────────────────────────────────

def _data_path(filename: str) -> Path:
    return Path(__file__).parent / "data" / filename


def _current_platform() -> str:
    system = platform.system()
    if system == "Darwin":
        return "macos"
    if system == "Windows":
        return "windows"
    return "linux"


def _platform_match(spec_platform: str, current: str) -> bool:
    if spec_platform == "all":
        return True
    return current in spec_platform.replace("/", ",").replace(" ", "").split(",")


def _bool_field(val: str) -> bool:
    return val.strip().lower() in ("yes", "true", "1")


def _load_path_csv(path: Path) -> list[PathSpec]:
    specs: list[PathSpec] = []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    specs.append(PathSpec(
                        path_template=row["path"],
                        ai_tool=row["ai_tool"],
                        platform=row["platform"],
                        hidden=_bool_field(row.get("hidden", "no")),
                        scope=row["scope"],
                        category=row["category"],
                        sent_to_llm=row.get("sent_to_llm", ""),
                        approx_tokens=row.get("approx_tokens", "0"),
                        read_write=row.get("read_write", ""),
                        survives_compaction=row.get("survives_compaction", ""),
                        cacheable=row.get("cacheable", ""),
                        loaded_when=row.get("loaded_when", ""),
                        path_args=row.get("path_args", ""),
                        description=row.get("description", ""),
                        resolution=row.get("resolution", "literal"),
                        root_strategy=row.get("root_strategy", ""),
                    ))
                except (KeyError, TypeError):
                    continue
    except OSError:
        pass
    return specs


def _load_process_csv(path: Path) -> list[ProcessSpec]:
    specs: list[ProcessSpec] = []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    specs.append(ProcessSpec(
                        process_name=row["process_name"],
                        ai_tool=row["ai_tool"],
                        process_type=row.get("process_type", ""),
                        runtime=row.get("runtime", ""),
                        parent_process=row.get("parent_process", ""),
                        starts_at=row.get("starts_at", ""),
                        stops_at=row.get("stops_at", ""),
                        is_daemon=_bool_field(row.get("is_daemon", "no")),
                        auto_start=_bool_field(row.get("auto_start", "no")),
                        listens_port=row.get("listens_port", ""),
                        outbound_targets=row.get("outbound_targets", ""),
                        memory_idle_mb=row.get("memory_idle_mb", ""),
                        memory_active_mb=row.get("memory_active_mb", ""),
                        known_leak=_bool_field(row.get("known_leak", "no")),
                        leak_pattern=row.get("leak_pattern", ""),
                        zombie_risk=row.get("zombie_risk", "none"),
                        cleanup_command=row.get("cleanup_command", ""),
                        ps_grep_pattern=row.get("ps_grep_pattern", ""),
                        platform=row.get("platform", "all"),
                        description=row.get("description", ""),
                    ))
                except (KeyError, TypeError):
                    continue
    except OSError:
        pass
    return specs


# ─── Registry ─────────────────────────────────────────────────────

class Registry:
    """Loads and filters CSV specifications for path and process discovery."""

    def __init__(self) -> None:
        self._platform = _current_platform()
        suffix = "windows" if self._platform == "windows" else "unix"
        self._path_specs = _load_path_csv(_data_path(f"paths-{suffix}.csv"))
        self._process_specs = _load_process_csv(_data_path(f"processes-{suffix}.csv"))

    @property
    def platform(self) -> str:
        return self._platform

    def path_specs(self, *, tools: list[str] | None = None) -> list[PathSpec]:
        specs = [s for s in self._path_specs
                 if _platform_match(s.platform, self._platform)]
        if tools:
            expanded = expand_tool_filter(tools)
            specs = [s for s in specs if s.ai_tool in expanded]
        return specs

    def process_specs(self, *, tools: list[str] | None = None) -> list[ProcessSpec]:
        specs = [s for s in self._process_specs
                 if _platform_match(s.platform, self._platform)]
        if tools:
            expanded = expand_tool_filter(tools)
            specs = [s for s in specs if s.ai_tool in expanded]
        return specs


# Module-level singleton
_registry: Registry | None = None


def get_registry() -> Registry:
    global _registry
    if _registry is None:
        _registry = Registry()
    return _registry


# ─── Tree-walk helpers ────────────────────────────────────────────

PRUNE_DIRS = frozenset({
    ".git", ".venv", "venv", ".env", "node_modules", ".npm", ".yarn",
    "__pycache__", ".mypy_cache", ".pytest_cache", ".tox", ".ruff_cache",
    "dist", "build", ".cargo", "target", ".idea", ".vs",
    "Pods", "DerivedData",
})


def find_in_tree(root: Path, filename: str) -> list[Path]:
    """Find every file named *filename* under root, skipping irrelevant dirs."""
    results = []
    for dirpath_str, dirnames, filenames in os.walk(str(root)):
        dirnames[:] = [d for d in dirnames if d not in PRUNE_DIRS]
        if filename in filenames:
            results.append(Path(dirpath_str) / filename)
    return sorted(results)


def find_dirs_in_tree(root: Path, dirname: str) -> list[Path]:
    """Find every directory named *dirname* under root."""
    results = []
    for dirpath_str, dirnames, _ in os.walk(str(root)):
        if dirname in dirnames:
            results.append(Path(dirpath_str) / dirname)
        dirnames[:] = [d for d in dirnames
                       if d not in PRUNE_DIRS and d != dirname]
    return sorted(results)


def batch_find_in_tree(
    root: Path,
    filenames: set[str],
    dirnames: set[str],
) -> tuple[dict[str, list[Path]], dict[str, list[Path]]]:
    """Single tree walk that collects all matching files and directories."""
    file_matches: dict[str, list[Path]] = {f: [] for f in filenames}
    dir_matches: dict[str, list[Path]] = {d: [] for d in dirnames}
    for dirpath_str, dirs, files in os.walk(str(root)):
        dirs[:] = [d for d in dirs if d not in PRUNE_DIRS]
        for f in filenames:
            if f in files:
                file_matches[f].append(Path(dirpath_str) / f)
        for d in list(dirs):
            if d in dirnames:
                dir_matches[d].append(Path(dirpath_str) / d)
                dirs.remove(d)  # don't recurse into found dirs
    for v in file_matches.values():
        v.sort()
    for v in dir_matches.values():
        v.sort()
    return file_matches, dir_matches


# ─── Path template helpers ────────────────────────────────────────

_PARAM_RE = re.compile(r"\{[^}]+\}")


def _expand_home(template: str) -> str:
    """Expand ~ and common env vars in a path template."""
    if template.startswith("~/"):
        template = str(Path.home()) + template[1:]
    elif template.startswith("$HOME/"):
        template = str(Path.home()) + template[5:]
    # Windows env vars
    for var in ("APPDATA", "LOCALAPPDATA", "USERPROFILE"):
        token = f"%{var}%"
        if token in template:
            template = template.replace(token, os.environ.get(var, str(Path.home())))
    return template


def _params_to_glob(path: str) -> str:
    """Replace {param} tokens with * for glob matching."""
    return _PARAM_RE.sub("*", path)


# ─── Resolution strategies ────────────────────────────────────────

def resolve_path(spec: PathSpec, root: Path,
                 _cache: dict | None = None) -> list[Path]:
    """Resolve a PathSpec template against a project root.

    _cache is an optional dict from batch_resolve_paths() that holds
    pre-computed tree walk results.
    """
    strategy = spec.resolution
    if strategy == "literal":
        return _resolve_literal(spec.path_template)
    elif strategy == "rooted":
        return _resolve_rooted(spec.path_template, root)
    elif strategy == "recursive":
        return _resolve_recursive(spec.path_template, root, _cache)
    elif strategy == "parent":
        return _resolve_parent(spec.path_template, root)
    elif strategy == "shadow":
        return _resolve_shadow(spec.path_template, spec.ai_tool, root)
    return []


def _resolve_literal(template: str) -> list[Path]:
    """Expand ~, env vars, then check existence. Handle globs."""
    expanded = _expand_home(template)
    # Skip relative patterns (e.g. "tmpclaude-*-cwd") — not absolute paths
    if not Path(expanded).is_absolute():
        return []
    # Has parameters → treat as glob
    if _PARAM_RE.search(expanded):
        expanded = _params_to_glob(expanded)
    if "*" in expanded:
        # Find the deepest non-glob parent
        parts = Path(expanded).parts
        base_parts = []
        for p in parts:
            if "*" in p:
                break
            base_parts.append(p)
        base = Path(*base_parts) if base_parts else Path("/")
        if not base.is_dir():
            return []
        try:
            rel = str(Path(expanded).relative_to(base))
        except ValueError:
            return []
        return sorted(p for p in base.glob(rel) if p.exists())
    p = Path(expanded)
    return [p] if p.exists() else []


def _resolve_rooted(template: str, root: Path) -> list[Path]:
    """Replace {project-root} with root, check existence."""
    path_str = template.replace("{project-root}", str(root))
    path_str = _expand_home(path_str)
    if _PARAM_RE.search(path_str):
        path_str = _params_to_glob(path_str)
    if "*" in path_str:
        try:
            rel = str(Path(path_str).relative_to(root))
        except ValueError:
            rel = path_str.replace(str(root) + os.sep, "", 1)
        return sorted(p for p in root.glob(rel) if p.exists())
    p = Path(path_str)
    return [p] if p.exists() else []


def _resolve_recursive(template: str, root: Path,
                       _cache: dict | None = None) -> list[Path]:
    """Find files/dirs matching the template anywhere under root."""
    # Strip prefix
    relative = template
    for prefix in ("{project-root}/", "{subdirectory}/"):
        if relative.startswith(prefix):
            relative = relative[len(prefix):]
            break

    # Normalize to forward slashes for consistent splitting (CSV uses /)
    parts = relative.replace("\\", "/").split("/")
    first = parts[0]

    # Pattern A: hidden dir at first level → find_dirs_in_tree + glob subpath
    # e.g. ".claude/rules/*.mdc" → find ".claude" dirs, glob "rules/*.mdc"
    if first.startswith(".") and "{" not in first and "*" not in first and len(parts) > 1:
        sub_pattern = "/".join(parts[1:])
        sub_pattern = _params_to_glob(sub_pattern)
        results: list[Path] = []
        if _cache and first in _cache.get("dirs", {}):
            found_dirs = _cache["dirs"][first]
        else:
            found_dirs = find_dirs_in_tree(root, first)
        for found_dir in found_dirs:
            if "*" in sub_pattern:
                results.extend(sorted(
                    p for p in found_dir.glob(sub_pattern) if p.is_file()
                ))
            else:
                p = found_dir / sub_pattern
                if p.exists():
                    results.append(p)
        return results

    # Pattern B: simple filename (possibly with params)
    # e.g. "CLAUDE.md", "teamsapp.yml", "AGENTS.md"
    if len(parts) == 1:
        filename = parts[0]
        if "{" in filename or "*" in filename:
            # Glob at every level — rare, skip for now
            return []
        if _cache and filename in _cache.get("files", {}):
            return _cache["files"][filename]
        return find_in_tree(root, filename)

    # Pattern C: directory trail ending in filename or glob
    # e.g. "cascade-memories/" → find dir; "appPackage/manifest.json" → find dir + file
    if first.endswith("/"):
        # It's a directory path
        dirname = first.rstrip("/")
        found_dirs = find_dirs_in_tree(root, dirname)
        if len(parts) == 1:
            return found_dirs
        sub = "/".join(parts[1:])
        sub = _params_to_glob(sub)
        results = []
        for d in found_dirs:
            if "*" in sub:
                results.extend(sorted(p for p in d.glob(sub) if p.is_file()))
            else:
                p = d / sub
                if p.exists():
                    results.append(p)
        return results

    # Fallback: treat entire relative path as a simple file under root
    target = root / _params_to_glob(relative)
    if "*" in str(target):
        return sorted(p for p in root.glob(_params_to_glob(relative)) if p.exists())
    return [target] if target.exists() else []


def _resolve_parent(template: str, root: Path) -> list[Path]:
    """Walk from root.parent up to $HOME, checking for filename."""
    filename = template.replace("{parent}/", "")
    results: list[Path] = []
    home = Path.home()
    parent = root.parent
    visited: set[Path] = set()
    while parent != parent.parent and parent not in visited:
        visited.add(parent)
        if parent == home or len(visited) > 10:
            break
        p = parent / filename
        if p.is_file():
            results.append(p)
        parent = parent.parent
    return results


def _resolve_shadow(template: str, tool: str, root: Path) -> list[Path]:
    """Resolve shadow-encoded paths (currently claude-code only)."""
    if tool != "claude-code":
        return []
    from .memory import _find_project_dir
    proj = _find_project_dir(root)
    if not proj:
        return []

    # Extract sub-path after {project}/
    if "{project}/" in template:
        sub_path = template.split("{project}/", 1)[1]
    elif "{project}" in template:
        return [proj] if proj.exists() else []
    else:
        return []

    sub_glob = _params_to_glob(sub_path)
    results = sorted(proj.glob(sub_glob))
    return [r for r in results if r.exists()]


# ─── Batch resolution ─────────────────────────────────────────────

def batch_resolve_paths(
    specs: list[PathSpec], root: Path,
) -> list[tuple[PathSpec, list[Path]]]:
    """Resolve all path specs, using a single tree walk for recursive specs."""
    # Collect what recursive specs need
    need_files: set[str] = set()
    need_dirs: set[str] = set()
    for spec in specs:
        if spec.resolution != "recursive":
            continue
        relative = spec.path_template
        for prefix in ("{project-root}/", "{subdirectory}/"):
            if relative.startswith(prefix):
                relative = relative[len(prefix):]
                break
        parts = relative.split("/")
        first = parts[0]
        if first.startswith(".") and "{" not in first and "*" not in first and len(parts) > 1:
            need_dirs.add(first)
        elif len(parts) == 1 and "{" not in first and "*" not in first:
            need_files.add(first)

    # Single tree walk
    cache: dict[str, dict[str, list[Path]]] = {"files": {}, "dirs": {}}
    if need_files or need_dirs:
        file_matches, dir_matches = batch_find_in_tree(root, need_files, need_dirs)
        cache["files"] = file_matches
        cache["dirs"] = dir_matches

    # Resolve all specs
    results: list[tuple[PathSpec, list[Path]]] = []
    for spec in specs:
        paths = resolve_path(spec, root, _cache=cache)
        if paths:
            results.append((spec, paths))
    return results
