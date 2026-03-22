# AI Tools — Capabilities & Features Matrix

> Cross-tool comparison of features, configuration surfaces, extensibility,
> and unique capabilities for AI coding tools. Each tool's capabilities
> inform what aictl can monitor and surface in the dashboard.
> Companion to `ai-tools-config-paths.md`, `ai-tools-runtime-processes.md`,
> `ai-tools-traffic-monitoring.md`, and `ai-tools-observability.md`.
> Compiled March 2026.

## Changelog
- 2026-03-27: Initial creation — Claude Code (claude-code) and Claude Desktop (claude-desktop) entries

---

## Quick Capability Matrix

| Capability | Claude Code | Claude Desktop | Copilot CLI | Cursor | Windsurf | Gemini CLI | Aider | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Interactive chat | Yes | Yes | — | — | — | — | — | — |
| Non-interactive/batch mode (print mode) | Yes | No | — | — | — | — | — | — |
| Subagents/teams | Yes | No | — | — | — | — | — | — |
| Hook/lifecycle system (count of events) | Yes (25) | No | — | — | — | — | — | — |
| MCP support (transports) | stdio, HTTP, SSE | stdio, HTTP/SSE | — | — | — | — | — | — |
| Auto-memory/learning | Yes | No | — | — | — | — | — | — |
| Plugin/extension system | Yes | No | — | — | — | — | — | — |
| Permission model | Yes (6 modes) | No | — | — | — | — | — | — |
| Sandbox/security | Yes (Seatbelt/bubblewrap) | No | — | — | — | — | — | — |
| IDE integration | VS Code, JetBrains | N/A (standalone) | — | — | — | — | — | — |
| Context compaction | Yes | No | — | — | — | — | — | — |
| Scheduled tasks (cron) | Yes (session-scoped) | No | — | — | — | — | — | — |
| Worktree isolation | Yes | No | — | — | — | — | — | — |
| OpenTelemetry export | Yes | No | — | — | — | — | — | — |
| Custom instructions | Yes (CLAUDE.md + rules) | No | — | — | — | — | — | — |
| Model selection | Yes (Opus 4.6, Sonnet 4.6, Haiku 4.5) | Limited | — | — | — | — | — | — |
| Voice input | Yes (20 languages) | No | — | — | — | — | — | — |

---

## 1. Claude Desktop (claude-desktop)

### Core Capabilities
- Desktop Electron app for Claude chat with MCP server support
- No CLI, no batch mode, no hooks, no agent teams
- MCP server support (stdio and HTTP/SSE transports)
- Conversation history stored server-side
- No project instruction files (CLAUDE.md not supported)
- No plugin system
- No OpenTelemetry

### MCP Support
- Config: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
- Transports: stdio, HTTP/SSE
- No tool search/deferral

---

## 2. Claude Code (claude-code)

### 2.1 Core Capabilities
- CLI agent (interactive REPL and non-interactive print mode)
- Models: Opus 4.6 (default, 64K output), Sonnet 4.6, Haiku 4.5
- Extended context: 200K standard, 1M for Max/Team/Enterprise plans
- Output formats: text, JSON, stream-json
- Effort levels: low, medium, high, max, auto
- Fast mode toggle (same model, faster output)
- Voice input (20 languages)
- Pipe input/output support
- Max budget cap (`--max-budget-usd N`)
- Max turn limit (`--max-turns N`)
- JSON schema validation for structured output

### 2.2 Instruction & Customization System
- **CLAUDE.md** files — project instructions loaded every call
  - Resolution order: `.claude/CLAUDE.md` -> `./CLAUDE.md` -> parent dirs -> `~/.claude/CLAUDE.md`
  - Managed CLAUDE.md from system dirs (highest precedence)
  - CLAUDE.local.md for gitignored local overrides
  - Subdirectory CLAUDE.md (lazy-loaded when entering dirs)
  - HTML comments stripped before injection
  - Survives compaction (re-read from disk)
  - Token cost: 100-5000+ per file
  - `claudeMdExcludes` setting to skip specific files
- **Rules** (`.claude/rules/*.md`) — topic-scoped, recursive subdirs
  - Path-scoped via `paths:` YAML frontmatter
  - User rules at `~/.claude/rules/`
  - Token cost: 50-500 per file
- **Settings hierarchy**: Managed -> Enterprise -> User -> Project -> Local
- **Profiles**: not built-in but achievable via settings.local.json

### 2.3 Agent & Automation
- **Subagents**: Separate Claude Code instances with own context
  - Definition files: `.claude/agents/*.md`, `~/.claude/agents/`
  - Frontmatter: name, description, model, tools, isolation
  - `isolation: worktree` for parallel file-safe work
  - Spawned via Agent tool, each gets own shell + context
  - Memory: ~45 MB per subagent process
- **Agent Teams** (experimental, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`):
  - Team lead + teammates architecture
  - Display modes: in-process, tmux, auto
  - Shared task list with file-locking for concurrent claims
  - Mailbox messaging between lead and teammates
  - Storage: `~/.claude/teams/{team-name}/config.json`, `~/.claude/tasks/{team-name}/`
  - Hooks: TeammateIdle, TaskCreated, TaskCompleted
  - Setting: `teammateMode` (auto/in-process/tmux)
  - Requires v2.1.32+
- **Task tracking**: TaskCreate, TaskGet, TaskList, TaskUpdate tools
  - Shared task lists via `CLAUDE_CODE_TASK_LIST_ID`
  - Visible to teammates for coordination
- **Headless/CI mode**: `claude -p "prompt"` for scripted usage
  - `--bare` flag for lightweight execution (skips hooks, plugins, MCP, CLAUDE.md)
  - `--no-session-persistence` to skip saving
  - Exit codes for scripting
  - stream-json format for real-time event parsing
- **Scheduled tasks (cron)**: CronCreate/CronDelete/CronList
  - Session-scoped (lost on exit)
  - Max 50 tasks per session
  - 3-day expiry for recurring tasks
  - `/loop` command for interval execution

### 2.4 Hook & Lifecycle System (25 events)
- **Hook handler types**: command (shell), http (POST), prompt (LLM eval), agent (subagent)
- **Timeouts**: command=600s, prompt=30s, agent=60s, http=30s
- **Exit code semantics**: 0=success, 2=block, other=non-blocking error
- **Events**:
  - Session: SessionStart, SessionEnd, InstructionsLoaded
  - User input: UserPromptSubmit (can block)
  - Tool execution: PreToolUse (can block), PostToolUse, PostToolUseFailure, PermissionRequest (can block)
  - Notification: Notification, FileChanged, CwdChanged, ConfigChange (can block)
  - Agent/Team: SubagentStart, SubagentStop (can block), TeammateIdle (can block), TaskCreated (can block), TaskCompleted (can block)
  - Compaction: PreCompact, PostCompact
  - Completion: Stop (can block), StopFailure
  - MCP: Elicitation (can block), ElicitationResult (can block)
  - Git: WorktreeCreate (can block), WorktreeRemove
- **Conditional hooks**: `if` field using permission rule syntax (v2.1.85+)
- Config: `hooks` key in settings.json, per-scope (managed, user, project, local)
- Managed-only mode: `allowManagedHooksOnly` setting

### 2.5 MCP (Model Context Protocol)
- **Transports**: stdio, HTTP (recommended), SSE (deprecated)
- **Scopes**: local (default), project (.mcp.json), user (~/.claude.json), managed
- **Management**: `claude mcp add/list/get/remove/reset-project-choices`
- **In-session**: `/mcp` command for status, reconnect, OAuth
- **Tool search**: Deferred loading for large tool sets (ENABLE_TOOL_SEARCH)
- **Elicitation**: MCP servers can request structured user input (v2.1.76+)
- **Channels**: MCP servers can push messages into sessions (research preview)
- **Server deduplication**: Local config wins over cloud connectors
- **Tool description cap**: 2KB per tool description
- **Built-in IDE MCP server**: `mcp__ide__getDiagnostics`, `mcp__ide__executeCode`
- **Registry API**: `https://api.anthropic.com/mcp-registry/v0/servers`
- **Timeouts**: MCP_TIMEOUT (startup), MCP_TOOL_TIMEOUT (execution)
- **Token cost**: 200-2000 per server (tool schemas)

### 2.6 Extension & Plugin Model
- **Plugin system**: Git-hosted plugin packages
  - Manifest: `<plugin-root>/.claude-plugin/plugin.json`
  - Can contain: skills, agents, commands, hooks, MCP config, LSP config, settings
  - Enable/disable via `enabledPlugins` setting
  - Marketplaces: configurable sources, strict mode available
  - Plugin data directory: `${CLAUDE_PLUGIN_DATA}`
  - Auto-sync on session start
- **Skills**: `.claude/skills/*/SKILL.md` with YAML frontmatter
  - User-invocable via `/skill-name` slash commands
  - Frontmatter: name, description, tools, model, user-invocable
- **Commands**: `.claude/commands/*.md` (legacy, same mechanism as skills)
- **Agents**: `.claude/agents/*.md` with YAML frontmatter
  - Frontmatter: name, description, model, tools, agents, isolation

### 2.7 Memory & Learning
- **Auto-memory** (v2.1.59+): Automatically saves notes to project memory
  - Location: `~/.claude/projects/<project>/memory/MEMORY.md` + topic files
  - First 200 lines or 25KB loaded at session start
  - Types: user, feedback, project, reference
  - Custom directory via `autoMemoryDirectory` setting
  - Shared across worktrees within same repo
  - Disable: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`
  - Last-modified timestamps on memory files (v2.1.75+)
- **CLAUDE.md** as persistent project knowledge base
- **Subagent memory**: Subagents can maintain own persistent memory

### 2.8 Permission & Security Model
- **Permission modes**: default, acceptEdits, plan, auto, dontAsk, bypassPermissions
  - Auto mode: background safety checks (requires Team/Enterprise + Sonnet 4.6/Opus 4.6)
  - Cycle with Shift+Tab
- **Permission rules**: allow/ask/deny arrays in settings
  - Tool-level patterns: `Bash(npm *)`, `Edit(src/**)`, `mcp__server__tool`
  - Protected directories: .git, .claude, .vscode, .idea (always prompt)
- **Sandbox** (opt-in):
  - macOS: Seatbelt (sandbox-exec)
  - Linux/WSL2: bubblewrap + socat
  - Filesystem: allowWrite/denyWrite/allowRead/denyRead paths
  - Network: domain allowlist, proxy-based filtering
  - `sandbox.failIfUnavailable` for strict enforcement
- **Write restriction**: Can only write to CWD and subdirectories
- **Command blocklist**: curl and wget blocked by default
- **Command injection detection**: Suspicious bash commands require manual approval
- **Credential scrubbing**: `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1`

### 2.9 Settings & Configuration
- **Hierarchy**: Managed (file/MDM/Registry) -> Enterprise -> User -> Project -> Local
- **Files**: settings.json, settings.local.json (gitignored)
- **Managed locations**:
  - macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`
  - macOS MDM: `com.anthropic.claudecode` domain
  - Linux: `/etc/claude-code/managed-settings.json`
  - Windows: `C:\Program Files\ClaudeCode\managed-settings.json`
  - Windows Registry: `HKLM\SOFTWARE\Policies\ClaudeCode`
  - Drop-in fragments: `managed-settings.d/*.json`
- **JSON schema**: `https://json.schemastore.org/claude-code-settings.json`
- **~80+ settings keys** across core, permissions, sandbox, hooks, plugins, worktree, UI

### 2.10 IDE Integration
- **VS Code**: Extension `anthropic.claude-code` (VS Code 1.98.0+)
  - Built-in IDE MCP server on random localhost port
  - Auth token in `~/.claude/ide/<lockfile>` (0600 perms in 0700 dir)
  - Tools: getDiagnostics, executeCode
  - URI handler: `vscode://anthropic.claude-code/open`
  - Auto-install: `autoInstallIdeExtension` setting
- **JetBrains**: Extension support
- **Deep link**: `claude-cli://open?q=...`
- **VS Code data**: `~/.vscode/globalStorage/anthropic.claude-code`

### 2.11 CLI Features
- **Core commands**: claude (interactive), -p (print), -c (continue), -r (resume)
- **Management**: auth, mcp, plugin, agents, auto-mode
- **Session**: --name, --fork-session, --session-id, --from-pr
- **Control**: --model, --effort, --permission-mode, --tools, --worktree
- **Output**: --output-format text/json/stream-json, --json-schema
- **Settings**: --setting-sources, --strict-mcp-config, --debug, --verbose
- **Lightweight**: --bare (skip hooks/plugins/MCP/CLAUDE.md)
- **In-session commands**: /compact, /context, /cost, /effort, /help, /init, /login, /loop, /memory, /mcp, /model, /rename, /review, /status, /task, /vim
- **Update**: claude update (auto-update in background for native installs)

### 2.12 Built-in Tools (22 tools)
Bash, Read, Edit, Write, Glob, Grep, WebFetch, WebSearch, Agent, NotebookEdit, Config, Skill, TaskCreate, TaskGet, TaskList, TaskUpdate, CronCreate, CronDelete, CronList, EnterWorktree, ExitWorktree, RemoteTrigger
