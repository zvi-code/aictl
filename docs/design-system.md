# aictl Project Design System

> Cross-cutting design decisions covering CLI output, plugin structure,
> `.aictx` format conventions, error handling, and shared utilities.
> For web dashboard UI design tokens and patterns, see
> [`dashboard-design-system.md`](dashboard-design-system.md).

Last updated: 2026-03-28

---

## 1. CLI Output Formatting

All CLI output uses the **Click** library (`click.echo`, `click.secho`,
`click.style`).  Never use bare `print()` for user-facing output.

### Color Semantics

| Color | Usage | Example |
|-------|-------|---------|
| `green` | Success, checkmarks, active state | `click.style("done", fg="green")` |
| `red` | Errors, critical issues | `click.style("error", fg="red", bold=True)` |
| `yellow` | Warnings, dry-run prefix, caution | `click.secho("warning", fg="yellow")` |
| `cyan` | Labels, categories, token counts | `click.style("42 tok", fg="cyan")` |
| `magenta` | Profile names | `click.style("debug", fg="magenta")` |
| `bright_black` | Secondary info, hints, file paths | `click.style(path, fg="bright_black")` |

### Status Markers

| Symbol | Meaning | Example |
|--------|---------|---------|
| `click.style("done", fg="green")` | Success / completed | After deploy, build |
| `click.style("error", fg="red", bold=True)` | Error level issue | Validation errors |
| `click.style("warn ", fg="yellow")` | Warning level issue | Non-critical findings |
| `(dry)` in yellow | Dry-run mode indicator | Before each action in `--dry-run` |

### Section Headers

Major operations use emoji + bold text:

```python
click.secho(f"\n{emoji}  Action description", bold=True)
```

Standard emoji by domain:
- `"scan"` actions
- `"deploy"` / build actions
- `"plugin"` actions
- `"validate"` actions

### Dividers

Visual separation between sections:

```python
click.secho(f"{'line' * 54}", fg="bright_black")
```

### Hierarchical Output

Use 2-space indentation for nested information:

```
  tool-name
    file.md  [kind]  42 tok
    other.md [rules] 18 tok
```

### Summary Lines

End operations with a count summary:

```python
click.echo(f"Deployed {n} files across {m} tools")
```

---

## 2. Error Handling

### Error Levels

| Level | Display | When |
|-------|---------|------|
| Error | Red, bold | Fatal: cannot continue |
| Warning | Yellow | Non-critical: operation continues |
| Info | Default | Informational output |

### Fatal Errors

Use `raise SystemExit(message)` for unrecoverable errors.  This produces
clean output without a traceback.  Reserve `click.Abort` for user
cancellation only.

### Validation Errors

Structured errors use the `Issue` dataclass pattern from `validate_cmd.py`:

```python
@dataclass
class Issue:
    file: str
    line: int
    level: str    # "error" | "warn"
    message: str
```

Display with file:line reference and color-coded level.

### Error Summary

After batch operations, show an aggregate count:

```python
click.echo(f"{errors} error(s), {warnings} warning(s)")
```

---

## 3. `.aictx` Format Conventions

### Section Types

The `.aictx` format uses INI-style sections with typed headers:

```
[type:profile:key]
content
```

Standard section types: `instruction`, `rule`, `mcp`, `hook`, `setting`,
`permission`, `env`, `ignore`, `plugin`.

### Profile System

- `_always` — applied to all profiles (default)
- Named profiles (`debug`, `docs`, `strict`) — applied selectively
- Profile specified at deploy time via `--profile`

### Content Rules

- Instructions are plain text (markdown allowed)
- Rules are single-purpose, one behavior per rule
- MCP sections use JSON for server configuration
- Hook sections define event → command mappings
- Settings sections emit to tool-specific config files

---

## 4. Plugin Structure

### Directory Layout

```
plugin-root/
  .claude-plugin/
    plugin.json         # manifest: {name, version, description, author}
  commands/             # *.md — command definitions
  skills/               # skill_name/SKILL.md — skill definitions
  agents/               # *.md — agent definitions
  hooks/                # hooks.json — lifecycle rules
  .mcp.json             # MCP server configuration
  settings.json         # default settings
```

### Plugin Metadata

Read from `[plugin]` section in `.aictx` files:

```
[plugin]
name = my-plugin
version = 1.0.0
description = What this plugin does
author = Author Name
```

CLI flags (`--name`, `--version`) override `.aictx` metadata.

### Plugin Discovery

Search order for plugin directories:
1. `root/.claude-plugin/` (direct)
2. `root/plugin/.claude-plugin/` (conventional)
3. Immediate subdirectories (excluding `.git`, `node_modules`, etc.)

---

## 5. Shared Utilities

### `aictl/utils.py` — Common Functions

| Function | Purpose | Usage |
|----------|---------|-------|
| `estimate_tokens(text)` | Token count estimate (bytes/4) | Display token costs |
| `human_size(n)` | Byte formatting (KB, MB, GB) | File/memory sizes |
| `rel_display(path, root, home)` | Relative path for display | CLI output |
| `write_safe(path, content)` | Create dirs + write | File emission |
| `read_if_exists(path)` | Safe file read | Config loading |

### Import Pattern

```python
from ..utils import estimate_tokens, human_size
```

---

## 6. Command Structure

### Registration Pattern

Commands live in `aictl/commands/`, imported and registered in `cli.py`:

```python
# cli.py
from .commands.deploy import deploy
main.add_command(deploy)
```

### Subcommand Groups

Complex domains use `@click.group()` with nested `@group.command()`:

```python
@click.group()
def hooks():
    """Manage hook integration."""

@hooks.command()
def install(...):
    """Install hooks."""
```

Current groups: `plugin`, `memory`, `hooks`, `config`, `otel`, `monitor`,
`dashboard`.

### Standard Options

| Option | Flag | Used by |
|--------|------|---------|
| Root directory | `-r/--root` | deploy, diff, scan, init |
| Profile | `-p/--profile` | deploy, diff, scan |
| Tool filter | `--tool` | deploy, diff, status |
| Dry run | `--dry-run` | deploy |
| Output format | `--format` / `--json` | status, scan |
| Port | `--port` | serve, hooks, otel |

---

## 7. Data File Conventions

### CSV Files (`aictl/data/`)

Discovery data consumed at runtime:

| File | Content | Columns |
|------|---------|---------|
| `paths-unix.csv` | Config paths (macOS/Linux) | path, ai_tool, platform, ... |
| `paths-windows.csv` | Config paths (Windows) | same schema |
| `processes-unix.csv` | Process patterns (macOS/Linux) | process_name, ai_tool, ... |
| `processes-windows.csv` | Process patterns (Windows) | same schema |

### Research Docs (`docs/tools-analysis-docs/`)

Reference material generated by `/ai-tools-scraper`:

- Per-domain markdown: config paths, processes, traffic, capabilities, observability
- Per-domain CSV: flat tables for programmatic access
- Per-tool deep-dives: individual tool reference documents
- Monitoring dossiers: consolidated per-tool operational profiles

---

## 8. Testing Conventions

### Test Location

All tests in `test/` directory, named `test_*.py`.

### Fixture Patterns

- `tmp_path` for file-based databases
- `HistoryDB(flush_interval=0)` for synchronous tests
- Real HTTP server on random port for API endpoint tests
- `DashboardSnapshot` fixtures for store tests

### Test Structure

```python
def test_descriptive_name():
    """One-line docstring explaining what is tested."""
    # setup
    # action
    # assert
```

### Running Tests

```bash
python3 -m pytest test/ -x -q    # all tests, stop on first failure
python3 -m pytest test/test_otel_receiver.py -x -q  # single file
```
