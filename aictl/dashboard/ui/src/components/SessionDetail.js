import { useState, useEffect, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, fmtSz, fmtPct, fmtRate, esc, fmtAgo, COLORS } from '../utils.js';
import TeamTree, { TaskBoard } from './TeamTree.js';
import * as api from '../api.js';

// ─── Duration formatting ──────────────────────────────────────
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

// ─── Collapsible Panel ──────────────────────────────────────────
function Panel({title, icon, badge, defaultOpen, children}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return html`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${() => setOpen(v => !v)}
      aria-expanded=${open}>
      <span class="sd-panel-icon">${icon}</span>
      <span class="sd-panel-title">${title}</span>
      ${badge != null && html`<span class="badge text-xs" style="margin-left:var(--sp-2)">${badge}</span>`}
      <span class="sd-panel-arrow">${open ? '\u25B2' : '\u25BC'}</span>
    </button>
    ${open && html`<div class="sd-panel-body">${children}</div>`}
  </div>`;
}

// ─── 1.2 Actions Panel ─────────────────────────────────────────
function ActionsPanel({sessionId}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    const since = Math.floor(Date.now() / 1000) - 86400;
    api.getEvents({ sessionId, limit: 200, since })
      .then(data => { setEvents(data.reverse()); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) return html`<p class="loading-state">Loading events...</p>`;
  if (!events.length) return html`<p class="empty-state">No events recorded for this session.</p>`;

  const KIND_COLOR = {
    tool_call: 'var(--accent)', file_modified: 'var(--green)',
    error: 'var(--red)', anomaly: 'var(--orange)',
    session_start: 'var(--blue)', session_end: 'var(--fg3)',
  };

  return html`<div class="sd-events">
    ${events.map((ev, i) => {
      const c = KIND_COLOR[ev.kind] || 'var(--fg3)';
      const detail = ev.detail || {};
      const desc = detail.path || detail.name || detail.tool_name || ev.kind;
      return html`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${fmtAgo(ev.ts)}</span>
        <span class="sd-event-dot" style="background:${c}"></span>
        <span class="sd-event-kind">${ev.kind}</span>
        <span class="sd-event-desc mono text-muted">${esc(String(desc))}</span>
      </div>`;
    })}
  </div>`;
}

// ─── Context capacity constants ──────────────────────────────
const MODEL_WINDOWS = {
  'claude-opus-4-6': 1000000, 'claude-sonnet-4.6': 1000000,
  'claude-sonnet-4': 200000, 'claude-haiku-4.5': 200000,
  'gpt-5.4': 200000, 'gpt-5': 128000,
};
// Known base overhead components (approximate)
const BASE_COMPONENTS = [
  {name: 'System prompt', tokens: 4200, color: 'var(--accent)'},
  {name: 'Environment info', tokens: 280, color: 'var(--fg2)'},
];
const COMPACTION_PCT = 95;

// ─── 1.3 Context Panel (with utilization breakdown) ───────────
function ContextPanel({session}) {
  const {snap: s} = useContext(SnapContext);
  const filesLoaded = session.files_loaded || [];

  // Estimate context capacity from model
  const model = (s?.tool_configs || []).map(c => c.model).filter(Boolean)[0] || '';
  const capacity = MODEL_WINDOWS[model] || 200000;

  // Build context budget breakdown
  const memEntries = (s && s.agent_memory) || [];
  const memTokens = memEntries.reduce((a, m) => a + (m.tokens || 0), 0);
  const fileTokens = filesLoaded.length * 150; // rough estimate per loaded file
  const baseOverhead = BASE_COMPONENTS.reduce((a, c) => a + c.tokens, 0);
  const totalEstimated = baseOverhead + memTokens + fileTokens;
  const fillPct = Math.min((totalEstimated / capacity) * 100, 100);
  const compactionLine = COMPACTION_PCT;

  const segments = [
    ...BASE_COMPONENTS,
    {name: 'Memory', tokens: memTokens, color: 'var(--cat-memory, var(--orange))'},
    {name: 'Loaded files', tokens: fileTokens, color: 'var(--green)'},
  ].filter(s => s.tokens > 0);

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${filesLoaded.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${fmtK(totalEstimated)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${fmtK(capacity)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${
        fillPct > 80 ? 'var(--orange)' : fillPct > 50 ? 'var(--yellow)' : 'var(--green)'
      }">${fmtPct(fillPct)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${segments.map(seg => {
            const pct = (seg.tokens / capacity * 100).toFixed(1);
            return html`<div key=${seg.name} style="width:${pct}%;background:${seg.color};min-width:${seg.tokens > 0 ? '1px' : '0'}"
              title="${seg.name}: ~${fmtK(seg.tokens)} tokens"></div>`;
          })}
        </div>
        <div style="position:absolute;left:${compactionLine}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${compactionLine}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${segments.map(seg => html`<span key=${seg.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${seg.color};margin-right:2px"></span>
          ${seg.name} ${fmtK(seg.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${compactionLine}%</span>
      </div>
    </div>

    ${filesLoaded.length > 0 && html`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${filesLoaded.map(f => html`<div key=${f} class="text-muted" style="padding:2px 0">${esc(f)}</div>`)}
    </div>`}
    ${!filesLoaded.length && html`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`;
}

// ─── 1.4 Memory Panel ──────────────────────────────────────────
function MemoryPanel({session}) {
  const {snap: s} = useContext(SnapContext);
  const memories = (s && s.agent_memory) || [];

  // Filter memories to those relevant to the session's project
  const project = session.project || '';
  const relevant = project
    ? memories.filter(m => {
        const mProject = m.project || m.tool || '';
        return !project || mProject.includes(project.replace(/\\/g,'/').split('/').pop());
      })
    : memories;

  if (!relevant.length) {
    return html`<p class="empty-state">No memory entries found${project ? ' for this project' : ''}.</p>`;
  }

  return html`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${relevant.map((m, i) => html`<${MemoryEntryRow} key=${i} mem=${m}/>`)}
  </div>`;
}

function MemoryEntryRow({mem: m}) {
  const [expanded, setExpanded] = useState(false);
  const name = m.name || (m.file || '').replace(/\\\\/g,'/').split('/').pop() || 'entry';
  const preview = (m.content || '').slice(0, 300);
  return html`<div class="sd-memory-entry" style="cursor:pointer" onClick=${() => setExpanded(!expanded)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${m.type || m.source || 'file'}</span>
      <strong title=${m.file || m.path || ''}>${esc(name)}</strong>
      ${m.tokens ? html`<span class="text-muted">${fmtK(m.tokens)} tok</span>` : null}
      ${m.lines ? html`<span class="text-muted">${m.lines}ln</span>` : null}
      ${m.profile ? html`<span class="text-muted">${esc(m.profile)}</span>` : null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${expanded ? '\u25B2' : '\u25BC'}</span>
    </div>
    ${expanded && preview ? html`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${esc(m.content)}${m.content && m.content.length > 300 ? '' : ''}</pre>` : null}
  </div>`;
}

// ─── Rate limit gauge ─────────────────────────────────────────
function RateLimitGauge({rateLimits}) {
  if (!rateLimits || !Object.keys(rateLimits).length) return null;
  return html`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(rateLimits).map(([window, data]) => {
        const pct = data.used_pct || data.used_percentage || 0;
        const color = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--orange)' : 'var(--green)';
        const resets = data.resets_at || '';
        return html`<div key=${window} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${window} window</span>
            <span style="color:${color};font-weight:600">${fmtPct(pct)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(pct, 100)}%;background:${color};border-radius:4px"></div>
          </div>
          ${resets && html`<div class="text-xs text-muted" style="margin-top:2px">resets ${resets}</div>`}
        </div>`;
      })}
    </div>
  </div>`;
}

// ─── 1.5 Resources Panel (with 5.1 session comparison) ─────────
function ResourcesPanel({session}) {
  const inTok = session.exact_input_tokens || 0;
  const outTok = session.exact_output_tokens || 0;
  const [avgData, setAvgData] = useState(null);

  // 5.1: Fetch historical sessions for comparison
  useEffect(() => {
    if (!session.tool) return;
    api.getSessions({ tool: session.tool, active: false, limit: 20 })
      .then(data => {
        if (data.length > 1) {
          const durations = data.filter(s => s.duration_s > 0).map(s => s.duration_s);
          const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
          setAvgData({ avgDuration: avgDur, sampleCount: data.length });
        }
      })
      .catch(() => {});
  }, [session.tool]);

  const curDur = session.duration_s || 0;
  const ratio = avgData && avgData.avgDuration > 0 ? curDur / avgData.avgDuration : null;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${fmtK(inTok)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${fmtK(outTok)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${fmtK(inTok + outTok)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${fmtPct(session.cpu_percent || 0)}</div></div>
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${fmtPct(session.peak_cpu_percent || 0)}</div></div>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Inbound</div><div class="value">${fmtSz(session.inbound_bytes || 0)}</div></div>
      <div class="es-kv-card"><div class="label">Outbound</div><div class="value">${fmtSz(session.outbound_bytes || 0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${fmtSz(session.state_bytes_written || 0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(session.pids) ? session.pids.length : (session.pids || 0)}</div></div>
    </div>
    ${ratio != null && html`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${avgData.sampleCount} sessions):
      duration ${ratio > 1.2 ? html`<span class="text-orange">${(ratio).toFixed(1)}x longer</span>`
        : ratio < 0.8 ? html`<span class="text-green">${(1/ratio).toFixed(1)}x shorter</span>`
        : html`<span>similar</span>`}
    </div>`}
    ${session.entity_state && html`<${RateLimitGauge} rateLimits=${session.entity_state.rate_limits}/>`}
  </div>`;
}

// ─── 5.2 Project Cost Panel ───────────────────────────────────
function ProjectCostPanel({project}) {
  const [costs, setCosts] = useState(null);

  useEffect(() => {
    if (!project) return;
    api.getProjectCosts(7)
      .then(data => {
        const match = data.find(p => p.project === project);
        setCosts(match || null);
      })
      .catch(() => {});
  }, [project]);

  if (!costs) return html`<p class="empty-state">No cost data available for this project.</p>`;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${costs.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${fmtK(costs.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${fmtK(costs.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${costs.cost_usd.toFixed(2)}</div></div>
    </div>
    ${costs.daily && costs.daily.length > 0 && html`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${costs.daily.map(d => {
        const total = d.input_tokens + d.output_tokens;
        const maxTok = Math.max(...costs.daily.map(dd => dd.input_tokens + dd.output_tokens), 1);
        const pct = (total / maxTok * 100).toFixed(1);
        const lbl = new Date(d.date + 'T12:00:00').toLocaleDateString([], {weekday: 'short', month: 'numeric', day: 'numeric'});
        return html`<div key=${d.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${lbl}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${pct}%;background:var(--green);border-radius:3px"
              title="${fmtK(total)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${fmtK(total)}</span>
        </div>`;
      })}
    </div>`}
  </div>`;
}

// ─── 5.4 Session Run History Panel ─────────────────────────────
function RunHistoryPanel({project, tool}) {
  const [runs, setRuns] = useState(null);

  useEffect(() => {
    if (!project || !tool) return;
    api.getSessionRuns(project, tool, 30, 20)
      .then(setRuns)
      .catch(() => setRuns([]));
  }, [project, tool]);

  if (!runs || runs.length < 2) return html`<p class="empty-state">Not enough session history for trend analysis.</p>`;

  const maxTok = Math.max(...runs.map(r => r.total_tokens), 1);
  const avgDur = runs.reduce((s, r) => s + r.duration_s, 0) / runs.length;
  const avgTok = runs.reduce((s, r) => s + r.total_tokens, 0) / runs.length;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${runs.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${fmtDur(avgDur)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${fmtK(avgTok)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${runs.map(r => {
        const pct = (r.total_tokens / maxTok * 100).toFixed(1);
        const date = new Date(r.ts * 1000).toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        const durRatio = avgDur > 0 ? r.duration_s / avgDur : 1;
        return html`<div key=${r.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${date}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${pct}%;border-radius:3px;background:${
              durRatio > 1.5 ? 'var(--orange)' : durRatio < 0.7 ? 'var(--green)' : 'var(--accent)'
            }" title="${fmtK(r.total_tokens)} tok, ${fmtDur(r.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${fmtK(r.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${fmtDur(r.duration_s)}</span>
        </div>`;
      })}
    </div>
  </div>`;
}

// ─── API Calls Panel (OTel-sourced) ──────────────────────────────
function ApiCallsPanel({sessionId}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const since = Math.floor(Date.now() / 1000) - 3600;
    api.getApiCalls(since, 100)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) return html`<p class="loading-state">Loading API call data...</p>`;
  if (!data || !data.calls || !data.calls.length) {
    return html`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;
  }

  const {calls, summary} = data;

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">API Calls</div><div class="value">${summary.total_calls}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${summary.total_errors > 0 ? 'var(--red)' : 'var(--fg)'}">${summary.total_errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Avg Latency</div><div class="value">${summary.avg_latency_ms}ms</div></div>
      <div class="es-kv-card"><div class="label">P95 Latency</div><div class="value">${summary.p95_latency_ms}ms</div></div>
    </div>
    ${summary.by_model && Object.keys(summary.by_model).length > 0 && html`
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By model</div>
      <div class="flex-row gap-sm flex-wrap" style="margin-bottom:var(--sp-3)">
        ${Object.entries(summary.by_model).map(([model, count]) => html`
          <span key=${model} class="badge text-xs">${model}: ${count}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${calls.slice(0, 30).map((c, i) => {
        const isErr = c.status === 'error';
        const date = new Date(c.ts * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
        return html`<div key=${i} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${date}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${isErr ? 'var(--red)' : 'var(--green)'}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${c.model || '\u2014'}</span>
          ${!isErr && html`<span style="width:50px;flex-shrink:0;text-align:right">${c.duration_ms || 0}ms</span>`}
          ${!isErr && html`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${fmtK(c.input_tokens || 0)}in</span>`}
          ${isErr && html`<span style="color:var(--red)">${esc(c.error || 'error')}</span>`}
        </div>`;
      })}
    </div>
  </div>`;
}

// ─── 1.6 Deliverables Panel ────────────────────────────────────
function DeliverablesPanel({session}) {
  const filesTouched = session.files_touched || [];
  const fileEvents = session.file_events || 0;

  if (!filesTouched.length) {
    return html`<p class="empty-state">No file changes recorded.</p>`;
  }

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${filesTouched.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${fmtK(fileEvents)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${filesTouched.map(f => html`<div key=${f} class="text-muted" style="padding:2px 0">${esc(f)}</div>`)}
    </div>
  </div>`;
}

// ─── Main SessionDetail Component (1.1 shell) ──────────────────
export default function SessionDetail({session, onClose}) {
  const c = COLORS[session.tool] || 'var(--fg2)';
  const filesLoaded = session.files_loaded || [];
  const filesTouched = session.files_touched || [];
  const inTok = session.exact_input_tokens || 0;
  const outTok = session.exact_output_tokens || 0;

  // Entity state from hook events (if available)
  const entityState = session.entity_state || null;
  const hasTeam = entityState && entityState.agents && entityState.agents.length > 0;
  const hasTasks = entityState && entityState.tasks && entityState.tasks.length > 0;

  return html`<div class="sd-container" style="border-left:3px solid ${c}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${esc(session.tool)}</strong>
        ${session.project && html`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${session.project}>${esc(session.project.replace(/\\/g,'/').split('/').pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${fmtDur(session.duration_s)}
        </span>
        ${hasTeam && html`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">
          Team (${entityState.agents.length})
        </span>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${session.session_id}>
        ${session.session_id}
      </div>
      ${onClose && html`<button class="sd-close" onClick=${onClose} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${Panel} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${true}>
      <${ActionsPanel} sessionId=${session.session_id}/>
    <//>
    ${hasTeam && html`<${Panel} title="Team" icon="\uD83D\uDC65" badge=${entityState.agents.length + ' agents'} defaultOpen=${true}>
      <${TeamTree} entityState=${entityState}/>
    <//>`}
    ${hasTasks && html`<${Panel} title="Tasks" icon="\uD83D\uDCCB" badge=${entityState.tasks.length} defaultOpen=${true}>
      <${TaskBoard} tasks=${entityState.tasks}/>
    <//>`}
    <${Panel} title="Context" icon="\uD83D\uDCDA" badge=${filesLoaded.length || null}>
      <${ContextPanel} session=${session}/>
    <//>
    <${Panel} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${false}>
      <${MemoryPanel} session=${session}/>
    <//>
    <${Panel} title="Resources" icon="\u2699\uFE0F" badge=${fmtK(inTok + outTok) + ' tok'}>
      <${ResourcesPanel} session=${session}/>
    <//>
    <${Panel} title="Deliverables" icon="\uD83D\uDCE6" badge=${filesTouched.length || null}>
      <${DeliverablesPanel} session=${session}/>
    <//>
    <${Panel} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${false}>
      <${ApiCallsPanel} sessionId=${session.session_id}/>
    <//>
    ${session.project && html`<${Panel} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${false}>
      <${ProjectCostPanel} project=${session.project}/>
    <//>`}
    ${session.project && session.tool && html`<${Panel} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${false}>
      <${RunHistoryPanel} project=${session.project} tool=${session.tool}/>
    <//>`}
  </div>`;
}
