# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Remove every trace of the aictl hook and telemetry integration.

Stdlib-only and importing nothing from aictl, so it runs when aictl is broken,
half-uninstalled or moved:

    python3 /path/to/aictl/hook_removal.py --dry-run
    python3 ~/.config/aictl/remove-hooks.py          # copy `aictl enable` leaves

``aictl disable`` and ``aictl hooks uninstall`` are built on the same functions.
It is also the single source for "what is an aictl rule" (re-exported by
``_hook_owner``) and for the comment-preserving JSONC editor, so install and
removal cannot disagree.

Rules: user entries stay; files aictl did not change are not rewritten; a
symlinked (dotfile-managed) file is edited at its target; one corrupt file is
reported and skipped, never rewritten, and the remaining files still run.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

_IS_WINDOWS = os.name == "nt"
_IS_MACOS = sys.platform == "darwin"

OWNER_MARKER = "aictl.managed"
# Command fragments that identify an aictl hook written by any aictl version.
_COMMAND_MARKERS = ("/api/hooks", "aictl.hook_handler", "aictl/hook_handler.py", "aictl\\hook_handler.py")
_COMMAND_FIELDS = ("command", "url", "bash", "powershell")

ENV_BEGIN = "# >>> aictl env >>>"
ENV_END = "# <<< aictl env <<<"
LEGACY_OTEL_MARKER = "# ── aictl: OTel for AI tools ──"
CODEX_MARKER = "# managed by aictl"

# Variables `aictl enable` has exported. Used for launchctl when env.sh is gone.
KNOWN_ENV_KEYS = (
    "AICTL_PORT",
    "CLAUDE_CODE_ENABLE_TELEMETRY",
    "OTEL_METRICS_EXPORTER",
    "OTEL_LOGS_EXPORTER",
    "OTEL_LOG_USER_PROMPTS",
    "OTEL_LOG_TOOL_DETAILS",
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "COPILOT_OTEL_ENABLED",
    "COPILOT_OTEL_ENDPOINT",
    "GEMINI_TELEMETRY_ENABLED",
    "GEMINI_TELEMETRY_TARGET",
    "GEMINI_TELEMETRY_USE_COLLECTOR",
    "GEMINI_TELEMETRY_OTLP_ENDPOINT",
    "GEMINI_TELEMETRY_OTLP_PROTOCOL",
    "AW_OTLP_ENDPOINT",
    "AW_CONTEXT_PROFILE",
)

COPILOT_OTEL_KEYS = (
    "github.copilot.chat.otel.enabled",
    "github.copilot.chat.otel.exporterType",
    "github.copilot.chat.otel.otlpEndpoint",
    "github.copilot.chat.otel.captureContent",
)
# chat.hookFilesLocations entries older aictl versions wrote.
_LEGACY_HOOK_LOCATIONS = frozenset(
    {".github/hooks", "~/.copilot/hooks", ".claude/settings.json", ".claude/settings.local.json"}
)
# VS Code feature toggles older aictl versions set. Without a manifest these
# cannot be told apart from a deliberate setting, so they are removed only
# with --include-vscode-toggles.
LEGACY_VSCODE_TOGGLES: dict[str, object] = {
    "chat.agent.enabled": True,
    "chat.useHooks": True,
    "chat.useClaudeHooks": True,
    "chat.useCustomAgentHooks": True,
    "chat.useAgentsMdFile": True,
    "chat.includeApplyingInstructions": True,
    "chat.useNestedAgentsMdFiles": True,
    "chat.useCustomizationsInParentRepositories": True,
    "chat.mcp.discovery.enabled": True,
    "chat.mcp.autoStart": True,
}

_DELETE = object()


# ── JSONC ────────────────────────────────────────────────────────────────────


class JsoncError(ValueError):
    """The text is not a JSON (with comments and trailing commas) object."""


def _skip_trivia(text: str, i: int) -> int:
    """Index of the next character that is not whitespace or a comment."""
    n = len(text)
    while i < n:
        c = text[i]
        if c in " \t\r\n﻿":
            i += 1
        elif text.startswith("//", i):
            end = text.find("\n", i)
            i = n if end < 0 else end + 1
        elif text.startswith("/*", i):
            end = text.find("*/", i + 2)
            if end < 0:
                raise JsoncError("unterminated block comment")
            i = end + 2
        else:
            return i
    return i


def _string_end(text: str, i: int) -> int:
    """Index just past the string literal starting at *i*."""
    n = len(text)
    j = i + 1
    while j < n:
        if text[j] == "\\":
            j += 2
        elif text[j] == '"':
            return j + 1
        else:
            j += 1
    raise JsoncError("unterminated string")


def _value_end(text: str, i: int) -> int:
    """Index just past the JSON value starting at *i*, comment- and string-aware."""
    if i >= len(text):
        raise JsoncError("unexpected end of input")
    if text[i] == '"':
        return _string_end(text, i)
    if text[i] in "{[":
        depth = 0
        while i < len(text):
            i = _skip_trivia(text, i)
            if i >= len(text):
                break
            c = text[i]
            if c == '"':
                i = _string_end(text, i)
                continue
            if c in "{[":
                depth += 1
            elif c in "}]":
                depth -= 1
                if depth == 0:
                    return i + 1
            i += 1
        raise JsoncError("unbalanced brackets")
    j = i
    while j < len(text) and text[j] not in ",}] \t\r\n/":
        j += 1
    if j == i:
        raise JsoncError(f"unexpected character {text[i]!r}")
    return j


def _members(text: str) -> tuple[int, int, list[tuple[str, int, int, int]]]:
    """Parse the top-level object: ``(open, close, [(key, key_start, value_start, value_end)])``."""
    start = _skip_trivia(text, 0)
    if start >= len(text) or text[start] != "{":
        raise JsoncError("top-level value is not an object")
    members: list[tuple[str, int, int, int]] = []
    i = _skip_trivia(text, start + 1)
    while True:
        if i >= len(text):
            raise JsoncError("unterminated object")
        if text[i] == "}":
            if _skip_trivia(text, i + 1) < len(text):
                raise JsoncError("trailing content after object")
            return start, i, members
        if text[i] != '"':
            raise JsoncError(f"expected a key at offset {i}")
        key_end = _string_end(text, i)
        key = json.loads(text[i:key_end])
        colon = _skip_trivia(text, key_end)
        if colon >= len(text) or text[colon] != ":":
            raise JsoncError(f"expected ':' after key {key!r}")
        value_start = _skip_trivia(text, colon + 1)
        value_end = _value_end(text, value_start)
        members.append((key, i, value_start, value_end))
        i = _skip_trivia(text, value_end)
        if i < len(text) and text[i] == ",":
            i = _skip_trivia(text, i + 1)
        elif i < len(text) and text[i] != "}":
            raise JsoncError(f"expected ',' or '}}' at offset {i}")


def _strip_jsonc(text: str) -> str:
    """Return strict JSON: comments blanked, trailing commas removed."""
    out: list[str] = []
    i = 0
    while i < len(text):
        c = text[i]
        if c == '"':
            end = _string_end(text, i)
            out.append(text[i:end])
            i = end
        elif text.startswith("//", i) or text.startswith("/*", i):
            i = _skip_trivia(text, i)
        elif c == ",":
            next_i = _skip_trivia(text, i + 1)
            if next_i >= len(text) or text[next_i] not in "}]":
                out.append(c)
            i += 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def jsonc_loads(text: str) -> dict:
    """Parse a JSON or JSONC object. Raises :class:`JsoncError` on anything else."""
    text = text.lstrip("﻿")
    if not text.strip():
        return {}
    try:
        data = json.loads(text)
    except ValueError:
        try:
            data = json.loads(_strip_jsonc(text))
        except ValueError as exc:
            raise JsoncError(str(exc)) from exc
    if not isinstance(data, dict):
        raise JsoncError("top-level value is not an object")
    return data


def _indent_of(text: str, key_start: int) -> str:
    line_start = text.rfind("\n", 0, key_start) + 1
    prefix = text[line_start:key_start]
    return prefix if not prefix.strip() else "  "


def _dump_value(value: object, pad: str) -> str:
    width = max(len(pad.replace("\t", "    ")), 2)
    return json.dumps(value, indent=width, ensure_ascii=False).replace("\n", "\n" + pad)


def jsonc_set(text: str, key: str, value: object) -> str:
    """Set a top-level *key*, leaving every other byte of *text* alone."""
    if not text.strip(" \t\r\n\ufeff"):
        return text.strip(" \t\r\n") + json.dumps({key: value}, indent=2, ensure_ascii=False) + "\n"
    opened, close, members = _members(text)
    newline = "\r\n" if "\r\n" in text else "\n"
    for name, key_start, value_start, value_end in members:
        if name == key:
            dumped = _dump_value(value, _indent_of(text, key_start)).replace("\n", newline)
            return text[:value_start] + dumped + text[value_end:]
    if not members:
        inner = text[opened + 1 : close]
        if not inner.strip():
            return f"{text[:opened]}{{\n  {json.dumps(key)}: {_dump_value(value, '  ')}\n}}{text[close + 1 :]}"
    pad = _indent_of(text, members[-1][1]) if members else "  "
    entry = f"\n{pad}{json.dumps(key)}: {_dump_value(value, pad)}".replace("\n", newline)
    tail_start = close
    while tail_start > opened + 1 and text[tail_start - 1] in " \t\r\n":
        tail_start -= 1
    if not members:
        return text[:tail_start] + entry + text[tail_start:]
    last_end = members[-1][3]
    after = _skip_trivia(text, last_end)
    if text[after] == ",":  # trailing comma already there
        return text[:tail_start] + entry + "," + text[tail_start:]
    return text[:last_end] + "," + text[last_end:tail_start] + entry + text[tail_start:]


def jsonc_delete(text: str, key: str) -> str:
    """Delete a top-level *key*, the inverse of :func:`jsonc_set` for an appended key."""
    opened, close, members = _members(text)
    for idx, (name, key_start, _value_start, value_end) in enumerate(members):
        if name != key:
            continue
        after = _skip_trivia(text, value_end)
        has_comma = after < len(text) and text[after] == ","
        if idx + 1 < len(members):
            # Not last: drop the key's whole line(s) when it starts its line.
            end = after + 1
            while end < len(text) and text[end] in " \t":
                end += 1
            line_start = text.rfind("\n", 0, key_start) + 1
            starts_line = not text[line_start:key_start].strip()
            if starts_line and end < len(text) and text[end] in "\r\n":
                end += 2 if text.startswith("\r\n", end) else 1
                return text[:line_start] + text[end:]
            return text[:key_start] + text[_skip_trivia(text, after + 1) :]
        tail = text[after + 1 :] if has_comma else text[value_end:]
        begin = key_start
        while begin > opened + 1 and text[begin - 1] in " \t\r\n":
            begin -= 1
        if idx == 0:
            if not text[opened + 1 : begin].strip() and not tail[: close - value_end].strip():
                return text[: opened + 1] + text[close:]
            return text[:begin] + tail
        if has_comma:  # trailing-comma style: the previous member keeps its comma
            return text[:begin] + tail
        comma = _skip_trivia(text, members[idx - 1][3])
        return text[:comma] + text[comma + 1 : begin] + tail
    return text


# ── Files ────────────────────────────────────────────────────────────────────


class InvalidConfigError(ValueError):
    """Content that the tool reading this file could not parse."""


def toml_error(text: str) -> str | None:
    """The parse error for TOML *text*, or None. None too on 3.10 with no TOML parser."""
    try:
        import tomllib as parser
    except ImportError:
        try:
            import tomli as parser  # type: ignore[no-redef]
        except ImportError:
            return None
    try:
        parser.loads(text)
    except parser.TOMLDecodeError as exc:
        return str(exc)
    return None


def json_error(text: str) -> str | None:
    """The parse error for JSON or JSONC *text*, or None. Empty text is an empty config."""
    text = text.lstrip("\ufeff")
    if not text.strip():
        return None
    try:
        json.loads(text)
        return None
    except ValueError:
        pass
    try:
        json.loads(_strip_jsonc(text))
    except (ValueError, JsoncError) as exc:
        return str(exc)
    return None


def config_error(path: Path, text: str) -> str | None:
    """Why *text* is not a valid config for *path*'s format, or None."""
    suffix = Path(path).suffix.lower()
    if suffix == ".toml":
        return toml_error(text)
    if suffix in (".json", ".jsonc"):
        return json_error(text)
    return None


def validate_config_text(path: Path, text: str) -> None:
    """Refuse content that would turn a working config into one its tool cannot read."""
    error = config_error(path, text)
    if error:
        raise InvalidConfigError(f"refusing to write {path}: result would be invalid ({error})")


class ConfigBusyError(OSError):
    """The file stayed locked by another process. Its contents are unchanged."""


_REPLACE_ATTEMPTS = 8
_REPLACE_BACKOFF_SEC = 0.05


def _replace_with_retry(tmp: Path, target: Path) -> None:
    """``os.replace``, retried: on Windows it fails while another process has the target open."""
    import time

    for attempt in range(_REPLACE_ATTEMPTS):
        try:
            os.replace(tmp, target)
            return
        except PermissionError as exc:
            if attempt == _REPLACE_ATTEMPTS - 1:
                raise ConfigBusyError(f"{target} is locked by another process; left unchanged") from exc
            time.sleep(_REPLACE_BACKOFF_SEC * (attempt + 1))


def write_atomic(path: Path, content: str) -> None:
    """Replace the contents of *path* atomically.

    Raises :class:`InvalidConfigError`, writing nothing, when the content does
    not parse. A symlink is followed so a dotfile-managed link keeps pointing at
    its repo (``os.replace`` on the link itself would swap the link for a plain
    file), and the existing file mode is kept (settings can be 0600).
    """
    validate_config_text(path, content)
    target = Path(os.path.realpath(path))
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(target.name + ".aictl-tmp")
    try:
        mode = target.stat().st_mode & 0o7777
    except OSError:
        mode = None
    try:
        with open(tmp, "w", encoding="utf-8", newline="") as fh:
            fh.write(content)
        if mode is not None:
            os.chmod(tmp, mode)
        _replace_with_retry(tmp, target)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass


def read_text_exact(path: Path) -> str:
    """Read without newline translation, so a CRLF file stays CRLF."""
    with open(path, encoding="utf-8", newline="") as fh:
        return fh.read()


def update_json_text(text: str, updates: dict) -> str:
    """Apply top-level *updates* to JSON(C) *text*; a value of ``DELETE`` removes the key."""
    for key, value in updates.items():
        text = jsonc_delete(text, key) if value is _DELETE else jsonc_set(text, key, value)
    return text


DELETE = _DELETE


# ── What counts as an aictl rule ─────────────────────────────────────────────


def _command_is_aictl(entry: object) -> bool:
    if not isinstance(entry, dict):
        return False
    return any(any(m in str(entry.get(f, "")) for m in _COMMAND_MARKERS) for f in _COMMAND_FIELDS)


def is_legacy_rule(rule: dict) -> bool:
    """Command-shape heuristic for rules written before the ownership marker existed."""
    inner = rule.get("hooks")
    if isinstance(inner, list):
        return any(_command_is_aictl(h) for h in inner)
    return _command_is_aictl(rule)


def is_aictl_rule(rule: object) -> bool:
    """True when the rule is owned by aictl. The marker, when present, is authoritative."""
    if not isinstance(rule, dict):
        return False
    if "_aictl_owner" in rule:
        return rule.get("_aictl_owner") == OWNER_MARKER
    return is_legacy_rule(rule)


def strip_rules(hooks_by_event: object) -> tuple[dict, int]:
    """Return ``(hooks, removed)`` with every aictl rule gone.

    Walks every event present, so rules under an event since dropped from the
    catalogue go too. A malformed (non-list) event value is left alone. An
    unmarked group mixing an aictl command with another keeps the other.
    """
    if not isinstance(hooks_by_event, dict):
        return {}, 0
    out: dict = {}
    removed = 0
    for event, rules in hooks_by_event.items():
        if not isinstance(rules, list):
            out[event] = rules
            continue
        kept: list = []
        for rule in rules:
            if not is_aictl_rule(rule):
                kept.append(rule)
                continue
            removed += 1
            inner = rule.get("hooks") if "_aictl_owner" not in rule else None
            if isinstance(inner, list):
                users = [h for h in inner if not _command_is_aictl(h)]
                if users:
                    kept.append({**rule, "hooks": users})
        if kept:
            out[event] = kept
    return out, removed


# ── Removal steps ────────────────────────────────────────────────────────────


class Result:
    """Outcome of one removal run: human lines plus the failed paths."""

    def __init__(self) -> None:
        self.changes: list[str] = []
        self.notes: list[str] = []
        self.failures: list[str] = []


class _Sink:
    """Executes file changes, or only describes them on a dry run."""

    def __init__(self, dry_run: bool, on_change=None, before_change=None) -> None:
        self.dry_run = dry_run
        self.on_change = on_change
        self.before_change = before_change
        self.result = Result()

    def write(self, path: Path, new_text: str, label: str) -> None:
        self.result.changes.append(f"{label}: {path}")
        if self.dry_run:
            return
        if self.before_change:
            self.before_change(path, "modify")
        previous = path.read_bytes() if path.exists() else None
        write_atomic(path, new_text)
        if self.on_change:
            self.on_change(path, "modify", previous, new_text.encode("utf-8"))

    def delete(self, path: Path, label: str) -> None:
        self.result.changes.append(f"{label}: {path}")
        if self.dry_run:
            return
        if self.before_change:
            self.before_change(path, "delete")
        previous = path.read_bytes() if path.exists() else None
        if path.is_symlink():
            # A dotfile-managed link and its target stay; only the content goes.
            write_atomic(path, "{}\n" if path.suffix == ".json" else "")
        else:
            path.unlink()
        if self.on_change:
            self.on_change(path, "delete", previous, None)


# Files that exist only to hold hooks. A settings file is kept even when empty.
_HOOK_ONLY_NAMES = frozenset({"aictl.json", "hooks.json"})


def remove_from_hook_file(path: Path, sink: _Sink, *, delete_if_only: tuple[str, ...] = ()) -> int:
    """Remove aictl rules from one hook/settings file. Returns the count removed.

    A file with no aictl rule is not touched. *delete_if_only* names top-level
    keys that do not count as user content (``version`` in a Copilot hook file).
    """
    if not (path.exists() or path.is_symlink()):
        return 0
    try:
        text = read_text_exact(path)
        data = jsonc_loads(text)
    except (OSError, UnicodeDecodeError, JsoncError) as exc:
        sink.result.failures.append(str(path))
        sink.result.notes.append(f"skipped, unreadable ({exc}): {path}")
        return 0
    remaining, removed = strip_rules(data.get("hooks"))
    if not removed:
        return 0
    others = {k for k in data if k != "hooks" and k not in delete_if_only}
    label = f"remove {removed} aictl hook rule(s)"
    if not remaining and not others and path.name in _HOOK_ONLY_NAMES:
        sink.delete(path, label + ", file now empty")
        return removed
    new_text = update_json_text(text, {"hooks": remaining if remaining else _DELETE})
    sink.write(path, new_text, label)
    return removed


def _holds_only_marked_rules(path: Path) -> bool:
    """True when the file is a hook file and every rule carries the aictl ownership marker."""
    try:
        data = jsonc_loads(read_text_exact(path))
    except (OSError, UnicodeDecodeError, JsoncError):
        return False
    hooks = data.get("hooks")
    if not isinstance(hooks, dict) or not hooks or set(data) - {"hooks", "version"}:
        return False
    for rules in hooks.values():
        if not isinstance(rules, list) or not rules:
            return False
        if not all(isinstance(r, dict) and r.get("_aictl_owner") == OWNER_MARKER for r in rules):
            return False
    return True


def renamed_aictl_files(directory: Path) -> list[Path]:
    """Renamed copies of an aictl hook file (``*.disabled``, ``*.bak``), provably aictl's by marker."""
    if not directory.is_dir():
        return []
    found: set[Path] = set()
    for pattern in ("*.disabled", "*.bak", "*.bak.*", "aictl.json?*"):
        found.update(directory.glob(pattern))
    return sorted(p for p in found if p.is_file() and _holds_only_marked_rules(p))


def disabled_by_rename(directory: Path) -> list[Path]:
    """The renamed copies that mean someone switched these hooks off by hand."""
    return [p for p in renamed_aictl_files(directory) if p.name.endswith(".disabled")]


def _remove_disabled_copies(directory: Path, sink: _Sink) -> None:
    for path in renamed_aictl_files(directory):
        sink.delete(path, "delete renamed aictl hook file")


def strip_profile_text(content: str) -> str:
    """Remove the aictl source block and the legacy inline OTel block from a shell profile."""
    pattern = re.compile(re.escape(ENV_BEGIN) + r".*?" + re.escape(ENV_END) + r"\n?", re.DOTALL)
    content = pattern.sub("", content)
    if LEGACY_OTEL_MARKER not in content:
        return content
    out: list[str] = []
    skipping = False
    for line in content.split("\n"):
        if not skipping and LEGACY_OTEL_MARKER in line:
            skipping = True
            continue
        if skipping:
            if line.strip() == "" or line.strip().startswith("export "):
                continue
            skipping = False
        out.append(line)
    return "\n".join(out)


def _remove_from_profiles(home: Path, sink: _Sink) -> None:
    for rel in (".bashrc", ".zshrc", ".bash_profile", ".zprofile", ".profile", ".config/fish/config.fish"):
        path = home / rel
        if not path.is_file():
            continue
        try:
            original = read_text_exact(path)
            new = strip_profile_text(original)
            if new == original:
                continue
            if new.strip():
                sink.write(path, new, "remove aictl env block")
            else:
                sink.delete(path, "remove aictl env block, file now empty")
        except (OSError, UnicodeDecodeError) as exc:
            sink.result.failures.append(str(path))
            sink.result.notes.append(f"skipped ({exc}): {path}")


def env_file(home: Path) -> Path:
    return home / ".config" / "aictl" / "env.sh"


def _env_keys_from_file(path: Path) -> list[str]:
    try:
        return re.findall(r"^export ([A-Za-z_][A-Za-z0-9_]*)=", read_text_exact(path), re.M)
    except (OSError, UnicodeDecodeError):
        return []


def is_real_home(home: Path) -> bool:
    """False when HOME is redirected (tests, sandboxes): launchd and registry state are per user, not per HOME."""
    if _IS_WINDOWS:
        real = os.environ.get("HOMEDRIVE", "") + os.environ.get("HOMEPATH", "")
        return bool(real) and os.path.normcase(os.path.realpath(real)) == os.path.normcase(os.path.realpath(home))
    import pwd

    try:
        return os.path.realpath(pwd.getpwuid(os.getuid()).pw_dir) == os.path.realpath(home)
    except KeyError:
        return False


def _launchctl(*args: str) -> str | None:
    """Run ``launchctl``; output or None. Separate so tests can replace it."""
    if sys.platform != "darwin":
        return None

    import subprocess

    try:
        proc = subprocess.run(["launchctl", *args], capture_output=True, text=True, timeout=5, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    return proc.stdout if proc.returncode == 0 else None


def _env_value_is_aictls(key: str, value: str) -> bool:
    """An endpoint counts only when it points at this machine: it may be a real collector otherwise."""
    return not key.endswith("ENDPOINT") or _is_local_endpoint(value)


def _remove_launchctl_env(home: Path, keys: list[str], sink: _Sink) -> None:
    """Unset what `aictl enable` persisted with ``launchctl setenv`` (macOS).

    Those variables reach every GUI app until logout, including the generic
    ``OTEL_EXPORTER_OTLP_*`` ones, and `aictl disable` never undid them.
    """
    if not _IS_MACOS or _IS_WINDOWS or not is_real_home(home):
        return
    for key in keys:
        current = (_launchctl("getenv", key) or "").strip()
        if not current or not _env_value_is_aictls(key, current):
            continue
        sink.result.changes.append(f"launchctl unsetenv {key}")
        if not sink.dry_run:
            _launchctl("unsetenv", key)


def _reg(*args: str) -> str | None:
    """Run ``reg``; output or None when it fails. Separate so tests can replace it."""
    import subprocess

    try:
        proc = subprocess.run(["reg", *args], capture_output=True, text=True, timeout=10, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    return proc.stdout if proc.returncode == 0 else None


def _remove_windows_env(home: Path, keys: list[str], sink: _Sink) -> None:
    """Delete what `aictl enable` persisted with ``setx``: values under ``HKCU\\Environment``.

    This is the Windows equivalent of the shell-profile line; aictl writes no
    PowerShell profile. Processes already running keep the old values.
    """
    if not _IS_WINDOWS or not is_real_home(home):
        return
    hive = "HKCU\\Environment"
    for key in keys:
        output = _reg("query", hive, "/v", key)
        if output is None or not _env_value_is_aictls(key, output):
            continue
        sink.result.changes.append(f"delete user environment variable {key}")
        if not sink.dry_run and _reg("delete", hive, "/v", key, "/f") is None:
            sink.result.failures.append(f"{hive}\\{key}")
            sink.result.notes.append(f"could not delete user environment variable {key}")


def _is_local_endpoint(value: object) -> bool:
    return isinstance(value, str) and ("localhost" in value or "127.0.0.1" in value)


def vscode_settings_paths(home: Path) -> list[Path]:
    if _IS_WINDOWS:
        base = Path(os.environ.get("APPDATA") or home / "AppData" / "Roaming")
    elif _IS_MACOS:
        base = home / "Library" / "Application Support"
    else:
        base = home / ".config"
    return [base / app / "User" / "settings.json" for app in ("Code", "Code - Insiders")]


def aictl_config_dir(home: Path) -> Path:
    """Same answer as ``aictl.platforms.config_dir`` (guarded by a test); this module cannot import it."""
    if _IS_WINDOWS:
        return Path(os.environ.get("APPDATA") or home) / "aictl"
    xdg = os.environ.get("XDG_CONFIG_HOME")
    return (Path(xdg) if xdg else home / ".config") / "aictl"


def manifest_path(home: Path) -> Path:
    return aictl_config_dir(home) / "vscode-managed.json"


def _manifest_entry_is_live(settings_path: str, manifest_file: Path) -> bool:
    """An entry counts only if its file exists and is not a temp path recorded into a real manifest.

    Entries are only ever looked up by a settings path being cleaned, so a stale
    one cannot cause a wrong revert; this keeps a test or a removed project from
    leaving junk in the record.
    """
    if not os.path.exists(settings_path):
        return False
    import tempfile

    tmp = os.path.realpath(tempfile.gettempdir()) + os.sep
    in_tmp = os.path.realpath(settings_path).startswith(tmp)
    return not in_tmp or os.path.realpath(manifest_file).startswith(tmp)


def load_manifest(home: Path) -> dict:
    """The record of what aictl changed in VS Code settings, stale entries dropped."""
    path = manifest_path(home)
    try:
        data = json.loads(read_text_exact(path))
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {k: v for k, v in data.items() if _manifest_entry_is_live(k, path)}


def _vscode_updates(path: Path, data: dict, manifest: dict, include_toggles: bool, sink: _Sink) -> dict:
    """Which keys to change in one settings file, given what aictl recorded writing."""
    updates: dict = {}
    recorded = manifest.get(str(path))
    if isinstance(recorded, dict):
        for key, entry in recorded.items():
            if key not in data:
                continue
            if data[key] != entry.get("wrote"):
                sink.result.notes.append(f"left {key} alone, changed since aictl wrote it: {path}")
                continue
            updates[key] = entry.get("prev") if entry.get("had") else _DELETE
        return updates
    # No manifest: an install from an older aictl. Only what is provably ours.
    if _is_local_endpoint(data.get("github.copilot.chat.otel.otlpEndpoint")):
        updates.update({k: _DELETE for k in COPILOT_OTEL_KEYS if k in data})
    locations = data.get("chat.hookFilesLocations")
    if (
        isinstance(locations, dict)
        and set(locations) <= _LEGACY_HOOK_LOCATIONS
        and ".claude/settings.json" in locations
    ):
        updates["chat.hookFilesLocations"] = _DELETE
    toggles = [k for k, v in LEGACY_VSCODE_TOGGLES.items() if data.get(k) == v]
    if include_toggles:
        updates.update({k: _DELETE for k in toggles})
    elif toggles:
        sink.result.notes.append(
            f"left {len(toggles)} VS Code toggles aictl may have set ({', '.join(toggles[:3])}, ...): {path}. "
            "Pass --include-vscode-toggles to remove them too."
        )
    return updates


def _remove_from_vscode(home: Path, paths: list[Path], include_toggles: bool, sink: _Sink) -> None:
    manifest = load_manifest(home)
    for path in paths:
        if not path.is_file():
            continue
        try:
            text = read_text_exact(path)
            data = jsonc_loads(text)
        except (OSError, UnicodeDecodeError, JsoncError) as exc:
            sink.result.failures.append(str(path))
            sink.result.notes.append(f"skipped, unreadable ({exc}): {path}")
            continue
        updates = _vscode_updates(path, data, manifest, include_toggles, sink)
        if not updates:
            continue
        new_text = update_json_text(text, updates)
        if str(path) in manifest and not jsonc_loads(new_text):
            sink.delete(path, "remove aictl VS Code settings, file now empty")
        else:
            sink.write(path, new_text, f"remove {len(updates)} aictl VS Code setting(s)")


_CODEX_SECTION_RE = re.compile(r"(?ms)^\[otel\][^\n]*\n.*?(?=^\[|\Z)")
_CODEX_SUBTABLE_RE = re.compile(r"(?ms)^\[otel\.(exporter|metrics_exporter|trace_exporter)\b[^\n]*\n.*?(?=^\[|\Z)")
_CODEX_INLINE_EXPORTER_RE = re.compile(r"^\s*(exporter|metrics_exporter|trace_exporter)\s*=")
# Written by aictl's own block. Only ever owned when the aictl marker is present.
_CODEX_DEFAULT_LINES = frozenset({'environment = "dev"', "log_user_prompt = true"})


def strip_codex_otel_text(content: str) -> str:
    """Remove what aictl owns from a Codex config, in any form it has taken.

    Ownership needs the ``# managed by aictl`` marker in ``[otel]`` (or the old
    ``enabled`` + local endpoint shape, which no one would write by hand). With
    it, aictl owns: the marker; inline or subtable exporters aimed at this
    machine; and its two default lines, ``environment = "dev"`` and
    ``log_user_prompt = true``. Everything else stays as it was: any other key,
    a different ``environment``, an exporter aimed elsewhere. Without the marker
    nothing is touched, even an exporter on localhost, which could be a
    separate collector. This also clears the combination that does not parse, inline
    keys next to ``[otel.exporter.*]`` subtables, because it works on text.
    """
    main = _CODEX_SECTION_RE.search(content)
    if not main:
        return content
    section = main.group(0)
    if CODEX_MARKER not in section:
        legacy = re.search(r"^\s*enabled\s*=", section, re.M) and _is_local_endpoint(section)
        if not legacy:
            return content
        return _join_after_removal(content[: main.start()], content[main.end() :])

    def drop_local_subtable(match: re.Match) -> str:
        return "" if _is_local_endpoint(match.group(0)) else match.group(0)

    kept_lines: list[str] = []
    for line in section.split("\n")[1:]:
        stripped = line.strip()
        if CODEX_MARKER in line or stripped in _CODEX_DEFAULT_LINES:
            continue
        if _CODEX_INLINE_EXPORTER_RE.match(line) and _is_local_endpoint(line):
            continue
        kept_lines.append(line)
    header = section.split("\n", 1)[0]
    new_section = header + "\n" + "\n".join(kept_lines) if any(ln.strip() for ln in kept_lines) else ""
    head, tail = content[: main.start()], _CODEX_SUBTABLE_RE.sub(drop_local_subtable, content[main.end() :])
    return _join_after_removal(head + new_section, tail)


def _join_after_removal(head: str, tail: str) -> str:
    if not tail.strip():
        return head.rstrip("\n") + "\n" if head.strip() else ""  # also the separator install added
    return head + tail


def repair_codex_text(content: str) -> str:
    """Make the broken inline-plus-subtable combination valid, keeping the working export.

    Only drops an inline exporter that has a subtable of the same name, which is
    the exact collision an older ``aictl enable`` created. The caller checks the
    result parses.
    """
    main = _CODEX_SECTION_RE.search(content)
    if not main or CODEX_MARKER not in main.group(0):
        return content
    tables = set(_CODEX_SUBTABLE_RE.findall(content))
    lines = [
        ln
        for ln in main.group(0).split("\n")
        if not ((m := _CODEX_INLINE_EXPORTER_RE.match(ln)) and m.group(1) in tables and _is_local_endpoint(ln))
    ]
    return content[: main.start()] + "\n".join(lines) + content[main.end() :]


def _remove_from_codex(home: Path, sink: _Sink) -> None:
    path = home / ".codex" / "config.toml"
    if not path.is_file():
        return
    try:
        original = read_text_exact(path)
        new = strip_codex_otel_text(original)
        if new == original:
            return
        if new.strip():
            sink.write(path, new, "remove aictl [otel] table")
        else:
            sink.delete(path, "remove aictl [otel] table, file now empty")
    except (OSError, UnicodeDecodeError) as exc:
        sink.result.failures.append(str(path))
        sink.result.notes.append(f"skipped ({exc}): {path}")


def user_hook_files(home: Path) -> list[Path]:
    """Every user-level file that can carry hooks, across all tools and aictl versions."""
    claude = Path(os.environ["CLAUDE_CONFIG_DIR"]) if os.environ.get("CLAUDE_CONFIG_DIR") else home / ".claude"
    copilot = Path(os.environ["COPILOT_HOME"]) if os.environ.get("COPILOT_HOME") else home / ".copilot"
    return [
        claude / "settings.json",
        claude / "settings.local.json",
        home / ".gemini" / "settings.json",
        copilot / "hooks" / "aictl.json",
        copilot / "settings.json",
        copilot / "config.json",
        home / ".cursor" / "hooks.json",
        home / ".codex" / "hooks.json",
        home / ".codeium" / "windsurf" / "hooks.json",
    ]


def project_hook_files(root: Path) -> list[Path]:
    """Every project-level file that can carry hooks."""
    return [
        root / ".claude" / "settings.json",
        root / ".claude" / "settings.local.json",
        root / ".gemini" / "settings.json",
        root / ".github" / "hooks" / "aictl.json",
        root / ".github" / "hooks" / "hooks.json",
        root / ".github" / "copilot" / "settings.json",
        root / ".github" / "copilot" / "settings.local.json",
        root / ".cursor" / "hooks.json",
        root / ".codex" / "hooks.json",
        root / ".windsurf" / "hooks.json",
    ]


def remove_everything(
    home: Path,
    *,
    projects: list[Path] | tuple[Path, ...] = (),
    extra_hook_files: list[Path] | tuple[Path, ...] = (),
    extra_vscode_settings: list[Path] | tuple[Path, ...] = (),
    dry_run: bool = False,
    include_vscode_toggles: bool = False,
    on_change=None,
    before_change=None,
) -> Result:
    """Remove every trace of the integration. A failure in one file never stops the rest."""
    sink = _Sink(dry_run, on_change, before_change)
    hook_files = [*user_hook_files(home), *extra_hook_files]
    for root in projects:
        hook_files.extend(project_hook_files(root))
    seen: set[str] = set()
    for path in hook_files:
        key = os.path.realpath(path)
        if key in seen:
            continue
        seen.add(key)
        try:
            remove_from_hook_file(path, sink, delete_if_only=("version",))
        except OSError as exc:
            sink.result.failures.append(str(path))
            sink.result.notes.append(f"failed ({exc}): {path}")
    for path in hook_files:
        if path.name == "aictl.json":
            _remove_disabled_copies(path.parent, sink)

    vscode_paths = list(dict.fromkeys([*vscode_settings_paths(home), *extra_vscode_settings]))
    for root in projects:
        vscode_paths.append(root / ".vscode" / "settings.json")
    _remove_from_vscode(home, vscode_paths, include_vscode_toggles, sink)
    _remove_from_codex(home, sink)
    _remove_from_profiles(home, sink)

    env_path = env_file(home)
    keys = list(dict.fromkeys([*_env_keys_from_file(env_path), *KNOWN_ENV_KEYS]))
    _remove_launchctl_env(home, keys, sink)
    _remove_windows_env(home, keys, sink)
    for path in (env_path, manifest_path(home), aictl_config_dir(home) / "remove-hooks.py"):
        if path.exists() or path.is_symlink():
            try:
                sink.delete(path, "delete")
            except OSError as exc:
                sink.result.failures.append(str(path))
                sink.result.notes.append(f"failed ({exc}): {path}")
    return sink.result


def print_result(result: Result, *, dry_run: bool, echo=print) -> None:
    prefix = "[dry-run] " if dry_run else "done: "
    for line in result.changes:
        echo(f"  {prefix}{line}")
    for line in result.notes:
        echo(f"  note: {line}")
    if not result.changes and not result.notes:
        echo("  nothing to remove")


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Remove every trace of the aictl hook and telemetry integration.")
    parser.add_argument("--dry-run", action="store_true", help="print what would change and write nothing")
    parser.add_argument(
        "--project", action="append", default=[], type=Path, help="also clean this project directory (repeatable)"
    )
    parser.add_argument("--no-cwd", action="store_true", help="do not clean the current directory as a project")
    parser.add_argument(
        "--include-vscode-toggles",
        action="store_true",
        help="also remove VS Code feature toggles an older aictl may have set",
    )
    args = parser.parse_args(argv)
    projects = list(args.project)
    if not args.no_cwd:
        projects.append(Path.cwd())
    result = remove_everything(
        Path.home(),
        projects=projects,
        dry_run=args.dry_run,
        include_vscode_toggles=args.include_vscode_toggles,
    )
    print_result(result, dry_run=args.dry_run)
    return 1 if result.failures else 0


if __name__ == "__main__":
    sys.exit(main())
