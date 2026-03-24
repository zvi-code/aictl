# aictl — AI Context from `.aictx` Files

Drop `.context.aictx` files in your code repo. Run `aictl deploy`. Get native context files for Claude Code, GitHub Copilot, and Cursor — including hooks, LSP servers, and MCP configs. Already have native files? Run `aictl import` to generate `.aictx` from them. Want to distribute your context as a Claude Code plugin? Run `aictl plugin build`.

## How It Works

### Deploy: `.aictx` → native tool files

```
my-project/
├── .context.aictx                    ← root: instructions + commands + skills + MCP + hooks + LSP
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
├── .lsp.json                         ← LSP servers (for plugins)
├── .claude/settings.local.json       ← lifecycle hooks
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

### Plugin: package as a Claude Code plugin

Build a distributable Claude Code plugin from your `.aictx` files:

```bash
aictl plugin build --root my-project/ --name my-plugin --profile debug
```

Generates a complete plugin structure:

```
my-project/plugin/
├── .claude-plugin/plugin.json   ← manifest
├── commands/investigate.md      ← slash commands
├── skills/flame-graph/SKILL.md  ← agent skills
├── agents/debugger.md           ← custom agents
├── hooks/hooks.json             ← lifecycle hooks
├── .mcp.json                    ← MCP servers
├── .lsp.json                    ← LSP servers
└── settings.json                ← default agent
```

Test locally with `claude --plugin-dir ./plugin`, then submit to the plugin marketplace.

### Status: see all AI tool resources

See every file, memory entry, MCP server, and running process across all tools in one view:

```bash
aictl status --root my-project/
```

```
──────────────────────────────────────────────────────
  Claude Code
──────────────────────────────────────────────────────

  Files:
    [instructions] CLAUDE.md  1.2KB  ~300 tok
    [settings] .claude/settings.json  1.0KB  ~252 tok
    [memory (index)] ~/.claude/projects/.../memory/MEMORY.md  114B  ~28 tok

  Memory:
    140 tokens loaded every session
    2 file(s) in /Users/you/.claude/projects/.../memory

  MCP Servers:
    filesystem — npx -y @modelcontextprotocol/server-filesystem /tmp
```

Add `--processes` to detect running tool processes via `ps`, and `--backtrace PID` to sample a stack trace:

```bash
aictl status --processes
aictl status --backtrace 12345
```

Supports Claude Code, GitHub Copilot, Cursor, and Windsurf. Use `--tool claude` to filter to one tool, or `--json` for machine-readable output.

### Dashboard: live terminal UI

Launch a live-updating terminal dashboard that monitors all AI tool resources, processes, MCP servers, and agent memory in real time:

```bash
aictl dashboard --root my-project/
```

The dashboard refreshes every 5 seconds (configurable with `--interval`) and shows stat cards, per-tool panels with sparkline CPU/MEM history, and tabbed views for processes, files, MCP server status, and agent memory.

Keybindings: `r` refresh now, `p` toggle processes, `f` toggle files, `m` toggle memory, `q` quit.

Requires the `textual` extra:

```bash
pip install -e ".[dashboard]"
```

### HTML report: static snapshot

Generate a self-contained HTML report with file content previews, MCP connectivity status, and agent memory browser:

```bash
aictl status --html -o report.html --root my-project/
```

The report includes expandable file previews (last 5 lines shown, click to expand full content), colour-coded MCP server status, and tabbed navigation between AI Tools, MCP Servers, and Agent Memory views. Open the file in any browser — no dependencies, dark/light mode adapts automatically.

You can also pipe to stdout: `aictl status --html > report.html`.

## Install

The recommended way to install `aictl` as a global CLI tool is with [pipx](https://pipx.pypa.io), which keeps it isolated without requiring a virtual environment:

```bash
pipx install .               # core (CLI, deploy, import, status)
pipx install ".[dashboard]"  # first install — includes textual for the live TUI dashboard
```

If aictl is already installed and you want to add dashboard support:

```bash
# Inject textual into aictl's existing pipx environment
~/.local/pipx/venvs/aictl/bin/python -m pip install 'textual>=0.79'
```

If you don't have `pipx`:

```bash
brew install pipx && pipx ensurepath   # macOS
# or: pip install pipx
```

For development (editable install inside a venv):

```bash
pip install -e .             # only available within the active venv
pip install -e ".[dashboard]"
```

## Commands

| Command | What it does |
|---------|-------------|
| `aictl scan --root .` | Discover `.aictx` files, show scope map |
| `aictl deploy --root . --profile debug` | Scan → resolve → emit → cleanup → swap memory |
| `aictl import --root .` | Read native tool files → generate `.context.aictx` |
| `aictl plugin build --root . --name my-plugin` | Package `.aictx` as a Claude Code plugin |
| `aictl status --root .` | Show all resources: files, memory, MCP servers, processes |
| `aictl status --processes` | Include running processes (Claude, Copilot, Cursor, Windsurf) |
| `aictl status --html -o report.html` | Generate self-contained HTML report |
| `aictl status --backtrace PID` | Sample a process stack trace |
| `aictl dashboard --root .` | Launch live terminal dashboard |
| `aictl memory show --root .` | Show Claude Code auto-memory content |
| `aictl memory stashes --root .` | List per-profile memory stashes |

### Import options

| Option | Description |
|--------|-------------|
| `--prefer claude\|copilot\|cursor` | Preferred source when tools have different content for the same scope |
| `--profile NAME` | Override auto-detected profile name |
| `--from claude,copilot,cursor` | Comma-separated list of importers to read from (default: all) |
| `--dry-run` | Show what would be written without writing |

### Plugin build options

| Option | Description |
|--------|-------------|
| `--name NAME` | Plugin name (required, used as namespace for skills) |
| `--profile NAME` | Active profile to include |
| `--output DIR` | Output directory (default: `<root>/plugin`) |
| `--description TEXT` | Plugin description |
| `--version X.Y.Z` | Plugin version (default: 1.0.0) |
| `--author NAME` | Author name |
| `--dry-run` | Show what would be written without writing |

### Status options

| Option | Description |
|--------|-------------|
| `--tool claude\|copilot\|cursor\|windsurf\|aictl` | Show resources for one tool only |
| `--processes` | Detect and display running processes for each tool |
| `--backtrace PID` | Sample a process stack trace (macOS `sample`, Linux `eu-stack`/`gdb`) |
| `--json` | Output as JSON for scripting |
| `--html` | Generate self-contained HTML report to stdout |
| `-o FILE` | Write HTML report to file instead of stdout |

### Dashboard options

| Option | Description |
|--------|-------------|
| `--root DIR` | Root directory to monitor (default: `.`) |
| `--interval SECS` | Refresh interval in seconds (default: `5`) |

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/aictx-format.md](docs/aictx-format.md) | Complete `.aictx` format reference with examples |
| [docs/architecture.md](docs/architecture.md) | How scanning, resolving, emitting, and memory swap work |
| [docs/tool-claude-code.md](docs/tool-claude-code.md) | Claude Code: all generated and external files |
| [docs/tool-copilot.md](docs/tool-copilot.md) | Copilot CLI + VS Code: instructions, agents, prompts |
| [docs/tool-cursor.md](docs/tool-cursor.md) | Cursor: .mdc rules, glob scoping, MCP |
| [docs/memory.md](docs/memory.md) | Memory swap per (root, profile), outside-repo files |
