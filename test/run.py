#!/usr/bin/env python3
"""Cross-platform integration test runner for aictl.

Replaces test/run.sh with a portable Python script.
Run from the repo root or from the test/ directory:

    python test/run.py
    python test/run.py -v     # verbose: show all aictl output
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

# ── Setup ────────────────────────────────────────────────────────

TEST_DIR = Path(__file__).parent.resolve()
FIXTURES  = TEST_DIR / "fixtures" / "project"

PASS = 0
FAIL = 0
VERBOSE = False


# ── Assertion helpers ────────────────────────────────────────────

def ok(path: Path) -> None:
    global PASS, FAIL
    if path.is_file():
        _pass(f"exists: {path.name}")
    else:
        _fail(f"MISSING: {path}")


def gone(path: Path) -> None:
    global PASS, FAIL
    if not path.exists():
        _pass(f"gone:   {path.name}")
    else:
        _fail(f"STILL:  {path}")


def has(path: Path, text: str) -> None:
    global PASS, FAIL
    try:
        if text in path.read_text(encoding="utf-8", errors="replace"):
            _pass(f"'{text}' in {path.name}")
            return
    except OSError:
        pass
    _fail(f"NO '{text}' in {path}")


def no(path: Path, text: str) -> None:
    global PASS, FAIL
    try:
        if text not in path.read_text(encoding="utf-8", errors="replace"):
            _pass(f"no '{text}' in {path.name}")
            return
    except OSError:
        pass
    _fail(f"FOUND '{text}' in {path}")


def scan_has(output: str, text: str, label: str = "") -> None:
    label = label or text
    if text in output:
        _pass(label)
    else:
        _fail(f"not found in scan: '{text}'")


def _pass(msg: str) -> None:
    global PASS
    print(f"  ✓ {msg}")
    PASS += 1


def _fail(msg: str) -> None:
    global FAIL
    print(f"  ✗ {msg}")
    FAIL += 1


# ── Utilities ────────────────────────────────────────────────────

def run(args: list[str], *, check: bool = False) -> str:
    """Run a command, return stdout+stderr combined."""
    result = subprocess.run(
        args, capture_output=True, text=True,
    )
    combined = result.stdout + result.stderr
    if VERBOSE:
        print(combined, end="")
    if check and result.returncode != 0:
        sys.exit(f"Command failed: {' '.join(args)}\n{combined}")
    return combined


def aictl(*args: str) -> str:
    return run(["aictl", *args])


def clean() -> None:
    """Remove all generated files from the fixture project."""
    for pattern in ("CLAUDE.md", "CLAUDE.local.md", "AGENTS.md"):
        for f in FIXTURES.rglob(pattern):
            f.unlink(missing_ok=True)
    for d in (".claude", ".github", ".cursor", ".ai-deployed"):
        shutil.rmtree(FIXTURES / d, ignore_errors=True)
    for f in (".mcp.json", ".copilot-mcp.json"):
        (FIXTURES / f).unlink(missing_ok=True)


def section(title: str) -> None:
    print(f"\n{title}")


# ── Tests ────────────────────────────────────────────────────────

def test_1_scan() -> None:
    section("=== TEST 1: Scan ===")
    out = aictl("scan", "--root", str(FIXTURES))
    if VERBOSE:
        print(out)
    scan_has(out, "(root)",       "root scope")
    scan_has(out, "src/runner",   "src/runner")
    scan_has(out, "src/dataset",  "src/dataset")
    scan_has(out, "src/metrics",  "src/metrics")
    scan_has(out, "generators",   "generators")
    scan_has(out, "5 scope",      "5 scopes")


def test_2_deploy_debug() -> None:
    section("=== TEST 2: Deploy debug ===")
    clean()
    aictl("deploy", "--root", str(FIXTURES), "--profile", "debug")

    section("--- Root instructions ---")
    ok(FIXTURES / "CLAUDE.md")
    ok(FIXTURES / "CLAUDE.local.md")
    has(FIXTURES / "CLAUDE.md",       "valkey-bench-rs")
    has(FIXTURES / "CLAUDE.md",       "cargo build")
    has(FIXTURES / "CLAUDE.md",       "thiserror")
    has(FIXTURES / "CLAUDE.local.md", "Active Profile: debug")
    has(FIXTURES / "CLAUDE.local.md", "SIMD dispatch")
    has(FIXTURES / "CLAUDE.local.md", "RUST_LOG")

    section("--- Sub-scope instructions ---")
    rules = FIXTURES / ".claude" / "rules"
    ok(rules / "src-runner.md")
    ok(rules / "src-dataset.md")
    ok(rules / "src-dataset-generators.md")
    ok(rules / "src-metrics.md")
    has(rules / "src-runner.md",             "deadpool-redis")
    has(rules / "src-runner.md",             "tokio-console")
    has(rules / "src-dataset.md",            "ground truth")
    has(rules / "src-dataset-generators.md", "VectorGenerator")
    has(rules / "src-metrics.md",            "SimSIMD")
    has(rules / "src-metrics.md",            "SIMSIMD_LOG")

    section("--- Copilot + Cursor ---")
    gh = FIXTURES / ".github"
    ok(gh / "copilot-instructions.md")
    ok(gh / "instructions" / "src-runner.instructions.md")
    ok(gh / "instructions" / "src-dataset.instructions.md")
    ok(gh / "instructions" / "src-metrics.instructions.md")
    ok(FIXTURES / "AGENTS.md")
    ok(FIXTURES / ".cursor" / "rules" / "base.mdc")
    ok(FIXTURES / ".cursor" / "rules" / "src-runner.mdc")
    ok(FIXTURES / ".cursor" / "rules" / "profile-active.mdc")

    section("--- Debug commands (root only) ---")
    cmds = FIXTURES / ".claude" / "commands"
    ok(cmds / "status.md")
    ok(cmds / "profile.md")
    ok(cmds / "repro-recall.md")
    gone(cmds / "gen-bench-report.md")
    gone(cmds / "check-simd.md")
    gone(cmds / "check-simd-dispatch.md")
    ok(gh / "prompts" / "status.prompt.md")
    ok(gh / "prompts" / "profile.prompt.md")

    section("--- Debug agents ---")
    agents = gh / "agents"
    ok(agents / "planner.agent.md")
    ok(agents / "perf-investigator.agent.md")
    gone(agents / "rust-reviewer.agent.md")

    section("--- Debug skills ---")
    skills = FIXTURES / ".claude" / "skills"
    ok(skills / "flamegraph" / "SKILL.md")
    gone(skills / "results-visualizer" / "SKILL.md")
    ok(skills / "dataset-inspector" / "SKILL.md")
    ok(skills / "latency-analysis" / "SKILL.md")

    section("--- Debug MCP ---")
    mcp = FIXTURES / ".mcp.json"
    ok(mcp)
    has(mcp, "github")
    has(mcp, "valkey-server")
    no(mcp,  "azure")

    section("--- Manifest ---")
    manifest = FIXTURES / ".ai-deployed" / "manifest.json"
    ok(manifest)
    has(manifest, '"profile": "debug"')


def test_3_overlay_write() -> None:
    section("=== TEST 3: Overlay write ===")
    local_md = FIXTURES / "CLAUDE.local.md"
    marker = "<!-- AI-CONTEXT:OVERLAY — agent-managed section -->"
    content = local_md.read_text(encoding="utf-8")
    injection = "\n\n- Graviton3 sve dispatch confirmed working with SimSIMD 5.x"
    content = content.replace(marker, marker + injection, 1)
    local_md.write_text(content, encoding="utf-8")
    has(local_md, "Graviton3")


def test_4_switch_docs() -> None:
    section("=== TEST 4: Switch to docs ===")
    aictl("deploy", "--root", str(FIXTURES), "--profile", "docs")

    section("--- Debug removed ---")
    cmds   = FIXTURES / ".claude" / "commands"
    skills = FIXTURES / ".claude" / "skills"
    agents = FIXTURES / ".github" / "agents"
    gone(cmds   / "profile.md")
    gone(cmds   / "repro-recall.md")
    gone(agents / "perf-investigator.agent.md")
    gone(skills / "flamegraph"        / "SKILL.md")
    gone(skills / "dataset-inspector" / "SKILL.md")
    gone(skills / "latency-analysis"  / "SKILL.md")

    section("--- Docs present ---")
    ok(cmds   / "gen-bench-report.md")
    ok(skills / "results-visualizer" / "SKILL.md")

    section("--- Always survived ---")
    ok(cmds   / "status.md")
    ok(agents / "planner.agent.md")

    section("--- MCP switched ---")
    mcp = FIXTURES / ".mcp.json"
    has(mcp, "github")
    no(mcp,  "valkey-server")

    section("--- Overlay survived ---")
    local_md = FIXTURES / "CLAUDE.local.md"
    has(local_md, "Active Profile: docs")
    has(local_md, "Graviton3")
    has(local_md, "Mermaid")


def test_5_switch_review() -> None:
    section("=== TEST 5: Switch to review ===")
    aictl("deploy", "--root", str(FIXTURES), "--profile", "review")

    cmds   = FIXTURES / ".claude" / "commands"
    agents = FIXTURES / ".github" / "agents"
    ok(cmds   / "check-simd.md")
    ok(agents / "rust-reviewer.agent.md")
    gone(cmds / "gen-bench-report.md")
    ok(cmds   / "status.md")
    has(FIXTURES / "CLAUDE.local.md", "unwrap")


def test_6_memory_swap() -> None:
    import os
    import platform as _platform
    section("=== TEST 6: Memory swap ===")
    # Resolve claude projects dir cross-platform (mirrors platforms.py logic)
    if _platform.system() == "Windows":
        base = Path(os.environ.get("APPDATA", Path.home())) / "Claude"
    else:
        base = Path.home() / ".claude"
    proj = base / "projects" / "project"
    mem  = proj / "memory"
    shutil.rmtree(proj, ignore_errors=True)
    mem.mkdir(parents=True)
    (mem / "MEMORY.md").write_text("- Graviton3 sve confirmed\n", encoding="utf-8")
    (mem / "review-notes.md").write_text("- Check SIMD parity\n", encoding="utf-8")

    aictl("deploy", "--root", str(FIXTURES), "--profile", "debug")
    section("--- Review stashed ---")
    ok(proj / "memory--review" / "MEMORY.md")
    gone(mem / "review-notes.md")

    (mem / "MEMORY.md").write_text("- SimSIMD 5.x dispatch table updated\n", encoding="utf-8")

    aictl("deploy", "--root", str(FIXTURES), "--profile", "docs")
    section("--- Debug stashed ---")
    has(proj / "memory--debug" / "MEMORY.md", "SimSIMD")

    aictl("deploy", "--root", str(FIXTURES), "--profile", "debug")
    section("--- Debug restored ---")
    has(mem / "MEMORY.md", "SimSIMD")

    aictl("deploy", "--root", str(FIXTURES), "--profile", "review")
    section("--- Review restored ---")
    has(mem / "MEMORY.md", "Graviton3")
    ok(mem / "review-notes.md")

    shutil.rmtree(proj, ignore_errors=True)


# ── Entry point ──────────────────────────────────────────────────

def main() -> None:
    global VERBOSE
    parser = argparse.ArgumentParser(description="aictl integration tests")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Show full aictl command output")
    args = parser.parse_args()
    VERBOSE = args.verbose

    test_1_scan()
    test_2_deploy_debug()
    test_3_overlay_write()
    test_4_switch_docs()
    test_5_switch_review()
    test_6_memory_swap()

    print()
    print("=" * 64)
    print(f"  Results: {PASS} passed, {FAIL} failed")
    print("=" * 64)
    sys.exit(1 if FAIL > 0 else 0)


if __name__ == "__main__":
    main()
