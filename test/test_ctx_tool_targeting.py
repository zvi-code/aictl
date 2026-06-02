"""Tests for the mode × tool resolution axis.

The mode (profile) axis already existed; these tests cover the new tool axis:
  - ``@tool`` overlays on text sections (instructions, memory) — additive.
  - ``tools`` / ``not_tools`` selectors on named entries (commands, agents,
    skills, mcp, lsp) — allow/deny lists, exclude wins.
  - ``resolve(..., tool=...)`` collapses the matrix to one tool's slice, and
    ``tool=None`` stays fully backward-compatible (no filtering).

Layer-scoped: exercised against the real parser + resolver (and real emitters
where deploy behavior matters), no mocks of components under test.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from aictl.context import parse_aictx, scan
from aictl.resolver import resolve


def _write(toml: str) -> tuple[Path, list]:
    tmp = tempfile.mkdtemp()
    root = Path(tmp)
    (root / ".context.toml").write_text(toml)
    return root, scan(root)


# ---------------------------------------------------------------------------
# Parser: tools / not_tools selectors
# ---------------------------------------------------------------------------


class TestParserToolSelectors:
    def test_capability_tools_allow_list(self):
        root = Path(tempfile.mkdtemp())
        (root / ".context.toml").write_text(
            "[skills.perf.flame-graph]\n"
            'content = "profile the hot path"\n'
            'tools = ["claude"]\n'
        )
        parsed = parse_aictx(root / ".context.toml")
        cap = parsed.capabilities[0]
        assert cap.tools == ["claude"]
        assert cap.not_tools == []

    def test_capability_not_tools_deny_list(self):
        root = Path(tempfile.mkdtemp())
        (root / ".context.toml").write_text(
            "[commands.debug.repro]\n"
            'content = "reproduce the issue"\n'
            'not_tools = ["cursor", "windsurf"]\n'
        )
        parsed = parse_aictx(root / ".context.toml")
        cap = parsed.capabilities[0]
        assert cap.not_tools == ["cursor", "windsurf"]

    def test_mcp_selectors_stripped_from_native_config(self):
        root = Path(tempfile.mkdtemp())
        (root / ".context.toml").write_text(
            "[mcp.debug.repro]\n"
            'command = "repro-mcp"\n'
            'not_tools = ["cursor"]\n'
        )
        parsed = parse_aictx(root / ".context.toml")
        srv = parsed.mcp_servers[0]
        assert srv.not_tools == ["cursor"]
        # The selector keys must not leak into the native server config.
        assert "not_tools" not in srv.config
        assert "tools" not in srv.config
        assert srv.config == {"command": "repro-mcp"}

    def test_lsp_selectors_stripped_from_native_config(self):
        root = Path(tempfile.mkdtemp())
        (root / ".context.toml").write_text(
            "[lsp.perf.pyright]\n"
            'command = "pyright-langserver"\n'
            'tools = ["claude"]\n'
        )
        parsed = parse_aictx(root / ".context.toml")
        srv = parsed.lsp_servers[0]
        assert srv.tools == ["claude"]
        assert "tools" not in srv.config

    def test_tool_ids_are_lowercased(self):
        root = Path(tempfile.mkdtemp())
        (root / ".context.toml").write_text(
            "[skills.perf.x]\ncontent = \"y\"\ntools = [\"Claude\"]\n"
        )
        parsed = parse_aictx(root / ".context.toml")
        assert parsed.capabilities[0].tools == ["claude"]


# ---------------------------------------------------------------------------
# Resolver: tool filtering of named entries
# ---------------------------------------------------------------------------


TOML_CAPS = """
[skills.perf.flame-graph]
content = "only-claude"
tools = ["claude"]

[skills.perf.generic]
content = "every-tool"

[commands.perf.repro]
content = "not-on-cursor"
not_tools = ["cursor"]
"""


class TestResolverToolFiltering:
    def test_allow_list_includes_only_named_tool(self):
        root, scanned = _write(TOML_CAPS)
        claude = {c.name for c in resolve(root, scanned, "perf", tool="claude").capabilities}
        cursor = {c.name for c in resolve(root, scanned, "perf", tool="cursor").capabilities}
        assert "flame-graph" in claude
        assert "flame-graph" not in cursor

    def test_deny_list_excludes_named_tool(self):
        root, scanned = _write(TOML_CAPS)
        claude = {c.name for c in resolve(root, scanned, "perf", tool="claude").capabilities}
        cursor = {c.name for c in resolve(root, scanned, "perf", tool="cursor").capabilities}
        assert "repro" in claude
        assert "repro" not in cursor

    def test_unselected_entry_goes_to_all_tools(self):
        root, scanned = _write(TOML_CAPS)
        for t in ("claude", "cursor", "copilot"):
            names = {c.name for c in resolve(root, scanned, "perf", tool=t).capabilities}
            assert "generic" in names

    def test_tool_none_is_backward_compatible(self):
        # tool=None must include everything regardless of selectors.
        root, scanned = _write(TOML_CAPS)
        names = {c.name for c in resolve(root, scanned, "perf").capabilities}
        assert names == {"flame-graph", "generic", "repro"}

    def test_exclude_wins_when_both_lists_present(self):
        root, scanned = _write(
            "[skills.perf.x]\ncontent = \"c\"\ntools = [\"claude\"]\nnot_tools = [\"claude\"]\n"
        )
        names = {c.name for c in resolve(root, scanned, "perf", tool="claude").capabilities}
        assert "x" not in names

    def test_mcp_tool_filtering(self):
        root, scanned = _write(
            "[mcp.debug.repro]\ncommand = \"repro-mcp\"\nnot_tools = [\"cursor\"]\n"
        )
        assert "repro" in resolve(root, scanned, "debug", tool="claude").mcp_servers
        assert "repro" not in resolve(root, scanned, "debug", tool="cursor").mcp_servers


# ---------------------------------------------------------------------------
# Resolver: @tool overlays on text sections
# ---------------------------------------------------------------------------


TOML_TEXT = """
[instructions]
base = "shared base"
"base@cursor" = "minimal diffs only"
perf = "measure first"
"perf@claude" = "use the flame-graph skill"

[memory]
_always = "remember the repo layout"
"perf@claude" = "baseline saved in bench/"
"""


class TestResolverTextOverlays:
    def test_base_overlay_appended_for_target_tool(self):
        root, scanned = _write(TOML_TEXT)
        cursor_scope = resolve(root, scanned, "perf", tool="cursor").scopes[0]
        claude_scope = resolve(root, scanned, "perf", tool="claude").scopes[0]
        assert "minimal diffs only" in cursor_scope.base
        assert "minimal diffs only" not in claude_scope.base
        # The unqualified base is always present.
        assert "shared base" in cursor_scope.base
        assert "shared base" in claude_scope.base

    def test_profile_overlay_appended_for_target_tool(self):
        root, scanned = _write(TOML_TEXT)
        claude_scope = resolve(root, scanned, "perf", tool="claude").scopes[0]
        copilot_scope = resolve(root, scanned, "perf", tool="copilot").scopes[0]
        assert "use the flame-graph skill" in claude_scope.profile_text
        assert "use the flame-graph skill" not in copilot_scope.profile_text
        # The unqualified profile text is always present.
        assert "measure first" in claude_scope.profile_text
        assert "measure first" in copilot_scope.profile_text

    def test_memory_overlay_for_target_tool(self):
        root, scanned = _write(TOML_TEXT)
        claude_mem = resolve(root, scanned, "perf", tool="claude").memory_hints
        cursor_mem = resolve(root, scanned, "perf", tool="cursor").memory_hints
        assert "baseline saved in bench/" in claude_mem
        assert "baseline saved in bench/" not in (cursor_mem or "")
        assert "remember the repo layout" in claude_mem

    def test_tool_none_omits_overlays(self):
        # Without a tool axis, @tool overlays are not applied (they belong to
        # a specific tool's slice).
        root, scanned = _write(TOML_TEXT)
        scope = resolve(root, scanned, "perf").scopes[0]
        assert "minimal diffs only" not in scope.base
        assert "use the flame-graph skill" not in scope.profile_text


# ---------------------------------------------------------------------------
# Deploy: per-emitter resolution end-to-end (real emitters)
# ---------------------------------------------------------------------------


class TestDeployPerEmitter:
    def test_claude_gets_skill_cursor_does_not(self):
        from aictl.emitters import claude as claude_emit
        from aictl.emitters import cursor as cursor_emit

        root, scanned = _write(
            "[instructions]\nbase = \"x\"\n\n"
            "[skills.perf.flame-graph]\ncontent = \"profile it\"\ntools = [\"claude\"]\n"
        )
        claude_res = resolve(root, scanned, "perf", tool="claude")
        cursor_res = resolve(root, scanned, "perf", tool="cursor")
        claude_emit.emit(root, claude_res, dry_run=False)
        cursor_emit.emit(root, cursor_res, dry_run=False)

        skill_files = list(root.glob(".claude/skills/**/*"))
        assert any("flame-graph" in str(p) for p in skill_files)
        # Cursor has no skills concept and the entry was claude-only anyway;
        # nothing flame-graph should appear under .cursor.
        assert not any("flame-graph" in str(p) for p in root.glob(".cursor/**/*"))
