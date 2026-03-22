# AI Tools — Operational Observability Guide

> How to observe, monitor, and understand what AI coding tools are doing
> in real time. For each tool: what events it exposes, what context it
> loads, what resources it consumes, and how to detect its current state.
> Companion to the monitoring dossiers — focused on "how to watch" rather
> than "what files exist". Compiled March 2026.

## Changelog

- 2026-03-27: Initial creation — Claude Code (claude-code) and Claude Desktop (claude-desktop)

---

## Cross-tool Observability Matrix

| Signal | Claude Code | Claude Desktop | Cursor | Windsurf | GitHub Copilot |
|--------|-------------|----------------|--------|----------|----------------|
| Named events/hooks | 25 events | none | none | none | none |
| Session tracking | yes (JSONL transcripts, `--resume`) | server-side | local SQLite | local DB | none |
| Token usage exposed | yes (OTel metrics, `/cost`, API response) | no | partial (status bar) | no | no |
| Cost tracking | yes (OTel USD metric, `/cost`) | no | no | no | no |
| Context queryable | yes (`/context` command) | no | no | no | no |
| Real-time status | yes (`stream-json`, `statusLine`) | no | no | no | no |
| Process detection | `^claude$\|claude -p` | `Claude$\|Claude.exe` | `Cursor$\|Cursor Helper` | `Windsurf$` | `copilot-agent` |
| OpenTelemetry | full (8 metrics, 5 events) | none | none | none | none |
| Compaction signals | yes (PreCompact/PostCompact hooks) | none | none | none | none |
| Memory/instruction tracking | yes (InstructionsLoaded hook) | none | none | none | none |
| WIP detection | process state, task tools, `stream-json` | none | none | none | none |
| Resource consumption | per-process memory, token counting | Electron memory only | Electron memory only | Electron memory only | VS Code extension memory |

---

## 1. Claude Desktop (claude-desktop)

### Observability Summary

Claude Desktop is a closed-source Electron app with minimal observability:

- **Process detection** via `ps`/Task Manager (`Claude$` on macOS, `Claude.exe` on Windows)
- **Memory monitoring** via OS tools (Electron main + renderer processes)
- **Network traffic** to `api.anthropic.com` (interceptable via proxy — see traffic monitoring doc)
- **MCP server subprocess monitoring** — child processes spawned per configured MCP server
- **No hook system**, no events, no telemetry export
- **No session transcript access** (server-side storage only)

### What You Can Monitor

| Signal | Method | Detail Level |
|--------|--------|--------------|
| Running/not running | Process list | Binary |
| Memory usage | OS activity monitor | Per-process |
| API calls | HTTPS proxy/mitmproxy | Full request/response (with cert pinning bypass) |
| MCP server health | Child process monitoring | PID, stdout/stderr |
| Crashes | macOS Console.app / Windows Event Log | Stack traces |

### What You Cannot Monitor

- Token usage per conversation
- Context window fullness
- Which files/tools are being used
- Session history (stored server-side)
- Model selection changes
- Any internal state transitions

---

## 2. Claude Code (claude-code)

### 2.1 OpenTelemetry Integration

**Enable**: Set `CLAUDE_CODE_ENABLE_TELEMETRY=1`

**Service attributes**:

- `service.name`: `claude-code`
- `service.version`: current version
- `os.type` (`linux`/`darwin`/`windows`), `os.version`, `host.arch` (`amd64`/`arm64`)
- `wsl.version` (if WSL)
- Meter name: `com.anthropic.claude_code`

#### Metrics (time series)

| Metric | Unit | Key Attributes |
|--------|------|----------------|
| `claude_code.session.count` | count | standard |
| `claude_code.lines_of_code.count` | count | `type`: added/removed |
| `claude_code.pull_request.count` | count | standard |
| `claude_code.commit.count` | count | standard |
| `claude_code.cost.usage` | USD | `model` |
| `claude_code.token.usage` | tokens | `type`: input/output/cacheRead/cacheCreation; `model` |
| `claude_code.code_edit_tool.decision` | count | `tool_name`, `decision` (accept/reject), `source`, `language` |
| `claude_code.active_time.total` | seconds | `type`: user/cli |

**Standard attributes on ALL metrics**: `session.id`, `app.version`, `organization.id`, `user.account_uuid`, `user.account_id`, `user.id`, `user.email`, `terminal.type`

#### Events (via OTel logs)

| Event Name | Key Attributes |
|------------|----------------|
| `claude_code.user_prompt` | `prompt_length`, `prompt` (if `OTEL_LOG_USER_PROMPTS=1`) |
| `claude_code.tool_result` | `tool_name`, `success`, `duration_ms`, `error`, `decision_type`, `decision_source`, `tool_result_size_bytes`, `tool_parameters` (if `OTEL_LOG_TOOL_DETAILS=1`), `tool_input` (if enabled) |
| `claude_code.api_request` | `model`, `cost_usd`, `duration_ms`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`, `speed` (fast/normal) |
| `claude_code.api_error` | `model`, `error`, `status_code`, `duration_ms`, `attempt`, `speed` |
| `claude_code.tool_decision` | `tool_name`, `decision`, `source` |

**Correlation**: `prompt.id` (UUID v4) links all events from processing a single user prompt.

**Decision sources**: `config`, `hook`, `user_permanent`, `user_temporary`, `user_abort`, `user_reject`

#### Exporter configuration

| Env Var | Default | Purpose |
|---------|---------|---------|
| `OTEL_METRICS_EXPORTER` | - | `otlp`, `prometheus`, `console` |
| `OTEL_LOGS_EXPORTER` | - | `otlp`, `console` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | - | `grpc`, `http/json`, `http/protobuf` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | - | Collector URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | - | Auth headers |
| `OTEL_METRIC_EXPORT_INTERVAL` | 60000ms | Metric flush interval |
| `OTEL_LOGS_EXPORT_INTERVAL` | 5000ms | Log/event flush interval |
| `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE` | delta | `delta` or `cumulative` |
| `OTEL_RESOURCE_ATTRIBUTES` | - | Custom resource attributes |
| `OTEL_METRICS_INCLUDE_SESSION_ID` | true | Include session ID |
| `OTEL_METRICS_INCLUDE_VERSION` | false | Include app version |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | true | Include account UUID |

Per-signal overrides: `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL`, etc.

mTLS: `OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY`, `OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE`

### 2.2 Hook System as Event Bus (25 events)

The hook system is the primary event bus for Claude Code monitoring. Each event fires a configured handler (command, http, prompt, or agent).

**Common hook input fields** (JSON via stdin for command handlers, POST body for HTTP):

```json
{
  "session_id": "uuid",
  "transcript_path": "~/.claude/projects/.../transcript.jsonl",
  "cwd": "/path/to/project",
  "permission_mode": "default|plan|acceptEdits|auto|dontAsk|bypassPermissions",
  "hook_event_name": "EventName"
}
```

#### Session lifecycle events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| SessionStart | Session starts or resumes | No | startup/resume/clear/compact |
| SessionEnd | Session ends | No | clear/resume/logout/prompt_input_exit/bypass_permissions_disabled/other |
| InstructionsLoaded | CLAUDE.md/rules loaded | No | session_start/nested_traversal/path_glob_match/include/compact |

#### User interaction events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| UserPromptSubmit | User sends a prompt | Yes (blocks prompt) | None |

#### Tool execution events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| PreToolUse | Before tool executes | Yes (blocks tool) | tool name regex |
| PostToolUse | After tool succeeds | No (stderr shown to Claude) | tool name regex |
| PostToolUseFailure | After tool fails | No | tool name regex |
| PermissionRequest | Tool needs permission | Yes (denies) | tool name regex |

#### Notification events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| Notification | UI notification | No | permission_prompt/idle_prompt/auth_success/elicitation_dialog |
| FileChanged | Monitored file changes | No | filename basename |
| CwdChanged | Working directory changes | No | None |
| ConfigChange | Settings file changes | Yes (blocks change, except policy) | user_settings/project_settings/local_settings/policy_settings/skills |

#### Agent/Team events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| SubagentStart | Subagent spawns | No | agent type (Bash/Explore/Plan/custom) |
| SubagentStop | Subagent finishes | Yes (prevents stopping) | agent type |
| TeammateIdle | Teammate goes idle | Yes (continues) | None |
| TaskCreated | Task created | Yes (prevents creation) | None |
| TaskCompleted | Task completed | Yes (prevents completion) | None |

#### Compaction events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| PreCompact | Before compaction | No | manual/auto |
| PostCompact | After compaction | No | manual/auto |

#### Completion events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| Stop | Claude finishes response | Yes (prevents stopping) | None |
| StopFailure | Turn ends due to error | No | rate_limit/authentication_failed/billing_error/invalid_request/server_error/max_output_tokens/unknown |

#### MCP events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| Elicitation | MCP server requests input | Yes (denies) | MCP server name |
| ElicitationResult | User responds to MCP | Yes (blocks response) | MCP server name |

#### Worktree events

| Event | Fires When | Can Block | Matcher |
|-------|-----------|-----------|---------|
| WorktreeCreate | Worktree being created | Yes (fails creation) | None |
| WorktreeRemove | Worktree being removed | No | None |

### 2.3 Context Window Observability

#### /context command

Shows current context window usage including:

- System prompt tokens (~4,200)
- Auto memory tokens (~680)
- Environment info tokens (~280)
- MCP tool tokens
- Skill description tokens (~450, NOT re-injected after compact)
- User CLAUDE.md tokens
- Project CLAUDE.md tokens
- Conversation history tokens
- Total usage vs. capacity

#### Token cost reference (per component)

| Component | Typical Tokens | Loading |
|-----------|---------------|---------|
| System prompt | ~4,200 | Always (hidden) |
| Auto memory (MEMORY.md) | ~680 | Session start (first 200 lines/25KB) |
| Environment info | ~280 | Always |
| MCP tools (deferred names) | ~120 | Session start |
| Skill descriptions | ~450 | Session start (lost after compact) |
| ~/.claude/CLAUDE.md | ~320 | Always, survives compact |
| Project CLAUDE.md | ~1,800 (varies) | Always, survives compact |
| .claude/rules/*.md | 50-500 each | Path-triggered or session start |
| MCP server tools | 200-2,000 per server | On connect |
| File reads | 1,100-2,400 per file | On demand |
| Tool results | ~1 token per 4 chars | On use |

**Startup overhead**: ~7,850 tokens minimum before any user interaction.

#### Compaction

- **Auto-trigger**: ~95% of context capacity (configurable via `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`)
- **Manual**: `/compact [focus topic]`
- **What survives**: CLAUDE.md (re-read from disk), auto memory, key code snippets
- **What's lost**: older tool outputs, detailed early-conversation instructions, skill descriptions
- **Hooks**: PreCompact, PostCompact

### 2.4 Session Tracking

- **Storage**: JSONL transcript files at `~/.claude/projects/<project>/<session-id>/transcript.jsonl`
- **Retention**: 30 days default (`cleanupPeriodDays` setting; 0 = no persistence)
- **Resume**: `claude -c` (latest), `claude -r <id/name>` (specific), `claude --resume` (picker)
- **Naming**: `--name` at start, `/rename` mid-session, AI-generated titles
- **Fork**: `--fork-session` branches off with new ID preserving history
- **Session ID**: Valid UUID, stable across resumes

### 2.5 Resource Consumption Signals

#### Token usage

- **In-session**: `/cost` command shows cumulative API token usage
- **OTel metric**: `claude_code.token.usage` with type=input/output/cacheRead/cacheCreation, model dimension
- **OTel metric**: `claude_code.cost.usage` in USD with model dimension
- **API response**: Each streamed response includes usage block with input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens
- **Rate limits**: Available in statusLine scripts as `rate_limits` field (5h and 7d windows with used_percentage and resets_at)

#### Process resources

- **Memory**: Main process 150-400MB, subagent ~45MB each, MCP server 15-50MB each, headless browser 200-400MB
- **Detection**: `ps aux | grep -E '^claude$|claude -p|claude --print'`
- **CLAUDECODE=1** env var set in spawned shells (detection flag)
- **Known leaks**: Subagent accumulation (10+ GB), MCP server orphaning, headless browser persistence

#### Disk

- Session transcripts grow with conversation length
- Auto-memory files accumulate per project
- Cache in `~/.claude/statsig/`
- Temp files in `/tmp/claude/` or `$CLAUDE_CODE_TMPDIR/claude/`

### 2.6 Work-in-Progress Detection

- **Process state**: Running `claude` process = active session
- **stream-json output**: Real-time event stream in print mode showing tool calls, edits, results
- **Task tools**: TaskGet/TaskList expose current task queue in agent teams
- **Subagent processes**: `claude --print --resume` processes indicate active subagents
- **Worktree directories**: `<repo>/.claude/worktrees/<name>/` indicates active worktree operations
- **Lock files**: `~/.claude/ide/<lockfile>` indicates active IDE integration
- **StatusLine script**: Custom status bar shows current state, rate limits, model

### 2.7 Behavioral Indicators

- **Active model**: `--model` flag, `model` setting, `ANTHROPIC_MODEL` env var
- **Permission mode**: Visible in hook input JSON, cycle with Shift+Tab
- **Effort level**: `--effort` flag, `effortLevel` setting, `CLAUDE_CODE_EFFORT_LEVEL` env var
- **Active hooks**: `hooks` in settings.json, `disableAllHooks` flag
- **Connected MCP servers**: `/mcp` command in session, `claude mcp list` from CLI
- **Fast mode**: `/fast` toggle, `fastModePerSessionOptIn` setting
- **Plan mode**: Active plan in `~/.claude/plans/` (or `plansDirectory`)
- **Bare mode**: `--bare` flag (skips hooks, plugins, MCP, CLAUDE.md)
- **Sandbox active**: `sandbox.enabled` in settings
