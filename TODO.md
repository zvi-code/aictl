# TODO — Missing Claude Code Capabilities

Features from Claude Code that aictl doesn't yet cover.

## Agent Teams

Claude Code supports multi-agent coordination where a team lead manages teammates working independently in their own context windows. Key configuration surfaces:

- [ ] **`teammateMode` setting** — `in-process` | `auto` | `tmux`. Could be a `[setting:profile:key]` section in `.aictx`, emitting to `.claude/settings.local.json`.
- [ ] **Team-specific hooks** — `TeammateIdle` and `TaskCompleted` hook events. The hook event names are already supported by our generic hook system, but we could add fixture examples and documentation.
- [ ] **Quality gates** — Common pattern: `TeammateIdle` runs linters, `TaskCompleted` verifies completion with an agent hook. Could ship as a template/example `.aictx`.
- [ ] **Team templates** — Pre-configured team compositions (e.g., "research team", "refactor team") as `.aictx` examples or plugin presets.

## Plugin Ecosystem

`aictl plugin build` generates the structure, but more integration is possible:

- [ ] **Plugin import** — `aictl import` should detect and read from `.claude-plugin/` directories, importing their skills, commands, hooks, and MCP configs back into `.aictx`.
- [ ] **Plugin test harness** — Run `claude --plugin-dir ./plugin` and verify the plugin loads correctly, skills are registered, and hooks fire.
- [ ] **Plugin metadata from `.aictx`** — Allow plugin manifest fields (name, version, author, description) to be specified in a `[plugin]` section in `.aictx` rather than only via CLI flags.
- [ ] **Plugin marketplace integration** — `aictl plugin publish` to submit to the official marketplace via the Console/Claude.ai submission endpoints.

## Hook Enhancements

- [ ] **HTTP hooks** — Claude Code supports `type: http` hooks with URL, headers, and `allowedEnvVars`. Document and test this in the `.aictx` format.
- [ ] **Prompt hooks** — `type: prompt` hooks that invoke an LLM to evaluate tool use. Document and add examples.
- [ ] **Hook script scaffolding** — `aictl init hooks` to generate example hook scripts (block-rm.sh, lint-on-write.sh, etc.) alongside the `.aictx` definitions.
- [ ] **Hook events coverage** — Document all supported Claude Code hook events: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `Stop`, `SubagentStart`, `SubagentStop`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`.

## Settings Management

- [ ] **`[setting:profile:key]` section** — Deploy arbitrary settings to `.claude/settings.local.json` (permissions, env vars, teammateMode, etc.) beyond just hooks.
- [ ] **Permission rules** — Express allowed tool patterns (e.g., `Bash(npm run *)`) in `.aictx`, emit to settings permissions.
- [ ] **Environment variables** — `[env:profile]` section to set env vars via `SessionStart` hook or `settings.json` `env` field.

## Windsurf Emitter

- [ ] **Windsurf emit** — Currently discovery-only. Add emitter for `.windsurfrules`, `.windsurf/rules/*.md`, and Windsurf MCP config.
- [ ] **Windsurf import** — Read from Windsurf native files.

## Additional Tool Features

- [ ] **Cursor agents** — Cursor reads `AGENTS.md` but doesn't have its own agent system. Track if Cursor adds native agent support.
- [ ] **Copilot hooks** — Track if GitHub Copilot adds a hook/lifecycle system.
- [ ] **Multi-tool hook parity** — When other tools add hooks, extend emitters to support them.

## Developer Experience

- [ ] **`aictl init`** — Scaffold a starter `.context.aictx` with common sections and examples.
- [ ] **`aictl diff`** — Show what would change between current deployed files and a new deploy (useful before profile switches).
- [ ] **`aictl validate`** — Lint `.aictx` files for malformed JSON, unknown section types, missing profiles, etc.
- [ ] **Watch mode** — `aictl deploy --watch` to re-deploy on `.aictx` file changes.
