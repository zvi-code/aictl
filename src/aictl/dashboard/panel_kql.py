"""The KQL a board panel ran, with its parameters written in, so a user can copy or open it."""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping
from typing import Any
from urllib.parse import quote, urlsplit

from ..stores import reader_feature

_DECLARE = re.compile(r"\Adeclare query_parameters\((?P<body>.*?)\);\s*", re.S)
_PARAMETER = re.compile(r"\s*(?P<name>\w+)\s*:\s*(?P<type>\w+)(?:\s*=\s*(?P<default>.+))?\s*", re.S)


def _split(body: str) -> list[str]:
    """The declarations of a parameter list, split at commas outside brackets and quotes."""
    parts, depth, quote_char, start = [], 0, "", 0
    for i, ch in enumerate(body):
        if quote_char:
            if ch == quote_char:
                quote_char = ""
        elif ch in "'\"":
            quote_char = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append(body[start:i])
            start = i + 1
    parts.append(body[start:])
    return [part for part in parts if part.strip()]


def _literal(kind: str, value: Any) -> str:
    if kind == "bool":
        if type(value) is not bool:
            raise ValueError("a bool parameter needs True or False")
        return "true" if value else "false"
    if kind == "real":
        if type(value) not in (int, float) or not math.isfinite(value):
            raise ValueError("a real parameter needs a finite number")
        return f"real({float(value)!r})"
    if kind == "long":
        if type(value) is not int:
            raise ValueError("a long parameter needs an integer")
        return f"long({value})"
    if kind == "string":
        if not isinstance(value, str) or any(ord(ch) < 32 for ch in value):
            raise ValueError("a string parameter needs text without control characters")
        return json.dumps(value, ensure_ascii=False)
    if kind == "dynamic":
        return f"dynamic({json.dumps(value, ensure_ascii=False)})"
    raise ValueError(f"unsupported parameter type {kind}")


def filled_query(view: str, params: Mapping[str, Any]) -> str:
    """The text of *view* with ``let`` statements in place of its parameter declaration.

    *params* are the values the panel passed to the reader, ``limit`` included: the
    reader asks for one row more than ``limit`` to see whether the result was cut.
    """
    from ..stores.kusto.project_scope import PARAMETER, restricted_query
    from ..stores.kusto.reader import _query

    # A read for chosen projects ran the view inside their restriction (project_scope.py).
    text = restricted_query(_query(view)) if PARAMETER in params else _query(view)
    match = _DECLARE.match(text)
    if match is None:
        raise ValueError(f"{view} declares no query parameters")
    values = {key: value for key, value in params.items() if key != "limit"}
    values["row_limit"] = int(params.get("limit", 100)) + 1
    lines = [f"// aictl view {view}, with the values the dashboard used."]
    for part in _split(match.group("body")):
        found = _PARAMETER.fullmatch(part)
        if found is None:
            raise ValueError(f"{view}: cannot read the parameter declaration {part.strip()!r}")
        name, kind, default = found["name"], found["type"], found["default"]
        if name in values:
            lines.append(f"let {name} = {_literal(kind, values[name])};")
        elif default is not None:
            lines.append(f"let {name} = {default.strip()};")
        else:
            raise ValueError(f"{view}: no value for the parameter {name}")
    return "\n".join(lines) + "\n" + text[match.end():]


def kusto_base_url(settings: Any) -> str | None:
    """The web explorer address of the configured database, or None when it is not an HTTPS cluster."""
    if not settings:
        return None
    cluster = urlsplit(getattr(settings, "cluster", "") or "")
    if cluster.scheme != "https" or not cluster.hostname or cluster.username or cluster.password:
        return None
    return f"https://{cluster.netloc}/{quote(settings.database, safe='')}"


def query_block(history: Any, view: str, params: Mapping[str, Any]) -> dict:
    """What a panel shows under "Show query": the filled KQL and where to open it."""
    from .project_filter import ProjectReader, project_keys

    settings = reader_feature(history.reader, "connection_info")
    if isinstance(history.reader, ProjectReader):
        params = {**params, **project_keys(history.reader.projects)}
    return {"view": view, "kql": filled_query(view, params), "kusto_url": kusto_base_url(settings)}
