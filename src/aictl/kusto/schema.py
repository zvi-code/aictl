"""The store's tables as Kusto tables: parsed from the SQLite schema, never kept apart.

Every SQLite table becomes one Kusto table of the same name and columns plus three
system columns. Kusto is append-only, so a row's changes are new versions of it:

- ``rowid``: the SQLite rowid, assigned by the connection (``next_rowid``), and the
  value of an ``INTEGER PRIMARY KEY`` column.
- ``_v``: when this version was written. A read keeps the newest version of each key.
- ``_deleted``: a DELETE writes one more version with this set; reads leave it out.

The key of a table is its PRIMARY KEY, else its UNIQUE constraint, else ``rowid``.
:func:`current` is the KQL that reads a table as SQLite would: one row per key.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import sqlglot
from sqlglot import exp

ROWID = "rowid"
VERSION = "_v"
DELETED = "_deleted"
SYSTEM_COLUMNS: tuple[tuple[str, str], ...] = ((ROWID, "long"), (VERSION, "datetime"), (DELETED, "bool"))

_KUSTO_TYPES = {
    "TEXT": "string",
    "VARCHAR": "string",
    "CHAR": "string",
    "BLOB": "string",
    "INT": "long",
    "INTEGER": "long",
    "BIGINT": "long",
    "SMALLINT": "long",
    "TINYINT": "long",
    "BOOLEAN": "long",
    "DOUBLE": "real",
    "REAL": "real",
    "FLOAT": "real",
    "NUMERIC": "real",
    "DECIMAL": "real",
}


def kusto_type(sqlite_type: str) -> str:
    """The Kusto scalar type for a SQLite column type; an unknown type is text."""
    return _KUSTO_TYPES.get(sqlite_type.upper().split("(")[0].strip(), "string")


def quote(name: str) -> str:
    """A KQL identifier in brackets, so a column named like a keyword (kind, by) is safe."""
    return "['" + name.replace("'", "\\'") + "']"


@dataclass(frozen=True)
class Column:
    name: str
    sqlite_type: str
    kusto_type: str
    default: object = None  # the literal of DEFAULT, as a Python value, or None
    not_null: bool = False
    rowid_alias: bool = False  # INTEGER PRIMARY KEY: the column is the rowid


@dataclass
class Table:
    name: str
    columns: list[Column] = field(default_factory=list)
    key: tuple[str, ...] = (ROWID,)  # PRIMARY KEY, else UNIQUE, else rowid
    # Column sets a CREATE UNIQUE INDEX makes unique, besides the key. SQLite's
    # conflict clauses (OR IGNORE, ON CONFLICT) fire on these too; a partial index
    # (``WHERE dedup_key != ''``) never fires on an empty value, so a row whose
    # value for one of these columns is empty or None has no conflict on that set.
    unique_sets: tuple[tuple[str, ...], ...] = ()

    @property
    def conflict_keys(self) -> tuple[tuple[str, ...], ...]:
        """Every column set a new row may collide on: the key first, then the unique indexes."""
        return (self.key, *self.unique_sets)

    def column(self, name: str) -> Column | None:
        return next((c for c in self.columns if c.name == name), None)

    @property
    def column_names(self) -> list[str]:
        return [c.name for c in self.columns]

    @property
    def rowid_column(self) -> str | None:
        """The INTEGER PRIMARY KEY column that is the rowid, if the table has one."""
        return next((c.name for c in self.columns if c.rowid_alias), None)


def _literal(node: exp.Expression | None) -> object:
    if node is None:
        return None
    if isinstance(node, exp.Literal):
        if node.is_string:
            return node.this
        text = node.this
        try:
            return int(text)
        except ValueError:
            try:
                return float(text)
            except ValueError:
                return text
    if isinstance(node, exp.Neg):
        inner = _literal(node.this)
        return -inner if isinstance(inner, (int, float)) else None
    if isinstance(node, exp.Null):
        return None
    if isinstance(node, exp.Boolean):
        return 1 if node.this else 0
    # CURRENT_TIMESTAMP, expressions: the connection fills these in.
    return None


def _column(node: exp.ColumnDef) -> Column:
    kind = node.args.get("kind")
    sqlite_type = kind.sql(dialect="sqlite") if kind is not None else "TEXT"
    default: object = None
    not_null = False
    primary = False
    for constraint in node.constraints:
        k = constraint.kind
        if isinstance(k, exp.DefaultColumnConstraint):
            default = _literal(k.this)
        elif isinstance(k, exp.NotNullColumnConstraint) and not k.args.get("allow_null"):
            not_null = True
        elif isinstance(k, exp.PrimaryKeyColumnConstraint):
            primary = True
    ktype = kusto_type(sqlite_type)
    return Column(
        name=node.name,
        sqlite_type=sqlite_type,
        kusto_type=ktype,
        default=default,
        not_null=not_null,
        rowid_alias=primary and ktype == "long",
    )


def _table(node: exp.Create) -> Table:
    schema = node.this
    table = Table(name=schema.this.name)
    pk: tuple[str, ...] = ()
    unique: tuple[str, ...] = ()
    for item in schema.expressions:
        if isinstance(item, exp.ColumnDef):
            col = _column(item)
            table.columns.append(col)
            for constraint in item.constraints:
                if isinstance(constraint.kind, exp.PrimaryKeyColumnConstraint):
                    pk = (col.name,)
                elif isinstance(constraint.kind, exp.UniqueColumnConstraint) and not unique:
                    unique = (col.name,)
        elif isinstance(item, exp.PrimaryKey):
            pk = tuple(e.name for e in item.expressions)
        elif isinstance(item, exp.UniqueColumnConstraint) and not unique:
            this = item.this
            cols = this.expressions if isinstance(this, exp.Schema) else [this]
            unique = tuple(e.name for e in cols)
    table.key = pk or unique or (ROWID,)
    if table.rowid_column and table.key == (table.rowid_column,):
        # An INTEGER PRIMARY KEY is the rowid itself: one key column, two names.
        table.key = (ROWID,)
    return table


def parse_schema(sql: str) -> dict[str, Table]:
    """Every table of a SQLite schema script, by name. Indexes, triggers and views are skipped."""
    tables: dict[str, Table] = {}
    statements = sqlglot.parse(sql, read="sqlite")
    for stmt in statements:
        if isinstance(stmt, exp.Create) and stmt.args.get("kind") == "TABLE" and isinstance(stmt.this, exp.Schema):
            table = _table(stmt)
            tables[table.name] = table
    for stmt in statements:
        if isinstance(stmt, exp.Create) and stmt.args.get("kind") == "INDEX" and stmt.args.get("unique"):
            index = stmt.this
            table = tables.get(index.args["table"].name) if isinstance(index, exp.Index) else None
            params = index.args.get("params") if isinstance(index, exp.Index) else None
            cols = tuple(c.name for c in (params.args.get("columns") or [])) if params is not None else ()
            if table is not None and cols and cols != table.key and cols not in table.unique_sets:
                table.unique_sets = (*table.unique_sets, cols)
    return tables


def store_schema() -> dict[str, Table]:
    """The tables of aictl's own store (``storage._SCHEMA_SQL``)."""
    from ..storage import _SCHEMA_SQL

    return parse_schema(_SCHEMA_SQL)


def create_commands(tables: dict[str, Table] | list[Table], streaming: bool = True) -> list[str]:
    """Management commands that create (or widen) every table and allow streaming ingestion.

    ``.create-merge`` adds missing columns to an existing table and never drops data,
    so the commands are safe to run on every start.
    """
    out: list[str] = []
    for table in tables.values() if isinstance(tables, dict) else tables:
        cols = [f"{quote(c.name)}:{c.kusto_type}" for c in table.columns if c.name != ROWID]
        cols += [f"{quote(n)}:{t}" for n, t in SYSTEM_COLUMNS]
        out.append(f".create-merge table {quote(table.name)} ({', '.join(cols)})")
        if streaming:
            out.append(f".alter table {quote(table.name)} policy streamingingestion enable")
    return out


def current(table: Table, alias: str | None = None) -> str:
    """KQL for the rows of *table* as SQLite would read them: the newest version per key, no deleted rows.

    ``rowid`` stays a column; the version columns are left out, so ``SELECT *``
    returns the SQLite column set.
    """
    key = ", ".join(quote(k) for k in table.key)
    name = quote(alias or table.name)
    return (
        f"{name} | summarize arg_max({quote(VERSION)}, *) by {key}"
        f" | where {quote(DELETED)} == false | project-away {quote(VERSION)}, {quote(DELETED)}"
    )


def row_defaults(table: Table) -> dict[str, object]:
    """The value of every column a write leaves out: its DEFAULT, else the type's empty value."""
    out: dict[str, object] = {}
    for c in table.columns:
        if c.default is not None:
            out[c.name] = c.default
        elif c.kusto_type == "string":
            out[c.name] = ""
        else:
            out[c.name] = None
    return out


# ── The information schema: the tables described as data, in the database and in the docs ──

INFORMATION_TABLE = "aictl_information_schema"

# What each table holds, by group. Every store table must be in exactly one group;
# the information schema test checks that.
TABLE_GROUPS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "Session tables (scoped by session_id; one row per session or per item of a session)",
        (
            "sessions",
            "session_usage",
            "session_processes",
            "session_commits",
            "session_folders",
            "session_artifacts",
            "session_loaded_files",
            "session_context_items",
            "agents",
        ),
    ),
    (
        "Usage records (append-only facts; rowid key, dedup_key unique)",
        (
            "requests",
            "tool_invocations",
            "session_prompts",
            "skill_uses",
            "file_write_events",
            "context_events",
            "events",
        ),
    ),
    ("Time series (machine-wide)", ("metrics", "system_snapshots", "process_snapshots", "tool_stats")),
    (
        "Processes, tools, projects, configuration",
        ("processes", "tools", "projects", "tool_config", "environment_vars"),
    ),
    ("Files and memory", ("files", "file_history", "file_blobs", "memory_snapshots")),
    (
        "Chat transcripts from the tools' own stores",
        ("vscode_chat_messages", "copilot_session_messages", "cursor_session_messages"),
    ),
    ("Catalogs seeded from the package's YAML and CSV", ("datapoint_catalog", "path_defs", "process_defs")),
    (
        "Dashboard layout",
        (
            "ui_dashboard",
            "ui_section",
            "ui_widget",
            "ui_tab",
            "ui_group_by_option",
            "ui_datasource",
            "ui_widget_datasource",
            "ui_preference",
            "ui_theme",
        ),
    ),
    ("Bookkeeping", ("schema_version", "maintenance_state", "data_quality_status")),
)

INFORMATION_COLUMNS: tuple[tuple[str, str], ...] = (
    ("table_name", "string"),
    ("column_name", "string"),
    ("ordinal", "long"),
    ("kusto_type", "string"),
    ("sqlite_type", "string"),
    ("default_value", "string"),
    ("not_null", "bool"),
    ("key_position", "long"),  # 1-based position in the table's key; 0 when not part of it
    ("unique_sets", "string"),  # the unique indexes the column is in, as "a,b;c"
    ("system_column", "bool"),
    ("scope", "string"),  # session: rows belong to a session (was per project in SQLite); machine: machine-wide
    ("table_group", "string"),
    ("table_key", "string"),
)


def table_group(name: str) -> str:
    return next((title for title, names in TABLE_GROUPS if name in names), "")


def table_scope(name: str) -> str:
    """``session`` for the tables SQLite kept per project, ``machine`` for the rest."""
    from ..project_stores import PROJECT_TABLES

    return "session" if name in PROJECT_TABLES else "machine"


def information_rows(tables: dict[str, Table] | None = None) -> list[dict[str, object]]:
    """One row per column of every table, in INFORMATION_COLUMNS order, system columns included."""
    tables = store_schema() if tables is None else tables
    out: list[dict[str, object]] = []
    for name, table in tables.items():
        group = table_group(name)
        scope = table_scope(name)
        key = ",".join(table.key)
        ordinal = 0
        for c in table.columns:
            ordinal += 1
            out.append(
                {
                    "table_name": name,
                    "column_name": c.name,
                    "ordinal": ordinal,
                    "kusto_type": c.kusto_type,
                    "sqlite_type": c.sqlite_type,
                    "default_value": "" if c.default is None else str(c.default),
                    "not_null": c.not_null,
                    # An INTEGER PRIMARY KEY column is the rowid, so it is the key when the key is rowid.
                    "key_position": table.key.index(c.name) + 1
                    if c.name in table.key
                    else (1 if c.rowid_alias and table.key == (ROWID,) else 0),
                    "unique_sets": ";".join(",".join(u) for u in table.unique_sets if c.name in u),
                    "system_column": False,
                    "scope": scope,
                    "table_group": group,
                    "table_key": key,
                }
            )
        for sys_name, sys_type in SYSTEM_COLUMNS:
            if sys_name == ROWID and table.rowid_column:
                continue  # the INTEGER PRIMARY KEY column is the rowid
            ordinal += 1
            out.append(
                {
                    "table_name": name,
                    "column_name": sys_name,
                    "ordinal": ordinal,
                    "kusto_type": sys_type,
                    "sqlite_type": "",
                    "default_value": "",
                    "not_null": True,
                    "key_position": table.key.index(sys_name) + 1 if sys_name in table.key else 0,
                    "unique_sets": "",
                    "system_column": True,
                    "scope": scope,
                    "table_group": group,
                    "table_key": key,
                }
            )
    return out


def _kql_value(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    text = str(value).replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{text}'"


def information_commands(tables: dict[str, Table] | None = None) -> list[str]:
    """Create the information schema table and replace its rows with the current schema."""
    cols = ", ".join(f"{quote(n)}:{t}" for n, t in INFORMATION_COLUMNS)
    rows = information_rows(tables)
    values = ",\n".join("  " + ", ".join(_kql_value(r[n]) for n, _t in INFORMATION_COLUMNS) for r in rows)
    return [
        f".create-merge table {quote(INFORMATION_TABLE)} ({cols})",
        f".set-or-replace {quote(INFORMATION_TABLE)} <| datatable({cols}) [\n{values}\n]",
    ]


def render_markdown(tables: dict[str, Table] | None = None) -> str:
    """The schema as the reference document ``docs/kusto-schema.md`` (a test keeps the file current)."""
    tables = store_schema() if tables is None else tables
    lines = [
        "# Kusto schema",
        "",
        "Generated by `aictl.kusto.schema.render_markdown()` from `storage._SCHEMA_SQL`; do not edit by hand"
        " (`aictl db schema --markdown` prints it, and a test compares this file to it).",
        "",
        "One Kusto database (`kusto_database`, default `aictl`) holds every table. Each table keeps its SQLite"
        " name and columns and gains the system columns `rowid:long` (assigned by the connection; the value of an"
        " `INTEGER PRIMARY KEY` column), `_v:datetime` (when this version was written) and `_deleted:bool`. Rows"
        " are versions: a read keeps the newest `_v` per key and drops deleted rows. The key is the PRIMARY KEY,"
        " else a UNIQUE constraint, else `rowid`; unique indexes are the extra conflict sets SQLite's"
        " `OR IGNORE` and `ON CONFLICT` honour.",
        "",
        "Nothing is per project at the database level: the SQLite split into one file per repository existed"
        " for SQLite's write lock, which Kusto does not have. Scope comes from the `session_id` and"
        " `project_path` columns. The same description is in the database itself, as the table"
        f" `{INFORMATION_TABLE}` (one row per column), rewritten on every start.",
        "",
    ]
    for title, names in TABLE_GROUPS:
        lines += [f"## {title}", ""]
        for name in names:
            table = tables.get(name)
            if table is None:
                continue
            key = ", ".join(table.key)
            unique = (
                "; unique: " + ", ".join("(" + ",".join(u) + ")" for u in table.unique_sets)
                if table.unique_sets
                else ""
            )
            scope = "was per project in SQLite" if table_scope(name) == "session" else "machine-wide"
            lines += [
                f"### `{name}`",
                "",
                f"Key: {key}{unique}. Scope: {scope}. {len(table.columns)} columns.",
                "",
                "| Column | Kusto type | SQLite type | Default | Not null |",
                "|---|---|---|---|---|",
            ]
            for c in table.columns:
                default = "" if c.default is None else repr(c.default)
                suffix = " (rowid)" if c.rowid_alias else ""
                lines.append(
                    f"| {c.name}{suffix} | {c.kusto_type} | {c.sqlite_type} | {default} | {'yes' if c.not_null else ''} |"
                )
            for sys_name, sys_type in SYSTEM_COLUMNS:
                if sys_name != ROWID or not table.rowid_column:
                    lines.append(f"| {sys_name} | {sys_type} | system | | |")
            lines.append("")
    return "\n".join(lines)
