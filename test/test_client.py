"""Tests for aictl.client — ServerClient."""

from __future__ import annotations

from aictl.client import ServerClient


class TestServerClient:
    def test_try_connect_no_server(self):
        """Should return None when no server is running."""
        # Use a port that's almost certainly not in use
        client = ServerClient.try_connect(port=19999, timeout=0.5)
        assert client is None

    def test_constructor(self):
        client = ServerClient("http://127.0.0.1:8484")
        assert client.base_url == "http://127.0.0.1:8484"

    def test_constructor_strips_trailing_slash(self):
        client = ServerClient("http://127.0.0.1:8484/")
        assert client.base_url == "http://127.0.0.1:8484"

    def test_repr(self):
        client = ServerClient("http://localhost:8484")
        assert "localhost:8484" in repr(client)


class TestDashboardSnapshotFromDict:
    def test_round_trip(self):
        """from_dict should reconstruct a snapshot from to_dict output."""
        from aictl.dashboard.collector import DashboardSnapshot, DashboardTool
        from aictl.discovery import ResourceFile

        snap = DashboardSnapshot(
            timestamp=1000.0,
            root="/test",
            tools=[
                DashboardTool(
                    tool="claude-code",
                    label="Claude Code",
                    vendor="anthropic",
                    host="cli,vscode",
                    files=[ResourceFile(
                        path="/test/CLAUDE.md", tool="claude-code",
                        kind="instructions", size=100, tokens=25,
                    )],
                    processes=[{"pid": 123, "name": "claude", "cpu_pct": 5.0, "mem_mb": 256}],
                ),
            ],
        )

        d = snap.to_dict()
        restored = DashboardSnapshot.from_dict(d)

        assert restored.timestamp == 1000.0
        assert restored.root == "/test"
        assert len(restored.tools) == 1
        assert restored.tools[0].tool == "claude-code"
        assert restored.tools[0].vendor == "anthropic"
        assert len(restored.tools[0].files) == 1
        assert restored.tools[0].files[0].tokens == 25

    def test_from_empty_dict(self):
        from aictl.dashboard.collector import DashboardSnapshot
        snap = DashboardSnapshot.from_dict({})
        assert snap.timestamp == 0
        assert snap.tools == []
        assert snap.agent_memory == []

    def test_from_partial_dict(self):
        from aictl.dashboard.collector import DashboardSnapshot
        snap = DashboardSnapshot.from_dict({
            "timestamp": 2000.0,
            "root": "/x",
            "tools": [{"tool": "test", "label": "Test"}],
        })
        assert snap.timestamp == 2000.0
        assert len(snap.tools) == 1
        assert snap.tools[0].tool == "test"
