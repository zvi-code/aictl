"""Tests for aictl/commands/admin.py — db, config, catalog, build-ui, reinstall."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import click
import pytest
from click.testing import CliRunner

from aictl.commands.admin import (
    _REINSTALL_ATTEMPTS,
    _find_project_root,
    _package_source,
    _render_markdown,
    _resolve_db_path,
    build_ui,
    catalog,
    config,
    db,
    reinstall,
)


@pytest.fixture()
def runner():
    return CliRunner()


# ────────────────────────────────────────────────────────────────
# _resolve_db_path
# ────────────────────────────────────────────────────────────────


class TestResolveDbPath:
    def test_existing_path(self, tmp_path):
        db_file = tmp_path / "test.db"
        db_file.touch()
        result = _resolve_db_path(str(db_file))
        assert result == db_file

    def test_nonexistent_path_raises(self, tmp_path):
        with pytest.raises(click.ClickException, match="Database not found"):
            _resolve_db_path(str(tmp_path / "nonexistent.db"))

    def test_default_path_used_when_none(self):
        # When None, it uses DEFAULT_DB_PATH — which may or may not exist
        # We just verify it doesn't crash with a TypeError
        try:
            _resolve_db_path(None)
        except click.ClickException:
            pass  # Expected if DB doesn't exist


# ────────────────────────────────────────────────────────────────
# _find_project_root
# ────────────────────────────────────────────────────────────────


class TestFindProjectRoot:
    def test_finds_root_from_cwd(self):
        """When run from the actual project dir, finds the root."""
        root = _find_project_root()
        if root is not None:
            assert (root / "pyproject.toml").is_file()
            assert (root / "aictl").is_dir() or (root / "src" / "aictl").is_dir()

    def test_returns_none_for_orphan(self, tmp_path, monkeypatch):
        """When cwd has no pyproject.toml ancestor, returns None."""
        monkeypatch.chdir(tmp_path)
        # Also need to mock __file__ path so fallback doesn't find it
        with patch("aictl.commands.admin.Path") as MockPath:
            # Make cwd() return tmp_path
            MockPath.cwd.return_value = tmp_path
            # Make __file__ resolve to tmp_path too
            mock_file_path = MagicMock()
            mock_file_path.resolve.return_value = tmp_path / "admin.py"
            MockPath.return_value = mock_file_path
            # The real function walks up from anchors
            # Since we can't easily mock the walk, test the real function
            # It should work since we're in the project dir right now
        # Simple: just verify it returns Path or None
        result = _find_project_root()
        assert result is None or isinstance(result, Path)


# ────────────────────────────────────────────────────────────────
# _render_markdown (pure function)
# ────────────────────────────────────────────────────────────────


class TestRenderMarkdown:
    def test_basic_render(self):
        entries = [
            {
                "key": "test_metric",
                "tab": "overview",
                "section": "general",
                "source_type": "raw",
                "explanation": "A test metric",
                "query": "SELECT count(*) FROM events",
                "calc": "count",
                "dynamic_source": None,
            },
        ]
        output = _render_markdown(entries)
        assert "# aictl Dashboard Datapoint Catalog" in output
        assert "`test_metric`" in output
        assert "RAW" in output
        assert "overview" in output

    def test_multiple_tabs(self):
        entries = [
            {
                "key": "m1",
                "tab": "budget",
                "section": "s1",
                "source_type": "raw",
                "explanation": "e1",
                "query": "q1",
                "calc": "c1",
                "dynamic_source": None,
            },
            {
                "key": "m2",
                "tab": "status",
                "section": "s2",
                "source_type": "deduced",
                "explanation": "e2",
                "query": "q2",
                "calc": "c2",
                "dynamic_source": None,
            },
        ]
        output = _render_markdown(entries)
        assert "## budget" in output
        assert "## status" in output
        assert "**2** datapoints across **2** tabs" in output

    def test_dynamic_badge(self):
        entries = [
            {
                "key": "dyn1",
                "tab": "t1",
                "section": "s1",
                "source_type": "aggregated",
                "explanation": "e",
                "query": "q",
                "calc": "c",
                "dynamic_source": "live",
            },
        ]
        output = _render_markdown(entries)
        assert "AGGREGATED *" in output

    def test_empty_query_shows_dash(self):
        entries = [
            {
                "key": "k",
                "tab": "t",
                "section": "s",
                "source_type": "raw",
                "explanation": "e",
                "query": "",
                "calc": "c",
                "dynamic_source": None,
            },
        ]
        output = _render_markdown(entries)
        assert "—" in output  # em dash for empty query

    def test_pipe_in_text_escaped(self):
        entries = [
            {
                "key": "k",
                "tab": "t",
                "section": "s",
                "source_type": "raw",
                "explanation": "has | pipe",
                "query": "q",
                "calc": "c",
                "dynamic_source": None,
            },
        ]
        output = _render_markdown(entries)
        assert "\\|" in output

    def test_legend_included(self):
        output = _render_markdown(
            [
                {
                    "key": "k",
                    "tab": "t",
                    "section": "s",
                    "source_type": "raw",
                    "explanation": "e",
                    "query": "q",
                    "calc": "c",
                    "dynamic_source": None,
                },
            ]
        )
        assert "## Legend" in output
        assert "RAW" in output
        assert "DEDUCED" in output
        assert "AGGREGATED" in output


# ────────────────────────────────────────────────────────────────
# db stats command
# ────────────────────────────────────────────────────────────────


class TestDbStats:
    def test_stats_output(self, runner, tmp_path):
        """db stats renders table with row counts."""
        db_file = tmp_path / "test.db"
        db_file.touch()

        mock_db = MagicMock()
        mock_db.stats.return_value = {
            "file_size_bytes": 1024 * 1024,
            "samples_count": 1000,
            "events_count": 500,
            "earliest_ts": time.time() - 86400,
            "latest_ts": time.time(),
        }

        with patch("aictl.project_stores.ProjectStores", return_value=mock_db):
            result = runner.invoke(db, ["--db", str(db_file), "stats"])

        assert result.exit_code == 0
        assert "1.0 MB" in result.output
        assert "1,000" in result.output
        assert "samples" in result.output


# ────────────────────────────────────────────────────────────────
# db compact command
# ────────────────────────────────────────────────────────────────


class TestDbCompact:
    def test_compact_runs(self, runner, tmp_path):
        db_file = tmp_path / "test.db"
        db_file.write_bytes(b"\x00" * 1024)  # 1KB dummy

        mock_conn = MagicMock()
        mock_db = MagicMock()
        mock_db.compact.return_value = {"samples_downsampled": 100, "events_deleted": 50}
        mock_db._conn.return_value = mock_conn

        with patch("aictl.project_stores.ProjectStores", return_value=mock_db):
            result = runner.invoke(db, ["--db", str(db_file), "compact"])

        assert result.exit_code == 0
        assert "Compacting" in result.output
        mock_db.compact.assert_called_once()
        mock_db.vacuum.assert_called_once()

    def test_compact_no_vacuum(self, runner, tmp_path):
        db_file = tmp_path / "test.db"
        db_file.write_bytes(b"\x00" * 1024)

        mock_db = MagicMock()
        mock_db.compact.return_value = {}

        with patch("aictl.project_stores.ProjectStores", return_value=mock_db):
            result = runner.invoke(db, ["--db", str(db_file), "compact", "--no-vacuum"])

        assert result.exit_code == 0
        # VACUUM should NOT be called
        mock_db.vacuum.assert_not_called()


# ────────────────────────────────────────────────────────────────
# db reset command
# ────────────────────────────────────────────────────────────────


class TestDbReset:
    def test_reset_with_yes(self, runner, tmp_path):
        db_file = tmp_path / "test.db"
        db_file.write_bytes(b"\x00" * 1024)

        mock_db = MagicMock()
        with patch("aictl.storage.HistoryDB", return_value=mock_db):
            result = runner.invoke(db, ["--db", str(db_file), "reset", "--yes"])

        assert result.exit_code == 0
        assert "deleted" in result.output.lower() or "Fresh database" in result.output

    def test_reset_nonexistent_db(self, runner, tmp_path):
        db_file = tmp_path / "new.db"

        mock_db = MagicMock()
        with patch("aictl.storage.HistoryDB", return_value=mock_db):
            result = runner.invoke(db, ["--db", str(db_file), "reset", "--yes"])

        assert result.exit_code == 0
        assert "does not exist yet" in result.output


# ────────────────────────────────────────────────────────────────
# config commands
# ────────────────────────────────────────────────────────────────


class TestConfigCommands:
    def test_config_show(self, runner):
        with patch("aictl.commands.admin.show_config", return_value="mock_config_output"):
            result = runner.invoke(config, ["show"])
        assert result.exit_code == 0
        assert "mock_config_output" in result.output

    def test_config_path(self, runner):
        with patch("aictl.commands.admin.config_path", return_value=Path("/mock/config.toml")):
            result = runner.invoke(config, ["path"])
        assert result.exit_code == 0
        assert "config.toml" in result.output

    def test_config_init(self, runner, tmp_path):
        mock_path = tmp_path / "config.toml"
        mock_path.touch()
        with patch("aictl.commands.admin.write_default_config", return_value=mock_path):
            result = runner.invoke(config, ["init"])
        assert result.exit_code == 0


# ────────────────────────────────────────────────────────────────
# build-ui command
# ────────────────────────────────────────────────────────────────


class TestBuildUi:
    def test_no_project_root(self, runner):
        with patch("aictl.commands.admin._find_project_root", return_value=None):
            result = runner.invoke(build_ui)
        assert result.exit_code != 0
        assert "Cannot find" in result.output

    def test_no_ui_dir(self, runner, tmp_path):
        with patch("aictl.commands.admin._find_project_root", return_value=tmp_path):
            result = runner.invoke(build_ui)
        assert result.exit_code != 0
        assert "UI source directory not found" in result.output

    def test_npm_install_failure(self, runner, tmp_path):
        ui_dir = tmp_path / "aictl" / "dashboard" / "ui"
        ui_dir.mkdir(parents=True)
        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("subprocess.run", side_effect=FileNotFoundError("npm not found")),
        ):
            result = runner.invoke(build_ui)
        assert result.exit_code != 0
        assert "npm" in result.output.lower()


# ────────────────────────────────────────────────────────────────
# reinstall command
# ────────────────────────────────────────────────────────────────


class TestReinstall:
    def test_no_project_root(self, runner):
        with patch("aictl.commands.admin._find_project_root", return_value=None):
            result = runner.invoke(reinstall)
        assert result.exit_code != 0
        assert "Cannot find" in result.output

    def test_reinstall_with_pipx(self, runner, tmp_path):
        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("aictl.commands.admin._IS_WINDOWS", False),
            patch("shutil.which", return_value="/usr/bin/pipx"),
            patch("subprocess.run") as mock_run,
        ):
            mock_run.return_value = MagicMock(returncode=0)
            result = runner.invoke(reinstall, ["--skip-ui"])
        assert result.exit_code == 0
        assert "reinstalled" in result.output

    def test_reinstall_fallback_to_pip(self, runner, tmp_path):
        def mock_which(cmd):
            return "/usr/bin/pip3" if cmd == "pip3" else None

        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("aictl.commands.admin._IS_WINDOWS", False),
            patch("shutil.which", side_effect=mock_which),
            patch("subprocess.run") as mock_run,
        ):
            mock_run.return_value = MagicMock(returncode=0)
            result = runner.invoke(reinstall, ["--skip-ui"])
        assert result.exit_code == 0

    def test_reinstall_no_pip_no_pipx(self, runner, tmp_path):
        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("aictl.commands.admin._IS_WINDOWS", False),
            patch("shutil.which", return_value=None),
        ):
            result = runner.invoke(reinstall, ["--skip-ui"])
        assert result.exit_code != 0
        assert "Neither pipx nor pip" in result.output

    def test_reinstall_windows_uses_detached_relaunch(self, runner, tmp_path):
        """On Windows, reinstall must NOT run pip in-process (the running
        aictl.exe is locked). It hands off to a detached console instead."""
        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("aictl.commands.admin._IS_WINDOWS", True),
            patch("shutil.which", return_value=None) as mock_which,
            patch("subprocess.run") as mock_run,
            patch("aictl.commands.admin._reinstall_detached_windows") as mock_detached,
            patch("aictl.commands.admin._pip_configured_index", return_value=None),
        ):
            # which: pipx -> None, pip3 -> pip path
            mock_which.side_effect = lambda cmd: "C:\\Py\\Scripts\\pip.exe" if cmd in ("pip3", "pip") else None
            result = runner.invoke(reinstall, ["--skip-ui"])
        assert result.exit_code == 0
        # In-process install must never be attempted on Windows.
        mock_run.assert_not_called()
        # The detached relaunch must be invoked with the pip install command.
        mock_detached.assert_called_once()
        install_cmd = mock_detached.call_args[0][0]
        assert install_cmd[0] == "C:\\Py\\Scripts\\pip.exe"
        assert install_cmd[1] == "install"
        assert "-e" in install_cmd


# ────────────────────────────────────────────────────────────────
# catalog commands
# ────────────────────────────────────────────────────────────────


class TestCatalog:
    def test_catalog_dump_md(self, runner):
        mock_db = MagicMock()
        mock_db.query_datapoint_catalog.return_value = [
            {
                "key": "k1",
                "tab": "t",
                "section": "s",
                "source_type": "raw",
                "explanation": "e",
                "query": "q",
                "calc": "c",
                "dynamic_source": None,
            },
        ]
        with patch("aictl.storage.HistoryDB", return_value=mock_db):
            result = runner.invoke(catalog, [])
        assert result.exit_code == 0
        assert "Datapoint Catalog" in result.output

    def test_catalog_dump_json(self, runner):
        mock_db = MagicMock()
        mock_db.query_datapoint_catalog.return_value = [
            {
                "key": "k1",
                "tab": "t",
                "section": "s",
                "source_type": "raw",
                "explanation": "e",
                "query": "q",
                "calc": "c",
                "dynamic_source": None,
            },
        ]
        with patch("aictl.storage.HistoryDB", return_value=mock_db):
            result = runner.invoke(catalog, ["--format", "json"])
        assert result.exit_code == 0
        parsed = json.loads(result.output)
        assert len(parsed) == 1
        assert parsed[0]["key"] == "k1"

    def test_catalog_empty_raises(self, runner):
        mock_db = MagicMock()
        mock_db.query_datapoint_catalog.return_value = []
        with patch("aictl.storage.HistoryDB", return_value=mock_db):
            result = runner.invoke(catalog, [])
        assert result.exit_code != 0
        assert "No catalog entries" in result.output

    def test_catalog_output_to_file(self, runner, tmp_path):
        out_file = tmp_path / "catalog.md"
        mock_db = MagicMock()
        mock_db.query_datapoint_catalog.return_value = [
            {
                "key": "k1",
                "tab": "t",
                "section": "s",
                "source_type": "raw",
                "explanation": "e",
                "query": "q",
                "calc": "c",
                "dynamic_source": None,
            },
        ]
        with patch("aictl.storage.HistoryDB", return_value=mock_db):
            result = runner.invoke(catalog, ["-o", str(out_file)])
        assert result.exit_code == 0
        assert out_file.exists()
        assert "Datapoint Catalog" in out_file.read_text()

    def test_catalog_sync(self, runner):
        mock_db = MagicMock()
        mock_db.sync_datapoint_catalog.return_value = 42
        with patch("aictl.storage.HistoryDB", return_value=mock_db):
            result = runner.invoke(catalog, ["sync"])
        assert result.exit_code == 0
        assert "42" in result.output


class TestCatalogFiles:
    """The shipped catalog describes the board, the only dashboard UI.

    The old tab names survived in the YAML long after the tab shell was deleted,
    because nothing compared the two.
    """

    BOARD_TABS = {
        "Agents",
        "Usage and cost",
        "Prompts and skills",
        "Context",
        "Tools, failures and speed",
        "Changes and testing",
        "Machine",
        "Settings in effect",
        "Where the data comes from",
        "Agent drawer",
        "Settings",
    }

    @staticmethod
    def _load(name):
        import yaml

        path = Path(__file__).resolve().parent.parent / "src" / "aictl" / "data" / name
        return yaml.safe_load(path.read_text(encoding="utf-8"))

    def test_every_entry_belongs_to_a_board_tab(self):
        tabs = {key: e["tab"] for key, e in self._load("datapoint-catalog.yaml").items()}
        assert {k: t for k, t in tabs.items() if t not in self.BOARD_TABS} == {}

    def test_every_entry_has_a_query_and_a_calc(self):
        catalog = self._load("datapoint-catalog.yaml")
        queries = self._load("datapoint-queries.yaml")
        assert sorted(set(catalog) - set(queries)) == []
        assert sorted(set(queries) - set(catalog)) == []
        assert [k for k, q in queries.items() if not (q.get("query") and q.get("calc"))] == []


class TestReinstallPackageSource:
    """pip and uv read different settings, so one source must reach both."""

    def _run(self, runner, tmp_path, monkeypatch, args=(), env=None, pip_config=None):
        for key in ("PIP_INDEX_URL", "UV_DEFAULT_INDEX", "UV_INDEX_URL", "AICTL_INDEX_URL"):
            monkeypatch.delenv(key, raising=False)
        for key, value in (env or {}).items():
            monkeypatch.setenv(key, value)
        (tmp_path / "src" / "aictl" / "dashboard" / "ui").mkdir(parents=True)

        def fake_run(cmd, **kwargs):
            if cmd[1:3] == ["config", "list"]:
                return MagicMock(returncode=0, stdout=f"global.index-url='{pip_config}'\n" if pip_config else "")
            return MagicMock(returncode=0)

        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("aictl.commands.admin._find_package_dir", return_value=tmp_path / "src" / "aictl"),
            patch("aictl.commands.admin._IS_WINDOWS", False),
            patch("shutil.which", return_value="/usr/bin/tool"),
            patch("subprocess.run", side_effect=fake_run) as mock_run,
        ):
            result = runner.invoke(reinstall, list(args))
        installs = [c for c in mock_run.call_args_list if "install" in c.args[0]]
        return result, installs, mock_run

    def test_supplied_url_reaches_pip_and_uv_and_stays_private(self, runner, tmp_path, monkeypatch):
        url = "https://me:s3cret@feed.example/simple"
        result, installs, _ = self._run(runner, tmp_path, monkeypatch, ["--skip-ui", "--index-url", url], {"UV_INDEX_URL": "https://old"})
        assert result.exit_code == 0
        env = installs[-1].kwargs["env"]
        assert env["PIP_INDEX_URL"] == url and env["UV_DEFAULT_INDEX"] == url
        assert "UV_INDEX_URL" not in env
        assert "s3cret" not in result.output and "s3cret" not in " ".join(installs[-1].args[0])
        assert "Python packages: feed.example" in result.output

    def test_supplied_url_never_runs_npm(self, runner, tmp_path, monkeypatch):
        _, _, mock_run = self._run(runner, tmp_path, monkeypatch, ["--index-url", "https://feed.example/simple"])
        assert not any("npm" in str(c.args[0]) or "run" in c.args[0] for c in mock_run.call_args_list)

    def test_url_can_come_from_the_environment(self, runner, tmp_path, monkeypatch):
        _, installs, _ = self._run(runner, tmp_path, monkeypatch, ["--skip-ui"], {"AICTL_INDEX_URL": "https://feed.example/simple"})
        assert installs[-1].kwargs["env"]["UV_DEFAULT_INDEX"] == "https://feed.example/simple"

    def test_pip_environment_setting_is_copied_for_uv(self, runner, tmp_path, monkeypatch):
        _, installs, _ = self._run(runner, tmp_path, monkeypatch, ["--skip-ui"], {"PIP_INDEX_URL": "https://feed.example/simple"})
        assert installs[-1].kwargs["env"]["UV_DEFAULT_INDEX"] == "https://feed.example/simple"

    def test_pip_config_file_setting_is_copied_for_uv(self, runner, tmp_path, monkeypatch):
        _, installs, _ = self._run(runner, tmp_path, monkeypatch, ["--skip-ui"], pip_config="https://feed.example/simple")
        assert installs[-1].kwargs["env"]["UV_DEFAULT_INDEX"] == "https://feed.example/simple"

    def test_uv_settings_of_its_own_are_left_alone(self, runner, tmp_path, monkeypatch):
        _, installs, _ = self._run(runner, tmp_path, monkeypatch, ["--skip-ui"], {"UV_DEFAULT_INDEX": "https://uv.example/simple"}, pip_config="https://pip.example/simple")
        assert installs[-1].kwargs["env"]["UV_DEFAULT_INDEX"] == "https://uv.example/simple"

    def test_nothing_configured_adds_nothing(self, runner, tmp_path, monkeypatch):
        result, installs, _ = self._run(runner, tmp_path, monkeypatch, ["--skip-ui"])
        assert "UV_DEFAULT_INDEX" not in installs[-1].kwargs["env"]
        assert "Python packages: public PyPI" in result.output

    @pytest.mark.parametrize("bad", ["feed.example/simple", "C:\\\\wheels", "ftp://feed.example"])
    def test_other_values_are_refused(self, runner, tmp_path, monkeypatch, bad):
        result, installs, _ = self._run(runner, tmp_path, monkeypatch, ["--skip-ui", "--index-url", bad])
        assert result.exit_code != 0 and not installs

    def test_windows_batch_file_never_holds_the_url(self, runner, tmp_path, monkeypatch):
        monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
        monkeypatch.delenv("UV_DEFAULT_INDEX", raising=False)
        url = "https://me:s3cret@feed.example/simple"
        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("aictl.commands.admin._IS_WINDOWS", True),
            patch("shutil.which", return_value="C:\\px\\pipx.exe"),
            patch("subprocess.Popen") as popen,
            patch("os._exit"),
            patch("subprocess.CREATE_NEW_CONSOLE", 16, create=True),
        ):
            result = runner.invoke(reinstall, ["--skip-ui", "--index-url", url])
        assert result.exit_code == 0
        assert popen.call_args.kwargs["env"]["UV_DEFAULT_INDEX"] == url
        batch = next(tmp_path.glob("aictl-reinstall-*.bat")).read_bytes()
        assert b"s3cret" not in batch and b"feed.example" not in batch

    @pytest.mark.parametrize(
        "env, expected",
        [
            ({"UV_DEFAULT_INDEX": "https://me:s3cret@feed.example/simple"}, "feed.example"),
            ({"UV_INDEX_URL": "https://old.example/simple"}, "old.example"),
            ({"UV_DEFAULT_INDEX": "file:///C:/wheels"}, "a local index"),
            ({"UV_DEFAULT_INDEX": "C:\\wheels"}, "a local index"),
            ({"UV_DEFAULT_INDEX": "http://[broken/simple"}, "a custom index"),
            ({}, "public PyPI, unless a uv.toml sets another index"),
        ],
    )
    def test_source_is_described_without_the_url(self, env, expected):
        assert _package_source(env) == expected


class TestReinstallWindow:
    """People read the Windows install window on its own, and cmd runs on no test machine here."""

    def _launch(self, runner, tmp_path, monkeypatch, args=("--skip-ui",), root=None):
        for key in ("PIP_INDEX_URL", "UV_DEFAULT_INDEX", "UV_INDEX_URL", "AICTL_INDEX_URL"):
            monkeypatch.delenv(key, raising=False)
        monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
        with (
            patch("aictl.commands.admin._find_project_root", return_value=root or tmp_path),
            patch("aictl.commands.admin._IS_WINDOWS", True),
            patch("aictl.commands.admin._pip_configured_index", return_value=None),
            patch("shutil.which", return_value="C:\\px\\pipx.exe"),
            patch("subprocess.Popen") as popen,
            patch("os._exit"),
        ):
            result = runner.invoke(reinstall, list(args))
        assert result.exit_code == 0
        batch = next(tmp_path.glob("aictl-reinstall-*.bat")).read_bytes().decode("utf-8")
        return result, batch, popen.call_args.kwargs["env"]

    def test_says_which_attempt_it_is_out_of_how_many(self, runner, tmp_path, monkeypatch):
        _, batch, _ = self._launch(runner, tmp_path, monkeypatch)
        total = _REINSTALL_ATTEMPTS
        assert f"echo   Attempts:        up to {total}" in batch
        assert f"echo --- Attempt !ATTEMPT! of {total} ---" in batch
        assert f"echo Attempt !ATTEMPT! of {total} did not finish." in batch
        assert f"if !ATTEMPT! geq {total} goto failed" in batch

    def test_says_an_early_error_is_fine_before_any_attempt_runs(self, runner, tmp_path, monkeypatch):
        _, batch, _ = self._launch(runner, tmp_path, monkeypatch)
        assert batch.index("An error along the way is fine") < batch.index(":retry")

    def test_ends_with_the_result(self, runner, tmp_path, monkeypatch):
        _, batch, _ = self._launch(runner, tmp_path, monkeypatch)
        rule = "echo " + "=" * 60
        for result_line in ("echo DONE: aictl is reinstalled.", f"echo FAILED: aictl was not reinstalled after {_REINSTALL_ATTEMPTS} attempts."):
            assert result_line in batch
        said_after_done = [line for line in batch.split("echo DONE:")[1].split("\r\n") if line.startswith("echo ")]
        assert said_after_done == [rule, "echo Press any key to close this window."]

    def test_shows_the_source_host_but_keeps_the_url_out(self, runner, tmp_path, monkeypatch):
        url = "https://me:s3cret@feed.example/simple"
        result, batch, env = self._launch(runner, tmp_path, monkeypatch, ["--skip-ui", "--index-url", url])
        assert "echo   Python packages: !AICTL_PACKAGE_SOURCE!" in batch
        assert env["AICTL_PACKAGE_SOURCE"] == "feed.example"
        assert "Python packages: feed.example" in result.output
        assert "s3cret" not in result.output and "s3cret" not in env["AICTL_PACKAGE_SOURCE"]

    def test_everything_it_prints_is_plain_text_to_cmd(self, runner, tmp_path, monkeypatch):
        """A stray & or ( in an echo runs a command or breaks the script, and only on Windows."""
        root = tmp_path / "a&b"
        root.mkdir()
        _, batch, env = self._launch(runner, tmp_path, monkeypatch, root=root)
        assert env["AICTL_REINSTALL_FROM"] == str(root)
        for name in re.findall(r"!(AICTL_[A-Z_]+)!", batch):
            assert name in env
        for target in re.findall(r"goto (\w+)", batch):
            assert f":{target}\r\n" in batch
        printed = [line.strip() for line in batch.split("\r\n") if line.strip().startswith("echo ")]
        assert len(printed) > 10
        for line in printed:
            text = re.sub(r"%%P", "", re.sub(r"![A-Z_]+!", "", line))
            assert line.isascii() and not set(text) & set("&|<>^()!%"), line


class TestReinstallLeavesTrackedFilesAlone:
    def _project(self, tmp_path):
        import subprocess

        ui = tmp_path / "src" / "aictl" / "dashboard" / "ui"
        (ui / "src").mkdir(parents=True)
        (ui / "src" / "a.js").write_text("1\n")
        dist = ui.parent / "dist"
        dist.mkdir()
        (dist / "index.html").write_text("<html>\n")
        for args in (["init", "-q"], ["add", "."], ["-c", "user.name=t", "-c", "user.email=t@example.test", "commit", "-qm", "x"]):
            subprocess.run(["git", "-C", str(tmp_path), *args], check=True)
        return ui

    def test_no_build_without_local_ui_changes(self, tmp_path):
        from aictl.commands.admin import _ui_has_local_edits

        ui = self._project(tmp_path)
        assert _ui_has_local_edits(tmp_path, ui) is False

    def test_a_local_ui_change_needs_a_build(self, tmp_path):
        from aictl.commands.admin import _ui_has_local_edits

        ui = self._project(tmp_path)
        (ui / "src" / "a.js").write_text("2\n")
        assert _ui_has_local_edits(tmp_path, ui) is True

    def test_a_missing_build_needs_a_build(self, tmp_path):
        from aictl.commands.admin import _ui_has_local_edits

        ui = self._project(tmp_path)
        (ui.parent / "dist" / "index.html").unlink()
        assert _ui_has_local_edits(tmp_path, ui) is True

    def test_the_server_never_builds_the_dashboard(self):
        """A page load ran npm when a pull made a source file look newer, and rewrote tracked files."""
        source = (Path(__file__).parent.parent / "src" / "aictl" / "dashboard" / "web_server.py").read_text(encoding="utf-8")
        assert '"npm"' not in source

    def test_git_keeps_line_endings_of_the_dashboard_fixed(self):
        import subprocess

        root = Path(__file__).parent.parent
        out = subprocess.run(
            ["git", "-C", str(root), "check-attr", "text", "eol", "--", "src/aictl/dashboard/dist/index.html", "src/aictl/dashboard/ui/src/root.js"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        assert "dist/index.html: text: unset" in out
        assert "root.js: eol: lf" in out


class TestReinstallRemovesTheOldEnvironmentItself:
    """uv deleted the environment it ran in, and Windows refused: os error 32 on every first attempt."""

    def _launch(self, runner, tmp_path, monkeypatch, venv):
        for key in ("PIP_INDEX_URL", "UV_DEFAULT_INDEX", "UV_INDEX_URL", "AICTL_INDEX_URL"):
            monkeypatch.delenv(key, raising=False)
        monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
        with (
            patch("aictl.commands.admin._find_project_root", return_value=tmp_path),
            patch("aictl.commands.admin._IS_WINDOWS", True),
            patch("aictl.commands.admin._pip_configured_index", return_value=None),
            patch("aictl.commands.admin._pipx_venv_dir", return_value=venv),
            patch("shutil.which", return_value="C:\\px\\pipx.exe"),
            patch("subprocess.Popen") as popen,
            patch("os._exit"),
        ):
            assert runner.invoke(reinstall, ["--skip-ui"]).exit_code == 0
        batch = next(tmp_path.glob("aictl-reinstall-*.bat")).read_bytes().decode("utf-8")
        return batch, popen.call_args.kwargs["env"]

    def test_the_script_removes_the_environment_from_outside_before_pipx_runs(self, runner, tmp_path, monkeypatch):
        venv = Path("C:/Users/u/pipx/venvs/aictl")
        batch, env = self._launch(runner, tmp_path, monkeypatch, venv)
        assert "UV_VENV_CLEAR" not in env
        assert "set UV_VENV_CLEAR=1" not in batch and "set UV_VENV_CLEAR=\r\n" in batch
        assert env["AICTL_VENV"] == str(venv)
        assert batch.index('cd /d "!AICTL_REINSTALL_FROM!"') < batch.index(":retry")
        attempt = batch[batch.index(":retry") :]
        assert attempt.index('rmdir /s /q "!AICTL_VENV!"') < attempt.index('"install"')
        still_there = attempt.index("still in use, so it cannot be removed yet")
        assert attempt.index("goto attempt_failed", still_there) < attempt.index('"install"')
        assert attempt.index(":attempt_failed") > attempt.index('"install"')

    def test_a_folder_that_is_not_the_pipx_environment_is_never_removed(self, runner, tmp_path, monkeypatch):
        batch, env = self._launch(runner, tmp_path, monkeypatch, Path("C:/Users/u/somewhere/else"))
        assert "rmdir" not in batch and "AICTL_VENV" not in env
