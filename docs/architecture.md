# Architecture

## Deploy Lifecycle

```
aictl deploy --root ./my-project --profile debug
```

### Phase 1: Scan
Walk the root directory tree. Find all `.context.aictx` files. Parse each into typed sections (instructions, capabilities, MCP, memory, inherit, exclude).

### Phase 2: Resolve
- **Instructions**: every `.aictx` in subtree contributes scoped instructions.
- **Capabilities**: only root's `[command:*]`, `[agent:*]`, `[skill:*]` are active.
- **Inheritance**: root's `[inherit] recursive: skills` pulls children's skills up. Children's `[inherit] parent: mcp` push their MCP to root.
- **Excludes**: root's `[exclude]` filters out unwanted capabilities.
- **MCP**: root's `[mcp:*]` merged into single config.
- **Memory**: root's `[memory:profile]` provides hints.

### Phase 3: Emit
For each emitter (claude, copilot, cursor), write native files at root.

### Phase 4: Cleanup
Load previous manifest. Diff file lists. Remove stale files from old profile.

### Phase 5: Memory Swap
If profile changed, stash old memory directory and restore new one.

### Phase 6: Save Manifest
Write `.ai-deployed/manifest.json` tracking all deployed files.

## Emit Matrix

| Source | Claude Code | Copilot CLI/VS Code | Cursor |
|--------|------------|---------------------|--------|
| Root `[base]` | `CLAUDE.md` | `.github/copilot-instructions.md` | `.cursor/rules/base.mdc` |
| Root `[profile]` | `CLAUDE.local.md` (overlay) | `AGENTS.md` (overlay) | `.cursor/rules/profile-active.mdc` |
| Sub-scope base+profile | `.claude/rules/{scope}.md` | `.github/instructions/{scope}.instructions.md` | `.cursor/rules/{scope}.mdc` |
| `[command:*]` | `.claude/commands/{name}.md` | `.github/prompts/{name}.prompt.md` | — |
| `[agent:*]` | — | `.github/agents/{name}.agent.md` | — |
| `[skill:*]` | `.claude/skills/{name}/SKILL.md` | `.github/skills/{name}/SKILL.md` | — |
| `[mcp:*]` | `.mcp.json` | `.copilot-mcp.json` | `.cursor/mcp.json` |

## Root-Relative Scoping

The root directory determines everything:

```
aictl deploy --root my-project/ --profile debug
  → root is my-project/
  → capabilities from my-project/.context.aictx
  → sub-scopes: services/ingestion/, services/query-engine/, etc.

aictl deploy --root my-project/services/ingestion/ --profile debug
  → root is services/ingestion/
  → capabilities from services/ingestion/.context.aictx
  → sub-scopes: src/transform/, etc.
  → parent my-project/.context.aictx is NOT visible
```

Same `.aictx` file, different behavior depending on whether it's root or child.

## Profile Switch

Old profile's commands, agents, skills, MCP are **removed**. New profile's are **created**. `_always` items survive. Agent overlay in `CLAUDE.local.md`/`AGENTS.md` is preserved. Memory directory is swapped.
