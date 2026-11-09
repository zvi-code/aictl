"""SQLite statements as KQL: what lets the code keep its SQL while the store lives on Kusto.

The data model the translation builds to (see ``schema``): every SQLite table is a
Kusto table of the same name and columns plus ``rowid``, ``_v`` and ``_deleted``.
Rows are immutable versions. A read keeps the newest version per key and drops the
deleted ones, which is what :func:`schema.current` writes, so every statement starts
with a ``let`` per store table it reads, shadowing the table with its current rows::

    let ['events'] = ['events'] | summarize arg_max(['_v'], *) by ... | where ['_deleted'] == false ...;

and the body below reads ``['events']`` as SQLite would. Every identifier is
bracket-quoted, since many column names (kind, by, key) are KQL keywords.

What each statement becomes (``statements`` has the contract):

- SELECT is a :class:`Query`: ``T | where | summarize | project | sort | take``.
  GROUP BY is ``summarize``; a bare column next to an aggregate takes its value from
  the row of the query's single MIN/MAX (``arg_max``), as SQLite does, else from any
  row (``take_any``). HAVING is a ``where`` after it, DISTINCT is ``distinct``,
  UNION [ALL] is ``union``, a CTE is one more ``let``. ORDER BY keeps SQLite's NULL
  order (first when ascending, last when descending).
- A join is ``join kind=inner|leftouter`` on the equalities of its ON clause. Columns
  of a FROM with joins are renamed ``alias__column`` first, so Kusto never suffixes
  a clashing name. Other ON conditions filter an inner join; a LEFT JOIN with them is
  the inner join plus the left rows that found no match.
- A subquery that is not correlated is ``toscalar(...)``, ``in (...)`` or, for
  EXISTS, a count over it. A correlated one whose correlation is equalities between
  inner and outer columns is a ``leftouter`` join on those columns of the subquery
  grouped by them (a marker column for EXISTS, the aggregate for a scalar
  subquery); any other correlation raises :class:`Unsupported`.
- UPDATE and DELETE are a :class:`Mutation`: the current rows the WHERE selects,
  projected to every column of the table with ``_v = now()`` and ``_deleted`` false
  (UPDATE, with the SET values) or true (DELETE). The connection appends that result
  with ``.set-or-append``.
- INSERT ... VALUES is an :class:`Insert` with every column filled (``row_defaults``
  for the ones the statement leaves out) and SQLite's conflict clause. An ON CONFLICT
  DO UPDATE on the table's key or one of its unique indexes whose SET only copies the
  new row (``col = excluded.col``) stays an Insert: ``update_columns`` names those
  columns and ``update_kql`` is the DO UPDATE's WHERE over the current row, where
  ``excluded.col`` is written ``['__new_col']``; the connection binds those names to
  the new row's values. Any other upsert (a SET that computes, such as ``count =
  count + excluded.count``, or a target that is neither the key nor a unique index)
  is a Mutation that joins the new rows to the current ones on the target and writes
  the merged version itself.
- INSERT ... SELECT is a Mutation of kind ``insert``. Rows the cluster writes this way
  get ``rowid = toint(rand(2147483647)) * 4194304 + row_number()``: a random base per
  row plus its position, unique enough for a key nobody else assigns.
- PRAGMA is a :class:`Pragma` the connection answers; CREATE, DROP, ALTER, ATTACH,
  DETACH, transactions and maintenance commands are a :class:`Noop`. A CREATE TABLE
  also teaches the translator that table, so a table the code creates at run time can
  be read afterwards (the connection still has to create it on the cluster).

Values: parameters (``?``, ``:name``, ``$name``) are written into the KQL as literals.
A literal compared with a column takes the column's type (SQLite's affinity), so
``ts >= '5'`` compares numbers. Kusto has no NULL text: the connection writes ''
for it, so ``IS NULL`` on a TEXT column is ``isempty()`` and a NULL text value is ''.
SQLite comparisons are integers; where one is used as a number (``SUM(x > 0)``) it is
``iff(cond, 1, 0)``, and where a number is used as a condition it is ``x != 0``.
``json_extract`` reads ``todynamic(col)`` and is converted to the type it is compared
with, summed or coalesced with. ``localtime`` converts with the zone of the machine
that translates (its IANA name, else its current UTC offset).
"""

from __future__ import annotations

import json
import math
import os
import re
import sqlite3
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

import sqlglot
from sqlglot import exp
from sqlglot.dialects.sqlite import SQLite
from sqlglot.errors import ParseError, TokenError

from .schema import DELETED, ROWID, VERSION, Table, current, parse_schema, quote, row_defaults, store_schema
from .statements import Insert, Mutation, Noop, Pragma, Query, Statement, Unsupported

_NO = object()

# Statements that change nothing a Kusto read can see.
_NOOP_HEADS = {
    "CREATE": "schema comes from the store schema",
    "DROP": "tables are not dropped on the cluster",
    "ALTER": "schema comes from the store schema",
    "ATTACH": "no attached databases on the cluster",
    "DETACH": "no attached databases on the cluster",
    "BEGIN": "no transactions on the cluster",
    "COMMIT": "no transactions on the cluster",
    "END": "no transactions on the cluster",
    "ROLLBACK": "no transactions on the cluster",
    "SAVEPOINT": "no transactions on the cluster",
    "RELEASE": "no transactions on the cluster",
    "ANALYZE": "no statistics to gather on the cluster",
    "VACUUM": "the cluster manages its storage",
    "REINDEX": "no indexes on the cluster",
}

_NUMERIC = ("long", "real")
_NULLS = {
    "long": "long(null)",
    "real": "real(null)",
    "bool": "bool(null)",
    "string": "''",
    "datetime": "datetime(null)",
    "dynamic": "dynamic(null)",
    None: "dynamic(null)",
}
_SQLITE_TYPES = {"long": "INTEGER", "real": "REAL", "string": "TEXT", "bool": "INTEGER"}
_MASTER_TABLES = ("sqlite_master", "sqlite_schema", "sqlite_temp_master", "sqlite_temp_schema")
# strftime specifiers and the format_datetime pattern that writes each.
_STRFTIME = {"Y": "yyyy", "m": "MM", "d": "dd", "H": "HH", "M": "mm", "S": "ss", "f": "ss.fff"}
_EPOCH = "datetime(1970-01-01)"


class _Correlated(Exception):  # noqa: N818 - control flow, not an error
    """A subquery read a column of the query around it."""


@dataclass
class _K:
    """A translated scalar expression: KQL text and its Kusto type when known."""

    text: str
    type: str | None = None
    value: object = _NO  # the Python value of a literal
    json: bool = False  # a JSON value built by json_array / json_group_array: written out as text
    blob: bool = False  # CAST(x AS BLOB): its LENGTH counts bytes

    @property
    def literal(self) -> bool:
        return self.value is not _NO

    @property
    def null(self) -> bool:
        return self.literal and self.value is None


@dataclass
class _Col:
    qual: str | None  # the table name or alias that qualifies it, lowercased
    name: str  # its SQL name
    kql: str  # its name in the KQL pipeline
    type: str | None
    star: bool = True  # SELECT * returns it (rowid is not)


class _Scope:
    """The columns an expression can name; ``parent`` is the query around a subquery."""

    def __init__(self, cols: list[_Col], parent: _Scope | None = None) -> None:
        self.cols = cols
        self.parent = parent

    def find(self, name: str, qual: str | None) -> _Col | None:
        lname = name.lower()
        lqual = qual.lower() if qual else None
        for c in self.cols:
            if c.name.lower() == lname and (lqual is None or c.qual == lqual):
                return c
        return None

    def resolve(self, name: str, qual: str | None) -> _Col:
        col = self.find(name, qual)
        if col is not None:
            return col
        outer = self.parent
        while outer is not None:
            if outer.find(name, qual) is not None:
                raise _Correlated(name)
            outer = outer.parent
        raise Unsupported(f"no such column: {qual + '.' if qual else ''}{name}")


@dataclass
class _Rel:
    """A translated query: its pipeline and the columns it returns."""

    text: str
    cols: list[_Col]
    names: list[str]  # SQLite's names for the columns (cursor.description)


@dataclass
class _Agg:
    """The aggregation of a grouped SELECT, filled as its expressions are translated."""

    key_cols: set[str] = field(default_factory=set)  # plain columns grouped by (their KQL names)
    exprs: dict[str, _K] = field(default_factory=dict)  # SQL of a grouped expression -> its key column
    keys: list[str] = field(default_factory=list)  # the summarize's by-clause
    aggs: dict[str, tuple[str, str, _K]] = field(default_factory=dict)  # SQL -> (name, kql, result)
    bare: list[tuple[str, _K]] = field(default_factory=list)  # columns read outside an aggregate
    minmax: list[tuple[str, str]] = field(default_factory=list)  # ("max" | "min", argument) of each MIN/MAX


@dataclass
class _Ex:
    """What an expression is translated against.

    ``pre`` collects stages that run right after the FROM (the joins a correlated
    subquery becomes), ``win`` the window-function stages that run after the
    aggregation. ``agg`` is set while translating the parts of a grouped SELECT that
    run after its ``summarize``.
    """

    scope: _Scope
    agg: _Agg | None = None
    pre: list[str] = field(default_factory=list)
    win: list[str] = field(default_factory=list)


def _arg(node: exp.Expression, name: str) -> object:
    value = node.args.get(name)
    return value if value is not None else node.args.get(name + "_")


def _string(value: str) -> str:
    out = []
    for ch in value:
        if ch == "\\":
            out.append("\\\\")
        elif ch == "'":
            out.append("\\'")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif ord(ch) < 32:
            out.append(f"\\x{ord(ch):02x}")
        else:
            out.append(ch)
    return "'" + "".join(out) + "'"


def _number(text: str) -> int | float | None:
    try:
        return int(text)
    except ValueError:
        pass
    try:
        value = float(text)
    except ValueError:
        return None
    return value


def _real(value: float) -> str:
    if math.isnan(value):
        return "real(nan)"
    if math.isinf(value):
        return "real(+inf)" if value > 0 else "real(-inf)"
    text = repr(value)
    return text if any(ch in text for ch in ".en") else text + ".0"


def _lit(value: object, want: str | None = None) -> _K:
    """A Python value as a KQL literal, in the type *want* when it converts (SQLite's affinity)."""
    if value is None:
        return _K(_NULLS.get(want, "dynamic(null)"), want, None)
    if isinstance(value, bytes):
        value = value.decode("utf-8", "replace")
    if isinstance(value, bool):
        if want in _NUMERIC:
            return _lit(int(value), want)
        if want == "string":
            return _K(_string(str(int(value))), "string", value)
        return _K("true" if value else "false", "bool", value)
    if isinstance(value, int):
        if want == "string":
            return _K(_string(str(value)), "string", value)
        if want == "real" or not -(2**63) <= value < 2**63:
            return _K(_real(float(value)), "real", value)
        if want == "bool":
            return _K("true" if value else "false", "bool", value)
        return _K(str(value), "long", value)
    if isinstance(value, float):
        if want == "string":
            return _K(_string(repr(value)), "string", value)
        if want == "long" and value.is_integer() and -(2**63) <= value < 2**63:
            return _K(str(int(value)), "long", value)
        return _K(_real(value), "real", value)
    if isinstance(value, str):
        if want in _NUMERIC:
            num = _number(value.strip())
            if num is not None:
                return _lit(num, want)
        return _K(_string(value), "string", value)
    return _K(_string(str(value)), "string", str(value))


def _convert(k: _K, want: str | None) -> _K:
    """*k* as type *want*: literals are rewritten, other expressions wrapped in a conversion."""
    if want is None or k.type == want:
        return k
    if k.literal:
        out = _lit(k.value, want)
        if out.type == want or k.value is None:
            return out
    if k.type == "bool":
        if want == "long":
            return _K(f"iff({k.text}, 1, 0)", "long")
        if want == "real":
            return _K(f"iff({k.text}, 1.0, 0.0)", "real")
        if want == "string":
            return _K(f"iff({k.text}, '1', '0')", "string")
    if want == "string":
        return _K(f"tostring({k.text})", "string")
    if want == "long":
        return _K(f"tolong({k.text})", "long")
    if want == "real":
        return _K(f"todouble({k.text})", "real")
    if want == "bool":
        return _K(_truth(k), "bool")
    if want == "dynamic":
        return _K(f"todynamic({k.text})", "dynamic")
    return k


def _unify(ks: list[_K]) -> tuple[str | None, list[_K]]:
    """One type for values that end up in one column (CASE branches, COALESCE, a UNION)."""
    types = [k.type for k in ks if k.type and not k.null]
    kinds = set(types)
    if not kinds:
        want = None
    elif len(kinds) == 1:
        want = types[0]
    elif kinds <= {"long", "real", "bool"}:
        want = "real" if "real" in kinds else "long"
    elif "dynamic" in kinds and len(kinds - {"dynamic"}) == 1:
        want = next(iter(kinds - {"dynamic"}))
        if want == "bool":
            want = "long"
    elif "string" in kinds:
        want = "string"
    else:
        want = "real" if kinds <= {"long", "real", "bool", "dynamic"} else types[0]
    return want, [_convert(k, want) for k in ks]


def _truth(k: _K) -> str:
    """*k* as a KQL condition: SQLite treats a nonzero number as true."""
    if k.type == "bool":
        return k.text
    if k.literal:
        if isinstance(k.value, str):
            num = _number(k.value.strip())
            return "true" if num else "false"
        return "true" if k.value else "false"
    if k.type in _NUMERIC:
        return f"({k.text} != 0)"
    if k.type in ("string", "dynamic"):
        return f"(todouble({k.text}) != 0)"
    return k.text


def _value(k: _K) -> _K:
    """*k* as SQLite returns it: a condition is 1 or 0."""
    if k.type == "bool":
        return _K(f"iff({k.text}, 1, 0)", "long")
    return k


def _key(node: exp.Expression) -> str:
    return node.sql(dialect="sqlite")


def _conjuncts(node: exp.Expression | None) -> list[exp.Expression]:
    if node is None:
        return []
    if isinstance(node, exp.Paren):
        return _conjuncts(node.this)
    if isinstance(node, exp.And):
        return _conjuncts(node.this) + _conjuncts(node.expression)
    return [node]


def _walk_local(node: exp.Expression):
    """The nodes of *node* that belong to its own query: not inside a subquery."""
    yield node
    for child in node.iter_expressions():
        if isinstance(child, (exp.Select, exp.Subquery, exp.Union, exp.Exists)):
            continue
        yield from _walk_local(child)


def _is_aggregate(node: exp.Expression) -> bool:
    if isinstance(node, exp.Anonymous):
        return node.name.lower() == "total"
    if isinstance(node, (exp.Count, exp.Sum, exp.Avg, exp.GroupConcat, exp.JSONArrayAgg)):
        return True
    if isinstance(node, (exp.Max, exp.Min)):
        return not node.expressions
    return False


def _has_aggregate(node: exp.Expression) -> bool:
    for sub in _walk_local(node):
        if isinstance(sub, exp.Window):
            continue
        if _is_aggregate(sub) and not isinstance(sub.parent, exp.Window):
            return True
    return False


def _local_zone() -> str | None:
    tz = os.environ.get("TZ", "").lstrip(":")
    if tz and "/" in tz and not tz.startswith("/"):
        return tz
    try:
        link = os.readlink("/etc/localtime")
    except OSError:
        return None
    marker = "zoneinfo/"
    return link[link.index(marker) + len(marker) :] if marker in link else None


def _split(sql: str) -> list[str]:
    """The statements of a script, split where SQLite would (triggers keep their bodies)."""
    out: list[str] = []
    buf = ""
    for piece in re.split(r"(;)", sql):
        buf += piece
        if piece == ";" and sqlite3.complete_statement(buf):
            if buf.strip(" \t\r\n;"):
                out.append(buf.strip())
            buf = ""
    if buf.strip(" \t\r\n;") and not re.fullmatch(r"(\s|--[^\n]*\n?|/\*.*?\*/)*", buf, re.S):
        out.append(buf.strip())
    return out


def _strip_comments(sql: str) -> str:
    return re.sub(r"^(\s|--[^\n]*(\n|$)|/\*.*?\*/)*", "", sql, flags=re.S)


class Translator:
    """Turns SQLite statements of aictl's store into :mod:`statements` for a Kusto cluster."""

    def __init__(self, tables: dict[str, Table] | None = None) -> None:
        self.tables: dict[str, Table] = dict(tables if tables is not None else store_schema())
        self._lower = {name.lower(): t for name, t in self.tables.items()}

    def table(self, name: str) -> Table | None:
        return self._lower.get(name.lower())

    def learn(self, sql: str) -> list[Table]:
        """Add the tables a CREATE TABLE script defines; returns the ones that were new."""
        added = []
        for name, table in parse_schema(sql).items():
            if name.lower() not in self._lower:
                self.tables[name] = table
                self._lower[name.lower()] = table
                added.append(table)
        return added

    def translate_script(self, sql: str) -> list[Statement]:
        """Every statement of a script (``executescript``), in order, without parameters."""
        return [self.translate(stmt) for stmt in _split(sql)]

    def translate(self, sql: str, params: Sequence | Mapping | None = None) -> Statement:
        """One SQLite statement and its parameters as what the connection runs on Kusto.

        Raises :class:`Unsupported` for a statement that has no KQL form (the
        ``reason`` names the construct) and ValueError when parameters are missing.
        """
        parts = _split(sql)
        if len(parts) > 1:
            raise Unsupported("more than one statement (use translate_script)", sql)
        text = _strip_comments(parts[0] if parts else sql).strip().rstrip(";").strip()
        head = text.split(None, 1)[0].upper() if text else ""
        if head == "PRAGMA":
            return self._pragma(text, params)
        if head in _NOOP_HEADS:
            return self._noop(head, text)
        if head == "REPLACE":
            text = "INSERT OR " + text
        if head == "UPDATE":
            # No unique constraints on the cluster, so an UPDATE's conflict clause never applies.
            text = re.sub(r"^UPDATE\s+OR\s+(ROLLBACK|ABORT|REPLACE|FAIL|IGNORE)\s+", "UPDATE ", text, flags=re.I)
        if head == "EXPLAIN":
            raise Unsupported("EXPLAIN", sql)
        try:
            text, count = _number_params(text)
            nodes = sqlglot.parse(text, read="sqlite")
        except (ParseError, TokenError) as err:
            raise Unsupported("statement SQLite syntax the parser does not read", sql, [str(err)[:300]]) from None
        nodes = [n for n in nodes if n is not None]
        if len(nodes) != 1:
            raise Unsupported("more than one statement (use translate_script)", sql)
        if count and params is None:
            raise ValueError(f"the statement has {count} parameters and none were given: {sql[:200]}")
        build = _Build(self, params, sql)
        try:
            return build.statement(nodes[0])
        except _Correlated:
            raise Unsupported("correlated subquery", sql) from None
        except Unsupported as err:
            if not err.sql:
                err.sql = sql
            raise

    def _pragma(self, text: str, params: Sequence | Mapping | None) -> Pragma:
        m = re.fullmatch(r"PRAGMA\s+(?:([\w\"]+)\.)?([\w]+)\s*(?:\(\s*(.*?)\s*\)|=\s*(.*?))?\s*", text, re.S | re.I)
        if not m:
            raise Unsupported("PRAGMA form", text)
        name, argument, value = m.group(2).lower(), m.group(3), m.group(4)

        def clean(v: str | None) -> str | None:
            if v is None:
                return None
            v = v.strip()
            if v == "?" and isinstance(params, Sequence) and params:
                return str(params[0])
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"`":
                return v[1:-1]
            return v

        return Pragma(name=name, argument=clean(argument), value=clean(value))

    def _noop(self, head: str, text: str) -> Noop:
        if head == "CREATE":
            words = text.upper().split()
            if "TABLE" in words[:5]:
                if re.search(r"\bAS\s+SELECT\b", text, re.I):
                    raise Unsupported("CREATE TABLE ... AS SELECT", text)
                try:
                    self.learn(text)
                except (ParseError, TokenError):
                    pass
        return Noop(reason=_NOOP_HEADS[head], original=text)


def _number_params(sql: str) -> tuple[str, int]:
    """The SQL with each parameter written ``:name``; positional ``?`` become ``:__pN`` in text order."""
    tokens = SQLite().tokenize(sql)
    edits: list[tuple[int, int, str]] = []
    count = positional = 0
    for i, tok in enumerate(tokens):
        if tok.token_type == sqlglot.TokenType.PLACEHOLDER and tok.text == "?":
            edits.append((tok.start, tok.end, f":__p{positional}"))
            positional += 1
            count += 1
        elif tok.token_type == sqlglot.TokenType.VAR and tok.text.startswith("$") and len(tok.text) > 1:
            edits.append((tok.start, tok.end, ":" + tok.text[1:]))
            count += 1
        elif tok.token_type == sqlglot.TokenType.PARAMETER and i + 1 < len(tokens):
            nxt = tokens[i + 1]
            edits.append((tok.start, nxt.end, ":" + nxt.text))
            count += 1
        elif tok.token_type == sqlglot.TokenType.COLON and i + 1 < len(tokens):
            count += 1
    for start, end, repl in reversed(edits):
        sql = sql[:start] + repl + sql[end + 1 :]
    return sql, count


class _Build:
    """The translation of one statement: its ``let`` prelude and fresh names."""

    def __init__(self, translator: Translator, params: Sequence | Mapping | None, sql: str) -> None:
        self.tr = translator
        self.params = params
        self.sql = sql
        self.lets: dict[str, str] = {}
        self.ctes: dict[str, list[_Col]] = {}
        self.n = 0

    def fresh(self) -> int:
        self.n += 1
        return self.n

    def let(self, name: str, body: str) -> None:
        self.lets.setdefault(name, f"let {name} = {body};")

    def finish(self, body: str) -> str:
        return "\n".join([*self.lets.values(), body])

    # Statements.

    def statement(self, node: exp.Expression) -> Statement:
        if isinstance(node, (exp.Select, exp.Union, exp.Subquery)):
            rel = self.select(node, None)
            return Query(kql=self.finish(rel.text), columns=rel.names)
        if isinstance(node, exp.Insert):
            return self.insert(node)
        if isinstance(node, exp.Update):
            return self.update(node)
        if isinstance(node, exp.Delete):
            return self.delete(node)
        if isinstance(node, (exp.Intersect, exp.Except)):
            raise Unsupported(f"{type(node).__name__.upper()} of queries")
        raise Unsupported(f"statement {type(node).__name__}")

    def store_table(self, node: exp.Table) -> Table:
        db = node.args.get("db")
        if db is not None and db.name.lower() not in ("main", "temp"):
            raise Unsupported(f"attached database {db.name}")
        table = self.tr.table(node.name)
        if table is None:
            raise Unsupported(f"no such table: {node.name}")
        self.let(quote(table.name), current(table))
        return table

    def table_cols(self, table: Table, qual: str | None) -> list[_Col]:
        cols = [_Col(qual, c.name, c.name, c.kusto_type) for c in table.columns]
        if table.column(ROWID) is None:
            for alias in (ROWID, "oid", "_rowid_"):
                cols.append(_Col(qual, alias, ROWID, "long", star=False))
        return cols

    def output(self, table: Table, values: dict[str, str]) -> str:
        """The projection a Mutation ends with: every column of *table* in the order the cluster stores them."""
        parts = []
        for c in table.columns:
            if c.name != ROWID:
                parts.append(f"{quote(c.name)} = {values.get(c.name, quote(c.name))}")
        parts.append(f"{quote(ROWID)} = {values.get(ROWID, quote(ROWID))}")
        parts.append(f"{quote(VERSION)} = now()")
        parts.append(f"{quote(DELETED)} = {values.get(DELETED, 'false')}")
        return " | project " + ", ".join(parts)

    def update(self, node: exp.Update) -> Mutation:
        if node.args.get("from") or node.args.get("from_") or node.args.get("returning"):
            raise Unsupported("UPDATE ... FROM / RETURNING")
        if node.args.get("order") or node.args.get("limit"):
            raise Unsupported("UPDATE ... ORDER BY / LIMIT")
        target = node.this
        table = self.store_table(target)
        quals = {table.name.lower(), (target.alias or table.name).lower()}
        cols = self.table_cols(table, (target.alias or table.name).lower())
        cols += [_Col(q, c.name, c.kql, c.type, c.star) for q in quals - {cols[0].qual} for c in list(cols)]
        ex = _Ex(_Scope(cols))
        where = _arg(node, "where")
        cond = _truth(self.expr(where.this, ex)) if where is not None else None
        values: dict[str, str] = {}
        for assign in node.expressions:
            if not isinstance(assign, exp.EQ) or not isinstance(assign.this, exp.Column):
                raise Unsupported("UPDATE SET form")
            name = assign.this.name
            col = table.column(name)
            if col is None:
                raise Unsupported(f"no such column: {name}")
            values[col.name] = self.assigned(self.expr(assign.expression, ex), col.kusto_type)
        body = quote(table.name) + "".join(ex.pre) + (f" | where {cond}" if cond else "")
        return Mutation(table=table.name, kql=self.finish(body + self.output(table, values)), kind="update")

    def assigned(self, k: _K, want: str) -> str:
        """*k* written into a column of type *want*; NULL text is ''."""
        k = _value(k)
        if k.json and want == "string":
            k = _K(f"tostring({k.text})", "string")
        return _convert(k, want).text

    def delete(self, node: exp.Delete) -> Mutation:
        if node.args.get("using") or node.args.get("returning") or node.args.get("limit"):
            raise Unsupported("DELETE ... USING / RETURNING / LIMIT")
        target = node.this
        table = self.store_table(target)
        ex = _Ex(_Scope(self.table_cols(table, (target.alias or table.name).lower())))
        where = _arg(node, "where")
        cond = _truth(self.expr(where.this, ex)) if where is not None else None
        body = quote(table.name) + "".join(ex.pre) + (f" | where {cond}" if cond else "")
        return Mutation(table=table.name, kql=self.finish(body + self.output(table, {DELETED: "true"})), kind="delete")

    def insert(self, node: exp.Insert) -> Statement:
        target = node.this
        cols_given: list[str] | None = None
        if isinstance(target, exp.Schema):
            cols_given = [e.name for e in target.expressions]
            target = target.this
        if not isinstance(target, exp.Table):
            raise Unsupported("INSERT target")
        if node.args.get("returning"):
            raise Unsupported("INSERT ... RETURNING")
        table = self.store_table(target)
        names = []
        for name in cols_given if cols_given is not None else table.column_names:
            col = table.column(name)
            if col is None:
                if name.lower() in (ROWID, "oid", "_rowid_"):
                    raise Unsupported("INSERT of an explicit rowid")
                raise Unsupported(f"no such column: {name}")
            names.append(col.name)
        alternative = (node.args.get("alternative") or "").upper()
        on_conflict = {"REPLACE": "replace", "IGNORE": "ignore"}.get(alternative, "fail")
        conflict = node.args.get("conflict")
        source = node.expression
        if isinstance(source, (exp.Select, exp.Union, exp.Subquery)):
            if conflict is not None and "UPDATE" in str(conflict.args.get("action")).upper():
                raise Unsupported("INSERT ... SELECT ... ON CONFLICT DO UPDATE")
            if conflict is not None:
                on_conflict = "ignore"
            return self.insert_select(table, names, source, on_conflict)
        if not isinstance(source, exp.Values):
            raise Unsupported("INSERT source")
        rows = [list(t.expressions) if isinstance(t, exp.Tuple) else [t] for t in source.expressions]
        if any(len(r) != len(names) for r in rows):
            raise Unsupported("INSERT row width differs from its column list")
        if conflict is not None:
            action = str(conflict.args.get("action") or "").upper()
            if "NOTHING" in action:
                on_conflict = "ignore"
            elif "UPDATE" in action:
                return self.upsert(table, names, rows, conflict)
        values = self.constants(rows)
        if values is None:
            return self.insert_rows_mutation(table, names, rows, on_conflict)
        out = []
        for row in values:
            full = row_defaults(table)
            for name, value in zip(names, row, strict=True):
                full[name] = _affinity(value, table.column(name).kusto_type)
            out.append(full)
        return Insert(table=table.name, rows=out, on_conflict=on_conflict)

    def constants(self, rows: list[list[exp.Expression]]) -> list[list[object]] | None:
        try:
            return [[self.const(e) for e in row] for row in rows]
        except _NotConstant:
            return None

    def const(self, node: exp.Expression) -> object:
        if isinstance(node, exp.Paren):
            return self.const(node.this)
        if isinstance(node, exp.Literal):
            return node.this if node.is_string else _number(node.this)
        if isinstance(node, exp.Null):
            return None
        if isinstance(node, exp.Boolean):
            return 1 if node.this else 0
        if isinstance(node, exp.Placeholder):
            return self.param(node)
        if isinstance(node, exp.Neg):
            inner = self.const(node.this)
            if isinstance(inner, (int, float)):
                return -inner
        raise _NotConstant

    def param(self, node: exp.Placeholder) -> object:
        name = node.name
        params = self.params
        if name.startswith("__p") and name[3:].isdigit():
            index = int(name[3:])
            if isinstance(params, Sequence) and not isinstance(params, (str, bytes)) and index < len(params):
                return params[index]
            raise ValueError(f"parameter {index + 1} missing: {self.sql[:200]}")
        if isinstance(params, Mapping) and name in params:
            return params[name]
        raise ValueError(f"parameter :{name} missing: {self.sql[:200]}")

    def new_rows(self, table: Table, names: list[str], rows: list[list[exp.Expression]]) -> str:
        """The VALUES of an INSERT as a KQL table of every column of *table* (defaults filled)."""
        defaults = row_defaults(table)
        ex = _Ex(_Scope([]))
        prints = []
        for row in rows:
            given = dict(zip(names, row, strict=True))
            parts = []
            for c in table.columns:
                if c.name in given:
                    text = self.assigned(self.expr(given[c.name], ex), c.kusto_type)
                else:
                    text = _lit(defaults[c.name], c.kusto_type).text
                parts.append(f"{quote(c.name)} = {text}")
            prints.append("print " + ", ".join(parts))
        if ex.pre:
            raise Unsupported("correlated subquery in INSERT VALUES")
        return prints[0] if len(prints) == 1 else "union " + ", ".join(f"({p})" for p in prints)

    def rowid_stage(self) -> str:
        return " | serialize | extend __rid = toint(rand(2147483647)) * 4194304 + row_number()"

    def written(self, table: Table, values: dict[str, str]) -> str:
        """The final projection of rows the cluster inserts: the new rowid and the INTEGER PRIMARY KEY it fills."""
        values = dict(values)
        values.setdefault(ROWID, "__rid")
        alias = table.rowid_column
        if alias and alias not in values:
            values[alias] = f"coalesce({quote(alias)}, __rid)"
        return self.output(table, values)

    def insert_rows_mutation(
        self, table: Table, names: list[str], rows: list[list[exp.Expression]], on_conflict: str
    ) -> Mutation:
        body = self.new_rows(table, names, rows)
        if on_conflict == "ignore" and table.key != (ROWID,):
            on = ", ".join(quote(k) for k in table.key)
            body = f"{body} | join kind=leftanti ({quote(table.name)}) on {on}"
        body += self.rowid_stage()
        return Mutation(table=table.name, kql=self.finish(body + self.written(table, {})), kind="insert")

    def insert_select(self, table: Table, names: list[str], source: exp.Expression, on_conflict: str) -> Mutation:
        rel = self.select(source, None, names=names)
        if len(rel.cols) != len(names):
            raise Unsupported("INSERT ... SELECT width differs from its column list")
        defaults = row_defaults(table)
        types = {c.name: c.type for c in rel.cols}
        values: dict[str, str] = {}
        for c in table.columns:
            if c.name in types:
                values[c.name] = _convert(_K(quote(c.name), types[c.name]), c.kusto_type).text
            elif c.name != table.rowid_column:
                values[c.name] = _lit(defaults[c.name], c.kusto_type).text
        body = rel.text
        if on_conflict == "ignore" and table.key != (ROWID,) and all(k in names for k in table.key):
            on = ", ".join(quote(k) for k in table.key)
            body = f"{body} | join kind=leftanti ({quote(table.name)}) on {on}"
        body += self.rowid_stage()
        return Mutation(table=table.name, kql=self.finish(body + self.written(table, values)), kind="insert")

    def upsert(
        self, table: Table, names: list[str], rows: list[list[exp.Expression]], conflict: exp.Expression
    ) -> Statement:
        keys = [e.this.name if isinstance(e, exp.Ordered) else e.name for e in conflict.args.get("conflict_keys") or []]
        keys = [table.column(k).name if table.column(k) else k for k in keys]
        target = tuple(keys) or table.key
        index_where = conflict.args.get("index_predicate")
        update_where = _arg(conflict, "where")
        sets: list[tuple[str, exp.Expression]] = []
        for assign in conflict.expressions:
            if not isinstance(assign, exp.EQ) or not isinstance(assign.this, exp.Column):
                raise Unsupported("ON CONFLICT DO UPDATE SET form")
            col = table.column(assign.this.name)
            if col is None:
                raise Unsupported(f"no such column: {assign.this.name}")
            sets.append((col.name, assign.expression))
        simple = all(
            isinstance(v, exp.Column) and (v.table or "").lower() == "excluded" and v.name.lower() == n.lower()
            for n, v in sets
        )
        # The connection finds conflicts on the key and on every unique index (a partial
        # index's empty values never conflict), so a target that is one of those sets,
        # with or without the partial index's WHERE, is one it applies itself.
        conflict_sets = [set(keys) for keys in table.conflict_keys]
        key_target = set(target) in conflict_sets or (
            table.key == (ROWID,) and table.rowid_column is not None and target == (table.rowid_column,)
        )
        partial_ok = index_where is None or set(target) != set(table.key)
        values = self.constants(rows)
        if simple and key_target and partial_ok and values is not None:
            update_kql = None
            if update_where is not None:
                cols = self.table_cols(table, table.name.lower())
                cols += [_Col("excluded", c.name, "__new_" + c.name, c.kusto_type) for c in table.columns]
                update_kql = _truth(self.expr(update_where.this, _Ex(_Scope(cols))))
            out = []
            for row in values:
                full = row_defaults(table)
                for name, value in zip(names, row, strict=True):
                    full[name] = _affinity(value, table.column(name).kusto_type)
                out.append(full)
            return Insert(
                table=table.name,
                rows=out,
                on_conflict="update",
                update_columns=tuple(n for n, _ in sets),
                update_kql=update_kql,
            )
        return self.upsert_mutation(table, names, rows, target, index_where, update_where, sets)

    def upsert_mutation(
        self,
        table: Table,
        names: list[str],
        rows: list[list[exp.Expression]],
        target: tuple[str, ...],
        index_where: exp.Expression | None,
        update_where: exp.Expression | None,
        sets: list[tuple[str, exp.Expression]],
    ) -> Mutation:
        """An upsert the connection cannot apply: the new rows joined to the current ones, merged by the cluster."""
        new = self.new_rows(table, names, rows)
        every = [*(c.name for c in table.columns if c.name != ROWID), ROWID]
        cur_cols = [_Col(table.name.lower(), c.name, "__c_" + c.name, c.kusto_type) for c in table.columns]
        cur_cols.append(_Col(table.name.lower(), ROWID, "__c_" + ROWID, "long", star=False))
        cur_scope = _Scope([_Col(c.qual, c.name, c.name, c.type) for c in cur_cols])
        right = quote(table.name)
        if index_where is not None:
            right += f" | where {_truth(self.expr(index_where.this, _Ex(cur_scope)))}"
        right += " | project-rename " + ", ".join(f"{quote('__c_' + n)} = {quote(n)}" for n in every)
        on = ", ".join(f"$left.{quote(k)} == $right.{quote('__c_' + k)}" for k in target)
        scope_cols = cur_cols + [_Col("excluded", c.name, c.name, c.kusto_type) for c in table.columns]
        ex = _Ex(_Scope(scope_cols))
        body = f"{new} | join kind=leftouter ({right}) on {on} | extend __hit = isnotnull({quote('__c_' + ROWID)})"
        if update_where is not None:
            body += f" | where not(__hit) or {_truth(self.expr(update_where.this, ex))}"
        assigned = {name: self.assigned(self.expr(value, ex), table.column(name).kusto_type) for name, value in sets}
        values: dict[str, str] = {}
        for c in table.columns:
            if c.name == ROWID:
                continue
            new_value = quote(c.name)
            if c.name == table.rowid_column:
                new_value = f"coalesce({quote(c.name)}, __rid)"
            values[c.name] = f"iff(__hit, {assigned.get(c.name, quote('__c_' + c.name))}, {new_value})"
        values[ROWID] = f"iff(__hit, {quote('__c_' + ROWID)}, __rid)"
        if ex.pre:
            raise Unsupported("correlated subquery in ON CONFLICT DO UPDATE")
        body += self.rowid_stage()
        return Mutation(table=table.name, kql=self.finish(body + self.output(table, values)), kind="insert")

    # Queries.

    def select(
        self,
        node: exp.Expression,
        parent: _Scope | None,
        names: list[str] | None = None,
        types: list[str | None] | None = None,
    ) -> _Rel:
        if isinstance(node, exp.Subquery):
            return self.select(node.this, parent, names, types)
        if isinstance(node, exp.Union):
            return self.union(node, parent, names, types)
        if not isinstance(node, exp.Select):
            raise Unsupported(f"query {type(node).__name__}")
        self.with_(node)
        if _arg(node, "from") is not None:
            text, scope = self.from_(node, parent)
        else:
            text, scope = "print __row = 1", _Scope([], parent)
        ex = _Ex(scope)
        where = _arg(node, "where")
        cond = _truth(self.expr(where.this, ex)) if where is not None else None
        group = node.args.get("group")
        having = node.args.get("having")
        items = self.items(node, scope)
        order = node.args.get("order")
        grouped = bool(group or having) or any(_has_aggregate(e) for e in node.expressions)
        if not grouped and order is not None:
            grouped = any(_has_aggregate(o.this) and not self.is_output(o.this, items) for o in order.expressions)
        post = ex
        if grouped:
            post = _Ex(scope, agg=_Agg(), pre=ex.pre, win=ex.win)
            self.group(group, items, ex, post.agg)
        outs: list[_K] = []
        sql_names: list[str] = []
        for i, (item, sql_name) in enumerate(items):
            k = _value(self.expr(item, post))
            if k.json:
                k = _K(f"tostring({k.text})", "string")
            if types is not None and i < len(types) and types[i] and k.type != types[i]:
                k = _convert(k, types[i])
            outs.append(k)
            sql_names.append(sql_name)
        kql_names = _unique(names[: len(items)] if names else [_kql_name(n, i) for i, (_, n) in enumerate(items)])
        if names and len(names) != len(items):
            raise Unsupported("column list width differs from its query")
        having_text = _truth(self.expr(having.this, post)) if having is not None else None
        sorts, hidden = self.order(order, items, kql_names, post)
        parts = [text, *ex.pre]
        if cond:
            parts.append(f" | where {cond}")
        if grouped:
            parts.append(self.summarize(post.agg))
        if having_text:
            parts.append(f" | where {having_text}")
        parts.extend(post.win)
        projection = [f"{quote(n)} = {k.text}" for n, k in zip(kql_names, outs, strict=True)]
        projection += [f"{quote(n)} = {k.text}" for n, k in hidden]
        parts.append(" | project " + ", ".join(projection))
        if node.args.get("distinct"):
            if hidden:
                raise Unsupported("SELECT DISTINCT ordered by an expression it does not return")
            parts.append(" | distinct " + ", ".join(quote(n) for n in kql_names))
        parts.append(self.limit(node, sorts))
        if hidden:
            parts.append(" | project-away " + ", ".join(quote(n) for n, _ in hidden))
        cols = [_Col(None, s, n, k.type) for s, n, k in zip(sql_names, kql_names, outs, strict=True)]
        if names:
            cols = [_Col(None, n, n, k.type) for n, k in zip(names, outs, strict=True)]
        return _Rel("".join(parts), cols, sql_names if not names else list(names))

    def limit(self, node: exp.Expression, sorts: list[str]) -> str:
        out = ""
        if sorts:
            out += " | sort by " + ", ".join(sorts)
        offset = node.args.get("offset")
        limit = node.args.get("limit")
        if offset is not None:
            skip = self.const_int(offset.expression)
            if skip:
                out += f" | serialize __rn = row_number() | where __rn > {skip} | project-away __rn"
        if limit is not None:
            count = self.const_int(limit.expression)
            if count >= 0:
                out += f" | take {count}"
        return out

    def const_int(self, node: exp.Expression) -> int:
        try:
            value = self.const(node)
        except _NotConstant:
            raise Unsupported("LIMIT / OFFSET that is not a number") from None
        num = _number(str(value)) if not isinstance(value, (int, float)) else value
        if num is None:
            raise Unsupported("LIMIT / OFFSET that is not a number")
        return int(num)

    def with_(self, node: exp.Expression) -> None:
        with_ = _arg(node, "with")
        if with_ is None:
            return
        if with_.args.get("recursive"):
            raise Unsupported("WITH RECURSIVE")
        for cte in with_.expressions:
            alias = cte.args.get("alias")
            name = alias.name
            columns = [c.name for c in alias.columns] if alias and alias.columns else None
            rel = self.select(cte.this, None, names=columns)
            let_name = quote(name)
            self.let(let_name, rel.text)
            self.ctes[name.lower()] = [_Col(None, c.name, c.kql, c.type) for c in rel.cols]

    def items(self, node: exp.Select, scope: _Scope) -> list[tuple[exp.Expression, str]]:
        """The SELECT list with stars expanded, each with SQLite's name for its column."""
        out: list[tuple[exp.Expression, str]] = []
        for e in node.expressions:
            if isinstance(e, exp.Star) or (isinstance(e, exp.Column) and isinstance(e.this, exp.Star)):
                qual = e.table.lower() if isinstance(e, exp.Column) and e.table else None
                cols = [c for c in scope.cols if c.star and (qual is None or c.qual == qual)]
                if not cols:
                    raise Unsupported("SELECT * over no columns")
                for c in cols:
                    out.append((exp.column(c.name, table=c.qual, quoted=True), c.name))
                continue
            if isinstance(e, exp.Alias):
                out.append((e.this, e.alias))
            elif isinstance(e, exp.Column):
                out.append((e, e.name))
            else:
                out.append((e, _key(e)))
        return out

    @staticmethod
    def is_output(node: exp.Expression, items: list[tuple[exp.Expression, str]]) -> bool:
        if isinstance(node, exp.Literal) and not node.is_string:
            return True
        if isinstance(node, exp.Column) and not node.table:
            return any(n.lower() == node.name.lower() for _, n in items)
        return False

    def group(self, group: exp.Expression | None, items: list, ex: _Ex, agg: _Agg) -> None:
        if group is None:
            return
        by_alias = {n.lower(): e for e, n in items}
        for i, g in enumerate(group.expressions):
            node = g
            if isinstance(g, exp.Literal) and not g.is_string:
                pos = int(g.this)
                if not 1 <= pos <= len(items):
                    raise Unsupported("GROUP BY position out of range")
                node = items[pos - 1][0]
            elif isinstance(g, exp.Column) and not g.table and ex.scope.find(g.name, None) is None:
                if g.name.lower() in by_alias:
                    node = by_alias[g.name.lower()]
            k = self.expr(node, ex)
            if k.literal:
                continue
            col = None
            if isinstance(node, exp.Column):
                col = ex.scope.find(node.name, node.table or None)
            if col is not None and col.type != "dynamic":
                agg.key_cols.add(col.kql)
                if quote(col.kql) not in agg.keys:
                    agg.keys.append(quote(col.kql))
                for alias in (_key(g), _key(node)):
                    agg.exprs[alias] = _K(quote(col.kql), col.type)
                continue
            name = f"__g{i}"
            if k.type == "dynamic" or k.json:
                k = _K(f"tostring({k.text})", "string")
            k = _value(k)
            agg.keys.append(f"{name} = {k.text}")
            for alias in (_key(g), _key(node)):
                agg.exprs[alias] = _K(quote(name), k.type)

    def summarize(self, agg: _Agg) -> str:
        parts = [f"{name} = {text}" for name, text, _ in agg.aggs.values()]
        single = agg.minmax[0] if len(agg.minmax) == 1 else None
        for i, (name, k) in enumerate(agg.bare):
            if single is not None:
                func, arg = single
                parts.append(f"(__x{i}, {name}) = arg_{func}({arg}, {k.text})")
            else:
                parts.append(f"{name} = take_any({k.text})")
        by = f" by {', '.join(agg.keys)}" if agg.keys else ""
        if not parts:
            if not agg.keys:
                return " | summarize count() | project-away count_"
            return f" | summarize{by}"
        return f" | summarize {', '.join(parts)}{by}"

    def order(
        self, order: exp.Expression | None, items: list, kql_names: list[str], ex: _Ex
    ) -> tuple[list[str], list[tuple[str, _K]]]:
        if order is None:
            return [], []
        sorts: list[str] = []
        hidden: list[tuple[str, _K]] = []
        by_alias = {n.lower(): kql_names[i] for i, (_, n) in enumerate(items)}
        by_expr = {_key(e): kql_names[i] for i, (e, _) in enumerate(items)}
        for o in order.expressions:
            node = o.this
            name = None
            if isinstance(node, exp.Literal) and not node.is_string:
                pos = int(node.this)
                if not 1 <= pos <= len(items):
                    raise Unsupported("ORDER BY position out of range")
                name = kql_names[pos - 1]
            elif isinstance(node, exp.Column) and not node.table and node.name.lower() in by_alias:
                name = by_alias[node.name.lower()]
            elif _key(node) in by_expr:
                name = by_expr[_key(node)]
            if name is None:
                k = _value(self.expr(node, ex))
                if k.literal:
                    continue
                if k.type == "dynamic":
                    k = _K(f"tostring({k.text})", "string")
                name = f"__o{len(hidden)}"
                hidden.append((name, k))
            desc = bool(o.args.get("desc"))
            nulls_first = o.args.get("nulls_first")
            if nulls_first is None:
                nulls_first = not desc
            sorts.append(f"{quote(name)} {'desc' if desc else 'asc'} nulls {'first' if nulls_first else 'last'}")
        return sorts, hidden

    def union(self, node: exp.Union, parent: _Scope | None, names: list[str] | None, types: list | None) -> _Rel:
        left = self.select(node.this, parent, names, types)
        right = self.select(node.expression, parent, [c.kql for c in left.cols], types)
        if types is None:
            unified = []
            for a, b in zip(left.cols, right.cols, strict=False):
                want, _ = _unify([_K("", a.type), _K("", b.type)])
                unified.append(want)
            if [c.type for c in left.cols] != unified:
                left = self.select(node.this, parent, names, unified)
            if [c.type for c in right.cols] != unified:
                right = self.select(node.expression, parent, [c.kql for c in left.cols], unified)
        if len(left.cols) != len(right.cols):
            raise Unsupported("UNION of queries with different column counts")
        text = f"union ({left.text}), ({right.text})"
        if node.args.get("distinct"):
            text += " | distinct *"
        order = node.args.get("order")
        sorts: list[str] = []
        if order is not None:
            positions = {c.name.lower(): c.kql for c in left.cols}
            for o in order.expressions:
                term = o.this
                if isinstance(term, exp.Literal) and not term.is_string:
                    name = left.cols[int(term.this) - 1].kql
                elif isinstance(term, exp.Column) and term.name.lower() in positions:
                    name = positions[term.name.lower()]
                else:
                    raise Unsupported("ORDER BY of a UNION by an expression")
                desc = bool(o.args.get("desc"))
                nulls_first = o.args.get("nulls_first")
                if nulls_first is None:
                    nulls_first = not desc
                sorts.append(f"{quote(name)} {'desc' if desc else 'asc'} nulls {'first' if nulls_first else 'last'}")
        text += self.limit(node, sorts)
        return _Rel(text, left.cols, left.names)

    # FROM.

    def source(self, node: exp.Expression, parent: _Scope | None) -> tuple[str, list[_Col]]:
        alias = node.alias.lower() if node.alias else None
        if isinstance(node, exp.Subquery):
            rel = self.select(node.this, None)
            columns = node.args.get("alias").columns if node.args.get("alias") else None
            cols = rel.cols
            text = f"({rel.text})"
            if columns:
                renamed = [c.name for c in columns]
                text += " | project " + ", ".join(
                    f"{quote(n)} = {quote(c.kql)}" for n, c in zip(renamed, cols, strict=False)
                )
                cols = [_Col(alias, n, n, c.type) for n, c in zip(renamed, cols, strict=False)]
            return text, [_Col(alias, c.name, c.kql, c.type) for c in cols]
        if not isinstance(node, exp.Table):
            raise Unsupported(f"FROM {type(node).__name__}")
        if isinstance(node.this, exp.Anonymous) or isinstance(node.this, exp.Func):
            return self.table_function(node, alias)
        name = node.name
        qual = alias or name.lower()
        if node.args.get("db") is None and name.lower() in self.ctes:
            return quote(name), [_Col(qual, c.name, c.kql, c.type) for c in self.ctes[name.lower()]]
        if name.lower() in _MASTER_TABLES:
            return self.master(name.lower()), [
                _Col(qual, n, n, t)
                for n, t in (("type", "string"), ("name", "string"), ("tbl_name", "string"), ("rootpage", "long"))
            ] + [_Col(qual, "sql", "sql", "string")]
        if name.lower() == "dbstat":
            raise Unsupported("dbstat (SQLite page statistics)")
        table = self.store_table(node)
        return quote(table.name), self.table_cols(table, qual)

    def master(self, name: str) -> str:
        let_name = quote(name)
        rows = []
        if "temp" not in name:
            for t in self.tr.tables.values():
                cols = ", ".join(f"{c.name} {c.sqlite_type}" for c in t.columns)
                ddl = f"CREATE TABLE {t.name} ({cols})"
                rows += [_string("table"), _string(t.name), _string(t.name), "0", _string(ddl)]
        body = (
            "datatable(['type']:string, ['name']:string, ['tbl_name']:string, ['rootpage']:long, ['sql']:string)"
            f" [{', '.join(rows)}]"
        )
        self.let(let_name, body)
        return let_name

    def table_function(self, node: exp.Table, alias: str | None) -> tuple[str, list[_Col]]:
        func = node.this
        name = (func.name if isinstance(func, exp.Anonymous) else func.sql_name()).lower()
        if name not in ("json_each", "json_tree"):
            raise Unsupported(f"table-valued function {name}")
        if name == "json_tree":
            raise Unsupported("json_tree")
        args = func.expressions if isinstance(func, exp.Anonymous) else [func.this]
        if len(args) != 1:
            raise Unsupported("json_each with a path")
        try:
            value = self.const(args[0])
        except _NotConstant:
            raise Unsupported("json_each over a column") from None
        data = json.loads(value) if isinstance(value, (str, bytes)) else value
        if isinstance(data, dict):
            pairs = list(data.items())
            key_type = "string"
        elif isinstance(data, list):
            pairs = list(enumerate(data))
            key_type = "long"
        else:
            pairs = [(None, data)]
            key_type = "long"
        scalar = [v for _, v in pairs if v is not None]
        kinds = {type(v) for v in scalar}
        if all(isinstance(v, (int, float, str)) and not isinstance(v, bool) for v in scalar) and (
            len(kinds) <= 1 or kinds <= {int, float}
        ):
            vtype = {str: "string", int: "long", float: "real"}.get(next(iter(kinds)) if len(kinds) == 1 else float)
            if not scalar:
                vtype = "string"

            def cell(v: object) -> str:
                return _lit(v, vtype).text

        else:
            vtype = "dynamic"

            def cell(v: object) -> str:
                return f"dynamic({json.dumps(v)})"

        rows = []
        for k, v in pairs:
            rows += [_lit(k, key_type).text, cell(v)]
        qual = alias or "json_each"
        text = f"datatable(['key']:{key_type}, ['value']:{vtype}) [{', '.join(rows)}]"
        return f"({text})", [_Col(qual, "key", "key", key_type), _Col(qual, "value", "value", vtype)]

    def from_(self, node: exp.Select, parent: _Scope | None) -> tuple[str, _Scope]:
        first = _arg(node, "from").this
        joins = node.args.get("joins") or []
        if not joins:
            text, cols = self.source(first, parent)
            return text, _Scope(cols, parent)
        text, cols = self.prefixed(first, parent)
        for j in joins:
            rtext, rcols = self.prefixed(j.this, parent)
            text, cols = self.join(j, text, cols, rtext, rcols, parent)
        return text, _Scope(cols, parent)

    def prefixed(self, node: exp.Expression, parent: _Scope | None) -> tuple[str, list[_Col]]:
        text, cols = self.source(node, parent)
        renamed = [_Col(c.qual, c.name, f"{c.qual or 't'}__{c.name}", c.type, c.star) for c in cols]
        seen: dict[str, str] = {}
        parts = []
        for c, r in zip(cols, renamed, strict=True):
            if c.kql in seen:
                r.kql = seen[c.kql]
                continue
            seen[c.kql] = r.kql
            parts.append(f"{quote(r.kql)} = {quote(c.kql)}")
        return f"({text} | project {', '.join(parts)})", renamed

    def side(self, node: exp.Expression, left: _Scope, right: _Scope) -> str:
        sides = set()
        for col in _walk_local(node):
            if not isinstance(col, exp.Column):
                continue
            qual = col.table or None
            if left.find(col.name, qual) is not None:
                sides.add("L")
            elif right.find(col.name, qual) is not None:
                sides.add("R")
            else:
                sides.add("X")
        if any(isinstance(n, (exp.Select, exp.Subquery, exp.Exists)) for n in node.walk()):
            sides.add("X")
        return sides.pop() if len(sides) == 1 else ("C" if not sides else "M")

    def join(
        self,
        j: exp.Join,
        ltext: str,
        lcols: list[_Col],
        rtext: str,
        rcols: list[_Col],
        parent: _Scope | None,
    ) -> tuple[str, list[_Col]]:
        side = (j.args.get("side") or "").upper()
        kind = (j.args.get("kind") or "").upper()
        if j.args.get("using"):
            raise Unsupported("JOIN ... USING")
        if kind == "NATURAL":
            raise Unsupported("NATURAL JOIN")
        kusto_kind = {"LEFT": "leftouter", "RIGHT": "rightouter", "FULL": "fullouter"}.get(side, "inner")
        lscope, rscope = _Scope(lcols, parent), _Scope(rcols, parent)
        pairs: list[tuple[str, str]] = []
        residual: list[exp.Expression] = []
        n = self.fresh()
        for cond in _conjuncts(j.args.get("on")):
            if isinstance(cond, exp.EQ):
                a, b = self.side(cond.this, lscope, rscope), self.side(cond.expression, lscope, rscope)
                if (a, b) in (("L", "R"), ("R", "L")):
                    lnode, rnode = (cond.this, cond.expression) if a == "L" else (cond.expression, cond.this)
                    lk, rk = self.expr(lnode, _Ex(lscope)), self.expr(rnode, _Ex(rscope))
                    want, (lk, rk) = _unify([_key_value(lk), _key_value(rk)])
                    lname, ltext = _key_column(ltext, lk, f"__jl{n}_{len(pairs)}")
                    rname, rtext = _key_column(rtext, rk, f"__jr{n}_{len(pairs)}")
                    pairs.append((lname, rname))
                    continue
            residual.append(cond)
        if not pairs:
            if kusto_kind != "inner" and residual:
                raise Unsupported("outer JOIN without an equality")
            ltext += " | extend __cross = 1"
            rtext += " | extend __cross = 1"
            pairs.append(("__cross", "__cross"))
            kusto_kind = "inner" if kusto_kind != "leftouter" else kusto_kind
        on = ", ".join(f"$left.{quote(a)} == $right.{quote(b)}" for a, b in pairs)
        cols = lcols + rcols
        both = _Ex(_Scope(cols, parent))
        if residual:
            cond = " and ".join(_truth(self.expr(r, both)) for r in residual)
            if both.pre:
                raise Unsupported("subquery in a JOIN condition")
            if kusto_kind == "inner":
                return f"{ltext} | join kind=inner ({rtext}) on {on} | where {cond}", cols
            if kusto_kind != "leftouter":
                raise Unsupported(f"{side} JOIN with a condition that is not an equality")
            left_name, match_name = f"q_left{n}", f"q_match{n}"
            self.let(left_name, f"{ltext} | serialize __lk{n} = row_number()")
            self.let(match_name, f"{left_name} | join kind=inner ({rtext}) on {on} | where {cond}")
            text = (
                f"union ({match_name}), ({left_name} | join kind=leftanti ({match_name} | distinct __lk{n}) on __lk{n})"
            )
            return text, cols
        return f"{ltext} | join kind={kusto_kind} ({rtext}) on {on}", cols

    # Expressions.

    def expr(self, node: exp.Expression, ex: _Ex) -> _K:
        agg = ex.agg
        if agg is not None:
            found = agg.exprs.get(_key(node))
            if found is not None:
                return found
            if _is_aggregate(node) and not isinstance(node.parent, exp.Window):
                return self.aggregate(node, ex)
        method = getattr(self, "x_" + type(node).__name__, None)
        if method is None:
            raise Unsupported(f"expression {type(node).__name__} ({_key(node)[:60]})")
        return method(node, ex)

    def pre(self, ex: _Ex) -> _Ex:
        """The scope before the aggregation, for what an aggregate reads."""
        return _Ex(ex.scope, None, ex.pre, ex.win)

    def aggregate(self, node: exp.Expression, ex: _Ex) -> _K:
        agg = ex.agg
        key = _key(node)
        if key not in agg.aggs:
            k = self.aggregate_call(node, self.pre(ex))
            name = f"__a{len(agg.aggs)}"
            if isinstance(node, (exp.Max, exp.Min)):
                agg.minmax.append((k.text[:3], k.text[4:-1]))
            agg.aggs[key] = (name, k.text, _K(quote(name), k.type, json=k.json))
        return agg.aggs[key][2]

    def bare(self, k: _K, ex: _Ex) -> _K:
        """A value read outside an aggregate in a grouped query: from the MIN/MAX row, else any row."""
        agg = ex.agg
        for name, existing in agg.bare:
            if existing.text == k.text:
                return _K(quote(name), k.type, json=k.json)
        name = f"__b{len(agg.bare)}"
        if k.type == "dynamic":
            k = _K(f"tostring({k.text})", "string")
        agg.bare.append((name, k))
        return _K(quote(name), k.type, json=k.json)

    def aggregate_call(self, node: exp.Expression, ex: _Ex) -> _K:
        if isinstance(node, exp.Count):
            arg = node.this
            if arg is None or isinstance(arg, exp.Star):
                return _K("count()", "long")
            if isinstance(arg, exp.Distinct):
                if len(arg.expressions) != 1:
                    raise Unsupported("COUNT(DISTINCT) of several values")
                k = _value(self.expr(arg.expressions[0], ex))
                if k.type == "dynamic":
                    k = _K(f"tostring({k.text})", "string")
                return _K(f"count_distinct({k.text})", "long")
            k = self.expr(arg, ex)
            test = f"isnotempty({k.text})" if k.type == "string" else f"isnotnull({k.text})"
            return _K(f"countif({test})", "long")
        if isinstance(node, exp.Anonymous) and node.name.lower() == "total":
            k = _numeric(self.expr(node.expressions[0], ex))
            return _K(f"sum(todouble({k.text}))", "real")
        if isinstance(node, (exp.Sum, exp.Avg)):
            if isinstance(node.this, exp.Distinct):
                raise Unsupported(f"{type(node).__name__.upper()}(DISTINCT)")
            k = _numeric(self.expr(node.this, ex))
            if isinstance(node, exp.Avg):
                return _K(f"avg({k.text})", "real")
            return _K(f"sum({k.text})", k.type if k.type in _NUMERIC else "real")
        if isinstance(node, (exp.Max, exp.Min)):
            k = _value(self.expr(node.this, ex))
            if k.type == "dynamic":
                k = _K(f"todouble({k.text})", "real")
            func = "max" if isinstance(node, exp.Max) else "min"
            return _K(f"{func}({k.text})", k.type)
        if isinstance(node, exp.GroupConcat):
            arg = node.this
            func = "make_list"
            if isinstance(arg, exp.Distinct):
                arg = arg.expressions[0]
                func = "make_set"
            k = self.expr(arg, ex)
            sep = node.args.get("separator")
            sep_text = _convert(self.expr(sep, ex), "string").text if sep is not None else "','"
            return _K(f"strcat_array({func}({_convert(_value(k), 'string').text}), {sep_text})", "string")
        if isinstance(node, exp.JSONArrayAgg):
            k = _value(self.expr(node.this, ex))
            return _K(f"make_list({k.text})", "dynamic", json=True)
        raise Unsupported(f"aggregate {type(node).__name__}")

    def x_Column(self, node: exp.Column, ex: _Ex) -> _K:
        if isinstance(node.this, exp.Star):
            raise Unsupported("* in an expression")
        name = node.name
        qual = node.table or None
        if name.startswith("$"):
            raise Unsupported("parameter name the parser read as a column")
        col = ex.scope.resolve(name, qual)
        k = _K(quote(col.kql), col.type)
        if ex.agg is not None and col.kql not in ex.agg.key_cols:
            return self.bare(k, ex)
        return k

    def x_Identifier(self, node: exp.Identifier, ex: _Ex) -> _K:
        return self.x_Column(exp.Column(this=node), ex)

    def x_Literal(self, node: exp.Literal, ex: _Ex) -> _K:
        if node.is_string:
            return _lit(node.this)
        num = _number(node.this)
        if num is None:
            raise Unsupported(f"number literal {node.this}")
        return _lit(num)

    def x_Null(self, node: exp.Null, ex: _Ex) -> _K:
        return _lit(None)

    def x_Boolean(self, node: exp.Boolean, ex: _Ex) -> _K:
        return _lit(1 if node.this else 0)

    def x_Placeholder(self, node: exp.Placeholder, ex: _Ex) -> _K:
        return _lit(self.param(node))

    def x_Paren(self, node: exp.Paren, ex: _Ex) -> _K:
        k = self.expr(node.this, ex)
        if k.literal:
            return k
        return _K(f"({k.text})", k.type, json=k.json, blob=k.blob)

    def x_Neg(self, node: exp.Neg, ex: _Ex) -> _K:
        k = self.expr(node.this, ex)
        if k.literal and isinstance(k.value, (int, float)) and not isinstance(k.value, bool):
            return _lit(-k.value)
        k = _numeric(k)
        return _K(f"-({k.text})", k.type)

    def x_Not(self, node: exp.Not, ex: _Ex) -> _K:
        inner = node.this
        if isinstance(inner, exp.Is) and isinstance(inner.expression, exp.Null):
            k = self.expr(inner.this, ex)
            return _K(f"isnotempty({k.text})" if k.type == "string" else f"isnotnull({k.text})", "bool")
        return _K(f"not({_truth(self.expr(inner, ex))})", "bool")

    def x_And(self, node: exp.And, ex: _Ex) -> _K:
        return _K(f"({_truth(self.expr(node.this, ex))} and {_truth(self.expr(node.expression, ex))})", "bool")

    def x_Or(self, node: exp.Or, ex: _Ex) -> _K:
        return _K(f"({_truth(self.expr(node.this, ex))} or {_truth(self.expr(node.expression, ex))})", "bool")

    def x_Is(self, node: exp.Is, ex: _Ex) -> _K:
        if isinstance(node.expression, exp.Null):
            k = self.expr(node.this, ex)
            return _K(f"isempty({k.text})" if k.type == "string" else f"isnull({k.text})", "bool")
        return self.compare("==", node.this, node.expression, ex)

    def x_NullSafeEQ(self, node: exp.Expression, ex: _Ex) -> _K:
        if isinstance(node.expression, exp.Null):
            return self.x_Is(exp.Is(this=node.this, expression=node.expression), ex)
        return self.compare("==", node.this, node.expression, ex)

    def x_NullSafeNEQ(self, node: exp.Expression, ex: _Ex) -> _K:
        if isinstance(node.expression, exp.Null):
            return self.x_Not(exp.Not(this=exp.Is(this=node.this, expression=node.expression)), ex)
        return self.compare("!=", node.this, node.expression, ex)

    def x_EQ(self, node: exp.EQ, ex: _Ex) -> _K:
        return self.compare("==", node.this, node.expression, ex)

    def x_NEQ(self, node: exp.NEQ, ex: _Ex) -> _K:
        return self.compare("!=", node.this, node.expression, ex)

    def x_GT(self, node: exp.GT, ex: _Ex) -> _K:
        return self.compare(">", node.this, node.expression, ex)

    def x_GTE(self, node: exp.GTE, ex: _Ex) -> _K:
        return self.compare(">=", node.this, node.expression, ex)

    def x_LT(self, node: exp.LT, ex: _Ex) -> _K:
        return self.compare("<", node.this, node.expression, ex)

    def x_LTE(self, node: exp.LTE, ex: _Ex) -> _K:
        return self.compare("<=", node.this, node.expression, ex)

    def compare(self, op: str, a: exp.Expression, b: exp.Expression, ex: _Ex) -> _K:
        return _compare(op, self.expr(a, ex), self.expr(b, ex))

    def x_Between(self, node: exp.Between, ex: _Ex) -> _K:
        k = self.expr(node.this, ex)
        lo = _compare(">=", k, self.expr(node.args["low"], ex))
        hi = _compare("<=", k, self.expr(node.args["high"], ex))
        return _K(f"({lo.text} and {hi.text})", "bool")

    def x_In(self, node: exp.In, ex: _Ex) -> _K:
        k = self.expr(node.this, ex)
        query = node.args.get("query")
        if query is not None:
            return self.in_query(k, query, ex)
        if node.args.get("unnest") or node.args.get("field"):
            raise Unsupported("IN form")
        items = [self.expr(e, ex) for e in node.expressions]
        if not items:
            return _K("false", "bool")
        if k.type == "dynamic":
            want, _ = _unify([i for i in items if not i.null] or [_K("", "string")])
            k = _convert(k, want)
        if k.type == "bool":
            k = _value(k)
        converted = [_convert(_value(i), k.type) if k.type else _value(i) for i in items]
        return _K(f"({k.text} in ({', '.join(i.text for i in converted)}))", "bool")

    def in_query(self, k: _K, query: exp.Expression, ex: _Ex) -> _K:
        try:
            rel = self.select(query, ex.scope)
        except _Correlated:
            raise Unsupported("correlated subquery in IN") from None
        if len(rel.cols) != 1:
            raise Unsupported("IN subquery with more than one column")
        col = rel.cols[0]
        k = _value(k)
        sub = rel.text
        if k.type == "dynamic" or (k.type and col.type and k.type != col.type):
            want = col.type if k.type == "dynamic" else k.type
            if k.type == "dynamic":
                k = _convert(k, want)
            else:
                sub += f" | project __in = {_convert(_K(quote(col.kql), col.type), want).text}"
        if ex.agg is not None:
            return self.bare(_K(f"({k.text} in ({sub}))", "bool"), ex)
        return _K(f"({k.text} in ({sub}))", "bool")

    def x_Subquery(self, node: exp.Subquery, ex: _Ex) -> _K:
        try:
            rel = self.select(node.this, ex.scope)
        except _Correlated:
            return self.decorrelate(node, ex)
        col = rel.cols[0]
        return _K(f"toscalar({rel.text})", col.type)

    def x_Exists(self, node: exp.Exists, ex: _Ex) -> _K:
        try:
            rel = self.select(node.this, ex.scope)
        except _Correlated:
            return self.decorrelate(node, ex)
        return _K(f"(toscalar({rel.text} | take 1 | count) > 0)", "bool")

    def decorrelate(self, node: exp.Expression, ex: _Ex) -> _K:
        """A correlated EXISTS or scalar subquery as a left join on its correlation columns."""
        sel = node.this
        if not isinstance(sel, exp.Select):
            raise Unsupported("correlated subquery that is not a plain SELECT")
        if sel.args.get("group") or sel.args.get("having") or _arg(sel, "with") or sel.args.get("joins"):
            raise Unsupported("correlated subquery with GROUP BY / HAVING / WITH / JOIN")
        rtext, rscope = self.from_(sel, None)
        outer = _Scope(ex.scope.cols, ex.scope.parent)
        pairs: list[tuple[exp.Expression, exp.Expression]] = []
        local: list[exp.Expression] = []
        where = _arg(sel, "where")
        for cond in _conjuncts(where.this if where is not None else None):
            sides = self.correlation_sides(cond, rscope, outer)
            if sides == "inner":
                local.append(cond)
            elif isinstance(cond, exp.EQ):
                a = self.correlation_sides(cond.this, rscope, outer)
                b = self.correlation_sides(cond.expression, rscope, outer)
                if (a, b) == ("inner", "outer"):
                    pairs.append((cond.this, cond.expression))
                elif (a, b) == ("outer", "inner"):
                    pairs.append((cond.expression, cond.this))
                else:
                    raise Unsupported("correlated subquery whose correlation is not column equality")
            else:
                raise Unsupported("correlated subquery whose correlation is not column equality")
        if not pairs:
            raise Unsupported("correlated subquery whose correlation is not column equality")
        rex = _Ex(rscope)
        conds = [_truth(self.expr(c, rex)) for c in local]
        n = self.fresh()
        right = rtext + "".join(rex.pre) + (f" | where {' and '.join(conds)}" if conds else "")
        keys: list[str] = []
        on: list[str] = []
        oex = _Ex(ex.scope, None, ex.pre, ex.win)
        for i, (inner, out) in enumerate(pairs):
            ik = self.expr(inner, rex)
            ok = self.expr(out, oex)
            want, (ik, ok) = _unify([_key_value(ik), _key_value(ok)])
            keys.append(f"__ek{n}_{i} = {ik.text}")
            if re.fullmatch(r"\['[^']*'\]", ok.text):
                left = ok.text
            else:
                left = quote(f"__ok{n}_{i}")
                ex.pre.append(f" | extend {left} = {ok.text}")
            on.append(f"$left.{left} == $right.{quote(f'__ek{n}_{i}')}")
        if isinstance(node, exp.Exists):
            right += f" | summarize by {', '.join(keys)} | extend __e{n} = true"
            ex.pre.append(f" | join kind=leftouter ({right}) on {', '.join(on)}")
            result = _K(f"isnotnull({quote(f'__e{n}')})", "bool")
        else:
            if len(sel.expressions) != 1:
                raise Unsupported("correlated scalar subquery with more than one column")
            item = sel.expressions[0]
            item = item.this if isinstance(item, exp.Alias) else item
            if _is_aggregate(item):
                value = self.aggregate_call(item, rex)
                right += f" | summarize __s{n} = {value.text} by {', '.join(keys)}"
            else:
                # SQLite returns the subquery's first row: the one its ORDER BY puts first, else any.
                value = _value(self.expr(item, rex))
                order = sel.args.get("order")
                if order is not None and len(order.expressions) == 1:
                    o = order.expressions[0]
                    func = "arg_min" if not o.args.get("desc") else "arg_max"
                    by = _key_value(_value(self.expr(o.this, rex))).text
                    right += f" | summarize (__so{n}, __s{n}) = {func}({by}, {value.text}) by {', '.join(keys)}"
                elif order is None:
                    right += f" | summarize __s{n} = take_any({value.text}) by {', '.join(keys)}"
                else:
                    raise Unsupported("correlated scalar subquery ordered by several terms")
            ex.pre.append(f" | join kind=leftouter ({right}) on {', '.join(on)}")
            text = quote(f"__s{n}")
            if isinstance(item, exp.Count):
                text = f"coalesce({text}, 0)"
            result = _K(text, value.type)
        if ex.agg is not None:
            return self.bare(result, ex)
        return result

    def correlation_sides(self, node: exp.Expression, inner: _Scope, outer: _Scope) -> str:
        sides = set()
        for col in node.find_all(exp.Column):
            qual = col.table or None
            if inner.find(col.name, qual) is not None:
                sides.add("inner")
            elif outer.find(col.name, qual) is not None:
                sides.add("outer")
            else:
                raise Unsupported(f"no such column: {qual + '.' if qual else ''}{col.name}")
        if not sides:
            return "inner"
        return sides.pop() if len(sides) == 1 else "mixed"

    def x_Like(self, node: exp.Like, ex: _Ex, escape: str | None = None, negate: bool = False) -> _K:
        negate = negate or bool(node.args.get("negate"))
        k = self.expr(node.this, ex)
        pattern = self.expr(node.expression, ex)
        if not pattern.literal or not isinstance(pattern.value, str):
            if pattern.literal and pattern.value is not None:
                pattern = _lit(str(pattern.value))
            else:
                raise Unsupported("LIKE with a pattern that is not a literal")
        if k.type != "string":
            k = _convert(_value(k), "string")
        return _like(k.text, pattern.value, escape, negate)

    def x_ILike(self, node: exp.Expression, ex: _Ex) -> _K:
        return self.x_Like(node, ex)

    def x_Escape(self, node: exp.Escape, ex: _Ex) -> _K:
        like = node.this
        esc = self.expr(node.expression, ex)
        if not isinstance(like, (exp.Like, exp.ILike)) or not esc.literal:
            raise Unsupported("ESCAPE form")
        return self.x_Like(like, ex, escape=str(esc.value))

    def x_Glob(self, node: exp.Glob, ex: _Ex) -> _K:
        k = _convert(_value(self.expr(node.this, ex)), "string")
        pattern = self.expr(node.expression, ex)
        if not pattern.literal or not isinstance(pattern.value, str):
            raise Unsupported("GLOB with a pattern that is not a literal")
        return _K(f"({k.text} matches regex {_string('(?s)^' + _glob_regex(pattern.value) + '$')})", "bool")

    def arith(self, op: str, node: exp.Expression, ex: _Ex) -> _K:
        a = _numeric(self.expr(node.this, ex))
        b = _numeric(self.expr(node.expression, ex))
        want = "real" if "real" in (a.type, b.type) else ("long" if a.type == b.type == "long" else None)
        if op == "%" and want == "real":
            a, b = _convert(a, "long"), _convert(b, "long")
            want = "long"
        return _K(f"({a.text} {op} {b.text})", want)

    def x_Add(self, node: exp.Add, ex: _Ex) -> _K:
        return self.arith("+", node, ex)

    def x_Sub(self, node: exp.Sub, ex: _Ex) -> _K:
        return self.arith("-", node, ex)

    def x_Mul(self, node: exp.Mul, ex: _Ex) -> _K:
        return self.arith("*", node, ex)

    def x_Div(self, node: exp.Div, ex: _Ex) -> _K:
        return self.arith("/", node, ex)

    def x_Mod(self, node: exp.Mod, ex: _Ex) -> _K:
        return self.arith("%", node, ex)

    def x_BitwiseAnd(self, node: exp.Expression, ex: _Ex) -> _K:
        a, b = _convert(self.expr(node.this, ex), "long"), _convert(self.expr(node.expression, ex), "long")
        return _K(f"binary_and({a.text}, {b.text})", "long")

    def x_BitwiseOr(self, node: exp.Expression, ex: _Ex) -> _K:
        a, b = _convert(self.expr(node.this, ex), "long"), _convert(self.expr(node.expression, ex), "long")
        return _K(f"binary_or({a.text}, {b.text})", "long")

    def x_DPipe(self, node: exp.DPipe, ex: _Ex) -> _K:
        parts = [_value(self.expr(e, ex)) for e in (node.this, node.expression)]
        return _K(f"strcat({', '.join(p.text for p in parts)})", "string")

    def x_Case(self, node: exp.Case, ex: _Ex) -> _K:
        subject = self.expr(node.this, ex) if node.this is not None else None
        conds: list[str] = []
        values: list[_K] = []
        for branch in node.args.get("ifs") or []:
            if subject is not None:
                conds.append(_compare("==", subject, self.expr(branch.this, ex)).text)
            else:
                conds.append(_truth(self.expr(branch.this, ex)))
            values.append(_value(self.expr(branch.args["true"], ex)))
        default = node.args.get("default")
        values.append(_value(self.expr(default, ex)) if default is not None else _lit(None))
        want, values = _unify(values)
        values = [_K(_NULLS.get(want, "dynamic(null)"), want) if v.null else v for v in values]
        if len(conds) == 1:
            return _K(f"iff({conds[0]}, {values[0].text}, {values[1].text})", want)
        args = []
        for c, v in zip(conds, values, strict=False):
            args += [c, v.text]
        args.append(values[-1].text)
        return _K(f"case({', '.join(args)})", want)

    def x_If(self, node: exp.If, ex: _Ex) -> _K:
        cond = _truth(self.expr(node.this, ex))
        false = node.args.get("false")
        values = [_value(self.expr(node.args["true"], ex)), _value(self.expr(false, ex)) if false else _lit(None)]
        want, values = _unify(values)
        values = [_K(_NULLS.get(want, "dynamic(null)"), want) if v.null else v for v in values]
        return _K(f"iff({cond}, {values[0].text}, {values[1].text})", want)

    def x_Cast(self, node: exp.Cast, ex: _Ex) -> _K:
        k = _value(self.expr(node.this, ex))
        to = node.args["to"].sql(dialect="sqlite").upper()
        if any(t in to for t in ("INT",)):
            if k.type == "string":
                return _K(f"tolong(todouble({k.text}))", "long")
            return _convert(k, "long") if k.type != "long" else k
        if any(t in to for t in ("REAL", "FLOA", "DOUB", "NUMERIC", "DECIMAL")):
            return _convert(k, "real")
        if any(t in to for t in ("CHAR", "CLOB", "TEXT")):
            return _convert(k, "string")
        if "BLOB" in to or "BINARY" in to:
            out = _convert(k, "string")
            return _K(out.text, "string", out.value, blob=True)
        raise Unsupported(f"CAST AS {to}")

    def x_Coalesce(self, node: exp.Coalesce, ex: _Ex) -> _K:
        args = [_value(self.expr(e, ex)) for e in [node.this, *node.expressions]]
        want, args = _unify(args)
        args = [_K(_NULLS.get(want, "dynamic(null)"), want) if a.null else a for a in args]
        if len(args) == 1:
            return args[0]
        return _K(f"coalesce({', '.join(a.text for a in args)})", want)

    def x_Nullif(self, node: exp.Nullif, ex: _Ex) -> _K:
        a = _value(self.expr(node.this, ex))
        b = self.expr(node.expression, ex)
        cond = _compare("==", a, b)
        return _K(f"iff({cond.text}, {_NULLS.get(a.type, 'dynamic(null)')}, {a.text})", a.type)

    def minmax_of(self, func: str, node: exp.Expression, ex: _Ex) -> _K:
        args = [_value(self.expr(e, ex)) for e in [node.this, *node.expressions]]
        want, args = _unify(args)
        return _K(f"{func}({', '.join(a.text for a in args)})", want)

    def x_Greatest(self, node: exp.Expression, ex: _Ex) -> _K:
        return self.minmax_of("max_of", node, ex)

    def x_Least(self, node: exp.Expression, ex: _Ex) -> _K:
        return self.minmax_of("min_of", node, ex)

    def x_Max(self, node: exp.Max, ex: _Ex) -> _K:
        if node.expressions:
            return self.minmax_of("max_of", node, ex)
        raise Unsupported("MAX() aggregate outside a SELECT that groups")

    def x_Min(self, node: exp.Min, ex: _Ex) -> _K:
        if node.expressions:
            return self.minmax_of("min_of", node, ex)
        raise Unsupported("MIN() aggregate outside a SELECT that groups")

    def x_Length(self, node: exp.Length, ex: _Ex) -> _K:
        k = self.expr(node.this, ex)
        if k.blob:
            return _K(f"string_size({k.text})", "long")
        return _K(f"strlen({_convert(_value(k), 'string').text})", "long")

    def x_Lower(self, node: exp.Lower, ex: _Ex) -> _K:
        return _K(f"tolower({_convert(_value(self.expr(node.this, ex)), 'string').text})", "string")

    def x_Upper(self, node: exp.Upper, ex: _Ex) -> _K:
        return _K(f"toupper({_convert(_value(self.expr(node.this, ex)), 'string').text})", "string")

    def x_Substring(self, node: exp.Substring, ex: _Ex) -> _K:
        k = _convert(_value(self.expr(node.this, ex)), "string")
        start = _convert(self.expr(node.args["start"], ex), "long")
        length = node.args.get("length")
        if start.literal and isinstance(start.value, int):
            if start.value > 0:
                offset = str(start.value - 1)
            elif start.value == 0:
                offset = "0"
                if length is not None:
                    length_k = _convert(self.expr(length, ex), "long")
                    length = None
                    return _K(f"substring({k.text}, 0, max_of({length_k.text} - 1, 0))", "string")
            else:
                offset = f"max_of(strlen({k.text}) - {-start.value}, 0)"
        else:
            offset = f"({start.text} - 1)"
        if length is not None:
            return _K(f"substring({k.text}, {offset}, {_convert(self.expr(length, ex), 'long').text})", "string")
        return _K(f"substring({k.text}, {offset})", "string")

    def x_StrPosition(self, node: exp.Expression, ex: _Ex) -> _K:
        k = _convert(_value(self.expr(node.this, ex)), "string")
        sub = _convert(self.expr(node.args["substr"], ex), "string")
        return _K(f"(indexof({k.text}, {sub.text}) + 1)", "long")

    def x_Replace(self, node: exp.Expression, ex: _Ex) -> _K:
        k = _convert(_value(self.expr(node.this, ex)), "string")
        a = _convert(self.expr(node.expression, ex), "string")
        b = _convert(self.expr(node.args["replacement"], ex), "string")
        return _K(f"replace_string({k.text}, {a.text}, {b.text})", "string")

    def x_Trim(self, node: exp.Trim, ex: _Ex) -> _K:
        k = _convert(_value(self.expr(node.this, ex)), "string")
        chars = node.args.get("expression")
        if chars is None:
            regex = " +"
        else:
            c = self.expr(chars, ex)
            if not c.literal:
                raise Unsupported("trim with characters that are not a literal")
            regex = "[" + "".join("\\" + ch if ch in "\\]^-[" else ch for ch in str(c.value)) + "]+"
        position = (node.args.get("position") or "").upper()
        func = {"LEADING": "trim_start", "TRAILING": "trim_end"}.get(position, "trim")
        return _K(f"{func}({_string(regex)}, {k.text})", "string")

    def x_Round(self, node: exp.Round, ex: _Ex) -> _K:
        k = _convert(_numeric(self.expr(node.this, ex)), "real")
        decimals = node.args.get("decimals")
        if decimals is not None:
            return _K(f"round({k.text}, {_convert(self.expr(decimals, ex), 'long').text})", "real")
        return _K(f"round({k.text})", "real")

    def x_Abs(self, node: exp.Abs, ex: _Ex) -> _K:
        k = _numeric(self.expr(node.this, ex))
        return _K(f"abs({k.text})", k.type)

    def x_Rand(self, node: exp.Expression, ex: _Ex) -> _K:
        return _K("(toint(rand(2147483647)) * 4294967296 + toint(rand(2147483647)))", "long")

    def x_Typeof(self, node: exp.Expression, ex: _Ex) -> _K:
        k = self.expr(node.this, ex)
        if k.null:
            return _lit("null")
        name = {"long": "integer", "bool": "integer", "real": "real", "string": "text"}.get(k.type or "")
        if name:
            return _K(f"iff(isnull({k.text}), 'null', {_string(name)})", "string")
        return _sqlite_json_type(f"gettype({k.text})")

    def x_JSONType(self, node: exp.Expression, ex: _Ex) -> _K:
        base = self.json_base(node.this, ex)
        path = node.args.get("expression")
        if path is not None:
            p = self.expr(path, ex)
            if not p.literal:
                raise Unsupported("json_type with a path that is not a literal")
            base = base + _json_path(str(p.value))
        return _sqlite_json_type(f"gettype({base})")

    def json_base(self, node: exp.Expression, ex: _Ex) -> str:
        k = self.expr(node, ex)
        if k.type == "dynamic":
            return k.text
        if k.type == "string":
            return f"todynamic({k.text})"
        return f"todynamic(tostring({k.text}))"

    def x_JSONExtract(self, node: exp.Expression, ex: _Ex) -> _K:
        if node.expressions:
            raise Unsupported("json_extract with several paths")
        base = self.json_base(node.this, ex)
        path = node.expression
        if isinstance(path, exp.JSONPath):
            suffix = _json_path_nodes(path)
        else:
            p = self.expr(path, ex)
            if not p.literal:
                raise Unsupported("json_extract with a path that is not a literal")
            suffix = _json_path(str(p.value))
        k = _K(base + suffix, "dynamic")
        if isinstance(node, exp.JSONExtract):
            # The -> operator: SQLite returns the JSON text of what the path names.
            return _K(f"tostring({k.text})", "string")
        return k

    def x_JSONExtractScalar(self, node: exp.Expression, ex: _Ex) -> _K:
        return self.x_JSONExtract(node, ex)

    def x_JSONObject(self, node: exp.Expression, ex: _Ex) -> _K:
        args = []
        for kv in node.expressions:
            key = kv.this if hasattr(kv, "this") else kv
            args += [self.expr(key, ex).text, _value(self.expr(kv.expression, ex)).text]
        return _K(f"bag_pack({', '.join(args)})", "dynamic", json=True)

    def x_CurrentTimestamp(self, node: exp.Expression, ex: _Ex) -> _K:
        return _K("format_datetime(now(), 'yyyy-MM-dd HH:mm:ss')", "string")

    def x_TimeToStr(self, node: exp.Expression, ex: _Ex) -> _K:
        fmt = self.expr(node.args["format"], ex)
        inner = node.this
        if isinstance(inner, exp.TsOrDsToTimestamp):
            inner = inner.this
        return self.strftime(fmt, [inner], ex)

    def x_Date(self, node: exp.Expression, ex: _Ex) -> _K:
        return self.date_func("date", [node.this, *node.expressions], ex)

    def x_Anonymous(self, node: exp.Anonymous, ex: _Ex) -> _K:
        name = node.name.lower()
        args = node.expressions
        if name in ("date", "datetime", "time", "julianday", "unixepoch"):
            return self.date_func(name, args, ex)
        if name == "strftime":
            if not args:
                raise Unsupported("strftime without a format")
            return self.strftime(self.expr(args[0], ex), args[1:], ex)
        if name == "json_array_length":
            base = self.json_base(args[0], ex)
            if len(args) > 1:
                p = self.expr(args[1], ex)
                if not p.literal:
                    raise Unsupported("json_array_length with a path that is not a literal")
                base += _json_path(str(p.value))
            return _K(f"array_length({base})", "long")
        if name == "json_array":
            parts = [_value(self.expr(a, ex)) for a in args]
            return _K(f"pack_array({', '.join(p.text for p in parts)})", "dynamic", json=True)
        if name == "json":
            return _K(f"tostring(todynamic({self.expr(args[0], ex).text}))", "string")
        if name == "json_valid":
            k = self.expr(args[0], ex)
            return _K(f"isnotnull(parse_json({k.text}))", "bool")
        if name == "last_insert_rowid":
            raise Unsupported("last_insert_rowid()")
        if name == "changes" or name == "total_changes":
            raise Unsupported(f"{name}()")
        raise Unsupported(f"function {name}")

    def time_value(self, args: list[exp.Expression], ex: _Ex) -> str:
        """The datetime a SQLite date function's arguments name, with its modifiers applied."""
        if not args:
            return "now()"
        first = self.expr(args[0], ex)
        modifiers = []
        for m in args[1:]:
            k = self.expr(m, ex)
            if not k.literal:
                raise Unsupported("date modifier that is not a literal")
            modifiers.append(str(k.value).strip().lower())
        if first.literal and str(first.value).lower() == "now":
            t = "now()"
        elif "unixepoch" in modifiers:
            t = f"unixtime_seconds_todatetime(todouble({first.text}))"
        elif first.type in _NUMERIC:
            t = f"datetime_add('millisecond', tolong(({first.text} - 2440587.5) * 86400000), {_EPOCH})"
        else:
            t = f"todatetime({first.text})"
        for m in modifiers:
            if m in ("unixepoch", "utc", "auto"):
                continue
            if m == "localtime":
                zone = _local_zone()
                if zone:
                    t = f"datetime_utc_to_local({t}, {_string(zone)})"
                else:
                    t = f"({t} + {time.localtime().tm_gmtoff}s)"
                continue
            if m == "start of day":
                t = f"startofday({t})"
                continue
            if m == "start of month":
                t = f"startofmonth({t})"
                continue
            if m == "start of year":
                t = f"startofyear({t})"
                continue
            mm = re.fullmatch(r"([+-]?\d+(?:\.\d+)?)\s+(second|minute|hour|day|month|year)s?", m)
            if mm:
                amount, unit = float(mm.group(1)), mm.group(2)
                if unit in ("month", "year"):
                    t = f"datetime_add({_string(unit)}, {int(amount)}, {t})"
                else:
                    seconds = amount * {"second": 1, "minute": 60, "hour": 3600, "day": 86400}[unit]
                    t = f"({t} + {seconds!r}s)"
                continue
            raise Unsupported(f"date modifier {m!r}")
        return t

    def date_func(self, name: str, args: list[exp.Expression], ex: _Ex) -> _K:
        t = self.time_value(args, ex)
        if name == "date":
            return _K(f"format_datetime({t}, 'yyyy-MM-dd')", "string")
        if name == "datetime":
            return _K(f"format_datetime({t}, 'yyyy-MM-dd HH:mm:ss')", "string")
        if name == "time":
            return _K(f"format_datetime({t}, 'HH:mm:ss')", "string")
        if name == "julianday":
            return _K(f"(todouble(({t} - {_EPOCH}) / 1ms) / 86400000.0 + 2440587.5)", "real")
        return _K(f"tolong(({t} - {_EPOCH}) / 1s)", "long")

    def strftime(self, fmt: _K, args: list[exp.Expression], ex: _Ex) -> _K:
        if not fmt.literal or not isinstance(fmt.value, str):
            raise Unsupported("strftime with a format that is not a literal")
        t = self.time_value(args, ex)
        text = fmt.value
        if text == "%s":
            return _K(f"tolong(({t} - {_EPOCH}) / 1s)", "long")
        pieces: list[str] = []
        literal = ""
        i = 0
        while i < len(text):
            ch = text[i]
            if ch == "%" and i + 1 < len(text):
                spec = text[i + 1]
                i += 2
                if spec == "%":
                    literal += "%"
                    continue
                if literal:
                    pieces.append(_string(literal))
                    literal = ""
                if spec in _STRFTIME:
                    pieces.append(f"format_datetime({t}, {_string(_STRFTIME[spec])})")
                elif spec == "s":
                    pieces.append(f"tostring(tolong(({t} - {_EPOCH}) / 1s))")
                elif spec == "w":
                    pieces.append(f"tostring(toint(dayofweek({t}) / 1d))")
                elif spec == "j":
                    pieces.append(f"strcat(substring('00', 0, 3 - strlen(tostring(dayofyear({t})))), dayofyear({t}))")
                else:
                    raise Unsupported(f"strftime %{spec}")
                continue
            literal += ch
            i += 1
        if literal:
            pieces.append(_string(literal))
        if len(pieces) == 1:
            return _K(pieces[0], "string")
        return _K(f"strcat({', '.join(pieces)})", "string")

    def x_Window(self, node: exp.Window, ex: _Ex) -> _K:
        func = node.this
        if node.args.get("spec") is not None and node.args["spec"].args:
            raise Unsupported("window frame clause")
        n = self.fresh()
        name = quote(f"__w{n}")
        partition = node.args.get("partition_by") or []
        order = node.args.get("order")
        part_keys = [_key_value(self.expr(p, ex)) for p in partition]
        stage = ""
        if part_keys:
            pk = (
                part_keys[0].text
                if len(part_keys) == 1
                else f"tostring(pack_array({', '.join(k.text for k in part_keys)}))"
            )
            stage += f" | extend __wp{n} = {pk}"
        sorts = []
        if order is not None:
            for o in order.expressions:
                k = _key_value(_value(self.expr(o.this, ex)))
                desc = bool(o.args.get("desc"))
                nulls_first = o.args.get("nulls_first")
                if nulls_first is None:
                    nulls_first = not desc
                sorts.append(f"{k.text} {'desc' if desc else 'asc'} nulls {'first' if nulls_first else 'last'}")
        restart = f"prev(__wp{n}) != __wp{n}" if part_keys else None
        if (
            isinstance(func, exp.RowNumber)
            or isinstance(func, (exp.Lag, exp.Lead))
            or (order is not None and isinstance(func, (exp.Sum, exp.Count)))
        ):
            keys = ([f"__wp{n} asc"] if part_keys else []) + sorts
            stage += f" | sort by {', '.join(keys)}" if keys else " | serialize"
            if isinstance(func, exp.RowNumber):
                value = _K(f"row_number(1, {restart})" if restart else "row_number()", "long")
            elif isinstance(func, (exp.Lag, exp.Lead)):
                k = _value(self.expr(func.this, ex))
                offset = func.args.get("offset")
                off = _convert(self.expr(offset, ex), "long").text if offset is not None else "1"
                default = func.args.get("default")
                dk = _convert(self.expr(default, ex), k.type) if default is not None else _lit(None, k.type)
                step = "prev" if isinstance(func, exp.Lag) else "next"
                if part_keys:
                    text = f"iff({step}(__wp{n}, {off}) == __wp{n}, {step}({k.text}, {off}), {dk.text})"
                else:
                    text = f"{step}({k.text}, {off}, {dk.text})"
                value = _K(text, k.type)
            else:
                if isinstance(func, exp.Count):
                    arg = (
                        "1"
                        if func.this is None or isinstance(func.this, exp.Star)
                        else f"iff(isnull({self.expr(func.this, ex).text}), 0, 1)"
                    )
                    vtype = "long"
                else:
                    k = _numeric(self.expr(func.this, ex))
                    arg, vtype = k.text, k.type
                value = _K(f"row_cumsum({arg}, {restart})" if restart else f"row_cumsum({arg})", vtype)
            stage += f" | extend {name} = {value.text}"
            ex.win.append(stage)
            return _K(name, value.type)
        if order is not None:
            raise Unsupported(f"window function {type(func).__name__} with ORDER BY")
        if not _is_aggregate(func):
            raise Unsupported(f"window function {type(func).__name__}")
        agg_k = self.aggregate_call(func, _Ex(ex.scope, None, ex.pre, ex.win)) if ex.agg is None else None
        if agg_k is None:
            agg_k = self.window_aggregate(func, ex)
        if part_keys:
            stage += f" | as q_rows{n} | join kind=leftouter (q_rows{n} | summarize {name} = {agg_k.text} by __wk{n} = __wp{n}) on $left.__wp{n} == $right.__wk{n}"
        else:
            stage += f" | as q_rows{n} | extend {name} = toscalar(q_rows{n} | summarize {agg_k.text})"
        ex.win.append(stage)
        return _K(name, agg_k.type)

    def window_aggregate(self, func: exp.Expression, ex: _Ex) -> _K:
        """An aggregate over a window of a grouped query: it reads the grouped rows."""
        if isinstance(func, exp.Count) and (func.this is None or isinstance(func.this, exp.Star)):
            return _K("count()", "long")
        k = self.expr(func.this, ex)
        inner = exp.column("__winarg")
        clone = func.copy()
        clone.set("this", inner)
        scope = _Scope([_Col(None, "__winarg", "__winarg", k.type)])
        out = self.aggregate_call(clone, _Ex(scope))
        return _K(out.text.replace(quote("__winarg"), k.text), out.type)


class _NotConstant(Exception):  # noqa: N818 - control flow, not an error
    pass


def _affinity(value: object, want: str) -> object:
    """A value as SQLite stores it in a column of Kusto type *want*."""
    if value is None:
        return None
    if isinstance(value, bool):
        value = int(value)
    if want in _NUMERIC and isinstance(value, str):
        num = _number(value.strip())
        return value if num is None else (float(num) if want == "real" else num)
    if want == "real" and isinstance(value, int):
        return float(value)
    if want == "string" and isinstance(value, (int, float)):
        return str(value)
    if want == "string" and isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    return value


def _numeric(k: _K) -> _K:
    if k.type == "bool":
        return _value(k)
    if k.type == "string":
        if k.literal:
            num = _number(str(k.value).strip())
            return _lit(num if num is not None else 0)
        return _K(f"todouble({k.text})", "real")
    if k.type == "dynamic":
        return _K(f"todouble({k.text})", "real")
    return k


def _key_value(k: _K) -> _K:
    """*k* as a join or grouping key: Kusto groups and joins scalars, not dynamic values."""
    if k.type == "dynamic" or k.json:
        return _K(f"tostring({k.text})", "string")
    return _value(k)


def _key_column(text: str, k: _K, name: str) -> tuple[str, str]:
    m = re.fullmatch(r"\['([^']*)'\]", k.text)
    if m:
        return m.group(1), text
    return name, f"{text} | extend {quote(name)} = {k.text}"


def _compare(op: str, a: _K, b: _K) -> _K:
    if a.null or b.null:
        return _K("bool(null)", "bool")
    if a.literal and not b.literal:
        a = _convert(a, b.type) if b.type != "dynamic" else a
    elif b.literal and not a.literal:
        b = _convert(b, a.type) if a.type != "dynamic" else b
    if a.type == "dynamic" and b.type != "dynamic":
        a = _convert(a, "real" if b.type in ("long", "real", "bool") else b.type)
    if b.type == "dynamic" and a.type != "dynamic":
        b = _convert(b, "real" if a.type in ("long", "real", "bool") else a.type)
    if a.type == "dynamic" and b.type == "dynamic":
        a, b = _convert(a, "string"), _convert(b, "string")
    if "bool" in (a.type, b.type) and a.type != b.type:
        a, b = _value(a), _value(b)
    if (a.type == "string") != (b.type == "string") and a.type and b.type:
        a, b = _convert(a, "string"), _convert(b, "string")
    if a.type == "string" and b.type == "string" and op in ("<", "<=", ">", ">="):
        return _K(f"(strcmp({a.text}, {b.text}) {op} 0)", "bool")
    return _K(f"({a.text} {op} {b.text})", "bool")


def _like(text: str, pattern: str, escape: str | None, negate: bool) -> _K:
    """SQLite LIKE (case-insensitive for ASCII) as the KQL string operator that matches it."""
    tokens: list[tuple[str, str]] = []  # ("lit", ch) | ("any", "%") | ("one", "_")
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if escape and ch == escape and i + 1 < len(pattern):
            tokens.append(("lit", pattern[i + 1]))
            i += 2
            continue
        if ch == "%":
            tokens.append(("any", ch))
        elif ch == "_":
            tokens.append(("one", ch))
        else:
            tokens.append(("lit", ch))
        i += 1
    kinds = [t for t, _ in tokens]
    literal = "".join(c for t, c in tokens if t == "lit")
    lo, hi = 0, len(kinds)
    while lo < hi and kinds[lo] == "any":
        lo += 1
    while hi > lo and kinds[hi - 1] == "any":
        hi -= 1
    core = kinds[lo:hi]
    if "one" not in kinds and "any" not in core:
        if kinds and not core:
            return _K("false" if negate else f"isnotnull({text})", "bool")
        lead, trail = lo > 0, hi < len(kinds)
        if lead and trail:
            op = ("contains", "!contains")
        elif lead:
            op = ("endswith", "!endswith")
        elif trail:
            op = ("startswith", "!startswith")
        else:
            op = ("=~", "!~")
        return _K(f"({text} {op[1] if negate else op[0]} {_string(literal)})", "bool")
    regex = "".join(".*" if t == "any" else "." if t == "one" else re.escape(c) for t, c in tokens)
    test = f"({text} matches regex {_string('(?is)^' + regex + '$')})"
    return _K(f"not{test}" if negate else test, "bool")


def _glob_regex(pattern: str) -> str:
    out = []
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "*":
            out.append(".*")
        elif ch == "?":
            out.append(".")
        elif ch == "[":
            end = pattern.find("]", i + 2)
            if end < 0:
                out.append(re.escape(ch))
            else:
                body = pattern[i + 1 : end]
                if body.startswith("^"):
                    body = "\\^" + body[1:]
                out.append("[" + ("^" + body[1:] if body.startswith("!") else body) + "]")
                i = end
        else:
            out.append(re.escape(ch))
        i += 1
    return "".join(out)


def _json_path(path: str) -> str:
    """A SQLite JSON path ($.a.b[0], $."x.y") as KQL property access on a dynamic value."""
    if not path.startswith("$"):
        raise Unsupported(f"JSON path {path!r}")
    out = []
    i = 1
    while i < len(path):
        ch = path[i]
        if ch == ".":
            i += 1
            if i < len(path) and path[i] == '"':
                end = path.index('"', i + 1)
                out.append(f"[{_string(path[i + 1 : end])}]")
                i = end + 1
            else:
                m = re.match(r"[^.\[]+", path[i:])
                if not m:
                    raise Unsupported(f"JSON path {path!r}")
                out.append(f"[{_string(m.group(0))}]")
                i += len(m.group(0))
        elif ch == "[":
            end = path.index("]", i)
            index = path[i + 1 : end].strip()
            if index.startswith("#"):
                raise Unsupported(f"JSON path {path!r}")
            out.append(f"[{int(index)}]")
            i = end + 1
        else:
            raise Unsupported(f"JSON path {path!r}")
    return "".join(out)


def _json_path_nodes(path: exp.JSONPath) -> str:
    out = []
    for part in path.expressions:
        if isinstance(part, exp.JSONPathRoot):
            continue
        if isinstance(part, exp.JSONPathKey):
            out.append(f"[{_string(str(part.this))}]")
        elif isinstance(part, exp.JSONPathSubscript) and isinstance(part.this, int):
            out.append(f"[{part.this}]")
        else:
            raise Unsupported(f"JSON path part {type(part).__name__}")
    return "".join(out)


def _sqlite_json_type(gettype: str) -> _K:
    """Kusto's gettype() names as SQLite's json_type() / typeof() names."""
    return _K(
        f"case({gettype} in ('long', 'int'), 'integer', {gettype} == 'real', 'real', {gettype} == 'string', 'text',"
        f" {gettype} == 'dictionary', 'object', {gettype} == 'array', 'array', {gettype} == 'bool', 'true', 'null')",
        "string",
    )


def _kql_name(name: str, index: int) -> str:
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name) and not name.startswith("__"):
        return name
    return f"__c{index}"


def _unique(names: list[str]) -> list[str]:
    seen: set[str] = set()
    out = []
    for i, name in enumerate(names):
        candidate = name
        if candidate.lower() in seen:
            candidate = f"{name}_{i}"
        seen.add(candidate.lower())
        out.append(candidate)
    return out
