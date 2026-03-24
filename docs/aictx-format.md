# The `.context.aictx` File Format

## Overview

`.context.aictx` is the single source format for all AI context. Files are committed to git and reviewed in PRs. The `.aictx` extension is unrecognized by all AI tools — content only reaches tools after `aictl deploy`.

## Location

Place in any directory that represents a scope:

```
my-project/
├── .context.aictx           ← root scope
├── services/
│   ├── api/.context.aictx   ← api scope
│   └── worker/.context.aictx
└── infra/.context.aictx
```

## Section Grammar

```
[base]                              always-on instructions
[debug]                             profile-specific instructions
[docs]                              profile-specific instructions
[any-profile-name]                  any profile name works

[command:_always:name]              command, all profiles
[command:debug:name]                command, debug only
[agent:_always:name]                Copilot agent, all profiles
[agent:debug:name]                  Copilot agent, debug only
[skill:_always:name]                skill, all profiles
[skill:debug:name]                  skill, debug only

[mcp:_always:name]                  MCP server, all profiles (content: JSON)
[mcp:debug:name]                    MCP server, debug only

[hook:_always:EventName]            lifecycle hook, all profiles (content: JSON)
[hook:debug:EventName]              lifecycle hook, debug only
[lsp:_always:name]                  LSP server, all profiles (content: JSON)
[lsp:debug:name]                    LSP server, debug only

[memory:debug]                      memory hints for profile

[inherit]                           inheritance directives
[exclude]                           exclude capabilities by key
```

## Full Example

```ini
[base]
# My Service
REST API backed by PostgreSQL. Deployed on Kubernetes.
Build: make build. Test: make test.
CI: GitHub Actions (.github/workflows/ci.yml).

[debug]
Logs: kubectl logs -l app=my-service -f
DB connection string in K8s secret: my-service-db
Common issue: connection pool exhaustion under load.

[docs]
API docs auto-generated from OpenAPI spec.
Architecture diagrams use Mermaid.
Audience: new team members.

[review]
All endpoints must have rate limiting.
DB migrations must be backward-compatible.
No raw SQL — use the query builder.

[command:_always:status]
Show service health: kubectl get pods, check /health endpoint.

[command:debug:investigate]
Investigate $ARGUMENTS:
1. Check pod logs for errors
2. Query Grafana for anomalies
3. Check recent deployments
4. Propose root cause

[command:docs:gen-api-docs]
Regenerate API docs from OpenAPI spec at $ARGUMENTS.

[agent:debug:debugger]
You are a debugging specialist. Use kubectl and Grafana MCP tools.
Approach: reproduce, isolate, trace, diagnose, fix.

[skill:debug:k8s-diagnostics]
# Kubernetes Diagnostics
1. kubectl get pods -o wide
2. kubectl describe pod <name>
3. kubectl logs <name> --previous
4. Check resource limits and OOMKilled events

[mcp:_always:github]
{"type": "http", "url": "https://api.githubcopilot.com/mcp/"}

[mcp:debug:grafana]
{"command": "npx", "args": ["-y", "@grafana/mcp-server"]}

[hook:_always:PreToolUse]
[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/block-rm.sh"}]}]

[hook:debug:Stop]
[{"hooks": [{"type": "agent", "prompt": "Run make test and confirm all tests pass", "timeout": 120}]}]

[lsp:_always:gopls]
{"command": "gopls", "args": ["serve"], "extensionToLanguage": {".go": "go"}}

[memory:debug]
The connection pool issue was traced to missing connection timeouts.
Always check pg_stat_activity when investigating DB issues.

[inherit]
recursive: skills

[exclude]
command:debug:old-investigate
```

## Scoping Rules

**Instructions** (`[base]`, `[debug]`, etc.) — every `.aictx` in the subtree generates scoped native files at its directory level.

**Capabilities** (`[command:*]`, `[agent:*]`, `[skill:*]`, `[mcp:*]`) — only the **root** `.aictx` contributes these. Sub-directory capabilities exist in the file but are dormant unless that directory becomes root.

**Root shifts with context.** If you run `aictl deploy --root services/api/`, then `services/api/.context.aictx` is root and its capabilities are active. The parent `my-project/.context.aictx` capabilities are invisible.

## Inheritance

In the `[inherit]` section:

```ini
[inherit]
parent: mcp, commands     # pull parent's MCP and commands into this scope
recursive: skills          # pull all children's skills up to root
```

`parent:` — a child scope declares it wants to contribute its capabilities to the root. Only works when the parent directory is root.

`recursive:` — the root declares it wants to aggregate capabilities from all children. Specified in the root `.aictx`.

Without `[inherit]`, only root's own capabilities are active.

## Exclusions

The `[exclude]` section blocks capabilities by their full key:

```ini
[exclude]
command:debug:old-investigate
mcp:debug:deprecated-server
skill:_always:unused-skill
```

Format: `type:profile:name` matching the section header.
