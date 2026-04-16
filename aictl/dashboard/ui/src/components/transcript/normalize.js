// Detect and normalize session-flow format to transcript-like format.

export function isSessionFlowFormat(data) {
  if (!data || !data.turns || data.turns.length === 0) return false;
  const first = data.turns[0];
  return (first.type != null && first.actions == null);
}

export function normalizeFlowToTranscript(flow, sessionId) {
  if (!flow || !flow.turns) return null;
  const rawTurns = flow.turns || [];

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
      continue;
    } else if (ev.type === 'compaction') {
      continue;
    } else if (current) {
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
      // No current turn yet — synthesize one for OTel sessions where
      // api_calls arrive before any user_message.
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

  for (const t of turns) {
    t.tokens.total = (t.tokens.input || 0) + (t.tokens.output || 0);
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
