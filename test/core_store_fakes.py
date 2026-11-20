"""Test doubles for typed fact handoffs and named views."""

import json

from aictl.collection_status import CollectionStatus
from aictl.ingesters.message_facts import MessageFacts
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores import Store
from aictl.stores.testing import FixtureReader, MemoryWriter
from aictl.stores.kusto.tables import TABLES


def message_facts(tmp_path, *, keeps_text=True):
    writer = MemoryWriter()
    sessions = SessionFacts(writer, keeps_text=lambda: keeps_text)
    return MessageFacts(sessions, CollectionStatus(writer), StateFile(tmp_path / "messages.json"))


def written(writer, table, *, operation=None):
    return [row for op, name, rows in writer.operations
            if name == table and (operation is None or op == operation)
            for row in rows]


def quality(facts, component):
    return [row for row in facts.quality.rows.values() if row["component"] == component]


def current(writer, table):
    """Last handoff per native key, excluding deletions."""
    keys = [name for name in TABLES[table].key if name != "node_id"]
    result = {}
    for operation, name, rows in writer.operations:
        if name != table:
            continue
        for row in rows:
            key = tuple(row.get(field) for field in keys)
            if operation == "delete":
                result.pop(key, None)
            else:
                result[key] = row
    return list(result.values())


class UsageFacts(SessionFacts):
    """Expose recorded usage handoffs to the dashboard's named read."""

    def __init__(self):
        super().__init__(MemoryWriter())
        self.profiles = []
        self.history_store = Store(
            writer=self.writer,
            reader=FixtureReader({
                "usage.sessions": lambda _: self.usage_rows(),
                "analytics.profiles": lambda _: self.profiles,
            }),
        )

    def usage_rows(self, *, session_ids=None):
        return [
            row | {"models": json.loads(row["models_json"]),
                   "daily": json.loads(row["daily_json"]),
                   "unpriced_models": json.loads(row["unpriced_models"])}
            for row in current(self.writer, "session_usage")
            if session_ids is None or row["session_id"] in session_ids
        ]
