# Tests for the subprocess-based env-persistence helper (#11).

import subprocess

from aictl.commands.integrations import _run_env_persist


class TestRunEnvPersist:
    def test_uses_list_argv_no_shell(self, monkeypatch):
        seen = {}

        def fake_run(argv, check=False, capture_output=False, text=False):
            seen["argv"] = argv
            seen["kwargs"] = dict(check=check, capture_output=capture_output, text=text)

            class R:
                returncode = 0
                stderr = ""
            return R()

        monkeypatch.setattr(subprocess, "run", fake_run)
        _run_env_persist(["setx", "AICTL_PORT", "8484"])
        assert seen["argv"] == ["setx", "AICTL_PORT", "8484"]
        # List argv means no shell — value can't inject commands.
        assert seen["kwargs"]["capture_output"] is True
        assert seen["kwargs"]["text"] is True
        # check=False so non-zero exits don't raise.
        assert seen["kwargs"]["check"] is False

    def test_nonzero_exit_warns_and_continues(self, monkeypatch, capsys):
        class R:
            returncode = 1
            stderr = "setx: access denied"

        monkeypatch.setattr(subprocess, "run", lambda *a, **k: R())
        _run_env_persist(["setx", "FOO", "bar"])
        captured = capsys.readouterr()
        assert "warning:" in captured.err
        assert "setx" in captured.err
        assert "access denied" in captured.err

    def test_os_error_is_swallowed(self, monkeypatch, capsys):
        def boom(*a, **k):
            raise FileNotFoundError("no setx")

        monkeypatch.setattr(subprocess, "run", boom)
        # Must not raise — env persistence is best-effort.
        _run_env_persist(["setx", "FOO", "bar"])
        captured = capsys.readouterr()
        assert "warning:" in captured.err


class TestNoOsSystemRemaining:
    """Belt-and-braces: ensure no os.system sneaks back into integrations.py."""

    def test_integrations_has_no_os_system(self):
        from pathlib import Path
        import aictl.commands.integrations as mod
        src = Path(mod.__file__).read_text(encoding="utf-8")
        assert "os.system(" not in src, (
            "os.system is banned in integrations.py — use _run_env_persist "
            "or subprocess.run with list argv instead."
        )
