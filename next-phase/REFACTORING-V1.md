# Formal Model: Interest Scope & Directory Resolution

## Definition 1: Root Determination

Given `user_dir` (the directory the user passes to aictl), the effective root depends on the tool:

| Strategy | Tools | Rule |
|----------|-------|------|
| `cwd` | claude-code, opencode, openclaw | `root = user_dir` exactly as given |
| `git-root` | copilot, copilot-cli, gemini-cli | `root = git rev-parse --show-toplevel` from `user_dir`, fallback to `user_dir` |
| `workspace` | cursor, windsurf, copilot-vscode | `root = opened folder` (at runtime = `user_dir`) |
| `global-only` | claude-desktop, chatgpt-desktop | No project root; only global scope applies |

The CSV could carry a `root_strategy` column per `ai_tool`, or it can be a small lookup table.

## Definition 2: Interest Scope

For a given `user_dir`, the interest scope is the union of five directory layers:

```
InterestScope(user_dir) = Global ∪ Root ∪ Subtree ∪ Parents ∪ Shadows
```

**Layer 1 — Global.** Platform-specific, per-tool directories that exist regardless of project:

- `~/.claude/`, `~/.copilot/`, `~/.codeium/windsurf/`, `~/.config/opencode/`, etc.
- Identified by CSV rows where `scope = global`

**Layer 2 — Root.** The effective root directory itself. Files placed directly here:

- `{root}/CLAUDE.md`, `{root}/.cursorrules`, `{root}/AGENTS.md`, etc.
- Identified by CSV rows where `scope = project` and path is `{project-root}/...` (non-recursive)

**Layer 3 — Subtree.** Every subdirectory under root, recursively:

- `{root}/**/CLAUDE.md`, `{root}/**/.claude/`, `{root}/**/.github/`, etc.
- Identified by CSV rows where `scope = project` and path contains `{subdirectory}/` or a glob pattern, OR rows that the current code walks recursively (e.g., `_find_in_tree`)

**Layer 4 — Parents.** Directories above root, up to `$HOME` or a bounded depth:

- Claude Code reads `CLAUDE.md` / `CLAUDE.local.md` from parent dirs
- Identified by a `scope = parent` or a flag in the CSV (currently only Claude does this)

**Layer 5 — Shadows.** Directories outside the tree that are associated with directories inside the tree (see Definition 3).

## Definition 3: Associated Directory Group

Given any directory `D` in the interest scope, its associated directory group `ADG(D)` is:

```
ADG(D) = {D} ∪ {S : S is a shadow of D under any tool's encoding}
```

A **shadow directory** `S` is a directory that:

- Lives outside `D`'s subtree (typically under a tool's global dir)
- Is keyed to `D` via a deterministic mapping (path encoding, hash, naming convention)
- Contains tool-specific state scoped to `D`

### Known shadow encodings

| Tool | Shadow location | Encoding of `D` |
|------|----------------|-----------------|
| claude-code | `~/.claude/projects/{encoded}/` | Path separators → dashes: `/Users/zvi/Projects/foo` → `-Users-zvi-Projects-foo` |
| claude-code | `/tmp/claude-{user}/{encoded}/` | Same encoding, session-scoped temp files |
| cursor | `~/Library/.../Cursor/User/workspaceStorage/{hash}/` | SHA-based hash of absolute path |
| copilot-cli | `~/.copilot/session-state/{uuid}/` | UUID session, linked to workspace via `workspace.yaml` containing `cwd: D` |
| windsurf | `{D}/cascade-memories/` | Inside the tree (not external), but still an associated artifact |

### Resolution algorithm for shadows

```python
def find_shadows(D: Path, tool: str) -> list[Path]:
    """Find all shadow directories for D under a given tool."""
    # 1. Compute expected encoded name
    # 2. Search tool's shadow parent dir for matches
    # 3. Apply fuzzy matching (case-insensitive, segment matching)
    #    — reuse the strategies from memory.py
```

## Definition 4: Path Template Expansion

Each CSV row has a path template. Expansion rules:

| Template token | Resolves to |
|---------------|-------------|
| `~` | `Path.home()` |
| `%APPDATA%`, `%LOCALAPPDATA%`, etc. | `os.environ[...]` (Windows) |
| `{project-root}` | The effective root for that tool |
| `{subdirectory}` | Every subdirectory under root (recursive walk) |
| `{project}` | Shadow-encoded path (tool-specific encoding) |
| `{skill}`, `{command}`, `{agent}` | Glob — enumerate all matches in parent dir |
| `{session}`, `{timestamp}`, `{hex}` | Glob — enumerate runtime artifacts |
| `{workspace}` | Hash-based lookup (Cursor) |
| `*`, `*.md`, `*.json` | Standard glob expansion |

A path template falls into one of these **resolution strategies**:

| Strategy | Description |
|----------|-------------|
| **Literal** | No tokens, just expand `~` / `%VAR%` → check existence |
| **Rooted** | `{project-root}/fixed/path` → substitute root, check existence |
| **Recursive** | `{subdirectory}/FILENAME` → walk entire subtree for matches |
| **Glob** | Contains `*` or `{param}` that enumerates → glob in parent dir |
| **Shadow** | Contains `{project}` → resolve via ADG encoding |

## Definition 5: Discovered Resource

A discovered resource is a tuple:

```
(path: Path, tool: str, scope: str, category: str, layer: Layer, metadata: dict)
```

Where:

- `layer ∈ {global, root, subtree, parent, shadow}`
- `metadata` = all other CSV columns (`sent_to_llm`, `tokens`, `loaded_when`, etc.)

## Definition 6: Process Matching

Process detection is simpler — no directory scoping. For each row in the processes CSV:

```
(ps_grep_pattern, ai_tool, platform, process_type, ...) →
  match against psutil snapshot →
  annotate with CSV metadata (expected memory, leak info, zombie risk)
```

One full `psutil` scan, matched against all compiled patterns. The result is:

```
(pid, matched_csv_row, actual_cpu, actual_mem, parent_alive: bool, anomalies: list)
```

Where anomalies are derived: `actual_mem >> memory_active_mb`, `PPID=1 && zombie_risk=high`, etc.

## Summary: What the CSV Needs to Fully Drive This

The paths CSV is almost there. It may need:

- **`root_strategy`** per `ai_tool` — or a separate small lookup (8 entries)
- **`resolution`** column — `literal | rooted | recursive | glob | shadow` — to tell the engine how to expand the template (currently implicit from the path pattern)
- **`shadow_encoding`** column — for shadow paths, which encoding scheme to use

The processes CSV is ready as-is — `ps_grep_pattern` + `platform` is sufficient to drive matching.
