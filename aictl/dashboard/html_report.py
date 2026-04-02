# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
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
import itertools
import json
import time
from datetime import datetime
from pathlib import Path

from .models import DashboardSnapshot, STATUS_COLOURS as _STATUS_COLOURS


_SOURCE_LABELS = {
    "claude-user-memory": "User Memory (~/.claude/CLAUDE.md)",
    "claude-project-memory": "Project Memory (CLAUDE.md)",
    "claude-auto-memory": "Auto Memory (~/.claude/projects/)",
}

# How many tail lines to show in the collapsed preview
_PREVIEW_LINES = 5

# Token breakdown badge config: (key, color, label)
_TOKEN_BADGE_DEFS = [
    ("always_loaded", "#34d399", "always"),
    ("on_demand",     "#38bdf8", "on-demand"),
    ("conditional",   "#fb923c", "conditional"),
    ("never_sent",    "#94a3b8", "never"),
]


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
    telemetry_section = _render_telemetry_section(snap)
    events_section = _render_events_section(snap)

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

/* Dir tree */
.dir-tree {{ margin: 0; padding: 0; }}
.dir-group {{ margin: 0; }}
.dir-group > .dir-children {{ padding-left: 1.25rem; border-left: 1px solid var(--border); margin-left: 0.75rem; }}
.dir-summary {{
  display: flex; align-items: center; gap: 0.4rem; list-style: none;
  padding: 0.3rem 0.5rem; font-size: 0.82rem; cursor: pointer;
  border-radius: 4px;
}}
.dir-summary:hover {{ background: var(--border); }}
.dir-summary::-webkit-details-marker {{ display: none; }}
.dir-summary::before {{ content: "▶"; font-size: 0.6rem; opacity: 0.45; transition: transform 0.15s; min-width: 0.7rem; }}
details[open] > .dir-summary::before {{ transform: rotate(90deg); }}
.dir-icon {{ opacity: 0.7; font-size: 0.85rem; }}
.dir-meta {{ color: var(--fg2); font-size: 0.72rem; margin-left: auto; white-space: nowrap; }}
.file-row {{
  display: flex; align-items: baseline; gap: 0.5rem; padding: 0.2rem 0.5rem;
  font-size: 0.8rem; border-radius: 3px;
}}
.file-row:hover {{ background: var(--border); }}
.file-name {{ font-family: 'SF Mono', Menlo, Consolas, monospace; }}
.file-kind {{ color: var(--fg2); font-size: 0.72rem; }}
.file-size {{ color: var(--fg2); font-size: 0.72rem; margin-left: auto; white-space: nowrap; }}
.file-preview-wrap {{ padding: 0 0.5rem 0.5rem 1.5rem; }}

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
  <button class="tab-btn" onclick="showTab('telemetry')">Telemetry</button>
  <button class="tab-btn" onclick="showTab('events')">Events</button>
  <button class="tab-btn" onclick="showTab('mcp')">MCP Servers</button>
  <button class="tab-btn" onclick="showTab('memory')">Agent Memory</button>
  <button class="tab-btn" onclick="showTab('aictl')">aictl (.aictx)</button>
</div>

<div id="tab-tools" class="tab-panel active">
{''.join(tool_cards)}
</div>

<div id="tab-telemetry" class="tab-panel">
{telemetry_section}
</div>

<div id="tab-events" class="tab-panel">
{events_section}
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

_uid = itertools.count(1)

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
    tool_cards = []

    for tr in snap.tools:
        if tr.tool == "aictl":
            continue  # moved to its own tab
        if not tr.files and not tr.processes and not tr.mcp_servers:
            continue

        files_html = ""
        if tr.files:
            dir_html = _files_html_by_dir(tr.files, root, home, f"file-{tr.tool}")
            files_html = (
                f'<details>'
                f'<summary>{len(tr.files)} file{"s" if len(tr.files) != 1 else ""}</summary>'
                f"{dir_html}"
                f"</details>"
            )

        procs_html = ""
        if tr.processes:
            rows = []
            for p in tr.processes:
                risk = getattr(p, "zombie_risk", "") or ""
                risk_badge = ""
                if risk in ("high", "medium"):
                    rc = "#f87171" if risk == "high" else "#fb923c"
                    risk_badge = f' <span style="color:{rc};font-weight:600">⚠ {risk}</span>'
                cleanup = getattr(p, "cleanup_cmd", "") or ""
                cleanup_cell = f"<code>{_esc(cleanup)}</code>" if cleanup else "—"
                rows.append(
                    f"<tr><td class='num'>{p.pid}</td>"
                    f"<td>{_esc(p.name)}{risk_badge}</td>"
                    f"<td class='num'>{p.cpu_pct}%</td>"
                    f"<td class='num'>{p.mem_mb} MB</td>"
                    f"<td><code>{_esc(p.cmdline[:100])}</code></td>"
                    f"<td>{cleanup_cell}</td></tr>"
                )
            procs_html = f"""
            <details>
              <table class="proc-table">
                <thead><tr><th>PID</th><th>Name</th><th>CPU</th><th>MEM</th><th>Command</th><th>Cleanup</th></tr></thead>
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
            <details>
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

        # Token breakdown badges
        tb = tr.token_breakdown
        tb_html = ""
        if tb and tb.get("total", 0) > 0:
            tb_parts = [
                f'<span class="badge" style="background:{color}33;color:{color}">{label}: {_human_tokens(tb[key])}</span>'
                for key, color, label in _TOKEN_BADGE_DEFS
                if tb.get(key)
            ]
            if tb_parts:
                tb_html = f'<div class="badges" style="margin-top:0.25rem">{" ".join(tb_parts)}</div>'

        tool_cards.append(f"""
        <section class="tool-card" style="border-left: 4px solid {colour}">
          <h2><span class="dot" style="background:{colour}"></span> {_tool_icon(tr.tool)} {_esc(tr.label)}</h2>
          <div class="badges">{badges}</div>
          {tb_html}
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
        return _empty_card("No MCP servers configured.")

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
    if not snap.agent_memory:
        return _empty_card("No agent memory found.")

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
            uid = f"mem-{next(_uid)}"
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
          <details>
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
    aictl_tools = [tr for tr in snap.tools if tr.tool == "aictl"]
    if not aictl_tools or not any(tr.files for tr in aictl_tools):
        return _empty_card("No .aictx context files found.")

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

        dir_html = _files_html_by_dir(tr.files, root, home, "aictx")
        sections.append(f'<div class="section-card">{dir_html}</div>')

    return "".join(sections)




def _files_html_by_dir(
    files: list,
    root: Path,
    home: Path,
    id_prefix: str,
    auto_open_threshold: int = 0,
) -> str:
    """Render a list of ResourceFiles as a nested collapsible directory tree."""
    # Build tree: node = {"_files": [...], <subdir>: node}
    tree: dict = {"_files": []}
    for f in files:
        rel = _rel(f.path, root, home)
        parts = Path(rel).parts
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {"_files": []})
        node["_files"].append((parts[-1], rel, f))

    def _count_files(node: dict) -> int:
        n = len(node["_files"])
        for k, v in node.items():
            if k != "_files":
                n += _count_files(v)
        return n

    def _count_tokens(node: dict) -> int:
        n = sum(f.tokens for _, _, f in node["_files"])
        for k, v in node.items():
            if k != "_files":
                n += _count_tokens(v)
        return n

    def _render_node(node: dict, depth: int = 0) -> str:
        parts_html = []

        # Files in this node
        for filename, rel, f in sorted(node["_files"], key=lambda x: x[0].lower()):
            uid = f"{id_prefix}-{next(_uid)}"
            tok_str = f"~{_human_tokens(f.tokens)}" if f.tokens else ""

            content = _read_file_tail(f.path)
            preview_html = ""
            if content and content.strip():
                preview_html = (
                    f'<div class="file-preview-wrap">'
                    f"{_render_content_preview(content, uid)}"
                    f"</div>"
                )

            parts_html.append(
                f'<div class="file-row">'
                f'<span class="file-name">{_esc(filename)}</span>'
                f'<span class="file-kind">{_esc(f.kind)}</span>'
                f'<span class="file-size">{_human_size(f.size)}'
                f'{"  " + tok_str if tok_str else ""}</span>'
                f"</div>"
                f"{preview_html}"
            )

        # Subdirectory nodes
        for subdir in sorted(k for k in node if k != "_files"):
            child = node[subdir]
            n_files = _count_files(child)
            dir_tok = _count_tokens(child)
            tok_str = f" · {_human_tokens(dir_tok)}" if dir_tok else ""
            meta = f"{n_files} file{'s' if n_files != 1 else ''}{tok_str}"

            child_html = _render_node(child, depth + 1)
            parts_html.append(
                f'<details class="dir-group">'
                f'<summary class="dir-summary">'
                f'<span class="dir-icon">📁</span>'
                f"<code>{_esc(subdir)}</code>"
                f'<span class="dir-meta">{meta}</span>'
                f"</summary>"
                f'<div class="dir-children">{child_html}</div>'
                f"</details>"
            )

        return "\n".join(parts_html)

    return f'<div class="dir-tree">{_render_node(tree)}</div>'


def _render_telemetry_section(snap: DashboardSnapshot) -> str:
    """Render per-tool telemetry: token usage, cost, sessions, errors."""
    if not snap.tool_telemetry:
        return _empty_card("No telemetry data collected.")

    rows = []
    for tel in snap.tool_telemetry:
        tool = tel.get("tool", "?")
        inp = tel.get("input_tokens", 0)
        out = tel.get("output_tokens", 0)
        cache_r = tel.get("cache_read_tokens", 0)
        cache_c = tel.get("cache_creation_tokens", 0)
        cost = tel.get("cost_usd", 0)
        sessions = tel.get("total_sessions", 0)
        messages = tel.get("total_messages", 0)
        confidence = tel.get("confidence", 0)
        source = tel.get("source", "")
        errors = tel.get("errors", [])

        cost_str = f"${cost:.4f}" if cost else "—"
        err_str = f'<span style="color:var(--red)">{len(errors)} errors</span>' if errors else "—"
        conf_str = f"{confidence:.0%}" if confidence else "—"

        rows.append(
            f"<tr>"
            f"<td><strong>{_esc(tool)}</strong></td>"
            f"<td class='num'>{_human_tokens(inp)}</td>"
            f"<td class='num'>{_human_tokens(out)}</td>"
            f"<td class='num'>{_human_tokens(cache_r)}</td>"
            f"<td class='num'>{_human_tokens(cache_c)}</td>"
            f"<td class='num'>{cost_str}</td>"
            f"<td class='num'>{sessions}</td>"
            f"<td class='num'>{messages}</td>"
            f"<td>{conf_str}</td>"
            f"<td><code>{_esc(source)}</code></td>"
            f"<td>{err_str}</td>"
            f"</tr>"
        )

    # Daily breakdown if available
    daily_html = ""
    for tel in snap.tool_telemetry:
        daily = tel.get("daily", [])
        if not daily:
            continue
        tool = tel.get("tool", "?")
        daily_rows = []
        for d in daily[-7:]:
            date = d.get("date", "?")
            by_model = d.get("tokens_by_model", {})
            model_parts = ", ".join(f"{m}: {_human_tokens(c)}" for m, c in by_model.items())
            daily_rows.append(f"<tr><td>{_esc(date)}</td><td>{_esc(model_parts) if model_parts else '—'}</td></tr>")
        if daily_rows:
            daily_html += f"""
            <details style="margin-top:0.75rem">
              <summary>{_esc(tool)} — daily token usage (last 7 days)</summary>
              <table><thead><tr><th>Date</th><th>Tokens by Model</th></tr></thead>
              <tbody>{''.join(daily_rows)}</tbody></table>
            </details>"""

    return f"""
    <div class="section-card">
      <table>
        <thead><tr>
          <th>Tool</th><th>Input</th><th>Output</th><th>Cache Read</th>
          <th>Cache Create</th><th>Cost</th><th>Sessions</th><th>Messages</th>
          <th>Confidence</th><th>Source</th><th>Errors</th>
        </tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
      {daily_html}
    </div>"""


def _render_events_section(snap: DashboardSnapshot) -> str:
    """Render recent events as a table."""
    if not snap.events:
        return _empty_card("No events recorded.")

    rows = []
    for ev in snap.events[-50:]:  # Last 50 events
        kind = ev.get("kind", "?")
        ts = ev.get("timestamp", "")
        tool = ev.get("tool", "")
        data = ev.get("data", {})

        # Format timestamp
        if isinstance(ts, (int, float)):
            ts = datetime.fromtimestamp(ts).strftime("%H:%M:%S")

        # Colour by kind
        kind_colours = {
            "session_start": "var(--green)",
            "session_end": "var(--fg2)",
            "file_modified": "var(--accent)",
            "anomaly": "var(--red)",
        }
        kc = kind_colours.get(kind, "var(--fg)")

        # Format data summary
        summary_parts = (
            ([f"pid={data['pid']}"] if data.get("pid") else [])
            + [v for k in ("name", "path", "type") if (v := data.get(k))]
            + ([f"{data['duration_s']:.1f}s"] if data.get("duration_s") else [])
            + ([f"+{_human_size(data['growth_bytes'])}"] if data.get("growth_bytes") else [])
        )
        summary = ", ".join(summary_parts) if summary_parts else "—"

        rows.append(
            f"<tr>"
            f"<td><code>{_esc(str(ts))}</code></td>"
            f"<td style='color:{kc};font-weight:600'>{_esc(kind)}</td>"
            f"<td>{_esc(tool)}</td>"
            f"<td>{_esc(summary)}</td>"
            f"</tr>"
        )

    return f"""
    <div class="section-card">
      <div class="badges" style="margin-bottom:0.75rem">
        <span class="badge">{len(snap.events)} total events</span>
      </div>
      <table>
        <thead><tr><th>Time</th><th>Kind</th><th>Tool</th><th>Details</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
    </div>"""


def _esc(s: str) -> str:
    return html.escape(s)


def _empty_card(msg: str) -> str:
    return f'<div class="section-card"><p style="color:var(--fg2)">{msg}</p></div>'


from ..utils import human_size as _human_size, human_tokens as _human_tokens, rel_display as _rel


def _tool_colour(tool: str) -> str:
    from ..tools import TOOL_COLORS
    return TOOL_COLORS.get(tool, "#64748b")


def _tool_icon(tool: str) -> str:
    from ..tools import TOOL_ICONS, DEFAULT_TOOL_ICON
    return TOOL_ICONS.get(tool, DEFAULT_TOOL_ICON)


def _version() -> str:
    try:
        from importlib.metadata import version
        return version("aictl")
    except Exception:
        return "0.4.0"
