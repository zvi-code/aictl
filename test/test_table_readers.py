"""Every table the store defines is read by a view or by a named reader in code, or says why not.

session_thinking was written for months (about 25,000 blocks on one machine) while no view read it, so the
text it holds was shown nowhere and no test noticed. A table is read when its name, or the name of its
current view, is a table reference in a view under stores/kusto/queries, or when it is one of CODE_READERS,
whose module builds the reading KQL itself. Every other table is in UNREAD with the reason it is not read;
a new table that nothing reads fails here until it gets a reader or an entry.
"""

from __future__ import annotations

import re
from pathlib import Path

from aictl.stores.kusto.current import CURRENT_TABLES, logical
from aictl.stores.kusto.tables import TABLES

ROOT = Path(__file__).resolve().parent.parent / "src" / "aictl"
QUERIES = ROOT / "stores" / "kusto" / "queries"
_STRING = re.compile(r"@?'(?:[^'\\\n]|\\.)*'|@?\"(?:[^\"\\\n]|\\.)*\"")
_COMMENT = re.compile(r"//[^\n]*")

# Tables read by KQL that code builds rather than a view: table -> (module under src/aictl, what reads it).
CODE_READERS = {
    "schema_version": ("stores/kusto/nodes.py", "the stored function aictl_nodes() reads each node's layout row"),
    "turn_request_links": ("dashboard/drawer_kql.py", "the KQL tab's preset of a session's cost by turn joins the links"),
    "OTELMetrics": ("stores/kusto/live_reader.py", "the live feed polls new metric rows"),
}

# Tables no view and no code reader reads, with the reason. An entry here is a finding, not a design:
# the data is written (or defined) and shown nowhere.
UNREAD = {
    "session_files": "written per session (files read, edited, created); no view reads it yet: the drawer counts "
                     "files from tool_invocations and file_write_events",
    "text_payloads": "the full text of values over large_payload_bytes; the views show the preview in the value's own "
                     "row, and no view joins the full text back",
    "hook_calls": "written per hook call from POST /api/hooks; the views read hook activity from events",
    "otel_trace_sessions": "written by the OTel receiver to name a trace's session; no view resolves spans through it",
    "memory_snapshots": "written by session evidence; only maintenance trims its text, no view reads it",
    "OTELLogs": "aictl's OTel log rows; the views read the tools' telemetry from events (kind otel:*)",
    "OTELPayloads": "chunks of OTel values too large for their row; only maintenance trims it, no view reads it",
    "tool_config": "defined only: no current code writes it",
    "environment_vars": "defined only: no current code writes it",
    "session_attribution": "defined only: session_facts.py defines attribution, but no code calls it",
}


def view_tables() -> dict[str, set[str]]:
    """Each table and the views that read it (by name, or by its current view)."""
    names = {**{name: name for name in TABLES}, **{logical(name): name for name in CURRENT_TABLES}}
    found: dict[str, set[str]] = {}
    for path in sorted(QUERIES.glob("*.kql")):
        code = _STRING.sub("''", _COMMENT.sub("", path.read_text(encoding="utf-8")))
        for word in set(re.findall(r"[A-Za-z_]\w*", code)) & names.keys():
            found.setdefault(names[word], set()).add(path.stem)
    return found


def test_every_table_is_read_or_says_why_not():
    read = view_tables()
    unread = sorted(set(TABLES) - read.keys() - CODE_READERS.keys() - UNREAD.keys())
    assert unread == [], f"No view or code reader reads {unread}: add a reader, or an UNREAD entry with the reason"
    # An entry for a table that is read, or that does not exist, is stale.
    assert sorted(UNREAD.keys() & read.keys()) == [], "These tables are read now: remove their UNREAD entries"
    assert sorted(CODE_READERS.keys() & read.keys()) == [], "These tables are read by a view: remove their CODE_READERS entries"
    assert sorted((UNREAD.keys() | CODE_READERS.keys()) - TABLES.keys()) == []
    assert all(reason.strip() for reason in UNREAD.values())


def test_a_code_reader_names_its_table():
    for table, (module, how) in CODE_READERS.items():
        assert how.strip()
        assert re.search(rf"\b{table}\b", (ROOT / module).read_text(encoding="utf-8")), f"{module} does not read {table}"


def test_the_thinking_text_has_a_view():
    # The defect this guard was written for.
    assert "session_thinking" not in UNREAD
    assert "thinking.blocks" in view_tables()["session_thinking"]
