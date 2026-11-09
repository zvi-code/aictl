"""The SQL-to-KQL translator: exact output for the main constructs, and the code's own SQL as a corpus.

The corpus test reads every SQL string literal in ``src/aictl`` (f-string holes are
filled with plausible SQL), translates it, and pins which statements are accepted as
untranslatable: the allowlist below lists them by file:line with the reason, so a new
statement the translator cannot handle fails the test instead of slipping through.
With a Kusto emulator listening on localhost:8080, every translated query and
mutation also runs there, so a KQL syntax or semantic error is a test failure.
"""

from __future__ import annotations

import ast
import collections
import functools
import importlib
import re
import string
from pathlib import Path

import pytest

from aictl.kusto.schema import create_commands, store_schema
from aictl.kusto.statements import Insert, Mutation, Noop, Pragma, Query, Unsupported
from aictl.kusto.translate import Translator

SRC = Path(__file__).resolve().parent.parent / "src" / "aictl"
EMULATOR = "http://localhost:8080"
DATABASE = "aictl"
SQL_HEAD = re.compile(r"^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|PRAGMA|ATTACH|DETACH|DROP|ALTER|REPLACE)\s")

# Files whose SQL reads another tool's SQLite database (Copilot's session store,
# Cursor's and VS Code's state databases), never the store: they are reported but
# not counted against the translation rate.
FOREIGN_FILES = (
    "aictl/context_audit.py",
    "aictl/effective_config.py",
    "aictl/ingesters/cursor_conversations.py",
    "aictl/ingesters/transcript_usage.py",
    "aictl/monitoring/tool_telemetry.py",
)

# Store statements the translator refuses, by file:line, with (part of) the reason.
ACCEPTED_UNSUPPORTED: dict[str, str] = {
    # The per-project store copy machinery works on attached SQLite files.
    "aictl/project_stores.py:876": "attached database",
    "aictl/project_stores.py:884": "attached database",
    "aictl/project_stores.py:891": "attached database",
    "aictl/project_stores.py:894": "attached database",
    "aictl/project_stores.py:1621": "CREATE TABLE ... AS SELECT",
    "aictl/project_stores.py:1649": "no such table",  # the temp table of the line above
    # A trigger body (new.rowid) and SQLite internals.
    "aictl/storage.py:2367": "new.rowid",
    "aictl/storage.py:7015": "dbstat",
    "aictl/storage.py:1813": "last_insert_rowid()",
}

# Statements whose f-string holes the corpus cannot fill with valid SQL.
UNTESTABLE_LIMIT = 3


# Unit tests: the exact KQL of the main constructs.


@pytest.fixture(scope="module")
def tr() -> Translator:
    return Translator()


def body(kql: str) -> str:
    """The KQL after the let prelude."""
    return kql.rsplit(";\n", 1)[-1]


def test_select_where_order_limit(tr):
    q = tr.translate("SELECT ts, kind FROM events WHERE session_id = ? ORDER BY ts DESC LIMIT 5", ["s'1"])
    assert isinstance(q, Query)
    assert q.kql.startswith("let ['events'] = ['events'] | summarize arg_max(['_v'], *) by ['ts'], ['tool'], ['kind'],")
    assert body(q.kql) == (
        "['events'] | where (['session_id'] == 's\\'1') | project ['ts'] = ['ts'], ['kind'] = ['kind']"
        " | sort by ['ts'] desc nulls last | take 5"
    )
    assert q.columns == ["ts", "kind"]


def test_group_by_with_aggregates_and_having(tr):
    q = tr.translate(
        "SELECT tool, COUNT(*), SUM(input_tokens), COUNT(DISTINCT model), GROUP_CONCAT(model, '|')"
        " FROM requests GROUP BY tool HAVING COUNT(*) > 1 ORDER BY 2 DESC"
    )
    assert body(q.kql) == (
        "['requests'] | summarize __a0 = count(), __a1 = sum(['input_tokens']), __a2 = count_distinct(['model']),"
        " __a3 = strcat_array(make_list(['model']), '|') by ['tool'] | where (['__a0'] > 1)"
        " | project ['tool'] = ['tool'], ['__c1'] = ['__a0'], ['__c2'] = ['__a1'], ['__c3'] = ['__a2'],"
        " ['__c4'] = ['__a3'] | sort by ['__c1'] desc nulls last"
    )
    assert q.columns == ["tool", "COUNT(*)", "SUM(input_tokens)", "COUNT(DISTINCT model)", "GROUP_CONCAT(model, '|')"]


def test_bare_column_takes_the_max_row(tr):
    q = tr.translate("SELECT session_id, MAX(ts), finish_reason FROM requests GROUP BY session_id")
    assert "(__x0, __b0) = arg_max(['ts'], ['finish_reason'])" in q.kql


def test_join_renames_columns_and_joins_on_equality(tr):
    q = tr.translate(
        "SELECT sp.session_id, s.model FROM session_processes sp JOIN sessions s ON sp.session_id = s.session_id"
        " WHERE sp.pid = ?",
        [42],
    )
    text = body(q.kql)
    assert text.startswith("(['session_processes'] | project ['sp__session_id'] = ['session_id'],")
    assert "| join kind=inner ((['sessions'] | project ['s__session_id'] = ['session_id']," in text
    assert text.endswith(
        "on $left.['sp__session_id'] == $right.['s__session_id'] | where (['sp__pid'] == 42)"
        " | project ['session_id'] = ['sp__session_id'], ['model'] = ['s__model']"
    )


def test_json_extract_is_converted_where_compared_and_summed(tr):
    q = tr.translate(
        "SELECT SUM(json_extract(detail, '$.lines_added')) FROM file_write_events"
        " WHERE json_extract(detail, '$.a[0].b') = 'x'"
    )
    assert body(q.kql) == (
        "['file_write_events'] | where (tostring(todynamic(['detail'])['a'][0]['b']) == 'x')"
        " | summarize __a0 = sum(todouble(todynamic(['detail'])['lines_added'])) | project ['__c0'] = ['__a0']"
    )


def test_like_patterns(tr):
    q = tr.translate(
        "SELECT 1 FROM events WHERE kind LIKE 'hook:%' AND detail LIKE '%x\\_y%' ESCAPE '\\'"
        " AND tool NOT LIKE '%code' AND kind LIKE 'a_c'"
    )
    text = body(q.kql)
    assert "(['kind'] startswith 'hook:')" in text
    assert "(['detail'] contains 'x_y')" in text
    assert "(['tool'] !endswith 'code')" in text
    assert "(['kind'] matches regex '(?is)^a.c$')" in text


def test_in_subquery_and_in_json_each(tr):
    q = tr.translate(
        "SELECT session_id FROM sessions WHERE session_id IN (SELECT session_id FROM requests WHERE is_error = 1)"
        " AND tool IN (SELECT value FROM json_each(?))",
        ['["claude","copilot"]'],
    )
    text = body(q.kql)
    assert (
        "(['session_id'] in (['requests'] | where (['is_error'] == 1) | project ['session_id'] = ['session_id']))"
        in text
    )
    assert "(['tool'] in ((datatable(['key']:long, ['value']:string) [0, 'claude', 1, 'copilot'])" in text


def test_correlated_exists_is_a_left_join(tr):
    q = tr.translate(
        "SELECT su.session_id FROM session_usage su"
        " WHERE NOT EXISTS (SELECT 1 FROM requests r WHERE r.session_id = su.session_id)"
    )
    assert body(q.kql) == (
        "['session_usage'] | join kind=leftouter (['requests'] | summarize by __ek1_0 = ['session_id']"
        " | extend __e1 = true) on $left.['session_id'] == $right.['__ek1_0'] | where not(isnotnull(['__e1']))"
        " | project ['session_id'] = ['session_id']"
    )


def test_update_is_a_mutation_of_every_column(tr):
    m = tr.translate(
        "UPDATE processes SET ended_at = ?, exit_code = ? WHERE pid = ? AND started_at = ?", [5.5, 0, 7, 1.0]
    )
    assert isinstance(m, Mutation) and m.kind == "update" and m.table == "processes"
    assert body(m.kql) == (
        "['processes'] | where ((['pid'] == 7) and (['started_at'] == 1.0))"
        " | project ['id'] = ['id'], ['pid'] = ['pid'], ['tool'] = ['tool'], ['project_path'] = ['project_path'],"
        " ['cwd'] = ['cwd'], ['cmdline'] = ['cmdline'], ['ppid'] = ['ppid'], ['started_at'] = ['started_at'],"
        " ['ended_at'] = 5.5, ['exit_code'] = 0, ['source'] = ['source'], ['meta'] = ['meta'],"
        " ['rowid'] = ['rowid'], ['_v'] = now(), ['_deleted'] = false"
    )


def test_delete_with_rowid_subquery(tr):
    m = tr.translate(
        "DELETE FROM metrics WHERE rowid IN (SELECT rowid FROM metrics WHERE ts < ? ORDER BY ts LIMIT 100)", [10]
    )
    assert isinstance(m, Mutation) and m.kind == "delete"
    text = body(m.kql)
    assert text.startswith(
        "['metrics'] | where (['rowid'] in (['metrics'] | where (['ts'] < 10.0) | project ['rowid'] = ['rowid'],"
        " ['__o0'] = ['ts'] | sort by ['__o0'] asc nulls first | take 100 | project-away ['__o0']))"
    )
    assert text.endswith("['rowid'] = ['rowid'], ['_v'] = now(), ['_deleted'] = true")


def test_insert_or_replace_fills_defaults(tr):
    ins = tr.translate("INSERT OR REPLACE INTO maintenance_state(key, value) VALUES(?, ?)", ["k", "5"])
    assert ins == Insert(table="maintenance_state", rows=[{"key": "k", "value": 5.0, "text": ""}], on_conflict="replace")
    ins = tr.translate("REPLACE INTO tools(tool) VALUES ('x')")
    assert ins.on_conflict == "replace"
    assert ins.rows == [
        {"tool": "x", "vendor": "", "host": "", "display_name": "", "first_seen_at": 0, "last_seen_at": 0}
    ]


def test_upsert_copying_the_new_row_stays_an_insert(tr):
    ins = tr.translate(
        "INSERT INTO ui_preference(dashboard_id, user_id, pref_key, pref_value) VALUES(?, ?, ?, ?)"
        " ON CONFLICT(dashboard_id, user_id, pref_key) DO UPDATE SET pref_value = excluded.pref_value",
        [1, "u", "k", "v"],
    )
    # ui_preference is keyed by rowid: its conflict target is a unique index, so the cluster merges.
    assert isinstance(ins, Mutation) and ins.kind == "insert"
    ins = tr.translate(
        "INSERT INTO vscode_chat_messages(session_id, source_file, source_row_id, role, content, model, ts,"
        " ingested_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(session_id, source_file, source_row_id) DO UPDATE SET"
        " role = excluded.role, content = excluded.content WHERE content != excluded.content",
        ["s", "f", 1, "user", "hi", "m", 1.0, 2.0],
    )
    assert isinstance(ins, Insert)
    assert ins.on_conflict == "update"
    assert ins.update_columns == ("role", "content")
    assert ins.update_kql == "(['content'] != ['__new_content'])"
    # A unique index's columns are a conflict target the connection checks too.
    ins = tr.translate(
        "INSERT INTO file_write_events(dedup_key, ts, detail, tool) VALUES(?,?,?,?) ON CONFLICT(dedup_key)"
        " WHERE dedup_key != '' DO UPDATE SET detail=excluded.detail, tool=excluded.tool",
        ["k", 1.0, "{}", "claude"],
    )
    assert isinstance(ins, Insert) and ins.update_columns == ("detail", "tool") and ins.update_kql is None


def test_upsert_that_computes_is_a_mutation(tr):
    m = tr.translate(
        "INSERT INTO agents(agent_id, session_id, task) VALUES(?,?,?) ON CONFLICT(agent_id) DO UPDATE SET"
        " task = CASE WHEN excluded.task != '' THEN excluded.task ELSE agents.task END",
        ["a", "s", "t"],
    )
    assert isinstance(m, Mutation) and m.kind == "insert"
    assert "| join kind=leftouter (['agents'] | project-rename ['__c_agent_id'] = ['agent_id']," in m.kql
    assert "['task'] = iff(__hit, iff((['task'] != ''), ['task'], ['__c_task']), ['task'])" in m.kql


def test_pragma_and_noop(tr):
    assert tr.translate("PRAGMA table_info(events)") == Pragma("table_info", "events", None)
    assert tr.translate("PRAGMA main.table_info('events')") == Pragma("table_info", "events", None)
    assert tr.translate("PRAGMA journal_mode=WAL") == Pragma("journal_mode", None, "WAL")
    noop = tr.translate("CREATE INDEX IF NOT EXISTS idx_x ON events(ts)")
    assert isinstance(noop, Noop) and noop.original.startswith("CREATE INDEX")
    assert isinstance(tr.translate("BEGIN IMMEDIATE"), Noop)


def test_create_table_teaches_the_table():
    t = Translator()
    assert t.table("store_info") is None
    t.translate("CREATE TABLE IF NOT EXISTS store_info(key TEXT PRIMARY KEY, root TEXT NOT NULL)")
    assert isinstance(t.translate("SELECT key, root FROM store_info LIMIT 1"), Query)


def test_parameters_are_inlined_as_typed_literals(tr):
    q = tr.translate("SELECT 1 FROM sessions WHERE session_id = :sid AND pid = $pid", {"sid": "a'b\\c\nd", "pid": "12"})
    assert "(['session_id'] == 'a\\'b\\\\c\\nd')" in q.kql
    assert "(['pid'] == 12)" in q.kql
    q = tr.translate("SELECT 1 FROM sessions WHERE pid = ? AND model = ? AND cost_usd >= ?", [True, 3, 2])
    assert "(['pid'] == 1) and (['model'] == '3')) and (['cost_usd'] >= 2.0)" in q.kql
    with pytest.raises(ValueError):
        tr.translate("SELECT 1 FROM sessions WHERE pid = ?")


def test_unsupported_names_the_construct(tr):
    with pytest.raises(Unsupported) as err:
        tr.translate("SELECT last_insert_rowid()")
    assert err.value.reason == "last_insert_rowid()"
    with pytest.raises(Unsupported, match="more than one statement"):
        tr.translate("SELECT 1; SELECT 2")
    assert [type(s) for s in tr.translate_script("BEGIN; DELETE FROM metrics; COMMIT;")] == [Noop, Mutation, Noop]


# The corpus: every SQL literal of the code.


def _module(path: Path):
    name = ".".join(path.relative_to(SRC.parent).with_suffix("").parts)
    try:
        return importlib.import_module(name)
    except Exception:  # noqa: BLE001 - a module that does not import only loses constant resolution
        return None


def _constant(node: ast.expr, module) -> object:
    """The value of an f-string hole made of module constants, or None."""
    if module is None:
        return None
    for sub in ast.walk(node):
        if isinstance(sub, ast.Call) and not (isinstance(sub.func, ast.Name) and sub.func.id in ("int", "str")):
            return None
        if not isinstance(
            sub, (ast.Name, ast.Constant, ast.BinOp, ast.UnaryOp, ast.Call, ast.Load, ast.operator, ast.unaryop)
        ):
            return None
    try:
        value = eval(compile(ast.Expression(node), "<hole>", "eval"), vars(module))  # noqa: S307 - module constants only
    except Exception:  # noqa: BLE001
        return None
    return value if isinstance(value, (str, int, float)) else None


SUBQUERY = "SELECT session_id, 0 AS rank, text FROM session_prompts"


def _hole(expr: ast.expr, before: str, after: str, module) -> str:
    """Plausible SQL for one f-string hole, from the hole's expression and the text around it."""
    value = _constant(expr, module)
    if value is not None:
        return str(value)
    source = ast.unparse(expr)
    tail = before.rstrip()
    word = tail.split()[-1].upper() if tail.split() else ""
    m = re.search(r"_source\('(\w+)'\)", source)
    if m:
        return m.group(1)
    if "'?'" in source or source in ("marks", "placeholders", "ph") or "placeholders" in source:
        return "?"
    if before.endswith("-"):
        return "1"
    if source == "schema":
        return "main"
    if source == "names":
        return "session_id, rank, text"
    if before.endswith("."):
        if "sid" in source:
            return "session_id IN (?)"
        return "@@T@@" if word in ("FROM", "JOIN", "INTO", "UPDATE") or "table" in source else "@@C@@"
    if word in ("FROM", "JOIN", "INTO", "UPDATE", "TABLE", "EXISTS") or source in ("table", "real_table", "t"):
        return "@@T@@"
    if before and not before[-1].isspace() and before[-1] not in "(,":
        return ""
    if word in ("LIMIT", "OFFSET"):
        return "1"
    if word == "SET":
        return "@@SET@@"
    if word == "AS" or source in ("sql", "hits", "body") or (tail.endswith("(") and "sql" in source):
        return SUBQUERY
    if word in ("WHERE", "AND", "OR") or tail.endswith("(") and not tail.upper().endswith(("IN (", "IN(")):
        if tail.endswith("(") and word not in ("WHERE", "AND", "OR") and re.search(r"[\w@]\($", tail):
            return "@@C@@"
        return "1 = 1"
    if word in ("SELECT", "BY", "DISTINCT") or tail.endswith(",") or after.lstrip().upper().startswith(("FROM", "AS")):
        return "@@C@@"
    return "1"


def _best_table(sql: str, tables) -> str:
    words = {w.lower() for w in re.findall(r"[A-Za-z_]\w*", sql)}
    ranked = sorted(tables.values(), key=lambda t: (-len(words & {c.name for c in t.columns}), t.name != "events"))
    return ranked[0].name


def _fill(sql: str, tables) -> str:
    table = _best_table(sql, tables) if "@@T@@" in sql else None
    sql = sql.replace("@@T@@", table or "events")
    named = re.search(r"\b(?:FROM|INTO|UPDATE)\s+(?:main\.)?(\w+)", sql, re.I)
    if table is None and named and named.group(1) in tables:
        table = named.group(1)
    t = tables[table or "sessions"]
    names = [c.name for c in t.columns]
    column = "session_id" if "session_id" in names else names[0]
    value_col = next((n for n in names if n not in t.key), names[-1])
    return sql.replace("@@C@@", column).replace("@@SET@@", f"{value_col} = ?")


def _format_holes(sql: str, module) -> str:
    """A ``str.format`` template's fields filled like f-string holes."""
    text = ""
    for literal, name, _spec, _conv in string.Formatter().parse(sql):
        text += literal
        if name is not None:
            text += _hole(ast.Name(id=name), text, "", module or None)
    return text


@functools.cache
def corpus() -> list[tuple[str, int, str]]:
    """(file, line, sql) for every SQL string literal of the code, f-string holes filled."""
    tables = store_schema()
    out = []
    for path in sorted(SRC.rglob("*.py")):
        if "kusto" in path.parts:
            continue
        tree = ast.parse(path.read_text())
        docstrings = {
            id(n.body[0].value)
            for n in ast.walk(tree)
            if isinstance(n, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
            and n.body
            and isinstance(n.body[0], ast.Expr)
        }
        inner = {id(v) for n in ast.walk(tree) if isinstance(n, ast.JoinedStr) for v in ast.walk(n) if v is not n}
        module = None
        for node in ast.walk(tree):
            if module is None and isinstance(node, (ast.JoinedStr, ast.Constant)):
                module = _module(path) or False
            if id(node) in inner or id(node) in docstrings:
                continue
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                sql = node.value
                if SQL_HEAD.match(sql.strip()) and re.search(r"\{\w+\}", sql):
                    sql = _format_holes(sql, module)
            elif isinstance(node, ast.JoinedStr):
                text = ""
                for i, part in enumerate(node.values):
                    if isinstance(part, ast.Constant):
                        text += part.value
                        continue
                    following = node.values[i + 1] if i + 1 < len(node.values) else None
                    after = following.value if isinstance(following, ast.Constant) else ""
                    text += _hole(part.value, text, after, module or None)
                sql = text
            else:
                continue
            sql = sql.strip()
            if SQL_HEAD.match(sql):
                out.append((str(path.relative_to(SRC.parent)), node.lineno, _fill(sql, tables)))
    return out


def _learned() -> Translator:
    """A translator that knows the tables the code creates at run time too."""
    t = Translator()
    for _, _, sql in corpus():
        if sql.upper().startswith("CREATE TABLE") and " AS SELECT " not in sql.upper():
            t.translate_script(sql)
    return t


@functools.cache
def translated() -> list[tuple[str, object]]:
    """Each corpus statement's place and what it translated to (an Unsupported, or the string 'untestable')."""
    t = _learned()
    params = [1] * 200
    out = []
    for file, line, sql in corpus():
        where = f"{file}:{line}"
        try:
            try:
                out.append((where, t.translate(sql, params)))
            except Unsupported as err:
                if not err.reason.startswith("more than one statement"):
                    raise
                out.append((where, t.translate_script(sql)))
        except Unsupported as err:
            if err.reason.startswith("statement SQLite syntax"):
                out.append((where, "untestable"))
            else:
                out.append((where, err))
    return out


def _foreign(where: str) -> bool:
    return where.startswith(FOREIGN_FILES)


def test_corpus_translates():
    results = translated()
    untestable = [w for w, r in results if r == "untestable"]
    foreign = [(w, r) for w, r in results if _foreign(w)]
    store = [(w, r) for w, r in results if not _foreign(w) and r != "untestable"]
    failed = [(w, r) for w, r in store if isinstance(r, Unsupported)]
    by_reason = collections.Counter(r.reason for _, r in failed)
    print(f"\ncorpus {len(results)}: store statements {len(store)}, translated {len(store) - len(failed)},")
    print(f"  unsupported {len(failed)}, other tools' databases {len(foreign)}, untestable holes {len(untestable)}")
    for reason, count in by_reason.most_common():
        print(f"  {count:3d}  {reason}")
    for w, r in failed:
        print(f"  {w}: {r.reason}")
    assert len(untestable) <= UNTESTABLE_LIMIT, untestable
    assert (len(store) - len(failed)) / len(store) >= 0.95
    found = {w: r.reason for w, r in failed}
    new = {w: reason for w, reason in found.items() if w not in ACCEPTED_UNSUPPORTED}
    assert not new, f"statements that newly fail to translate: {new}"
    gone = sorted(set(ACCEPTED_UNSUPPORTED) - set(found))
    assert not gone, f"allowlisted statements that now translate (remove them from the list): {gone}"
    for w, reason in found.items():
        assert ACCEPTED_UNSUPPORTED[w] in reason, (w, reason)


@functools.cache
def _client():
    try:
        from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
    except ImportError:
        return None
    client = KustoClient(KustoConnectionStringBuilder.with_no_authentication(EMULATOR))
    try:
        client.execute(DATABASE, "print 1")
    except Exception:  # noqa: BLE001 - no emulator
        return None
    return client


def test_corpus_runs_on_the_emulator():
    client = _client()
    if client is None:
        pytest.skip(f"no Kusto emulator at {EMULATOR}")
    for command in create_commands(_learned().tables, streaming=False):
        client.execute_mgmt(DATABASE, command)
    errors = []
    ran = 0
    for where, result in translated():
        for stmt in result if isinstance(result, list) else [result]:
            if not isinstance(stmt, (Query, Mutation)):
                continue
            try:
                client.execute(DATABASE, stmt.kql)
            except Exception as err:  # noqa: BLE001 - every failure is reported
                errors.append(f"{where}: {str(err)[:300]}\n{stmt.kql[-600:]}")
            ran += 1
    print(f"\nemulator ran {ran} translated statements, {len(errors)} failed")
    assert not errors, "\n\n".join(errors)


# Results: the same rows in SQLite and, as datatables in place of the tables, on the emulator.

ROWS = {
    "sessions": [
        {"session_id": "s1", "tool": "claude", "pid": 10, "model": "m1", "started_at": 100.0, "ended_at": None},
        {"session_id": "s2", "tool": "copilot", "pid": 11, "model": "", "started_at": 200.0, "ended_at": 300.0},
    ],
    "requests": [
        {"session_id": "s1", "ts": 101.0, "model": "m1", "tool": "claude", "input_tokens": 10, "cost_usd": 0.5},
        {"session_id": "s1", "ts": 105.0, "model": "m2", "tool": "claude", "input_tokens": 5, "is_error": 1},
        {"session_id": "s3", "ts": 50.0, "model": "m2", "tool": "codex", "input_tokens": 7, "finish_reason": "x"},
    ],
    "events": [
        {"ts": 1.0, "tool": "claude", "kind": "hook:Pre", "detail": '{"tool_name": "Bash", "n": 2}', "seq": 0},
        {"ts": 2.0, "tool": "claude", "kind": "otel:x", "detail": '{"a": {"b": [1, 2]}}', "seq": 0},
    ],
}

RESULT_CASES = [
    ("SELECT session_id, COUNT(*), SUM(input_tokens), MAX(ts), model FROM requests GROUP BY session_id", []),
    (
        "SELECT s.session_id, r.model FROM sessions s LEFT JOIN requests r ON r.session_id = s.session_id"
        " AND r.ts > 102 ORDER BY 1, 2",
        [],
    ),
    (
        "SELECT session_id FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM requests r WHERE r.session_id = s.session_id)",
        [],
    ),
    ("SELECT session_id, (SELECT COUNT(*) FROM requests r WHERE r.session_id = s.session_id) FROM sessions s", []),
    ("SELECT kind, json_extract(detail, '$.tool_name'), json_extract(detail, '$.a.b[1]') FROM events ORDER BY ts", []),
    ("SELECT session_id FROM sessions WHERE tool LIKE 'CL%' OR model LIKE '%1' OR tool LIKE 'c_p%'", []),
    (
        "SELECT session_id, CASE WHEN ended_at IS NULL THEN 'open' ELSE 'closed' END, COUNT(*) OVER ()"
        " FROM sessions ORDER BY started_at DESC",
        [],
    ),
    ("SELECT MIN(t) FROM (SELECT MIN(ts) t FROM requests UNION ALL SELECT MIN(ts) FROM events)", []),
    (
        "SELECT session_id FROM requests WHERE session_id IN (SELECT value FROM json_each(?)) GROUP BY 1",
        ['["s1","s3"]'],
    ),
    (
        "SELECT tool, SUM(is_error), SUM(cost_usd > 0) FROM requests GROUP BY tool HAVING COUNT(*) >= 1 ORDER BY tool",
        [],
    ),
    ("SELECT session_id, ts FROM requests ORDER BY ts DESC LIMIT 2", []),
    ("SELECT DISTINCT model FROM requests WHERE model <> '' ORDER BY model", []),
    (
        "SELECT session_id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY ts) FROM requests ORDER BY session_id, ts",
        [],
    ),
    (
        "SELECT substr(session_id, 2), instr(model, '2'), length(model), upper(tool),"
        " COALESCE(NULLIF(finish_reason, ''), 'none') FROM requests ORDER BY ts",
        [],
    ),
    ("SELECT CAST(ts / 10 AS INTEGER), ts / 2, input_tokens / 3, input_tokens % 3 FROM requests ORDER BY ts", []),
    (
        "SELECT session_id, MAX(ts) FROM requests WHERE ts BETWEEN ? AND ? GROUP BY session_id HAVING MAX(ts) > 0",
        [0, 102],
    ),
    ("SELECT tool, GROUP_CONCAT(model, '|'), COUNT(DISTINCT model) FROM requests GROUP BY tool ORDER BY tool", []),
    ("SELECT r.session_id, s.tool FROM requests r JOIN sessions s ON s.session_id = r.session_id ORDER BY r.ts", []),
    (
        "WITH w AS (SELECT value ->> 0 sid, value ->> 1 t FROM json_each(?)) SELECT w.sid, COUNT(r.ts)"
        " FROM w LEFT JOIN requests r ON r.session_id = w.sid AND r.ts >= w.t GROUP BY w.sid ORDER BY 1",
        ['[["s1", 102], ["s2", 0], ["s3", 0]]'],
    ),
    ("SELECT (SELECT MAX(ts) FROM requests), EXISTS (SELECT 1 FROM events WHERE kind LIKE 'otel:%')", []),
    (
        "SELECT strftime('%Y-%m-%d %H:%M', ts, 'unixepoch'), CAST(strftime('%s', ts, 'unixepoch') AS INTEGER) FROM events"
        " ORDER BY ts",
        [],
    ),
    ("SELECT typeof(cost_usd), typeof(input_tokens), ABS(-ts), ROUND(cost_usd, 1) FROM requests ORDER BY ts", []),
    ("SELECT session_id FROM requests WHERE NOT is_error AND model IN ('m1', 'm2') ORDER BY ts", []),
]


def _sqlite_with_rows():
    import sqlite3

    from aictl.storage import _SCHEMA_SQL

    db = sqlite3.connect(":memory:")
    db.executescript(_SCHEMA_SQL)
    for table, rows in ROWS.items():
        for row in rows:
            db.execute(f"INSERT INTO {table}({', '.join(row)}) VALUES({', '.join('?' * len(row))})", list(row.values()))
    return db


def _datatables(kql: str) -> str:
    """The KQL with each store table's let reading a datatable of ROWS (rows as current() returns them)."""
    from aictl.kusto.schema import quote, row_defaults
    from aictl.kusto.translate import _lit

    tables = store_schema()
    for name, rows in ROWS.items():
        table = tables[name]
        cols = [c for c in table.columns] + [None]
        header = ", ".join(f"{quote(c.name)}:{c.kusto_type}" if c else "['rowid']:long" for c in cols)
        cells = []
        for rowid, row in enumerate(rows, 1):
            full = {**row_defaults(table), **row}
            for c in cols:
                if c is None:
                    cells.append(str(rowid))
                elif c.name == table.rowid_column and full[c.name] is None:
                    cells.append(str(rowid))
                else:
                    cells.append(_lit(full[c.name], c.kusto_type).text)
        kql = re.sub(
            rf"^let {re.escape(quote(name))} = .*;$",
            lambda _m, h=header, c=cells, n=name: f"let {quote(n)} = datatable({h}) [{', '.join(c)}];",
            kql,
            flags=re.M,
        )
    return kql


def _normal(rows) -> list[tuple]:
    """Rows comparable across the stores: Kusto has no NULL text, so NULL compares as ''."""
    out = []
    for row in rows:
        values = []
        for v in row:
            if v is None:
                v = ""
            if isinstance(v, bool):
                v = int(v)
            if isinstance(v, float) and v.is_integer():
                v = int(v)
            if isinstance(v, float):
                v = round(v, 6)
            values.append(v)
        out.append(tuple(values))
    return out


@pytest.mark.parametrize(("sql", "params"), RESULT_CASES)
def test_results_match_sqlite(tr, sql, params):
    client = _client()
    if client is None:
        pytest.skip(f"no Kusto emulator at {EMULATOR}")
    expected = _normal(_sqlite_with_rows().execute(sql, params).fetchall())
    q = tr.translate(sql, params)
    got = _normal(client.execute(DATABASE, _datatables(q.kql)).primary_results[0].raw_rows)
    if "ORDER BY" not in sql.upper():
        expected, got = sorted(expected, key=repr), sorted(got, key=repr)
    assert got == expected, q.kql.rsplit(";\n", 1)[-1]


def test_update_and_delete_write_the_versions_sqlite_ends_with(tr):
    client = _client()
    if client is None:
        pytest.skip(f"no Kusto emulator at {EMULATOR}")
    db = _sqlite_with_rows()
    sql = "UPDATE requests SET input_tokens = input_tokens + 1, model = ? WHERE session_id = ? AND is_error = 0"
    m = tr.translate(sql, ["mx", "s1"])
    db.execute(sql, ["mx", "s1"])
    expected = _normal(
        db.execute("SELECT id, model, input_tokens FROM requests WHERE session_id = 's1' AND model = 'mx'")
    )
    got = client.execute(DATABASE, _datatables(m.kql) + " | project ['id'], ['model'], ['input_tokens'], ['_deleted']")
    assert _normal(got.primary_results[0].raw_rows) == [(*row, 0) for row in expected]
    sql = (
        "INSERT INTO sessions(session_id, tool, started_at) VALUES(?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET"
        " tool = CASE WHEN excluded.tool != '' THEN excluded.tool ELSE sessions.tool END,"
        " started_at = MIN(sessions.started_at, excluded.started_at)"
    )
    for params in (["s1", "", 50.0], ["s9", "codex", 7.0]):
        m = tr.translate(sql, params)
        db.execute(sql, params)
        sid = params[0]
        expected = _normal(db.execute("SELECT session_id, tool, started_at FROM sessions WHERE session_id = ?", [sid]))
        got = client.execute(DATABASE, _datatables(m.kql) + " | project ['session_id'], ['tool'], ['started_at']")
        assert _normal(got.primary_results[0].raw_rows) == expected
    m = tr.translate("DELETE FROM sessions WHERE ended_at IS NULL")
    got = client.execute(DATABASE, _datatables(m.kql) + " | project ['session_id'], ['_deleted']")
    assert _normal(got.primary_results[0].raw_rows) == [("s1", 1)]
