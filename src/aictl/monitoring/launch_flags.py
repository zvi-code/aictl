"""The launch flags of a tool process that change the configuration its session runs under.

Only flags on a per-tool allow-list are read, from the real argv (``secret_mask.raw_args``);
every value is masked before it leaves this module. A prompt's text is never a value here:
flags that carry one are recorded by presence only.

Value kinds:

- ``bool``: a switch, value "" (or what follows ``=``).
- ``value``: one value (``--flag v`` or ``--flag=v``).
- ``values``: the arguments up to the next flag (commander's variadic options), one entry each.
- ``json``: inline JSON (or a file path); inline JSON is replaced by PLACEHOLDER with its size and hash.
- ``secret``: the values are replaced by PLACEHOLDER (``--secret-env-vars``).
- ``presence``: the value is never read (prompt text).
"""

from __future__ import annotations

import hashlib
from collections.abc import Iterable
from typing import Any

from ..secret_mask import PLACEHOLDER, mask_text, mask_url, raw_args

# GitHub Copilot CLI 1.0.115 (``copilot --help``).
COPILOT_CLI_FLAGS: dict[str, str] = {
    "--model": "value", "--reasoning-effort": "value", "--mode": "value", "--plan": "bool", "--autopilot": "bool",
    "--agent": "value", "--add-dir": "value",
    "--allow-all": "bool", "--allow-all-tools": "bool", "--allow-all-paths": "bool", "--allow-all-urls": "bool",
    "--allow-all-mcp-server-instructions": "bool",
    "--allow-tool": "values", "--deny-tool": "values", "--allow-url": "values", "--deny-url": "values",
    "--yolo": "bool", "--sandbox": "bool",
    "--enable-mcp-server": "value", "--disable-mcp-server": "value", "--disable-builtin-mcps": "bool",
    "--additional-mcp-config": "json", "--available-tools": "values", "--excluded-tools": "values",
    "--experimental": "bool", "--no-experimental": "bool", "--enable-memory": "bool",
    "--no-custom-instructions": "bool", "--plugin-dir": "value", "--context": "value", "--auto-tier": "value",
    "--dynamic-retrieval": "value", "--secret-env-vars": "secret", "--trust-folder": "bool",
}
# Claude Code 2.1 (``claude --help``).
CLAUDE_CODE_FLAGS: dict[str, str] = {
    "--model": "value", "--effort": "value", "--permission-mode": "value", "--settings": "json",
    "--mcp-config": "json", "--dangerously-skip-permissions": "bool", "--add-dir": "values", "--agents": "json",
    "--append-system-prompt": "presence",
}
FLAGS_BY_TOOL: dict[str, dict[str, str]] = {"copilot-cli": COPILOT_CLI_FLAGS, "claude-code": CLAUDE_CODE_FLAGS}
VALUE_MAX = 160
MAX_ENTRIES = 64


def _masked(flag: str, kind: str, value: str) -> dict[str, Any]:
    if kind == "secret":
        return {"flag": flag, "value": PLACEHOLDER}
    if kind == "json" and value.lstrip().startswith(("{", "[")):
        raw = value.encode("utf-8", "replace")
        return {"flag": flag, "value": PLACEHOLDER, "inline_json": True, "bytes": len(raw),
                "hash": hashlib.sha256(raw).hexdigest()[:16]}
    shown = mask_url(value) if "://" in value else mask_text(value)
    return {"flag": flag, "value": shown[:VALUE_MAX]}


def launch_flags(tool: str | None, cmdline: Iterable[Any]) -> list[dict[str, Any]]:
    """The allow-listed flags of a command line, in argv order, each ``{"flag", "value", ...}`` masked.

    A flag given twice is two entries. A ``presence`` flag carries ``value_withheld`` and never its value.
    """
    spec = FLAGS_BY_TOOL.get(tool or "")
    if not spec:
        return []
    args = list(raw_args(cmdline))
    out: list[dict[str, Any]] = []
    index = 1  # args[0] is the program
    while index < len(args) and len(out) < MAX_ENTRIES:
        arg = args[index]
        index += 1
        if arg == "--":
            break
        flag, sep, inline = arg.partition("=")
        kind = spec.get(flag)
        if kind is None:
            continue
        if kind == "presence":
            out.append({"flag": flag, "value": "", "value_withheld": True})
            if not sep and index < len(args) and not args[index].startswith("-"):
                index += 1
            continue
        if kind == "bool":
            out.append({"flag": flag, "value": mask_text(inline)[:VALUE_MAX] if sep else ""})
            continue
        values = [inline] if sep else []
        if not sep:
            while index < len(args) and not args[index].startswith("-"):
                values.append(args[index])
                index += 1
                if kind != "values" and kind != "secret":
                    break
        if not values:
            out.append({"flag": flag, "value": ""})
        out.extend(_masked(flag, kind, value) for value in values)
    return out[:MAX_ENTRIES]
