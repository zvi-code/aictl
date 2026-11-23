# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""What a tool call acted on, as a short identifier that is never prose.

These values are kept a year (``tool_invocations``), so they hold names, paths and hosts
only. The command line with its arguments, the search text and the prompt stay in the
14-day text table.

``split_mcp`` is the one place that tells an MCP server and its tool apart, for every
reader and for the board.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import unquote, urlsplit

FILE, COMMAND, URL, SKILL, AGENT, QUERY, OTHER = "file", "command", "url", "skill", "agent", "query", "other"
TARGET_MAX = 1024
TEXT_TARGET_MAX = 500  # a command line, URL or search text kept a year (INPUT_VALUE_MAX_CHARS)
ARG_NAMES_MAX = 300

# ``mcp__<server>__<tool>`` (Claude Code, and the form the Copilot reader writes) and
# ``<server>/<tool>``. ``mcp_<a>_<b>`` is an MCP tool too, but its server cannot be told.
_SERVER_TOOL = re.compile(r"^mcp(__|_|\.|:)|^[\w.-]+/[\w.-]+$")
_SLASH_FORM = re.compile(r"^([\w.-]+)/([\w.-]+)$")
# Claude Code spells a server name in a tool name with this rule ("Claude Browser" -> "Claude_Browser").
_NAME_UNSAFE = re.compile(r"[^A-Za-z0-9_-]")


def is_mcp_name(name: str | None) -> bool:
    return bool(name and _SERVER_TOOL.search(name))


def split_mcp(name: str | None, *, server: str = "", tool: str = "", hint: str = "") -> tuple[str, str]:
    """(server, tool) of an MCP tool call; ("", "") when the call is not one or the name does not say.

    *server* and *tool* are the source's own fields (Copilot's ``mcpServerName`` and
    ``mcpToolName``) and win. *hint* is a server name the source reports beside the call
    (Claude Code's ``attributionMcpServer``): it only decides where the server ends when the
    server part of the name holds ``__`` itself. The server keeps the spelling of the name, so
    one server has one spelling in every row.
    """
    name = name or ""
    if server:
        prefix = f"mcp__{server}__"
        return server, tool or (name[len(prefix) :] if name.startswith(prefix) else name)
    if name.startswith("mcp__"):
        rest = name[5:]
        if hint:
            spelled = _NAME_UNSAFE.sub("_", hint)
            if rest.startswith(spelled + "__") and len(rest) > len(spelled) + 2:
                return spelled, rest[len(spelled) + 2 :]
        head, sep, tail = rest.partition("__")
        return (head, tail) if sep and head and tail else ("", "")
    match = _SLASH_FORM.match(name)
    if match:
        return match.group(1), match.group(2)
    return "", ""


_PREFIX_WORDS = frozenset({"sudo", "env", "time", "nohup", "command", "exec", "nice"})


def program_name(command: str) -> str:
    """The program a command line runs: its first word without folder, quotes or arguments.

    Leading variable settings (``FOO=1 make``), ``sudo``/``env``/``time`` and ``cd dir &&`` are skipped.
    """
    for part in re.split(r"&&|\|\||;", command):
        words = part.strip().split()
        while words and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[0]) or words[0] in _PREFIX_WORDS):
            words.pop(0)
        if not words or (words[0] == "cd" and part is not command):
            continue
        first = words[0].strip("\"'`()")
        return re.sub(r"[^\w.+-]", "", first.replace("\\", "/").rsplit("/", 1)[-1])[:64]
    return "cd" if command.strip().startswith("cd") else ""


# Secrets that a command line or a URL can carry, beyond what ``context_audit._redact`` removes.
_SECRET_PATTERNS = (
    re.compile(r"(?i)(authorization\s*[:=]\s*(?:bearer|basic|token)?\s*)[^\s\"']+"),
    re.compile(r"(?i)(\b(?:bearer|basic)\s+)[A-Za-z0-9._~+/=-]{4,}"),
    re.compile(r"(?i)(\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|AUTH|CREDENTIALS?)[A-Z0-9_]*\s*=\s*)"
               r"(\"[^\"]*\"|'[^']*'|[^\s\"']+)"),
    re.compile(r"(?i)(--?(?:token|password|passwd|api-?key|secret|auth)(?:=|\s+))[^\s\"']+"),
    re.compile(r"(?i)(\b-p)(?=\S{4,})\S+"),  # mysql -pSECRET
)
_TOKEN_QUERY = re.compile(r"(?i)(token|key|sig|secret|password|auth|code|credential)")


def redact_secrets(text: str) -> str:
    from .context_audit import _redact

    text = _redact(text)
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub(lambda m: f"{m.group(1)}<redacted>", text)
    return text


def bounded(text: str, limit: int = TEXT_TARGET_MAX) -> tuple[str, int, bool]:
    """(the text redacted and cut to *limit*, its full length, whether it was cut)."""
    text = redact_secrets(" ".join(text.split()))
    return text[:limit], len(text), len(text) > limit


def clean_url(url: str) -> str:
    """A URL without credentials, and without its query when the query looks like it carries a secret."""
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return ""
    netloc = parts.netloc.rsplit("@", 1)[-1]
    query = "" if _TOKEN_QUERY.search(parts.query) else parts.query
    return parts._replace(netloc=netloc, query=query, fragment="").geturl()


def url_host(url: str) -> str:
    """The host of a URL, lower case, without port or credentials."""
    try:
        host = urlsplit(url.strip()).hostname or ""
    except ValueError:
        return ""
    return host[:255]


_COMMAND_KEYS = ("command", "cmd", "commandLine")
_PATH_KEYS = ("file_path", "filePath", "notebook_path", "path", "dirPath", "uri")
_SKILL_TOOLS = frozenset({"Skill", "skill"})
_AGENT_TOOLS = frozenset({"Agent", "Task", "task", "runSubagent", "run_subagent"})
_AGENT_KEYS = ("subagent_type", "agent_type", "agentName", "agent")
_URL_KEYS = ("url", "urls")
_QUERY_NAME = re.compile(r"(?i)(search|grep|glob|^rg$|find|sql|query|lookup)")
_FETCH_NAME = re.compile(r"(?i)(fetch|browse|web_?page|open_?url)")


def decode_file_uri(value: str) -> str:
    """``file:///c%3A/Users/me/proj`` -> ``c:/Users/me/proj`` (the rule of ``ingesters._common``)."""
    path = unquote(urlsplit(value).path)
    return path[1:] if len(path) > 2 and path[0] == "/" and path[2] == ":" else path


def _first_string(args: dict, keys: tuple[str, ...]) -> str:
    for key in keys:
        value = args.get(key)
        if isinstance(value, str) and value:
            return value
        if isinstance(value, list) and value and isinstance(value[0], str) and value[0]:
            return value[0]
        if isinstance(value, dict):  # VS Code passes some paths as a URI object
            inner = value.get("fsPath") or value.get("path")
            if isinstance(inner, str) and inner:
                return inner
    return ""


def _number(value: Any) -> int | None:
    return value if type(value) is int else None


def describe_call(name: str | None, args: Any, *, keep_text: bool, server_hint: str = "") -> dict[str, Any]:
    """What one tool call acted on, as the year-long columns of ``tool_invocations``.

    ``target_kind`` is file, command, url, skill, agent, query or other. ``target`` is the file
    path, the command line, the URL, the search text, the skill or subagent name, or the MCP
    tool. Command lines, URLs and search text are text: written redacted and bounded only when
    *keep_text*; otherwise ``target`` holds the identifier only (program name, host, "").
    """
    name = name or ""
    args = args if isinstance(args, dict) else {}
    out: dict[str, Any] = {"target_kind": OTHER, "target": "", "target_chars": None, "target_truncated": None,
                           "command_name": "", "url_host": "", "search_path": "", "arg_names": "",
                           "read_offset": None, "read_limit": None, "agent_label": ""}

    def text(value: str) -> None:
        out["target"], out["target_chars"], out["target_truncated"] = bounded(value)

    if is_mcp_name(name):
        out.update(target=split_mcp(name, hint=server_hint)[1][:TARGET_MAX],
                   arg_names=",".join(sorted(str(k) for k in args))[:ARG_NAMES_MAX])
        return out
    if name in _SKILL_TOOLS:
        out.update(target_kind=SKILL, target=_first_string(args, ("skill", "name"))[:TARGET_MAX])
        return out
    if name in _AGENT_TOOLS:
        label = _first_string(args, ("description", "name"))
        out.update(target_kind=AGENT, target=_first_string(args, _AGENT_KEYS)[:TARGET_MAX],
                   agent_label=" ".join(label.split())[:200])
        return out
    command = _first_string(args, _COMMAND_KEYS)
    if command:
        out.update(target_kind=COMMAND, command_name=program_name(command))
        if keep_text:
            text(command)
        else:
            out["target"] = out["command_name"]
        return out
    url = _first_string(args, _URL_KEYS)
    if url.startswith(("http://", "https://")):
        out.update(target_kind=URL, url_host=url_host(url))
        if keep_text:
            text(clean_url(url))
        else:
            out["target"] = out["url_host"]
        return out
    path = _first_string(args, _PATH_KEYS + ("paths",))
    path = decode_file_uri(path) if path.startswith("file:") else path
    if _QUERY_NAME.search(name) or (isinstance(args.get("query"), str) and not path):
        out.update(target_kind=QUERY, search_path=path[:TARGET_MAX])
        query = _first_string(args, ("pattern", "query", "regex", "includePattern"))
        if keep_text and query:
            text(query)
        return out
    if path:
        out.update(target_kind=FILE, target=path[:TARGET_MAX])
        offset, limit = _number(args.get("offset")), _number(args.get("limit"))
        start, end = _number(args.get("startLine")), _number(args.get("endLine"))
        span = args.get("view_range")
        if isinstance(span, list) and len(span) == 2 and all(type(v) is int for v in span):
            start, end = span
        if offset is None and start is not None:
            offset = start
            limit = end - start + 1 if end is not None and end >= start else None
        out.update(read_offset=offset, read_limit=limit)
        return out
    patch = args.get("input") or args.get("patch")
    if isinstance(patch, str) and "*** " in patch:
        from .ingesters.call_facts import apply_patch_files

        files = apply_patch_files(patch)
        out.update(target_kind=FILE, target=(files[0][0] if files else "")[:TARGET_MAX])
        return out
    if _FETCH_NAME.search(name):
        out["target_kind"] = URL
    return out


def call_target(name: str | None, args: Any, *, server_hint: str = "") -> tuple[str, str]:
    """(kind, target) as kept when no text is kept: identifiers only."""
    found = describe_call(name, args, keep_text=False, server_hint=server_hint)
    return found["target_kind"], found["target"]
