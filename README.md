# aictl — AI Context from `.aictx` Files

AI coding tools accumulate project knowledge in incompatible, scattered formats — instruction files, MCP configs, hooks, memory entries, agent definitions — each duplicated per tool and invisible to the others. The knowledge is the same; only the packaging differs.

`.aictx` is a single, declarative format for **project-specific and mode-specific AI knowledge**. One file captures everything an AI tool needs to understand about a codebase: instructions, commands, skills, MCP servers, LSP servers, hooks, and scoped rules. Profiles let you maintain distinct operational modes — debugging, documentation, review — each with its own context and agent memory.

**`aictl`** is the control plane that bridges `.aictx` to the real world:

- **Deploy** — translate `.aictx` into native files for Claude Code, GitHub Copilot, Cursor, and Windsurf, with profile-aware memory swap on every switch
- **Import** — reverse-generate `.aictx` templates from existing native files, so nothing already written is lost
- **Audit** — scan a project for every AI resource across all tools: config files, hidden state directories, memory entries, MCP servers, running processes, and their resource consumption
- **Visualize** — a live web dashboard with file content inspection, a terminal TUI, and a self-contained HTML report
- **Package** — bundle `.aictx` into distributable Claude Code plugins

Runs on **macOS, Windows, and Linux**.

<img src="docs/screenshots/tui-image.png" width="100%" alt="Live TUI dashboard showing stat cards, per-tool panels, and sparkline CPU/MEM history">

*Live terminal dashboard — stat cards for total tokens and files across tools, per-tool panels with file lists and MCP server health, sparkline CPU/memory history for every running AI process.*

<img src="docs/screenshots/web-image.png" width="100%" alt="HTML status report with tabbed navigation, file content previews, and MCP server status">

*Self-contained HTML report — tabbed navigation across AI tools, expandable file content previews with token counts, MCP server connectivity status, and agent memory browser. Opens in any browser, no dependencies.*

## Install

Install globally with [pipx](https://pipx.pypa.io) (recommended — keeps `aictl` isolated from other Python projects):

```bash
# Full install: CLI + web dashboard + TUI + process detection
pipx install --force ".[all]"

# Core CLI only (includes web dashboard — no extra deps needed)
pipx install .
```

> **After updating source code**, you must reinstall for the `aictl` command to pick up changes:
> ```bash
> pipx install --force -e ".[all]"   # editable + all extras
> ```

### Get pipx

**macOS**
```bash
brew install pipx && pipx ensurepath
```

**Windows** (PowerShell)
```powershell
python -m pip install pipx
python -m pipx ensurepath
# Then restart your terminal so PATH takes effect
```

**Linux**
```bash
pip install --user pipx && pipx ensurepath
```

### Optional extras

The web dashboard (`aictl serve`) works with zero extra dependencies. For the TUI and process detection:

| Extra | Installs | When to use |
|-------|----------|-------------|
| `.[dashboard]` | `textual` | Terminal TUI dashboard (`aictl dashboard`) |
| `.[processes]` | `psutil` | Cross-platform process detection |
| `.[all]` | both | Recommended for full functionality |

```bash
# Add an extra to an existing install
pipx inject aictl psutil
pipx inject aictl textual
```

> **Without `psutil`:** process detection falls back to `ps` on macOS/Linux and is silently skipped on Windows.

### Development install

```bash
# If using pipx (recommended — keeps the `aictl` command working):
pipx install --force -e ".[all]"

# Or plain pip (won't update the pipx-installed `aictl` command):
pip install -e ".[all]"
```

> **Tip:** If you get `No such command 'serve'` after pulling new code, run `pipx install --force -e ".[all]"` to re-register all commands.

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

Supports Claude Code, GitHub Copilot, GitHub Copilot (Microsoft 365), Semantic Kernel, Azure PromptFlow, Azure AI, Cursor, and Windsurf. Use `--tool claude` to filter to one tool, or `--json` for machine-readable output.

### Web Dashboard: live monitoring with file inspection

Launch a live web dashboard that monitors all AI tool resources in real time, with the ability to inspect actual file contents:

```bash
aictl serve
```

Opens your browser at `http://127.0.0.1:8484` with:

- **Real-time updates** — stat cards and tool panels refresh automatically via Server-Sent Events
- **File content viewer** — click any file to open a slide-in panel showing the actual content (smart preview: first/last 50 lines for large files, expand to full)
- **Tool panels** — per-tool breakdown with file lists, token counts, process anomalies
- **MCP server status** — connectivity table with live status indicators
- **Agent memory browser** — browse and inspect all memory files with content preview
- **Token budget** — analysis of always-loaded, on-demand, cacheable, and compaction-surviving tokens
- **Dark/light mode** — auto-detects system preference

The dashboard also exposes a REST API for scripting and integration:

```bash
# Full snapshot as JSON
curl http://127.0.0.1:8484/api/snapshot | python3 -m json.tool

# Read a specific discovered file
curl "http://127.0.0.1:8484/api/file?path=/path/to/CLAUDE.md"

# Token budget analysis
curl http://127.0.0.1:8484/api/budget

# Real-time SSE stream (for custom dashboards)
curl -N http://127.0.0.1:8484/api/stream
```

> **Note:** The file API only serves files that appear in the discovered resource set — arbitrary paths are rejected with 403.

Options:

| Option | Description |
|--------|-------------|
| `--port PORT` | Port to listen on (default: `8484`) |
| `--host HOST` | Host to bind to (default: `127.0.0.1`) |
| `--interval SECS` | Refresh interval in seconds (default: `5`) |
| `--no-open` | Don't auto-open the browser |

### Terminal Dashboard: TUI

Launch a live-updating terminal dashboard (requires the `textual` extra):

```bash
aictl dashboard --root my-project/
```

Refreshes every 5 seconds with stat cards, per-tool panels, sparkline CPU/MEM history, and tabbed views for processes, files, MCP server status, and agent memory.

Keybindings: `r` refresh now, `p` toggle processes, `f` toggle files, `m` toggle memory, `q` quit.

```bash
pip install -e ".[dashboard]"   # or: pipx inject aictl textual
```

### Microsoft AI tools: discovery coverage

`aictl status` and `aictl dashboard` discover artifacts from the full Microsoft AI ecosystem in addition to Claude Code, Cursor, and Windsurf:

| Tool | `--tool` key | What is discovered |
|------|--------------|--------------------|
| **GitHub Copilot** | `copilot` | `.github/copilot-instructions.md`, `.github/agents/*.agent.md`, `.github/prompts/*.prompt.md`, `.github/instructions/*.instructions.md`, `.github/skills/*/SKILL.md`, `AGENTS.md`, `.copilot-mcp.json`, `.vscode/settings.json`, `.vscode/extensions.json`, active agent sessions, GitHub CLI config |
| **Microsoft 365 Copilot** | `copilot365` | `appPackage/declarativeAgent.json`, `appPackage/manifest.json`, `appPackage/instruction.txt`, `teamsapp.yml`, `m365agents.yml`, `aad.manifest.json`, Teams Toolkit `env/.env.*` files, `.fx/` layout (v4) |
| **Semantic Kernel** | `semantic_kernel` | `skprompt.txt` + sibling `config.json` anywhere in tree, `Plugins/`, `sk_plugins/`, `SemanticPlugins/`, `Skills/` directories, `appsettings.json` |
| **Azure PromptFlow** | `promptflow` | `flow.dag.yaml`, `flow.flex.yaml`, `.promptflow/` hidden dirs, global `~/.promptflow/pf.yaml` and connections |
| **Azure AI / azd** | `azure_ai` | `azure.yaml` (azd manifest), `.azure/` env state, `local.settings.json` (Azure Functions), `ai.project.yaml`, global `~/.azd/config.json` |

#### Hidden/config files specific to each Microsoft tool

| Tool | Hidden dirs & config files |
|------|-----------------------------|
| GitHub Copilot | `.copilot/session-state/` (sessions), `~/.config/gh/hosts.yml` (CLI auth) |
| M365 Copilot | `.fx/` (Teams Toolkit v4 state), `appPackage/` |
| PromptFlow | `.promptflow/` (connection cache, run metadata) |
| Azure AI | `.azure/` (azd env state — subscription IDs, resource group names) |

### HTML report: static snapshot

Generate a self-contained HTML report with file content previews, MCP connectivity status, and agent memory browser:

```bash
aictl status --html -o report.html --root my-project/
```

The report includes expandable file previews (last 5 lines shown, click to expand full content), colour-coded MCP server status, and tabbed navigation between AI Tools, MCP Servers, and Agent Memory views. Open the file in any browser — no dependencies, dark/light mode adapts automatically.

You can also pipe to stdout: `aictl status --html > report.html`.

## How It Works

| Command | What it does |
|---------|-------------|
| `aictl scan --root .` | Discover `.aictx` files, show scope map |
| `aictl deploy --root . --profile debug` | Scan → resolve → emit → cleanup → swap memory |
| `aictl import --root .` | Read native tool files → generate `.context.aictx` |
| `aictl plugin build --root . --name my-plugin` | Package `.aictx` as a Claude Code plugin |
| `aictl status --root .` | Show all resources: files, memory, MCP servers, processes |
| `aictl status --processes` | Include running processes with anomaly detection |
| `aictl status --budget` | Show token cost analysis (always-loaded, on-demand, cacheable) |
| `aictl status --html -o report.html` | Generate self-contained HTML report |
| `aictl status --backtrace PID` | Sample a process stack trace |
| `aictl serve` | Launch live web dashboard with REST API at localhost:8484 |
| `aictl dashboard --root .` | Launch live terminal dashboard (TUI) |
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
| `--tool NAME` | Show resources for one tool only (`claude`, `copilot`, `cursor`, `windsurf`, `aictl`, or specific names like `claude-code`, `copilot-vscode`) |
| `--processes` | Detect and display running processes with anomaly flags |
| `--budget` | Show token cost analysis (always-loaded, on-demand, cacheable, compaction-surviving) |
| `--backtrace PID` | Sample a process stack trace (macOS: `sample`, Linux: `eu-stack`/`gdb`; not available on Windows) |
| `--json` | Output as JSON with full metadata (scope, sent_to_llm, loaded_when, etc.) |
| `--html` | Generate self-contained HTML report to stdout |
| `-o FILE` | Write HTML report to file instead of stdout |

### Serve options

| Option | Description |
|--------|-------------|
| `--root DIR` | Root directory to monitor (default: `.`) |
| `--port PORT` | Port to listen on (default: `8484`) |
| `--host HOST` | Host to bind to (default: `127.0.0.1`) |
| `--interval SECS` | Refresh interval in seconds (default: `5`) |
| `--no-open` | Don't auto-open the browser |

### Dashboard options (TUI)

| Option | Description |
|--------|-------------|
| `--root DIR` | Root directory to monitor (default: `.`) |
| `--interval SECS` | Refresh interval in seconds (default: `5`) |

## Windows Installation & Troubleshooting

### Prerequisites

- **Python 3.10+** — download from [python.org](https://www.python.org/downloads/) or the Microsoft Store.
  During install, check **"Add Python to PATH"**.
- **pipx** — install via PowerShell:
  ```powershell
  python -m pip install pipx
  python -m pipx ensurepath
  ```
  Restart your terminal after `ensurepath` so the PATH change takes effect.

### Install aictl

```powershell
pipx install --force ".[all]"
```

Verify:

```powershell
aictl --version
```

### Config file locations on Windows

`aictl status` discovers config files from the standard Windows locations:

| Tool | Location |
|------|----------|
| Claude Code | `%APPDATA%\Claude\` |
| Claude account | `%APPDATA%\Claude\.claude.json` |
| VS Code settings | `%APPDATA%\Code\User\settings.json` |
| VS Code extensions | `%USERPROFILE%\.vscode\extensions\` |
| Cursor settings | `%APPDATA%\Cursor\User\settings.json` |
| Windsurf / Codeium | `%APPDATA%\Codeium\windsurf\` |
| Copilot sessions | `%APPDATA%\GitHub Copilot\session-state\` |
| GitHub CLI | `%APPDATA%\GitHub CLI\` |
| Azure Developer CLI | `%USERPROFILE%\.azd\` |
| PromptFlow | `%USERPROFILE%\.promptflow\` |

### Known limitations on Windows

| Feature | Status |
|---------|--------|
| File discovery (`status`, `serve`, `dashboard`) | ✅ Full support |
| Deploy / import / scan | ✅ Full support |
| Web dashboard (`aictl serve`) | ✅ Full support (no extra deps) |
| Process detection | ✅ Requires `psutil` (`pipx inject aictl psutil`) |
| Live TUI dashboard | ✅ Requires `textual` (`pipx inject aictl textual`) |
| HTML report | ✅ Full support |
| `--backtrace PID` | ❌ Not available (uses macOS `sample` / Linux `eu-stack`) |
| `ps` fallback (no psutil) | ❌ Skipped silently — install `psutil` instead |

### Common errors

**`aictl` not found after install**

pipx installs to `%USERPROFILE%\.local\bin`. If that's not on your PATH:

```powershell
python -m pipx ensurepath
# Restart PowerShell / Command Prompt
```

**`The dashboard requires the 'textual' package`**

```powershell
pipx inject aictl textual
# or reinstall with all extras:
pipx install --force ".[all]"
```

**`pipx install` silently skips (already installed)**

Always use `--force` to update an existing install:

```powershell
pipx install --force ".[all]"
```

**Long paths cause errors**

Windows has a 260-character path limit by default. Enable long paths in PowerShell (as Administrator):

```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1
```

Or via Group Policy: *Computer Configuration → Administrative Templates → System → Filesystem → Enable Win32 long paths*.

### Running tests on Windows

```powershell
python test\run.py
python test\run.py -v   # verbose
```

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/aictx-format.md](docs/aictx-format.md) | Complete `.aictx` format reference with examples |
| [docs/architecture.md](docs/architecture.md) | How scanning, resolving, emitting, and memory swap work |
| [docs/tool-claude-code.md](docs/tool-claude-code.md) | Claude Code: all generated and external files |
| [docs/tool-copilot.md](docs/tool-copilot.md) | Copilot CLI + VS Code: instructions, agents, prompts |
| [docs/tool-cursor.md](docs/tool-cursor.md) | Cursor: .mdc rules, glob scoping, MCP |
| [docs/memory.md](docs/memory.md) | Memory swap per (root, profile), outside-repo files |
