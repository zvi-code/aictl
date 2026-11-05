"""Microsoft 365 Copilot: capability reporting, install detection, agent manifest checks, data rows."""

import csv
import json
from pathlib import Path

from aictl.monitoring.tool_config import (
    COPILOT365_LATEST_SCHEMA,
    collect_tool_configs,
    detect_copilot365_install,
    validate_declarative_agent,
)

DATA = Path(__file__).resolve().parent.parent / "src" / "aictl" / "data"

GOOD = {"version": "v1.9", "name": "A", "description": "d", "instructions": "Be brief."}


def _cfg(root):
    return {c.tool: c for c in collect_tool_configs(root)}.get("copilot365")


def test_reported_with_nothing_installed(tmp_path):
    """No M365 Copilot, no project files: still reported, with explicit not-available flags."""
    cfg = _cfg(tmp_path)
    assert cfg is not None
    d = cfg.to_dict()
    assert d["features"]["installed"] is False
    assert d["local_data"] == {
        "sessions": False,
        "tokens": False,
        "cost": False,
        "prompts": False,
        "responses": False,
    }
    assert any("not available from this machine" in h for h in d["hints"])


def test_other_tools_omit_local_data(tmp_path):
    for c in collect_tool_configs(tmp_path):
        if c.tool != "copilot365":
            assert "local_data" not in c.to_dict()


def test_install_detection(tmp_path):
    assert detect_copilot365_install(None) == []
    assert detect_copilot365_install(tmp_path) == []
    (tmp_path / "Packages" / "Microsoft.Copilot_8wekyb3d8bbwe").mkdir(parents=True)
    assert detect_copilot365_install(tmp_path) == ["Microsoft.Copilot_8wekyb3d8bbwe"]


def test_agent_package_discovered_and_validated(tmp_path):
    pkg = tmp_path / "appPackage"
    pkg.mkdir()
    (pkg / "manifest.json").write_text(
        json.dumps({"copilotAgents": {"declarativeAgents": [{"id": "x", "file": "agent.json"}]}})
    )
    old = dict(GOOD, version="v1.6", instructions="x" * 8001)
    (pkg / "agent.json").write_text(json.dumps(old))
    cfg = _cfg(tmp_path)
    (p,) = cfg.settings["agent_packages"]
    assert p["file"] == "agent.json" and p["schema_version"] == "v1.6"
    assert p["instructions_chars"] == 8001
    assert any("limit 8000" in i for i in p["issues"])
    assert any("v1.6" in h and "latest documented" in h for h in cfg.hints)


def test_validate_required_fields_and_limits():
    assert validate_declarative_agent(GOOD) == []
    assert COPILOT365_LATEST_SCHEMA == (1, 9)
    for missing in ("version", "name", "description", "instructions"):
        bad = {k: v for k, v in GOOD.items() if k != missing}
        assert validate_declarative_agent(bad), missing
    assert validate_declarative_agent(dict(GOOD, name="n" * 101))
    assert validate_declarative_agent(dict(GOOD, capabilities=[{"name": "WebSearch"}, {"name": "WebSearch"}]))
    assert validate_declarative_agent(dict(GOOD, conversation_starters=[{"text": "t"}] * 13))
    assert validate_declarative_agent(dict(GOOD, actions=[]))
    assert validate_declarative_agent([]) == ["manifest is not a JSON object"]


def test_copilot365_data_rows_valid():
    for name, ncols in (("paths-windows.csv", 18), ("paths-unix.csv", 18), ("processes-windows.csv", 22)):
        with open(DATA / name, newline="") as fh:
            rows = [r for r in csv.reader(fh) if r]
        assert all(len(r) == ncols for r in rows), name
        assert [r for r in rows[1:] if r[1] == "copilot365"], name
    # Rows without a primary source must say so in the description.
    for name, desc_idx in (("paths-windows.csv", 15), ("processes-windows.csv", 21)):
        with open(DATA / name, newline="") as fh:
            rows = [r for r in csv.reader(fh) if r]
        guessed = [r for r in rows if r[1] == "copilot365" and ("Copilot_8wekyb3d8bbwe" in r[0] or r[0] == "Copilot")]
        assert guessed and all("UNVERIFIED" in r[desc_idx] for r in guessed)
