// ─── Transcript — turns from /api/transcript, or built from a session flow ─
// The transcript route answers with a session flow when the live analyzer has
// no transcript for the session. Both shapes become the same turns here.

/** True when the answer is a session flow: events with a type and no actions. */
export function isFlow(data) {
  const first = data?.turns?.[0];
  return !!first && first.type != null && first.actions == null;
}

const KIND = { api_call: 'api_call', api_response: 'api_response', tool_use: 'tool_use', subagent: 'subagent', error: 'error', hook: 'hook' };

const emptyTurn = (ev, prompt) => ({
  ts: ev.ts,
  end_ts: ev.end_ts || ev.ts,
  prompt: prompt ? ev.message || '' : '',
  prompt_preview: prompt ? ev.preview || (ev.message || '').slice(0, 200) : '',
  response: prompt ? ev.response || '' : '',
  model: ev.model || '',
  tokens: prompt && ev.tokens ? { ...ev.tokens } : { input: 0, output: 0, cache_read: 0, cache_creation: 0 },
  duration_ms: prompt ? ev.duration_ms || 0 : 0,
  wall_ms: prompt ? ev.wall_ms || 0 : 0,
  actions: [],
  tool_use_count: 0,
});

function addEvent(turn, ev, kind) {
  turn.actions.push({
    ts: ev.ts,
    kind,
    name: kind === 'hook' ? ev.hook_name || 'hook' : ev.to || ev.model || ev.tool_name || '',
    input_summary: typeof ev.params === 'string' ? ev.params : ev.decision || '',
    output_summary: ev.response_preview || ev.error_message || ev.result_summary || '',
    duration_ms: ev.duration_ms || 0,
    tokens: ev.tokens,
    success: ev.success === true || ev.success === 'true' ? true : ev.success === false || ev.success === 'false' ? false : undefined,
    detail: ev.response ? { response: ev.response } : undefined,
  });
  if (kind === 'api_response') {
    const text = ev.response || ev.response_preview || '';
    if (text) turn.response = turn.response ? turn.response + '\n\n' + text : text;
  }
  if (kind === 'tool_use') turn.tool_use_count++;
  if (kind === 'api_call' && ev.tokens) {
    turn.tokens.input = (turn.tokens.input || 0) + (ev.tokens.input || 0);
    turn.tokens.output = (turn.tokens.output || 0) + (ev.tokens.output || 0);
    turn.tokens.cache_read = (turn.tokens.cache_read || 0) + (ev.tokens.cache_read || 0);
  }
  if (!turn.model && ev.model) turn.model = ev.model;
}

/** Turns from session-flow events: each prompt opens a turn, and what follows belongs to it. */
export function flowToTranscript(flow) {
  const turns = [];
  let cur = null;
  for (const ev of flow?.turns || []) {
    if (ev.type === 'user_message') {
      if (cur) turns.push(cur);
      cur = emptyTurn(ev, true);
      for (const t of ev.tools || []) {
        cur.actions.push({ ts: t.ts || ev.ts, kind: t.is_agent ? 'subagent' : 'tool_use', name: t.name || '', input_summary: t.args_summary || '', duration_ms: t.duration_ms || 0 });
        cur.tool_use_count++;
      }
      continue;
    }
    const kind = KIND[ev.type];
    if (!kind) continue;
    if (!cur) {
      if (kind === 'api_response') continue;
      cur = emptyTurn(ev, false);
    }
    addEvent(cur, ev, kind);
  }
  if (cur) turns.push(cur);
  return { turns, summary: flow?.summary || {}, is_live: false };
}

/** The reply text of a turn: its own response and every reply event, each once. */
export function responseOf(turn) {
  const chunks = [];
  const add = (v) => {
    const t = String(v || '').trim();
    if (t && !chunks.includes(t)) chunks.push(t);
  };
  add(turn.response);
  for (const x of turn.actions || []) if (x.kind === 'api_response') add(x.detail?.response || x.response || x.output_summary);
  return chunks.join('\n\n');
}

/** Turns worth a card. With text not kept, a turn may carry only time and tokens. */
export function visibleTurns(transcript, withheld) {
  return (transcript?.turns || []).filter(t => (t.prompt && t.prompt.length > 0)
    || (t.actions && t.actions.length > 0) || t.tool_use_count > 0 || (withheld && (t.ts || t.tokens)));
}
