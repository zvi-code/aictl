"""The project filter of the whole web interface.

The page sends the chosen projects with every request: one ``project`` key per exact project value
(the folder a session ran in, as stored), for example ``?project=/src/a&project=/src/b``. A route
applies them with :func:`scoped`, which returns its history read for those projects only: every
view read through it runs on the rows of those projects (stores/kusto/project_scope.py).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Any

from ..ingesters._common import project_key
from ..stores import has_history
from ..stores.base import ReadResult
from ..stores.kusto.project_scope import PARAMETER
from .projections.history import HistoryScope

# A project value is a folder path; the picker never offers more than this many.
MAX_PROJECTS = 200
MAX_PROJECT_LENGTH = 4096


class ProjectFilterError(ValueError):
    """A project parameter the filter cannot use."""


def requested_projects(params: dict[str, list[str]]) -> tuple[str, ...]:
    """The exact project values of a request's ``project`` keys, in a stable order; () means every project."""
    values = sorted({value.strip() for value in params.get("project", ()) if value.strip() and value.strip() != "all"})
    if len(values) > MAX_PROJECTS:
        raise ProjectFilterError(f"At most {MAX_PROJECTS} projects can be chosen at once")
    if any(len(value) > MAX_PROJECT_LENGTH or any(ord(char) < 32 for char in value) for value in values):
        raise ProjectFilterError("Invalid project")
    return tuple(values)


def project_keys(projects: tuple[str, ...]) -> dict[str, list[str]]:
    """The reader parameter for *projects*: a view compares each row's project by its key, so every
    spelling of a chosen folder counts (``project_key``)."""
    return {PARAMETER: sorted({project_key(p) for p in projects})}


@dataclass(frozen=True)
class ProjectReader:
    """A history reader that reads every view for the chosen projects only.

    Equal for the same reader and projects, so the caches keyed by reader keep one entry per choice.
    """

    base: Any
    projects: tuple[str, ...]

    def read(self, view: str, params) -> ReadResult:
        return self.base.read(view, {**params, **project_keys(self.projects)})

    def __getattr__(self, name: str) -> Any:
        if name.startswith("__") or name in ("base", "projects"):
            raise AttributeError(name)
        return getattr(self.base, name)


def unrestricted(reader: Any) -> Any:
    return reader.base if isinstance(reader, ProjectReader) else reader


def restrict(reader: Any, projects: tuple[str, ...]) -> Any:
    """*reader* for *projects* only. No projects leaves *reader* as it is."""
    base = unrestricted(reader)
    if not projects or not has_history(base):
        return reader
    return ProjectReader(base, tuple(projects))


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
    } for row in result.rows]
    return {"projects": projects, "truncated": bool(result.truncated)}
