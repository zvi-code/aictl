## Research: GitHub Copilot CLI — Complete Map of Hidden Files, Structures, Configurations & Features

---

### 1. Overview

GitHub Copilot CLI (`copilot` command) is a standalone terminal-native AI agent, powered by the same agentic harness as GitHub's Copilot coding agent. It replaces the retired `gh copilot` extension for GitHub CLI. It's a separate binary (not a `gh` extension), installed via Homebrew, npm (`@github/copilot`), WinGet, or the install script. Default model is Claude Sonnet 4.5, with GPT-5 and Claude Sonnet 4 available via `/model`.

---

### 2. Configuration Files & Hidden Structures

#### 2.1 User-Level Configuration Directory

**`~/.copilot/`** — The primary user-level configuration directory for Copilot CLI.

Known files within it:
- **`~/.copilot/lsp-config.json`** — User-level LSP server configuration (applies to all projects)
- **`~/.copilot/agents/`** — User-profile custom agents (shared with VS Code)
- **`~/.copilot/skills/`** — User-profile agent skills (shared with VS Code)
- Config/settings persisted here (experimental mode flag is persisted to config)

#### 2.2 Repository-Level Configuration

**`.github/lsp.json`** — Repository-level LSP server configuration. Format:
```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"],
      "fileExtensions": {
        ".ts": "typescript",
        ".tsx": "typescript"
      }
    }
  }
}
```

**`.github/copilot-instructions.md`** — Repository-wide instructions (same as VS Code/GitHub Copilot).

**`AGENTS.md`** — Agent instructions file, used by Copilot CLI for custom agent behavior. Can be placed at any directory level; nearest file in directory tree takes precedence.

**`.github/agents/*.agent.md`** — Custom agents (shared format with VS Code). Selected via `/agent` slash command.

**`.github/skills/<name>/SKILL.md`** — Agent skills (shared format with VS Code). Used via `/skills` slash command.

**`.github/hooks/*.json`** — Lifecycle hooks (shared with VS Code). Copilot CLI supports the same hook events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `PreCompact`, `Stop`.

**`.github/prompts/*.prompt.md`** — Reusable prompt files (shared with VS Code). Available as slash commands.

**`.github/instructions/*.instructions.md`** — Path-specific instructions with `applyTo` frontmatter (shared with VS Code).

---

### 3. Authentication

Authentication methods (in order of precedence):
- **`GH_TOKEN`** environment variable — fine-grained PAT with "Copilot Requests" permission
- **`GITHUB_TOKEN`** environment variable — same as above
- **Device flow authentication** — via `/login` slash command (browser-based OAuth)

---

### 4. MCP Servers

Copilot CLI ships with **GitHub's MCP server by default** — providing native access to repositories, issues, pull requests, labels, and activity data via natural language.

Custom MCP servers are also supported. Configuration reuses the same `.vscode/mcp.json` format. In the CLI context, MCP servers are managed via `/mcp` slash command.

**Limitation (as of VS Code integration):** Copilot CLI sessions can currently only access local MCP servers that don't require authentication.

---

### 5. Slash Commands

The Copilot CLI provides these built-in slash commands:

| Command | Description |
|---|---|
| `/login` | Authenticate with GitHub |
| `/model` | Switch AI model (Claude Sonnet 4.5, Claude Sonnet 4, GPT-5) |
| `/experimental` | Enable experimental features (persisted to config) |
| `/plan` | Create a plan outline before execution |
| `/agent` | Select a custom agent |
| `/skills` | Use agent skills |
| `/mcp` | Manage MCP servers / GitHub integration |
| `/fleet` | Execute in parallel or run multiple models simultaneously |
| `/resume` | Resume a long-running session |
| `/IDE` | Open work in VS Code to refine code |
| `/delegate` | Create branch, implement change, open PR with a single command |
| `/diff` | Review changes/diffs |
| `/compact` | Manage long conversations (context compaction) |
| `/yolo` / `/autoApprove` | Toggle auto-approval of tools |
| `/allow-all` | Grant all permissions in interactive session |
| `/lsp` | View LSP server status |
| `/feedback` | Submit confidential feedback survey |

---

### 6. Interaction Modes

The CLI supports three interaction modes (cycle with `Shift+Tab`):

- **Default mode** — requires approval for each action
- **Plan mode** — outlines work before executing; use `/model` to compare approaches
- **Autopilot mode** (experimental) — agent continues working until task is complete, auto-approving actions

---

### 7. Permission Flags (CLI Arguments)

```
--allow-tool=[TOOLS...]    # Grant specific tool permissions
--allow-all-tools          # Grant all tool permissions
--allow-all                # Grant all permissions (tools + file access)
--experimental             # Enable experimental features
--banner                   # Show animated welcome banner
```

---

### 8. VS Code Integration

Copilot CLI integrates deeply with VS Code:

#### 8.1 Session Management
- Start from Chat view: select "Copilot CLI" from Session Target dropdown
- Start from terminal: `copilot` in integrated terminal or use "GitHub Copilot CLI" terminal profile
- Hand off local agent sessions to Copilot CLI (passing full conversation history)
- Plan agent can hand off to Copilot CLI for implementation
- Multiple parallel Copilot CLI sessions supported

#### 8.2 Isolation Modes
- **Worktree isolation** — creates a Git worktree in separate folder; all changes isolated; permission auto-set to "Bypass Approvals"
- **Workspace isolation** — changes applied directly to current workspace; all permission levels available (Default, Bypass, Autopilot)

#### 8.3 VS Code Settings for Copilot CLI
- `github.copilot.chat.cli.customAgents.enabled` — enable custom agents for Copilot CLI (experimental, default: `false`)
- `github.copilot.chat.claudeAgent.enabled` — enable Claude agent sessions
- `github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions` — bypass all permission checks (for sandboxed environments only)

---

### 9. Memory & Session Persistence

- **`/resume`** — return to long-running sessions; memory and compaction keep sessions from collapsing
- **Memory** — Copilot CLI sessions use the same local memory tool as VS Code agents (user, repository, session scopes)
- **Copilot Memory** — GitHub-hosted memory is shared across Copilot CLI, Copilot coding agent, and Copilot code review
- **Context compaction** — `/compact` command manages long conversations to stay within context window

---

### 10. Telemetry / Observability

**Current state:** As of the research, there is zero OTel instrumentation from the VS Code extension side for Copilot CLI (background agent) sessions. There is an open issue (#298832 on microsoft/vscode) requesting OTel support for background agent sessions.

The Copilot CLI binary itself may have its own internal telemetry, but there is no documented user-facing OTel configuration equivalent to the VS Code `github.copilot.chat.otel.*` settings for Copilot CLI sessions.

---

### 11. LSP (Language Server Protocol) Support

Copilot CLI supports LSP for enhanced code intelligence (go-to-definition, hover, diagnostics). LSP servers are not bundled — installed separately.

Configuration locations:
- **User-level:** `~/.copilot/lsp-config.json`
- **Repository-level:** `.github/lsp.json`

Format:
```json
{
  "lspServers": {
    "<language-name>": {
      "command": "<lsp-server-binary>",
      "args": ["--stdio"],
      "fileExtensions": {
        ".<ext>": "<language-id>"
      }
    }
  }
}
```

---

### 12. Plugin Support

Copilot CLI supports the same agent plugin ecosystem as VS Code. Plugins discovered from marketplace repos can provide slash commands, skills, agents, hooks, and MCP servers. The plugin format includes Claude Code compatibility (hooks with `${CLAUDE_PLUGIN_ROOT}`, matcher syntax, `.mcp.json` with `mcpServers` key).

---

### 13. Complete File/Structure Map

```
Repository Root (workspace)
├── .github/
│   ├── copilot-instructions.md    # Always-on instructions
│   ├── instructions/              # Path-specific instructions
│   │   └── *.instructions.md
│   ├── prompts/                   # Reusable prompt files
│   │   └── *.prompt.md
│   ├── agents/                    # Custom agents
│   │   └── *.agent.md
│   ├── skills/                    # Agent skills
│   │   └── <name>/SKILL.md
│   ├── hooks/                     # Lifecycle hooks
│   │   └── *.json
│   └── lsp.json                   # Repository-level LSP config
├── .vscode/
│   └── mcp.json                   # MCP server config (shared with VS Code)
├── AGENTS.md                      # Agent instructions (any directory)
├── CLAUDE.md                      # Claude instructions (root)
└── GEMINI.md                      # Gemini instructions (root)

User Home (~)
├── ~/.copilot/
│   ├── lsp-config.json            # User-level LSP configuration
│   ├── agents/                    # User-level custom agents
│   ├── skills/                    # User-level agent skills
│   └── (config/settings)          # Persisted settings (experimental mode, etc.)

Environment Variables
├── GH_TOKEN                       # GitHub PAT authentication (highest precedence)
├── GITHUB_TOKEN                   # GitHub PAT authentication (fallback)
└── (standard OTEL_* vars)         # OTel not yet supported for CLI sessions
```

---

### 14. Key Differentiators from VS Code Agents

| Feature | VS Code Local Agent | Copilot CLI |
|---|---|---|
| Runs in | VS Code process | Standalone background process |
| Survives VS Code close | No | Yes |
| Extension tools | Yes | No (limited to CLI tools) |
| MCP authentication | Full support | Local servers only (no auth) |
| Git worktree isolation | Via CLI integration | Native support |
| Parallel sessions | Yes | Yes (+ `/fleet` for model parallelization) |
| OTel telemetry | Full support | Not yet (open issue #298832) |
| Custom agents | Yes | Yes (experimental, via setting) |
| Autopilot mode | Yes | Yes (experimental) |

This comprehensive map covers every documented hidden file, configuration surface, slash command, mode, authentication method, and integration point in the GitHub Copilot CLI ecosystem.