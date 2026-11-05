"""aictl.data.model_pricing — per-model list prices, with no fallback.

Regression guard for /api/project-costs, which used to price every model at a
fixed $3/$15 (legacy Sonnet rates mislabelled "Opus-class"), under-reporting
Fable 5.1 by ~3x and over-reporting Sonnet 5 by 1.5x.
"""

from __future__ import annotations

import pytest

from aictl.data.model_pricing import (
    cost_usd,
    normalize_model_id,
    resolve_pricing,
)

# Current Anthropic list prices per 1M tokens (input, output). If a row here
# drifts from the table, the table is stale — update BOTH deliberately.
CURRENT_RATES = {
    "claude-fable-5-1": (10.0, 50.0),
    "claude-opus-5": (5.0, 25.0),
    "claude-sonnet-5": (2.0, 10.0),
    "claude-haiku-4-5": (1.0, 5.0),
}


@pytest.mark.parametrize(("model", "rates"), sorted(CURRENT_RATES.items()))
def test_current_models_have_current_rates(model, rates):
    key, pricing = resolve_pricing(model)
    assert key == model
    assert (pricing.input_per_m, pricing.output_per_m) == rates


def test_cost_scales_per_model():
    # 1M in + 1M out at each model's rate.
    assert cost_usd("claude-fable-5-1", 1_000_000, 1_000_000) == pytest.approx(60.0)
    assert cost_usd("claude-sonnet-5", 1_000_000, 1_000_000) == pytest.approx(12.0)
    assert cost_usd("claude-opus-5", 0, 0) == 0.0


def test_date_suffix_and_dotted_versions_resolve():
    assert normalize_model_id("claude-haiku-4-5-20251001") == "claude-haiku-4-5"
    assert normalize_model_id("Claude-Sonnet-4.6") == "claude-sonnet-4-6"
    assert resolve_pricing("claude-haiku-4-5-20251001")[0] == "claude-haiku-4-5"
    assert resolve_pricing("claude-sonnet-4.6")[0] == "claude-sonnet-4-6"


def test_prefix_match_is_hyphen_bounded():
    # A longer non-version variant sharing a known prefix uses that prefix's rate...
    assert resolve_pricing("claude-sonnet-5-preview")[0] == "claude-sonnet-5"
    # ...but "claude-opus-50" must not match "claude-opus-5", and neither may a
    # new version: claude-opus-5-5 costs less than claude-opus-5.
    assert resolve_pricing("claude-opus-50") == (None, None)
    assert resolve_pricing("claude-opus-5-9") == (None, None)


def test_unknown_or_missing_model_has_no_price():
    # A guessed rate looks exactly like a real one, so there is none.
    for model in ("", None, "totally-made-up", "<synthetic>"):
        assert resolve_pricing(model) == (None, None)
    assert cost_usd("totally-made-up", 1_000_000, 1_000_000) is None
