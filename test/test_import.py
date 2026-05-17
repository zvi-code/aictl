"""Roundtrip test: deploy → import → re-deploy and verify equivalence.

Tests that:
1. Given .context.toml sources, deploy creates native tool files
2. Import reads those native files back into .context.toml
3. Re-deploying from the imported .context.toml produces equivalent native files

Also tests importing from hand-written (no markers) native files.
"""

from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

from aictl.context import scan
from aictl.emitters import claude as claude_emit
from aictl.emitters import copilot as copilot_emit
from aictl.emitters import cursor as cursor_emit
from aictl.emitters import gemini as gemini_emit
from aictl.emitters import windsurf as windsurf_emit
from aictl.importers import claude as claude_imp
from aictl.importers import copilot as copilot_imp
from aictl.importers import cursor as cursor_imp
from aictl.importers import gemini as gemini_imp
from aictl.importers import windsurf as windsurf_imp
from aictl.resolver import resolve
from aictl.synthesizer import synthesize

FIXTURE_ROOT = Path(__file__).parent / "fixtures" / "project"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _read_files(root: Path, patterns: list[str]) -> dict[str, str]:
    """Read all files matching patterns, return {relative_path: content}."""
    result = {}
    for pattern in patterns:
        for p in sorted(root.rglob(pattern)):
            rel = str(p.relative_to(root))
            result[rel] = p.read_text("utf-8")
    return result


def _strip_timestamps(text: str) -> str:
    """Remove deployment timestamps for comparison."""
    import re

    return re.sub(r"deployed: \d{4}-\d{2}-\d{2}T[\d:.+\-]+", "deployed: TIMESTAMP", text)


def _deploy_all(root: Path, profile: str | None):
    """Deploy all emitters to root."""
    scanned = scan(root)
    resolved = resolve(root, scanned, profile)
    claude_emit.emit(root, resolved)
    copilot_emit.emit(root, resolved)
    cursor_emit.emit(root, resolved)


# ---------------------------------------------------------------------------
# Test: individual importers parse the fixture correctly
# ---------------------------------------------------------------------------


class TestImporters:
    @classmethod
    def setup_class(cls):
        """Deploy native files from fixture .context.toml so importers can read them."""
        _deploy_all(FIXTURE_ROOT, profile="review")

    def test_claude_importer_reads_fixture(self):
        result = claude_imp.import_from(FIXTURE_ROOT)
        assert result is not None
        assert result.source == "claude"

        # Root scope
        root_scopes = [s for s in result.scopes if s.rel_path == "."]
        assert len(root_scopes) == 1
        assert "valkey-bench-rs" in root_scopes[0].base_text
        assert root_scopes[0].profile_name == "review"
        assert "unwrap" in root_scopes[0].profile_text

        # Sub-scopes
        sub_paths = {s.rel_path for s in result.scopes if s.rel_path != "."}
        assert "src/dataset" in sub_paths
        assert "src/runner" in sub_paths
        assert "src/metrics" in sub_paths
        assert "src/dataset/generators" in sub_paths

        # Commands
        cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
        assert "status" in cmd_names
        assert "check-simd" in cmd_names

        # MCP
        mcp_names = {m.name for m in result.mcp_servers}
        assert "github" in mcp_names

    def test_copilot_importer_reads_fixture(self):
        result = copilot_imp.import_from(FIXTURE_ROOT)
        assert result is not None
        assert result.source == "copilot"

        # Agents (copilot-only capability)
        agent_names = {c.name for c in result.capabilities if c.kind == "agent"}
        assert "planner" in agent_names
        assert "rust-reviewer" in agent_names

        # Commands (from prompts)
        cmd_names = {c.name for c in result.capabilities if c.kind == "command"}
        assert "status" in cmd_names

    def test_cursor_importer_reads_fixture(self):
        result = cursor_imp.import_from(FIXTURE_ROOT)
        assert result is not None
        assert result.source == "cursor"

        root_scopes = [s for s in result.scopes if s.rel_path == "."]
        assert len(root_scopes) == 1
        assert "valkey-bench-rs" in root_scopes[0].base_text
        assert root_scopes[0].profile_name == "review"

        # Cursor has no capabilities
        assert len(result.capabilities) == 0

        # But does have MCP
        assert len(result.mcp_servers) == 1

    def test_importer_returns_none_for_empty_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            assert claude_imp.import_from(root) is None
            assert copilot_imp.import_from(root) is None
            assert cursor_imp.import_from(root) is None


# ---------------------------------------------------------------------------
# Test: synthesizer merges and writes correctly
# ---------------------------------------------------------------------------


class TestSynthesizer:
    def test_synthesize_produces_aictx_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            # Create minimal native files
            (root / "CLAUDE.md").write_text("# My Project\nBuild: make build\n")
            (root / ".mcp.json").write_text(
                json.dumps({"mcpServers": {"github": {"type": "http", "url": "https://example.com"}}})
            )

            imports = [r for r in [claude_imp.import_from(root)] if r]
            results = synthesize(root, imports)

            assert len(results) == 1
            assert results[0]["rel_path"] == "."

            aictx = (root / ".context.toml").read_text("utf-8")
            assert "[instructions]" in aictx
            assert "My Project" in aictx
            assert "[mcp._always.github]" in aictx

    def test_synthesize_prefer_flag(self):
        """When --prefer is set, that source's content wins."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            # Claude has shorter content
            (root / "CLAUDE.md").write_text("Short.")
            # Cursor has longer content
            rules = root / ".cursor" / "rules"
            rules.mkdir(parents=True)
            (rules / "base.mdc").write_text(
                "---\ndescription: base\nalwaysApply: true\n---\n\nMuch longer content here for Cursor.\n"
            )

            imports = [r for r in [claude_imp.import_from(root), cursor_imp.import_from(root)] if r]

            # Without prefer: longest wins (cursor)
            results = synthesize(root, imports)
            aictx = (root / ".context.toml").read_text("utf-8")
            assert "Much longer" in aictx

            # With prefer=claude: claude wins
            results = synthesize(root, imports, prefer="claude")
            aictx = (root / ".context.toml").read_text("utf-8")
            assert "Short." in aictx


# ---------------------------------------------------------------------------
# Test: full roundtrip from fixture
# ---------------------------------------------------------------------------


class TestRoundtrip:
    def test_deploy_import_redeploy_equivalence(self):
        """Full roundtrip: deploy from .context.toml → import → redeploy → compare."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            # Copy .context.toml source files from fixture
            for aictx_path in FIXTURE_ROOT.rglob(".context.toml"):
                rel = aictx_path.relative_to(FIXTURE_ROOT)
                dest = root / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(aictx_path, dest)

            # Also need the sub-directories to exist for glob mapping
            for d in ["src/runner", "src/dataset", "src/dataset/generators", "src/metrics"]:
                (root / d).mkdir(parents=True, exist_ok=True)

            # Phase 1: Deploy (produces native files)
            _deploy_all(root, profile="review")

            # Capture deployed native files
            native_patterns = [
                "CLAUDE.md",
                "CLAUDE.local.md",
                ".claude/rules/*.md",
                ".claude/commands/*.md",
                ".claude/agents/*.md",
                ".github/copilot-instructions.md",
                ".github/instructions/*.instructions.md",
                ".github/agents/*.agent.md",
                ".github/chatmodes/*.chatmode.md",
                ".github/prompts/*.prompt.md",
                ".cursor/rules/*.mdc",
                ".mcp.json",
                ".copilot-mcp.json",
                ".cursor/mcp.json",
            ]
            original_files = _read_files(root, native_patterns)
            assert len(original_files) > 0, "Deploy should have created files"

            # Phase 2: Delete .context.toml files
            for aictx_path in root.rglob(".context.toml"):
                aictx_path.unlink()

            # Phase 3: Import (reconstructs .context.toml from native files)
            imports = [
                r
                for r in [
                    claude_imp.import_from(root),
                    copilot_imp.import_from(root),
                    cursor_imp.import_from(root),
                ]
                if r
            ]
            assert len(imports) == 3, "All three importers should find files"
            synthesize(root, imports)

            # Verify .context.toml files were created
            imported_aictx = list(root.rglob(".context.toml"))
            assert len(imported_aictx) >= 1, "Import should create at least root .context.toml"

            # Phase 4: Delete native files, redeploy from imported .context.toml
            for pattern in native_patterns:
                for p in root.rglob(pattern):
                    p.unlink()
            # Clean directories
            for d in [".claude", ".github", ".cursor"]:
                dp = root / d
                if dp.exists():
                    shutil.rmtree(dp)
            for f in [".mcp.json", ".copilot-mcp.json"]:
                fp = root / f
                if fp.exists():
                    fp.unlink()

            # Redeploy
            _deploy_all(root, profile="review")

            # Phase 5: Compare
            redeployed_files = _read_files(root, native_patterns)

            # Same set of files should exist
            assert set(original_files.keys()) == set(redeployed_files.keys()), (
                f"File sets differ.\n"
                f"  Original only: {set(original_files) - set(redeployed_files)}\n"
                f"  Redeployed only: {set(redeployed_files) - set(original_files)}"
            )

            # Content should be equivalent (ignoring timestamps)
            for path in original_files:
                orig = _strip_timestamps(original_files[path])
                redo = _strip_timestamps(redeployed_files[path])
                assert orig == redo, (
                    f"Content mismatch in {path}:\n  Original:   {orig[:200]!r}\n  Redeployed: {redo[:200]!r}"
                )


# ---------------------------------------------------------------------------
# Test: import from hand-written files (no aictl markers)
# ---------------------------------------------------------------------------


class TestHandWritten:
    def test_import_hand_written_claude_md(self):
        """Import from a CLAUDE.md that was never generated by aictl."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / "CLAUDE.md").write_text("# My Project\n\nBuild with `make`. Test with `make test`.\n")

            result = claude_imp.import_from(root)
            assert result is not None
            assert len(result.scopes) == 1
            assert "My Project" in result.scopes[0].base_text
            assert "make test" in result.scopes[0].base_text

    def test_import_hand_written_copilot_instructions(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            gh = root / ".github"
            gh.mkdir()
            (gh / "copilot-instructions.md").write_text("Use TypeScript. Prefer functional style.\n")

            result = copilot_imp.import_from(root)
            assert result is not None
            assert "TypeScript" in result.scopes[0].base_text

    def test_import_hand_written_cursor_rules(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            rules = root / ".cursor" / "rules"
            rules.mkdir(parents=True)
            (rules / "base.mdc").write_text(
                "---\ndescription: My rules\nalwaysApply: true\n---\n\nAlways use snake_case.\n"
            )

            result = cursor_imp.import_from(root)
            assert result is not None
            assert "snake_case" in result.scopes[0].base_text

    def test_roundtrip_hand_written_to_aictx_to_native(self):
        """Hand-written CLAUDE.md → import → .context.toml → deploy → compare."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            original_text = "# My Service\n\nREST API. Build: make. Test: make test.\n"
            (root / "CLAUDE.md").write_text(original_text)

            # Import
            imports = [r for r in [claude_imp.import_from(root)] if r]
            synthesize(root, imports)

            # Verify .context.toml
            aictx = (root / ".context.toml").read_text("utf-8")
            assert "[instructions]" in aictx
            assert "My Service" in aictx

            # Delete original, deploy from .context.toml
            (root / "CLAUDE.md").unlink()
            _deploy_all(root, profile=None)

            # The new CLAUDE.md should contain the same content (wrapped in markers)
            new_text = (root / "CLAUDE.md").read_text("utf-8")
            assert "My Service" in new_text
            assert "REST API" in new_text
            assert "make test" in new_text


# ---------------------------------------------------------------------------
# Test: CLI integration
# ---------------------------------------------------------------------------


class TestCLI:
    @classmethod
    def setup_class(cls):
        """Ensure native files exist in fixture for CLI import tests."""
        _deploy_all(FIXTURE_ROOT, profile="review")

    def test_import_cli_dry_run(self):
        from click.testing import CliRunner

        from aictl.cli import main

        runner = CliRunner()
        result = runner.invoke(
            main,
            [
                "import",
                "--root",
                str(FIXTURE_ROOT),
                "--dry-run",
            ],
        )
        assert result.exit_code == 0
        assert "found claude" in result.output
        assert "found copilot" in result.output
        assert "found cursor" in result.output
        assert "(dry)" in result.output
        assert "Generated 5 .context.toml" in result.output

    def test_import_cli_empty_dir(self):
        from click.testing import CliRunner

        from aictl.cli import main

        with tempfile.TemporaryDirectory() as tmpdir:
            runner = CliRunner()
            result = runner.invoke(main, ["import", "--root", tmpdir])
            assert result.exit_code == 0
            assert "No native AI tool files found" in result.output

    def test_import_cli_with_prefer(self):
        from click.testing import CliRunner

        from aictl.cli import main

        runner = CliRunner()
        result = runner.invoke(
            main,
            [
                "import",
                "--root",
                str(FIXTURE_ROOT),
                "--prefer",
                "claude",
                "--dry-run",
            ],
        )
        assert result.exit_code == 0
        assert "prefer: claude" in result.output


# ---------------------------------------------------------------------------
# Test: synthesizer conflict warnings (profile name + cross-source dedup)
# ---------------------------------------------------------------------------


class TestSynthesizerConflictWarnings:
    """Synthesizer must surface diagnostics when importers disagree, so silent
    picks (e.g. Claude's 'debug' silently overriding Copilot's 'review') do
    not cause invisible behavior changes."""

    def _make_import(self, source, *, profile=None, base="", caps=None, mcp=None):
        from aictl.importers import (
            ImportedCapability,
            ImportedMcp,
            ImportedScope,
            ImportResult,
        )

        scope = ImportedScope(
            rel_path=".",
            source=source,
            base_text=base or f"# {source} base\n",
            profile_name=profile,
            profile_text=f"profile-text from {source}" if profile else "",
        )
        return ImportResult(
            source=source,
            scopes=[scope],
            capabilities=[
                ImportedCapability(kind="command", name=n, content=f"from {source}", source=source)
                for n in (caps or [])
            ],
            mcp_servers=[ImportedMcp(name=n, config={"src": source}, source=source) for n in (mcp or [])],
        )

    def test_profile_name_conflict_is_warned(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            imports = [
                self._make_import("claude", profile="debug"),
                self._make_import("copilot", profile="review"),
            ]
            warnings: list[str] = []
            synthesize(root, imports, warnings=warnings)
            assert any("profile name conflict" in w for w in warnings), warnings
            assert any("debug" in w and "review" in w for w in warnings)

    def test_profile_name_agreement_no_warning(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            imports = [
                self._make_import("claude", profile="debug"),
                self._make_import("copilot", profile="debug"),
            ]
            warnings: list[str] = []
            synthesize(root, imports, warnings=warnings)
            assert not any("profile name conflict" in w for w in warnings), warnings

    def test_profile_override_suppresses_conflict_warning(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            imports = [
                self._make_import("claude", profile="debug"),
                self._make_import("copilot", profile="review"),
            ]
            warnings: list[str] = []
            synthesize(root, imports, profile="docs", warnings=warnings)
            assert not any("profile name conflict" in w for w in warnings), warnings

    def test_dedup_cross_source_tie_warns(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            imports = [
                self._make_import("claude", caps=["status"], mcp=["github"]),
                self._make_import("copilot", caps=["status"], mcp=["github"]),
            ]
            warnings: list[str] = []
            synthesize(root, imports, warnings=warnings)
            assert any("capability" in w and "status" in w for w in warnings), warnings
            assert any("mcp" in w and "github" in w for w in warnings), warnings

    def test_dedup_single_source_no_warn(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            imports = [
                self._make_import("claude", caps=["only-claude"]),
                self._make_import("copilot", caps=["only-copilot"]),
            ]
            warnings: list[str] = []
            synthesize(root, imports, warnings=warnings)
            assert not warnings, warnings

    def test_dedup_records_kept_source_with_prefer(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            imports = [
                self._make_import("claude", caps=["status"]),
                self._make_import("copilot", caps=["status"]),
            ]
            warnings: list[str] = []
            synthesize(root, imports, prefer="copilot", warnings=warnings)
            cap_warn = next(w for w in warnings if "capability" in w and "status" in w)
            assert "kept from 'copilot'" in cap_warn


# ---------------------------------------------------------------------------
# Test: Windsurf and Gemini importer/emitter roundtrips
# ---------------------------------------------------------------------------


class TestWindsurfRoundtrip:
    """Windsurf has the smallest surface (instructions + MCP only). A roundtrip
    test guards against silent regressions in either side of that pair."""

    def test_emit_then_import_preserves_instructions_and_mcp(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Windsurf project notes"\n'
                'debug = "Extra debug rules"\n\n'
                "[mcp._always.github]\n"
                'type = "http"\n'
                'url = "https://example.com/mcp"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, "debug")
            windsurf_emit.emit(root, resolved)

            # Native files exist
            assert (root / ".windsurfrules").is_file()
            assert (root / ".windsurf" / "mcp.json").is_file()

            # Import roundtrip
            result = windsurf_imp.import_from(root)
            assert result is not None
            assert result.source == "windsurf"

            root_scopes = [s for s in result.scopes if s.rel_path == "."]
            assert len(root_scopes) == 1
            text = root_scopes[0].base_text + root_scopes[0].profile_text
            assert "Windsurf project notes" in text
            assert "Extra debug rules" in text

            mcp_names = {m.name for m in result.mcp_servers}
            assert "github" in mcp_names

    def test_import_returns_none_on_empty_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            assert windsurf_imp.import_from(Path(tmpdir)) is None

    def test_capabilities_are_dropped_by_design(self):
        """Windsurf doesn't support commands/agents/skills; emitter must not
        crash, and the importer should produce zero capabilities even when
        an upstream context.toml declared some."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Windsurf"\n\n'
                "[commands._always.status]\n"
                'content = "git status"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            windsurf_emit.emit(root, resolved)  # must not raise

            result = windsurf_imp.import_from(root)
            assert result is not None
            assert result.capabilities == []


class TestGeminiRoundtrip:
    """Gemini supports instructions + commands + skills + MCP. Confirm
    commands and skills survive the full emit/import roundtrip so the
    'silently dropped' regression class never reappears."""

    def test_roundtrip_preserves_commands_and_skills(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Gemini project"\n\n'
                "[commands._always.status]\n"
                'content = "Show git status"\n\n'
                "[skills._always.deploy]\n"
                'content = "Deployment runbook for the service."\n\n'
                "[mcp._always.github]\n"
                'type = "http"\n'
                'url = "https://example.com/mcp"\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            gemini_emit.emit(root, resolved)

            assert (root / "GEMINI.md").is_file()
            assert (root / ".gemini" / "commands" / "status.md").is_file()
            assert (root / ".gemini" / "skills" / "deploy" / "SKILL.md").is_file()
            assert (root / ".mcp.json").is_file()

            result = gemini_imp.import_from(root)
            assert result is not None
            assert result.source == "gemini"

            cap_names = {(c.kind, c.name) for c in result.capabilities}
            assert ("command", "status") in cap_names
            assert ("skill", "deploy") in cap_names

            mcp_names = {m.name for m in result.mcp_servers}
            assert "github" in mcp_names

    def test_import_returns_none_on_empty_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            assert gemini_imp.import_from(Path(tmpdir)) is None

    def test_agents_not_emitted_or_imported(self):
        """Gemini's feature matrix sets agent=False. The emitter skips agents
        and the importer never reads them. This test pins that contract so a
        future emitter change doesn't silently start writing files that the
        importer cannot read."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Gemini"\n\n'
                "[agents._always.planner]\n"
                'content = "Planner agent."\n'
            )
            scanned = scan(root)
            resolved = resolve(root, scanned, None)
            gemini_emit.emit(root, resolved)

            assert not (root / ".gemini" / "agents").exists()
            result = gemini_imp.import_from(root)
            if result is not None:
                assert not any(c.kind == "agent" for c in result.capabilities)


# ---------------------------------------------------------------------------
# Test: --patch mode preserves hand-edited .context.toml
# ---------------------------------------------------------------------------


class TestImportPatchMode:
    """``aictl ctx import --patch`` must be non-destructive: existing
    .context.toml content is preserved verbatim and only missing keys are
    added."""

    def _seed_native_files(self, root: Path):
        (root / "CLAUDE.md").write_text("# Imported project\nSome notes.\n")
        (root / ".mcp.json").write_text(
            json.dumps({"mcpServers": {"github": {"type": "http", "url": "https://from-import"}}})
        )

    def test_patch_preserves_existing_instructions(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            existing = (
                "[instructions]\n"
                'base = "Hand-written base"\n\n'
                "[commands._always.user-cmd]\n"
                'content = "user defined"\n'
            )
            (root / ".context.toml").write_text(existing)
            self._seed_native_files(root)

            imports = [r for r in [claude_imp.import_from(root)] if r]
            results = synthesize(root, imports, patch=True)

            assert len(results) == 1
            assert results[0]["action"] == "patch"
            text = (root / ".context.toml").read_text()
            assert "Hand-written base" in text
            assert 'name = "user-cmd"' not in text  # still keyed by section name
            assert "[commands._always.user-cmd]" in text
            # MCP server added because it wasn't present
            assert "[mcp._always.github]" in text

    def test_patch_does_not_overwrite_existing_mcp(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Existing"\n\n'
                "[mcp._always.github]\n"
                'type = "http"\nurl = "https://hand-written-url"\n'
            )
            self._seed_native_files(root)

            imports = [r for r in [claude_imp.import_from(root)] if r]
            results = synthesize(root, imports, patch=True)

            text = (root / ".context.toml").read_text()
            assert "hand-written-url" in text
            assert "from-import" not in text  # imported MCP did not overwrite
            # No new keys added at the [mcp._always.github] level -> skip
            assert results and results[0]["action"] in {"patch", "skip"}

    def test_patch_skip_when_nothing_new(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Already here"\n\n'
                "[mcp._always.github]\n"
                'type = "http"\nurl = "https://existing"\n'
            )
            (root / "CLAUDE.md").write_text("# Already here\n")
            (root / ".mcp.json").write_text(
                json.dumps({"mcpServers": {"github": {"type": "http", "url": "https://existing"}}})
            )

            imports = [r for r in [claude_imp.import_from(root)] if r]
            results = synthesize(root, imports, patch=True)

            text = (root / ".context.toml").read_text()
            assert "Already here" in text
            # File unchanged (no new keys)
            assert results and results[0]["action"] == "skip"

    def test_patch_create_action_when_no_existing_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            self._seed_native_files(root)
            imports = [r for r in [claude_imp.import_from(root)] if r]
            results = synthesize(root, imports, patch=True)
            assert results and results[0]["action"] == "create"

    def test_non_patch_overwrites_existing(self):
        """Default (non-patch) behavior continues to overwrite."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Will be lost"\n'
            )
            self._seed_native_files(root)
            imports = [r for r in [claude_imp.import_from(root)] if r]
            results = synthesize(root, imports)  # patch defaults to False
            text = (root / ".context.toml").read_text()
            assert "Will be lost" not in text
            assert "Imported project" in text
            assert results and results[0]["action"] == "overwrite"

    def test_patch_dry_run_does_not_write(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / ".context.toml").write_text(
                "[instructions]\n"
                'base = "Hand-written"\n'
            )
            self._seed_native_files(root)
            before = (root / ".context.toml").read_text()
            imports = [r for r in [claude_imp.import_from(root)] if r]
            results = synthesize(root, imports, patch=True, dry_run=True)
            after = (root / ".context.toml").read_text()
            assert before == after
            assert results and results[0]["action"] == "patch"
