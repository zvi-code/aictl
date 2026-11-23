"""An in-memory Kusto database for the layout check, migrations, node tables and reset.

It answers the management commands and queries those paths send, keeps table schemas,
rows (as small dicts: node_id, the ingestion day and an identity), docstrings, retention,
stored functions and ``schema_version`` rows, and records every command and query.
"""

from __future__ import annotations

import itertools
import json
import re

from test_kusto_connection import response

from aictl.stores.kusto.schema import LAYOUT_QUERY
from aictl.stores.kusto.tables import TABLES

_SYSTEM = {"int": "System.Int32", "long": "System.Int64", "real": "System.Double", "string": "System.String",
           "datetime": "System.DateTime", "bool": "System.Boolean", "dynamic": "System.Object",
           "timespan": "System.TimeSpan", "guid": "System.Guid"}
_VALUE = re.compile(r"\['(\w+)'\]=(long\((-?\d+)\)|now\(\)|(\"(?:[^\"\\]|\\.)*\"))")
_NAME = r"\['([\w]+)'\]"
_DAY = "2026-11-01"


def _string(text):
    """The KQL string literal at the start of *text* (JSON-style double quotes) and the rest."""
    decoder = json.JSONDecoder()
    value, end = decoder.raw_decode(text)
    return value, text[end:]


class FakeKusto:
    def __init__(self, tables=None, *, layout_rows=(), counts=None):
        self.tables = {}
        for name, spec in (tables or {}).items():
            self.with_table(name, spec.get("rows", 0), spec["columns"])
        self.layout_rows = [dict(row) for row in layout_rows]
        self.counts = counts or (lambda query: 0)
        self.functions: dict[str, dict] = {}
        self.commands: list[str] = []
        self.queries: list[str] = []
        self.fail = lambda text: None
        # Called with (target, rows) before a copy lands: return the rows to store (to test a mismatch).
        self.on_copy = lambda target, rows: rows
        # Tables whose rows are still in the row store: table details report none of them.
        self.unsealed: set[str] = set()
        self._clock = itertools.count(1)
        self._ids = itertools.count(1)

    def with_table(self, name, rows=0, columns=None, *, node_id="node-a", day=_DAY, docstring="", data=None):
        """A table with *rows* rows of *node_id* ingested on *day* (or the rows in *data*)."""
        columns = dict(columns if columns is not None else TABLES[name].columns)
        if data is None:
            data = [{"node_id": node_id, "_day": day, "_id": next(self._ids)} for _ in range(rows)]
        self.tables[name] = {"columns": columns, "data": list(data), "docstring": docstring, "folder": "",
                             "retention": None, "extents": []}
        return self

    def rows(self, name, node_id=None):
        data = self.tables[name]["data"]
        return [r for r in data if node_id is None or r["node_id"] == node_id]

    def add_rows(self, name, node_id, count, day=_DAY):
        self.tables[name]["data"].extend({"node_id": node_id, "_day": day, "_id": next(self._ids)}
                                         for _ in range(count))
        return self

    def layout_row(self, version, compatible_since, epoch="e1", *, detail="new", kind="layout", step="",
                   node_id="node-a"):
        if "schema_version" not in self.tables:
            self.with_table("schema_version")
        self.layout_rows.append({"kind": kind, "node_id": node_id, "version": version,
                                 "compatible_since": compatible_since, "data_epoch": epoch, "aictl_version": "0.test",
                                 "written_at": self._now(), "step": step, "detail": detail})
        return self

    def _now(self):
        return f"2026-11-23T00:{next(self._clock) // 60:02d}:{next(self._clock) % 60:02d}Z"

    # The changes the code made, in order (everything that is not a read).
    @property
    def changes(self):
        return [c for c in self.commands if not c.startswith(".show")]

    def count(self, name):
        return len(self.tables[name]["data"]) if name != "schema_version" else len(self.layout_rows)

    # ── management commands ─────────────────────────────────────────

    def execute_mgmt(self, database, text, properties=None):
        self.commands.append(text)
        self.fail(text)
        if text.startswith(".show database schema"):
            return response([("TableName", "string"), ("ColumnName", "string"), ("ColumnType", "string")],
                            [[name, column, _SYSTEM[kind]] for name, spec in self.tables.items()
                             for column, kind in spec["columns"].items()])
        if text.startswith(".show tables details"):
            def retention(name):
                if self.tables[name]["retention"] is not None:
                    return json.dumps({"SoftDeletePeriod": self.tables[name]["retention"]})
                spec = TABLES.get(name)
                if spec is None and "__" in name:
                    spec = TABLES.get(name.rsplit("__", 1)[0])
                return json.dumps({"SoftDeletePeriod": spec.retention_timespan if spec else "30.00:00:00"})

            columns = [("TableName", "string"), ("TotalRowCount", "long"), ("TotalExtents", "long"),
                       ("TotalExtentSize", "long"), ("MaxExtentsCreationTime", "string"),
                       ("RetentionPolicy", "string"), ("StreamingIngestionPolicy", "string"),
                       ("Folder", "string"), ("DocString", "string")]
            return response(columns, [[name, 0 if name in self.unsealed else self.count(name),
                                       1 if self.count(name) else 0, 100 * self.count(name),
                                       "2026-11-22T00:00:00Z" if self.count(name) else None, retention(name),
                                       json.dumps({"IsEnabled": True}), spec["folder"], spec["docstring"]]
                                      for name, spec in self.tables.items()])
        if text.startswith(".show functions"):
            return response([("Name", "string"), ("Body", "string")],
                            [[name, f["body"]] for name, f in self.functions.items()])
        if match := re.match(rf"\.create-merge table {_NAME} \((.*)\)$", text):
            self._merge(match.group(1), match.group(2))
        elif text.startswith(".create-merge tables "):
            body, _, options = text[len(".create-merge tables "):].rpartition(") with (")
            folder = re.search(r'folder = ("(?:[^"\\]|\\.)*")', options)
            doc = re.search(r'docstring = ("(?:[^"\\]|\\.)*")', options)
            for name, spec in re.findall(rf"{_NAME}\(([^)]*)\)", body + ")"):
                created = name not in self.tables
                self._merge(name, spec)
                if created:
                    self.tables[name]["folder"] = json.loads(folder.group(1)) if folder else ""
                    self.tables[name]["docstring"] = json.loads(doc.group(1)) if doc else ""
        elif match := re.match(rf"\.alter table {_NAME} docstring (.*)$", text):
            self.tables[match.group(1)]["docstring"] = _string(match.group(2))[0]
        elif match := re.match(rf"\.alter table {_NAME} folder (.*)$", text):
            self.tables[match.group(1)]["folder"] = _string(match.group(2))[0]
        elif match := re.match(r"\.alter tables \((.*)\) policy retention (.*)$", text):
            period = json.loads(_string(match.group(2))[0])["SoftDeletePeriod"]
            for name in re.findall(_NAME, match.group(1)):
                self.tables[name]["retention"] = period
        elif match := re.match(rf"\.alter-merge table {_NAME} policy retention softdelete = (\w+)$", text):
            self.tables[match.group(1)]["retention"] = match.group(2)
        elif match := re.match(r"\.drop tables \((.*)\) ifexists$", text):
            for name in re.findall(_NAME, match.group(1)):
                self.tables.pop(name, None)
                if name == "schema_version":
                    self.layout_rows.clear()
        elif match := re.match(r"\.rename tables (.*)$", text):
            pairs = re.findall(rf"{_NAME} = {_NAME}", match.group(1))
            missing = [old for _, old in pairs if old not in self.tables]
            if missing:
                raise RuntimeError(f"Entity name '{missing[0]}' of kind 'Table' does not exist")
            moved = {new: self.tables.pop(old) for new, old in pairs}
            self.tables.update(moved)
        elif match := re.match(rf"\.clear table {_NAME} data$", text):
            self.tables[match.group(1)]["data"] = []
        elif match := re.match(r"\.create-or-alter function with \(folder = (\"[^\"]*\"), docstring = (.*)$", text):
            docstring, rest = _string(match.group(2))
            name, body = self._function(rest)
            self.functions[name] = {"body": body, "docstring": docstring, "folder": json.loads(match.group(1))}
        elif match := re.match(r"\.drop function \['(\w+)'\] ifexists$", text):
            self.functions.pop(match.group(1), None)
        elif text.startswith(".set-or-append ['schema_version']"):
            row = {}
            for name, _, number, string in _VALUE.findall(text.split("print ", 1)[1]):
                row[name] = int(number) if number else json.loads(string) if string else self._now()
            self.layout_rows.append(row)
        elif match := re.match(rf"\.set-or-append {_NAME}( with \(creationTime=(\"[^\"]*\")\))? <\| {_NAME} \| take 0"
                               r" \| union \(table\(\"(\w+)\"\) \| where (.*)\)$", text):
            target, created, source, where = match.group(1), match.group(3), match.group(5), match.group(6)
            rows = [dict(r) for r in self._where(source, where)]
            rows = self.on_copy(target, rows)
            self.tables[target]["data"].extend(rows)
            self.tables[target]["extents"].append({"created": json.loads(created) if created else None,
                                                   "rows": len(rows)})
        return response()

    def _function(self, rest):
        match = re.match(r"\) (?:\['(\w+)'\]|(\w+))\(\) (\{.*\})$", rest)
        return match.group(1) or match.group(2), match.group(3)

    def _merge(self, name, spec):
        columns = dict(re.findall(r"\['(\w+)'\]:(\w+)", spec))
        table = self.tables.get(name)
        if table is None:
            self.with_table(name, 0, {})
            table = self.tables[name]
        table["columns"].update({k: v for k, v in columns.items() if k not in table["columns"]})

    # ── queries ─────────────────────────────────────────────────────

    def _where(self, source, where):
        """The rows of *source* that a migration predicate selects: node, then optionally the day."""
        rows = self.tables[source]["data"]
        parts = [p.strip() for p in where.split(" | where ")]
        node = parts[0]
        if node == "isempty(node_id)":
            rows = [r for r in rows if not r["node_id"]]
        else:
            ident = json.loads(node.removeprefix("node_id == "))
            rows = [r for r in rows if r["node_id"] == ident]
        for part in parts[1:]:
            if part == "isnull(ingestion_time())":
                rows = [r for r in rows if r["_day"] is None]
            elif day := re.match(r"bin\(ingestion_time\(\), 1d\) == datetime\((\d{4}-\d\d-\d\d)", part):
                rows = [r for r in rows if r["_day"] == day.group(1)]
        return rows

    def _checksum(self, rows):
        return sum(hash(("row", r["node_id"], r["_id"])) % 1_000_000_007 for r in rows)

    def execute_query(self, database, text, properties=None):
        self.queries.append(text)
        self.fail(text)
        if text == LAYOUT_QUERY:
            columns = ("kind", "node_id", "version", "compatible_since", "data_epoch", "aictl_version", "written_at",
                       "step", "detail")
            return response([(c, "string") for c in columns],
                            [[row.get(c) for c in columns] for row in self.layout_rows])
        if match := re.match(r"table\(\"(\w+)\"\) \| extend node_id=.* \| summarize n=count\(\) by node_id", text):
            idents = sorted({r["node_id"] for r in self.tables[match.group(1)]["data"]})
            return response([("node_id", "string"), ("n", "long")],
                            [[i, len(self.rows(match.group(1), i))] for i in idents])
        if match := re.match(r"table\(\"(\w+)\"\) \| where (.*?) \| summarize n=count\(\), newest=max\(ingestion_time\(\)\)"
                             r"( by slice_start=bin\(ingestion_time\(\), 1d\))?", text):
            rows = self._where(match.group(1), match.group(2))
            if not match.group(3):
                return response([("n", "long"), ("newest", "string")],
                                [[len(rows), f"{max(r['_day'] for r in rows)}T23:00:00Z" if rows else None]])
            days = sorted({r["_day"] for r in rows}, key=lambda d: d or "")
            return response([("slice_start", "string"), ("n", "long"), ("newest", "string")],
                            [[None if d is None else f"{d}T00:00:00Z", sum(1 for r in rows if r["_day"] == d),
                              None if d is None else f"{d}T23:00:00Z"] for d in days])
        if match := re.match(r"(?:table\(\"(\w+)\"\)|\['(\w+)'\]) \| where (.*?) \| summarize n=count\(\), h=sum\(hash",
                             text):
            name = match.group(1) or match.group(2)
            rows = self._where(name, match.group(3))
            return response([("n", "long"), ("h", "long")], [[len(rows), self._checksum(rows)]])
        if match := re.match(rf"{_NAME} \| count$", text):
            return response([("Count", "long")], [[self.count(match.group(1)) if match.group(1) in self.tables else 0]])
        if text.endswith("| count"):
            return response([("Count", "long")], [[self.counts(text)]])
        raise AssertionError(f"unexpected query: {text[:300]}")

    execute = execute_query
