"""Scrub captures in memory, before serializing them."""

import hashlib
import hmac
import json
import os
import re
import socket
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit

PRIVATE = re.compile(
    r"(?i)(?:[a-z]:[\\/]+users[\\/]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|"
    r"(?:https?|ssh|git|file)://|git@|"
    r"\b(?:gh[pousr]_|github_pat_|sk-(?:proj-|ant-)?|xox[baprs]-|"
    r"AKIA|ASIA|AIza|eyJ)[\w.-]{12,}|"
    r"\bBearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|"
    r"(?:api[_-]?key|password|secret|sig|access[_-]?token)\s*[:=]\s*\S+)"
)
NUMBER_OR_DATE = re.compile(
    r"(?:[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[Ee][+-]?\d+)?|"
    r"\d{4}-\d\d-\d\d(?:[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)?)?|"
    r"\d+(?:\.\d+)?(?:ms|s|m|h|d))\Z"
)
PATH = re.compile(r"^(?:[a-z]:[\\/]|\\{2}|/|~[\\/])", re.I)
PLACEHOLDER = re.compile(
    r"(?:anon_[0-9a-f]{24}|X:\\Capture\\anon_[0-9a-f]{24}(?:\.[a-z0-9]{1,8})?)\Z"
)
TEXT = re.compile(
    r"(?:^|_)(?:text|prompt|reply|response|completion|message|content|description|"
    r"summary|body|excerpt|subject|title|output|input|arguments|commandline|error|"
    r"stacktrace|reasoning|secret|key|token|password|credential|authorization)(?:$|_)"
)
# UI discriminants, transport formats and other public values used in comparisons.
SAFE = frozenset("""
    active agent all append artifact assistant baseline bootstrap bool boolean cached call cancelled
    change changes child claude claude-code closed commit completed config context copilot
    copilot-cli copilot-desktop copilot-vscode count cursor data datetime delete delta disabled duration
    empty enabled end error event events failed false file filesystem finish fleet flow
    gemini gemini-cli github-copilot health heartbeat history hook idle incomplete inline
    int json keepalive latest linux local log long machine macos mcp message metadata
    metric metrics multijson network node none null off ok online open other otel overview
    ordered partial pending poll process prompt queued ready read real refresh removed request reset
    result retry role root running sample scan scanning session sessions snapshot source
    start stopped store streaming string succeeded success system table team telemetry
    term timeout tool tool_call tool_result transcript true type unavailable unknown
    update upsert user vscode warning windows write
    anthropic azure github google microsoft openai codex aider windsurf opencode
    current full permissions project project-local user-local runtime settings identity nodes
""".split())
METRIC = re.compile(
    r"(?:aictl\.(?:tool|file|discovery|collector|config|memory|live|hook|ingester|kusto)"
    r"|system|process|net|cpu|gen_ai\.(?:usage|request|response)|otel)"
    r"(?:\.[a-zA-Z0-9_]+){1,5}\Z"
)
PROTOCOL_VALUES = frozenset("""
    /api/live/stream /api/datapoints source.status runtime.process runtime.agent
    runtime.machine runtime.health runtime.output configuration.file configuration.loaded
    configuration.board history.board catalog.board runtime.collector runtime.operational
    runtime.native filesystem.config runtime.evidence kusto.queryable catalog
    queryable runtime-collector
""".split())
KQL_ITEM = re.compile(r'''//[^\n]*|/\*[\s\S]*?\*/|```[\s\S]*?```|@?"(?:\\.|[^"\\])*"|@?'(?:\\.|[^'\\])*' ''',
                      re.VERBOSE)


class Scrubber:
    def __init__(self, key=None, identities=None):
        self.key = os.urandom(32) if key is None else key
        identities = identities if identities is not None else (
            os.getenv("USERNAME"), os.getenv("USER"), os.getenv("COMPUTERNAME"), socket.gethostname(),
        )
        self.identities = tuple(value.casefold() for value in identities if value)
        self.identifiers = set()

    def alias(self, value):
        return "anon_" + hmac.new(self.key, value.encode("utf-8"), hashlib.sha256).hexdigest()[:24]

    def private(self, value):
        folded = value.casefold()
        return any(identity in folded for identity in self.identities) or PRIVATE.search(value)

    def string(self, value, field=""):
        if not value or PLACEHOLDER.fullmatch(value):
            return value
        if value in PROTOCOL_VALUES and not TEXT.search(field):
            return value
        if PATH.match(value):
            path = value.replace("/", "\\")
            suffix = re.search(r"\.[a-z0-9]{1,8}$", path, re.I)
            return "X:\\Capture\\" + self.alias(path.casefold()) + (suffix[0].lower() if suffix else "")
        # A JSON string is still structured data (e.g. metrics.tags_json).
        if value[:1] in ("{", "["):
            try:
                parsed = json.loads(value)
            except ValueError:
                pass
            else:
                return json.dumps(self.scrub(parsed, field), ensure_ascii=True, separators=(",", ":"))
        name = re.sub(r"(?<=[a-z])(?=[A-Z])", "_", field).lower().replace(".", "_")
        # The live reducer routes history status records by this prefix.
        if name == "id" and value.startswith("history:"):
            return "history:" + self.alias(value)
        if self.private(value) or TEXT.search(name):
            return self.alias(value)
        if (value.lower() in SAFE or value in self.identifiers or NUMBER_OR_DATE.fullmatch(value)
                or name == "field" and re.fullmatch(r"[a-z][a-z0-9_]*", value)
                or METRIC.fullmatch(value) and field in ("metric", "name", "kql")):
            return value
        return self.alias(value)

    def key_name(self, key):
        # Keep schema names. Replace keys in dynamic maps that contain private values.
        if self.private(key) or PATH.match(key) or not re.fullmatch(r"[a-zA-Z_][\w.:-]{0,95}", key):
            return self.string(key, "key")
        return key

    def scrub(self, value, field=""):
        if isinstance(value, dict):
            return {self.key_name(str(k)): self.scrub(v, str(k)) for k, v in value.items()}
        if isinstance(value, (tuple, list)):
            return [self.scrub(v, field) for v in value]
        if isinstance(value, str):
            return self.string(value, field)
        return value

    def route(self, path):
        route = urlsplit(path)
        parts = route.path.split("/")
        if parts[1:3] in (["api", "copilot-sessions"], ["api", "tool-config"]) and len(parts) > 3:
            parts[3] = quote(self.string(unquote(parts[3]), "session_id"), safe="")
        query = urlencode([
            (self.key_name(k), self.string(v, "name" if k == "metric" else k))
            for k, v in parse_qsl(route.query, keep_blank_values=True)
        ])
        return "/".join(parts) + (f"?{query}" if query else "")

    def envelope(self, payload):
        clean = self.scrub(payload)
        if (isinstance(clean, dict) and isinstance(clean.get("epoch"), str)
                and isinstance(clean.get("sequence"), int)):
            clean["cursor"] = f"{clean['epoch']}:{clean['sequence']}"
        return clean

    def kql(self, statement):
        """Keep operators and identifiers. Scrub strings, comments and inline JSON."""
        head, sep, body = statement.partition("<|\n")
        inline = sep and re.match(r"\s*\.ingest\s+inline\b", head, re.I)

        def replace(match):
            item = match[0]
            if item.startswith(("//", "/*")):
                return "/* scrubbed */" + "\n" * item.count("\n")
            if item.startswith("```"):
                return json.dumps(self.string(item[3:-3], "kql"))
            literal = item.removeprefix("@")
            if item.startswith("@"):
                value = literal[1:-1].replace(literal[0] * 2, literal[0])
            else:
                # KQL permits both quote styles and JSON-style backslash escapes.
                value = re.sub(r"""\\(['"\\nrt])""",
                               lambda m: {"n": "\n", "r": "\r", "t": "\t"}.get(m[1], m[1]),
                               literal[1:-1])
            if (match.start() and match.string[match.start() - 1] == "["
                    and match.string[match.end():].startswith("]") and not self.private(value)
                    and (value in self.identifiers or re.fullmatch(r"__c\d+", value))):
                return item
            safe = self.string(value, "kql")
            return item if value == safe else json.dumps(safe, ensure_ascii=True)

        output = KQL_ITEM.sub(replace, head if inline else statement)
        if inline:
            output += sep + "\n".join(
                json.dumps(self.scrub(json.loads(line)), ensure_ascii=True, separators=(",", ":"))
                for line in body.splitlines() if line.strip()
            )
        # Do not keep unexpected free-form syntax if it contains an identity or credential.
        return "/* scrubbed " + self.alias(statement) + " */" if self.private(output) else output


def verify_text(value, extra_literals=()):
    """Return whether text contains a forbidden marker. Do not print the marker."""
    literals = (*(v for v in extra_literals if v), "@" + "microsoft.com")
    folded = value.casefold()
    return bool(PRIVATE.search(value) or any(v.casefold() in folded for v in literals))


def relative_path(path):
    """Limit recorder outputs to the current checkout."""
    candidate = Path(path)
    if candidate.is_absolute() or not candidate.resolve().is_relative_to(Path.cwd()):
        raise ValueError("use a relative path inside the checkout")
    return candidate
