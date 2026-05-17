# Docker Integration Test

Isolated, reproducible test environment for aictl. Validates fresh install,
DB creation, deploy, OTel flow, simulated E2E, and optional Claude Code interaction in a clean container.

## Prerequisites

- Docker Desktop installed
- `CLAUDE_CODE_OAUTH_TOKEN` in your environment (for Claude Code tests; optional)

## Quick Start

```bash
# From the repository root, sanity-check Docker before the longer build/run.
docker info --format '{{.ServerVersion}}'
docker compose -f docker/docker-compose.test.yml config --services

# Build the image
docker compose -f docker/docker-compose.test.yml build

# Run the dashboard (http://localhost:8484)
docker compose -f docker/docker-compose.yml up aictl

# Run the fresh-install integration test suite
docker compose -f docker/docker-compose.test.yml run --build --rm test-integration

# Optional real Claude Code gate (requires token; defaults to the full Haiku model id)
CLAUDE_CODE_OAUTH_TOKEN=... AICTL_CLAUDE_MODEL=claude-haiku-4-5 \
    docker compose -f docker/docker-compose.test.yml --profile tools run --build --rm test-claude

# Drop into a shell for manual testing
docker compose -f docker/docker-compose.yml run --rm aictl shell
```

## What Gets Tested

### Without Claude Code token (always runs)

| Test | What it validates |
|------|-------------------|
| CLI basics | `aictl --version`, `--help` list all commands |
| Fresh DB creation | `history.db` created on first launch |
| Current schema | DB schema equals `aictl.storage.SCHEMA_VERSION`; required core tables, structured columns, and indexes exist |
| Observability tables | `file_write_events` and `data_quality_status` are present in a fresh DB |
| CSV definitions seeded | Path and process definitions populated from CSVs |
| UI layout seeded | Dashboard, tabs, widgets created |
| Dashboard HTTP | Returns 200, API endpoints respond |
| Deploy | `.context.toml` → native files (CLAUDE.md, .mcp.json, etc.) |
| OTel config | Environment variables set correctly |
| Unit tests | Non-E2E pytest suite passes |
| Simulated E2E | Server-backed synthetic hook/OTel tests pass |

### With Claude Code token (when `CLAUDE_CODE_OAUTH_TOKEN` is set)

| Test | What it validates |
|------|-------------------|
| Claude Code responds | Runs `claude -p --model ${AICTL_CLAUDE_MODEL:-claude-haiku-4-5}` and gets expected output |
| OTel end-to-end | Events from Claude Code appear in aictl DB |

## Architecture

```
Container
├── /app                  ← aictl source (COPY from repo)
├── /project              ← sample .context.toml project (from test fixtures)
├── ~/.config/aictl/      ← fresh DB created on first launch
└── aictl serve :8484     ← dashboard + OTel receiver
         ↑
    Claude Code ──OTel──→ localhost:8484/v1/logs
```

## Manual Exploration

```bash
# Shell into the container
docker compose -f docker/docker-compose.yml run --rm aictl shell

# Inside the container:
aictl --version
aictl serve --port 8484 --no-open &
aictl deploy --root /project --profile debug
aictl status --root /project
aictl otel verify
claude -p "What files are in /project?"
```

## Rebuilding

After code changes, rebuild the image:

```bash
docker compose build --no-cache
```
