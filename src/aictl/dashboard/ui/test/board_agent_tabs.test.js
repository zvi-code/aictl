import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';

import Drawer from '../src/components/board/Drawer.js';
import { FLOW_MODE_KEY } from '../src/components/board/agent/FlowTab.js';
import { flowModel } from '../src/components/board/agent/flowModel.js';
import { median, trend } from '../src/components/board/agent/OverviewExtras.js';
import { byName, recordedTree } from '../src/components/board/agent/ProcessesTab.js';
import { treeOrder } from '../src/components/board/agent/TeamTab.js';
import { entityOf, slotsOf } from '../src/components/board/agent/TimelineTab.js';
import { flowToTranscript, isFlow } from '../src/components/board/agent/transcriptModel.js';
import { agentLinkOf, listenSelectSession, redirectOf } from '../src/root.js';

const NOW = Math.floor(Date.now() / 1000);

if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const agent = (o = {}) => ({
  id: 'sess-1', title: 'Fix the parser', parent_id: null, status: 'ended', tool: 'claude-code', project: '/p/alpha', models: ['model-a'],
  input: 1000, output: 200, cache_read: 0, cache_write: 0, tool_calls: 5, started_at: NOW - 600, ended_at: NOW - 60, ...o,
});

const detail = (a = agent(), o = {}) => ({
  agent: a, by_model: [], subagents: [], process: {}, turns: [{ ts: NOW - 500, text: 'Fix it', input: 100, output: 20 }], tool_calls: [], tool_totals: [], files: [{ path: 'a.py' }],
  tests: [], loop: null, errors: [],
  git: { branch: 'main', commit: 'abc1234def', commits_in_session: 2 },
  runs: [
    { session_id: 'sess-1', ended_at: NOW - 60, duration_s: 540, tokens: 1200, file_churn: 1, current: true, tokens_ratio: 1.2 },
    { session_id: 'r1', ended_at: NOW - 86400, duration_s: 300, tokens: 1000, file_churn: 1, current: false },
    { session_id: 'r2', ended_at: NOW - 2 * 86400, duration_s: 600, tokens: 1000, file_churn: 3, current: false },
  ],
  resources: {
    bytes_in: 5000, bytes_out: 1200, state_writes: 300, cpu_peak: 61.2, tool_calls_per_min: 0.56,
    rate_limit: { ts: NOW - 100, windows: [{ window: '5h', used_pct: 82, resets_at: '18:00' }] },
    lm_by_extension: [{ extension: 'ext.copilot', input_tokens: 10, output_tokens: 5, total_tokens: 15, calls: 1, models: ['gpt'] }],
    process_tree: [
      { pid: 10, ppid: 1, name: 'claude', role: 'lead', cpu_percent: 5, mem_mb: 80, depth: 0 },
      { pid: 11, ppid: 10, name: 'node', role: 'subprocess', cpu_percent: 1, mem_mb: 20, depth: 1 },
    ],
    subprocesses: [{ name: 'node', count: 4 }, { name: 'git', count: 2 }],
  },
  ...o,
});

const flow = {
  turns: [
    { type: 'session_start', ts: NOW - 590, cwd: '/p/alpha' },
    { type: 'user_message', ts: NOW - 580, message: 'Fix the parser please', preview: 'Fix the parser please', prompt_length: 21 },
    { type: 'api_call', ts: NOW - 579, model: 'model-a', tokens: { input: 100, output: 20, cache_read: 400 }, ttft_ms: 300, duration_ms: 900 },
    { type: 'api_response', ts: NOW - 578, model: 'model-a', tokens: { output: 20 }, response_preview: 'Looking at it' },
    { type: 'tool_use', ts: NOW - 577, to: 'Bash', params: '{"command":"ls src"}' },
    { type: 'subagent', ts: NOW - 576, to: 'Explore' },
    { type: 'hook', ts: NOW - 575, hook_name: 'PreToolUse' },
    { type: 'error', ts: NOW - 574, error_type: 'overloaded', error_message: 'try later' },
    { type: 'compaction', ts: NOW - 400, compaction_count: 1 },
    { type: 'tool_use', ts: NOW - 300, to: 'Read', params: '{"file_path":"a.py"}' },
  ],
  summary: { total_turns: 1, total_tool_uses: 2 },
};

const transcript = {
  turns: [
    { ts: NOW - 580, prompt: 'Fix the parser please', response: 'Done. **Fixed** the parser.', model: 'model-a', tokens: { input: 100, output: 20, cache_read: 50 },
      actions: [{ ts: NOW - 577, kind: 'tool_use', name: 'Bash', input_summary: 'ls src', duration_ms: 40, success: true }, { ts: NOW - 576, kind: 'hook', name: 'PreToolUse' }] },
  ],
  summary: { total_turns: 1, total_api_calls: 1, total_tool_uses: 1, total_tokens: 120 },
  is_live: false,
};

// The answer of /api/board/agent/flow for a session read from the tool's own files: running
// token totals on each event, and a summary that counts the events left out too.
const storeFlow = {
  session_id: 'sess-1',
  turns: [
    { type: 'user_message', ts: NOW - 580, message: 'Fix the parser please', preview: 'Fix the parser please', tokens: { input: 100, output: 20 }, cum_tokens: 0, rt_tokens: 0 },
    { type: 'api_call', ts: NOW - 579, model: 'model-a', tokens: { input: 100, output: 20, cache_read: 400 }, duration_ms: 900, cum_tokens: 5120, rt_tokens: 120 },
    { type: 'tool_use', ts: NOW - 577, to: 'Read', target: 'src/parser.py', success: false, duration_ms: 40, cum_tokens: 5120, rt_tokens: 120 },
    { type: 'subagent', ts: NOW - 576, to: 'Explore', agent_id: 'sub-1', prompt: 'Find the parser', cum_tokens: 5120, rt_tokens: 120 },
    { type: 'subagent_end', ts: NOW - 500, from: 'Explore', to: 'claude-code', agent_id: 'sub-1', completed: true, duration_ms: 76000, cum_tokens: 5120, rt_tokens: 120 },
  ],
  summary: {
    total_turns: 7, total_tool_uses: 40, subagents: 1, hooks: 0, errors: 3, compactions: 2, cumulative_tokens: 5120, largest_turn_tokens: 2048,
    ttft_ms: null, ttft_calls: 0, event_count: 900, shown_events: 5, omitted_events: 895, source: 'store',
  },
};

const storeTranscript = {
  session_id: 'sess-1',
  turns: [
    { ts: NOW - 580, prompt: 'Fix the parser please', prompt_event: true, response: '', model: 'model-a', tokens: { input: 100, output: 20, cache_read: 50 }, reply_ms: 900,
      actions: [{ ts: NOW - 577, kind: 'tool_use', name: 'Read', input_summary: 'src/parser.py', duration_ms: 40, success: false }], tool_use_count: 1 },
  ],
  summary: { total_turns: 1, total_api_calls: 1, total_tool_uses: 1, total_tokens: 120, source: 'store' },
  capture_mode: 'full',
  replies_kept: false,
  reply_note: 'The reply text is not kept',
};

const events = [
  { ts: NOW - 100, kind: 'hook:PreToolUse', tool: 'claude-code', detail: { tool_name: 'Bash', secret_hint: 'x' } },
  { ts: NOW - 90, kind: 'otel:api_request', tool: 'claude-code', detail: { model: 'model-a' } },
];

const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

function stubFetch(routes = {}) {
  const calls = [];
  const fn = vi.fn(async (url) => {
    const u = String(url);
    calls.push(u);
    for (const [prefix, body] of Object.entries(routes)) if (u.startsWith(prefix)) return json(typeof body === 'function' ? body(u) : body);
    if (u.startsWith('/api/board/agent/flow')) return json(flow);
    if (u.startsWith('/api/board/agent/transcript')) return json(transcript);
    if (u.startsWith('/api/board/agent')) return json(detail());
    if (u.startsWith('/api/events/count')) return json({ count: 900 });
    if (u.startsWith('/api/events')) return json(events);
    if (u.startsWith('/api/session-stats')) return json({ agents: [], tasks: [] });
    if (u.startsWith('/api/session-processes')) return json({ total: 2, processes: [{ pid: 10, role: 'lead', tool: 'claude-code', joined_at: NOW - 590 }, { pid: 11, role: 'subagent', tool: 'claude-code', joined_at: NOW - 500 }] });
    if (u.startsWith('/api/session-mcp-usage')) return json({ servers: [{ server_name: 'db', call_count: 3, err_count: 1, total_duration_ms: 1200, last_ts: NOW - 200 }], total_calls: 3, configured_servers: ['db', 'web'] });
    if (u.startsWith('/api/api-calls')) {
      return json({
        calls: [
          { ts: NOW - 300, model: 'model-a', status: 'ok', duration_ms: 900, input_tokens: 10, output_tokens: 5, finish_reason: 'stop' },
          { ts: NOW - 200, model: 'model-a', status: 'error', error: 'boom', error_type: 'rate_limit', http_status: 429 },
        ],
        summary: { total_calls: 1, total_errors: 1, avg_latency_ms: 900, p95_latency_ms: 900, by_model: { 'model-a': 1 } },
      });
    }
    if (u.startsWith('/api/session-commits')) return json({ branch: 'main', commits: [{ sha: 'a'.repeat(40), short_sha: 'aaaaaaa', subject: 'Fix the tokenizer', current_branch_match: true }, { sha: 'b'.repeat(40), short_sha: 'bbbbbbb', subject: 'Side work', current_branch_match: false }] });
    if (u.startsWith('/api/copilot-sessions/') && u.includes('/artifacts')) return json({ folder: '/home/u/.copilot/session-state/sess-1', artifacts: [{ name: 'plan.md', type: 'plan', path: '/home/u/.copilot/session-state/sess-1/plan.md', readable: true, size: 120, modified_at: NOW - 50 }] });
    if (u.startsWith('/api/copilot-sessions/') && u.includes('/artifact?')) return json({ content: '# The plan\n\nStep one.', size: 22, truncated: false, binary: false });
    if (u.startsWith('/api/samples')) return json([]);
    return json({});
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

function mount({ a = agent(), tab = 'overview', capture = 'full', routes, over } = {}) {
  const calls = stubFetch({ '/api/board/agent/flow': flow, '/api/board/agent/transcript': transcript, ...routes, '/api/board/agent?': detail(a, over) });
  const act = { openDrawer: vi.fn(), setDrawerTab: vi.fn(), drawerBack: vi.fn(), drawerClose: vi.fn(), copy: vi.fn(), stopAgent: vi.fn() };
  const ctx = { data: { agents: [a], capture_mode: capture }, stopped: {}, toolName: x => x, refreshKey: 1, query: '' };
  const view = render(html`<${Drawer} stack=${[{ type: 'agent', id: a.id, tab }]} ctx=${ctx} act=${act}/>`);
  return { ...view, calls, act, ctx };
}

beforeEach(() => {
  try { localStorage.clear(); } catch { /* storage blocked */ }
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('agent drawer tab list and header', () => {
  it('lists the session views as tabs', async () => {
    const { findByRole, getAllByRole } = mount();
    await findByRole('heading', { name: 'Fix the parser' });
    const names = getAllByRole('tab').map(t => t.textContent.replace(/ \(\d+\)$/, ''));
    expect(names).toEqual(['Overview', 'Transcript', 'Flow', 'Timeline', 'Turns', 'Tool calls', 'Changes', 'Failures and loops', 'Events', 'Team', 'Processes', 'Integrations']);
  });

  it('shows branch, commit and the commits badge, and lists the commits on click', async () => {
    const { findByText, findByRole, calls } = mount();
    await findByText('Branch main');
    await findByText('Commit abc1234');
    expect(calls.some(c => c.startsWith('/api/session-commits'))).toBe(false);
    fireEvent.click(await findByRole('button', { name: '2 commits in this session' }));
    await findByText('Fix the tokenizer');
    expect(await findByText('not on main')).toBeTruthy();
    expect(calls.some(c => c.startsWith('/api/session-commits?session_id=sess-1'))).toBe(true);
  });

  it('has no badge when the session has no git record', async () => {
    const { findByRole, queryByText } = mount({ routes: { '/api/board/agent': detail(agent(), { git: { branch: null, commit: null, commits_in_session: 0 } }) } });
    await findByRole('heading', { name: 'Fix the parser' });
    await new Promise(r => setTimeout(r, 0));
    expect(queryByText(/commits in this session/)).toBeNull();
    expect(queryByText(/^Branch /)).toBeNull();
  });

  it('adds the run history and the trend against the median to the overview', async () => {
    const { findByRole, container, getByRole } = mount();
    const trendBox = await findByRole('group', { name: 'This run against the median of 2 runs' }, { timeout: 5000 });
    const tokens = within(trendBox).getByTitle(/^Tokens:/);
    expect(tokens.getAttribute('data-dir')).toBe('up');
    expect(tokens.textContent).toContain('+20%');
    expect(container.querySelector('#dr-agrun table')).toBeNull();
    fireEvent.click(getByRole('button', { name: 'Show the 3 runs' }));
    expect(container.querySelector('#dr-agrun table')).toBeTruthy();
    await waitFor(() => expect(container.querySelector('#dr-agspk [data-chart="tok"] .bd-chart')).toBeTruthy());
  });
});

describe('Flow tab', () => {
  it('reads 500 events first and asks for 1000 more on request', async () => {
    const { findByRole, calls } = mount({ tab: 'flow', routes: { '/api/board/agent/flow': storeFlow } });
    const more = await findByRole('button', { name: 'Show 895 older events' });
    expect(calls).toContain('/api/board/agent/flow?id=sess-1&limit=500');
    fireEvent.click(more);
    await waitFor(() => expect(calls).toContain('/api/board/agent/flow?id=sess-1&limit=1500'));
  });

  it('counts the older events in plain digits', async () => {
    const big = { ...storeFlow, summary: { ...storeFlow.summary, event_count: 6200, omitted_events: 5700 } };
    const { findByRole } = mount({ tab: 'flow', routes: { '/api/board/agent/flow': big } });
    await findByRole('button', { name: 'Show 1,000 older events' });
  });

  it('renders the summary and the events, and opens an event in place', async () => {
    const { findByRole, container, getByText } = mount({ tab: 'flow' });
    await findByRole('list', { name: 'Events, oldest first' });
    const stats = container.querySelector('#dr-agfs');
    expect(within(stats).getByTitle('Prompts in the session').textContent).toContain('1');
    expect(within(stats).getByTitle('Time to first token').textContent).toContain('300 ms');
    fireEvent.click(getByText('Bash: ls src'));
    const insp = await findByRole('region', { name: 'Selected event' });
    expect(insp.textContent).toContain('"command": "ls src"');
  });

  it('keeps the chosen mode in the stored preference', async () => {
    const first = mount({ tab: 'flow' });
    fireEvent.click(await first.findByRole('button', { name: 'Swim-lane' }));
    expect(localStorage.getItem(FLOW_MODE_KEY)).toBe('swimlane');
    await first.findByRole('list', { name: 'Events between participants, oldest first' });
    cleanup();
    const second = mount({ tab: 'flow' });
    const btn = await second.findByRole('button', { name: 'Swim-lane' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    await second.findByRole('list', { name: 'Events between participants, oldest first' });
  });

  it('counts the summary from the events', () => {
    const m = flowModel(flow.turns, 'claude-code');
    expect(m.summary).toMatchObject({ turns: 1, toolCalls: 2, subagents: 1, hooks: 1, errors: 1, compactions: 1, cumulative: 120, roundTrip: 120, ttft: 300 });
    expect(m.participants.map(p => p.id)).toEqual(['user', 'tool', 'api', 'skill:Bash', 'subagent:Explore', 'hook', 'skill:Read']);
  });
});

describe('Timeline tab', () => {
  it('hides the bars of an entity that is filtered out', async () => {
    const { findByRole, container, getByRole } = mount({ tab: 'timeline' });
    await findByRole('list', { name: 'Events by time' });
    expect(container.querySelectorAll('[data-entity="Bash"]').length).toBe(1);
    const bash = within(getByRole('group', { name: 'Show or hide' })).getByRole('button', { name: 'Bash' });
    fireEvent.click(bash);
    expect(bash.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelectorAll('[data-entity="Bash"]').length).toBe(0);
    expect(container.querySelectorAll('[data-entity="Read"]').length).toBe(1);
    fireEvent.click(getByRole('button', { name: 'None' }));
    expect(container.textContent).toContain('No event matches the filter.');
    fireEvent.click(getByRole('button', { name: 'All' }));
    expect(container.querySelectorAll('[data-entity="Bash"]').length).toBe(1);
  });

  it('folds a pause into one gap mark', () => {
    const slots = slotsOf(flow.turns.filter(t => t.type !== 'session_start'));
    expect(slots.filter(s => s.gap).length).toBe(2);
    expect(entityOf({ type: 'api_call', model: 'm' })).toBe('m');
  });
});

describe('Transcript tab', () => {
  it('reads a brief turn whole when it opens, and shows its actions', async () => {
    const briefTurn = { ts: NOW - 580, prompt: 'Fix the parser please', prompt_event: true, response: 'Done. **Fixed**', model: 'model-a', tokens: { input: 100, output: 20 }, actions: [], tool_use_count: 2, detail: true };
    const whole = { ...briefTurn, detail: false, response: 'Done. **Fixed** the parser, whole.', actions: [{ ts: NOW - 577, kind: 'tool_use', name: 'Bash', input_summary: 'ls src', duration_ms: 40, success: true }, { ts: NOW - 570, kind: 'tool_use', name: 'Read', input_summary: 'a.py', success: true }] };
    const route = u => (u.includes('turn=') ? { session_id: 'sess-1', turn: whole } : { ...storeTranscript, replies_kept: true, reply_note: null, turns: [briefTurn] });
    const { findByRole, container, calls } = mount({ tab: 'transcript', routes: { '/api/board/agent/transcript': route } });
    const head = await findByRole('button', { expanded: false, name: /^1/ }, { timeout: 5000 });
    expect(head.textContent).toContain('2 tool calls');
    expect(calls.some(c => c.includes('turn='))).toBe(false);
    fireEvent.click(head);
    await waitFor(() => expect(container.querySelector('.bd-ag-acts')).toBeTruthy());
    expect(calls).toContain('/api/board/agent/transcript?id=sess-1&turn=' + encodeURIComponent(NOW - 580));
    expect(within(container.querySelector('.bd-ag-acts')).getByText('Read')).toBeTruthy();
    expect(container.querySelector('.bd-ag-reply').textContent).toContain('the parser, whole');
    expect(container.textContent).not.toContain('Reading the turn');
  });

  it('shows the reply rendered as Markdown when a turn opens', async () => {
    const { findByRole, container } = mount({ tab: 'transcript' });
    const head = await findByRole('button', { expanded: false, name: /^1/ }, { timeout: 5000 });
    expect(container.textContent).toContain('Fix the parser please');
    fireEvent.click(head);
    await waitFor(() => expect(container.querySelector('.bd-ag-reply strong')?.textContent).toBe('Fixed'));
    expect(within(container.querySelector('.bd-ag-acts')).getByText('Bash')).toBeTruthy();
    expect(container.querySelector('.bd-ag-tokbar').getAttribute('aria-label')).toBe('Input 100, Cache read 50, Output 20');
  });

  it('says when text is not kept because of the capture mode', async () => {
    const { findByText } = mount({ tab: 'transcript', capture: 'metadata' });
    await findByText(/Text is not kept: the capture mode is metadata/);
  });

  it('builds turns from a session flow when the transcript route answers with one', () => {
    expect(isFlow(flow)).toBe(true);
    const t = flowToTranscript(flow);
    expect(t.turns.length).toBe(1);
    expect(t.turns[0].response).toBe('Looking at it');
    expect(t.turns[0].actions.map(x => x.kind)).toEqual(['api_call', 'api_response', 'tool_use', 'subagent', 'hook', 'error', 'tool_use']);
  });

  it('reads the transcript again every 5 s while the agent runs', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { findByRole, calls } = mount({ tab: 'transcript', a: agent({ status: 'running', ended_at: null }) });
    await findByRole('button', { expanded: false, name: /^1/ });
    const before = calls.filter(c => c.startsWith('/api/board/agent/transcript')).length;
    await vi.advanceTimersByTimeAsync(5100);
    await waitFor(() => expect(calls.filter(c => c.startsWith('/api/board/agent/transcript')).length).toBeGreaterThan(before));
  });

  it('reads the board transcript route and says when the reply text is not kept', async () => {
    const { findByRole, container, calls } = mount({ tab: 'transcript', routes: { '/api/board/agent/transcript': storeTranscript } });
    const head = await findByRole('button', { expanded: false, name: /^1/ });
    expect(calls).toContain('/api/board/agent/transcript?id=sess-1');
    expect(calls.some(c => c.startsWith('/api/transcript/') || c.startsWith('/api/session-flow'))).toBe(false);
    expect(container.textContent).toContain('The reply text is not kept. The prompts, model calls, tool calls and tokens of each turn are shown.');
    fireEvent.click(head);
    await waitFor(() => expect(container.querySelector('.bd-ag-turn.bd-open').textContent).toContain('The reply text is not kept.'));
    expect(container.textContent).not.toContain('No reply captured.');
    expect(within(container.querySelector('.bd-ag-acts')).getByText('Failed')).toBeTruthy();
  });
});

describe('the session views read the board routes', () => {
  it('Flow takes the summary and the running totals from the route', async () => {
    const { findByRole, container, calls, getByText } = mount({ tab: 'flow', routes: { '/api/board/agent/flow': storeFlow } });
    await findByRole('list', { name: 'Events, oldest first' });
    expect(calls).toContain('/api/board/agent/flow?id=sess-1&limit=500');
    expect(calls.some(c => c.startsWith('/api/session-flow'))).toBe(false);
    const stats = container.querySelector('#dr-agfs');
    expect(within(stats).getByTitle('Prompts in the session').textContent).toContain('7');
    expect(within(stats).getByTitle('The most input and output tokens between two prompts').textContent).toContain('2');
    expect(container.querySelector('#dr-agfs .bd-psub').textContent).toBe('Newest 5 of 900 events');
    expect(container.querySelector('#dr-agfl .bd-psub').textContent).toContain('The 895 oldest events are left out');
    expect(getByText('Read: src/parser.py')).toBeTruthy();
    expect(container.textContent).toContain('Failed, 40 ms');
    expect(getByText('Subagent Explore done')).toBeTruthy();
    fireEvent.click(getByText('Subagent Explore'));
    const insp = await findByRole('region', { name: 'Selected event' });
    expect(insp.textContent).toContain('Find the parser');
  });

  it('Flow draws the end of a subagent as a reply to the tool', () => {
    const m = flowModel(storeFlow.turns, 'claude-code', storeFlow.summary);
    const end = m.events.find(e => e.type === 'subagent_end');
    expect([end._from, end._to]).toEqual(['subagent:Explore', 'tool']);
    expect(m.events[1]._cum).toBe(5120);
    expect(m.summary).toMatchObject({ turns: 7, toolCalls: 40, errors: 3, cumulative: 5120, roundTrip: 2048, ttft: null });
  });

  it('Timeline draws the events of the flow route', async () => {
    const { findByRole, container, calls } = mount({ tab: 'timeline', routes: { '/api/board/agent/flow': storeFlow } });
    await findByRole('list', { name: 'Events by time' });
    expect(calls).toContain('/api/board/agent/flow?id=sess-1');
    expect(container.querySelectorAll('[data-entity="Read"]').length).toBe(1);
    expect(container.querySelectorAll('[data-entity="Explore"]').length).toBe(1);
    expect(container.querySelector('#dr-agtl .bd-psub').textContent).toContain('The 895 oldest events are left out.');
  });

  it('a subagent asks with its own id, and the route answers for the whole session', async () => {
    const sub = agent({ id: 'sub-1', parent_id: 'sess-1', role: 'Explore', title: 'Explore' });
    const { findByRole, calls } = mount({ tab: 'flow', a: sub, routes: { '/api/board/agent?': detail(sub) } });
    await findByRole('list', { name: 'Events, oldest first' });
    expect(calls).toContain('/api/board/agent/flow?id=sub-1&limit=500');
  });
});

describe('Overview and Changes fixes', () => {
  it('puts the token unit in the label and a bare number in the value', async () => {
    const ctxData = { first: 155000, last: 160000, peak: 170000, calls: 3, drops: 0, compactions: [], series: [1, 2, 3] };
    const { findByText, container } = mount({ over: { context: ctxData } });
    await findByText('First call');
    const stat = [...container.querySelectorAll('#dr-actx *')].find(n => n.children.length === 0 && n.textContent === 'First call');
    const text = stat.parentElement.textContent;
    expect(text).toContain('155 k');
    expect(text).not.toContain('155 k tokens');
  });

  it('names a model row that has no model id', async () => {
    const { findByText } = mount({ over: { by_model: [{ model: '', msgs: 3, input: 1, output: 1 }] } });
    const cell = await findByText('No model id');
    expect(cell.closest('[title]').getAttribute('title')).toBe('The record carries no model id');
  });

  it('labels failures and notes a missing detail', async () => {
    const errs = [{ ts: NOW - 5, key: 'api:api_error', detail: 'api_error' }, { ts: NOW - 6, key: 'tool:Bash:Exit code #', detail: 'ls' }];
    const { findByText, getByText } = mount({ tab: 'errors', over: { errors: errs } });
    await findByText('API: error');
    getByText('No detail recorded');
    getByText('Bash: Exit code #');
  });

  it('keeps the file name of a changed file visible', async () => {
    const files = [{ path: '/very/long/absolute/path/to/src/client.py', lines_added: 1, lines_removed: 0, edits: 1 }];
    const { findByRole } = mount({ tab: 'changes', over: { files } });
    const t = await findByRole('table', { name: 'Files changed' });
    expect(t.textContent).toContain('…/to/src/client.py');
    expect(t.querySelector('[title="/very/long/absolute/path/to/src/client.py"]')).toBeTruthy();
  });
});

describe('Events tab', () => {
  it('says why no event is stored', async () => {
    const { findByText } = mount({ tab: 'events', routes: { '/api/events': [] } });
    await findByText('No hook events for this session. Hook events reach aictl only when its hooks are installed for claude-code.');
  });

  it('lists newest first, filters by kind and opens the JSON detail', async () => {
    const { findByText, container, getByRole } = mount({ tab: 'events' });
    await findByText('Newest 2 of 900');
    const rows = () => [...container.querySelectorAll('.bd-ag-evt tbody tr')].map(r => r.children[1]?.textContent);
    expect(rows()).toEqual(['otel:api_request', 'hook:PreToolUse']);
    fireEvent.click(within(getByRole('group', { name: 'Kind' })).getByRole('button', { name: /^hook:PreToolUse/ }));
    expect(rows()).toEqual(['hook:PreToolUse']);
    fireEvent.click(getByRole('button', { name: /^Detail of hook:PreToolUse/ }));
    expect(container.querySelector('.bd-ag-detrow pre').textContent).toContain('"tool_name": "Bash"');
  });
});

describe('Team tab', () => {
  it('says the tool recorded no team', async () => {
    const { findByText } = mount({ tab: 'team' });
    await findByText(/recorded no team for this session/);
  });

  it('falls back to the subagents of the detail when no team is stored', async () => {
    const subs = [{ ...agent({ id: 'sub-1', parent_id: 'sess-1', role: 'Explore', title: 'Explore', models: ['model-a'] }) }];
    const { findByRole, findByText, queryByText } = mount({ tab: 'team', over: { subagents: subs } });
    const t = await findByRole('table', { name: 'Team' });
    expect(within(t).getByText('Explore')).toBeTruthy();
    await findByText(/not recorded for this tool/);
    expect(queryByText(/recorded no team/)).toBeNull();
  });

  it('lists agents under their parent and tasks by state', async () => {
    const stats = {
      agents: [{ agent_id: 'b', parent_agent_id: 'a', state: 'ended', task: 'Read files', started_at: NOW - 100 }, { agent_id: 'a', state: 'active', agent_type: 'Explore', started_at: NOW - 200 }],
      tasks: [{ task_id: 't1', name: 'Write the test', state: 'active' }, { task_id: 't2', name: 'Ship', state: 'pending' }],
    };
    const { findByRole, getByRole } = mount({ tab: 'team', routes: { '/api/session-stats': stats } });
    await findByRole('table', { name: 'Team' });
    expect(within(getByRole('region', { name: 'Active' })).getByText('Write the test')).toBeTruthy();
    expect(within(getByRole('region', { name: 'Pending' })).getByText('Ship')).toBeTruthy();
    expect(treeOrder(stats.agents).map(x => [x.agent_id, x.depth])).toEqual([['a', 0], ['b', 1]]);
  });
});

describe('Processes tab', () => {
  it('indents each process under its parent and shows the resource extras', async () => {
    const { findByRole, getByRole, container } = mount({ tab: 'procs' });
    const tree = await findByRole('table', { name: 'Process tree' });
    const pads = [...tree.querySelectorAll('tbody tr td:first-child')].map(td => td.querySelector('.bd-cellrow')?.style.paddingLeft || '0px');
    expect(pads).toEqual(['0px', '16px']);
    expect(container.querySelector('#dr-agrx').textContent).toContain('61%');
    expect(container.querySelector('#dr-agrx').textContent).toContain('5 KB');
    await findByRole('table', { name: 'Processes recorded' });
    const names = within(getByRole('table', { name: 'Subprocesses by name' })).getAllByRole('row').slice(1).map(r => r.children[0].textContent);
    expect(names).toEqual(['node', 'git', 'claude']);
  });

  it('puts recorded processes under the lead and adds live CPU and RAM to the counts', () => {
    expect(recordedTree([{ pid: 2, role: 'subagent' }, { pid: 1, role: 'lead' }]).map(p => [p.pid, p.depth])).toEqual([[1, 0], [2, 1]]);
    expect(byName([{ name: 'node', count: 4 }], [{ name: 'node', cpu_percent: 1, mem_mb: 20 }, { name: 'node', cpu_percent: 2, mem_mb: 5 }])).toEqual([{ name: 'node', count: 4, cpu: 3, mem: 25 }]);
  });
});

describe('Integrations tab', () => {
  it('shows MCP servers, model calls, the rate limit and language models by extension', async () => {
    const { findByRole, getByRole } = mount({ tab: 'integrations' });
    const mcp = await findByRole('table', { name: 'MCP servers' });
    expect(within(mcp).getByText('db')).toBeTruthy();
    expect(within(mcp).getByText('configured, not used')).toBeTruthy();
    const calls = await findByRole('table', { name: 'Model calls' });
    expect(within(calls).getByText('rate_limit')).toBeTruthy();
    expect(within(calls).getByText('Error 429')).toBeTruthy();
    expect(within(getByRole('table', { name: 'Calls by model' })).getByText('model-a')).toBeTruthy();
    expect(getByRole('meter', { name: '5h window used' }).getAttribute('aria-valuenow')).toBe('82');
    expect(within(getByRole('table', { name: 'VS Code language models by extension' })).getByText('ext.copilot')).toBeTruthy();
  });

  it('builds the model calls from the stored models when the call log is empty', async () => {
    const by_model = [{ model: 'model-a', msgs: 310 }, { model: '', msgs: 2 }];
    const { findByRole, findByText, getByRole, queryByRole } = mount({ tab: 'integrations', routes: { '/api/api-calls': { calls: [], summary: { total_calls: 0, total_errors: 0, by_model: {} } } }, over: { by_model } });
    await findByText(/aictl read these calls from the session files/);
    const t = await findByRole('table', { name: 'Calls by model' });
    expect(within(t).getByText('model-a')).toBeTruthy();
    expect(within(t).getByText('No model id')).toBeTruthy();
    expect(queryByRole('table', { name: 'Model calls' })).toBeNull();
    expect(getByRole('region', { name: 'Model calls' }).textContent).toContain('312');
  });

  it('lists Copilot session files and opens one inline', async () => {
    const { findByRole, container, act } = mount({ tab: 'integrations', a: agent({ tool: 'copilot-cli' }) });
    const files = await findByRole('table', { name: 'Copilot session files' });
    fireEvent.click(within(files).getByRole('button', { name: 'plan.md' }));
    await waitFor(() => expect(container.querySelector('.bd-ag-art h1')?.textContent).toBe('The plan'));
    fireEvent.click(await findByRole('button', { name: 'Open as a file' }));
    expect(act.openDrawer).toHaveBeenCalledWith({ type: 'file', path: '/home/u/.copilot/session-state/sess-1/plan.md', line: 1 });
  });
});

describe('a subagent', () => {
  it('reads the session views of its main agent', async () => {
    const sub = agent({ id: 'sub-1', parent_id: 'sess-1', role: 'Explore', title: 'Explore' });
    const { findByText, calls } = mount({ tab: 'events', a: sub, routes: { '/api/board/agent': detail(sub) } });
    await findByText(/whole session of the main agent/);
    await waitFor(() => expect(calls.some(c => c.startsWith('/api/events?session_id=sess-1'))).toBe(true));
  });
});

describe('legacy explorer links', () => {
  it('route an explorer session link to the agent drawer of the board', () => {
    expect(redirectOf('?tab=explorer&session=abc&range=24h')).toBe('?range=24h&agent=abc');
    expect(redirectOf('?tab=sessions&session=abc')).toBe('?agent=abc');
    expect(redirectOf('?tab=explorer')).toBe('');
    expect(agentLinkOf('?tab=live', 'x y')).toBe('?agent=x+y');
  });

  it('send the select-session bus to the board', async () => {
    window.history.replaceState(null, '', '/?tab=overview');
    const go = vi.fn();
    const stop = listenSelectSession(go);
    document.dispatchEvent(new CustomEvent('aictl:select-session', { detail: { sessionId: 'abc', tool: 'claude-code' } }));
    await new Promise(r => setTimeout(r, 5));
    expect(go).toHaveBeenCalledWith('/?agent=abc');
    stop();
    document.dispatchEvent(new CustomEvent('aictl:select-session', { detail: { sessionId: 'def' } }));
    await new Promise(r => setTimeout(r, 5));
    expect(go).toHaveBeenCalledTimes(1);
    window.history.replaceState(null, '', '/');
  });
});

describe('run trend', () => {
  it('compares against the median, with 5% as about the same', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(trend(104, 100).dir).toBe('same');
    expect(trend(150, 100)).toEqual({ dir: 'up', pct: 0.5 });
    expect(trend(50, 0).dir).toBe('same');
  });
});

describe('tools, MCP servers and skills of one agent', () => {
  const totals = [
    { name: 'Bash', mcp_server: null, calls: 40, failed: 2, total_ms: 9000, p50_ms: 120, p95_ms: 2400, max_ms: 3000, avg_input_bytes: 80, avg_output_bytes: 2048, output_bytes: 81920, max_output_bytes: 9000 },
    { name: 'mcp__kusto__query', mcp_server: 'kusto', calls: 6, failed: 1, total_ms: 3000, p50_ms: 400, p95_ms: 900, max_ms: 900, avg_input_bytes: 120, avg_output_bytes: 50000, output_bytes: 300000, max_output_bytes: 90000 },
    { name: 'mcp__kusto__list', mcp_server: 'kusto', calls: 2, failed: 0, total_ms: 200, p50_ms: 100, p95_ms: 100, max_ms: 100, avg_input_bytes: 10, avg_output_bytes: 500, output_bytes: 1000, max_output_bytes: 600 },
  ];
  const calls = [{ ts: NOW - 100, name: 'mcp__kusto__query', target: 'T | take 1', duration_ms: 400, failed: false, input_bytes: 120, output_bytes: 50000 }];

  it('shows each tool with its run time and sizes, and adds up each MCP server', async () => {
    const { findByRole, getByRole } = mount({ tab: 'tools', over: { tool_totals: totals, tool_calls: calls } });
    const tools = await findByRole('table', { name: 'Tools used' });
    const kusto = within(tools).getByText('mcp__kusto__query').closest('tr');
    expect(kusto.textContent).toContain('MCP kusto');
    expect(kusto.textContent).toContain('400 ms');
    expect(kusto.textContent).toContain('50 KB');
    const servers = getByRole('table', { name: 'MCP servers' });
    const row = within(servers).getByText('kusto').closest('tr');
    // Two tools, eight calls, one failed.
    expect([...row.querySelectorAll('td')].slice(1, 4).map(td => td.textContent)).toEqual(['2', '8', '1']);
    const list = getByRole('table', { name: 'Tool calls' });
    expect(within(list).getByText('50 KB')).toBeTruthy();
  });

  it('always shows the skills section, saying when none was used', async () => {
    const { findByRole } = mount({ over: { skills: [] } });
    const skills = await findByRole('heading', { name: 'Skills used' });
    const panel = skills.closest('section');
    expect(panel.textContent).toContain('None in this session');
    expect(panel.textContent).toContain('This agent used no skill');
  });
});
