---
description: Search for updates to the AI tools config paths reference document. Finds new tools, changed paths, new conventions, and adds them.
argument-hint: [topic or tool name to focus on, or 'full' for comprehensive scan]
---

You are updating a living reference document that catalogs file structures, config paths, memory locations, temp/intermediate artifacts, ignore files, and naming conventions for all major AI coding tools.

## The document to update

Read the current version of the reference document:
@ai-tools-config-paths.md

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

## How to update

1. **Read the current document first** — understand what's already there
2. **Search systematically** — don't skip tools
3. **Compare findings against current content** — only update what has actually changed
4. **Preserve existing structure** — add to existing sections, don't reorganize
5. **Add new sections** if a new tool or convention warrants it
6. **Add a changelog entry** at the top of the document noting what was updated and when
7. **Be conservative** — don't remove content unless it's confirmed obsolete. Mark deprecated paths with ⚠️ DEPRECATED instead of deleting.

## Output

After making updates, provide a summary of:
- What was added or changed
- What was confirmed still current (no change needed)
- What could not be verified (needs manual check)
