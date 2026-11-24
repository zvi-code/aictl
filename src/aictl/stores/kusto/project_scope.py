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
"""

from __future__ import annotations

import re

from .current import current_names

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
    "file_write_events", "session_steps", "session_step_text", "text_payloads", "copilot_session_messages",
    "vscode_chat_messages", "cursor_session_messages", "events", "events_text", "hook_calls", "hook_calls_text",
    "memory_snapshots", "memory_snapshots_text",
)
# The current views of those tables (current.py) are filed the same way. `project` is a group-by key
# of their materialized views, so the filter reaches the stored rows.
CURRENT_VIEWS = tuple(sorted(current_names()))
# Tables restricted by their session's project; `session_id` is part of their key.
SESSION_TABLES = ("session_commits", "session_processes", "session_sources")

_DECLARE = re.compile(r"(?P<head>(?:\s*//[^\n]*\n)*)\s*declare\s+query_parameters\s*\((?P<names>.*?)\)\s*;", re.S)
_TEXT = re.compile(r"""@?"(?:\\.|[^"\\])*"|@?'(?:\\.|[^'\\])*'|//[^\n]*""")
_SESSIONS = "aictl_project_sessions"


def restricted_query(text: str) -> str:
    """*text*, a view, run on only the rows of the projects named by the ``restrict_projects`` parameter."""
    match = _DECLARE.match(text)
    if match is None:
        raise ValueError("A view restricted to projects must start with its parameter declaration")
    names = match["names"].strip()
    # Comments before the declaration move after it: the declaration starts the query.
    declaration = f"declare query_parameters({names}{', ' if names else ''}{PARAMETER}:dynamic);{match['head'].rstrip()}"
    body = text[match.end():].strip().rstrip(";")
    code = _TEXT.sub(" ", body)
    used = {table for table in (*PROJECT_TABLES, *CURRENT_VIEWS, *SESSION_TABLES) if re.search(rf"\b{table}\b", code)}
    lets = []
    if used & set(SESSION_TABLES):
        # Read before `sessions` is shadowed below; the same rows either way.
        lets.append(
            f"let {_SESSIONS} = sessions | where ['project'] in ({PARAMETER})"
            " | extend _gone=column_ifexists('_deleted', false)"
            " | summarize arg_max(_v, _gone) by ['project'], node_id, session_id"
            " | where not(coalesce(_gone, false)) | distinct node_id, session_id;")
    for table in (*PROJECT_TABLES, *CURRENT_VIEWS):
        if table in used:
            lets.append(f"let {table} = {table} | where ['project'] in ({PARAMETER});")
    for table in SESSION_TABLES:
        if table in used:
            lets.append(f"let {table} = {table} | join kind=leftsemi {_SESSIONS} on node_id, session_id;")
    inner = "\n".join(lets)
    return f"{declaration}\nlet aictl_project_view = () {{\n{inner}\n{body}\n}};\naictl_project_view()"
