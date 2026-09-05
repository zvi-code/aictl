"""Per-model list pricing (USD per million tokens) with a documented fallback.

Single source of truth for cost estimates in the dashboard. Rates are
Anthropic first-party API list prices; partner platforms (Bedrock, Vertex)
differ. Lookup tolerates the model-ID spellings tools actually emit: exact
ID, a trailing ``-YYYYMMDD`` snapshot suffix, or a longer variant sharing a
known prefix (``claude-sonnet-5-something`` → ``claude-sonnet-5``).

Unknown models price at :data:`DEFAULT_PRICING_MODEL` so a cost is always
shown, and :func:`resolve_pricing` reports which model's rate was used so
the UI can label an estimate as a fallback instead of presenting it as
exact.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ModelPricing:
    """USD per 1M tokens."""

    input_per_m: float
    output_per_m: float

    def cost_usd(self, input_tokens: int | float, output_tokens: int | float) -> float:
        return (max(0.0, float(input_tokens)) / 1e6) * self.input_per_m + (
            max(0.0, float(output_tokens)) / 1e6
        ) * self.output_per_m


# Anthropic list prices (cached 2026-06). Keep newest first within a family so
# prefix matching prefers the most specific key.
MODEL_PRICING: dict[str, ModelPricing] = {
    "claude-fable-5-1": ModelPricing(10.0, 50.0),
    "claude-fable-5": ModelPricing(10.0, 50.0),
    "claude-mythos-5-1": ModelPricing(10.0, 50.0),
    "claude-opus-5": ModelPricing(5.0, 25.0),
    "claude-opus-4-8": ModelPricing(5.0, 25.0),
    "claude-opus-4-7": ModelPricing(5.0, 25.0),
    "claude-opus-4-6": ModelPricing(5.0, 25.0),
    "claude-opus-4-5": ModelPricing(5.0, 25.0),
    "claude-sonnet-5": ModelPricing(2.0, 10.0),
    "claude-sonnet-4-6": ModelPricing(3.0, 15.0),
    "claude-sonnet-4-5": ModelPricing(3.0, 15.0),
    "claude-sonnet-4": ModelPricing(3.0, 15.0),
    "claude-haiku-4-5": ModelPricing(1.0, 5.0),
}

# Rate applied when the model is unknown or missing. Opus 5 is Claude Code's
# current default model, so it is the least-wrong guess for unattributed
# Claude Code usage.
DEFAULT_PRICING_MODEL = "claude-opus-5"

_DATE_SUFFIX = re.compile(r"-\d{8}$")


def normalize_model_id(model: str | None) -> str:
    """Lower-case, strip a ``-YYYYMMDD`` snapshot suffix, and map dotted
    Claude versions (``claude-sonnet-4.6``) to the hyphenated API form."""
    if not model:
        return ""
    m = model.strip().lower()
    m = _DATE_SUFFIX.sub("", m)
    if m.startswith("claude-"):
        m = m.replace(".", "-")
    return m


def resolve_pricing(model: str | None) -> tuple[str, ModelPricing]:
    """Return ``(pricing_model_id, pricing)`` for *model*.

    ``pricing_model_id`` is the table key whose rate was applied — the
    model itself when known, otherwise :data:`DEFAULT_PRICING_MODEL`.
    """
    m = normalize_model_id(model)
    if m in MODEL_PRICING:
        return m, MODEL_PRICING[m]
    if m:
        # Longest known key that is a prefix of the reported id, on a
        # hyphen boundary so "claude-opus-5" never matches "claude-opus-50".
        best = ""
        for key in MODEL_PRICING:
            if m.startswith(key + "-") and len(key) > len(best):
                best = key
        if best:
            return best, MODEL_PRICING[best]
    return DEFAULT_PRICING_MODEL, MODEL_PRICING[DEFAULT_PRICING_MODEL]


def cost_usd(model: str | None, input_tokens: int | float, output_tokens: int | float) -> float:
    """Estimated USD cost for the given token counts under *model*'s rate."""
    _, pricing = resolve_pricing(model)
    return pricing.cost_usd(input_tokens, output_tokens)
