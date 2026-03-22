# AI Tools — Monitoring & Security Dossiers

> Per-tool reference for detecting, inspecting, and securing AI coding tools and local LLM
> infrastructure. Each dossier is self-contained: file footprint, runtime processes, network
> targets, secrets locations, and known risks — everything a monitoring agent needs in one place.
> Companion to `ai-tools-config-paths.md`, `ai-tools-runtime-processes.md`,
> `ai-tools-traffic-monitoring.md`, `ai-tools-capabilities.md`, and
> `ai-tools-observability.md`. Compiled March 2026.
>
> ## Changelog
> - 2026-03-27: Updated Claude Code dossier — added agent teams paths, worktree paths, managed CLAUDE.md paths, 25 hook events (was 17), plugin data dir, new env vars, memory leak fixes (v2.1.77), OTel integration details

---

## Quick Detection Matrix

| Tool | Type | Runtime | Detection Pattern (`ps`) | Default Port | Key Config Root | Outbound Target |
|------|------|---------|--------------------------|-------------|-----------------|-----------------|
| Claude Desktop | IDE app | Electron | `Claude$\|Claude.exe` | none | `~/Library/Application Support/Claude/` | `api.anthropic.com` |
| Claude Code | CLI agent | Node.js | `^claude$\|claude -p\|claude --print` | none | `~/.claude/` | `api.anthropic.com` |
| OpenAI Codex CLI | CLI agent | Node.js | `^codex$\|codex.exe` | none | `~/.codex/` | `api.openai.com` |
| ChatGPT Desktop | Desktop app | Electron | `ChatGPT$\|ChatGPT.exe` | none | `~/Library/Application Support/ChatGPT/` | `api.openai.com` |
| Gemini CLI | CLI agent | Node.js | `^gemini$` | none | `~/.gemini/` | `generativelanguage.googleapis.com` |
| Copilot (VS Code) | IDE extension | Node.js | `copilot-agent\|copilot-lsp` | none | `~/.config/gh/` | `api.github.com` |
| Copilot CLI | CLI agent | Node.js | `^copilot$\|copilot.exe` | none | `~/.copilot/` | `api.github.com` |
| Cursor | IDE app | Electron | `Cursor$\|Cursor.exe` | random localhost | `~/Library/Application Support/Cursor/` | cursor API endpoints |
| Windsurf | IDE app | Electron | `Windsurf$\|Windsurf.exe` | random localhost | `~/.codeium/windsurf/` | Codeium cloud |
| Continue | IDE extension | Node.js | (runs in extension host) | none | `~/.continue/` | varies by provider |
| OpenClaw | Daemon + CLI | Node.js | `openclaw gateway\|openclaw.*gateway` | **18789** | `~/.openclaw/` | `api.anthropic.com` + channels |
| OpenCode | CLI/TUI/Desktop | Node.js | `^opencode$` | 4096 (serve) | `~/.config/opencode/` | varies by provider |
| Aider | CLI agent | Python | `^aider$\|aider.exe` | none | `~/.aider/` | varies by provider |
| Ollama | Local LLM server | Go binary | `ollama\|ollama serve` | **11434** | `~/.ollama/` | none (local) |
| LM Studio | Local LLM app | Electron | `LM Studio\|lmstudio` | **1234** | `~/.lmstudio/` | none (local) |
| vLLM | Local LLM server | Python | `vllm\|vllm.entrypoints` | **8000** | none (model cache) | none (local) |
| Text Gen WebUI | Local LLM server | Python | `server.py\|text-generation` | **7860** | `./user_data/` | none (local) |
| HuggingFace Hub | Library/cache | Python | n/a (in-process) | none | `~/.cache/huggingface/` | `huggingface.co` |
| LangChain/LangServe | Framework | Python | `uvicorn\|langserve` | **8000** | app-defined | varies by provider |
| LlamaIndex | Framework | Python | n/a (in-process) | none | `./storage/` | varies by provider |

---

## 1. Claude Desktop

**What:** Electron desktop app for Claude chat with MCP server support.

### 1.1 File System Footprint

| Path | Platform | Category | Description |
|------|----------|----------|-------------|
| `~/Library/Application Support/Claude/claude_desktop_config.json` | macOS | config | MCP server configuration |
| `~/.config/Claude/claude_desktop_config.json` | Linux | config | MCP server configuration |
| `%APPDATA%\Claude\claude_desktop_config.json` | Windows | config | MCP server configuration |
| `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\` | Windows | config | MSIX virtualized actual read path |

### 1.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process tree | `Claude` → `Claude Helper (Renderer\|GPU\|Utility)` → `node mcp-server-*` |
| Memory (baseline) | 400–800 MB (no MCP), 1–2 GB (with MCP servers) |
| Memory (heavy use) | 2+ GB (long conversations) |
| Listening ports | None by default |
| Outbound | `api.anthropic.com` (HTTPS) |
| Daemon | No |
| MCP servers | One `node` child process per configured server (stdio); `npx mcp-remote` per HTTP/SSE server |

### 1.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `claude_desktop_config.json` | May contain API keys in MCP server `env` blocks |

### 1.4 Monitoring Commands

```bash
# Find all processes
ps aux | grep -i claude | grep -v grep

# Memory per process
ps -eo pid,rss,comm | grep -i claude | awk '{printf "%s\t%.1f MB\t%s\n", $1, $2/1024, $3}'

# List MCP server subprocesses
ps aux | grep -E 'mcp-server|mcp-remote|npx.*mcp' | grep -v grep

# Check MCP config
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json 2>/dev/null | \
  python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {k}: {v.get(\"command\",\"url\")}') for k,v in d.get('mcpServers',{}).items()]"
```

### 1.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| MCP server orphaning | Medium | MCP processes sometimes not killed on app close |
| `npx mcp-remote` persistence | High | Keeps running indefinitely after removal from config |

---

## 2. Claude Code (CLI Agent)

**What:** Node.js CLI agent with tool use, subagents, MCP servers, and persistent memory.

### 2.1 File System Footprint

**Global (`~/.claude/`):**

| Path | Category | Sent to LLM | Description |
|------|----------|-------------|-------------|
| `~/.claude/settings.json` | config | No | Global user settings (permissions, tools, env) |
| `~/.claude/settings.local.json` | config | No | Local user settings (not synced) |
| `~/.claude/CLAUDE.md` | instructions | Yes (every call) | Global instructions for all projects |
| `~/.claude/.credentials.json` | credentials | No | API credentials (Linux/Windows; macOS uses Keychain) |
| `~/.claude/statsig/` | cache | No | Analytics cache |
| `~/.claude/commands/*.md` | commands | On-demand | Personal slash commands |
| `~/.claude/skills/{skill}/SKILL.md` | skills | Partial | Personal skills |
| `~/.claude/hooks/*.sh` | hooks | No | Lifecycle hooks |
| `~/.claude/plugins/blocklist.json` | config | No | Disabled plugins |
| `~/.claude/plugins/known_marketplaces.json` | config | No | Plugin marketplace registry |
| `~/.claude.json` | config | No | User-scoped MCP servers (`claude mcp add --scope user`) |
| `~/.claude/ide/<lockfile>` | runtime | No | IDE MCP auth token (perms `0600` in `0700` dir) |
| `~/.claude/agents/*.md` | agent | On-demand | User-scope subagent definitions |
| `~/.claude/rules/*.md` | rules | Yes (every call) | User-scope rules (loaded before project rules) |
| `~/.claude/plans/` | runtime | No | Plan files (configurable via `plansDirectory` setting) |
| `~/.claude/teams/{team}/config.json` | config | No | Agent team configuration (experimental) |
| `~/.claude/tasks/{team}/` | runtime | No | Shared task list for agent teams |

**Per-project memory (`~/.claude/projects/{project}/`):**

| Path | Category | Sent to LLM | Description |
|------|----------|-------------|-------------|
| `memory/MEMORY.md` | memory | Yes (first 200 lines, every call) | Auto-memory entrypoint |
| `memory/{topic}.md` | memory | On-demand | Topic-specific memory files |
| `session-{timestamp}.jsonl` | transcript | No | Full session transcript |
| `{session}/subagents/agent-{hex}.jsonl` | transcript | No | Subagent task transcript |

**Project-level:**

| Path | Category | Sent to LLM | Description |
|------|----------|-------------|-------------|
| `CLAUDE.md` | instructions | Yes (every call, survives compaction) | Project instructions (commit to git) |
| `CLAUDE.local.md` | instructions | Yes (every call) | Personal overrides (.gitignore'd) |
| `.claude/settings.json` | config | No | Project settings (shared) |
| `.claude/settings.local.json` | config | No | Personal project settings |
| `.claude/commands/{cmd}.md` | commands | On-demand | Project slash commands |
| `.claude/agents/{agent}.md` | agent | Yes (every call, descriptions) | Subagent persona definitions |
| `.claude/rules/{rule}.md` | rules | Conditional (on file match) | Modular instruction files |
| `.mcp.json` | config | No | Project-level MCP servers |
| `.claudeignore` | ignore | No | Files excluded from access |
| `.claude/skills/{skill}/SKILL.md` | skills | Partial | Project skill definitions |
| `.worktreeinclude` | config | No | Gitignored files to copy into worktrees |
| `.lsp.json` | config | No | Language server configuration |

**Worktree paths:**

| Path | Description |
|------|-------------|
| `{repo}/.claude/worktrees/{name}/` | Isolated git worktree directories |

**Managed/enterprise:**

| Path | Platform | Description |
|------|----------|-------------|
| `/Library/Application Support/ClaudeCode/managed-settings.json` | macOS | Managed policy |
| `/Library/Application Support/ClaudeCode/managed-settings.d/*.json` | macOS | Drop-in policy fragments |
| `/Library/Application Support/ClaudeCode/CLAUDE.md` | macOS | Organization instructions |
| `/Library/Application Support/ClaudeCode/managed-mcp.json` | macOS | Managed MCP config |
| `/etc/claude-code/managed-settings.json` | Linux | Managed policy |
| `/etc/claude-code/managed-settings.d/*.json` | Linux | Drop-in policy fragments |
| `/etc/claude-code/CLAUDE.md` | Linux | Organization instructions |
| `/etc/claude-code/managed-mcp.json` | Linux | Managed MCP config |
| `C:\Program Files\ClaudeCode\managed-settings.json` | Windows | Managed policy |
| `C:\Program Files\ClaudeCode\managed-settings.d\*.json` | Windows | Drop-in policy fragments |
| `C:\Program Files\ClaudeCode\CLAUDE.md` | Windows | Organization instructions |
| `C:\Program Files\ClaudeCode\managed-mcp.json` | Windows | Managed MCP config |
| MDM: `com.anthropic.claudecode` domain | macOS | Managed preferences via MDM |
| Registry: `HKLM\SOFTWARE\Policies\ClaudeCode` | Windows | Admin policy via Group Policy |

**Temp artifacts:**

| Path | Description |
|------|-------------|
| `/tmp/claude-{user}/{project}/{session}/scratchpad/` | Per-session scratchpad |
| `tmpclaude-{hex}-cwd` | CWD tracking file (drops in project root — known bug) |
| `{project-root}/tmp/attachments/` | Attachment staging (created in project root — known bug) |
| `/tmp/claude-{user}/tasks/{task}.output` | Symlink to subagent task output |

### 2.2 Runtime Properties

| Property | Value |
|----------|-------|
| Main process | `claude` — Node.js single-threaded event loop |
| Shell | Persistent `bash -l` (survives across tool calls) |
| MCP servers | One child per server (`node mcp-server-*`, `npx mcp-remote`, `python mcp-server-*`) |
| Subagents | `claude --print --resume <id>` — separate process with own shell + context |
| Browser | `agent-browser` → `chrome-headless-shell` (headless Chromium) |
| Memory (main) | 150–400 MB (fixed in v2.1.77: ~100-150MB less peak, 45% faster resume) |
| Memory (subagent) | ~45 MB each |
| Memory (MCP server) | 15–50 MB each |
| Memory (headless browser) | 200–400 MB per instance |
| Listening ports | None by default; IDE MCP server on `127.0.0.1:<random>` |
| Outbound | `api.anthropic.com` (or Bedrock/Vertex/Foundry endpoints) |
| Daemon | No (session-scoped) |
| Agent teams | Experimental: team lead + teammates as separate Claude Code instances |
| Sandbox | macOS: Seatbelt; Linux/WSL2: bubblewrap+socat; Windows: planned |
| Context window | 200K standard, 1M for Max/Team/Enterprise |
| Auto-compaction | ~95% of context capacity (configurable) |
| OpenTelemetry | 8 metrics + 5 event types (requires `CLAUDE_CODE_ENABLE_TELEMETRY=1`) |
| Hook events | 25 named events with command/http/prompt/agent handlers |
| Detection env var | `CLAUDECODE=1` set in spawned shells |

### 2.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.claude/.credentials.json` | API credentials (Linux/Windows) |
| macOS Keychain | API credentials (macOS) |
| `~/.claude/ide/<lockfile>` | IDE MCP auth token (`0600` perms) |
| `.mcp.json` / `~/.claude.json` | May contain API keys in MCP `env` blocks |
| `session-*.jsonl` | Full conversation history including file contents |

### 2.4 Monitoring Commands

```bash
# All Claude Code processes and children
ps aux | grep -E 'claude|mcp-server|mcp-remote|chrome-headless|agent-browser|playwright' | grep -v grep

# Process tree
pstree -p $(pgrep -xf "claude" | head -1)

# Memory summary
ps -eo pid,rss,comm,args | grep -E 'claude|mcp-server' | \
  awk '{printf "PID %-8s %6.1f MB  %s\n", $1, $2/1024, $4}'

# Find orphaned subagents (PPID=1 = parent died)
ps -eo pid,ppid,rss,etime,args | awk '$2==1' | grep -E 'claude|mcp-server'

# Check configured MCP servers
cat ~/.claude.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {k}: {v.get(\"command\",\"http\")}') for k,v in d.get('mcpServers',{}).items()]" 2>/dev/null
cat .mcp.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {k}: {v.get(\"command\",\"http\")}') for k,v in d.get('mcpServers',{}).items()]" 2>/dev/null

# Check scratchpad location
ls -la /tmp/claude-$(whoami)/ 2>/dev/null

# Check active worktrees
ls -la .claude/worktrees/ 2>/dev/null

# Check agent team state
ls -la ~/.claude/teams/ 2>/dev/null
ls -la ~/.claude/tasks/ 2>/dev/null

# Check managed policy
cat /Library/Application\ Support/ClaudeCode/managed-settings.json 2>/dev/null  # macOS
cat /etc/claude-code/managed-settings.json 2>/dev/null                          # Linux

# Detect if running inside Claude Code shell
echo $CLAUDECODE  # "1" if inside a Claude-spawned shell
```

### 2.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Subagent accumulation | **High** | `claude --print` processes may not terminate after Task tool; ~45 MB each, can reach 10+ GB (partially mitigated in v2.1.77) |
| MCP server orphaning | **High** | Not killed on session end or `mcp remove`; `npx mcp-remote` worst offender |
| Headless browser persistence | **High** | `chrome-headless-shell` + `agent-browser` persist after web research; 200–400 MB each |
| Build process persistence | Medium | `esbuild`, `vite`, `next dev`, `webpack` started via Bash tool never stopped |
| Session transcripts | Medium | `session-*.jsonl` contain full conversation including file contents — sensitive data at rest |
| Temp file leaks | Low | `tmpclaude-*-cwd` files and `tmp/attachments/` created in project root |
| IDE MCP token exposure | Low | Lock file under `~/.claude/ide/` — protected by `0600`/`0700` perms |

---

## 3. OpenAI Codex CLI

**What:** Node.js CLI agent from OpenAI with layered config and optional history.

### 3.1 File System Footprint

| Path | Category | Sent to LLM | Description |
|------|----------|-------------|-------------|
| `~/.codex/config.json` | config | No | User configuration |
| `~/.codex/instructions.md` | instructions | Yes (every call) | Custom instructions (now prefers AGENTS.md) |
| `~/.codex/sessions/` | transcript | No | Session data |
| `{project-root}/AGENTS.md` | instructions | Yes (every call) | Project instructions (cross-tool standard) |
| `~/.openai/.env` | credentials | No | `OPENAI_API_KEY` |
| `~/.openai/config.json` | config | No | OpenAI API settings |

**Environment variables:** `CODEX_HOME` (default `~/.codex`), `OPENAI_API_KEY`, `OPENAI_BASE_URL`

### 3.2 Runtime Properties

| Property | Value |
|----------|-------|
| Main process | `codex` — Node.js |
| Memory | 100–300 MB |
| Listening ports | None |
| Outbound | `api.openai.com` |
| MCP support | Yes, via `~/.codex/config.json` |

### 3.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.openai/.env` | `OPENAI_API_KEY` (plaintext) |
| `~/.codex/config.json` | May contain `auth.json` reference or inline credentials |

### 3.4 Monitoring Commands

```bash
ps aux | grep -E 'codex' | grep -v grep
```

### 3.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Plaintext API key | Medium | `~/.openai/.env` stores key as plaintext |
| History persistence | Low | `history.jsonl` (if enabled) contains conversation data |

---

## 4. ChatGPT Desktop

**What:** Thin Electron client — all inference is server-side, minimal local footprint.

### 4.1 File System Footprint

| Path | Platform | Category | Description |
|------|----------|----------|-------------|
| `~/Library/Application Support/ChatGPT/` | macOS | app-data | App data directory |
| `%APPDATA%\ChatGPT\` | Windows | app-data | App data directory |

### 4.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process tree | `ChatGPT` → `ChatGPT Helper (Renderer\|GPU\|Utility)` |
| Memory | 300–600 MB |
| Listening ports | None |
| Outbound | `api.openai.com`, `chatgpt.com` |
| MCP servers | None |
| Local models | None — fully server-side |

### 4.3 Monitoring Commands

```bash
ps aux | grep -i chatgpt | grep -v grep
```

### 4.4 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Minimal local risk | Low | Thin client; no local secrets beyond session cookies |

---

## 5. Gemini CLI

**What:** Lightweight Node.js CLI agent from Google with extension support and persistent memory.

### 5.1 File System Footprint

| Path | Category | Sent to LLM | Description |
|------|----------|-------------|-------------|
| `~/.gemini/GEMINI.md` | instructions | Yes (every call) | Global context/instructions |
| `~/.gemini/settings.json` | config | No | CLI settings (model, MCP servers) |
| `~/.gemini/.geminiignore` | ignore | No | Global ignore patterns |
| `~/.gemini/extensions/{ext}/` | extensions | No | Installed extension data |
| `~/.gemini/memory/` | memory | On-demand | Persistent memory (via `save_memory` tool) |
| `{project-root}/GEMINI.md` | instructions | Yes (every call) | Project-specific context |
| `{project-root}/AGENTS.md` | instructions | Yes (fallback) | Alternative (GEMINI.md takes precedence) |
| `{project-root}/.geminiignore` | ignore | No | Project-level ignore |
| `{subdirectory}/GEMINI.md` | instructions | Yes (on access) | Component-specific instructions (recursive) |

**Environment variables:** `GEMINI_CLI_HOME` (default `~/.gemini/`), `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`

### 5.2 Runtime Properties

| Property | Value |
|----------|-------|
| Main process | `gemini` — Node.js (smallest CLI agent footprint) |
| Memory | 80–200 MB |
| Extensions | Child processes under `~/.gemini/extensions/` |
| Listening ports | None |
| Outbound | `generativelanguage.googleapis.com` |
| Auth | OAuth with Google account (token cached locally) |

### 5.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` target | Service account JSON key |
| Local OAuth token cache | Google account access token |
| `~/.gemini/settings.json` | May contain API keys |

### 5.4 Monitoring Commands

```bash
ps aux | grep gemini | grep -v grep
ls ~/.gemini/extensions/
```

### 5.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| OAuth token cache | Low | Cached Google credentials — protected by filesystem perms |
| Extension processes | Low | Extensions run as child processes with tool capabilities |

---

## 6. GitHub Copilot (VS Code Extension + CLI)

**What:** AI completion and agent system — VS Code extension and standalone CLI.

### 6.1 File System Footprint

**CLI (`~/.copilot/`):**

| Path | Category | Sent to LLM | Description |
|------|----------|-------------|-------------|
| `~/.copilot/config.json` | config | No | Core CLI settings (trusted folders, permissions) |
| `~/.copilot/mcp-config.json` | config | No | User-level MCP server configurations |
| `~/.copilot/copilot-instructions.md` | instructions | Yes (every call) | Global personal instructions |
| `~/.copilot/lsp-config.json` | config | No | Language server definitions |
| `~/.copilot/agents/{agent}.md` | agent | On-demand | Custom agent definitions |
| `~/.copilot/hooks/` | hooks | No | Global lifecycle hooks |
| `~/.copilot/command-history-state.json` | runtime | No | Command history |
| `~/.copilot/session-state/{session}/events.jsonl` | transcript | No | Full session event log |
| `~/.copilot/session-state/{session}/workspace.yaml` | runtime | No | Session metadata |
| `~/.copilot/session-state/{session}/plan.md` | runtime | No | Implementation plan |
| `~/.copilot/session-state/{session}/checkpoints/` | runtime | No | Compaction snapshots |
| `~/.copilot/logs/` | logs | No | Debug and error logs |
| `~/.config/gh/hosts.yml` | credentials | No | GitHub CLI auth tokens |

**Repository-level:**

| Path | Category | Sent to LLM | Description |
|------|----------|-------------|-------------|
| `.github/copilot-instructions.md` | instructions | Yes (every call) | Repo-wide AI instructions |
| `.github/instructions/*.instructions.md` | instructions | Conditional (on file match) | Path-specific instructions |
| `.github/prompts/*.prompt.md` | commands | On-demand | Reusable prompt templates |
| `.github/agents/*.agent.md` | agent | On-demand | Custom agent definitions |
| `.github/skills/{skill}/SKILL.md` | skills | On-demand | Copilot CLI skills |
| `.github/hooks/*.json` | hooks | No | Lifecycle hook configs |
| `.github/copilot/settings.json` | config | No | Repo-level Copilot settings |
| `.copilot/mcp-config.json` | config | No | Project-level MCP servers |
| `AGENTS.md` | instructions | Yes (every call) | Cross-tool agent instructions |

**Environment variables:** `COPILOT_HOME`, `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`

### 6.2 Runtime Properties

**VS Code extension:**

| Property | Value |
|----------|-------|
| Runs inside | Editor extension host process |
| Child processes | `copilot-agent`, `copilot-lsp`, `copilot-language-server` |
| Memory | 30–100 MB |
| Outbound | `api.github.com`, `copilot-proxy.githubusercontent.com` |
| No separate daemon | Lives within editor lifecycle |

**CLI:**

| Property | Value |
|----------|-------|
| Main process | `copilot` — Node.js |
| Shell | `bash / sh` for command execution |
| Subagents | `copilot (subagent)` — human-readable IDs (e.g., `math-helper-0`) |
| Fleet workers | `copilot (fleet worker)` for `/fleet` parallel tasks |
| Memory | 100–300 MB |
| MCP servers | Builtin, user-configured, or per-session (`--additional-mcp-config`) |
| Session store | SQLite for `/chronicle` feature |
| Outbound | `api.github.com` + model endpoints |

### 6.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.config/gh/hosts.yml` | GitHub CLI OAuth tokens |
| `~/.copilot/session-state/*/events.jsonl` | Full session history including file contents |

### 6.4 Monitoring Commands

```bash
# VS Code extension
ps aux | grep -E 'copilot-agent|copilot-lsp|copilot-language-server' | grep -v grep

# CLI
ps aux | grep copilot | grep -v grep

# Session state disk usage
du -sh ~/.copilot/session-state/

# Orphaned subagents
ps -eo pid,ppid,args | grep "copilot" | awk '$2==1'
```

### 6.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| MCP server persistence | Medium | May not terminate on session end |
| Session transcripts | Medium | `events.jsonl` contains full conversation data |
| GitHub token exposure | Low | `~/.config/gh/hosts.yml` — plaintext OAuth tokens |

---

## 7. Cursor

**What:** Electron-based VS Code fork with AI agent (Cascade), codebase indexing, and shadow workspace.

### 7.1 File System Footprint

| Path | Platform | Category | Description |
|------|----------|----------|-------------|
| `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` | macOS | database | SQLite settings DB (all settings stored here) |
| `~/Library/Application Support/Cursor/CachedData/{version}/` | macOS | cache | Per-version cache (**never auto-cleaned**) |
| `~/Library/Application Support/Cursor/User/workspaceStorage/{workspace}/` | macOS | cache | Per-workspace storage (breaks if project moves) |
| `~/.cursor/extensions/` | macOS/Linux | extensions | Extension installations |
| `~/.cursor-server/` | macOS/Linux | runtime | Remote SSH server installation |
| `{project-root}/.cursorrules` | all | instructions | Legacy project AI rules |
| `{project-root}/.cursor/rules/*.md` | all | rules | Modern granular rule files |
| `{project-root}/.cursor/rules/*.mdc` | all | rules | Legacy rule format |
| `{project-root}/.cursor/mcp.json` | all | config | Project MCP server config |
| `{project-root}/.cursorignore` | all | ignore | Files excluded from AI context |

### 7.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process tree | `Cursor` → `Cursor Helper (Renderer\|GPU\|Extension Host\|Shared Process\|FileWatcher)` + `cursor-language-server` + `cursor-indexing` + `Shadow Workspace` |
| Memory | 800 MB – 2 GB (depends on project size) |
| Shadow Workspace | Invisible background editor for pre-testing — **#1 cause of CPU spikes** |
| CachedData | Per-version directories — **never auto-cleaned** |
| Settings | SQLite DB (`state.vscdb`), not JSON |
| Listening ports | Random localhost (extension communication) |
| Outbound | Cursor proprietary AI API endpoints |
| Remote dev | `~/.cursor-server/` installed on remote hosts via SSH |

### 7.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `state.vscdb` | May contain API keys, preferences, session data in SQLite |
| `.cursor/mcp.json` | MCP server configs with potential API keys in `env` |

### 7.4 Monitoring Commands

```bash
# All Cursor processes
ps aux | grep -i cursor | grep -v grep

# CPU consumers (find shadow workspace issues)
ps -eo pid,pcpu,rss,comm | grep -i cursor | sort -k2 -rn

# Indexing process
ps aux | grep cursor-indexing

# Query settings DB
sqlite3 ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb \
  "SELECT key FROM ItemTable LIMIT 20"

# CachedData disk usage (check for bloat)
du -sh ~/Library/Application\ Support/Cursor/CachedData/*/

# Remote server on SSH target
ps aux | grep cursor-server
```

### 7.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| CachedData bloat | Medium | Per-version cache directories never auto-cleaned; can grow to many GB |
| Shadow Workspace CPU | Medium | Causes 100% CPU on large projects |
| MCP server persistence | Medium | May persist after Cursor closes |
| Workspace storage path-binding | Low | Per-workspace storage breaks if project directory moves |

---

## 8. Windsurf (Codeium)

**What:** Electron VS Code fork with Cascade AI agent and native `codeium_language_server`.

### 8.1 File System Footprint

| Path | Platform | Category | Description |
|------|----------|----------|-------------|
| `~/.codeium/windsurf/memories/global_rules.md` | macOS/Linux | instructions | Global AI guidelines |
| `~/.codeium/windsurf/mcp_config.json` | macOS/Linux | config | MCP server configuration |
| `~/.codeium/.codeiumignore` | macOS/Linux | ignore | Global ignore rules (enterprise) |
| `{project-root}/.windsurfrules` | all | instructions | Legacy project-wide AI rules |
| `{project-root}/.windsurf/rules/*.md` | all | rules | Modern granular rules (Wave 8+) |
| `{project-root}/.windsurf/mcp.json` | all | config | Project MCP server config |
| `{project-root}/.codeiumignore` | all | ignore | Project-level file exclusions |
| `{project-root}/cascade-memories/` | all | memory | Cascade-generated memories (auto, in project root) |

### 8.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process tree | `Windsurf` → `Windsurf Helper (Renderer\|GPU\|Extension Host\|FileWatcher)` + `codeium_language_server` + `windsurf-indexing` |
| `codeium_language_server` | **Native binary** (not Node.js) — handles local completions |
| Memory | 300–600 MB base, plus language server |
| Cascade agent | Runs within extension host; can continue in background |
| Listening ports | `codeium_language_server` on random localhost for RPC |
| Outbound | Codeium cloud services |

### 8.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.codeium/windsurf/mcp_config.json` | MCP configs with potential API keys |
| `~/.codeium/windsurf/memories/global_rules.md` | May contain org-specific context |

### 8.4 Monitoring Commands

```bash
# All Windsurf processes
ps aux | grep -iE 'windsurf|codeium' | grep -v grep

# Language server
ps aux | grep codeium_language_server

# Memory footprint
ps -eo pid,rss,comm | grep -iE 'windsurf|codeium' | \
  awk '{printf "%s\t%.1f MB\t%s\n", $1, $2/1024, $3}'
```

### 8.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| `codeium_language_server` persistence | Medium | Can persist after Windsurf closes |
| MCP server persistence | Medium | May persist after app closes |
| Cascade memories in project root | Low | `cascade-memories/` created in project root — may be committed accidentally |

---

## 9. Continue (IDE Extension + CLI)

**What:** Open-source IDE extension (VS Code/JetBrains) and `cn` CLI with multi-provider support.

### 9.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `~/.continue/config.yaml` | config | Primary configuration (macOS/Linux) |
| `~/.continue/config.json` | config | Legacy configuration |
| `~/.continue/config.ts` | config | Advanced programmatic config |
| `~/.continue/.env` | credentials | API keys for model providers |
| `~/.continue/rules/` | instructions | Global rule files |
| `~/.continue/sessions/{uuid}.json` | transcript | Session persistence files |
| `{project-root}/.continuerules` | instructions | Project-specific rules |
| `{project-root}/.continue/rules/` | instructions | Workspace rules |
| `{project-root}/.continueignore` | ignore | Files to exclude |

### 9.2 Runtime Properties

| Property | Value |
|----------|-------|
| Runs inside | IDE extension host (VS Code/JetBrains) |
| CLI | `cn` uses same config.yaml |
| Network | Depends on configured provider (Anthropic, OpenAI, local, etc.) |
| TLS config | `requestOptions.caBundlePath` in config.yaml for custom CAs |
| Session persistence | JSON files under `~/.continue/sessions/` |

### 9.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.continue/config.yaml` | **Canonical secrets file** — `apiKey` fields for model providers |
| `~/.continue/.env` | API keys |
| `~/.continue/config.yaml` | TLS certificate bundle paths (network trust settings) |

### 9.4 Monitoring Commands

```bash
# Continue sessions
ls ~/.continue/sessions/ 2>/dev/null

# Check for API keys in config (SENSITIVE — audit only)
grep -i apikey ~/.continue/config.yaml 2>/dev/null | head -5
```

### 9.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Plaintext API keys | **High** | `config.yaml` routinely contains `apiKey` fields in plaintext |
| Session persistence | Medium | JSON session files persist indefinitely under `~/.continue/sessions/` |
| Config auto-regeneration | Low | Missing config is recreated with defaults — may expose unexpected state |

---

## 10. OpenClaw

**What:** Always-on personal AI assistant daemon — connects to WhatsApp, Telegram, Discord, Slack, etc.

### 10.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `~/.openclaw/openclaw.json` | config | Main configuration (JSON5, hot-reloaded) |
| `~/.openclaw/.env` | credentials | API keys (`ANTHROPIC_API_KEY`, etc.) |
| `~/.openclaw/credentials/` | credentials | Channel auth (WhatsApp session, etc.) |
| `~/.openclaw/workspace/AGENTS.md` | instructions | Agent behavior instructions |
| `~/.openclaw/workspace/SOUL.md` | instructions | Personality/identity definition |
| `~/.openclaw/workspace/TOOLS.md` | instructions | Machine-specific environment config |
| `~/.openclaw/workspace/SHIELD.md` | instructions | Optional security policy |
| `~/.openclaw/workspace/MEMORY.md` | memory | Curated essentials, always in context |
| `~/.openclaw/workspace/BOOT.md` | instructions | Startup routine |
| `~/.openclaw/workspace/HEARTBEAT.md` | instructions | Periodic checks schedule |
| `~/.openclaw/workspace/USER.md` | instructions | User profile for personalization |
| `~/.openclaw/workspace/skills/{skill}/SKILL.md` | skills | Skill definitions |
| `~/.openclaw/agents/{agent}/SOUL.md` | agent | Per-agent personality |
| `~/.openclaw/openclaw.json.bak` | backup | Auto-backup on config changes |
| `~/openclaw-fleet/{server}.md` | runtime | Fleet state (one .md per remote server) |

### 10.2 Runtime Properties

| Property | Value |
|----------|-------|
| Gateway | **Always-on daemon** (launchd/systemd/schtasks) |
| Default port | **18789** (WebSocket + HTTP dashboard) |
| Process tree | `openclaw gateway` → `node (session handler)` → `claude / model CLI` |
| WhatsApp | Puppeteer → headless Chromium (100–400 MB for browser alone) |
| Telegram/Discord | Bot polling connections |
| MCP servers | Child processes of gateway |
| Docker sandboxing | Optional per-session Docker containers |
| Heartbeat/cron | Periodic scheduled tasks |
| Config hot-reload | Watches `openclaw.json` for changes |

### 10.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.openclaw/.env` | All API keys (Anthropic, OpenAI, Brave, gateway tokens) |
| `~/.openclaw/credentials/` | WhatsApp session data, Telegram bot tokens |
| `~/.openclaw/openclaw.json` | Channel configs, auth modes, gateway passwords |

### 10.4 Monitoring Commands

```bash
# All OpenClaw processes
ps aux | grep -iE 'openclaw|clawdbot' | grep -v grep

# Gateway process tree
pstree -p $(pgrep -f "openclaw gateway")

# Port check
lsof -i :18789

# WhatsApp browser memory
ps -eo pid,rss,args | grep -i chromium | grep -i whatsapp

# Service management
openclaw gateway status
openclaw gateway status --deep
openclaw health
openclaw doctor
openclaw channels logs
```

### 10.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Always-on daemon | Medium | Runs 24/7 — persistent attack surface |
| Plaintext channel credentials | **High** | WhatsApp session, bot tokens in `~/.openclaw/credentials/` |
| Headless Chromium (WhatsApp) | Medium | Heavy memory user (200–500 MB), persistent browser session |
| Gateway port exposure | Medium | Port 18789 accessible — auth mode should be verified |
| Config hot-reload | Low | Changes to `openclaw.json` take effect immediately |

---

## 11. OpenCode

**What:** Terminal-based AI coding tool (TUI/CLI/Desktop/GitHub Action) by SST.

### 11.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `~/.config/opencode/opencode.json` | config | Global config (JSON or JSONC) |
| `~/.config/opencode/AGENTS.md` | instructions | Global instructions |
| `~/.config/opencode/tui.json` | config | TUI settings (theme, keybinds) |
| `~/.config/opencode/agents/{agent}.md` | agent | Custom agent definitions |
| `~/.config/opencode/commands/{cmd}.md` | commands | Global custom commands |
| `~/.config/opencode/opencode.settings.dat` | runtime | Desktop app server URL state |
| `~/.config/opencode/opencode.global.dat` | runtime | UI state (recent servers/projects) |
| `{project-root}/opencode.json` | config | Project config (merges with global) |
| `{project-root}/AGENTS.md` | instructions | Project instructions (primary) |
| `{project-root}/.opencode/agents/{agent}.md` | agent | Project-specific agents |
| `{project-root}/.opencode/commands/{cmd}.md` | commands | Project-specific commands |
| `{project-root}/.ignore` | ignore | Override .gitignore |

### 11.2 Runtime Properties

| Property | Value |
|----------|-------|
| Main process | `opencode` — Node.js (TUI or CLI) |
| Desktop | Electron app with `opencode-cli` sidecar (port 4096 default) |
| Subagents | `opencode (subagent)` for delegated tasks |
| Memory | 80–250 MB |
| Listening ports | 4096 (serve/web mode), mDNS (optional) |
| Outbound | Varies by configured provider |

### 11.3 Monitoring Commands

```bash
ps aux | grep opencode | grep -v grep
lsof -i :4096
```

### 11.4 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Desktop sidecar exposure | Low | `opencode-cli` sidecar listens on port 4096 |
| Subagent persistence | Low | May not terminate cleanly |

---

## 12. Aider

**What:** Python-based CLI coding agent with multi-model support and git integration.

### 12.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `~/.aider/.aider.conf.yml` | config | Global configuration |
| `{project-root}/.aider.conf.yml` | config | Project configuration |
| `{project-root}/.aiderignore` | ignore | Files to exclude |
| `{project-root}/.aider.tags.cache.v3/` | cache | Code indexing cache (ctags) |

### 12.2 Runtime Properties

| Property | Value |
|----------|-------|
| Main process | `aider` — Python |
| Memory | 50–200 MB |
| Listening ports | None |
| Outbound | Varies by configured provider (OpenAI, Anthropic, etc.) |

### 12.3 Monitoring Commands

```bash
ps aux | grep aider | grep -v grep
du -sh .aider.tags.cache.v3/ 2>/dev/null
```

### 12.4 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Indexing cache size | Low | `.aider.tags.cache.v3/` can grow on large projects |

---

## 13. Ollama

**What:** Local LLM server — downloads, manages, and serves models via HTTP API on localhost.

### 13.1 File System Footprint

| Path | Platform | Category | Description |
|------|----------|----------|-------------|
| `~/.ollama/models/` | macOS | models | Model store (blobs + manifests) |
| `/usr/share/ollama/.ollama/models/` | Linux | models | Model store (default, `ollama` user) |
| `C:\Users\%username%\.ollama\models\` | Windows | models | Model store |
| `~/.ollama/logs/server.log` | macOS | logs | Server log file |
| systemd journal (`journalctl -u ollama`) | Linux | logs | Server logs (systemd) |

**Model store structure:**
```
~/.ollama/models/
├── blobs/           # Model weight files (large, persistent)
│   └── sha256-...   # Content-addressed blobs
└── manifests/       # Model metadata and layer references
    └── registry.ollama.ai/
        └── library/
            └── llama3/
```

**Environment variables:** `OLLAMA_MODELS` (override model path), `OLLAMA_KEEP_ALIVE` (model residency control), `OLLAMA_HOST` (bind address)

### 13.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process | `ollama serve` — Go binary |
| Default bind | `127.0.0.1:11434` |
| API compatibility | OpenAI-compatible + Anthropic-compatible (`ANTHROPIC_BASE_URL=http://localhost:11434`) |
| Model residency | Controlled by `keep_alive` parameter / `OLLAMA_KEEP_ALIVE` env |
| Memory | Depends on model size — 2–32+ GB when model loaded |
| Garbage collection | Removes unused blobs periodically |
| Daemon | Yes (systemd on Linux, launchd on macOS after install) |

### 13.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.ollama/` | No secrets by default — local-only server |
| Model weights | Potentially licensed/gated models downloaded from registries |

### 13.4 Monitoring Commands

```bash
# Server process
ps aux | grep ollama | grep -v grep

# Port check
lsof -i :11434

# API health check
curl -s http://127.0.0.1:11434/api/tags | python3 -m json.tool

# List loaded models
curl -s http://127.0.0.1:11434/api/ps

# Model store disk usage
du -sh ~/.ollama/models/

# Logs (macOS)
tail -f ~/.ollama/logs/server.log

# Logs (Linux systemd)
journalctl -u ollama -f
```

### 13.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Large disk usage | Medium | Model blobs are multi-GB; can fill disk without monitoring |
| Network exposure | Medium | `--listen 0.0.0.0` exposes to LAN — verify bind address |
| Model residency memory | Medium | Loaded models consume significant RAM; `keep_alive=0` to unload |
| Blob garbage collection | Low | Automated but may leave large artifacts between runs |
| API compatibility shim | Low | Anthropic/OpenAI-compatible endpoints accept but ignore auth tokens |

---

## 14. LM Studio

**What:** Desktop app for downloading and serving local LLMs via OpenAI-compatible API.

### 14.1 File System Footprint

| Path | Platform | Category | Description |
|------|----------|----------|-------------|
| `~/.lmstudio/models/{publisher}/{model}/{file}.gguf` | macOS/Linux | models | Downloaded model files |
| `%USERPROFILE%\.lmstudio\models\` | Windows | models | Downloaded model files |
| `~/.lmstudio/config-presets/` | macOS/Linux | config | Preset configurations (JSON) |
| `%USERPROFILE%\.lmstudio\config-presets\` | Windows | config | Preset configurations |
| `~/.lmstudio/hub/` | macOS/Linux | config | Hub shared presets |

### 14.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process | `LM Studio` — Electron app |
| Default API port | `1234` (`http://localhost:1234/v1`) |
| API compatibility | OpenAI-compatible + Anthropic-compatible endpoints |
| Memory | Depends on loaded model — can be very large |
| Daemon | No (app lifecycle) |

### 14.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| Preset JSON files | May contain system prompts, tool definitions, endpoint tokens |

### 14.4 Monitoring Commands

```bash
# LM Studio processes
ps aux | grep -i "lm studio\|lmstudio" | grep -v grep

# Port check
lsof -i :1234

# API health check
curl -s http://localhost:1234/v1/models | python3 -m json.tool

# Model store disk usage
du -sh ~/.lmstudio/models/
```

### 14.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Delete doesn't remove files | Medium | Deleting a model in UI may leave folder on disk — **confirmed bug** |
| Disk usage | Medium | GGUF model files are multi-GB |
| API port exposure | Low | Verify bind address — local by default but depends on settings |

---

## 15. vLLM

**What:** High-performance Python LLM serving engine with OpenAI-compatible API.

### 15.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| No fixed state root | — | Relies on model source/caches (typically HuggingFace cache) |
| `~/.cache/huggingface/hub/` | cache | Models downloaded via HF (shared with other HF tools) |
| Model's `generation_config.json` | config | Generation defaults from HF repo (applied unless disabled) |

### 15.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process | `python -m vllm.entrypoints.openai.api_server` |
| Default port | `8000` (`http://localhost:8000/v1`) |
| API compatibility | OpenAI-compatible (`/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`) |
| Memory | Depends on model — typically 4–80+ GB GPU memory |
| Daemon | No (manual start) |

### 15.3 Monitoring Commands

```bash
# vLLM process
ps aux | grep -E 'vllm|vllm.entrypoints' | grep -v grep

# Port check
lsof -i :8000

# API health check
curl -s http://localhost:8000/v1/models | python3 -m json.tool

# GPU memory (if applicable)
nvidia-smi
```

### 15.4 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Generation config override | Medium | `generation_config.json` in HF model repo can override defaults; disable with `--generation-config vllm` |
| Shared HF cache | Low | Model cache shared with other HuggingFace tools |
| No built-in auth | Low | No authentication on API endpoint by default |

---

## 16. Text Generation WebUI (oobabooga)

**What:** Local web UI and API server for running LLMs with extensive model support.

### 16.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `./installer_files/` | runtime | One-click installer conda environment |
| `./user_data/CMD_FLAGS.txt` | config | CLI flags (persistent across launches) |
| `./user_data/logs/` | logs | Server logs |
| `./user_data/cache/` | cache | Runtime cache |
| `./settings.yaml` | config | UI settings (saved via "Save settings" button) |

### 16.2 Runtime Properties

| Property | Value |
|----------|-------|
| Process | `python server.py` |
| Default bind | `127.0.0.1:7860` |
| Flags | `--listen` exposes on LAN; `--listen-port` changes port; `--listen-host` changes bind |
| API mode | `--api` exposes OpenAI/Anthropic-compatible endpoints |
| Memory | Depends on model |
| Daemon | No (manual start) |

### 16.3 Monitoring Commands

```bash
# Process
ps aux | grep -E 'server.py|text-generation' | grep -v grep

# Port check
lsof -i :7860

# Check if exposed to LAN
grep -E '\-\-listen' user_data/CMD_FLAGS.txt 2>/dev/null
```

### 16.4 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| `--listen` LAN exposure | **High** | Exposes UI and API to entire local network — verify in `CMD_FLAGS.txt` |
| `--api` endpoint exposure | Medium | OpenAI/Anthropic-compatible API with no auth by default |
| `installer_files/` size | Low | Conda environment can be very large |

---

## 17. HuggingFace Hub & Libraries

**What:** Model/dataset download infrastructure, caching, and token management used by most ML tools.

### 17.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `~/.cache/huggingface/` (`$HF_HOME`) | cache | Root cache directory |
| `~/.cache/huggingface/token` | credentials | **Plaintext access token** |
| `~/.cache/huggingface/hub/` | cache | Downloaded model/dataset repositories |
| `~/.cache/huggingface/assets/` | cache | Asset cache |
| `~/.cache/huggingface/xet/` | cache | Xet storage chunk cache |

**Environment variables:** `HF_HOME` (default `~/.cache/huggingface`), `HF_TOKEN`, `HF_TOKEN_PATH`, `TRANSFORMERS_CACHE` (legacy)

### 17.2 Runtime Properties

| Property | Value |
|----------|-------|
| Type | In-process Python library (no separate process) |
| Inference API | Outbound to `https://api-inference.huggingface.co` (configurable) |
| Cache mechanics | Two-tier: file cache + chunk cache |
| Token storage | Plaintext at `$HF_HOME/token` by default |

### 17.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `~/.cache/huggingface/token` | **HuggingFace access token (plaintext)** — grants private model/dataset access |

### 17.4 Monitoring Commands

```bash
# Token exists?
ls -la ~/.cache/huggingface/token 2>/dev/null

# Cache disk usage
du -sh ~/.cache/huggingface/hub/ 2>/dev/null

# Total HF cache
du -sh ~/.cache/huggingface/ 2>/dev/null

# Check token permissions
stat -f "%Lp" ~/.cache/huggingface/token 2>/dev/null  # macOS
stat -c "%a" ~/.cache/huggingface/token 2>/dev/null    # Linux
```

### 17.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Plaintext token | **High** | `~/.cache/huggingface/token` is plaintext — workstation compromise exposes private model access |
| Cache disk usage | Medium | Hub cache can grow to tens/hundreds of GB with many models |
| Token in shell history | Low | `huggingface-cli login` may leave token in shell history |

---

## 18. LangChain / LangServe

**What:** Python framework for LLM applications with app-defined persistence patterns.

### 18.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `chat_histories/{id}.json` | data | File-based chat histories (app-defined pattern) |
| `chat_histories/{user}/{id}.json` | data | Per-user chat history variant |
| `.langchain.db` | database | SQLite cache file |

**Note:** All paths are app-defined — these are common patterns from official examples.

### 18.2 Runtime Properties

| Property | Value |
|----------|-------|
| LangServe server | `uvicorn` at `localhost:8000` (example pattern) |
| Type | In-process Python library; LangServe adds HTTP serving |
| Cache | Optional SQLite (`.langchain.db`) |
| Persistence | Explicit — `FileChatMessageHistory` creates JSON files |

### 18.3 Secrets & Sensitive Files

| File | Content |
|------|---------|
| `chat_histories/*.json` | **Full prompt contents verbatim** — sensitive conversation data |
| `.langchain.db` | Cached LLM responses |

### 18.4 Monitoring Commands

```bash
# LangServe server
ps aux | grep -E 'uvicorn|langserve' | grep -v grep

# Port check
lsof -i :8000

# Chat history files
find . -path '*/chat_histories/*.json' -type f 2>/dev/null

# Cache DB
find . -name '.langchain.db' -type f 2>/dev/null
```

### 18.5 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Verbatim prompt storage | **High** | `chat_histories/*.json` contains full conversation including sensitive prompts |
| No auth on LangServe | Medium | Example servers have no auth by default |
| Cache DB contains responses | Low | `.langchain.db` may contain cached LLM responses |

---

## 19. LlamaIndex

**What:** Python framework for LLM data applications with explicit local persistence.

### 19.1 File System Footprint

| Path | Category | Description |
|------|----------|-------------|
| `./storage/` | data | Default persistence directory (`persist_dir`) |
| Custom `persist_dir` | data | User-specified persistence location |

**Storage directory contents:**
```
./storage/
├── docstore.json          # Document metadata
├── index_store.json       # Index definitions
├── vector_store.json      # Embeddings (can be large)
└── graph_store.json       # Knowledge graph (if applicable)
```

### 19.2 Runtime Properties

| Property | Value |
|----------|-------|
| Type | In-process Python library (no separate process) |
| Persistence | Explicit — call `.persist()` to save |
| Multiple indexes | Can share a directory if tracked by index IDs |
| TypeScript parity | `persistDir: "./storage"` in TypeScript version |

### 19.3 Monitoring Commands

```bash
# Default persistence directory
ls -la ./storage/ 2>/dev/null

# Disk usage
du -sh ./storage/ 2>/dev/null

# Find all LlamaIndex storage dirs
find . -name 'docstore.json' -path '*/storage/*' 2>/dev/null
```

### 19.4 Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Vector store contains embeddings | Low | May encode sensitive document content |
| Default `./storage/` in project root | Low | May be accidentally committed to git |

---

## 20. Cross-Tool: MCP Server Monitoring

MCP servers are shared across multiple tools and represent a unique monitoring challenge — they appear as generic `node` or `python` processes, silently consume tokens, and frequently orphan.

### 20.1 Universal Detection

```bash
# Find ALL running MCP server processes
ps aux | grep -iE 'mcp-server|mcp-remote|mcp_server' | grep -v grep

# With memory, PID, and parent details
ps -eo pid,ppid,rss,etime,args | grep -iE 'mcp-server|mcp-remote' | grep -v grep | \
  awk '{printf "PID %-7s  PPID %-5s  %6.1f MB  AGE %-12s  %s %s %s\n", $1, $2, $3/1024, $4, $5, $6, $7}'

# Find orphaned MCP servers (PPID=1)
ps -eo pid,ppid,rss,etime,args | awk '$2==1' | grep -iE 'mcp-server|mcp-remote'

# Which parent tool spawned each?
ps -eo pid,ppid,args | grep -iE 'mcp-server|mcp-remote' | grep -v grep | \
  while read pid ppid args; do
    parent=$(ps -p $ppid -o comm= 2>/dev/null || echo "ORPHAN")
    echo "PID $pid  parent=$parent($ppid)  $args"
  done

# Total count
ps aux | grep -iE 'mcp-server|mcp-remote' | grep -v grep | wc -l
```

### 20.2 Config File Locations (What's Configured)

| Tool | Config Path | Key |
|------|-------------|-----|
| Claude Code (user) | `~/.claude.json` | `mcpServers` |
| Claude Code (project) | `.mcp.json` | `mcpServers` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `mcpServers` |
| Copilot CLI | `~/.copilot/mcp-config.json` | (varies) |
| Cursor | `.cursor/mcp.json` | (varies) |
| Windsurf (global) | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| Windsurf (project) | `.windsurf/mcp.json` | (varies) |
| Gemini CLI | `~/.gemini/settings.json` | `mcpServers` |
| VS Code Copilot | `.vscode/mcp.json` | (varies) |

### 20.3 Token Cost

Every MCP server has a silent per-message token tax. Key benchmarks:

| Server | Tools | Tokens/message |
|--------|-------|---------------|
| Chrome DevTools | 20+ | ~16,000 |
| Playwright | 22 | ~3,500 |
| Gmail | 7 | ~2,640 |
| GitHub | 15-20 | ~2,500 |
| Sentry | 8-12 | ~1,500 |
| PostgreSQL | 5-8 | ~1,000 |
| Filesystem | 5-6 | ~500 |
| SQLite | 6 | ~380 |

### 20.4 Common Orphan Patterns

| Pattern | Source Tool | Risk | Cleanup |
|---------|------------|------|---------|
| `npx mcp-remote <url>` | Claude Code/Desktop | **High** | `pkill -f 'mcp-remote'` |
| `node mcp-server-*` | Any tool | **High** | `pkill -f 'mcp-server'` |
| `python mcp-server-*` | Claude Code | Medium | `pkill -f 'python.*mcp'` |
| `npm exec`/`npx` (no parent) | Claude Code | Medium | `pkill -f 'npm exec\|npx.*mcp'` |
| `tsx`/`ts-node`/`bun`/`deno` | Any tool | Medium | Match by cmdline pattern |

---

## 21. Cross-Tool: Secrets & Credentials Audit

Quick reference of all known plaintext secret locations across tools.

| File | Tool | Content | Risk |
|------|------|---------|------|
| `~/.cache/huggingface/token` | HuggingFace | HF access token | **High** |
| `~/.continue/config.yaml` | Continue | `apiKey` fields for model providers | **High** |
| `~/.openclaw/.env` | OpenClaw | Multiple API keys | **High** |
| `~/.openclaw/credentials/` | OpenClaw | WhatsApp session, bot tokens | **High** |
| `~/.openai/.env` | OpenAI SDK | `OPENAI_API_KEY` | Medium |
| `~/.claude/.credentials.json` | Claude Code | API credentials (Linux/Windows) | Medium |
| `~/.config/gh/hosts.yml` | Copilot CLI | GitHub OAuth tokens | Medium |
| `~/.claude/ide/<lockfile>` | Claude Code | IDE MCP auth token (`0600` perms) | Low |
| MCP `env` blocks in various configs | Multiple tools | API keys passed to MCP servers | Medium |
| `chat_histories/*.json` | LangChain | Full conversation data (verbatim prompts) | **High** |

### Audit Command

```bash
echo "=== Secrets Audit ==="

# HuggingFace token
[ -f ~/.cache/huggingface/token ] && echo "⚠️  HF token: ~/.cache/huggingface/token ($(stat -f '%Lp' ~/.cache/huggingface/token 2>/dev/null || stat -c '%a' ~/.cache/huggingface/token 2>/dev/null) perms)"

# Continue config
[ -f ~/.continue/config.yaml ] && grep -qi 'apikey' ~/.continue/config.yaml 2>/dev/null && echo "⚠️  Continue config has API keys: ~/.continue/config.yaml"

# OpenClaw env
[ -f ~/.openclaw/.env ] && echo "⚠️  OpenClaw env: ~/.openclaw/.env"

# OpenAI env
[ -f ~/.openai/.env ] && echo "⚠️  OpenAI env: ~/.openai/.env"

# Claude credentials
[ -f ~/.claude/.credentials.json ] && echo "⚠️  Claude credentials: ~/.claude/.credentials.json"

# GitHub CLI tokens
[ -f ~/.config/gh/hosts.yml ] && echo "⚠️  GitHub CLI tokens: ~/.config/gh/hosts.yml"

# MCP configs with potential env keys
for f in ~/.claude.json .mcp.json ~/.codeium/windsurf/mcp_config.json ~/.copilot/mcp-config.json; do
  [ -f "$f" ] && grep -qi 'key\|token\|secret' "$f" 2>/dev/null && echo "⚠️  MCP config may have secrets: $f"
done

echo "=== Done ==="
```

---

## 22. Cross-Tool: Local Server Port Map

Quick reference for all known default listening ports.

| Port | Tool/Service | Protocol | Bind Default |
|------|-------------|----------|-------------|
| 1234 | LM Studio | HTTP (OpenAI-compat) | localhost |
| 4096 | OpenCode (serve/web) | HTTP | localhost |
| 6274 | MCP Inspector | HTTP | localhost |
| 7071 | Azure Functions Core Tools | HTTP | localhost |
| 7860 | Text Generation WebUI | HTTP | `127.0.0.1` |
| 8000 | vLLM / LangServe | HTTP (OpenAI-compat) | localhost |
| 8081 | mitmweb (proxy UI) | HTTP | `127.0.0.1` |
| 9090 | mitmproxy (proxy) | HTTP | `127.0.0.1` |
| 11434 | Ollama | HTTP (OpenAI/Anthropic-compat) | `127.0.0.1` |
| 18789 | OpenClaw Gateway | WebSocket + HTTP | varies |
| random | Claude Code IDE MCP | HTTP + auth token | `127.0.0.1` |
| random | Cursor extension comms | HTTP | localhost |
| random | Windsurf `codeium_language_server` | RPC | localhost |

### Port Scan Command

```bash
echo "=== AI Tool Port Scan ==="
for port in 1234 4096 6274 7071 7860 8000 8081 9090 11434 18789; do
  result=$(lsof -i :$port -sTCP:LISTEN 2>/dev/null | tail -1)
  if [ -n "$result" ]; then
    proc=$(echo "$result" | awk '{print $1}')
    pid=$(echo "$result" | awk '{print $2}')
    echo "✅ :$port  →  $proc (PID $pid)"
  fi
done
echo "=== Done ==="
```

---

## 23. Cross-Tool: Complete Process Sweep

One-command detection of all known AI tool processes.

```bash
#!/bin/bash
# ai-sweep.sh — Detect all running AI tool processes

echo "=== AI Tools Process Sweep ==="
echo ""

declare -A patterns
patterns=(
  ["Claude Desktop"]="Claude$|Claude.exe"
  ["Claude Code"]="^claude$|claude -p|claude --print"
  ["ChatGPT Desktop"]="ChatGPT$|ChatGPT.exe"
  ["Cursor"]="Cursor$|Cursor.exe|cursor-language-server|cursor-indexing"
  ["Windsurf"]="Windsurf$|Windsurf.exe|codeium_language_server"
  ["Copilot (VS Code)"]="copilot-agent|copilot-lsp|copilot-language-server"
  ["Copilot CLI"]="^copilot$|copilot.exe"
  ["Gemini CLI"]="^gemini$"
  ["OpenClaw"]="openclaw|clawdbot"
  ["OpenCode"]="^opencode$|opencode-cli"
  ["Aider"]="^aider$"
  ["Ollama"]="ollama serve|ollama$"
  ["LM Studio"]="LM Studio|lmstudio"
  ["vLLM"]="vllm|vllm.entrypoints"
  ["Text Gen WebUI"]="text-generation|server.py.*7860"
  ["MCP Servers"]="mcp-server|mcp-remote|mcp_server"
  ["Orphaned Node (AI)"]="node.*claude|node.*mcp"
)

for tool in "${!patterns[@]}"; do
  count=$(ps aux | grep -cE "${patterns[$tool]}" 2>/dev/null)
  # Subtract grep itself
  actual=$((count > 0 ? count : 0))
  if [ "$actual" -gt 0 ]; then
    mem=$(ps -eo rss,args | grep -E "${patterns[$tool]}" | grep -v grep | \
      awk '{sum+=$1} END {printf "%.0f", sum/1024}')
    echo "✅ $tool: $actual process(es), ~${mem} MB total"
  fi
done

# Orphan check
orphans=$(ps -eo pid,ppid,args | awk '$2==1' | grep -cE 'claude|mcp-server|mcp-remote|copilot')
if [ "$orphans" -gt 0 ]; then
  echo ""
  echo "⚠️  $orphans orphaned AI-related process(es) detected (PPID=1)"
  ps -eo pid,ppid,rss,etime,args | awk '$2==1' | grep -E 'claude|mcp-server|mcp-remote|copilot' | \
    awk '{printf "  PID %-7s  %6.1f MB  age %-12s  %s\n", $1, $3/1024, $4, $5}'
fi

echo ""
echo "=== Done ==="
```
