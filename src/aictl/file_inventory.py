"""Build file inventory changes from discovery and local restart state."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from collections.abc import Callable, Iterable
from pathlib import Path

from .state_file import StateFile
from .stores.base import Row, Writer

log = logging.getLogger(__name__)


class FileInventory:
    def __init__(
        self, writer: Writer, state: StateFile, *, keeps_text: Callable[[], bool],
        sensitive: Callable[[str], bool], max_reads: int = 250, max_bytes: int = 512 * 1024,
    ) -> None:
        self._writer = writer
        self._state = state
        self._keeps_text = keeps_text
        self._sensitive = sensitive
        self._max_reads = max_reads
        self._max_bytes = max_bytes
        try:
            self._known = state.read()
        except (OSError, ValueError):
            log.warning("Cannot read the file inventory manifest %s", state.path, exc_info=True)
            self._known = {}
        self._dirty = False

    def sync(self, rows: Iterable[Row], *, now: float | None = None) -> dict[str, int]:
        now = time.time() if now is None else now
        stats = dict(added=0, updated=0, unchanged=0, removed=0, deferred=0)
        seen = {row["path"]: row for row in rows}
        if not seen:  # An empty scan can indicate a transient discovery failure.
            return stats
        known = self._known.copy()
        inventory, history, blobs, removed = [], [], {}, []
        reads = 0
        keeps_text = self._keeps_text()
        for path, row in seen.items():
            prev = self._known.get(path, {})
            text = keeps_text and not self._sensitive(path) and row["size_bytes"] <= self._max_bytes
            signature = [row[name] for name in ("tool", "category", "scope", "mtime", "size_bytes", "tokens", "meta")]
            signature.append(text)
            project = row.get("project", "")
            if prev.get("signature") == signature and prev.get("project", "") == project:
                stats["unchanged"] += 1
                continue
            digest = content_hash = ""
            lines = 0
            if text:
                if reads >= self._max_reads:
                    stats["deferred"] += 1
                    continue
                reads += 1
                try:
                    with Path(path).open("rb") as file:
                        raw = file.read(self._max_bytes + 1)
                    if len(raw) <= self._max_bytes:
                        content = raw.decode("utf-8", errors="replace")
                        digest = hashlib.sha256(raw).hexdigest()[:32]
                        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]
                        lines = content.count("\n") + int(bool(content) and not content.endswith("\n"))
                        if digest != prev.get("blob_hash"):
                            blobs[digest] = dict(project="", hash=digest, content=content,
                                                 size_bytes=len(raw), created_at=now)
                except OSError:
                    pass  # The scan still supplied inventory metadata.
            changed = not prev or digest != prev.get("blob_hash") or signature[:6] != prev["signature"][:6]
            # A version is a new file, new content, or, when no hash is available, a new size or mtime.
            version = (digest != prev.get("blob_hash")) if digest else (not prev or signature[3:5] != prev["signature"][3:5])
            if prev and prev.get("project", "") != project:
                removed.append(dict(project=prev.get("project", ""), path=path))
            state = dict(signature=signature, blob_hash=digest, first_seen=prev.get("first_seen", now),
                         last_changed=now if changed else prev["last_changed"], project=project)
            known[path] = state
            row = row | dict(project=project, blob_hash=digest, content_hash=content_hash, lines=lines,
                             first_seen=state["first_seen"], last_changed=state["last_changed"],
                             last_read=now if digest else 0.0)
            inventory.append(row)
            if version:
                history.append({k: row[k] for k in ("project", "path", "blob_hash", "content_hash",
                                                      "size_bytes", "tokens", "lines")} | {"ts": now})
            stats["updated" if prev else "added"] += 1
        for path in self._known.keys() - seen.keys():
            del known[path]
            removed.append(dict(project=self._known[path].get("project", ""), path=path))
            stats["removed"] += 1
        if blobs:
            self._writer.upsert("file_blobs", blobs.values())
        if history:
            self._writer.append("file_history", history)
        if inventory:
            self._writer.upsert("files", inventory)
        if removed:
            self._writer.delete("files", removed)
        self._dirty |= known != self._known
        self._known = known
        if self._dirty:
            self._state.replace(known)
            self._dirty = False
        return stats


def inventory_row(file, tool: str) -> Row:
    return dict(path=file.path, tool=getattr(file, "tool", "") or tool,
                category=getattr(file, "kind", ""), scope=getattr(file, "scope", ""),
                mtime=float(getattr(file, "mtime", 0) or 0), size_bytes=int(getattr(file, "size", 0)),
                tokens=int(getattr(file, "tokens", 0)),
                meta=json.dumps({"sent_to_llm": getattr(file, "sent_to_llm", "")}),
                project=getattr(file, "project", "") or "")
