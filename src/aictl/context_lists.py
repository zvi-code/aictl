"""Store each distinct list of context items once, and a pointer to it per agent.

Every subagent of a session is told about nearly the same tools, skills, MCP instruction
blocks and custom agents. ``session_context_items`` would hold one row per agent per item;
instead, the items of one announcement of a list kind go to ``context_lists`` once (keyed
by ``list_id``, a hash of their content) and ``session_context_items`` gets one pointer
row per (session, agent, kind, announcement): ``name`` is ``"list:" + list_id``.

An announcement is the items of one kind that one write holds for one agent with the same
``ts`` (and project and tool): one attachment line or one system prompt. Grouping by ``ts``
keeps the time of every item exact, which the context breakdown needs (it drops items
older than a reset and items newer than the call it describes).

Readers expand pointers back into items with ``EXPANSION_KQL`` (each view that reads
``session_context_items`` carries it; ``test/test_context_lists.py`` checks this).
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Iterable

LIST_KINDS = frozenset({"tools_listed", "skills", "custom_agents", "mcp_instructions"})
POINTER_PREFIX = "list:"
LIST_ID_HEX = 32
# A pointer row's name; an item of an older row cannot look like one by chance.
POINTER_NAME = re.compile(rf"^{POINTER_PREFIX}[0-9a-f]{{{LIST_ID_HEX}}}$")
_ITEM_FIELDS = ("name", "path", "chars", "tokens", "estimated", "removed")
_INT_FIELDS = ("chars", "tokens", "estimated", "removed")


def _item(row: dict) -> tuple:
    return (str(row.get("name") or ""), str(row.get("path") or ""),
            *(int(row.get(name) or 0) for name in _INT_FIELDS))


def list_id(kind: str, items: Iterable[dict]) -> str:
    """The id of a list: a hash of its kind and its items' (name, path, chars, tokens, estimated, removed).

    The order of the items, their time, session and agent do not count, so two agents told
    the same list get the same id.
    """
    content = json.dumps([kind, sorted(_item(row) for row in items)], ensure_ascii=True, separators=(",", ":"))
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:LIST_ID_HEX]


def is_pointer(name: str) -> bool:
    return bool(POINTER_NAME.match(name or ""))


def group(values: list[dict]) -> tuple[list[dict], dict[str, list[dict]]]:
    """(rows for ``session_context_items``, {list_id: rows for ``context_lists``}) for *values*.

    *values* are ``session_context_items`` rows in write order. A row of a list kind joins
    the announcement of its (project, session, agent, kind, ts, tool); for the same name in
    one announcement the later row counts, as a later version would. Each announcement
    becomes one pointer row: its ``ts``, the sums of ``chars`` and ``tokens`` of the items
    not removed, ``estimated`` 1 if any item is estimated, ``removed`` 0 and ``path`` "".
    Other rows are returned unchanged, in their place.
    """
    out: list[dict | tuple] = []
    batches: dict[tuple, dict[str, dict]] = {}
    for row in values:
        if row.get("kind") not in LIST_KINDS or not row.get("name"):
            out.append(row)
            continue
        key = tuple(row.get(name) for name in ("project", "session_id", "agent_id", "kind", "ts", "tool"))
        if key not in batches:
            batches[key] = {}
            out.append(key)
        batches[key][row["name"]] = row
    lists: dict[str, list[dict]] = {}
    rows: list[dict] = []
    for entry in out:
        if isinstance(entry, dict):
            rows.append(entry)
            continue
        project, session_id, agent_id, kind, ts, tool = entry
        items = list(batches[entry].values())
        lid = list_id(kind, items)
        lists.setdefault(lid, [
            dict(project="", list_id=lid, kind=kind, tool=tool or "",
                 **dict(zip(_ITEM_FIELDS, _item(item), strict=True)))
            for item in items
        ])
        kept = [item for item in items if not int(item.get("removed") or 0)]
        rows.append(dict(
            session_id=session_id, agent_id=agent_id, kind=kind, name=POINTER_PREFIX + lid, ts=ts, path="",
            chars=sum(int(item.get("chars") or 0) for item in kept),
            tokens=sum(int(item.get("tokens") or 0) for item in kept),
            estimated=int(any(int(item.get("estimated") or 0) for item in items)),
            removed=0, tool=tool, project=project))
    return rows, lists


# The expansion every view applies to the ``session_context_items`` rows it selected
# (``| invoke context_items_expanded()``): plain item rows as they are, and each pointer
# row (its current version) replaced by the items of its list, which take the pointer's
# session, agent, kind, project, tool, ts and _v. Reduce versions by the item key after it.
EXPANSION_KQL = """let context_items_expanded = (items:(['project']:string,node_id:string,session_id:string,agent_id:string,['kind']:string,
        name:string,path:string,chars:long,tokens:long,estimated:long,removed:long,_v:datetime)) {
    let pointers = items | where name matches regex @'^list:[0-9a-f]{32}$'
        | summarize arg_max(_v, *) by ['project'],node_id,session_id,agent_id,kind,name
        | extend list_key=substring(name,5);
    union
        (items | where not(name matches regex @'^list:[0-9a-f]{32}$')),
        (pointers
            | join kind=inner (context_lists | where list_id in ((pointers | distinct list_key))
                | summarize arg_max(_v, *) by ['project'],node_id,list_id,name
                | project list_node=node_id,list_ref=list_id,item_name=name,item_path=path,item_chars=chars,
                    item_tokens=tokens,item_estimated=estimated,item_removed=removed)
                on $left.node_id == $right.list_node, $left.list_key == $right.list_ref
            | extend name=item_name,path=item_path,chars=item_chars,tokens=item_tokens,estimated=item_estimated,
                removed=item_removed
            | project-away list_node,list_key,list_ref,item_*)
};
"""
