# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Round-trip properties of hook registration, per tool and per file shape.

``install; install`` == ``install``. ``install; uninstall`` == original:
semantically always, and byte-for-byte when the file had no hooks key to rewrite.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import hook_removal
from aictl.commands import integrations as ig
from aictl.commands.disable import disable

USER_RULE = {"matcher": "", "hooks": [{"type": "command", "command": "user-script.sh"}]}
LEGACY_MODULE = {
    "matcher": "",
    "hooks": [{"type": "command", "command": '"/gone/python" -m aictl.hook_handler --event Stop --port 8484'}],
}
LEGACY_CURL = {"type": "command", "command": "curl -s -X POST http://localhost:8484/api/hooks -d @-"}
LEGACY_INLINE = {
    "matcher": "",
    "hooks": [{"type": "command", "command": "python3 -c \"import urllib; urlopen('http://localhost:1/api/hooks')\""}],
}


def _dump(data: object) -> str:
    return json.dumps(data, indent=2) + "\n"


# name → (original text or None for absent, the semantic result expected after uninstall)
FIXTURES: dict[str, tuple[str | None, dict]] = {
    "absent": (None, {}),
    "empty_file": ("", {}),
    "empty_object": ("{}\n", {}),
    "no_hooks": (_dump({"model": "x", "n": 1}), {"model": "x", "n": 1}),
    "empty_hooks": (_dump({"hooks": {}}), {}),
    "user_same_event": (_dump({"hooks": {"PreToolUse": [USER_RULE]}}), {"hooks": {"PreToolUse": [USER_RULE]}}),
    "user_other_event": (_dump({"hooks": {"Custom": [USER_RULE]}}), {"hooks": {"Custom": [USER_RULE]}}),
    "malformed_event_value": (
        _dump({"hooks": {"PreToolUse": "oops", "Stop": {"not": "a list"}}}),
        {"hooks": {"PreToolUse": "oops", "Stop": {"not": "a list"}}},
    ),
    "jsonc": (
        '{\n  // a user comment\n  "model": "x", /* inline */\n  "n": 1,\n}\n',
        {"model": "x", "n": 1},
    ),
    "single_line": ('{"model": "x"}', {"model": "x"}),
    "crlf": ('{\r\n  "model": "x"\r\n}\r\n', {"model": "x"}),
    "bom": ('\ufeff{\n  "model": "x"\n}\n', {"model": "x"}),
    "bom_crlf_jsonc": ('\ufeff{\r\n  // c\r\n  "model": "x",\r\n}\r\n', {"model": "x"}),
    "legacy_module": (
        _dump({"model": "x", "hooks": {"Stop": [LEGACY_MODULE, USER_RULE]}}),
        {"model": "x", "hooks": {"Stop": [USER_RULE]}},
    ),
    "legacy_flat_curl": (_dump({"hooks": {"PreToolUse": [LEGACY_CURL]}}), {}),
    "legacy_inline_dropped_event": (
        _dump({"hooks": {"WorktreeCreate": [LEGACY_INLINE], "Custom": [USER_RULE]}}),
        {"hooks": {"Custom": [USER_RULE]}},
    ),
    "legacy_mixed_group": (
        _dump(
            {
                "hooks": {
                    "Stop": [
                        {
                            "matcher": "",
                            "hooks": [LEGACY_MODULE["hooks"][0], USER_RULE["hooks"][0]],
                        }
                    ]
                }
            }
        ),
        {"hooks": {"Stop": [USER_RULE]}},
    ),
}
# Original had no aictl rule and no hooks key: the bytes must come back exactly.
BYTE_EXACT = {"no_hooks", "jsonc", "crlf", "single_line", "bom", "bom_crlf_jsonc"}


@pytest.fixture
def env(tmp_path, monkeypatch):
    """A complete fake machine. Any attempt to reach launchd fails the test."""
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(home / ".config"))
    monkeypatch.setenv("SHELL", "/bin/zsh")
    monkeypatch.delenv("CLAUDE_CONFIG_DIR", raising=False)
    monkeypatch.delenv("COPILOT_HOME", raising=False)
    monkeypatch.setattr(ig, "claude_global_dir", lambda: home / ".claude")
    monkeypatch.setattr(ig, "gemini_global_dir", lambda: home / ".gemini")
    monkeypatch.setattr(ig, "copilot_global_dir", lambda: home / ".copilot")
    monkeypatch.setattr(ig, "codex_global_dir", lambda: home / ".codex")
    vscode_dir = hook_removal.vscode_settings_paths(home)[0].parent
    monkeypatch.setattr(ig, "vscode_user_dir", lambda: vscode_dir)
    monkeypatch.setattr("aictl.commands.disable.vscode_user_dir", lambda: vscode_dir)

    def no_launchd(*args):
        raise AssertionError(f"launchd touched: {args}")

    monkeypatch.setattr(hook_removal, "_launchctl", no_launchd)
    monkeypatch.setattr(ig, "_run_env_persist", no_launchd)
    proj = tmp_path / "proj"
    proj.mkdir()
    monkeypatch.chdir(proj)
    return home


def _claude_path(home: Path) -> Path:
    return home / ".claude" / "settings.json"


def _gemini_path(home: Path) -> Path:
    return home / ".gemini" / "settings.json"


def _copilot_path(home: Path) -> Path:
    return home / ".copilot" / "hooks" / "aictl.json"


def _install_claude() -> None:
    ig._register_hook_file(ig._settings_path("user"), ig._build_hook_config(8484, None))


def _install_gemini() -> None:
    events = [e for e in ig.HOOK_EVENTS if e in ig.GEMINI_HOOK_MAP]
    rules = ig._build_hook_config(8484, events, event_map=ig.GEMINI_HOOK_MAP, matcher="*", source_tool="gemini")
    ig._register_hook_file(ig._gemini_settings_path("user"), rules)


def _install_copilot() -> None:
    ig._install_vscode_hooks("user", 8484, [])


TOOLS = {
    "claude": (_claude_path, _install_claude),
    "gemini": (_gemini_path, _install_gemini),
    "copilot": (_copilot_path, _install_copilot),
}


def _uninstall(path: Path) -> hook_removal.Result:
    sink = hook_removal._Sink(False)
    hook_removal.remove_from_hook_file(path, sink, delete_if_only=("version",))
    return sink.result


def _semantic(path: Path) -> dict:
    """Parsed content, with absent, empty and ``"hooks": {}`` all meaning nothing."""
    if not path.exists():
        return {}
    data = hook_removal.jsonc_loads(path.read_text(encoding="utf-8"))
    if data.get("hooks") == {}:
        del data["hooks"]
    return data


def _seed(path: Path, text: str | None) -> None:
    if text is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)


@pytest.mark.parametrize("fixture", sorted(FIXTURES))
@pytest.mark.parametrize("tool", sorted(TOOLS))
def test_install_twice_equals_install(env, tool, fixture):
    path_of, install = TOOLS[tool]
    path = path_of(env)
    _seed(path, FIXTURES[fixture][0])
    install()
    first = path.read_bytes()
    mtime = path.stat().st_mtime_ns
    install()
    assert path.read_bytes() == first
    assert path.stat().st_mtime_ns == mtime, "a no-op install must not rewrite the file"


@pytest.mark.parametrize("fixture", sorted(FIXTURES))
@pytest.mark.parametrize("tool", sorted(TOOLS))
def test_install_uninstall_equals_original(env, tool, fixture):
    path_of, install = TOOLS[tool]
    path = path_of(env)
    original, expected = FIXTURES[fixture]
    _seed(path, original)
    install()
    assert hook_removal.jsonc_loads(path.read_text(encoding="utf-8")).get("hooks"), "install wrote nothing"
    assert not _uninstall(path).failures
    result = _semantic(path)
    if tool == "copilot":
        result.pop("version", None)
    assert result == expected
    if fixture in BYTE_EXACT and tool != "copilot":
        assert path.read_bytes().decode() == original


@pytest.mark.parametrize("tool", sorted(TOOLS))
def test_uninstall_without_rules_leaves_bytes_and_mtime(env, tool):
    path = TOOLS[tool][0](env)
    original = '{\n    "model":   "weird spacing" // comment\n}\n'
    _seed(path, original)
    mtime = path.stat().st_mtime_ns
    _uninstall(path)
    assert path.read_text() == original
    assert path.stat().st_mtime_ns == mtime


@pytest.mark.parametrize("tool", sorted(TOOLS))
def test_symlinked_file_stays_a_link(env, tool, tmp_path):
    path_of, install = TOOLS[tool]
    path = path_of(env)
    dotfiles = tmp_path / "dotfiles" / "settings.json"
    dotfiles.parent.mkdir()
    original = _dump({"model": "x"})
    dotfiles.write_text(original)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.symlink_to(dotfiles)
    install()
    assert path.is_symlink() and path.resolve() == dotfiles.resolve()
    assert "hooks" in json.loads(dotfiles.read_text())
    _uninstall(path)
    assert path.is_symlink()
    result = json.loads(dotfiles.read_text())
    if tool == "copilot":
        result.pop("version", None)  # required by Copilot; this path is aictl's own file name
    assert result == {"model": "x"}


@pytest.mark.parametrize("tool", sorted(TOOLS))
def test_file_mode_is_kept(env, tool):
    path_of, install = TOOLS[tool]
    path = path_of(env)
    _seed(path, _dump({"model": "x"}))
    path.chmod(0o600)
    install()
    assert path.stat().st_mode & 0o777 == 0o600


def test_corrupt_file_is_never_rewritten_and_others_still_run(env):
    claude, gemini = _claude_path(env), _gemini_path(env)
    _seed(claude, "{broken")
    _install_gemini()
    runner = CliRunner()
    result = runner.invoke(disable, [], catch_exceptions=False)
    assert result.exit_code == 1
    assert claude.read_text() == "{broken"
    assert "hooks" not in _semantic(gemini)


def test_enable_with_one_corrupt_tool_registers_the_others(env):
    _seed(_gemini_path(env), "{broken")
    actions: list[str] = []
    ig._install_hooks("user", 8484, actions)
    assert any("Gemini" in a and "FAILED" in a for a in actions)
    assert _gemini_path(env).read_text() == "{broken"
    assert "hooks" in _semantic(_claude_path(env))
    assert "hooks" in _semantic(_copilot_path(env))


def test_jsonc_settings_are_not_treated_as_corrupt_by_force(env):
    """--force quarantines corrupt files: a commented file must not qualify."""
    path = _claude_path(env)
    _seed(path, '{\n  // keep me\n  "model": "x"\n}\n')
    ig._register_hook_file(path, ig._build_hook_config(8484, None), force=True)
    assert "// keep me" in path.read_text()
    assert not list(path.parent.glob("*.bak.*"))


def _tree(home: Path) -> dict[str, bytes]:
    return {str(p.relative_to(home)): p.read_bytes() for p in sorted(home.rglob("*")) if p.is_file()}


def _seed_whole_machine(home: Path) -> None:
    _seed(_claude_path(home), _dump({"model": "x", "hooks": {"PreToolUse": [USER_RULE]}}))
    vs = hook_removal.vscode_settings_paths(home)[0]
    _seed(
        vs,
        '{\n  // my editor\n  "editor.fontSize": 13,\n  "chat.useHooks": false,\n  '
        '"chat.hookFilesLocations": {\n    "tools/hooks": true\n  },\n}\n',
    )
    _seed(home / ".codex" / "config.toml", 'model = "o4"\n\n[tui]\nx = 1\n')
    _seed(home / ".zshrc", "# mine\nexport FOO=bar\n")


def test_full_enable_disable_restores_machine_byte_for_byte(env):
    _seed_whole_machine(env)
    before = _tree(env)
    runner = CliRunner()
    enabled = runner.invoke(ig.enable, ["--scope", "user"], catch_exceptions=False)
    assert enabled.exit_code == 0, enabled.output
    during = _tree(env)
    assert ".config/aictl/env.sh" in during and ".config/aictl/remove-hooks.py" in during
    assert "hook_handler.py" in during[".claude/settings.json"].decode()
    vs_key = str(hook_removal.vscode_settings_paths(env)[0].relative_to(env))
    assert b"// my editor" in during[vs_key]

    assert runner.invoke(ig.enable, ["--scope", "user"], catch_exceptions=False).exit_code == 0
    assert _tree(env) == during, "second enable changed something"

    disabled = runner.invoke(disable, [], catch_exceptions=False)
    assert disabled.exit_code == 0, disabled.output
    after = _tree(env)
    # Settings aictl created stay as an empty object: semantically the original.
    assert json.loads(after.pop(".gemini/settings.json")) == {}
    after.pop(".claude/settings.json")
    expected = dict(before)
    expected.pop(".claude/settings.json")
    assert after == expected
    assert json.loads(_claude_path(env).read_text()) == {"model": "x", "hooks": {"PreToolUse": [USER_RULE]}}


def test_disable_dry_run_changes_nothing(env):
    _seed_whole_machine(env)
    runner = CliRunner()
    assert runner.invoke(ig.enable, ["--scope", "user"], catch_exceptions=False).exit_code == 0
    before = _tree(env)
    result = runner.invoke(disable, ["--dry-run"], catch_exceptions=False)
    assert result.exit_code == 0
    assert _tree(env) == before
    assert "[dry-run]" in result.output and "env.sh" in result.output


def test_disable_cleans_what_an_older_aictl_left(env):
    """An older install: no manifest, old rules, a hand-disabled file, old settings."""
    _seed(_claude_path(env), _dump({"hooks": {"Stop": [LEGACY_MODULE, USER_RULE], "WorktreeCreate": [LEGACY_MODULE]}}))
    disabled_file = env / ".copilot" / "hooks" / "aictl.json.disabled"
    _seed(
        disabled_file,
        _dump({"hooks": {"Stop": [{"type": "command", "command": "py -m aictl.hook_handler --event Stop"}]}}),
    )
    vs = hook_removal.vscode_settings_paths(env)[0]
    _seed(
        vs,
        _dump(
            {
                "editor.fontSize": 13,
                "chat.useHooks": True,
                "chat.hookFilesLocations": {
                    ".github/hooks": True,
                    "~/.copilot/hooks": True,
                    ".claude/settings.json": True,
                    ".claude/settings.local.json": True,
                },
                "github.copilot.chat.otel.enabled": True,
                "github.copilot.chat.otel.exporterType": "otlp-http",
                "github.copilot.chat.otel.otlpEndpoint": "http://localhost:8484",
                "github.copilot.chat.otel.captureContent": True,
            }
        ),
    )
    _seed(
        env / ".codex" / "config.toml",
        'model = "o4"\n\n[otel]\n# managed by aictl — OTLP/JSON export to the aictl dashboard\nenvironment = "dev"\n',
    )
    _seed(env / ".bash_profile", "# >>> aictl env >>>\n[ -f x ] && . x\n# <<< aictl env <<<\nexport A=1\n")
    _seed(env / ".config" / "aictl" / "env.sh", "export AICTL_PORT=8484\n")

    result = CliRunner().invoke(disable, [], catch_exceptions=False)
    assert result.exit_code == 0, result.output

    assert json.loads(_claude_path(env).read_text()) == {"hooks": {"Stop": [USER_RULE]}}
    assert not disabled_file.exists()
    settings = json.loads(vs.read_text())
    assert settings == {"editor.fontSize": 13, "chat.useHooks": True}  # toggle left, and reported
    assert "--include-vscode-toggles" in result.output
    assert "[otel]" not in (env / ".codex" / "config.toml").read_text()
    assert (env / ".bash_profile").read_text() == "export A=1\n"
    assert not (env / ".config" / "aictl" / "env.sh").exists()


def test_vscode_toggle_flag_removes_legacy_toggles(env):
    vs = hook_removal.vscode_settings_paths(env)[0]
    _seed(vs, _dump({"editor.fontSize": 13, "chat.useHooks": True, "chat.useClaudeHooks": True}))
    result = CliRunner().invoke(disable, ["--include-vscode-toggles"], catch_exceptions=False)
    assert result.exit_code == 0, result.output
    assert json.loads(vs.read_text()) == {"editor.fontSize": 13}


def test_user_change_after_enable_is_not_reverted(env):
    vs = hook_removal.vscode_settings_paths(env)[0]
    _seed(vs, "{}\n")
    ig._enable_vscode("user", 8484, [])
    data = json.loads(vs.read_text())
    data["chat.useHooks"] = "mine now"
    vs.write_text(json.dumps(data))
    hook_removal.remove_everything(env, projects=[])
    assert json.loads(vs.read_text())["chat.useHooks"] == "mine now"


def test_standalone_remover_works_with_no_aictl_on_the_path(env, tmp_path):
    """The copy `aictl enable` leaves runs alone, under -I -S, with HOME as its only input."""
    _install_claude()
    _install_copilot()
    lone = tmp_path / "lone"
    lone.mkdir()
    script = lone / "remove-hooks.py"
    script.write_text(Path(hook_removal.__file__).read_text(encoding="utf-8"))
    child_env = {"HOME": str(env), "PATH": os.environ.get("PATH", "")}

    dry = subprocess.run(
        [sys.executable, "-I", "-S", str(script), "--dry-run", "--no-cwd"],
        capture_output=True,
        text=True,
        env=child_env,
        timeout=20,
        check=False,
    )
    assert dry.returncode == 0, dry.stderr
    assert "[dry-run]" in dry.stdout
    assert "hooks" in _semantic(_claude_path(env))

    real = subprocess.run(
        [sys.executable, "-I", "-S", str(script), "--no-cwd"],
        capture_output=True,
        text=True,
        env=child_env,
        timeout=20,
        check=False,
    )
    assert real.returncode == 0, real.stderr
    assert "hooks" not in _semantic(_claude_path(env))
    assert not _copilot_path(env).exists()


@pytest.mark.parametrize(
    "text",
    [
        '{\n  "a": 1\n}\n',
        '{"a": 1}',
        '{\n  "a": 1, // one\n  "b": [1, 2, {"c": "//not a comment"}]\n}\n',
        '{\n  /* head */\n  "a": "x,}y",\n  "b": {"d": 1,},\n}\n',
    ],
)
def test_jsonc_set_then_delete_is_lossless(text):
    added = hook_removal.jsonc_set(text, "hooks", {"Stop": [{"a": 1}]})
    assert hook_removal.jsonc_loads(added)["hooks"] == {"Stop": [{"a": 1}]}
    removed = hook_removal.jsonc_delete(added, "hooks")
    assert hook_removal.jsonc_loads(removed) == hook_removal.jsonc_loads(text)
    if ",\n}" not in text:
        assert removed == text


def test_jsonc_delete_middle_key_keeps_comments_of_others():
    text = '{\n  // first\n  "a": 1,\n  "b": 2,\n  // third\n  "c": 3\n}\n'
    assert hook_removal.jsonc_delete(text, "b") == '{\n  // first\n  "a": 1,\n  // third\n  "c": 3\n}\n'


@pytest.mark.parametrize("bad", ["{", '{"a": }', "[1, 2]", '{"a": 1} trailing', '{"a" 1}', '{"a": "unterminated}'])
def test_jsonc_loads_rejects_garbage(bad):
    with pytest.raises(hook_removal.JsoncError):
        hook_removal.jsonc_loads(bad)


def test_manifest_path_matches_platform_config_dir(env, monkeypatch, tmp_path):
    from aictl.platforms import config_dir

    assert hook_removal.aictl_config_dir(env) == config_dir()
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "xdg"))
    assert hook_removal.aictl_config_dir(env) == config_dir()
    assert hook_removal.manifest_path(env).parent == config_dir()


def test_manifest_drops_entries_for_files_that_are_gone(env, tmp_path):
    live = tmp_path / "settings.json"
    live.write_text("{}")
    path = hook_removal.manifest_path(env)
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({str(live): {"k": {}}, str(tmp_path / "gone.json"): {"k": {}}}))
    assert list(hook_removal.load_manifest(env)) == [str(live)]


def test_real_manifest_ignores_temp_paths(env, tmp_path, monkeypatch):
    """A test run reaching a real manifest must not leave entries that count."""
    import tempfile

    settings = tmp_path / "settings.json"
    settings.write_text("{}")
    outside = Path("/nonexistent-real-home/aictl/vscode-managed.json")
    assert not hook_removal._manifest_entry_is_live(str(settings), outside)
    assert hook_removal._manifest_entry_is_live(str(settings), Path(tempfile.gettempdir()) / "m.json")


def test_recording_prunes_stale_entries(env, tmp_path):
    path = hook_removal.manifest_path(env)
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({str(tmp_path / "gone.json"): {"k": {}}}))
    vs = hook_removal.vscode_settings_paths(env)[0]
    _seed(vs, "{}\n")
    ig._enable_vscode("user", 8484, [])
    assert list(json.loads(path.read_text())) == [str(vs)]
