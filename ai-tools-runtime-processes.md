# AI Tools — Runtime Processes, Daemons, Threads & System Footprint

> Comprehensive reference of running processes, background daemons, child process trees,
> ports/sockets, memory footprint, and zombie process patterns for all major AI tools.
> Companion document to `ai-tools-config-paths.md`. Compiled March 2026.

---

## Table of Contents

1. [Claude (Desktop + Code)](#1-claude-desktop--code)
2. [Cursor](#2-cursor)
3. [GitHub Copilot / Copilot CLI](#3-github-copilot--copilot-cli)
4. [Windsurf (Codeium)](#4-windsurf-codeium)
5. [Gemini CLI](#5-gemini-cli)
6. [OpenClaw](#6-openclaw)
7. [OpenCode](#7-opencode)
8. [ChatGPT Desktop](#8-chatgpt-desktop)
9. [MCP Server Monitoring & Inspection](#9-mcp-server-monitoring--inspection)
10. [Zombie Processes & Orphan Cleanup](#10-zombie-processes--orphan-cleanup)
11. [Inspection Commands Cheat Sheet](#11-inspection-commands-cheat-sheet)
12. [Windows Equivalents](#12-windows-equivalents)

---

## 1. Claude (Desktop + Code)

### 1.1 Claude Desktop (Electron App)

**Process tree:**
```
Claude (main)                          # Electron main process
├── Claude Helper (Renderer)           # Chromium renderer (chat UI)
├── Claude Helper (GPU)                # GPU acceleration process
├── Claude Helper (Utility)            # Utility/network process
├── node <mcp-server-command>          # One per configured MCP server (stdio)
│   └── (child processes of MCP server)
├── npx mcp-remote <url>              # One per HTTP/SSE MCP server
└── Claude Helper (Plugin Host)        # Extension host (if plugins active)
```

**Key characteristics:**
- Electron app = Chromium + Node.js runtime = **2-3x memory of a native app**
- MCP servers start as **subprocesses** at launch — sequentially, no lazy loading
- Each MCP server is a separate Node.js process communicating via stdin/stdout (stdio) or HTTP
- Typical baseline memory: **400-800 MB** with no MCP servers, **1-2 GB** with several
- Long conversations cache aggressively — can grow to **2+ GB** without clearing history

**Ports & sockets:**
- No listening ports by default
- MCP stdio servers communicate via pipes (no network)
- MCP HTTP/SSE servers connect outbound to configured URLs

**Inspect:**
```bash
# macOS — find all Claude processes
ps aux | grep -i claude | grep -v grep

# Process tree
pstree -p $(pgrep -f "Claude" | head -1) 2>/dev/null || \
  ps -ef | grep -i claude | grep -v grep

# Memory per process
ps -eo pid,rss,comm | grep -i claude | awk '{printf "%s\t%.1f MB\t%s\n", $1, $2/1024, $3}'

# List MCP server subprocesses
ps aux | grep -E 'mcp-server|mcp-remote|npx.*mcp' | grep -v grep
```

### 1.2 Claude Code (CLI Agent)

**Process tree (interactive session):**
```
claude                                 # Main Node.js process
├── bash -l                            # Login shell for Bash tool (persistent)
│   └── (user commands run here)       # Commands Claude executes
├── node mcp-server-filesystem         # Stdio MCP server (if configured)
├── node mcp-server-fetch              # Another MCP server
├── npx mcp-remote <url>              # HTTP MCP server proxy
├── claude --print --resume <id>       # Subagent (Task tool, if used)
│   └── bash -l                        # Subagent's own shell
├── agent-browser                      # Headless browser (if web research)
│   └── chrome-headless-shell          # Chromium headless instance
└── playwright/driver                  # Playwright browser (if used)
```

**Process tree (non-interactive / CI):**
```
claude -p "prompt"                     # Main process
├── bash -l                            # Shell for commands
└── (same MCP/subagent tree as above)
```

**Key characteristics:**
- Main process: **Node.js** (single-threaded event loop + worker threads for I/O)
- Spawns a **persistent login shell** (`bash -l`) that survives across tool calls
- Background tasks (`Ctrl+B`): pushed to background, monitored by Claude
- Subagents (`/task`): separate `claude --print` processes with own shell + context
- MCP servers: one child process per server, stdio or HTTP
- Temp file trackers: creates `tmpclaude-<4hex>-cwd` per Bash tool invocation (tracks CWD changes)

**Memory footprint:**
- Main process: **150-400 MB** depending on context window usage
- Each subagent: **~45 MB** base
- Each MCP server: **15-50 MB** depending on server
- Headless browser: **200-400 MB** per instance
- **Known leak:** Subagent processes may not terminate → accumulate to **10+ GB** in heavy sessions

**Ports & sockets:**
- No listening ports by default
- Outbound HTTPS to `api.anthropic.com` (or Bedrock/Vertex endpoints)
- MCP stdio: pipes, no network
- MCP HTTP/SSE: outbound connections to configured URLs

**Background processes that survive session end (⚠️):**
| Process | Pattern | Why it persists |
|---------|---------|-----------------|
| MCP servers | `mcp-server-*`, `npx mcp-remote` | Not terminated on `claude mcp remove` |
| Headless browsers | `chrome-headless-shell`, `agent-browser` | Web research sessions |
| Subagents | `claude --print`, `claude --resume` | Task tool spawns |
| Build processes | `esbuild`, `vite`, `next dev`, `webpack` | Started via Bash tool |
| npm proxies | `npm exec`, `npx` (no parent) | MCP server launchers |

**Inspect:**
```bash
# All Claude Code processes
ps aux | grep -E 'claude|mcp-server|mcp-remote|chrome-headless|agent-browser|playwright' | grep -v grep

# Process tree from main claude process
pstree -p $(pgrep -xf "claude" | head -1)

# Memory summary
ps -eo pid,rss,comm,args | grep -E 'claude|mcp-server' | \
  awk '{printf "PID %-8s %6.1f MB  %s\n", $1, $2/1024, $4}'

# Find orphaned subagents (PPID=1 means parent died)
ps -eo pid,ppid,rss,etime,args | awk '$2==1' | grep -E 'claude|mcp-server'

# Active background jobs in current session
# (inside Claude Code): /bashes

# Check scratchpad location
ls -la /tmp/claude-$(whoami)/ 2>/dev/null || \
  ls -la "$TMPDIR/claude/"* 2>/dev/null
```

---

## 2. Cursor

### 2.1 Process Tree

```
Cursor (main)                          # Electron main process (VS Code fork)
├── Cursor Helper (Renderer)           # Main editor UI
├── Cursor Helper (GPU)                # GPU process
├── Cursor Helper (Utility)            # Network/utility
├── Cursor Helper (Extension Host)     # Extension host process
│   ├── (extension processes)          # Installed VS Code extensions
│   └── node copilot-agent             # Copilot extension (if installed)
├── Cursor Helper (Shared Process)     # Shared extension processes
├── cursor-language-server             # AI language server (proprietary)
├── cursor-indexing                    # Codebase indexing worker
├── Shadow Workspace                   # Invisible editor instance for pre-testing
│   └── cursor-indexing (shadow)       # Shadow indexing process
├── node mcp-server-*                  # MCP servers (if configured)
├── rg (ripgrep)                       # File search operations
└── Cursor Helper (FileWatcher)        # File system watcher
```

**Key characteristics:**
- VS Code fork → same Electron multi-process architecture
- **Shadow Workspace**: invisible background editor that indexes and pre-tests code changes — **#1 cause of CPU spikes** on large projects
- Codebase indexing runs embedding models locally or via cloud
- **CachedData** directories per version — never auto-cleaned
- Settings stored in **SQLite** (`state.vscdb`), not JSON files
- Typical memory: **800 MB - 2 GB** depending on project size and extensions

**Ports:**
- Listens on random localhost ports for extension communication
- Remote development: `~/.cursor-server/` installed on remote, SSH tunnel

**Inspect:**
```bash
# All Cursor processes
ps aux | grep -i cursor | grep -v grep

# CPU consumers (find shadow workspace issues)
ps -eo pid,pcpu,rss,comm | grep -i cursor | sort -k2 -rn

# Indexing process specifically
ps aux | grep cursor-indexing

# Check remote server on SSH target
ps aux | grep cursor-server
```

---

## 3. GitHub Copilot / Copilot CLI

### 3.1 Copilot in VS Code / Cursor

```
Extension Host
└── GitHub Copilot                     # Copilot extension process
    ├── copilot-agent                  # Language model agent
    └── copilot-lsp                    # LSP server for completions
```

- Runs inside the editor's extension host process
- Network: outbound HTTPS to `api.github.com` and `copilot-proxy.githubusercontent.com`
- No separate daemon or background process

### 3.2 Copilot CLI

**Process tree (interactive):**
```
copilot                                # Main Node.js process
├── bash / sh                          # Shell for command execution
│   └── (user commands)
├── node mcp-server-*                  # MCP servers (stdio)
├── copilot (subagent)                 # Subagent for delegated tasks
│   └── bash / sh
└── copilot (fleet worker)             # /fleet parallel workers (if used)
```

**Key characteristics:**
- Node.js CLI, single main process
- Session state persisted to `~/.copilot/session-state/<session-id>/`
- Local **SQLite session store** for `/chronicle` feature
- Subagents get human-readable IDs (e.g., `math-helper-0`)
- Auto-compaction at 95% token limit — runs in background thread
- MCP servers: can be builtin, user-configured, or per-session (`--additional-mcp-config`)

**Ports:**
- No listening ports
- Outbound HTTPS to GitHub API + model endpoints

**Inspect:**
```bash
# Copilot CLI processes
ps aux | grep copilot | grep -v grep

# Session state disk usage
du -sh ~/.copilot/session-state/

# Check for orphaned subagents
ps -eo pid,ppid,args | grep "copilot" | awk '$2==1'
```

---

## 4. Windsurf (Codeium)

### 4.1 Process Tree

```
Windsurf (main)                        # Electron main (VS Code fork)
├── Windsurf Helper (Renderer)         # Editor UI
├── Windsurf Helper (GPU)
├── Windsurf Helper (Extension Host)
│   └── (extensions)
├── codeium_language_server            # Codeium's proprietary language server
│   └── (model inference threads)      # Local completion inference
├── Cascade Agent                      # AI agent process (within extension host)
├── windsurf-indexing                  # Codebase indexing
├── node mcp-server-*                  # MCP servers
└── Windsurf Helper (FileWatcher)
```

**Key characteristics:**
- VS Code fork, similar process model to Cursor
- `codeium_language_server` is a native binary (not Node.js) — handles local completions
- Cascade agent runs within the extension host
- Cascade can continue running in background when switching conversations
- SWE-1/SWE-1.5 models run server-side, not locally

**Ports:**
- `codeium_language_server` listens on random localhost port for RPC
- Outbound to Codeium cloud services

**Inspect:**
```bash
# All Windsurf processes
ps aux | grep -iE 'windsurf|codeium' | grep -v grep

# Language server specifically
ps aux | grep codeium_language_server

# Memory footprint
ps -eo pid,rss,comm | grep -iE 'windsurf|codeium' | \
  awk '{printf "%s\t%.1f MB\t%s\n", $1, $2/1024, $3}'
```

---

## 5. Gemini CLI

### 5.1 Process Tree

```
gemini                                 # Main Node.js process
├── bash / sh                          # Shell for commands
├── node mcp-server-*                  # MCP servers (stdio)
├── (extension processes)              # Installed extensions
└── (web fetch worker)                 # Web fetch operations
```

**Key characteristics:**
- Lightweight Node.js CLI — smallest footprint of the CLI agents
- Extensions installed at `~/.gemini/extensions/` run as child processes
- Memory via `save_memory` tool persists to `~/.gemini/memory/`
- Checkpoints are in-memory (conversation save/restore)
- Auth: OAuth flow with Google account (token cached locally)

**Ports:**
- No listening ports
- Outbound HTTPS to Google AI APIs

**Inspect:**
```bash
# Gemini processes
ps aux | grep gemini | grep -v grep

# Extensions running
ls ~/.gemini/extensions/
```

---

## 6. OpenClaw

### 6.1 Process Tree (Full Stack)

```
openclaw gateway                       # WebSocket Gateway (main daemon)
├── node (session handler)             # Per-conversation session
│   ├── claude / other model CLI       # Model interaction
│   └── (tool processes)               # Skills, bash, browser
├── node (channel connector)           # Per-channel connector
│   ├── whatsapp-web.js                # WhatsApp Web session (Puppeteer)
│   │   └── chromium                   # Browser for WhatsApp
│   ├── telegram bot                   # Telegram bot polling
│   ├── discord bot                    # Discord.js connection
│   └── (other channels)
├── node mcp-server-*                  # MCP servers
├── docker (sandbox)                   # Per-session Docker sandbox (if enabled)
│   └── bash + tools                   # Sandboxed tool execution
└── cron scheduler                     # Heartbeat & scheduled tasks
```

**Key characteristics:**
- **Always-on daemon** — Gateway runs as a system service (launchd/systemd/schtasks)
- Default port: **18789** (WebSocket + HTTP dashboard)
- Manages multiple messaging channel connections simultaneously
- WhatsApp uses Puppeteer → headless Chromium (**heavy memory user**)
- Sandboxed sessions run in per-session Docker containers
- Skills execute as standalone UV Python scripts or Node.js processes
- Hot-reloads config changes (watches `~/.openclaw/openclaw.json`)

**Service management:**
```bash
# Service status
openclaw gateway status
openclaw gateway status --deep          # System-level scan for extra instances

# Health check
openclaw health
openclaw doctor

# Logs
openclaw channels logs

# Manual gateway control
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
```

**Ports & sockets:**
| Port | Purpose |
|------|---------|
| 18789 | Gateway WebSocket + HTTP dashboard (default) |
| (random) | Tailscale Serve/Funnel (if configured) |

**Inspect:**
```bash
# All OpenClaw processes
ps aux | grep -iE 'openclaw|clawdbot' | grep -v grep

# Gateway process tree
pstree -p $(pgrep -f "openclaw gateway")

# Port check
lsof -i :18789

# WhatsApp browser memory
ps -eo pid,rss,args | grep -i chromium | grep -i whatsapp
```

---

## 7. OpenCode

### 7.1 Process Tree

```
opencode                               # Main Go/Node.js process (TUI or CLI)
├── bash / sh                          # Shell for commands
├── node mcp-server-*                  # MCP servers
├── opencode (subagent)                # Task delegated agents
└── (LSP servers)                      # Language servers (if experimental LSP enabled)
```

**Desktop app:**
```
OpenCode Desktop                       # Electron app
├── opencode-cli (sidecar)             # Local CLI server process
│   └── (same tree as CLI above)
└── (Electron helper processes)
```

**Ports:**
| Port | Purpose |
|------|---------|
| 4096 (default) | `opencode serve` / `opencode web` HTTP server |
| mDNS | Service discovery (if `mdns: true` in config) |

**Inspect:**
```bash
ps aux | grep opencode | grep -v grep
lsof -i :4096
```

---

## 8. ChatGPT Desktop

### 8.1 Process Tree

```
ChatGPT (main)                         # Electron main process
├── ChatGPT Helper (Renderer)          # Chat UI
├── ChatGPT Helper (GPU)
├── ChatGPT Helper (Utility)
└── (no local MCP / no local model)    # All processing is server-side
```

**Key characteristics:**
- Thin Electron client — all inference is server-side
- No MCP servers, no local model processes
- Minimal footprint: **300-600 MB**
- Code Interpreter sandbox runs server-side (not locally)
- Advanced Voice Mode uses system microphone/speaker

---

## 8.2 Microsoft 365 Copilot / Teams Toolkit

**Process patterns:**

| Process | Type | Runtime | Listens On | Notes |
|---------|------|---------|-----------|-------|
| `teamsappdevtunnel` | daemon | native-binary | random localhost | Dev tunnel for local testing of M365 Copilot plugins |
| `teamsfx` | cli | node | — | Teams Toolkit CLI (legacy scaffolding/deployment) |
| `ttk-*` | child | node | random localhost | Teams Toolkit child workers (various prefixed) |
| `node @microsoft/teams-*` | child | node | random localhost | Teams SDK runtime packages (dev server) |
| `teams-toolkit` | extension | node | — | VS Code extension process |

All connect outbound to `graph.microsoft.com` and `login.microsoftonline.com`. No known zombie issues.

### 8.3 Semantic Kernel

| Process | Type | Runtime | Notes |
|---------|------|---------|-------|
| `dotnet semantic.kernel` | child | native-binary | .NET SK host process (plugin orchestration) |
| `SemanticKernel` | child | native-binary | Runtime process, may host local API for function calling |

Connects outbound to model API endpoints (OpenAI, Anthropic, Azure OpenAI). Typically 50-300 MB.

### 8.4 Azure PromptFlow

| Process | Type | Runtime | Listens On | Notes |
|---------|------|---------|-----------|-------|
| `python promptflow` | cli | python | random localhost | PromptFlow CLI / runtime (flow execution engine) |
| `pf flow` | cli | python | random localhost | Short-form CLI (`pf flow test`, `pf flow serve`) |

### 8.5 Azure AI / Azure Developer CLI

| Process | Type | Runtime | Listens On | Notes |
|---------|------|---------|-----------|-------|
| `azd` | cli | native-binary | — | Azure Developer CLI — provision and deploy AI apps |
| `func host start` | daemon | native-binary | **7071** | Azure Functions Core Tools local host |
| `Microsoft.Azure.*` | child | native-binary | — | Azure SDK child processes spawned by Functions host |

### 8.6 Copilot VS Code — Additional Process Names

Older or alternative Copilot extension versions use different process names:

| Process | Notes |
|---------|-------|
| `copilot-language-server` | Alternative name for `copilot-lsp` in some versions |
| `copilot-server` | Older Copilot extension versions |
| `github.copilot` | Extension main process (matches VS Code extension ID pattern) |
| `copilot-typescript-server` | Legacy TS-specific language server (merged into `copilot-lsp`) |

All run inside the Extension Host, connect to `api.github.com`.

---

## 9. MCP Server Monitoring & Inspection

MCP servers are uniquely opaque — they run as child processes with no standard dashboard, show up as generic `node` or `python` in process lists, and silently consume tokens on every API call even when idle. This section covers how to discover, inspect, measure, and manage them.

### 9.1 Discovery: What MCP Servers Are Running?

**From inside the AI tool:**

| Tool | Command | What it shows |
|------|---------|---------------|
| Claude Code | `/mcp` | Connected servers, status, transport, tools count |
| Claude Code | `/context` | Token cost per MCP server + per tool |
| Claude Code | `claude mcp list` | All configured servers (user + project) |
| Claude Code | `claude mcp serve` | Expose Claude Code itself as an MCP server |
| Copilot CLI | `/mcp` or `/tools` | Connected MCP servers and their tools |
| Gemini CLI | `/mcp list` | MCP server connection status + tool list |
| Cursor | Settings → MCP Servers | GUI list of configured servers |
| Windsurf | Settings → Cascade → MCP Servers | GUI list + error messages |
| OpenClaw | `openclaw doctor` | MCP server health + config validation |

**From the OS (find MCP server processes):**
```bash
# Find ALL running MCP server processes (macOS/Linux)
ps aux | grep -iE 'mcp-server|mcp-remote|mcp_server' | grep -v grep

# With memory and PID details
ps -eo pid,ppid,rss,etime,args | grep -iE 'mcp-server|mcp-remote' | grep -v grep | \
  awk '{printf "PID %-7s  PPID %-5s  %6.1f MB  AGE %-12s  %s %s %s\n", $1, $2, $3/1024, $4, $5, $6, $7}'

# Count MCP servers
ps aux | grep -iE 'mcp-server|mcp-remote' | grep -v grep | wc -l

# Find which parent tool spawned each MCP server
ps -eo pid,ppid,args | grep -iE 'mcp-server|mcp-remote' | grep -v grep | \
  while read pid ppid args; do
    parent=$(ps -p $ppid -o comm= 2>/dev/null || echo "dead")
    echo "PID $pid  parent=$parent($ppid)  $args"
  done
```

**From MCP config files (what's configured vs. what's running):**
```bash
# Claude Code — configured servers
cat ~/.claude.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {k}: {v.get(\"command\",\"http\")}') for k,v in d.get('mcpServers',{}).items()]" 2>/dev/null
cat .mcp.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {k}: {v.get(\"command\",\"http\")}') for k,v in d.get('mcpServers',{}).items()]" 2>/dev/null

# Claude Desktop — configured servers
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {k}: {v.get(\"command\",\"url\")}') for k,v in d.get('mcpServers',{}).items()]" 2>/dev/null

# Windsurf — configured servers
cat ~/.codeium/windsurf/mcp_config.json 2>/dev/null | python3 -m json.tool 2>/dev/null

# Copilot CLI — configured servers
cat ~/.copilot/mcp-config.json 2>/dev/null | python3 -m json.tool 2>/dev/null
```

### 9.2 Inspection: What Tools Does a Server Expose?

**MCP Inspector (official tool):**
```bash
# Interactive web UI for testing any MCP server
npx @modelcontextprotocol/inspector npx @modelcontextprotocol/server-filesystem ~/Code

# Opens web UI at http://localhost:6274
# Shows: tools list, resources, prompts, connection status
# Can invoke tools directly, see schemas, test parameters
```

**Raw JSON-RPC from the command line:**
```bash
# List tools from any stdio MCP server
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  npx -y @modelcontextprotocol/server-filesystem ~/Code | jq '.result.tools[] | {name, description}'

# List resources
echo '{"jsonrpc":"2.0","method":"resources/list","id":1}' | \
  npx -y @modelcontextprotocol/server-filesystem ~/Code | jq

# Call a specific tool
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"read_file","arguments":{"path":"/tmp/test.txt"}}}' | \
  npx -y @modelcontextprotocol/server-filesystem ~/Code | jq

# Shell functions for repeated use
mcp_tools() { echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | "$@" | jq; }
mcp_call() { local t="$1" a="$2"; shift 2; echo "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"id\":1,\"params\":{\"name\":\"$t\",\"arguments\":$a}}" | "$@" | jq; }

# Usage:
# mcp_tools npx -y @modelcontextprotocol/server-filesystem ~/Code
# mcp_call read_file '{"path":"/tmp/test.txt"}' npx -y @modelcontextprotocol/server-filesystem ~/Code
```

### 9.3 Token Cost Measurement

Every MCP server has a **silent token tax** — its tool schemas load into the context window on every API call, even when idle.

**Measured token costs for common servers:**

| MCP Server | Tools | Tokens (all tools loaded) | Tokens (with Tool Search) | Costliest Single Tool |
|------------|-------|--------------------------|---------------------------|----------------------|
| Playwright | 22 | ~3,500 | deferred | `browser_take_screenshot` (370) |
| Gmail | 7 | ~2,640 | deferred | `gmail_create_draft` (820) |
| GitHub | 15-20 | ~2,500 | deferred | varies |
| Sentry | 8-12 | ~1,500 | deferred | varies |
| PostgreSQL | 5-8 | ~1,000 | deferred | varies |
| Filesystem | 5-6 | ~500 | deferred | varies |
| SQLite | 6 | ~380 | deferred | varies |
| Fetch (built-in) | 1-2 | ~300 | not deferred | varies |
| Chrome DevTools | 20+ | ~16,000 | deferred | varies |
| Claude-in-Chrome | 19 | ~15,700 | deferred | varies |

**Real-world overhead examples:**
- 4 servers (Playwright + Gmail + GitHub + SQLite): **~7,000 tokens** per message
- 5 servers (typical developer): **~55,000 tokens** (28% of 200k window)
- 32 servers / 473 tools (power user): **~140,000-150,000 tokens** (75% of window gone)

**How to measure your own setup:**
```bash
# Inside Claude Code:
/context
# → Look at the "MCP tools" line for total
# → Expand for per-tool breakdown

# Compare before/after disconnecting a server:
/mcp                    # see list
# disconnect a server
/context                # see token change
```

### 9.4 Tool Search / Deferred Loading

When MCP tool definitions exceed ~10% of the context window, Claude Code automatically defers them — loading tool schemas on-demand instead of upfront.

| Feature | Behavior |
|---------|----------|
| **Auto threshold** | Triggers when tools > 10% of context window |
| **Manual threshold** | `ENABLE_TOOL_SEARCH=auto:<N>` (e.g., `auto:5` = 5%) |
| **Token savings** | 72,000 → 8,500 tokens (85% reduction) in benchmarks |
| **Accuracy impact** | Opus: 49% → 74%, Opus 4.5: 79.5% → 88.1% on MCP evals |
| **Tradeoff** | Extra round-trip per tool call for schema fetch |
| **Available on** | Sonnet 4+ and Opus 4+ (automatic) |

### 9.5 MCP Server Health Monitoring

**Process-level health check script:**
```bash
#!/bin/bash
# mcp-health.sh — Check health of all running MCP servers

echo "=== MCP Server Health ==="
echo ""

# Find all MCP server processes
ps -eo pid,ppid,rss,etime,args | grep -iE 'mcp-server|mcp-remote' | grep -v grep | \
  while IFS= read -r line; do
    pid=$(echo "$line" | awk '{print $1}')
    ppid=$(echo "$line" | awk '{print $2}')
    rss=$(echo "$line" | awk '{print $3}')
    etime=$(echo "$line" | awk '{print $4}')
    args=$(echo "$line" | awk '{for(i=5;i<=NF;i++) printf "%s ", $i; print ""}')
    
    parent=$(ps -p $ppid -o comm= 2>/dev/null || echo "ORPHAN")
    mem_mb=$(echo "scale=1; $rss / 1024" | bc)
    
    # Check if parent is alive
    if [ "$ppid" = "1" ] || [ "$parent" = "ORPHAN" ]; then
      status="⚠️  ORPHAN"
    else
      status="✅ OK"
    fi
    
    echo "$status  PID=$pid  ${mem_mb}MB  age=$etime  parent=$parent($ppid)"
    echo "         $args"
    echo ""
  done

# Summary
total=$(ps aux | grep -iE 'mcp-server|mcp-remote' | grep -v grep | wc -l)
orphans=$(ps -eo pid,ppid | awk '$2==1' | while read p pp; do ps -p $p -o args= 2>/dev/null; done | grep -ciE 'mcp-server|mcp-remote')
total_mem=$(ps -eo ppid,rss,args | grep -iE 'mcp-server|mcp-remote' | grep -v grep | awk '{sum+=$2} END {printf "%.1f", sum/1024}')

echo "--- Summary ---"
echo "Total MCP servers: $total"
echo "Orphaned: $orphans"
echo "Total memory: ${total_mem} MB"
```

### 9.6 Monitoring Tools & Dashboards

| Tool | What it does | Install |
|------|-------------|---------|
| **MCP Inspector** (official) | Web UI to test/debug any MCP server. Connect via stdio/HTTP/SSE. Invoke tools, view schemas, test auth. | `npx @modelcontextprotocol/inspector` |
| **mcp-use/inspector** | Hosted web inspector — no install needed. Also available as self-hosted Docker. | `inspector.mcp-use.com` or `docker run mcpuse/inspector` |
| **ClaudeTUI** | Real-time terminal monitor for Claude Code sessions. Shows token efficiency %, 4-component breakdown, per-segment analysis. | `brew install slima4/claude-tui/claude-tui` |
| **CC Usage** | CLI for analyzing Claude Code logs — cost + token dashboard. | Community tool |
| **ccflare** | Web UI dashboard for Claude Code usage analytics. | Community tool |
| **zclean** | Zombie process detector/killer for MCP servers + browsers + subagents. | `npx zclean` |
| **LiteLLM** | Gateway proxy — logs all LLM traffic including MCP tool calls with token counts. | `pip install litellm[proxy]` |
| **MCP Cloud** | Meta-MCP server that manages other MCP servers from within Claude. Toggle servers, apply presets, measure token overhead. | Community project |

---

## 10. Zombie Processes & Orphan Cleanup

### 10.1 Common Zombie Patterns Across All Tools

| Process | Source Tool | Pattern | Typical Leak |
|---------|-----------|---------|-------------|
| `mcp-server-*` | Claude Code, Cursor, Windsurf | Stdio MCP servers not killed on session end | 15-50 MB each |
| `npx mcp-remote` | Claude Code | HTTP MCP proxy not killed on `mcp remove` | 20-30 MB each |
| `chrome-headless-shell` | Claude Code, Codex | Web research browser instances | 200-400 MB each |
| `agent-browser` | Claude Code | Browser automation daemon | 100-300 MB each |
| `playwright/driver` | Claude Code, Cursor | Playwright browser controller | 50-100 MB |
| `claude --print` | Claude Code | Orphaned subagent processes | ~45 MB each |
| `codex exec` | Codex CLI | Orphaned Codex subagents | ~50 MB each |
| `esbuild` | Any (via Bash) | Build tool started by agent, never stopped | 20-50 MB |
| `vite` / `next dev` / `webpack` | Any (via Bash) | Dev servers started by agent | 100-300 MB |
| `npm exec` / `npx` | Any | MCP server launcher processes (no parent) | 10-20 MB |
| `node` (orphan) | Any | Generic Node.js worker with AI tool path in cmdline | Varies |
| `tsx` / `ts-node` / `bun` | Any | Runtime orphans from MCP server patterns | 20-50 MB |
| `python` (MCP) | Any | Python MCP servers not cleaned up | 30-80 MB |
| `codeium_language_server` | Windsurf | Can persist after Windsurf closes | 100-200 MB |

### 10.2 How to Detect Orphans

An orphan is a process whose parent has died and been re-parented to init/launchd (PPID=1):

```bash
# Find ALL orphaned AI-tool processes (macOS/Linux)
ps -eo pid,ppid,rss,etime,args | awk '$2==1 || $2==0' | \
  grep -iE 'claude|mcp-server|mcp-remote|chrome-headless|agent-browser|playwright|codex|codeium|copilot|opencode|windsurf' | \
  grep -v grep

# Same but with memory in MB and sorted
ps -eo pid,ppid,rss,etime,args | awk '$2==1 || $2==0' | \
  grep -iE 'claude|mcp-server|chrome-headless|agent-browser' | \
  awk '{printf "PID %-7s  PPID %-5s  %6.1f MB  AGE %-12s  %s\n", $1, $2, $3/1024, $4, $5}'

# Total memory consumed by orphans
ps -eo ppid,rss,args | awk '$1==1' | \
  grep -iE 'claude|mcp-server|chrome-headless|agent-browser|codex' | \
  awk '{sum+=$2} END {printf "Total orphan memory: %.1f MB\n", sum/1024}'
```

### 10.3 Safe Cleanup

```bash
# DRY RUN — show what would be killed
ps -eo pid,ppid,rss,etime,args | awk '$2==1' | \
  grep -iE 'mcp-server|mcp-remote|chrome-headless|agent-browser|playwright' | \
  awk '{printf "WOULD KILL: PID %-7s  %6.1f MB  %s\n", $1, $3/1024, $5}'

# KILL orphaned MCP servers
ps -eo pid,ppid,args | awk '$2==1' | \
  grep -E 'mcp-server|mcp-remote' | awk '{print $1}' | xargs kill 2>/dev/null

# KILL orphaned headless browsers
ps -eo pid,ppid,args | awk '$2==1' | \
  grep -E 'chrome-headless|agent-browser|playwright' | awk '{print $1}' | xargs kill 2>/dev/null

# KILL orphaned Claude subagents
ps -eo pid,ppid,args | awk '$2==1' | \
  grep -E 'claude --print|claude --resume' | awk '{print $1}' | xargs kill 2>/dev/null
```

### 10.4 Automated Cleanup Tools

| Tool | Command | What it does |
|------|---------|-------------|
| **zclean** | `npx zclean` | Detects + kills AI tool zombies. Supports Claude Code SessionEnd hooks. |
| **Manual cron** | Add to crontab | Periodic orphan sweep (see script below) |
| **Claude Code hook** | `.claude/settings.json` hooks | Run cleanup on session end |

**Cron-based cleanup (add to crontab):**
```bash
# Run every 2 hours — kill orphaned AI tool processes older than 1 hour
0 */2 * * * ps -eo pid,ppid,etimes,args | awk '$2==1 && $3>3600' | grep -iE 'mcp-server|chrome-headless|agent-browser|claude --print' | awk '{print $1}' | xargs kill 2>/dev/null
```

**Claude Code SessionEnd hook (`.claude/settings.json`):**
```json
{
  "hooks": {
    "SessionEnd": [
      {
        "type": "command",
        "command": "pkill -f 'mcp-server|mcp-remote|chrome-headless|agent-browser' 2>/dev/null; echo 'cleaned'"
      }
    ]
  }
}
```

---

## 11. Inspection Commands Cheat Sheet

### 11.1 Universal Discovery

```bash
# ===== FIND ALL AI TOOL PROCESSES =====
ps aux | grep -iE 'claude|cursor|copilot|windsurf|codeium|gemini|openclaw|opencode|chatgpt' | grep -v grep

# ===== MEMORY SUMMARY =====
echo "=== AI Tool Memory Usage ==="
for tool in claude cursor copilot windsurf codeium gemini openclaw opencode chatgpt; do
  mem=$(ps -eo rss,comm,args | grep -i "$tool" | grep -v grep | awk '{sum+=$1} END {printf "%.0f", sum/1024}')
  [ "$mem" != "0" ] && [ -n "$mem" ] && echo "  $tool: ${mem} MB"
done

# ===== PORT SCAN =====
# Common AI tool ports
lsof -i :18789  # OpenClaw Gateway
lsof -i :4096   # OpenCode server
lsof -i :8765   # Common MCP SSE port

# All listening ports by AI tools
lsof -i -P | grep LISTEN | grep -iE 'claude|cursor|windsurf|codeium|copilot|opencode|openclaw|node'

# ===== NETWORK CONNECTIONS =====
# Outbound API connections
lsof -i | grep ESTABLISHED | grep -iE 'claude|cursor|copilot|codeium|opencode'

# ===== OPEN FILES =====
# Files held open by Claude Code
lsof -c claude 2>/dev/null | head -50

# ===== SOCKET FILES =====
# Unix domain sockets used by AI tools
find /tmp -name '*.sock' -o -name '*.socket' 2>/dev/null | grep -iE 'claude|cursor|codeium|mcp'
```

### 11.2 Per-Tool Quick Check

```bash
# Claude Code — full status
echo "--- Claude Code ---"
pgrep -c -f "claude" && echo "processes running" || echo "not running"
ps -eo rss,args | grep -E '^[0-9].*claude' | grep -v grep | awk '{sum+=$1} END {printf "Total: %.0f MB\n", sum/1024}'
echo "Sessions: $(ls ~/.claude/projects/*/session-*.jsonl 2>/dev/null | wc -l)"
echo "Memory files: $(find ~/.claude/projects/*/memory/ -name '*.md' 2>/dev/null | wc -l)"

# Cursor — full status
echo "--- Cursor ---"
pgrep -c -if "cursor" && echo "processes running" || echo "not running"
ps -eo rss,comm | grep -i cursor | awk '{sum+=$1} END {printf "Total: %.0f MB\n", sum/1024}'
echo "CachedData dirs: $(ls -d ~/.config/Cursor/CachedData/*/ 2>/dev/null | wc -l)"

# OpenClaw — full status
echo "--- OpenClaw ---"
openclaw gateway status 2>/dev/null || echo "gateway not running"
openclaw health 2>/dev/null || echo "health check failed"
```

### 11.3 Process Identification Reference

| What you see in `ps` | What it is | Tool |
|----------------------|-----------|------|
| `claude` | Main CLI process | Claude Code |
| `Claude` / `Claude Helper` | Electron app processes | Claude Desktop |
| `claude --print --resume <id>` | Subagent (Task tool) | Claude Code |
| `mcp-server-filesystem` | Filesystem MCP server | Any (via config) |
| `mcp-server-fetch` | Web fetch MCP server | Any |
| `npx mcp-remote <url>` | HTTP MCP proxy | Claude Code |
| `chrome-headless-shell` | Headless Chromium browser | Claude Code |
| `agent-browser` | Browser automation daemon | Claude Code |
| `playwright/driver` | Playwright test driver | Claude Code / Cursor |
| `Cursor` / `Cursor Helper` | Electron app processes | Cursor |
| `cursor-language-server` | AI language server | Cursor |
| `cursor-indexing` | Codebase indexing worker | Cursor |
| `.cursor-server` | Remote SSH server | Cursor |
| `copilot` / `copilot-agent` | Copilot CLI or agent | GitHub Copilot |
| `Windsurf` / `Windsurf Helper` | Electron app processes | Windsurf |
| `codeium_language_server` | Codeium's native LS binary | Windsurf |
| `gemini` | Gemini CLI process | Gemini CLI |
| `openclaw` / `openclaw gateway` | OpenClaw gateway daemon | OpenClaw |
| `opencode` | OpenCode CLI/TUI/server | OpenCode |
| `ChatGPT` / `ChatGPT Helper` | Electron app processes | ChatGPT Desktop |
| `bun worker-service.cjs` | claude-mem worker daemon | claude-mem plugin |
| `node mcp-server.cjs` | claude-mem MCP server | claude-mem plugin |

---

## 12. Windows Equivalents

### 12.1 Process Inspection (PowerShell)

```powershell
# ===== FIND ALL AI TOOL PROCESSES =====
Get-Process | Where-Object {
  $_.ProcessName -match 'claude|cursor|copilot|windsurf|codeium|gemini|openclaw|opencode|chatgpt'
} | Format-Table Id, ProcessName, @{N='MB';E={[math]::Round($_.WorkingSet64/1MB,1)}}, Path -AutoSize

# ===== MEMORY SUMMARY =====
$tools = @('claude','cursor','copilot','windsurf','codeium','gemini','openclaw','opencode','chatgpt')
foreach ($tool in $tools) {
  $procs = Get-Process | Where-Object { $_.ProcessName -match $tool }
  if ($procs) {
    $totalMB = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 1)
    Write-Host "  ${tool}: ${totalMB} MB ($($procs.Count) processes)"
  }
}

# ===== PORT SCAN =====
Get-NetTCPConnection -State Listen | Where-Object {
  $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  $proc.ProcessName -match 'claude|cursor|copilot|windsurf|codeium|opencode|openclaw|node'
} | Select-Object LocalPort, @{N='Process';E={(Get-Process -Id $_.OwningProcess).ProcessName}}

# ===== PROCESS TREE =====
# Find child processes of Claude Code
$parent = Get-Process -Name "claude" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($parent) {
  Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $parent.Id } |
    Select-Object ProcessId, Name, CommandLine
}

# ===== KILL ORPHANED MCP SERVERS =====
Get-Process | Where-Object {
  $_.ProcessName -match 'node' -and
  $_.MainModule.FileName -match 'mcp-server|mcp-remote'
} | Stop-Process -Force

# ===== NETWORK CONNECTIONS =====
Get-NetTCPConnection -State Established | Where-Object {
  $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  $proc.ProcessName -match 'claude|cursor|copilot|codeium'
} | Select-Object RemoteAddress, RemotePort, @{N='Process';E={(Get-Process -Id $_.OwningProcess).ProcessName}}
```

### 12.2 Task Manager Tips

- **Claude Desktop (MSIX):** Shows as "Claude" in Task Manager. Expand the tree to see Helper processes.
- **Cursor:** Shows as "Cursor" with many "Cursor Helper" children. The "cursor-indexing" process causes high CPU.
- **Windsurf:** Shows as "Windsurf" + "Windsurf Helper" processes. `codeium_language_server.exe` is a separate entry.
- **MCP servers:** Show as generic "Node.js" processes — use the Command Line column in Task Manager Details tab to identify them.
- **OpenClaw Gateway:** Shows as "Node.js" — check command line for "openclaw gateway".

### 12.3 Windows Service Management

```powershell
# OpenClaw gateway service (schtasks)
schtasks /query /tn "OpenClaw Gateway" /v
schtasks /run /tn "OpenClaw Gateway"
schtasks /end /tn "OpenClaw Gateway"

# Check for AI tools in startup
Get-CimInstance Win32_StartupCommand | Where-Object {
  $_.Command -match 'claude|cursor|windsurf|codeium|openclaw|opencode'
} | Select-Object Name, Command, Location
```

---

## Quick Reference: Expected Resource Usage

| Tool | Idle Memory | Active Memory | Background Processes | Listens On |
|------|-------------|---------------|---------------------|-----------|
| **Claude Desktop** | 400-800 MB | 1-2 GB | MCP servers only | None |
| **Claude Code** | 150-300 MB | 300-600 MB | Shell + MCP + subagents | None |
| **Cursor** | 600-1000 MB | 1-3 GB | Shadow workspace + indexing | localhost (random) |
| **Windsurf** | 500-800 MB | 1-2 GB | codeium_language_server | localhost (random) |
| **Copilot CLI** | 100-200 MB | 200-400 MB | Shell + MCP | None |
| **Gemini CLI** | 80-150 MB | 150-300 MB | Shell + extensions | None |
| **OpenClaw** | 200-400 MB | 500 MB-2 GB | Gateway + channels + browsers | 18789 |
| **OpenCode** | 100-200 MB | 200-400 MB | Shell + MCP | 4096 (if serving) |
| **ChatGPT Desktop** | 300-500 MB | 400-600 MB | None (server-side inference) | None |
| **M365 Copilot / Teams** | 50-150 MB | 100-400 MB | Dev tunnel + TTK workers | random localhost |
| **Semantic Kernel** | 50-200 MB | 100-300 MB | .NET host process | random localhost |
| **Azure PromptFlow** | 40-150 MB | 100-300 MB | Python flow engine | random localhost |
| **Azure AI (func host)** | 40-200 MB | 80-300 MB | Functions Core Tools | 7071 |
