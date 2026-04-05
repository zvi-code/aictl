# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Hook handler for AI coding tool integration.

Invoked by AI tools (Claude Code, Gemini CLI) as a hook command.
Reads JSON payload from stdin, enriches it with event metadata and
environment variables, POSTs it to the aictl server, and passes the
payload through to stdout.

Usage:
    python -m aictl.hook_handler --event SessionStart --port 8484
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request


def main() -> None:
    # Minimal arg parsing — no argparse import to keep startup fast.
    event = ""
    port = 8484
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--event" and i + 1 < len(args):
            event = args[i + 1]
            i += 2
        elif args[i] == "--port" and i + 1 < len(args):
            port = int(args[i + 1])
            i += 2
        else:
            i += 1

    # Read payload from stdin (AI tools pipe rich JSON here).
    if not sys.stdin.isatty():
        data = json.load(sys.stdin)
    else:
        data = {}

    # Enrich with event name and environment context.
    data["event"] = event
    data.setdefault("session_id", os.environ.get("SESSION_ID", ""))
    data.setdefault("cwd", os.environ.get("CWD", ""))

    # POST to aictl server (best-effort — never crash if server is down).
    try:
        req = urllib.request.Request(
            f"http://localhost:{port}/api/hooks",
            json.dumps(data).encode(),
            {"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=2)  # noqa: S310 — localhost only
    except Exception:  # noqa: BLE001, S110 — must not crash if aictl unreachable
        pass

    # Pass through to stdout for tool continuity.
    print(json.dumps(data))


if __name__ == "__main__":
    main()
