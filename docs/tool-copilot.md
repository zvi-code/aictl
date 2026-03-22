# GitHub Copilot (CLI + VS Code)

Copilot CLI and Copilot in VS Code read the same files.

## Generated Files

| File | Source | Tool Surface |
|------|--------|-------------|
| `.github/copilot-instructions.md` | Root `[base]` | CLI + VS Code repo-wide |
| `.github/instructions/{scope}.instructions.md` | Sub-scope base+profile | Path-specific (glob) |
| `AGENTS.md` | Root `[profile]` + overlay | CLI + VS Code always-on |
| `.github/agents/{name}.agent.md` | `[agent:*]` | Custom agents |
| `.github/skills/{name}/SKILL.md` | `[skill:*]` | Agent skills |
| `.github/prompts/{name}.prompt.md` | `[command:*]` | VS Code prompt files |
| `.copilot-mcp.json` | `[mcp:*]` | MCP reference |

## Not Touched

| File | Owner |
|------|-------|
| `.github/hooks/*.json` | Team lifecycle hooks |
| `~/.copilot/mcp-config.json` | User MCP servers |
| `~/.copilot/lsp-config.json` | User LSP config |

## Copilot Memory

Cloud-hosted on GitHub servers. Repository-scoped, auto-expires after 28 days. aictl has no access. Review at: repo Settings → Copilot → Memory.

## Prompt Files vs Commands

`[command:*]` sections map to both:
- Claude Code: `.claude/commands/{name}.md` → `/project:name`
- VS Code Copilot: `.github/prompts/{name}.prompt.md` → reusable workflow

## MCP

aictl writes `.copilot-mcp.json` at root. Use with:
```bash
copilot --additional-mcp-config .copilot-mcp.json
```
