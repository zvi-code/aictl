"""List prices, read from the provider pages on 2026-11-05, and how they apply.

If a row here drifts from the table, one of them is stale: re-read the page in
``PRICING_SOURCES`` and update both deliberately.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from aictl.data.model_pricing import (
    MODEL_PRICING,
    context_window_for,
    normalize_model_id,
    request_cost_usd,
    resolve_pricing,
)

# (input, output, cache read, 5m/30m write, 1h/12h write) per MTok.
PUBLISHED = {
    "claude-fable-5-1": (10.0, 50.0, 0.25, 12.5, 20.0),
    "claude-opus-5-5": (4.0, 20.0, 0.20, 5.0, 8.0),
    "claude-opus-5": (5.0, 25.0, 0.50, 6.25, 10.0),
    "claude-sonnet-5-5": (2.0, 10.0, 0.10, 2.5, 4.0),
    "claude-sonnet-5": (2.0, 10.0, 0.20, 2.5, 4.0),
    "claude-sonnet-4-6": (3.0, 15.0, 0.30, 3.75, 6.0),
    "claude-haiku-5-5": (0.10, 0.50, 0.01, 0.125, 0.20),
    "claude-haiku-4-5": (1.0, 5.0, 0.10, 1.25, 2.0),
    "gpt-6-astra": (10.0, 50.0, 1.0, 12.5, 25.0),
    "gpt-6.1-sol": (2.0, 10.0, 0.10, 2.5, 5.0),
    "gpt-5.3-codex": (1.75, 14.0, 0.175, None, None),
}

# Every model id seen in the 2026-11 transcripts, with what it must resolve to.
SEEN_IN_TRANSCRIPTS = {
    "claude-fable-5-1": "claude-fable-5-1",
    "claude-opus-5-5": "claude-opus-5-5",
    "claude-opus-5.5": "claude-opus-5-5",
    "claude-sonnet-5-5": "claude-sonnet-5-5",
    "claude-haiku-5-5": "claude-haiku-5-5",
    "claude-sonnet-5": "claude-sonnet-5",
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "claude-opus-4-6": "claude-opus-4-6",
    "claude-opus-4-7": "claude-opus-4-7",
    "claude-haiku-4-5-20251001": "claude-haiku-4-5",
    "gpt-6.1-sol": "gpt-6.1-sol",
    "gpt-6-astra": "gpt-6-astra",
    "gpt-6-luna": "gpt-6-luna",
    "gemini-4-argon": "gemini-4-argon",
}


@pytest.mark.parametrize(("model", "rates"), sorted(PUBLISHED.items()))
def test_table_matches_the_published_rate(model, rates):
    p = MODEL_PRICING[model]
    assert (p.input_per_m, p.output_per_m, p.cache_read_per_m, p.cache_write_5m_per_m, p.cache_write_1h_per_m) == rates


@pytest.mark.parametrize(("seen", "key"), sorted(SEEN_IN_TRANSCRIPTS.items()))
def test_every_model_seen_in_transcripts_resolves(seen, key):
    assert resolve_pricing(seen)[0] == key


def test_placeholder_model_is_explicitly_unpriced():
    assert resolve_pricing("<synthetic>") == (None, None)


def test_a_newer_version_never_inherits_an_older_rate():
    # The old prefix match priced opus-5-5 at opus-5 rates and haiku-5-5 at the
    # opus default: 50x too high.
    assert resolve_pricing("claude-opus-5-5")[1].input_per_m == 4.0
    assert resolve_pricing("claude-haiku-5-5")[1].input_per_m == 0.10
    assert resolve_pricing("claude-opus-5-7") == (None, None)
    assert resolve_pricing("gpt-6.2-sol") == (None, None)


@pytest.mark.parametrize(
    ("raw", "normal"),
    [
        ("claude-opus-5-5[1m]", "claude-opus-5-5"),
        ("us.anthropic.claude-opus-5-5-v1:0", "claude-opus-5-5"),
        ("anthropic.claude-sonnet-5-5", "claude-sonnet-5-5"),
        ("openai/gpt-6.1-sol", "gpt-6.1-sol"),
        ("claude-haiku-4-5-20251001", "claude-haiku-4-5"),
    ],
)
def test_platform_spellings_normalize(raw, normal):
    assert normalize_model_id(raw) == normal


def test_prompt_length_tier_counts_cache_tokens():
    # Haiku 5.5 over 100K, counting cache reads.
    assert request_cost_usd("claude-haiku-5-5", input_tokens=10, cache_read_tokens=100_000) == pytest.approx(
        (10 * 0.50 + 100_000 * 0.05) / 1e6
    )
    assert request_cost_usd("claude-haiku-5-5", input_tokens=10, cache_read_tokens=99_000) == pytest.approx(
        (10 * 0.10 + 99_000 * 0.01) / 1e6
    )


def test_fast_mode_and_us_inference_stack():
    fast = request_cost_usd("claude-opus-5-5", input_tokens=1000, output_tokens=1000, cache_read_tokens=1000, speed="fast")
    assert fast == pytest.approx((1000 * 8 + 1000 * 40 + 1000 * 0.40) / 1e6)
    us = request_cost_usd("claude-opus-5-5", input_tokens=1000, speed="fast", inference_geo="us")
    assert us == pytest.approx(1000 * 8 * 1.1 / 1e6)
    # The premium starts at Claude 4.6.
    assert request_cost_usd("claude-opus-4-5", input_tokens=1000, inference_geo="us") == pytest.approx(1000 * 5 / 1e6)


def test_dated_rate_change_follows_the_request_time():
    nov = datetime(2026, 11, 30, tzinfo=timezone.utc).timestamp()
    dec = datetime(2026, 12, 1, tzinfo=timezone.utc).timestamp()
    assert request_cost_usd("gemini-4-argon", input_tokens=1_000_000, ts=nov) == pytest.approx(2.0)
    assert request_cost_usd("gemini-4-argon", input_tokens=1_000_000, ts=dec) == pytest.approx(4.0)


def test_context_windows():
    assert context_window_for("claude-haiku-5-5") == 1_000_000
    assert context_window_for("claude-opus-5-5[1m]") == 1_000_000
    assert context_window_for("claude-haiku-4-5") == 200_000
    assert context_window_for("gpt-6.1-sol") is None  # no page states it; never guess
    assert context_window_for("made-up") is None
