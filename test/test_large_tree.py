"""A folder of many projects must cost about what one project costs.

Started from a parent folder, the daemon walked up to 50,000 folders on every discovery, read
every matching file again, wrote one sample per file and per file event, and repeated its
warnings until they filled the terminal. Nothing tested a tree over the cap.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl import context, fsutil, tools
from aictl.monitoring import runtime
from aictl.monitoring.collectors import process
from aictl.monitoring.config import MonitorConfig
from aictl.sink import SampleSink
from aictl.tools import ResourceFile, ToolResources


def _warnings(caplog) -> list[str]:
    return [r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING]


def _tree(root: Path, width: int = 4) -> Path:
    for a in range(width):
        for b in range(width):
            (root / f"a{a}" / f"b{b}").mkdir(parents=True)
    return root


# ── Messages ───────────────────────────────────────────────────────


def test_walk_cap_warns_once_and_says_what_to_do(tmp_path, caplog):
    _tree(tmp_path)
    for _ in range(3):
        list(fsutil.safe_walk(tmp_path, max_dirs=2))
    assert len(_warnings(caplog)) == 1
    assert str(tmp_path) in _warnings(caplog)[0] and "--root" in _warnings(caplog)[0]


def test_walk_under_the_cap_says_nothing(tmp_path, caplog):
    _tree(tmp_path, width=2)
    list(fsutil.safe_walk(tmp_path, max_dirs=1000))
    assert _warnings(caplog) == []


def test_context_scan_warns_once_however_deep_it_stops(tmp_path, caplog, monkeypatch):
    monkeypatch.setattr(context, "MAX_SCAN_DIRS", 5)
    deep = tmp_path
    for depth in range(10):
        (deep / "side").mkdir()
        deep = deep / f"d{depth}"
        deep.mkdir()
    for _ in range(2):
        list(context._walk(tmp_path))
    assert len(_warnings(caplog)) == 1


def test_context_scan_under_the_cap_says_nothing(tmp_path, caplog, monkeypatch):
    monkeypatch.setattr(context, "MAX_SCAN_DIRS", 100)
    _tree(tmp_path, width=2)
    list(context._walk(tmp_path))
    assert _warnings(caplog) == []


# ── Cost of walking and reading ─────────────────────────────────────


def test_slow_walk_is_reused_until_its_pause_ends(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr(tools.time, "monotonic", lambda: clock[0])
    calls = []

    def walk():
        calls.append(clock[0])
        clock[0] += 5.0
        return len(calls)

    key = ("test-slow", "root")
    assert tools._paced_walk(key, walk) == 1
    clock[0] = 100.0 + 5.0 * tools.WALK_PAUSE_FACTOR - 1
    assert tools._paced_walk(key, walk) == 1
    clock[0] = 100.0 + 5.0 * tools.WALK_PAUSE_FACTOR + 1
    assert tools._paced_walk(key, walk) == 2


def test_fast_walk_always_repeats():
    calls = []
    key = ("test-fast", "root")
    tools._paced_walk(key, lambda: calls.append(1))
    tools._paced_walk(key, lambda: calls.append(1))
    assert len(calls) == 2


def test_normal_project_shows_a_new_file_at_once(tmp_path):
    tools.discover_all(tmp_path)
    (tmp_path / "pkg" / ".custom").mkdir(parents=True)
    (tmp_path / "pkg" / ".custom" / "settings.json").write_text("{}")
    found = {f.path for t in tools.discover_all(tmp_path) for f in t.files}
    assert str(tmp_path / "pkg" / ".custom" / "settings.json") in found


def test_unchanged_file_is_not_read_again(tmp_path, monkeypatch):
    target = tmp_path / "CLAUDE.md"
    target.write_text("hello world " * 50)
    reads = []
    real = Path.read_text
    monkeypatch.setattr(Path, "read_text", lambda self, *a, **k: (reads.append(self), real(self, *a, **k))[1])
    first = tools._file_resource(target, "instructions")
    second = tools._file_resource(target, "instructions")
    assert reads == [target] and first.tokens == second.tokens > 0
    target.write_text("hello world " * 500)
    assert tools._file_resource(target, "instructions").tokens > first.tokens
    assert len(reads) == 2


def test_token_cache_stays_bounded(tmp_path, monkeypatch):
    monkeypatch.setattr(tools, "MAX_TOKEN_CACHE", 3)
    monkeypatch.setattr(tools, "_token_cache", {})
    for i in range(10):
        path = tmp_path / f"f{i}.md"
        path.write_text("x")
        tools._file_resource(path, "instructions")
    assert len(tools._token_cache) <= 3


def test_hidden_folder_listing_stops_at_its_limit(tmp_path, monkeypatch, caplog):
    monkeypatch.setattr(tools, "MAX_PROJECT_ENV_FILES", 5)
    for i in range(10):
        hidden = tmp_path / f"p{i}" / ".custom"
        hidden.mkdir(parents=True)
        (hidden / "a.json").write_text("{}")
    assert len(tools._discover_project_env(tmp_path).files) == 5
    tools._discover_project_env(tmp_path)
    assert len(_warnings(caplog)) == 1


def test_size_of_a_normal_folder_is_exact(tmp_path):
    (tmp_path / "a.txt").write_text("12345")
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "skip.txt").write_text("123")
    assert runtime._dir_size(tmp_path, (".git",)) == 5


def test_size_gives_up_rather_than_hold_up_the_start(tmp_path, monkeypatch):
    (tmp_path / "a.txt").write_text("12345")
    monkeypatch.setattr(runtime, "DIR_SIZE_BUDGET_S", -1.0)
    assert runtime._dir_size(tmp_path, ()) == 0


# ── Samples per file ───────────────────────────────────────────────


def _many_files(count: int) -> list[ResourceFile]:
    return [ResourceFile(f"/p/f{i}.md", "config", i, i) for i in range(count)]


def test_samples_keep_every_file_under_the_limit():
    files = _many_files(tools.MAX_FILE_SAMPLES_PER_TOOL)
    assert tools.files_to_sample(files) is files


def test_samples_keep_the_largest_files_over_the_limit():
    limit = tools.MAX_FILE_SAMPLES_PER_TOOL
    kept = tools.files_to_sample(_many_files(limit * 3))
    assert len(kept) == limit and min(f.tokens for f in kept) == limit * 2


def test_discovery_of_a_huge_tree_does_not_flood_the_sink(monkeypatch):
    tool = ToolResources("project-env", "Project Environment")
    tool.files = _many_files(20_000)
    monkeypatch.setattr(tools, "discover_all", lambda *a, **k: [tool])

    async def stop(self, seconds):
        raise asyncio.CancelledError

    monkeypatch.setattr(runtime.DiscoveryCollector, "sleep_paced", stop)
    sink = SampleSink(db=None, buffer_size=0)
    collector = runtime.DiscoveryCollector(MonitorConfig.for_root(Path.cwd()))
    collector.set_sink(sink)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(collector.run())
    assert sink.stats()["total_dropped"] == 0
    assert sink.stats()["total_emitted"] <= 2 * tools.MAX_FILE_SAMPLES_PER_TOOL + 10


def test_snapshot_path_samples_the_same_files(tmp_path, monkeypatch):
    from aictl import orchestrator

    tool = ToolResources("project-env", "Project Environment")
    tool.files = _many_files(20_000)
    monkeypatch.setattr(orchestrator, "discover_all", lambda *a, **k: [tool])
    sink = SampleSink(db=None, buffer_size=0)
    orchestrator.collect(tmp_path, include_processes=False, _sink=sink)
    assert sink.stats()["total_dropped"] == 0


def test_flood_message_is_readable_and_names_the_metric(caplog):
    sink = SampleSink(db=None, buffer_size=0)
    sink._flood_max = 1
    for name in ("metric.one", "metric.two", "metric.three"):
        sink.emit(name, 1.0, ts=100.0)
    assert _warnings(caplog) == ["Too many samples: dropping those over 1 per second, starting with metric.two. Dropped so far: 1"]


# ── File events ────────────────────────────────────────────────────


def _handler(tmp_path):
    put = []
    loop = SimpleNamespace(call_soon_threadsafe=lambda fn, item: put.append(item))
    cfg = MonitorConfig.for_root(tmp_path)
    return process._WatchHandler(loop=loop, queue=SimpleNamespace(put_nowait=None), config=cfg), put


@pytest.mark.parametrize("part", [".git", "node_modules", "target", "bin", "obj", "build"])
def test_events_under_ignored_folders_are_dropped(tmp_path, part):
    handler, put = _handler(tmp_path)
    handler._emit("modified", SimpleNamespace(is_directory=False, src_path=str(tmp_path / "repo" / part / "x.o")))
    assert put == []


def test_events_in_source_folders_are_kept(tmp_path):
    handler, put = _handler(tmp_path)
    handler._emit("modified", SimpleNamespace(is_directory=False, src_path=str(tmp_path / "repo" / "src" / "x.py")))
    assert len(put) == 1


def test_tool_state_is_kept_even_under_an_ignored_name(tmp_path):
    handler, put = _handler(tmp_path)
    state = tmp_path / ".copilot" / "dist" / "x.json"
    assert process._tool_hint_for_path(str(state))
    handler._emit("modified", SimpleNamespace(is_directory=False, src_path=str(state)))
    assert len(put) == 1


def test_tracked_sizes_stay_bounded(tmp_path, monkeypatch):
    monkeypatch.setattr(process, "MAX_TRACKED_FILE_SIZES", 3)
    handler, _ = _handler(tmp_path)
    for i in range(10):
        handler._emit("modified", SimpleNamespace(is_directory=False, src_path=str(tmp_path / f"f{i}.txt")))
    assert len(handler._size_cache) <= 3


def _sampler(monkeypatch):
    emitted: list[tuple] = []
    collector = SimpleNamespace(
        sink_emit=lambda metric, value, tags: emitted.append((metric, value, tags)),
        sink_emit_if_changed=lambda metric, value, tags: None,
    )
    clock = [1000.0]
    activity = []
    monkeypatch.setattr(process.PACE, "note_activity", lambda: activity.append(1))
    return process._FileEventSampler(collector, clock=lambda: clock[0]), emitted, clock, activity


def test_a_build_storm_is_summed_not_sampled_file_by_file(monkeypatch):
    sampler, emitted, clock, _ = _sampler(monkeypatch)
    for i in range(5000):
        sampler.record(f"/w/out{i}.o", 10, 10, None)
    assert len(emitted) == process.MAX_FILE_EVENT_SAMPLES_PER_S
    clock[0] += 1.1
    sampler.record("/w/next.o", 10, 10, None)
    assert sum(value for _, value, _ in emitted) == 5001 * 10
    assert any(tags["path"] == process.OTHER_FILES_PATH for _, _, tags in emitted)


def test_tool_files_are_never_held_back(monkeypatch):
    sampler, emitted, _, _ = _sampler(monkeypatch)
    for i in range(process.MAX_FILE_EVENT_SAMPLES_PER_S * 2):
        sampler.record(f"/w/out{i}.o", 1, 1, None)
    before = len(emitted)
    sampler.record("/home/.copilot/session.jsonl", 1, 1, "copilot-cli")
    assert len(emitted) == before + 1


def test_only_tool_files_count_as_tool_activity(monkeypatch):
    sampler, _, _, activity = _sampler(monkeypatch)
    sampler.record("/w/out.o", 1, 1, None)
    assert activity == []
    sampler.record("/home/.copilot/session.jsonl", 1, 1, "copilot-cli")
    assert activity == [1]


def test_a_session_keeps_a_limited_list_of_touched_files(monkeypatch):
    from aictl.monitoring import session as session_module
    from aictl.monitoring.session import SessionState

    monkeypatch.setattr(session_module, "MAX_FILES_TOUCHED", 3)
    state = SessionState(session_id="x", tool="x", root_pid=1, started_at=0.0, last_seen_at=0.0)
    for i in range(10):
        state.add_file_activity(1.0, f"/w/f{i}", None, None, 0)
    state.add_file_activity(1.0, "/w/f0", None, None, 0)
    data = state.to_dict()
    assert len(data["files_touched"]) == 3 and data["files_touched_limited"] is True
    assert state.file_events == 11
