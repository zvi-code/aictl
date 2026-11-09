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

`aictl enable` and `aictl hooks install` write nested Claude-format hook entries to `.claude/settings.local.json` (project) or `~/.claude/settings.json` (user). Nothing else registers hooks: not `serve`, not the dashboard, and `ctx deploy` only writes rules present in `.context.toml`. Each command is `"<python>" -I -S "<path>/aictl/hook_handler.py" --event <E> --port <P> --source <S> 2>/dev/null || true`, with `"async": true` and `"timeout": 5` (`SessionEnd` stays synchronous). The stdlib-only handler takes about 18 ms, prints nothing and always exits 0; the `|| true` covers an interpreter that is gone. `WorktreeCreate`, `Elicitation`, `ElicitationResult` and `PreModelSwitch` are never registered, because a hook there changes what Claude does.

Enabling hooks (`aictl enable` or `aictl hooks install`) stores one row in the `hook_calls` table per hook call, beside the `hook:<Event>` row of `events`; see [storage-schema.md](storage-schema.md#version-38-hook-calls) for the table and example queries.

### Hook wire format, version 1

The handler POSTs the tool's payload object to `POST /api/hooks` with `event` set to the `--event` value, `session_id` and `cwd` added when the payload lacks them, `pid` (the tool's) on `SessionStart`, and this envelope. The tool's own `hook_event_name` stays in the payload.

```
"aictl_hook": {
  "v": 1,                  # format version
  "call_id": "<32 hex>",   # unique per hook call
  "ts": 1731182400.123,    # time.time() at the start of the call
  "source": "root.claude-user", "pid": 123, "ppid": 122, "py": "/path/to/python",
  "payload_bytes": 1234,   # bytes read from stdin (0 for none)
  "truncated": false,      # true when stdin exceeded 16 MiB
  "added": ["cwd"],        # payload keys the handler set, left out of hook_calls.payload
  "wrapped": {...}         # only for a wrapped user hook, see below
}
```

The daemon also accepts a POST without `v`, `call_id` or `ts` (an older handler, another client): its row has `format_version` 0, a `call_id` derived from a hash of the body (so an identical retry is stored once), and the receive time as `ts`. A `ts` that is not a finite positive number is ignored.

### Wrapping your own hooks

`aictl hooks wrap [--scope user|project] [--port P] [--dry-run]` puts your own command hooks (every `type: "command"` entry of a rule aictl does not own, in the settings file `install` writes) through the handler's wrap mode. It is monitoring, not control: the command runs under the same shell (`$0`, else `/bin/sh`) with the same stdin bytes, environment and folder; its stdout, stderr and exit code are passed back unchanged (128+N when killed by signal N, 127 when it cannot start), and SIGTERM and SIGINT are passed on to it. Only `command` changes; `timeout`, `async`, `matcher` and `if` stay. A wrapped command looks like this:

```
if [ -x '/path/to/python' ] && [ -f '/path/to/aictl/hook_handler.py' ]; then '/path/to/python' -I -S '/path/to/aictl/hook_handler.py' --event PreToolUse --port 8484 --source root.claude-user --sh "$0" --wrap-b64 <base64 of the original>; else
:
<the original command>
fi
```

When aictl's interpreter or handler is gone, the `else` branch runs the original. If the wrapper itself fails before the command starts, it becomes the command, so a failure in aictl never turns a hook off. `wrap` skips, and lists, an empty command and one the shell cannot parse wrapped. A call whose report would pass the daemon's 1,000,000 byte limit is still recorded: the report keeps its numbers and short strings and is marked `truncated`. The cost is one interpreter start per wrapped call (about 20 ms) plus copying the output; the report is sent after the result is returned, from a forked process with no stdio, so the tool does not wait for the daemon. Each wrapped call is one `hook_calls` row with `wrapped` = 1, `exit_code`, `duration_ms`, `overhead_ms`, output sizes, `decision` and `command_hash`; the daemon writes nothing else for it (aictl's own hook on the event reports the event). `command` and `output` are text: kept with capture `full` only. Running `wrap` again is a no-op; with another `--port` it rewrites the command from the original. `aictl hooks unwrap`, `aictl hooks uninstall` and `aictl disable` restore each original command exactly. Not covered: Windows (`wrap` changes nothing there), Copilot and Gemini hook files, plugin hook files, and non-command hooks (`http`, `prompt`, `agent`), which `wrap` lists as skipped. `aictl hooks status` shows how many user hooks are wrapped.

## VS Code Extension

The Claude Code VS Code extension bundles its own `claude` binary (~188 MB) and spawns it as a child process. It reads the same files as the CLI — no separate configuration needed. Restart the session after deploy.

For the full VS Code integration breakdown — process architecture, extension files, settings, and how Claude Code differs from Copilot Chat with Claude model — see [vscode-claude-modes.md](vscode-claude-modes.md).

## Profile Switch Example

```bash
aictl ctx deploy --root . --profile debug
# Creates: investigate.md, trace.md, flame-graph/, azure-monitor in .mcp.json

aictl ctx deploy --root . --profile docs
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
parent PID is 1 after the foreground session ends. The `aictl daemon serve`
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

## Local state and processes (checked 2026-11-05)

Claude Code CLI 2.1.299 (`~/.local/share/claude/versions/`), VS Code extension 2.1.175, Desktop-bundled 2.1.317.
`CLAUDE_CONFIG_DIR` relocates `~/.claude` (`platforms.claude_global_dir()` honours it).

New or renamed under `~/.claude/` in 2.1.x: `daemon/` and `daemon.log` (background daemon),
`jobs/<id>/{state.json,timeline.jsonl}`, `sessions/<pid>.json` (live session registry),
`remote-settings.json` and `policy-limits.json` (account-synced), `state/`, `uploads/`, `downloads/`
(replaces `download/`), `plugins/{installed_plugins.json,marketplaces,cache,data}`, and transcripts at
`projects/<project>/<session-uuid>.jsonl`. Absent in 2.1.x: `statsig/`, `todos/`, `tasks/`, `image-cache/`, `telemetry/`.

Three binaries exist with different parents: the CLI (`.../claude/versions/<ver>`), the VS Code extension
(`~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude`) and Claude Desktop's copy
(`~/Library/Application Support/Claude/claude-code/<ver>/<hash>/claude.app/Contents/MacOS/claude`, started
through `Claude.app/Contents/Helpers/disclaimer`). The Desktop-bundled one must classify as `claude-code`,
so its row precedes the Claude Desktop row.
