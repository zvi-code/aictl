#!/usr/bin/env bash
# aictl Docker entrypoint
# Modes:
#   (default)    — start aictl serve (dashboard)
#   test         — run integration test suite
#   shell        — drop into bash
set -euo pipefail

MODE="${1:-serve}"

# Configure OTel for Claude Code → aictl
export AICTL_PORT=8484
eval "$(aictl otel enable --print 2>/dev/null)" || true

case "$MODE" in
    serve)
        echo "Starting aictl dashboard on port 8484..."
        exec aictl serve --port 8484 --no-open
        ;;
    test)
        echo "Running integration test suite..."
        exec /run-integration-test.sh
        ;;
    shell)
        exec /bin/bash
        ;;
    *)
        echo "Unknown mode: $MODE"
        echo "Usage: docker run <image> [serve|test|shell]"
        exit 1
        ;;
esac
