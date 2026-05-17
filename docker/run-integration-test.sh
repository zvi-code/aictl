#!/usr/bin/env bash
# aictl integration test — runs inside Docker container
# Tests fresh install, DB creation, deploy, OTel, and Claude Code interaction
set -euo pipefail

# Integration runs are noninteractive; deploy must approve generated file writes.
export AICTL_ASSUME_YES=1

PASS=0
FAIL=0
TESTS=()

pass() { PASS=$((PASS + 1)); TESTS+=("PASS: $1"); echo "  PASS  $1"; }
fail() { FAIL=$((FAIL + 1)); TESTS+=("FAIL: $1"); echo "  FAIL  $1"; }

echo "================================================"
echo "  aictl integration test suite"
echo "================================================"
echo ""

# ── 1. CLI basics ─────────────────────────────────────────────────
echo "--- CLI basics ---"

if aictl --version | grep -q "0.4.0"; then
    pass "aictl --version returns 0.4.0"
else
    fail "aictl --version"
fi

if aictl --help | grep -q "deploy"; then
    pass "aictl --help lists commands"
else
    fail "aictl --help"
fi

# ── 2. Fresh DB creation ─────────────────────────────────────────
echo ""
echo "--- Fresh DB creation ---"

# Ensure no pre-existing DB
DB_PATH="${HOME}/.config/aictl/history.db"
rm -f "$DB_PATH"

# Start server briefly to trigger DB init
aictl daemon serve --port 8484 --no-open &
SERVER_PID=$!
sleep 3

if [ -f "$DB_PATH" ]; then
    pass "history.db created on first launch"
else
    fail "history.db not created"
fi

read -r SCHEMA_VER EXPECTED_SCHEMA_VER < <(python3 -c "
import sqlite3
from aictl.storage import SCHEMA_VERSION
conn = sqlite3.connect('$DB_PATH')
ver = conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]
print(ver, SCHEMA_VERSION)
conn.close()
")
if [ "$SCHEMA_VER" = "$EXPECTED_SCHEMA_VER" ]; then
    pass "schema version is current ($SCHEMA_VER)"
else
    fail "schema version is $SCHEMA_VER (expected $EXPECTED_SCHEMA_VER)"
fi

# Check required baseline tables exist. Keep this as a subset so the test
# catches missing core tables without going stale when new tables are added.
MISSING_TABLES=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
tables = {r[0] for r in conn.execute(
    \"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()}
required = {
    'schema_version', 'tools', 'projects', 'processes', 'process_snapshots',
    'system_snapshots', 'sessions', 'session_processes', 'requests',
    'tool_invocations', 'files', 'file_blobs', 'file_history', 'tool_config',
    'file_write_events', 'data_quality_status', 'environment_vars',
    'tool_stats', 'events', 'metrics', 'path_defs', 'process_defs',
    'memory_snapshots', 'cursor_session_messages', 'copilot_session_messages',
    'vscode_chat_messages', 'datapoint_catalog',
    'ui_dashboard', 'ui_tab', 'ui_widget',
}
print(' '.join(sorted(required - tables)))
conn.close()
")
if [ -z "$MISSING_TABLES" ]; then
    pass "required schema tables exist"
else
    fail "missing schema tables: $MISSING_TABLES"
fi

# Check events table has structured columns
EVENT_COLS=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
cols = sorted(r[1] for r in conn.execute('PRAGMA table_info(events)'))
print(' '.join(cols))
conn.close()
")
for col in session_id pid project_path detail seq; do
    if echo "$EVENT_COLS" | grep -qw "$col"; then
        pass "events table has column: $col"
    else
        fail "events table missing column: $col"
    fi
done

# Check metrics table has structured columns
METRIC_COLS=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
cols = sorted(r[1] for r in conn.execute('PRAGMA table_info(metrics)'))
print(' '.join(cols))
conn.close()
")
for col in metric value tags tool project_path session_id seq; do
    if echo "$METRIC_COLS" | grep -qw "$col"; then
        pass "metrics table has column: $col"
    else
        fail "metrics table missing column: $col"
    fi
done

# Check indexes exist
IDX_COUNT=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
count = conn.execute(
    \"SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'\").fetchone()[0]
print(count)
conn.close()
")
if [ "$IDX_COUNT" -ge 20 ]; then
    pass "indexes: $IDX_COUNT indexes created (>= 20)"
else
    fail "indexes: only $IDX_COUNT (expected >= 20)"
fi

# Check CSV specs seeded
SPEC_COUNT=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
paths = conn.execute('SELECT COUNT(*) FROM path_defs').fetchone()[0]
procs = conn.execute('SELECT COUNT(*) FROM process_defs').fetchone()[0]
print(f'{paths} {procs}')
conn.close()
")
PATH_SPECS=$(echo "$SPEC_COUNT" | cut -d' ' -f1)
PROC_SPECS=$(echo "$SPEC_COUNT" | cut -d' ' -f2)
if [ "$PATH_SPECS" -gt 0 ] && [ "$PROC_SPECS" -gt 0 ]; then
    pass "CSV specs seeded: $PATH_SPECS path specs, $PROC_SPECS process specs"
else
    fail "CSV specs not seeded: $PATH_SPECS paths, $PROC_SPECS procs"
fi

# Check UI layout seeded
UI_COUNT=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
d = conn.execute('SELECT COUNT(*) FROM ui_dashboard').fetchone()[0]
t = conn.execute('SELECT COUNT(*) FROM ui_tab').fetchone()[0]
w = conn.execute('SELECT COUNT(*) FROM ui_widget').fetchone()[0]
print(f'{d} {t} {w}')
conn.close()
")
DASHBOARDS=$(echo "$UI_COUNT" | cut -d' ' -f1)
TABS=$(echo "$UI_COUNT" | cut -d' ' -f2)
WIDGETS=$(echo "$UI_COUNT" | cut -d' ' -f3)
if [ "$DASHBOARDS" -gt 0 ] && [ "$TABS" -gt 0 ] && [ "$WIDGETS" -gt 0 ]; then
    pass "UI layout seeded: $DASHBOARDS dashboards, $TABS tabs, $WIDGETS widgets"
else
    fail "UI layout not seeded: $DASHBOARDS/$TABS/$WIDGETS"
fi

# ── 3. Dashboard HTTP ─────────────────────────────────────────────
echo ""
echo "--- Dashboard HTTP ---"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8484/)
if [ "$HTTP_CODE" = "200" ]; then
    pass "dashboard returns HTTP 200"
else
    fail "dashboard returns HTTP $HTTP_CODE"
fi

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8484/api/snapshot)
if [ "$API_CODE" = "200" ]; then
    pass "API /api/snapshot returns 200"
else
    fail "API /api/snapshot returns $API_CODE"
fi

# ── 4. Deploy .context.toml ──────────────────────────────────────
echo ""
echo "--- Deploy ---"

DEPLOY_OUT=$(aictl ctx deploy --root /project --profile debug 2>&1)
if echo "$DEPLOY_OUT" | grep -q "Deploying from"; then
    pass "deploy ran successfully"
else
    fail "deploy didn't run: $DEPLOY_OUT"
fi

if [ -f /project/CLAUDE.md ]; then
    pass "CLAUDE.md exists on disk"
else
    fail "CLAUDE.md not created"
fi

if [ -f /project/.mcp.json ]; then
    pass ".mcp.json exists on disk"
else
    fail ".mcp.json not created"
fi

# ── 5. OTel configuration ────────────────────────────────────────
echo ""
echo "--- OTel ---"

if [ "${OTEL_EXPORTER_OTLP_ENDPOINT:-}" = "http://localhost:8484" ]; then
    pass "OTEL_EXPORTER_OTLP_ENDPOINT set correctly"
else
    fail "OTEL_EXPORTER_OTLP_ENDPOINT = ${OTEL_EXPORTER_OTLP_ENDPOINT:-unset}"
fi

if [ "${CLAUDE_CODE_ENABLE_TELEMETRY:-}" = "1" ]; then
    pass "CLAUDE_CODE_ENABLE_TELEMETRY enabled"
else
    fail "CLAUDE_CODE_ENABLE_TELEMETRY = ${CLAUDE_CODE_ENABLE_TELEMETRY:-unset}"
fi

# ── 6. Claude Code (if token available) ──────────────────────────
echo ""
echo "--- Claude Code ---"

if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    pass "CLAUDE_CODE_OAUTH_TOKEN is set"

    # Run a simple Claude Code command
    CLAUDE_MODEL="${AICTL_CLAUDE_MODEL:-claude-haiku-4-5}"
    CLAUDE_OUT=$(claude -p "Say exactly: INTEGRATION_TEST_OK" --model "$CLAUDE_MODEL" --max-turns 1 2>&1 || true)
    if echo "$CLAUDE_OUT" | grep -q "INTEGRATION_TEST_OK"; then
        pass "Claude Code responded correctly"
    else
        fail "Claude Code response unexpected: $(echo "$CLAUDE_OUT" | head -3)"
    fi

    # Wait for OTel data to arrive
    sleep 5

    # Check if events were recorded
    EVENT_COUNT=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
count = conn.execute('SELECT COUNT(*) FROM events').fetchone()[0]
print(count)
conn.close()
")
    if [ "$EVENT_COUNT" -gt 0 ]; then
        pass "OTel events recorded: $EVENT_COUNT events in DB"
    else
        fail "no OTel events in DB after Claude Code run"
    fi
else
    echo "  SKIP  Claude Code tests (no CLAUDE_CODE_OAUTH_TOKEN)"
fi

# ── 7. Unit tests ────────────────────────────────────────────────
echo ""
echo "--- Unit tests ---"

# Kill server before running tests (port conflict)
kill $SERVER_PID 2>/dev/null || true
sleep 1

pip install --quiet pytest pytest-timeout 2>/dev/null

# 7a. Unit tests
PYTEST_OUTPUT=$(python3 -m pytest /app/test/ -x -q --ignore=/app/test/e2e --ignore=/app/test/e2e_tools 2>&1)
PYTEST_LAST=$(echo "$PYTEST_OUTPUT" | tail -1)
if echo "$PYTEST_LAST" | grep -q "passed"; then
    pass "pytest unit: $PYTEST_LAST"
else
    echo "$PYTEST_OUTPUT" | tail -10
    fail "pytest unit: $PYTEST_LAST"
fi

# 7b. E2E simulated tests (starts its own server)
echo ""
echo "--- E2E simulated tests ---"
E2E_OUTPUT=$(python3 -m pytest /app/test/e2e/ -v --timeout=120 2>&1)
E2E_LAST=$(echo "$E2E_OUTPUT" | tail -1)
if echo "$E2E_LAST" | grep -q "passed"; then
    pass "pytest e2e: $E2E_LAST"
else
    echo "$E2E_OUTPUT" | tail -20
    fail "pytest e2e: $E2E_LAST"
fi

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "================================================"
for t in "${TESTS[@]}"; do
    echo "  $t"
done
echo ""

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
