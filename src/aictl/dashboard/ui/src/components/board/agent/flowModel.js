// ─── Session flow — events, lanes and totals from /api/board/agent/flow ──
// The route also gives each event its running token totals and the summary of every
// event in the range; a legacy /api/session-flow answer has neither, so both are counted here.
import { fmtMs, fmtN } from '../../../design/format.ts';
import { clip, slotColor } from './common.js';

const ROUTE = {
  user_message: () => ['user', 'tool'],
  api_call: t => [t.from || 'tool', 'api'],
  api_response: () => ['api', 'tool'],
  error: () => ['api', 'tool'],
  tool_use: t => ['tool', 'skill:' + (t.to || 'tool')],
  subagent: t => ['tool', 'subagent:' + (t.to || 'agent')],
  subagent_end: t => ['subagent:' + (t.from || 'agent'), 'tool'],
  hook: () => ['tool', 'hook'],
};

/** Lane and kind of each event type, for the timeline mode. */
export const LANE = {
  user_message: { lane: 'user', kind: 'request' },
  api_call: { lane: 'api', kind: 'request' },
  api_response: { lane: 'api', kind: 'reply' },
  error: { lane: 'error', kind: 'reply' },
  tool_use: { lane: 'tool', kind: 'request' },
  subagent: { lane: 'agent', kind: 'request' },
  subagent_end: { lane: 'agent', kind: 'reply' },
  hook: { lane: 'hook', kind: 'hook' },
  session_start: { lane: 'session', kind: 'marker' },
  session_end: { lane: 'session', kind: 'marker' },
  compaction: { lane: 'compact', kind: 'marker' },
  context_update: { lane: 'compact', kind: 'marker' },
  session_command: { lane: 'session', kind: 'marker' },
  skill_event: { lane: 'tool', kind: 'marker' },
};

export const LANE_COLOR = {
  user: 'var(--s1)', api: 'var(--s2)', tool: 'var(--s3)', agent: 'var(--s5)', hook: 'var(--s4)',
  session: 'var(--good)', compact: 'var(--warn)', error: 'var(--crit)',
};

/** The most telling argument of a tool call. */
function toolArgs(params) {
  if (!params) return '';
  let parsed = params;
  if (typeof params === 'string') {
    try { parsed = JSON.parse(params); } catch { return params.slice(0, 80); }
  }
  if (typeof parsed !== 'object' || parsed === null) return String(params).slice(0, 80);
  for (const key of ['command', 'file_path', 'pattern', 'query', 'path', 'url', 'prompt', 'description', 'old_string', 'content', 'skill']) {
    if (parsed[key]) return String(parsed[key]).slice(0, 100);
  }
  const keys = Object.keys(parsed);
  return keys.length ? String(parsed[keys[0]]).slice(0, 80) : '';
}

const tokTotal = t => ((t.tokens || {}).input || 0) + ((t.tokens || {}).output || 0);

/** Merge split user_message rows emitted for the same step_key (captured text + OTel turn metrics). */
function mergeSplitPrompts(rawTurns) {
  const list = rawTurns || [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const cur = list[i];
    const next = list[i + 1];
    if (
      cur && next &&
      cur.type === 'user_message' && next.type === 'user_message' &&
      cur.step_key && cur.step_key === next.step_key &&
      Boolean(cur.redacted) !== Boolean(next.redacted)
    ) {
      const textRow = cur.redacted ? next : cur;
      const metricRow = cur.redacted ? cur : next;
      out.push({
        ...metricRow,
        ...textRow,
        redacted: false,
        tokens: tokTotal(metricRow) >= tokTotal(textRow) ? metricRow.tokens : textRow.tokens,
        api_calls: metricRow.api_calls || textRow.api_calls || 0,
        duration_ms: metricRow.duration_ms || textRow.duration_ms || 0,
        wall_ms: metricRow.wall_ms || textRow.wall_ms || 0,
        end_ts: metricRow.end_ts || textRow.end_ts,
        model: metricRow.model || textRow.model || '',
      });
      i += 1;
    } else {
      out.push(cur);
    }
  }
  return out;
}

/** Events with their lanes and token running totals, the swim-lane columns, turn groups, and the summary. */
export function flowModel(turns, toolLabel, given) {
  const mergedTurns = mergeSplitPrompts(turns);
  const events = mergedTurns.map((t) => {
    const route = ROUTE[t.type];
    const [from, to] = route ? route(t) : [null, null];
    return { ...t, _from: from, _to: to };
  });
  let cum = 0;
  let rt = 0;
  let maxRt = 0;
  const promptCount = events.filter(e => e.type === 'user_message').length;
  const totalTurns = given?.total_turns || promptCount;
  const hasLeadingMidTurn = events.length > 0 && events[0].type !== 'user_message' &&
    Boolean(given?.omitted_events > 0 || events[0].rt_tokens > 0);
  const firstPromptTurn = totalTurns > promptCount && promptCount > 0 ? totalTurns - promptCount + 1 : 1;
  let turnIndex = hasLeadingMidTurn ? Math.max(1, firstPromptTurn - 1) : firstPromptTurn - 1;
  const turnGroups = [];
  let currentGroup = null;

  if (hasLeadingMidTurn) {
    const firstEv = events[0];
    firstEv._isTurnStart = true;
    currentGroup = {
      turnIndex,
      isPartialStart: true,
      startTs: firstEv.ts,
      endTs: firstEv.ts,
      promptEv: firstEv,
      promptText: 'Continued from earlier in turn (load older events for prompt)',
      tokens: firstEv.rt_tokens || 0,
      cacheTokens: 0,
      apiCalls: 0,
      toolCalls: 0,
      subagents: 0,
      skills: [],
      errors: 0,
      durationMs: 0,
      events: [],
    };
    turnGroups.push(currentGroup);
  }

  for (const ev of events) {
    if (ev.type === 'user_message') {
      rt = 0;
      turnIndex += 1;
      ev._isTurnStart = true;
      currentGroup = {
        turnIndex,
        startTs: ev.ts,
        endTs: ev.end_ts || ev.ts,
        promptEv: ev,
        promptText: ev.preview || ev.message || (ev.redacted ? 'Prompt (text not retained)' : 'Prompt'),
        tokens: tokTotal(ev),
        cacheTokens: (ev.tokens || {}).cache_read || 0,
        apiCalls: ev.api_calls || 0,
        toolCalls: 0,
        subagents: 0,
        skills: [],
        errors: 0,
        durationMs: ev.duration_ms || ev.wall_ms || 0,
        events: [ev],
      };
      turnGroups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.events.push(ev);
      if (ev.ts > currentGroup.endTs) currentGroup.endTs = ev.ts;
      if (currentGroup.isPartialStart && currentGroup.endTs > currentGroup.startTs) {
        currentGroup.durationMs = (currentGroup.endTs - currentGroup.startTs) * 1000;
      }
    }
    if (ev.type === 'api_call') {
      const t = tokTotal(ev);
      cum += t;
      rt += t;
      maxRt = Math.max(maxRt, rt);
      if (currentGroup) {
        currentGroup.tokens = Math.max(currentGroup.tokens, ev.rt_tokens ?? rt);
        currentGroup.cacheTokens += (ev.tokens || {}).cache_read || 0;
        currentGroup.apiCalls = Math.max(currentGroup.apiCalls, currentGroup.events.filter(x => x.type === 'api_call').length);
      }
    }
    if (currentGroup) {
      if (ev.rt_tokens > currentGroup.tokens) currentGroup.tokens = ev.rt_tokens;
      if (ev.type === 'tool_use') currentGroup.toolCalls += 1;
      if (ev.type === 'subagent') currentGroup.subagents += 1;
      if (ev.type === 'skill_event' && ev.name && !currentGroup.skills.includes(ev.name)) currentGroup.skills.push(ev.name);
      if (ev.type === 'error' || ev.is_error || (ev.type === 'tool_use' && ev.success === false)) currentGroup.errors += 1;
    }
    ev._turnIndex = turnIndex;
    ev._cum = ev.cum_tokens ?? cum;
    ev._rt = ev.rt_tokens ?? rt;
  }

  // Compute per-turn waterfall bar offsets and widths for Option 1 Turn Waterfall
  for (const g of turnGroups) {
    const stepEvs = g.events;
    const maxDur = Math.max(1000, ...stepEvs.map(e => e.duration_ms || 0));
    const n = stepEvs.length || 1;
    stepEvs.forEach((ev, idx) => {
      ev._turnGroup = g;
      const dur = ev.duration_ms || 0;
      const widthPct = dur > 0 ? Math.max(6, Math.min(72, Math.round((dur / maxDur) * 68))) : 6;
      const offsetPct = n > 1 ? Math.min(100 - widthPct, Math.round((idx / (n - 1)) * (92 - widthPct))) : 0;
      ev._wfOffsetPct = offsetPct;
      ev._wfWidthPct = widthPct;
    });
  }
  // Events before the first user_message also get default waterfall metrics
  for (const ev of events) {
    if (ev._wfWidthPct == null) {
      ev._wfOffsetPct = 0;
      ev._wfWidthPct = ev.duration_ms > 0 ? Math.min(80, Math.max(8, Math.round(ev.duration_ms / 250))) : 8;
    }
  }
  const seen = new Map();
  let slot = 0;
  const add = (id, label, color) => {
    if (!seen.has(id)) seen.set(id, { id, label, color: color || slotColor(slot++) });
  };
  if (events.length) {
    add('user', 'User', LANE_COLOR.user);
    add('tool', toolLabel || 'Tool', 'var(--ink2)');
  }
  for (const ev of events) {
    if (ev.type === 'api_call' || ev.type === 'api_response' || ev.type === 'error') add('api', 'Model', LANE_COLOR.api);
    if (ev.type === 'tool_use') add(ev._to, ev.to || 'tool');
    if (ev.type === 'subagent') add(ev._to, ev.to || 'Subagent');
    if (ev.type === 'subagent_end') add(ev._from, ev.from || 'Subagent');
    if (ev.type === 'hook') add('hook', 'Hooks', LANE_COLOR.hook);
  }
  const count = type => events.filter(e => e.type === type).length;
  const ttfts = events.filter(e => e.type === 'api_call' && e.ttft_ms > 0).map(e => e.ttft_ms).sort((a, b) => a - b);
  const median = ttfts.length ? (ttfts.length % 2 ? ttfts[(ttfts.length - 1) / 2] : (ttfts[ttfts.length / 2 - 1] + ttfts[ttfts.length / 2]) / 2) : null;
  const summary = given?.cumulative_tokens != null ? {
    turns: given.total_turns,
    toolCalls: given.total_tool_uses,
    subagents: given.subagents,
    hooks: given.hooks,
    errors: given.errors,
    compactions: given.compactions,
    cumulative: given.cumulative_tokens,
    roundTrip: given.largest_turn_tokens,
    ttft: given.ttft_ms ?? null,
    ttftCalls: given.ttft_calls || 0,
  } : {
    turns: count('user_message'),
    toolCalls: events.filter(e => e.type === 'tool_use' && e.subtype !== 'result' && e.subtype !== 'decision').length,
    subagents: count('subagent'),
    hooks: count('hook'),
    errors: count('error') + events.filter(e => (e.type === 'api_call' && e.is_error) || (e.type === 'tool_use' && e.success === false)).length,
    compactions: count('compaction'),
    cumulative: cum,
    roundTrip: maxRt,
    ttft: median,
    ttftCalls: ttfts.length,
  };
  return { events, participants: [...seen.values()], turnGroups, summary };
}

/** Only combine participant lanes when the viewer explicitly chooses grouping. */
export function swimLayout(events, participants, filtered, groupLanes = false) {
  const used = new Set();
  for (const e of events) { used.add(e._from); used.add(e._to); }
  const visible = participants.filter(p => !filtered || used.has(p.id));
  const lanes = [];
  const indexes = new Map();
  const columns = new Map();
  for (const p of visible) {
    const group = groupLanes && (p.id.startsWith('skill:') ? 'tools' : p.id.startsWith('subagent:') ? 'agents' : null);
    const id = group ? 'group:' + group : p.id;
    if (!indexes.has(id)) {
      indexes.set(id, lanes.length);
      lanes.push(group ? { id, label: group === 'tools' ? 'Tools' : 'Subagents', color: LANE_COLOR[group === 'tools' ? 'tool' : 'agent'] } : p);
    }
    columns.set(p.id, indexes.get(id));
  }
  return { lanes, columns, grouped: lanes.length < visible.length };
}

/** Label, detail line and size of one event. */
export function describe(ev) {
  const tok = ev.tokens || {};
  if (ev.type === 'user_message') {
    if (ev.redacted) return ev.prompt_length ? { label: 'Prompt, text not sent (' + ev.prompt_length + ' characters)', meta: '' } : { label: 'Prompt, text not kept', meta: '' };
    return { label: ev.preview || ev.message || 'Prompt', meta: ev.prompt_length ? ev.prompt_length + ' characters' : '' };
  }
  if (ev.type === 'api_call') {
    const parts = [fmtN(tokTotal(ev)) + ' tokens'];
    if (ev.ttft_ms > 0) parts.push('first token ' + fmtMs(ev.ttft_ms));
    else if (ev.duration_ms > 0) parts.push(fmtMs(ev.duration_ms));
    if (ev.is_error) parts.push('failed');
    return { label: ev.agent_name || ev.model || 'Model call', meta: parts.join(', ') };
  }
  if (ev.type === 'api_response') {
    const meta = [ev.model, ev.finish_reason && ev.finish_reason !== 'stop' ? 'stopped: ' + ev.finish_reason : ''].filter(Boolean).join(', ');
    const size = tok.output ? ', ' + fmtN(tok.output) + ' tokens' : '';
    return { label: 'Reply' + size + (ev.response_preview ? ': ' + clip(ev.response_preview, 80) : ''), meta };
  }
  if (ev.type === 'error') return { label: 'Error: ' + (ev.error_type || 'error'), meta: clip(ev.error_message || '', 80) };
  if (ev.type === 'tool_use') {
    const args = toolArgs(ev.params) || (ev.target ? String(ev.target).slice(0, 100) : '');
    let meta = '';
    if (ev.subtype === 'result' || (!ev.subtype && typeof ev.success === 'boolean')) {
      meta = (ev.success === true || ev.success === 'true' ? 'OK' : 'Failed') + (ev.duration_ms > 0 ? ', ' + fmtMs(ev.duration_ms) : '');
    } else if (ev.subtype === 'decision') meta = ev.decision || '';
    return { label: (ev.to || 'tool') + (args ? ': ' + args : ''), meta, size: ev.result_size ? ev.result_size + ' B' : '' };
  }
  if (ev.type === 'subagent') return { label: 'Subagent ' + (ev.to || ''), meta: clip(ev.prompt || ev.model || '', 80) };
  if (ev.type === 'subagent_end') return { label: 'Subagent ' + (ev.from || '') + (ev.completed === false ? ' stopped' : ' done'), meta: ev.duration_ms > 0 ? fmtMs(ev.duration_ms) : '' };
  if (ev.type === 'hook') return { label: 'Hook ' + (ev.hook_name || ''), meta: '' };
  if (ev.type === 'session_start') return { label: 'Session started', meta: ev.cwd || '' };
  if (ev.type === 'session_end') return { label: 'Session ended', meta: '' };
  if (ev.type === 'skill_event') return {
    label: `Skill: ${ev.name || 'Name not reported'}`,
    meta: [skillPhase(ev.phase), ev.phase === 'reported' && Number.isFinite(ev.reported_spans) && `${ev.reported_spans} distinct spans`, ev.source].filter(Boolean).join(' · '),
  };
  if (['context_update', 'session_command'].includes(ev.type)) {
    const type = { context_update: 'Context', session_command: 'Session command' }[ev.type];
    return { label: [type, ev.name || ev.phase].filter(Boolean).join(': '),
      meta: [ev.name && ev.phase, ev.context_tokens != null && `${fmtN(ev.context_tokens)} context tokens`,
        ev.source].filter(Boolean).join(' · ') };
  }

  if (ev.type === 'compaction') {
    const freed = ev.before_tokens != null && ev.after_tokens != null ? fmtN(ev.before_tokens) + ' to ' + fmtN(ev.after_tokens) + ' tokens' : '';
    return { label: 'Compaction' + (ev.compaction_count ? ' ' + ev.compaction_count : ''), meta: [freed, ev.duration_ms > 0 ? fmtMs(ev.duration_ms) : ''].filter(Boolean).join(', ') };
  }
  return { label: ev.type || 'Event', meta: '' };
}

export const skillPhase = phase => ({ loaded: 'Loaded', invoked: 'Invoked', reported: 'Reported in context', resolved: 'Resolved' }[phase] || phase || 'Not reported');

export function inputOf(ev) {
  if (ev.type === 'user_message') return ev.message || ev.preview || '';
  if (ev.type === 'api_call') return ev.request_preview || ev.prompt_preview || '';
  if (ev.type === 'tool_use') return ev.params || ev.input_preview || ev.target || '';
  if (ev.type === 'subagent') return ev.prompt || '';
  if (ev.type === 'hook') return ev.hook_input || '';
  return '';
}

export function outputOf(ev) {
  if (ev.type === 'api_response') return ev.response || ev.response_preview || '';
  if (ev.type === 'api_call' && ev.is_error) return ev.error_message || '';
  if (ev.type === 'tool_use') return ev.result_summary || ev.result_preview || '';
  if (ev.type === 'error') return ev.error_message || '';
  if (ev.type === 'hook') return ev.hook_output || '';
  return '';
}
