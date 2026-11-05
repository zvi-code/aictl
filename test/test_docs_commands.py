"""Commands in the docs must exist. `aictl serve`, `aictl deploy` and `aictl ctx import`
kept being documented long after they moved, because nothing compared the two."""

from __future__ import annotations

import re
import shlex
from pathlib import Path

import click
import pytest

from aictl.cli import main

ROOT = Path(__file__).resolve().parent.parent
DOCS = sorted(
    p
    for p in [ROOT / "README.md", ROOT / "docker" / "README.md", *(ROOT / "docs").glob("*.md")]
    if p.name != "datapoint-catalog.md" and "raw-output" not in p.name
)
FENCE = re.compile(r"^\s*(```|~~~)")
INLINE = re.compile(r"`(aictl [^`]+)`")
# Where a command starts: not tree diagrams, and not `compose run aictl shell`.
COMMAND = re.compile(r"(?:^\s*(?:\$\s*)?|&&\s*|;\s*)(aictl (?:[^\s#|&;)`]+ ?)+)")


def _commands(path: Path) -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []
    in_fence = False
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            code = line.split("#", 1)[0]
            found.extend((number, match.strip()) for match in COMMAND.findall(code))
        else:
            found.extend((number, match) for match in INLINE.findall(line))
    return found


def _problem(command: str) -> str | None:
    try:
        tokens = shlex.split(command, posix=True)[1:]
    except ValueError:
        tokens = command.split()[1:]
    ctx = click.Context(main)
    current: click.Command = main
    index = 0
    while isinstance(current, click.Group) and index < len(tokens) and not tokens[index].startswith("-"):
        token = tokens[index]
        if not re.fullmatch(r"[a-z][a-z0-9-]*", token):
            return None  # a placeholder such as <id> or [--flag]
        child = current.get_command(ctx, token)
        if child is None:
            return f"no command {token!r}"
        current = child
        index += 1
    known = {"--help", "--version"}
    for param in current.params:
        known.update(param.opts)
        known.update(param.secondary_opts)
    for token in tokens[index:]:
        flag = token.split("=", 1)[0]
        if flag.startswith("--") and re.fullmatch(r"--[a-z][a-z0-9-]*", flag) and flag not in known:
            return f"no option {flag!r}"
    return None


@pytest.mark.parametrize("path", DOCS, ids=lambda p: str(p.relative_to(ROOT)))
def test_documented_commands_exist(path: Path) -> None:
    problems = [f"{path.name}:{n}: {cmd}: {why}" for n, cmd in _commands(path) if (why := _problem(cmd))]
    assert problems == []


def test_how_to_links_resolve() -> None:
    how_to = (ROOT / "docs" / "how-to.md").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    def slug(heading: str) -> str:
        return re.sub(r"[^\w\- ]", "", heading.strip().lower()).replace(" ", "-")

    anchors = {slug(h) for h in re.findall(r"^#+ (.+)$", how_to, flags=re.M)}
    linked = re.findall(r"docs/how-to\.md#([\w-]+)", readme) + re.findall(r"\]\(#([\w-]+)\)", how_to)
    assert linked
    assert [anchor for anchor in linked if anchor not in anchors] == []


def test_the_check_rejects_a_removed_command_and_flag() -> None:
    assert _problem("aictl serve") == "no command 'serve'"
    assert _problem("aictl daemon serve --not-a-flag") == "no option '--not-a-flag'"
    assert _problem("aictl daemon serve --no-open --port 8599") is None
