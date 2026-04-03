import { useState, useEffect, useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, esc, COLORS, ICONS } from '../utils.js';
import * as api from '../api.js';

// ─── Formatting helpers ──────────────────────────────────────
function fmtDur(ms) {
  if (ms == null || isNaN(ms) || ms <= 0) return '';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  if (m < 60) return m + 'm ' + (sec % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

function fmtDurSec(sec) {
  if (sec == null || isNaN(sec)) return '\u2014';
  const s = Math.round(sec);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

function fmtHHMM(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {hourCycle:'h23', hour:'2-digit', minute:'2-digit'});
}

function fmtHHMMSS(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {hourCycle:'h23', hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

function shortModel(m) {
  if (!m) return '';
  return m.replace('claude-', '').replace(/-\d{8}$/, '');
}

// ─── Extract concrete args from tool_parameters JSON ────────────
// Shows the actual command, file path, or pattern — not just "Bash"
function extractToolArgs(toolName, params) {
  if (!params) return '';
  let parsed = params;
  if (typeof params === 'string') {
    try { parsed = JSON.parse(params); } catch { return params.slice(0, 80); }
  }
  if (typeof parsed !== 'object' || parsed === null) return String(params).slice(0, 80);
  // Extract the most meaningful field based on tool type
  const keyPriority = [
    'command',       // Bash: the actual shell command
    'file_path',     // Read/Edit/Write: the file being operated on
    'pattern',       // Grep/Glob: the search pattern
    'query',         // search queries
    'path',          // directory paths
    'url',           // WebFetch
    'prompt',        // Agent/subagent task description
    'description',   // Agent description
    'old_string',    // Edit: what's being replaced
    'content',       // Write: content preview
    'skill',         // Skill invocation name
  ];
  for (const key of keyPriority) {
    if (parsed[key]) {
      let val = String(parsed[key]);
      // For file paths, show just the filename if it's a long path
      if ((key === 'file_path' || key === 'path') && val.length > 60) {
        const parts = val.replace(/\\/g, '/').split('/');
        val = '.../' + parts.slice(-2).join('/');
      }
      return val.slice(0, 100);
    }
  }
  // Fallback: show first key-value pair
  const keys = Object.keys(parsed);
  if (keys.length > 0) {
    const v = String(parsed[keys[0]]);
    return v.slice(0, 80);
  }
  return '';
}

// ─── Participant discovery ──────────────────────────────────────
// Discover unique participants (swimlane columns) from events
const PARTICIPANT_ORDER = ['user', 'tool', 'api', 'subagent'];
const PARTICIPANT_LABELS = {
  user: 'User', api: 'API',
};
const PARTICIPANT_COLORS = {
  user: 'var(--green)', api: 'var(--accent)',
  subagent: 'var(--yellow)',
};

// Palette for tool/skill participants — consistent per name via hash
const _SF_PALETTE = [
  '#f97316','#a78bfa','#60a5fa','#f472b6',
  '#34d399','#fbbf24','#06b6d4','#84cc16',
  '#e11d48','#0ea5e9','#c084fc','#fb923c',
];
const _SF_FIXED = { Bash: '#1a1a1a' };
function sfColor(name) {
  if (_SF_FIXED[name]) return _SF_FIXED[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return _SF_PALETTE[h % _SF_PALETTE.length];
}

function discoverParticipants(turns, toolName) {
  const seen = new Set();
  const participants = [];
  const add = (id, label, color) => {
    if (seen.has(id)) return;
    seen.add(id);
    participants.push({id, label: label || id, color: color || 'var(--fg2)'});
  };

  // Always have user + tool
  add('user', 'User', 'var(--green)');
  add('tool', toolName || 'AI Tool', COLORS[toolName] || 'var(--accent)');

  // Scan events for other participants
  for (const t of turns) {
    if (t.type === 'api_call' || t.type === 'api_response' || t.type === 'error') add('api', 'API', 'var(--accent)');
    if (t.type === 'tool_use') {
      const name = t.to || 'tool';
      add('skill:' + name, name, sfColor(name));
    }
    if (t.type === 'subagent') {
      const name = t.to || 'Subagent';
      add('subagent:' + name, name, sfColor(name));
    }
    if (t.type === 'hook') {
      add('hook', 'Hooks', 'var(--orange)');
    }
  }
  return participants;
}

// ─── Tool tabs (top row per AI tool) ────────────────────────────
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

// ─── Short session label — PID for correlator IDs, last 6 chars otherwise ──
function shortSid(sid) {
  if (!sid) return '';
  // Correlator format: "tool:pid:ts"  → show pid
  const parts = sid.split(':');
  if (parts.length === 3 && /^\d+$/.test(parts[1])) return parts[1];
  // UUID / hex → last 6 chars
  return sid.slice(-6);
}

// ─── Session tabs (within a tool) ───────────────────────────────
function SessionTabs({sessions, activeId, onSelect, loading}) {
  if (loading) return html`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`;
  if (!sessions.length) return html`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`;

  return html`<div class="sf-sess-tabs">
    ${sessions.map(s => {
      const inTok = s.exact_input_tokens || s.input_tokens || 0;
      const outTok = s.exact_output_tokens || s.output_tokens || 0;
      const tok = inTok + outTok;
      const dur = s.duration_s || (s.ended_at && s.started_at ? s.ended_at - s.started_at : 0);
      const isActive = s.session_id === activeId;
      const isLive = !s.ended_at;

      return html`<button key=${s.session_id}
        title=${s.session_id}
        class="sf-sess-tab ${isActive ? 'active' : ''}"
        onClick=${() => onSelect(s.session_id)}>
        <span class="sf-stab-time">${fmtHHMM(s.started_at)}</span>
        <span class="sf-stab-sid">${shortSid(s.session_id)}</span>
        <span class="sf-stab-dur">${fmtDurSec(dur)}</span>
        ${tok > 0 && html`<span class="sf-stab-tok">${fmtK(tok)}t</span>`}
        ${(s.files_modified || 0) > 0 && html`<span class="sf-stab-files">${s.files_modified}f</span>`}
        ${isLive && html`<span class="sf-stab-live">\u25CF</span>`}
      </button>`;
    })}
  </div>`;
}

// ─── Tooltip for hovered events ─────────────────────────────────
function SeqTooltip({event}) {
  if (event.type === 'user_message') {
    if (event.redacted) {
      return html`<div class="sf-seq-tooltip">
        <div class="sf-tip-label">User Prompt <span style="color:var(--orange)">(redacted)</span></div>
        <div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">
          Claude Code redacts prompts by default in OTel telemetry.
        </div>
        <div class="sf-tip-meta">
          To capture prompt text, restart Claude Code with:<br/>
          <code style="color:var(--accent)">eval $(aictl otel enable)</code><br/>
          This sets <code>OTEL_LOG_USER_PROMPTS=1</code> before launch.
        </div>
        ${event.prompt_length && html`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">Prompt length: ${event.prompt_length} chars</div>`}
      </div>`;
    }
    if (!event.message) return null;
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">User Prompt</div>
      <div class="sf-tip-body">${esc(event.message)}</div>
      ${event.prompt_length && html`<div class="sf-tip-meta">${event.prompt_length} chars</div>`}
    </div>`;
  }
  if (event.type === 'api_call') {
    const tok = event.tokens || {};
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${event.model ? ' \u2014 ' + event.model : ''}</div>
      ${event.agent_name && html`<div class="sf-tip-meta">Agent: ${esc(event.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${fmtK(tok.input || 0)} \u00B7 Output: ${fmtK(tok.output || 0)}
        ${(tok.cache_read || 0) > 0 ? ' \u00B7 Cache: ' + fmtK(tok.cache_read) : ''}
      </div>
      <div class="sf-tip-meta">
        ${event.duration_ms > 0 ? 'Duration: ' + fmtDur(event.duration_ms) : ''}
        ${event.ttft_ms > 0 ? ' \u00B7 TTFT: ' + fmtDur(event.ttft_ms) : ''}
      </div>
      ${event.is_error && html`<div class="sf-tip-meta" style="color:var(--red)">Error: ${esc(event.error_type || 'unknown')}</div>`}
    </div>`;
  }
  if (event.type === 'api_response') {
    const tok = event.tokens || {};
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${event.model ? ' \u2014 ' + event.model : ''}</div>
      <div class="sf-tip-meta">
        Output: ${fmtK(tok.output || 0)} tokens
        ${event.duration_ms > 0 ? ' \u00B7 Latency: ' + fmtDur(event.duration_ms) : ''}
        ${event.finish_reason ? ' \u00B7 ' + event.finish_reason : ''}
      </div>
      ${event.response_preview && html`<div class="sf-tip-body">${esc(event.response_preview)}</div>`}
    </div>`;
  }
  if (event.type === 'error') {
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${esc(event.error_type || 'unknown')}</div>
      ${event.error_message && html`<div class="sf-tip-body">${esc(event.error_message)}</div>`}
      ${event.parent_span && html`<div class="sf-tip-meta">During: ${esc(event.parent_span)}</div>`}
    </div>`;
  }
  if (event.type === 'tool_use') {
    // Parse params for structured display
    let paramDisplay = null;
    if (event.params) {
      let parsed = event.params;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = null; }
      }
      if (parsed && typeof parsed === 'object') {
        paramDisplay = Object.entries(parsed).filter(([_, v]) => v != null && v !== '');
      }
    }
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${esc(event.to || 'Tool')}${event.subtype === 'result' ? ' (result)' : event.subtype === 'decision' ? ' (decision)' : ''}</div>
      ${event.decision && html`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${esc(event.decision)}</strong></div>`}
      ${paramDisplay
        ? html`<div class="sf-tip-params">
            ${paramDisplay.map(([k, v]) => {
              const val = String(v);
              const isLong = val.length > 120;
              return html`<div key=${k} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${esc(k)}</span>
                <span class="sf-tip-param-val ${isLong ? 'sf-tip-param-long' : ''}" title=${val}>${esc(isLong ? val.slice(0, 200) + '...' : val)}</span>
              </div>`;
            })}
          </div>`
        : event.params && html`<div class="sf-tip-body mono">${esc(event.params)}</div>`}
      ${(event.success || event.duration_ms > 0 || event.result_size) && html`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${event.success ? 'Success: ' + event.success : ''}
        ${event.duration_ms > 0 ? ' \u00B7 ' + fmtDur(event.duration_ms) : ''}
        ${event.result_size ? ' \u00B7 Result: ' + event.result_size + ' bytes' : ''}
      </div>`}
    </div>`;
  }
  if (event.type === 'subagent') {
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${esc(event.to || 'agent')}</div>
    </div>`;
  }
  if (event.type === 'hook') {
    return html`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${esc(event.hook_name || '')}</div>
    </div>`;
  }
  return null;
}

// ─── Sequence diagram arrow ─────────────────────────────────────
function SeqArrow({event, participants, hoveredIdx, idx, onHover}) {
  const fromIdx = participants.findIndex(p => p.id === event._from);
  const toIdx = participants.findIndex(p => p.id === event._to);
  if (fromIdx < 0 || toIdx < 0) return null;

  const isRight = toIdx > fromIdx;
  const left = Math.min(fromIdx, toIdx);
  const right = Math.max(fromIdx, toIdx);
  const span = right - left;
  const isHovered = hoveredIdx === idx;

  // Arrow color — tool_use/subagent use the destination participant's color
  const destParticipant = participants.find(p => p.id === event._to);
  const colors = {
    user_message: 'var(--green)',
    api_call: event.is_error ? 'var(--red)' : 'var(--accent)',
    api_response: 'var(--green)',
    error: 'var(--red)',
    tool_use: destParticipant?.color || 'var(--cat-commands)',
    subagent: destParticipant?.color || 'var(--yellow)',
    hook: 'var(--orange)',
  };
  const color = colors[event.type] || 'var(--fg2)';

  // Label on the arrow — show concrete values, not just tool names
  let label = '';
  let sublabel = '';
  if (event.type === 'user_message') {
    if (event.redacted) {
      label = '\u{1F512} prompt (' + (event.prompt_length || '?') + ' chars)';
    } else {
      label = event.preview || '(prompt)';
      if (event.prompt_length) sublabel = event.prompt_length + ' chars';
    }
  } else if (event.type === 'api_call') {
    const tok = event.tokens || {};
    label = event.agent_name || shortModel(event.model) || 'API call';
    sublabel = fmtK((tok.input || 0) + (tok.output || 0)) + 't';
    if (event.ttft_ms > 0) sublabel += ' ttft:' + fmtDur(event.ttft_ms);
    else if (event.duration_ms > 0) sublabel += ' ' + fmtDur(event.duration_ms);
    if (event.is_error) sublabel += ' \u26A0';
  } else if (event.type === 'api_response') {
    const tok = event.tokens || {};
    label = '\u2190 ' + fmtK(tok.output || 0) + 't';
    if (event.response_preview) {
      label += ' ' + event.response_preview.slice(0, 60);
    }
    sublabel = shortModel(event.model) || '';
    if (event.finish_reason && event.finish_reason !== 'stop') sublabel += ' [' + event.finish_reason + ']';
  } else if (event.type === 'error') {
    label = '\u26A0 ' + (event.error_type || 'error');
    sublabel = event.error_message ? event.error_message.slice(0, 60) : '';
  } else if (event.type === 'tool_use') {
    const toolName = event.to || 'tool';
    // Extract concrete value from params (JSON string from OTel)
    const argsSummary = extractToolArgs(toolName, event.params);
    label = toolName + (argsSummary ? ': ' + argsSummary : '');
    if (event.subtype === 'result') {
      sublabel = (event.success === 'true' || event.success === true ? '\u2713' : '\u2717');
      if (event.duration_ms > 0) sublabel += ' ' + fmtDur(event.duration_ms);
      if (event.result_size) sublabel += ' ' + event.result_size + 'B';
    } else if (event.subtype === 'decision') {
      sublabel = event.decision || '';
    }
  } else if (event.type === 'subagent') {
    label = event.to || 'subagent';
  } else if (event.type === 'hook') {
    label = event.hook_name || 'hook';
  }

  const colW = 100 / participants.length;
  const arrowLeft = (left + 0.5) * colW;
  const arrowRight = (right + 0.5) * colW;

  return html`<div class="sf-seq-row ${isHovered ? 'hovered' : ''}"
    onMouseEnter=${() => onHover(idx)} onMouseLeave=${() => onHover(null)}>
    <!-- Token columns (left side) -->
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${event._cumTok > 0 ? fmtK(event._cumTok) : ''}</span>
      <span class="sf-seq-rttok">${event._rtTok > 0 ? fmtK(event._rtTok) : ''}</span>
    </div>
    <!-- Time -->
    <div class="sf-seq-time">${fmtHHMMSS(event.ts)}</div>
    <!-- Arrow area -->
    <div class="sf-seq-arrow-area">
      <!-- Swimlane lines -->
      ${participants.map((_, i) => html`<div key=${i} class="sf-seq-lane"
        style="left:${(i + 0.5) * colW}%"></div>`)}
      <!-- Arrow line -->
      <div class="sf-seq-arrow-line" style="
        left:${arrowLeft}%;
        width:${(arrowRight - arrowLeft)}%;
        border-color:${color};
      "></div>
      <!-- Arrowhead -->
      <div class="sf-seq-arrowhead" style="
        left:${isRight ? arrowRight : arrowLeft}%;
        border-${isRight ? 'left' : 'right'}-color:${color};
        transform:translateX(${isRight ? '-100%' : '0'});
      "></div>
      <!-- Label -->
      <div class="sf-seq-label" style="
        left:${((arrowLeft + arrowRight) / 2)}%;
        color:${color};
      "><span class="sf-seq-label-text" title=${label}>${esc(label)}</span>
        ${sublabel && html`<span class="sf-seq-sublabel">${sublabel}</span>`}
      </div>
    </div>
    <!-- Hover tooltip -->
    ${isHovered && html`<${SeqTooltip} event=${event}/>`}
  </div>`;
}

// ─── Sequence diagram marker row (session start/end, compaction) ─
function SeqMarker({event, participants}) {
  const colW = 100 / participants.length;
  let label = '', color = 'var(--fg2)', icon = '';
  if (event.type === 'session_start') {
    label = 'Session started'; color = 'var(--green)'; icon = '\u25B6';
  } else if (event.type === 'session_end') {
    label = 'Session ended'; color = 'var(--fg3)'; icon = '\u25A0';
  } else if (event.type === 'compaction') {
    label = 'Compaction' + (event.compaction_count ? ' #' + event.compaction_count : '');
    color = 'var(--orange)'; icon = '\u27F3';
  }

  return html`<div class="sf-seq-marker" style="border-left-color:${color}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${fmtHHMMSS(event.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${color}">
      ${icon} ${label}
      ${event.type === 'compaction' && event.duration_ms > 0 ? ' \u2014 ' + fmtDur(event.duration_ms) : ''}
      ${event.cwd ? html` <span class="text-muted text-xs mono">${esc(event.cwd)}</span>` : ''}
    </div>
  </div>`;
}

// ─── Summary bar ────────────────────────────────────────────────
function SummaryBar({summary}) {
  if (!summary || !summary.event_count) return null;
  return html`<div class="sf-summary">
    ${summary.total_turns > 0 && html`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${summary.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${summary.total_api_calls || 0}</div></div>
    ${summary.total_tool_uses > 0 && html`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${summary.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${fmtK(summary.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${fmtK(summary.total_input_tokens)}/${fmtK(summary.total_output_tokens)}</div></div>
    ${summary.compactions > 0 && html`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${summary.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${fmtDurSec(summary.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${summary.event_count}</div></div>
  </div>`;
}

// ─── Main TabSessionFlow component ──────────────────────────────
export default function TabSessionFlow() {
  const {snap: s, globalRange, enabledTools} = useContext(SnapContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

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

  // Derive tools and filtered sessions
  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);
  const filteredSessions = sessions.filter(sess => toolMatch(sess.tool));
  const tools = [...new Set(filteredSessions.map(s => s.tool))].sort();

  // Auto-select first tool
  useEffect(() => {
    if (!activeTool && tools.length > 0) setActiveTool(tools[0]);
    else if (activeTool && !tools.includes(activeTool) && tools.length > 0) setActiveTool(tools[0]);
  }, [tools.join(',')]);

  const toolSessions = filteredSessions.filter(s => s.tool === activeTool);

  // Auto-select first session of active tool
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

  // Process turns: assign _from/_to and compute running token totals
  const {processedTurns, participants} = useMemo(() => {
    const turns = flowData?.turns || [];
    if (!turns.length) return {processedTurns: [], participants: []};

    // Normalize _from/_to for arrow rendering
    const processed = turns.map(t => {
      const ev = {...t};
      if (t.type === 'user_message') {
        ev._from = 'user'; ev._to = 'tool';
      } else if (t.type === 'api_call') {
        ev._from = t.from || 'tool'; ev._to = 'api';
      } else if (t.type === 'api_response') {
        ev._from = 'api'; ev._to = 'tool';
      } else if (t.type === 'error') {
        ev._from = 'api'; ev._to = 'tool';
      } else if (t.type === 'tool_use') {
        ev._from = 'tool'; ev._to = 'skill:' + (t.to || 'tool');
      } else if (t.type === 'subagent') {
        ev._from = 'tool'; ev._to = 'subagent:' + (t.to || 'agent');
      } else if (t.type === 'hook') {
        ev._from = 'tool'; ev._to = 'hook';
      }
      return ev;
    });

    // Compute cumulative and round-trip token columns
    let cumTok = 0;
    let rtTok = 0;
    for (const ev of processed) {
      const tok = ev.tokens || {};
      const total = (tok.input || 0) + (tok.output || 0);
      if (ev.type === 'user_message') {
        rtTok = 0; // reset on user message
      }
      if (ev.type === 'api_call') {
        cumTok += total;
        rtTok += total;
      }
      ev._cumTok = cumTok;
      ev._rtTok = rtTok;
    }

    const parts = discoverParticipants(processed, activeTool);
    return {processedTurns: processed, participants: parts};
  }, [flowData, activeTool]);

  const summary = flowData?.summary || {};
  const arrowEvents = processedTurns.filter(t => t._from && t._to);
  const markerEvents = processedTurns.filter(t => !t._from || !t._to);

  return html`<div class="sf-container">
    <!-- Tool tabs -->
    <${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>

    <!-- Session tabs -->
    <${SessionTabs} sessions=${toolSessions} activeId=${activeSessionId}
      onSelect=${setActiveSessionId} loading=${loading}/>

    <!-- Summary -->
    <${SummaryBar} summary=${summary}/>

    <!-- Sequence diagram -->
    <div class="sf-seq-container">
      ${flowLoading
        ? html`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`
        : processedTurns.length === 0
          ? html`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`
          : html`
            <!-- Participant headers (swimlane columns) -->
            <div class="sf-seq-header">
              <div class="sf-seq-tokens">
                <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
              </div>
              <div class="sf-seq-time"></div>
              <div class="sf-seq-arrow-area">
                ${participants.map((p, i) => {
                  const colW = 100 / participants.length;
                  return html`<div key=${p.id} class="sf-seq-participant"
                    style="left:${(i + 0.5) * colW}%;color:${p.color}">
                    <div class="sf-seq-participant-box" style="border-color:${p.color}">${esc(p.label)}</div>
                  </div>`;
                })}
              </div>
            </div>
            <!-- Event rows -->
            <div class="sf-seq-body">
              ${processedTurns.map((ev, idx) => {
                if (ev._from && ev._to) {
                  return html`<${SeqArrow} key=${idx} event=${ev} participants=${participants}
                    hoveredIdx=${hoveredIdx} idx=${idx} onHover=${setHoveredIdx}/>`;
                }
                return html`<${SeqMarker} key=${idx} event=${ev} participants=${participants}/>`;
              })}
            </div>
          `}
    </div>
  </div>`;
}
