import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import FlowTab from '../src/components/board/agent/FlowTab.js';

// Test setup preloads the drawer chunks; load Flow with this test's editor.
vi.hoisted(() => vi.resetModules());
vi.mock('../src/components/board/agent/SessionKql.js', () => ({ default: vi.fn(() => null) }));

const end = 1700000000;
const kusto = 'https://example.test/explore?query=test';
const session = { id: 'board-1', title: 'Archived session', tool: 'copilot' };
const ctx = { refreshKey: 0 };
const scope = { start: end - 7200, end, total: 1301, matched: 1301, tools: ['Shell / local'], agents: ['agent:worker'] };
const ev = { type: 'tool_use', ts: end, to: 'Shell / local', target: 'pytest', success: false };
const payload = (turns, more = {}) => ({ turns, scope, session_kql_url: kusto, ...more });
function mount(flow, extra = {}) {
  const calls = [];
  const steps = [];
  vi.stubGlobal('fetch', vi.fn(async path => {
    const url = new URL(path, 'https://example.test');
    let data;
    if (url.pathname === '/api/board/agent/flow') {
      calls.push(url.searchParams);
      data = await flow(url.searchParams);
    } else if (url.pathname === '/api/session-evidence') {
      steps.push(url.searchParams);
      const step = { step_key: 'command:1', kind: 'command', text_status: 'captured', text_preview: 'source preview', text: 'retained command' };
      data = { session_id: url.searchParams.get('session_id'), rows: [step], has_more: false, limit: 100, offset: 0 };
    } else throw new Error('Unexpected request: ' + path);
    return data instanceof Response ? data : new Response(JSON.stringify(data));
  }));
  const props = { a: session, st: 'ended', ctx, act: {}, sid: 'native-1', captureMode: 'full', ...extra };
  const view = render(html`<${FlowTab} ...${props}/>`);
  return { ...view, calls, steps };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('opens user prompts with one click and searches only the retained prompt text', async () => {
  const ui = mount(() => payload([ev], { scope }));
  const pick = await ui.findByRole('button', { name: 'User prompts' });
  fireEvent.click(pick);
  const input = await ui.findByRole('searchbox', { name: 'Search prompt text' });
  expect(ui.calls.at(-1).get('category')).toBe('prompts');
  fireEvent.input(input, { target: { value: 'Kusto' } });
  fireEvent.submit(input.form);
  await waitFor(() => expect(Object.fromEntries(ui.calls.at(-1))).toMatchObject({ category: 'prompts', q: 'Kusto' }));
});

it('keeps source search and detail mounted across modes, independently of flow requests or errors', async () => {
  const ui = mount(() => new Response('unavailable', { status: 503 }), { initialEvidence: true });
  const search = await ui.findByRole('searchbox', { name: 'Search retained text in this session' });
  fireEvent.input(search, { target: { value: 'pytest' } });
  fireEvent.submit(search.form);
  fireEvent.click(await ui.findByRole('button', { name: /Command.*source preview/ }));
  await ui.findByText('retained command');
  fireEvent.click(ui.getByRole('button', { name: 'Timeline' }));
  const form = await ui.findByRole('search', { name: 'Flow filters' });
  expect(ui.queryByRole('article', { name: 'Step detail' })).toBeNull();
  await ui.findByText(/Could not load the session flow/);
  fireEvent.input(within(form).getByRole('searchbox'), { target: { value: 'tool' } });
  fireEvent.submit(form);
  fireEvent.click(ui.getByRole('button', { name: 'Source steps' }));
  expect(await ui.findByRole('article', { name: 'Step detail' })).toHaveTextContent('retained command');
  fireEvent.click(ui.getByRole('button', { name: 'Back to results' }));
  expect(ui.getByRole('searchbox', { name: 'Search retained text in this session' })).toHaveValue('pytest');
  fireEvent.click(ui.getByRole('button', { name: 'Swim-lane' }));
  expect(ui.getByRole('searchbox', { name: 'Search events' })).toHaveValue('tool');
  expect(ui.calls).toHaveLength(2);
  expect(ui.steps.map(p => [p.get('session_id'), p.get('q'), p.get('step_key')])).toEqual([
    ['native-1', null, null], ['native-1', 'pytest', null], ['native-1', null, 'command:1'],
  ]);
});

it('keeps individual lanes by default and groups only on request, without losing events or selection', async () => {
  const crowded = Array.from({ length: 22 }, (_, i) => ({ ...ev, to: 'Tool' + i }));
  const selected = { ...ev, event_id: 'chosen', to: 'Selected tool', target: 'original' };
  const agents = ['Review', 'Explore'].map(to => ({ type: 'subagent', to, ts: end }));
  const all = [selected, ...crowded, ...agents];
  const ui = mount(p => payload(p.has('tool_name') ? [selected] : p.get('limit') === '500' ? all
    : [{ ...ev, to: 'Prepended' }, ...all], { summary: { omitted_events: 1 } }));
  fireEvent.click(await ui.findByRole('button', { name: 'Swim-lane' }));
  const list = await ui.findByRole('list', { name: 'Events between participants, oldest first' });
  const names = () => [...list.querySelectorAll('.bd-ag-slhead b')].map(e => e.textContent);
  const individual = ui.getByRole('button', { name: 'Individual lanes' });
  expect(individual).toHaveAttribute('aria-pressed', 'true');
  expect(names()).toEqual(['User', 'copilot', 'Selected tool', ...crowded.map(e => e.to), 'Review', 'Explore']);
  fireEvent.click(within(list).getByRole('button', { name: /Selected tool/ }));
  fireEvent.click(ui.getByRole('button', { name: 'Group lanes' }));
  expect(names()).toEqual(['User', 'copilot', 'Tools', 'Subagents']);
  expect(within(list).getAllByRole('listitem')).toHaveLength(all.length);
  expect(ui.getByRole('region', { name: 'Selected event' })).toHaveTextContent('Selected tool: original');
  fireEvent.click(individual);
  expect(names()).toContain('Tool21');
  expect(ui.calls).toHaveLength(1);
  fireEvent.click(ui.getByRole('button', { name: 'Show 1 older events' }));
  await ui.findByRole('button', { name: /Prepended/ });
  expect(ui.getByRole('region', { name: 'Selected event' })).toHaveTextContent('Selected tool: original');
  const tool = ui.getByLabelText('Tool name');
  fireEvent.input(tool, { target: { value: 'Selected tool' } });
  fireEvent.submit(tool.form);
  const visible = await ui.findByRole('list', { name: 'Events between participants, oldest first' });
  expect([...visible.querySelectorAll('.bd-ag-slhead b')].map(e => e.textContent)).toEqual(['copilot', 'Selected tool']);
  expect(ui.queryByRole('region', { name: 'Selected event' })).toBeNull();
});

it('merges split user_message prompt rows, renders the turn scrubber, and supports session-stream swimlanes', async () => {
  const turns = [
    { type: 'user_message', ts: end - 300, step_key: 'turn-a', message: 'First prompt text', preview: 'First prompt text', redacted: false, tokens: { input: 0, output: 0 } },
    { type: 'user_message', ts: end - 300, step_key: 'turn-a', message: '', preview: '', redacted: true, tokens: { input: 12000, output: 400 }, api_calls: 2, duration_ms: 8500 },
    { type: 'tool_use', ts: end - 290, to: 'Bash', target: 'git status', success: true, duration_ms: 1200, agent_id: 'sub-a' },
    { type: 'user_message', ts: end - 100, step_key: 'turn-b', message: 'Second prompt text', preview: 'Second prompt text', redacted: false, tokens: { input: 24000, output: 800 }, api_calls: 4, duration_ms: 14000 },
    { type: 'tool_use', ts: end - 90, to: 'Edit', target: 'src/app.js', success: false, duration_ms: 950, agent_id: 'sub-b' },
  ];
  const ui = mount(() => payload(turns, { scope }));
  const scrubber = await ui.findByRole('region', { name: 'Session turn scrubber' });
  expect(scrubber).toHaveTextContent('Turn Scrubber (2 turns)');
  expect(scrubber).toHaveTextContent('Peak: Turn #2 (25 k tok)');
  // Merged prompt row shows both the prompt text and the OTel token total on Turn #1
  expect(ui.getByText('Turn #1')).toBeVisible();
  expect(ui.getByText('12 k tok')).toBeVisible();
  // Clicking Turn 1 on the scrubber filters the visible events to Turn 1
  fireEvent.click(within(scrubber).getByRole('button', { name: 'Turn 1' }));
  expect(ui.getByText('Bash: git status')).toBeVisible();
  expect(ui.queryByText('Edit: src/app.js')).toBeNull();
  fireEvent.click(within(scrubber).getByRole('button', { name: /Turn #1 selected/ }));
  expect(ui.getByText('Edit: src/app.js')).toBeVisible();
  // Switch to Swim-lane and toggle Session & Subagent streams
  fireEvent.click(ui.getByRole('button', { name: 'Swim-lane' }));
  fireEvent.click(await ui.findByRole('button', { name: /Session & Subagent streams/ }));
  expect(ui.getByText(/Main Session/)).toBeVisible();
  expect(ui.getByText('Subagent sub-a')).toBeVisible();
  expect(ui.getByText('Subagent sub-b')).toBeVisible();
});

