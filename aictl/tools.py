# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tool registry + discovery engine.

CSV-driven registry for AI tool resource discovery, combined with the
discovery engine that resolves them against the project tree.
"""

from __future__ import annotations

import csv
import json
import os
import re
import subprocess
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path


# ─── Tool naming ──────────────────────────────────────────────────

TOOL_GROUPS: dict[str, list[str]] = {
    "claude": ["claude-code", "claude-desktop"],
    "copilot": ["copilot", "copilot-vscode", "copilot-cli", "copilot-jetbrains", "copilot-vs"],
    "codex": ["codex-cli"],
    "cursor": ["cursor"],
    "windsurf": ["windsurf"],
    "copilot365": ["copilot365"],
    "gemini": ["gemini-cli"],
    "project-env": ["project-env"],
    "aictl": ["aictl"],
}

# ─── Faceted taxonomy ────────────────────────────────────────────
#
# Each tool has: vendor (who makes it), host (where it runs), and
# optionally default_model.  A tool can run on multiple hosts.
#
# Vendors:
#   anthropic, github, openai, google, jetbrains, cursor-inc,
#   codeium, microsoft, community, mixed, meta (aictl itself)
#
# Hosts:
#   cli          — terminal / command-line
#   vscode       — VS Code / VS Code fork extension
#   jetbrains    — JetBrains IDE plugin
#   desktop      — standalone desktop application
#   web          — browser-based interface
#   standalone   — bundled IDE (Cursor, Windsurf — host IS the tool)
#   m365         — Microsoft 365 integration
#   any          — applies to multiple / not host-specific

@dataclass(frozen=True, slots=True)
class ToolMeta:
    """Taxonomy metadata for one AI tool."""
    vendor: str
    hosts: tuple[str, ...]
    default_model: str = ""
    meta: bool = False   # True = not an interactive AI tool (context files, env, infra)

TOOL_TAXONOMY: dict[str, ToolMeta] = {
    # ── Anthropic ──
    "claude-code":       ToolMeta("anthropic",   ("cli", "vscode"), "claude-sonnet-4"),
    "claude-desktop":    ToolMeta("anthropic",   ("desktop",),      "claude-sonnet-4"),
    # ── GitHub / Microsoft ──
    "copilot":           ToolMeta("github",      ("vscode", "jetbrains", "cli")),
    "copilot-vscode":    ToolMeta("github",      ("vscode",)),
    "copilot-cli":       ToolMeta("github",      ("cli",)),
    "copilot-jetbrains": ToolMeta("github",      ("jetbrains",)),
    "copilot-vs":        ToolMeta("github",      ("vscode",)),  # Visual Studio
    "copilot365":        ToolMeta("microsoft",   ("m365",)),
    # ── OpenAI ──
    "codex-cli":         ToolMeta("openai",      ("cli",),          "gpt-5.4"),
    "chatgpt-desktop":   ToolMeta("openai",      ("desktop",)),
    "chatgpt-lencx":     ToolMeta("openai",      ("desktop",)),
    # ── Google ──
    "gemini":           ToolMeta("google",      ("cli",),          "gemini-2.5-pro"),
    "gemini-cli":        ToolMeta("google",      ("cli",),          "gemini-2.5-pro"),
    # ── Standalone IDEs (host IS the tool) ──
    "cursor":            ToolMeta("cursor-inc",  ("standalone",)),
    "windsurf":          ToolMeta("codeium",     ("standalone",)),
    # ── Community / OSS ──
    "openclaw":          ToolMeta("community",   ("cli",)),
    # ── Project context (meta: not interactive AI tools) ──
    "project-env":       ToolMeta("mixed",       ("any",),          meta=True),
    "any":               ToolMeta("mixed",       ("any",),          meta=True),
    "aictl":             ToolMeta("meta",        ("cli",),          meta=True),
}

# Vendor display labels
VENDOR_LABELS: dict[str, str] = {
    "anthropic": "Anthropic",
    "github": "GitHub",
    "openai": "OpenAI",
    "google": "Google",
    "microsoft": "Microsoft",
    "cursor-inc": "Cursor Inc",
    "codeium": "Codeium",
    "jetbrains": "JetBrains",
    "community": "Community",
    "mixed": "Multi-vendor",
    "meta": "aictl",
}

# Host display labels
HOST_LABELS: dict[str, str] = {
    "cli": "CLI Tools",
    "vscode": "VS Code",
    "jetbrains": "JetBrains",
    "desktop": "Desktop Apps",
    "web": "Web",
    "standalone": "Standalone IDEs",
    "m365": "Microsoft 365",
    "any": "Cross-platform",
}

# Vendor colors (for group-by vendor view)
VENDOR_COLORS: dict[str, str] = {
    "anthropic": "#a78bfa",
    "github": "#60a5fa",
    "openai": "#10b981",
    "google": "#34d399",
    "microsoft": "#60a5fa",
    "cursor-inc": "#34d399",
    "codeium": "#2dd4bf",
    "jetbrains": "#fb923c",
    "community": "#94a3b8",
    "mixed": "#cbd5e1",
    "meta": "#94a3b8",
}


def _tool_meta_attr(tool: str, attr: str, default):
    """Return *attr* from TOOL_TAXONOMY entry for *tool*, or *default* if unknown."""
    meta = TOOL_TAXONOMY.get(tool)
    return getattr(meta, attr, default) if meta else default


def tool_vendor(tool: str) -> str:
    """Return the vendor for a tool."""
    return _tool_meta_attr(tool, "vendor", "community")


def tool_hosts(tool: str) -> tuple[str, ...]:
    """Return the host(s) a tool runs on."""
    return _tool_meta_attr(tool, "hosts", ("any",))


def tool_is_meta(tool: str) -> bool:
    """Return True if the tool is infrastructure/context, not an interactive AI tool."""
    return _tool_meta_attr(tool, "meta", False)

TOOL_LABELS: dict[str, str] = {
    "claude-code": "Claude Code",
    "claude-desktop": "Claude Desktop",
    "copilot": "GitHub Copilot",
    "copilot-vscode": "Copilot VS Code",
    "copilot-cli": "Copilot CLI",
    "copilot-jetbrains": "Copilot (JetBrains)",
    "copilot-vs": "Copilot (Visual Studio)",
    "copilot365": "Microsoft 365 Copilot",
    "cursor": "Cursor",
    "windsurf": "Windsurf",
    "project-env": "Project Environment",
    "aictl": "aictl",
    "gemini": "Gemini",
    "gemini-cli": "Gemini CLI",
    "codex-cli": "Codex CLI",
    "chatgpt-desktop": "ChatGPT Desktop",
    "chatgpt-lencx": "ChatGPT (lencx)",
    "openclaw": "OpenClaw",
    "cross-tool": "Shared Instructions",
    "any": "Unclassified",
}


# Single source of truth for tool display colors (hex).
# Dashboard (web + TUI) both read from here — no duplicates.
TOOL_COLORS: dict[str, str] = {
    "vscode": "#007acc",
    "claude-code": "#a78bfa",
    "claude-desktop": "#c4b5fd",
    "claude-mcp-memory": "#c4b5fd",
    "copilot":           "#60a5fa",
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
    "gemini": "#34d399",
    "gemini-cli": "#34d399",
    "chatgpt-desktop": "#10b981",
    "chatgpt-lencx": "#10b981",
    "openclaw": "#94a3b8",
}

DEFAULT_TOOL_COLOR = "#94a3b8"

# Product icons — emoji for now, can upgrade to SVG data-URIs later.
TOOL_ICONS: dict[str, str] = {
    "vscode": "🔷",
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
    "gemini": "💎",
    "gemini-cli": "💎",
    "chatgpt-desktop": "🟢",
    "openclaw": "🦞",
}

DEFAULT_TOOL_ICON = "🔹"


# Static tool relationships — structural facts about delegation, bundling, shared billing.
# Rendered as info badges in the dashboard ToolCard when expanded.
TOOL_RELATIONSHIPS: dict[str, list[dict[str, str]]] = {
    "claude-desktop": [
        {"type": "bundles", "tool": "claude-code", "label": "Bundles its own claude binary (may differ from CLI version)"},
    ],
    "claude-code": [
        {"type": "bundled-by", "tool": "claude-desktop", "label": "Desktop app bundles a separate claude binary"},
        {"type": "delegated-from", "tool": "copilot-vscode", "label": "Copilot Chat 'Claude' session target delegates to this harness"},
    ],
    "copilot-vscode": [
        {"type": "delegates-to", "tool": "claude-code", "label": "'Claude' session target uses Claude Code harness"},
        {"type": "shares-billing", "tool": "copilot-cli", "label": "Same GitHub Copilot subscription"},
        {"type": "session-targets", "tool": "copilot-vscode", "label": "4 session targets: Local, Cloud, Claude, Copilot CLI"},
    ],
    "copilot-cli": [
        {"type": "shares-billing", "tool": "copilot-vscode", "label": "Same GitHub Copilot subscription"},
        {"type": "bridge", "tool": "copilot-vscode", "label": "CLI\u2194VS Code bridge via copilotCli/ and /ide command"},
    ],
    "copilot365": [
        {"type": "cloud-only", "tool": "copilot365", "label": "Thin WebView2 client \u2014 all AI is cloud-only via Azure OpenAI"},
    ],
}


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
    vendor: str
    host: str
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
    vendor: str
    host: str
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



def _platform_match(spec_platform: str, current: str) -> bool:
    if spec_platform == "all":
        return True
    return current in spec_platform.replace("/", ",").replace(" ", "").split(",")


def _bool_field(val: str) -> bool:
    return val.strip().lower() in ("yes", "true", "1")


def _rss_to_mb(rss: str) -> tuple[float, str]:
    """Convert RSS KB string to (float MB, display string). Returns (0.0, '?') on error."""
    try:
        mb = int(rss) / 1024
        return mb, f"{mb:.1f}"
    except ValueError:
        return 0.0, "?"


def _load_csv(path: Path, factory: Callable[[dict], object]) -> list:
    """Load a CSV and build objects with factory, skipping bad rows and missing files."""
    items = []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    items.append(factory(row))
                except (KeyError, TypeError):
                    continue
    except OSError:
        pass
    return items


def _load_path_csv(path: Path) -> list[PathSpec]:
    return _load_csv(path, lambda row: PathSpec(
        path_template=row["path"],
        ai_tool=row["ai_tool"],
        vendor=row.get("vendor", tool_vendor(row["ai_tool"])),
        host=row.get("host", ",".join(tool_hosts(row["ai_tool"]))),
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


def _load_process_csv(path: Path) -> list[ProcessSpec]:
    return _load_csv(path, lambda row: ProcessSpec(
        process_name=row["process_name"],
        ai_tool=row["ai_tool"],
        vendor=row.get("vendor", tool_vendor(row["ai_tool"])),
        host=row.get("host", ",".join(tool_hosts(row["ai_tool"]))),
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


def _filter_specs(specs: list, platform: str, tools: list[str] | None) -> list:
    """Filter spec list by current platform and optional tool set."""
    result = [s for s in specs if _platform_match(s.platform, platform)]
    if tools:
        expanded = expand_tool_filter(tools)
        result = [s for s in result if s.ai_tool in expanded]
    return result


# ─── Registry ─────────────────────────────────────────────────────

class Registry:
    """Loads and filters CSV specifications for path and process discovery."""

    def __init__(self) -> None:
        self._platform = CURRENT_PLATFORM
        suffix = "windows" if self._platform == "windows" else "unix"
        self._path_specs = _load_path_csv(_data_path(f"paths-{suffix}.csv"))
        self._process_specs = _load_process_csv(_data_path(f"processes-{suffix}.csv"))

    @property
    def platform(self) -> str:
        return self._platform

    def path_specs(self, *, tools: list[str] | None = None) -> list[PathSpec]:
        return _filter_specs(self._path_specs, self._platform, tools)

    def process_specs(self, *, tools: list[str] | None = None) -> list[ProcessSpec]:
        return _filter_specs(self._process_specs, self._platform, tools)


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
    for v in [*file_matches.values(), *dir_matches.values()]:
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

# Dispatch table: resolution strategy → callable(spec, root, _cache) → list[Path]
_RESOLVE_DISPATCH = {
    "literal":   lambda s, r, c: _resolve_literal(s.path_template),
    "rooted":    lambda s, r, c: _resolve_rooted(s.path_template, r),
    "recursive": lambda s, r, c: _resolve_recursive(s.path_template, r, c),
    "parent":    lambda s, r, c: _resolve_parent(s.path_template, r),
    "shadow":    lambda s, r, c: _resolve_shadow(s.path_template, s.ai_tool, r),
}


def resolve_path(spec: PathSpec, root: Path,
                 _cache: dict | None = None) -> list[Path]:
    """Resolve a PathSpec template against a project root.

    _cache is an optional dict from batch_resolve_paths() that holds
    pre-computed tree walk results.
    """
    fn = _RESOLVE_DISPATCH.get(spec.resolution)
    return fn(spec, root, _cache) if fn else []


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
        parts = relative.replace("\\", "/").split("/")
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


# ─── Discovery ─────────────────────────────────────────────────────────────

from .fsutil import safe_glob, safe_iterdir, safe_rglob, safe_stat, safe_walk
from .platforms import CURRENT_PLATFORM, IS_MACOS
from .utils import estimate_tokens, norm_path


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

    def __post_init__(self):
        self.path = norm_path(self.path)


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
    anomalies: list[dict] = field(default_factory=list)


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

    def __post_init__(self):
        self.file = norm_path(self.file)


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
        for f in safe_glob(directory, pattern):
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
        tr = results_by_tool.setdefault(tool_name, ToolResources(
            tool=tool_name, label=TOOL_LABELS.get(tool_name, tool_name),
        ))
        for path in paths:
            rf = _file_resource(path, spec.category)
            if rf:
                rf.tool = tool_name
                rf.scope = spec.scope
                rf.sent_to_llm = spec.sent_to_llm
                rf.loaded_when = spec.loaded_when
                rf.cacheable = spec.cacheable
                rf.survives_compaction = spec.survives_compaction
                tr.files.append(rf)

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
    for dp, dirnames, _ in safe_walk(root, prune_dirs=PRUNE_DIRS):
        for d in sorted(dirnames):
            if d.startswith(".") and d not in skip:
                item = dp / d
                for pat, kind in [("*.json", "config"), ("*.yaml", "config"),
                                   ("*.yml", "config"), ("*.md", "instructions")]:
                    for f in safe_glob(item, pat):
                        st = safe_stat(f)
                        if f.is_file() and st and st.st_size < 500_000:
                            rf = _file_resource(f, f"hidden ({d})")
                            if rf:
                                res.files.append(rf)

    return res


# ─── aictl itself ────────────────────────────────────────────────

def _discover_aictl(root: Path) -> ToolResources:
    """Discover aictl's own deployment state and .aictx files."""
    res = ToolResources("aictl", "aictl")
    from .context import scan
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
                mem_mb_actual, mem_mb_str = _rss_to_mb(rss)

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
                results.setdefault(tool_name, ToolResources(
                    tool=tool_name, label=TOOL_LABELS.get(tool_name, tool_name),
                )).processes.append(pi)
                matched_pids.add(pid)
                break

    # Also run MCP process matching (uses config data, not patterns).
    # Track globally to avoid same PID appearing under multiple tools.
    global_mcp_pids: set[int] = set(matched_pids)
    for tr in results.values():
        new_procs = _find_mcp_processes(tr.mcp_servers, tr.processes, global_mcp_pids)
        tr.processes.extend(new_procs)
        global_mcp_pids.update(p.pid for p in new_procs)


def _detect_anomalies(actual_mem_mb: float, pid: int, spec: ProcessSpec) -> list[dict]:
    """Flag process anomalies based on CSV expectations."""
    anomalies: list[dict] = []

    # Memory anomaly: > 2x expected active memory
    try:
        expected = float(spec.memory_active_mb)
        if expected > 0 and actual_mem_mb > expected * 2:
            anomalies.append({
                "type": "high_memory",
                "actual_mb": round(actual_mem_mb, 1),
                "expected_mb": round(expected, 1),
            })
    except (ValueError, TypeError):
        pass

    # Zombie risk: check if parent is init (ppid=1 or ppid=0)
    if spec.zombie_risk in ("high", "medium"):
        try:
            import psutil
            proc = psutil.Process(pid)
            if proc.ppid() in (0, 1):
                anomalies.append({
                    "type": "zombie",
                    "ppid": proc.ppid(),
                    "risk": spec.zombie_risk,
                })
        except ImportError:
            pass
        except (psutil.NoSuchProcess, psutil.AccessDenied, OSError):
            pass

    # Known leak: only flag if process is actually orphaned or has memory bloat
    if spec.known_leak and spec.leak_pattern:
        is_orphaned = any(
            (isinstance(a, dict) and a.get("type") == "zombie") for a in anomalies
        )
        is_bloated = any(
            (isinstance(a, dict) and a.get("type") == "high_memory") for a in anomalies
        )
        if is_orphaned or is_bloated:
            anomalies.append({
                "type": "known_leak",
                "pattern": spec.leak_pattern,
            })

    return anomalies


def _find_mcp_processes(
    mcp_servers: list[dict], already: list[ProcessInfo],
    global_exclude_pids: set[int] | None = None,
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
    if global_exclude_pids:
        already_pids |= global_exclude_pids
    rows = _parse_ps_output()
    found = []
    for pid_s, cpu, rss, comm, args in rows:
        pid = int(pid_s)
        if pid in already_pids:
            continue
        for srv_name, pattern in search_terms:
            if pattern and re.search(pattern, args):
                _, mem_mb = _rss_to_mb(rss)
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

def compute_token_budget(tools: list[ToolResources], root: str = "") -> dict:
    """Estimate token overhead for a single context window.

    Groups resources by loading behavior using CSV metadata.
    Crucially, project-scoped files from *sub-projects* (directories
    under root that each have their own .claude/, .github/, etc.) are
    mutually exclusive — only one sub-project's files would be loaded
    at a time.  We report the *largest* sub-project as the realistic
    worst case, plus global files which are always shared.

    Returns both the realistic estimate (global + largest sub-project)
    and the raw totals for reference.
    """
    nroot = norm_path(root)

    # Classify each file into global vs sub-project buckets
    global_always = 0
    global_on_demand = 0
    global_conditional = 0
    # Per sub-project: {project_name: {always, on_demand, conditional}}
    by_project: dict[str, dict[str, int]] = {}
    never_count = 0
    cacheable = 0
    survives_compaction = 0
    raw_always = 0
    raw_on_demand = 0
    raw_conditional = 0

    for tr in tools:
        for f in tr.files:
            stl = f.sent_to_llm
            lw = f.loaded_when

            # Classify loading behavior
            if stl == "no" or not stl:
                never_count += 1
                continue
            if stl == "yes" and "every-call" in lw:
                bucket = "always"
            elif stl == "on-demand" or "on-demand" in lw:
                bucket = "on_demand"
            elif stl in ("conditional", "partial"):
                bucket = "conditional"
            else:
                bucket = "always"

            tok = f.tokens

            # Track raw totals
            if bucket == "always":
                raw_always += tok
            elif bucket == "on_demand":
                raw_on_demand += tok
            else:
                raw_conditional += tok

            if f.cacheable == "yes":
                cacheable += tok
            if f.survives_compaction == "yes":
                survives_compaction += tok

            # Determine if file is global or sub-project-specific
            proj = "(root)"
            is_global = f.scope == "global" or f.scope == "session"
            if not is_global and nroot and f.path:
                npath = norm_path(f.path)
                if npath.startswith(nroot + "/"):
                    rel = npath[len(nroot) + 1:]
                    first = rel.split("/")[0]
                    # Files directly in root's own .claude/ etc. are "root project"
                    if first.startswith("."):
                        proj = "(root)"
                    else:
                        proj = first
                else:
                    proj = "(external)"
                    is_global = True  # external files are shared

            if is_global:
                if bucket == "always":
                    global_always += tok
                elif bucket == "on_demand":
                    global_on_demand += tok
                else:
                    global_conditional += tok
            else:
                if proj not in by_project:
                    by_project[proj] = {"always": 0, "on_demand": 0, "conditional": 0}
                by_project[proj][bucket] += tok

    # Realistic estimate: global + largest sub-project
    largest_proj = ""
    largest_proj_total = 0
    for pname, ptok in by_project.items():
        pt = ptok["always"] + ptok["on_demand"] + ptok["conditional"]
        if pt > largest_proj_total:
            largest_proj_total = pt
            largest_proj = pname

    lp = by_project.get(largest_proj, {"always": 0, "on_demand": 0, "conditional": 0})
    realistic_always = global_always + lp["always"]
    realistic_on_demand = global_on_demand + lp["on_demand"]
    realistic_conditional = global_conditional + lp["conditional"]

    return {
        "always_loaded_tokens": realistic_always,
        "on_demand_tokens": realistic_on_demand,
        "conditional_tokens": realistic_conditional,
        "never_sent_count": never_count,
        "cacheable_tokens": cacheable,
        "survives_compaction_tokens": survives_compaction,
        "total_potential_tokens": realistic_always + realistic_on_demand + realistic_conditional,
        # Raw totals (sum of ALL projects — for reference)
        "raw_always_all_projects": raw_always,
        "raw_total_all_projects": raw_always + raw_on_demand + raw_conditional,
        # Breakdown
        "global_tokens": global_always + global_on_demand + global_conditional,
        "largest_project": largest_proj,
        "largest_project_tokens": largest_proj_total,
        "project_count": len(by_project),
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
    from .memory import _find_project_dir, list_stashes
    from .platforms import copilot_global_storage, windsurf_global_dir

    entries: list[MemoryEntry] = []
    home = Path.home()

    # 1–2. Claude Code single-file sources
    for path, source, profile in [
        (home / ".claude" / "CLAUDE.md",           "claude-user-memory",    "(global)"),
        (root / "CLAUDE.md",                        "claude-project-memory", "(project)"),
        (root / "CLAUDE.local.md",                  "claude-project-memory", "(local)"),
        (home / ".copilot" / "copilot-instructions.md", "copilot-user-memory", "(global)"),
        (home / ".codex" / "instructions.md",       "codex-user-memory",     "(global)"),
        (windsurf_global_dir() / "memories" / "global_rules.md", "windsurf-user-memory", "(global)"),
    ]:
        if entry := _read_memory_file(path, source, profile):
            entries.append(entry)

    # 3. Claude auto-memory — ~/.claude/projects/<hash>/memory/*.md
    claude_projects = home / ".claude" / "projects"
    if claude_projects.is_dir():
        proj_for_root = _find_project_dir(root)
        for proj_dir in safe_iterdir(claude_projects):
            if not proj_dir.is_dir():
                continue
            mem_dir = proj_dir / "memory"
            if not mem_dir.is_dir():
                continue
            is_active = proj_dir == proj_for_root
            readable = proj_dir.name.lstrip("-").split("-")[-1] if not is_active else ""
            profile_tag = "(active)" if is_active else f"({readable})"
            for md in safe_glob(mem_dir, "*.md"):
                if entry := _read_memory_file(md, "claude-auto-memory", profile_tag):
                    entries.append(entry)

    for stash in list_stashes(root):
        if stash["profile"] == "(active)":
            continue
        stash_dir = Path(stash["dir"])
        for md in safe_glob(stash_dir, "*.md"):
            if entry := _read_memory_file(md, "claude-auto-memory", stash["profile"]):
                entries.append(entry)

    # 4. Copilot Chat globalStorage — agent definitions, session state
    copilot_storage = copilot_global_storage()
    if copilot_storage.is_dir():
        for md in safe_rglob(copilot_storage, "*.md"):
            if entry := _read_memory_file(md, "copilot-agent-memory", "(copilot)"):
                entries.append(entry)
        for jf in safe_glob(copilot_storage, "*.json"):
            st = safe_stat(jf)
            if st and st.st_size > 1_000_000:  # skip large embedding files
                continue
            if entry := _read_memory_file(jf, "copilot-session-state", "(copilot)"):
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
    if IS_MACOS:
        try:
            result = subprocess.run(
                ["sample", str(pid), "1", "-mayDie"],
                capture_output=True, text=True, timeout=15,
            )
            return result.stdout if result.returncode == 0 else result.stderr
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return None

    for cmd, timeout in [
        (["eu-stack", "-p", str(pid)], 10),
        (["gdb", "-batch", "-ex", "thread apply all bt", "-p", str(pid)], 10),
    ]:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            if result.returncode == 0:
                return result.stdout
        except FileNotFoundError:
            continue
    return None
