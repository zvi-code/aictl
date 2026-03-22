# Docker Integration Test

Isolated, reproducible test environment for aictl. Validates fresh install,
DB creation, deploy, OTel flow, and Claude Code interaction in a clean container.

## Prerequisites

- Docker Desktop installed
- `CLAUDE_CODE_OAUTH_TOKEN` in your environment (for Claude Code tests; optional)

## Quick Start

```bash
cd docker/

# Build the image
docker compose build

# Run the dashboard (http://localhost:8484)
docker compose up aictl

# Run the full integration test suite
docker compose --profile test run test

# Drop into a shell for manual testing
docker compose run aictl shell
```

## What Gets Tested

### Without Claude Code token (always runs)

| Test | What it validates |
|------|-------------------|
| CLI basics | `aictl --version`, `--help` list all commands |
| Fresh DB creation | `history.db` created on first launch |
| Schema v12 | Correct version, all 20 tables, structured columns, indexes |
| CSV specs seeded | Path and process specs populated from CSVs |
| UI layout seeded | Dashboard, tabs, widgets created |
| Dashboard HTTP | Returns 200, API endpoints respond |
| Deploy | `.context.toml` → native files (CLAUDE.md, .mcp.json, etc.) |
| OTel config | Environment variables set correctly |
| Unit tests | Full pytest suite passes (369 tests) |

### With Claude Code token (when `CLAUDE_CODE_OAUTH_TOKEN` is set)

| Test | What it validates |
|------|-------------------|
| Claude Code responds | Runs `claude -p` and gets expected output |
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
docker compose run aictl shell

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
