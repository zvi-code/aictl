"""Restrict any view to the sessions of chosen coding tools and models, without changing the view's own text.

The page's coding tool and model filters choose sessions: the sessions of the chosen tools, and the sessions
that made a request with a chosen model in the view's period. A view read for them runs inside the same
function as the project restriction (project_scope.py), whose first statements shadow each table that has a
``session_id`` with only the rows of the chosen sessions.

The chosen sessions reach the view in one of two ways:

- ``scope_sessions``: their ids, read first by a query of their own (the views ``insights.tool_sessions`` and
  ``insights.model_sessions``) and passed in. This is how the dashboard reads a narrowed card.
- ``scope_tools`` and ``scope_models``: the view computes the ids itself. One query, the same rows; it is the
  text shown under "Show KQL" and the fallback when the ids are too many to pass. Measured on 30 days of a fleet
  it costs up to twice the cluster CPU of the first way on the larger views, so it is not the usual way.

Tombstones: a filter before the reduction of versions must keep a tombstone with its row
(docs/storage-schema.md). Where a table's tombstone carries ``session_id`` (it is in the key or in the
tombstone scope) the filter keeps it. Where it does not, every tombstone is kept beside the chosen rows: one
of another session finds no row to delete and is dropped where the view drops deleted rows.

Sessions are matched by ``session_id`` alone, so the filter reaches the stored rows through the column's
index. Two nodes that hold a session under the same id hold the same session (a copied tool folder).

Tables with no ``session_id`` (tool and file registries, context lists, node state) are not restricted: a
view reaches them through its session rows.
"""

from __future__ import annotations

from .current import CURRENT_TABLES, logical
from .tables import TABLES

TOOLS_PARAMETER = "scope_tools"
MODELS_PARAMETER = "scope_models"
SESSIONS_PARAMETER = "scope_sessions"
PARAMETERS = (TOOLS_PARAMETER, MODELS_PARAMETER, SESSIONS_PARAMETER)

_IDS = "aictl_scope_ids"
# The most session ids one read is narrowed to (the limit of make_set). A store holds far fewer sessions per filter.
_MAX_SESSIONS = 1_000_000


def _columns(table: str) -> set[str]:
    return {name for name, _kind in TABLES[table].columns}


def _marker(table: str) -> str | None:
    """The tombstone column to keep beside the chosen rows, when the table's tombstones do not carry the session."""
    spec = TABLES[table]
    carried = "session_id" in spec.key or "session_id" in spec.tombstone_scope
    return None if carried or spec.tombstone is None else spec.tombstone


# Every table whose rows belong to a session, and the tombstone column kept with its filter (None: none needed).
SESSION_SCOPED: dict[str, str | None] = {table: _marker(table) for table in TABLES if "session_id" in _columns(table)}
# Their current views (current.py) hold the same columns.
SESSION_SCOPED |= {logical(table): SESSION_SCOPED[table] for table in CURRENT_TABLES if table in SESSION_SCOPED}

# The same rule as `canon` in the Insights views: how a model is spelled when it is compared with a chosen one.
_CANON = "iff(tolower(trim(' ', model)) startswith 'claude-', replace_string(tolower(trim(' ', model)), '.', '-'), model)"


def chosen_sessions(*, tools: bool, models: bool, projects: str = "") -> list[str]:
    """The statements that name the chosen sessions' ids. They read ``sessions`` and ``requests_current`` as stored,
    so they come before the statements that shadow those tables. *projects*: the project filter to read them through.
    """
    lets = []
    if tools:
        lets.append(
            f"let aictl_scope_tool_sessions = sessions{projects}"
            " | extend _gone=column_ifexists('_deleted', false)"
            " | summarize arg_max(_v, _gone, tool) by ['project'], node_id, session_id"
            f" | where not(coalesce(_gone, false)) and tool in ({TOOLS_PARAMETER})"
            " | distinct node_id, session_id;")
    if models:
        # The current row of each request of the period, read as the views read it (current.py): the hours one
        # either side of the range, then only the keys with two rows reduced again.
        lets += [
            f"let aictl_scope_requests = requests_current{projects}"
            " | where event_hour >= bin(unixtime_seconds_todatetime(min_of(max_of(since, 0.0), 32503680000.0)), 1h) - 1h"
            " | where event_hour <= unixtime_seconds_todatetime(min_of(until, 32503680000.0)) + 1h"
            " | project ['project'], node_id, dedup_key, _v, _deleted, session_id, ts, model;",
            "let aictl_scope_crossed = aictl_scope_requests | summarize copies=count() by dedup_key | where copies > 1"
            " | project dedup_key;",
            "let aictl_scope_model_sessions = union (aictl_scope_requests | where dedup_key !in (aictl_scope_crossed)),"
            " (aictl_scope_requests | where dedup_key in (aictl_scope_crossed)"
            " | summarize arg_max(_v, *) by ['project'], node_id, dedup_key)"
            " | where not(coalesce(_deleted, false))"
            " | extend aictl_ts = (ts - datetime(1970-01-01)) / 1s"
            f" | where aictl_ts >= since and aictl_ts < until and {_CANON} in ({MODELS_PARAMETER})"
            " | distinct node_id, session_id;",
        ]
    if tools and models:
        chosen = "aictl_scope_tool_sessions | join kind=inner aictl_scope_model_sessions on node_id, session_id"
    else:
        chosen = "aictl_scope_tool_sessions" if tools else "aictl_scope_model_sessions"
    # One value, computed once and compared as a constant list: a table of ids read by `in` at every reference of
    # every table cost two to three times the cluster CPU on the larger views (measured, 30 days of a fleet).
    lets.append(f"let {_IDS} = toscalar({chosen} | summarize make_set(session_id, {_MAX_SESSIONS}));")
    return lets


def filter_of(table: str, ids: str = _IDS) -> str:
    """The filter that keeps the chosen sessions' rows of *table* (and the tombstones its rows need).
    *ids*: the name that holds the chosen ids (the computed value, or the ``scope_sessions`` parameter)."""
    marker = SESSION_SCOPED[table]
    keep = f"session_id in ({ids})"
    return f" | where {keep} or coalesce({marker}, false)" if marker else f" | where {keep}"
