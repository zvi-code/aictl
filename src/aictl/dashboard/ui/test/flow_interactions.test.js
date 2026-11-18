import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import FlowTab from '../src/components/board/agent/FlowTab.js';
import SessionKql from '../src/components/board/agent/SessionKql.js';

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

it('shows skill names and filters loaded evidence without treating span reports as invocations', async () => {
  const load = { type: 'skill_event', name: 'testing', phase: 'loaded', source: 'session_loaded_files', ts: end };
  const observed = { ...load, phase: 'reported', source: 'otel', reported_spans: 7, last_ts: end };
  const ui = mount(p => payload(p.get('skill_phase') === 'loaded' ? [load] : [load, observed], {
    scope: { ...scope, skills: ['testing'] }, summary: { skill_evidence: true },
  }));
  fireEvent.click(await ui.findByRole('button', { name: 'Skills', exact: true }));
  expect(ui.calls.at(-1).get('category')).toBe('skills');
  await ui.findByText(/Reported in context.*7 distinct spans/);
  const name = ui.getByLabelText('Skill name');
  fireEvent.input(name, { target: { value: 'testing' } });
  fireEvent.change(ui.getByLabelText('Skill evidence'), { target: { value: 'loaded' } });
  fireEvent.submit(name.form);
  await waitFor(() => expect(Object.fromEntries(ui.calls.at(-1))).toMatchObject({
    category: 'skills', skill_name: 'testing', skill_phase: 'loaded',
  }));
  expect(await ui.findByText(/Loaded.*session_loaded_files/)).toBeVisible();
  expect(ui.queryByText(/7 distinct spans/)).toBeNull();
});

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

it('gives the KQL editor observed names and the applied range, not a pending time selection', async () => {
  const ui = mount(() => payload([ev], { scope: { ...scope, models: ['reported-model'] } }), {
    ctx: { data: { agents: [{ id: 'alias', native_session_id: 'native-1' }, { id: 'worker', parent_id: 'older-session' }, { id: 'live:group', placeholder: true }] } },
  });
  await ui.findByRole('link', { name: 'Open session in Kusto' });
  const props = () => SessionKql.mock.lastCall[0];
  expect(props()).toMatchObject({ url: kusto, sessionId: 'native-1', sessions: ['native-1', 'older-session'],
    tools: scope.tools, models: ['reported-model'], since: null, until: null });
  const range = ui.getByLabelText('Time range');
  fireEvent.change(range, { target: { value: '900' } });
  expect(props().since).toBeNull();
  fireEvent.submit(range.form);
  await waitFor(() => expect(props()).toMatchObject({ since: end - 900, until: end }));
});

it('submits the full set of filters before paging and keeps the historical session end as the preset anchor', async () => {
  const ui = mount(p => payload([ev], {
    scope: { ...scope, matched: p.has('q') ? 601 : 1301, end: p.has('q') ? end - 200 : end },
    summary: { omitted_events: 600, cumulative_tokens: 300, total_tool_uses: 275 },
  }));
  const link = await ui.findByRole('link', { name: 'Open session in Kusto' });
  expect(link).toHaveAttribute('href', kusto);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  const input = ui.getByRole('searchbox', { name: 'Search events' });
  fireEvent.input(input, { target: { value: 'pytest + slow' } });
  fireEvent.change(ui.getByLabelText('Category'), { target: { value: 'tools' } });
  fireEvent.input(ui.getByLabelText('Tool name'), { target: { value: scope.tools[0] } });
  fireEvent.input(ui.getByLabelText('Agent ID'), { target: { value: scope.agents[0] } });
  fireEvent.click(ui.getByLabelText('Failures only'));
  fireEvent.change(ui.getByLabelText('Time range'), { target: { value: '900' } });
  expect(ui.calls).toHaveLength(1);
  fireEvent.submit(input.form);
  await ui.findByText('Showing 1 · 601 matched of 1,301 events in range');
  const params = Object.fromEntries(ui.calls.at(-1));
  expect(params).toEqual({ id: session.id, limit: '500', q: 'pytest + slow', category: 'tools', tool_name: scope.tools[0],
    flow_agent: scope.agents[0], failed: '1', since: String(end - 900), until: String(end) });
  expect(ui.container.querySelector('#dr-agfs')).toHaveTextContent('275');
  fireEvent.click(ui.getByRole('button', { name: /Show 600 older/ }));
  await waitFor(() => expect(Object.fromEntries(ui.calls.at(-1))).toEqual({ ...params, limit: '1500' }));
  fireEvent.change(ui.getByLabelText('Time range'), { target: { value: '3600' } });
  fireEvent.submit(input.form);
  await waitFor(() => expect(Object.fromEntries(ui.calls.at(-1))).toEqual({ ...params, since: String(end - 3600) }));
  fireEvent.click(ui.getByRole('button', { name: 'Reset filters' }));
  await waitFor(() => expect(Object.fromEntries(ui.calls.at(-1))).toEqual({ id: session.id, limit: '500' }));
  expect(input.value).toBe('');
});

it('validates local custom times without running an invalid query, and distinguishes no matches from failure', async () => {
  const ui = mount(p => p.has('since') ? payload([], { scope: { ...scope, matched: 0 } }) : payload([ev], { session_kql_url: 'javascript:alert(1)' }));
  await ui.findByText('Shell / local: pytest');
  expect(ui.queryByRole('link', { name: 'Open session in Kusto' })).toBeNull();
  fireEvent.change(ui.getByLabelText('Time range'), { target: { value: 'custom' } });
  const start = ui.getByLabelText('From (local)');
  const finish = ui.getByLabelText('To (local)');
  fireEvent.input(start, { target: { value: '2021-06-02T09:30' } });
  fireEvent.input(finish, { target: { value: '2021-06-01T10:00' } });
  fireEvent.submit(start.form);
  expect(ui.getByRole('alert')).toHaveTextContent('after start time');
  expect(ui.calls).toHaveLength(1);
  fireEvent.input(finish, { target: { value: '2021-06-02T10:00' } });
  fireEvent.submit(start.form);
  await ui.findByText('No events match these flow filters.');
  expect(Object.fromEntries(ui.calls.at(-1))).toMatchObject({
    since: String(new Date('2021-06-02T09:30').getTime() / 1000), until: String(new Date('2021-06-02T10:00').getTime() / 1000),
  });
  expect(ui.queryByRole('alert')).toBeNull();
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

it('groups crowded lanes without dropping events, uses only visible lanes for matches and does not drift to an older event', async () => {
  const crowded = Array.from({ length: 22 }, (_, i) => ({ ...ev, to: 'Tool' + i }));
  const selected = { ...ev, event_id: 'chosen', to: 'Selected tool', target: 'original' };
  const ui = mount(p => payload(p.has('tool_name') ? [selected] : p.get('limit') === '500' ? [selected, ...crowded]
    : [{ ...ev, to: 'Prepended' }, selected, ...crowded], { summary: { omitted_events: 1 } }));
  fireEvent.click(await ui.findByRole('button', { name: 'Swim-lane' }));
  const list = await ui.findByRole('list', { name: 'Events between participants, oldest first' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(23);
  expect(list.querySelectorAll('.bd-ag-slhead b')).toHaveLength(3);
  fireEvent.click(within(list).getByRole('button', { name: /Selected tool/ }));
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
