# Claude Desktop

An Electron app that serves as a container for three modes:
1. **Chat** — same as claude.ai but native
2. **Code tab** — Claude Code embedded with visual UI (diff review, live preview)
3. **Cowork** — autonomous agent mode for knowledge work (research preview)

Not a local LLM — models run on Anthropic's servers. The "local" part is file access, MCP servers, computer use, and the sandboxed VM.

## Application Support (`~/Library/Application Support/Claude/`)

### Configuration

| File | Purpose |
|------|---------|
| `claude_desktop_config.json` | MCP server config + trusted folders for local agent mode |
| `config.json` | Encrypted OAuth tokens, app settings |
| `Preferences` | Electron prefs: device ID, spellcheck, zoom |
| `bridge-state.json` | Anthropic infrastructure bridge state |
| `git-worktrees.json` | Worktree config |
| `window-state.json` | Window position/size |
| `ant-did` | Device ID (base64 UUID) |

### Extensions

| Path | Purpose |
|------|---------|
| `extensions-installations.json` | Installed extension manifest |
| `extensions-blocklist.json` | Blocked extensions |
| `Claude Extensions/` | Extension data (per-extension dirs) |
| `Claude Extensions Settings/` | Per-extension settings |

Extensions install as `.mcpb` bundles (one-click). Examples: Filesystem, Word, PowerPoint, Control Chrome, Grafana MCP Server.

### VM Bundle and Sessions

| Path | Size | Purpose |
|------|------|---------|
| `vm_bundles/claudevm.bundle/` | ~10 GB | Sandboxed VM for Cowork/local agent mode |
| `claude-code/{version}/` | — | Claude Code binary bundled inside Desktop (may differ from CLI version) |
| `claude-code-vm/{version}/` | — | VM config for Claude Code |
| `claude-code-sessions/` | — | Code tab session data |
| `local-agent-mode-sessions/` | — | Cowork autonomous agent sessions |

### Logs (`~/Library/Logs/Claude/`, ~40 MB)

| Log | Purpose |
|-----|---------|
| `main.log` | Main app events |
| `claude.ai-web.log` | Web view/chat logs |
| `mcp.log` | MCP server orchestration |
| `cowork_vm_node.log` | Cowork VM Node process |
| `cowork_vm_swift.log` | Cowork VM Swift process |
| `coworkd.log` | Cowork daemon |
| `mcp-server-*.log` | Per-extension MCP logs |
| `chrome-native-host.log` | Chrome native messaging |
| `vzgvisor.log` | VM supervisor |

### macOS Caches and Preferences

| Path | Size | Purpose |
|------|------|---------|
| `~/Library/Caches/com.anthropic.claudefordesktop/` | ~32 MB | Main app cache |
| `~/Library/Caches/com.anthropic.claudefordesktop.ShipIt/` | ~578 MB | Staged auto-update (contains full Claude.app copy) |
| `~/Library/Preferences/com.anthropic.claudefordesktop.plist` | — | Binary plist preferences |
| `~/Library/HTTPStorages/com.anthropic.claudefordesktop/` | — | HTTP cache DB |

## Desktop vs CLI

| Aspect | Claude Desktop | Claude Code CLI |
|--------|---------------|-----------------|
| Binary | `/Applications/Claude.app` (Electron, 572 MB) | `~/.local/bin/claude` (native) |
| Bundled Claude Code | `~/Library/Application Support/Claude/claude-code/{version}/` | `~/.local/share/claude/versions/{version}/` |
| MCP config | `claude_desktop_config.json` | `~/.claude.json` + `.mcp.json` |
| Extensions | `.mcpb` bundles (one-click install) | Manual JSON config |
| Session storage | `~/Library/Application Support/Claude/` (chat) + `~/.claude/` (code) | `~/.claude/` only |
| Auth | OAuth only (Keychain) | OAuth, API key, or env var |
| Computer use | Yes (macOS screen control) | No |
| Cowork (autonomous) | Yes (sandboxed VM) | No (but has subagents) |
| VM sandbox | Yes (`vm_bundles/`, ~10 GB) | No |
| Live app preview | Yes (dev server in-app) | No |
| Visual diff review | Yes | No (terminal diffs) |
| Overnight autonomous runs | No | Yes |
| Remote/SSH | No | Yes |

## Disk Usage

| Component | Size |
|-----------|------|
| `/Applications/Claude.app/` | 572 MB |
| `~/Library/Application Support/Claude/` | ~11 GB (10 GB is VM bundle) |
| `~/Library/Caches/com.anthropic.claudefordesktop.ShipIt/` | ~578 MB |
| `~/Library/Caches/com.anthropic.claudefordesktop/` | ~32 MB |
| `~/Library/Logs/Claude/` | ~40 MB |
| **Total** | **~12.2 GB** |

The VM bundle (`claudevm.bundle` at ~10 GB) is the sandboxed execution environment for Cowork/local agent mode — by far the largest component.

## Local state and processes (checked 2026-11-05)

Claude Desktop 4.16336.0, bundled Claude Code 2.1.317, `~/Library/Application Support/Claude/`.
Code tab: `claude-code-sessions/<account>/<org>/` (index only), bundled binaries in `claude-code/<ver>/<hash>/`,
`claude-code-vm/`, `git-shadow/` (shadow repos for worktree diffs), `git-worktrees.json` (`worktrees`,
`originUrls`), `scratch-workspaces/`, `side-session-notes/`. Cowork: `local-agent-mode-sessions/<account>/<org>/`.
Also `plan-usage-history.json`, `remote-control-state.json`, `ssh-remote-server-state.json`,
`ccd-session-presets.json`, `mcp-user-tool-toggles.json`, `developer_settings.json`.
`Claude-3p/` is a sibling data directory with the same layout (third-party-inference build).
`Claude Science.app` (bundle `com.anthropic.operon`, 0.1.48) is installed; its data location was not found
and it has no aictl tool yet.
Processes: see `docs/tool-claude-code.md` for the bundled `claude` and the `disclaimer` wrapper; they are
`claude-code`, not `claude-desktop`.
