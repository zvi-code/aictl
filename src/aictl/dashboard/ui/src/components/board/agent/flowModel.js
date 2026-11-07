// ─── Session flow — events, lanes and totals from /api/board/agent/flow ──
// The route also gives each event its running token totals and the summary of every
// event in the range; a legacy /api/session-flow answer has neither, so both are counted here.
import { fmtMs, fmtN } from '../format.js';
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
};

export const LANE_COLOR = {
  user: 'var(--s1)', api: 'var(--s2)', tool: 'var(--s3)', agent: 'var(--s5)', hook: 'var(--s4)',
  session: 'var(--good)', compact: 'var(--warn)', error: 'var(--crit)',
};

/** The most telling argument of a tool call. */
export function toolArgs(params) {
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

/** Events with their lanes and token running totals, the swim-lane columns, and the summary. */
export function flowModel(turns, toolLabel, given) {
  const events = (turns || []).map((t) => {
    const route = ROUTE[t.type];
    const [from, to] = route ? route(t) : [null, null];
    return { ...t, _from: from, _to: to };
  });
  let cum = 0;
  let rt = 0;
  let maxRt = 0;
  for (const ev of events) {
    if (ev.type === 'user_message') rt = 0;
    if (ev.type === 'api_call') {
      cum += tokTotal(ev);
      rt += tokTotal(ev);
      maxRt = Math.max(maxRt, rt);
    }
    ev._cum = ev.cum_tokens ?? cum;
    ev._rt = ev.rt_tokens ?? rt;
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
  return { events, participants: [...seen.values()], summary };
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
  if (ev.type === 'compaction') {
    const freed = ev.before_tokens != null && ev.after_tokens != null ? fmtN(ev.before_tokens) + ' to ' + fmtN(ev.after_tokens) + ' tokens' : '';
    return { label: 'Compaction' + (ev.compaction_count ? ' ' + ev.compaction_count : ''), meta: [freed, ev.duration_ms > 0 ? fmtMs(ev.duration_ms) : ''].filter(Boolean).join(', ') };
  }
  return { label: ev.type || 'Event', meta: '' };
}

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

/** Rows for the shared tooltip. */
export function tipOf(ev, color) {
  const tok = ev.tokens || {};
  const d = describe(ev);
  const rows = [{ c: color, label: 'Time', value: new Date(ev.ts * 1000).toLocaleTimeString() }];
  if (ev.model) rows.push({ c: 'transparent', label: 'Model', value: ev.model });
  if (tok.input || tok.output) rows.push({ c: 'transparent', label: 'Input / output', value: fmtN(tok.input || 0) + ' / ' + fmtN(tok.output || 0) });
  if (tok.cache_read) rows.push({ c: 'transparent', label: 'Cache read', value: fmtN(tok.cache_read) });
  if (ev.duration_ms > 0) rows.push({ c: 'transparent', label: 'Took', value: fmtMs(ev.duration_ms) });
  if (ev.ttft_ms > 0) rows.push({ c: 'transparent', label: 'First token', value: fmtMs(ev.ttft_ms) });
  if (d.meta) rows.push({ c: 'transparent', label: 'Detail', value: clip(d.meta, 60) });
  return { title: clip(d.label, 70), rows };
}
