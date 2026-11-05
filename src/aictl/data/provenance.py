"""Where a usage number came from, and how far to trust it.

Every headline token or cost figure the API returns carries these fields so the
UI can say so instead of presenting a guess and a measurement alike:

``tokens_source``  ``transcript`` | ``otel`` | ``hook`` | ``imported`` | ``none``
``tokens_quality`` ``exact`` | ``partial`` | ``estimated`` | ``unknown``
``cost_source``    ``list_price`` | ``reported`` | ``none``
``cost_quality``   ``estimated`` | ``partial`` | ``reported`` | ``unknown``
``cost_reason``    Human-readable; always set when ``cost_usd`` is ``None``.

A cost of 0 and an unknown cost are different facts: an unknown cost is
``None``, never ``0.0``. List-price costs are always ``estimated``, because a
subscription or partner platform bills differently, however exact the tokens.
"""

from __future__ import annotations

from typing import Any

from .model_pricing import resolve_pricing

COPILOT_COST_REASON = (
    "Copilot bills AI credits or premium requests, not vendor list prices; "
    "see billing_amount. estimated_list_usd is an estimate, not a charge"
)
# 1 AI credit = $0.01 (GitHub billing docs); plan allowances may cover credits.
USD_PER_AI_CREDIT = 0.01

# Higher wins whenever two sources describe the same session. Sources are never
# added together: they are views of the same tokens.
SOURCE_RANK = {"transcript": 3, "otel": 2, "hook": 1}


def _source_of(row: dict[str, Any]) -> str:
    raw = str(row.get("source") or "").lower()
    if "transcript" in raw:
        return "transcript"
    if "otel" in raw:
        return "otel"
    if "hook" in raw:
        return "hook"
    return "imported" if raw else "none"


def row_provenance(row: dict[str, Any]) -> dict[str, Any]:
    """Provenance for a ``sessions`` row that no transcript covers."""
    inp = int(row.get("input_tokens") or 0)
    out = int(row.get("output_tokens") or 0)
    read = int(row.get("cache_read_tokens") or 0)
    write = int(row.get("cache_creation_tokens") or 0)
    has_tokens = bool(inp or out or read or write)
    source = _source_of(row)
    if not has_tokens:
        fields: dict[str, Any] = {
            "tokens_source": "none",
            "tokens_quality": "unknown",
            "tokens_reason": "no source reported tokens for this session",
        }
    elif source == "otel":
        fields = {"tokens_source": "otel", "tokens_quality": "exact", "tokens_reason": "OpenTelemetry usage events"}
    else:
        fields = {
            "tokens_source": source,
            "tokens_quality": "partial",
            "tokens_reason": "totals from a hook or import payload; not checked against a transcript",
        }
    reported = float(row.get("cost_usd") or 0)
    fields.update(billing_unit="", billing_amount=None, premium_requests=None, estimated_list_usd=None)
    if str(row.get("tool") or "").startswith("copilot"):
        fields.update(cost_usd=None, cost_source="none", cost_quality="unknown", cost_reason=COPILOT_COST_REASON)
        fields["billing_unit"] = "ai_credits"
    elif reported > 0:
        fields.update(cost_usd=reported, cost_source="reported", cost_quality="reported", cost_reason="reported by the tool")
    elif not has_tokens:
        fields.update(cost_usd=None, cost_source="none", cost_quality="unknown", cost_reason="no token data to price")
    else:
        _, pricing = resolve_pricing(str(row.get("model") or ""))
        if pricing is None:
            model = row.get("model") or "(none)"
            fields.update(cost_usd=None, cost_source="none", cost_quality="unknown", cost_reason=f"no list price for model: {model}")
            fields["unpriced_models"] = [str(model)]
        else:
            fields.update(
                cost_usd=round(pricing.cost_usd(inp, out, read, write), 6),
                cost_source="list_price",
                cost_quality="estimated",
                cost_reason="list price x session totals at one model's rate",
            )
    fields.setdefault("unpriced_models", [])
    return fields


def usage_provenance(usage: dict[str, Any]) -> dict[str, Any]:
    """Provenance for a ``session_usage`` row (a parsed transcript)."""
    return {
        "tokens_source": usage.get("source") or "transcript",
        "tokens_quality": usage.get("quality") or "exact",
        "tokens_reason": usage.get("quality_reason") or "request-level usage read from the transcript",
        "cost_usd": usage.get("cost_usd"),
        "cost_source": "list_price" if usage.get("cost_usd") is not None else "none",
        "cost_quality": usage.get("cost_quality") or "unknown",
        "cost_reason": usage.get("cost_reason") or "",
        "unpriced_models": list(usage.get("unpriced_models") or []),
        "billing_unit": usage.get("billing_unit") or "",
        "billing_amount": usage.get("billing_amount"),
        "premium_requests": usage.get("premium_requests"),
        "estimated_list_usd": usage.get("estimated_list_usd"),
    }


def combine_cost_quality(qualities: set[str]) -> str:
    """Quality of a sum: one unknown part makes the whole sum partial."""
    known = qualities - {"unknown"}
    if not known:
        return "unknown"
    if len(known) < len(qualities) or "partial" in known:
        return "partial"
    return "estimated" if "estimated" in known else "reported"


def combine_tokens_quality(qualities: set[str]) -> str:
    if not qualities:
        return "unknown"
    if qualities == {"exact"}:
        return "exact"
    return "estimated" if qualities == {"estimated"} else "partial"
