# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: ps and top — what AI agents are doing right now, with no daemon."""

from __future__ import annotations

import json
import shutil
import sys
import time

import click

MIN_INTERVAL_S = 1.0


def _width(stream) -> int | None:
    return shutil.get_terminal_size().columns if getattr(stream, "isatty", lambda: False)() else None


@click.command("ps")
@click.argument("target", required=False)
@click.option("--tool", default=None, help="Only this tool, for example copilot-cli")
@click.option("--all", "include_ended", is_flag=True, help="Include recently ended sessions")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON (stable schema)")
def ps(target, tool, include_ended, as_json):
    """Show a tree of running AI tools, sessions, sub-agents and processes.

    TARGET is a session id prefix or a PID, and shows that one in full detail.
    """
    from ..observe.collect import Collector
    from ..observe.render import render

    doc = Collector().collect(tool=tool, include_ended=include_ended, target=target)
    if target and not doc["tools"]:
        raise click.ClickException(f"No session or AI tool process matches {target!r}")
    if target:
        from ..observe.sessions import annotate_observed

        annotate_observed(doc)
    if as_json:
        click.echo(json.dumps(doc, indent=2))
        return
    stream = click.get_text_stream("stdout")
    click.echo(render(doc, stream, full=bool(target), width=_width(stream) if not target else None))


class _Keys:
    """Single-key input: msvcrt on Windows, termios elsewhere; disabled when neither applies."""

    def __init__(self) -> None:
        self.enabled = False
        self._saved = None
        self._msvcrt = None
        if not sys.stdin.isatty():
            return
        try:
            import msvcrt

            self._msvcrt = msvcrt
            self.enabled = True
            return
        except ImportError:
            pass
        try:
            import termios
            import tty

            self._termios = termios
            self._fd = sys.stdin.fileno()
            self._saved = termios.tcgetattr(self._fd)
            tty.setcbreak(self._fd)
            self.enabled = True
        except (ImportError, OSError, ValueError):
            self.enabled = False

    def close(self) -> None:
        if self._saved is not None:
            self._termios.tcsetattr(self._fd, self._termios.TCSADRAIN, self._saved)

    def read(self, timeout: float) -> str | None:
        if not self.enabled:
            time.sleep(timeout)
            return None
        if self._msvcrt is not None:
            end = time.monotonic() + timeout
            while time.monotonic() < end:
                if self._msvcrt.kbhit():
                    ch = self._msvcrt.getwch()
                    if ch in ("\x00", "\xe0"):
                        return {"H": "up", "P": "down"}.get(self._msvcrt.getwch())
                    return ch
                time.sleep(0.05)
            return None
        import os
        import select

        ready, _, _ = select.select([self._fd], [], [], timeout)
        if not ready:
            return None
        ch = os.read(self._fd, 1).decode("utf-8", "replace")
        if ch == "\x1b" and select.select([self._fd], [], [], 0.02)[0]:
            seq = os.read(self._fd, 2)
            return {b"[A": "up", b"[B": "down"}.get(seq)
        return ch


def filter_doc(doc: dict, text: str) -> dict:
    """Keep sessions whose id, tool, state, model or folder contains *text*."""
    if not text:
        return doc
    needle = text.lower()
    tools = []
    for t in doc["tools"]:
        hay = lambda s: " ".join(str(s.get(k) or "") for k in ("id", "tool", "state", "model", "cwd", "title"))  # noqa: E731
        sessions = [s for s in t["sessions"] if needle in hay(s).lower()]
        if sessions or needle in t["tool"].lower():
            tools.append({**t, "sessions": sessions or t["sessions"]})
    return {**doc, "tools": tools}


@click.command("top")
@click.option("--tool", default=None, help="Only this tool, for example copilot-cli")
@click.option("--all", "include_ended", is_flag=True, help="Include recently ended sessions")
@click.option("--interval", default=2.0, show_default=True, help="Seconds between refreshes (minimum 1)")
@click.option("--iterations", default=0, hidden=True, help="Stop after N refreshes")
def top(tool, include_ended, interval, iterations):
    """Live view of ps. Keys: j/k or arrows move, Enter expands, / filters, a toggles ended, q quits."""
    from ..observe.collect import Collector
    from ..observe.render import build_nodes, charset_for, enable_vt, flatten, paint, safe_text, use_color

    stream = click.get_text_stream("stdout")
    interval = max(MIN_INTERVAL_S, interval)
    tty = stream.isatty()
    vt = tty and enable_vt()
    color = use_color(stream)
    chars = charset_for(stream)
    collector = Collector()
    keys = _Keys()
    expanded: set[str] = set()
    cursor = 0
    needle = ""
    typing = False
    count = 0
    next_at = 0.0
    doc = None
    try:
        while True:
            if time.monotonic() >= next_at:
                doc = collector.collect(tool=tool, include_ended=include_ended)
                next_at = time.monotonic() + interval
                count += 1
            shown = filter_doc(doc, needle)
            rows = [r for r in flatten(build_nodes(shown, expanded), chars) if r[1].key and not r[1].key.startswith("tool:")]
            cursor = min(cursor, max(len(rows) - 1, 0))
            selected = rows[cursor][1].key if rows else ""
            help_line = (
                "j/k move  Enter expand  / filter  a ended  q quit"
                if keys.enabled
                else "keys unavailable here; Ctrl+C quits"
            )
            status = f"filter: {needle}_" if typing else (f"filter: {needle}  " if needle else "") + help_line
            size = shutil.get_terminal_size()
            out = [f"aictl top  {time.strftime('%H:%M:%S')}  collect {doc['elapsed_ms']:.0f}ms  {status}"]
            for text, node in flatten(build_nodes(shown, expanded), chars):
                mark = ">" if node.key and node.key == selected else " "
                line = f"{mark}{text}"
                if tty:
                    line = line[: size.columns - 1]
                out.append(paint(line, node.state, color))
            if tty:
                out = out[: size.lines - 1]
            body = safe_text("\n".join(out), stream)
            click.echo(("\x1b[H\x1b[2J" if vt else "") + body)
            if iterations and count >= iterations:
                return
            key = keys.read(min(interval, max(0.05, next_at - time.monotonic())))
            if key is None:
                continue
            if typing:
                if key in ("\r", "\n", "\x1b"):
                    typing = False
                elif key in ("\x7f", "\b"):
                    needle = needle[:-1]
                elif key.isprintable():
                    needle += key
            elif key in ("q", "Q", "\x03"):
                return
            elif key in ("j", "down"):
                cursor += 1
            elif key in ("k", "up"):
                cursor = max(0, cursor - 1)
            elif key in ("\r", "\n", " ") and selected:
                expanded.symmetric_difference_update({selected})
            elif key == "/":
                typing = True
                needle = ""
            elif key == "a":
                include_ended = not include_ended
                next_at = 0.0
    except KeyboardInterrupt:
        return
    finally:
        keys.close()
