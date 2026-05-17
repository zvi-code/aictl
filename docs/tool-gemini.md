# Gemini CLI

Google's Gemini CLI is a terminal-native AI coding agent. aictl
supports deploy, import, and config inspection for instructions,
commands, skills, MCP, hooks, and settings.

## Generated Files

| File | Source |
|------|--------|
| `GEMINI.md` | Root `[instructions.base]` |
| `GEMINI.local.md` | Root `[instructions.<profile>]` (gitignored) |
| `.gemini/rules/<scope>.md` | Sub-scope `[instructions]` with `paths:` frontmatter |
| `.gemini/commands/<name>.md` | `[commands.<profile>.<name>]` |
| `.gemini/skills/<name>/SKILL.md` | `[skills.<profile>.<name>]` |
| `.gemini/settings.json` | `[settings.*]` (merged from `_always` + active profile) |
| `.geminiignore` | `[ignores.*]` |
| `.mcp.json` | `[mcp.*]` |

## Imported Files

`aictl ctx import --from gemini` reads:

- `GEMINI.md`, `GEMINI.local.md`
- `.gemini/rules/*.md` (with `paths:` glob in frontmatter)
- `.gemini/commands/*.md`
- `.gemini/skills/*/SKILL.md`
- `.gemini/settings.json` (hooks block)
- `.mcp.json`

## What Gemini Doesn't Have

- **Agents** — Gemini has no agent-definition surface. `[agents.*]`
  sections are dropped by the emitter; the importer never reads them.
  `aictl ctx validate` emits a compatibility warning.
- **LSP servers** — Gemini does not consume LSP from context files.

## Settings Detected by aictl

`_parse_gemini_config` reads `~/.gemini/settings.json` and the
per-project `.gemini/settings.json`:

| Field | Source key |
|-------|-----------|
| Model | `model` |
| Vim mode | `general.vimMode` |
| Default approval mode | `general.defaultApprovalMode` |
| Auto-update | `general.enableAutoUpdate` |
| OS notifications | `general.enableNotifications` |
| Max attempts per tool call | `general.maxAttempts` |
| Line numbers in output | `ui.showLineNumbers` |
| Alternate screen | `ui.useAlternateScreen` |
| Hide context summary | `ui.hideContextSummary` |
| Theme | `ui.theme` |

## Approval Modes

Gemini exposes three approval modes via the picker (Shift+Tab cycles):

| Mode | Behavior |
|------|----------|
| `default` | Prompt before every tool call |
| `auto-edit` | Auto-approve edits, prompt for everything else |
| `plan` | Plan-only, no tool execution |

The active mode is captured in `cfg.settings["approval_mode"]` for the
dashboard's Configuration tab.

## Hooks

Gemini reads hooks from `.gemini/settings.json`. The importer pulls the
`hooks` block and represents it the same way Claude Code does in
`.context.toml`:

```toml
[hooks._always]
PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": "guard.sh"}]}]'
```

## OTel

Gemini CLI exports OpenTelemetry traces to JSON-line files when run
with the right env vars. aictl looks for `~/.gemini/otel-export-*.jsonl`
(pattern is configurable in `tool-configs.yaml`). Future revisions of
this doc will cover ingestion of those export files.

## Import

```bash
aictl ctx import --from gemini --root . [--patch]
```

## Deploy

```bash
aictl ctx deploy --root . --profile debug --emit claude,copilot,gemini
```

## Known Quirks

- The CLI bundles a local Node runtime; expect `node` processes labelled
  `gemini-cli` in the process tree.
- `GEMINI.local.md` should be gitignored; it carries profile-specific
  text the user did not commit.
- Skills must be a directory with a `SKILL.md` file; flat files in
  `.gemini/skills/` are ignored.
