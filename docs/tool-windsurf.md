# Windsurf

Codeium's Windsurf IDE (Cascade agent + autocomplete). aictl supports
deploy and import for instructions and MCP servers; capabilities
(commands / agents / skills) are dropped by design because Windsurf has
no surface for them.

## Generated Files

| File | Source | Notes |
|------|--------|-------|
| `.windsurfrules` | Root `[instructions.base]` + active `[instructions.<profile>]` | Legacy single-file project rules, always loaded |
| `.windsurf/rules/<scope>.md` | Sub-scope `[instructions]` | Modern per-scope rules (Wave 8+); `paths:` in YAML frontmatter |
| `.windsurf/mcp.json` | `[mcp.*]` | Per-project MCP server config |

## MDC-style Frontmatter

Sub-scope rules use a small YAML frontmatter Windsurf understands:

```markdown
---
trigger: always
paths:
  - "services/api/**"
---

Body of the rule…
```

aictl writes both the `trigger` and the `paths` glob automatically.

## What Windsurf Doesn't Have

- **Commands / Agents / Skills** — no equivalent in Windsurf. Capability
  sections in `.context.toml` are silently skipped for the `windsurf`
  emitter. `aictl ctx validate` emits a compatibility warning so the
  drop is visible.
- **Hooks** — Windsurf has no hook system. Hooks sections are skipped.
- **LSP / settings / permissions** — not modeled in Windsurf today.
- **Memory** — Windsurf's Cascade agent maintains its own
  `cascade-memories/` directory in the project root, populated
  automatically. aictl detects its presence but does not manage its
  contents.

## Cascade Agent

Cascade is Windsurf's autonomous coding agent. The aictl dashboard
surfaces the following per-project signals via `_parse_windsurf_config`:

| Signal | Source |
|--------|--------|
| `cascade_legacy_rules` | `.windsurfrules` present |
| `cascade_rules_modern` | any `.windsurf/rules/*.md` present |
| `cascade_rules_count` | count of those modern rule files |
| `cascade_memories` | `cascade-memories/` directory present |
| `cascade_memories_count` | count of files inside it |
| `codeiumignore` | project `.codeiumignore` present |

Global signals:

| Path | Meaning |
|------|---------|
| `~/.codeium/windsurf/memories/global_rules.md` | Global rule file, applied to every project |
| `~/.codeium/windsurf/mcp_config.json` | Global MCP server list (merged with project MCP) |

## Import

```bash
aictl ctx import --from windsurf --root . [--patch]
```

Reads `.windsurfrules` + `.windsurf/rules/*.md` + `.windsurf/mcp.json`
and synthesizes a `.context.toml`. With `--patch`, the existing
`.context.toml` is preserved verbatim and only missing keys are added.

## Deploy

```bash
aictl ctx deploy --root . --profile debug --emit claude,copilot,cursor,windsurf
```

## Known Quirks

- `.windsurfrules` is single-file project rules; `.windsurf/rules/` is
  the modern multi-file API. Both are loaded; rules in the modern
  directory have priority for path-scoped activation.
- Cascade respects `.codeiumignore` (and `~/.codeium/.codeiumignore`
  for enterprise installs) for what it can read or modify.
- The `codeium_language_server` process is shared with the rest of the
  Codeium ecosystem and may persist after Windsurf exits.
