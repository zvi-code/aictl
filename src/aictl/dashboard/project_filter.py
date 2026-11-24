"""The project filter of the whole web interface.

The page sends the chosen projects with every request:

- one ``project`` key per exact project value (the folder a session ran in, as stored), for example
  ``?project=/src/a&project=/src/b``;
- one ``repo`` key per chosen repository, by its root folder (``?repo=/src/aictl``): the repository, its
  git worktrees and its sub-folders, as the store and this node's git folders show them (``repositories``).

A route applies them with :func:`apply_request`: it resolves each repository to its exact project values,
and returns the route's history read for those projects only (every view read through it runs on the
rows of those projects, stores/kusto/project_scope.py) and the request's query with only ``project`` keys,
so the filters a route parses from it name the same projects.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Any
from urllib.parse import parse_qs, urlencode

from ..ingesters._common import _AGENT_WORKTREE, _git_root, project_key
from ..stores import has_history
from ..stores.base import ReadResult
from ..stores.kusto.project_scope import PARAMETER
from .board_filters import BoardRequestError
from .projections.history import HistoryScope

# A project value is a folder path; the picker never offers more than this many.
MAX_PROJECTS = 200
MAX_PROJECT_LENGTH = 4096


class ProjectFilterError(BoardRequestError):
    """A project parameter the filter cannot use."""


def requested_projects(params: dict[str, list[str]], key: str = "project") -> tuple[str, ...]:
    """The exact values of a request's ``project`` keys (or ``repo`` keys), in a stable order; () means none chosen."""
    values = sorted({value.strip() for value in params.get(key, ()) if value.strip() and value.strip() != "all"})
    if len(values) > MAX_PROJECTS:
        raise ProjectFilterError(f"At most {MAX_PROJECTS} projects can be chosen at once")
    if any(len(value) > MAX_PROJECT_LENGTH or any(ord(char) < 32 for char in value) for value in values):
        raise ProjectFilterError(f"Invalid {key}")
    return tuple(values)


def requested_repos(params: dict[str, list[str]]) -> tuple[str, ...]:
    """The root folders of a request's ``repo`` keys."""
    return requested_projects(params, "repo")


def project_keys(values: tuple[str, ...]) -> dict[str, list[str]]:
    """The reader parameter: the exact stored values a view keeps (stores/kusto/project_scope.py)."""
    return {PARAMETER: list(values)}


def _folds(path: str) -> bool:
    """Whether other spellings of *path* count as the same project: a Windows path folds case and separators."""
    return project_key(path) != path.rstrip("/")


def spellings(base: Any, projects: tuple[str, ...]) -> tuple[str, ...]:
    """Every stored spelling of *projects*: each value, with and without a trailing separator, and for a
    Windows path every value the store holds under the same ``project_key`` (one read of the project list)."""
    values = {v for p in projects for v in (p, p.rstrip("/\\"), p.rstrip("/\\") + "/") if v}
    if any(_folds(p) for p in projects):
        keys = {project_key(p) for p in projects}
        stored = base.read("projects.catalog", {"limit": CATALOG_LIMIT}).rows
        values |= {r["project_path"] for r in stored if r["row_type"] == "project" and project_key(r["project_path"]) in keys}
    return tuple(sorted(values))


@dataclass(frozen=True)
class ProjectReader:
    """A history reader that reads every view for the chosen projects only.

    Equal for the same reader and projects, so the caches keyed by reader keep one entry per choice.
    *values* are the stored spellings of *projects* that the views keep.
    """

    base: Any
    projects: tuple[str, ...]
    values: tuple[str, ...]

    def read(self, view: str, params) -> ReadResult:
        return self.base.read(view, {**params, **project_keys(self.values)})

    def __getattr__(self, name: str) -> Any:
        if name.startswith("__") or name in ("base", "projects", "values"):
            raise AttributeError(name)
        return getattr(self.base, name)


def unrestricted(reader: Any) -> Any:
    return reader.base if isinstance(reader, ProjectReader) else reader


def restrict(reader: Any, projects: tuple[str, ...]) -> Any:
    """*reader* for *projects* only. No projects leaves *reader* as it is."""
    base = unrestricted(reader)
    if not projects or not has_history(base):
        return reader
    projects = tuple(projects)
    if isinstance(reader, ProjectReader) and reader.projects == projects:
        return reader
    return ProjectReader(base, projects, spellings(base, projects))


def scoped(history: HistoryScope, projects: tuple[str, ...]) -> HistoryScope:
    """The server helper a route calls: *history* read for *projects* only. No projects leaves it as it is."""
    return replace(history, reader=restrict(history.reader, projects)) if projects else history


# The picker lists at most this many projects, the most recently active first.
CATALOG_LIMIT = 5000


def project_name(path: str) -> str:
    """The short name the picker shows: the last folder of the path."""
    return re.split(r"[/\\]", path.rstrip("/\\"))[-1] or path


def catalog(history: HistoryScope) -> dict:
    """``GET /api/board/projects``: every project the store holds sessions for in *history*'s scope, in any period.

    Read without the project filter, so the picker offers every project while some are chosen.
    """
    from .projections.history import node_scope

    result = unrestricted(history.reader).read("projects.catalog", {**node_scope(history.node), "limit": CATALOG_LIMIT})
    projects = [{
        "project": row["project_path"], "name": project_name(row["project_path"]), "sessions": int(row["sessions"] or 0),
        "last_ts": row["last_ts"], "nodes": int(row["nodes"] or 0),
    } for row in result.rows if row["row_type"] == "project"]
    evidence = [row for row in result.rows if row["row_type"] == "root"]
    # This node's own git folders are evidence only for this node's paths.
    return {"projects": projects, "repos": repositories(projects, evidence, local=not history.qualified),
            "truncated": bool(result.truncated)}


# Why a project belongs to a repository, in the words the picker shows.
EVIDENCE = {
    "root": "the repository's own folder",
    "commit": "a commit made there names this repository (git)",
    "worktree": "an agent worked in it as a worktree of this repository",
    "worktree folder": "a worktree folder of this repository (.claude/worktrees or .worktrees)",
    "git": "its .git names this repository (this node)",
    "inside": "a folder inside this repository",
}


def repositories(projects: list[dict], evidence: list[dict], *, local: bool) -> list[dict]:
    """The repositories that hold two or more of *projects*, each with its member projects and why each belongs.

    A project belongs to a repository by what the store holds first: the root a commit made in one of its
    sessions was filed under (git's own answer at the time), or the repository whose session had an agent
    work in it as a worktree. Then by the worktree folders Claude Code and others create
    (``<repo>/.claude/worktrees/<name>``), and, on this node only, by the folder's ``.git``. A project with no
    such evidence belongs to a known repository when it is a folder inside it. Nothing is grouped by a
    common name or prefix alone.
    """
    paths = [p["project"] for p in projects]
    parent: dict[str, tuple[str, str]] = {}
    for row in sorted(evidence, key=lambda r: (r["evidence"] != "commit", -(r["sessions"] or 0), r["root"])):
        if row["project_path"] in paths:
            parent.setdefault(row["project_path"], (row["root"], row["evidence"]))
    roots_on_disk: set[str] = set()
    for path in paths:
        if path in parent:
            continue
        stripped = _AGENT_WORKTREE.sub("", path)
        if stripped and stripped != path:
            parent[path] = (stripped, "worktree folder")
        elif local:
            root = _git_root(path)
            if root and project_key(root) != project_key(path):
                parent[path] = (root, "git")
            elif root:
                roots_on_disk.add(path)
    known = {project_key(root): root for root, _ in parent.values()} | {project_key(r): r for r in roots_on_disk}
    for path in paths:
        if path in parent:
            continue
        key = project_key(path)
        inside = [root for root_key, root in known.items() if key.startswith(root_key + "/") and root_key != key]
        if inside:
            parent[path] = (max(inside, key=len), "inside")

    def root_of(path: str) -> str:
        seen = {path}
        while path in parent and parent[path][0] not in seen:
            path = parent[path][0]
            seen.add(path)
        return path

    by_root: dict[str, list[str]] = {}
    for path in paths:
        by_root.setdefault(project_key(root_of(path)), []).append(path)
    facts = {p["project"]: p for p in projects}
    groups = []
    for members in by_root.values():
        if len(members) < 2:
            continue
        root = root_of(members[0])
        rows = [facts[m] for m in members]
        groups.append({
            "root": root, "name": project_name(root),
            "members": sorted(({"project": m, "name": facts[m]["name"], "sessions": facts[m]["sessions"],
                                "last_ts": facts[m]["last_ts"],
                                "evidence": EVIDENCE["root" if m == root else parent[m][1]]} for m in members),
                              key=lambda m: (m["project"] != root, -(m["last_ts"] or 0), m["project"])),
            "sessions": sum(r["sessions"] for r in rows),
            "last_ts": max((r["last_ts"] for r in rows if r["last_ts"] is not None), default=None),
        })
    groups.sort(key=lambda g: (-(g["last_ts"] or 0), g["root"]))
    return groups


def resolve(history: HistoryScope, projects: tuple[str, ...], repos: tuple[str, ...]) -> tuple[str, ...]:
    """*projects* and the members of each of *repos*, as exact project values. A chosen repository the store
    holds no group for (one folder, or none yet) stands for its own folder."""
    if not repos:
        return projects
    groups = {project_key(g["root"]): g for g in catalog(history)["repos"]}
    chosen = set(projects)
    for repo in repos:
        group = groups.get(project_key(repo))
        chosen |= {m["project"] for m in group["members"]} if group else {repo}
    return tuple(sorted(chosen))


def apply_request(history: HistoryScope, query: str) -> tuple[HistoryScope, str]:
    """The server helper a route calls with its request's query string.

    Returns *history* read for the chosen projects only, and *query* with each chosen repository replaced
    by its member projects (``project`` keys only), for the route to parse its other filters from.
    *history* names the node scope of the request: a repository is resolved from that scope's projects.
    """
    params = parse_qs(query, keep_blank_values=True)
    projects = resolve(history, requested_projects(params), requested_repos(params))
    if "repo" in params:
        kept = [(key, value) for key, values in params.items() if key not in ("project", "repo") for value in values]
        query = urlencode([*kept, *(("project", p) for p in projects)])
    return scoped(history, projects), query
