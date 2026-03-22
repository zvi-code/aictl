## Research: VS Code AI Ecosystem — Complete Map of Hidden Files, Structures, Configurations & Telemetry

---

### 1. Core Workspace Configuration Files (`.vscode/`)

These are the traditional VS Code hidden files in every workspace:

**`.vscode/settings.json`** — Workspace-level settings. Overrides user settings for the current workspace. All AI/Copilot settings described below can go here.

**`.vscode/launch.json`** — Debug launch configurations.

**`.vscode/tasks.json`** — Task runner definitions (build, test, lint, etc.).

**`.vscode/extensions.json`** — Recommended extensions for the workspace. Contains `recommendations` and `unwantedRecommendations` arrays.

**`.vscode/mcp.json`** — MCP server configuration (see section 4 below). Shared with team via source control.

**`*.code-workspace`** — Multi-root workspace file. JSON with `folders`, `settings`, `extensions`, `launch`, `tasks` sections.

---

### 2. AI Customization Files (`.github/` hierarchy)

The complete `.github/` customization tree for Copilot:

```
.github/
├── copilot-instructions.md              # Always-on repository-wide instructions
├── instructions/                         # Path-specific instructions
│   └── *.instructions.md                # YAML frontmatter: applyTo, excludeAgent
├── prompts/                              # Reusable prompt files
│   └── *.prompt.md                      # Referenced via /command in chat
├── agents/                               # Custom agents
│   └── *.agent.md                       # YAML frontmatter: description, name, tools, agents, model, etc.
├── skills/                               # Agent skills
│   └── <skill-name>/
│       └── SKILL.md                     # YAML frontmatter: name, description, tools, etc.
│       └── (supporting scripts/files)
└── hooks/                                # Agent lifecycle hooks
    └── *.json                           # Hook event configuration
```

#### 2.1 Instructions Files

**`.github/copilot-instructions.md`** — Always loaded into every request. Markdown, natural language.

**`.github/instructions/*.instructions.md`** — Frontmatter fields:
- `applyTo` — glob pattern (e.g., `"**/*.ts,**/*.tsx"`)
- `excludeAgent` — `"code-review"` or `"coding-agent"` (optional)

**Generated via `/init`** — typing `/init` in chat auto-generates `copilot-instructions.md` tailored to your codebase.

#### 2.2 Prompt Files

**`.github/prompts/*.prompt.md`** — Reusable prompt templates. Reference other workspace files via Markdown links `[name](../../path)` or `#file:../../path`. Used as slash commands (e.g., `/review`). Setting: `chat.promptFilesLocations` (default: `{ ".github/prompts": true }`).

#### 2.3 Custom Agents

**`.github/agents/*.agent.md`** — Markdown files with `.agent.md` extension. VS Code detects any `.md` file in `.github/agents/`. Also searched in `.claude/agents/` and `~/.copilot/agents/`.

YAML frontmatter fields:
- `description` — placeholder text in chat input
- `name` — agent name (defaults to filename)
- `argument-hint` — hint text for users
- `tools` — list of tools/tool sets/MCP tools (supports `<server>/*`)
- `agents` — subagent names (`*` for all, `[]` for none)
- `model` — AI model name or prioritized array of model names
- `user-invocable` — boolean (show in dropdown, default `true`)
- `disable-model-invocation` — boolean (prevent auto-invocation as subagent)
- `infer` — deprecated, replaced by `user-invocable` + `disable-model-invocation`

Body contains the agent's system instructions in Markdown.

Setting: `chat.agentFilesLocations` (default: `{ ".github/agents": true }`)

#### 2.4 Agent Skills

**`.github/skills/<skill-name>/SKILL.md`** — Each skill is a directory with a `SKILL.md` and optional supporting files (scripts, templates). Markdown with YAML frontmatter.

Frontmatter fields:
- `name` (required) — lowercase identifier, max 64 chars, hyphens for spaces
- `description` (required) — what the skill does and when to use it
- `tools` — tools the skill makes available
- `user-invocable` — show in `/` slash command menu (default `true`)
- `disable-model-invocation` — require manual invocation only

Body contains the instructions, procedures, and examples. Reference files with relative paths: `[test script](./test-template.js)`.

Setting: `chat.agentSkillsLocations` (default includes `.github/skills`, `.claude/skills`, `~/.copilot/skills`)

#### 2.5 Hooks (Lifecycle Events)

**`.github/hooks/*.json`** — Execute shell commands at lifecycle points during agent sessions. Format:

```json
{
  "hooks": {
    "PostToolUse": [
      { "type": "command", "command": "npx prettier --write \"$TOOL_INPUT_FILE_PATH\"" }
    ]
  }
}
```

Supported lifecycle events:
- `SessionStart` — when a new agent session begins
- `UserPromptSubmit` — when user sends a message
- `PreToolUse` — before a tool executes (can deny/ask/allow)
- `PostToolUse` — after a tool executes
- `SubagentStart` — when a subagent is invoked
- `SubagentStop` — when a subagent finishes
- `PreCompact` — before context compaction
- `Stop` — when the session ends

Each hook receives structured JSON input and can return JSON output to influence agent behavior.

---

### 3. Alternative Instruction Files (Root-Level)

**`AGENTS.md`** — Agent instructions file, can be placed in any directory. Nearest file in directory tree takes precedence. Works in VS Code and GitHub.

**`CLAUDE.md`** — Claude-specific instructions at repository root.

**`GEMINI.md`** — Gemini-specific instructions at repository root.

---

### 4. MCP Configuration (`.vscode/mcp.json`)

Two locations for MCP config:
- **Workspace**: `.vscode/mcp.json` — shared with team via source control
- **User profile**: `mcp.json` in user profile folder (per-profile)

Configuration structure:
```json
{
  "inputs": [
    { "type": "promptString", "id": "api-key", "description": "API Key", "password": true }
  ],
  "servers": {
    "server-name": {
      "type": "stdio|http|sse",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": { "API_KEY": "${input:api-key}" },
      "envFile": "${workspaceFolder}/.env",
      "sandboxEnabled": true,
      "sandbox": {
        "filesystem": { "allowWrite": ["${workspaceFolder}"], "denyRead": ["${userHome}/.ssh"] },
        "network": { "allowedDomains": ["api.example.com"], "deniedDomains": [] }
      }
    }
  }
}
```

Server types: `stdio` (local), `http`/`sse` (remote). Supports Unix sockets (`unix:///path/to/server.sock`), Windows named pipes, and development mode with `dev.watch` and `dev.debug`.

---

### 5. Memory System

#### 5.1 Local Memory Tool (built-in)

Setting: `github.copilot.chat.tools.memory.enabled` (default: `true`, Preview)

Memory files stored locally on your machine. Three scopes:

| Scope | Path | Across Sessions | Across Workspaces | Use For |
|---|---|---|---|---|
| User | `/memories/` | Yes | Yes | Preferences, patterns, commands |
| Repository | `/memories/repo/` | Yes | No (workspace-scoped) | Codebase conventions, build commands |
| Session | `/memories/session/` | No (cleared at end) | No | Task-specific context, plans |

User memory: first 200 lines auto-loaded into every session's context. Repository memory: persists across conversations in that workspace. Session memory: used by the Plan agent for `plan.md`.

Commands: `Chat: Show Memory Files`, `Chat: Clear All Memory Files`.

#### 5.2 Copilot Memory (GitHub-hosted)

Setting: `github.copilot.chat.copilotMemory.enabled` (default: `false`, Preview)

GitHub-hosted, repository-scoped, cross-agent memory. Shared across Copilot coding agent, code review, and CLI. Memories auto-expire after 28 days. Managed in Repository Settings > Copilot > Memory on GitHub.

---

### 6. Workspace Indexing

VS Code indexes your codebase for AI context. Three modes:

**Remote index (GitHub/Azure DevOps)** — Automatically built by GitHub. Fast, comprehensive, works for large repos. Requires push to GitHub. Also works with Azure DevOps repos.

**Local advanced index** — For non-GitHub repos. Auto-built for <750 files, manual build for 750-2500 files (command: `Build local workspace index`). Limited to 2500 files.

**Basic index** — Fallback for >2500 files without remote index. Simpler algorithms.

Index respects `.gitignore` and `files.exclude` settings. Binary files excluded. Status visible in Copilot Status Bar.

---

### 7. Agent Plugins (`.github/` + plugin marketplace)

Setting: `chat.plugins.enabled` (default: `false`, Preview)

Plugin structure:
```
my-plugin/
├── plugin.json                    # Plugin metadata
├── skills/
│   └── test-runner/
│       ├── SKILL.md
│       └── run-tests.sh
├── agents/
│   └── test-reviewer.agent.md
├── hooks/
│   └── hooks.json (Claude format) or hooks.json (Copilot format at root)
├── scripts/
│   └── validate-tests.sh
└── .mcp.json                      # Plugin MCP servers (key: mcpServers, not servers)
```

Default marketplaces: `github/copilot-plugins`, `github/awesome-copilot`. Configurable via `chat.plugins.marketplaces`. Local plugins: `chat.pluginLocations` maps directory paths to enabled/disabled.

Workspace plugin recommendations in `.vscode/settings.json`:
```json
{
  "extraKnownMarketplaces": { "company-tools": { "source": { "source": "github", "repo": "your-org/plugin-marketplace" } } },
  "enabledPlugins": { "code-formatter@company-tools": true }
}
```

---

### 8. Telemetry / Observability (OpenTelemetry)

Full OTel integration for monitoring agent interactions. Off by default.

**VS Code Settings:**
- `github.copilot.chat.otel.enabled` — enable (default: `false`)
- `github.copilot.chat.otel.exporterType` — `otlp-http`, `otlp-grpc`, `console`, `file` (default: `"otlp-http"`)
- `github.copilot.chat.otel.otlpEndpoint` — collector URL (default: `"http://localhost:4318"`)
- `github.copilot.chat.otel.captureContent` — capture full prompts/responses (default: `false`)
- `github.copilot.chat.otel.outfile` — file path for JSON-lines output

**Environment Variables (override settings):**
- `COPILOT_OTEL_ENABLED`, `COPILOT_OTEL_ENDPOINT`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`, `OTEL_SERVICE_NAME` (default: `copilot-chat`), `OTEL_RESOURCE_ATTRIBUTES`, `COPILOT_OTEL_CAPTURE_CONTENT`, `OTEL_EXPORTER_OTLP_HEADERS`

**What gets collected:**

Traces — hierarchical span tree: `invoke_agent` → `chat` (LLM calls) → `execute_tool`. Propagates across subagents.

Metrics — `gen_ai.client.operation.duration`, `gen_ai.client.token.usage`, `copilot_chat.tool.call.count`, `copilot_chat.tool.call.duration`, `copilot_chat.agent.invocation.duration`, `copilot_chat.agent.turn.count`, `copilot_chat.session.count`, `copilot_chat.time_to_first_token`.

Events — `gen_ai.client.inference.operation.details`, `copilot_chat.session.start`, `copilot_chat.tool.call`, `copilot_chat.agent.turn`.

Resource attributes — `service.name`, `service.version`, `session.id`. Custom via `OTEL_RESOURCE_ATTRIBUTES`.

Compatible with: Aspire Dashboard, Jaeger, Azure Application Insights, Langfuse, Grafana Tempo, Honeycomb, Datadog.

---

### 9. Parent Repository Discovery (Monorepos)

Setting: `chat.useCustomizationsInParentRepositories` (default: `false`)

When enabled, VS Code walks up the folder hierarchy from each workspace folder to the nearest `.git` directory and discovers all customizations from all intermediate directories. Applies to all customization types: instructions, agents, skills, prompts, hooks.

---

### 10. Key VS Code Settings Categories for AI

**General:** `chat.agent.enabled`, `chat.agent.maxRequests`

**Custom Instructions:** `chat.instructionsFilesLocations`, `chat.includeApplyingInstructions`, `chat.includeReferencedInstructions`, `github.copilot.chat.codeGeneration.useInstructionFiles`, `github.copilot.chat.commitMessageGeneration.instructions`, `github.copilot.chat.pullRequestDescriptionGeneration.instructions`, `github.copilot.chat.organizationInstructions.enabled`

**Custom Agents:** `chat.agentFilesLocations`, `chat.customAgentInSubagent.enabled`, `github.copilot.chat.cli.customAgents.enabled`, `github.copilot.chat.organizationCustomAgents.enabled`

**Agent Skills:** `chat.useAgentSkills`, `chat.agentSkillsLocations`

**Prompt Files:** `chat.promptFilesLocations`, `chat.promptFilesRecommendations`

**MCP:** `chat.mcp.access` (ORG), `chat.mcp.discovery.enabled`, `chat.mcp.autostart`, `chat.mcp.serverSampling`, `chat.mcp.apps.enabled`

**Plugins:** `chat.plugins.enabled`, `chat.plugins.marketplaces`, `chat.pluginLocations`

**Memory:** `github.copilot.chat.tools.memory.enabled`, `github.copilot.chat.copilotMemory.enabled`

**Telemetry:** `github.copilot.chat.otel.*` (5 settings)

**Agent Execution:** `chat.tools.terminal.autoApprove`, `chat.tools.terminal.enableAutoApprove` (ORG), `chat.tools.edits.autoApprove`, `chat.tools.terminal.sandbox.enabled`, `chat.tools.terminal.sandbox.linuxFileSystem`, `chat.tools.terminal.sandbox.macFileSystem`, `chat.tools.terminal.sandbox.network`, `chat.tools.global.autoApprove` (ORG), `chat.autopilot.enabled`, `chat.tools.urls.autoApprove`

**Claude Agent:** `github.copilot.chat.claudeAgent.enabled`, `github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions`

**Planning:** `chat.planAgent.defaultModel`, `github.copilot.chat.implementAgent.model`, `github.copilot.chat.planAgent.additionalTools`

**Other:** `github.copilot.chat.agent.autoFix`, `github.copilot.chat.summarizeAgentConversationHistory.enabled`, `github.copilot.chat.virtualTools.threshold`, `github.copilot.chat.agent.thinkingTool`, `github.copilot.chat.additionalReadAccessFolders`, `github.copilot.chat.newWorkspaceCreation.enabled`

---

### 11. Generation Commands (Chat Slash Commands)

Type these in chat to auto-generate customization files with AI assistance:
- `/init` — generate `copilot-instructions.md`
- `/create-prompt` — generate a prompt file
- `/create-instruction` — generate an instruction file
- `/create-skill` — generate a skill
- `/create-agent` — generate a custom agent
- `/create-hook` — generate a hook configuration

---

### 12. Dev Containers Integration

**`.devcontainer/devcontainer.json`** — Container development configuration. Can include `customizations.vscode.settings` to set AI-specific settings, `customizations.vscode.extensions` to install Copilot extensions. The Dev Container CLI supports this configuration.

---

### 13. Complete File Tree Summary

```
Project Root
├── .vscode/
│   ├── settings.json              # Workspace settings (all AI settings go here)
│   ├── mcp.json                   # MCP server configuration
│   ├── launch.json                # Debug configurations
│   ├── tasks.json                 # Task definitions
│   └── extensions.json            # Recommended extensions
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
│   └── hooks/                     # Lifecycle hooks
│       └── *.json
├── .claude/
│   ├── agents/                    # Claude-format agents
│   └── skills/                    # Claude-format skills
├── .devcontainer/
│   └── devcontainer.json          # Container dev config (can set AI settings)
├── AGENTS.md                      # Agent instructions (any directory level)
├── CLAUDE.md                      # Claude instructions (root)
├── GEMINI.md                      # Gemini instructions (root)
├── .gitignore                     # Excludes files from workspace index
└── *.code-workspace              # Multi-root workspace file

User-Level Locations:
~/.copilot/
├── agents/                        # User-profile agents
└── skills/                        # User-profile skills

VS Code User Profile:
<profile>/
├── mcp.json                       # User-level MCP servers
└── <memory files>                 # Local memory tool storage
    ├── memories/                  # User-scoped memories
    ├── memories/repo/             # Repository-scoped memories
    └── memories/session/          # Session-scoped memories (temporary)
```

This covers every documented hidden file, configuration surface, memory system, telemetry option, agent structure, plugin framework, and special structure in the VS Code AI ecosystem as of March 2026. Combined with the previous Copilot research, this gives `aictl` a complete picture of the Microsoft AI development tooling landscape.