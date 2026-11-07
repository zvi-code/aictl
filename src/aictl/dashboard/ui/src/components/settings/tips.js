// Help text for settings, used when a row carries no note of its own.

// Group-scoped tips: outer key is the settings-group name the setting is
// rendered under (matching feature_groups from the backend, plus "OTel" for
// the OTel block). Short keys like `enabled`, `webSearch`, or `temperature`
// mean different things in different groups, so group entries win over the
// flat fallback below.
export const TIPS = {
  OTel: {
    enabled:            'Whether OpenTelemetry export is active. Required for verified token counts and session traces.',
    exporter:           'Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.',
    endpoint:           'OTLP collector endpoint receiving telemetry data.',
    file_path:          'Local file path for telemetry output (file exporter).',
    capture_content:    'When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.',
    source:             'How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).',
  },
  // Copilot agent mode
  'Agent Mode': {
    enabled:            'Whether agent/agentic mode is active.',
  },
  // VS Code platform agent (chat.agent.*)
  Agent: {
    enabled:            'Whether agent/agentic mode is active.',
  },
  'Claude (Anthropic)': {
    temperature:        'Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.',
    webSearch:          'Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.',
  },
  'Cowork (Autonomous)': {
    webSearch:          'Allows Cowork mode to perform live web searches as part of autonomous tasks.',
    scheduledTasks:     'Enables Cowork mode to schedule and run tasks on a timer.',
    allowAllBrowserActions: 'Grants Cowork mode permission to take any browser action without per-action confirmation.',
  },
};

// Flat fallback — setting keys whose meaning is unambiguous across groups.
export const TIPS_FLAT = {
  // Agent Mode
  autoFix:              'When on, the agent automatically attempts to fix errors it detects during a run without asking.',
  editorContext:        'Ensures the agent always includes your active editor file as primary context for every request.',
  largeResultsToDisk:   'Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.',
  historySummarizationMode: 'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',
  maxRequests:          'Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.',
  plugins:              'Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.',
  // Debug Logging
  fileLogging:          'Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.',
  requestLoggerMaxEntries: 'Number of recent LLM requests retained in the in-memory request logger for debugging.',
  // CLI Mode
  mcp:                  'Enables MCP server support when running in CLI/autonomous mode.',
  worktreeIsolation:    'When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.',
  autoCommit:           'The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.',
  branchSupport:        'Allows the CLI agent to create and switch git branches during a task.',
  // Memory
  local:                'Local in-process memory tool — agent can store and recall facts within a session.',
  github:               'GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).',
  viewImage:            'Allows the agent to read and process image files (requires a multimodal model).',
  // Session targets / agent
  claudeTarget:         'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',
  autopilot:            'Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.',
  autoReply:            'Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.',
  // Safety
  terminalSandbox:      'Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.',
  terminalAutoApprove:  'Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.',
  autoApproveNpmScripts:'Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.',
  globalAutoApprove:    'YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.',
  autoApprove:          'Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.',
  terminal_sandbox:     'Runs terminal commands in a sandboxed environment to prevent destructive operations.',
  // Context Files
  applyingInstructions: 'Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.',
  claudeMd:             'Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.',
  agentsMd:             'Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.',
  nestedAgentsMd:       'When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.',
  // File Locations
  instructions:         'Search locations for .instructions.md files that are automatically attached to matching requests.',
  agents:               'Search locations for .agent.md custom agent definition files.',
  skills:               'Search locations for SKILL.md agent skill files.',
  prompts:              'Search locations for .prompt.md reusable prompt files.',
  // MCP
  access:               'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',
  autostart:            '"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',
  discovery:            'Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).',
  // Hooks
  claudeHooks:          'When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).',
  customAgentHooks:     'When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.',
  locations:            'File paths where hook configuration files are loaded from. Relative to workspace root.',
  // Claude (Anthropic)
  thinkingBudget:       'Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.',
  thinkingEffort:       'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',
  skipPermissions:      'Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.',
  // Claude Code settings
  effortLevel:          'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',
  hooks:                'Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).',
  installMethod:        'How Claude Code was installed (native, npm, homebrew, etc.).',
  hasCompletedOnboarding: 'Whether the initial Claude Code onboarding flow has been completed.',
  project_settings:     'A .claude/settings.json exists in this project with project-specific configuration.',
  project_permissions:  'Project settings include a permissions block controlling tool access.',
  // Gemini CLI
  vimMode:              'Enables Vim-style keybindings in the Gemini CLI.',
  approvalMode:         'Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).',
  notifications:        'Enables OS notifications for prompt alerts and session completion.',
  respectGeminiIgnore:  'Controls whether the CLI respects patterns in .geminiignore files.',
  additionalIgnores:    'Number of extra patterns added to the global file ignore list.',
  lineNumbers:          'Shows line numbers in code blocks within the chat interface.',
  alternateScreen:      'Uses the terminal alternate buffer to preserve shell scrollback history.',
  hideContext:          'Hides the summary of attached files/context above the input prompt.',
  // Gemini CLI - Thinking
  effort:               'Reasoning effort level for the model (e.g., standard, high).',
  temperature:          'Sampling temperature for model requests. 0 = deterministic; higher = more creative.',
  budget:               'Maximum token budget for reasoning/extended thinking.',
  // Gemini CLI - Agent
  coreTools:            'Number of built-in tools explicitly enabled for the agent.',
  excludeTools:         'Number of tools explicitly disabled for safety or cost control.',
  customAgents:         'Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).',
  // Claude Desktop modes
  sidebarMode:          'Controls whether Claude Desktop opens as a sidebar or full window.',
  trustedFolders:       'Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.',
  livePreview:          'Enables the live preview pane that shows rendered output during Code mode tasks.',
};

export function tip(key, group) {
  return (group && TIPS[group] && TIPS[group][key]) || TIPS_FLAT[key] || '';
}

function lastSegment(key) {
  const parts = String(key || '').split('.');
  return parts[parts.length - 1];
}

/** The help text for one row: its note, else the group, telemetry or flat tip. */
export function rowTip(row, sectionId) {
  const k = lastSegment(row.key);
  return row.note
    || (row.group && TIPS[row.group] && TIPS[row.group][k])
    || (sectionId === 'telemetry' && TIPS.OTel[k.replace(/^otel_?/, '')])
    || tip(k, row.group)
    || '';
}
