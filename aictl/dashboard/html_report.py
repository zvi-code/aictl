"""Generate a self-contained HTML report from a dashboard snapshot.

The report includes:
  - Summary cards (files, tokens, processes, CPU, memory, MCP, agent memory)
  - Per-tool breakdown with file previews (last N lines + expand)
  - Process table
  - MCP server connectivity table with status indicators
  - Agent memory browser (latest lines + expand)
  - Responsive layout, dark/light mode, no external dependencies
"""

from __future__ import annotations

import html
import json
import time
from datetime import datetime
from pathlib import Path

from .collector import DashboardSnapshot


_SOURCE_LABELS = {
    "claude-user-memory": "User Memory (~/.claude/CLAUDE.md)",
    "claude-project-memory": "Project Memory (CLAUDE.md)",
    "claude-auto-memory": "Auto Memory (~/.claude/projects/)",
}

_STATUS_COLOURS = {
    "running": "#34d399",
    "stopped": "#f87171",
    "error": "#fb923c",
    "unknown": "#94a3b8",
}

# How many tail lines to show in the collapsed preview
_PREVIEW_LINES = 5


def render_html(snap: DashboardSnapshot) -> str:
    """Return a complete self-contained HTML string."""
    root = Path(snap.root)
    home = Path.home()
    generated = datetime.fromtimestamp(snap.timestamp).strftime("%Y-%m-%d %H:%M:%S")

    tool_cards = _render_tool_cards(snap, root, home)
    bar_segments = _render_bar(snap)
    mcp_section = _render_mcp_section(snap)
    memory_section = _render_memory_section(snap, root, home)
    aictl_section = _render_aictl_section(snap, root, home)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aictl status — {_esc(str(root))}</title>
<style>
:root {{
  --bg: #0f172a; --bg2: #1e293b; --fg: #e2e8f0; --fg2: #94a3b8;
  --accent: #38bdf8; --border: #334155;
  --green: #34d399; --red: #f87171; --orange: #fb923c;
}}
@media (prefers-color-scheme: light) {{
  :root {{
    --bg: #f8fafc; --bg2: #ffffff; --fg: #1e293b; --fg2: #64748b;
    --accent: #0284c7; --border: #e2e8f0;
    --green: #059669; --red: #dc2626; --orange: #ea580c;
  }}
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
  background: var(--bg); color: var(--fg); padding: 1.5rem; line-height: 1.5;
}}
h1 {{ font-size: 1.4rem; margin-bottom: 0.25rem; }}
h3 {{ font-size: 1rem; margin: 1.5rem 0 0.75rem; color: var(--accent); }}
.subtitle {{ color: var(--fg2); font-size: 0.85rem; margin-bottom: 1.5rem; }}

/* Stat cards */
.stat-grid {{
  display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem; margin-bottom: 1.5rem;
}}
.stat-card {{
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; padding: 0.75rem 1rem; text-align: center;
}}
.stat-card .label {{ color: var(--fg2); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }}
.stat-card .value {{ font-size: 1.5rem; font-weight: 700; color: var(--accent); }}

/* Bar */
.resource-bar {{
  display: flex; height: 8px; border-radius: 4px; overflow: hidden;
  margin-bottom: 1.5rem; background: var(--border);
}}
.bar-seg {{ transition: width 0.3s; }}

/* Cards */
.tool-card {{
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem;
}}
.tool-card h2 {{ font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; }}
.dot {{ width: 10px; height: 10px; border-radius: 50%; display: inline-block; }}
.status-dot {{ width: 8px; height: 8px; border-radius: 50%; display: inline-block; }}
.badges {{ margin: 0.5rem 0; }}
.badge {{
  display: inline-block; background: var(--border); color: var(--fg2);
  padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.25rem;
}}
.section-card {{
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem;
}}

/* Details / expand */
details {{ margin: 0.5rem 0; }}
summary {{
  cursor: pointer; color: var(--fg2); font-size: 0.85rem;
  padding: 0.25rem 0; user-select: none;
}}

/* Tables */
table {{
  width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 0.25rem;
}}
th {{
  text-align: left; color: var(--fg2); font-weight: 600;
  border-bottom: 1px solid var(--border); padding: 0.35rem 0.5rem;
}}
td {{ padding: 0.3rem 0.5rem; border-bottom: 1px solid var(--border); }}
.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
code {{ font-size: 0.8em; color: var(--fg2); }}

/* Content preview blocks */
.preview-box {{
  background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
  padding: 0.5rem 0.75rem; margin-top: 0.35rem; font-size: 0.78rem;
  white-space: pre-wrap; color: var(--fg2); font-family: 'SF Mono', Menlo, Consolas, monospace;
  line-height: 1.45; overflow-x: auto;
}}
.preview-tail {{
  max-height: none;  /* shown by default */
}}
.preview-full {{
  display: none;     /* hidden until expanded */
}}
.preview-box .line-no {{
  color: var(--border); user-select: none; display: inline-block;
  width: 3ch; text-align: right; margin-right: 0.75em;
}}
.expand-btn {{
  display: inline-block; margin-top: 0.25rem; padding: 0.15rem 0.5rem;
  background: var(--border); color: var(--fg2); border: none; border-radius: 3px;
  font-size: 0.72rem; cursor: pointer; transition: all 0.15s;
}}
.expand-btn:hover {{ background: var(--accent); color: var(--bg); }}

/* Memory entries */
.mem-source {{ font-weight: 600; color: var(--accent); font-size: 0.75rem; text-transform: uppercase; }}
.mem-entry {{ margin-bottom: 0.75rem; }}

/* Tabs */
.tab-nav {{
  display: flex; gap: 0; margin-bottom: 0; border-bottom: 2px solid var(--border);
}}
.tab-btn {{
  padding: 0.5rem 1rem; cursor: pointer; background: none; border: none;
  color: var(--fg2); font-size: 0.85rem; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all 0.2s;
}}
.tab-btn:hover {{ color: var(--fg); }}
.tab-btn.active {{ color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }}
.tab-panel {{ display: none; padding-top: 0.75rem; }}
.tab-panel.active {{ display: block; }}

/* Footer */
.footer {{
  text-align: center; color: var(--fg2); font-size: 0.75rem;
  margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border);
}}
</style>
</head>
<body>
<h1>aictl status</h1>
<div class="subtitle">{_esc(str(root))} — generated {generated}</div>

<div class="stat-grid">
  <div class="stat-card"><div class="label">Files</div><div class="value">{snap.total_files}</div></div>
  <div class="stat-card"><div class="label">Tokens</div><div class="value">{_human_tokens(snap.total_tokens)}</div></div>
  <div class="stat-card"><div class="label">Processes</div><div class="value">{snap.total_processes}</div></div>
  <div class="stat-card"><div class="label">CPU</div><div class="value">{snap.total_cpu:.1f}%</div></div>
  <div class="stat-card"><div class="label">Memory</div><div class="value">{snap.total_mem_mb:.0f} MB</div></div>
  <div class="stat-card"><div class="label">MCP Servers</div><div class="value">{snap.total_mcp_servers}</div></div>
  <div class="stat-card"><div class="label">Agent Memory</div><div class="value">{snap.total_memory_entries}</div></div>
  <div class="stat-card"><div class="label">Memory Tokens</div><div class="value">{_human_tokens(snap.total_memory_tokens)}</div></div>
</div>

<div class="resource-bar">{bar_segments}</div>

<div class="tab-nav">
  <button class="tab-btn active" onclick="showTab('tools')">AI Tools</button>
  <button class="tab-btn" onclick="showTab('mcp')">MCP Servers</button>
  <button class="tab-btn" onclick="showTab('memory')">Agent Memory</button>
  <button class="tab-btn" onclick="showTab('aictl')">aictl (.aictx)</button>
</div>

<div id="tab-tools" class="tab-panel active">
{''.join(tool_cards)}
</div>

<div id="tab-mcp" class="tab-panel">
{mcp_section}
</div>

<div id="tab-memory" class="tab-panel">
{memory_section}
</div>

<div id="tab-aictl" class="tab-panel">
{aictl_section}
</div>

<div class="footer">
  Generated by <strong>aictl {_version()}</strong> — <code>aictl status --html</code>
</div>

<script>
function showTab(name) {{
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
}}

function togglePreview(id) {{
  const tail = document.getElementById(id + '-tail');
  const full = document.getElementById(id + '-full');
  const btn = document.getElementById(id + '-btn');
  if (full.style.display === 'none' || !full.style.display) {{
    full.style.display = 'block';
    tail.style.display = 'none';
    btn.textContent = 'collapse';
  }} else {{
    full.style.display = 'none';
    tail.style.display = 'block';
    btn.textContent = 'show all (' + full.dataset.lines + ' lines)';
  }}
}}

window.__AICTL_SNAPSHOT__ = {snap.to_json()};
</script>
</body>
</html>"""


# ── Content preview helper ───────────────────────────────────────

_preview_counter = 0

def _render_content_preview(content: str, uid: str, tail_lines: int = _PREVIEW_LINES) -> str:
    """Render a content block showing the last N lines with an expand button.

    Returns HTML with:
      - A tail preview (last N lines, always visible)
      - A full content block (hidden, toggled by button)
      - An expand/collapse button (only if content exceeds tail_lines)
    """
    lines = content.splitlines()
    total = len(lines)

    if total <= tail_lines:
        # Short content — just show it all, no expand button
        numbered = _number_lines(lines, start=1)
        return f'<div class="preview-box">{numbered}</div>'

    # Tail preview: last N lines
    tail_start = total - tail_lines + 1
    tail_content = lines[-tail_lines:]
    tail_numbered = _number_lines(tail_content, start=tail_start)

    # Full content: all lines
    full_numbered = _number_lines(lines, start=1)

    return f"""<div id="{uid}-tail" class="preview-box preview-tail">{tail_numbered}</div>
<div id="{uid}-full" class="preview-box preview-full" data-lines="{total}" style="display:none">{full_numbered}</div>
<button id="{uid}-btn" class="expand-btn" onclick="togglePreview('{uid}')">show all ({total} lines)</button>"""


def _number_lines(lines: list[str], start: int = 1) -> str:
    """Render lines with line numbers."""
    parts = []
    for i, line in enumerate(lines):
        num = start + i
        parts.append(
            f'<span class="line-no">{num}</span>{_esc(line)}'
        )
    return "\n".join(parts)


def _read_file_tail(path_str: str, max_size: int = 50_000) -> str | None:
    """Try to read a file's content for preview. Returns None if unreadable."""
    try:
        p = Path(path_str)
        if not p.is_file():
            return None
        size = p.stat().st_size
        if size > max_size:
            # Read only the tail for large files
            with open(p, "r", errors="replace") as f:
                f.seek(max(0, size - max_size))
                if size > max_size:
                    f.readline()  # skip partial first line
                return f.read()
        return p.read_text(errors="replace")
    except OSError:
        return None


# ── Section renderers ────────────────────────────────────────────

def _render_tool_cards(snap: DashboardSnapshot, root: Path, home: Path) -> list[str]:
    global _preview_counter
    tool_cards = []

    for tr in snap.tools:
        if tr.tool == "aictl":
            continue  # moved to its own tab
        if not tr.files and not tr.processes and not tr.mcp_servers:
            continue

        files_html = ""
        if tr.files:
            file_rows = []
            for f in tr.files:
                _preview_counter += 1
                uid = f"file-{_preview_counter}"
                rel = _rel(f.path, root, home)
                tok = f"{f.tokens:,}" if f.tokens else "—"

                # Try to read file content for preview
                content = _read_file_tail(f.path)
                preview_html = ""
                if content and content.strip():
                    preview_html = f"""
                    <tr class="file-preview-row"><td colspan="4" style="padding:0 0.5rem 0.5rem">
                      {_render_content_preview(content, uid)}
                    </td></tr>"""

                file_rows.append(
                    f"<tr><td><code>{_esc(rel)}</code></td>"
                    f"<td>{_esc(f.kind)}</td>"
                    f"<td class='num'>{_human_size(f.size)}</td>"
                    f"<td class='num'>{tok}</td></tr>"
                    f"{preview_html}"
                )

            files_html = f"""
            <details open>
              <summary>{len(tr.files)} file{'s' if len(tr.files) != 1 else ''}</summary>
              <table class="file-table">
                <thead><tr><th>Path</th><th>Kind</th><th>Size</th><th>Tokens</th></tr></thead>
                <tbody>{''.join(file_rows)}</tbody>
              </table>
            </details>"""

        procs_html = ""
        if tr.processes:
            rows = []
            for p in tr.processes:
                rows.append(
                    f"<tr><td class='num'>{p.pid}</td>"
                    f"<td>{_esc(p.name)}</td>"
                    f"<td class='num'>{p.cpu_pct}%</td>"
                    f"<td class='num'>{p.mem_mb} MB</td>"
                    f"<td><code>{_esc(p.cmdline[:100])}</code></td></tr>"
                )
            procs_html = f"""
            <details open>
              <summary>{len(tr.processes)} process{'es' if len(tr.processes) != 1 else ''}</summary>
              <table class="proc-table">
                <thead><tr><th>PID</th><th>Name</th><th>CPU</th><th>MEM</th><th>Command</th></tr></thead>
                <tbody>{''.join(rows)}</tbody>
              </table>
            </details>"""

        mcp_html = ""
        if tr.mcp_servers:
            rows = []
            for srv in tr.mcp_servers:
                name = srv.get("name", "?")
                cmd = srv.get("config", {}).get("command", "?")
                args = " ".join(srv.get("config", {}).get("args", []))
                rows.append(
                    f"<tr><td>{_esc(name)}</td>"
                    f"<td><code>{_esc(cmd)} {_esc(args[:80])}</code></td></tr>"
                )
            mcp_html = f"""
            <details open>
              <summary>{len(tr.mcp_servers)} MCP server{'s' if len(tr.mcp_servers) != 1 else ''}</summary>
              <table class="mcp-table">
                <thead><tr><th>Server</th><th>Command</th></tr></thead>
                <tbody>{''.join(rows)}</tbody>
              </table>
            </details>"""

        colour = _tool_colour(tr.tool)
        total_tokens = sum(f.tokens for f in tr.files)
        total_cpu = sum(float(p.cpu_pct) for p in tr.processes
                        if p.cpu_pct.replace('.', '', 1).isdigit())
        total_mem = sum(float(p.mem_mb) for p in tr.processes
                        if p.mem_mb.replace('.', '', 1).isdigit())

        badge_parts = []
        if tr.files:
            badge_parts.append(f"{len(tr.files)} files")
        if total_tokens:
            badge_parts.append(f"{_human_tokens(total_tokens)}")
        if tr.processes:
            badge_parts.append(f"CPU {total_cpu:.1f}%")
            badge_parts.append(f"MEM {total_mem:.0f}MB")
        if tr.mcp_servers:
            badge_parts.append(f"{len(tr.mcp_servers)} MCP")
        badges = " ".join(f'<span class="badge">{b}</span>' for b in badge_parts)

        tool_cards.append(f"""
        <section class="tool-card" style="border-left: 4px solid {colour}">
          <h2><span class="dot" style="background:{colour}"></span> {_esc(tr.label)}</h2>
          <div class="badges">{badges}</div>
          {files_html}
          {procs_html}
          {mcp_html}
        </section>""")

    return tool_cards


def _render_bar(snap: DashboardSnapshot) -> str:
    segments = []
    for tr in snap.tools:
        n = len(tr.files)
        if n == 0:
            continue
        pct = (n / max(snap.total_files, 1)) * 100
        colour = _tool_colour(tr.tool)
        segments.append(
            f'<div class="bar-seg" style="width:{pct:.1f}%;background:{colour}" '
            f'title="{_esc(tr.label)}: {n} files"></div>'
        )
    return "".join(segments)


def _render_mcp_section(snap: DashboardSnapshot) -> str:
    if not snap.mcp_detail:
        return '<div class="section-card"><p style="color:var(--fg2)">No MCP servers configured.</p></div>'

    rows = []
    running = sum(1 for s in snap.mcp_detail if s.status == "running")
    stopped = sum(1 for s in snap.mcp_detail if s.status == "stopped")

    for srv in snap.mcp_detail:
        colour = _STATUS_COLOURS.get(srv.status, "#94a3b8")
        pid_str = str(srv.pid) if srv.pid else "—"
        cpu_str = f"{srv.cpu_pct}%" if srv.cpu_pct else "—"
        mem_str = f"{srv.mem_mb} MB" if srv.mem_mb else "—"

        rows.append(
            f"<tr>"
            f"<td><span class='status-dot' style='background:{colour}'></span> {_esc(srv.status)}</td>"
            f"<td><strong>{_esc(srv.name)}</strong></td>"
            f"<td>{_esc(srv.tool)}</td>"
            f"<td><span class='badge'>{_esc(srv.transport)}</span></td>"
            f"<td><code>{_esc(srv.endpoint[:80])}</code></td>"
            f"<td class='num'>{pid_str}</td>"
            f"<td class='num'>{cpu_str}</td>"
            f"<td class='num'>{mem_str}</td>"
            f"</tr>"
        )

    summary_badges = f"""
    <div class="badges" style="margin-bottom:0.75rem">
      <span class="badge" style="background:#34d39933;color:#34d399">{running} running</span>
      <span class="badge" style="background:#f8717133;color:#f87171">{stopped} stopped</span>
      <span class="badge">{len(snap.mcp_detail)} total</span>
    </div>"""

    return f"""
    <div class="section-card">
      {summary_badges}
      <table>
        <thead><tr>
          <th>Status</th><th>Server</th><th>Tool</th><th>Transport</th>
          <th>Endpoint</th><th>PID</th><th>CPU</th><th>MEM</th>
        </tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
    </div>"""


def _render_memory_section(snap: DashboardSnapshot, root: Path, home: Path) -> str:
    global _preview_counter

    if not snap.agent_memory:
        return '<div class="section-card"><p style="color:var(--fg2)">No agent memory found.</p></div>'

    # Group by source type
    groups: dict[str, list] = {}
    for entry in snap.agent_memory:
        label = _SOURCE_LABELS.get(entry.source, entry.source)
        groups.setdefault(label, []).append(entry)

    sections = []
    for label, entries in groups.items():
        total_tok = sum(e.tokens for e in entries)
        items = []
        for entry in entries:
            _preview_counter += 1
            uid = f"mem-{_preview_counter}"
            file_display = _rel(entry.file, root, home) if entry.file else "—"

            preview = _render_content_preview(entry.content, uid)

            items.append(f"""
            <div class="mem-entry">
              <div>
                <span style="font-weight:600;color:var(--fg)">{_esc(entry.profile)}</span>
                <span class="badge">{entry.tokens} tok</span>
                <span class="badge">{entry.lines} lines</span>
                <code style="font-size:0.7rem;color:var(--fg2)">{_esc(file_display)}</code>
              </div>
              {preview}
            </div>""")

        sections.append(f"""
        <div class="section-card">
          <details open>
            <summary>
              <span class="mem-source">{_esc(label)}</span>
              — {len(entries)} {'entry' if len(entries) == 1 else 'entries'}
              ({_human_tokens(total_tok)})
            </summary>
            {''.join(items)}
          </details>
        </div>""")

    return "".join(sections)

def _render_aictl_section(snap: DashboardSnapshot, root: Path, home: Path) -> str:
    """Render the aictl (.aictx) tab — context files managed by aictl, not read by LLM tools."""
    global _preview_counter

    aictl_tools = [tr for tr in snap.tools if tr.tool == "aictl"]
    if not aictl_tools or not any(tr.files for tr in aictl_tools):
        return '<div class="section-card"><p style="color:var(--fg2)">No .aictx context files found.</p></div>'

    sections = []
    sections.append("""
    <div class="section-card" style="margin-bottom:1rem">
      <p style="color:var(--fg2);font-size:0.85rem">
        These files are managed by <strong>aictl</strong> and are <em>not</em> read directly by LLM tools.
        They are the source of truth from which <code>aictl deploy</code> generates native tool files.
      </p>
    </div>""")

    for tr in aictl_tools:
        if not tr.files:
            continue

        file_rows = []
        for f in tr.files:
            _preview_counter += 1
            uid = f"aictx-{_preview_counter}"
            rel = _rel(f.path, root, home)
            tok = f"{f.tokens:,}" if f.tokens else "—"

            content = _read_file_tail(f.path)
            preview_html = ""
            if content and content.strip():
                preview_html = f"""
                <tr class="file-preview-row"><td colspan="4" style="padding:0 0.5rem 0.5rem">
                  {_render_content_preview(content, uid)}
                </td></tr>"""

            file_rows.append(
                f"<tr><td><code>{_esc(rel)}</code></td>"
                f"<td>{_esc(f.kind)}</td>"
                f"<td class='num'>{_human_size(f.size)}</td>"
                f"<td class='num'>{tok}</td></tr>"
                f"{preview_html}"
            )

        sections.append(f"""
        <div class="section-card">
          <table class="file-table">
            <thead><tr><th>Path</th><th>Kind</th><th>Size</th><th>Tokens</th></tr></thead>
            <tbody>{''.join(file_rows)}</tbody>
          </table>
        </div>""")

    return "".join(sections)




def _esc(s: str) -> str:
    return html.escape(s)


def _rel(path_str: str, root: Path, home: Path) -> str:
    p = Path(path_str)
    try:
        return str(p.relative_to(root))
    except ValueError:
        pass
    try:
        return "~/" + str(p.relative_to(home))
    except ValueError:
        return path_str


def _human_size(n: int) -> str:
    if n < 1024:
        return f"{n}B"
    k = n / 1024
    if k < 1024:
        return f"{k:.1f}KB"
    return f"{k / 1024:.1f}MB"


def _human_tokens(n: int) -> str:
    if n < 1000:
        return str(n)
    if n < 100_000:
        return f"{n / 1000:.1f}k"
    return f"{n / 1000:.0f}k"


def _tool_colour(tool: str) -> str:
    return {
        "claude": "#c084fc",
        "copilot": "#60a5fa",
        "cursor": "#34d399",
        "windsurf": "#fbbf24",
        "env": "#f97316",
        "aictl": "#94a3b8",
    }.get(tool, "#64748b")


def _version() -> str:
    try:
        from importlib.metadata import version
        return version("aictl")
    except Exception:
        return "0.4.0"
