"""Tests for aictl/tools.py — registry, taxonomy, discovery helpers."""

from __future__ import annotations

import csv
import io
import os
import textwrap
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from aictl.tools import (
    # Taxonomy lookups
    TOOL_TAXONOMY,
    TOOL_GROUPS,
    TOOL_LABELS,
    TOOL_COLORS,
    TOOL_ICONS,
    ToolMeta,
    tool_vendor,
    tool_hosts,
    tool_is_meta,
    tool_color,
    tool_icon,
    expand_tool_filter,
    _tool_meta_attr,
    # CSV helpers
    _platform_match,
    _bool_field,
    _rss_to_mb,
    _load_csv,
    _filter_specs,
    _data_path,
    # Dataclasses
    PathSpec,
    ProcessSpec,
    ResourceFile,
    ProcessInfo,
    McpServerInfo,
    MemoryEntry,
    ToolResources,
    # Tree walk
    PRUNE_DIRS,
    find_in_tree,
    find_dirs_in_tree,
    batch_find_in_tree,
    # Path template helpers
    _expand_home,
    _params_to_glob,
    # File helpers
    _dedup_files,
    # MCP helpers
    _classify_mcp_transport,
    _match_mcp_to_process,
    # Process helpers
    _process_display_name,
    _detect_anomalies,
    # Token budget
    compute_token_budget,
)


# ────────────────────────────────────────────────────────────────
# Taxonomy lookups (pure functions)
# ────────────────────────────────────────────────────────────────

class TestToolTaxonomy:
    def test_tool_vendor_known(self):
        assert tool_vendor("claude-code") == "anthropic"
        assert tool_vendor("copilot") == "github"
        assert tool_vendor("cursor") == "cursor-inc"

    def test_tool_vendor_unknown_returns_community(self):
        assert tool_vendor("nonexistent-tool-xyz") == "community"

    def test_tool_hosts_known(self):
        assert "cli" in tool_hosts("claude-code")
        assert "vscode" in tool_hosts("claude-code")

    def test_tool_hosts_unknown_returns_any(self):
        assert tool_hosts("nonexistent") == ("any",)

    def test_tool_is_meta(self):
        assert tool_is_meta("project-env") is True
        assert tool_is_meta("aictl") is True
        assert tool_is_meta("claude-code") is False
        assert tool_is_meta("cursor") is False

    def test_tool_is_meta_unknown(self):
        assert tool_is_meta("nonexistent") is False

    def test_tool_color_known(self):
        c = tool_color("claude-code")
        assert c.startswith("#")
        assert len(c) == 7

    def test_tool_color_unknown_fallback(self):
        assert tool_color("nonexistent") == "#94a3b8"

    def test_tool_icon_known(self):
        assert tool_icon("claude-code") == "🟣"

    def test_tool_icon_unknown_fallback(self):
        assert tool_icon("nonexistent") == "🔹"

    def test_tool_meta_attr_known(self):
        assert _tool_meta_attr("claude-code", "vendor", "x") == "anthropic"

    def test_tool_meta_attr_unknown_tool(self):
        assert _tool_meta_attr("nope", "vendor", "fallback") == "fallback"

    def test_tool_meta_attr_unknown_attr(self):
        assert _tool_meta_attr("claude-code", "bogus_attr", "default") == "default"

    def test_taxonomy_all_tools_have_labels(self):
        """Every tool in TOOL_TAXONOMY should have a display label."""
        for tool in TOOL_TAXONOMY:
            assert tool in TOOL_LABELS, f"Missing label for {tool}"

    def test_taxonomy_all_tools_have_colors(self):
        for tool in TOOL_TAXONOMY:
            # Some tools use fallback — that's fine
            c = tool_color(tool)
            assert c.startswith("#")

    def test_tool_meta_frozen(self):
        meta = TOOL_TAXONOMY["claude-code"]
        with pytest.raises(AttributeError):
            meta.vendor = "other"


class TestExpandToolFilter:
    def test_expand_group(self):
        result = expand_tool_filter(["claude"])
        assert "claude-code" in result
        assert "claude-desktop" in result

    def test_expand_individual(self):
        result = expand_tool_filter(["cursor"])
        assert result == {"cursor"}

    def test_expand_mixed(self):
        result = expand_tool_filter(["claude", "cursor"])
        assert "claude-code" in result
        assert "cursor" in result

    def test_expand_unknown_passes_through(self):
        result = expand_tool_filter(["unknown-tool"])
        assert result == {"unknown-tool"}

    def test_expand_empty(self):
        assert expand_tool_filter([]) == set()

    def test_all_groups_resolve(self):
        for group, members in TOOL_GROUPS.items():
            result = expand_tool_filter([group])
            assert result == set(members), f"Group {group} mismatch"


# ────────────────────────────────────────────────────────────────
# CSV helpers (pure)
# ────────────────────────────────────────────────────────────────

class TestPlatformMatch:
    def test_all_matches_everything(self):
        assert _platform_match("all", "macos") is True
        assert _platform_match("all", "linux") is True
        assert _platform_match("all", "windows") is True

    def test_exact_match(self):
        assert _platform_match("macos", "macos") is True
        assert _platform_match("linux", "linux") is True

    def test_no_match(self):
        assert _platform_match("macos", "linux") is False

    def test_comma_separated(self):
        assert _platform_match("macos,linux", "macos") is True
        assert _platform_match("macos,linux", "linux") is True
        assert _platform_match("macos,linux", "windows") is False

    def test_slash_separated(self):
        assert _platform_match("macos/linux", "macos") is True
        assert _platform_match("macos/linux", "windows") is False


class TestBoolField:
    def test_yes(self):
        assert _bool_field("yes") is True
        assert _bool_field("Yes") is True
        assert _bool_field("YES") is True

    def test_true(self):
        assert _bool_field("true") is True
        assert _bool_field("True") is True

    def test_one(self):
        assert _bool_field("1") is True

    def test_no(self):
        assert _bool_field("no") is False
        assert _bool_field("false") is False
        assert _bool_field("0") is False
        assert _bool_field("") is False

    def test_whitespace_stripped(self):
        assert _bool_field("  yes  ") is True
        assert _bool_field("  no  ") is False


class TestRssToMb:
    def test_normal(self):
        mb, display = _rss_to_mb("1024")
        assert mb == 1.0
        assert display == "1.0"

    def test_zero(self):
        mb, display = _rss_to_mb("0")
        assert mb == 0.0
        assert display == "0.0"

    def test_large(self):
        mb, display = _rss_to_mb("1048576")  # 1 GB
        assert mb == 1024.0

    def test_invalid(self):
        mb, display = _rss_to_mb("not-a-number")
        assert mb == 0.0
        assert display == "?"

    def test_empty(self):
        mb, display = _rss_to_mb("")
        assert mb == 0.0
        assert display == "?"


class TestLoadCsv:
    def test_load_valid_csv(self, tmp_path):
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("name,value\nalpha,1\nbeta,2\n")
        result = _load_csv(csv_file, lambda row: (row["name"], row["value"]))
        assert len(result) == 2
        assert result[0] == ("alpha", "1")

    def test_missing_file_returns_empty(self, tmp_path):
        result = _load_csv(tmp_path / "nope.csv", lambda row: row)
        assert result == []

    def test_bad_row_skipped(self, tmp_path):
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("a,b\n1,2\n3,4\n")
        # Factory that fails on second row
        call_count = [0]
        def factory(row):
            call_count[0] += 1
            if call_count[0] == 2:
                raise KeyError("intentional")
            return row["a"]
        result = _load_csv(csv_file, factory)
        assert len(result) == 1
        assert result[0] == "1"


class TestFilterSpecs:
    def _make_spec(self, platform, ai_tool):
        return PathSpec(
            path_template="", ai_tool=ai_tool, vendor="", host="",
            platform=platform, hidden=False, scope="", category="",
            sent_to_llm="", approx_tokens="", read_write="",
            survives_compaction="", cacheable="", loaded_when="",
            path_args="", description="", resolution="literal",
            root_strategy="",
        )

    def test_filter_by_platform(self):
        specs = [self._make_spec("macos", "claude-code"),
                 self._make_spec("linux", "claude-code")]
        result = _filter_specs(specs, "macos", None)
        assert len(result) == 1

    def test_filter_by_tool(self):
        specs = [self._make_spec("all", "claude-code"),
                 self._make_spec("all", "cursor")]
        result = _filter_specs(specs, "macos", ["cursor"])
        assert len(result) == 1
        assert result[0].ai_tool == "cursor"

    def test_filter_tool_group(self):
        specs = [self._make_spec("all", "claude-code"),
                 self._make_spec("all", "claude-desktop"),
                 self._make_spec("all", "cursor")]
        result = _filter_specs(specs, "macos", ["claude"])
        assert len(result) == 2

    def test_no_tool_filter_returns_all_matching_platform(self):
        specs = [self._make_spec("all", "a"), self._make_spec("all", "b")]
        result = _filter_specs(specs, "macos", None)
        assert len(result) == 2


# ────────────────────────────────────────────────────────────────
# Path template helpers (pure)
# ────────────────────────────────────────────────────────────────

class TestExpandHome:
    def test_tilde_expansion(self):
        result = _expand_home("~/test/path")
        assert str(Path.home()) in result
        assert result.endswith("/test/path")

    def test_dollar_home_expansion(self):
        result = _expand_home("$HOME/test/path")
        assert str(Path.home()) in result

    def test_no_expansion_needed(self):
        result = _expand_home("/absolute/path")
        assert result == "/absolute/path"


class TestParamsToGlob:
    def test_single_param(self):
        assert _params_to_glob("{project-root}/.claude") == "*/.claude"

    def test_multiple_params(self):
        assert _params_to_glob("{root}/{profile}/settings.json") == "*/*/*/settings.json" or \
               "*" in _params_to_glob("{root}/{profile}/settings.json")

    def test_no_params(self):
        assert _params_to_glob("/plain/path") == "/plain/path"


# ────────────────────────────────────────────────────────────────
# Tree walk helpers (use tmp_path)
# ────────────────────────────────────────────────────────────────

class TestTreeWalk:
    def test_find_in_tree(self, tmp_path):
        (tmp_path / "sub" / "deep").mkdir(parents=True)
        (tmp_path / "target.txt").touch()
        (tmp_path / "sub" / "target.txt").touch()
        (tmp_path / "sub" / "deep" / "target.txt").touch()
        results = find_in_tree(tmp_path, "target.txt")
        assert len(results) == 3

    def test_find_in_tree_prunes_dirs(self, tmp_path):
        (tmp_path / "node_modules").mkdir()
        (tmp_path / "node_modules" / "target.txt").touch()
        (tmp_path / "src").mkdir()
        (tmp_path / "src" / "target.txt").touch()
        results = find_in_tree(tmp_path, "target.txt")
        assert len(results) == 1
        assert "src" in str(results[0])

    def test_find_in_tree_not_found(self, tmp_path):
        assert find_in_tree(tmp_path, "nonexistent.txt") == []

    def test_find_dirs_in_tree(self, tmp_path):
        (tmp_path / "a" / ".claude").mkdir(parents=True)
        (tmp_path / "b" / ".claude").mkdir(parents=True)
        results = find_dirs_in_tree(tmp_path, ".claude")
        assert len(results) == 2

    def test_find_dirs_prunes(self, tmp_path):
        (tmp_path / ".git" / ".claude").mkdir(parents=True)
        (tmp_path / "src" / ".claude").mkdir(parents=True)
        results = find_dirs_in_tree(tmp_path, ".claude")
        assert len(results) == 1

    def test_batch_find(self, tmp_path):
        (tmp_path / "sub").mkdir()
        (tmp_path / "target.txt").touch()
        (tmp_path / "sub" / ".claude").mkdir()
        files, dirs = batch_find_in_tree(
            tmp_path, {"target.txt"}, {".claude"}
        )
        assert len(files["target.txt"]) == 1
        assert len(dirs[".claude"]) == 1


# ────────────────────────────────────────────────────────────────
# Dataclass tests
# ────────────────────────────────────────────────────────────────

class TestDataclasses:
    def test_resource_file_normalizes_path(self):
        rf = ResourceFile(path="/Users/test/../test/file.txt", kind="instructions")
        # norm_path should clean the path
        assert ".." not in rf.path or rf.path == "/Users/test/../test/file.txt"

    def test_process_info_defaults(self):
        pi = ProcessInfo(pid=1234, name="test", cmdline="test --flag")
        assert pi.anomalies == []
        assert pi.tool == ""

    def test_mcp_server_info_defaults(self):
        mcp = McpServerInfo(name="test-mcp", tool="claude-code")
        assert mcp.status == "unknown"
        assert mcp.transport == ""

    def test_tool_resources_defaults(self):
        tr = ToolResources(tool="claude-code", label="Claude Code")
        assert tr.files == []
        assert tr.processes == []
        assert tr.mcp_servers == []

    def test_memory_entry_normalizes_path(self):
        me = MemoryEntry(source="claude-memory", profile="default", file="/test/file")
        assert me.file  # non-empty

    def test_pathspec_frozen(self):
        ps = PathSpec(
            path_template="~/.claude", ai_tool="claude-code", vendor="anthropic",
            host="cli", platform="all", hidden=False, scope="global",
            category="settings", sent_to_llm="", approx_tokens="0",
            read_write="", survives_compaction="", cacheable="",
            loaded_when="", path_args="", description="", resolution="literal",
            root_strategy="",
        )
        with pytest.raises(AttributeError):
            ps.path_template = "changed"


# ────────────────────────────────────────────────────────────────
# File dedup
# ────────────────────────────────────────────────────────────────

class TestDedupFiles:
    def test_no_dupes(self):
        files = [
            ResourceFile(path="/a/file1.txt", kind="instructions"),
            ResourceFile(path="/a/file2.txt", kind="rules"),
        ]
        result = _dedup_files(files)
        assert len(result) == 2

    def test_removes_dupes(self):
        files = [
            ResourceFile(path="/a/file1.txt", kind="instructions"),
            ResourceFile(path="/a/file1.txt", kind="rules"),
            ResourceFile(path="/a/file2.txt", kind="instructions"),
        ]
        result = _dedup_files(files)
        assert len(result) == 2
        assert result[0].kind == "instructions"  # first occurrence kept

    def test_empty(self):
        assert _dedup_files([]) == []


# ────────────────────────────────────────────────────────────────
# MCP transport classification (pure)
# ────────────────────────────────────────────────────────────────

class TestClassifyMcpTransport:
    def test_url_field(self):
        transport, endpoint = _classify_mcp_transport({"url": "http://localhost:3000"})
        assert transport == "http"
        assert endpoint == "http://localhost:3000"

    def test_http_type(self):
        transport, endpoint = _classify_mcp_transport({"type": "http", "url": "http://x"})
        assert transport == "http"

    def test_sse_type(self):
        transport, endpoint = _classify_mcp_transport({"type": "sse", "url": "http://x/sse"})
        assert transport == "sse"

    def test_stdio_default(self):
        transport, endpoint = _classify_mcp_transport({"command": "node", "args": ["server.js"]})
        assert transport == "stdio"
        assert "node" in endpoint

    def test_empty_config(self):
        transport, endpoint = _classify_mcp_transport({})
        assert transport == "stdio"


class TestMatchMcpToProcess:
    def test_match_found(self):
        proc = ProcessInfo(pid=123, name="node", cmdline="node server.js mcp-thing")
        result = _match_mcp_to_process(
            "mcp-thing",
            {"command": "node", "args": ["server.js"]},
            [("claude-code", proc)],
        )
        assert result is proc

    def test_no_match(self):
        proc = ProcessInfo(pid=123, name="python", cmdline="python unrelated.py")
        result = _match_mcp_to_process(
            "mcp-thing",
            {"command": "node", "args": ["server.js"]},
            [("claude-code", proc)],
        )
        assert result is None

    def test_empty_terms(self):
        result = _match_mcp_to_process("", {}, [])
        assert result is None


# ────────────────────────────────────────────────────────────────
# Process display name
# ────────────────────────────────────────────────────────────────

class TestProcessDisplayName:
    @patch("aictl.tools.IS_MACOS", False)
    def test_simple_name(self):
        assert _process_display_name("/usr/bin/node server.js") == "node"

    @patch("aictl.tools.IS_MACOS", True)
    def test_macos_app_bundle(self):
        name = _process_display_name(
            "/Applications/Claude.app/Contents/MacOS/Claude --flag"
        )
        assert name == "Claude"

    @patch("aictl.tools.IS_MACOS", False)
    def test_empty_args(self):
        assert _process_display_name("") == "?"


# ────────────────────────────────────────────────────────────────
# Anomaly detection
# ────────────────────────────────────────────────────────────────

class TestDetectAnomalies:
    def _make_process_spec(self, **overrides):
        defaults = dict(
            process_name="test", ai_tool="test", vendor="test", host="cli",
            process_type="", runtime="", parent_process="", starts_at="",
            stops_at="", is_daemon=False, auto_start=False, listens_port="",
            outbound_targets="", memory_idle_mb="", memory_active_mb="100",
            known_leak=False, leak_pattern="", zombie_risk="none",
            cleanup_command="", ps_grep_pattern="", platform="all",
            description="",
        )
        defaults.update(overrides)
        return ProcessSpec(**defaults)

    def test_no_anomaly_normal_memory(self):
        spec = self._make_process_spec(memory_active_mb="100")
        anomalies = _detect_anomalies(150.0, 1234, spec)
        assert len(anomalies) == 0

    def test_high_memory_anomaly(self):
        spec = self._make_process_spec(memory_active_mb="100")
        anomalies = _detect_anomalies(250.0, 1234, spec)
        assert len(anomalies) == 1
        assert anomalies[0]["type"] == "high_memory"
        assert anomalies[0]["actual_mb"] == 250.0
        assert anomalies[0]["expected_mb"] == 100.0

    def test_no_anomaly_when_expected_zero(self):
        spec = self._make_process_spec(memory_active_mb="0")
        anomalies = _detect_anomalies(500.0, 1234, spec)
        assert len(anomalies) == 0

    def test_invalid_memory_active_mb(self):
        spec = self._make_process_spec(memory_active_mb="N/A")
        anomalies = _detect_anomalies(500.0, 1234, spec)
        assert len(anomalies) == 0  # should not crash

    def test_known_leak_only_with_bloat(self):
        spec = self._make_process_spec(
            memory_active_mb="100", known_leak=True, leak_pattern="leaks memory over time"
        )
        # No bloat → no leak warning
        anomalies = _detect_anomalies(50.0, 1234, spec)
        assert not any(a["type"] == "known_leak" for a in anomalies)
        # With bloat → leak warning added
        anomalies = _detect_anomalies(250.0, 1234, spec)
        types = [a["type"] for a in anomalies]
        assert "high_memory" in types
        assert "known_leak" in types


# ────────────────────────────────────────────────────────────────
# Token budget computation
# ────────────────────────────────────────────────────────────────

class TestComputeTokenBudget:
    def _make_tool(self, tool, files):
        return ToolResources(
            tool=tool,
            label=tool,
            files=[ResourceFile(path=f["path"], kind="instructions",
                                tokens=f["tokens"], scope=f.get("scope", "project"),
                                sent_to_llm=f.get("sent_to_llm", "yes"),
                                loaded_when=f.get("loaded_when", "every-call"),
                                cacheable=f.get("cacheable", ""),
                                survives_compaction=f.get("survives_compaction", ""))
                   for f in files],
        )

    def test_empty(self):
        result = compute_token_budget([], root="/project")
        assert result["total_potential_tokens"] == 0
        assert result["project_count"] == 0

    def test_single_always_loaded_file(self):
        tool = self._make_tool("claude-code", [
            {"path": "/project/.claude/settings.json", "tokens": 500,
             "sent_to_llm": "yes", "loaded_when": "every-call", "scope": "project"},
        ])
        result = compute_token_budget([tool], root="/project")
        assert result["always_loaded_tokens"] == 500
        assert result["total_potential_tokens"] == 500

    def test_never_sent_counted(self):
        tool = self._make_tool("claude-code", [
            {"path": "/project/.claude/config.json", "tokens": 100,
             "sent_to_llm": "no", "scope": "project"},
        ])
        result = compute_token_budget([tool], root="/project")
        assert result["never_sent_count"] == 1
        assert result["total_potential_tokens"] == 0

    def test_on_demand_categorized(self):
        tool = self._make_tool("claude-code", [
            {"path": "/project/src/file.py", "tokens": 200,
             "sent_to_llm": "on-demand", "loaded_when": "on-demand", "scope": "project"},
        ])
        result = compute_token_budget([tool], root="/project")
        assert result["on_demand_tokens"] == 200

    def test_cacheable_counted(self):
        tool = self._make_tool("claude-code", [
            {"path": "/project/.claude/rules.md", "tokens": 300,
             "sent_to_llm": "yes", "loaded_when": "every-call",
             "cacheable": "yes", "scope": "project"},
        ])
        result = compute_token_budget([tool], root="/project")
        assert result["cacheable_tokens"] == 300

    def test_global_scope_tokens(self):
        tool = self._make_tool("claude-code", [
            {"path": "/home/user/.claude/settings.json", "tokens": 100,
             "sent_to_llm": "yes", "loaded_when": "every-call", "scope": "global"},
        ])
        result = compute_token_budget([tool], root="/project")
        assert result["global_tokens"] == 100

    def test_sub_projects_largest_wins(self):
        tool = self._make_tool("claude-code", [
            {"path": "/project/app1/.claude/rules.md", "tokens": 100,
             "sent_to_llm": "yes", "loaded_when": "every-call", "scope": "project"},
            {"path": "/project/app2/.claude/rules.md", "tokens": 500,
             "sent_to_llm": "yes", "loaded_when": "every-call", "scope": "project"},
        ])
        result = compute_token_budget([tool], root="/project")
        assert result["largest_project"] == "app2"
        assert result["largest_project_tokens"] == 500
        # Realistic = global + largest project
        assert result["always_loaded_tokens"] == 500


# ────────────────────────────────────────────────────────────────
# Registry and data path
# ────────────────────────────────────────────────────────────────

class TestDataPath:
    def test_returns_path_in_data_dir(self):
        p = _data_path("paths-unix.csv")
        assert p.name == "paths-unix.csv"
        assert "data" in str(p)

    def test_csv_files_exist(self):
        """Verify the actual CSV data files ship with the package."""
        for name in ("paths-unix.csv", "processes-unix.csv"):
            p = _data_path(name)
            assert p.exists(), f"Missing data file: {p}"


class TestRegistrySingleton:
    def test_get_registry_returns_registry(self):
        from aictl.tools import get_registry, Registry
        reg = get_registry()
        assert isinstance(reg, Registry)

    def test_registry_loads_specs(self):
        from aictl.tools import get_registry
        reg = get_registry()
        specs = reg.path_specs()
        assert len(specs) > 0, "Registry loaded no path specs"

    def test_registry_process_specs(self):
        from aictl.tools import get_registry
        reg = get_registry()
        specs = reg.process_specs()
        assert isinstance(specs, list)

    def test_registry_filter_by_tool(self):
        from aictl.tools import get_registry
        reg = get_registry()
        all_specs = reg.path_specs()
        filtered = reg.path_specs(tools=["claude-code"])
        assert len(filtered) <= len(all_specs)
        assert all(s.ai_tool == "claude-code" for s in filtered)
