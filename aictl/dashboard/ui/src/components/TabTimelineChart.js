/**
 * TabTimelineChart — horizontal bar-chart view of a session's activity over time.
 *
 * Bars flow left-to-right via flex-wrap.  Empty time gaps collapse to a
 * single gap-marker.  Entity filter and cached/non-cached token mode
 * let the user slice the view interactively.
 */
import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, esc, COLORS, ICONS } from '../utils.js';
import * as api from '../api.js';

// ─── Entity colour palette ────────────────────────────────────
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
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDateHHMM(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDurMs(ms) {
  if (!ms) return '';
  return ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
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

// ─── Token helpers ────────────────────────────────────────────
function tokFresh(t) {
  const tok = t.tokens || {};
  return (tok.input || 0) + (tok.output || 0);
}
function tokCached(t) {
  const tok = t.tokens || {};
  return (tok.cache_read || 0) + (tok.cache_creation || 0);
}
function tokAll(t) { return tokFresh(t) + tokCached(t); }

// Compute visible token count for a bar given the token mode
// mode: 'all' | 'fresh' | 'cached'
function barTokens(t, mode) {
  if (mode === 'fresh') return tokFresh(t);
  if (mode === 'cached') return tokCached(t);
  return tokAll(t);
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
    ${(tok.input || tok.output || tok.cache_read) ? html`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${fmtK(tok.input || 0)} out:${fmtK(tok.output || 0)}${tok.cache_read ? ' cache:' + fmtK(tok.cache_read) : ''}${tok.cache_creation ? ' cache_w:' + fmtK(tok.cache_creation) : ''}</span>
      </div>` : null}
    ${t.type === 'error' && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${t.error_type || ''}: ${(t.error_message || '').slice(0, 100)}</span></div>`}
    ${t.type === 'compaction' && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${t.compaction_count || ''}</span></div>`}
    ${t.agent_name && html`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${t.agent_name}</span></div>`}
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

// ─── Constants ────────────────────────────────────────────────
const BAR_AREA_H = 110;
const GAP_THRESHOLD = 30;

// ─── Build slot list from filtered bars ───────────────────────
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

// ─── Entity filter (multi-select checkboxes) ──────────────────
function EntityFilter({entities, selected, onToggle, onAll, onNone}) {
  return html`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${onAll}>All</button>
    <button class="tc-filter-btn" onClick=${onNone}>None</button>
    ${entities.map(name => {
      const active = selected.has(name);
      return html`<label key=${name} class="tc-filter-check ${active ? 'active' : ''}"
        style="--swatch:${entityColor(name)}">
        <input type="checkbox" checked=${active}
          onChange=${() => onToggle(name)}/>
        <span class="tc-legend-swatch" style="background:${entityColor(name)}"></span>
        ${esc(name)}
      </label>`;
    })}
  </div>`;
}

// ─── Token mode selector ──────────────────────────────────────
function TokenModeSelector({mode, onChange}) {
  const modes = [
    ['all',    'All Tokens'],
    ['fresh',  'Non-Cached'],
    ['cached', 'Cached Only'],
  ];
  return html`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${modes.map(([val, label]) => html`<label key=${val}
      class="tc-filter-check ${mode === val ? 'active' : ''}">
      <input type="radio" name="tc-tok-mode" checked=${mode === val}
        onChange=${() => onChange(val)}/>
      ${label}
    </label>`)}
  </div>`;
}

// ─── BarFlow — the flex-wrap container ────────────────────────
// Takes filtered bars + config, renders the entire bar chart.
function BarFlow({bars, tokenMode, onHover, onLeave}) {
  if (!bars.length) return html`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
  </div>`;

  const slots = buildSlots(bars);
  const maxTok = Math.max(1, ...bars.map(b => barTokens(b, tokenMode)));

  return html`<div class="tc-flow">
    ${slots.map((slot, si) => {
      if (slot.type === 'gap') {
        return html`<div key=${'g'+si} class="tc-flow-gap">
          <span class="tc-gap-label">${fmtHHMM(slot.endTs)}</span>
          <span class="tc-gap-dots">\u00b7\u00b7 ${fmtGap(slot.gap)} \u00b7\u00b7</span>
          <span class="tc-gap-label">${fmtHHMM(slot.startTs)}</span>
        </div>`;
      }

      const b = slot.bar;
      const total = barTokens(b, tokenMode);
      const hFrac = maxTok > 0
        ? Math.max(0.08, Math.log1p(total) / Math.log1p(maxTok))
        : 0.08;
      const hPx = Math.max(6, hFrac * BAR_AREA_H);

      const entity = barEntity(b);
      const color = entityColor(entity);

      // Split bar into fresh (solid) + cached (hatched) portions
      const fresh = tokFresh(b);
      const cached = tokCached(b);
      const tokTotal = fresh + cached;
      let freshPct, cachedPct;
      if (tokenMode === 'cached') {
        freshPct = 0; cachedPct = 100;
      } else if (tokenMode === 'fresh') {
        freshPct = 100; cachedPct = 0;
      } else if (tokTotal > 0) {
        freshPct = Math.round((fresh / tokTotal) * 100);
        cachedPct = 100 - freshPct;
      } else {
        freshPct = 100; cachedPct = 0;
      }

      const hasSplit = cachedPct > 0;

      return html`<div key=${si} class="tc-flow-bar"
        style="height:${BAR_AREA_H}px"
        onMouseEnter=${(e) => onHover(b, e)}
        onMouseLeave=${onLeave}>
        <div class="tc-flow-fill ${hasSplit ? 'tc-split' : ''}"
          style="height:${hPx}px;--bar-color:${color}">
          ${hasSplit && html`
            ${freshPct > 0 && html`<div class="tc-fill-fresh" style="height:${freshPct}%"></div>`}
            <div class="tc-fill-cached" style="height:${freshPct > 0 ? cachedPct : 100}%"></div>`}
        </div>
      </div>`;
    })}
  </div>`;
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
  const [selectedEntities, setSelectedEntities] = useState(null); // null = all
  const [tokenMode, setTokenMode] = useState('all');
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

  useEffect(() => {
    if (!activeSessionId) { setFlowData(null); return; }
    setFlowLoading(true);
    const sess = sessions.find(s => s.session_id === activeSessionId);
    const since = sess?.started_at ? sess.started_at - 60 : Date.now() / 1000 - 86400;
    const until = sess?.ended_at ? sess.ended_at + 60 : Date.now() / 1000 + 60;
    api.getSessionFlow(activeSessionId, since, until)
      .then(data => { setFlowData(data); setFlowLoading(false); setSelectedEntities(null); })
      .catch(() => { setFlowData(null); setFlowLoading(false); });
  }, [activeSessionId]);

  // All bars + all entity names (unfiltered)
  const { allBars, allEntities } = useMemo(() => {
    const turns = flowData?.turns || [];
    const allBars = turns.filter(t =>
      ['user_message', 'api_call', 'api_response', 'tool_use',
       'compaction', 'subagent', 'error', 'hook'].includes(t.type)
    );
    const entitySet = new Set();
    for (const b of allBars) entitySet.add(barEntity(b));
    return { allBars, allEntities: [...entitySet].sort() };
  }, [flowData]);

  // Effective selected set (null means all)
  const selected = selectedEntities || new Set(allEntities);

  // Filtered bars
  const filteredBars = useMemo(() =>
    allBars.filter(b => selected.has(barEntity(b))),
    [allBars, selected]
  );

  // Entity filter handlers
  const toggleEntity = useCallback((name) => {
    setSelectedEntities(prev => {
      const s = new Set(prev || allEntities);
      if (s.has(name)) s.delete(name); else s.add(name);
      return s;
    });
  }, [allEntities]);
  const selectAll = useCallback(() => setSelectedEntities(null), []);
  const selectNone = useCallback(() => setSelectedEntities(new Set()), []);

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
      : allBars.length === 0
        ? html`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
          </div>`
        : html`
          <div class="tc-controls">
            <${EntityFilter} entities=${allEntities} selected=${selected}
              onToggle=${toggleEntity} onAll=${selectAll} onNone=${selectNone}/>
            <${TokenModeSelector} mode=${tokenMode} onChange=${setTokenMode}/>
          </div>
          <${BarFlow} bars=${filteredBars} tokenMode=${tokenMode}
            onHover=${handleHover} onLeave=${handleLeave}/>
          ${tooltip && html`<${BarTooltip} bar=${tooltip.bar} x=${tooltip.x} y=${tooltip.y}/>`}
        `}
  </div>`;
}
