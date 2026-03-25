"""Best-effort structured telemetry ingestion."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

from .base import BaseCollector
from ..config import MonitorConfig
from ..events import EventKind, UnifiedEvent


_INTERESTING_NAMES = ("otel", "trace", "span", "telemetry", "usage", "session")
_INTERESTING_SUFFIXES = (".json", ".jsonl", ".ndjson", ".log")


class StructuredTelemetryCollector(BaseCollector):
    """Tail structured logs for token counts when tools expose them."""

    name = "telemetry:structured"

    def __init__(self, config: MonitorConfig) -> None:
        self.config = config
        self._offsets: dict[str, int] = {}

    async def run(self, emit) -> None:
        if not any(path.exists() for path in self.config.state_paths):
            await self.emit_status(
                emit,
                status="disabled",
                mode="no-paths",
                detail="No state roots available for telemetry scanning",
            )
            return

        await self.emit_status(
            emit,
            status="active",
            mode="structured-json-tail",
            detail="Scanning state roots for usage/token telemetry",
        )

        while True:
            events = await asyncio.to_thread(self._poll)
            for event in events:
                await emit(event)
            await self.sleep(self.config.telemetry_interval)

    def _poll(self) -> list[UnifiedEvent]:
        events: list[UnifiedEvent] = []
        for path in self._candidate_files():
            events.extend(self._parse_file(path))
        return events

    def _candidate_files(self) -> list[Path]:
        candidates: list[Path] = []
        for root in self.config.state_paths:
            if not root.exists():
                continue
            root_depth = len(root.parts)
            for current_root, dir_names, file_names in os.walk(root):
                current_path = Path(current_root)
                depth = len(current_path.parts) - root_depth
                if depth >= 4:
                    dir_names[:] = []
                else:
                    dir_names[:] = [name for name in dir_names if name not in self.config.ignored_dir_names]
                for filename in file_names:
                    lowered = filename.lower()
                    if not lowered.endswith(_INTERESTING_SUFFIXES):
                        continue
                    if not any(fragment in lowered for fragment in _INTERESTING_NAMES):
                        continue
                    candidates.append(current_path / filename)
        return candidates

    def _parse_file(self, path: Path) -> list[UnifiedEvent]:
        key = str(path)
        events: list[UnifiedEvent] = []
        try:
            size = path.stat().st_size
        except OSError:
            return events

        offset = self._offsets.get(key, 0)
        if size < offset:
            offset = 0
        if size == offset:
            return events

        try:
            with path.open("r", encoding="utf-8", errors="ignore") as handle:
                handle.seek(offset)
                for line in handle:
                    payload = _parse_json_candidate(line)
                    if payload is None:
                        continue
                    usage = _extract_usage_tokens(payload)
                    if usage is None:
                        continue
                    events.append(
                        UnifiedEvent(
                            kind=EventKind.TELEMETRY,
                            source=self.name,
                            tool_hint=_tool_hint_for_path(key),
                            metrics={
                                "input_tokens": usage[0],
                                "output_tokens": usage[1],
                            },
                            payload={"path": key},
                        )
                    )
                self._offsets[key] = handle.tell()
        except OSError:
            return events

        return events


def _parse_json_candidate(line: str) -> Any | None:
    text = line.strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _extract_usage_tokens(payload: Any) -> tuple[int, int] | None:
    if isinstance(payload, dict):
        for input_key, output_key in (
            ("input_tokens", "output_tokens"),
            ("prompt_tokens", "completion_tokens"),
            ("promptTokens", "completionTokens"),
        ):
            if input_key in payload or output_key in payload:
                return int(payload.get(input_key, 0) or 0), int(payload.get(output_key, 0) or 0)

        usage = payload.get("usage")
        if isinstance(usage, dict):
            nested = _extract_usage_tokens(usage)
            if nested is not None:
                return nested

        for value in payload.values():
            nested = _extract_usage_tokens(value)
            if nested is not None:
                return nested

    if isinstance(payload, list):
        for item in payload:
            nested = _extract_usage_tokens(item)
            if nested is not None:
                return nested

    return None


def _tool_hint_for_path(path: str) -> str | None:
    lowered = path.lower()
    if "claude" in lowered:
        return "claude-code"
    if "copilot" in lowered:
        return "copilot-cli"
    if "codex" in lowered:
        return "codex-cli"
    return None
