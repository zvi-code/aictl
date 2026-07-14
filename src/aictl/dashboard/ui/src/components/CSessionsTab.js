import { useState, useEffect, useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, fmtDurSec, toolColor } from '../utils.js';
import { ToolIcon } from './ui/index.js';
import { dedupeSessions } from '../selectors.js';
import * as api from '../api.js';

function sessionTitle(s) {
  if (s.project) {
    const parts = s.project.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts.slice(-2).join('/');
  }
  return String(s.session_id).split(':').slice(-1)[0] || s.session_id;
}

function sessionStatus(s) {
  return s.ended_at ? 'done' : 'live';
}

function sessionTokens(s) {
  return (s.exact_input_tokens || s.input_tokens || 0)
       + (s.exact_output_tokens || s.output_tokens || 0);
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const prefix = d.toDateString() === yest.toDateString() ? 'Yesterday ' : '';
  return prefix + d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Status badge ────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'live')
    return html`<span class="csessions-status csessions-status--live">● Live</span>`;
  if (status === 'error')
    return html`<span class="csessions-status csessions-status--error">Err</span>`;
  return html`<span class="csessions-status csessions-status--done">Done</span>`;
}

// ─── Detail pane ─────────────────────────────────────────────────
function SessionDetailPane({ session, onInspect }) {
  if (!session) {
    return html`<div class="csessions-detail-empty">
      <div class="csessions-detail-empty-label">No session selected</div>
      <div>Click a row to view details.</div>
    </div>`;
  }
  const color = toolColor(session.tool);
  const tokens = sessionTokens(session);
  const inTok  = session.exact_input_tokens  || session.input_tokens  || 0;
  const outTok = session.exact_output_tokens || session.output_tokens || 0;
  const dur = session.duration_s
    || (session.ended_at && session.started_at ? session.ended_at - session.started_at : 0);
  const stats = [
    ['Tokens',   fmtK(tokens)],
    ['In / Out', `${fmtK(inTok)} / ${fmtK(outTok)}`],
    ['Files',    session.files_modified || '—'],
    ['Duration', dur >= 1 ? fmtDurSec(dur) : '\u2014'],
    ['Status',   sessionStatus(session)],
    ['Started',  fmtDate(session.started_at)],
  ];
  const shortId = String(session.session_id).split(':').slice(-1)[0] || session.session_id;
  return html`<div class="csessions-detail-view">
    <div class="csessions-detail-overline">Session · ${fmtDate(session.started_at)}</div>
    <div class="csessions-detail-title">${sessionTitle(session)}</div>
    <div class="csessions-detail-agent">
      <${ToolIcon} tool=${session.tool} size="1em"/>
      <span class="csessions-agent-label">${session.tool}</span>
      ${session.git_branch && html`<span class="csessions-git-badge">⎇ ${session.git_branch}</span>`}
    </div>
    <div class="csessions-detail-rule">
      <div></div><span>Summary</span><div></div>
    </div>
    <div class="csessions-stats-grid">
      ${stats.map(([k, v]) => html`<div key=${k} class="csessions-stat">
        <div class="csessions-stat-label">${k}</div>
        <div class="csessions-stat-value">${v}</div>
      </div>`)}
    </div>
    <div class="csessions-detail-id" title=${session.session_id}>${shortId}</div>
    <div class="csessions-detail-actions">
      <button class="csessions-btn csessions-btn--primary"
        onClick=${() => onInspect?.(session.session_id, session.tool)}>
        Inspect session →</button>
    </div>
  </div>`;
}

// ─── CSessionsTab ────────────────────────────────────────────────
export default function CSessionsTab({ onInspect }) {
  const { globalRange, enabledTools } = useContext(SnapContext);

  const [sessions,      setSessions]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [agentFilter,   setAgentFilter]   = useState('all');
  const [sort,          setSort]          = useState('time-desc');
  const [selectedId,    setSelectedId]    = useState(null);

  useEffect(() => {
    setLoading(true);
    const since = globalRange
      ? Math.min(globalRange.since, Date.now() / 1000 - 86400)
      : Date.now() / 1000 - 86400;
    const until = globalRange?.until;
    api.getSessionTimeline(null, { since, until })
      .then(data => {
        const rows = dedupeSessions(data);
        rows.sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
        setSessions(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [globalRange]);

  const toolMatch = t => enabledTools === null || enabledTools.includes(t);

  const agents = useMemo(() => {
    const seen = new Set();
    return sessions
      .filter(s => toolMatch(s.tool) && !seen.has(s.tool) && seen.add(s.tool))
      .map(s => s.tool);
  }, [sessions, enabledTools]);

  const filtered = useMemo(() => {
    let list = sessions.filter(s => toolMatch(s.tool));
    if (statusFilter !== 'all') list = list.filter(s => sessionStatus(s) === statusFilter);
    if (agentFilter  !== 'all') list = list.filter(s => s.tool === agentFilter);
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(s =>
        sessionTitle(s).toLowerCase().includes(q) ||
        s.tool.toLowerCase().includes(q) ||
        String(s.session_id).toLowerCase().includes(q),
      );
    }
    if (sort === 'time-asc')     return [...list].sort((a, b) => (a.started_at || 0) - (b.started_at || 0));
    if (sort === 'tokens-desc')  return [...list].sort((a, b) => sessionTokens(b) - sessionTokens(a));
    if (sort === 'files-desc')   return [...list].sort((a, b) => (b.files_modified || 0) - (a.files_modified || 0));
    return list; // time-desc: already sorted from fetch
  }, [sessions, filter, statusFilter, agentFilter, sort, enabledTools]);

  const selectedSession = selectedId
    ? (filtered.find(s => s.session_id === selectedId) ?? null)
    : null;

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].session_id);
  }, [filtered.length, selectedId]);

  return html`<div class="csessions-shell">
    <div class="csessions-toolbar">
      <div class="csessions-filter-wrap">
        <span class="csessions-filter-icon" aria-hidden="true">⌕</span>
        <input class="csessions-filter-input" type="text"
          placeholder="Search sessions, titles, agents…"
          aria-label="Filter sessions"
          value=${filter}
          onInput=${e => setFilter(e.target.value)}/>
      </div>
      <select class="csessions-select" value=${statusFilter}
        onChange=${e => setStatusFilter(e.target.value)}>
        <option value="all">all status</option>
        <option value="live">live</option>
        <option value="done">done</option>
      </select>
      <select class="csessions-select" value=${agentFilter}
        onChange=${e => setAgentFilter(e.target.value)}>
        <option value="all">all agents</option>
        ${agents.map(a => html`<option key=${a} value=${a}>${a}</option>`)}
      </select>
      <span style="flex:1"></span>
      <select class="csessions-select" value=${sort}
        onChange=${e => setSort(e.target.value)}>
        <option value="time-desc">newest first</option>
        <option value="time-asc">oldest first</option>
        <option value="tokens-desc">most tokens</option>
        <option value="files-desc">most files</option>
      </select>
      <span class="csessions-toolbar-count">${filtered.length} sessions</span>
    </div>

    <div class="csessions-body">
      <div class="csessions-table-wrap">
        ${loading
          ? html`<div class="csessions-loading">Loading sessions…</div>`
          : filtered.length === 0
            ? html`<div class="csessions-empty">No sessions match the current filter.</div>`
            : html`<div class="csessions-table">
                <div class="csessions-thead">
                  <div class="csessions-th">When</div>
                  <div class="csessions-th">Status</div>
                  <div class="csessions-th">Title</div>
                  <div class="csessions-th">Agent</div>
                  <div class="csessions-th csessions-th--r">Tokens</div>
                  <div class="csessions-th csessions-th--r">Files</div>
                  <div class="csessions-th csessions-th--r">Duration</div>
                </div>
                ${filtered.map(s => {
                  const isSel  = s.session_id === selectedId;
                  const color  = toolColor(s.tool);
                  const status = sessionStatus(s);
                  const dur    = s.duration_s
                    || (s.ended_at && s.started_at ? s.ended_at - s.started_at : 0);
                  return html`<div key=${s.session_id}
                    class=${'csessions-row' + (isSel ? ' is-selected' : '')}
                    onClick=${() => setSelectedId(s.session_id)}
                    role="row" tabIndex=${0}
                    onKeyDown=${e => e.key === 'Enter' && setSelectedId(s.session_id)}>
                    <div class="csessions-cell-time">${fmtDate(s.started_at)}</div>
                    <div><${StatusBadge} status=${status}/></div>
                    <div class="csessions-cell-title">${sessionTitle(s)}</div>
                    <div class="csessions-col-agent">
                      <${ToolIcon} tool=${s.tool} size="0.85em"/>
                      <span class="csessions-cell-agent">${s.tool}</span>
                    </div>
                    <div class="csessions-cell-num">${fmtK(sessionTokens(s))}</div>
                    <div class="csessions-cell-num">${s.files_modified || '—'}</div>
                    <div class="csessions-cell-num">${dur >= 1 ? fmtDurSec(dur) : '\u2014'}</div>
                  </div>`;
                })}
              </div>`}
      </div>

      <div class="csessions-detail-pane">
        <${SessionDetailPane} session=${selectedSession} onInspect=${onInspect}/>
      </div>
    </div>
  </div>`;
}
