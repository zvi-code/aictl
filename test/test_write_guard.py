# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for WriteGuard — the per-invocation safety gate for pre-existing files.

Coverage:
  - WriteGuard class: install, current, confirm (all branches)
  - write_safe() integration with WriteGuard
  - Per-command integration: deploy, hooks install/uninstall, init, import,
    plugin build, enable (N aborts, A approves all, new files silent, dry-run skips guard)
"""

from __future__ import annotations

import json
import sys
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch, MagicMock

import click
import pytest
from click.testing import CliRunner

from aictl.utils import WriteGuard


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@contextmanager
def _fake_click_ctx():
    """Push a minimal Click context so WriteGuard.install/current works."""
    cmd = click.Command("test", callback=lambda: None)
    ctx = click.Context(cmd)
    with ctx:
        yield ctx


def _confirm_interactive(guard, path, action="modify", user_input="Y"):
    """
    Call guard.confirm() as if running in a TTY inside a Click command.

    We use click.BaseCommand to create a real Click context (so the context
    check passes), patch sys.stdin.isatty to return True, and patch
    click.prompt to return a canned response — bypassing all actual I/O.
    """
    with _fake_click_ctx():
        with patch("sys.stdin.isatty", return_value=True), \
             patch("click.prompt", return_value=user_input):
            guard.confirm(path, action)


# ---------------------------------------------------------------------------
# WriteGuard unit tests — install / current
# ---------------------------------------------------------------------------

class TestWriteGuardInstall:
    def test_install_returns_guard(self):
        runner = CliRunner()

        @click.command()
        def _cmd():
            g = WriteGuard.install("test cmd")
            assert isinstance(g, WriteGuard)

        result = runner.invoke(_cmd)
        assert result.exit_code == 0

    def test_install_stores_in_context(self):
        runner = CliRunner()

        @click.command()
        def _cmd():
            g = WriteGuard.install("test cmd")
            ctx = click.get_current_context()
            assert ctx.meta["_write_guard"] is g

        result = runner.invoke(_cmd)
        assert result.exit_code == 0

    def test_current_returns_none_outside_context(self):
        assert WriteGuard.current() is None

    def test_current_returns_installed_guard(self):
        runner = CliRunner()

        @click.command()
        def _cmd():
            g = WriteGuard.install("test cmd")
            assert WriteGuard.current() is g

        result = runner.invoke(_cmd)
        assert result.exit_code == 0

    def test_current_returns_none_if_not_installed(self):
        runner = CliRunner()

        @click.command()
        def _cmd():
            assert WriteGuard.current() is None

        result = runner.invoke(_cmd)
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# WriteGuard.confirm() — silent paths (no prompt expected)
# ---------------------------------------------------------------------------

class TestWriteGuardConfirmSilent:
    def test_new_file_no_prompt(self, tmp_path):
        """Files that don't exist yet are always silently approved."""
        guard = WriteGuard("test")
        guard.confirm(tmp_path / "nonexistent.txt")  # must not raise

    def test_approve_all_skips_prompt(self, tmp_path):
        """_approve_all=True skips prompting for existing files."""
        existing = tmp_path / "file.txt"
        existing.write_text("original")
        guard = WriteGuard("test")
        guard._approve_all = True
        guard.confirm(existing)  # must not raise

    def test_non_tty_auto_approves(self, tmp_path):
        """CliRunner (non-TTY stdin) auto-approves — no prompt issued."""
        existing = tmp_path / "file.txt"
        existing.write_text("data")

        prompted = []

        runner = CliRunner()

        @click.command()
        def _cmd():
            guard = WriteGuard.install("test")
            with patch("click.prompt", side_effect=lambda *a, **kw: prompted.append(1)):
                guard.confirm(existing)
            click.echo("ok")

        result = runner.invoke(_cmd)
        assert result.exit_code == 0
        assert "ok" in result.output
        assert not prompted, "guard must not prompt in non-TTY context"

    def test_no_click_context_auto_approves(self, tmp_path):
        """Outside a Click command, confirm() returns without prompting."""
        existing = tmp_path / "file.txt"
        existing.write_text("data")
        guard = WriteGuard("test")
        # No Click context active
        with patch("click.prompt") as mock_prompt:
            guard.confirm(existing)
        mock_prompt.assert_not_called()


# ---------------------------------------------------------------------------
# WriteGuard.confirm() — interactive paths (TTY + Click context)
# ---------------------------------------------------------------------------

class TestWriteGuardConfirmInteractive:
    """Use _confirm_interactive() to drive the prompt with canned responses."""

    def test_y_approves(self, tmp_path):
        existing = tmp_path / "file.txt"
        existing.write_text("data")
        guard = WriteGuard("test cmd")
        _confirm_interactive(guard, existing, user_input="Y")  # must not raise

    def test_a_approves_and_sets_flag(self, tmp_path):
        existing1 = tmp_path / "a.txt"
        existing2 = tmp_path / "b.txt"
        existing1.write_text("a")
        existing2.write_text("b")
        guard = WriteGuard("test cmd")

        _confirm_interactive(guard, existing1, user_input="A")
        assert guard._approve_all
        # Second file must be silently approved (no prompt)
        with patch("click.prompt") as mock_prompt:
            guard.confirm(existing2)
        mock_prompt.assert_not_called()

    def test_n_aborts_command(self, tmp_path):
        existing = tmp_path / "file.txt"
        existing.write_text("data")
        guard = WriteGuard("test cmd")
        with pytest.raises(click.Abort):
            _confirm_interactive(guard, existing, user_input="N")

    def test_other_input_aborts(self, tmp_path):
        existing = tmp_path / "file.txt"
        existing.write_text("data")
        guard = WriteGuard("test cmd")
        with pytest.raises(click.Abort):
            _confirm_interactive(guard, existing, user_input="X")

    def test_prompt_text_includes_command_name(self, tmp_path):
        existing = tmp_path / "myfile.txt"
        existing.write_text("data")
        guard = WriteGuard("hooks install")

        echoed = []
        with _fake_click_ctx():
            with patch("sys.stdin.isatty", return_value=True), \
                 patch("click.prompt", return_value="Y"), \
                 patch("click.secho", side_effect=lambda msg, **kw: echoed.append(msg)):
                guard.confirm(existing, "modify")

        full_output = "\n".join(echoed)
        assert "hooks install" in full_output
        assert "modify" in full_output
        assert str(existing) in full_output

    def test_action_verb_shown_in_prompt(self, tmp_path):
        existing = tmp_path / "f.txt"
        existing.write_text("x")
        guard = WriteGuard("init")

        echoed = []
        with _fake_click_ctx():
            with patch("sys.stdin.isatty", return_value=True), \
                 patch("click.prompt", return_value="Y"), \
                 patch("click.secho", side_effect=lambda msg, **kw: echoed.append(msg)):
                guard.confirm(existing, "replace")

        assert any("replace" in m for m in echoed)


# ---------------------------------------------------------------------------
# write_safe() integration
# ---------------------------------------------------------------------------

class TestWriteSafeGuardIntegration:
    def test_write_safe_calls_guard_confirm_for_existing_file(self, tmp_path):
        """write_safe() must invoke guard.confirm() when the file already exists."""
        from aictl.utils import write_safe

        existing = tmp_path / "file.txt"
        existing.write_text("original")

        confirmed = []

        runner = CliRunner()

        @click.command()
        def _cmd():
            guard = WriteGuard.install("deploy")
            original = guard.confirm

            def _track(path, action="modify"):
                confirmed.append(str(path))
                return original(path, action)

            guard.confirm = _track
            write_safe(existing, "new content")
            click.echo("done")

        result = runner.invoke(_cmd)
        assert result.exit_code == 0
        assert str(existing) in confirmed

    def test_write_safe_no_guard_for_new_file(self, tmp_path):
        """write_safe() still works (silently) for files that don't exist yet."""
        from aictl.utils import write_safe

        new_file = tmp_path / "new.txt"
        write_safe(new_file, "content")
        assert new_file.read_text() == "content"

    def test_write_safe_creates_parent_dirs(self, tmp_path):
        """write_safe() creates all missing parent directories."""
        from aictl.utils import write_safe

        nested = tmp_path / "a" / "b" / "c" / "file.txt"
        write_safe(nested, "hello")
        assert nested.read_text() == "hello"

    def test_write_safe_outside_click_context(self, tmp_path):
        """write_safe() called outside any Click command must work normally."""
        from aictl.utils import write_safe

        f = tmp_path / "out.txt"
        write_safe(f, "content")
        assert f.read_text() == "content"

    def test_write_safe_guard_abort_prevents_write(self, tmp_path):
        """If guard.confirm() raises Abort, write_safe() must not write the file."""
        from aictl.utils import write_safe

        existing = tmp_path / "file.txt"
        existing.write_text("original")

        runner = CliRunner()

        @click.command()
        def _cmd():
            guard = WriteGuard.install("deploy")
            guard.confirm = lambda path, action="modify": (_ for _ in ()).throw(click.Abort())
            write_safe(existing, "should not be written")
            click.echo("done")

        result = runner.invoke(_cmd)
        # Abort propagates — command does not complete
        assert result.exit_code != 0
        assert existing.read_text() == "original"


# ---------------------------------------------------------------------------
# Shared helper: simulate N / Y / A through guard.confirm mock
# ---------------------------------------------------------------------------

def _abort_confirm(path, action="modify"):
    raise click.Abort()


def _noop_confirm(path, action="modify"):
    pass


# ---------------------------------------------------------------------------
# hooks install / uninstall
# ---------------------------------------------------------------------------

class TestHooksInstallGuard:
    @pytest.fixture
    def tmp_settings(self, tmp_path, monkeypatch):
        settings_file = tmp_path / ".claude" / "settings.json"
        monkeypatch.setattr("aictl.commands.integrations._settings_path", lambda scope: settings_file)
        monkeypatch.setenv("AICTL_PORT", "8484")
        return settings_file

    def test_install_no_prompt_for_new_settings_file(self, tmp_settings):
        """Installing into a non-existent settings file never prompts."""
        from aictl.commands.integrations import hooks

        runner = CliRunner()
        result = runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert result.exit_code == 0
        assert tmp_settings.exists()

    def test_install_installs_guard(self, tmp_settings):
        """hooks install registers a WriteGuard in the Click context."""
        from aictl.commands.integrations import hooks

        installed = []

        original_install = WriteGuard.install

        def _track(command):
            g = original_install(command)
            installed.append(command)
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_track)):
            runner.invoke(hooks, ["install"], catch_exceptions=False)

        assert "hooks install" in installed

    def test_install_guard_abort_prevents_write(self, tmp_settings):
        """If guard.confirm aborts, install must not write to settings.json."""
        from aictl.commands.integrations import hooks

        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({}))  # pre-existing

        original_install = WriteGuard.install

        def _install_aborting(command):
            g = original_install(command)
            g.confirm = _abort_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_aborting)):
            result = runner.invoke(hooks, ["install"])
        assert result.exit_code != 0

    def test_install_guard_approve_proceeds(self, tmp_settings):
        """If guard.confirm approves, install writes hooks correctly."""
        from aictl.commands.integrations import hooks, HOOK_EVENTS

        tmp_settings.parent.mkdir(parents=True, exist_ok=True)
        tmp_settings.write_text(json.dumps({}))

        original_install = WriteGuard.install

        def _install_approving(command):
            g = original_install(command)
            g.confirm = _noop_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_approving)):
            result = runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert result.exit_code == 0
        data = json.loads(tmp_settings.read_text())
        assert len(data["hooks"]) == len(HOOK_EVENTS)

    def test_uninstall_installs_guard(self, tmp_settings):
        """hooks uninstall registers a WriteGuard in the Click context."""
        from aictl.commands.integrations import hooks

        # Install first (no guard)
        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)

        installed = []
        original_install = WriteGuard.install

        def _track(command):
            g = original_install(command)
            installed.append(command)
            return g

        with patch.object(WriteGuard, "install", staticmethod(_track)):
            runner.invoke(hooks, ["uninstall"], catch_exceptions=False)

        assert "hooks uninstall" in installed

    def test_uninstall_guard_abort_prevents_write(self, tmp_settings):
        """If guard.confirm aborts, uninstall must not modify settings.json."""
        from aictl.commands.integrations import hooks

        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)
        original_content = tmp_settings.read_text()

        original_install = WriteGuard.install

        def _install_aborting(command):
            g = original_install(command)
            g.confirm = _abort_confirm
            return g

        with patch.object(WriteGuard, "install", staticmethod(_install_aborting)):
            result = runner.invoke(hooks, ["uninstall"])
        assert result.exit_code != 0
        assert tmp_settings.read_text() == original_content


# ---------------------------------------------------------------------------
# init command
# ---------------------------------------------------------------------------

class TestInitGuard:
    def test_init_no_prompt_for_new_toml(self, tmp_path):
        """init into a fresh directory never prompts."""
        from aictl.commands.ctx_pipeline import init

        runner = CliRunner()
        result = runner.invoke(init, ["--root", str(tmp_path)], catch_exceptions=False)
        assert result.exit_code == 0
        assert (tmp_path / ".context.toml").exists()

    def test_init_guard_abort_prevents_overwrite(self, tmp_path):
        """If guard.confirm aborts, init --force must not overwrite the .context.toml."""
        from aictl.commands.ctx_pipeline import init

        toml = tmp_path / ".context.toml"
        toml.write_text("# original")

        original_install = WriteGuard.install

        def _install_aborting(command):
            g = original_install(command)
            g.confirm = _abort_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_aborting)):
            result = runner.invoke(init, ["--root", str(tmp_path), "--force"])
        assert result.exit_code != 0
        assert toml.read_text() == "# original"

    def test_init_guard_approve_overwrites(self, tmp_path):
        """If guard.confirm approves, init --force overwrites the .context.toml."""
        from aictl.commands.ctx_pipeline import init

        toml = tmp_path / ".context.toml"
        toml.write_text("# original")

        original_install = WriteGuard.install

        def _install_approving(command):
            g = original_install(command)
            g.confirm = _noop_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_approving)):
            result = runner.invoke(init, ["--root", str(tmp_path), "--force"], catch_exceptions=False)
        assert result.exit_code == 0
        assert toml.read_text() != "# original"

    def test_init_hooks_no_prompt_for_new_scripts(self, tmp_path):
        """init --hooks into fresh dir creates scripts without prompting."""
        from aictl.commands.ctx_pipeline import init

        runner = CliRunner()
        result = runner.invoke(init, ["--root", str(tmp_path), "--hooks"], catch_exceptions=False)
        assert result.exit_code == 0
        assert (tmp_path / ".claude" / "hooks" / "block-rm.sh").exists()
        assert (tmp_path / ".claude" / "hooks" / "lint-on-write.sh").exists()

    def test_init_hooks_guard_abort_preserves_existing_script(self, tmp_path):
        """If guard.confirm aborts on a hook script, it must not be overwritten."""
        from aictl.commands.ctx_pipeline import init

        hooks_dir = tmp_path / ".claude" / "hooks"
        hooks_dir.mkdir(parents=True)
        script = hooks_dir / "block-rm.sh"
        script.write_text("# original")

        # Approve .context.toml but abort on first hook script
        call_count = [0]

        def _selective_confirm(path, action="modify"):
            call_count[0] += 1
            if call_count[0] > 1:
                raise click.Abort()

        original_install = WriteGuard.install

        def _install_selective(command):
            g = original_install(command)
            g.confirm = _selective_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_selective)):
            result = runner.invoke(init, ["--root", str(tmp_path), "--hooks", "--force"])
        assert result.exit_code != 0
        assert script.read_text() == "# original"

    def test_init_hooks_approve_all_updates_both_scripts(self, tmp_path):
        """If guard sets _approve_all on first confirm, both hook scripts are updated."""
        from aictl.commands.ctx_pipeline import init

        hooks_dir = tmp_path / ".claude" / "hooks"
        hooks_dir.mkdir(parents=True)
        (hooks_dir / "block-rm.sh").write_text("# old")
        (hooks_dir / "lint-on-write.sh").write_text("# old")
        toml = tmp_path / ".context.toml"
        toml.write_text("# old")

        original_install = WriteGuard.install

        def _install_approving(command):
            g = original_install(command)
            g.confirm = _noop_confirm  # approve all silently
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_approving)):
            result = runner.invoke(
                init, ["--root", str(tmp_path), "--hooks", "--force"], catch_exceptions=False
            )
        assert result.exit_code == 0
        assert "# old" not in (hooks_dir / "block-rm.sh").read_text()
        assert "# old" not in (hooks_dir / "lint-on-write.sh").read_text()


# ---------------------------------------------------------------------------
# deploy command
# ---------------------------------------------------------------------------

class TestDeployGuard:
    def _make_toml(self, root: Path) -> None:
        (root / ".context.toml").write_text('[instructions]\nbase = "Hello."\n')

    def test_deploy_dry_run_no_guard_installed(self, tmp_path):
        """dry-run must NOT call WriteGuard.install."""
        from aictl.commands.ctx_pipeline import deploy

        self._make_toml(tmp_path)
        installed = []
        original = WriteGuard.install

        def _track(command):
            installed.append(command)
            return original(command)

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_track)):
            result = runner.invoke(
                deploy, ["--root", str(tmp_path), "--dry-run"], catch_exceptions=False
            )
        assert result.exit_code == 0
        assert not installed

    def test_deploy_new_files_no_guard_prompt(self, tmp_path):
        """Deploying for the first time (no output files yet) completes without prompting."""
        from aictl.commands.ctx_pipeline import deploy

        self._make_toml(tmp_path)
        runner = CliRunner()
        result = runner.invoke(
            deploy, ["--root", str(tmp_path), "--emit", "claude"], catch_exceptions=False
        )
        assert result.exit_code == 0

    def test_deploy_guard_abort_prevents_write(self, tmp_path):
        """If guard.confirm aborts, deploy must not overwrite existing output files."""
        from aictl.commands.ctx_pipeline import deploy

        self._make_toml(tmp_path)
        runner = CliRunner()
        # First deploy — creates output files
        runner.invoke(deploy, ["--root", str(tmp_path), "--emit", "claude"], catch_exceptions=False)

        original_install = WriteGuard.install

        def _install_aborting(command):
            g = original_install(command)
            g.confirm = _abort_confirm
            return g

        with patch.object(WriteGuard, "install", staticmethod(_install_aborting)):
            result = runner.invoke(deploy, ["--root", str(tmp_path), "--emit", "claude"])
        assert result.exit_code != 0

    def test_deploy_guard_approve_all_succeeds(self, tmp_path):
        """If guard approves all, second deploy succeeds."""
        from aictl.commands.ctx_pipeline import deploy

        self._make_toml(tmp_path)
        runner = CliRunner()
        runner.invoke(deploy, ["--root", str(tmp_path), "--emit", "claude"], catch_exceptions=False)

        original_install = WriteGuard.install

        def _install_approving(command):
            g = original_install(command)
            g.confirm = _noop_confirm
            return g

        with patch.object(WriteGuard, "install", staticmethod(_install_approving)):
            result = runner.invoke(
                deploy, ["--root", str(tmp_path), "--emit", "claude"], catch_exceptions=False
            )
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# import command
# ---------------------------------------------------------------------------

class TestImportGuard:
    def test_import_dry_run_no_guard_installed(self, tmp_path):
        """import --dry-run must NOT call WriteGuard.install."""
        from aictl.commands.import_plugin import import_cmd

        (tmp_path / "CLAUDE.md").write_text("# base\nProject info.\n")
        installed = []
        original = WriteGuard.install

        def _track(command):
            installed.append(command)
            return original(command)

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_track)):
            result = runner.invoke(
                import_cmd,
                ["--root", str(tmp_path), "--dry-run", "--from", "claude"],
                catch_exceptions=False,
            )
        assert result.exit_code == 0
        assert not installed

    def test_import_guard_abort_preserves_existing_toml(self, tmp_path):
        """If guard.confirm aborts, import must not overwrite existing .context.toml."""
        from aictl.commands.import_plugin import import_cmd

        (tmp_path / "CLAUDE.md").write_text("# base\nProject info.\n")
        toml = tmp_path / ".context.toml"
        toml.write_text("# original")

        original_install = WriteGuard.install

        def _install_aborting(command):
            g = original_install(command)
            g.confirm = _abort_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_aborting)):
            result = runner.invoke(
                import_cmd, ["--root", str(tmp_path), "--from", "claude"]
            )
        assert result.exit_code != 0
        assert toml.read_text() == "# original"

    def test_import_guard_approve_overwrites(self, tmp_path):
        """If guard approves, import overwrites the existing .context.toml."""
        from aictl.commands.import_plugin import import_cmd

        (tmp_path / "CLAUDE.md").write_text("# base\nProject info.\n")
        toml = tmp_path / ".context.toml"
        toml.write_text("# original")

        original_install = WriteGuard.install

        def _install_approving(command):
            g = original_install(command)
            g.confirm = _noop_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_approving)):
            result = runner.invoke(
                import_cmd, ["--root", str(tmp_path), "--from", "claude"],
                catch_exceptions=False,
            )
        assert result.exit_code == 0
        assert toml.read_text() != "# original"


# ---------------------------------------------------------------------------
# plugin build command
# ---------------------------------------------------------------------------

class TestPluginBuildGuard:
    def _make_plugin_toml(self, root: Path) -> None:
        (root / ".context.toml").write_text(
            '[plugin]\nname = "myplugin"\nversion = "1.0.0"\n\n'
            '[commands._always.hello]\ncontent = "Say hello."\n'
        )

    def test_plugin_build_dry_run_no_guard_installed(self, tmp_path):
        """plugin build --dry-run must NOT call WriteGuard.install."""
        from aictl.commands.import_plugin import plugin

        self._make_plugin_toml(tmp_path)
        installed = []
        original = WriteGuard.install

        def _track(command):
            installed.append(command)
            return original(command)

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_track)):
            result = runner.invoke(
                plugin, ["build", "--root", str(tmp_path), "--dry-run"], catch_exceptions=False
            )
        assert result.exit_code == 0
        assert not installed

    def test_plugin_build_new_files_no_prompt(self, tmp_path):
        """First build (no pre-existing output) completes without prompting."""
        from aictl.commands.import_plugin import plugin

        self._make_plugin_toml(tmp_path)
        runner = CliRunner()
        result = runner.invoke(plugin, ["build", "--root", str(tmp_path)], catch_exceptions=False)
        assert result.exit_code == 0
        assert (tmp_path / "plugin" / ".claude-plugin" / "plugin.json").exists()

    def test_plugin_build_guard_abort_prevents_write(self, tmp_path):
        """If guard.confirm aborts, plugin build must not overwrite existing output."""
        from aictl.commands.import_plugin import plugin

        self._make_plugin_toml(tmp_path)
        runner = CliRunner()
        runner.invoke(plugin, ["build", "--root", str(tmp_path)], catch_exceptions=False)

        manifest = tmp_path / "plugin" / ".claude-plugin" / "plugin.json"
        original_content = manifest.read_text()

        original_install = WriteGuard.install

        def _install_aborting(command):
            g = original_install(command)
            g.confirm = _abort_confirm
            return g

        with patch.object(WriteGuard, "install", staticmethod(_install_aborting)):
            result = runner.invoke(plugin, ["build", "--root", str(tmp_path)])
        assert result.exit_code != 0
        assert manifest.read_text() == original_content

    def test_plugin_build_guard_approve_all_succeeds(self, tmp_path):
        """If guard approves all, rebuilding existing output succeeds."""
        from aictl.commands.import_plugin import plugin

        self._make_plugin_toml(tmp_path)
        runner = CliRunner()
        runner.invoke(plugin, ["build", "--root", str(tmp_path)], catch_exceptions=False)

        original_install = WriteGuard.install

        def _install_approving(command):
            g = original_install(command)
            g.confirm = _noop_confirm
            return g

        with patch.object(WriteGuard, "install", staticmethod(_install_approving)):
            result = runner.invoke(
                plugin, ["build", "--root", str(tmp_path)], catch_exceptions=False
            )
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# enable command
# ---------------------------------------------------------------------------

class TestEnableGuard:
    @pytest.fixture
    def patched_enable(self, tmp_path, monkeypatch):
        """Redirect all enable output paths to tmp_path."""
        monkeypatch.setattr(
            "aictl.commands.integrations.claude_global_dir",
            lambda: tmp_path / "claude",
        )
        monkeypatch.setattr(
            "aictl.commands.integrations.vscode_user_dir",
            lambda: tmp_path / "vscode",
        )
        profile = tmp_path / ".zshrc"
        profile.write_text("")
        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [profile])
        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [profile])
        monkeypatch.setenv("AICTL_PORT", "8484")
        return tmp_path

    def test_enable_dry_run_no_guard_installed(self, patched_enable):
        """enable --dry-run must NOT call WriteGuard.install."""
        from aictl.commands.integrations import enable

        installed = []
        original = WriteGuard.install

        def _track(command):
            installed.append(command)
            return original(command)

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_track)):
            result = runner.invoke(enable, ["--dry-run"], catch_exceptions=False)
        assert result.exit_code == 0
        assert not installed

    def test_enable_new_files_no_prompt(self, patched_enable):
        """enable into fresh dirs never prompts."""
        from aictl.commands.integrations import enable

        runner = CliRunner()
        result = runner.invoke(enable, ["--scope", "user"], catch_exceptions=False)
        assert result.exit_code == 0

    def test_enable_guard_abort_prevents_write(self, patched_enable):
        """If guard.confirm aborts, enable must not write any files."""
        from aictl.commands.integrations import enable

        settings = patched_enable / "claude" / "settings.json"
        settings.parent.mkdir(parents=True)
        settings.write_text(json.dumps({"selectedModel": "opus"}))

        original_install = WriteGuard.install

        def _install_aborting(command):
            g = original_install(command)
            g.confirm = _abort_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_aborting)):
            result = runner.invoke(enable, ["--scope", "user"])
        assert result.exit_code != 0
        # Settings file content must be unchanged
        assert json.loads(settings.read_text()) == {"selectedModel": "opus"}

    def test_enable_guard_approve_all_writes_settings(self, patched_enable):
        """If guard approves all, enable writes hooks and VS Code settings."""
        from aictl.commands.integrations import enable

        settings = patched_enable / "claude" / "settings.json"
        settings.parent.mkdir(parents=True)
        settings.write_text(json.dumps({}))

        original_install = WriteGuard.install

        def _install_approving(command):
            g = original_install(command)
            g.confirm = _noop_confirm
            return g

        runner = CliRunner()
        with patch.object(WriteGuard, "install", staticmethod(_install_approving)):
            result = runner.invoke(enable, ["--scope", "user"], catch_exceptions=False)
        assert result.exit_code == 0
        data = json.loads(settings.read_text())
        assert "hooks" in data

    def test_enable_project_scope_writes_local_settings(self, patched_enable, monkeypatch):
        """--scope project writes to .claude/settings.local.json, not settings.json."""
        from aictl.commands.integrations import enable

        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [])

        runner = CliRunner()
        with runner.isolated_filesystem() as td:
            result = runner.invoke(enable, ["--scope", "project"], catch_exceptions=False)
            assert result.exit_code == 0
            local = Path(td) / ".claude" / "settings.local.json"
            assert local.exists(), "project scope must write to settings.local.json"
            committed = Path(td) / ".claude" / "settings.json"
            assert not committed.exists(), "project scope must NOT write to settings.json"


# ---------------------------------------------------------------------------
# Encoding correctness (Windows: default encoding is cp1252, not utf-8)
# ---------------------------------------------------------------------------

class TestFileIOEncoding:
    """All file reads/writes must use explicit utf-8 encoding."""

    def test_hooks_settings_read_uses_utf8(self, tmp_path, monkeypatch):
        """hooks install reads settings.json with utf-8 encoding."""
        from aictl.commands.integrations import hooks

        settings_file = tmp_path / ".claude" / "settings.json"
        settings_file.parent.mkdir(parents=True)
        # Write a settings file with non-ASCII content (em-dash in a comment key)
        data = {"selectedModel": "opus", "note": "caf\u00e9"}
        settings_file.write_text(json.dumps(data), encoding="utf-8")

        monkeypatch.setattr("aictl.commands.integrations._settings_path", lambda scope: settings_file)
        monkeypatch.setenv("AICTL_PORT", "8484")

        runner = CliRunner()
        result = runner.invoke(hooks, ["install"], catch_exceptions=False)
        assert result.exit_code == 0
        # Non-ASCII value must survive round-trip
        saved = json.loads(settings_file.read_text(encoding="utf-8"))
        assert saved["note"] == "caf\u00e9"

    def test_hooks_settings_write_uses_utf8(self, tmp_path, monkeypatch):
        """hooks install writes settings.json with utf-8 encoding."""
        from aictl.commands.integrations import hooks, HOOK_EVENTS

        settings_file = tmp_path / ".claude" / "settings.json"
        monkeypatch.setattr("aictl.commands.integrations._settings_path", lambda scope: settings_file)
        monkeypatch.setenv("AICTL_PORT", "8484")

        runner = CliRunner()
        runner.invoke(hooks, ["install"], catch_exceptions=False)

        # File must be readable as utf-8 without errors
        raw = settings_file.read_bytes()
        decoded = raw.decode("utf-8")
        data = json.loads(decoded)
        assert "hooks" in data

    def test_otel_shell_profile_encoding(self, tmp_path, monkeypatch):
        """otel enable writes shell profiles with utf-8 encoding."""
        from aictl.commands.integrations import otel

        profile = tmp_path / ".zshrc"
        profile.write_text("# existing profile with caf\u00e9\n", encoding="utf-8")

        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [profile])
        monkeypatch.setenv("AICTL_PORT", "8484")

        runner = CliRunner()
        result = runner.invoke(otel, ["enable", "--tool", "claude"], catch_exceptions=False)
        assert result.exit_code == 0

        # File must be valid utf-8 and preserve the original content
        content = profile.read_text(encoding="utf-8")
        assert "caf\u00e9" in content
        assert "AICTL_PORT" in content

    def test_otel_shell_profile_update_preserves_unicode(self, tmp_path, monkeypatch):
        """Updating an existing otel block in a profile preserves non-ASCII chars."""
        from aictl.commands.integrations import otel

        marker = "# \u2500\u2500 aictl: OTel for AI tools \u2500\u2500"
        profile = tmp_path / ".zshrc"
        # Pre-existing profile with previous otel block and unicode content
        profile.write_text(
            "# my profile \u00e9\u00e0\u00fc\n"
            + marker + "\nexport AICTL_PORT=8484\n"
            + "# after-block content\n",
            encoding="utf-8",
        )

        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [profile])
        monkeypatch.setenv("AICTL_PORT", "8484")

        runner = CliRunner()
        result = runner.invoke(otel, ["enable", "--tool", "claude"], catch_exceptions=False)
        assert result.exit_code == 0
        content = profile.read_text(encoding="utf-8")
        assert "\u00e9\u00e0\u00fc" in content  # unicode must survive

    def test_enable_cmd_profile_encoding(self, tmp_path, monkeypatch):
        """enable writes shell profiles with utf-8 encoding."""
        from aictl.commands.integrations import enable

        profile = tmp_path / ".zshrc"
        profile.write_text("# profile \u00e9\n", encoding="utf-8")

        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [profile])
        monkeypatch.setattr(
            "aictl.commands.integrations.claude_global_dir", lambda: tmp_path / "claude"
        )
        monkeypatch.setattr(
            "aictl.commands.integrations.vscode_user_dir", lambda: tmp_path / "vscode"
        )
        monkeypatch.setenv("AICTL_PORT", "8484")

        runner = CliRunner()
        result = runner.invoke(enable, ["--scope", "user"], catch_exceptions=False)
        assert result.exit_code == 0
        content = profile.read_text(encoding="utf-8")
        assert "\u00e9" in content


# ---------------------------------------------------------------------------
# Codex path uses codex_global_dir() from platforms.py
# ---------------------------------------------------------------------------

class TestCodexPathPlatformAbstraction:
    """otel enable and enable must use codex_global_dir() not Path.home() / '.codex'."""

    def test_otel_enable_uses_codex_global_dir(self, tmp_path, monkeypatch):
        """otel enable writes codex config to codex_global_dir(), not ~/.codex.

        codex_global_dir is imported inside the function body, so we patch
        the source in aictl.platforms rather than the command module.
        """
        from aictl.commands.integrations import otel

        custom_codex = tmp_path / "custom_codex"

        monkeypatch.setattr("aictl.commands.integrations.codex_global_dir", lambda: custom_codex)
        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [])
        monkeypatch.setenv("AICTL_PORT", "8484")

        runner = CliRunner()
        result = runner.invoke(otel, ["enable", "--tool", "codex"], catch_exceptions=False)
        assert result.exit_code == 0
        assert (custom_codex / "config.toml").exists()

    def test_enable_cmd_uses_codex_global_dir(self, tmp_path, monkeypatch):
        """enable must write codex config to codex_global_dir(), not ~/.codex."""
        from aictl.commands.integrations import enable

        custom_codex = tmp_path / "custom_codex"

        monkeypatch.setattr("aictl.commands.integrations.codex_global_dir", lambda: custom_codex)
        monkeypatch.setattr("aictl.commands.integrations._shell_profiles", lambda: [])
        monkeypatch.setattr(
            "aictl.commands.integrations.claude_global_dir", lambda: tmp_path / "claude"
        )
        monkeypatch.setattr(
            "aictl.commands.integrations.vscode_user_dir", lambda: tmp_path / "vscode"
        )
        monkeypatch.setenv("AICTL_PORT", "8484")

        runner = CliRunner()
        result = runner.invoke(enable, ["--scope", "user"], catch_exceptions=False)
        assert result.exit_code == 0
        assert (custom_codex / "config.toml").exists()
