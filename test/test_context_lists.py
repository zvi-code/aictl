"""Each distinct list of context items is stored once; agents hold pointers to it (context_lists.py)."""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from importlib.resources import files
from itertools import count

from kusto_replay import LOCAL_NODE, Facts

from aictl.context_lists import EXPANSION_KQL, LIST_ID_HEX, POINTER_PREFIX, is_pointer, list_id
from aictl.dashboard.session_details import _context_item_rows
from aictl.records import CallFacts, ContextItemRow
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.kusto.tables import TABLE_RETENTION_CLASS, TABLES
from aictl.stores.testing import MemoryWriter

SID = "33333333-3333-4333-8333-333333333333"
TOOLS = ("Read", "Edit", "mcp__github__search", "mcp__github__get")


def item(name, ts=100.0, agent="", kind="tools_listed", chars=40, tokens=10, removed=0, path="", estimated=1):
    return ContextItemRow(session_id=SID, kind=kind, name=name, ts=ts, agent_id=agent, path=path, chars=chars,
                          tokens=tokens, estimated=estimated, removed=removed, tool="claude-code",
                          project_path="/work/proj")


def tools(ts, agent, names=TOOLS):
    return [item(n, ts, agent, tokens=10 + i, chars=40 + 4 * i) for i, n in enumerate(names)]


def facts(writer=None, **kwargs):
    return SessionFacts(writer or MemoryWriter(), keeps_text=lambda: True, content_days=36500, **kwargs)


# ── the hash ──────────────────────────────────────────────────────────


def test_the_list_id_is_a_stable_hash_of_kind_and_items_only():
    rows = [dict(name="Read", path="", chars=40, tokens=10, estimated=1, removed=0),
            dict(name="Edit", path="", chars=44, tokens=11, estimated=1, removed=0)]
    lid = list_id("tools_listed", rows)
    assert re.fullmatch(r"[0-9a-f]{32}", lid)
    assert lid == list_id("tools_listed", [dict(r, ts=999.0, session_id="x", agent_id="y") for r in reversed(rows)])
    assert lid != list_id("skills", rows)
    assert lid != list_id("tools_listed", [dict(rows[0], tokens=12), rows[1]])
    assert lid != list_id("tools_listed", [dict(rows[0], removed=1), rows[1]])
    assert is_pointer(POINTER_PREFIX + lid) and not is_pointer("list:x") and not is_pointer("Read")


def test_the_list_id_value_is_pinned():
    # Stored pointers name lists by this hash: a change to it would leave them pointing at nothing.
    rows = [dict(name="Read", path="", chars=40, tokens=10, estimated=1, removed=0)]
    assert list_id("tools_listed", rows) == "36776676cf93473b03902bf682590ed1"


# ── the grouping ──────────────────────────────────────────────────────


def test_two_agents_with_the_same_list_store_it_once_and_point_to_it():
    db = facts()
    db.write(CallFacts(context_items=tools(100.0, "agent-a")))
    db.write(CallFacts(context_items=tools(150.0, "agent-b")))
    lists = db.writer.written("context_lists")
    pointers = db.writer.written("session_context_items")
    assert sorted(r["name"] for r in lists) == sorted(TOOLS)
    assert {r["list_id"] for r in lists} == {pointers[0]["name"].removeprefix(POINTER_PREFIX)}
    assert all(r["project"] == "" and r["kind"] == "tools_listed" for r in lists)
    assert [(r["agent_id"], r["ts"], r["name"]) for r in pointers] == [
        ("agent-a", 100.0, pointers[0]["name"]), ("agent-b", 150.0, pointers[0]["name"])]
    assert all(is_pointer(r["name"]) for r in pointers)


def test_a_pointer_carries_the_sums_of_the_items_not_removed():
    db = facts()
    rows = [*tools(100.0, "a"), item("Gone", 100.0, "a", chars=400, tokens=100, removed=1, estimated=0)]
    db.write(CallFacts(context_items=rows))
    (pointer,) = db.writer.written("session_context_items")
    assert (pointer["chars"], pointer["tokens"], pointer["estimated"], pointer["removed"], pointer["path"]) == (
        sum(r.chars for r in rows[:-1]), sum(r.tokens for r in rows[:-1]), 1, 0, "")
    assert (pointer["project"], pointer["tool"], pointer["session_id"]) == ("/work/proj", "claude-code", SID)
    assert len(db.writer.written("context_lists")) == 5


def test_a_later_announcement_gets_a_second_pointer_and_its_own_list():
    db = facts()
    db.write(CallFacts(context_items=tools(100.0, "a")))
    db.write(CallFacts(context_items=[item("Write", 200.0, "a")]))
    db.write(CallFacts(context_items=tools(300.0, "a")))  # the first list again: no new list rows
    pointers = db.writer.written("session_context_items")
    assert len(pointers) == 3 and pointers[0]["name"] == pointers[2]["name"] != pointers[1]["name"]
    assert len(db.writer.written("context_lists")) == len(TOOLS) + 1


def test_one_write_with_two_times_makes_one_pointer_per_time():
    db = facts()
    db.write(CallFacts(context_items=[*tools(100.0, "a", TOOLS[:2]), *tools(200.0, "a", TOOLS[2:])]))
    assert [r["ts"] for r in db.writer.written("session_context_items")] == [100.0, 200.0]


def test_other_kinds_stay_one_row_per_item():
    db = facts()
    rows = [item("CLAUDE.md", 100.0, kind="memory_file", path="/work/proj/CLAUDE.md"),
            item("tools_listed", 100.0, kind="reset", chars=0, tokens=0),
            item("", 100.0, kind="report", tokens=131000), item("system", 100.0, kind="system_prompt_other")]
    db.write(CallFacts(context_items=rows))
    assert [(r["kind"], r["name"]) for r in db.writer.written("session_context_items")] == [
        (r.kind, r.name) for r in rows]
    assert db.writer.written("context_lists") == []


def test_the_restart_state_keeps_the_lists_already_written(tmp_path):
    state = StateFile(tmp_path / "session_lifecycle.json")
    db = facts(state=state)
    db.write(CallFacts(context_items=tools(100.0, "a")))
    db.save()
    again = facts(state=state)
    again.write(CallFacts(context_items=tools(200.0, "b")))
    assert again.writer.written("context_lists") == []
    assert len(again.writer.written("session_context_items")) == 1


def test_a_list_still_in_use_is_written_again_before_retention_can_drop_it(monkeypatch):
    clock = [1_000_000.0]
    monkeypatch.setattr("aictl.session_facts.time.time", lambda: clock[0])
    db = facts(retention={"history": 365 * 24})
    db.write(CallFacts(context_items=tools(100.0, "a")))
    clock[0] += 23 * 3600
    db.write(CallFacts(context_items=tools(200.0, "b")))
    assert len(db.writer.written("context_lists")) == len(TOOLS)
    clock[0] += 2 * 3600
    db.write(CallFacts(context_items=tools(300.0, "c")))
    assert len(db.writer.written("context_lists")) == 2 * len(TOOLS)


def test_the_table_is_kept_and_ingested_like_session_context_items():
    assert TABLES["context_lists"].ingestion == TABLES["session_context_items"].ingestion
    assert TABLE_RETENTION_CLASS["context_lists"] == TABLE_RETENTION_CLASS["session_context_items"]
    assert TABLES["context_lists"].key == ("project", "node_id", "list_id", "name")


# ── the readers ───────────────────────────────────────────────────────


def _views():
    root = files("aictl.stores.kusto").joinpath("queries")
    return {p.name: p.read_text(encoding="utf-8") for p in root.iterdir() if p.name.endswith(".kql")}


def test_every_view_that_reads_context_items_expands_the_pointers():
    readers = {name: text for name, text in _views().items() if "session_context_items" in text}
    assert readers, "no view reads session_context_items"
    for name, text in readers.items():
        assert EXPANSION_KQL in text, f"{name} must carry context_lists.EXPANSION_KQL as it is"
        legs = re.findall(r"session_context_items\b[^\n]*\n\s*\| invoke context_items_expanded\(\)", text)
        assert len(legs) == text.count("session_context_items"), f"{name}: every read of the table expands it"


def test_the_expansion_matches_the_pointer_names():
    assert f"@'^{POINTER_PREFIX}[0-9a-f]{{{LIST_ID_HEX}}}$'" in EXPANSION_KQL
    assert f"substring(name,{len(POINTER_PREFIX)})" in EXPANSION_KQL


# The same facts, written as before this change (one row per item) and as now, must read the same.
class VersionedWriter:
    """Store rows in the inline fixture as the Kusto writer would: with the node and a growing _v.

    The versions are fixed values, so the inlined rows (and the recorded queries) are the same at every run.
    """

    def __init__(self, facts, versions):
        self.facts = facts
        self.versions = versions

    def append(self, table, rows):
        for row in rows:
            v = datetime(2026, 1, 1) + timedelta(microseconds=next(self.versions))
            self.facts.insert(table, **row, _v=v.isoformat(timespec="microseconds") + "Z")

    upsert = append

    def delete(self, table, keys):  # pragma: no cover - these facts delete nothing
        raise AssertionError(table)

    def flush(self):
        pass


def _scenario():
    """Context facts in write order: (agent, rows) per write."""
    skills = [item(f"plugin:skill-{i}", 100.0, kind="skills", tokens=20 + i, chars=80 + i) for i in range(3)]
    mcp = [item("github", 100.0, kind="mcp_instructions", tokens=300, chars=1200, estimated=0)]
    return [
        # The main agent: tools, skills and MCP instructions announced at 100, a memory file.
        [*tools(100.0, ""), *skills, *mcp, item("CLAUDE.md", 100.0, kind="memory_file", path="/work/proj/CLAUDE.md")],
        # Two subagents told the same tools and skills, one write each.
        [*tools(110.0, "agent-a"), *[item(s.name, 110.0, "agent-a", kind="skills", tokens=s.tokens, chars=s.chars)
                                       for s in skills]],
        [*tools(120.0, "agent-b")],
        # A delta: one tool removed and one added, in a write that also holds a later delta.
        [item("mcp__github__get", 200.0, "agent-a", removed=1, tokens=13, chars=52), item("Write", 200.0, "agent-a"),
         item("Bash", 260.0, "agent-a", tokens=30)],
        # A compaction resets everything; the main agent's tools are sent again, the skills are not.
        [item("*", 300.0, kind="reset", chars=0, tokens=0), *tools(300.0, "")],
        # The same list as at first, again, later: a newer version of the same pointer.
        [*tools(400.0, "agent-b")],
    ]


def _plain(row):
    data = {k: getattr(row, k) for k in row.__slots__}
    data["project"] = data.pop("project_path")
    return data


def _read(kusto_tape, store):
    rows = kusto_tape.reader(store).read("sequence.context", {"requested_session": SID, "limit": 1000}).rows
    return sorted(tuple(r["values"]) for r in rows if r["row_type"] == "item")


def test_the_context_view_reads_pointers_as_the_items_they_stand_for(kusto_tape):
    before, after, versions = Facts(node=LOCAL_NODE), Facts(node=LOCAL_NODE), count()
    plain = VersionedWriter(before, versions)
    db = facts(VersionedWriter(after, versions))
    for write in _scenario():
        plain.append("session_context_items", [_plain(r) for r in write])
        db.write(CallFacts(context_items=write))
    assert len(after.rows["session_context_items"]) < len(before.rows["session_context_items"])
    assert after.rows["context_lists"]
    old, new = _read(kusto_tape, before), _read(kusto_tape, after)
    assert old and new == old
    # The breakdown built on them is the same at every time, resets included.
    as_facts = lambda rows: {"item": sorted(rows, key=lambda r: r[6])}  # noqa: E731
    for at in (105.0, 115.0, 250.0, 280.0, 350.0, 500.0):
        for agent, root in (("", True), ("agent-a", False), ("agent-b", False)):
            assert _context_item_rows(None, SID, agent, root, at, facts=as_facts(new)) == _context_item_rows(
                None, SID, agent, root, at, facts=as_facts(old))


def test_old_rows_and_pointers_of_one_agent_read_together(kusto_tape):
    store, versions = Facts(node=LOCAL_NODE), count()
    plain = VersionedWriter(store, versions)
    plain.append("session_context_items", [_plain(r) for r in tools(100.0, "agent-a")])  # written before the change
    db = facts(VersionedWriter(store, versions))
    db.write(CallFacts(context_items=[item("Read", 200.0, "agent-a", tokens=99)]))
    by_name = {v[2]: v for v in _read(kusto_tape, store)}
    assert sorted(by_name) == sorted(TOOLS)
    assert (by_name["Read"][4], by_name["Read"][6]) == (99, 200.0)
    assert (by_name["Edit"][4], by_name["Edit"][6]) == (11, 100.0)


# ── the layout ────────────────────────────────────────────────────────


def test_a_node_of_layout_3_upgrades_without_a_migration_and_gains_the_table(monkeypatch):
    from kusto_layout_double import FakeKusto

    from aictl import state_file
    from aictl.stores.kusto import layout as L
    from aictl.stores.kusto import nodes as N
    from aictl.stores.kusto.schema import check_layout, ensure_schema, function_commands

    monkeypatch.setattr(state_file, "_checked", {})
    fake, older = FakeKusto(), {"session_context_items": TABLES["session_context_items"]}

    def ensure(tables):
        return ensure_schema(fake, "db", tables=tables, modes=dict.fromkeys(tables, "streaming"), node_id="node-a",
                             cluster="https://layout.example.invalid")

    def phys(name):
        return N.physical(name, N.node_key("node-a"))

    with monkeypatch.context() as layout_3:
        layout_3.setattr(L, "LAYOUT_VERSION", 3)
        layout_3.setattr(L, "CHANGES", L.CHANGES[:3])
        ensure(older)
    fake.add_rows(phys("session_context_items"), "node-a", 3)
    assert phys("context_lists") not in fake.tables
    # Before the node gains the table, the function reads the empty logical schema.
    [command] = [c for c in function_commands(check_layout(fake, "db", "node-a"), {"context_lists"})
                 if "['context_lists']()" in c]
    assert "datatable(['list_id']:string" in command and "context_lists__" not in command
    status = ensure({**older, "context_lists": TABLES["context_lists"]})
    assert status.layout["verdict"] == L.UPGRADE
    rows = [r for r in fake.layout_rows if r["kind"] == "layout" and not r.get("step")]
    assert (rows[-1]["version"], rows[-1]["compatible_since"], rows[-1]["detail"]) == (L.LAYOUT_VERSION, 3, "upgrade")
    assert phys("context_lists") in fake.tables and [r for r in fake.layout_rows if r["kind"] == "migration"] == []
