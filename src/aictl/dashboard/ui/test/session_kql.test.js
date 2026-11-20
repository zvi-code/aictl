import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { html } from 'htm/preact';
import SessionKql, { sessionKqlExamples } from '../src/components/board/agent/SessionKql.js';

const props = {
  url: 'https://adx.example:8443/My%20DB?web=1&query=old&autorun=true&autorun=true#old',
  sessionId: 'native-1', nodeId: 'server-a', sessions: ['native-1', null, 'other-A', 'other-B', 'other-A'],
  models: ['Model A', 'Model B'], tools: ['Shell / local', 'Search'], since: '0', until: 17.25,
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function open(overrides) {
  const ui = render(html`<${SessionKql} ...${{ ...props, ...overrides }}/>`);
  expect(ui.queryByLabelText('KQL query')).toBeNull();
  fireEvent.click(ui.getByText('Query in Kusto'));
  await ui.findByLabelText('KQL query');
  return ui;
}
const type = (input, value) => fireEvent.input(input, { target: { value } });
const key = (input, key, extra) => fireEvent.keyDown(input, { key, ...extra });

it('uses only fields and filters from the example source and never aggregates superseded rows', () => {
  const sid = '" \\ ;\r\n| take 7\u2028';
  const queries = Object.fromEntries(sessionKqlExamples({ sessionId: sid, model: '"M', tool: 'T\\', since: '0', until: 17.25 })
    .map(({ id, query }) => [id, query]));
  for (const [id, q] of Object.entries(queries)) {
    if (id === 'nodes') continue; // Fleet discovery has no local session scope.
    expect(q.split('\n')[0]).toBe('let sid = "\\" \\\\ ;\\r\\n| take 7\\u2028";');
    expect(q).toContain('union isfuzzy=true (datatable(');
    if (id.startsWith('cost')) continue; // Cost attribution has separate multi-table scope tests.
    if (id === 'spans' || id === 'reasoning') {
      expect(q).toContain('SessionId == sid');
      expect(q).toContain('| where StartTime >= unixtime_seconds_todatetime(0)');
      expect(q).toContain('| where StartTime < unixtime_seconds_todatetime(17.25)');
      expect(q).toContain('by TraceID, SpanID');
      expect(q).toContain('| where Model == "\\"M"');
      if (id === 'spans') expect(q).toContain('| where ToolName == "T\\\\"');
      expect(q).not.toContain('_v');
    } else {
      const step = ['steps', 'context', 'prompts', 'assistant', 'commands', 'longest'].includes(id);
      const clock = id === 'subagents' ? 'started_at' : 'ts';
      expect(q).toContain(`by ${step ? 'step_key' : id === 'subagents' ? 'agent_id' : 'rowid'}\n| where not(coalesce(_deleted, false))`);
      expect(q).toContain('session_id == sid');
      expect(q).toContain(`| where ${clock} >= 0\n| where ${clock} < 17.25`);
      const current = q.indexOf('arg_max(_v, *)');
      expect(current).toBeGreaterThan(0);
      expect(current).toBeLessThan(q.indexOf(`| where ${clock}`));
      if (step) expect(q).not.toMatch(/\b(model|tool_name):string|\| where (model|tool_name) ==/i);
      else if (id === 'requests' || id === 'subagents') {
        expect(q).toContain('| where model == "\\"M"');
        if (id === 'requests') expect(q.indexOf('sum(input_tokens)')).toBeGreaterThan(current);
        expect(q).not.toContain('tool_name');
      } else {
        expect(q).toContain('| where tool_name == "T\\\\"');
        expect(q).not.toContain('model');
      }
    }
  }
  expect(queries.context).toMatch(/where \['kind'\] == "context" or \(\['kind'\] == "session_command" and name in \([^)]*"model_change"[^)]*"reset"/);
  expect(queries.context.split('| project ').at(-1)).toContain("['kind'], name, phase");
  expect(queries.failures).toContain('| where is_error == 1');
  for (const { id, query } of sessionKqlExamples({ until: 'not a time' })) {
    if (id === 'nodes') continue;
    expect(query).toContain('where isnotempty(sid)');
    expect(query).toContain('| where false');
    expect(query).not.toContain('not a time');
  }
});

it('limits duration to complete native pairs and distinguishes unmeasured tool bytes from measured zero', () => {
  const q = Object.fromEntries(sessionKqlExamples(props).map(e => [e.id, e.query]));
  expect(q.longest).toMatch(/assistant\.turn_start.*phase == "started".*assistant\.turn_end.*phase == "ended"/);
  expect(q.longest).toContain('by session_id, agent_id, turn_id');
  expect(q.longest).toContain('starts == 1 and ends == 1 and end_ts >= start_ts');
  expect(q.subagents).not.toMatch(/\btask\b|\btop\b|\btake\b/);
  expect(q.subagents).toContain('agent_id != session_id');
  expect(q.sizes).toContain('iff(output_bytes >= 0, output_bytes, long(null))');
  expect(q.sizes).toMatch(/known=countif\(isnotnull\(bytes\)\), unknown=countif\(isnull\(bytes\)\)/);
  for (const p of [50, 95, 99]) expect(q.sizes).toContain(`percentile(bytes, ${p})`);
  expect(q.mcp).toContain('tool_name matches regex');
  expect(q.mcp).toMatch(/project event_time=.*source_event_id/);
});

it('ranks recorded cost only for exact, current links and returns scope coverage independently of any winner', () => {
  const q = Object.fromEntries(sessionKqlExamples({ ...props, includeAllSessions: true }).map(e => [e.id, e.query]));
  for (const cost of [q.costMain, q.costTree, q.costAll]) {
    expect(cost).toContain('join kind=leftouter (links) on session_id, $left.dedup_key == $right.request_key');
    expect(cost).toContain('link_version=max(_v) by request_key');
    expect(cost).toMatch(/variants == 1 and not\(coalesce\(_deleted, false\)\)/);
    expect(cost).toContain('isnull(physical_rows)');
    expect(cost).toContain('cost_usd > 0');
    expect(cost).toContain('eligible_requests=count(), attributed_requests=countif(attributed), unpriced_requests=countif(not(priced))');
    expect(cost).toContain('where turn_requests > turn_unpriced_requests');
    expect(cost).toContain('union coverage, winner');
  }
  expect(q.costMain).toContain('session_id == sid and isempty(agent_id)');
  expect(q.costMain).toContain('| where isempty(link_agent)');
  expect(q.costMain).toContain('and isnotempty(turn_id)');
  expect(q.costTree).toContain('session_id == sid or root_session_id == sid');
  for (const cost of [q.costTree, q.costAll]) {
    expect(cost).toContain('by root_session_id, root_turn_id');
    expect(cost).not.toContain('and isnotempty(turn_id)'); // A known spawn root need not have a child-local turn.
  }
});

it('inserts completions at the caret and copies or links the exact edited query, without a daemon request', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const writeText = vi.fn().mockResolvedValue();
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const ui = await open();
  const area = ui.getByRole('textbox', { name: 'KQL query' });
  type(area, 'req');
  key(area, 'ArrowDown'); key(area, 'Enter');
  expect(area).toHaveValue('requests');
  type(area, 'requests\n| whRE | project input_tok');
  area.setSelectionRange(13, 13); // after "wh" in the middle of the query
  key(area, ' ', { ctrlKey: true });
  key(area, 'ArrowDown'); key(area, 'Enter');
  expect(area).toHaveValue('requests\n| where | project input_tok');
  expect(area.selectionStart).toBe('requests\n| where'.length);
  area.setSelectionRange(area.value.length, area.value.length);
  key(area, ' ', { ctrlKey: true });
  key(area, 'Escape');
  expect(ui.queryByRole('listbox')).toBeNull();
  key(area, ' ', { ctrlKey: true });
  fireEvent.click(ui.getByRole('option', { name: 'input_tokens', exact: true }));
  expect(area).toHaveValue('requests\n| where | project input_tokens');
  const edited = `print note="&autorun=true#example"`;
  type(area, edited);
  fireEvent.click(ui.getByRole('button', { name: 'Copy query' }));
  await ui.findByText('Query copied.');
  expect(writeText).toHaveBeenCalledWith(edited);
  const link = ui.getByRole('link', { name: 'Open in Kusto' });
  const dest = new URL(link.href);
  expect(dest.origin + dest.pathname).toBe('https://adx.example:8443/My%20DB');
  expect(dest.hash).toBe('');
  expect([...dest.searchParams]).toEqual([['web', '1'], ['autorun', 'false'], ['query', edited]]);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  fireEvent.click(ui.getByRole('button', { name: 'Restore example' }));
  expect(area.value).toBe(sessionKqlExamples(props)[0].query);
  expect(fetch).not.toHaveBeenCalled();
});

it('preserves edits on refresh but never carries an old session or time window into a new scope', async () => {
  const ui = await open();
  const rerender = overrides => ui.rerender(html`<${SessionKql} ...${{ ...props, ...overrides }}/>`);
  const query = () => ui.getByLabelText('KQL query').value;
  type(ui.getByLabelText('KQL query'), 'print manual=1');
  rerender({ models: [...props.models, 'new model'] });
  expect(query()).toBe('print manual=1');
  rerender({ since: 9 });
  expect(query()).toContain('where ts >= 9');
  rerender({ sessionId: 'new session' });
  expect(ui.getByLabelText('Session ID')).toHaveValue('new session');
  expect(query()).toContain('let sid = "new session";');
});

it('keeps the editor usable without a safe HTTPS database link or clipboard permission', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  const ui = await open({ sessionId: null, sessions: null, url: null });
  expect(ui.getByText(/An empty ID matches no rows/)).toBeInTheDocument();
  for (const url of [null, '/relative', 'javascript:alert(1)', 'http://adx.test/db', 'https://user:pass@adx.test/db', 'https://adx.test/']) {
    ui.rerender(html`<${SessionKql} url=${url} sessionId=${null}/>`);
    expect(ui.queryByRole('link')).toBeNull();
  }
  const area = ui.getByLabelText('KQL query');
  fireEvent.click(ui.getByRole('button', { name: 'Copy query' }));
  await ui.findByText(/Use your device’s Copy command/);
  expect(area).toHaveFocus();
  expect([area.selectionStart, area.selectionEnd]).toEqual([0, area.value.length]);
  type(area, ' ');
  expect(ui.getByRole('button', { name: 'Copy query' })).toBeDisabled();
});

it('syncs active Flow filters into the KQL preset and parameters on request', async () => {
  const ui = await open({
    flowFilters: { category: 'tools', tool_name: 'Shell / local', failed: '1' },
  });
  expect(ui.getByText(/Active Flow filters detected/)).toHaveTextContent('tool=Shell / local');
  fireEvent.click(ui.getByRole('button', { name: 'Sync with Flow filters' }));
  const query = ui.getByLabelText('KQL query').value;
  expect(query).toContain('tool_invocations');
  expect(query).toContain('| where tool_name == "Shell / local"');
  expect(query).toContain('| where is_error == 1');
});

