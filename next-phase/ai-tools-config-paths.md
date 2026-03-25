# AI Tools — File Structures, Config Paths & Internal Layouts

> Comprehensive reference of configuration files, memory locations, settings paths, and internal
> file structures for all major AI tools. Compiled March 2026.

---

## Table of Contents

1. [Claude (Anthropic)](#1-claude-anthropic)
2. [ChatGPT / OpenAI](#2-chatgpt--openai)
3. [Gemini / Gemini CLI (Google)](#3-gemini--gemini-cli-google)
4. [GitHub Copilot / Copilot CLI](#4-github-copilot--copilot-cli)
5. [Cursor](#5-cursor)
6. [Windsurf (Codeium / Cognition)](#6-windsurf-codeium--cognition)
7. [OpenClaw](#7-openclaw)
8. [OpenCode](#8-opencode)
9. [AGENTS.md — The Cross-Tool Standard](#9-agentsmd--the-cross-tool-standard)
10. [Hidden Files, Ignore Files & Behavior Control](#10-hidden-files-ignore-files--behavior-control)
11. [Other Notable Tools](#11-other-notable-tools)

---

## 1. Claude (Anthropic)

### 1.1 Claude Desktop App

| Item | macOS | Windows | Linux |
|------|-------|---------|-------|
| **MCP config** | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` | `~/.config/Claude/claude_desktop_config.json` |
| **Windows MSIX (actual read path)** | — | `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json` | — |
| **Logs** | Settings → Advanced → View Logs | Settings → Advanced → View Logs | Settings → Advanced → View Logs |

**MCP config structure:**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
      "env": { "KEY": "value" }
    }
  }
}
```

### 1.2 Claude Code (CLI Agent)

#### Global / User-Level

```
~/.claude/
├── CLAUDE.md                    # Global instructions for ALL projects
├── settings.json                # Global user settings
├── settings.local.json          # Local user settings (not synced)
├── .credentials.json            # API credentials (Linux/Windows only; macOS uses Keychain)
├── statsig/                     # Analytics cache
├── commands/                    # Personal slash commands (all projects)
│   └── review.md
├── skills/                      # Personal skills (all projects)
│   └── my-skill/
│       └── SKILL.md
├── hooks/                       # Lifecycle hooks
│   └── pre-tool-use.sh
└── projects/                    # Per-project session data & auto-memory
    └── -Users-zvi-Projects-jini-bridge/
        ├── memory/
        │   ├── MEMORY.md        # Auto-memory entrypoint (loaded every session)
        │   ├── debugging.md     # Topic-specific memory files
        │   └── api-conventions.md
        ├── session-2025-01-15-09-30-00.jsonl   # Session transcripts
        └── session-2025-01-16-10-00-00.jsonl
```

**Note:** Project path encoding uses slashes-to-hyphens:
`/Users/zvi/Projects/jini-bridge` → `-Users-zvi-Projects-jini-bridge`

#### Project-Level

```
<project-root>/
├── CLAUDE.md                    # Project instructions (commit to git, shared with team)
├── CLAUDE.local.md              # Personal project overrides (.gitignore'd)
├── .claude/
│   ├── CLAUDE.md                # Alternative location for project instructions
│   ├── settings.json            # Project settings (shared)
│   ├── settings.local.json      # Personal project settings (not committed)
│   ├── commands/                # Project slash commands
│   │   └── deploy.md
│   ├── skills/                  # Project skills
│   │   └── security-review/
│   │       └── SKILL.md
│   ├── agents/                  # Subagent persona definitions
│   │   ├── code-reviewer.md
│   │   └── security-auditor.md
│   └── rules/                   # Modular instruction files
│       └── testing.md
├── .mcp.json                    # Project-level MCP servers
├── .claudeignore                # Files to exclude from Claude Code access
└── .lsp.json                    # Language server configuration (project-level)
```

#### Additional Global Files

```
~/.claude.json                   # User-scoped MCP servers + account config
                                 # (written by: claude mcp add --scope user)
~/.claude/plugins/
├── blocklist.json               # Disabled/blocked plugins
└── known_marketplaces.json      # Known plugin marketplace registry
```

#### Managed / Enterprise Settings

| OS | Path |
|----|------|
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux/WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\Program Files\ClaudeCode\managed-settings.json` |

#### Settings Precedence (highest → lowest)

1. Managed policy
2. Enterprise policy
3. Personal / Local (`.claude/settings.local.json`)
4. Project (`.claude/settings.json`)
5. User (`~/.claude/settings.json`)

#### CLAUDE.md Loading Hierarchy (most specific wins)

1. `.claude/CLAUDE.md` (personal/local)
2. `./CLAUDE.md` (project root)
3. Parent directory CLAUDE.md files (monorepo)
4. `~/.claude/CLAUDE.md` (global user)

#### Memory System (auto-memory, v2.1.59+)

- Stored at: `~/.claude/projects/<project>/memory/`
- Configurable via `autoMemoryDirectory` in user or local settings
- Toggle via `/memory` command or `autoMemoryEnabled` in project settings
- Claude auto-saves: build commands, debugging insights, architecture notes, code style
- MEMORY.md is loaded into every session context

### 1.3 Claude.ai (Web) Memory

- Server-side memory — no local files
- Memory managed via Settings → Memory in claude.ai
- Incognito conversations disable memory
- Memory updates periodically in background; recent conversations may not be reflected immediately

### 1.4 Claude MCP Memory Server (Community)

```
~/.claude-memory/
├── README.md
└── memory.db              # SQLite database (created automatically)
```

---

## 2. ChatGPT / OpenAI

### 2.1 ChatGPT Web/App

ChatGPT's memory and configuration is **entirely server-side**. There are no local config files for the official ChatGPT web/mobile/desktop apps.

| Feature | Location |
|---------|----------|
| **Saved Memories** | Settings → Personalization → Memory (web UI) |
| **Custom Instructions** | Settings → Personalization → Custom Instructions |
| **Project Memory** | Per-project, scoped; no cross-project bleed |
| **Temporary Chat** | Toggle in UI; no memory saved |
| **Data Export** | Settings → Data Controls → Export Data (JSON zip) |

**Exported data structure:**
```
chatgpt-export/
├── conversations.json      # All conversation history
├── message_feedback.json   # Thumbs up/down ratings
├── model_comparisons.json  # A/B test results
├── shared_conversations.json
└── user.json              # Account info
```

### 2.2 ChatGPT Desktop App (Official)

The official OpenAI desktop app stores minimal local config:

| OS | App Data |
|----|----------|
| macOS | `~/Library/Application Support/ChatGPT/` |
| Windows | `%APPDATA%\ChatGPT\` |

### 2.3 ChatGPT Desktop (lencx/ChatGPT — community)

```
~/.chatgpt/
├── *.json                  # Configuration files
├── chat.conf.json          # Chat settings
├── prompts.json            # Saved slash commands/prompts
└── downloads/              # Downloaded files
```

### 2.4 OpenAI API / Codex CLI

```
~/.openai/
├── .env                    # OPENAI_API_KEY
└── config.json             # API settings

# Codex CLI (OpenAI's agent)
~/.codex/
├── config.json
├── instructions.md         # Custom instructions (now uses AGENTS.md)
└── sessions/
```

**Environment variables:**
- `OPENAI_API_KEY` — API authentication
- `OPENAI_ORG_ID` — Organization ID
- `OPENAI_BASE_URL` — Custom API endpoint

---

## 3. Gemini / Gemini CLI (Google)

### 3.1 Gemini CLI

#### Global Configuration

```
~/.gemini/                       # Main config directory (override with GEMINI_CLI_HOME)
├── GEMINI.md                    # Global context/instructions for all projects
├── settings.json                # CLI settings (model, MCP servers, etc.)
├── .geminiignore                # Global ignore patterns
├── extensions/                  # Installed extensions
│   └── cloud-run/
│       └── gemini-extension/
│           └── GEMINI.md
├── memory/                      # Persistent memory (saved via /memory command)
└── update/                      # Update state
```

#### Project-Level

```
<project-root>/
├── GEMINI.md                    # Project-specific context (primary)
├── AGENTS.md                    # Alternative (GEMINI.md takes precedence if both exist)
├── .geminiignore                # Project-level ignore patterns
└── subdirectory/
    └── GEMINI.md                # Component-specific instructions
```

#### Context File Loading Order

1. `~/.gemini/GEMINI.md` (global user)
2. Parent directories (walking up to project root / `.git` boundary)
3. Current working directory `GEMINI.md`
4. Subdirectory `GEMINI.md` files (scanned recursively, respects `.gitignore` / `.geminiignore`)

#### Key settings.json Options

```json
{
  "context": {
    "fileName": "GEMINI.md",         // or ["GEMINI.md", "AGENTS.md"]
    "importFormat": "markdown"
  },
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["..."],
      "env": {}
    }
  },
  "model": "gemini-2.5-pro"
}
```

#### Environment Variables

- `GEMINI_CLI_HOME` — Override config directory (default `~/.gemini/`)
- `GOOGLE_API_KEY` — API key for Vertex AI express mode
- `GOOGLE_CLOUD_PROJECT` — GCP project ID
- `GOOGLE_APPLICATION_CREDENTIALS` — Path to service account JSON

### 3.2 Gemini Code Assist (IDE)

| Scope | File Location |
|-------|---------------|
| Global | `~/.gemini/GEMINI.md` |
| Project root | `./GEMINI.md` or `./AGENTS.md` |
| Subdirectory | `./module/GEMINI.md` |
| IDE-specific rules | `.idea/project.prompts.xml` (IntelliJ) |

---

## 4. GitHub Copilot / Copilot CLI

### 4.1 Copilot CLI Configuration

```
~/.copilot/                          # Main config directory (override with COPILOT_HOME)
├── config.json                      # Core CLI settings (trusted folders, permissions)
├── mcp-config.json                  # User-level MCP server configurations
├── lsp-config.json                  # Language server definitions
├── command-history-state.json       # Command history
├── copilot-instructions.md          # Global personal instructions
├── agents/                          # Custom agent definitions
│   ├── code-reviewer.md
│   ├── docs-writer.md
│   └── security-auditor.md
├── hooks/                           # Lifecycle hooks (subagentStart, etc.)
├── session-state/                   # Active session data (v0.0.342+)
│   └── <session-id>/
│       ├── events.jsonl             # Full session history
│       ├── workspace.yaml           # Metadata
│       ├── plan.md                  # Implementation plan
│       ├── checkpoints/             # Compaction history
│       └── files/                   # Persistent artifacts
├── history-session-state/           # Legacy session storage
└── logs/                            # Debug and error logs

~/.config/gh/
└── hosts.yml                        # GitHub CLI authentication tokens
```

### 4.2 Repository-Level (Shared with Team)

```
<repo-root>/
├── .github/
│   ├── copilot-instructions.md      # Main repo-wide instructions
│   ├── git-commit-instructions.md   # Commit message guidance
│   ├── instructions/                # Path-specific instruction files
│   │   ├── security.instructions.md
│   │   ├── testing.instructions.md
│   │   └── docs.instructions.md
│   ├── prompts/                     # Reusable prompt files
│   │   └── CreateAnalyzer.prompt.md
│   ├── agents/                      # Custom agent definitions
│   │   └── code-reviewer.agent.md
│   ├── skills/                      # Copilot CLI skills
│   │   └── my-skill/
│   │       └── SKILL.md
│   ├── hooks/                       # Lifecycle hook configurations
│   │   └── preToolUse.json
│   └── copilot/
│       ├── settings.json            # Repo-level Copilot settings
│       └── settings.local.json      # Personal repo overrides (not committed)
├── .copilot/
│   └── mcp-config.json              # Project-level MCP servers
├── .copilot-mcp.json                # Alternative project-level MCP config
├── .vscode/
│   ├── settings.json                # VS Code workspace settings (Copilot config)
│   ├── extensions.json              # Recommended extensions list
│   └── mcp.json                     # VS Code workspace MCP servers (Copilot agent mode)
├── AGENTS.md                        # Cross-tool agent instructions
├── CLAUDE.md                        # Claude-specific (also read by Copilot CLI)
└── GEMINI.md                        # Gemini-specific (also read by Copilot CLI)
```

#### .instructions.md Frontmatter

```markdown
---
applyTo: "src/**/*.py"
---
# Python Guidelines
Always use type hints and docstrings.
```

### 4.3 VS Code Copilot Extension

| Setting | macOS | Windows | Linux |
|---------|-------|---------|-------|
| User settings | `~/Library/Application Support/Code/User/settings.json` | `%APPDATA%\Code\User\settings.json` | `~/.config/Code/User/settings.json` |
| Workspace settings | `.vscode/settings.json` | `.vscode/settings.json` | `.vscode/settings.json` |
| Extension manifest | `~/.vscode/extensions/github.copilot*/package.json` | `%USERPROFILE%\.vscode\extensions\github.copilot*\package.json` | same as macOS |
| Custom instructions toggle | `github.copilot.chat.codeGeneration.useInstructionFiles` in settings.json |
| GitHub CLI config | `~/.config/gh/config.yml` | `%APPDATA%\GitHub CLI\config.yml` | same as macOS |

### 4.4 JetBrains Copilot

| Scope | Path |
|-------|------|
| Global instructions (macOS) | `~/Library/Application Support/github-copilot/intellij/global-copilot-instructions.md` |
| Global instructions (Windows) | `C:\Users\<user>\AppData\Local\github-copilot\intellij\global-copilot-instructions.md` |
| Workspace instructions | `.github/copilot-instructions.md` |

### 4.5 Environment Variables

- `COPILOT_HOME` — Override config directory
- `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` — Comma-separated additional instruction directories

---

## 5. Cursor

### 5.1 Application Data

Cursor stores its settings in a **SQLite database** (not plain JSON like VS Code):

| OS | Settings DB Path |
|----|------------------|
| macOS | `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` |
| Windows | `%APPDATA%\Cursor\User\globalStorage\state.vscdb` |
| Linux | `~/.config/Cursor/User/globalStorage/state.vscdb` |

**Query settings:**
```bash
sqlite3 "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb" \
  "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'" \
  | python3 -m json.tool
```

### 5.2 VS Code-Compatible Settings

Cursor still reads standard VS Code settings:

| Item | macOS | Windows |
|------|-------|---------|
| User settings (JSON) | `~/Library/Application Support/Cursor/User/settings.json` | `%APPDATA%\Cursor\User\settings.json` |
| User settings (legacy) | `~/.cursor/settings.json` | `%USERPROFILE%\.cursor\settings.json` |
| Workspace settings | `.vscode/settings.json` | `.vscode/settings.json` |
| Extensions | `~/.cursor/extensions/` | `%USERPROFILE%\.cursor\extensions\` |
| Keybindings | `~/Library/Application Support/Cursor/User/keybindings.json` | `%APPDATA%\Cursor\User\keybindings.json` |

### 5.3 Project-Level AI Rules

```
<project-root>/
├── .cursorrules                 # Legacy: project-specific AI instructions (plain text)
├── .cursor/
│   ├── rules/                   # Modern: granular rule files
│   │   ├── general.md           # Always-on rules (.md format, current)
│   │   ├── python.mdc           # File-glob scoped rules (.mdc format, legacy)
│   │   └── security.md          # @mentionable or auto-attached
│   └── mcp.json                 # Project-level MCP server configuration
├── .cursorignore                # Files to exclude from AI context
└── .vscode/
    └── settings.json            # VS Code workspace settings (Cursor reads these too)
```

**Note:** Cursor historically used `.mdc` extension for rule files; newer versions use `.md`. Both are supported.

#### .cursorrules

- Plain text or markdown file in project root
- Auto-detected by Cursor when project opens
- Injected into system prompt for every AI request
- Case-sensitive filename (`.cursorrules`, no extension)

#### .cursor/rules/*.md (Modern)

- Supports frontmatter with glob patterns for file matching
- Can be always-on, @mentionable, or auto-requested by Cascade
- Version-controllable

### 5.4 Global AI Rules

- Configured in: Cursor Settings → General → Rules for AI
- No filesystem path exposed (stored in SQLite DB)

---

## 6. Windsurf (Codeium / Cognition)

### 6.1 Application Data

```
~/.codeium/
├── windsurf/
│   ├── memories/
│   │   └── global_rules.md      # Global AI guidelines (all projects)
│   └── mcp_config.json          # MCP server configuration
├── .codeiumignore               # Global ignore rules (enterprise)
└── config/                      # Extension settings
```

### 6.2 Project-Level

```
<project-root>/
├── .windsurfrules               # Legacy: project-wide AI rules (plain text)
├── .windsurf/
│   ├── rules/                   # Modern (Wave 8+): granular rule files
│   │   ├── general.md
│   │   ├── backend.md
│   │   └── frontend.md
│   └── mcp.json                 # Project-level MCP server configuration
├── .codeiumignore               # Project-level file exclusions
└── cascade-memories/            # Cascade-generated memories (auto)
```

### 6.3 MCP Config

Location: `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["..."],
      "env": {}
    }
  }
}
```

### 6.4 Key Differences from Cursor

- Uses `.windsurfrules` (not `.cursorrules`)
- Rules directory is `.windsurf/rules/` (not `.cursor/rules/`)
- Global rules in `~/.codeium/windsurf/memories/global_rules.md`
- MCP config in `~/.codeium/windsurf/mcp_config.json`
- Cascade memories are auto-generated and project-scoped

---

## 7. OpenClaw

OpenClaw is a personal AI assistant platform that runs on your own devices and connects to messaging channels (WhatsApp, Telegram, Slack, Discord, Signal, iMessage, etc.). Formerly known as Clawdbot / Moltbot.

### 7.1 Global Configuration

```
~/.openclaw/
├── openclaw.json               # Main config (JSON5 format, hot-reloaded)
├── .env                        # API keys (ANTHROPIC_API_KEY, etc.)
├── credentials/                # Channel auth credentials (WhatsApp session, etc.)
├── workspace/                  # Default agent workspace (override in config)
│   ├── AGENTS.md               # Agent behavior instructions (injected into prompt)
│   ├── SOUL.md                 # Personality/identity definition
│   ├── TOOLS.md                # Machine-specific environment config
│   ├── SHIELD.md               # Optional: loadable security policy
│   ├── IDENTITY.md             # Quick reference card
│   ├── BOOT.md                 # Startup routine (what to check on launch)
│   ├── HEARTBEAT.md            # Periodic checks (inbox, tasks, health)
│   ├── MEMORY.md               # Curated essentials, always in context
│   ├── skills/                 # Skill directories
│   │   └── <skill>/
│   │       └── SKILL.md
│   └── daily-memory/           # Auto-generated daily memory files (Markdown)
├── agents/                     # Multi-agent persona definitions
│   ├── main/
│   │   └── SOUL.md             # Main agent identity
│   └── work/
│       └── SOUL.md             # Work agent identity
└── fleet/                      # Multi-machine fleet state (one .md per server)
```

### 7.2 Core Config File (`~/.openclaw/openclaw.json`)

```json5
{
  // Agent settings
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["openai/gpt-5.2"]
      },
      sandbox: {
        mode: "non-main"          // Sandbox group/channel sessions in Docker
      },
      heartbeat: {
        every: "2h"               // Periodic check interval
      }
    },
    list: [
      { id: "main", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" }
    ]
  },
  // Channel connections
  channels: {
    whatsapp: { allowFrom: ["+15555550123"], dmPolicy: "pairing" },
    telegram: { enabled: true, botToken: "123:abc", dmPolicy: "allowlist" }
  },
  // Gateway settings
  gateway: { port: 18789, auth: { mode: "password" } },
  // Web search
  tools: { web: { search: { provider: "brave", apiKey: "${BRAVE_API_KEY}" } } }
}
```

### 7.3 Key Injected Prompt Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | How the AI should think and act (behavior rules) |
| `SOUL.md` | Personality definition — templated per agent |
| `USER.md` | Your profile — who you are, how you work |
| `MEMORY.md` | Curated essentials, always loaded into context |
| `BOOT.md` | Startup routine — what to check on launch |
| `HEARTBEAT.md` | Periodic checks (inbox, tasks, health) |
| `TOOLS.md` | Machine-specific environment config |
| `SHIELD.md` | Optional security policy |
| `IDENTITY.md` | Quick reference card |

### 7.4 CLI Commands

```bash
openclaw onboard                    # Interactive setup wizard
openclaw config show                # View current config
openclaw config get <key>           # Get specific value
openclaw config set <key> <value>   # Set specific value
openclaw doctor                     # Validate config, check for issues
openclaw models list                # List available models
openclaw channels login             # Link messaging channels
```

### 7.5 Environment Variables

```bash
# In ~/.openclaw/.env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
BRAVE_API_KEY=...
OPENCLAW_GATEWAY_TOKEN=...
OPENCLAW_GATEWAY_PASSWORD=...
```

### 7.6 Project-Level Config

```
<project-root>/
└── openclaw.config.json           # Project-specific config (merges with global)
```

---

## 8. OpenCode

OpenCode (formerly SST's open-source coding agent) is a terminal-based AI coding tool with TUI, CLI, desktop app, and GitHub Action modes.

### 8.1 Global Configuration

```
~/.config/opencode/                  # Main config directory
├── opencode.json                    # Global config (JSON or JSONC)
├── opencode.jsonc                   # Alternative: JSONC format
├── tui.json                         # TUI-specific settings (theme, keybinds)
├── AGENTS.md                        # Global instructions (all projects)
├── agents/                          # Custom agent definitions
│   ├── review.md
│   └── security-auditor.md
├── commands/                        # Global custom commands
│   └── deploy.md
├── modes/                           # Custom modes
├── plugins/                         # Plugin configurations
├── skills/                          # Global skills
├── tools/                           # Custom tool definitions
└── themes/                          # Custom themes

# Older installs may use:
~/.local/share/opencode/opencode.jsonc
```

### 8.2 Project-Level

```
<project-root>/
├── opencode.json                    # Project config (merges with global)
├── AGENTS.md                        # Project instructions (primary)
├── CLAUDE.md                        # Fallback if no AGENTS.md (Claude Code compat)
├── GEMINI.md                        # Fallback (Gemini compat)
├── .opencode/
│   ├── agents/                      # Project-specific agents
│   │   └── my-agent.md
│   ├── commands/                    # Project-specific commands
│   │   └── build.md
│   ├── modes/
│   ├── plugins/
│   ├── skills/
│   └── tools/
└── .ignore                          # Override .gitignore for ripgrep (allow excluded files)
```

### 8.3 Config Precedence (later overrides earlier)

1. Remote config (`.well-known/opencode`) — organizational defaults
2. Global config (`~/.config/opencode/opencode.json`) — user preferences
3. Custom config (`$OPENCODE_CONFIG` env var)
4. Project config (`opencode.json` in project root)

### 8.4 Rules/Instructions File Priority

OpenCode reads instructions files with the following priority (first match wins):

| Priority | File |
|----------|------|
| 1 | `AGENTS.md` |
| 2 | `CLAUDE.md` (Claude Code compatibility) |
| 3 | `GEMINI.md` (Gemini compatibility) |
| 4 | `~/.config/opencode/AGENTS.md` over `~/.claude/CLAUDE.md` |

To disable Claude Code compatibility: set `OPENCODE_CLAUDE_COMPAT=false`.

### 8.5 Environment Variables

- `OPENCODE_CONFIG` — Custom config file path
- `OPENCODE_CONFIG_DIR` — Custom config directory
- `OPENCODE_EXPERIMENTAL` — Enable experimental features
- `OPENCODE_EXPERIMENTAL_LSP_TOOL` — Enable LSP tool
- `OPENCODE_ENABLE_EXA` — Enable Exa web search tool
- `OPENCODE_CLAUDE_COMPAT` — Enable/disable Claude Code compatibility

### 8.6 Desktop App State

```
# macOS/Linux
~/.config/opencode/
├── opencode.settings.dat           # Desktop default server URL
├── opencode.global.dat             # UI state (recent servers/projects)
└── opencode.workspace.*.dat        # Per-workspace UI state
```

---

## 9. AGENTS.md — The Cross-Tool Standard

AGENTS.md is an emerging cross-tool standard (backed by the Linux Foundation) for AI agent instructions. Multiple tools now read it:

| Tool | Support |
|------|---------|
| GitHub Copilot CLI | Primary (also reads CLAUDE.md, GEMINI.md) |
| Gemini CLI | Reads if present (GEMINI.md takes precedence) |
| OpenAI Codex CLI | Migrated from codex.md to AGENTS.md |
| Claude Code | Reads alongside CLAUDE.md |
| Cursor | Experimental |

**Location:** Project root (any directory in the repo hierarchy)

**Common workaround for multi-tool teams:**
```bash
# Symlink all config files to a single source
ln -s AGENTS.md CLAUDE.md
ln -s AGENTS.md GEMINI.md
ln -s AGENTS.md .cursorrules
```

---

## 10. Hidden Files, Ignore Files & Behavior Control

This section covers the **hidden files and ignore patterns** that control what AI tools can see, access, and index — critical for security, secrets management, and behavior tuning.

### 10.1 Ignore / Exclusion Files (Per Tool)

| Tool | Ignore File | What It Controls |
|------|-------------|------------------|
| **Claude Code** | `.claudeignore` | Files Claude Code should not read (⚠️ enforcement has known bugs — see below) |
| **Claude Code** | `settings.json` → `permissions.deny` | Hard deny rules for file access (more reliable than .claudeignore) |
| **Cursor** | `.cursorignore` | Files excluded from AI context/indexing |
| **Windsurf** | `.codeiumignore` | Files excluded from Cascade context (project-level) |
| **Windsurf** | `~/.codeium/.codeiumignore` | Global ignore rules (enterprise) |
| **Gemini CLI** | `.geminiignore` | Files excluded from Gemini CLI context |
| **Google Code Assist** | `.aiexclude` | Files excluded from Google AI tools |
| **GitHub Copilot** | Content Exclusion (org settings) | Files excluded from completions & chat (Business/Enterprise) |
| **GitHub Copilot** | `.copilotignore` | Legacy ignore file (⚠️ unreliable per community reports) |
| **OpenCode** | `.ignore` | Override .gitignore for ripgrep — *allow* excluded files back in |
| **OpenAI Codex** | `.codexignore` | Proposed but not yet implemented |
| **Git** | `.gitignore` | ⚠️ Does NOT protect files from AI agents — they read from filesystem, not git |

### 10.2 Critical Security Warning: `.gitignore` ≠ AI Protection

**`.gitignore` does NOT prevent AI coding agents from reading your files.** AI tools read directly from the local filesystem, not from git. Files like `.env`, `credentials.json`, `*.key`, and `*.pem` are fully accessible to AI agents even if they're in `.gitignore`.

Defense in depth approach:
1. Use tool-specific ignore files (`.claudeignore`, `.cursorignore`, etc.)
2. Use permission deny rules where available (Claude Code `settings.json`)
3. Keep secrets **outside** project directories when possible
4. Use environment variables or secret managers instead of files
5. Use Copilot Content Exclusion at org level (Business/Enterprise)

### 10.3 Hidden Behavior-Control Files (Per Tool)

These files influence AI behavior but are often overlooked:

#### Claude Code

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Project permissions, deny rules, allowed tools |
| `.claude/settings.local.json` | Personal overrides (not committed) |
| `CLAUDE.local.md` | Personal instructions (.gitignore'd) |
| `.claude/rules/*.md` | Modular instruction files |
| `.claude/agents/*.md` | Subagent persona definitions |
| `.mcp.json` | Project-level MCP server config |

#### Cursor

| File | Purpose |
|------|---------|
| `.cursorrules` | AI behavior rules (injected into system prompt) |
| `.cursor/rules/*.md` | Granular rule files with glob matching |
| `.cursorignore` | File exclusion patterns |
| `state.vscdb` (in app data) | All settings stored in SQLite — not accessible as plain text |

#### Windsurf

| File | Purpose |
|------|---------|
| `.windsurfrules` | Legacy AI behavior rules |
| `.windsurf/rules/*.md` | Modern granular rules (Wave 8+) |
| `~/.codeium/windsurf/memories/global_rules.md` | Global rules |
| `.codeiumignore` | File exclusion |

#### GitHub Copilot

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Repo-wide AI instructions |
| `.github/instructions/*.instructions.md` | Path-specific instructions (with `applyTo` frontmatter) |
| `.github/prompts/*.prompt.md` | Reusable prompt templates |
| `.github/git-commit-instructions.md` | Commit message guidance |
| `$HOME/.copilot/copilot-instructions.md` | Global personal instructions |

#### Gemini CLI

| File | Purpose |
|------|---------|
| `GEMINI.md` (any directory) | Hierarchical context instructions |
| `.geminiignore` | File exclusion (⚠️ enforcement bugs reported) |
| `~/.gemini/settings.json` | Global CLI settings |

#### OpenClaw

| File | Purpose |
|------|---------|
| `SOUL.md` | Agent personality definition |
| `SHIELD.md` | Security policy |
| `BOOT.md` | Startup routine |
| `HEARTBEAT.md` | Periodic check schedule |
| `USER.md` | User profile for personalization |

#### OpenCode

| File | Purpose |
|------|---------|
| `AGENTS.md` | Primary instructions (also reads CLAUDE.md, GEMINI.md) |
| `.opencode/agents/*.md` | Custom agent definitions |
| `.opencode/commands/*.md` | Custom slash commands |
| `.ignore` | Allow .gitignore'd files into AI context |

### 10.4 Environment Variable Files

Most AI tools read `.env` files for API keys and configuration:

| Tool | .env Location |
|------|---------------|
| **OpenClaw** | `~/.openclaw/.env` and `$CWD/.env` |
| **OpenCode** | Standard `$CWD/.env` |
| **Aider** | `~/.aider/.env` and `$CWD/.aider.conf.yml` |
| **Continue** | `~/.continue/.env` |
| **OpenAI API** | `$CWD/.env` (OPENAI_API_KEY) |

### 10.5 Credential Storage

| Tool | macOS | Linux/Windows |
|------|-------|---------------|
| **Claude Code** | System Keychain ("Claude Code" / "Anthropic") | `~/.claude/.credentials.json` |
| **Copilot CLI** | GitHub CLI auth | `~/.config/gh/hosts.yml` |
| **Gemini CLI** | OAuth (Google account) | OAuth token cache |
| **OpenClaw** | `~/.openclaw/credentials/` | `~/.openclaw/credentials/` |
| **Cursor** | VS Code keychain integration | VS Code keychain integration |

### 10.6 Temporary Files, Scratch Directories & Working Artifacts

AI tools create temporary files, caches, and working artifacts during sessions — often in unexpected locations. These accumulate silently and can clutter projects, consume disk space, or leak information.

#### Claude Code

| What | Where | Notes |
|------|-------|-------|
| **Scratchpad / session temp** | `/tmp/claude-<uid>/<project-hash>/<session-id>/scratchpad/` (Unix) | Per-session scratch area |
| | `%TEMP%\claude\<project-hash>\<session-id>\scratchpad\` (Windows) | |
| | `/private/tmp/claude-<uid>/...` (macOS) | |
| **CWD tracking files** | `tmpclaude-<hex>-cwd` in **project root** (⚠️ bug) | Known bug: should go in scratchpad but drops in CWD. 100+ files can accumulate. Each contains the working directory path. Workaround: `export CLAUDE_CODE_TMPDIR="$HOME/.claude/tmp"` |
| **Attachments folder** | `tmp/attachments/` in **project root** (⚠️ bug) | Empty dir created on every session start. Should use scratchpad instead. |
| **Subagent task output** | `~/.claude/projects/<project>/<session-id>/subagents/agent-<id>.jsonl` | Subagent transcripts |
| **Task output symlinks** | `/tmp/claude-<user>/tasks/<task-id>.output` → subagent jsonl | Symlinks to subagent outputs |
| **Shell snapshots** | `~/.claude/shell-snapshots/` | Shell environment snapshots |
| **Session transcripts** | `~/.claude/projects/<project>/session-<timestamp>.jsonl` | Full session history (can grow very large) |
| **Ad-hoc temp scripts** | `test*.py`, `run_*.py`, `debug.py` in **project root** (⚠️) | Agent-created temp files that ignore CLAUDE.md placement rules. Especially problematic with batch subagents. |
| **Override temp dir** | `CLAUDE_CODE_TMPDIR=/custom/path` | Redirect all temp files. Add to `~/.bashrc` or `~/.zshrc`. |

**Cleanup command:**
```bash
# Clean accumulated CWD tracking files from project root
find . -maxdepth 1 -name 'tmpclaude-*-cwd' -delete

# Clean system temp files
find /tmp -name 'claude-*-cwd' -delete 2>/dev/null

# Clean empty attachments dirs
find . -maxdepth 2 -name 'attachments' -empty -type d -delete
```

#### Cursor

| What | Where | Notes |
|------|-------|-------|
| **App cache** (macOS) | `~/Library/Application Support/Cursor/` | Main app data |
| **App cache** (Windows) | `%APPDATA%\Cursor\` | |
| **App cache** (Linux) | `~/.config/Cursor/` | |
| **Cached data (per version)** | `~/.config/Cursor/CachedData/<version-hash>/` | ⚠️ Never auto-cleaned — accumulates with every Cursor update |
| **Workspace storage** | `~/Library/Application Support/Cursor/User/workspaceStorage/` (macOS) | Chat/composer history, indexed data, workspace settings per project. Tied to absolute path — breaks if project moves. |
| **Settings database** | `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` | SQLite — all settings, AI rules, history |
| **Remote server** | `~/.cursor-server/` | Installed on remote machines for SSH connections |
| **Extensions** | `~/.cursor/extensions/` | Extension installations |
| **Shadow workspace** | Background process (in-memory + temp) | Invisible editor instance for indexing/pre-testing code. Can cause 100% CPU on large projects. |

**Cleanup:**
```bash
# Clear all cached data (macOS)
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/CachedData

# Clear workspace storage (resets chat history, index)
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage

# Nuclear reset (preserves nothing)
rm -rf ~/Library/Application\ Support/Cursor
rm -rf ~/.cursor
```

#### GitHub Copilot CLI

| What | Where | Notes |
|------|-------|-------|
| **Session state** | `~/.copilot/session-state/<session-id>/` | Per-session data |
| | `├── events.jsonl` | Complete session history |
| | `├── workspace.yaml` | Session metadata |
| | `├── plan.md` | Implementation plan (if created) |
| | `├── checkpoints/` | Compaction history |
| | `└── files/` | Temporary session artifacts |
| **Legacy session state** | `~/.copilot/history-session-state/` | Older session format |
| **Session SQLite store** | `~/.copilot/` (internal DB) | Powers `/chronicle` command |
| **Command history** | `~/.copilot/command-history-state.json` | Previous commands |
| **Logs** | `~/.copilot/logs/` | Debug and error logs |
| **Temp downloads** | `%TEMP%` (Windows) or `/tmp` (Unix) | MCP responses, codegen outputs, analysis files |

#### Windsurf / Codeium

| What | Where | Notes |
|------|-------|-------|
| **Cascade memories** | `cascade-memories/` in **project root** (auto-generated) | Cascade-generated memory files |
| **Global app data** | `~/.codeium/` | Extension config, MCP, memories |
| **Language server cache** | `~/.codeium/codeium_language_server/` | Language server binaries and cache |

#### Gemini CLI

| What | Where | Notes |
|------|-------|-------|
| **Saved memory** | `~/.gemini/memory/` | Persistent memory (via `save_memory` tool) |
| **Extensions** | `~/.gemini/extensions/<name>/` | Installed extension data |
| **Update state** | `~/.gemini/update/` | Auto-update tracking |
| **Checkpoints** | Stored per-session (in-memory + temp) | Conversation save points |

#### OpenClaw

| What | Where | Notes |
|------|-------|-------|
| **Daily memory files** | `~/.openclaw/workspace/` (Markdown files) | Auto-generated daily logs |
| **Session state** | Maintained by Gateway (in-memory / message channel) | Per-channel conversation state |
| **Config backups** | `~/.openclaw/openclaw.json.bak` | Auto-created on config changes |
| **Fleet state** | `~/openclaw-fleet/` | One markdown file per remote server |

#### OpenCode

| What | Where | Notes |
|------|-------|-------|
| **App state** (desktop) | `~/.config/opencode/opencode.settings.dat` | Desktop server URL |
| | `opencode.global.dat` | UI state |
| | `opencode.workspace.*.dat` | Per-workspace state |
| **Provider packages** | Cached locally (npm) | Dynamically installed AI provider SDKs. Can become stale — run `opencode providers update` to refresh. |

#### ChatGPT (Code Interpreter / Advanced Data Analysis)

| What | Where | Notes |
|------|-------|-------|
| **Sandbox files** | `/mnt/data/` (inside sandbox) | Files persist during session only. Download before session ends. |
| **Uploaded files** | Server-side temp storage | Deleted after session timeout |

### 10.7 Summary: Common Files to .gitignore

Add these to your project `.gitignore` to prevent AI tool artifacts from being committed:

```gitignore
# === AI Tool Temp Files & Artifacts ===

# Claude Code
tmpclaude-*-cwd
tmp/attachments/
.claude/settings.local.json
CLAUDE.local.md

# Cursor
.cursor/
.cursorignore

# Windsurf
.windsurf/
cascade-memories/
.codeiumignore

# GitHub Copilot
.github/copilot/settings.local.json
.copilotignore

# OpenCode
.opencode/

# OpenClaw (project-level config)
openclaw.config.json

# Gemini
.geminiignore

# General AI
.env
.env.*
*.key
*.pem
credentials.json
```

### 10.8 Intermediate Artifact Naming Conventions & Identification

This subsection documents the **naming patterns** AI tools use for intermediate/working files. Use these patterns to identify orphaned artifacts, build cleanup scripts, or add targeted `.gitignore` rules.

#### File Naming Patterns by Tool

**Claude Code:**

| Pattern | Example | What It Is | Where |
|---------|---------|------------|-------|
| `tmpclaude-<4hex>-cwd` | `tmpclaude-fe6b-cwd` | CWD tracker (contains project path as text) | Project root or `/tmp/` |
| `tmp/attachments/` | `tmp/attachments/` | Empty attachment staging dir | Project root |
| `session-<ISO-timestamp>.jsonl` | `session-2026-03-15-09-30-00.jsonl` | Session transcript (JSON Lines) | `~/.claude/projects/<project>/` |
| `agent-<7hex>.jsonl` | `agent-abb0a88.jsonl` | Subagent transcript | `~/.claude/projects/<project>/<session>/subagents/` |
| `<task-id>.output` | `abb0a88.output` | Symlink to subagent output | `/tmp/claude-<user>/tasks/` |
| `MEMORY.md` | `MEMORY.md` | Auto-memory entrypoint | `~/.claude/projects/<project>/memory/` |
| `<topic>.md` | `debugging.md`, `api-conventions.md` | Topic-specific auto-memory | `~/.claude/projects/<project>/memory/` |
| Ad-hoc scripts (⚠️) | `test_api.py`, `run_check.py`, `debug.py`, `temp_*.js` | Agent-created scratch scripts | Project root (should be in scratchpad) |

**Identification one-liner:**
```bash
# Find all Claude Code intermediate artifacts in current project
find . -maxdepth 1 \( -name 'tmpclaude-*' -o -name 'tmp' -o -name 'test_*.py' -o -name 'run_*.py' -o -name 'debug*.py' -o -name 'temp_*' \) -ls 2>/dev/null

# Find all Claude temp files system-wide
find /tmp /private/tmp -maxdepth 3 -name 'claude-*' -ls 2>/dev/null

# Check session transcript sizes
du -sh ~/.claude/projects/*/session-*.jsonl 2>/dev/null | sort -rh | head -20
```

**GitHub Copilot CLI:**

| Pattern | Example | What It Is | Where |
|---------|---------|------------|-------|
| `<session-uuid>/` | `a1b2c3d4-e5f6-...` | Session directory (UUID v4) | `~/.copilot/session-state/` |
| `events.jsonl` | `events.jsonl` | Full session event log | `~/.copilot/session-state/<id>/` |
| `workspace.yaml` | `workspace.yaml` | Session metadata | `~/.copilot/session-state/<id>/` |
| `plan.md` | `plan.md` | Implementation plan | `~/.copilot/session-state/<id>/` |
| `checkpoints/` | `checkpoints/` | Context compaction snapshots | `~/.copilot/session-state/<id>/` |
| `files/` | `files/` | Persistent session artifacts | `~/.copilot/session-state/<id>/` |
| `metadata.json` | `metadata.json` | Session metadata (new format) | `~/.copilot/session-state/<id>/` |
| `messages/` | `messages/` | Conversation messages dir | `~/.copilot/session-state/<id>/` |
| Temp downloads | Random subdirs in `%TEMP%` or `/tmp` | MCP responses, codegen outputs | System temp dir |
| `command-history-state.json` | `command-history-state.json` | Command history | `~/.copilot/` |

**Identification:**
```bash
# List all Copilot sessions with sizes
du -sh ~/.copilot/session-state/* 2>/dev/null | sort -rh

# Count total sessions
ls -d ~/.copilot/session-state/*/ 2>/dev/null | wc -l

# Check for legacy sessions
ls ~/.copilot/history-session-state/ 2>/dev/null
```

**Cursor:**

| Pattern | Example | What It Is | Where |
|---------|---------|------------|-------|
| `<version-hash>/` | `d7b1a...` | Per-version cache dir (⚠️ never cleaned) | `~/.config/Cursor/CachedData/` |
| `state.vscdb` | `state.vscdb` | SQLite settings DB | `.../Cursor/User/globalStorage/` |
| `<workspace-hash>/` | `abcdef123456/` | Per-workspace storage (tied to absolute path) | `.../Cursor/User/workspaceStorage/` |
| Duplicate files in cache | Same filename, different path | Cache vs real file (shows duplicates in @-mentions) | Internal cache dirs |

**Identification:**
```bash
# Check CachedData bloat (macOS)
du -sh ~/Library/Application\ Support/Cursor/CachedData/* | sort -rh

# Check workspace storage size
du -sh ~/Library/Application\ Support/Cursor/User/workspaceStorage/* | sort -rh | head -20

# Total Cursor disk usage
du -sh ~/Library/Application\ Support/Cursor/ ~/.cursor/ 2>/dev/null
```

**Windsurf / Codeium:**

| Pattern | Example | What It Is | Where |
|---------|---------|------------|-------|
| `cascade-memories/` | `cascade-memories/` | Auto-generated Cascade memories | Project root |
| `global_rules.md` | `global_rules.md` | Global AI guidelines | `~/.codeium/windsurf/memories/` |
| Language server binaries | `codeium_language_server` | Cached LS binaries | `~/.codeium/codeium_language_server/` |

**Gemini CLI:**

| Pattern | Example | What It Is | Where |
|---------|---------|------------|-------|
| `GEMINI.md` | `GEMINI.md` | Context files (in any directory) | Project tree (recursive) |
| `memory/` | Markdown files | Persistent memory via `save_memory` | `~/.gemini/memory/` |
| `extensions/<name>/` | Extension data | Installed extensions | `~/.gemini/extensions/` |
| Checkpoints | In-memory | Conversation save points | Not persisted to disk by default |

**OpenClaw:**

| Pattern | Example | What It Is | Where |
|---------|---------|------------|-------|
| `*.md` (daily files) | `2026-03-25.md` | Daily memory logs | `~/.openclaw/workspace/` |
| `openclaw.json.bak` | `openclaw.json.bak` | Config backup (auto on change) | `~/.openclaw/` |
| `<server-name>.md` | `mac-mini.md` | Fleet server state | `~/openclaw-fleet/` |

**OpenCode:**

| Pattern | Example | What It Is | Where |
|---------|---------|------------|-------|
| `opencode.settings.dat` | `opencode.settings.dat` | Desktop server URL | `~/.config/opencode/` |
| `opencode.global.dat` | `opencode.global.dat` | UI state | `~/.config/opencode/` |
| `opencode.workspace.*.dat` | `opencode.workspace.myproject.dat` | Per-workspace UI state | `~/.config/opencode/` |

#### Universal Cleanup Script

```bash
#!/bin/bash
# ai-cleanup.sh — Find and report all AI tool intermediate artifacts
# Run from project root. Use --delete to remove (CAUTION).

echo "=== Claude Code artifacts ==="
find . -maxdepth 1 -name 'tmpclaude-*-cwd' -ls 2>/dev/null
find . -maxdepth 2 -path '*/tmp/attachments' -type d -ls 2>/dev/null
echo "  System temp: $(find /tmp /private/tmp -maxdepth 2 -name 'claude-*' 2>/dev/null | wc -l) files"
echo "  Session transcripts: $(du -sh ~/.claude/projects/ 2>/dev/null | cut -f1)"

echo ""
echo "=== Copilot CLI sessions ==="
echo "  Sessions: $(ls -d ~/.copilot/session-state/*/ 2>/dev/null | wc -l)"
echo "  Total size: $(du -sh ~/.copilot/session-state/ 2>/dev/null | cut -f1)"

echo ""
echo "=== Cursor cache ==="
echo "  CachedData versions: $(ls -d ~/.config/Cursor/CachedData/*/ 2>/dev/null | wc -l)"
echo "  CachedData size: $(du -sh ~/.config/Cursor/CachedData/ 2>/dev/null | cut -f1)"
echo "  WorkspaceStorage: $(du -sh ~/Library/Application\ Support/Cursor/User/workspaceStorage/ 2>/dev/null | cut -f1)"

echo ""
echo "=== Windsurf ==="
find . -maxdepth 1 -name 'cascade-memories' -type d -ls 2>/dev/null
echo "  Codeium cache: $(du -sh ~/.codeium/ 2>/dev/null | cut -f1)"

echo ""
echo "=== Gemini CLI ==="
echo "  Memory: $(du -sh ~/.gemini/memory/ 2>/dev/null | cut -f1)"
echo "  Extensions: $(du -sh ~/.gemini/extensions/ 2>/dev/null | cut -f1)"

if [ "$1" = "--delete" ]; then
  echo ""
  echo "=== DELETING Claude CWD trackers ==="
  find . -maxdepth 1 -name 'tmpclaude-*-cwd' -delete -print
  find . -maxdepth 2 -path '*/tmp/attachments' -type d -empty -delete -print
  find /tmp /private/tmp -maxdepth 2 -name 'claude-*-cwd' -delete -print 2>/dev/null
fi
```

---

## 11. Other Notable Tools

### 11.1 Aider (Terminal AI Coding)

```
~/.aider/
├── .aider.conf.yml          # Global config
├── .aider.model.settings.yml
└── .env                     # API keys

<project-root>/
├── .aider.conf.yml          # Project config
├── .aiderignore             # Files to exclude
└── .aider.tags.cache.v3/    # Code indexing cache
```

### 11.2 Continue (VS Code / JetBrains Extension)

```
~/.continue/
├── config.yaml              # Primary config (models, context providers, etc.)
├── config.json              # Legacy config format
├── .env                     # API keys
├── sessions/                # Conversation history
│   └── <session-id>.json
├── dev_data/                # Development data
└── types/                   # TypeScript type definitions

<project-root>/
├── .continuerules           # Project-specific rules
└── .continueignore          # Files to exclude from context
```

### 11.3 Amazon Q Developer (formerly CodeWhisperer)

```
~/.aws/
├── config                   # AWS profile config
├── credentials              # AWS credentials
└── amazonq/
    └── profiles/            # Q Developer profiles
```

### 11.4 JetBrains AI Assistant / Junie

```
<project-root>/
├── .junie/
│   └── guidelines.md        # Project configuration
└── .idea/
    └── project.prompts.xml  # IDE-level prompt rules
```

### 11.5 Tabnine

```
~/.tabnine/
├── tabnine_config.json      # Global configuration
└── models/                  # Local model cache
```

### 11.6 Replit Agent

- Entirely cloud-based; no local config files
- `.replit` file in project root controls run/build configuration
- `replit.nix` for Nix environment setup

### 11.7 Project Environment Files (Cross-Tool)

These environment files are read by most AI tools and frameworks:

```
<project-root>/
├── .env                         # Primary environment variables
├── .env.local                   # Local overrides (Next.js, Vite, etc.)
├── .env.development             # Development-specific variables
├── .env.production              # Production variables
└── .envrc                       # direnv auto-loaded on cd
```

### 11.8 Semantic Kernel (.NET AI Orchestration)

```
<project-root>/
├── skprompt.txt                 # Prompt template file
├── appsettings.json             # App settings (AI config section)
└── plugins/                     # Semantic Kernel plugin directories
    └── <plugin>/
        └── skprompt.txt
```

### 11.9 Azure PromptFlow

```
<project-root>/
├── flow.dag.yaml                # DAG flow definition
├── flow.flex.yaml               # Flex flow definition
└── .promptflow/                 # PromptFlow local config directory
    └── flow.tools.json          # Tool configurations
```

### 11.10 Azure AI / Azure Developer CLI (azd)

```
<project-root>/
├── azure.yaml                   # azd project configuration
├── local.settings.json          # Azure Functions local settings (keys, connections)
└── .azure/                      # azd local state directory
    └── <environment>/
        └── .env                 # Per-environment variables
```

### 11.11 Microsoft 365 Copilot / Teams Toolkit

```
<project-root>/
├── teamsapp.yml                 # Teams app manifest
├── aad.manifest.json            # Azure AD / Entra ID app registration
└── .fx/                         # Teams Toolkit config directory
    ├── configs/
    └── states/
```

### 11.12 aictl

```
<project-root>/
├── .context.aictx               # aictl project context file
└── .ai-deployed/
    └── manifest.json            # Deployment manifest
```

---

## Quick Cross-Reference: "Where is my memory?"

| Tool | Memory / Context Location |
|------|--------------------------|
| **Claude Code** | `~/.claude/projects/<project>/memory/MEMORY.md` |
| **Claude Desktop** | Server-side (no local files) |
| **Claude.ai** | Server-side (Settings → Memory) |
| **ChatGPT** | Server-side (Settings → Personalization → Memory) |
| **Gemini CLI** | `~/.gemini/GEMINI.md` + project `GEMINI.md` files |
| **Copilot CLI** | `~/.copilot/copilot-instructions.md` + `.github/copilot-instructions.md` |
| **Cursor** | SQLite DB + `.cursorrules` / `.cursor/rules/` |
| **Windsurf** | `~/.codeium/windsurf/memories/global_rules.md` + `.windsurfrules` |
| **OpenClaw** | `~/.openclaw/workspace/MEMORY.md` + `SOUL.md` + daily memory files |
| **OpenCode** | `AGENTS.md` + `~/.config/opencode/AGENTS.md` |

## Quick Cross-Reference: "Where is my MCP config?"

| Tool | MCP Config Location |
|------|---------------------|
| **Claude Desktop (macOS)** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Claude Desktop (Win)** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Claude Desktop (Linux)** | `~/.config/Claude/claude_desktop_config.json` |
| **Claude Code (user)** | `~/.claude/settings.json` (mcpServers key) |
| **Claude Code (project)** | `.mcp.json` in project root |
| **Gemini CLI** | `~/.gemini/settings.json` (mcpServers key) |
| **Copilot CLI (user)** | `~/.copilot/mcp-config.json` |
| **Copilot CLI (project)** | `.copilot/mcp-config.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |
| **Cursor** | Settings UI (stored in SQLite) |
| **OpenClaw** | `~/.openclaw/openclaw.json` (mcpServers in config) |
| **OpenCode** | `~/.config/opencode/opencode.json` (mcp key) |

## Quick Cross-Reference: "What's the rules/instructions file?"

| Tool | Project Instructions File |
|------|--------------------------|
| **Claude Code** | `CLAUDE.md` / `.claude/CLAUDE.md` / `CLAUDE.local.md` |
| **Gemini CLI** | `GEMINI.md` / `AGENTS.md` |
| **Copilot CLI** | `.github/copilot-instructions.md` / `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` |
| **Copilot (VS Code)** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` |
| **Cursor** | `.cursorrules` / `.cursor/rules/*.md` |
| **Windsurf** | `.windsurfrules` / `.windsurf/rules/*.md` |
| **OpenClaw** | `AGENTS.md` + `SOUL.md` + `TOOLS.md` (in workspace) |
| **OpenCode** | `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` + `.opencode/agents/*.md` |
| **Aider** | `.aider.conf.yml` |
| **Continue** | `.continuerules` |
| **JetBrains Junie** | `.junie/guidelines.md` |
| **Cross-tool** | `AGENTS.md` (read by Copilot, Gemini, Codex) |

## Quick Cross-Reference: "What's the token weight of each file?"

Files documented in this reference have different token costs. This table maps each file type to its
approximate token impact and loading behavior. Use this to estimate your per-session overhead.
See `ai-tools-traffic-monitoring.md` Section 9.5-9.7 for the full token assessment format and tools.

| File | Approx. Tokens | When Loaded | Survives Compaction | Cacheable |
|------|---------------|-------------|--------------------| ----------|
| System prompt (built-in) | ~2,600-3,000 | Every call | Yes | Yes |
| System tools (built-in, ~20 tools) | ~14,000-17,000 | Every call | Yes | Yes |
| Autocompact buffer (reserved) | ~33,000 | Always reserved | N/A | N/A |
| `CLAUDE.md` (project root) | ~100-5,000+ | Every call | Yes | Yes |
| `~/.claude/CLAUDE.md` (global) | ~100-2,000 | Every call | Yes | Yes |
| `CLAUDE.local.md` | ~100-1,000 | Every call | Yes | Yes |
| `MEMORY.md` (auto-memory) | ~100-3,000 | Every call (first 200 lines) | Yes | Yes |
| `.claude/rules/*.md` (each) | ~50-500 | When matching files touched | Yes | Yes |
| `.claude/agents/*.md` (each) | ~200-500 | Every call (descriptions) | Yes | Yes |
| `.claude/skills/*/SKILL.md` (each) | ~50-100 | Descriptions always; body on-demand | Desc: yes | Yes |
| MCP server (small, 5 tools) | ~500-1,000 | Every call | Yes | Yes |
| MCP server (medium, 10-15 tools) | ~1,500-2,500 | Every call | Yes | Yes |
| MCP server (large, 20+ tools) | ~2,000-4,000 | Deferred if too large | Yes | Yes |
| Conversation messages | Grows with session | Every call | No (compacted) | Partially |
| File read results (in conversation) | ~1 token / 4 chars | Until compacted | No | No |

**Rule of thumb for token estimation from file size:**
- English text: **1 token ≈ 4 characters** (or ~0.75 words)
- Code: **1 token ≈ 3 characters** (more token-dense)
- Markdown: **byte count × 0.28 ≈ token count**

**⚠️ Key insight:** A 200k context window has ~50k tokens of fixed overhead before you type anything. With 3-4 MCP servers and a moderate CLAUDE.md, overhead can reach 60-70k tokens (30-35%). The actual available space for your conversation is **130-140k tokens**, not 200k.

---

## Discovery Model: Interest Scope & Path Resolution

This section formalizes how a discovery tool (like `aictl`) determines which files and directories to inspect for a given project root. The companion CSV (`ai-tools-paths-*.csv`) encodes this model in two columns: `resolution` and `root_strategy`.

### Root Strategy

Each AI tool determines its **effective project root** differently. The `root_strategy` column in the CSV records this per-tool:

| Strategy | Tools | Rule |
|----------|-------|------|
| `cwd` | claude-code, opencode, openclaw, aictl | Root = the working directory the tool was launched from |
| `git-root` | copilot-cli, copilot, gemini-cli, codex-cli, aider | Root = `git rev-parse --show-toplevel`, fallback to cwd |
| `workspace` | cursor, windsurf, copilot-vscode, continue, junie, tabnine | Root = IDE-opened folder (equivalent to cwd for CLI discovery) |
| `none` | claude-desktop, chatgpt-desktop, chatgpt-lencx, openai-api | No project root — only global-scope paths apply |
| `varies` | cross-tool entries (AGENTS.md, CLAUDE.md, GEMINI.md) | Depends on which tool reads the file |

### Interest Scope

For a given `user_dir`, the **interest scope** is the union of five directory layers:

```
InterestScope(user_dir) = Global ∪ Root ∪ Subtree ∪ Parents ∪ Shadows
```

**Layer 1 — Global** (`resolution: literal`). Platform-specific per-tool directories that exist regardless of project context. Examples: `~/.claude/`, `~/.copilot/`, `~/.codeium/windsurf/`. Session-scoped paths (transcripts, temp files) also fall here. These are absolute paths — expand `~` or `%APPDATA%` and check existence.

**Layer 2 — Root** (`resolution: rooted`). Files that only appear at the project root, never in subdirectories. Examples: `azure.yaml`, `opencode.json`, `.ai-deployed/manifest.json`. Substitute `{project-root}` with the effective root and check existence.

**Layer 3 — Subtree** (`resolution: recursive`). Files and directories that can appear at any level in the project tree. This is the largest category — instruction files, rules, MCP configs, ignore files, etc. Examples: `CLAUDE.md`, `.mcp.json`, `.github/copilot-instructions.md`, `.cursorrules`. The discovery engine walks the full directory tree under root, pruning irrelevant directories (`.git`, `node_modules`, `.venv`, `__pycache__`, etc.).

**Layer 4 — Parents** (`resolution: parent`). Files in directories above the project root, traversing upward to `$HOME`. Currently only Claude Code uses this — it reads `CLAUDE.md` and `CLAUDE.local.md` from every parent directory. This enables monorepo setups where a top-level `CLAUDE.md` applies to all sub-projects.

**Layer 5 — Shadows** (`resolution: shadow`). Directories outside the project tree that are **associated** with it via a deterministic encoding. See "Associated Directory Groups" below.

### Path Resolution (the `resolution` column)

Each row in the CSV has a `resolution` value that tells the discovery engine how to expand the path template:

| Value | Template form | Algorithm |
|-------|--------------|-----------|
| `literal` | `~/.claude/CLAUDE.md`, `%APPDATA%\...` | Expand env vars / `~` → check existence. Glob if `*` present. |
| `rooted` | `{project-root}/azure.yaml` | Substitute `{project-root}` → check existence. |
| `recursive` | `{project-root}/CLAUDE.md` | Walk all subdirectories under root, match filename/pattern at every level (including root itself). Prune `.git`, `node_modules`, `.venv`, etc. |
| `parent` | `{parent}/CLAUDE.md` | Starting from `root.parent`, walk upward toward `$HOME`, checking each directory. Stop at `$HOME` or after 10 levels. |
| `shadow` | `~/.claude/projects/{project}/memory/` | Resolve `{project}` using the tool's shadow encoding (see below), then expand remaining template variables. |

**Template variables** in path patterns:

| Variable | Meaning | Expansion |
|----------|---------|-----------|
| `~` | User home directory | `Path.home()` |
| `%APPDATA%`, `%LOCALAPPDATA%`, etc. | Windows env vars | `os.environ[...]` |
| `{project-root}` | Effective project root | Determined by `root_strategy` |
| `{parent}` | Parent directories above root | Traversal, not substitution |
| `{project}` | Shadow-encoded root path | Tool-specific encoding (see below) |
| `{skill}`, `{command}`, `{agent}`, `{rule}` | Named resources | Glob enumeration in parent directory |
| `{session}`, `{timestamp}`, `{hex}`, `{topic}` | Runtime identifiers | Glob enumeration |
| `*` | Standard glob | `Path.glob()` |

### Associated Directory Groups (Shadow Directories)

A **shadow directory** is a directory that lives outside the project tree but is keyed to a specific project path. When a project directory `D` is in the interest scope, its **associated directory group** includes all shadows of `D`.

Known shadow encodings:

| Tool | Shadow location | Encoding rule | Example |
|------|----------------|---------------|---------|
| **claude-code** | `~/.claude/projects/{project}/` | Path separators (`/`, `\`) → dashes | `/Users/zvi/Projects/foo` → `-Users-zvi-Projects-foo` |
| **claude-code** | `/tmp/claude-{user}/{project}/` | Same dash encoding | Session temp files |
| **cursor** | `~/Library/.../workspaceStorage/{hash}/` | SHA-based hash of absolute path | Opaque hash, requires enumeration |
| **copilot-cli** | `~/.copilot/session-state/{uuid}/` | UUID session dirs, linked via `workspace.yaml` containing `cwd: D` | Requires reading YAML to match |

Shadow resolution algorithm:
1. Compute the expected encoded name from the absolute path of `D`
2. Search the tool's shadow parent directory for matches
3. Apply fuzzy matching strategies in order:
   - Exact encoding match
   - Case-insensitive match (macOS HFS+/APFS)
   - All path segments present as dash-separated substrings
   - Trailing project name on a dash boundary
   - Structural check (presence of expected subdirectory like `memory/`)
4. Prefer the longest (most specific) match if multiple candidates exist

### Pruned Directories

When performing recursive tree walks (`resolution: recursive`), skip these directories to avoid irrelevant noise and performance issues:

`.git`, `.venv`, `venv`, `.env`, `node_modules`, `.npm`, `.yarn`, `__pycache__`, `.mypy_cache`, `.pytest_cache`, `.tox`, `.ruff_cache`, `dist`, `build`, `.cargo`, `target`, `.idea`, `.vs`, `Pods`, `DerivedData`

### CSV Column Reference

The `ai-tools-paths-*.csv` files use these columns:

| Column | Type | Description |
|--------|------|-------------|
| `path` | string | Path template (see template variables above) |
| `ai_tool` | string | Tool identifier (e.g., `claude-code`, `cursor`, `copilot-cli`) |
| `platform` | enum | `all`, `macos`, `linux`, `macos/linux`, `windows` |
| `hidden` | bool | Whether the path starts with `.` (hidden on Unix) |
| `scope` | enum | `global`, `project`, `session`, `parent` |
| `category` | string | `instructions`, `config`, `rules`, `commands`, `skills`, `memory`, `mcp`, `credentials`, `hooks`, `agent`, `cache`, `runtime`, `temp`, etc. |
| `sent_to_llm` | enum | `yes`, `no`, `on-demand`, `conditional`, `partial` |
| `approx_tokens` | string | Typical token range (e.g., `100-2000`) or `0` |
| `read_write` | enum | `read`, `rw`, `write` |
| `survives_compaction` | enum | `yes`, `no`, `n/a` |
| `cacheable` | enum | `yes`, `no`, `n/a` |
| `loaded_when` | string | `app-start`, `session-start`, `every-call`, `on-demand`, `on-invoke`, `on-hook-trigger`, `on-file-match`, `runtime`, etc. |
| `path_args` | string | Documentation of template variable semantics |
| `description` | string | Human-readable purpose |
| `resolution` | enum | **`literal`**, **`rooted`**, **`recursive`**, **`parent`**, **`shadow`** — how to expand the path template |
| `root_strategy` | enum | **`cwd`**, **`git-root`**, **`workspace`**, **`none`**, **`varies`** — how the tool determines project root |

---

## Appendix A: Windows Path Equivalents & Gotchas

Every path listed in the main document uses Unix notation (`~/`, `/tmp/`). This appendix maps them to their Windows equivalents and documents Windows-specific behavior differences.

### A.1 Environment Variable Quick Reference

| Unix | Windows Variable | Typical Expansion |
|------|-----------------|-------------------|
| `~/` or `$HOME` | `%USERPROFILE%` | `C:\Users\<username>` |
| `/tmp/` | `%TEMP%` or `%TMP%` | `C:\Users\<username>\AppData\Local\Temp` |
| `~/.config/` | `%APPDATA%` | `C:\Users\<username>\AppData\Roaming` |
| `~/.local/share/` | `%LOCALAPPDATA%` | `C:\Users\<username>\AppData\Local` |
| (none) | `%PROGRAMFILES%` | `C:\Program Files` |
| (none) | `%PROGRAMDATA%` | `C:\ProgramData` |

### A.2 Per-Tool Windows Path Mappings

#### Claude Desktop

| Item | macOS / Linux | Windows |
|------|---------------|---------|
| MCP config | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` |
| MSIX actual read path (⚠️) | — | `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json` |

**⚠️ Windows MSIX trap:** The "Edit Config" button opens `%APPDATA%\Claude\` but the app actually reads from the MSIX virtualized path. These are two separate files that are never synchronized. If your MCP servers aren't loading, edit the file at the MSIX path instead.

#### Claude Code

| Item | macOS / Linux | Windows |
|------|---------------|---------|
| Global config dir | `~/.claude/` | `%USERPROFILE%\.claude\` |
| Settings | `~/.claude/settings.json` | `%USERPROFILE%\.claude\settings.json` |
| Credentials | Keychain (macOS) or `~/.claude/.credentials.json` | `%USERPROFILE%\.claude\.credentials.json` |
| Session transcripts | `~/.claude/projects/<project>/` | `%USERPROFILE%\.claude\projects\<project>\` |
| Auto-memory | `~/.claude/projects/<project>/memory/` | `%USERPROFILE%\.claude\projects\<project>\memory\` |
| Scratchpad | `/tmp/claude-<uid>/<project>/<session>/scratchpad/` | `%TEMP%\claude\<project-hash>\<session-id>\scratchpad\` |
| CWD trackers (⚠️ bug) | `tmpclaude-<hex>-cwd` in project root | Same — drops in project root on Windows too |
| Shell snapshots | `~/.claude/shell-snapshots/` | `%USERPROFILE%\.claude\shell-snapshots\` |
| Managed settings | `/Library/Application Support/ClaudeCode/managed-settings.json` | `C:\Program Files\ClaudeCode\managed-settings.json` |
| Temp dir override | `CLAUDE_CODE_TMPDIR=/path` | `set CLAUDE_CODE_TMPDIR=%USERPROFILE%\.claude\tmp` |

**⚠️ Windows Git Bash path mismatch:** When using Git Bash/MSYS2 on Windows, `$TEMP` resolves to `/tmp` (Git Bash virtual path), but Claude Code's Node.js process can't resolve this correctly, causing `tmpclaude-*-cwd` files to fall back to the project root. Fix:
```bash
# Add to ~/.bashrc (Git Bash)
export CLAUDE_CODE_TMPDIR="$HOME/.claude/tmp"
mkdir -p "$CLAUDE_CODE_TMPDIR"
```

**⚠️ Windows symlink issue:** Claude Code's subagent task output uses symlinks (`symlink()` in Node.js), which requires either Developer Mode enabled or running as Administrator on Windows. Without it, you'll see `EPERM: operation not permitted, symlink` errors.

#### Cursor

| Item | macOS | Windows |
|------|-------|---------|
| App data | `~/Library/Application Support/Cursor/` | `%APPDATA%\Cursor\` |
| Settings DB | `.../Cursor/User/globalStorage/state.vscdb` | `%APPDATA%\Cursor\User\globalStorage\state.vscdb` |
| Cache | `~/Library/Application Support/Cursor/Cache/` | `%APPDATA%\Cursor\Cache\` |
| CachedData (per version) | `~/.config/Cursor/CachedData/` | `%APPDATA%\Cursor\CachedData\` |
| Workspace storage | `.../Cursor/User/workspaceStorage/` | `%APPDATA%\Cursor\User\workspaceStorage\` |
| Extensions | `~/.cursor/extensions/` | `%USERPROFILE%\.cursor\extensions\` |
| Remote server | `~/.cursor-server/` | `%USERPROFILE%\.cursor-server\` |

**Cleanup (PowerShell):**
```powershell
# Clear Cursor cache
Remove-Item -Recurse -Force "$env:APPDATA\Cursor\Cache"
Remove-Item -Recurse -Force "$env:APPDATA\Cursor\CachedData"

# Nuclear reset
Remove-Item -Recurse -Force "$env:APPDATA\Cursor"
Remove-Item -Recurse -Force "$env:USERPROFILE\.cursor"
```

#### GitHub Copilot

| Item | macOS / Linux | Windows |
|------|---------------|---------|
| CLI config dir | `~/.copilot/` | `%USERPROFILE%\.copilot\` |
| Session state | `~/.copilot/session-state/` | `%USERPROFILE%\.copilot\session-state\` |
| GitHub CLI auth | `~/.config/gh/hosts.yml` | `%APPDATA%\GitHub CLI\hosts.yml` |
| VS instructions (global) | `~/Library/Application Support/github-copilot/...` | `%LOCALAPPDATA%\github-copilot\intellij\global-copilot-instructions.md` |
| VS user-level prefs | — | `%USERPROFILE%\copilot-instructions.md` |
| Copilot CLI hooks | `.github/hooks/*.json` | Same (project-relative) |

#### Windsurf / Codeium

| Item | macOS / Linux | Windows |
|------|---------------|---------|
| Global config | `~/.codeium/` | `%USERPROFILE%\.codeium\` |
| MCP config | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| Global rules | `~/.codeium/windsurf/memories/global_rules.md` | `%USERPROFILE%\.codeium\windsurf\memories\global_rules.md` |
| App install | `/Applications/Windsurf.app` | `%LOCALAPPDATA%\Programs\Windsurf\` |

#### Gemini CLI

| Item | macOS / Linux | Windows |
|------|---------------|---------|
| Config dir | `~/.gemini/` | `%USERPROFILE%\.gemini\` |
| Context file | `~/.gemini/GEMINI.md` | `%USERPROFILE%\.gemini\GEMINI.md` |
| Settings | `~/.gemini/settings.json` | `%USERPROFILE%\.gemini\settings.json` |
| Override | `GEMINI_CLI_HOME=/path` | `set GEMINI_CLI_HOME=C:\path` |

#### OpenCode

| Item | macOS / Linux | Windows |
|------|---------------|---------|
| Global config | `~/.config/opencode/opencode.json` | `%USERPROFILE%\.config\opencode\opencode.json` |
| Alt location | — | `%USERPROFILE%\.config\opencode\opencode.jsonc` |

#### OpenClaw

| Item | macOS / Linux | Windows |
|------|---------------|---------|
| Config dir | `~/.openclaw/` | `%USERPROFILE%\.openclaw\` |
| Main config | `~/.openclaw/openclaw.json` | `%USERPROFILE%\.openclaw\openclaw.json` |
| Workspace | `~/.openclaw/workspace/` | `%USERPROFILE%\.openclaw\workspace\` |
| Credentials | `~/.openclaw/credentials/` | `%USERPROFILE%\.openclaw\credentials\` |

### A.3 Windows-Specific Gotchas

1. **Path separators:** Windows uses `\` but most AI tool configs accept `/` in JSON. When editing config files, either works. But in PowerShell commands and `%TEMP%` expansions, use `\`.

2. **MSIX virtualization (Claude Desktop):** The app reads from a virtualized path inside `%LOCALAPPDATA%\Packages\`, not from the `%APPDATA%\Claude\` path that the UI and docs tell you to edit. This is the #1 cause of "MCP servers won't load" on Windows.

3. **Git Bash `/tmp` mismatch (Claude Code):** Git Bash maps `/tmp` to a virtual path that Node.js can't resolve, causing temp files to drop in the project root instead. Set `CLAUDE_CODE_TMPDIR` explicitly.

4. **Symlinks require Developer Mode (Claude Code):** Subagent task output symlinks fail with `EPERM` unless Windows Developer Mode is on or you run as admin.

5. **Hidden dotfiles in Explorer:** Files starting with `.` (`.claude/`, `.cursor/`, `.cursorrules`) are not hidden by default on Windows (unlike macOS/Linux), so they appear in Explorer and `dir` listings.

6. **Long path support:** Some AI tools create deeply nested paths (especially Claude Code session transcripts). Enable Win32 long paths if you hit `MAX_PATH` (260 char) issues:
   ```powershell
   # Enable long path support (requires admin)
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

7. **`%APPDATA%` vs `%LOCALAPPDATA%`:** Some tools use Roaming (`%APPDATA%`), others use Local (`%LOCALAPPDATA%`). Roaming syncs across machines in domain environments; Local doesn't. If you're on a corporate domain, Roaming app data can balloon your profile size.

8. **Antivirus interference:** Windows Defender real-time scanning can slow AI tool indexing significantly. Consider excluding AI config directories from real-time scanning:
   ```powershell
   # Exclude AI tool directories from Defender (requires admin)
   Add-MpPreference -ExclusionPath "$env:USERPROFILE\.claude"
   Add-MpPreference -ExclusionPath "$env:USERPROFILE\.cursor"
   Add-MpPreference -ExclusionPath "$env:USERPROFILE\.copilot"
   Add-MpPreference -ExclusionPath "$env:USERPROFILE\.codeium"
   Add-MpPreference -ExclusionPath "$env:USERPROFILE\.gemini"
   ```

### A.4 Windows Cleanup Script (PowerShell)

```powershell
# ai-cleanup.ps1 — Find and report AI tool intermediate artifacts on Windows
# Run from project root. Use -Delete switch to remove.

param([switch]$Delete)

Write-Host "=== Claude Code artifacts ===" -ForegroundColor Cyan
$cwdFiles = Get-ChildItem -Filter "tmpclaude-*-cwd" -ErrorAction SilentlyContinue
if ($cwdFiles) {
    $cwdFiles | ForEach-Object { Write-Host "  $_" }
    Write-Host "  Count: $($cwdFiles.Count)"
    if ($Delete) { $cwdFiles | Remove-Item -Force; Write-Host "  DELETED" -ForegroundColor Red }
} else { Write-Host "  (none found)" }

$tmpAttach = Get-ChildItem -Path "tmp\attachments" -Directory -ErrorAction SilentlyContinue
if ($tmpAttach) { Write-Host "  tmp/attachments/ exists" }

$claudeProjects = "$env:USERPROFILE\.claude\projects"
if (Test-Path $claudeProjects) {
    $size = (Get-ChildItem $claudeProjects -Recurse -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Session transcripts: $([math]::Round($size, 1)) MB"
}

$tempClaude = Get-ChildItem "$env:TEMP\claude*" -ErrorAction SilentlyContinue
if ($tempClaude) { Write-Host "  System temp claude files: $($tempClaude.Count)" }

Write-Host ""
Write-Host "=== Copilot CLI sessions ===" -ForegroundColor Cyan
$copilotSessions = "$env:USERPROFILE\.copilot\session-state"
if (Test-Path $copilotSessions) {
    $count = (Get-ChildItem $copilotSessions -Directory -ErrorAction SilentlyContinue).Count
    $size = (Get-ChildItem $copilotSessions -Recurse -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Sessions: $count  Size: $([math]::Round($size, 1)) MB"
} else { Write-Host "  (none found)" }

Write-Host ""
Write-Host "=== Cursor cache ===" -ForegroundColor Cyan
$cursorCache = "$env:APPDATA\Cursor\CachedData"
if (Test-Path $cursorCache) {
    $versions = (Get-ChildItem $cursorCache -Directory -ErrorAction SilentlyContinue).Count
    $size = (Get-ChildItem $cursorCache -Recurse -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  CachedData versions: $versions  Size: $([math]::Round($size, 1)) MB"
}
$workspaceStorage = "$env:APPDATA\Cursor\User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    $size = (Get-ChildItem $workspaceStorage -Recurse -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  WorkspaceStorage: $([math]::Round($size, 1)) MB"
}

Write-Host ""
Write-Host "=== Windsurf ===" -ForegroundColor Cyan
$cascadeMemories = Get-ChildItem -Path "cascade-memories" -Directory -ErrorAction SilentlyContinue
if ($cascadeMemories) { Write-Host "  cascade-memories/ exists in project root" }
$codeium = "$env:USERPROFILE\.codeium"
if (Test-Path $codeium) {
    $size = (Get-ChildItem $codeium -Recurse -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  .codeium total: $([math]::Round($size, 1)) MB"
}

Write-Host ""
Write-Host "=== Gemini CLI ===" -ForegroundColor Cyan
$geminiMem = "$env:USERPROFILE\.gemini\memory"
if (Test-Path $geminiMem) {
    $size = (Get-ChildItem $geminiMem -Recurse -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Memory: $([math]::Round($size, 1)) MB"
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Yellow
$totalPaths = @(
    "$env:USERPROFILE\.claude",
    "$env:USERPROFILE\.copilot",
    "$env:USERPROFILE\.cursor",
    "$env:APPDATA\Cursor",
    "$env:USERPROFILE\.codeium",
    "$env:USERPROFILE\.gemini",
    "$env:USERPROFILE\.openclaw"
)
$grandTotal = 0
foreach ($p in $totalPaths) {
    if (Test-Path $p) {
        $s = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue |
              Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "  $p : $([math]::Round($s, 1)) MB"
        $grandTotal += $s
    }
}
Write-Host "  GRAND TOTAL: $([math]::Round($grandTotal, 1)) MB" -ForegroundColor Green
```
