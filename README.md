# aictl — AI Context from `.aictx` Files

Drop `.context.aictx` files in your code repo. Run `aictl deploy`. Get native context files for Claude Code, GitHub Copilot, and Cursor. Already have native files? Run `aictl import` to generate `.aictx` from them.

## How It Works

### Deploy: `.aictx` → native tool files

```
my-project/
├── .context.aictx                    ← root: instructions + commands + skills + MCP
├── services/ingestion/.context.aictx ← sub-scope: scoped instructions
└── services/query-engine/.context.aictx
```

```bash
aictl deploy --root my-project/ --profile debug
```

Generates all native files at the root:

```
my-project/
├── CLAUDE.md                         ← Claude Code base instructions
├── CLAUDE.local.md                   ← profile + agent overlay
├── .claude/rules/services-ingestion.md  ← scoped (glob-matched)
├── .claude/commands/investigate.md   ← slash command
├── .claude/skills/flame-graph/SKILL.md
├── .mcp.json                         ← MCP servers
├── .github/copilot-instructions.md   ← Copilot repo-wide
├── .github/agents/debugger.agent.md  ← Copilot agent
├── .github/prompts/investigate.prompt.md ← VS Code prompt file
├── .cursor/rules/base.mdc            ← Cursor rule
├── .cursor/rules/profile-active.mdc
├── AGENTS.md                         ← Copilot/Cursor profile
└── .ai-deployed/manifest.json        ← tracks files for cleanup
```

Switch profile — old files removed, new files created, memory swapped:

```bash
aictl deploy --root my-project/ --profile docs
```

### Import: native tool files → `.aictx`

Already have `CLAUDE.md`, `.github/copilot-instructions.md`, or `.cursor/rules/`? Import them into `.aictx` format:

```bash
aictl import --root my-project/
```

Reads native files from all detected tools and generates `.context.aictx` files at each relevant directory level:

```
my-project/
├── .context.aictx                    ← reconstructed from CLAUDE.md, copilot-instructions.md, etc.
├── services/ingestion/.context.aictx ← reconstructed from scoped rules
└── services/query-engine/.context.aictx
```

Works with both aictl-generated files (strips deployment markers) and hand-written files. When multiple tools have overlapping content, use `--prefer` to pick the authoritative source:

```bash
aictl import --root . --prefer claude
```

Running `aictl deploy` on the imported `.aictx` files reproduces the original native files.

## Install

```bash
pip install -e .
```

## Commands

| Command | What it does |
|---------|-------------|
| `aictl scan --root .` | Discover `.aictx` files, show scope map |
| `aictl deploy --root . --profile debug` | Scan → resolve → emit → cleanup → swap memory |
| `aictl import --root .` | Read native tool files → generate `.context.aictx` |
| `aictl memory show --root .` | Show Claude Code auto-memory content |
| `aictl memory stashes --root .` | List per-profile memory stashes |

### Import options

| Option | Description |
|--------|-------------|
| `--prefer claude\|copilot\|cursor` | Preferred source when tools have different content for the same scope |
| `--profile NAME` | Override auto-detected profile name |
| `--from claude,copilot,cursor` | Comma-separated list of importers to read from (default: all) |
| `--dry-run` | Show what would be written without writing |

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/aictx-format.md](docs/aictx-format.md) | Complete `.aictx` format reference with examples |
| [docs/architecture.md](docs/architecture.md) | How scanning, resolving, emitting, and memory swap work |
| [docs/tool-claude-code.md](docs/tool-claude-code.md) | Claude Code: all generated and external files |
| [docs/tool-copilot.md](docs/tool-copilot.md) | Copilot CLI + VS Code: instructions, agents, prompts |
| [docs/tool-cursor.md](docs/tool-cursor.md) | Cursor: .mdc rules, glob scoping, MCP |
| [docs/memory.md](docs/memory.md) | Memory swap per (root, profile), outside-repo files |
