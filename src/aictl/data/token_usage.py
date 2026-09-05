"""Canonical token-usage value type with cross-tool field-alias coalescing.

Different AI tools / SDKs / OpenTelemetry semconv revisions report token usage
under different field names. This module centralises the alias map so call
sites don't have to repeat `d.get("a") or d.get("b") or d.get("c") or 0`.
"""

from __future__ import annotations

from dataclasses import dataclass

# Ordered alias lists: first non-None value wins. Every spelling seen in the
# wild is here (Anthropic API, Copilot CLI camelCase, OpenAI prompt/completion,
# GenAI semconv current + pre-1.27 prompt/completion, Claude Code OTel) so
# the receiver, analytics and ingesters share ONE table instead of each
# carrying a partial copy.
_INPUT_ALIASES = (
    "input_tokens",
    "inputTokens",
    "prompt_tokens",
    "promptTokens",
    "gen_ai.usage.input_tokens",
    "gen_ai.usage.prompt_tokens",
)
_OUTPUT_ALIASES = (
    "output_tokens",
    "outputTokens",
    "completion_tokens",
    "completionTokens",
    "gen_ai.usage.output_tokens",
    "gen_ai.usage.completion_tokens",
)
_CACHE_READ_ALIASES = (
    "cache_read_input_tokens",
    "cacheReadInputTokens",
    "cache_read_tokens",
    "gen_ai.usage.cache_read_input_tokens",
    "gen_ai.usage.cache_read.input_tokens",
)
_CACHE_WRITE_ALIASES = (
    "cache_creation_input_tokens",
    "cacheCreationInputTokens",
    "cache_creation_tokens",
    "cache_write_tokens",
    "gen_ai.usage.cache_creation_input_tokens",
    "gen_ai.usage.cache_write.input_tokens",
)


def _pick(d: dict, aliases: tuple[str, ...]) -> int:
    for k in aliases:
        v = d.get(k)
        if v is not None:
            try:
                return int(v)
            except (TypeError, ValueError):
                continue
    return 0


@dataclass(frozen=True)
class TokenUsage:
    """Canonical per-call (or aggregated) token counts."""

    input: int = 0
    output: int = 0
    cache_read: int = 0
    cache_write: int = 0

    @classmethod
    def from_dict(cls, d: dict) -> TokenUsage:
        """Build from a tool/SDK dict tolerating known field-name aliases.

        Uses ``dict.get(...)`` with ``None``-coalescing so that explicit
        ``None`` values (common in JSON payloads) become ``0``.
        """
        if not d:
            return cls()
        return cls(
            input=_pick(d, _INPUT_ALIASES),
            output=_pick(d, _OUTPUT_ALIASES),
            cache_read=_pick(d, _CACHE_READ_ALIASES),
            cache_write=_pick(d, _CACHE_WRITE_ALIASES),
        )

    @property
    def total(self) -> int:
        return self.input + self.output + self.cache_read + self.cache_write
