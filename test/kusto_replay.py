"""Seed the real KQL views with inline tables, then replay their responses offline."""

from __future__ import annotations

import gzip
import hashlib
import json
import os
import re
import threading
import zlib
from base64 import b64encode
from collections import defaultdict
from datetime import datetime
from itertools import count
from pathlib import Path
from types import SimpleNamespace

from aictl.stores import Store
from aictl.stores.kusto.current import SUFFIX as CURRENT_SUFFIX
from aictl.stores.kusto.current import current_names
from aictl.stores.kusto.current import view_query as current_view_query
from aictl.stores.kusto.reader import KustoReader
from aictl.stores.kusto.recorded import RecordedKustoClient, UnrecordedQueryError
from aictl.stores.kusto.tables import TABLES

DATABASE = "aictl_perf_test"
CLUSTER = os.environ.get("AICTL_KUSTO_CLUSTER", "https://example.swedencentral.dev.kusto.windows.net")
RECORDINGS = Path(__file__).parent / "recordings" / "kusto"
EPOCH = "2026-01-01"
LOCAL_NODE = "test-node"
NOW = 1777593600.0
_BYPASS = re.compile(r"\b(?:table|materialized_view|database|cluster)\s*\(", re.IGNORECASE)
_TEXT = re.compile(r"""(?P<quoted>\['[A-Za-z_][A-Za-z_0-9]*'\])|@?"(?:\\.|[^"\\])*"|@?'(?:\\.|[^'\\])*'|//[^\n]*""")
_IDENTIFIER = re.compile(r"\b[A-Za-z_][A-Za-z_0-9]*\b")
_PROTOCOL = 1
_STORE_IDS = count()

# These are the defaults that the retired SQL schema gave its fact writers.
# Explicit None still means null.
_ZERO = frozenset({
    "cache_creation_tokens", "cache_read_tokens", "completed", "duration_ms", "file_events",
    "files_modified", "input_tokens", "is_error", "is_sidechain", "output_tokens", "pid",
    "request_count", "seq", "tool_call_count", "turn_count",
})


def _json(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"), allow_nan=False)


def _cell(value, typ):
    if typ == "string":
        return _json("" if value is None else str(value))
    if typ == "bool" and value is not None:
        return "true" if value else "false"
    if value is None:
        return f"{typ}(null)"
    if typ == "datetime":
        return f"datetime({value.isoformat() if isinstance(value, datetime) else value})"
    if typ == "dynamic":
        return f"dynamic({_json(value)})"
    if typ in {"real", "long", "int"}:
        return f"{typ}({_json(float(value) if typ == 'real' else int(value))})"
    raise ValueError(f"No inline serializer for {typ!r}")


class Facts:
    """Mutable table rows. Tests can update or remove a seed between two reads."""

    def __init__(self, *, node=LOCAL_NODE):
        self.node = node
        self.rows = defaultdict(list)

    def insert(self, table, **values):
        columns = dict(TABLES[table].columns)
        if unknown := values.keys() - columns.keys():
            raise ValueError(f"Unknown columns for {table}: {sorted(unknown)}")
        n = len(self.rows[table]) + 1
        row = dict(values)
        row.setdefault("node_id", self.node)
        if "id" in columns:
            row.setdefault("id", n)
        if "dedup_key" in columns and "id" in columns:
            row.setdefault("dedup_key", f"{table}:{n}")
        if "source_key" in columns:
            row.setdefault("source_key", f"{table}:{n}")
        if table == "events":
            row.setdefault("seq", n)
        self.rows[table].append(row)
        return row

    def replace(self, table, *, where, **values):
        for row in self.rows[table]:
            if all(row.get(key) == value for key, value in where.items()):
                row.update(values)

    def clear(self, *tables):
        for table in tables:
            self.rows[table].clear()

    def defaults(self, table):
        schema = TABLES[table]
        zero = {"_v": EPOCH, **dict.fromkeys(_ZERO, 0)}
        if schema.tombstone:
            zero[schema.tombstone] = False
        if table == "requests":
            # The writer stores a number (RequestRow.cost_usd = 0.0); null is the marker of a call
            # whose cost cannot be known (data.provenance.CACHE_NOT_REPORTED), which a test sets.
            zero["cost_usd"] = 0.0
        return {key: zero.get(key, "" if kind == "string" else None) for key, kind in schema.columns}

    def inline(self, table, packed, bind):
        rows = self.rows.get(table, ())
        schema = TABLES[table]
        columns = dict(schema.columns)
        defaults = self.defaults(table)
        # Use the complete schema, but serialize only the populated columns.
        used = set().union(*(row.keys() for row in rows))
        inline = {k: v for k, v in columns.items() if not rows or k in used}
        if len(rows) > 4000:
            # Kusto limits the query text to 2 MiB. Bind large fixtures as
            # compressed JSON chunks and expand the same input rows in Kusto.
            param = f"_fixture_{table}"
            chunks, digest = [], hashlib.sha256()
            for start in range(0, len(rows), 400):
                cells = [
                    [row.get(k, defaults[k]) for k in inline]
                    for row in rows[start:start + 400]
                ]
                raw = bind(_json(cells)).encode("utf-8")
                digest.update(raw + b"\n")
                chunks.append(b64encode(zlib.compress(raw, 1)).decode("ascii"))
            packed[param] = (",".join(chunks), digest.hexdigest())
            casts = {"string": "tostring", "long": "tolong", "int": "toint", "real": "toreal",
                     "datetime": "todatetime", "bool": "tobool", "dynamic": "todynamic"}
            typed = ", ".join(f"['{k}']={casts[typ]}(_row[{i}])" for i, (k, typ) in enumerate(inline.items()))
            text = (f"let {table} = print _chunk = split({param}, ',') | mv-expand _chunk "
                    "| extend _row = parse_json(zlib_decompress_from_base64_string(tostring(_chunk))) "
                    f"| mv-expand _row | project {typed}")
        else:
            header = ", ".join(f"['{k}']:{typ}" for k, typ in inline.items())
            values = ",\n".join(
                ", ".join(_cell(row.get(k, defaults.get(k)), typ) for k, typ in inline.items())
                for row in rows
            )
            text = f"let {table} = datatable({header})[\n{values}\n]"
        omitted = [f"['{k}']={_cell(defaults.get(k), typ)}" for k, typ in columns.items() if k not in inline]
        if omitted:
            text = f"{text} | extend {', '.join(omitted)}"
        # Physical column order matters to some unions and views.
        projection = ", ".join(f"['{k}']" for k in columns)
        return f"{text} | project {projection};\n"


def _query_with_facts(facts, text, packed, bind):
    code = _TEXT.sub(lambda match: match["quoted"][2:-2] if match["quoted"] else " ", text)
    if _BYPASS.search(code) or text.lstrip().startswith("."):
        raise ValueError("This KQL bypasses inline fixture tables")
    names = set(_IDENTIFIER.findall(code))
    # A current view (stores/kusto/current.py) is its materialized view's own query over the inline table.
    currents = sorted(names & current_names())
    tables = sorted((names & TABLES.keys()) | {name.removesuffix(CURRENT_SUFFIX) for name in currents})
    prefix = "".join(facts.inline(table, packed, bind) for table in tables)
    for name in currents:
        table = name.removesuffix(CURRENT_SUFFIX)
        prefix += f"let {name} = {current_view_query(table, table, TABLES[table].key)};\n"
    # Keep query parameter declarations at the start of the script.
    if text.startswith("declare query_parameters"):
        declaration, query = text.split(";", 1)
        if packed:
            declaration = declaration.rstrip().removesuffix(")") + ", " + ", ".join(f"{p}:string" for p in packed) + ")"
        return f"{declaration};\n{prefix}{query}"
    if packed:
        prefix = "declare query_parameters(" + ", ".join(f"{p}:string" for p in packed) + ");\n" + prefix
    return prefix + text


def _replace_strings(value, replace):
    if isinstance(value, str):
        return replace(value)
    if isinstance(value, dict):
        return {key: _replace_strings(item, replace) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return type(value)(_replace_strings(item, replace) for item in value)
    return value


class FixturePath:
    """Make an explicitly selected test sandbox independent of pytest's run number."""

    marker = "__AICTL_TEST_PATH__"

    def __init__(self, path):
        self.path = str(path)

    def bind(self, text):
        return text.replace(_json(self.path)[1:-1], self.marker).replace(self.path, self.marker)

    def restore(self, text):
        return text.replace(self.marker, self.path)

    def response(self, response):
        class Rows(list):
            pass

        tables = []
        for table in response.primary_results:
            rows = Rows(_replace_strings(tuple(row), self.restore) for row in table)
            rows.columns = table.columns
            tables.append(rows)
        return SimpleNamespace(primary_results=tables)


class Tape:
    """One exact response map per test module, shared by that module's tests."""

    def __init__(self, module):
        self.path = RECORDINGS / module / "views.jsonl.gz"
        self.recording = os.environ.get("AICTL_RECORD_KUSTO") == "1"
        self.lock = threading.Lock()
        self.records = {}
        self.responses = {}
        self.changed = False
        self.replay = RecordedKustoClient(self.path) if self.path.is_file() else None
        self.real = None
        if self.recording:
            if os.environ.get("AICTL_PARITY_DB") != DATABASE:
                raise ValueError(f"Recording requires AICTL_PARITY_DB={DATABASE}")
            from aictl.kusto import KustoSettings
            from aictl.stores.kusto.client import KustoClientFactory

            self.real = KustoClientFactory.client(KustoSettings(CLUSTER, DATABASE))
            if self.path.is_file():
                with gzip.open(self.path, "rt", encoding="utf-8") as file:
                    self.records = {row["kql"]: row for line in file if (row := json.loads(line))}

    def client(self, facts, fixture_path=None):
        tape = self

        class Client:
            def execute_query(self, database, text, props):
                return tape.execute(facts, text, props, fixture_path=fixture_path)

        return Client()

    def reader(self, facts, fixture_path=None):
        return KustoReader(self.client(facts, fixture_path), DATABASE)

    def execute(self, facts, text, props, *, fixture_path=None):
        packed = {}
        bind = fixture_path.bind if fixture_path is not None else lambda value: value
        query = _query_with_facts(facts, text, packed, bind)
        parameters = json.loads(props.to_json()).get("Parameters", {})
        if fixture_path is not None:
            query = fixture_path.bind(query)
            parameters = {name: fixture_path.bind(value) for name, value in parameters.items()}
        respond = fixture_path.response if fixture_path is not None else lambda response: response
        fingerprints = {**parameters, **{name: digest for name, (_, digest) in packed.items()}}
        identity = _json([_PROTOCOL, query, sorted(fingerprints.items())])
        key = "inline:" + hashlib.sha256(identity.encode("utf-8")).hexdigest()
        with self.lock:
            if key in self.responses:
                return respond(self.responses[key])
            if self.replay is not None:
                try:
                    return respond(self.replay.execute_query(DATABASE, key, props))
                except UnrecordedQueryError:
                    if not self.recording:
                        raise UnrecordedQueryError(f"Missing fixture query {key} in {self.path}") from None
            if self.real is None:
                raise UnrecordedQueryError(f"Missing fixture recording {self.path}")
            from azure.kusto.data import ClientRequestProperties

            request = ClientRequestProperties()
            request.set_option("request_readonly", True)
            request.set_option("request_readonly_hardline", True)
            for name, value in parameters.items():
                request.set_parameter(name, value)
            for name, (value, _) in packed.items():
                request.set_parameter(name, value)
            response = self.real.execute_query(DATABASE, query, request)
            if getattr(response, "errors_count", 0):
                raise RuntimeError("Cannot record a partial Kusto response")
            if key not in self.records:
                self.records[key] = {
                    "kind": "query", "kql": key, "outcome": "ok",
                    "response": [
                        {
                            "columns": [{"name": c.column_name, "type": c.column_type} for c in table.columns],
                            "rows": [list(row) for row in table],
                        }
                        for table in response.primary_results
                    ],
                }
                self.changed = True
            self.responses[key] = response
            return respond(response)

    def save(self):
        if not self.changed:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        pending = self.path.with_suffix(f".{os.getpid()}.gz")
        with pending.open("wb") as target, gzip.GzipFile(fileobj=target, mode="wb", filename="", mtime=0) as file:
            for record in sorted(self.records.values(), key=lambda row: row["kql"]):
                file.write((json.dumps(record, default=str, separators=(",", ":")) + "\n").encode("utf-8"))
        pending.replace(self.path)


class FixtureWriter:
    """Keep write-side tests and replay reads on the same captured rows."""

    def __init__(self, facts):
        from aictl.stores.testing import MemoryWriter

        self.memory = MemoryWriter()
        self.facts = facts

    def append(self, table, rows):
        rows = list(rows)
        self.memory.append(table, rows)
        for row in rows:
            self.facts.insert(table, **row)

    def upsert(self, table, rows):
        rows = list(rows)
        self.memory.upsert(table, rows)
        for row in rows:
            values = dict(row)
            keys = TABLES[table].key
            match = {key: values[key] for key in keys if key in values}
            existing = self.facts.rows.get(table, ())
            if match:
                self.facts.rows[table] = [r for r in existing if any(r.get(k) != v for k, v in match.items())]
            self.facts.insert(table, **values)

    def delete(self, table, keys):
        self.memory.delete(table, keys)
        for row in self.memory.operations[-1][2]:
            # A tombstone may carry the whole deleted row; the key alone selects what it deletes.
            key = {k: v for k, v in row.items() if k in TABLES[table].key}
            self.facts.rows[table] = [
                row for row in self.facts.rows.get(table, ()) if any(row.get(k) != v for k, v in key.items())
            ]

    def flush(self):
        self.memory.flush()

    def health(self):
        return self.memory.health()


class SeededStore:
    capture = "full"
    _retention_days = None
    _content_retention_days = None
    streams_observations = False

    def __init__(self, tape, *, node=LOCAL_NODE, fixture_path=None):
        self.facts = Facts(node=node)
        self.history_store = Store(reader=tape.reader(self.facts, fixture_path))
        self._path = f"inline:{next(_STORE_IDS)}"

    def insert(self, table, **values):
        return self.facts.insert(table, **values)

    def replace(self, table, *, where, **values):
        return self.facts.replace(table, where=where, **values)

    def storage_status(self):
        return {"storage_bytes": 0, "storage_budget_bytes": None}

    def _keeps_text(self):
        return self.capture == "full"

