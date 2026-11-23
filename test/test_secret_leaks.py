"""No credential written in a discovered config file leaves aictl unmasked.

A fake HOME and project hold MCP server definitions and settings files with
obviously fake secrets in every place a credential is written: env values,
headers, arguments, URLs. Every output the dashboard routes and the exports
produce from that tree is checked for each secret value.

To guard a new route or export, add one entry to ``OUTPUTS``: a function that
takes the ``LeakTree`` and returns the text the route sends.
"""

from __future__ import annotations

import copy
import dataclasses
import json
import pickle
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlencode

import pytest

from aictl.secret_mask import PLACEHOLDER, mask_mcp_config, mask_text, mask_url

# Every value here is fake and only has to be recognisable.
SECRETS = {
    "env": "FAKEENV0001value",
    "bearer": "FAKEBEARER0002value",
    "basic": "RkFLRUJBU0lDMDAwMw==",
    "cookie": "FAKECOOKIE0004value",
    "x_api_key": "FAKEXAPIKEY0005value",
    "arg_api_key": "FAKEARGKEY0006value",
    "arg_token": "FAKEARGTOKEN0007value",
    "arg_url_pass": "FAKEURLPASS0008value",
    "arg_url_key": "FAKEURLKEY0009value",
    "arg_url_token": "FAKEURLTOKEN0010value",
    "server_url_key": "FAKESERVERKEY0011value",
    "server_url_pass": "FAKESERVERPASS0012value",
    "settings_env": "FAKESETTINGSENV0013value",
    "copilot_env": "FAKECOPILOTENV0015value",
    "cursor_header": "FAKECURSORHDR0016value",
    "windsurf_arg": "FAKEWINDSURFARG0017value",
    "claude_json_env": "FAKECLAUDEJSON0018value",
    "docker_env": "FAKEDOCKERENV0019value",
    "codex_env": "FAKECODEXENV0020value",
    # Process command lines: rule 2 (a secret name in front of the value).
    "proc_api_key": "FAKEPROCKEY0021value",
    "proc_password": "FAKEPROCPASS0022value",
    "proc_docker_env": "FAKEPROCENV0023value",
    "proc_bearer": "FAKEPROCBEARER0024value",
    "proc_url_pass": "FAKEPROCURLPASS0025value",
    "proc_url_query": "FAKEPROCQUERY0026value",
    # Rule 3 (a known token shape anywhere).
    "proc_ghp": "ghp_FAKEPROCGHP0027value",
    "proc_sk": "sk-FAKEPROCSK0028value",
    "proc_jwt": "eyJGQUtFSldUMDAyOQ.eyJGQUtFSldUcGF5bG9hZA.RkFLRVNJRzAwMjk",
}
S = SECRETS
# A settings env value under a name that says nothing about secrets. The settings
# rows show such values on purpose; a file preview cannot tell, so it hides it.
PLAIN_ENV_VALUE = "plain-setting-0014"

# Arguments that must stay readable in every process output.
RESUME_ID = "0f3c2a1e-9b7d-4c55-8e21-4a6b9d0c7f12"
COMMIT = "3f786850e387550fdab836ed7e6dc881de23001b"
CLAUDE_PID, MCP_PID = 990002, 990001
# The claude CLI with secrets by name (rule 2) and by shape (rule 3) next to arguments that must stay.
CLAUDE_ARGV = [
    "claude", "--resume", RESUME_ID, "--model", "fake-model-x", "--add-dir", "/fake/project",
    "--api-key", S["proc_api_key"], f"--password={S['proc_password']}", "-e", f"PROC_VALUE={S['proc_docker_env']}",
    "--header", f"Authorization: Bearer {S['proc_bearer']}",
    f"https://fakeuser:{S['proc_url_pass']}@proc.example.test/x?token={S['proc_url_query']}",
    S["proc_ghp"], S["proc_sk"], S["proc_jwt"], COMMIT,
]
# The stdio-srv MCP server as started: its env value appears as a bare argument, which only the
# definition can tell is a secret (rule 1); its flagged arguments are rule 2.
MCP_ARGV = ["node", "server.js", "--api-key", S["arg_api_key"], f"--token={S['arg_token']}", S["env"]]


def _ps_rows() -> list[tuple[str, str, str, str, str]]:
    return [
        (str(MCP_PID), "0.5", "4096", "node", " ".join(MCP_ARGV)),
        (str(CLAUDE_PID), "1.0", "2048", "claude", " ".join(CLAUDE_ARGV)),
    ]


def _project_mcp() -> dict:
    return {
        "mcpServers": {
            "stdio-srv": {
                "command": "node",
                "args": [
                    "server.js",
                    "--api-key", S["arg_api_key"],
                    f"--token={S['arg_token']}",
                    f"https://fakeuser:{S['arg_url_pass']}@mcp.example.test/sse",
                    f"https://mcp.example.test/a?key={S['arg_url_key']}",
                    f"https://mcp.example.test/b?token={S['arg_url_token']}",
                ],
                "env": {"GITHUB_TOKEN": S["env"], "FROM_ENV": "${env:GITHUB_TOKEN}"},
            },
            "http-srv": {
                "type": "http",
                "url": f"https://svc:{S['server_url_pass']}@mcp.example.test/v1/mcp?api_key={S['server_url_key']}",
                "headers": {
                    "Authorization": f"Bearer {S['bearer']}",
                    "Proxy-Authorization": f"Basic {S['basic']}",
                    "Cookie": f"session={S['cookie']}",
                    "X-Api-Key": S["x_api_key"],
                },
            },
            "docker-srv": {
                "command": "docker",
                "args": ["run", "-i", "--rm", "-e", f"SERVICE_PAT={S['docker_env']}", "-e", "GITHUB_TOKEN", "ghcr.io/x/y"],
            },
        }
    }


@dataclass
class LeakTree:
    home: Path
    project: Path
    files: list[Path]
    probed: list[str]

    @property
    def mcp_json(self) -> Path:
        return self.project / ".mcp.json"

    @property
    def settings(self) -> Path:
        return self.home / ".claude" / "settings.json"


def _write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


@pytest.fixture
def leak_tree(tmp_path, monkeypatch) -> LeakTree:
    home, project = tmp_path / "home", tmp_path / "project"
    project.mkdir()
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("USERPROFILE", str(home))
    probed: list[str] = []

    def probe(url: str) -> str:  # never reach the network; record what the health check got
        probed.append(url)
        return "unknown"

    monkeypatch.setattr("aictl.tools._probe_http_mcp", probe)
    # A fake process table: no real process is read, and these pids do not exist.
    monkeypatch.setattr("aictl.tools._parse_ps_output", _ps_rows)
    monkeypatch.setattr("aictl.tools._process_parents", lambda: {})
    files = [
        _write(project / ".mcp.json", json.dumps(_project_mcp(), indent=2)),
        _write(home / ".copilot" / "mcp-config.json", json.dumps({"mcpServers": {"copilot-srv": {
            "command": "npx", "args": ["-y", "copilot-srv"], "env": {"SERVICE_SECRET": S["copilot_env"]}}}}, indent=2)),
        _write(home / ".cursor" / "mcp.json", json.dumps({"mcpServers": {"cursor-srv": {
            "url": "https://cursor.example.test/mcp", "headers": {"Authorization": f"Basic {S['cursor_header']}"}}}})),
        _write(home / ".codeium" / "windsurf" / "mcp_config.json", json.dumps({"mcpServers": {"windsurf-srv": {
            "command": "uvx", "args": ["windsurf-srv", "--access-token", S["windsurf_arg"]]}}}, indent=2)),
        _write(home / ".claude" / "settings.json", json.dumps({
            "model": "fake-model",
            "env": {"ANTHROPIC_AUTH_TOKEN": S["settings_env"], "SOME_SETTING": PLAIN_ENV_VALUE},
        }, indent=2)),
        _write(home / ".claude.json", json.dumps({"numStartups": 3, "mcpServers": {"user-srv": {
            "command": "npx", "args": ["user-srv"], "env": {"DATABASE_URL": S["claude_json_env"]}}}}, indent=2)),
        _write(home / ".codex" / "config.toml",
               f'model = "fake"\n\n[mcp_servers.codex-srv]\ncommand = "npx"\n\n'
               f'[mcp_servers.codex-srv.env]\nSERVICE_VALUE = "{S["codex_env"]}"\n'),
    ]
    return LeakTree(home, project, files, probed)


def _assert_no_secret(name: str, text: str) -> None:
    leaked = sorted(key for key, value in SECRETS.items() if value in text)
    assert not leaked, f"{name} returns secret values in clear: {leaked}"


# ── Outputs ──────────────────────────────────────────────────────


def _snapshot(tree: LeakTree):
    from aictl.orchestrator import collect

    return collect(tree.project, include_processes=True, _live_monitor_override={})


def _board_get(tree: LeakTree, path: str, query: str = "") -> str:
    from types import SimpleNamespace

    from aictl.dashboard.board_routes import handle_get
    from aictl.stores import Store
    from aictl.stores.testing import FixtureReader

    snapshot = _snapshot(tree)
    owner = SimpleNamespace(snapshot=snapshot, history_store=Store(reader=FixtureReader({})))
    allowed = {str(f) for f in tree.files}
    status, body = handle_get(path, query, owner, owner, now=123, is_allowed=lambda p: p in allowed)
    assert status == 200, (path, body)
    return body.decode() if isinstance(body, bytes) else body if isinstance(body, str) else json.dumps(body)


def _board_files(tree: LeakTree) -> str:
    return "\n".join(_board_get(tree, "/api/board/terminal/file", urlencode({"path": str(f)})) for f in tree.files)


def _api_file(tree: LeakTree) -> str:
    from aictl.dashboard.http_assets import _read_file_safe

    return "\n".join(_read_file_safe(str(f)) or "" for f in tree.files)


def _settings_file(tree: LeakTree) -> str:
    from aictl.dashboard.tool_config_editor import load_settings_file

    allowed = {str(f) for f in tree.files}
    out = []
    for f in tree.files:
        try:
            out.append(json.dumps(load_settings_file(str(f), lambda p: str(p) in allowed)))
        except Exception as exc:  # a file the editor refuses sends no text
            out.append(type(exc).__name__)
    return "\n".join(out)


def _status_cli(*args: str) -> Callable[[LeakTree], str]:
    def run(tree: LeakTree) -> str:
        from click.testing import CliRunner

        from aictl.commands.status import status

        result = CliRunner().invoke(status, ["--root", str(tree.project), "--no-server", *args])
        assert result.exit_code == 0, result.output
        return result.output

    return run


def _discovery_pickle(tree: LeakTree) -> str:
    from aictl.tools import collect_mcp_status, discover_all

    found = discover_all(tree.project)
    blobs = [pickle.dumps(found), pickle.dumps(collect_mcp_status(found)), pickle.dumps(copy.deepcopy(found))]
    return "\n".join(b.decode("latin-1") for b in blobs) + json.dumps([dataclasses.asdict(t) for t in found])


def _live_process(argv: list[str], pid: int = CLAUDE_PID, name: str = "claude"):
    from aictl.monitoring.session import ProcessInfo

    return ProcessInfo(pid=pid, ppid=1, name=name, exe=f"/fake/bin/{name}", cmdline=tuple(argv), cwd="/fake/project",
                       created_at=10.0)


def _live_records(tree: LeakTree) -> str:
    record = _live_process(CLAUDE_ARGV)
    return "\n".join([
        pickle.dumps(record).decode("latin-1"), repr(record), repr(copy.deepcopy(record)),
        json.dumps(dataclasses.asdict(record)),
    ])


def _live_sources(tree: LeakTree) -> str:
    from types import SimpleNamespace

    from aictl.dashboard.live.hub import LiveHub
    from aictl.monitoring.config import MonitorConfig
    from aictl.monitoring.correlator import SessionCorrelator
    from aictl.monitoring.live_sources import LiveRuntimeSources

    published: list = []

    class Hub(LiveHub):
        def publish(self, topic, entity_id, data, *, source):
            published.append((topic, copy.deepcopy(data)))
            return super().publish(topic, entity_id, data, source=source)

    producer = LiveRuntimeSources(Hub(), tree.project, capture_mode=lambda: "full", config_provider=lambda _: [],
                                  host="test-host")
    runtime = SessionCorrelator(MonitorConfig(root=tree.project, workspace_paths=(tree.project,), state_paths=()))
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    try:
        runtime.on_process(_live_process(CLAUDE_ARGV), 1.0, 2048, 0, ts=100)
        producer.flush_runtime()
        producer.poll_configuration()
    finally:
        producer.stop()
    text = json.dumps(published)
    assert "fake-model-x" in text, "launch-flag evidence still reads the model from the command line"
    return text


def _observe_nodes(tree: LeakTree) -> str:
    from aictl.observe.procs import ProcRow, ProcTable

    rows = [ProcRow(pid=CLAUDE_PID, ppid=None, name="claude", cmdline=tuple(CLAUDE_ARGV), tool="claude-code"),
            ProcRow(pid=MCP_PID, ppid=CLAUDE_PID, name="node", cmdline=tuple(MCP_ARGV), tool="claude-code")]
    table = ProcTable(rows)
    # The table has no MCP definition, so its records are masked by name and shape (rules 2, 3);
    # its nodes carry no argument at all.
    return json.dumps(table.node(CLAUDE_PID, 100.0)) + repr(rows[0]) + json.dumps(dataclasses.asdict(rows[0]))


def _machine(tree: LeakTree) -> str:
    from aictl.dashboard.runtime_health import machine_processes

    return json.dumps(machine_processes(_snapshot(tree)))


def _store_rows(tree: LeakTree) -> str:
    from aictl.orchestrator import SnapshotPersistence, SnapshotState
    from aictl.stores.testing import MemoryWriter

    snap = _snapshot(tree)
    writer = MemoryWriter()
    SnapshotPersistence(writer=writer).persist(snap, SnapshotState().update(snap))
    assert writer.operations, "the snapshot wrote no rows"
    return json.dumps(writer.operations, default=str)


OUTPUTS: dict[str, Callable[[LeakTree], str]] = {
    "GET /api/board/terminal/resources": lambda t: _board_get(t, "/api/board/terminal/resources"),
    "GET /api/board/terminal/resources?export=1": lambda t: _board_get(t, "/api/board/terminal/resources", "export=1"),
    "GET /api/board/terminal/file": _board_files,
    "GET /api/file": _api_file,
    "GET /api/settings/file": _settings_file,
    "snapshot.to_json()": lambda t: _snapshot(t).to_json(),
    "snapshot.to_dict_slim()": lambda t: json.dumps(_snapshot(t).to_dict_slim()),
    "html report": lambda t: __import__("aictl.dashboard.html_report", fromlist=["render_html"]).render_html(_snapshot(t)),
    "aictl status --json": _status_cli("--json"),
    "aictl status --html": _status_cli("--html"),
    "aictl status": _status_cli(),
    "discovery records (pickle, deepcopy, asdict)": _discovery_pickle,
    "aictl status --processes": _status_cli("--processes"),
    "aictl status --json --processes": _status_cli("--json", "--processes"),
    "machine processes": _machine,
    "store rows from a snapshot": _store_rows,
    "live process records (pickle, repr, asdict)": _live_records,
    "live sources payload": _live_sources,
    "observe process nodes": _observe_nodes,
}


@pytest.mark.parametrize("name", OUTPUTS)
def test_output_carries_no_secret(leak_tree, name):
    _assert_no_secret(name, OUTPUTS[name](leak_tree))


def test_processes_keep_their_ids_flags_and_bindings(leak_tree):
    """The same fixture still classifies, matches the MCP server and binds the resumed session."""
    from aictl.monitoring.collectors.process import classify_process
    from aictl.monitoring.native_binding import command_line_session
    from aictl.tools import collect_mcp_status, discover_all

    found = discover_all(leak_tree.project, include_processes=True)
    procs = {p.pid: (t.tool, p) for t in found for p in t.processes}
    tool, claude = procs[CLAUDE_PID]
    assert tool == "claude-code" and claude.name == "claude"
    for kept in (f"--resume {RESUME_ID}", "--model fake-model-x", "--add-dir /fake/project", "--api-key <redacted>"):
        assert kept in claude.cmdline
    _, mcp = procs[MCP_PID]
    assert mcp.name.startswith("[mcp:stdio-srv]")
    assert mcp.cmdline == f"node server.js --api-key {PLACEHOLDER} --token={PLACEHOLDER} {PLACEHOLDER}"
    detail = {s.name: s for s in collect_mcp_status(found)}
    assert detail["stdio-srv"].pid == MCP_PID and detail["stdio-srv"].status == "running"

    live = _live_process(CLAUDE_ARGV)
    assert classify_process(live).tool == "claude-code"
    assert command_line_session(live) == RESUME_ID
    assert live.cmdline[2] == RESUME_ID and live.cmdline[-1] == COMMIT and len(live.cmdline) == len(CLAUDE_ARGV)


def test_fixture_reaches_every_mcp_declaration(leak_tree):
    """The guard is only as good as its fixture: each declaration file is discovered and parsed."""
    from aictl.tools import discover_all

    found = discover_all(leak_tree.project)
    names = {s["name"] for t in found for s in t.mcp_servers}
    assert {"stdio-srv", "http-srv", "docker-srv", "copilot-srv", "cursor-srv", "windsurf-srv"} <= names
    discovered = {f.path for t in found for f in t.files}
    for f in (leak_tree.settings, leak_tree.home / ".claude.json", leak_tree.mcp_json):
        assert str(f) in discovered


def test_resources_keep_names_and_say_a_value_is_present(leak_tree):
    payload = json.loads(_board_get(leak_tree, "/api/board/terminal/resources", "export=1"))
    servers = {s["name"]: s for t in payload["tools"] for s in t["mcp_servers"]}
    stdio = servers["stdio-srv"]["config"]
    assert stdio["command"] == "node"
    assert stdio["env"] == {"GITHUB_TOKEN": PLACEHOLDER, "FROM_ENV": "${env:GITHUB_TOKEN}"}
    assert stdio["args"] == [
        "server.js",
        "--api-key", PLACEHOLDER,
        f"--token={PLACEHOLDER}",
        f"https://{PLACEHOLDER}@mcp.example.test/sse",
        f"https://mcp.example.test/a?key={PLACEHOLDER}",
        f"https://mcp.example.test/b?token={PLACEHOLDER}",
    ]
    http = servers["http-srv"]["config"]
    assert http["url"] == f"https://{PLACEHOLDER}@mcp.example.test/v1/mcp?api_key={PLACEHOLDER}"
    assert http["headers"] == {
        "Authorization": f"Bearer {PLACEHOLDER}",
        "Proxy-Authorization": f"Basic {PLACEHOLDER}",
        "Cookie": PLACEHOLDER,
        "X-Api-Key": PLACEHOLDER,
    }
    assert servers["docker-srv"]["config"]["args"] == [
        "run", "-i", "--rm", "-e", f"SERVICE_PAT={PLACEHOLDER}", "-e", "GITHUB_TOKEN", "ghcr.io/x/y"]
    detail = {s["name"]: s for s in payload["mcp_detail"]}
    assert detail["http-srv"]["endpoint"] == http["url"]
    assert detail["stdio-srv"]["endpoint"].startswith("node server.js --api-key <redacted>")


def test_health_check_and_process_match_still_see_the_real_config(leak_tree):
    """The raw definition stays in memory for the probe and process matching, never in output."""
    from aictl.tools import ProcessInfo, collect_mcp_status, discover_all

    found = discover_all(leak_tree.project)
    owner = next(t for t in found if any(s["name"] == "stdio-srv" for s in t.mcp_servers))
    # Matches only with the real argument: the command plus the secret positional value.
    owner.processes.append(ProcessInfo(4242, "node", f"node {S['arg_api_key']}"))
    detail = {s.name: s for s in collect_mcp_status(found)}
    assert detail["stdio-srv"].status == "running" and detail["stdio-srv"].pid == 4242
    # Linked to the definition, the process shows the definition's secret masked (rule 1).
    assert owner.processes[-1].cmdline == f"node {PLACEHOLDER}"
    assert any(S["server_url_key"] in url for url in leak_tree.probed)
    _assert_no_secret("mcp_detail", json.dumps([dataclasses.asdict(s) for s in detail.values()]))


def test_preview_masks_json_and_toml_values_but_keeps_lines(leak_tree):
    from aictl.dashboard.projections.terminal import preview_file

    for f in leak_tree.files:
        text = f.read_text()
        shown = preview_file(str(f))["text"]
        _assert_no_secret(str(f), shown)
        assert shown.count("\n") == text.count("\n")
    shown = preview_file(str(leak_tree.settings))["text"]
    assert '"ANTHROPIC_AUTH_TOKEN": "<redacted>"' in shown and '"model": "fake-model"' in shown
    assert '"SOME_SETTING": "<redacted>"' in shown and PLAIN_ENV_VALUE not in shown


@pytest.mark.parametrize(
    ("text", "secret"),
    [
        ("Authorization: Basic dXNlcjpwYXNzd29yZA==", "dXNlcjpwYXNzd29yZA=="),
        ("curl -H 'Authorization: Basic Zm9vOmJhcg=='", "Zm9vOmJhcg=="),
        ("Cookie: sid=abc123def; theme=dark", "abc123def"),
        ("set-cookie: sid=abc123def", "abc123def"),
        ("postgres://admin:hunter2pass@db.example.test/app", "hunter2pass"),
        ("GET https://x.example.test/p?token=tok123456&page=2", "tok123456"),
        ("https://x.example.test/p?api_key=key123456", "key123456"),
        ("run --api-key key123456 now", "key123456"),
        ('"--auth-token", "tok123456"', "tok123456"),
        ("OPENAI_KEY=key123456", "key123456"),
    ],
)
def test_mask_text_covers_basic_cookies_userinfo_and_key_parameters(text, secret):
    assert secret not in mask_text(text)


@pytest.mark.parametrize(
    "text",
    ["Basic usage of the tool", "the primary key is id", "use --verbose output", "https://example.test/docs?page=2"],
)
def test_mask_text_leaves_ordinary_text(text):
    assert mask_text(text) == text


def test_mask_url_and_config_shapes():
    assert mask_url("https://h.example.test:8443/p/q?a=1#frag") == f"https://h.example.test:8443/p/q?a={PLACEHOLDER}#{PLACEHOLDER}"
    assert mask_mcp_config({"command": "npx", "args": ["--no-auth", "--port", "3000"]}) == {
        "command": "npx", "args": ["--no-auth", "--port", "3000"]}
    assert mask_mcp_config({"env": {"EMPTY": ""}})["env"] == {"EMPTY": ""}
