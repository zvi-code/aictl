import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import Drawer from '../src/components/board/Drawer.js';
import { agentDetailFixture, boardFixture } from './fixtures/board.fixture.js';

const sid = 'native/+ 12';
const ts = 1730000000;
const cmd = {
  session_id: sid, step_key: 'cmd/+ 1', ts, kind: 'command', tool: 'copilot-cli', phase: 'completed',
  text_status: 'captured', text_preview: 'pytest …', source: 'native', source_order: 0,
  turn_id: 'turn-2', tool_call_id: 'call-2', agent_id: 'worker', exit_code: 0,
};
const page = (rows, extra) => ({ session_id: sid, limit: 100, offset: 0, has_more: false, rows, ...extra });
const json = x => new Response(JSON.stringify(x));
const fact = (view, key) => view.getByText(key, { selector: 'dt' }).nextElementSibling.textContent;

function mount(tab, evidence, { agent = {}, capture = 'full', turns = [], flow = [], context = null, historyUnavailable = false } = {}) {
  const board = boardFixture();
  const detail = agentDetailFixture(board.agents[0].id);
  const a = { ...detail.agent, id: 'board-record', native_session_id: sid, ...agent };
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (path, opts) => {
    const url = new URL(path, 'http://localhost');
    if (url.pathname === '/api/session-evidence') {
      calls.push(url.searchParams);
      const result = await evidence(url.searchParams, opts);
      return result instanceof Response ? result : json(result);
    }
    if (historyUnavailable && url.pathname.startsWith('/api/board/agent')) return new Response('unavailable', { status: 503 });
    if (url.pathname === '/api/board/agent/flow') return json({ turns: flow });
    if (url.pathname === '/api/board/agent') return json({ ...detail, agent: a, context, turns });
    throw new Error('Unexpected request: ' + path);
  }));
  const ctx = { data: { ...board, agents: [a], capture_mode: capture }, stopped: {}, toolName: x => x, refreshKey: 0 };
  function Session() {
    const [stack, push] = useState([{ type: 'agent', id: a.id, tab }]);
    const act = {
      setDrawerTab: tab => push(s => [...s.slice(0, -1), { type: 'agent', id: s.at(-1).id, tab }]),
      openDrawer: d => push(s => [...s, d]), drawerBack: () => push(s => s.slice(0, -1)),
    };
    return html`<${Drawer} stack=${stack} ctx=${ctx} act=${act}/>`;
  }
  return { ...render(html`<${Session}/>`), calls };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('session execution evidence', () => {
  it('searches and pages retained text for the native session; opens exact detail and explicitly linked flow events', async () => {
    const first = { ...cmd, kind: 'message', role: 'user', phase: null, step_key: 'msg-1', text_preview: 'Run the suite' };
    const ui = mount('overview', p => {
      if (p.has('step_key')) return page([{ ...cmd, text: 'pytest tests/test_worker.py -q' }]);
      if (!p.has('q')) return page([first]);
      return p.get('offset') === '0' ? page([{ ...first, text_preview: 'Try pytest' }], { limit: 1, has_more: true })
        : page([cmd], { limit: 1, offset: 1 });
    }, { flow: [
      { type: 'tool_use', ts, tool_call_id: 'call-1', to: 'Wrong tool' },
      { type: 'tool_use', ts, tool_call_id: 'call-2', to: 'Right tool' },
    ] });
    fireEvent.click(await ui.findByRole('button', { name: 'Search execution evidence' }));
    await ui.findByText('User message');
    const box = ui.getByRole('searchbox');
    fireEvent.input(box, { target: { value: 'pytest' } });
    fireEvent.submit(box.form);
    await ui.findByText('Try pytest');
    fireEvent.click(ui.getByRole('button', { name: 'Next page' }));
    fireEvent.click(await ui.findByRole('button', { name: /Command.*pytest/ }));
    await ui.findByText('pytest tests/test_worker.py -q');
    expect(fact(ui, 'Exit code')).toBe('0');
    expect(fact(ui, 'Turn')).toBe('turn-2');
    expect(fact(ui, 'Agent')).toBe('worker');
    expect(fact(ui, 'Source order')).toBe('0');
    expect(fact(ui, 'Request')).toBe('Not reported');
    expect(ui.calls.map(p => [p.get('session_id'), p.get('q'), p.get('offset'), p.get('step_key')])).toEqual([
      [sid, null, '0', null], [sid, 'pytest', '0', null], [sid, 'pytest', '1', null], [sid, null, '0', cmd.step_key],
    ]);
    expect(ui.calls.every(p => p.get('limit') === '100')).toBe(true);
    fireEvent.click(ui.getByRole('button', { name: 'Find tool call call-2 in session flow' }));
    const flow = await ui.findByRole('list', { name: 'Events, oldest first' });
    expect(flow).toHaveTextContent('Right tool');
    expect(flow).not.toHaveTextContent('Wrong tool');
    fireEvent.click(ui.getByRole('button', { name: 'Show full flow' }));
    expect(flow).toHaveTextContent('Wrong tool');
    fireEvent.click(ui.getByRole('button', { name: 'Search execution evidence →' }));
    await ui.findByText('Run the suite');
  });

  it('shows context steps even without a legacy summary, with independent measurements, capacity, and compaction values', async () => {
    const measured = { step_key: 'ctx0', kind: 'context', phase: 'compaction', context_tokens: 0, context_limit: null, estimated: 0,
      before_tokens: 12, after_tokens: 0, system_tokens: 0, conversation_tokens: null, tool_tokens: 8, turn_id: 'explicit' };
    const estimated = { step_key: 'ctx1', kind: 'context', estimated: 1, context_limit: 64 };
    const ui = mount('context', p => page(p.has('step_key') ? [measured] : [measured, estimated], { session_id: 'root-session' }), {
      agent: { native_session_id: null, parent_id: 'root-session' },
      turns: [{ turn_id: 'other', ts, text: 'Not this turn' }, { turn_id: 'explicit', ts, text: 'Source turn' }],
    });

    const list = await ui.findByRole('list', { name: 'Context steps' });
    expect(list).toHaveTextContent('Estimated · Context: Not reported / capacity: 64');
    expect(list).toHaveTextContent('Measured · Context: 0 / capacity: Not reported');
    expect(list).toHaveTextContent('Compaction: 12 → 0');
    fireEvent.click(within(list).getByRole('button', { name: /compaction/i }));
    await ui.findByText('Token counts');
    expect(fact(ui, 'Context capacity')).toBe('Not reported');
    expect(fact(ui, 'System')).toBe('0');
    expect(fact(ui, 'Conversation')).toBe('Not reported');
    expect(fact(ui, 'Tools')).toBe('8');
    expect(fact(ui, 'After compaction')).toBe('0');
    expect(ui.calls.map(p => [p.get('session_id'), p.get('kind'), p.get('step_key')])).toEqual([
      ['root-session', 'context', null], ['root-session', null, 'ctx0'],
    ]);
    fireEvent.click(ui.getByRole('button', { name: 'Open turn explicit' }));
    const table = await ui.findByRole('table', { name: 'Turns' });
    expect(table).toHaveTextContent('Source turn');
    expect(table).not.toHaveTextContent('Not this turn');
  });

  it('opens linked turn evidence even when the target session history and legacy flow are unavailable', async () => {
    const turn = { ...cmd, kind: 'turn', step_key: 'turn-key', text_preview: 'Original turn', text: 'Complete original turn' };
    const ui = mount('evidence', p => {
      if (p.has('step_key')) return page(p.get('step_key') === turn.step_key ? [turn] : [cmd]);
      if (p.get('turn_id') === cmd.turn_id) return page([turn]);
      return page([cmd]);
    }, { agent: { parent_id: 'main-board-id' }, historyUnavailable: true });
    fireEvent.click(await ui.findByRole('button', { name: /Command.*pytest/ }));
    fireEvent.click(await ui.findByRole('button', { name: 'Find turn turn-2 in session flow' }));
    const linked = await ui.findByRole('region', { name: 'Linked source steps' });
    fireEvent.click(await within(linked).findByRole('button', { name: /Original turn/ }));
    await within(linked).findByText('Complete original turn');
    expect(ui.calls.at(-2).get('turn_id')).toBe('turn-2');
    expect(ui.calls.every(p => p.get('session_id') === sid)).toBe(true);
    await ui.findByText(/Could not load the session flow/);
  });

  it('distinguishes capture states and does not display text for a withheld step or restricted capture', async () => {
    const restricted = ['withheld', 'expired', 'not_reported'].map(status => ({ ...cmd, step_key: status, text_status: status, text_preview: 'must stay hidden' }));
    const partial = { ...cmd, step_key: 'partial', text_status: 'truncated', text_preview: 'Partial excerpt' };
    const respond = p => p.has('step_key') ? page([{ ...restricted[0], text: 'must stay hidden' }]) : page([...restricted, partial]);
    const ui = mount('evidence', respond);
    const list = await ui.findByRole('list', { name: 'Execution steps' });
    for (const label of ['Withheld by capture policy', 'Expired', 'Text not reported', 'Truncated (partial text)', 'Partial excerpt']) expect(list).toHaveTextContent(label);
    expect(list).not.toHaveTextContent('must stay hidden');
    fireEvent.click(within(list).getByRole('button', { name: /Withheld by capture policy/ }));
    await ui.findByRole('article', { name: 'Step detail' });
    expect(ui.container).not.toHaveTextContent('must stay hidden');
    ui.unmount();
    const hidden = mount('evidence', respond, { capture: 'metadata' });
    const hiddenList = await hidden.findByRole('list', { name: 'Execution steps' });
    expect(hidden.queryByRole('searchbox')).toBeNull();
    expect(hiddenList).not.toHaveTextContent('Partial excerpt');
  });

  it('keeps waiting, failure, and a successful empty page distinct; a process placeholder never searches globally', async () => {
    let finish;
    const first = new Promise(resolve => { finish = resolve; });
    let attempt = 0;
    const ui = mount('context', () => ++attempt === 1 ? first : page([]));
    const panel = await ui.findByRole('region', { name: 'Recorded context steps' });
    expect(panel).toHaveTextContent('Loading...');
    expect(panel).not.toHaveTextContent('No context steps');
    finish(new Response('offline', { status: 503 }));
    await within(panel).findByText(/Could not load context evidence/);
    expect(panel).not.toHaveTextContent('No context steps');
    fireEvent.click(within(panel).getByRole('button', { name: 'Retry' }));
    await within(panel).findByText('No context steps reported for this session.');
    ui.unmount();
    const unknown = mount('evidence', () => page([]), { agent: { id: 'live:tool:project', native_session_id: null, placeholder: true } });
    await unknown.findByText('No session ID is available for this record.');
    expect(unknown.calls).toHaveLength(0);
  });

  it('discards late search results and never substitutes another step for missing detail', async () => {
    let resolveOld;
    const old = new Promise(resolve => { resolveOld = resolve; });
    const ui = mount('evidence', p => {
      if (p.get('q') === 'old') return old;
      if (p.has('step_key')) return page([{ ...cmd, step_key: 'another-step', text: 'unrelated detail' }], { session_id: 'board-record' });
      return page(p.has('q') ? [{ ...cmd, session_id: 'board-record' }] : [], { session_id: 'board-record' });
    }, { agent: { native_session_id: null } });
    await ui.findByText('No execution steps reported for this session.');
    const box = ui.getByRole('searchbox');
    for (const q of ['old', 'pytest']) {
      fireEvent.input(box, { target: { value: q } });
      fireEvent.submit(box.form);
    }
    const match = await ui.findByRole('button', { name: /Command.*pytest/ });
    await act(async () => { resolveOld(page([])); });
    expect(match).toBeInTheDocument();
    fireEvent.click(match);
    // The returned row has the wrong session ID; it must not appear even though it has text.
    await ui.findByText(/Could not load step detail/);
    expect(ui.container).not.toHaveTextContent('unrelated detail');
    expect(ui.calls.every(p => p.get('session_id') === 'board-record')).toBe(true);
  });
});
