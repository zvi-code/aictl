---
description: Search for updates to the AI tools runtime processes reference document AND its companion CSV. Finds new process patterns, zombie issues, daemon changes, and adds them to both files.
argument-hint: [tool name to focus on, or 'full' for comprehensive scan]
---

You are updating two living reference files that catalog runtime processes, daemons, background services, child process trees, ports/sockets, memory footprint, and zombie process patterns for all major AI coding tools:

1. A **Markdown reference document** — the source of truth
2. A **structured CSV inventory** — a flat table derived from the same data

Both must stay in sync. When you add, change, or deprecate a process in the Markdown, you must make the corresponding change in the CSV.

## Files to update

Read both current versions:
@ai-tools-runtime-processes.md
@ai-tools-processes-all.csv

## Your task

Search the web for recent changes to AI tool runtime behavior. Focus on:

1. **New or changed process patterns** — new daemons, renamed processes, new child process types
2. **New zombie/orphan issues** — reported memory leaks, process accumulation bugs
3. **Port/socket changes** — new default ports, new IPC mechanisms
4. **New tools** not yet in the document
5. **Memory footprint changes** — significant changes in baseline memory usage
6. **New cleanup tools or methods** — community tools for orphan cleanup
7. **Windows-specific changes** — new service patterns, Task Manager behavior

## Focus area

$ARGUMENTS

If the argument is "full" or empty, do a comprehensive scan across all tools.
If a specific tool or topic is named, focus the search there.

## How to search

For each major tool, search for:
- `"<tool name>" process memory leak zombie orphan 2026`
- `"<tool name>" background daemon service port`
- GitHub issues for process/memory bugs in each tool's repo

Also search for:
- New community cleanup tools (like zclean)
- New MCP server process patterns
- Changes to how tools manage child processes

## How to update the Markdown

1. **Read the current document first**
2. **Search systematically** — check GitHub issues for each tool's repo
3. **Compare findings against current content** — only update what has changed
4. **Preserve existing structure** — add to existing sections
5. **Add a changelog entry** at the top
6. **Mark deprecated patterns** with ⚠️ DEPRECATED, don't delete

## How to update the CSV

After every change to the Markdown, apply the same change to `ai-tools-processes-all.csv`. The CSV columns are:

```
process_name,ai_tool,process_type,runtime,parent_process,starts_at,stops_at,is_daemon,auto_start,listens_port,outbound_targets,memory_idle_mb,memory_active_mb,known_leak,leak_pattern,zombie_risk,cleanup_command,ps_grep_pattern,platform,description
```

Column definitions:
- **process_name**: What appears in `ps` / Task Manager
- **ai_tool**: Owner tool (`claude-code`, `cursor`, `copilot-cli`, `windsurf`, `openclaw`, `opencode`, `gemini-cli`, etc.)
- **process_type**: `daemon`, `app`, `cli`, `child`, `helper`, `mcp-server`, `browser`, `subagent`, `indexer`, `watcher`, `shell`, `extension`
- **runtime**: `node`, `electron`, `chromium`, `native-binary`, `python`, `bash`, `docker`, `go`
- **parent_process**: What spawns it (`root` if top-level, tool name if child, `dead-parent` for orphans)
- **starts_at**: `app-launch`, `session-start`, `on-demand`, `on-tool-call`, `system-boot`, `gateway-start`, `on-mcp-config`
- **stops_at**: `app-close`, `session-end`, `on-demand`, `process-exit`, `gateway-stop`, `manual`, `never(bug)`
- **is_daemon**: `yes` = persists across sessions/reboots, `no` = tied to session
- **auto_start**: `yes` = starts without user action, `no` = requires explicit invocation
- **listens_port**: Port number, `random-localhost`, or `none`
- **outbound_targets**: API endpoints the process connects to (semicolon-separated)
- **memory_idle_mb**: Typical idle memory in MB (integer)
- **memory_active_mb**: Typical active/peak memory in MB (integer)
- **known_leak**: `yes` or `no`
- **leak_pattern**: Description of leak if known (empty if no leak)
- **zombie_risk**: `none`, `low`, `medium`, `high`
- **cleanup_command**: Shell command to kill orphans of this type (empty if not applicable)
- **ps_grep_pattern**: Regex/grep pattern to find this process in `ps` output
- **platform**: `macos/linux`, `windows`, or `all`
- **description**: Brief explanation

Rules for CSV updates:
- **New process** → append a row to the CSV
- **Changed behavior** → update the existing row in place (find by matching `process_name` + `ai_tool`)
- **Fixed leak** → set `known_leak` to `no`, clear `leak_pattern`, reduce `zombie_risk`; prepend `⚠️ FIXED: ` to old leak_pattern for history
- **Deprecated process** → keep the row but prepend `⚠️ DEPRECATED: ` to the description column
- **New tool** → add all its processes as new rows
- **Changed memory** → update `memory_idle_mb` and `memory_active_mb`
- **Changed port** → update `listens_port`
- **New cleanup tool** → update `cleanup_command` for affected processes

## Output

After making updates, provide a summary of:
- What was added or changed (in both Markdown and CSV)
- What was confirmed still current (no change needed)
- What could not be verified (needs manual check)
- Number of CSV rows added/modified/total
- Any newly discovered zombie/leak patterns
