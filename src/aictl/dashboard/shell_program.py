# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The program a shell command line ran first, by the rule of the UI's ``drawer/shellCommand.ts``.

The UI names a shell call by ``programOf``; the board counts a call as a test run by the same
reading, so both sides agree on what a command ran. Pure and conservative: when the text does
not name a program plainly, the answer is None. Rules, for each part of the command split at
``;``, ``&&``, ``||``, ``|``, ``&`` and new lines:

- a part that only sets a variable or changes the folder (``cd``, ``pushd``...) is setup;
- leading assignments, ``sudo``, ``env``, ``time``, ``nohup``, ``exec``, ``command``, ``builtin``,
  the shell keywords and a subshell ``(`` are skipped;
- ``bash -c '...'``, ``sh -c``, ``cmd /c``, ``pwsh -Command`` are read again from the inner command;
- the program is the base name of the first word without a Windows ending; ``python -m X`` names X;
- a first word that is not a plain name (a variable, an expression, a loop header) is unknown.

Heredoc bodies are skipped, so a script fed to ``python3 - <<EOF`` is not read as commands.
"""

from __future__ import annotations

import functools
import re
from dataclasses import dataclass

_SEPARATORS = {";", "&&", "||", "|", "&", "\n"}
_PREFIXES = {"sudo", "env", "time", "nohup", "exec", "command", "builtin", "if", "then", "do", "else", "elif",
             "while", "until", "!", "{"}
_ENDS = {"fi", "done", "esac", "}", "end"}
_FOLDER = {"cd", "pushd", "popd", "set-location", "sl", "chdir"}
_SHELLS = {"bash", "sh", "zsh", "dash", "ksh", "fish"}
_POWERSHELLS = {"pwsh", "powershell"}
_PYTHONS = {"python", "python3", "py"}
_NAME = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.+-]*$")
_ASSIGN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
_HEREDOC = re.compile(r"^<<-?\s*(['\"]?)([A-Za-z_][\w-]*)\1")


@dataclass(frozen=True, slots=True)
class _Word:
    text: str
    quoted: bool


def _tokenize(source: str) -> list[_Word | str]:
    """Words and separators (plain strings) of a command line, with quotes and heredocs kept whole."""
    tokens: list[_Word | str] = []
    word, quoted, started = "", False, False
    heredoc: str | None = None

    def flush() -> None:
        nonlocal word, quoted, started
        if started:
            tokens.append(_Word(word, quoted))
        word, quoted, started = "", False, False

    def op(value: str) -> None:
        flush()
        tokens.append(value)

    i, n = 0, len(source)
    while i < n:
        c = source[i]
        nxt = source[i + 1] if i + 1 < n else ""
        if c == "@" and nxt in ("'", '"') and not started:
            close = source.find(f"\n{nxt}@", i + 2)
            end = n if close < 0 else close + 3
            word += source[i:end]
            quoted = started = True
            i = end
            continue
        if c in ("'", '"'):
            j = i + 1
            while j < n and source[j] != c:
                if c == '"' and source[j] in ("\\", "`"):
                    j += 1
                j += 1
            if not started:
                quoted = True
            word += source[i + 1:j]
            started = True
            i = j + 1
            continue
        if c == "\\" and nxt and nxt != "\n" and not re.match(r"[A-Za-z0-9 _.-]", nxt):
            word += nxt
            started = True
            i += 2
            continue
        if c == "\n":
            op("\n")
            i += 1
            if heredoc is not None:
                lines = source[i:].split("\n")
                skip, found = 0, False
                for line in lines:
                    skip += len(line) + 1
                    if line.strip() == heredoc:
                        found = True
                        break
                i = i + skip if found else n
                heredoc = None
            continue
        if c in (" ", "\t", "\r"):
            flush()
            i += 1
            continue
        if c == "<" and nxt == "<" and source[i + 2:i + 3] != "<":
            match = _HEREDOC.match(source[i:])
            if match:
                heredoc = match.group(2)
                flush()
                i += len(match.group(0))
                continue
        if c == "&" and nxt == "&":
            op("&&")
            i += 2
            continue
        if c == "|" and nxt == "|":
            op("||")
            i += 2
            continue
        if c in ("|", ";"):
            op(c)
            i += 1
            continue
        if c == "&":
            prev = source[i - 1] if i else ""
            if prev in (">", "<") or nxt == ">":
                word += c
                started = True
                i += 1
                continue
            last = tokens[-1] if tokens else None
            op("call" if not started and (last is None or isinstance(last, str)) else "&")
            i += 1
            continue
        if c in ("(", ")") and not started:
            op(c)
            i += 1
            continue
        word += c
        started = True
        i += 1
    flush()
    return tokens


def _parts(tokens: list[_Word | str]) -> list[tuple[list[_Word], bool]]:
    parts: list[tuple[list[_Word], bool]] = []
    words: list[_Word] = []
    call = False
    for token in tokens:
        if isinstance(token, str):
            if token in _SEPARATORS:
                if words or call:
                    parts.append((words, call))
                words, call = [], False
            elif token == "call":
                call = True
            continue
        words.append(token)
    if words or call:
        parts.append((words, call))
    return parts


def _base(word: str) -> str:
    return re.sub(r"\.(exe|cmd|bat|com|ps1)$", "", re.split(r"[\\/]", word)[-1], flags=re.I)


def _read(words: list[_Word], call: bool, depth: int):
    """("program", name, the words after it) | ("inner", text) | "setup" | "unknown"."""
    words = list(words)
    while words and not words[0].quoted and (_ASSIGN.match(words[0].text) or words[0].text.lower() in _PREFIXES):
        words.pop(0)
    if not words:
        return "unknown" if call else "setup"
    first = words[0]
    lower = first.text.lower()
    if not first.quoted and lower in _ENDS:
        return "setup"
    if not first.quoted and first.text.startswith("$"):
        sets = (len(words) > 1 and words[1].text == "=") or re.match(r"^\$[\w:]+\s*=", first.text)
        if sets:
            return "setup"
        # Board addition: an interpreter in a variable, ``$PY -m pytest``, plainly names its module.
        if re.match(r"^\$\{?\w+\}?$", first.text) and len(words) > 2 and words[1].text == "-m" and _NAME.match(words[2].text):
            return ("program", words[2].text, [w.text for w in words[3:]])
        return "unknown"
    if not first.quoted and re.match(r"^\[[^\]]*\]", first.text):
        return "unknown"
    name = _base(first.text)
    key = name.lower()
    if not call and key in _FOLDER:
        return "setup"
    if not first.quoted and re.match(r"^(for|foreach|case|select|function)$", key):
        return "unknown"
    rest = words[1:]
    if depth < 3 and key in _SHELLS:
        flag = next((k for k, w in enumerate(rest, 1) if not w.quoted and re.match(r"^-[a-z]*c[a-z]*$", w.text)), 0)
        if flag and flag + 1 <= len(rest):
            return ("inner", words[flag + 1].text)
    if depth < 3 and key == "cmd":
        flag = next((k for k, w in enumerate(rest, 1) if re.match(r"^/[ck]$", w.text, re.I)), 0)
        if flag and len(words) > flag + 1:
            return ("inner", " ".join(f'"{w.text}"' if w.quoted else w.text for w in words[flag + 1:]))
    if depth < 3 and key in _POWERSHELLS:
        flag = next((k for k, w in enumerate(rest, 1) if re.match(r"^-(c|command)$", w.text, re.I)), 0)
        if flag and len(words) > flag + 1:
            tail = words[flag + 1:]
            return ("inner", tail[0].text if len(tail) == 1 else " ".join(f"'{w.text}'" if w.quoted else w.text for w in tail))
    if key in _PYTHONS and len(words) > 2 and words[1].text == "-m" and _NAME.match(words[2].text):
        return ("program", words[2].text, [w.text for w in words[3:]])
    if not name or not _NAME.match(name):
        return "unknown"
    return ("program", name, [w.text for w in rest])


def _first(command: str, depth: int) -> tuple[str, tuple[str, ...]] | None:
    for words, call in _parts(_tokenize(command)):
        read = _read(words, call, depth)
        if read == "setup":
            continue
        if read == "unknown":
            return None
        if read[0] == "inner":
            return _first(read[1], depth + 1)
        return read[1], tuple(read[2])
    return None


@functools.lru_cache(maxsize=65536)
def first_program(command: str | None) -> tuple[str, tuple[str, ...]] | None:
    """The program a command line ran first and the words after it; None when not plain (``programOf``)."""
    # Board addition: ``V=$(mktemp -d)`` sets a variable from a command; it is setup, not a program.
    text = _ASSIGN_FROM_COMMAND.sub(" ", (command or "")).strip()
    return _first(text, 0) if text else None


_ASSIGN_FROM_COMMAND = re.compile(r"(?<![\w$])[A-Za-z_][A-Za-z0-9_]*=\$\([^()]*\)")


# The test runners, by an explicit list. A command is a test run when the program it runs first
# is one of them; ``sed ... && pytest`` first runs sed and is not counted.
TEST_RUNNERS = frozenset({"pytest", "vitest", "jest", "tox", "ctest", "unittest", "mocha", "playwright", "nox"})
TEST_SUBCOMMANDS = frozenset({
    ("npm", "test"), ("pnpm", "test"), ("yarn", "test"), ("bun", "test"), ("go", "test"), ("cargo", "test"),
    ("make", "test"), ("dotnet", "test"), ("mvn", "test"), ("gradle", "test"), ("gradlew", "test"),
    ("deno", "test"), ("swift", "test"), ("mix", "test"),
})
# Launchers that run the program named after them: ``npx vitest``, ``uv run pytest``, ``timeout 600 pytest``.
_LAUNCH_ONE = frozenset({"npx", "bunx"})
_LAUNCH_TWO = frozenset({("uv", "run"), ("poetry", "run"), ("pipenv", "run"), ("pnpm", "exec"), ("yarn", "exec"),
                         ("pdm", "run"), ("hatch", "run")})
_TIMEOUTS = frozenset({"timeout", "gtimeout"})


def is_test_run(command: str | None) -> bool:
    """True when the program the command runs first is a test runner (see TEST_RUNNERS)."""
    found = first_program(command)
    if found is None:
        return False
    program, rest = found[0].lower(), list(found[1])
    for _ in range(3):
        if program in _TIMEOUTS:
            while rest and rest[0].startswith("-"):
                takes_value = rest[0] in ("-k", "-s", "--kill-after", "--signal")
                rest.pop(0)
                if takes_value and rest:
                    rest.pop(0)
            if rest and re.match(r"^\d+(\.\d+)?[smhd]?$", rest[0]):
                rest.pop(0)
        elif program in _LAUNCH_ONE:
            while rest and rest[0].startswith("-"):
                rest.pop(0)
        elif rest and (program, rest[0]) in _LAUNCH_TWO:
            rest.pop(0)
        else:
            break
        if not rest:
            return False
        program, rest = _base(rest[0]).lower(), rest[1:]
        if program in _PYTHONS and len(rest) > 1 and rest[0] == "-m":
            program, rest = rest[1].lower(), rest[2:]
    return program in TEST_RUNNERS or bool(rest and (program, rest[0]) in TEST_SUBCOMMANDS)


# ─── The name of a test run ──────────────────────────────────────────
# The Testing panel names a run by its runner and target (``pytest test/test_x.py``,
# ``python -m pytest -q``, ``dotnet test Foo.sln``), not by the start of its command line,
# which is mostly a folder change or an environment assignment. Runs that differ only there
# read as one.

LABEL_ARGS = 6
_INTERPRETER = re.compile(r"^(python[\d.]*|py|\$\{?\w+\}?)$", re.I)
_REDIRECT = re.compile(r"^\d*(>>?|<)(&\d+)?$|^\d*>>?\S|^\d*>&\d+$|^<\S")
_ABSOLUTE = re.compile(r"^(/|~[/\\]|[A-Za-z]:[\\/]|\\\\)")


def _setup_part(read: object) -> bool:
    """A part that only prepares: a folder change, an assignment, or cmd's ``set A=b``."""
    if read == "setup":
        return True
    return (isinstance(read, tuple) and read[0] == "program" and read[1].lower() == "set"
            and bool(read[2]) and "=" in read[2][0])


def _label_words(command: str, depth: int) -> list[str] | None:
    """The words of the first part that runs a plain program, prefixes removed; None when none does.

    Unlike ``first_program``, a part that is not plain (a loop header) is passed over, so
    ``for f in a; do pytest $f; done`` names pytest.
    """
    for words, call in _parts(_tokenize(command)):
        read = _read(words, call, depth)
        if _setup_part(read) or read == "unknown":
            continue
        if read[0] == "inner":
            inner = read[1].strip()
            if len(inner) > 1 and inner[0] == inner[-1] and inner[0] in "'\"":
                inner = inner[1:-1]
            found = _label_words(inner, depth + 1) if depth < 3 else None
            if found:
                return found
            continue
        kept = list(words)
        while kept and not kept[0].quoted and (_ASSIGN.match(kept[0].text) or kept[0].text.lower() in _PREFIXES):
            kept.pop(0)
        return [w.text for w in kept]
    return None


def _fallback_name(command: str) -> str:
    """The first word of the first part that is not setup, as a base name; never empty."""
    for words, call in _parts(_tokenize(command)):
        if _setup_part(_read(words, call, 0)):
            continue
        for word in words:
            if not _ASSIGN.match(word.text) and word.text.lower() not in _PREFIXES:
                name = _base(word.text)
                if name:
                    return name
    return " ".join(command.split()[:1]) or "command"


def _program_word(word: str) -> str:
    base = _base(word)
    return "python" if _INTERPRETER.match(base) else base


def _short_arg(word: str) -> str:
    """An absolute path keeps its last two parts, so one test in two checkouts reads the same."""
    if _ABSOLUTE.match(word):
        parts = [p for p in re.split(r"[\\/]", word) if p]
        return "/".join(parts[-2:]) or word
    # ``tests\test_a.py`` and ``tests/test_a.py`` are one target.
    return word.replace("\\", "/") if re.match(r"^[\w.-]+(\\[\w.-]+)+$", word) else word


def run_label(command: str | None) -> str:
    """The runner and target of a test command, e.g. ``pytest test/test_x.py``; never empty.

    Leading folder changes (``cd x &&``, ``Set-Location ... ;``, ``pushd``), environment
    assignments (``A=b``, ``$env:A='b';``, ``set A=b &&``), wrappers (``timeout``, ``npx``,
    ``uv run``, ``poetry run``) and redirections are left out; a venv's python reads ``python``.
    A command with no plain program falls back to the name of its first program.
    """
    text = _ASSIGN_FROM_COMMAND.sub(" ", command or "").strip()
    words = _label_words(text, 0) if text else None
    if not words:
        return _fallback_name(text) if text else "command"
    program, rest = _program_word(words[0]), words[1:]
    for _ in range(3):
        key = program.lower()
        if key in _TIMEOUTS:
            while rest and rest[0].startswith("-"):
                takes_value = rest[0] in ("-k", "-s", "--kill-after", "--signal")
                rest.pop(0)
                if takes_value and rest:
                    rest.pop(0)
            if rest and re.match(r"^\d+(\.\d+)?[smhd]?$", rest[0]):
                rest.pop(0)
        elif key in _LAUNCH_ONE:
            while rest and rest[0].startswith("-"):
                rest.pop(0)
        elif rest and (key, rest[0]) in _LAUNCH_TWO:
            rest.pop(0)
            while rest and rest[0].startswith("-"):
                rest.pop(0)
        else:
            break
        if not rest:
            break
        program, rest = _program_word(rest[0]), rest[1:]
    args: list[str] = []
    skip = False
    for word in rest:
        if skip:
            skip = False
            continue
        if _REDIRECT.match(word):
            skip = bool(re.match(r"^\d*(>>?|<)$", word))
            continue
        args.append(_short_arg(word))
    if program == "python" and len(args) > 1 and args[0] == "-m":
        program, args = f"python -m {args[1]}", args[2:]
    shown = args[:LABEL_ARGS] + (["…"] if len(args) > LABEL_ARGS else [])
    return " ".join([program, *shown])
