import { useState, useContext, useMemo, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, fmtK, fmtRate } from '../utils.js';

// ─── Helpers ─────────────────────────────────────────────────────
function toolColor(toolId) {
  return COLORS[toolId] || 'var(--fg2)';
}

function fmtAgo(ts) {
  if (!ts) return '\u2014';
  const secs = Math.floor(Date.now() / 1000 - ts);
  if (secs < 60) return secs + 's ago';
  const m = Math.floor(secs / 60);
  if (m < 60) return m + 'm ago';
  return Math.floor(m / 60) + 'h ago';
}

// ─── Stats strip cell ────────────────────────────────────────────
function Stat({ label, value, sub }) {
  return html`<div class="cdb-stat">
    <div class="cdb-stat-label">${label}</div>
    <div class="cdb-stat-row">
      <span class="cdb-stat-value">${value}</span>
      ${sub && html`<span class="cdb-stat-sub">${sub}</span>`}
    </div>
  </div>`;
}

// ─── Session inspector (right pane) ─────────────────────────────
function SessionInspector({ session, toolLabel }) {
  if (!session) {
    return html`<div class="cdb-inspector cdb-inspector--empty">
      <div class="cdb-inspector-empty-label">No selection</div>
      <div>Choose a session in the left pane to inspect it.</div>
    </div>`;
  }
  const id = session.session_id || session.id || '\u2014';
  const shortId = String(id).split(':').pop();
  const rows = [
    ['ID',       shortId],
    ['Tool',     toolLabel || '\u2014'],
    ['Tokens',   fmtK(session.estimated_tokens || session.tokens || 0)],
    ['Active',   session.active !== false ? 'yes' : 'no'],
    ['Workspace', session.workspace || session.project || '\u2014'],
  ];
  return html`<div class="cdb-inspector">
    <div class="cdb-inspector-head">
      <div class="cdb-inspector-overline">Session</div>
      <div class="cdb-inspector-title">${shortId}</div>
    </div>
    <div class="cdb-inspector-body">
      ${rows.map(([k, v]) => html`<div key=${k} class="cdb-inspector-row">
        <span class="cdb-inspector-key">${k}</span>
        <span class="cdb-inspector-val">${v}</span>
      </div>`)}
    </div>
  </div>`;
}

// ─── CDashboardTab ───────────────────────────────────────────────
const RANGES = ['Live', '1h', '6h', '24h', '7d'];

export default function CDashboardTab() {
  const ctx = useContext(SnapContext);
  const snap = ctx?.snap;

  const [range, setRange] = useState('Live');
  const [filter, setFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  // Aggregate stats from snap
  const stats = useMemo(() => {
    if (!snap) return { sessions: 0, processes: 0, tokens: 0, tools: 0, files: 0, mcp: 0 };
    let sessions = 0, processes = 0, tokens = 0, tools = 0, files = 0, mcp = 0;
    for (const t of snap.tools || []) {
      const l = t.live || {};
      sessions += l.session_count || 0;
      processes += l.pid_count || (t.processes || []).length || 0;
      tokens += l.token_estimate || 0;
      if ((l.pid_count || 0) > 0) tools++;
      files += l.files_touched || 0;
      mcp += (t.mcp_servers || []).length;
    }
    return { sessions, processes, tokens, tools, files, mcp };
  }, [snap]);

  // Flatten all active sessions from all tools
  const allSessions = useMemo(() => {
    const out = [];
    for (const t of (snap?.tools || [])) {
      for (const s of (t.live?.sessions || [])) {
        out.push({ ...s, _tool: t.tool, _toolLabel: t.label });
      }
    }
    return out;
  }, [snap]);

  const filteredSessions = useMemo(() => {
    if (!filter) return allSessions;
    const q = filter.toLowerCase();
    return allSessions.filter(s => {
      const id = String(s.session_id || s.id || '');
      return id.toLowerCase().includes(q)
        || (s._toolLabel || '').toLowerCase().includes(q)
        || (s.workspace || s.project || '').toLowerCase().includes(q);
    });
  }, [allSessions, filter]);

  // Auto-select first session if none selected
  const selectedId = selectedSession ?? filteredSessions[0]?.session_id ?? filteredSessions[0]?.id ?? null;
  const selectedObj = filteredSessions.find(s => (s.session_id || s.id) === selectedId) ?? null;

  const handleSelect = useCallback((s) => {
    setSelectedSession(s.session_id || s.id);
  }, []);

  return html`<div class="cdb-shell">
    <!-- Stats strip -->
    <div class="cdb-stats-strip">
      <${Stat} label="Live sessions" value=${stats.sessions}/>
      <${Stat} label="Processes"     value=${stats.processes}/>
      <${Stat} label="Est. tokens"   value=${fmtK(stats.tokens)}/>
      <${Stat} label="Active tools"  value=${stats.tools}/>
      <${Stat} label="Files touched" value=${stats.files}/>
      <${Stat} label="MCP servers"   value=${stats.mcp}/>
    </div>

    <!-- Body: 3-col -->
    <div class="cdb-body">

      <!-- Left: range + sessions -->
      <div class="cdb-left">
        <div class="cdb-left-heading">Range</div>
        <div class="cdb-range-btns">
          ${RANGES.map(r => html`<button key=${r} type="button"
            class=${'cdb-range-btn' + (range === r ? ' is-active' : '')}
            onClick=${() => setRange(r)}>${r}</button>`)}
        </div>

        <div class="cdb-left-heading" style="margin-top:var(--sp-8)">
          Sessions
          <span class="cdb-count-badge">${filteredSessions.length}</span>
        </div>
        <div class="cdb-sessions-list">
          ${filteredSessions.length === 0
            ? html`<div class="cdb-empty-list">No active sessions</div>`
            : filteredSessions.map(s => {
                const id = s.session_id || s.id || '';
                const shortId = String(id).split(':').pop();
                const isSel = id === selectedId;
                const color = toolColor(s._tool);
                return html`<div key=${id}
                  class=${'cdb-session-row' + (isSel ? ' is-selected' : '')}
                  onClick=${() => handleSelect(s)}
                  role="button" tabIndex=${0}
                  onKeyDown=${e => e.key === 'Enter' && handleSelect(s)}>
                  <div class="cdb-session-row-head">
                    <span class="cdb-session-dot" style="background:${color}"></span>
                    <span class="cdb-session-id">${shortId}</span>
                    ${s.active !== false && html`<span class="cdb-live-badge">\u25CF Live</span>`}
                  </div>
                  <div class="cdb-session-meta">
                    ${s._toolLabel} \u00b7 ${fmtK(s.estimated_tokens || s.tokens || 0)} tok
                    \u00b7 ${fmtAgo(s.last_seen_at || s.started_at)}
                  </div>
                </div>`;
              })}
        </div>
      </div>

      <!-- Center: filter + session info -->
      <div class="cdb-center">
        <div class="cdb-center-head">
          <div>
            <div class="cdb-center-overline">The session</div>
            ${selectedObj
              ? html`<div class="cdb-center-title">
                  <span style="color:${toolColor(selectedObj._tool)}">\u25CF</span>
                  ${' '}${selectedObj._toolLabel}
                  ${' '}
                  <span class="cdb-center-id">${String(selectedObj.session_id || selectedObj.id || '').split(':').pop()}</span>
                </div>`
              : html`<div class="cdb-center-title cdb-center-title--empty">Select a session</div>`}
          </div>
          <div class="cdb-filter-wrap">
            <span class="cdb-filter-icon" aria-hidden="true">\u2315</span>
            <input class="cdb-filter-input" type="text" placeholder="Filter sessions\u2026"
              aria-label="Filter sessions"
              value=${filter} onInput=${e => setFilter(e.target.value)}/>
          </div>
        </div>

        <div class="cdb-center-body">
          ${selectedObj
            ? html`<div class="cdb-session-detail">
                ${[
                  ['Session ID', String(selectedObj.session_id || selectedObj.id || '\u2014')],
                  ['Tool', selectedObj._toolLabel || '\u2014'],
                  ['Active', selectedObj.active !== false ? 'yes' : 'no'],
                  ['Tokens', fmtK(selectedObj.estimated_tokens || selectedObj.tokens || 0)],
                  ['Workspace', selectedObj.workspace || selectedObj.project || '\u2014'],
                ].map(([k, v]) => html`<div key=${k} class="cdb-kv">
                  <span class="cdb-kv-key">${k}</span>
                  <span class="cdb-kv-val">${v}</span>
                </div>`)}
                <div class="cdb-center-note">
                  Full event timeline available in the Session Explorer tab.
                </div>
              </div>`
            : html`<div class="cdb-empty-center">
                <div class="cdb-empty-center-label">No session selected</div>
                <div>Choose a session in the left pane.</div>
              </div>`}
        </div>
      </div>

      <!-- Right: inspector -->
      <div class="cdb-right">
        <${SessionInspector}
          session=${selectedObj}
          toolLabel=${selectedObj?._toolLabel}
        />
      </div>
    </div>
  </div>`;
}
