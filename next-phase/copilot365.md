Here is my comprehensive research on the Microsoft Copilot ecosystem — covering hidden files, special structures, memory, configurations, instructions, agents, agent-teams, telemetry, and more — for enriching the `aictl` tool at `/Users/zvi/Projects/aictl`.

---

## Research: Microsoft Copilot Ecosystem — Complete Map of Hidden Files, Structures & Configurations

### 1. GitHub Copilot (IDE-Level / Repository-Level)

#### 1.1 Repository Custom Instructions

**`.github/copilot-instructions.md`** — Repository-wide custom instructions in Markdown format. Applied automatically to all Copilot requests in the context of the repository. Priority order: personal > repository > organization.

**`.github/instructions/*.instructions.md`** — Path-specific custom instructions. Each file has YAML frontmatter with `applyTo` glob patterns and optional `excludeAgent` (values: `"code-review"` or `"coding-agent"`). Example frontmatter:
```yaml
---
applyTo: "**/*.ts,**/*.tsx"
excludeAgent: "code-review"
---
```

**`AGENTS.md`** — Agent instructions file, can be placed anywhere in the repo. Nearest file in the directory tree takes precedence. Also supports `CLAUDE.md` and `GEMINI.md` at the repo root.

#### 1.2 Prompt Files

**`.github/prompts/*.prompt.md`** — Reusable prompt files. Markdown files that can reference other workspace files via `[name](../../path)` or `#file:../../path` syntax. Used in VS Code, Visual Studio, and JetBrains.

#### 1.3 Custom Agents (VS Code)

**`.github/agents/*.agent.md`** — Custom agent files. Markdown with `.agent.md` extension. Also discovered from `.claude/agents` folder and `~/.copilot/agents` user profile folder. YAML frontmatter fields:
- `description` — shown as placeholder text
- `name` — agent name (defaults to file name)
- `argument-hint` — hint text for users
- `tools` — list of available tools/MCP tools (supports `<server name>/*` format)
- `agents` — list of subagent names (`*` for all, `[]` for none)
- `model` — AI model name or prioritized list of models
- `user-invocable` — boolean, show in agents dropdown (default `true`)
- `disable-model-invocation` — boolean, prevent auto-invocation as subagent

#### 1.4 Agent Skills

**`.github/skills/<skill-name>/SKILL.md`** — Markdown with YAML frontmatter. Also searched in `.claude/skills` and `~/.copilot/skills`. Frontmatter fields:
- `name` (required) — unique lowercase identifier, max 64 chars
- `description` (required) — what the skill does and when to use it
- `tools` — tools the skill provides
- `user-invocable` — show in slash command menu
- `disable-model-invocation` — require manual invocation only

#### 1.5 Hooks (Lifecycle Events)

**`.github/hooks/*.json`** — Agent hook configuration files. Execute custom shell commands at lifecycle points. Events include: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`. Example format:
```json
{
  "hooks": {
    "PostToolUse": [
      { "type": "command", "command": "npx prettier --write \"$TOOL_INPUT_FILE_PATH\"" }
    ]
  }
}
```

#### 1.6 MCP Configuration

**`.vscode/mcp.json`** — Workspace-level MCP server configuration. Shared with team via source control. User-profile level also available. Format:
```json
{
  "servers": {
    "server-name": {
      "type": "http",
      "url": "...",
      "command": "...",
      "args": [...]
    }
  }
}
```

#### 1.7 Content Exclusions

Configured at repository, organization, or enterprise level (not a file in the repo — set in GitHub Settings). Uses fnmatch pattern matching to exclude files from Copilot suggestions and Chat context. Patterns like `"/scripts/**"`, `"secrets.json"`, `"*.cfg"`.

#### 1.8 JetBrains IDE-Specific Configuration

**`github-copilot.xml`** — Located at `~/Library/Application Support/JetBrains/<product><version>/options/github-copilot.xml` (macOS). Controls language allow-lists with XML entries:
```xml
<application>
  <component name="github-copilot">
    <languageAllowList>
      <map>
        <entry key="*" value="true" />
        <entry key="Python" value="true" />
      </map>
    </languageAllowList>
  </component>
</application>
```

**JetBrains Global Instructions** — `~/.config/github-copilot/intellij/global-copilot-instructions.md`

#### 1.9 VS Code Settings (key Copilot settings)

- `github.copilot.chat.codeGeneration.useInstructionFiles` — use `.github/copilot-instructions.md` (default: `true`)
- `chat.instructionsFilesLocations` — search paths for instructions (default: `{ ".github/instructions": true }`)
- `chat.promptFilesLocations` — search paths for prompts (default: `{ ".github/prompts": true }`)
- `chat.agentFilesLocations` — search paths for agents (default: `{ ".github/agents": true }`)
- `chat.agentSkillsLocations` — search paths for skills (default includes `.github/skills`, `.claude/skills`, `~/.copilot/skills`)
- `chat.useCustomizationsInParentRepositories` — discover customizations in parent repo folders (monorepo support)

#### 1.10 Memory

- `github.copilot.chat.tools.memory.enabled` — built-in memory tool, saves and recalls notes across conversations (default: `true`, Preview)
- `github.copilot.chat.copilotMemory.enabled` — GitHub-hosted memory system retaining repository-specific memory (default: `false`, Preview)

#### 1.11 Telemetry / Observability (OpenTelemetry)

- `github.copilot.chat.otel.enabled` — enable OTel emission for agent interactions (default: `false`)
- `github.copilot.chat.otel.exporterType` — `otlp-http`, `otlp-grpc`, `console`, or `file` (default: `"otlp-http"`)
- `github.copilot.chat.otel.otlpEndpoint` — OTLP collector endpoint (default: `"http://localhost:4318"`)
- `github.copilot.chat.otel.outfile` — file path for JSON-lines output when using `file` exporter
- `github.copilot.chat.otel.captureContent` — capture full prompt/response content in OTel spans (default: `false`)

#### 1.12 Agent Plugins

- `chat.plugins.enabled` — enable agent plugins (default: `false`, Preview)
- `chat.plugins.marketplaces` — Git repos for discovering plugins (default: `["github/copilot-plugins", "github/awesome-copilot"]`)
- `chat.pluginLocations` — locally registered plugin directories

#### 1.13 Data/Privacy Policies

- Suggestions matching public code: Allow/Block
- Model training and improvement: opt-in/opt-out (starting April 2026)
- Web search for Chat: Bing integration (disabled by default)
- Third-party coding agents: Anthropic Claude, OpenAI Codex (toggleable)

---

### 2. Microsoft 365 Copilot (Declarative Agents / M365 Ecosystem)

#### 2.1 App Package Structure

The M365 app package is a `.zip` file containing:
- **`manifest.json`** — App manifest (schema v1.18+), root-level JSON describing the app
- **`color.png`** — 192×192 full-color icon
- **`outline.png`** — 32×32 outline icon with transparent background
- **Declarative agent manifest(s)** — `*.json` files referenced from the `copilotAgents` node
- **API plugin manifest(s)** — `*.json` files for API plugins
- **Localization files** — for multi-language support

#### 2.2 App Manifest (`manifest.json`)

Key fields: `$schema`, `manifestVersion` (1.18), `version` (semver), `id` (GUID), `developer` (name, websiteUrl, privacyUrl, termsOfUseUrl), `icons` (color, outline), `name` (short, full), `description` (short, full), `accentColor`, `composeExtensions` (message extensions), and **`copilotAgents`** — the node for declarative agents and API plugins.

#### 2.3 Declarative Agent Manifest (Schema v1.6)

A separate JSON file referenced from the app manifest. Key properties:

| Property | Type | Description |
|---|---|---|
| `version` | String | Required. Schema version: `v1.6` |
| `id` | String | Optional identifier |
| `name` | String | Required, localizable, max 100 chars |
| `description` | String | Required, localizable, max 1000 chars |
| `instructions` | String | Required. Behavior guidelines, max 8000 chars |
| `capabilities` | Array | Optional. Capability objects (see below) |
| `conversation_starters` | Array | Optional. Suggested prompts |
| `behavior_overrides` | Object | Optional. Overrides agent behavior |
| `disclaimer` | Object | Optional. Text shown at conversation start |
| `sensitivity_label` | Object | Optional. Purview sensitivity label (GUID) |
| `worker_agents` | Array | Optional. Other agents usable by this agent |
| `user_overrides` | Array | Optional. User-modifiable capabilities |

#### 2.4 Capabilities Objects

Available capability types for declarative agents:
- **WebSearch** — web search with configurable site restrictions
- **OneDriveAndSharePoint** — items by URL, site_id, web_id, list_id, unique_id
- **GraphConnectors** — connections with `connection_id`
- **GraphicArt** — image generation
- **CodeInterpreter** — code execution
- **Dataverse** — CRM/dynamics with `host_name`, `skill`, `tables`
- **TeamsMessages** — Teams message search
- **Email** — email search
- **People** — people search with `include_related_content`
- **ScenarioModels** — specialized AI models
- **Meetings** — meeting data with `items_by_id`
- **EmbeddedKnowledge** — local files as knowledge

#### 2.5 Behavior Overrides Object

- `suggestions` → `disabled` (Boolean) — disable conversation suggestions
- `special_instructions` → `discourage_model_knowledge` (Boolean) — prevent using built-in model knowledge

#### 2.6 Worker Agents (Agent Teams)

The `worker_agents` array references other declarative agents by their app title ID. This enables a "lead agent" to delegate tasks to specialized "worker agents" — effectively creating agent teams. This is in Preview.

#### 2.7 User Overrides Object

Identifies capabilities in the `capabilities` array that users can modify at runtime.

#### 2.8 Disclaimer Object

Displays disclaimer text at conversation start. Property: `text` (String, max 500 chars).

#### 2.9 Sensitivity Labels

Uses Microsoft Purview sensitivity label GUIDs to classify embedded files in the agent. Only applies when the agent has embedded files.

#### 2.10 Localization

String properties support localization keys: `[[key_name]]` syntax, resolved via `localizationKeys` in localization files.

#### 2.11 Development & Testing

- **Microsoft 365 Agents Toolkit** — VS Code extension for building/provisioning/deploying agents
- **Developer Mode** — test and debug agent behavior in the M365 Copilot UI at `m365.cloud.microsoft.com/chat`
- **Copilot Studio** — low-code builder for agents (generates manifest automatically)

---

### 3. Summary: Complete File/Structure Map for `aictl`

```
Repository Root
├── .github/
│   ├── copilot-instructions.md          # Repository-wide Copilot instructions
│   ├── instructions/                     # Path-specific instructions
│   │   └── *.instructions.md            # With applyTo frontmatter
│   ├── prompts/                          # Reusable prompt files
│   │   └── *.prompt.md                  # Prompt templates
│   ├── agents/                           # Custom agents (VS Code)
│   │   └── *.agent.md                   # Agent definitions with YAML frontmatter
│   ├── skills/                           # Agent skills
│   │   └── <skill-name>/SKILL.md        # Skill definitions
│   └── hooks/                            # Agent lifecycle hooks
│       └── *.json                        # Hook configurations
├── .vscode/
│   └── mcp.json                          # MCP server configuration
├── .claude/
│   ├── agents/                           # Claude-format agents
│   └── skills/                           # Claude-format skills
├── AGENTS.md                             # Agent instructions (any directory)
├── CLAUDE.md                             # Claude-specific instructions (root)
├── GEMINI.md                             # Gemini-specific instructions (root)
│
│   # M365 Copilot App Package (.zip)
├── appPackage/
│   ├── manifest.json                     # M365 app manifest (v1.18+)
│   ├── color.png                         # 192x192 color icon
│   ├── outline.png                       # 32x32 outline icon
│   ├── declarativeAgent.json             # Declarative agent manifest (v1.6)
│   ├── apiPlugin.json                    # API plugin manifest (optional)
│   └── localization/                     # Localization files
│
│   # User-level config locations
~/.copilot/
│   ├── agents/                           # User-profile agents
│   └── skills/                           # User-profile skills
~/.config/github-copilot/
│   └── intellij/
│       └── global-copilot-instructions.md  # JetBrains global instructions
~/Library/Application Support/JetBrains/
│   └── <product><version>/options/
│       └── github-copilot.xml            # JetBrains language config
```

### Key Telemetry/Observability Settings
- OpenTelemetry emission via `github.copilot.chat.otel.*` settings
- Exporter types: `otlp-http`, `otlp-grpc`, `console`, `file`
- Content capture toggle for full prompts/responses
- M365 Copilot has built-in diagnostic via Developer Mode

### Key Memory Systems
- **Local Memory Tool** — saves/recalls notes across conversations (`github.copilot.chat.tools.memory.enabled`)
- **Copilot Memory (GitHub-hosted)** — persistent repository-scoped memory (`github.copilot.chat.copilotMemory.enabled`)
- **M365 Copilot** — leverages Microsoft Graph for organizational memory/context (no user-configurable file)

### Agent Teams / Multi-Agent
- **GitHub Copilot**: Custom agents with `agents` frontmatter field for subagents, `handoffs` between agents
- **M365 Copilot**: `worker_agents` array in declarative agent manifest — references other agents by app ID

This comprehensive map covers every known hidden file, configuration surface, agent structure, memory system, telemetry option, and special structure in the Microsoft Copilot ecosystem as documented through March 2026. This should provide a thorough foundation for enriching Microsoft ecosystem support in `aictl`.