# Claude in VS Code — Four Session Targets

VS Code's Copilot Chat "Set Session Target" control selects the execution environment. Even with the same model (e.g. Opus 4.6), the harness — the code that wraps the model, decides what tools exist, and how results are handled — is completely different across targets.

Think of it as giving the same chef four different kitchens: same skills, but very different equipment, ingredients, and recipes.

| Session Target | Harness | Runs on | Instructions | Billing |
|----------------|---------|---------|--------------|---------|
| **Local** | VS Code's agent framework | Your machine (foreground) | `.github/copilot-instructions.md` | GitHub Copilot |
| **Cloud** | GitHub's remote agent | GitHub's servers | `.github/copilot-instructions.md` (from repo) | GitHub Copilot |
| **Claude** | Claude Code (Anthropic) | Your machine (foreground) | `CLAUDE.md` + `.claude/rules/*.md` + memory | Anthropic |
| **Copilot CLI** | VS Code's agent framework | Your machine (background) | `.github/copilot-instructions.md` | GitHub Copilot |

---

## 1. Local

VS Code's built-in agentic loop running in your editor process.

| Aspect | Details |
|--------|---------|
| Execution | Your machine, inside VS Code's extension host |
| Tools | ~8 (file edit, terminal, search, diagnostics, browser preview) |
| MCP servers | `.vscode/mcp.json` (VS Code schema) |
| Context awareness | Current file, selection, open tabs, terminal output, test failures |
| Permissions | Inline accept/reject per action |
| Session persistence | Lost when you close VS Code |
| Multi-session | One at a time |
| Network path | Your machine → GitHub servers → Anthropic API → back |

---

## 2. Cloud (GitHub Remote Agent)

An agent running on GitHub's infrastructure — not your machine at all. Clones your repo into a sandboxed VM.

| Aspect | Details |
|--------|---------|
| Execution | GitHub's cloud VMs (sandboxed container) |
| Tools | ~5 (file read/write, terminal in cloud VM, git, GitHub API) |
| MCP servers | None (no access to your local MCP servers) |
| Context awareness | Repo clone only — no access to local state, open tabs, or running processes |
| Permissions | Minimal — runs autonomously, creates a PR with results |
| Session persistence | Persists on GitHub's side; results delivered as PRs/commits |
| Multi-session | Yes |
| Network path | GitHub clones your repo → runs in cloud → pushes branch/PR |

Best for "go implement this feature and open a PR" type tasks where you don't need interactive feedback.

---

## 3. Claude (Claude Code Extension)

The full Claude Code harness — the same thing as the CLI, but rendered in VS Code's webview panel. Uses an entirely different agentic loop and tool set from the other three.

| Aspect | Details |
|--------|---------|
| Execution | Your machine (spawns native `claude` binary as child process) |
| Tools | 25+ (Bash, Read, Edit, Write, Glob, Grep, Agent, WebFetch, WebSearch, NotebookEdit, plus all MCP tools) |
| MCP servers | `.mcp.json` (project root) + `~/.claude.json` — full access to all configured servers |
| Instructions | `CLAUDE.md` + `.claude/CLAUDE.md` + `~/.claude/CLAUDE.md` + `.claude/rules/*.md` |
| Context awareness | Full filesystem, plus VS Code diagnostics via IDE MCP, plus Jupyter execution |
| Permissions | 4 modes: default, acceptEdits, plan, bypassPermissions |
| Session persistence | Full — resume any past session with history |
| Memory | Persistent cross-session (`~/.claude/projects/<project>/memory/`) |
| Multi-session | Yes |
| Network path | Your machine → Anthropic API directly (no GitHub middleman) |
| Extra capabilities | Subagents (parallel workers), git worktree isolation, checkpoints/rewind, hooks (30+ event types), plugins, skills, plan mode |

### Process Architecture

```
VS Code Main Process
    │
    ├── Extension Host Process (Node.js)
    │       │
    │       ├── anthropic.claude-code extension (extension.js)
    │       │       │
    │       │       ├── Spawns child process: native claude binary
    │       │       │     └── IPC: JSON-RPC over stdin/stdout
    │       │       │     └── Runs the full agentic loop (same as CLI)
    │       │       │     └── Makes tool calls, sends results back
    │       │       │
    │       │       └── Starts IDE MCP Server
    │       │             └── Binds to 127.0.0.1:<ephemeral-port>
    │       │             └── Auth token written to ~/.claude/ide/<port>.lock
    │       │             └── Exposes 2 tools:
    │       │                   ├── mcp__ide__getDiagnostics
    │       │                   └── mcp__ide__executeCode (Jupyter)
    │       │
    │       └── Webview Panel (webview/index.js)
    │             └── Communicates with extension via VS Code postMessage API
    │
    └── Terminal (optional, if useTerminal=true)
            └── claude binary runs directly in VS Code integrated terminal
```

The extension bundles its own `claude` binary at `resources/native-binary/claude` (~188 MB). It does not rely on `~/.local/bin/claude` — the extension and CLI can be different versions.

### Extension Files

```
~/.vscode/extensions/anthropic.claude-code-*-<platform>/
├── extension.js                              (1.8 MB)  Main extension code
├── package.json                              (14 KB)   Manifest: commands, settings, views
├── claude-code-settings.schema.json          (92 KB)   Full JSON schema for settings.json
├── resources/native-binary/claude            (188 MB)  Native Claude Code binary
├── resources/native-binary/claude.zst        (39 MB)   Compressed binary archive
├── webview/index.js                          (4.6 MB)  Webview UI application
└── webview/index.css                         (359 KB)  Webview styling
```

### VS Code Settings (`claudeCode.*`)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `claudeCode.preferredLocation` | enum | `"panel"` | sidebar or panel |
| `claudeCode.selectedModel` | string | — | Override model (e.g., `"opus"`) |
| `claudeCode.useTerminal` | boolean | `false` | Use terminal instead of webview |
| `claudeCode.initialPermissionMode` | enum | `"default"` | default/acceptEdits/plan/bypassPermissions |
| `claudeCode.autosave` | boolean | `true` | Auto-save before operations |
| `claudeCode.useCtrlEnterToSend` | boolean | `false` | Require Ctrl+Enter to submit |
| `claudeCode.respectGitIgnore` | boolean | `true` | Respect .gitignore |
| `claudeCode.environmentVariables` | object | `{}` | Env vars for Claude process |
| `claudeCode.claudeProcessWrapper` | string | — | Wrapper executable |
| `claudeCode.usePythonEnvironment` | boolean | `true` | Activate Python venv |
| `claudeCode.allowDangerouslySkipPermissions` | boolean | `false` | Show bypass mode |

### Key Commands (31 total)

| Command | Shortcut |
|---------|----------|
| `claude-vscode.editor.open` — Open in New Tab | Cmd+Shift+Esc |
| `claude-vscode.newConversation` — New Conversation | Cmd+N |
| `claude-vscode.focus` — Focus Input | Cmd+Esc |
| `claude-vscode.terminal.open` — Open in Terminal | — |
| `claude-vscode.insertAtMention` — Insert @-Mention | Alt+K / Cmd+Alt+K |
| `claude-vscode.acceptProposedDiff` / `rejectProposedDiff` | — |
| `claude-vscode.createWorktree` | — |

Plus `claude-code.*` legacy aliases.

---

## 4. Copilot CLI (GitHub CLI / Background Sessions)

A Copilot agent session running in the background on your machine. Same harness as Local, but you can start a task, switch to other work, and check back later.

| Aspect | Details |
|--------|---------|
| Execution | Your machine, background process (not blocking the editor) |
| Tools | Same as Local (~8) |
| MCP servers | `.vscode/mcp.json` |
| Context awareness | Limited — doesn't see current editor state, open tabs, or selections |
| Permissions | Two modes: Worktree (auto-approves, separate folder) or Workspace (manual approvals) |
| Session persistence | Survives VS Code closing — keeps running |
| Multi-session | Yes |
| Network path | Your machine → GitHub servers → Anthropic API |

---

## Side-by-Side Comparison

All four can use the same model (e.g. Opus 4.6). Everything else differs.

| | Local | Cloud | Claude Code | Copilot CLI |
|-|-------|-------|-------------|-------------|
| Runs on | Your machine (fg) | GitHub's servers | Your machine (fg) | Your machine (bg) |
| Harness | VS Code's | GitHub's | Anthropic's | VS Code's |
| Tool count | ~8 | ~5 | 25+ | ~8 |
| MCP support | `.vscode/mcp.json` | None | `.mcp.json` | `.vscode/mcp.json` |
| Subagents | No | No | Yes | No |
| Memory | No | No | Yes (persistent) | No |
| Plan mode | No | No | Yes | No |
| Checkpoints | No | No | Yes | No |
| Hooks | No | No | Yes (30+ events) | No |
| Plugins | No | No | Yes (marketplace) | No |
| Instructions | `.github/copilot-instructions.md` | `.github/copilot-instructions.md` | `CLAUDE.md` (multi-level) | `.github/copilot-instructions.md` |
| Sees VS Code state | Yes (tabs, terminal, diagnostics) | No | Partial (diagnostics via MCP) | No |
| Billing | GitHub Copilot | GitHub Copilot | Anthropic (separate) | GitHub Copilot |
| API latency | Extra hop via GitHub | Extra hop via GitHub | Direct to Anthropic | Extra hop via GitHub |
| Survives close | No | Yes | No | Yes |
| Multi-session | One at a time | Yes | Yes | Yes |
| Output | Inline diffs | PR/branch | Webview panel + diffs | Inline diffs (async) |

### Why Same Model Behaves Differently

1. **Different system prompts** — Claude Code's is ~10K tokens with detailed tool usage instructions, memory awareness, safety protocols. VS Code's is shorter and more generic.
2. **Different tools** — More tools = more capable. Claude Code gives 25+ (Bash, Grep, Agent, WebSearch, etc.); VS Code gives ~8.
3. **Different context** — Claude Code feeds `CLAUDE.md` + memory files + project rules. VS Code feeds `.github/copilot-instructions.md`.
4. **Different agentic loop** — Claude Code has sophisticated retry logic, tool chaining, parallel subagent spawning, checkpoint management. VS Code's is simpler.

---

## MCP Config Schema Difference

Claude Code (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "KEY": "value" }
    }
  }
}
```

Copilot Chat (`.vscode/mcp.json`):
```json
{
  "servers": {
    "my-server": {
      "type": "stdio",
      "command": "node",
      "args": ["server.js"]
    }
  }
}
```

Different root keys (`mcpServers` vs `servers`), different schema — not interchangeable.

---

## VS Code State & Storage (macOS paths)

| Path | Purpose |
|------|---------|
| `~/Library/Application Support/Code/User/settings.json` | User-level VS Code settings (`claudeCode.*` keys) |
| `~/Library/Application Support/Code/User/globalStorage/` | Extension global state (SQLite-backed) |
| `~/Library/Application Support/Code/User/mcp.json` | VS Code-level MCP config (separate from `.mcp.json`) |
| `~/Library/Application Support/Code/User/chatLanguageModels.json` | Custom language model registrations |
| `~/Library/Application Support/Code/logs/.../Anthropic.claude-code/` | Extension log files |
| `~/.claude/ide/<port>.lock` | Auth token for IDE MCP server (one per VS Code window, permissions 0600) |

---

## When to Use Which

| Scenario | Best option |
|----------|-------------|
| Quick edit with context from your open files | Local |
| "Implement this feature and open a PR, I'll review later" | Cloud |
| Complex multi-file refactoring with full tool access | Claude Code |
| Long task while you keep coding | Copilot CLI |
| Need Slack/Linear/Asana/Chrome integration | Claude Code (only one with your MCP servers) |
| Need to remember context across sessions | Claude Code (only one with memory) |
| Don't have an Anthropic account | Local, Cloud, or Copilot CLI |
| Team uses `.github/copilot-instructions.md` already | Local or Copilot CLI |
| Plan mode, checkpoints, hooks | Claude Code |
