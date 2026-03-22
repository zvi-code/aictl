#!/usr/bin/env bash
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
P="$DIR/fixtures/project"
PASS=0; FAIL=0

ok()   { if [ -f "$1" ]; then echo "  ✓ exists: $(basename "$1")"; PASS=$((PASS+1)); else echo "  ✗ MISSING: $1"; FAIL=$((FAIL+1)); fi; }
gone() { if [ ! -f "$1" ]; then echo "  ✓ gone: $(basename "$1")"; PASS=$((PASS+1)); else echo "  ✗ STILL: $1"; FAIL=$((FAIL+1)); fi; }
has()  { if grep -qF "$2" "$1" 2>/dev/null; then echo "  ✓ '$2' in $(basename "$1")"; PASS=$((PASS+1)); else echo "  ✗ NO '$2' in $1"; FAIL=$((FAIL+1)); fi; }
no()   { if ! grep -qF "$2" "$1" 2>/dev/null; then echo "  ✓ no '$2' in $(basename "$1")"; PASS=$((PASS+1)); else echo "  ✗ FOUND '$2' in $1"; FAIL=$((FAIL+1)); fi; }

clean() {
  find "$P" -name 'CLAUDE.md' -delete 2>/dev/null
  find "$P" -name 'CLAUDE.local.md' -delete 2>/dev/null
  find "$P" -name 'AGENTS.md' -delete 2>/dev/null
  rm -rf "$P/.claude" "$P/.github" "$P/.cursor" "$P/.ai-deployed"
  rm -f "$P/.mcp.json" "$P/.copilot-mcp.json"
}

# ====================================================================
echo "=== TEST 1: Scan ==="
SCAN=$(aictl scan --root "$P" 2>&1)
echo "$SCAN"
echo "$SCAN" | grep -qF "(root)" && { echo "  ✓ root"; PASS=$((PASS+1)); } || { echo "  ✗ no root"; FAIL=$((FAIL+1)); }
echo "$SCAN" | grep -qF "src/runner" && { echo "  ✓ runner"; PASS=$((PASS+1)); } || { echo "  ✗ no runner"; FAIL=$((FAIL+1)); }
echo "$SCAN" | grep -qF "src/dataset" && { echo "  ✓ dataset"; PASS=$((PASS+1)); } || { echo "  ✗ no dataset"; FAIL=$((FAIL+1)); }
echo "$SCAN" | grep -qF "src/metrics" && { echo "  ✓ metrics"; PASS=$((PASS+1)); } || { echo "  ✗ no metrics"; FAIL=$((FAIL+1)); }
echo "$SCAN" | grep -qF "generators" && { echo "  ✓ generators"; PASS=$((PASS+1)); } || { echo "  ✗ no generators"; FAIL=$((FAIL+1)); }
echo "$SCAN" | grep -qF "5 scope" && { echo "  ✓ 6 scopes"; PASS=$((PASS+1)); } || { echo "  ✗ not 6"; FAIL=$((FAIL+1)); }

# ====================================================================
echo ""
echo "=== TEST 2: Deploy debug ==="
clean
aictl deploy --root "$P" --profile debug 2>&1

echo ""
echo "--- Root instructions ---"
ok "$P/CLAUDE.md"
ok "$P/CLAUDE.local.md"
has "$P/CLAUDE.md" "valkey-bench-rs"
has "$P/CLAUDE.md" "cargo build"
has "$P/CLAUDE.md" "thiserror"
has "$P/CLAUDE.local.md" "Active Profile: debug"
has "$P/CLAUDE.local.md" "SIMD dispatch"
has "$P/CLAUDE.local.md" "RUST_LOG"

echo ""
echo "--- Sub-scope instructions ---"
ok "$P/.claude/rules/src-runner.md"
ok "$P/.claude/rules/src-dataset.md"
ok "$P/.claude/rules/src-dataset-generators.md"
ok "$P/.claude/rules/src-metrics.md"
has "$P/.claude/rules/src-runner.md" "deadpool-redis"
has "$P/.claude/rules/src-runner.md" "tokio-console"
has "$P/.claude/rules/src-dataset.md" "ground truth"
has "$P/.claude/rules/src-dataset-generators.md" "VectorGenerator"
has "$P/.claude/rules/src-metrics.md" "SimSIMD"
has "$P/.claude/rules/src-metrics.md" "SIMSIMD_LOG"

echo ""
echo "--- Copilot + Cursor ---"
ok "$P/.github/copilot-instructions.md"
ok "$P/.github/instructions/src-runner.instructions.md"
ok "$P/.github/instructions/src-dataset.instructions.md"
ok "$P/.github/instructions/src-metrics.instructions.md"
ok "$P/AGENTS.md"
ok "$P/.cursor/rules/base.mdc"
ok "$P/.cursor/rules/src-runner.mdc"
ok "$P/.cursor/rules/profile-active.mdc"

echo ""
echo "--- Debug commands (root only) ---"
ok "$P/.claude/commands/status.md"
ok "$P/.claude/commands/profile.md"
ok "$P/.claude/commands/repro-recall.md"
gone "$P/.claude/commands/gen-bench-report.md"
gone "$P/.claude/commands/check-simd.md"
# Metrics child command NOT at root
gone "$P/.claude/commands/check-simd-dispatch.md"
ok "$P/.github/prompts/status.prompt.md"
ok "$P/.github/prompts/profile.prompt.md"

echo ""
echo "--- Debug agents ---"
ok "$P/.github/agents/planner.agent.md"
ok "$P/.github/agents/perf-investigator.agent.md"
gone "$P/.github/agents/rust-reviewer.agent.md"

echo ""
echo "--- Debug skills (root + recursive from children) ---"
ok "$P/.claude/skills/flamegraph/SKILL.md"
gone "$P/.claude/skills/results-visualizer/SKILL.md"
# Recursive inherit pulls children skills
ok "$P/.claude/skills/dataset-inspector/SKILL.md"
ok "$P/.claude/skills/latency-analysis/SKILL.md"

echo ""
echo "--- Debug MCP ---"
ok "$P/.mcp.json"
has "$P/.mcp.json" "github"
has "$P/.mcp.json" "valkey-server"
no  "$P/.mcp.json" "azure"

echo ""
echo "--- Manifest ---"
ok "$P/.ai-deployed/manifest.json"
has "$P/.ai-deployed/manifest.json" '"profile": "debug"'

# ====================================================================
echo ""
echo "=== TEST 3: Overlay write ==="
sed -i 's|<!-- AI-CONTEXT:OVERLAY — agent-managed section -->|<!-- AI-CONTEXT:OVERLAY — agent-managed section -->\n\n- Graviton3 sve dispatch confirmed working with SimSIMD 5.x|' "$P/CLAUDE.local.md"
has "$P/CLAUDE.local.md" "Graviton3"

# ====================================================================
echo ""
echo "=== TEST 4: Switch to docs ==="
aictl deploy --root "$P" --profile docs 2>&1

echo ""
echo "--- Debug removed ---"
gone "$P/.claude/commands/profile.md"
gone "$P/.claude/commands/repro-recall.md"
gone "$P/.github/agents/perf-investigator.agent.md"
gone "$P/.claude/skills/flamegraph/SKILL.md"
gone "$P/.claude/skills/dataset-inspector/SKILL.md"
gone "$P/.claude/skills/latency-analysis/SKILL.md"

echo ""
echo "--- Docs present ---"
ok "$P/.claude/commands/gen-bench-report.md"
ok "$P/.claude/skills/results-visualizer/SKILL.md"

echo ""
echo "--- Always survived ---"
ok "$P/.claude/commands/status.md"
ok "$P/.github/agents/planner.agent.md"

echo ""
echo "--- MCP switched ---"
has "$P/.mcp.json" "github"
no  "$P/.mcp.json" "valkey-server"

echo ""
echo "--- Overlay survived ---"
has "$P/CLAUDE.local.md" "Active Profile: docs"
has "$P/CLAUDE.local.md" "Graviton3"
has "$P/CLAUDE.local.md" "Mermaid"

# ====================================================================
echo ""
echo "=== TEST 5: Switch to review ==="
aictl deploy --root "$P" --profile review 2>&1

ok "$P/.claude/commands/check-simd.md"
ok "$P/.github/agents/rust-reviewer.agent.md"
gone "$P/.claude/commands/gen-bench-report.md"
ok "$P/.claude/commands/status.md"
has "$P/CLAUDE.local.md" "unwrap"

# ====================================================================
echo ""
echo "=== TEST 6: Memory swap ==="
PROJ="$HOME/.claude/projects/project"
rm -rf "$PROJ"
MEM="$PROJ/memory"
mkdir -p "$MEM"
echo "- Graviton3 sve confirmed" > "$MEM/MEMORY.md"
echo "- Check SIMD parity" > "$MEM/review-notes.md"

aictl deploy --root "$P" --profile debug 2>&1
echo ""
echo "--- Review stashed ---"
ok "$PROJ/memory--review/MEMORY.md"
gone "$MEM/review-notes.md"

echo "- SimSIMD 5.x dispatch table updated" > "$MEM/MEMORY.md"

aictl deploy --root "$P" --profile docs 2>&1
echo ""
echo "--- Debug stashed ---"
has "$PROJ/memory--debug/MEMORY.md" "SimSIMD"

aictl deploy --root "$P" --profile debug 2>&1
echo ""
echo "--- Debug restored ---"
has "$MEM/MEMORY.md" "SimSIMD"

aictl deploy --root "$P" --profile review 2>&1
echo ""
echo "--- Review restored ---"
has "$MEM/MEMORY.md" "Graviton3"
ok "$MEM/review-notes.md"

rm -rf "$PROJ"

# ====================================================================
echo ""
echo "================================================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "================================================================"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
