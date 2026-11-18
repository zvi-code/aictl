import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import SessionKql, { sessionKqlExamples } from '../src/components/board/agent/SessionKql.js';

const props = {
  url: 'https://adx.example:8443/My%20DB?web=1&query=old&autorun=true&autorun=true#old',
  sessionId: 'native-1', sessions: ['native-1', null, 'other-A', 'other-B', 'other-A'],
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
const select = (ui, id) => fireEvent.change(ui.getByLabelText('Example'), { target: { value: id } });

it('uses only fields and filters from the example source and never aggregates superseded rows', () => {
  const sid = '" \\ ;\r\n| take 7\u2028';
  const queries = Object.fromEntries(sessionKqlExamples({ sessionId: sid, model: '"M', tool: 'T\\', since: '0', until: 17.25 })
    .map(({ id, query }) => [id, query]));
  for (const [id, q] of Object.entries(queries)) {
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
  for (const { query } of sessionKqlExamples({ until: 'not a time' })) {
    expect(query).toContain('where isnotempty(sid)');
    expect(query).toContain('| where false');
    expect(query).not.toContain('not a time');
  }
});

it('offers retained prompt previews only by explicit selection, without sending prompt content to the browser or URL', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const ui = await open({ url: 'https://adx.example/db?query=private-server-seed&autorun=true' });
  const examples = sessionKqlExamples(props);
  for (const { id, query } of examples.filter(e => !['prompts', 'assistant', 'commands'].includes(e.id))) {
    expect(query, id).not.toMatch(/session_step_text|prompt_preview|\['text'\]/);
  }
  const original = ui.getByLabelText('KQL query').value;
  expect(original).not.toContain('session_step_text');
  const option = ui.getByRole('option', { name: 'User input prompts' });
  select(ui, option.value);
  const query = ui.getByLabelText('KQL query').value;
  const [steps, texts] = query.split('| join kind=inner (');
  expect(steps).toContain('), session_steps');
  expect(steps).toContain('by step_key\n| where not(coalesce(_deleted, false))\n| where isnotempty(sid) and session_id == sid');
  expect(steps).toContain(`| where ['kind'] == "message" and role == "user" and ['source'] == "user.message"`);
  expect(steps).toContain('text_status in ("captured", "truncated")');
  expect(query).not.toMatch(/gen_ai|agent_prompt|OTELTraces|assistant/);
  expect(texts).toContain('), session_step_text');
  expect(texts).toContain('where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)');
  expect(texts).toContain(`substring(trim(@"\\s+", ['text']), 0, 240)`);
  expect(texts).toMatch(/arg_max\(_v, \*\) by step_key\s*\| where not\(coalesce\(_deleted, false\)\) and session_id == sid and isnotempty\(text_preview\) and matched/);
  expect(texts).toContain(') on session_id, step_key');
  expect(texts.split('| project ').at(-1)).toMatch(/text_status, prompt_preview=text_preview$/);
  const link = new URL(ui.getByRole('link').href);
  expect(link.searchParams.get('query')).toBe(query);
  expect(link.searchParams.get('autorun')).toBe('false');
  expect(link.href).not.toContain('private-server-seed');
  expect(fetch).not.toHaveBeenCalled();
  select(ui, 'steps');
  expect(ui.getByLabelText('KQL query')).toHaveValue(original);
});

it('searches retained messages, not preview prefixes or hidden fields, and separates command evidence from messages', async () => {
  const ui = await open();
  const query = () => ui.getByLabelText('KQL query').value;
  for (const [id, role] of [['prompts', 'user'], ['assistant', 'assistant']]) {
    select(ui, id);
    type(ui.getByLabelText('Keyword or phrase (optional)'), 'cost "spike" | count');
    expect(query()).toContain(`let needle = "cost \\"spike\\" | count";`);
    expect(query()).toContain(`role == "${role}" and ['source'] == "${role}.message"`);
    expect(query()).toContain("['text'] contains needle");
    expect(query()).not.toContain('text_preview contains needle');
    if (id === 'assistant') expect(query()).toContain('| where phase in ("", "commentary", "response", "final", "final_answer")');
    expect(query()).not.toMatch(/TraceAttributes|gen_ai\.|reasoning/i);
  }
  select(ui, 'commands');
  expect(ui.queryByLabelText(/Keyword or phrase/)).toBeNull();
  expect(query()).toContain(`['kind'] == "tool_call" and phase == "requested"`);
  expect(query()).toContain(`['kind'] == "command" and phase == "started"`);
  expect(query()).toContain(`['kind'] == "tool_result" and phase in ("completed", "failed")`);
  expect(query()).toContain('join kind=leftouter'); // Missing retained text must not erase a lifecycle event.
  select(ui, 'reasoning');
  expect(query()).toContain('tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"])');
  expect(query().match(/TraceAttributes\[/g)).toHaveLength(1);
  expect(query()).not.toMatch(/session_step_text|project.*,\s*TraceAttributes(?:,|\n)/);
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

it('requires explicit global opt-in and never generates an unbounded global query', async () => {
  const ui = await open({ since: null, until: null });
  select(ui, 'costAll');
  expect(ui.queryByRole('link')).toBeNull();
  expect(ui.queryByLabelText('KQL query')).toBeNull();
  fireEvent.click(ui.getByRole('checkbox', { name: /Include all sessions/ }));
  const all = ui.getByLabelText('KQL query').value;
  expect(all).toContain('window_end = now();\nlet window_start = window_end - 7d');
  expect(all).not.toContain(props.sessionId);
  expect(new URL(ui.getByRole('link').href).searchParams.get('autorun')).toBe('false');
  ui.rerender(html`<${SessionKql} ...${props}/>`);
  expect(ui.queryByRole('link')).toBeNull(); // Previously confirmed dates no longer match.
  expect(sessionKqlExamples(props).some(e => e.id === 'costAll')).toBe(false);
  const global = bounds => sessionKqlExamples({ ...bounds, includeAllSessions: true }).find(e => e.id === 'costAll').query;
  expect(global({ since: 0 })).toContain('window_end = window_start + 7d');
  expect(global({ until: 50 })).toContain('unixtime_seconds_todatetime(50);\nlet window_start = window_end - 7d');
  expect(global({ until: 'bad' })).toContain('window_end = datetime(null)');
  expect(global(props)).toContain('ts < (window_end - datetime(1970-01-01)) / 1s');
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

it('filters observed choices by prefix, supports keyboard and pointer selection, and retains unlisted values', async () => {
  const ui = await open();
  const sid = ui.getByRole('combobox', { name: 'Session ID' });
  expect(sid).toHaveValue('native-1');
  expect(ui.queryByRole('combobox', { name: /Model/ })).toBeNull();
  type(sid, 'OTH');
  const list = ui.getByRole('listbox', { name: 'Session ID suggestions' });
  expect(within(list).getAllByRole('option').map(o => o.textContent)).toEqual(['other-A', 'other-B']);
  key(sid, 'ArrowUp');
  expect(document.getElementById(sid.getAttribute('aria-activedescendant'))).toHaveTextContent('other-B');
  key(sid, 'Enter');
  expect(sid).toHaveValue('other-B');
  expect(sid).toHaveAttribute('aria-expanded', 'false');
  select(ui, 'spans');
  const model = ui.getByRole('combobox', { name: /Model/ });
  const tool = ui.getByRole('combobox', { name: /Tool name/ });
  type(model, 'model b');
  fireEvent.click(ui.getByRole('option', { name: 'Model B' }));
  type(tool, 'she');
  key(tool, 'ArrowDown'); key(tool, 'Enter');
  const query = () => ui.getByLabelText('KQL query').value;
  expect(query()).toContain('let sid = "other-B"');
  expect(query()).toContain('where Model == "Model B"\n| where ToolName == "Shell / local"');
  type(tool, 'not on board');
  expect(ui.getByText(/No matching suggestion/)).toBeInTheDocument();
  key(tool, 'Tab');
  expect(query()).toContain('where ToolName == "not on board"');
  select(ui, 'requests');
  expect(ui.queryByLabelText(/Tool name \(optional\)/)).toBeNull();
  expect(query()).toContain('where model == "Model B"');
  expect(query()).not.toContain('not on board');
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
