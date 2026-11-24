# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The company that makes a model, from its stored model id: the one rule every split by vendor uses."""

from __future__ import annotations

import functools
import re

from .model_pricing import NON_MODEL_IDS, normalize_model_id

# An id that matches no rule. It is a group of its own, counted and named, never dropped.
OTHER_VENDOR = "Other"

# (vendor, family names). A family matches the whole id or its start followed by a separator or a
# digit: "gpt-5.4", "gpt5", "o3", "o3-pro" and "o4-mini" match, "omni" and "gptx" do not. The id is
# first normalized (model_pricing.normalize_model_id): letter case, a provider prefix such as
# "openai/", Bedrock's "us.anthropic." wrapping and a snapshot date are removed.
VENDOR_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Anthropic", ("claude",)),
    ("OpenAI", ("gpt", "o1", "o3", "o4", "codex", "chatgpt", "davinci")),
    ("Google", ("gemini", "gemma")),
    ("xAI", ("grok",)),
    ("Microsoft", ("mai", "phi")),
    ("Meta", ("llama",)),
    ("Mistral", ("mistral", "codestral", "devstral", "magistral")),
    ("DeepSeek", ("deepseek",)),
    ("Alibaba", ("qwen",)),
    ("Moonshot", ("kimi",)),
)


def _family(name: str) -> str:
    # A family that ends in a digit ("o3") takes no further digit: "o30" is not o3.
    return re.escape(name) + (r"(?=$|[-_.:/\s])" if name[-1].isdigit() else r"(?=$|[-_.:/\s\d])")


_FAMILY = re.compile(
    "^(?:"
    + "|".join(f"(?P<v{i}>{'|'.join(_family(name) for name in names)})" for i, (_, names) in enumerate(VENDOR_RULES))
    + ")"
)


@functools.lru_cache(maxsize=4096)
def model_vendor(model: str | None) -> str:
    """The vendor of *model*, or ``OTHER_VENDOR`` when no rule matches (an empty or placeholder id too)."""
    m = normalize_model_id(model)
    if not m or m in NON_MODEL_IDS:
        return OTHER_VENDOR
    found = _FAMILY.match(m)
    if found is None:
        return OTHER_VENDOR
    index = next(int(name[1:]) for name, value in found.groupdict().items() if value is not None)
    return VENDOR_RULES[index][0]
