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
import { fmtK, esc, fmtHHMM, fmtDurMs, fmtDurSec, hashColor } from '../utils.js';
import { findSessionRow, sessionIdCandidates } from '../selectors.js';
import useSessionPicker from '../hooks/useSessionPicker.js';
import ToolTabs from './ToolTabs.js';
import SessionTabs from './session_flow/SessionTabs.js';
import * as api from '../api.js';

// ─── Entity colour: fixed overrides for well-known entities, shared
// palette hash (utils.hashColor) for everything else. ─────────────
const _FIXED = {
  Bash: '#6b7280', Read: '#60a5fa', Edit: '#34d399', Write: '#22d3ee',
  Grep: '#fbbf24', Glob: '#a78bfa', Agent: '#f472b6',
  Prompt: 'var(--green)', Compaction: 'var(--yellow)', Error: 'var(--red)',
};
function entityColor(name) {
  if (!name) return 'var(--fg2)';
  if (_FIXED[name]) return _FIXED[name];
  return hashColor(name);
}

// ─── Helpers (domain-specific; generic formatters live in utils.js) ──
function fmtDateTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtGap(sec) {
  if (sec < 60) return Math.round(sec) + 's';
  if (sec < 3600) return Math.round(sec / 60) + 'm';
  if (sec < 86400) return (sec / 3600).toFixed(1) + 'h';
  return (sec / 86400).toFixed(1) + 'd';
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
const TIME_AXIS_H = 16;  // reserved height for time labels below bars
const SLOT_H = BAR_AREA_H + TIME_AXIS_H;
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
    <small class="empty-state-source">/api/session-flow · turns[]</small>
  </div>`;

  const slots = buildSlots(bars);
  const maxTok = Math.max(1, ...bars.map(b => barTokens(b, tokenMode)));

  // Decide which bar-slots get a time label: first, last, every ~20th
  const barIndices = [];
  slots.forEach((s, i) => { if (s.type === 'bar') barIndices.push(i); });
  const labelEvery = Math.max(1, Math.floor(barIndices.length / Math.ceil(barIndices.length / 20)));
  const labelSet = new Set();
  barIndices.forEach((si, nth) => {
    if (nth === 0 || nth === barIndices.length - 1 || nth % labelEvery === 0) labelSet.add(si);
  });

  return html`<div class="tc-flow">
    ${slots.map((slot, si) => {
      if (slot.type === 'gap') {
        const tipText = fmtDateTime(slot.endTs) + ' \u2192 ' + fmtDateTime(slot.startTs) + '  (' + fmtGap(slot.gap) + ' gap)';
        return html`<div key=${'g'+si} class="tc-flow-slot" style="height:${SLOT_H}px" title=${tipText}>
          <div class="tc-flow-gap-line" style="height:${BAR_AREA_H}px"></div>
          <div class="tc-flow-time">${fmtGap(slot.gap)}</div>
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
      const showTime = labelSet.has(si);

      return html`<div key=${si} class="tc-flow-slot" style="height:${SLOT_H}px"
        tabindex="0" role="img"
        aria-label=${entity + ' at ' + fmtHHMM(b.ts) + ', ' + fmtK(total) + ' tokens'}
        onMouseEnter=${(e) => onHover(b, e)}
        onMouseLeave=${onLeave}
        onFocus=${(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onHover(b, { clientX: r.left + r.width / 2, clientY: r.top });
        }}
        onBlur=${onLeave}>
        <div class="tc-flow-bar-area" style="height:${BAR_AREA_H}px">
          <div class="tc-flow-fill ${hasSplit ? 'tc-split' : ''}"
            style="height:${hPx}px;--bar-color:${color}">
            ${hasSplit && html`
              ${freshPct > 0 && html`<div class="tc-fill-fresh" style="height:${freshPct}%"></div>`}
              <div class="tc-fill-cached" style="height:${freshPct > 0 ? cachedPct : 100}%"></div>`}
          </div>
        </div>
        <div class="tc-flow-time">${showTime ? fmtHHMM(b.ts) : ''}</div>
      </div>`;
    })}
  </div>`;
}

// ─── Main component ───────────────────────────────────────────
// When `externalSessionId` is passed (e.g. from TabExplorer), the internal
// tool/session pickers are hidden and the component renders only the
// timeline for the given session.
export default function TabTimelineChart({ externalSessionId = null } = {}) {
  const {globalRange, enabledTools} = useContext(SnapContext);
  const {
    sessions, loading, error, tools, toolSessions,
    activeTool, setActiveTool, activeSessionId, setActiveSessionId,
  } = useSessionPicker({ globalRange, enabledTools });
  const [flowData, setFlowData] = useState(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [selectedEntities, setSelectedEntities] = useState(null); // null = all
  const [tokenMode, setTokenMode] = useState('all');
  const containerRef = useRef(null);
  const embedded = externalSessionId != null;
  const effectiveSessionId = embedded ? externalSessionId : activeSessionId;

  useEffect(() => {
    if (!effectiveSessionId) { setFlowData(null); return; }
    setFlowLoading(true);
    const sess = findSessionRow(sessions, effectiveSessionId);
    const since = sess?.started_at ? sess.started_at - 60 : Date.now() / 1000 - 86400;
    const until = sess?.ended_at ? sess.ended_at + 60 : Date.now() / 1000 + 60;
    const candidates = sess ? sessionIdCandidates(sess) : [effectiveSessionId];
    api.getSessionFlow(candidates, since, until)
      .then(data => { setFlowData(data); setFlowLoading(false); setSelectedEntities(null); })
      .catch(() => { setFlowData(null); setFlowLoading(false); });
  }, [effectiveSessionId, sessions.length]);

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
    ${!embedded && html`<${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>`}
    ${!embedded && html`<${SessionTabs} sessions=${toolSessions} activeId=${activeSessionId}
      onSelect=${setActiveSessionId} loading=${loading} error=${error}/>`}
    <${SummaryBar} summary=${summary}/>

    ${flowLoading
      ? html`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`
      : allBars.length === 0
        ? html`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
            <small class="empty-state-source">/api/session-flow · turns[] (filtered to user_message, api_call, api_response, tool_use, compaction, subagent, error, hook)</small>
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
