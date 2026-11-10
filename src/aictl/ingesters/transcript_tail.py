"""Shared streaming JSONL framing for history ingestion and current native output."""

from __future__ import annotations

import json
import re
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import BinaryIO

TYPE_RE = re.compile(rb'"type"\s*:\s*"([^"]+)"')
HEAD_BYTES = 600
UNREAD_TYPES = frozenset({b"api-request-blob", b"api-request-shape", b"queued_command", b"prompt_snapshot"})


@dataclass(frozen=True, slots=True)
class TranscriptRecord:
    offset: int
    data: dict | None
    complete: bool = True
    discarded: bool = False
    kind: bytes | None = None


def records(
    stream: BinaryIO,
    *,
    max_line_bytes: int | None = None,
    allowed_types: frozenset[bytes] | None = None,
    stop_at: int | None = None,
    decode: Callable[[bytes, bytes | None], object] | None = None,
) -> Iterator[TranscriptRecord]:
    """Consume complete lines only, advancing past malformed/irrelevant records.

    The live reader bounds both a line's allocation and a pass's byte range.
    Historical ingestion retains its existing unlimited-line behavior. An
    incomplete final line is left at its start for the next append.
    """
    while stop_at is None or stream.tell() < stop_at:
        start = stream.tell()
        limit = -1 if max_line_bytes is None else max_line_bytes + 1
        if stop_at is not None:
            limit = min(limit, stop_at - start) if limit > 0 else stop_at - start
        line = stream.readline(limit)
        if not line:
            return
        head = TYPE_RE.search(line, 0, HEAD_BYTES)
        kind = head.group(1) if head is not None else None
        oversized = max_line_bytes is not None and len(line) > max_line_bytes
        if oversized:
            while line and not line.endswith(b"\n"):
                if stop_at is not None and stream.tell() >= stop_at:
                    yield TranscriptRecord(stream.tell(), None, complete=False, discarded=True, kind=kind)
                    return
                limit = 64 * 1024
                if stop_at is not None:
                    limit = min(limit, stop_at - stream.tell())
                line = stream.readline(limit)
            if not line.endswith(b"\n"):
                yield TranscriptRecord(stream.tell(), None, complete=False, discarded=True, kind=kind)
                return
            yield TranscriptRecord(stream.tell(), None, discarded=True, kind=kind)
            continue
        if not line.endswith(b"\n"):
            stream.seek(start)
            return
        if kind is not None and (
            kind in UNREAD_TYPES
            or allowed_types is not None and kind not in allowed_types
        ):
            yield TranscriptRecord(stream.tell(), None)
            continue
        try:
            obj = decode(line, kind) if decode else json.loads(line)
        except ValueError:
            obj = None
        yield TranscriptRecord(stream.tell(), obj if isinstance(obj, dict) else None)
