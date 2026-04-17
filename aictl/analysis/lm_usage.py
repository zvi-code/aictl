# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""VS Code Language-Model usage aggregation.

When VS Code's Copilot Chat extension has OTel enabled, each
per-extension language-model call lands in our OTel receiver as an
event of kind ``otel:language_model.usage`` (or similar) with the
extension id plus token counts attached as span attributes.

This module derives a per-extension breakdown for one session by
scanning the already-stored events — no new table.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from ..storage import HistoryDB

# Event kinds we'll consider as carriers of VS Code LM-usage records.
# The OTel receiver stores logs as ``otel:<event.name>``.
_KIND_SUFFIXES: tuple[str, ...] = (
    "language_model.usage",
    "lm.usage",
    "copilot.lm.usage",
)

# Attribute-name synonyms for the extension identifier.
_EXTENSION_ID_KEYS: tuple[str, ...] = (
    "extension.id",
    "extensionId",
    "language_model.extension.id",
    "copilot.lm.extension_id",
    "vscode.extension.id",
)


def _is_lm_usage_kind(kind: str) -> bool:
    return any(kind.endswith(s) or kind.endswith(":" + s) for s in _KIND_SUFFIXES)


def _num(val: Any) -> int:
    try:
        return int(val) if val is not None and val != "" else 0
    except (TypeError, ValueError):
        try:
            return int(float(val))
        except (TypeError, ValueError):
            return 0


def _extension_id(detail: dict) -> str:
    for k in _EXTENSION_ID_KEYS:
        v = detail.get(k)
        if isinstance(v, str) and v:
            return v
    return ""


def session_lm_usage(db: "HistoryDB", session_id: str, limit: int = 2000) -> dict:
    """Return per-extension LM token usage for *session_id*.

    Output shape:

    ``{"by_extension": {ext_id: {"input_tokens": N, "output_tokens": M,
                                   "total_tokens": N+M, "calls": K,
                                   "models": [model, ...]}},
       "total_tokens": T, "total_calls": C}``
    """
    empty: dict = {"by_extension": {}, "total_tokens": 0, "total_calls": 0}
    if not session_id:
        return empty
    events = db.query_events(session_id=session_id, limit=limit)
    by_ext: dict[str, dict] = {}
    total_in = 0
    total_out = 0
    total_calls = 0
    for ev in events:
        kind = ev.kind or ""
        if not _is_lm_usage_kind(kind):
            continue
        detail = ev.detail if isinstance(ev.detail, dict) else {}
        ext = _extension_id(detail) or "(unknown)"
        in_tok = _num(
            detail.get("gen_ai.usage.input_tokens")
            or detail.get("gen_ai.usage.prompt_tokens")
            or detail.get("input_tokens")
            or detail.get("prompt_tokens")
        )
        out_tok = _num(
            detail.get("gen_ai.usage.output_tokens")
            or detail.get("gen_ai.usage.completion_tokens")
            or detail.get("output_tokens")
            or detail.get("completion_tokens")
        )
        model = (
            detail.get("gen_ai.request.model")
            or detail.get("model")
            or detail.get("language_model.model")
            or ""
        )
        entry = by_ext.setdefault(
            ext,
            {
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "calls": 0,
                "models": [],
            },
        )
        entry["input_tokens"] += in_tok
        entry["output_tokens"] += out_tok
        entry["total_tokens"] += in_tok + out_tok
        entry["calls"] += 1
        if isinstance(model, str) and model and model not in entry["models"]:
            entry["models"].append(model)
        total_in += in_tok
        total_out += out_tok
        total_calls += 1
    return {
        "by_extension": by_ext,
        "total_tokens": total_in + total_out,
        "total_input_tokens": total_in,
        "total_output_tokens": total_out,
        "total_calls": total_calls,
    }


__all__ = ["session_lm_usage"]
