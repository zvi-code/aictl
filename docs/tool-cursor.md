# Cursor

## Generated Files

| File | Source | Activation |
|------|--------|-----------|
| `.cursor/rules/base.mdc` | Root `[base]` | `alwaysApply: true` |
| `.cursor/rules/{scope}.mdc` | Sub-scope base+profile | Glob-matched |
| `.cursor/rules/profile-active.mdc` | Root `[profile]` | `alwaysApply: true` |
| `.cursor/mcp.json` | `[mcp:*]` | MCP servers |

## MDC Format

Cursor uses `.mdc` files with YAML frontmatter:

```markdown
---
description: "Context for services/ingestion"
globs: "services/ingestion/**"
alwaysApply: false
---

Content here...
```

aictl generates proper frontmatter automatically.

## What Cursor Doesn't Have

Cursor has no equivalent of commands, agents, or skills. It reads `AGENTS.md` for always-on instructions (shared with Copilot). Capabilities from `.aictx` that map to commands/agents/skills are simply not emitted for Cursor.

## AGENTS.md

Cursor reads `AGENTS.md` at repo root. aictl writes the active profile there (same file Copilot uses), so Cursor picks up your profile context automatically.

## Enable

```bash
aictl deploy --root . --profile debug --emit claude,copilot,cursor
```

All three emitters are enabled by default.
