# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Session names: where the tools keep them, and the one rule for which name wins.

A name has a source. ``user``: the user named or renamed the session. ``tool``: the tool
made the title or summary. ``prompt``: derived from prompt text. A name of a higher source
replaces a lower one; the same source replaces its own name when the text differs, so the
latest name wins and a rename is picked up. An empty name never clears a stored one.

Sessions stored before names were uploaded get their names when their files are read again
(the reader versions of ``transcript_usage``).
"""

from __future__ import annotations

import json
import logging
import os
import re
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from ..observe.copilot_events import clean
from ._common import open_readonly

log = logging.getLogger(__name__)

TITLE_MAX = 120
USER, TOOL, PROMPT = "user", "tool", "prompt"
_RANK = {PROMPT: 1, TOOL: 2, USER: 3}

Title = tuple[str, str]  # (text, source)

# Claude Code writes these lines into a session's transcript: the line type, the key that
# holds the text, and the source of that text.
CLAUDE_TITLE_LINES: dict[str, tuple[str, str]] = {
    "custom-title": ("customTitle", USER),
    "agent-name": ("agentName", USER),
    "ai-title": ("aiTitle", TOOL),
    "last-prompt": ("lastPrompt", PROMPT),
}
CLAUDE_TITLE_TYPES = frozenset(kind.encode() for kind in CLAUDE_TITLE_LINES)
_CLAUDE_TITLE_HEAD = re.compile(rb'\{\s*"type"\s*:\s*"(?:custom-title|agent-name|ai-title|last-prompt)"')


def clean_title(text: Any) -> str:
    """One line of at most TITLE_MAX characters; anything that is not text is no title."""
    return clean(text, TITLE_MAX) if isinstance(text, str) else ""


def outranks(old: str, old_source: str, new: str, new_source: str) -> bool:
    """True when the name (*new*, *new_source*) replaces the stored (*old*, *old_source*)."""
    if not new or new_source not in _RANK:
        return False
    if not old:
        return True
    rank, old_rank = _RANK[new_source], _RANK.get(old_source, 0)
    return rank > old_rank or (rank == old_rank and new != old)


def best_title(titles: Iterable[Title]) -> Title:
    """The name that wins when *titles* are met in order."""
    best: Title = ("", "")
    for text, source in titles:
        if outranks(*best, text, source):
            best = (text, source)
    return best


def claude_title(obj: dict) -> Title | None:
    """The name a Claude Code transcript line carries, if it is one of the name lines."""
    spec = CLAUDE_TITLE_LINES.get(obj.get("type"))  # type: ignore[arg-type]
    if spec is None:
        return None
    text = clean_title(obj.get(spec[0]))
    return (text, spec[1]) if text else None


def chat_title(obj: dict) -> str:
    """The ``customTitle`` a VS Code chat file line sets: in its snapshot header or as a patch line."""
    value = obj.get("v")
    if obj.get("kind") == 0 and isinstance(value, dict):
        return clean_title(value.get("customTitle"))
    path = obj.get("k")
    if isinstance(path, list) and path == ["customTitle"]:
        return clean_title(value)
    return ""


def read_claude_titles(path: Path) -> Title:
    """The winning name in one Claude Code transcript, reading only its name lines."""
    best: Title = ("", "")
    try:
        with open(path, "rb") as fh:
            for line in fh:
                if not _CLAUDE_TITLE_HEAD.match(line) or not line.endswith(b"\n"):
                    continue
                try:
                    obj = json.loads(line)
                except ValueError:
                    continue
                if not isinstance(obj, dict) or obj.get("sessionId") not in (None, "", path.stem):
                    continue  # a resumed session's copy of the earlier session's name
                found = claude_title(obj)
                if found and outranks(*best, *found):
                    best = found
    except OSError as exc:
        log.debug("session-titles: cannot read %s: %s", path.name, exc)
    return best


def _signature(path: Path) -> tuple[int, int] | None:
    try:
        st = path.stat()
    except OSError:
        return None
    return st.st_mtime_ns, st.st_size


class CopilotTitles:
    """Names of GitHub Copilot sessions: ``session-state/<id>/workspace.yaml`` and ``session-store.db``.

    A session folder is read again when its ``workspace.yaml`` changed, the store when the
    file changed. ``read`` returns the names that are new or changed since the last call.
    """

    def __init__(self, state_dir: Path, store_db: Path) -> None:
        self.state_dir = state_dir
        self.store_db = store_db
        self._yaml_sig: dict[str, tuple[int, int] | None] = {}
        self._yaml: dict[str, Title] = {}
        self._store_sig: tuple[int, int] | None = None
        self._summary: dict[str, str] = {}
        self._given: dict[str, Title] = {}

    def read(self) -> dict[str, Title]:
        from ..observe.collect import _workspace_yaml

        touched: set[str] = set()
        try:
            names = [e.name for e in os.scandir(self.state_dir)
                     if not e.name.startswith(".") and e.is_dir(follow_symlinks=False)]
        except OSError:
            names = []
        for sid in names:
            sig = _signature(self.state_dir / sid / "workspace.yaml")
            if sid in self._yaml_sig and self._yaml_sig[sid] == sig:
                continue
            self._yaml_sig[sid] = sig
            touched.add(sid)
            meta = _workspace_yaml(self.state_dir / sid) if sig else {}
            text = clean_title(meta.get("name"))
            if text:
                self._yaml[sid] = (text, USER if meta.get("user_named", "").lower() == "true" else TOOL)
            else:
                self._yaml.pop(sid, None)
        sig = _signature(self.store_db)
        if sig is not None and sig != self._store_sig:
            summaries = self._read_summaries()
            if summaries is not None:
                touched |= set(summaries) | set(self._summary)
                self._summary, self._store_sig = summaries, sig
        changed: dict[str, Title] = {}
        for sid in touched:
            title = self._yaml.get(sid) or ((self._summary[sid], TOOL) if self._summary.get(sid) else None)
            if title and self._given.get(sid) != title:
                self._given[sid] = changed[sid] = title
        return changed

    def _read_summaries(self) -> dict[str, str] | None:
        conn = open_readonly(self.store_db, "session-titles")
        if conn is None:
            return None
        try:
            return {str(sid): text for sid, summary in conn.execute("SELECT id, summary FROM sessions")
                    if (text := clean_title(summary))}
        except Exception as exc:  # noqa: BLE001 - sqlite3.Error, or an old store with no summary column
            log.debug("session-titles: store read failed, retrying when it changes: %s", exc)
            return None
        finally:
            conn.close()


class CodexTitles:
    """Names of Codex threads: ``state_*.sqlite`` table ``threads``, and ``session_index.jsonl``.

    A thread's id is the id of the rollout that holds its session. ``name`` and the index
    are the user's names; a ``title`` that is not the first message is the tool's; one
    that is the first message is prompt text.
    """

    def __init__(self, home: Path) -> None:
        self.home = home
        self._sig: tuple | None = None
        self._given: dict[str, Title] = {}

    def _store(self) -> Path | None:
        found = sorted(self.home.glob("state_*.sqlite"), key=lambda p: (len(p.stem), p.stem))
        return found[-1] if found else None

    def read(self) -> dict[str, Title]:
        store, index = self._store(), self.home / "session_index.jsonl"
        sig = (store, store and _signature(store), _signature(index))
        if sig == self._sig:
            return {}
        titles = self._threads(store) if store else {}
        for sid, text in self._index(index).items():
            titles[sid] = (text, USER)
        self._sig = sig
        changed = {sid: title for sid, title in titles.items() if self._given.get(sid) != title}
        self._given.update(changed)
        return changed

    @staticmethod
    def _threads(store: Path) -> dict[str, Title]:
        conn = open_readonly(store, "session-titles")
        if conn is None:
            return {}
        try:
            columns = {r[1] for r in conn.execute("PRAGMA table_info(threads)")}
            if "id" not in columns:
                return {}
            wanted = [c for c in ("title", "name", "first_user_message") if c in columns]
            titles: dict[str, Title] = {}
            for sid, *values in conn.execute(f"SELECT id, {', '.join(wanted) or 'NULL'} FROM threads"):
                row = dict(zip(wanted, values))
                title, name = clean_title(row.get("title")), clean_title(row.get("name"))
                if name:
                    titles[str(sid)] = (name, USER)
                elif title:
                    first = clean_title(row.get("first_user_message"))
                    titles[str(sid)] = (title, PROMPT if title == first else TOOL)
            return titles
        except Exception as exc:  # noqa: BLE001 - sqlite3.Error; try again when the file changes
            log.debug("session-titles: codex state read failed: %s", exc)
            return {}
        finally:
            conn.close()

    @staticmethod
    def _index(path: Path) -> dict[str, str]:
        names: dict[str, str] = {}
        try:
            with open(path, "rb") as fh:
                for line in fh:
                    try:
                        obj = json.loads(line)
                    except ValueError:
                        continue
                    text = clean_title(obj.get("thread_name")) if isinstance(obj, dict) else ""
                    if text and obj.get("id"):
                        names[str(obj["id"])] = text
        except OSError:
            pass
        return names
