# The `.context.toml` File Format

## Overview

`.context.toml` is a single source of intent — what the AI should know, in human language — with multiple realizations per tool. Define your context once; `aictl deploy` translates it into native files for each target tool. Files are committed to git and reviewed in PRs. The format is standard TOML (RFC 9200 / TOML v1.0).

## Location

Place in any directory that represents a scope:

```
my-project/
├── .context.toml              ← root scope
├── services/
│   ├── api/.context.toml      ← api scope
│   └── worker/.context.toml
└── infra/.context.toml
```

## Table Grammar

```toml
[instructions]                          # Instructions (profile keys → multi-line strings)
  base = '''...'''                      # always-on instructions
  debug = '''...'''                     # profile-specific instructions
  docs = '''...'''                      # profile-specific instructions
  any-profile-name = '''...'''          # any profile name works

[commands.<profile>.<name>]             # Slash command
  content = '''...'''

[agents.<profile>.<name>]              # Copilot agent
  content = '''...'''

[skills.<profile>.<name>]              # Skill
  content = '''...'''

[mcp.<profile>.<name>]                 # MCP server (native TOML keys)
  type = "http"
  url = "https://..."

[hooks.<profile>]                      # Lifecycle hooks (EventName = 'JSON string')
  PreToolUse = '[{"matcher": "Bash", ...}]'

[lsp.<profile>.<name>]                 # LSP server (native TOML keys)
  command = "gopls"
  args = ["serve"]

[settings.<profile>]                   # Setting key/value pairs
  key = "value"

[permissions]                          # Permission patterns
  patterns = [...]

[env.<profile>]                        # Environment variables
  KEY = "value"

[ignores]                              # Tool-specific ignore patterns
  patterns = [...]

[memory]                               # Memory hints
  debug = '''...'''

[plugin]                               # Plugin metadata
  name = "..."

[inherit]                              # Inheritance directives
  parent = ["mcp", "commands"]
  recursive = ["skills"]

exclude = [...]                        # Capability exclusions (top-level array)
```

## Full Example

```toml
[instructions]
base = '''
# My Service
REST API backed by PostgreSQL. Deployed on Kubernetes.
Build: make build. Test: make test.
CI: GitHub Actions (.github/workflows/ci.yml).
'''

debug = '''
Logs: kubectl logs -l app=my-service -f
DB connection string in K8s secret: my-service-db
Common issue: connection pool exhaustion under load.
'''

docs = '''
API docs auto-generated from OpenAPI spec.
Architecture diagrams use Mermaid.
Audience: new team members.
'''

review = '''
All endpoints must have rate limiting.
DB migrations must be backward-compatible.
No raw SQL — use the query builder.
'''

[commands._always.status]
content = '''
Show service health: kubectl get pods, check /health endpoint.
'''

[commands.debug.investigate]
content = '''
Investigate $ARGUMENTS:
1. Check pod logs for errors
2. Query Grafana for anomalies
3. Check recent deployments
4. Propose root cause
'''

[commands.docs.gen-api-docs]
content = '''
Regenerate API docs from OpenAPI spec at $ARGUMENTS.
'''

[agents.debug.debugger]
content = '''
You are a debugging specialist. Use kubectl and Grafana MCP tools.
Approach: reproduce, isolate, trace, diagnose, fix.
'''

[skills.debug.k8s-diagnostics]
content = '''
# Kubernetes Diagnostics
1. kubectl get pods -o wide
2. kubectl describe pod <name>
3. kubectl logs <name> --previous
4. Check resource limits and OOMKilled events
'''

[mcp._always.github]
type = "http"
url = "https://api.githubcopilot.com/mcp/"

[mcp.debug.grafana]
command = "npx"
args = ["-y", "@grafana/mcp-server"]

[hooks._always]
PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/block-rm.sh"}]}]'

[hooks.debug]
Stop = '[{"hooks": [{"type": "agent", "prompt": "Run make test and confirm all tests pass", "timeout": 120}]}]'

[lsp._always.gopls]
command = "gopls"
args = ["serve"]
extensionToLanguage = { ".go" = "go" }

[memory]
debug = '''
The connection pool issue was traced to missing connection timeouts.
Always check pg_stat_activity when investigating DB issues.
'''

[inherit]
recursive = ["skills"]

exclude = [
  "commands.debug.old-investigate",
]
```

## Scoping Rules

**Instructions** (`[instructions]` keys) — every `.context.toml` in the subtree generates scoped native files at its directory level.

**Capabilities** (`[commands.*]`, `[agents.*]`, `[skills.*]`, `[mcp.*]`) — only the **root** `.context.toml` contributes these. Sub-directory capabilities exist in the file but are dormant unless that directory becomes root.

**Root shifts with context.** If you run `aictl deploy --root services/api/`, then `services/api/.context.toml` is root and its capabilities are active. The parent `my-project/.context.toml` capabilities are invisible.

## Inheritance

In the `[inherit]` table:

```toml
[inherit]
parent = ["mcp", "commands"]    # pull parent's MCP and commands into this scope
recursive = ["skills"]           # pull all children's skills up to root
```

`parent` — a child scope declares it wants to contribute its capabilities to the root. Only works when the parent directory is root.

`recursive` — the root declares it wants to aggregate capabilities from all children. Specified in the root `.context.toml`.

Without `[inherit]`, only root's own capabilities are active.

## Exclusions

The `exclude` top-level array blocks capabilities by their dotted key:

```toml
exclude = [
  "commands.debug.old-investigate",
  "mcp.debug.deprecated-server",
  "skills._always.unused-skill",
]
```

Format: `type.profile.name` matching the table path.

## Hook Events Reference

Hooks run at specific points in the Claude Code lifecycle. Each hook is defined in a `[hooks.<profile>]` table where `<profile>` is a profile name or `_always`. Keys are event names and values are JSON strings containing arrays of hook group objects.

### Hook Types

| Type | Description |
|------|-------------|
| `command` | Runs a shell command. Fields: `command` (string). |
| `http` | Sends an HTTP request. Fields: `url`, `headers` (object), `allowedEnvVars` (array). |
| `prompt` | Invokes an LLM to evaluate. Fields: `prompt` (string), `timeout` (seconds). |

### Hook Group Structure

Each hook group is an object with an optional `matcher` (filters by tool name for tool-related events) and a `hooks` array:

```json
[{"matcher": "Bash", "hooks": [{"type": "command", "command": "echo 'before bash'"}]}]
```

When no `matcher` is needed, omit it:

```json
[{"hooks": [{"type": "command", "command": "echo 'fired'"}]}]
```

### Supported Events

#### PreToolUse

Runs before a tool is executed. The `matcher` field filters by tool name (`Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, etc.).

```toml
[hooks._always]
PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/audit-bash.sh"}]}]'
```

#### PostToolUse

Runs after a tool completes. Same `matcher` filtering as PreToolUse.

```toml
[hooks._always]
PostToolUse = '[{"matcher": "Write", "hooks": [{"type": "command", "command": ".claude/hooks/lint-written-file.sh"}]}]'
```

#### Stop

Runs when the agent stops (session end).

```toml
[hooks.debug]
Stop = '[{"hooks": [{"type": "command", "command": "make test"}]}]'
```

#### SessionStart

Runs when a session begins.

```toml
[hooks._always]
SessionStart = '[{"hooks": [{"type": "command", "command": ".claude/hooks/load-env.sh"}]}]'
```

#### SessionEnd

Runs when a session ends.

```toml
[hooks._always]
SessionEnd = '[{"hooks": [{"type": "http", "url": "https://hooks.example.com/session-end", "headers": {"Authorization": "Bearer $TOKEN"}, "allowedEnvVars": ["TOKEN"]}]}]'
```

#### UserPromptSubmit

Runs when a user submits a prompt.

```toml
[hooks._always]
UserPromptSubmit = '[{"hooks": [{"type": "command", "command": ".claude/hooks/log-prompt.sh"}]}]'
```

#### PermissionRequest

Runs when a permission is requested.

```toml
[hooks._always]
PermissionRequest = '[{"hooks": [{"type": "command", "command": ".claude/hooks/auto-approve.sh"}]}]'
```

#### SubagentStart

Runs when a sub-agent starts.

```toml
[hooks._always]
SubagentStart = '[{"hooks": [{"type": "command", "command": "echo '\''subagent started'\''"}]}]'
```

#### SubagentStop

Runs when a sub-agent stops.

```toml
[hooks._always]
SubagentStop = '[{"hooks": [{"type": "command", "command": ".claude/hooks/collect-subagent-results.sh"}]}]'
```

#### TeammateIdle

Runs when a teammate agent becomes idle (agent teams).

```toml
[hooks._always]
TeammateIdle = '[{"hooks": [{"type": "command", "command": ".claude/hooks/reassign-work.sh"}]}]'
```

#### TaskCompleted

Runs when a task completes (agent teams).

```toml
[hooks._always]
TaskCompleted = '[{"hooks": [{"type": "http", "url": "https://hooks.example.com/task-done"}]}]'
```

#### ConfigChange

Runs when configuration changes.

```toml
[hooks._always]
ConfigChange = '[{"hooks": [{"type": "command", "command": ".claude/hooks/validate-config.sh"}]}]'
```

#### WorktreeCreate

Runs when a git worktree is created.

```toml
[hooks._always]
WorktreeCreate = '[{"hooks": [{"type": "command", "command": ".claude/hooks/setup-worktree.sh"}]}]'
```

#### WorktreeRemove

Runs when a git worktree is removed.

```toml
[hooks._always]
WorktreeRemove = '[{"hooks": [{"type": "command", "command": ".claude/hooks/cleanup-worktree.sh"}]}]'
```

#### PreCompact

Runs before context compaction.

```toml
[hooks._always]
PreCompact = '[{"hooks": [{"type": "command", "command": ".claude/hooks/save-context-snapshot.sh"}]}]'
```

#### PostCompact

Runs after context compaction.

```toml
[hooks._always]
PostCompact = '[{"hooks": [{"type": "command", "command": ".claude/hooks/verify-context.sh"}]}]'
```

#### Elicitation

Runs when an elicitation is requested.

```toml
[hooks._always]
Elicitation = '[{"hooks": [{"type": "command", "command": ".claude/hooks/log-elicitation.sh"}]}]'
```

### Quality Gates Pattern

A common pattern for agent teams: use `TeammateIdle` to run linters before
the teammate picks up new work, and `TaskCompleted` to verify the task result.
This ensures every unit of work passes quality checks.

```toml
[hooks._always]
TeammateIdle = '[{"hooks": [{"type": "command", "command": "npm run lint -- --quiet"}]}]'
TaskCompleted = '[{"hooks": [{"type": "agent", "prompt": "Run the full test suite. If any test fails, report which test and why. Do not mark the task as done until all tests pass.", "timeout": 300}]}]'
```

Combine with `PreToolUse` to block dangerous operations and `Stop` to run
a final check before the session ends:

```toml
[hooks._always]
PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/block-rm.sh"}]}]'
Stop = '[{"hooks": [{"type": "agent", "prompt": "Run tests and confirm all pass before ending.", "timeout": 120}]}]'
```
