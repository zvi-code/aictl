import { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, fmtSz, liveTokenTotal, fmtAgo, fmtDurSec, toolColor } from '../utils.js';
import { ToolIcon } from './ui/index.js';
import { dedupeSessions } from '../selectors.js';
import * as api from '../api.js';

// ─── Lane colors (editorial palette) ────────────────────────────
const LANE_COLOR = {
  user:   'var(--fg)',
  api:    '#B26B1B',
  agent:  'var(--green)',
  bash:   'var(--fg)',
  read:   '#1F6E78',
  write:  '#1F6E78',
  edit:   '#1F6E78',
  glob:   'var(--green)',
  grep:   'var(--green)',
  skill:  '#2E5BA6',
};

function laneColor(lane) {
  const l = (lane || '').toLowerCase();
  return LANE_COLOR[l] || 'var(--fg2)';
}




function fmtTs(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts * 1000);
  return d.toTimeString().slice(0, 8);
}

function fmtTsISO(ts) {
  if (!ts) return '\u2014';
  return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 23);
}

// ─── Convert session-flow turns to timeline event objects ────────
function turnsToEvents(turns) {
  const events = [];
  let cumTok = 0;

  (turns || []).forEach((turn, i) => {
    const t   = fmtTs(turn.ts);
    const tok = turn.tokens;

    if (turn.type === 'session_start') {
      events.push({ id: `t${i}`, lane: 'agent', kind: 'call',
        t, label: 'session opened', meta: null, size: null, raw: turn });

    } else if (turn.type === 'session_end') {
      events.push({ id: `t${i}`, lane: 'agent', kind: 'return',
        t, label: 'session closed', meta: null, size: null, raw: turn });

    } else if (turn.type === 'user_message') {
      const out = tok?.output || 0;
      cumTok += out;
      events.push({ id: `t${i}`, lane: 'user', kind: 'call',
        t, label: turn.preview || (turn.message || '').slice(0, 120),
        meta: turn.model ? `${turn.model} \u00b7 ${fmtK(tok?.input || 0)} in / ${fmtK(out)} out` : null,
        size: null, cum: (cumTok / 1000).toFixed(1), raw: turn });

    } else if (turn.type === 'api_call') {
      const out = turn.tokens?.output || 0;
      cumTok += out;
      events.push({ id: `t${i}`, lane: 'api', kind: 'recv',
        t, label: `\u2190 ${fmtK(out)}t`,
        meta: turn.model || null,
        size: null, cum: (cumTok / 1000).toFixed(1), raw: turn });

    } else if (turn.type === 'tool_use') {
      const toolName = turn.to || 'tool';
      const lane     = toolName.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'tool';
      if (turn.subtype === 'decision') {
        events.push({ id: `t${i}`, lane, kind: 'call',
          t, label: toolName + (turn.input_preview ? ': ' + turn.input_preview.slice(0, 80) : ''),
          meta: turn.decision || null, size: null, raw: turn });
      } else {
        const sz = turn.result_size ? fmtSz(turn.result_size) : null;
        events.push({ id: `t${i}`, lane, kind: 'return',
          t, label: toolName + (turn.result_summary ? ': ' + turn.result_summary.slice(0, 80) : ''),
          meta: turn.success !== false
            ? `\u2713 ${turn.duration_ms != null ? turn.duration_ms + 'ms' : ''}`
            : '\u2717 failed',
          size: sz, raw: turn });
      }

    } else if (turn.type === 'compaction') {
      events.push({ id: `t${i}`, lane: 'agent', kind: 'call',
        t, label: `Compaction #${turn.compaction_count}`,
        meta: null, size: null, raw: turn });
    }
  });
  return events;
}

// ─── Stats strip cell ────────────────────────────────────────────
function Stat({ label, value, sub }) {
  return html`<div class="cdb-stat">
    <div class="c-overline">${label}</div>
    <div class="cdb-stat-row">
      <span class="c-stat-value">${value}</span>
      ${sub && html`<span class="cdb-stat-sub">${sub}</span>`}
    </div>
  </div>`;
}

// ─── Agent toggle row (left pane checklist) ──────────────────────
function AgentToggle({ tool, label, color, active, onToggle }) {
  return html`<div class="cdb-agent-row" onClick=${onToggle} role="button" tabIndex=${0}
    onKeyDown=${e => e.key === 'Enter' && onToggle()}
    style="opacity:${active ? 1 : 0.45}">
    <div class=${'cdb-agent-check' + (active ? ' is-active' : '')}
      style="background:${active ? color : 'transparent'};border-color:${active ? color : 'var(--fg3)'}">
      ${active ? '\u2713' : ''}
    </div>
    <span class="cdb-agent-label">${label}</span>
  </div>`;
}

// ─── Single timeline event row ───────────────────────────────────
function TimelineEvent({ ev, selected, onClick, isLast }) {
  const lc      = laneColor(ev.lane);
  const dotChar = ev.kind === 'return' ? '\u25C6' : ev.kind === 'call' ? '\u25C7' : '\u25CC';
  return html`<div
    class=${'cdb-ev-row' + (selected ? ' is-selected' : '')}
    onClick=${onClick}
    role="button" tabIndex=${0}
    onKeyDown=${e => e.key === 'Enter' && onClick()}>

    <!-- Time + cumulative tokens -->
    <div class="cdb-ev-time">
      <div class="cdb-ev-ts">${ev.t}</div>
      ${ev.cum && html`<div class="cdb-ev-cum">${ev.cum}K cum</div>`}
    </div>

    <!-- Spine + dot -->
    <div class="cdb-ev-spine">
      <div class=${'cdb-ev-spine-line' + (isLast ? ' cdb-ev-spine-line--last' : '')}></div>
      <div class="cdb-ev-dot" style="border-color:${lc};color:${lc}">${dotChar}</div>
    </div>

    <!-- Body -->
    <div class="cdb-ev-body">
      <div class="cdb-ev-lane-row">
        <span class="cdb-ev-lane" style="color:${lc}">${ev.lane}</span>
        ${ev.kind === 'return' && html`<span class="cdb-ev-kindlabel cdb-ev-kindlabel--return">returned</span>`}
        ${ev.kind === 'call'   && html`<span class="cdb-ev-kindlabel">requested</span>`}
        ${ev.kind === 'recv'   && html`<span class="cdb-ev-kindlabel">tokens</span>`}
      </div>
      <div class="cdb-ev-label">${ev.label}</div>
      ${ev.meta && html`<div class="cdb-ev-meta">${ev.meta}</div>`}
    </div>

    <!-- Size badge -->
    <div class="cdb-ev-right">
      ${ev.size && html`<span class="cdb-ev-size">${ev.size}</span>`}
    </div>
  </div>`;
}

// ─── Event inspector (right pane) ───────────────────────────────
function EventInspector({ event }) {
  if (!event) {
    return html`<div class="cdb-inspector cdb-inspector--empty">
      <div class="c-overline cdb-inspector-empty-label">No selection</div>
      <div>Choose an event in the timeline to read its payload.</div>
    </div>`;
  }

  const turn = event.raw;
  const metaRows = [];
  if (turn.model)       metaRows.push(['Model',       turn.model]);
  if (turn.ts)          metaRows.push(['Started',     fmtTsISO(turn.ts)]);
  if (turn.duration_ms != null) metaRows.push(['Duration', turn.duration_ms + 'ms']);
  if (turn.tokens?.input || turn.tokens?.output) {
    metaRows.push(['Tokens',
      `${fmtK(turn.tokens.input || 0)} in / ${fmtK(turn.tokens.output || 0)} out`]);
  }
  if (turn.result_size) metaRows.push(['Output size', fmtSz(turn.result_size)]);
  if (turn.decision)    metaRows.push(['Permission',  turn.decision]);

  const inputText = turn.message
    || (turn.params ? JSON.stringify(turn.params, null, 2) : null)
    || turn.input_preview
    || '\u2014';

  const outputText = turn.result_summary
    || (turn.type === 'api_call' && turn.tokens?.output
        ? `${fmtK(turn.tokens.output)} tokens`
        : null)
    || '\u2014';

  const lc = laneColor(event.lane);

  return html`<div class="cdb-inspector">
    <div class="cdb-inspector-head">
      <div class="c-overline c-overline--wide" style="color:${lc}">
        ${event.lane} \u00b7 ${event.kind}
      </div>
      <div class="cdb-inspector-title">${event.label}</div>
    </div>
    <div class="cdb-inspector-body">
      ${metaRows.length > 0 && html`<div class="cdb-inspector-meta">
        ${metaRows.map(([k, v]) => html`<div key=${k} class="cdb-inspector-row">
          <span class="cdb-inspector-key">${k}</span>
          <span class="cdb-inspector-val">${v}</span>
        </div>`)}
      </div>`}

      <div class="c-overline cdb-inspector-section-head">Input</div>
      <pre class="cdb-inspector-code">${inputText}</pre>

      <div class="c-overline cdb-inspector-section-head">Output</div>
      <pre class="cdb-inspector-code">${outputText}</pre>
    </div>
  </div>`;
}

// ─── CDashboardTab ───────────────────────────────────────────────
const RANGES = ['Live', '1h', '6h', '24h', '7d'];

export default function CDashboardTab() {
  const ctx  = useContext(SnapContext);
  const snap = ctx?.snap;

  const [range,           setRange]           = useState('Live');
  const [sessionFilter,   setSessionFilter]   = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [eventFilter,     setEventFilter]     = useState('');
  const [selectedEvent,   setSelectedEvent]   = useState(null);
  const [flow,            setFlow]            = useState(null);
  const [flowLoading,     setFlowLoading]     = useState(false);
  const [activeTools,     setActiveTools]     = useState(null); // null = all active

  // Collect unique tools that have sessions
  const sessionTools = useMemo(() => {
    const seen = new Map();
    for (const t of (snap?.tools || [])) {
      if ((t.live?.sessions || []).length > 0) {
        seen.set(t.tool, { tool: t.tool, label: t.label, color: toolColor(t.tool) });
      }
    }
    return [...seen.values()];
  }, [snap]);

  const toggleTool = useCallback((toolId) => {
    setActiveTools(prev => {
      const all = new Set(sessionTools.map(t => t.tool));
      const cur = prev ?? all;
      const next = new Set(cur);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next.size === all.size ? null : next; // null = all active (cheaper)
    });
  }, [sessionTools]);

  // Stats — session-level when flow is loaded, global when not
  const statsData = useMemo(() => {
    const s = flow?.summary;
    if (s) {
      const totalTok = (s.total_input_tokens || 0) + (s.total_output_tokens || 0);
      const sub = `${fmtK(s.total_input_tokens || 0)}/${fmtK(s.total_output_tokens || 0)}`;
      return [
        { label: 'Prompts',   value: s.total_turns       ?? 0 },
        { label: 'API calls', value: s.total_api_calls   ?? 0 },
        { label: 'Tools',     value: s.total_tool_uses   ?? 0 },
        { label: 'Tokens',    value: fmtK(totalTok),        sub },
        { label: 'Duration',  value: fmtDurSec(s.duration_s) },
        { label: 'Events',    value: s.event_count        ?? 0 },
      ];
    }
    // Global fallback
    if (!snap) return [
      { label: 'Live sessions', value: 0 }, { label: 'Processes', value: 0 },
      { label: 'Est. tokens',   value: 0 }, { label: 'Active tools', value: 0 },
      { label: 'Files touched', value: 0 }, { label: 'MCP servers', value: 0 },
    ];
    let sessions = 0, processes = 0, tokens = 0, tools = 0, files = 0, mcp = 0;
    for (const t of snap.tools || []) {
      const l = t.live || {};
      sessions  += l.session_count || 0;
      processes += l.pid_count || (t.processes || []).length || 0;
      tokens    += liveTokenTotal(l);
      if ((l.pid_count || 0) > 0) tools++;
      files += l.files_touched || 0;
      mcp   += (t.mcp_servers || []).length;
    }
    return [
      { label: 'Live sessions', value: sessions  },
      { label: 'Processes',     value: processes },
      { label: 'Est. tokens',   value: fmtK(tokens) },
      { label: 'Active tools',  value: tools    },
      { label: 'Files touched', value: files    },
      { label: 'MCP servers',   value: mcp      },
    ];
  }, [snap, flow]);

  // Flatten all sessions from all tools (deduped — a session reported by
  // multiple collectors must render as a single row)
  const allSessions = useMemo(() => {
    const out = [];
    for (const t of (snap?.tools || [])) {
      for (const s of (t.live?.sessions || [])) {
        out.push({ ...s, _tool: t.tool, _toolLabel: t.label });
      }
    }
    return dedupeSessions(out);
  }, [snap]);

  const filteredSessions = useMemo(() => {
    let out = allSessions;
    if (activeTools !== null) out = out.filter(s => activeTools.has(s._tool));
    if (!sessionFilter) return out;
    const q = sessionFilter.toLowerCase();
    return out.filter(s => {
      const id = String(s.session_id || s.id || '');
      return id.toLowerCase().includes(q)
        || (s._toolLabel || '').toLowerCase().includes(q)
        || (s.workspace || s.project || '').toLowerCase().includes(q);
    });
  }, [allSessions, sessionFilter, activeTools]);

  const selectedId  = selectedSession ?? filteredSessions[0]?.session_id ?? filteredSessions[0]?.id ?? null;
  const selectedObj = filteredSessions.find(s => (s.session_id || s.id) === selectedId) ?? null;

  // Fetch session-flow when selected session changes
  useEffect(() => {
    if (!selectedId) { setFlow(null); return; }
    let live = true;
    setFlowLoading(true);
    setFlow(null);
    setSelectedEvent(null);
    const since = 0;
    const until = Math.floor(Date.now() / 1000) + 3600;
    api.getSessionFlow(selectedId, since, until)
      .then(d => { if (live) { setFlow(d); setFlowLoading(false); } })
      .catch(() => { if (live) setFlowLoading(false); });
    return () => { live = false; };
  }, [selectedId]);

  // Convert turns to timeline events and filter
  const allEvents = useMemo(() => turnsToEvents(flow?.turns), [flow]);
  const filteredEvents = useMemo(() => {
    if (!eventFilter) return allEvents;
    const q = eventFilter.toLowerCase();
    return allEvents.filter(ev =>
      ev.label.toLowerCase().includes(q)
      || ev.lane.toLowerCase().includes(q)
      || (ev.meta || '').toLowerCase().includes(q)
    );
  }, [allEvents, eventFilter]);

  const selectedEvObj = selectedEvent
    ? filteredEvents.find(e => e.id === selectedEvent) ?? null
    : null;

  const handleSelectSession = useCallback(s => {
    setSelectedSession(s.session_id || s.id);
  }, []);

  const handleSelectEvent = useCallback(ev => {
    setSelectedEvent(ev.id === selectedEvent ? null : ev.id);
  }, [selectedEvent]);

  return html`<div class="c-shell">
    <!-- Stats strip -->
    <div class="cdb-stats-strip">
      ${statsData.map(s => html`<${Stat} key=${s.label} label=${s.label} value=${s.value} sub=${s.sub}/>`)}
    </div>

    <!-- Body: 3-col -->
    <div class="cdb-body">

      <!-- Left: range + sessions -->
      <div class="cdb-left">
        <div class="c-overline cdb-left-heading">Range</div>
        <div class="cdb-range-btns">
          ${RANGES.map(r => html`<button key=${r} type="button"
            class=${'cdb-range-btn' + (range === r ? ' is-active' : '')}
            onClick=${() => setRange(r)}>${r}</button>`)}
        </div>

        ${sessionTools.length > 0 && html`<div>
          <div class="c-overline cdb-left-heading" style="margin-top:var(--sp-8)">
            Agents
            <span class="cdb-count-badge">
              ${activeTools === null ? sessionTools.length : activeTools.size}/${sessionTools.length}
            </span>
          </div>
          <div class="cdb-agents-list">
            ${sessionTools.map(t => html`<${AgentToggle}
              key=${t.tool} tool=${t.tool} label=${t.label} color=${t.color}
              active=${activeTools === null || activeTools.has(t.tool)}
              onToggle=${() => toggleTool(t.tool)}/>`)}
          </div>
        </div>`}

        <div class="c-overline cdb-left-heading" style="margin-top:var(--sp-8)">
          Sessions
          <span class="cdb-count-badge">${filteredSessions.length}</span>
        </div>
        <div class="c-filter-wrap cdb-filter-wrap cdb-filter-wrap--sm">
          <span class="c-filter-icon" aria-hidden="true">\u2315</span>
          <input class="c-filter-input" type="text" placeholder="Filter\u2026"
            aria-label="Filter sessions"
            value=${sessionFilter} onInput=${e => setSessionFilter(e.target.value)}/>
        </div>
        <div class="cdb-sessions-list">
          ${filteredSessions.length === 0
            ? html`<div class="cdb-empty-list">No active sessions</div>`
            : filteredSessions.map(s => {
                const id      = s.session_id || s.id || '';
                const shortId = String(id).split(':').pop();
                const isSel   = id === selectedId;
                const color   = toolColor(s._tool);
                return html`<div key=${id}
                  class=${'c-row c-row--list' + (isSel ? ' is-selected' : '')}
                  onClick=${() => handleSelectSession(s)}
                  role="button" tabIndex=${0}
                  onKeyDown=${e => e.key === 'Enter' && handleSelectSession(s)}>
                  <div class="cdb-session-row-head">
                    <${ToolIcon} tool=${s._tool} size="0.85em"/>
                    <span class="cdb-session-id">${shortId}</span>
                    ${s.active !== false && html`<span class="cdb-live-badge">\u25CF Live</span>`}
                  </div>
                  <div class="cdb-session-meta">
                    ${s._toolLabel} \u00b7 ${fmtK(s.estimated_tokens || s.tokens || 0)} tok
                    ${s.files_modified > 0 ? ` \u00b7 ${s.files_modified}f` : ''}
                    ${s.duration_s > 0 ? ` \u00b7 ${fmtDurSec(s.duration_s)}` : ''}
                    \u00b7 ${fmtAgo(s.last_seen_at || s.started_at) || '\u2014'}
                  </div>
                </div>`;
              })}
        </div>
      </div>

      <!-- Center: event timeline -->
      <div class="cdb-center">
        <div class="cdb-center-head">
          <div>
            <div class="c-overline c-overline--wide">The session</div>
            ${selectedObj
              ? html`<div class="cdb-center-title">
                  <span style="color:${toolColor(selectedObj._tool)}">\u25CF</span>
                  ${' '}${selectedObj._toolLabel}
                  ${' '}
                  <span class="cdb-center-id">
                    ${String(selectedObj.session_id || selectedObj.id || '').split(':').pop()}
                  </span>
                </div>`
              : html`<div class="cdb-center-title cdb-center-title--empty">Select a session</div>`}
          </div>
          <div class="c-filter-wrap cdb-filter-wrap">
            <span class="c-filter-icon" aria-hidden="true">\u2315</span>
            <input class="c-filter-input" type="text" placeholder="Filter events\u2026"
              aria-label="Filter events"
              value=${eventFilter} onInput=${e => setEventFilter(e.target.value)}/>
            ${allEvents.length > 0 && html`<span class="cdb-ev-count">
              ${filteredEvents.length}/${allEvents.length}
            </span>`}
          </div>
        </div>

        <div class="cdb-timeline">
          ${!selectedObj
            ? html`<div class="cdb-empty-center">
                <div class="c-overline cdb-empty-center-label">No session selected</div>
                <div>Choose a session in the left pane.</div>
              </div>`
            : flowLoading
              ? html`<div class="cdb-timeline-loading">Loading events\u2026</div>`
              : filteredEvents.length === 0
                ? html`<div class="cdb-timeline-loading">
                    ${allEvents.length === 0 ? 'No event data for this session.' : 'No events match filter.'}
                  </div>`
                : html`<div>
                    ${filteredEvents.map((ev, i) => html`<${TimelineEvent}
                      key=${ev.id} ev=${ev}
                      selected=${ev.id === selectedEvent}
                      onClick=${() => handleSelectEvent(ev)}
                      isLast=${i === filteredEvents.length - 1}/>`)}
                    <div class="c-overline c-overline--wide cdb-timeline-end">\u00b7 end of session \u00b7</div>
                  </div>`}
        </div>
      </div>

      <!-- Right: event inspector -->
      <div class="cdb-right">
        <${EventInspector} event=${selectedEvObj}/>
      </div>
    </div>
  </div>`;
}
