import { useState, useContext, useMemo, useEffect, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, fmtK, fmtSz } from '../utils.js';
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
function Stat({ label, value }) {
  return html`<div class="cdb-stat">
    <div class="cdb-stat-label">${label}</div>
    <div class="cdb-stat-row">
      <span class="cdb-stat-value">${value}</span>
    </div>
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
      <div class="cdb-inspector-empty-label">No selection</div>
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
      <div class="cdb-inspector-overline" style="color:${lc}">
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

      <div class="cdb-inspector-section-head">Input</div>
      <pre class="cdb-inspector-code">${inputText}</pre>

      <div class="cdb-inspector-section-head">Output</div>
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

  // Aggregate stats
  const stats = useMemo(() => {
    if (!snap) return { sessions: 0, processes: 0, tokens: 0, tools: 0, files: 0, mcp: 0 };
    let sessions = 0, processes = 0, tokens = 0, tools = 0, files = 0, mcp = 0;
    for (const t of snap.tools || []) {
      const l = t.live || {};
      sessions  += l.session_count || 0;
      processes += l.pid_count || (t.processes || []).length || 0;
      tokens    += l.token_estimate || 0;
      if ((l.pid_count || 0) > 0) tools++;
      files += l.files_touched || 0;
      mcp   += (t.mcp_servers || []).length;
    }
    return { sessions, processes, tokens, tools, files, mcp };
  }, [snap]);

  // Flatten all sessions from all tools
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
    if (!sessionFilter) return allSessions;
    const q = sessionFilter.toLowerCase();
    return allSessions.filter(s => {
      const id = String(s.session_id || s.id || '');
      return id.toLowerCase().includes(q)
        || (s._toolLabel || '').toLowerCase().includes(q)
        || (s.workspace || s.project || '').toLowerCase().includes(q);
    });
  }, [allSessions, sessionFilter]);

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
        <div class="cdb-filter-wrap cdb-filter-wrap--sm">
          <span class="cdb-filter-icon" aria-hidden="true">\u2315</span>
          <input class="cdb-filter-input" type="text" placeholder="Filter\u2026"
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
                  class=${'cdb-session-row' + (isSel ? ' is-selected' : '')}
                  onClick=${() => handleSelectSession(s)}
                  role="button" tabIndex=${0}
                  onKeyDown=${e => e.key === 'Enter' && handleSelectSession(s)}>
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

      <!-- Center: event timeline -->
      <div class="cdb-center">
        <div class="cdb-center-head">
          <div>
            <div class="cdb-center-overline">The session</div>
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
          <div class="cdb-filter-wrap">
            <span class="cdb-filter-icon" aria-hidden="true">\u2315</span>
            <input class="cdb-filter-input" type="text" placeholder="Filter events\u2026"
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
                <div class="cdb-empty-center-label">No session selected</div>
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
                    <div class="cdb-timeline-end">\u00b7 end of session \u00b7</div>
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
