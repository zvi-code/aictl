# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Hidden-context audit: what can reach the model, and what is concealed in it.

Five layers: an inventory of every source that can reach a tool's model;
dynamic and out-of-band injection that no file shows; drift against a baseline,
including an agent writing to its own future context; a visibility gap between
what was loaded and what is known; and a content scan for concealment.

Everything here is read-only over the scanned files, and everything scanned is
data. Nothing found is ever executed: hook commands and MCP servers are parsed,
never run. The only write is ``context-baseline.json`` in aictl's config dir,
which holds hashes and metadata and no file contents. It does not depend on
``history.db``, so it works in every ``[storage] capture`` mode.
"""

from __future__ import annotations

import base64
import contextlib
import glob
import hashlib
import json
import os
import re
import sqlite3
import statistics
import subprocess
import tempfile
import time
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from .platforms import claude_global_dir, config_dir, vscode_user_dir
from .tools import PRUNE_DIRS, _expand_home, _params_to_glob, get_registry

SEVERITIES = ("high", "medium", "low", "info")
_SEV_RANK = {s: i for i, s in enumerate(SEVERITIES)}

MAX_READ_BYTES = 1_000_000  # a source larger than this is hashed and scanned up to the cap
MAX_BASELINE_BYTES = 2_000_000
MAX_DRIFT_EVENTS = 500
MAX_SNIPPET = 160
MAX_RULE_HITS_PER_FILE = 5
MAX_WALK_DIRS = 5000
MAX_GLOB_HITS = 300
TRANSCRIPT_FILES = 8
TRANSCRIPT_MAX_BYTES = 30_000_000
BASELINE_FILENAME = "context-baseline.json"

AUDITED_TOOLS = (
    "claude-code",
    "codex-cli",
    "copilot",
    "copilot-cli",
    "copilot-jetbrains",
    "copilot-vscode",
    "cursor",
    "gemini-cli",
    "windsurf",
)

# Tokens each tool's own system prompt and tool list cost before any source is
# loaded. These are rough allowances, so the residual never reads as a precise number.
BUILTIN_ALLOWANCE_TOKENS = {"claude-code": 25_000}

_CONTEXT_HOOK_EVENTS = {
    "sessionstart",
    "userpromptsubmit",
    "userpromptsubmitted",
    "subagentstart",
    "beforeagent",
    "sessioncreated",
}
_TOOL_HOOK_EVENTS = {"pretooluse", "posttooluse", "posttoolusefailure", "pretool", "posttool", "aftertool"}

_OFFICIAL_API_HOSTS = {
    "api.anthropic.com",
    "api.openai.com",
    "generativelanguage.googleapis.com",
    "api.githubcopilot.com",
    "chatgpt.com",
}
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}  # noqa: S104 - compared, never bound


# ─── Result types ─────────────────────────────────────────────────


@dataclass
class Source:
    tool: str
    scope: str  # managed | user | project | parent-dir | local | plugin | memory | dynamic
    path: str
    kind: str
    loading: str  # always | conditional | on-demand | config | dynamic
    origin: str = "builtin"
    bytes: int = 0
    est_tokens: int = 0
    sha256: str = ""
    mtime: float = 0.0
    git_state: str = ""  # tracked | ignored | untracked | outside-repo | not-a-file
    symlink_target: str = ""
    truncated: bool = False
    readable: bool = True  # False names a source no file shows in full
    transient: bool = False  # True is left out of drift, e.g. a live process flag
    note: str = ""


@dataclass
class Finding:
    rule: str
    severity: str
    tool: str
    path: str
    line: int = 0
    snippet: str = ""
    why: str = ""
    action: str = ""
    session_id: str = ""
    count: int = 1
    tools: list[str] = field(default_factory=list)


# ─── Text helpers ─────────────────────────────────────────────────

_SECRET_VALUE_RE = re.compile(
    r"(?i)\b(sk-[a-z0-9_-]{8,}|gh[pousr]_[a-z0-9]{8,}|xox[a-z]-[a-z0-9-]{8,}|AKIA[0-9A-Z]{8,})"
    r"|((?:api[_-]?key|token|secret|password|passwd|bearer)[\"']?\s*[=:]\s*[\"']?)([^\s\"',;&]{4,})"
)


def _redact(text: str) -> str:
    """Remove secret-shaped values and URL credentials from text."""

    def _sub(m: re.Match) -> str:
        return f"{m.group(2)}<redacted>" if m.group(2) else "<redacted>"

    text = _SECRET_VALUE_RE.sub(_sub, text)
    return re.sub(r"(https?://)[^/\s:@]+:[^/\s@]+@", r"\1<redacted>@", text)


def escape_invisible(text: str) -> str:
    """Show every invisible or control character as a visible U+XXXX."""
    out = []
    for ch in text:
        cat = unicodedata.category(ch)
        if ch == "\t":
            out.append(" ")
        elif cat in ("Cf", "Cc", "Co", "Cn", "Zl", "Zp") or ch in "\u115f\u1160\u3164\uffa0\u034f":
            out.append(f"U+{ord(ch):04X}")
        else:
            out.append(ch)
    return "".join(out)


def _snippet(text: str) -> str:
    """Build a bounded, redacted snippet with invisible characters escaped."""
    clean = escape_invisible(_redact(text.strip()))
    return clean[:MAX_SNIPPET] + ("..." if len(clean) > MAX_SNIPPET else "")


def _host_of(url: str) -> str:
    parsed = urlparse(url if "://" in url else f"https://{url}")
    return parsed.hostname or ""


def _est_tokens(text_len: int) -> int:
    return text_len // 4


def _strip_jsonc(text: str) -> str:
    text = re.sub(r'("(?:\\.|[^"\\])*")|//[^\n]*|/\*.*?\*/', lambda m: m.group(1) or "", text, flags=re.S)
    return re.sub(r",(\s*[}\]])", r"\1", text)


def _read_json(path: Path) -> dict:
    """Parse JSON or JSONC tolerantly. A malformed or unreadable file gives {}."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")[:MAX_READ_BYTES]
    except OSError:
        return {}
    for candidate in (text, _strip_jsonc(text)):
        try:
            data = json.loads(candidate)
            return data if isinstance(data, dict) else {}
        except ValueError:
            continue
    return {}


def _read_toml_flat(path: Path) -> dict[str, str]:
    """Read TOML as ``section.key -> raw value``.

    A line reader on purpose: real configs here declare a table twice, which
    tomllib rejects, and the audit must still see the keys in such a file.
    """
    out: dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8", errors="replace")[:MAX_READ_BYTES]
    except OSError:
        return out
    section = ""
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#") or not line:
            continue
        m = re.match(r"^\[+([^\]]+)\]+", line)
        if m:
            section = m.group(1).strip()
            continue
        m = re.match(r"^([\w.\"-]+)\s*=\s*(.+)$", line)
        if m:
            key = f"{section}.{m.group(1)}" if section else m.group(1)
            out[key] = m.group(2).strip().strip("\"'")
    return out


# ─── Layer 5: content scan ────────────────────────────────────────

_TAG_RE = re.compile("[\U000e0000-\U000e007f\U000e0100-\U000e01ef]")
_TAG_FLAG_RE = re.compile("\U0001f3f4[\U000e0061-\U000e007a]+\U000e007f")  # subdivision flag emoji
_BIDI_RE = re.compile("[\u202a-\u202e\u2066-\u2069]")
_INVISIBLE_RE = re.compile("[\u200b-\u200f\u2060-\u2064\u180e\ufeff\u034f\u115f\u1160\u3164\uffa0\u061c\u00ad]")
_RTL_LETTER_RE = re.compile("[\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\u0900-\u0dff]")
_OVERRIDE_RE = re.compile(
    r"\b(ignore|disregard|forget|bypass)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|system|safety|your)\b"
    r"[^.\n]{0,30}\b(instructions?|prompts?|rules?|guidelines?|polic(?:y|ies)|guardrails?)\b"
    r"|\byou are now\b[^.\n]{0,40}\b(unrestricted|jailbroken|dan|without (?:any )?(?:rules|restrictions))\b"
    r"|\bnew system (?:prompt|instructions?)\s*:",
    re.I,
)
_CONCEAL_RE = re.compile(
    r"\b(?:do not|don't|never|avoid)\s+(?:ever\s+)?"
    r"(?:tell|telling|inform|informing|reveal|revealing|disclose|disclosing|alert|alerting|notify|notifying)\b"
    r"[^.\n]{0,30}\b(?:user|human|developer|operator|maintainer|reviewer)\b"
    r"|\bwithout\s+(?:telling|informing|notifying|alerting)\s+(?:the\s+)?(?:user|human|developer|maintainer|reviewer)\b"
    r"|\b(?:hide|conceal)\b[^.\n]{0,30}\bfrom\s+(?:the\s+)?(?:user|human|developer|maintainer|reviewer)\b"
    r"|\bkeep\b[^.\n]{0,30}\bsecret from\s+(?:the\s+)?(?:user|human|developer|maintainer|reviewer)\b"
    r"|\bsilently\b[^.\n]{0,30}\b(?:send|post|upload|exfiltrate|forward)\b",
    re.I,
)
_AGENT_ADDRESS_RE = re.compile(
    r"\b(you must|you should|always|never|assistant|ai agent|claude|copilot|llm|system prompt)\b", re.I
)
_NET_RE = re.compile(r"\b(curl|wget|ncat|nc|scp|Invoke-WebRequest|http)\s", re.I)
_SECRET_VAR_RE = re.compile(r"\$\{?[A-Z0-9_]*(KEY|TOKEN|SECRET|PASS|PASSWORD|CRED)[A-Z0-9_]*\}?")
_AUTH_HEADER_RE = re.compile(r"(-H|--header)\s+[\"']?(Authorization|x-api-key|api-key)", re.I)
_ENV_DUMP_RE = re.compile(r"\$\(\s*(printenv|env\b|cat [^)]*(\.env|\.ssh|credentials))|`(printenv|env)`|\b(printenv|env)\s*\|")
_PIPE_SHELL_RE = re.compile(r"\b(curl|wget)\b[^|\n]*\|\s*(sudo\s+)?(ba|z)?sh\b")
_REMOTE_IMPORT_RE = re.compile(r"(?<![\w`])@https?://\S+")
_BASE64_RE = re.compile(r"(?<![A-Za-z0-9+/=_-])[A-Za-z0-9+/]{120,}={0,2}(?![A-Za-z0-9+/=_-])")
_HTML_COMMENT_RE = re.compile(r"<!--(.*?)-->", re.S)
_DETAILS_RE = re.compile(r"<details\b", re.I)
_FENCE_RE = re.compile(r"^\s*(```|~~~)")
_LONG_LINE = 4000
_VERY_LONG_LINE = 20000

_ACTIONS = {
    "content.tag-chars": "Open the file in a hex view, delete the hidden characters, and find out who added them.",
    "content.bidi-control": "Delete the control characters. They reorder what a reviewer sees compared with what the model reads.",
    "content.invisible-chars": "Delete the invisible characters unless they belong to the text around them.",
    "content.override-concealment": "Treat this source as hostile: read it in full, remove it, and check its history.",
    "content.override-phrase": "Read the passage and confirm a person wrote it on purpose.",
    "content.concealment-phrase": "Read the passage. An instruction to keep something from you needs a good reason.",
    "content.exfil-network-env": "Read the command and confirm where this secret or environment data goes.",
    "content.remote-exec": "Confirm the URL. This runs remote code when followed.",
    "content.remote-import": "Replace the remote import with a local reviewed copy.",
    "content.encoded-blob": "Decode the blob and read it. Encoded text is not visible in a review.",
    "content.html-comment": "Read the comment in the raw file. Rendered views do not show it.",
    "content.collapsed-block": "Expand the block and read it. Rendered views start with it hidden.",
    "content.long-line": "Check the end of the line. Text far past the visible width escapes review.",
}


def _add_hit(hits: dict, rule: str, severity: str, line: int, text: str, why: str) -> None:
    entry = hits.get(rule)
    if entry is None:
        entry = hits[rule] = []
    entry.append({"severity": severity, "line": line, "snippet": _snippet(text), "why": why})


def _scan_unicode_line(number: int, line: str, hits: dict) -> None:
    probe = _TAG_FLAG_RE.sub("", line)
    tags = _TAG_RE.findall(probe)
    if tags:
        decoded = "".join(chr(ord(c) - 0xE0000) for c in tags if 0xE0020 <= ord(c) <= 0xE007E)
        why = f"{len(tags)} Unicode tag characters, invisible to people and readable by a model"
        if decoded:
            why += f"; decodes to: {_snippet(decoded)}"
        first = _TAG_RE.search(probe)
        start = max(0, first.start() - 30) if first else 0
        _add_hit(hits, "content.tag-chars", "high", number, probe[start : start + 60], why)
    has_rtl = bool(_RTL_LETTER_RE.search(probe))
    bidi = _BIDI_RE.findall(probe)
    if bidi:
        severity = "low" if has_rtl else "high"
        _add_hit(hits, "content.bidi-control", severity, number, probe, f"{len(bidi)} bidirectional control characters")
    suspects = []
    for m in _INVISIBLE_RE.finditer(probe):
        ch = m.group()
        if ch in "\u200c\u200d\u200e\u200f\u061c" and has_rtl:
            continue
        if ch == "\u200d" and _joins_emoji(probe, m.start()):
            continue
        suspects.append(ch)
    if suspects:
        only_soft = all(c == "\u00ad" for c in suspects)
        names = ", ".join(sorted({f"U+{ord(c):04X}" for c in suspects}))
        severity = "medium" if only_soft else "high"
        first_hit = _INVISIBLE_RE.search(probe)
        start = max(0, first_hit.start() - 30) if first_hit else 0
        _add_hit(hits, "content.invisible-chars", severity, number, probe[start : start + 100], f"{len(suspects)} invisible characters ({names})")


def _joins_emoji(text: str, index: int) -> bool:
    before = ord(text[index - 1]) if index else 0
    after = ord(text[index + 1]) if index + 1 < len(text) else 0
    # Variation selector 16 commonly sits between the emoji and the joiner.
    if before == 0xFE0F and index >= 2:
        before = ord(text[index - 2])
    return before >= 0x2190 and after >= 0x2190


def _fence_map(lines: list[str]) -> list[bool]:
    fenced = []
    inside = False
    for line in lines:
        if _FENCE_RE.match(line):
            fenced.append(True)
            inside = not inside
        else:
            fenced.append(inside)
    return fenced


def _around(line: str, match: re.Match) -> str:
    """Cut a long line down to the part that matched, so the snippet shows the hit."""
    return line[max(0, match.start() - 30) : match.end() + 40]


def _scan_phrases(lines: list[str], fenced: list[bool], hits: dict) -> None:
    override_lines: list[int] = []
    conceal_lines: list[int] = []
    for number, line in enumerate(lines, 1):
        if len(line) > _VERY_LONG_LINE:
            line = line[:_VERY_LONG_LINE]
        in_fence = fenced[number - 1]
        severity = "low" if in_fence else "medium"
        match = _OVERRIDE_RE.search(line)
        if match:
            if not in_fence:
                override_lines.append(number)
            _add_hit(hits, "content.override-phrase", severity, number, _around(line, match), "Asks the model to drop its other instructions")
        match = _CONCEAL_RE.search(line)
        if match:
            if not in_fence:
                conceal_lines.append(number)
            _add_hit(hits, "content.concealment-phrase", severity, number, _around(line, match), "Asks the model to keep something from a person")
        _scan_exfil_line(number, line, in_fence, hits)
    for over in override_lines:
        near = [c for c in conceal_lines if abs(c - over) <= 8]
        if near:
            match = _OVERRIDE_RE.search(lines[over - 1])
            text = _around(lines[over - 1], match) if match else lines[over - 1]
            _add_hit(
                hits,
                "content.override-concealment",
                "high",
                over,
                text,
                f"Override phrasing at line {over} together with concealment at line {near[0]}",
            )
            break


def _scan_exfil_line(number: int, line: str, in_fence: bool, hits: dict) -> None:
    if _REMOTE_IMPORT_RE.search(line):
        _add_hit(hits, "content.remote-import", "medium", number, line, "Pulls instructions from a remote URL into context")
    if _PIPE_SHELL_RE.search(line):
        severity = "low" if in_fence else "medium"
        _add_hit(hits, "content.remote-exec", severity, number, line, "Downloads a script and runs it")
    if not _NET_RE.search(line):
        return
    if _ENV_DUMP_RE.search(line):
        _add_hit(hits, "content.exfil-network-env", "medium", number, line, "Network command carries a dump of the environment or of credential files")
    elif _SECRET_VAR_RE.search(line):
        severity = "low" if _AUTH_HEADER_RE.search(line) else "medium"
        _add_hit(hits, "content.exfil-network-env", severity, number, line, "Network command carries a secret-named variable")


def _scan_blocks(text: str, lines: list[str], fenced: list[bool], hits: dict) -> None:
    for m in _HTML_COMMENT_RE.finditer(text):
        number = text.count("\n", 0, m.start()) + 1
        if number <= len(fenced) and fenced[number - 1]:
            continue
        body = m.group(1)
        addressed = bool(_OVERRIDE_RE.search(body) or _CONCEAL_RE.search(body) or _AGENT_ADDRESS_RE.search(body))
        if addressed or len(body) >= 200:
            why = f"HTML comment of {len(body)} characters, hidden in rendered views"
            _add_hit(hits, "content.html-comment", "medium", number, body, why)
        else:
            _add_hit(hits, "content.html-comment", "info", number, body, "Short HTML comment, hidden in rendered views")
    for number, line in enumerate(lines, 1):
        if _DETAILS_RE.search(line) and not fenced[number - 1]:
            _add_hit(hits, "content.collapsed-block", "low", number, line, "Collapsed block, hidden until expanded")
    for number, line in enumerate(lines, 1):
        for m in _BASE64_RE.finditer(line[:_VERY_LONG_LINE]):
            if "data:image" in line[max(0, m.start() - 40) : m.start()]:
                continue
            decoded = _decoded_text(m.group())
            severity = "medium" if decoded else "low"
            kind = "decodes to readable text" if decoded else "does not decode to text"
            _add_hit(hits, "content.encoded-blob", severity, number, m.group()[:80], f"{len(m.group())} character base64 run, {kind}")
            break
        if len(line) >= _LONG_LINE:
            severity = "medium" if len(line) >= _VERY_LONG_LINE else "low"
            _add_hit(hits, "content.long-line", severity, number, line[:80], f"Line of {len(line)} characters")


def _decoded_text(blob: str) -> bool:
    try:
        raw = base64.b64decode(blob + "=" * (-len(blob) % 4), validate=False)
    except ValueError:
        return False
    if not raw:
        return False
    printable = sum(32 <= b < 127 or b in (9, 10, 13) for b in raw[:2000])
    return printable / min(len(raw), 2000) > 0.9


def scan_text(text: str, *, config: bool = False) -> list[dict]:
    """Scan one source's text and return bounded hit dicts.

    ``config`` limits the scan to the Unicode rules, since phrase and block
    rules mean nothing in a settings file.
    """
    if text.startswith("\ufeff"):
        text = text[1:]
    lines = text.split("\n")
    hits: dict[str, list[dict]] = {}
    for number, line in enumerate(lines, 1):
        if not line.isascii():
            _scan_unicode_line(number, line, hits)
    if not config:
        fenced = _fence_map(lines)
        _scan_phrases(lines, fenced, hits)
        _scan_blocks(text, lines, fenced, hits)
    out = []
    for rule, entries in hits.items():
        entries.sort(key=lambda e: (_SEV_RANK[e["severity"]], e["line"]))
        for entry in entries[:MAX_RULE_HITS_PER_FILE]:
            out.append({"rule": rule, "count": len(entries), **entry})
    return out


# ─── File facts, cached by stat ───────────────────────────────────

_FILE_CACHE: dict[str, tuple[int, int, dict]] = {}


def _file_facts(path: Path, *, config: bool) -> dict | None:
    """Stat first; read, hash and scan only when mtime or size changed."""
    try:
        st = path.stat()
    except OSError:
        return None
    key = f"{path}|{config}"
    cached = _FILE_CACHE.get(key)
    if cached and cached[0] == st.st_mtime_ns and cached[1] == st.st_size:
        return cached[2]
    try:
        with path.open("rb") as fh:
            raw = fh.read(MAX_READ_BYTES)
    except OSError:
        return None
    binary = b"\0" in raw[:4096]
    text = "" if binary else raw.decode("utf-8", errors="replace")
    facts = {
        "bytes": st.st_size,
        "mtime": st.st_mtime,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "truncated": st.st_size > MAX_READ_BYTES,
        "est_tokens": 0 if config else _est_tokens(st.st_size if binary else len(text)),
        "binary": binary,
        "hits": [] if binary else scan_text(text, config=config),
        "always_apply": bool(re.search(r"(?m)^alwaysApply:\s*true\s*$", text[:2000])),
        "imports": _parse_imports(text) if path.name.endswith(".md") and not binary else [],
    }
    _FILE_CACHE[key] = (st.st_mtime_ns, st.st_size, facts)
    return facts


_IMPORT_RE = re.compile(r"(?<![\w`/@.])@((?:~/|\.{1,2}/|/)?[\w.-]+(?:/[\w.-]+)*)")


def _parse_imports(text: str) -> list[str]:
    """Return ``@path`` imports outside code fences and inline code."""
    out: list[str] = []
    inside = False
    for line in text.split("\n"):
        if _FENCE_RE.match(line):
            inside = not inside
            continue
        if inside or "@" not in line:
            continue
        stripped = re.sub(r"`[^`]*`", "", line)
        out.extend(_IMPORT_RE.findall(stripped))
    return out[:100]


# ─── Layer 1: inventory ───────────────────────────────────────────

_RANK = {"always": 0, "conditional": 1, "on-demand": 2, "config": 3, "dynamic": 4}


class _Inventory:
    def __init__(self, project: Path):
        self.project = project
        self.rows: dict[tuple[str, str], Source] = {}

    def add(self, tool: str, scope: str, path: Path | str, kind: str, loading: str, origin: str = "builtin") -> None:
        p = Path(path)
        if not p.is_file():
            return
        if p.name.endswith(".local.md"):
            scope = "local"  # the path tables do not tell these apart from shared project files
        key = (tool, str(p))
        existing = self.rows.get(key)
        if existing is not None:
            if _RANK[loading] < _RANK[existing.loading]:
                existing.loading = loading
            return
        self.rows[key] = Source(tool=tool, scope=scope, path=str(p), kind=kind, loading=loading, origin=origin)

    def add_glob(self, tool: str, scope: str, pattern: str, kind: str, loading: str, origin: str = "builtin") -> None:
        for hit in glob.iglob(_expand_home(pattern), recursive=True):
            self.add(tool, scope, hit, kind, loading, origin)
            if len(self.rows) > 20000:
                return

    def dynamic(self, tool: str, label: str, kind: str, note: str, *, text: str = "", transient: bool = False) -> Source:
        digest = hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest() if text else ""
        row = Source(
            tool=tool,
            scope="dynamic",
            path=label,
            kind=kind,
            loading="dynamic",
            origin="dynamic",
            bytes=len(text.encode("utf-8", errors="replace")),
            est_tokens=_est_tokens(len(text)),
            sha256=digest,
            readable=False,
            transient=transient,
            note=note,
        )
        self.rows[(tool, label)] = row
        return row


def _repo_root(project: Path) -> Path | None:
    for d in [project, *project.parents]:
        if (d / ".git").exists():
            return d
    return None


def _ancestors(project: Path, stop: Path | None) -> list[Path]:
    out = []
    for d in project.parents:
        out.append(d)
        if stop is not None and d == stop:
            break
    return out


_USER_PATTERNS = [
    ("claude-code", "user", "~/.claude/CLAUDE.md", "instructions", "always"),
    ("claude-code", "user", "~/.claude/rules/**/*.md", "rules", "conditional"),
    ("claude-code", "user", "~/.claude/output-styles/*.md", "output-style", "conditional"),
    ("claude-code", "user", "~/.claude/agents/*.md", "agent", "on-demand"),
    ("claude-code", "user", "~/.claude/skills/*/SKILL.md", "skill", "on-demand"),
    ("claude-code", "user", "~/.claude/commands/**/*.md", "command", "on-demand"),
    ("claude-code", "user", "~/.claude/settings.json", "settings", "config"),
    ("claude-code", "user", "~/.claude/settings.local.json", "settings", "config"),
    ("claude-code", "user", "~/.claude.json", "settings", "config"),
    ("codex-cli", "user", "~/.codex/AGENTS.md", "instructions", "always"),
    ("codex-cli", "user", "~/.codex/AGENTS.override.md", "instructions", "always"),
    ("codex-cli", "user", "~/.codex/instructions.md", "instructions", "always"),
    ("codex-cli", "user", "~/.codex/config.toml", "settings", "config"),
    ("codex-cli", "user", "~/.codex/prompts/*.md", "command", "on-demand"),
    ("codex-cli", "user", "~/.codex/skills/*/SKILL.md", "skill", "on-demand"),
    ("codex-cli", "user", "~/.agents/skills/*/SKILL.md", "skill", "on-demand"),
    ("codex-cli", "memory", "~/.codex/memories/MEMORY.md", "memory", "on-demand"),
    ("codex-cli", "memory", "~/.codex/memories/memory_summary.md", "memory", "always"),
    ("codex-cli", "memory", "~/.codex/memories/raw_memories.md", "memory", "on-demand"),
    ("gemini-cli", "user", "~/.gemini/GEMINI.md", "instructions", "always"),
    ("gemini-cli", "user", "~/.gemini/system.md", "system-prompt", "conditional"),
    ("gemini-cli", "user", "~/.gemini/settings.json", "settings", "config"),
    ("gemini-cli", "user", "~/.gemini/commands/**/*.toml", "command", "on-demand"),
    ("gemini-cli", "plugin", "~/.gemini/extensions/*/GEMINI.md", "extension", "always"),
    ("copilot-cli", "user", "~/.copilot/copilot-instructions.md", "instructions", "always"),
    ("copilot-cli", "user", "~/.copilot/instructions/**/*.md", "instructions", "conditional"),
    ("copilot-cli", "user", "~/.copilot/agents/*.md", "agent", "on-demand"),
    ("copilot-cli", "user", "~/.copilot/skills/*/SKILL.md", "skill", "on-demand"),
    ("copilot-cli", "plugin", "~/.copilot/installed-plugins/**/SKILL.md", "skill", "on-demand"),
    ("copilot-cli", "plugin", "~/.copilot/installed-plugins/**/agents/*.md", "agent", "on-demand"),
    ("copilot-cli", "user", "~/.copilot/config.json", "settings", "config"),
    ("copilot-cli", "user", "~/.copilot/hooks/*.json", "hooks", "config"),
    ("cursor", "user", "~/.cursor/rules/**/*.mdc", "rules", "conditional"),
    ("cursor", "user", "~/.cursor/rules/**/*.md", "rules", "conditional"),
    ("cursor", "user", "~/.cursor/memories/**/*.md", "memory", "on-demand"),
    ("windsurf", "user", "~/.codeium/windsurf/memories/global_rules.md", "instructions", "always"),
    ("windsurf", "memory", "~/.codeium/windsurf/memories/*.md", "memory", "on-demand"),
]

_MANAGED_DIRS = ("/Library/Application Support/ClaudeCode", "/etc/claude-code")

_PROJECT_PATTERNS = [
    ("claude-code", "project", ".claude/CLAUDE.md", "instructions", "always"),
    ("claude-code", "project", ".claude/rules/**/*.md", "rules", "conditional"),
    ("claude-code", "project", ".claude/output-styles/*.md", "output-style", "conditional"),
    ("claude-code", "project", ".claude/agents/*.md", "agent", "on-demand"),
    ("claude-code", "project", ".claude/skills/*/SKILL.md", "skill", "on-demand"),
    ("claude-code", "project", ".claude/commands/**/*.md", "command", "on-demand"),
    ("claude-code", "project", ".claude/settings.json", "settings", "config"),
    ("claude-code", "local", ".claude/settings.local.json", "settings", "config"),
    ("claude-code", "project", ".mcp.json", "settings", "config"),
    ("codex-cli", "project", ".codex/config.toml", "settings", "config"),
    ("codex-cli", "project", ".agents/skills/*/SKILL.md", "skill", "on-demand"),
    ("gemini-cli", "project", ".gemini/system.md", "system-prompt", "conditional"),
    ("gemini-cli", "project", ".gemini/settings.json", "settings", "config"),
    ("gemini-cli", "project", ".gemini/commands/**/*.toml", "command", "on-demand"),
    ("copilot", "project", ".github/copilot-instructions.md", "instructions", "always"),
    ("copilot", "project", ".github/instructions/**/*.instructions.md", "instructions", "conditional"),
    ("copilot", "project", ".github/prompts/**/*.prompt.md", "command", "on-demand"),
    ("copilot", "project", ".github/chatmodes/**/*.md", "agent", "on-demand"),
    ("copilot", "project", ".github/agents/**/*.md", "agent", "on-demand"),
    ("copilot-cli", "project", ".github/skills/*/SKILL.md", "skill", "on-demand"),
    ("copilot-cli", "project", ".github/hooks/*.json", "hooks", "config"),
    ("copilot-vscode", "project", ".vscode/settings.json", "settings", "config"),
    ("cursor", "project", ".cursorrules", "instructions", "always"),
    ("cursor", "project", ".cursor/rules/**/*.mdc", "rules", "conditional"),
    ("cursor", "project", ".cursor/rules/**/*.md", "rules", "conditional"),
    ("windsurf", "project", ".windsurfrules", "instructions", "always"),
    ("windsurf", "project", ".windsurf/rules/**/*.md", "rules", "conditional"),
    ("windsurf", "project", ".windsurf/workflows/**/*.md", "command", "on-demand"),
]

_LOADING_BY_REGISTRY = {"yes": "always", "conditional": "conditional", "partial": "on-demand", "on-demand": "on-demand"}
_SCOPE_BY_REGISTRY = {"global": "user", "project": "project", "parent": "parent-dir", "session": "memory"}


def _collect_registry(inv: _Inventory) -> None:
    """Add the path tables' rows that reach the model. The tables stay the source of names."""
    for spec in get_registry().path_specs():
        if spec.ai_tool not in AUDITED_TOOLS:
            continue
        loading = _LOADING_BY_REGISTRY.get(spec.sent_to_llm.lower())
        if loading is None:
            continue
        template = spec.path_template
        if "{parent}" in template or "{subdirectory}" in template or spec.resolution == "shadow":
            continue  # the walk-up, walk-down and memory collectors cover these
        template = template.replace("{project-root}", str(inv.project)).replace("{vscode-user}", str(vscode_user_dir()))
        pattern = _params_to_glob(_expand_home(template))
        kind = {"agent": "agent", "skills": "skill", "commands": "command"}.get(spec.category, spec.category)
        # Agents and skills cost only a description until they are invoked.
        effective = "on-demand" if kind in ("agent", "skill") else loading
        scope = "memory" if spec.category == "memory" else _SCOPE_BY_REGISTRY.get(spec.scope, "user")
        if template.endswith("/"):
            pattern = pattern + "**/*.md"
        hits = 0
        for hit in glob.iglob(pattern, recursive=True):
            inv.add(spec.ai_tool, scope, hit, kind, effective, origin="registry")
            hits += 1
            if hits >= MAX_GLOB_HITS:
                break


def _collect_static(inv: _Inventory) -> None:
    for tool, scope, pattern, kind, loading in _USER_PATTERNS:
        inv.add_glob(tool, scope, pattern, kind, loading)
    for base in _MANAGED_DIRS:
        inv.add("claude-code", "managed", f"{base}/CLAUDE.md", "instructions", "always")
        inv.add_glob("claude-code", "managed", f"{base}/.claude/rules/**/*.md", "rules", "conditional")
        inv.add("claude-code", "managed", f"{base}/managed-settings.json", "settings", "config")
        inv.add("claude-code", "managed", f"{base}/managed-mcp.json", "settings", "config")
    inv.add("gemini-cli", "managed", "/Library/Application Support/GeminiCli/settings.json", "settings", "config")
    for tool, scope, pattern, kind, loading in _PROJECT_PATTERNS:
        inv.add_glob(tool, scope, str(inv.project / pattern), kind, loading)


def _project_memory_dir(project: Path) -> Path | None:
    encoded = re.sub(r"[^A-Za-z0-9-]", "-", str(project))
    candidate = claude_global_dir() / "projects" / encoded
    if candidate.is_dir():
        return candidate
    from .memory import _find_project_dir

    return _find_project_dir(project)


def _collect_claude_memory(inv: _Inventory) -> None:
    proj = _project_memory_dir(inv.project)
    if not proj:
        return
    inv.add("claude-code", "memory", proj / "memory" / "MEMORY.md", "memory", "always")
    inv.add_glob("claude-code", "memory", str(proj / "memory" / "**" / "*.md"), "memory", "on-demand")


def _gemini_context_names(project: Path) -> list[str]:
    names = ["GEMINI.md"]
    for path in (Path.home() / ".gemini" / "settings.json", project / ".gemini" / "settings.json"):
        cfg = _read_json(path)
        ctx = cfg.get("context")
        raw = cfg.get("contextFileName") or (ctx.get("fileName") if isinstance(ctx, dict) else None)
        if isinstance(raw, str):
            names.append(raw)
        elif isinstance(raw, list):
            names.extend(str(n) for n in raw)
    return sorted({Path(n).name for n in names})


def _codex_doc_names() -> list[str]:
    names = ["AGENTS.override.md", "AGENTS.md"]
    raw = _read_toml_flat(Path.home() / ".codex" / "config.toml").get("project_doc_fallback_filenames", "")
    names.extend(re.findall(r"[\w.-]+\.\w+", raw))
    return names


def _collect_walks(inv: _Inventory) -> None:
    """Walk up for parent-dir sources, then down for sources loaded when work enters a subdir."""
    project = inv.project
    repo = _repo_root(project)
    gemini_names = _gemini_context_names(project)
    codex_names = _codex_doc_names()
    for name in ("CLAUDE.md", "AGENTS.md"):
        inv.add("claude-code", "project", project / name, "instructions", "always")
    inv.add("claude-code", "local", project / "CLAUDE.local.md", "instructions", "always")
    inv.add("copilot-cli", "project", project / "AGENTS.md", "instructions", "always")
    inv.add("cursor", "project", project / "AGENTS.md", "instructions", "always")
    for name in codex_names:
        inv.add("codex-cli", "project", project / name, "instructions", "always")
    for name in gemini_names:
        inv.add("gemini-cli", "project", project / name, "instructions", "always")
    # Claude Code loads every ancestor up to the filesystem root.
    for d in _ancestors(project, None):
        for name in ("CLAUDE.md", "CLAUDE.local.md", "AGENTS.md", ".claude/CLAUDE.md"):
            inv.add("claude-code", "parent-dir", d / name, "instructions", "always")
        if d != Path.home():
            inv.add_glob("claude-code", "parent-dir", str(d / ".claude" / "rules" / "**" / "*.md"), "rules", "conditional")
    # Codex and Gemini stop at the repository root.
    if repo is not None and repo != project:
        for d in _ancestors(project, repo):
            for name in codex_names:
                inv.add("codex-cli", "parent-dir", d / name, "instructions", "always")
            for name in gemini_names:
                inv.add("gemini-cli", "parent-dir", d / name, "instructions", "always")
    _walk_down(inv, gemini_names, codex_names)


def _walk_down(inv: _Inventory, gemini_names: list[str], codex_names: list[str]) -> None:
    seen = 0
    for dirpath, dirnames, filenames in os.walk(inv.project):
        seen += 1
        here = Path(dirpath)
        if here != inv.project:
            names = set(filenames)
            if "CLAUDE.md" in names:
                inv.add("claude-code", "project", here / "CLAUDE.md", "instructions", "conditional")
            if "CLAUDE.local.md" in names:
                inv.add("claude-code", "local", here / "CLAUDE.local.md", "instructions", "conditional")
            if "AGENTS.md" in names:
                inv.add("claude-code", "project", here / "AGENTS.md", "instructions", "conditional")
                inv.add("cursor", "project", here / "AGENTS.md", "instructions", "conditional")
            for name in codex_names:
                if name in names:
                    inv.add("codex-cli", "project", here / name, "instructions", "conditional")
            for name in gemini_names:
                if name in names:
                    inv.add("gemini-cli", "project", here / name, "instructions", "conditional")
            if ".cursor" in dirnames:
                for ext in ("md", "mdc"):
                    inv.add_glob("cursor", "project", str(here / ".cursor" / "rules" / "**" / f"*.{ext}"), "rules", "conditional")
            if ".claude" in dirnames:
                inv.add_glob("claude-code", "project", str(here / ".claude" / "rules" / "**" / "*.md"), "rules", "conditional")
        dirnames[:] = [d for d in dirnames if d not in PRUNE_DIRS and not d.startswith(".")]
        if seen >= MAX_WALK_DIRS:
            dirnames[:] = []
            inv.rows[("aictl", "walk-capped")] = Source(
                tool="aictl",
                scope="dynamic",
                path=str(inv.project),
                kind="note",
                loading="dynamic",
                readable=False,
                transient=True,
                note=f"Tree walk stopped after {MAX_WALK_DIRS} directories",
            )
            break


def _enabled_plugin_paths() -> list[tuple[str, Path]]:
    installed = _read_json(claude_global_dir() / "plugins" / "installed_plugins.json")
    enabled = _read_json(claude_global_dir() / "settings.json").get("enabledPlugins") or {}
    out = []
    plugins = installed.get("plugins") or {}
    if not isinstance(plugins, dict):
        return out
    for name, entries in plugins.items():
        if isinstance(enabled, dict) and enabled.get(name) is False:
            continue
        for entry in entries if isinstance(entries, list) else []:
            install = entry.get("installPath") if isinstance(entry, dict) else None
            if install:
                out.append((name, Path(install)))
    return out


def _collect_plugins(inv: _Inventory) -> list[tuple[str, Path]]:
    plugins = _enabled_plugin_paths()
    for name, root in plugins:
        origin = f"plugin:{name}"
        for pattern, kind, loading in (
            ("skills/*/SKILL.md", "skill", "on-demand"),
            ("agents/*.md", "agent", "on-demand"),
            ("commands/**/*.md", "command", "on-demand"),
            ("output-styles/*.md", "output-style", "conditional"),
            ("hooks/hooks.json", "hooks", "config"),
            (".mcp.json", "settings", "config"),
            ("CLAUDE.md", "instructions", "conditional"),
        ):
            inv.add_glob("claude-code", "plugin", str(root / pattern), kind, loading, origin)
    return plugins


def _collect_vscode(inv: _Inventory, findings: list[Finding]) -> None:
    settings_path = vscode_user_dir() / "settings.json"
    inv.add("copilot-vscode", "user", settings_path, "settings", "config")
    inv.add_glob("copilot-vscode", "user", str(vscode_user_dir() / "prompts" / "*.md"), "command", "on-demand")
    for path, scope in ((settings_path, "user"), (inv.project / ".vscode" / "settings.json", "project")):
        cfg = _read_json(path)
        if not cfg:
            continue
        for key in ("chat.instructionsFilesLocations", "chat.promptFilesLocations", "chat.modeFilesLocations", "chat.agentFilesLocations"):
            locations = cfg.get(key)
            if not isinstance(locations, dict):
                continue
            for loc, on in locations.items():
                if on is False:
                    continue
                base = Path(_expand_home(str(loc)))
                if not base.is_absolute():
                    base = inv.project / base
                inv.add_glob("copilot-vscode", scope, str(base / "**" / "*.md"), "instructions", "conditional", origin=key)
        for key, value in cfg.items():
            if not (key.startswith("github.copilot.chat.") and key.endswith("instructions")) or not isinstance(value, list):
                continue
            for item in value:
                if not isinstance(item, dict):
                    continue
                if item.get("file"):
                    target = Path(str(item["file"]))
                    inv.add("copilot-vscode", scope, target if target.is_absolute() else inv.project / target, "instructions", "always", origin=key)
                elif item.get("text"):
                    text = str(item["text"])
                    label = f"{path}#{key}"
                    inv.dynamic("copilot-vscode", label, "inline-instructions", "Inline instruction text in settings", text=text)
                    _emit_hits(findings, "copilot-vscode", label, scan_text(text))
        advanced = cfg.get("github.copilot.advanced")
        if isinstance(advanced, dict):
            for key in ("debug.overrideProxyUrl", "debug.overrideCAPIUrl", "authProvider"):
                if advanced.get(key):
                    _url_finding(inv, findings, "copilot-vscode", f"{path}#github.copilot.advanced.{key}", str(advanced[key]))


def _collect_imports(inv: _Inventory, findings: list[Finding]) -> None:
    """Follow ``@imports`` transitively from every Claude Code markdown source."""
    queue = [r for (t, _), r in inv.rows.items() if t == "claude-code" and r.path.endswith(".md") and r.kind in ("instructions", "rules", "memory")]
    seen = {r.path for r in queue}
    depth = 0
    while queue and depth < 5:
        next_queue: list[Source] = []
        for row in queue:
            facts = _file_facts(Path(row.path), config=False)
            for raw in (facts or {}).get("imports", []):
                if raw.startswith("~/"):
                    target = Path(_expand_home(raw))
                elif raw.startswith("/"):
                    target = Path(raw)
                else:
                    target = Path(row.path).parent / raw
                try:
                    target = target.resolve()
                except OSError:
                    continue
                if str(target) in seen or not target.is_file():
                    continue
                seen.add(str(target))
                inside = target.is_relative_to(inv.project)
                inv.add("claude-code", "project" if inside else "user", target, "import", row.loading, origin=f"import:{row.path}")
                added = inv.rows.get(("claude-code", str(target)))
                if added:
                    next_queue.append(added)
                if not inside and row.scope in ("project", "local") and not target.is_relative_to(Path.home() / ".claude"):
                    findings.append(
                        Finding(
                            rule="source.import-outside-project",
                            severity="low",
                            tool="claude-code",
                            path=row.path,
                            snippet=_snippet(str(target)),
                            why="A project source imports a file from outside the project",
                            action="Confirm the imported file is meant to reach this project's sessions.",
                        )
                    )
        queue = next_queue
        depth += 1


# ─── Layer 2: dynamic and out-of-band injection ──────────────────


def _url_finding(inv: _Inventory, findings: list[Finding], tool: str, label: str, value: str) -> None:
    host = _host_of(value)
    note = f"API traffic target, host {host or 'unknown'}"
    inv.dynamic(tool, label, "api-redirect", note)
    if host in _OFFICIAL_API_HOSTS:
        return
    loopback = host in _LOOPBACK_HOSTS or host.endswith(".localhost")
    findings.append(
        Finding(
            rule="dynamic.base-url-loopback" if loopback else "dynamic.base-url-redirect",
            severity="medium" if loopback else "high",
            tool=tool,
            path=label,
            snippet=f"host={host or 'unknown'}",
            why="Prompts and responses go through this host, and it can change them. No file shows what it adds."
            if not loopback
            else "API traffic goes through a local proxy, which can change prompts and responses.",
            action="Confirm you run this proxy on purpose. Remove the setting if you do not.",
        )
    )


_ENV_RULES = {
    "CLAUDE_CONFIG_DIR": ("dynamic.config-dir-override", "medium", "Moves where Claude Code reads its settings and instructions"),
    "CODEX_HOME": ("dynamic.config-dir-override", "medium", "Moves where Codex reads its settings and instructions"),
    "GEMINI_CLI_SYSTEM_SETTINGS_PATH": ("dynamic.config-dir-override", "medium", "Replaces Gemini's system settings file"),
    "GEMINI_CLI_SYSTEM_DEFAULTS_PATH": ("dynamic.config-dir-override", "medium", "Replaces Gemini's system defaults file"),
    "ANTHROPIC_CUSTOM_HEADERS": ("dynamic.custom-headers", "medium", "Adds headers to every API request"),
    "CLAUDE_CODE_EXTRA_BODY": ("dynamic.custom-headers", "medium", "Adds fields to every API request body"),
}


def _is_base_url_var(name: str) -> bool:
    return name.endswith("_BASE_URL") or name in ("OPENAI_API_BASE", "COPILOT_API_URL", "ANTHROPIC_API_URL")


def _collect_env(inv: _Inventory, findings: list[Finding], env: dict[str, str], origin: str, tool: str = "env") -> None:
    for name, value in env.items():
        value = str(value)
        label = f"{origin}:{name}"
        if _is_base_url_var(name) and value:
            _url_finding(inv, findings, tool, label, value)
        elif name == "GEMINI_SYSTEM_MD" and value.lower() not in ("", "0", "false"):
            target = Path.home() / ".gemini" / "system.md" if value.lower() in ("1", "true") else Path(_expand_home(value))
            inv.dynamic("gemini-cli", label, "system-prompt", f"Replaces Gemini's system prompt with {target}")
            inv.add("gemini-cli", "user", target, "system-prompt", "always", origin=label)
            findings.append(
                Finding(
                    rule="dynamic.system-prompt-replacement",
                    severity="high",
                    tool="gemini-cli",
                    path=label,
                    snippet=_snippet(str(target)),
                    why="GEMINI_SYSTEM_MD replaces the built-in system prompt in full",
                    action="Read the replacement file, and unset the variable if you did not set it.",
                )
            )
        elif name in _ENV_RULES and value:
            rule, severity, why = _ENV_RULES[name]
            inv.dynamic(tool, label, "env", why)
            findings.append(Finding(rule=rule, severity=severity, tool=tool, path=label, snippet=f"{name}=<set>", why=why, action="Confirm you set this on purpose."))
        elif name.startswith("ANTHROPIC_") and value:
            inv.dynamic(tool, label, "env", "Set; value not shown")


def _hook_entries(hooks: object) -> list[tuple[str, str, str]]:
    """Flatten any tool's hooks block to (event, kind, text). Parsed only, never run."""
    out: list[tuple[str, str, str]] = []
    if not isinstance(hooks, dict):
        return out

    def walk(event: str, node: object) -> None:
        if isinstance(node, list):
            for item in node:
                walk(event, item)
        elif isinstance(node, dict):
            for key in ("command", "bash", "powershell"):
                if isinstance(node.get(key), str):
                    out.append((event, "command", node[key]))
            if isinstance(node.get("prompt"), str):
                out.append((event, "prompt", node["prompt"]))
            if "hooks" in node:
                walk(event, node["hooks"])

    for event, node in hooks.items():
        walk(str(event), node)
    return out


def _collect_hooks_from(inv: _Inventory, findings: list[Finding], tool: str, path: Path, scope: str) -> None:
    cfg = _read_json(path)
    for event, kind, text in _hook_entries(cfg.get("hooks")):
        lowered = event.lower()
        digest = hashlib.sha256(text.encode()).hexdigest()[:10]
        label = f"{path}#hooks.{event}.{digest}"
        enters = lowered in _CONTEXT_HOOK_EVENTS
        may_enter = lowered in _TOOL_HOOK_EVENTS
        shown = _snippet(text)
        if kind == "prompt":
            inv.dynamic(tool, label, "hook-prompt", f"Prompt hook on {event}: the prompt text reaches a model", text=text)
            _emit_hits(findings, tool, label, scan_text(text))
        elif enters or may_enter:
            note = f"{event} hook: its stdout enters context at runtime, and no file shows it. Command: {shown}"
            if may_enter:
                note = f"{event} hook: can add context through additionalContext at runtime. Command: {shown}"
            inv.dynamic(tool, label, "hook", note, text=text)
        if enters and kind == "command":
            findings.append(
                Finding(
                    rule="dynamic.hook-stdout",
                    severity="low" if scope == "project" else "info",
                    tool=tool,
                    path=label,
                    snippet=shown,
                    why=f"{event} hook output enters the model's context, and no file shows it",
                    action="Read the script behind this command to see what it adds.",
                )
            )
        if kind == "command":
            hits: dict[str, list[dict]] = {}
            _scan_exfil_line(0, text, False, hits)
            for rule, entries in hits.items():
                for entry in entries:
                    findings.append(
                        Finding(
                            rule=rule,
                            severity=entry["severity"],
                            tool=tool,
                            path=label,
                            snippet=entry["snippet"],
                            why=entry["why"],
                            action=_ACTIONS.get(rule, ""),
                        )
                    )


def _collect_settings_overrides(inv: _Inventory, findings: list[Finding], tool: str, path: Path) -> None:
    cfg = _read_json(path)
    env_block = cfg.get("env")
    if isinstance(env_block, dict):
        _collect_env(inv, findings, {str(k): str(v) for k, v in env_block.items()}, str(path), tool)
    for key in ("apiKeyHelper", "awsCredentialExport", "awsAuthRefresh", "otelHeadersHelper"):
        if cfg.get(key):
            label = f"{path}#{key}"
            inv.dynamic(tool, label, "helper-command", f"{key} runs a command the tool trusts. Command not shown.")
            findings.append(
                Finding(
                    rule="dynamic.credential-helper",
                    severity="medium",
                    tool=tool,
                    path=label,
                    snippet=f"{key}=<set>",
                    why=f"{key} runs a command that supplies credentials or headers to the tool",
                    action="Read the command in this settings file and confirm you added it.",
                )
            )


def _collect_codex_overrides(inv: _Inventory, findings: list[Finding], path: Path) -> None:
    flat = _read_toml_flat(path)
    for key, value in flat.items():
        short = key.rsplit(".", 1)[-1]
        label = f"{path}#{key}"
        if short in ("model_instructions_file", "experimental_instructions_file"):
            target = Path(_expand_home(value))
            if not target.is_absolute():
                target = path.parent / target
            inv.dynamic("codex-cli", label, "system-prompt", f"Replaces Codex's built-in instructions with {target}")
            inv.add("codex-cli", "user", target, "system-prompt", "always", origin=label)
            findings.append(
                Finding(
                    rule="dynamic.system-prompt-replacement",
                    severity="high",
                    tool="codex-cli",
                    path=label,
                    snippet=_snippet(str(target)),
                    why=f"{short} replaces the built-in instructions in full",
                    action="Read the replacement file, and remove the key if you did not add it.",
                )
            )
        elif short == "experimental_compact_prompt_file":
            target = Path(_expand_home(value))
            inv.dynamic("codex-cli", label, "compact-prompt", f"Replaces the compaction prompt with {target}")
            inv.add("codex-cli", "user", target, "system-prompt", "conditional", origin=label)
        elif short == "developer_instructions":
            inv.dynamic("codex-cli", label, "inline-instructions", "Inline developer instructions in config", text=value)
            _emit_hits(findings, "codex-cli", label, scan_text(value))
        elif short in ("base_url", "openai_base_url", "chatgpt_base_url"):
            _url_finding(inv, findings, "codex-cli", label, value)


_PROCESS_TOOLS = re.compile(r"(^|/)(claude|codex|gemini|copilot|cursor-agent|windsurf)(\s|$)|claude-code/cli|@anthropic-ai/claude|@openai/codex|@google/gemini-cli|@github/copilot")
_PROCESS_FLAG_RE = re.compile(r"(?:^|\s)(--(?:append-)?system-prompt(?:-file)?)(?:[ =])(\S*)")


def _collect_processes(inv: _Inventory, findings: list[Finding], ps_output: str | None) -> None:
    """Read flags from live command lines. Flag names and sizes only, never the values."""
    if ps_output is None:
        try:
            ps_output = subprocess.run(["ps", "-axo", "pid=,command="], capture_output=True, text=True, timeout=3, check=False).stdout  # noqa: S607
        except (OSError, subprocess.SubprocessError):
            return
    seen: set[str] = set()
    for line in ps_output.splitlines():
        if "system-prompt" not in line or not _PROCESS_TOOLS.search(line):
            continue
        parts = line.strip().split(None, 1)
        pid = parts[0] if parts else "?"
        for flag, value in _PROCESS_FLAG_RE.findall(line):
            if flag in seen:
                continue
            seen.add(flag)
            replacement = not flag.startswith("--append")
            label = f"process:{pid}:{flag}"
            is_file = flag.endswith("-file")
            detail = f"file {_snippet(value)}" if is_file else "inline value, not shown"
            note = f"Live process {pid} passes {flag} ({detail}). This text is not in any config file."
            inv.dynamic("process", label, "cli-flag", note, transient=True)
            if is_file:
                inv.add("process", "dynamic", value, "system-prompt", "always", origin=label)
            findings.append(
                Finding(
                    rule="dynamic.cli-system-prompt" if replacement else "dynamic.cli-append-prompt",
                    severity="high" if replacement else "medium",
                    tool="process",
                    path=label,
                    snippet=f"pid={pid} {flag}",
                    why="This flag replaces the system prompt for this session" if replacement else "This flag adds to the system prompt for this session",
                    action="Check what started this process. Editor and SDK hosts pass these flags normally.",
                )
            )


def _collect_dynamic(inv: _Inventory, findings: list[Finding], env: dict[str, str], plugins: list[tuple[str, Path]], ps_output: str | None) -> None:
    project = inv.project
    claude_home = claude_global_dir()
    settings = [
        (claude_home / "settings.json", "user"),
        (claude_home / "settings.local.json", "user"),
        (project / ".claude" / "settings.json", "project"),
        (project / ".claude" / "settings.local.json", "project"),
    ]
    settings += [(Path(base) / "managed-settings.json", "managed") for base in _MANAGED_DIRS]
    for path, scope in settings:
        if path.is_file():
            _collect_hooks_from(inv, findings, "claude-code", path, scope)
            _collect_settings_overrides(inv, findings, "claude-code", path)
    for _name, root in plugins:
        path = root / "hooks" / "hooks.json"
        if path.is_file():
            _collect_hooks_from(inv, findings, "claude-code", path, "plugin")
    for path in sorted(glob.glob(str(Path.home() / ".copilot" / "hooks" / "*.json"))):
        _collect_hooks_from(inv, findings, "copilot-cli", Path(path), "user")
    for path in sorted(glob.glob(str(project / ".github" / "hooks" / "*.json"))):
        _collect_hooks_from(inv, findings, "copilot-cli", Path(path), "project")
    for path, scope in ((Path.home() / ".gemini" / "settings.json", "user"), (project / ".gemini" / "settings.json", "project")):
        if path.is_file():
            _collect_hooks_from(inv, findings, "gemini-cli", path, scope)
    for path in (Path.home() / ".codex" / "config.toml", project / ".codex" / "config.toml"):
        if path.is_file():
            _collect_codex_overrides(inv, findings, path)
    _collect_env(inv, findings, env, "env")
    _collect_processes(inv, findings, ps_output)


# ─── Tool transcripts, read-only ──────────────────────────────────

_WRITE_TOOLS = {"Write", "Edit", "MultiEdit", "NotebookEdit"}
_BASH_WRITE_RE = re.compile(r"(?:>>?|\btee\s+(?:-a\s+)?)\s*[\"']?([^\s\"'|;&]+)")
_TRANSCRIPT_CACHE: dict[str, tuple[int, int, dict]] = {}


def _epoch(raw: object) -> float:
    if isinstance(raw, (int, float)):
        return float(raw)
    if isinstance(raw, str):
        with contextlib.suppress(ValueError):
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
    return 0.0


def _parse_transcript(path: Path) -> dict:
    """Pull facts from one Claude Code transcript. Text is scanned, never kept beyond a snippet."""
    st = path.stat()
    cached = _TRANSCRIPT_CACHE.get(str(path))
    if cached and cached[0] == st.st_mtime_ns and cached[1] == st.st_size:
        return cached[2]
    facts: dict = {"session_id": path.stem, "first_tokens": 0, "loaded": [], "blocks": {}, "writes": []}
    with path.open("rb") as fh:
        if st.st_size > TRANSCRIPT_MAX_BYTES:
            fh.seek(st.st_size - TRANSCRIPT_MAX_BYTES)
            fh.readline()
        for raw in fh:
            _parse_transcript_line(raw, facts)
    _TRANSCRIPT_CACHE[str(path)] = (st.st_mtime_ns, st.st_size, facts)
    return facts


def _parse_transcript_line(raw: bytes, facts: dict) -> None:
    interesting = b'"attachment"' in raw or b'"tool_use"' in raw or (not facts["first_tokens"] and b'"usage"' in raw)
    if not interesting:
        return
    try:
        obj = json.loads(raw)
    except ValueError:
        return
    kind = obj.get("type")
    if kind == "attachment":
        _parse_attachment(obj.get("attachment") or {}, facts)
    elif kind == "assistant":
        message = obj.get("message") or {}
        usage = message.get("usage") or {}
        if not facts["first_tokens"] and not obj.get("isSidechain") and usage:
            facts["first_tokens"] = int(usage.get("input_tokens") or 0) + int(usage.get("cache_creation_input_tokens") or 0) + int(usage.get("cache_read_input_tokens") or 0)
        content = message.get("content")
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    _parse_tool_use(block, obj, facts)


def _parse_attachment(att: dict, facts: dict) -> None:
    kind = att.get("type")
    if kind in ("nested_memory", "memory", "claude_md") and att.get("path"):
        facts["loaded"].append(str(att["path"]))
    elif kind == "mcp_instructions_delta":
        names = att.get("addedNames") or []
        blocks = att.get("addedBlocks") or []
        for index, block in enumerate(blocks):
            name = names[index] if index < len(names) else f"server-{index}"
            text = block if isinstance(block, str) else json.dumps(block)
            facts["blocks"][f"mcp:{name}"] = _block_facts(text)
    elif kind == "hook_additional_context":
        content = att.get("content")
        text = content if isinstance(content, str) else json.dumps(content)
        facts["blocks"][f"hook:{att.get('hookEvent')}:{att.get('hookName')}"] = _block_facts(text)


def _block_facts(text: str) -> dict:
    return {
        "bytes": len(text.encode("utf-8", errors="replace")),
        "est_tokens": _est_tokens(len(text)),
        "sha256": hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest(),
        "hits": scan_text(text),
    }


def _parse_tool_use(block: dict, obj: dict, facts: dict) -> None:
    name = block.get("name")
    args = block.get("input") or {}
    ts = _epoch(obj.get("timestamp"))
    session = str(obj.get("sessionId") or facts["session_id"])
    if name in _WRITE_TOOLS and args.get("file_path"):
        target = str(args["file_path"])
        if not target.startswith("/") and obj.get("cwd"):
            target = str(Path(obj["cwd"]) / target)
        facts["writes"].append({"path": target, "ts": ts, "session_id": session, "via": name})
    elif name == "Bash" and isinstance(args.get("command"), str) and (">" in args["command"] or "tee " in args["command"]):
        for target in _BASH_WRITE_RE.findall(args["command"]):
            if target.startswith("~/"):
                target = _expand_home(target)
            elif not target.startswith("/") and obj.get("cwd"):
                target = str(Path(obj["cwd"]) / target)
            if target.endswith((".md", ".mdc", ".json", ".toml", ".cursorrules", ".windsurfrules")):
                facts["writes"].append({"path": target, "ts": ts, "session_id": session, "via": "Bash"})


def _claude_transcripts(project: Path) -> list[dict]:
    encoded = re.sub(r"[^A-Za-z0-9-]", "-", str(project))
    base = claude_global_dir() / "projects" / encoded
    if not base.is_dir():
        return []
    out = []
    # Subagent transcripts are sidechains: they add writes, not first-request usage.
    for pattern, limit in (("*.jsonl", TRANSCRIPT_FILES), ("*/subagents/*.jsonl", TRANSCRIPT_FILES * 3)):
        files = []
        for hit in base.glob(pattern):
            with contextlib.suppress(OSError):
                files.append((hit.stat().st_mtime, hit))
        files.sort(reverse=True)
        for _mtime, path in files[:limit]:
            with contextlib.suppress(OSError):
                out.append(_parse_transcript(path))
    return out


def _db_rows(sql: str, params: tuple) -> list[sqlite3.Row]:
    """Query history.db read-only when it exists. No DB is a normal state."""
    path = config_dir() / "history.db"
    if not path.is_file():
        return []
    # A read-only WAL connection can create the -shm file when none exists, so
    # it opens immutable unless a live writer already made one.
    query = "mode=ro" if Path(f"{path}-shm").exists() else "immutable=1"
    try:
        conn = sqlite3.connect(f"file:{path}?{query}", uri=True, timeout=0.5)
    except sqlite3.Error:
        return []
    try:
        conn.row_factory = sqlite3.Row
        return conn.execute(sql, params).fetchall()
    except sqlite3.Error:
        return []
    finally:
        conn.close()


def _db_writes(since: float) -> list[dict]:
    rows = _db_rows("SELECT ts, session_id, tool, tool_name, path FROM file_write_events WHERE ts >= ? ORDER BY ts DESC LIMIT 2000", (since,))
    return [{"path": r["path"], "ts": r["ts"], "session_id": r["session_id"], "via": r["tool_name"] or r["tool"]} for r in rows]


def _db_loaded_paths() -> list[str]:
    rows = _db_rows("SELECT detail FROM events WHERE kind = 'hook:InstructionsLoaded' ORDER BY ts DESC LIMIT 500", ())
    out = []
    for row in rows:
        try:
            detail = json.loads(row["detail"] or "{}")
        except (ValueError, TypeError):
            continue
        for key in ("file_path", "path"):
            value = detail.get(key) if isinstance(detail, dict) else None
            if value:
                out.append(str(value))
    return out


# ─── Layer 3: baseline and drift ──────────────────────────────────

_MEMORY_BASELINE: dict | None = None


def capture_mode() -> str:
    """Read ``[storage] capture`` tolerantly. A missing key means full."""
    return _read_toml_flat(config_dir() / "config.toml").get("storage.capture", "full").lower()


def baseline_path(override: str | Path | None = None) -> Path:
    return Path(override).expanduser() if override else config_dir() / BASELINE_FILENAME


def _load_baseline(mode: str, override: str | Path | None = None) -> dict:
    if mode == "off" and not override:
        return _MEMORY_BASELINE if _MEMORY_BASELINE is not None else {"version": 1, "projects": {}, "events": []}
    data = _read_json_any(baseline_path(override))
    if not isinstance(data.get("projects"), dict):
        return {"version": 1, "projects": {}, "events": []}
    data.setdefault("events", [])
    return data


def _read_json_any(path: Path) -> dict:
    try:
        if path.stat().st_size > MAX_BASELINE_BYTES * 2:
            return {}
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _save_baseline(data: dict, mode: str, override: str | Path | None = None) -> None:
    global _MEMORY_BASELINE
    data["events"] = data.get("events", [])[-MAX_DRIFT_EVENTS:]
    if mode == "off" and not override:
        _MEMORY_BASELINE = data
        return
    body = json.dumps(data, separators=(",", ":"))
    # Over the cap, shed the oldest events and then the least recently scanned projects.
    while len(body) > MAX_BASELINE_BYTES and data["events"]:
        data["events"] = data["events"][len(data["events"]) // 2 + 1 :]
        body = json.dumps(data, separators=(",", ":"))
    while len(body) > MAX_BASELINE_BYTES and len(data["projects"]) > 1:
        oldest = min(data["projects"], key=lambda k: data["projects"][k].get("scanned_at", 0))
        del data["projects"][oldest]
        body = json.dumps(data, separators=(",", ":"))
    if len(body) > MAX_BASELINE_BYTES:
        return
    path = baseline_path(override)
    tmp = ""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".context-baseline.", suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(body)
        os.replace(tmp, path)
    except OSError:
        with contextlib.suppress(OSError):
            os.unlink(tmp)


def _baseline_entries(sources: list[Source]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for s in sources:
        if s.transient:
            continue
        entry = out.get(s.path)
        if entry is None:
            out[s.path] = {"sha256": s.sha256, "bytes": s.bytes, "tool": s.tool, "scope": s.scope, "loading": s.loading, "kind": s.kind}
        elif _RANK.get(s.loading, 9) < _RANK.get(entry["loading"], 9):
            entry["loading"] = s.loading
    return out


def _drift(project_entry: dict | None, current: dict[str, dict]) -> dict:
    if project_entry is None:
        return {"baseline_at": None, "baseline_created": True, "new": [], "changed": [], "removed": []}
    old = project_entry.get("sources", {})
    new, changed, removed = [], [], []
    for path, entry in current.items():
        if path not in old:
            new.append({"path": path, **entry})
        elif old[path].get("sha256") != entry["sha256"]:
            changed.append({"path": path, "old_sha256": old[path].get("sha256"), "old_bytes": old[path].get("bytes"), **entry})
    for path, entry in old.items():
        if path not in current:
            removed.append({"path": path, **entry})
    return {"baseline_at": project_entry.get("scanned_at"), "baseline_created": False, "new": new, "changed": changed, "removed": removed}


def _drift_findings(drift: dict, findings: list[Finding]) -> None:
    for row in drift["new"]:
        strong = row["loading"] == "always"
        findings.append(
            Finding(
                rule="drift.new-source",
                severity="medium" if strong else "low",
                tool=row["tool"],
                path=row["path"],
                snippet=f"{row['bytes']} bytes, {row['loading']}, {row['scope']}",
                why="This source was not in the baseline",
                action="Read it, then run aictl ctx audit --update-baseline to accept it.",
            )
        )
    for row in drift["changed"]:
        findings.append(
            Finding(
                rule="drift.changed-source",
                severity="low",
                tool=row["tool"],
                path=row["path"],
                snippet=f"{row['old_bytes']} -> {row['bytes']} bytes, {row['loading']}",
                why="The content changed since the baseline",
                action="Review the change, then run aictl ctx audit --update-baseline to accept it.",
            )
        )
    for row in drift["removed"]:
        findings.append(
            Finding(
                rule="drift.removed-source",
                severity="info",
                tool=row["tool"],
                path=row["path"],
                snippet=f"{row['bytes']} bytes, {row['loading']}",
                why="This source was in the baseline and is gone",
                action="Confirm the removal was intended.",
            )
        )


def _record_events(baseline: dict, drift: dict, agent_writes: list[dict], now: float, project: str) -> None:
    seen = {(e.get("kind"), e.get("path"), e.get("sha256"), e.get("session_id")) for e in baseline["events"]}
    for kind in ("new", "changed", "removed"):
        for row in drift[kind]:
            key = (kind, row["path"], row.get("sha256"), "")
            if key not in seen:
                seen.add(key)
                baseline["events"].append(
                    {"ts": now, "project": project, "kind": kind, "path": row["path"], "tool": row.get("tool"), "loading": row.get("loading"), "sha256": row.get("sha256"), "session_id": ""}
                )
    for write in agent_writes:
        key = ("agent-write", write["path"], None, write["session_id"])
        if key not in seen:
            seen.add(key)
            baseline["events"].append(
                {"ts": write["ts"] or now, "project": project, "kind": "agent-write", "path": write["path"], "tool": write.get("tool"), "loading": write.get("loading"), "sha256": None, "session_id": write["session_id"], "via": write.get("via")}
            )


def _agent_writes(writes: list[dict], sources: list[Source], baseline_at: float | None, findings: list[Finding], now: float) -> list[dict]:
    """Match tool-call writes to inventoried sources. After the baseline, these are the key signal."""
    by_path: dict[str, Source] = {}
    for s in sources:
        if s.scope == "dynamic":
            continue
        current = by_path.get(s.path)
        if current is None or _RANK.get(s.loading, 9) < _RANK.get(current.loading, 9):
            by_path[s.path] = s
    since = baseline_at if baseline_at is not None else now - 7 * 86400
    latest: dict[tuple[str, str], dict] = {}
    for write in writes:
        if not write["ts"] or write["ts"] < since:
            continue
        source = by_path.get(write["path"])
        if source is None:
            continue
        key = (write["path"], write["session_id"])
        if key not in latest or latest[key]["ts"] < write["ts"]:
            latest[key] = {**write, "tool": source.tool, "loading": source.loading, "scope": source.scope}
    rows = sorted(latest.values(), key=lambda w: w["ts"], reverse=True)[:100]
    for row in rows:
        forceful = row["loading"] in ("always", "config")
        severity = ("high" if forceful else "medium") if baseline_at is not None else "low"
        findings.append(
            Finding(
                rule="drift.agent-write",
                severity=severity,
                tool=row["tool"],
                path=row["path"],
                session_id=row["session_id"],
                snippet=f"via {row['via']}, {row['loading']}, session {row['session_id'][:8]}",
                why="An agent wrote to a source that shapes its own future context"
                + ("" if baseline_at is not None else " (seen before any baseline existed)"),
                action="Read what the session wrote, then run aictl ctx audit --update-baseline to accept it.",
            )
        )
    return rows


# ─── Layer 4: visibility gap ──────────────────────────────────────


def _unknown_sources(loaded: list[str], sources: list[Source], project: Path, findings: list[Finding]) -> list[str]:
    known = {s.path for s in sources}
    with_real = set(known)
    for path in known:
        with contextlib.suppress(OSError):
            with_real.add(str(Path(path).resolve()))
    unknown = []
    home_cfg = Path.home() / ".claude"
    for raw in sorted(set(loaded)):
        p = Path(raw)
        if not (p.is_relative_to(project) or project.is_relative_to(p.parent) or p.is_relative_to(home_cfg)):
            continue  # a load in another project's session says nothing about this one
        if raw in with_real or str(p.resolve()) in with_real or not p.is_file():
            continue
        unknown.append(raw)
        findings.append(
            Finding(
                rule="visibility.unknown-loaded-source",
                severity="high",
                tool="claude-code",
                path=raw,
                why="A session loaded this file, and the inventory does not know it",
                action="Read the file. Then add its location to the path tables if it is legitimate.",
            )
        )
    return unknown


def _unattributed(transcripts: list[dict], sources: list[Source], dynamic_tokens: int, findings: list[Finding]) -> list[dict]:
    firsts = [t["first_tokens"] for t in transcripts if t.get("first_tokens")]
    if not firsts:
        return []
    median = int(statistics.median(firsts))
    always = sum(s.est_tokens for s in sources if s.tool == "claude-code" and s.loading == "always")
    allowance = BUILTIN_ALLOWANCE_TOKENS["claude-code"]
    residual = max(0, median - always - dynamic_tokens - allowance)
    row = {
        "tool": "claude-code",
        "sessions_sampled": len(firsts),
        "first_request_tokens_median": median,
        "inventory_always_tokens": always,
        "dynamic_tokens": dynamic_tokens,
        "builtin_allowance_tokens": allowance,
        "residual_tokens": residual,
        "estimate": True,
        "method": "First request input and cache tokens, minus estimated inventory (chars/4), minus an allowance for the built-in prompt and tool list. Numeric session data only.",
    }
    if residual > 20_000:
        findings.append(
            Finding(
                rule="visibility.unattributed-context",
                severity="low",
                tool="claude-code",
                path="transcripts",
                snippet=f"about {residual} tokens of {median}",
                why="The first request is larger than the inventory and allowance explain. MCP tool schemas and skill listings count here.",
                action="This is an estimate. Compare with the tool's /context view before acting on it.",
            )
        )
    return [row]


# ─── Enrichment and orchestration ─────────────────────────────────


def _emit_hits(findings: list[Finding], tool: str, path: str, hits: list[dict], session_id: str = "") -> None:
    for hit in hits:
        findings.append(
            Finding(
                rule=hit["rule"],
                severity=hit["severity"],
                tool=tool,
                path=path,
                line=hit["line"],
                snippet=hit["snippet"],
                why=hit["why"],
                action=_ACTIONS.get(hit["rule"], ""),
                session_id=session_id,
                count=hit["count"],
            )
        )


def _git_states(project: Path, paths: list[str]) -> dict[str, str]:
    """Classify paths with one ls-files and one check-ignore call."""
    repo = _repo_root(project)
    states = {p: "outside-repo" for p in paths}
    if repo is None:
        return states
    inside = [p for p in paths if Path(p).is_relative_to(repo)]
    if not inside:
        return states
    base = ["git", "--no-optional-locks", "-C", str(repo)]
    payload = "\0".join(os.path.relpath(p, repo) for p in inside)
    tracked: set[str] = set()
    ignored: set[str] = set()
    try:
        out = subprocess.run([*base, "ls-files", "-z"], capture_output=True, text=True, timeout=5, check=False).stdout  # noqa: S603
        tracked = {str(repo / rel) for rel in out.split("\0") if rel}
        out = subprocess.run([*base, "check-ignore", "-z", "--stdin"], input=payload, capture_output=True, text=True, timeout=5, check=False).stdout  # noqa: S603
        ignored = {str(repo / rel) for rel in out.split("\0") if rel}
    except (OSError, subprocess.SubprocessError):
        return dict.fromkeys(paths, "unknown")
    for p in inside:
        states[p] = "tracked" if p in tracked else "ignored" if p in ignored else "untracked"
    return states


def _enrich_files(inv: _Inventory, findings: list[Finding]) -> list[Source]:
    file_rows = [r for r in inv.rows.values() if r.readable]
    project = inv.project
    states = _git_states(project, sorted({r.path for r in file_rows}))
    scanned: dict[str, tuple[Source, list[str]]] = {}
    for row in sorted(file_rows, key=lambda r: _RANK.get(r.loading, 9)):
        path = Path(row.path)
        config = row.loading == "config"
        facts = _file_facts(path, config=config)
        if facts is None:
            row.note = "Unreadable"
            continue
        row.bytes = facts["bytes"]
        row.est_tokens = facts["est_tokens"]
        row.sha256 = facts["sha256"]
        row.mtime = facts["mtime"]
        row.truncated = facts["truncated"]
        row.git_state = states.get(row.path, "outside-repo")
        # A nested rule directory applies only to its own subtree, so alwaysApply there stays conditional.
        if row.tool == "cursor" and row.kind == "rules" and facts["always_apply"] and _is_top_cursor_rule(path, project):
            row.loading = "always"
        _note_symlink(row, project, findings)
        if row.path in scanned:
            scanned[row.path][1].append(row.tool)
            continue
        scanned[row.path] = (row, [row.tool])
        if facts["binary"]:
            findings.append(Finding(rule="source.binary", severity="low", tool=row.tool, path=row.path, why="A binary file sits where a text source belongs", action="Confirm what this file is."))
        if facts["truncated"]:
            findings.append(Finding(rule="source.oversized", severity="low", tool=row.tool, path=row.path, snippet=f"{facts['bytes']} bytes", why=f"Larger than the {MAX_READ_BYTES} byte scan cap, so only the start was hashed and scanned", action="Read the rest by hand if this source reaches the model."))
        _emit_hits(findings, row.tool, row.path, facts["hits"])
        if row.git_state in ("untracked", "ignored") and row.loading == "always" and row.scope in ("project", "parent-dir"):
            findings.append(
                Finding(
                    rule="source.untracked-always",
                    severity="low",
                    tool=row.tool,
                    path=row.path,
                    why=f"An always-loaded project source is {row.git_state} in git, so no review or history covers it",
                    action="Commit it or ignore it on purpose.",
                )
            )
    tools_by_path = {path: tools for path, (_row, tools) in scanned.items()}
    for finding in findings:
        if finding.path in tools_by_path:
            finding.tools = sorted(set(tools_by_path[finding.path]))
    return list(inv.rows.values())


def _is_top_cursor_rule(path: Path, project: Path) -> bool:
    return path.is_relative_to(project / ".cursor" / "rules") or path.is_relative_to(Path.home() / ".cursor" / "rules")


def _note_symlink(row: Source, project: Path, findings: list[Finding]) -> None:
    path = Path(row.path)
    try:
        real = path.resolve()
    except OSError:
        return
    if real == path or not any(p.is_symlink() for p in [path, *path.parents]):
        return
    row.symlink_target = str(real)
    if row.scope in ("project", "local", "parent-dir") and path.is_relative_to(project) and not real.is_relative_to(project):
        findings.append(
            Finding(
                rule="source.symlink-escape",
                severity="medium",
                tool=row.tool,
                path=row.path,
                snippet=_snippet(f"-> {real}"),
                why="A project source is a symlink that leaves the project",
                action="Confirm the target. Its content changes without any change in this repository.",
            )
        )


def _collect_transcript_signals(inv: _Inventory, findings: list[Finding], transcripts: list[dict]) -> int:
    """Name what transcripts show entered context from outside any file, and scan it."""
    merged: dict[str, dict] = {}
    session_of: dict[str, str] = {}
    for transcript in transcripts:
        for label, block in transcript["blocks"].items():
            if label not in merged:
                merged[label] = block
                session_of[label] = transcript["session_id"]
    dynamic_tokens = 0
    for label, block in merged.items():
        kind, _, name = label.partition(":")
        note = f"MCP server instructions from {name}, as recorded in a transcript" if kind == "mcp" else f"Hook additional context from {name}, as recorded in a transcript"
        row = inv.dynamic("claude-code", f"transcript:{label}", "mcp-instructions" if kind == "mcp" else "hook-context", note)
        row.bytes = block["bytes"]
        row.est_tokens = block["est_tokens"]
        row.sha256 = block["sha256"]
        # What a hook adds can vary with every run, so its hash is not a drift signal.
        row.transient = kind != "mcp"
        dynamic_tokens += block["est_tokens"]
        _emit_hits(findings, "claude-code", f"transcript:{label}", block["hits"], session_id=session_of[label])
    return dynamic_tokens


def _dedupe_findings(findings: list[Finding]) -> list[Finding]:
    seen: set[tuple] = set()
    out = []
    for f in sorted(findings, key=lambda x: (_SEV_RANK.get(x.severity, 9), x.rule, x.path, x.line)):
        key = (f.rule, f.path, f.line, f.session_id)
        if key not in seen:
            seen.add(key)
            out.append(f)
    return out


def _tool_matches(tool: str, wanted: str | None) -> bool:
    if not wanted:
        return True
    return tool == wanted or tool.startswith(f"{wanted}-") or tool.split("-")[0] == wanted


def run_audit(
    project: str | Path | None = None,
    tool: str | None = None,
    *,
    update_baseline: bool = False,
    env: dict[str, str] | None = None,
    ps_output: str | None = None,
    now: float | None = None,
    baseline_file: str | Path | None = None,
) -> dict:
    """Run every layer and return ``{sources, findings, drift, unattributed, ...}``.

    ``env`` and ``ps_output`` default to this process's environment and a live
    ``ps`` call. Tests pass their own. ``baseline_file`` replaces the default
    baseline location, which also makes it persist when capture is off.
    """
    started = time.perf_counter()
    timings: dict[str, int] = {}

    def lap(name: str, mark: float) -> float:
        current = time.perf_counter()
        timings[name] = int((current - mark) * 1000)
        return current

    now = time.time() if now is None else now
    root = Path(project).expanduser().resolve() if project else Path.cwd().resolve()
    env = dict(os.environ) if env is None else env
    mode = capture_mode()
    findings: list[Finding] = []
    inv = _Inventory(root)

    mark = time.perf_counter()
    _collect_registry(inv)
    _collect_static(inv)
    _collect_claude_memory(inv)
    _collect_walks(inv)
    plugins = _collect_plugins(inv)
    _collect_vscode(inv, findings)
    _collect_imports(inv, findings)
    _collect_dynamic(inv, findings, env, plugins, ps_output)
    mark = lap("inventory", mark)

    sources = _enrich_files(inv, findings)
    mark = lap("scan", mark)

    transcripts = _claude_transcripts(root)
    dynamic_tokens = _collect_transcript_signals(inv, findings, transcripts)
    sources = list(inv.rows.values())
    mark = lap("transcripts", mark)

    baseline = _load_baseline(mode, baseline_file)
    project_key = str(root)
    entry = baseline["projects"].get(project_key)
    current = _baseline_entries(sources)
    drift = _drift(entry, current)
    _drift_findings(drift, findings)
    writes = [w for t in transcripts for w in t["writes"]]
    baseline_at = entry.get("scanned_at") if entry else None
    writes += _db_writes(baseline_at if baseline_at is not None else now - 7 * 86400)
    agent_writes = _agent_writes(writes, sources, baseline_at, findings, now)
    if baseline_at is not None:
        _record_events(baseline, drift, agent_writes, now, project_key)
    if entry is None or update_baseline:
        baseline["projects"][project_key] = {"scanned_at": now, "sources": current}
        drift_baseline_at = now
    else:
        drift_baseline_at = baseline_at
    _save_baseline(baseline, mode, baseline_file)
    mark = lap("drift", mark)

    loaded = [p for t in transcripts for p in t["loaded"]] + _db_loaded_paths()
    unknown = _unknown_sources(loaded, sources, root, findings)
    unattributed = _unattributed(transcripts, sources, dynamic_tokens, findings)
    lap("visibility", mark)

    kept_sources = [s for s in sources if _tool_matches(s.tool, tool)]
    kept_findings = [
        f
        for f in _dedupe_findings(findings)
        if _tool_matches(f.tool, tool) or any(_tool_matches(t, tool) for t in f.tools)
    ]
    counts = {s: sum(1 for f in kept_findings if f.severity == s) for s in SEVERITIES}
    per_tool: dict[str, int] = {}
    for s in kept_sources:
        per_tool[s.tool] = per_tool.get(s.tool, 0) + 1
    recent_events = [e for e in baseline["events"] if e.get("project") == project_key][-50:]
    return {
        "project": str(root),
        "scanned_at": now,
        "duration_ms": int((time.perf_counter() - started) * 1000),
        "timings_ms": timings,
        "capture_mode": mode,
        "sources": [asdict(s) for s in sorted(kept_sources, key=lambda s: (s.tool, _RANK.get(s.loading, 9), s.path))],
        "findings": [asdict(f) for f in kept_findings],
        "counts": counts,
        "sources_per_tool": per_tool,
        "drift": {
            "baseline_at": drift_baseline_at,
            "baseline_created": drift["baseline_created"],
            "baseline_updated": bool(update_baseline),
            "baseline_path": "" if mode == "off" and not baseline_file else str(baseline_path(baseline_file)),
            "new": drift["new"],
            "changed": drift["changed"],
            "removed": drift["removed"],
            "agent_writes": agent_writes,
            "events": recent_events,
        },
        "unattributed": unattributed,
        "unknown_loaded": unknown,
    }
