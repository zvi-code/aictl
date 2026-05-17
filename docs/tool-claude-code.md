# Claude Code

## Generated Files

| File | Source | Scope |
|------|--------|-------|
| `CLAUDE.md` | Root `[base]` | Always loaded at project level |
| `CLAUDE.local.md` | Root `[profile]` + overlay | Personal, gitignored |
| `.claude/rules/{scope}.md` | Sub-scope `[base]`+`[profile]` | Glob-matched (`paths`) |
| `.claude/commands/{name}.md` | `[command:*]` | Slash commands: `/project:name` |
| `.claude/skills/{name}/SKILL.md` | `[skill:*]` | Agent skills |
| `.mcp.json` | `[mcp:*]` | MCP servers |

## Not Touched

| File | Owner |
|------|-------|
| `.claude/settings.json` | Team (committed) |
| `.claude/settings.local.json` | User (gitignored) |
| `~/.claude/settings.json` | User global settings |
| `~/.claude/commands/*.md` | User global commands |

## Outside the Repo

```
~/.claude/
├── CLAUDE.md              user-managed (personal prefs)
├── settings.json          user-managed
├── commands/*.md           user-managed
└── projects/<hash>/
    └── memory/            Claude writes, aictl SWAPS per profile
        ├── MEMORY.md
        └── *.md
```

Auto-memory is swapped on profile switch. See [memory.md](memory.md).

## Hook Integration

`aictl enable` writes nested Claude-format hook entries to `.claude/settings.local.json` (project) or `~/.claude/settings.json` (user). Each command invokes `python -m aictl.hook_handler --event <E> --port <P> --source <id>`, where `<id>` is `root.claude-user` for user scope or `<sanitized-cwd-basename>.claude-project` for project scope. The `<id>` lets the aictl server attribute every POST to `/api/hooks` back to the exact wrapper that emitted it — critical when both user-global and per-project hooks fire concurrently. See `docs/tool-copilot.md` for the VS Code counterpart and `docs/tool-claude-desktop.md` for the MCP side.

## VS Code Extension

The Claude Code VS Code extension bundles its own `claude` binary (~188 MB) and spawns it as a child process. It reads the same files as the CLI — no separate configuration needed. Restart the session after deploy.

For the full VS Code integration breakdown — process architecture, extension files, settings, and how Claude Code differs from Copilot Chat with Claude model — see [vscode-claude-modes.md](vscode-claude-modes.md).

## Profile Switch Example

```bash
aictl deploy --root . --profile debug
# Creates: investigate.md, trace.md, flame-graph/, azure-monitor in .mcp.json

aictl deploy --root . --profile docs
# REMOVES: investigate.md, trace.md, flame-graph/
# CREATES: gen-diagram.md, gen-adr.md, diagramming/
# .mcp.json: azure-devops replaces azure-monitor
# memory/ stashed, memory--docs/ restored
# CLAUDE.local.md overlay preserved
```

## Hidden / Undocumented CLI Flags

The Claude Code binary exposes a number of flags that are not in the
public help output but are visible in the binary and used by internal
tooling. aictl detects features driven by some of these flags; the
table below is a quick reference.

| Flag | Purpose |
|------|---------|
| `--sdk-url <url>` | Override the Anthropic API endpoint (used for proxies and self-hosted gateways). |
| `--teleport` | Open a remote/SSH execution session. Generates a teleport session under `~/.claude/teleport/`. |
| `--remote <host>` | Pair with `--teleport` to specify the remote host. |
| `--permission-prompt-tool <tool>` | Delegate permission prompts to an external tool (e.g. a TUI wrapper). |
| `--max-thinking-tokens <N>` | Cap extended-thinking token budget per turn. |
| `--resume-session-at <ts>` | Resume a session at a specific timestamp/offset rather than the end. |
| `--rewind-files` | When resuming, reset file mtimes/content to the session-che| `--rewind-files` | When resuming, resetser| `--rewind-files` | When resumi |


 `--rewind-files` | When resuming, reset file mtimes/content to----- `--rewind-files` | When resuming, reset file mtimes/content to----- o `--rewind-files` | When resuming, reset file mtimes/content to--per-turn logs to `<dir>` (also detect `--rewind-filese). `--rewind-fiCODE_O `--rewind-files` | When resuming, reset file mtimes/content to----- `--rewind-files` | When resuming, =1 `--rewind-files` | When resuming, reset file mtimes/content to----- `--rewind-files` | When resuming, reset filwh `--rewind-files` | When resuming, reset file mtimes/content to----- `--rpa `--rewind-files` | When resuming, reset file mtimes/content to----- `--rewind-files` | When resuming, resetro `--rewind-files` | When resuming, reset file mtimes/content to----- `--rewhan  `--rewind-files` | When resuming, reset file mtimes/content to----- `--rewind-files` | When resuminfi `--rewind-files` | When resuming, reset file mtimes/content to----- `--rewind-files` | When resuming, reset file mtimes/content to----- o `--rewind-files` |sionally fail to
clean up on parent exit. Symptoms: leftover `claude` processes whose
parent PID is 1 after the foreground session ends. The `aictl serve`
dashboard surfaces these as red rows under the "Processes" tab when
their CPU and memory are zero. Manual cleanup:

```bash
pkill -f 'claude.*Task'
```

### Stream JSON format

Claude Code can stream tool calls and responses as newline-delimited
JSON when invoked with the right combination of flags (used by the VS
Code extension for its real-time UI). aictl's hook handler does not
parse the stream directly; observability comes from the hook events
(`PreToolUse`, `PostToolUse`, etc.) and OTel exports.

## Verification Commands

```bash
# List every hidden flag baked into the local Claude Code binary
strings ~/.local/share/claude/versions/*/claude | grep -E '^\-\-[a-z\-]+'

# Confirm Claude Code is exporting OTel
echo "$CLAUDE_CODE_ENABLE_TELEMETRY $OTEL_EXPORTER_OTLP_ENDPOINT"

# Show active hook entries from project-local settings
cat .claude/settings.local.jsocat .q .hooks
```
