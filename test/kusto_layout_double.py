"""An in-memory Kusto database for the layout check, migrations and reset.

It answers the management commands and queries those paths send, keeps table schemas,
row counts and ``schema_version`` rows, and records every command and query.
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


class FakeKusto:
    def __init__(self, tables=None, *, layout_rows=(), counts=None):
        # name -> {"columns": {column: type}, "rows": count}
        self.tables = {name: {"columns": dict(spec["columns"]), "rows": spec.get("rows", 0)}
                       for name, spec in (tables or {}).items()}
        self.layout_rows = [dict(row) for row in layout_rows]
        self.counts = counts or (lambda query: 0)
        self.commands: list[str] = []
        self.queries: list[str] = []
        self.fail = lambda text: None
        self._clock = itertools.count(1)

    def with_table(self, name, rows=0, columns=None):
        self.tables[name] = {"columns": dict(columns if columns is not None else TABLES[name].columns), "rows": rows}
        return self

    def layout_row(self, version, compatible_since, epoch="e1", *, detail="new", kind="layout", step=""):
        self.with_table("schema_version", rows=len(self.layout_rows) + 1)
        self.layout_rows.append({"kind": kind, "version": version, "compatible_since": compatible_since,
                                 "data_epoch": epoch, "aictl_version": "0.test", "written_at": self._now(),
                                 "step": step, "detail": detail})
        return self

    def _now(self):
        return f"2026-11-23T00:00:{next(self._clock):02d}Z"

    # The changes the code made, in order (everything that is not a read).
    @property
    def changes(self):
        return [c for c in self.commands if not c.startswith(".show")]

    def execute_mgmt(self, database, text, properties=None):
        self.commands.append(text)
        self.fail(text)
        if text.startswith(".show database schema"):
            return response([("TableName", "string"), ("ColumnName", "string"), ("ColumnType", "string")],
                            [[name, column, _SYSTEM[kind]] for name, spec in self.tables.items()
                             for column, kind in spec["columns"].items()])
        if text.startswith(".show tables details"):
            def retention(name):
                days = TABLES[name].retention_days if name in TABLES else 30
                return json.dumps({"SoftDeletePeriod": f"{days}.00:00:00"})

            return response([("TableName", "string"), ("TotalRowCount", "long"), ("RetentionPolicy", "string"),
                             ("StreamingIngestionPolicy", "string")],
                            [[name, spec["rows"], retention(name), json.dumps({"IsEnabled": True})]
                             for name, spec in self.tables.items()])
        if match := re.match(r"\.create-merge table \['(\w+)'\] \((.*)\)$", text):
            columns = dict(re.findall(r"\['(\w+)'\]:(\w+)", match.group(2)))
            spec = self.tables.setdefault(match.group(1), {"columns": {}, "rows": 0})
            spec["columns"].update({k: v for k, v in columns.items() if k not in spec["columns"]})
        elif match := re.match(r"\.drop tables \((.*)\) ifexists$", text):
            for name in re.findall(r"\['(\w+)'\]", match.group(1)):
                self.tables.pop(name, None)
                if name == "schema_version":
                    self.layout_rows.clear()
        elif text.startswith(".set-or-append ['schema_version']"):
            row = {}
            for name, _, number, string in _VALUE.findall(text.split("print ", 1)[1]):
                row[name] = int(number) if number else json.loads(string) if string else self._now()
            self.layout_rows.append(row)
            self.tables["schema_version"]["rows"] += 1
        return response()

    def execute_query(self, database, text, properties=None):
        self.queries.append(text)
        self.fail(text)
        if text == LAYOUT_QUERY:
            columns = ("kind", "version", "compatible_since", "data_epoch", "aictl_version", "written_at", "step",
                       "detail")
            return response([(c, "string") for c in columns],
                            [[row.get(c) for c in columns] for row in self.layout_rows])
        if text.endswith("| count"):
            return response([("Count", "long")], [[self.counts(text)]])
        raise AssertionError(f"unexpected query: {text[:200]}")

    execute = execute_query
