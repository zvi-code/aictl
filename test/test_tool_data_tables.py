"""Guard tests for the per-tool data tables (paths-*.csv, processes-*.csv).

Root cause these guard against: the tables went stale for two months because
nothing checked them against the tool declarations or against platform rules.
"""

from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path

import pytest

from aictl import tools as T

DATA = Path(T.__file__).parent / "data"

PATH_COLUMNS = [
    "path", "ai_tool", "vendor", "host", "platform", "hidden", "scope", "category", "sent_to_llm",
    "approx_tokens", "read_write", "survives_compaction", "cacheable", "loaded_when", "path_args",
    "description", "resolution", "root_strategy",
]
PROC_COLUMNS = [
    "process_name", "ai_tool", "vendor", "host", "process_type", "runtime", "parent_process", "starts_at",
    "stops_at", "is_daemon", "auto_start", "listens_port", "outbound_targets", "memory_idle_mb",
    "memory_active_mb", "known_leak", "leak_pattern", "zombie_risk", "cleanup_command", "ps_grep_pattern",
    "platform", "description",
]
CATEGORIES = {
    "config", "runtime", "instructions", "memory", "credentials", "cache", "agent", "temp", "ignore",
    "extensions", "skills", "hooks", "transcript", "rules", "commands", "logs", "database", "app-data",
    "workflows", "backup",
}
SCOPES = {"global", "project", "session", "parent"}
RESOLUTIONS = {"literal", "recursive", "shadow", "rooted", "parent"}
ROOTS = {"cwd", "git-root", "workspace", "none"}
UNIX_PLATFORMS = {"all", "macos", "linux", "macos/linux"}
WINDOWS_PLATFORMS = {"all", "windows"}


def _load(name: str) -> list[dict[str, str]]:
    with open(DATA / name, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        assert reader.fieldnames is not None
        return rows


PATH_FILES = ["paths-unix.csv", "paths-windows.csv"]
PROC_FILES = ["processes-unix.csv", "processes-windows.csv"]


@pytest.mark.parametrize("name", PATH_FILES)
def test_paths_parse_with_required_fields(name):
    with open(DATA / name, newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        assert header == PATH_COLUMNS
        for lineno, raw in enumerate(reader, start=2):
            assert len(raw) == len(PATH_COLUMNS), f"{name}:{lineno} has {len(raw)} columns"
    for r in _load(name):
        where = f"{name}: {r['path']}"
        for col in ("path", "ai_tool", "vendor", "host", "platform", "scope", "category", "description"):
            assert r[col].strip(), f"{where}: empty {col}"
        assert r["category"] in CATEGORIES, f"{where}: unknown category {r['category']}"
        assert r["scope"] in SCOPES, f"{where}: unknown scope {r['scope']}"
        assert r["resolution"] in RESOLUTIONS, f"{where}: unknown resolution {r['resolution']}"
        assert r["root_strategy"] in ROOTS, f"{where}: unknown root_strategy {r['root_strategy']}"
        assert r["read_write"] in {"rw", "read", "write"}, where
        assert r["hidden"] in {"yes", "no"}, where


@pytest.mark.parametrize("name", PATH_FILES)
def test_paths_have_no_duplicates(name):
    keys = Counter((r["path"], r["ai_tool"]) for r in _load(name))
    assert [k for k, n in keys.items() if n > 1] == []


@pytest.mark.parametrize("name", PATH_FILES + PROC_FILES)
def test_rows_reference_declared_tools_and_matching_vendor(name):
    for r in _load(name):
        tool = r["ai_tool"]
        if tool == "any":
            continue
        assert tool in T.TOOL_TAXONOMY, f"{name}: {tool} is not declared in tools.TOOL_TAXONOMY"
        meta = T.TOOL_TAXONOMY[tool]
        if meta.meta:
            continue  # project-env rows legitimately carry the vendor of the file they describe
        if name.startswith("paths"):
            assert r["vendor"] == meta.vendor, f"{name}: {r['path']} vendor {r['vendor']} != {meta.vendor}"
        else:
            assert r["vendor"] in T.VENDOR_LABELS, f"{name}: {r['process_name']} unknown vendor {r['vendor']}"


def test_declared_tools_are_consistent():
    declared = set(T.TOOL_TAXONOMY)
    for tool in declared:
        assert tool in T.TOOL_LABELS, f"{tool} lacks a label"
    for group, members in T.TOOL_GROUPS.items():
        for m in members:
            assert m in declared, f"group {group} lists undeclared tool {m}"
    for tool in ("codex-desktop", "copilot-desktop"):
        assert tool in T.TOOL_COLORS and tool in T.TOOL_ICONS


def test_unix_file_holds_only_unix_paths_and_windows_file_only_windows():
    for r in _load("paths-unix.csv"):
        assert r["platform"] in UNIX_PLATFORMS, f"unix file row {r['path']} has platform {r['platform']}"
        assert "%" not in r["path"] and "\\" not in r["path"], f"windows-style path in unix file: {r['path']}"
    for r in _load("paths-windows.csv"):
        assert r["platform"] in WINDOWS_PLATFORMS, f"windows file row {r['path']} has platform {r['platform']}"
        assert not r["path"].startswith("~/Library"), f"macOS path in windows file: {r['path']}"
        assert not r["path"].startswith("/Applications"), f"macOS path in windows file: {r['path']}"


def test_macos_only_rows_use_macos_locations():
    for r in _load("paths-unix.csv"):
        if r["platform"] == "macos":
            assert re.match(r"(~|\$HOME)?/?(Library|Applications)|^/(Library|Applications)|^~/Library|^~/\.", r["path"]) or \
                r["path"].startswith("~/Library"), f"macos-only row outside macOS locations: {r['path']}"


@pytest.mark.parametrize("name", PROC_FILES)
def test_processes_parse_and_patterns_compile(name):
    with open(DATA / name, newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        assert header == PROC_COLUMNS
        for lineno, raw in enumerate(reader, start=2):
            assert len(raw) == len(PROC_COLUMNS), f"{name}:{lineno} has {len(raw)} columns"
    seen = Counter()
    for r in _load(name):
        seen[(r["process_name"], r["ai_tool"])] += 1
        assert r["process_name"].strip() and r["description"].strip()
        pat = r["ps_grep_pattern"]
        # process.py splits on "|" and compiles each part, tools.py compiles the whole string.
        for part in filter(None, (p.strip() for p in pat.split("|"))):
            re.compile(part)
        if pat:
            re.compile(pat)
    assert [k for k, n in seen.items() if n > 1] == []


def test_new_process_patterns_do_not_split_inside_groups():
    """process.py splits ps_grep_pattern on '|'; a '|' inside a group yields broken fragments."""
    for name in PROC_FILES:
        for r in _load(name):
            for part in r["ps_grep_pattern"].split("|"):
                assert part.count("(") == part.count(")"), f"{name}: {r['process_name']} splits mid-group: {part!r}"


def test_config_dir_env_overrides(monkeypatch, tmp_path):
    """CLAUDE_CONFIG_DIR / CODEX_HOME / COPILOT_HOME relocate the tool state dirs (vendor-documented)."""
    from aictl import platforms as P

    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(tmp_path / "c"))
    monkeypatch.setenv("CODEX_HOME", str(tmp_path / "x"))
    monkeypatch.setenv("COPILOT_HOME", str(tmp_path / "p"))
    assert P.claude_global_dir() == tmp_path / "c"
    assert P.codex_global_dir() == tmp_path / "x"
    assert P.copilot_global_dir() == tmp_path / "p"
    assert P.copilot_session_dir() == tmp_path / "p" / "session-state"
    for var in ("CLAUDE_CONFIG_DIR", "CODEX_HOME", "COPILOT_HOME"):
        monkeypatch.delenv(var)
    assert P.codex_global_dir().name == ".codex"
    assert P.copilot_global_dir().name == ".copilot"


def test_path_hints_for_desktop_apps():
    from aictl import platforms as P

    assert P.tool_hint_for_path("/Users/u/Library/Application Support/Codex/artifact-sessions/x") == "codex-desktop"
    assert P.tool_hint_for_path("/Users/u/Library/Caches/github-copilot-sdk/cli/rt/copilot-runtime") == "copilot-desktop"
    assert P.tool_hint_for_path("/Users/u/Library/Application Support/Claude/git-worktrees.json") == "claude-desktop"
    assert P.tool_hint_for_path("/Users/u/notes/readme.md") is None
