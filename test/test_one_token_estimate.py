"""Guard: one token estimate. Only utils.py (Python) and components/board/format.js (UI) divide by 4."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "aictl"
DIV4 = re.compile(r"//\s?4\b|/\s?4\b|/\s?4\.0")
PER_TOKEN = re.compile(r"\b\w*_PER_TOKEN\s*=")
EXEMPT = {ROOT / "utils.py", ROOT / "dashboard/ui/src/components/board/format.js"}


def _offenders():
    files = list(ROOT.rglob("*.py")) + list((ROOT / "dashboard/ui/src").rglob("*.js"))
    for path in sorted(files):
        if path in EXEMPT or "node_modules" in path.parts:
            continue
        for n, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            low = line.lower()
            if PER_TOKEN.search(line) or (("token" in low or "tok" in low) and DIV4.search(line)):
                yield f"{path.relative_to(ROOT.parent.parent)}:{n}: {line.strip()}"


def test_only_utils_divides_by_four_for_tokens():
    found = list(_offenders())
    assert not found, "use utils.estimate_tokens / estimate_tokens_from_size (UI: format.js):\n" + "\n".join(found)
