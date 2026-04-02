import { useState, useEffect, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, fmtPct, fmtSz, fmtRate, esc, fmtTime, fmtAgo, COLORS, ICONS } from '../utils.js';
import SessionDetailView from './SessionDetail.js';
import SessionTimeline from './SessionTimeline.js';

// ─── Duration formatting (Xm Ys) ───────────────────────────────
function fmtDur(sec) {
  if(sec == null || isNaN(sec)) return '\u2014';
  const s = Math.round(sec);
  if(s < 60) return s + 's';
  const m = Math.floor(s / 60);
  const r = s % 60;
  if(m < 60) return m + 'm ' + r + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

// ─── Role badge styling ─────────────────────────────────────────
const ROLE_STYLE = {
  lead:       { bg: 'var(--blue)',   label: 'Lead' },
  teammate:   { bg: 'var(--green)',  label: 'Teammate' },
  subagent:   { bg: 'var(--yellow)', label: 'Subagent' },
  subprocess: { bg: 'var(--fg3)',    label: 'Proc' },
};

// ─── Process Tree Node ──────────────────────────────────────────
function ProcessNode({node, depth}) {
  const [open, setOpen] = useState(depth < 2);
  const kids = node.children || [];
  const rs = ROLE_STYLE[node.role] || ROLE_STYLE.subprocess;
  const isAgent = node.role === 'lead' || node.role === 'teammate' || node.role === 'subagent';

  return html`<div style="margin-left:${depth * 14}px">
    <div class="flex-row" style="padding:2px 0;align-items:center;gap:var(--sp-2);min-height:24px">
      ${kids.length > 0
        ? html`<span class="cursor-ptr" onClick=${(e) => {e.stopPropagation(); setOpen(v=>!v);}}
            style="font-size:0.6rem;width:12px;text-align:center;flex-shrink:0">${open ? '\u25BC' : '\u25B6'}</span>`
        : html`<span style="width:12px;flex-shrink:0"></span>`}
      <span class="badge" style="background:${rs.bg};color:var(--bg);font-size:0.55rem;padding:1px 4px;flex-shrink:0">${rs.label}</span>
      <span class="mono" style="font-size:0.7rem;${isAgent ? 'font-weight:600' : ''}">${esc(node.name)}</span>
      <span class="text-muted" style="font-size:0.6rem">PID ${node.pid}</span>
      ${node.cwd && html`<span class="text-muted text-ellipsis" style="font-size:0.55rem;max-width:200px" title=${node.cwd}>${esc(node.cwd)}</span>`}
      <span class="text-muted" style="font-size:0.6rem;margin-left:auto;flex-shrink:0;white-space:nowrap">
        ${node.cpu_pct > 0 ? node.cpu_pct + '% ' : ''}${node.mem_mb > 0 ? node.mem_mb + 'MB' : ''}
      </span>
    </div>
    ${open && kids.map(c => html`<${ProcessNode} key=${c.pid} node=${c} depth=${depth+1}/>`)}
  </div>`;
}

// ─── Count total nodes in tree ──────────────────────────────────
function countNodes(tree) {
  let n = 0;
  for (const node of tree) {
    n += 1 + countNodes(node.children || []);
  }
  return n;
}

// ─── Count agents (lead/teammate/subagent) in tree ──────────────
function countAgents(tree) {
  let n = 0;
  for (const node of tree) {
    if (node.role === 'lead' || node.role === 'teammate' || node.role === 'subagent') n++;
    n += countAgents(node.children || []);
  }
  return n;
}

// ─── Process Tree component ─────────────────────────────────────
function ProcessTree({tree}) {
  if (!tree || !tree.length) return null;
  const total = countNodes(tree);
  const agents = countAgents(tree);
  const hasTeam = agents > 1;

  return html`<div style="margin-top:var(--sp-3)">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-2)">
      <strong class="text-muted" style="font-size:0.75rem">Process Tree</strong>
      <span class="text-muted" style="font-size:0.65rem">(${total} processes${hasTeam ? ', ' + agents + ' agents' : ''})</span>
      ${hasTeam && html`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:0.55rem">Agent Team</span>`}
    </div>
    <div style="font-family:var(--mono);border-left:2px solid var(--border);padding-left:var(--sp-2)">
      ${tree.map(node => html`<${ProcessNode} key=${node.pid} node=${node} depth=${0}/>`)}
    </div>
  </div>`;
}

// ─── Session Detail Panel ─────────────────────────────────────────
function SessionDetail({session}) {
  const pids = Array.isArray(session.pids) ? session.pids : [];
  const workspaces = session.workspaces || [];
  const filesTouched = session.files_touched || [];
  const subprocs = session.subprocess_count || {};
  const tree = session.process_tree || [];

  return html`<div style="padding:var(--sp-4) 0;font-size:0.75rem">
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${fmtPct(session.peak_cpu_percent || 0)}</div></div>
      <div class="es-kv-card"><div class="label">Traffic</div><div class="value">\u2191${fmtSz(session.outbound_bytes||0)} \u2193${fmtSz(session.inbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${fmtSz(session.state_bytes_written||0)}</div></div>
    </div>

    ${workspaces.length > 0 && html`<div style="margin-bottom:var(--sp-3)">
      <strong class="text-muted">Workspaces:</strong>
      <span class="mono" style="margin-left:var(--sp-3);font-size:0.7rem">${workspaces.join(', ')}</span>
    </div>`}

    ${tree.length > 0
      ? html`<${ProcessTree} tree=${tree}/>`
      : pids.length > 0 && html`<details style="margin-bottom:var(--sp-3)">
          <summary class="cursor-ptr text-muted">${pids.length} PIDs</summary>
          <div class="mono text-muted" style="font-size:0.68rem;margin-top:0.2rem">${pids.join(', ')}</div>
        </details>`}

    ${Object.keys(subprocs).length > 0 && tree.length === 0 && html`<details style="margin-bottom:var(--sp-3)">
      <summary class="cursor-ptr text-muted">Subprocesses</summary>
      <div style="font-size:0.68rem;margin-top:0.2rem">
        ${Object.entries(subprocs).map(([name, count]) =>
          html`<span class="pill mono" key=${name} style="margin:0.1rem">${esc(name)}: ${count}</span>`
        )}
      </div>
    </details>`}

    ${filesTouched.length > 0 && html`<details>
      <summary class="cursor-ptr text-muted">${filesTouched.length} files touched</summary>
      <div class="mono text-xs" style="margin-top:0.2rem;max-height:8rem;overflow-y:auto">
        ${filesTouched.map(f => html`<div key=${f} class="text-muted" style="padding:0.05rem 0">${esc(f)}</div>`)}
      </div>
    </details>`}
  </div>`;
}

// ─── Session Card (active session, clickable) ───────────────────
function SessionCard({session, onSelect, isSelected, agentTeams}) {
  const c = COLORS[session.tool] || 'var(--fg2)';
  const icon = ICONS[session.tool] || '\u{1F539}';
  // File-based agent count (authoritative), fall back to process tree
  const teamData = (agentTeams || []).find(t => t.session_id === session.session_id);
  const agents = teamData ? teamData.agent_count : countAgents(session.process_tree || []);
  const hasTeam = agents > 1;

  return html`<div class="diag-card" style="border-left:3px solid ${c};cursor:pointer;${isSelected ? 'outline:2px solid var(--accent);outline-offset:-2px' : ''}"
    onClick=${() => onSelect(session)}>
    <div class="flex-row gap-sm mb-sm">
      <span style="font-size:var(--fs-2xl)">${icon}</span>
      <strong style="font-size:var(--fs-lg)">${esc(session.tool)}</strong>
      ${hasTeam && html`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">Team (${agents})</span>`}
      ${session.project && html`<span class="text-muted text-xs mono text-ellipsis" style="max-width:150px"
        title=${session.project}>${esc(session.project.replace(/\\/g,'/').split('/').pop())}</span>`}
      <span class="badge" style="margin-left:auto;background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${fmtDur(session.duration_s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${fmtPct(session.cpu_percent || 0)}</div></div>
      <div class="es-kv-card"><div class="label">Input Tok</div><div class="value">${fmtK(session.exact_input_tokens || 0)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tok</div><div class="value">${fmtK(session.exact_output_tokens || 0)}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${fmtK(session.file_events || 0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(session.pids) ? session.pids.length : (session.pids || 0)}</div></div>
    </div>
    <div class="text-muted text-xs text-mono text-ellipsis" style="margin-top:var(--sp-3)"
      title=${session.session_id}>
      ${session.session_id}
    </div>
  </div>`;
}

// ─── Agent Teams Summary (file-based from subagent JSONL) ──────
function AgentTeamsSummary() {
  const {snap: s} = useContext(SnapContext);
  const teams = (s && s.agent_teams) || [];
  if (!teams.length) return null;

  const totalAgents = teams.reduce((n, t) => n + t.agent_count, 0);
  const totalIn = teams.reduce((n, t) => n + (t.total_input_tokens || 0), 0);
  const totalOut = teams.reduce((n, t) => n + (t.total_output_tokens || 0), 0);

  return html`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${teams.length} sessions</span>
      <span class="badge">${totalAgents} agents</span>
      <span class="badge">${fmtK(totalIn + totalOut)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${teams.sort((a, b) => (b.total_input_tokens || 0) - (a.total_input_tokens || 0)).slice(0, 8).map(team => html`
        <${AgentTeamCard} key=${team.session_id} team=${team}/>
      `)}
    </div>
  </div>`;
}

function _shortModel(m) { return m ? m.replace('claude-','').replace('-20251001','') : '?'; }

function AgentTeamCard({team}) {
  const [expanded, setExpanded] = useState(false);
  const [agents, setAgents] = useState(team.agents || null);
  const [loading, setLoading] = useState(false);
  const models = team.models || {};

  // Lazy-load full agent detail on first expand
  useEffect(() => {
    if (!expanded || agents) return;
    setLoading(true);
    fetch('/api/agent-teams?session_id=' + encodeURIComponent(team.session_id))
      .then(r => r.json())
      .then(data => { setAgents(data.agents || []); setLoading(false); })
      .catch(() => { setAgents([]); setLoading(false); });
  }, [expanded]);

  const real = (agents || []).filter(a => (a.input_tokens || 0) + (a.output_tokens || 0) > 50);
  const warmup = (agents || []).length - real.length;
  const sorted = real.sort((a, b) => (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens));
  const maxTok = sorted[0] ? (sorted[0].input_tokens || 0) + (sorted[0].output_tokens || 0) : 1;

  return html`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${() => setExpanded(!expanded)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${team.agent_count || real.length} agents${warmup ? html` <span style="opacity:0.6">+${warmup}w</span>` : null}</span>
      <span class="text-muted text-xs">${fmtK(team.total_input_tokens || 0)}in / ${fmtK(team.total_output_tokens || 0)}out</span>
      ${(team.tools_used || []).length > 0 && html`<span class="text-muted text-xs">${team.tools_used.join(', ')}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${team.session_id}>${team.session_id.slice(0, 12)}\u2026</span>
      <span class="text-xs text-muted">${expanded ? '\u25B2' : '\u25BC'}</span>
    </div>
    <!-- Agent rows: show loading, or compact agent rows with task + tokens -->
    ${loading ? html`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading agents\u2026</div>`
    : html`<div style="display:flex;flex-direction:column;gap:1px">
      ${sorted.slice(0, expanded ? 999 : 5).map(a => {
        const tok = (a.input_tokens || 0) + (a.output_tokens || 0);
        const pct = Math.max(1, tok / maxTok * 100);
        return html`<div key=${a.agent_id} style="display:grid;
          grid-template-columns:2px 1fr minmax(60px,auto) minmax(50px,auto) 14px;
          gap:var(--sp-2);align-items:center;padding:2px var(--sp-2);font-size:var(--fs-xs);
          background:var(--bg);border-radius:2px">
          <div style="width:2px;height:100%;background:${a.is_sidechain ? 'var(--yellow)' : 'var(--green)'}"></div>
          <div class="text-ellipsis" title=${a.task || a.slug || a.agent_id}
            style="color:${a.task ? 'var(--fg)' : 'var(--fg2)'}">${a.task || a.slug || a.agent_id.slice(0, 10)}</div>
          <div style="display:flex;align-items:center;gap:var(--sp-1)">
            <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;min-width:30px">
              <div style="height:100%;width:${pct}%;background:${a.is_sidechain ? 'var(--yellow)' : 'var(--green)'};border-radius:2px;opacity:0.7"></div>
            </div>
            <span class="text-muted" style="font-size:var(--fs-2xs);white-space:nowrap">${fmtK(tok)}</span>
          </div>
          <span class="text-muted" style="font-size:var(--fs-2xs)">${_shortModel(a.model)}</span>
          ${a.completed ? html`<span class="text-green">\u2713</span>` : html`<span class="text-orange">\u25CB</span>`}
        </div>`;
      })}
      ${!expanded && sorted.length > 5 ? html`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${(e) => { e.stopPropagation(); setExpanded(true); }}>+${sorted.length - 5} more agents\u2026</div>` : null}
    </div>`}
  </div>`;
}

// ─── Main TabSessions component ─────────────────────────────────
export default function TabSessions() {
  const {snap: s, globalRange, rangeSeconds, enabledTools} = useContext(SnapContext);
  const [history, setHistory] = useState([]);
  const [histError, setHistError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [externalSession, setExternalSession] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    setLoading(true);
    setHistError(false);
    fetch('/api/sessions?active=false')
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false); })
      .catch(() => { setHistError(true); setLoading(false); });
  }, []);

  // Fetch session timeline using global range
  useEffect(() => {
    if (!globalRange) return;
    const since = Math.min(globalRange.since, Date.now()/1000 - 86400);
    let url = '/api/session-timeline?since=' + since;
    if (globalRange.until != null) url += '&until=' + globalRange.until;
    fetch(url).then(r => r.json()).then(setTimeline).catch(() => setTimeline([]));
  }, [globalRange]);

  // Listen for session selection from the timeline bar
  useEffect(() => {
    const handler = (e) => {
      const sess = e.detail;
      if (sess && sess.session_id) {
        setSelectedId(sess.session_id);
        setExternalSession(sess);
      }
    };
    window.addEventListener('aictl-session-select', handler);
    return () => window.removeEventListener('aictl-session-select', handler);
  }, []);

  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);
  const activeSessions = ((s && s.sessions) || []).filter(sess => toolMatch(sess.tool));
  const filteredHistory = history.filter(sess => toolMatch(sess.tool));
  const filteredTimeline = timeline.filter(sess => toolMatch(sess.tool));
  // Find session in active list, or build a minimal object from timeline/history data
  let selectedSession = activeSessions.find(sess => sess.session_id === selectedId);
  if (!selectedSession && selectedId) {
    // Try history
    const fromHistory = history.find(h => h.session_id === selectedId);
    // Try external (from timeline click)
    const src = fromHistory || externalSession;
    if (src && src.session_id === selectedId) {
      selectedSession = {
        session_id: src.session_id,
        tool: src.tool,
        project: src.project || '',
        duration_s: src.duration_s || 0,
        active: src.active || false,
        started_at: src.started_at,
        ended_at: src.ended_at,
        files_touched: [],
        files_loaded: [],
        exact_input_tokens: src.input_tokens || 0,
        exact_output_tokens: src.output_tokens || 0,
        pids: [],
        file_events: src.files_modified || 0,
      };
    }
  }

  const handleSelect = (session) => {
    setSelectedId(prev => prev === session.session_id ? null : session.session_id);
  };

  // Group sessions by project
  const byProject = {};
  for (const sess of activeSessions) {
    const proj = sess.project || 'Unknown Project';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(sess);
  }
  const projects = Object.keys(byProject).sort();

  const handleTimelineSelect = (sess) => {
    setSelectedId(sess.session_id);
    setExternalSession(sess);
  };

  return html`<div>
    <div class="mb-lg">
      <${SessionTimeline} sessions=${filteredTimeline} rangeSeconds=${rangeSeconds}
        onSelect=${handleTimelineSelect}/>
    </div>

    <${AgentTeamsSummary}/>

    ${selectedSession && html`<${SessionDetailView} session=${selectedSession}
      onClose=${() => setSelectedId(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${activeSessions.length})</div>
      ${activeSessions.length
        ? projects.length > 1
          ? projects.map(proj => html`<div key=${proj} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${esc(proj.replace(/\\/g,'/').split('/').pop() || proj)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${byProject[proj].length} session${byProject[proj].length > 1 ? 's' : ''}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${byProject[proj].map(sess => html`<${SessionCard} key=${sess.session_id} session=${sess}
                  onSelect=${handleSelect} isSelected=${sess.session_id === selectedId} agentTeams=${s?.agent_teams}/>`)}
              </div>
            </div>`)
          : html`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${activeSessions.map(sess => html`<${SessionCard} key=${sess.session_id} session=${sess}
                onSelect=${handleSelect} isSelected=${sess.session_id === selectedId}/>`)}
            </div>`
        : html`<div class="empty-state">
            <p>No active sessions.</p>
            ${filteredHistory.length > 0 && html`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${COLORS[filteredHistory[0].tool] || 'var(--fg2)'}">${ICONS[filteredHistory[0].tool] || '\u{1F539}'}</span>
                <strong>${esc(filteredHistory[0].tool)}</strong>
                <span class="text-muted text-xs">${fmtDur(filteredHistory[0].duration_s)}</span>
                ${filteredHistory[0].ended_at && html`<span class="text-muted text-xs">${fmtAgo(filteredHistory[0].ended_at)}</span>`}
              </div>
            </div>`}
          </div>`}
    </div>

    <div class="es-section" style="margin-top:var(--sp-8)">
      <div class="es-section-title">Session History</div>
      ${loading
        ? html`<p class="loading-state">Loading...</p>`
        : histError
          ? html`<p class="error-state">Failed to load session history.</p>`
          : !filteredHistory.length
            ? html`<p class="empty-state">No past sessions recorded.</p>`
            : html`<table role="table" aria-label="Session history" class="text-sm">
                <thead><tr>
                  <th>Tool</th>
                  <th>Session ID</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>${filteredHistory.map(h => {
                  const c = COLORS[h.tool] || 'var(--fg2)';
                  const icon = ICONS[h.tool] || '\u{1F539}';
                  const shortId = h.session_id
                    ? h.session_id.length > 12
                      ? h.session_id.slice(0, 12) + '\u2026'
                      : h.session_id
                    : '\u2014';
                  return html`<tr key=${h.session_id} style="cursor:pointer;${h.session_id === selectedId ? 'background:var(--bg2)' : ''}"
                    onClick=${() => { setSelectedId(h.session_id === selectedId ? null : h.session_id); setExternalSession(null); }}>
                    <td>
                      <span style="color:${c};margin-right:var(--sp-2)">${icon}</span>
                      ${esc(h.tool)}
                    </td>
                    <td><span class="mono" title=${h.session_id} style="font-size:0.7rem">${shortId}</span></td>
                    <td>${fmtDur(h.duration_s)}</td>
                    <td>${h.active
                      ? html`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`
                      : html`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${h.ended_at ? fmtAgo(h.ended_at) : '\u2014'}</td>
                  </tr>`;
                })}</tbody>
              </table>`}
    </div>
  </div>`;
}
