"""The suite must not be able to reach the developer's real tool config.

A plain `pytest` used to rewrite ~/.gemini/settings.json and ~/.config/aictl/env.sh
and append every CLI run to the real mutation ledger: 24,154 entries, none of them
about a real file. `_isolated_mutation_ledger` hid the in-process half of that from
the ledger while the writes themselves still happened.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from conftest import REAL_HOME, REAL_HOME_ALLOWED

from aictl.mutation_ledger import _ledger_path
from aictl.platforms import config_dir

pytestmark = pytest.mark.skipif(REAL_HOME_ALLOWED, reason="AICTL_TEST_REAL_HOME=1 opts out of isolation")


def test_home_is_not_the_real_one() -> None:
    assert Path.home() != REAL_HOME
    assert os.path.expanduser("~") != str(REAL_HOME)


def test_aictl_config_dir_is_inside_the_test_home() -> None:
    assert config_dir().is_relative_to(Path.home())


def test_windows_config_dir_is_inside_the_test_home(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("aictl.platforms.IS_WINDOWS", True)
    assert config_dir().is_relative_to(Path.home())


def test_cli_subprocesses_inherit_the_test_home() -> None:
    out = subprocess.run(
        [sys.executable, "-c", "from pathlib import Path; print(Path.home())"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert Path(out.stdout.strip()) == Path.home()


@pytest.mark.parametrize("relative", [".config/aictl/guard-probe", ".gemini/guard-probe", ".claude/guard-probe"])
def test_writing_real_config_is_blocked(relative: str, real_home_violations: list[str]) -> None:
    target = REAL_HOME / relative
    try:
        with pytest.raises(PermissionError):
            target.write_text("must never land")
    finally:
        real_home_violations.clear()
    assert not target.exists()


def test_atomic_replace_onto_real_config_is_blocked(tmp_path: Path, real_home_violations: list[str]) -> None:
    source = tmp_path / "settings.tmp"
    source.write_text("{}")
    try:
        with pytest.raises(PermissionError):
            os.replace(source, REAL_HOME / ".gemini" / "guard-probe")
    finally:
        real_home_violations.clear()
    assert source.exists()


def test_reading_real_paths_is_allowed(real_home_violations: list[str]) -> None:
    Path(REAL_HOME / ".zshrc").exists()
    assert real_home_violations == []


def test_ledger_stays_out_of_the_real_config() -> None:
    assert not _ledger_path().is_relative_to(REAL_HOME / ".config")
