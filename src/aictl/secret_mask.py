"""Masking of secret values in text and in MCP server definitions.

Names stay visible (environment variable names, header names, argument flags,
URL host and path); values that can hold a credential become ``PLACEHOLDER``,
which also says that a value was there. This module imports nothing from
aictl, so discovery code can use it as well as the dashboard.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlsplit, urlunsplit

PLACEHOLDER = "<redacted>"

# ── Text ─────────────────────────────────────────────────────────

SECRET_VALUE_RE = re.compile(
    r"(?i)\b(sk-[a-z0-9_-]{8,}|gh[pousr]_[a-z0-9]{8,}|xox[a-z]-[a-z0-9-]{8,}|AKIA[0-9A-Z]{8,})"
    r"|((?:api[_-]?key|token|secret|password|passwd|bearer)[\"']?\s*[=:]\s*[\"']?)([^\s\"',;&]{4,})"
)
# user:password@ in a URL of any scheme.
URL_CRED_RE = re.compile(r"(?i)\b([a-z][a-z0-9+.-]*://)[^/\s:@\"']+:[^/\s@\"']+@")


def _redact_match(m: re.Match) -> str:
    return f"{m.group(2)}{PLACEHOLDER}" if m.group(2) else PLACEHOLDER


def redact(text: str) -> str:
    """Remove secret-shaped values and URL credentials from text."""
    if not text:
        return ""
    if SECRET_VALUE_RE.search(text) is not None:
        text = SECRET_VALUE_RE.sub(_redact_match, text)
    if "://" in text and "@" in text:
        text = URL_CRED_RE.sub(rf"\1{PLACEHOLDER}@", text)
    return text


# Each pattern keeps group 1 (the name or prefix) and replaces the rest.
_PREFIXED_SECRET_RE = re.compile(
    "|".join(
        (
            # An Authorization header of any scheme: the scheme word stays.
            r"(\b(?:proxy-)?authorization[\"']?\s*[:=]\s*[\"']?(?:(?:basic|bearer|digest|token|negotiate)\s+)?)"
            r"[^\s\"',;]+",
            r"(\b(?:set-)?cookie[\"']?\s*[:=]\s*[\"']?)[^\"'\r\n]+",
            r"(\bbearer\s+)[a-z0-9._~+/-]{8,}=*",
            # Basic credentials are base64; prose after "Basic" has no digit, + or /.
            r"(\bbasic\s+)(?=[a-z0-9+/._~-]*[0-9+/=])[a-z0-9+/._~-]{8,}=*",
            # A key-like query parameter in a URL.
            r"([?&][a-z0-9_.-]*(?:key|token|secret|password|passwd|sig|signature|auth|credential|code)=)"
            r"[^&#\s\"'<>]+",
            # A secret-named flag and its value: --api-key V, --token=V, "--api-key", "V".
            r"((?<![\w-])--?[a-z0-9_-]*(?:key|token|secret|password|passwd|credentials?|auth)"
            r"(?:\s+|=|\"\s*,\s*\"|'\s*,\s*'))(?=[^\s\"'-])[^\s\"',]+",
            # docker -e NAME=VALUE, also as JSON array items.
            r"((?<![\w-])(?:-e|--env)(?:\s+|=|\"\s*,\s*\"|'\s*,\s*')[a-z_][a-z0-9_]*=)[^\s\"',]+",
            # A quoted or bare name ending in _KEY / -key / KEY=: OPENAI_KEY, "X-Api-Key".
            r"(\b[a-z0-9]+[_-](?:access[_-]?)?key[\"']?\s*[=:]\s*[\"']?)[^\s\"',;&]{4,}",
            r"(\bcredentials?[\"']?\s*[=:]\s*[\"']?)[^\s\"',;&]{4,}",
        )
    ),
    re.IGNORECASE,
)
_TOKEN_SHAPED_RE = re.compile(
    r"\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{4,}"
    r"|\bAIza[0-9A-Za-z_-]{20,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
)
# A flat JSON object under "env" or "headers": every string value in it.
_JSON_BLOCK_RE = re.compile(r"(?i)(\"(?:env|headers|http_headers|environment)\"\s*:\s*\{)([^{}]*)(\})")
_JSON_STRING_VALUE_RE = re.compile(r"(\"(?:[^\"\\]|\\.)*\"\s*:\s*\")((?:[^\"\\]|\\.)+)(\")")
# A TOML table named ...env or ...headers: every quoted value in it, up to the next table.
_TOML_TABLE_RE = re.compile(r"(?im)^(\[[^\]\n]*\b(?:env|headers|http_headers)\]\s*\n)((?:(?!\[).*(?:\n|$))*)")
_TOML_VALUE_RE = re.compile(r"(?m)^(\s*[\w.\"'-]+\s*=\s*)([\"'])(.+)\2")


def _prefixed_repl(m: re.Match) -> str:
    prefix = next((g for g in m.groups() if g is not None), "")
    return f"{prefix}{PLACEHOLDER}"


def _json_block_repl(m: re.Match) -> str:
    body = _JSON_STRING_VALUE_RE.sub(lambda v: f"{v.group(1)}{_keep_reference(v.group(2))}{v.group(3)}", m.group(2))
    return f"{m.group(1)}{body}{m.group(3)}"


def _toml_table_repl(m: re.Match) -> str:
    body = _TOML_VALUE_RE.sub(lambda v: f"{v.group(1)}{v.group(2)}{_keep_reference(v.group(3))}{v.group(2)}", m.group(2))
    return f"{m.group(1)}{body}"


def mask_text(text: str | None) -> str:
    """Text with values that look like secrets replaced. Line breaks are never changed."""
    if not text:
        return ""
    text = redact(text)
    if "{" in text and _JSON_BLOCK_RE.search(text) is not None:
        text = _JSON_BLOCK_RE.sub(_json_block_repl, text)
    if "[" in text and _TOML_TABLE_RE.search(text) is not None:
        text = _TOML_TABLE_RE.sub(_toml_table_repl, text)
    if _PREFIXED_SECRET_RE.search(text) is not None:
        text = _PREFIXED_SECRET_RE.sub(_prefixed_repl, text)
    if _TOKEN_SHAPED_RE.search(text) is not None:
        text = _TOKEN_SHAPED_RE.sub(PLACEHOLDER, text)
    return text


# ── MCP server definitions ───────────────────────────────────────

# A value that only names where the secret comes from: ${env:TOKEN}, $TOKEN, ${input:key}.
_REFERENCE_RE = re.compile(r"^(?:[A-Za-z]+\s+)?(?:\$\{[^}]+\}|\$[A-Za-z_]\w*)$")
_AUTH_SCHEME_RE = re.compile(r"^(basic|bearer|digest|token|negotiate)\s+\S", re.IGNORECASE)
_SECRET_FLAG_RE = re.compile(r"^--?[a-z0-9_-]*(?:key|token|secret|password|passwd|credentials?|auth|cookie)$", re.I)
_ENV_FLAGS = {"-e", "--env"}
_HEADER_FLAGS = {"--header", "--headers"}
_SECRET_KEY_RE = re.compile(r"(?i)(?:key|token|secret|password|passwd|credential|cookie|auth)")
_NAME_ONLY_KEYS = {"env", "headers", "http_headers", "environment"}
_URL_KEYS = {"url", "serverurl", "httpurl", "endpoint"}


def _keep_reference(value: str) -> str:
    return value if _REFERENCE_RE.match(value.strip()) else PLACEHOLDER


def _mask_value(value: Any) -> Any:
    """A value that may be a secret as a whole: kept empty, as a reference, or replaced."""
    if not isinstance(value, str):
        return PLACEHOLDER if value not in (None, "") else value
    if not value:
        return value
    scheme = _AUTH_SCHEME_RE.match(value)
    if scheme:
        rest = value[scheme.end() - 1:]
        return f"{value[: scheme.end() - 1]}{_keep_reference(rest)}"
    return _keep_reference(value)


def mask_url(url: str) -> str:
    """A URL with its user info and every query value replaced; scheme, host and path stay."""
    if not url or "://" not in url:
        return mask_text(url)
    try:
        parts = urlsplit(url)
        host = parts.hostname or ""
        port = parts.port
    except ValueError:
        return mask_text(url)
    netloc = parts.netloc
    if "@" in netloc:
        netloc = f"{PLACEHOLDER}@{host}{f':{port}' if port else ''}"
    query = "&".join(
        f"{pair.split('=', 1)[0]}={PLACEHOLDER}" if "=" in pair else pair for pair in parts.query.split("&") if pair
    )
    fragment = PLACEHOLDER if parts.fragment else ""
    return urlunsplit((parts.scheme, netloc, mask_text(parts.path), query, fragment))


def mask_arg(arg: str) -> str:
    return mask_url(arg) if "://" in arg else mask_text(arg)


def mask_args(args: list) -> list:
    """Arguments with the value of every secret-named flag replaced; flag names stay."""
    out: list = []
    pending = ""  # the flag whose value comes next
    for arg in args:
        if not isinstance(arg, str):
            out.append(arg)
            continue
        if pending and not arg.startswith("-"):
            if pending in _ENV_FLAGS:
                # -e NAME=VALUE carries a value; -e NAME only names a variable.
                out.append(f"{arg.split('=', 1)[0]}={_keep_reference(arg.split('=', 1)[1])}" if "=" in arg else arg)
            elif pending in _HEADER_FLAGS and ":" in arg:
                name, value = arg.split(":", 1)
                out.append(f"{name}: {_mask_value(value.strip())}")
            else:
                out.append(_keep_reference(arg))
            pending = ""
            continue
        pending = ""
        flag, eq, value = arg.partition("=")
        lowered = flag.lower()
        if arg.startswith("-") and (_SECRET_FLAG_RE.match(flag) or lowered in _ENV_FLAGS or lowered in _HEADER_FLAGS):
            if eq:
                out.append(f"{flag}={_keep_reference(value) if value else value}")
            else:
                out.append(arg)
                pending = lowered if lowered in _ENV_FLAGS or lowered in _HEADER_FLAGS else "secret"
            continue
        out.append(mask_arg(arg))
    return out


def _mask_mapping_values(value: Any) -> Any:
    """A mapping whose names stay and whose values are all replaced."""
    if isinstance(value, dict):
        return {k: _mask_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [mask_text(v) if isinstance(v, str) else _mask_mapping_values(v) for v in value]
    return _mask_value(value)


def _mask_any(key: str, value: Any) -> Any:
    lowered = key.lower()
    if lowered in _NAME_ONLY_KEYS:
        return _mask_mapping_values(value)
    if lowered == "args" and isinstance(value, list):
        return mask_args(value)
    if isinstance(value, dict):
        return {k: _mask_any(str(k), v) for k, v in value.items()}
    if isinstance(value, list):
        return [_mask_any(key, v) for v in value]
    if not isinstance(value, str):
        return value
    if lowered in _URL_KEYS:
        return mask_url(value)
    if _SECRET_KEY_RE.search(lowered):
        return _mask_value(value)
    return mask_arg(value)


def mask_mcp_config(config: Any) -> Any:
    """An MCP server definition safe to show: names kept, secret values replaced."""
    if not isinstance(config, dict):
        return config
    return {k: _mask_any(str(k), v) for k, v in config.items()}
