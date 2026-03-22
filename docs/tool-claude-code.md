# Claude Code

## Generated Files

| File | Source | Scope |
|------|--------|-------|
| `CLAUDE.md` | Root `[base]` | Always loaded at project level |
| `CLAUDE.local.md` | Root `[profile]` + overlay | Personal, gitignored |
| `.claude/rules/{scope}.md` | Sub-scope `[base]`+`[profile]` | Glob-matched (`applyTo`) |
| `.claude/commands/{name}.md` | `[command:*]` | Slash commands: `/project:name` |
| `.claude/skills/{name}/SKILL.md` | `[skill:*]` | Agent skills |
| `.mcp.json` | `[mcp:*]` | MCP servers |

## Not Touched

| File | Owner |
|------|-------|
| `.claude/settings.json` | Team (committed) |
| `.claude/settings.local.json` | User (gitignored) |
| `~/.claude/settings.json` | User global settings |
| `~/.claude/commands/*.md` | User global commands |

## Outside the Repo

```
~/.claude/
├── CLAUDE.md              user-managed (personal prefs)
├── settings.json          user-managed
├── commands/*.md           user-managed
└── projects/<hash>/
    └── memory/            Claude writes, aictl SWAPS per profile
        ├── MEMORY.md
        └── *.md
```

Auto-memory is swapped on profile switch. See [memory.md](memory.md).

## VS Code Extension

The Claude Code VS Code extension reads the same files as the CLI. No separate configuration needed. Restart the session after deploy.

## Profile Switch Example

```bash
aictl deploy --root . --profile debug
# Creates: investigate.md, trace.md, flame-graph/, azure-monitor in .mcp.json

aictl deploy --root . --profile docs
# REMOVES: investigate.md, trace.md, flame-graph/
# CREATES: gen-diagram.md, gen-adr.md, diagramming/
# .mcp.json: azure-devops replaces azure-monitor
# memory/ stashed, memory--docs/ restored
# CLAUDE.local.md overlay preserved
```
