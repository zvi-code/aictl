"""A CSS module may use ``composes`` only in a rule whose selectors are each one class.

The dashboard build refuses anything else ("composition is only allowed when selector is single
:local class name"), but the UI tests do not run the build: on 2026-11-24 a screen with
``.range select { composes: ... }`` passed every test and broke ``npm run build``.
"""

from __future__ import annotations

import re
from pathlib import Path

UI_SRC = Path(__file__).resolve().parents[1] / "src" / "aictl" / "dashboard" / "ui" / "src"
RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")
SINGLE_CLASS = re.compile(r"\.[A-Za-z_][\w-]*")


def compound_composes(css: str) -> list[str]:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    return [selector.strip() for selector, body in RULE.findall(css)
            if re.search(r"(^|[;\s])composes\s*:", body)
            and not all(SINGLE_CLASS.fullmatch(part.strip()) for part in selector.split(","))]


def test_composes_is_used_only_in_single_class_rules():
    bad = {str(path.relative_to(UI_SRC)): found
           for path in sorted(UI_SRC.rglob("*.module.css")) if (found := compound_composes(path.read_text()))}
    assert not bad, f"composes in a rule that is not one class (the build fails on it): {bad}"


def test_the_check_sees_a_compound_selector():
    assert compound_composes('.range select { composes: field from "./c.module.css"; }') == [".range select"]
    assert compound_composes(".pager button, .text header button { composes: x; }") == [".pager button, .text header button"]
    assert compound_composes(".a, .b { composes: x; }") == []
    assert compound_composes('/* .x y { composes: z } */ .ok { composes: field; color: red; }') == []
