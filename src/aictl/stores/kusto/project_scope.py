"""Restrict any view to the rows of chosen projects, without changing the view's own text.

Every table of a session's activity files its rows under the session's working folder: the key
column ``project`` holds the row's ``project_path``. A view read for a set of projects runs inside
a function whose first statements shadow each table it reads with only the rows of those projects.
A filter on a key column may come before the reduction of versions (docs/storage-schema.md): a
tombstone carries its key, so it stays with its row.

Three tables file rows under another value, and are restricted by the session instead:
``session_commits`` (the root of the session's repository), ``session_processes`` (the folder
the source reported, or "") and ``session_sources`` (always ""; a session file the import has not
read yet belongs to no known project). Their rows count when their session's row in ``sessions`` is
filed under a chosen project and is not deleted.

Tables with no project (OTel, registry, configuration files, host samples, context lists) are
not restricted: their rows belong to no project. ``memory_snapshots`` is filed under a repository
root; a chosen project that is a repository root keeps its memory rows.

The same function also restricts a view to the sessions of chosen coding tools and models
(session_scope.py): one statement per table holds its project filter, then its session filter.
"""

from __future__ import annotations

import re

from .current import current_names
from .session_scope import (
    MODELS_PARAMETER,
    SESSION_SCOPED,
    SESSIONS_PARAMETER,
    TOOLS_PARAMETER,
    chosen_sessions,
    filter_of,
)

PARAMETER = "restrict_projects"
# The parameter holds the exact stored values to keep: an exact match on the key column lets the
# cluster use its index (a function over every row's key made a large view read run past its timeout).
# The caller lists every stored spelling of a chosen project (dashboard/project_filter.py).

# Tables whose `project` key column is the row's project_path, or the repository root for memory.
PROJECT_TABLES = (
    "sessions", "session_usage", "agents", "agents_text", "session_turns", "session_outcomes", "session_digests",
    "session_prompts", "session_thinking", "session_files", "session_loaded_files", "session_context_items",
    "session_folders", "session_artifacts", "requests", "turn_request_links", "tool_invocations",
    "tool_invocations_text", "skill_uses", "context_events",
    "file_write_events", "session_steps", "text_payloads", "copilot_session_messages",
    "vscode_chat_messages", "cursor_session_messages", "events", "hook_calls",
    "memory_snapshots",
)
# The current views of those tables (current.py) are filed the same way. `project` is a group-by key
# of their materialized views, so the filter reaches the stored rows.
CURRENT_VIEWS = tuple(sorted(current_names()))
# Tables restricted by their session's project; `session_id` is part of their key.
SESSION_TABLES = ("session_commits", "session_processes", "session_sources")

_DECLARE = re.compile(r"(?P<head>(?:\s*//[^\n]*\n)*)\s*declare\s+query_parameters\s*\((?P<names>.*?)\)\s*;", re.S)
_TEXT = re.compile(r"""@?"(?:\\.|[^"\\])*"|@?'(?:\\.|[^'\\])*'|//[^\n]*""")
_SESSIONS = "aictl_project_sessions"


def restricted_query(text: str, *, projects: bool = True, tools: bool = False, models: bool = False,
                     sessions: bool = False) -> str:
    """*text*, a view, run on only the rows it is restricted to.

    *projects*: the projects named by the ``restrict_projects`` parameter. *sessions*: the sessions whose ids
    ``scope_sessions`` holds. *tools*, *models*: the sessions of the coding tools and of the models named by
    ``scope_tools`` and ``scope_models``, computed in the query itself (session_scope.py).
    """
    match = _DECLARE.match(text)
    if match is None:
        raise ValueError("A view restricted to projects must start with its parameter declaration")
    names = match["names"].strip()
    if models and not all(re.search(rf"\b{name}\s*:\s*real\b", names) for name in ("since", "until")):
        raise ValueError("A view restricted to the sessions of a model must declare its period (since, until)")
    if sessions and (tools or models):
        raise ValueError("A view takes the chosen sessions by their ids or computes them, not both")
    scoped = ((PARAMETER, projects), (TOOLS_PARAMETER, tools), (MODELS_PARAMETER, models), (SESSIONS_PARAMETER, sessions))
    added = [name for name, on in scoped if on]
    # Comments before the declaration move after it: the declaration starts the query.
    declaration = (f"declare query_parameters({names}{', ' if names and added else ''}"
                   f"{', '.join(f'{name}:dynamic' for name in added)});{match['head'].rstrip()}")
    body = text[match.end():].strip().rstrip(";")
    code = _TEXT.sub(" ", body)
    by_session = tools or models or sessions
    named = (*PROJECT_TABLES, *CURRENT_VIEWS, *SESSION_TABLES, *(sorted(SESSION_SCOPED) if by_session else ()))
    used = {table for table in named if re.search(rf"\b{table}\b", code)}
    in_projects = f" | where ['project'] in ({PARAMETER})" if projects else ""
    lets = []
    if projects and used & set(SESSION_TABLES):
        # Read before `sessions` is shadowed below; the same rows either way.
        lets.append(
            f"let {_SESSIONS} = sessions{in_projects}"
            " | extend _gone=column_ifexists('_deleted', false)"
            " | summarize arg_max(_v, _gone) by ['project'], node_id, session_id"
            " | where not(coalesce(_gone, false)) | distinct node_id, session_id;")
    if tools or models:
        lets += chosen_sessions(tools=tools, models=models, projects=in_projects)
    # One statement per table: its project filter, then its session filter.
    for table in dict.fromkeys(named):
        if table not in used:
            continue
        steps = ""
        if projects and table in (*PROJECT_TABLES, *CURRENT_VIEWS):
            steps += in_projects
        elif projects and table in SESSION_TABLES:
            steps += f" | join kind=leftsemi {_SESSIONS} on node_id, session_id"
        if by_session and table in SESSION_SCOPED:
            steps += filter_of(table, SESSIONS_PARAMETER) if sessions else filter_of(table)
        if steps:
            lets.append(f"let {table} = {table}{steps};")
    inner = "\n".join(lets)
    return f"{declaration}\nlet aictl_project_view = () {{\n{inner}\n{body}\n}};\naictl_project_view()"
