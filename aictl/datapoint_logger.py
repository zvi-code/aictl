# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Datapoint file logger — writes every sample and event as a line.

Produces two rotating log files:
  - ``samples.log``  — one line per metric sample
  - ``events.log``   — one line per event (session_start, file_modified, otel:*, hook:*, …)

Each line is a JSON object with all structured fields for easy grep/jq analysis.
Files rotate at a configurable size threshold (default 1 MB), keeping N backups.

Usage::

    from aictl.datapoint_logger import DatapointLogger
    logger = DatapointLogger("logs/", max_bytes=1_048_576, backup_count=10)
    logger.log_sample(ts, metric, value, tags)
    logger.log_event(ts, tool, kind, detail, session_id, ...)
    logger.close()
"""

from __future__ import annotations

import json
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any


def _make_rotating_logger(
    name: str,
    filepath: Path,
    max_bytes: int,
    backup_count: int,
) -> logging.Logger:
    """Create a logger with a RotatingFileHandler, no formatting overhead."""
    logger = logging.getLogger(f"aictl.datalog.{name}")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    # Remove existing handlers (in case of re-init)
    for h in list(logger.handlers):
        logger.removeHandler(h)
    handler = RotatingFileHandler(
        str(filepath),
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger


class DatapointLogger:
    """Writes every datapoint as a JSON line to rotating log files.

    Parameters
    ----------
    log_dir : str | Path
        Directory to write log files into (created if missing).
    max_bytes : int
        Rotate file after this many bytes (default 1 MB).
    backup_count : int
        Number of rotated backup files to keep.
    """

    def __init__(
        self,
        log_dir: str | Path = "logs",
        max_bytes: int = 1_048_576,
        backup_count: int = 10,
    ) -> None:
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self._samples_log = _make_rotating_logger(
            "samples", self.log_dir / "samples.log", max_bytes, backup_count)
        self._events_log = _make_rotating_logger(
            "events", self.log_dir / "events.log", max_bytes, backup_count)

    def log_sample(
        self,
        ts: float,
        metric: str,
        value: float,
        tags: dict[str, Any] | None = None,
        session_id: str = "",
        tool: str = "",
    ) -> None:
        """Write one sample as a JSON line."""
        line = {
            "ts": ts,
            "metric": metric,
            "value": value,
        }
        if tags:
            line["tags"] = tags
        if session_id:
            line["session_id"] = session_id
        if tool:
            line["tool"] = tool
        self._samples_log.info(json.dumps(line, separators=(",", ":")))

    def log_event(
        self,
        ts: float,
        tool: str,
        kind: str,
        detail: dict[str, Any] | None = None,
        session_id: str = "",
        pid: int = 0,
        model: str = "",
        path: str = "",
        input_tokens: int = 0,
        output_tokens: int = 0,
        duration_ms: float = 0,
        tool_name: str = "",
        prompt_id: str = "",
    ) -> None:
        """Write one event as a JSON line."""
        line: dict[str, Any] = {
            "ts": ts,
            "tool": tool,
            "kind": kind,
        }
        if session_id:
            line["session_id"] = session_id
        if pid:
            line["pid"] = pid
        if model:
            line["model"] = model
        if path:
            line["path"] = path
        if input_tokens:
            line["input_tokens"] = input_tokens
        if output_tokens:
            line["output_tokens"] = output_tokens
        if duration_ms:
            line["duration_ms"] = round(duration_ms, 1)
        if tool_name:
            line["tool_name"] = tool_name
        if prompt_id:
            line["prompt_id"] = prompt_id
        if detail:
            line["detail"] = detail
        self._events_log.info(json.dumps(line, separators=(",", ":")))

    def close(self) -> None:
        """Flush and close all log handlers."""
        for logger in (self._samples_log, self._events_log):
            for h in list(logger.handlers):
                h.flush()
                h.close()
                logger.removeHandler(h)
