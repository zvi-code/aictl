"""Tests for aictl.data.token_usage.TokenUsage."""

from aictl.data.token_usage import TokenUsage


def test_defaults_are_zero():
    u = TokenUsage()
    assert u.input == 0
    assert u.output == 0
    assert u.cache_read == 0
    assert u.cache_write == 0
    assert u.total == 0


def test_total_property():
    u = TokenUsage(input=1, output=2, cache_read=4, cache_write=8)
    assert u.total == 15


def test_frozen():
    u = TokenUsage()
    try:
        u.input = 5  # type: ignore[misc]
    except Exception:
        return
    raise AssertionError("TokenUsage should be frozen")


def test_from_empty_dict():
    assert TokenUsage.from_dict({}) == TokenUsage()
    assert TokenUsage.from_dict(None) == TokenUsage()  # type: ignore[arg-type]


def test_from_dict_none_values_coalesce_to_zero():
    u = TokenUsage.from_dict(
        {
            "input_tokens": None,
            "output_tokens": None,
            "cache_read_input_tokens": None,
            "cache_creation_input_tokens": None,
        }
    )
    assert u == TokenUsage()


# ── Input aliases ────────────────────────────────────────────────────────────


def test_input_alias_input_tokens():
    assert TokenUsage.from_dict({"input_tokens": 7}).input == 7


def test_input_alias_inputTokens():
    assert TokenUsage.from_dict({"inputTokens": 7}).input == 7


def test_input_alias_prompt_tokens():
    assert TokenUsage.from_dict({"prompt_tokens": 7}).input == 7


def test_input_alias_otel_semconv():
    assert TokenUsage.from_dict({"gen_ai.usage.input_tokens": 7}).input == 7


# ── Output aliases ───────────────────────────────────────────────────────────


def test_output_alias_output_tokens():
    assert TokenUsage.from_dict({"output_tokens": 9}).output == 9


def test_output_alias_outputTokens():
    assert TokenUsage.from_dict({"outputTokens": 9}).output == 9


def test_output_alias_completion_tokens():
    assert TokenUsage.from_dict({"completion_tokens": 9}).output == 9


def test_output_alias_otel_semconv():
    assert TokenUsage.from_dict({"gen_ai.usage.output_tokens": 9}).output == 9


# ── Cache-read aliases ───────────────────────────────────────────────────────


def test_cache_read_alias_cache_read_input_tokens():
    assert TokenUsage.from_dict({"cache_read_input_tokens": 3}).cache_read == 3


def test_cache_read_alias_camelCase():
    assert TokenUsage.from_dict({"cacheReadInputTokens": 3}).cache_read == 3


def test_cache_read_alias_short():
    assert TokenUsage.from_dict({"cache_read_tokens": 3}).cache_read == 3


def test_cache_read_alias_otel_semconv():
    assert TokenUsage.from_dict({"gen_ai.usage.cache_read.input_tokens": 3}).cache_read == 3


# ── Cache-write aliases ──────────────────────────────────────────────────────


def test_cache_write_alias_cache_creation_input_tokens():
    assert TokenUsage.from_dict({"cache_creation_input_tokens": 5}).cache_write == 5


def test_cache_write_alias_camelCase():
    assert TokenUsage.from_dict({"cacheCreationInputTokens": 5}).cache_write == 5


def test_cache_write_alias_short():
    assert TokenUsage.from_dict({"cache_write_tokens": 5}).cache_write == 5


def test_cache_write_alias_otel_semconv():
    assert TokenUsage.from_dict({"gen_ai.usage.cache_write.input_tokens": 5}).cache_write == 5


# ── Mixed / precedence ───────────────────────────────────────────────────────


def test_first_alias_wins():
    """Earlier aliases in the list take precedence over later ones."""
    u = TokenUsage.from_dict({"input_tokens": 1, "prompt_tokens": 99})
    assert u.input == 1


def test_string_numeric_values_coerced():
    assert TokenUsage.from_dict({"input_tokens": "42"}).input == 42


def test_full_payload_all_dimensions():
    u = TokenUsage.from_dict(
        {
            "input_tokens": 10,
            "output_tokens": 20,
            "cache_read_input_tokens": 30,
            "cache_creation_input_tokens": 40,
        }
    )
    assert u == TokenUsage(input=10, output=20, cache_read=30, cache_write=40)
    assert u.total == 100
