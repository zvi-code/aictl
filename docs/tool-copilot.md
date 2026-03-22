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

## Copilot CLI Local State (`~/.copilot/`)

The CLI is a self-contained binary (bundles Node.js internally). On Windows it is installed via WinGet at `AppData\Local\Microsoft\WinGet\Links\copilot.exe` and spawns `pwsh.exe` on demand for shell tool calls.

| Path | Purpose |
|------|---------|
| `config.json` | Main settings (model, theme, experimental flags) |
| `copilot-instructions.md` | Global user-level instructions |
| `permissions-config.json` | Allowed tools, paths, URLs |
| `mcp-config.json` | User-level MCP server configurations |
| `lsp-config.json` | LSP server configuration |
| `command-history-state.json` | Command history |
| `session-store.db` | SQLite DB of all past sessions |
| `ide/` | IDE connection lock files |
| `logs/` | Process log files |
| `pkg/` | Installed CLI versions and bundled binaries (ripgrep, sharp, SDK) |
| `agents/{agent}.md` | Custom agent definitions |
| `skills/{skill}/SKILL.md` | User-profile skill definitions |
| `hooks/` | Global lifecycle hooks |
| `session-state/` | Per-session folders |

### Per-session files (`~/.copilot/session-state/{session-id}/`)

| File | Purpose |
|------|---------|
| `events.jsonl` | Full conversation history (turns, tool calls, results) |
| `workspace.yaml` | Session metadata (cwd, branch, model) |
| `inuse.{pid}.lock` | Lock file showing which copilot process owns this session |
| `checkpoints/index.md` | Checkpoint summaries for `/resume` |
| `files/` | Persistent artifacts (plan.md, context files) |
| `research/` | Research report outputs |

### Repo-level LSP

| Path | Purpose |
|------|---------|
| `.github/lsp.json` | Repo-level LSP config |

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

---

# Microsoft 365 Copilot

M365 Copilot is architecturally different from GitHub Copilot CLI — it is a thin WebView2 client where all AI processing happens server-side within Microsoft's compliance boundary.

## Process

| Detail | Value |
|--------|-------|
| Executable | `M365Copilot.exe` (renamed from `Webviewhost.exe` in late 2025) |
| Install path | `C:\Program Files\WindowsApps\Microsoft.MicrosoftOfficeHub_*\` |
| Type | UWP/MSIX packaged app (WebView2-based) |

## Local File Paths (Windows)

| Path | Purpose |
|------|---------|
| `%localappdata%\Packages\Microsoft.MicrosoftOfficeHub_8wekyb3d8bbwe\` | App data, cache, settings |

## Architecture (cloud side)

```
User Prompt (Word/Teams/Outlook/Chat)
  → Copilot Orchestration Engine
      ├─ Intent extraction & safety filters
      ├─ Responsible AI guardrails
      └─ Plugin/connector routing
  → Microsoft Graph API + Semantic Index
      ├─ Retrieves emails, docs, chats, calendar (user-scoped permissions)
      ├─ Vectorized semantic index over tenant data
      └─ Optional: Graph connectors (LOB data), Bing web search
  → Prompt Grounding (user prompt + retrieved context merged)
  → Azure OpenAI LLM (GPT-4 Turbo) — within M365 trust boundary
  → Post-processing & citation injection
  → Response rendered in app UI
```

## Key Differences from GitHub Copilot CLI

| Aspect | GitHub Copilot CLI | M365 Copilot |
|--------|-------------------|--------------|
| Runs locally | Yes (self-contained Node binary) | WebView2 shell only; AI is cloud-only |
| Data source | Local filesystem + GitHub API | Microsoft Graph (Exchange, SharePoint, OneDrive, Teams) |
| LLM | Claude/GPT via GitHub | GPT-4 Turbo via Azure OpenAI |
| Local state | `~/.copilot/` (sessions, config, DB) | UWP package folder (minimal cache) |
| Extensibility | MCP servers, custom agents | Graph connectors, Copilot Studio plugins |

## Project-Level Files (Copilot Studio / Teams Toolkit)

| Path | Purpose |
|------|---------|
| `m365agents.yml` | M365 Agents Toolkit project manifest (ATK v5.12+) |
| `teamsapp.yml` | Legacy Teams Toolkit manifest |
| `appPackage/manifest.json` | M365 app manifest (schema v1.18+; defines copilotAgents) |
| `appPackage/declarativeAgent.json` | Declarative agent manifest (schema v1.6; up to 8000 chars instructions) |
| `appPackage/apiPlugin.json` | API plugin manifest for Copilot extensibility |
| `aad.manifest.json` | Azure AD / Entra ID app registration |
| `env/.env.dev`, `env/.env.local` | Environment config (credentials) |
| `.fx/` | Teams Toolkit v4 state (legacy) |
