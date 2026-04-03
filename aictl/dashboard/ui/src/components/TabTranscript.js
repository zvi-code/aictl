import { useState, useEffect, useContext, useMemo, useCallback } from 'preact/hooks';
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

function fmtHHMMSS(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function shortModel(m) {
  if (!m) return '';
  return m.replace('claude-', '').replace('gpt-', '').replace(/-\d{8}$/, '');
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ─── Action icons ────────────────────────────────────────────

const ACTION_ICONS = {
  tool_use: '🔧',
  api_call: '🌐',
  api_response: '📨',
  file_edit: '📝',
  compaction: '🗜️',
  subagent: '🤖',
  error: '❌',
};

const ACTION_COLORS = {
  tool_use: 'var(--accent)',
  api_call: 'var(--green)',
  api_response: 'var(--fg2)',
  file_edit: 'var(--orange)',
  compaction: 'var(--yellow)',
  subagent: 'var(--accent)',
  error: 'var(--red)',
};

// ─── ToolTabs component ──────────────────────────────────────

function ToolTabs({ tools, activeTool, onSelect }) {
  if (!tools.length) return null;
  return html`<div class="sf-tool-tabs" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap">
    ${tools.map(t => html`<button key=${t}
      class="chip ${t === activeTool ? 'chip-active' : ''}"
      onClick=${() => onSelect(t)}
      style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-4)">
      ${esc(t)}
    </button>`)}
  </div>`;
}

// ─── SessionSelector ─────────────────────────────────────────

function SessionSelector({ sessions, activeId, onSelect, loading }) {
  if (loading) return html`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions…</div>`;
  if (!sessions.length) return html`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`;
  return html`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${sessions.slice(0, 20).map(s => {
      const isActive = s.session_id === activeId;
      const duration = s.ended_at ? Math.round(s.ended_at - s.started_at) : 0;
      const durLabel = duration > 0 ? fmtDur(duration * 1000) : '⏳ live';
      const timeLabel = fmtHHMMSS(s.started_at);
      return html`<button key=${s.session_id}
        class="tr-sess-btn ${isActive ? 'tr-sess-active' : ''}"
        onClick=${() => onSelect(s.session_id)}
        title=${s.session_id}>
        <span class="tr-sess-time">${timeLabel}</span>
        <span class="tr-sess-dur">${durLabel}</span>
        ${s.is_live ? html`<span class="tr-sess-live">●</span>` : null}
      </button>`;
    })}
  </div>`;
}

// ─── TurnCard ────────────────────────────────────────────────

function TurnCard({ turn, index, expanded, onToggle }) {
  const hasPrompt = turn.prompt && turn.prompt.length > 0;
  const actions = turn.actions || [];
  const toolUses = actions.filter(a => a.kind === 'tool_use');
  const apiCalls = actions.filter(a => a.kind === 'api_call');
  const errors = actions.filter(a => a.kind === 'error');
  const tokens = turn.tokens || {};
  const totalTok = (tokens.input || 0) + (tokens.output || 0);
  const wallMs = turn.wall_ms || turn.duration_ms || 0;

  return html`<div class="tr-turn ${expanded ? 'tr-turn-expanded' : ''}">
    <!-- Turn header (always visible) -->
    <div class="tr-turn-header" onClick=${onToggle}>
      <div class="tr-turn-num">${index + 1}</div>
      <div class="tr-turn-meta">
        <span class="tr-turn-time">${fmtHHMMSS(turn.ts)}</span>
        ${turn.model ? html`<span class="tr-turn-model">${shortModel(turn.model)}</span>` : null}
        ${wallMs > 0 ? html`<span class="tr-turn-dur">${fmtDur(wallMs)}</span>` : null}
      </div>
      <div class="tr-turn-stats">
        ${totalTok > 0 ? html`<span class="tr-stat" title="Tokens">🪙 ${fmtK(totalTok)}</span>` : null}
        ${toolUses.length > 0 ? html`<span class="tr-stat" title="Tool uses">🔧 ${toolUses.length}</span>` : null}
        ${apiCalls.length > 0 ? html`<span class="tr-stat" title="API calls">🌐 ${apiCalls.length}</span>` : null}
        ${errors.length > 0 ? html`<span class="tr-stat tr-stat-err" title="Errors">❌ ${errors.length}</span>` : null}
      </div>
      <div class="tr-turn-chevron">${expanded ? '▾' : '▸'}</div>
    </div>

    <!-- Prompt (always visible as preview, full when expanded) -->
    ${hasPrompt ? html`<div class="tr-prompt ${expanded ? 'tr-prompt-full' : ''}">
      <div class="tr-prompt-icon">👤</div>
      <div class="tr-prompt-text">${expanded ? turn.prompt : truncate(turn.prompt_preview || turn.prompt, 120)}</div>
    </div>` : html`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon">👤</div>
      <div class="tr-prompt-text text-muted">(no prompt captured)</div>
    </div>`}

    <!-- Expanded: action timeline + token breakdown -->
    ${expanded && actions.length > 0 ? html`<div class="tr-actions">
      ${actions.map((a, i) => html`<${ActionRow} key=${i} action=${a} turnTs=${turn.ts}/>`)}
    </div>` : null}

    <!-- Expanded: token breakdown -->
    ${expanded && totalTok > 0 ? html`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${tokens.input || 0}" title="Input: ${fmtK(tokens.input || 0)}">
        ${tokens.input > 0 ? 'in ' + fmtK(tokens.input) : ''}
      </div>
      ${tokens.cache_read > 0 ? html`<div class="tr-token-seg tr-tok-cache"
        style="flex:${tokens.cache_read}" title="Cache read: ${fmtK(tokens.cache_read)}">
        cache ${fmtK(tokens.cache_read)}
      </div>` : null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${tokens.output || 0}" title="Output: ${fmtK(tokens.output || 0)}">
        ${tokens.output > 0 ? 'out ' + fmtK(tokens.output) : ''}
      </div>
    </div>` : null}
  </div>`;
}

// ─── ActionRow ───────────────────────────────────────────────

function ActionRow({ action, turnTs }) {
  const icon = ACTION_ICONS[action.kind] || '•';
  const color = ACTION_COLORS[action.kind] || 'var(--fg2)';
  const offset = action.ts - turnTs;
  const offsetLabel = offset > 0 ? '+' + (offset < 1 ? offset.toFixed(1) : Math.round(offset)) + 's' : '';
  const dur = action.duration_ms > 0 ? fmtDur(action.duration_ms) : '';
  const tokens = action.tokens;
  const tokLabel = tokens ? fmtK((tokens.input || 0) + (tokens.output || 0)) : '';

  return html`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${color}">${icon}</span>
    <span class="tr-action-name" style="color:${color}">${esc(action.name || action.kind)}</span>
    ${action.input_summary ? html`<span class="tr-action-args">${esc(truncate(action.input_summary, 80))}</span>` : null}
    ${action.output_summary ? html`<span class="tr-action-result">${esc(truncate(action.output_summary, 60))}</span>` : null}
    <span class="tr-action-meta">
      ${offsetLabel ? html`<span class="tr-action-offset">${offsetLabel}</span>` : null}
      ${dur ? html`<span class="tr-action-dur">${dur}</span>` : null}
      ${tokLabel ? html`<span class="tr-action-tok">🪙 ${tokLabel}</span>` : null}
      ${action.success === false ? html`<span class="tr-action-fail">✗</span>` : null}
      ${action.success === true ? html`<span class="tr-action-ok">✓</span>` : null}
    </span>
  </div>`;
}

// ─── SummaryHeader ───────────────────────────────────────────

function SummaryHeader({ summary, transcript }) {
  if (!summary) return null;
  return html`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns">💬 ${summary.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls">🌐 ${summary.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses">🔧 ${summary.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens">🪙 ${fmtK(summary.total_tokens || 0)}</span>
    ${summary.compactions > 0 ? html`<span class="tr-summary-item" title="Compactions">🗜️ ${summary.compactions}</span>` : null}
    ${summary.errors > 0 ? html`<span class="tr-summary-item tr-stat-err" title="Errors">❌ ${summary.errors}</span>` : null}
    ${summary.subagents > 0 ? html`<span class="tr-summary-item" title="Subagents">🤖 ${summary.subagents}</span>` : null}
    ${summary.duration_s > 0 ? html`<span class="tr-summary-item" title="Duration">⏱️ ${fmtDur(summary.duration_s * 1000)}</span>` : null}
    ${transcript?.model ? html`<span class="tr-summary-item" title="Model">🧠 ${shortModel(transcript.model)}</span>` : null}
    ${transcript?.is_live ? html`<span class="tr-summary-live">● LIVE</span>` : null}
    <span class="tr-summary-source">${summary.source || ''}</span>
  </div>`;
}

// ─── Main Component ──────────────────────────────────────────

export default function TabTranscript() {
  const { snap: s, globalRange, enabledTools } = useContext(SnapContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch session list
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

  // Auto-select first session
  useEffect(() => {
    if (toolSessions.length > 0 && (!activeSessionId || !toolSessions.find(s => s.session_id === activeSessionId))) {
      setActiveSessionId(toolSessions[0].session_id);
    }
  }, [activeTool, toolSessions.length]);

  // Fetch transcript
  const fetchTranscript = useCallback(() => {
    if (!activeSessionId) { setTranscript(null); return; }
    setTranscriptLoading(true);
    api.getTranscript(activeSessionId)
      .then(data => {
        // Detect session-flow format (flat events with "type" field)
        // vs transcript format (grouped turns with "prompt"/"actions")
        if (isSessionFlowFormat(data)) {
          setTranscript(normalizeFlowToTranscript(data, activeSessionId));
        } else {
          setTranscript(data);
        }
        setTranscriptLoading(false);
      })
      .catch(() => {
        // Fall back to session-flow API
        const sess = sessions.find(s => s.session_id === activeSessionId);
        const since = sess?.started_at ? sess.started_at - 60 : Date.now() / 1000 - 86400;
        const until = sess?.ended_at ? sess.ended_at + 60 : Date.now() / 1000 + 60;
        api.getSessionFlow(activeSessionId, since, until)
          .then(flow => {
            setTranscript(normalizeFlowToTranscript(flow, activeSessionId));
            setTranscriptLoading(false);
          })
          .catch(() => { setTranscript(null); setTranscriptLoading(false); });
      });
  }, [activeSessionId, sessions]);

  useEffect(fetchTranscript, [fetchTranscript]);

  // Auto-refresh for live sessions
  useEffect(() => {
    if (!autoRefresh || !transcript?.is_live) return;
    const timer = setInterval(fetchTranscript, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, transcript?.is_live, fetchTranscript]);

  // Toggle a single turn
  const toggleTurn = useCallback((idx) => {
    setExpandedTurns(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  // Expand/collapse all
  const toggleAll = useCallback(() => {
    const turns = transcript?.turns || [];
    if (expandAll) {
      setExpandedTurns(new Set());
      setExpandAll(false);
    } else {
      setExpandedTurns(new Set(turns.map((_, i) => i)));
      setExpandAll(true);
    }
  }, [expandAll, transcript]);

  // Extract turns — filter out empty ones (no prompt AND no actions)
  const turns = (transcript?.turns || []).filter(t =>
    (t.prompt && t.prompt.length > 0) || (t.actions && t.actions.length > 0)
    || (t.tool_use_count > 0)
  );
  const summary = transcript?.summary || null;

  return html`<div class="tr-container">
    <!-- Header -->
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${turns.length > 0 ? html`<button class="chip" onClick=${toggleAll}
          style="font-size:var(--fs-xs)">
          ${expandAll ? '⊟ Collapse all' : '⊞ Expand all'}
        </button>` : null}
        ${transcript?.is_live ? html`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${autoRefresh}
            onChange=${e => setAutoRefresh(e.target.checked)}/>
          Auto-refresh
        </label>` : null}
      </div>
    </div>

    <!-- Tool tabs -->
    <${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>

    <!-- Session selector -->
    <${SessionSelector} sessions=${toolSessions} activeId=${activeSessionId}
      onSelect=${setActiveSessionId} loading=${loading}/>

    <!-- Summary bar -->
    <${SummaryHeader} summary=${summary} transcript=${transcript}/>

    <!-- Turns list -->
    <div class="tr-turns">
      ${transcriptLoading
        ? html`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript…</div>`
        : turns.length === 0
          ? html`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                Prompts require hooks enabled: set <code>AICTL_URL</code> in your tool config
              </p>
            </div>`
          : turns.map((turn, i) => html`<${TurnCard}
              key=${i} turn=${turn} index=${i}
              expanded=${expandedTurns.has(i)}
              onToggle=${() => toggleTurn(i)}/>`)}
    </div>
  </div>`;
}

// ─── Format detection ────────────────────────────────────────

function isSessionFlowFormat(data) {
  if (!data || !data.turns || data.turns.length === 0) return false;
  // Session-flow format: flat events with "type" field (api_call, tool_use, etc.)
  // Transcript format: grouped turns with "prompt"/"actions" fields
  const first = data.turns[0];
  return (first.type != null && first.actions == null);
}

// ─── Normalize session-flow format to transcript-like ────────

function normalizeFlowToTranscript(flow, sessionId) {
  if (!flow || !flow.turns) return null;
  const rawTurns = flow.turns || [];

  // Group by user_message turns (each starts a new transcript turn)
  const turns = [];
  let current = null;

  const kindMap = {
    api_call: 'api_call',
    api_response: 'api_response',
    tool_use: 'tool_use',
    subagent: 'subagent',
    error: 'error',
    hook: 'tool_use',
  };

  for (const ev of rawTurns) {
    if (ev.type === 'user_message') {
      if (current) turns.push(current);
      current = {
        ts: ev.ts,
        end_ts: ev.end_ts || ev.ts,
        prompt: ev.message || '',
        prompt_preview: ev.preview || (ev.message || '').slice(0, 200),
        model: ev.model || '',
        tokens: ev.tokens || { input: 0, output: 0, cache_read: 0, cache_creation: 0, total: 0 },
        api_calls: ev.api_calls || 0,
        duration_ms: ev.duration_ms || 0,
        wall_ms: ev.wall_ms || 0,
        actions: [],
        tool_use_count: 0,
      };
      // Inline tools from hook-mode turns
      if (ev.tools && ev.tools.length > 0) {
        for (const t of ev.tools) {
          current.actions.push({
            ts: t.ts || ev.ts,
            kind: t.is_agent ? 'subagent' : 'tool_use',
            name: t.name || '',
            input_summary: t.args_summary || '',
            duration_ms: t.duration_ms || 0,
          });
        }
        current.tool_use_count = ev.tools.length;
      }
    } else if (ev.type === 'session_start' || ev.type === 'session_end') {
      // Skip lifecycle events — don't create turns for them
      continue;
    } else if (ev.type === 'compaction') {
      // Skip compaction events
      continue;
    } else if (current) {
      // Map flow event types to action kinds
      const kind = kindMap[ev.type];
      if (kind) {
        current.actions.push({
          ts: ev.ts,
          kind,
          name: ev.model || ev.to || ev.tool_name || ev.hook_name || '',
          input_summary: ev.params || ev.decision || '',
          output_summary: ev.response_preview || ev.error_message || '',
          duration_ms: ev.duration_ms || 0,
          tokens: ev.tokens,
          success: ev.success === 'true' ? true : ev.success === 'false' ? false : undefined,
        });
        if (kind === 'tool_use') current.tool_use_count++;
        if (kind === 'api_call' && ev.tokens) {
          current.tokens.input += ev.tokens.input || 0;
          current.tokens.output += ev.tokens.output || 0;
          current.tokens.cache_read += (ev.tokens.cache_read || 0);
          current.api_calls++;
        }
      }
    } else {
      // No current turn yet — for OTel sessions where api_calls arrive
      // before any user_message, create a synthetic turn
      const kind = kindMap[ev.type];
      if (kind && kind !== 'api_response') {
        current = {
          ts: ev.ts,
          end_ts: ev.ts,
          prompt: '',
          prompt_preview: '',
          model: ev.model || '',
          tokens: { input: 0, output: 0, cache_read: 0, cache_creation: 0, total: 0 },
          api_calls: 0,
          duration_ms: 0,
          wall_ms: 0,
          actions: [],
          tool_use_count: 0,
        };
        current.actions.push({
          ts: ev.ts,
          kind,
          name: ev.model || ev.to || ev.tool_name || '',
          input_summary: ev.params || ev.decision || '',
          output_summary: ev.response_preview || ev.error_message || '',
          duration_ms: ev.duration_ms || 0,
          tokens: ev.tokens,
          success: ev.success === 'true' ? true : ev.success === 'false' ? false : undefined,
        });
        if (kind === 'tool_use') current.tool_use_count++;
        if (kind === 'api_call' && ev.tokens) {
          current.tokens.input += ev.tokens.input || 0;
          current.tokens.output += ev.tokens.output || 0;
          current.tokens.cache_read += (ev.tokens.cache_read || 0);
          current.api_calls++;
        }
      }
    }
  }
  if (current) turns.push(current);

  // Compute totals
  for (const t of turns) {
    t.tokens.total = (t.tokens.input || 0) + (t.tokens.output || 0);
    // Track end_ts from last action
    if (t.actions.length > 0) {
      const lastAction = t.actions[t.actions.length - 1];
      t.end_ts = Math.max(t.end_ts || 0, lastAction.ts + (lastAction.duration_ms || 0) / 1000);
    }
  }

  return {
    session_id: sessionId,
    turns,
    summary: flow.summary || {},
    is_live: false,
  };
}
