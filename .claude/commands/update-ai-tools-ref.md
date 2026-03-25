---
description: Search for updates to the AI tools config paths reference document AND its companion CSV. Finds new tools, changed paths, new conventions, and adds them to both files.
argument-hint: [topic or tool name to focus on, or 'full' for comprehensive scan]
---

You are updating two living reference files that catalog file structures, config paths, memory locations, temp/intermediate artifacts, ignore files, and naming conventions for all major AI coding tools:

1. A **Markdown reference document** — the source of truth
2. A **structured CSV inventory** — a flat table derived from the same data

Both must stay in sync. When you add, change, or deprecate a path in the Markdown, you must make the corresponding change in the CSV.

## Files to update

Read both current versions:
@ai-tools-config-paths.md
@ai-tools-paths-all.csv

## Your task

Search the web for recent changes, new tools, and updated paths related to AI coding tools. Focus on:

1. **New or changed config paths** — tools update their file locations frequently
2. **New AI coding tools** that have emerged (check for tools not already in the doc)
3. **New file conventions** — new ignore files, new instruction file formats, new memory systems
4. **Changed naming patterns** for intermediate/temp artifacts
5. **Windows-specific changes** — new MSIX paths, new environment variables
6. **MCP config changes** — new config locations or formats
7. **Cross-tool standards** — updates to AGENTS.md spec, new interop tools

## Focus area

$ARGUMENTS

If the argument is "full" or empty, do a comprehensive scan across all tools.
If a specific tool or topic is named, focus the search there.

## How to search

For each major tool in the document, search for:
- `"<tool name>" config file path 2026`
- `"<tool name>" breaking changes settings location`
- `"<tool name>" new features memory config`
- GitHub issues/changelogs for the tool's repo

Also search for:
- New AI coding tools that have launched recently
- Updates to the AGENTS.md standard
- New cross-tool sync utilities

## How to update the Markdown

1. **Read the current document first** — understand what's already there
2. **Search systematically** — don't skip tools
3. **Compare findings against current content** — only update what has actually changed
4. **Preserve existing structure** — add to existing sections, don't reorganize
5. **Add new sections** if a new tool or convention warrants it
6. **Add a changelog entry** at the top of the document noting what was updated and when
7. **Be conservative** — don't remove content unless it's confirmed obsolete. Mark deprecated paths with ⚠️ DEPRECATED instead of deleting.

## How to update the CSV

After every change to the Markdown, apply the same change to `ai-tools-paths-all.csv`. The CSV columns are:

```
path,ai_tool,platform,hidden,scope,category,sent_to_llm,approx_tokens,read_write,survives_compaction,cacheable,loaded_when,path_args,description
```

Column definitions:
- **path**: File/directory path (use `{curly-braces}` for template variables, `~` for home, `%VAR%` for Windows env vars)
- **ai_tool**: Tool identifier (e.g., `claude-code`, `cursor`, `copilot-cli`, `windsurf`, `openclaw`, `opencode`, `gemini-cli`)
- **platform**: `macos`, `linux`, `macos/linux`, `windows`, or `all`
- **hidden**: `yes` if starts with `.` or in hidden dir, else `no`
- **scope**: `global`, `project`, `session`
- **category**: `config`, `instructions`, `memory`, `credentials`, `rules`, `agent`, `skills`, `commands`, `hooks`, `ignore`, `cache`, `temp`, `transcript`, `database`, `runtime`, `logs`, `extensions`, `app-data`, `backup`
- **sent_to_llm**: `yes`, `partial`, `conditional`, `on-demand`, `no`
- **approx_tokens**: Estimated tokens when sent (range like `100-5000+`, or `0`)
- **read_write**: `read`, `rw`, `write`
- **survives_compaction**: `yes`, `no`, `n/a`
- **cacheable**: `yes`, `no`, `n/a`
- **loaded_when**: `every-call`, `session-start`, `app-start`, `on-invoke`, `on-file-match`, `on-demand`, `runtime`, etc.
- **path_args**: Template variables with format notes (e.g., `{project}=path-with-slashes-to-hyphens`)
- **description**: Brief explanation

Rules for CSV updates:
- **New path** → append a row to the CSV
- **Changed path** → update the existing row in place (find by matching `path` + `ai_tool` + `platform`)
- **Deprecated path** → keep the row but prepend `⚠️ DEPRECATED: ` to the description column
- **New tool** → add all its paths as new rows
- **Platform variant** → add a separate row per platform (one for macOS/Linux, one for Windows) when paths differ

If a path exists for both Unix and Windows with different locations, there should be two separate rows — do not combine them.

## Output

After making updates, provide a summary of:
- What was added or changed (in both Markdown and CSV)
- What was confirmed still current (no change needed)
- What could not be verified (needs manual check)
- Number of CSV rows added/modified/total
