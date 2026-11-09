"""Per-model list pricing (USD per million tokens), with no silent fallback.

Single source of truth for cost estimates in the dashboard. Rates are provider
first-party API list prices, read from the pages in :data:`PRICING_SOURCES` on
:data:`PRICING_AS_OF`; partner platforms (Bedrock, Vertex) and subscription
plans bill differently, so every cost here is "what this usage costs at list
price", not "what you were charged".

Lookup tolerates the spellings tools actually emit: an exact id, a trailing
``-YYYYMMDD`` snapshot, dotted Claude versions (``claude-opus-5.5``), a
``[1m]`` context tag, Bedrock's ``us.anthropic.…-v1:0`` wrapping, and a longer
non-version variant (``claude-sonnet-5-preview``). A longer *version* never
inherits a shorter one's rate: ``claude-opus-5-5`` costs $4/$20, ``claude-opus-5``
costs $5/$25, and a future ``claude-opus-5-9`` is unknown.

An unknown model has NO cost: :func:`resolve_pricing` returns ``(None, None)``
and :func:`cost_usd` returns ``None``, so a caller can only show a number it
actually has and has to say why it has none.

Token classes are disjoint everywhere in this module: ``input`` is uncached
input (Anthropic's meaning), and cache reads and writes are counted apart.
"""

from __future__ import annotations

import functools
import re
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone

PRICING_AS_OF = "2026-11-05"
PRICING_SOURCES = (
    "https://platform.claude.com/docs/en/about-claude/pricing",
    "https://developers.openai.com/api/docs/pricing",
    "https://aistudio.google.com/docs/pricing",
)

# Multipliers published on the Anthropic page.
FAST_OPUS_RATES = {
    # (input, output) per MTok; cache multipliers stack on the fast base input.
    "claude-opus-5-5": (8.0, 40.0),
    "claude-opus-5": (10.0, 50.0),
    "claude-opus-4-8": (10.0, 50.0),
}
US_INFERENCE_MULTIPLIER = 1.1  # inference_geo="us", Claude 4.6 and later


def _epoch(y: int, m: int, d: int) -> float:
    return datetime(y, m, d, tzinfo=timezone.utc).timestamp()


@dataclass(frozen=True, slots=True)
class ModelPricing:
    """USD per 1M tokens for one model.

    A ``None`` cache rate means the provider publishes no separate rate for
    that class, and the class bills at ``input_per_m``.

    ``long_threshold``/``long_rates`` model prompt-length tiers (a request
    whose full prompt, cache included, exceeds the threshold pays those rates
    for the whole request). ``until``/``after`` model dated price changes.
    """

    input_per_m: float
    output_per_m: float
    cache_read_per_m: float | None = None
    cache_write_5m_per_m: float | None = None
    cache_write_1h_per_m: float | None = None
    long_threshold: int = 0
    long_rates: ModelPricing | None = field(default=None, repr=False)
    until: float = 0.0
    after: ModelPricing | None = field(default=None, repr=False)

    def at(self, ts: float | None = None, prompt_tokens: int = 0) -> ModelPricing:
        """The rates that apply to one request at *ts* with this prompt length."""
        p = self
        if ts is not None and p.until and p.after is not None and ts >= p.until:
            p = p.after
        if p.long_threshold and p.long_rates is not None and prompt_tokens > p.long_threshold:
            p = p.long_rates
        return p

    def cost_usd(
        self,
        input_tokens: int | float,
        output_tokens: int | float,
        cache_read_tokens: int | float = 0,
        cache_write_tokens: int | float = 0,
        cache_write_1h_tokens: int | float = 0,
    ) -> float:
        """USD for disjoint token classes at exactly these rates (no tiering)."""

        def part(tokens: int | float, rate: float | None) -> float:
            return (max(0.0, float(tokens)) / 1e6) * (self.input_per_m if rate is None else rate)

        return (
            part(input_tokens, self.input_per_m)
            + part(output_tokens, self.output_per_m)
            + part(cache_read_tokens, self.cache_read_per_m)
            + part(cache_write_tokens, self.cache_write_5m_per_m)
            + part(cache_write_1h_tokens, self.cache_write_1h_per_m)
        )


def _anthropic(inp: float, out: float, read: float, w5: float, w1h: float) -> ModelPricing:
    return ModelPricing(inp, out, read, w5, w1h)


def _openai(inp: float, cached: float | None, out: float) -> ModelPricing:
    return ModelPricing(inp, out, cached)


def _gpt(
    short: tuple[float, float | None, float, float | None, float | None],
    long: tuple[float, float | None, float, float | None, float | None] | None = None,
) -> ModelPricing:
    """OpenAI rates as (input, cached, output, 30m write, 12h write); the 30m and
    12h writes use the 5m and 1h slots. Long rates apply over 272K input tokens."""

    def rates(r: tuple[float, float | None, float, float | None, float | None]) -> ModelPricing:
        return ModelPricing(r[0], r[2], r[1], r[3], r[4])

    base = rates(short)
    return replace(base, long_threshold=272_000, long_rates=rates(long)) if long else base


_HAIKU_5_5_LONG = _anthropic(0.50, 2.50, 0.05, 0.625, 1.0)

# Keep every model the transcripts actually report; older ids stay for history.
MODEL_PRICING: dict[str, ModelPricing] = {
    # Anthropic ---------------------------------------------------- input out read 5m 1h
    "claude-fable-5-1": _anthropic(10.0, 50.0, 0.25, 12.5, 20.0),
    "claude-mythos-5-1": _anthropic(10.0, 50.0, 0.25, 12.5, 20.0),
    "claude-fable-5": _anthropic(10.0, 50.0, 1.0, 12.5, 20.0),
    "claude-mythos-5": _anthropic(10.0, 50.0, 1.0, 12.5, 20.0),
    "claude-opus-5-5": _anthropic(4.0, 20.0, 0.20, 5.0, 8.0),
    "claude-opus-5": _anthropic(5.0, 25.0, 0.50, 6.25, 10.0),
    "claude-opus-4-8": _anthropic(5.0, 25.0, 0.50, 6.25, 10.0),
    "claude-opus-4-7": _anthropic(5.0, 25.0, 0.50, 6.25, 10.0),
    "claude-opus-4-6": _anthropic(5.0, 25.0, 0.50, 6.25, 10.0),
    "claude-opus-4-5": _anthropic(5.0, 25.0, 0.50, 6.25, 10.0),
    "claude-opus-4-1": _anthropic(15.0, 75.0, 1.50, 18.75, 30.0),
    "claude-opus-4": _anthropic(15.0, 75.0, 1.50, 18.75, 30.0),
    "claude-sonnet-5-5": _anthropic(2.0, 10.0, 0.10, 2.5, 4.0),
    "claude-sonnet-5": _anthropic(2.0, 10.0, 0.20, 2.5, 4.0),
    "claude-sonnet-4-6": _anthropic(3.0, 15.0, 0.30, 3.75, 6.0),
    "claude-sonnet-4-5": _anthropic(3.0, 15.0, 0.30, 3.75, 6.0),
    "claude-sonnet-4": _anthropic(3.0, 15.0, 0.30, 3.75, 6.0),
    "claude-haiku-5-5": ModelPricing(
        0.10, 0.50, 0.01, 0.125, 0.20, long_threshold=100_000, long_rates=_HAIKU_5_5_LONG
    ),
    "claude-haiku-4-5": _anthropic(1.0, 5.0, 0.10, 1.25, 2.0),
    "claude-haiku-3-5": _anthropic(0.80, 4.0, 0.08, 1.0, 1.6),
    # OpenAI, standard tier ------------------------------------- input cached out
    "gpt-6-astra": _gpt((10.0, 1.0, 50.0, 12.5, 25.0), (20.0, 2.0, 75.0, 25.0, 50.0)),
    "gpt-6.1-sol": _gpt((2.0, 0.10, 10.0, 2.5, 5.0), (4.0, 0.20, 15.0, 5.0, 10.0)),
    "gpt-6.1-terra": _gpt((1.0, 0.05, 5.0, 1.25, 2.5), (2.0, 0.10, 7.5, 2.5, 5.0)),
    "gpt-6-luna": _gpt((0.10, 0.01, 0.50, 0.125, 0.25), (0.20, 0.02, 0.75, 0.25, 0.50)),
    "gpt-6-sol": _gpt((2.0, 0.20, 10.0, 2.5, 5.0), (4.0, 0.40, 15.0, 5.0, 10.0)),
    "gpt-5.6-sol": _gpt((4.0, 0.40, 20.0, 5.0, 10.0), (8.0, 0.80, 30.0, 10.0, 20.0)),
    "gpt-5.6-terra": _gpt((2.0, 0.20, 12.0, 2.5, 5.0), (4.0, 0.40, 18.0, 5.0, 10.0)),
    "gpt-5.6-luna": _gpt((0.20, 0.02, 1.20, 0.25, 0.50), (0.40, 0.04, 1.80, 0.50, 1.0)),
    "gpt-5.5": _gpt((5.0, 0.50, 30.0, None, None), (10.0, 1.0, 45.0, None, None)),
    "gpt-5.5-pro": _gpt((30.0, None, 180.0, None, None), (60.0, None, 270.0, None, None)),
    "gpt-5.4": _gpt((2.50, 0.25, 15.0, None, None), (5.0, 0.50, 22.5, None, None)),
    "gpt-5.4-pro": _gpt((30.0, None, 180.0, None, None), (60.0, None, 270.0, None, None)),
    "gpt-5.4-mini": _openai(0.75, 0.075, 4.50),
    "gpt-5.4-nano": _openai(0.20, 0.02, 1.25),
    "gpt-5.3-codex": _openai(1.75, 0.175, 14.0),
    "gpt-5.2": _openai(1.75, 0.175, 14.0),
    "gpt-5.2-pro": _openai(21.0, None, 168.0),
    "gpt-5.1": _openai(1.25, 0.125, 10.0),
    "gpt-5": _openai(1.25, 0.125, 10.0),
    "gpt-5-mini": _openai(0.25, 0.025, 2.0),
    "gpt-5-nano": _openai(0.05, 0.005, 0.40),
    "gpt-5-pro": _openai(15.0, None, 120.0),
    "gpt-4.1": _openai(2.0, 0.50, 8.0),
    "gpt-4.1-mini": _openai(0.40, 0.10, 1.60),
    "gpt-4o": _openai(2.50, 1.25, 10.0),
    "gpt-4o-mini": _openai(0.15, 0.075, 0.60),
    "o3": _openai(2.0, 0.50, 8.0),
    "o3-pro": _openai(20.0, None, 80.0),
    # Google, standard paid tier -------------------------------- input cached out
    "gemini-4-argon": replace(
        _openai(2.0, 0.10, 10.0), until=_epoch(2026, 12, 1), after=_openai(4.0, 0.20, 20.0)
    ),
    "gemini-3.8-flash": replace(
        _openai(0.75, 0.075, 3.75), until=_epoch(2027, 1, 1), after=_openai(1.50, 0.15, 7.50)
    ),
    "gemini-3.6-flash": replace(
        _openai(0.75, 0.075, 3.75), until=_epoch(2027, 1, 1), after=_openai(1.50, 0.15, 7.50)
    ),
    "gemini-3.1-pro-preview": ModelPricing(
        2.0, 12.0, 0.20, long_threshold=200_000, long_rates=_openai(4.0, 0.40, 18.0)
    ),
    "gemini-3.5-flash-lite": _openai(0.30, 0.03, 2.50),
    "gemini-3.1-flash-lite": _openai(0.25, 0.025, 1.50),
    "gemini-3-flash-preview": _openai(0.50, 0.05, 3.0),
}

# Context window in input tokens per table key, from the same provider pages,
# so the API can state it per session instead of each client keeping a table.
CONTEXT_WINDOWS: dict[str, int] = {
    **{
        k: 1_000_000
        for k in MODEL_PRICING
        if k.startswith("claude-")
        and k not in ("claude-sonnet-4", "claude-haiku-4-5", "claude-haiku-3-5", "claude-opus-4", "claude-opus-4-1")
    },
    "claude-sonnet-4": 200_000,
    "claude-haiku-4-5": 200_000,
    "claude-haiku-3-5": 200_000,
    "claude-opus-4": 200_000,
    "claude-opus-4-1": 200_000,
}

# Non-model values tools write into a model field.
NON_MODEL_IDS = frozenset({"<synthetic>", "synthetic", "unknown", "auto"})

_DATE_SUFFIX = re.compile(r"-\d{8}$")
_BRACKET_TAG = re.compile(r"\[[^\]]*\]$")
_BEDROCK_PREFIX = re.compile(r"^(?:[a-z]{2,4}\.)?anthropic\.")
_BEDROCK_VERSION = re.compile(r"-v\d+(?::\d+)?$")
_PROVIDER_PREFIX = re.compile(r"^(?:openai|anthropic|google|models)/")


@functools.lru_cache(maxsize=4096)
def normalize_model_id(model: str | None) -> str:
    """Canonical lower-case id with snapshot, context and platform wrapping removed.

    Cached: a transcript poll asks for the same few ids hundreds of thousands of times.
    """
    if not model:
        return ""
    m = model.strip().lower()
    m = _PROVIDER_PREFIX.sub("", m)
    m = _BEDROCK_PREFIX.sub("", m)
    m = _BEDROCK_VERSION.sub("", m)
    m = _BRACKET_TAG.sub("", m)
    m = _DATE_SUFFIX.sub("", m)
    if m.startswith("claude-"):
        m = m.replace(".", "-")
    return m


def resolve_pricing(model: str | None) -> tuple[str | None, ModelPricing | None]:
    """Return ``(table_key, pricing)`` for *model*, or ``(None, None)`` if unknown.

    Unknown means unknown: there is deliberately no default rate. A prefix
    match accepts only a non-version remainder (``-preview``, ``-fast``), never
    one starting with a digit, because a new version is a new price.
    """
    m = normalize_model_id(model)
    if not m or m in NON_MODEL_IDS:
        return None, None
    if m in MODEL_PRICING:
        return m, MODEL_PRICING[m]
    best = ""
    for key in MODEL_PRICING:
        if m.startswith(key + "-") and len(key) > len(best) and not m[len(key) + 1].isdigit():
            best = key
    if best:
        return best, MODEL_PRICING[best]
    return None, None


def is_billable_model(model: str | None) -> bool:
    """False for placeholders such as Claude Code's ``<synthetic>`` messages."""
    return normalize_model_id(model) not in NON_MODEL_IDS and bool(normalize_model_id(model))


def context_window_for(model: str | None) -> int | None:
    """Context window of *model* in tokens, or ``None`` when no source states it."""
    key, _ = resolve_pricing(model)
    return CONTEXT_WINDOWS.get(key) if key else None


def request_cost_usd(
    model: str | None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
    cache_write_1h_tokens: int = 0,
    *,
    ts: float | None = None,
    speed: str = "",
    inference_geo: str = "",
) -> float | None:
    """List-price USD for ONE request, or ``None`` for an unknown model.

    Applies what can only be known per request: prompt-length tiers, dated
    price changes, fast mode, and US-only inference.
    """
    key, pricing = resolve_pricing(model)
    if pricing is None:
        return None
    prompt = input_tokens + cache_read_tokens + cache_write_tokens + cache_write_1h_tokens
    rates = pricing.at(ts, prompt)
    if speed == "fast" and key in FAST_OPUS_RATES:
        # Cache multipliers apply on top of the fast base input price.
        scale = FAST_OPUS_RATES[key][0] / rates.input_per_m
        rates = ModelPricing(
            FAST_OPUS_RATES[key][0],
            FAST_OPUS_RATES[key][1],
            (rates.cache_read_per_m or 0.0) * scale,
            (rates.cache_write_5m_per_m or 0.0) * scale,
            (rates.cache_write_1h_per_m or 0.0) * scale,
        )
    cost = rates.cost_usd(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cache_write_1h_tokens)
    if inference_geo == "us" and key and key.startswith("claude-") and key not in _NO_GEO_PREMIUM:
        cost *= US_INFERENCE_MULTIPLIER
    return cost


# "For Claude 4.6 and later models" only.
_NO_GEO_PREMIUM = frozenset(
    {
        "claude-opus-4-5",
        "claude-opus-4-1",
        "claude-opus-4",
        "claude-sonnet-4-5",
        "claude-sonnet-4",
        "claude-haiku-4-5",
        "claude-haiku-3-5",
    }
)


def cost_usd(
    model: str | None,
    input_tokens: int | float,
    output_tokens: int | float,
    cache_read_tokens: int | float = 0,
    cache_write_tokens: int | float = 0,
    cache_write_1h_tokens: int | float = 0,
) -> float | None:
    """List-price USD for disjoint token classes, or ``None`` for an unknown model."""
    _, pricing = resolve_pricing(model)
    if pricing is None:
        return None
    return pricing.cost_usd(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cache_write_1h_tokens)
