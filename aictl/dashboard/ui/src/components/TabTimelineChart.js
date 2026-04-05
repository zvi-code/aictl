/**
 * TabTimelineChart — horizontal bar-chart view of a session's activity over time.
 *
 * Bars flow left-to-right and wrap to the next row when they reach
 * the container edge.  Empty time gaps are collapsed to a single
 * gap-marker with timestamps.  Each bar is colored by entity name.
 */
import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, esc, COLORS, ICONS } from '../utils.js';
import * as api from '../api.js';

// ─── Entity colour palette (matches SessionFlow sfColor) ──────
const _PALETTE = [
  '#f97316','#a78bfa','#60a5fa','#f472b6',
  '#34d399','#fbbf24','#06b6d4','#84cc16',
  '#e11d48','#0ea5e9','#c084fc','#fb923c',
];
const _FIXED = {
  Bash: '#6b7280', Read: '#60a5fa', Edit: '#34d399', Write: '#22d3ee',
  Grep: '#fbbf24', Glob: '#a78bfa', Agent: '#f472b6',
  Prompt: 'var(--green)', Compaction: 'var(--yellow)', Error: 'var(--red)',
};
function entityColor(name) {
  if (!name) return 'var(--fg2)';
  if (_FIXED[name]) return _FIXED[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return _PALETTE[h % _PALETTE.length];
}

// ─── Helpers ───────────────────────────────────────────────────
function fmtHHMM(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDateHHMM(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDurMs(ms) {
  if (!ms) return '';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}
function fmtDurSec(s) {
  if (!s || s <= 0) return '0s';
  if (s < 60) return Math.round(s) + 's';
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  if (s < 3600) return m + 'm' + (sec ? ' ' + sec + 's' : '');
  const h = Math.floor(m / 60), rm = m % 60;
  return h + 'h' + (rm ? ' ' + rm + 'm' : '');
}
function fmtGap(sec) {
  if (sec < 60) return Math.round(sec) + 's';
  if (sec < 3600) return Math.round(sec / 60) + 'm';
  if (sec < 86400) return (sec / 3600).toFixed(1) + 'h';
  return (sec / 86400).toFixed(1) + 'd';
}
function shortSid(sid) {
  if (!sid) return '';
  const parts = sid.split(':');
  if (parts.length === 3 && /^\d+$/.test(parts[1])) return parts[1];
  return sid.slice(-6);
}

function turnTokens(t) {
  const tok = t.tokens || {};
  return (tok.input || 0) + (tok.output || 0) + (tok.cache_read || 0) + (tok.cache_creation || 0);
}

function barEntity(t) {
  if (t.type === 'user_message') return 'Prompt';
  if (t.type === 'api_call' || t.type === 'api_response') return t.model || 'API';
  if (t.type === 'tool_use') return t.to || t.name || 'Tool';
  if (t.type === 'subagent') return t.to || 'Agent';
  if (t.type === 'compaction') return 'Compaction';
  if (t.type === 'error') return 'Error';
  if (t.type === 'hook') return t.hook_name || 'Hook';
  return t.type || '?';
}

// ─── Tool/Session pickers ─────────────────────────────────────
function ToolTabs({tools, activeTool, onSelect}) {
  if (tools.length <= 1) return null;
  return html`<div class="sf-tool-tabs">
    ${tools.map(t => html`<button key=${t} class="sf-tool-tab ${t === activeTool ? 'active' : ''}"
      style="border-bottom-color:${t === activeTool ? (COLORS[t] || 'var(--accent)') : 'transparent'};color:${COLORS[t] || 'var(--fg)'}"
      onClick=${() => onSelect(t)}>
      <span>${ICONS[t] || '\u{1F539}'}</span> ${esc(t)}
    </button>`)}
  </div>`;
}

function SessionTabs({sessions, activeId, onSelect, loading}) {
  if (loading) return html`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`;
  if (!sessions.length) return html`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`;
  return html`<div class="sf-sess-tabs">
    ${sessions.map(s => {
      const tok = (s.exact_input_tokens || s.input_tokens || 0) + (s.exact_output_tokens || s.output_tokens || 0);
      const dur = s.duration_s || (s.ended_at && s.started_at ? s.ended_at - s.started_at : 0);
      const isActive = s.session_id === activeId;
      return html`<button key=${s.session_id} title=${s.session_id}
        class="sf-sess-tab ${isActive ? 'active' : ''}"
        onClick=${() => onSelect(s.session_id)}>
        <span class="sf-stab-time">${fmtHHMM(s.started_at)}</span>
        <span class="sf-stab-sid">${shortSid(s.session_id)}</span>
        <span class="sf-stab-dur">${fmtDurSec(dur)}</span>
        ${tok > 0 && html`<span class="sf-stab-tok">${fmtK(tok)}t</span>`}
        ${(s.files_modified || 0) > 0 && html`<span class="sf-stab-files">${s.files_modified}f</span>`}
        ${!s.ended_at && html`<span class="sf-stab-live">\u25CF</span>`}
      </button>`;
    })}
  </div>`;
}

// ─── Tooltip ───────────────────────────────────────────────────
function BarTooltip({bar, x, y}) {
  if (!bar) return null;
  const t = bar;
  const tok = t.tokens || {};
  const entity = barEntity(t);
  return html`<div class="tc-tooltip" style="left:${x}px;top:${y}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${entityColor(entity)}"></span>
      ${esc(entity)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${fmtDateTime(t.ts)}</span></div>
    ${t.type === 'user_message' && t.message && html`
      <div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Message</span>
        <span style="white-space:pre-wrap;max-height:120px;overflow:auto;font-size:var(--fs-xs)">${esc((t.message || '').slice(0, 300))}</span>
      </div>`}
    ${(t.type === 'api_call' || t.type === 'api_response') && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Model</span><span>${t.model || '?'}</span></div>`}
    ${t.type === 'tool_use' && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Tool</span><span>${t.to || t.name || '?'}</span></div>
      ${t.params && html`<div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Args</span>
        <span class="mono" style="font-size:var(--fs-xs);max-height:80px;overflow:auto">${esc(String(t.params).slice(0, 200))}</span>
      </div>`}`}
    ${t.type === 'subagent' && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${t.to || '?'}</span></div>`}
    ${t.duration_ms > 0 && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${fmtDurMs(t.duration_ms)}</span></div>`}
    ${(tok.input || tok.output) ? html`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${fmtK(tok.input || 0)} out:${fmtK(tok.output || 0)}${tok.cache_read ? ' cache:' + fmtK(tok.cache_read) : ''}</span>
      </div>` : null}
    ${t.type === 'error' && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${t.error_type || ''}: ${(t.error_message || '').slice(0, 100)}</span></div>`}
    ${t.type === 'compaction' && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${t.compaction_count || ''}</span></div>`}
    ${t.agent_name && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${t.agent_name}</span></div>`}
  </div>`;
}

// ─── Legend ────────────────────────────────────────────────────
function Legend({entities}) {
  return html`<div class="tc-legend">
    ${entities.map(name => html`<span key=${name} class="tc-legend-item">
      <span class="tc-legend-swatch" style="background:${entityColor(name)}"></span>
      ${esc(name)}
    </span>`)}
  </div>`;
}

// ─── Summary bar ──────────────────────────────────────────────
function SummaryBar({summary}) {
  if (!summary || !summary.total_tokens) return null;
  const items = [
    ['Prompts', summary.total_turns],
    ['API Calls', summary.total_api_calls],
    ['Tools', summary.total_tool_uses],
    ['Tokens', fmtK(summary.total_tokens)],
    ['Duration', fmtDurSec(summary.duration_s)],
  ].filter(([, v]) => v);
  return html`<div class="tc-summary">
    ${items.map(([label, val]) => html`<div class="tc-summary-item">
      <div class="tc-summary-val">${val}</div>
      <div class="tc-summary-label">${label}</div>
    </div>`)}
  </div>`;
}

// ─── Bar height (px) ──────────────────────────────────────────
const BAR_AREA_H = 110;
const GAP_THRESHOLD = 30; // seconds — gaps larger than this get a spacer

// ─── Build slot list from bars ────────────────────────────────
function buildSlots(bars) {
  const slots = [];
  for (let i = 0; i < bars.length; i++) {
    if (i > 0) {
      const gap = bars[i].ts - bars[i - 1].ts;
      if (gap > GAP_THRESHOLD) {
        slots.push({ type: 'gap', endTs: bars[i - 1].ts, startTs: bars[i].ts, gap });
      }
    }
    slots.push({ type: 'bar', bar: bars[i] });
  }
  return slots;
}

// ─── Main component ───────────────────────────────────────────
export default function TabTimelineChart() {
  const {snap: s, globalRange, enabledTools} = useContext(SnapContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  // Fetch sessions
  useEffect(() => {
    setLoading(true);
    const since = globalRange ? Math.min(globalRange.since, Date.now() / 1000 - 86400) : Date.now() / 1000 - 86400;
    const until = globalRange?.until;
    api.getSessionTimeline(null, { since, until })
      .then(data => {
        data.sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [globalRange]);

  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);
  const filteredSessions = sessions.filter(sess => toolMatch(sess.tool));
  const tools = [...new Set(filteredSessions.map(s => s.tool))].sort();

  useEffect(() => {
    if (!activeTool && tools.length > 0) setActiveTool(tools[0]);
    else if (activeTool && !tools.includes(activeTool) && tools.length > 0) setActiveTool(tools[0]);
  }, [tools.join(',')]);

  const toolSessions = filteredSessions.filter(s => s.tool === activeTool);

  useEffect(() => {
    if (toolSessions.length > 0 && (!activeSessionId || !toolSessions.find(s => s.session_id === activeSessionId))) {
      setActiveSessionId(toolSessions[0].session_id);
    }
  }, [activeTool, toolSessions.length]);

  // Fetch flow data
  useEffect(() => {
    if (!activeSessionId) { setFlowData(null); return; }
    setFlowLoading(true);
    const sess = sessions.find(s => s.session_id === activeSessionId);
    const since = sess?.started_at ? sess.started_at - 60 : Date.now() / 1000 - 86400;
    const until = sess?.ended_at ? sess.ended_at + 60 : Date.now() / 1000 + 60;
    api.getSessionFlow(activeSessionId, since, until)
      .then(data => { setFlowData(data); setFlowLoading(false); })
      .catch(() => { setFlowData(null); setFlowLoading(false); });
  }, [activeSessionId]);

  // Process turns into slots
  const { slots, maxTokens, entities } = useMemo(() => {
    const turns = flowData?.turns || [];
    if (!turns.length) return { slots: [], maxTokens: 0, entities: [] };

    const bars = turns.filter(t =>
      ['user_message', 'api_call', 'api_response', 'tool_use',
       'compaction', 'subagent', 'error', 'hook'].includes(t.type)
    );
    if (!bars.length) return { slots: [], maxTokens: 0, entities: [] };

    const maxTokens = Math.max(1, ...bars.map(turnTokens));
    const entitySet = new Set();
    for (const b of bars) entitySet.add(barEntity(b));

    return { slots: buildSlots(bars), maxTokens, entities: [...entitySet].sort() };
  }, [flowData]);

  const handleHover = useCallback((bar, e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(e.clientX - rect.left + 12, rect.width - 320);
    const y = e.clientY - rect.top + 12;
    setTooltip({ bar, x, y });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  const summary = flowData?.summary || {};

  return html`<div class="tc-container" ref=${containerRef}>
    <${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>
    <${SessionTabs} sessions=${toolSessions} activeId=${activeSessionId}
      onSelect=${setActiveSessionId} loading=${loading}/>
    <${SummaryBar} summary=${summary}/>

    ${flowLoading
      ? html`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`
      : slots.length === 0
        ? html`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
          </div>`
        : html`
          <${Legend} entities=${entities}/>
          <div class="tc-flow">
            ${slots.map((slot, si) => {
              if (slot.type === 'gap') {
                return html`<div key=${'g'+si} class="tc-flow-gap">
                  <span class="tc-gap-label">${fmtHHMM(slot.endTs)}</span>
                  <span class="tc-gap-dots">\u00b7\u00b7 ${fmtGap(slot.gap)} \u00b7\u00b7</span>
                  <span class="tc-gap-label">${fmtHHMM(slot.startTs)}</span>
                </div>`;
              }

              const b = slot.bar;
              const tok = turnTokens(b);
              const hFrac = maxTokens > 0
                ? Math.max(0.08, Math.log1p(tok) / Math.log1p(maxTokens))
                : 0.08;
              const hPx = Math.max(6, hFrac * BAR_AREA_H);
              const entity = barEntity(b);
              const color = entityColor(entity);

              return html`<div key=${si} class="tc-flow-bar"
                style="height:${BAR_AREA_H}px"
                onMouseEnter=${(e) => handleHover(b, e)}
                onMouseLeave=${handleLeave}>
                <div class="tc-flow-fill" style="height:${hPx}px;background:${color}"></div>
              </div>`;
            })}
          </div>
          ${tooltip && html`<${BarTooltip} bar=${tooltip.bar} x=${tooltip.x} y=${tooltip.y}/>`}
        `}
  </div>`;
}
