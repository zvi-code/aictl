import { boardUrl, captureFrame, expect, provideCatalog, recordedUrl, test } from './fixtures.mjs';

const drawer = page => page.locator('#drawer');
const agentUrl = (replay, id, tab) => `${replay.url}${boardUrl}&${new URLSearchParams({ agent: id, tab })}`;
const selectTab = (page, name) => drawer(page).getByRole('tab', { name, exact: true }).click();

async function prepare(page) {
  await page.clock.setFixedTime(new Date('2026-11-20T00:21:24Z'));
  await provideCatalog(page);
}

async function recordedAgent(replay) {
  const url = await recordedUrl(replay, '/api/board/agent');
  return { id: url.searchParams.get('id'), detail: await (await fetch(url)).json() };
}

test('DRW-01: tabs load on selection and update the drawer URL', async ({ page, snapshotReplay, capture }) => {
  const id = (await recordedUrl(snapshotReplay, '/api/board/agent')).searchParams.get('id');
  await prepare(page);
  let transcriptLoaded = false;
  page.on('request', request => {
    if (/\/assets\/Transcript-[^/]+\.js$/.test(new URL(request.url()).pathname)) transcriptLoaded = true;
  });
  await page.goto(agentUrl(snapshotReplay, id, 'flow'));
  await expect(drawer(page).getByRole('tab', { name: 'Flow', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(transcriptLoaded).toBe(false);
  for (const [label, key] of [
    ['Transcript', 'transcript'], ['Context', 'context'], ['Overview', 'overview'],
    ['Instructions', 'instructions'], ['Timeline', 'timeline'], ['Turns', 'turns'], ['Tool calls', 'tools'],
    ['Failures and loops', 'errors'], ['Changes', 'changes'], ['Artifacts', 'artifacts'], ['Commits', 'commits'],
    ['Events', 'events'], ['Team', 'team'], ['Processes', 'procs'], ['Integrations', 'integrations'],
    ['Source steps', 'evidence'], ['OTel', 'otel'], ['Native output', 'native'], ['KQL', 'kql'],
  ]) {
    const tab = drawer(page).getByRole('tab', { name: label, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(new RegExp(`[?&]tab=${key}(?:&|$)`));
  }
  expect(transcriptLoaded).toBe(true);
  const resize = drawer(page).getByRole('separator');
  const width = async () => (await drawer(page).boundingBox()).width;
  const original = await width();
  await resize.focus();
  await resize.press('ArrowLeft');
  expect(await width()).toBeGreaterThan(original);
  await resize.dblclick();
  expect(await width()).toBe(original);
  await drawer(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(drawer(page)).toBeHidden();
  expect(capture.errors.filter(error => error.kind === 'exception')).toEqual([]);
});

test('DRW-TR-01: scroll the largest recorded transcript once', async ({ page, snapshotReplay, capture }, info) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/agent/transcript');
  const { turns } = await (await fetch(url)).json();
  expect(turns).toHaveLength(47);
  await prepare(page);
  await page.goto(agentUrl(snapshotReplay, url.searchParams.get('id'), 'transcript'));
  await expect(drawer(page).getByRole('heading', { name: 'Transcript, oldest first' })).toBeVisible();
  const scroll = drawer(page).getByRole('region', { name: 'Transcript turns scroll area' });
  const rendered = scroll.getByRole('listitem');
  await expect(rendered.first()).toBeVisible();
  expect(await rendered.count()).toBeLessThan(turns.length);
  await captureFrame(page);
  expect(await scroll.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
  const measurement = await scroll.evaluate(async element => {
    const supported = PerformanceObserver.supportedEntryTypes.includes('longtask');
    const entries = [];
    const observer = new PerformanceObserver(list => entries.push(...list.getEntries()));
    observer.observe({ type: 'longtask' });
    const start = performance.now();
    element.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
    const position = element.scrollTop;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, 70));
    const end = performance.now();
    entries.push(...observer.takeRecords());
    observer.disconnect();
    return { supported, position, finalPosition: element.scrollTop,
      durations: entries.filter(entry => entry.startTime >= start && entry.startTime < end).map(entry => entry.duration) };
  });
  const longest = Math.max(0, ...measurement.durations);
  console.log(`Largest recorded transcript: ${turns.length} rows, longest observed long task: ${longest} ms`);
  await info.attach('transcript scroll', { contentType: 'application/json',
    body: JSON.stringify({ turns: turns.length, longest, ...measurement }) });
  expect(measurement.supported).toBe(true);
  expect(measurement.position).toBeGreaterThan(0);
  expect(measurement.finalPosition).toBeGreaterThan(0);
  expect(longest).toBeLessThan(50);
  await expect(scroll.locator(`[aria-posinset="${turns.length}"]`)).toBeVisible();
  expect(capture.errors.filter(error => error.kind === 'exception')).toEqual([]);
});

test('DRW-DF-01/02: file drawer loads the recorded editor text without a write', async ({ page, snapshotReplay, capture }) => {
  const url = await recordedUrl(snapshotReplay, '/api/settings/file');
  const path = url.searchParams.get('path');
  const { text } = await (await fetch(url)).json();
  await prepare(page);
  const writes = [];
  page.on('request', request => {
    if (request.method() !== 'GET' && request.url().includes('/api/settings/file')) writes.push(request.method());
  });
  await page.goto(`${snapshotReplay.url}${boardUrl}&detail=file&record=${encodeURIComponent(path)}`);
  await expect(drawer(page).getByRole('heading', { name: path })).toBeVisible();
  await drawer(page).getByRole('button', { name: 'Edit file' }).click();
  await expect(drawer(page).getByRole('textbox', { name: 'File text' })).toHaveValue(text.replace(/\r\n/g, '\n'));
  await expect(drawer(page).getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await drawer(page).getByRole('button', { name: 'Close editor' }).click();
  await expect(drawer(page).getByRole('textbox', { name: 'File text' })).toBeHidden();
  expect(writes).toEqual([]);
  expect(capture.errors.filter(error => error.kind === 'exception')).toEqual([]);
});

test('DRW-DP-01: recorded missing prompt is shown as a read error', async ({ page, snapshotReplay }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/prompt');
  const response = await fetch(url);
  expect(response.status).toBe(404);
  const { error } = await response.json();
  const params = new URLSearchParams({ detail: 'prompt', record: url.searchParams.get('session_id'),
    detail_ts: url.searchParams.get('ts') });
  await prepare(page);
  await page.goto(`${snapshotReplay.url}${boardUrl}&${params}`);
  await expect(drawer(page).getByRole('heading', { name: 'Prompt', exact: true })).toBeVisible();
  await expect(drawer(page).getByRole('alert')).toContainText(`Could not load this: ${error}`);
});

test('DRW-FL-01/02 and DRW-EV-01: filter, page and inspect source evidence without losing Flow mode', async ({ page, snapshotReplay }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/agent/flow');
  const id = url.searchParams.get('id');
  const recorded = await (await fetch(url)).json();
  const steps = [];
  const flow = [];
  const event = (type, ts, extra = {}) => ({ type, ts, source: 'recorded', rt_tokens: null, cum_tokens: null, ...extra });
  const turns = [
    event('user_message', 10, { step_key: 's1', turn_id: 't1', message: 'A retained prompt' }),
    event('tool_use', 11, { step_key: 's2', turn_id: 't1', to: 'Read' }),
    event('tool_use', 12, { step_key: 's3', turn_id: 't1', to: 'Grep' }),
    event('user_message', 46, { step_key: 's4', turn_id: 't2', redacted: true }),
  ];
  await prepare(page);
  await page.route('**/api/board/agent/flow?*', route => {
    const params = new URL(route.request().url()).searchParams;
    flow.push(Object.fromEntries(params));
    const filtered = params.get('category') === 'prompts' ? turns.filter(item => item.type === 'user_message' && !item.redacted) : turns;
    return route.fulfill({ json: { ...recorded, turns: filtered, summary: { ...recorded.summary,
      total_turns: 2, omitted_events: params.get('limit') === '500' ? 1000 : 0 }, scope: { ...recorded.scope, end: 100 } } });
  });
  await page.route('**/api/session-evidence?*', route => {
    const params = new URL(route.request().url()).searchParams;
    steps.push(Object.fromEntries(params));
    const second = params.get('offset') === '100' || params.get('step_key') === 's2';
    const step = { step_key: second ? 's2' : 's1', kind: 'tool_call', source: 'hook', text_status: 'captured',
      text_preview: 'retained needle', text: 'full retained text', ts: 11, turn_id: 't1' };
    return route.fulfill({ json: { session_id: id, rows: [step], has_more: !second, limit: 100, offset: second ? 100 : 0 } });
  });
  await page.goto(agentUrl(snapshotReplay, id, 'flow'));
  await expect(drawer(page).getByRole('heading', { name: 'Session flow' })).toBeVisible();
  await drawer(page).getByRole('button', { name: /Load older events/ }).click();
  await expect.poll(() => flow.some(request => request.limit === '1500')).toBe(true);
  await drawer(page).getByRole('radio', { name: 'Swim-lane' }).click();
  const lanes = drawer(page).getByRole('region', { name: 'Session streams', exact: true });
  await expect(lanes.getByText('Tools · Read', { exact: true })).toBeVisible();
  await drawer(page).getByRole('radio', { name: 'Grouped lanes' }).click();
  await expect(lanes.getByText('Tools', { exact: true })).toBeVisible();
  await lanes.getByRole('button', { name: /Read/ }).click();
  await expect(drawer(page).getByRole('heading', { name: 'Event inspector' })).toBeVisible();
  await drawer(page).getByRole('button', { name: 'User prompts' }).click();
  await drawer(page).getByRole('searchbox', { name: 'Search prompt text' }).fill('retained');
  await drawer(page).getByRole('button', { name: 'Apply filters' }).click();
  await expect.poll(() => flow.some(request => request.category === 'prompts' && request.q === 'retained')).toBe(true);
  await drawer(page).getByRole('button', { name: 'Source steps' }).click();
  await drawer(page).getByRole('searchbox', { name: 'Search retained text' }).fill('needle');
  await drawer(page).getByRole('button', { name: 'Search', exact: true }).click();
  await drawer(page).getByRole('button', { name: 'Older' }).click();
  await drawer(page).getByRole('button', { name: 'Inspect step s2' }).click();
  await expect(drawer(page).getByText('full retained text', { exact: true })).toBeVisible();
  expect(steps.some(request => request.q === 'needle' && request.offset === '100')).toBe(true);
  await drawer(page).getByRole('button', { name: 'Show Flow' }).click();
  await expect(drawer(page).getByRole('radio', { name: 'Swim-lane' })).toBeChecked();
  await drawer(page).getByRole('button', { name: 'Source steps' }).click();
  await expect(drawer(page).getByText('full retained text', { exact: true })).toBeVisible();
});

test('DRW-KQ-01/02: use backend metadata, edit exact query and require all-session consent', async ({ page, snapshotReplay }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/agent/flow');
  const id = url.searchParams.get('id');
  const payload = await (await fetch(url)).json();
  const requests = [];
  const presets = [
    { id: 'steps', label: 'Steps', title: 'Steps timeline', all_sessions: false },
    { id: 'costAll', label: 'Turn cost (all)', title: 'All session costs', all_sessions: true },
  ];
  await prepare(page);
  await page.route('**/api/board/agent/flow?*', route => route.fulfill({ json: { ...payload,
    node_id: 'recording-node', session_kql_url: 'https://example.kusto.windows.net/records?web=1' } }));
  await page.route(/\/api\/board\/agent\/kql(?:\?|$)/, route => {
    const params = Object.fromEntries(new URL(route.request().url()).searchParams);
    requests.push(params);
    return route.fulfill({ json: params.preset ? { query: 'print result = 1' } :
      { presets, tables: ['session_steps'], fields: ['session_id', 'step_key'], operators: ['project'] } });
  });
  await page.goto(agentUrl(snapshotReplay, id, 'kql'));
  const editor = drawer(page).getByRole('textbox', { name: 'KQL query' });
  await expect(editor).toHaveValue('print result = 1');
  await editor.fill('session_steps | pro');
  await editor.press('End');
  await editor.press('Control+Space');
  await editor.press('ArrowDown');
  await editor.press('Enter');
  await expect(editor).toHaveValue('session_steps | project');
  const href = await drawer(page).getByRole('link', { name: 'Open in Kusto' }).getAttribute('href');
  expect(new URL(href).searchParams.get('query')).toBe('session_steps | project');
  expect(new URL(href).searchParams.get('autorun')).toBe('false');
  await drawer(page).getByRole('button', { name: 'Turn cost (all)', exact: true }).click();
  await expect(drawer(page).getByRole('button', { name: 'Generate query' })).toBeDisabled();
  await drawer(page).getByRole('checkbox', { name: /Include all sessions/ }).check();
  await expect.poll(() => requests.find(row => row.preset === 'costAll')?.include_all_sessions).toBe('1');
  await drawer(page).getByRole('spinbutton', { name: 'Since (Unix seconds)' }).fill('100');
  await expect(drawer(page).getByRole('checkbox', { name: /Include all sessions/ })).not.toBeChecked();
});

test('DRW-DF-02: conflict retains the draft and reload replaces it before a safe save', async ({ page, snapshotReplay }) => {
  const url = await recordedUrl(snapshotReplay, '/api/settings/file');
  const path = url.searchParams.get('path');
  const writes = [];
  await prepare(page);
  await page.route('**/api/settings/file?*', route => route.fulfill({
    json: { path, text: writes.length ? 'changed elsewhere' : 'initial', mtime: writes.length ? 7 : 6, masked: false, size: 12 },
  }));
  await page.route('**/api/settings/file', async route => {
    const data = route.request().postDataJSON();
    writes.push(data);
    if (writes.length === 1) return route.fulfill({ status: 409, json: { error: 'The file changed on disk.' } });
    return route.fulfill({ json: { ...data, mtime: 8, masked: false, size: 12, backup_path: 'file.backup' } });
  });
  await page.goto(`${snapshotReplay.url}${boardUrl}&detail=file&record=${encodeURIComponent(path)}`);
  await drawer(page).getByRole('button', { name: 'Edit file' }).click();
  const editor = drawer(page).getByRole('textbox', { name: 'File text' });
  await expect(editor).toHaveValue('initial');
  await editor.fill('my draft');
  await drawer(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(drawer(page).getByText('The file changed on disk.')).toBeVisible();
  await expect(editor).toHaveValue('my draft');
  await drawer(page).getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(editor).toHaveValue('changed elsewhere');
  await editor.fill('merged');
  await drawer(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(drawer(page).getByText('Saved. Backup: file.backup')).toBeVisible();
  expect(writes).toEqual([{ path, text: 'my draft', expected_mtime: 6 }, { path, text: 'merged', expected_mtime: 7 }]);
});

test('DRW-ET-01: sort a keyed event list and keep the selected detail intact', async ({ page, snapshotReplay }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/agent');
  const id = url.searchParams.get('id');
  await prepare(page);
  await page.route('**/api/events?*', route => route.fulfill({ json: [
    { seq: 12, ts: 1795134133, kind: 'zeta', tool: 'tool-a', detail: { id: 12, note: 'selected event detail' } },
    { seq: 11, ts: 1795134132, kind: 'alpha', tool: 'tool-a', detail: { id: 11 } },
  ] }));
  await page.route('**/api/events/count?*', route => route.fulfill({ json: { count: 2 } }));
  await page.goto(agentUrl(snapshotReplay, id, 'events'));
  const table = drawer(page).getByRole('table', { name: 'Events', exact: true });
  await table.getByRole('button', { name: 'Inspect zeta' }).click();
  const kind = table.getByRole('columnheader', { name: 'Kind', exact: true });
  await kind.getByRole('button').click();
  await expect(kind).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.getByRole('row').nth(1)).toContainText('alpha');
  await kind.getByRole('button').click();
  await expect(kind).toHaveAttribute('aria-sort', 'descending');
  await expect(table.getByRole('row').nth(1)).toContainText('zeta');
  await expect(drawer(page).getByText(/selected event detail/)).toBeVisible();
});

test('DRW-TR-01: deep turn reads are lazy and keep the preview while pending', async ({ page, snapshotReplay }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/agent/transcript');
  const transcript = await (await fetch(url)).json();
  const turn = { ...transcript.turns[0], detail: true, prompt_preview: 'Retained preview', response: '', response_preview: '' };
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const requests = [];
  await prepare(page);
  await page.route('**/api/board/agent/transcript?*', async route => {
    const ts = new URL(route.request().url()).searchParams.get('turn');
    if (!ts) return route.fulfill({ json: { ...transcript, capture_mode: 'full', replies_kept: true, turns: [turn] } });
    requests.push(ts);
    await pending;
    return route.fulfill({ json: { ...transcript, capture_mode: 'full',
      turn: { ...turn, prompt: 'The exact prompt', response: '**Retained Markdown**', actions: [
        { ts: turn.ts, kind: 'tool_use', name: 'read-file', summary: 'Read an example', duration_ms: 60, success: true },
      ] } } });
  });
  await page.goto(agentUrl(snapshotReplay, url.searchParams.get('id'), 'transcript'));
  await expect(drawer(page).getByText('Retained preview', { exact: false })).toBeVisible();
  expect(requests).toEqual([]);
  await drawer(page).getByRole('button', { name: /^Turn 1 ·/ }).click();
  await expect(drawer(page).getByRole('status').filter({ hasText: 'Reading the turn' })).toBeVisible();
  await expect(drawer(page).getByText('Retained preview', { exact: false })).toBeVisible();
  release();
  await expect(drawer(page).locator('strong').getByText('Retained Markdown')).toBeVisible();
  await expect(drawer(page).getByRole('table', { name: 'Actions of turn 1' })).toContainText('read-file');
  await drawer(page).getByRole('button', { name: 'Source', exact: true }).click();
  await expect(drawer(page).getByText('**Retained Markdown**', { exact: true })).toBeVisible();
  expect(requests).toEqual([String(turn.ts)]);
});

test('DRW-02 and DRW-NO-01: scoped live details arrive without REST and native output stays separate', async ({ page, snapshotReplay }) => {
  const { id, detail } = await recordedAgent(snapshotReplay);
  const transcriptUrl = await recordedUrl(snapshotReplay, '/api/board/agent/transcript');
  const transcript = await (await fetch(transcriptUrl)).json();
  const reads = [];
  await prepare(page);
  page.on('request', request => {
    if (/\/api\/board\/agent(?:\/flow|\/transcript)?\?/.test(request.url())) reads.push(request.url());
  });
  await page.addInitScript(({ id, agent }) => {
    const subscriptions = [];
    let sequence = 0;
    window.drawerSubscriptions = subscriptions;
    const entity = (topic, id, source, data) => ({ topic, id, source, data, revision: 1 });
    const evidence = entity('configuration.loaded', 's', 'runtime.evidence', {
      session_id: id, native_session_id: id, tool: agent.tool, configured_on_disk: true, effective_known: true,
      evidence: [{ key: 'model', source: 'startup argument', observed_at: 1795134133, value: 'observed-model' }],
      unknown: ['budget'],
    });
    const process = entity('runtime.agent', id, 'runtime.collector', {
      ...agent, id, native_session_id: id, session_id: id, running: true, status: 'waiting', pids: [],
    });
    const line = (key, order, text, retained = true) => entity('runtime.output', key, 'runtime.native',
      { session_id: id, entry_id: key, order, kind: 'assistant', ts: 1795134133 + order,
        content_retained: retained, tail_truncated: true, text });
    window.EventSource = class {
      constructor(url) {
        this.listeners = {};
        const query = new URL(url, location.origin).searchParams;
        this.watch = query.get('agent_watch');
        for (const key of ['agent_watch', 'cursor', 'history']) query.delete(key);
        query.sort();
        this.scope = query.toString();
        subscriptions.push(this);
        queueMicrotask(() => {
          if (this.closed) return;
          this.onopen?.();
          this.send('bootstrap', { capabilities: { enabled: true, protocol: 1, topics: {
            'history.agent': { delivery: 'latest', sources: ['kusto.queryable'] },
            'runtime.agent': { delivery: 'latest', sources: ['runtime.collector'] },
            'runtime.output': { delivery: 'ordered', sources: ['runtime.native'] },
            'configuration.loaded': { delivery: 'latest', sources: ['runtime.evidence'] },
          }, capture_mode: 'full' },
            entities: [process, evidence, line('second', 2, 'Second live line'), line('first', 1, 'First live line'),
              line('third', 3, 'Should not be present', false)] });
        });
      }
      addEventListener(type, cb) { this.listeners[type] = cb; }
      close() { this.closed = true; }
      send(type, fields) {
        if (this.closed) return;
        sequence += 1;
        this.listeners[type]?.({ data: JSON.stringify({ protocol: 1, scope: this.scope,
          epoch: 'drawer', cursor: `drawer:${sequence}`, sequence, ...fields }) });
      }
    };
  }, { id, agent: detail.agent });
  await page.goto(snapshotReplay.url + boardUrl);
  await expect.poll(() => page.evaluate(() => window.drawerSubscriptions.length)).toBeGreaterThan(0);
  await page.evaluate(id => document.dispatchEvent(new CustomEvent('aictl:select-session', { detail: { sessionId: id } })), id);
  await selectTab(page, 'Transcript');
  await expect.poll(() => page.evaluate(() => window.drawerSubscriptions.at(-1)?.watch)).toBe(`transcript:${id}`);
  await expect(drawer(page).getByRole('status').filter({ hasText: 'Loading' }).first()).toBeVisible();
  await drawer(page).getByText(/Effective runtime settings/).click();
  await expect(drawer(page).getByText(/observed-model/)).toBeVisible();
  const output = drawer(page).getByRole('region', { name: 'Ordered native output scroll area' });
  await expect(output.getByRole('listitem').nth(0)).toContainText('First live line');
  await expect(output.getByRole('listitem').nth(1)).toContainText('Second live line');
  await expect(output.getByRole('listitem').nth(2)).toContainText('Text not retained');
  await expect(output).not.toContainText('Should not be present');
  await page.evaluate(({ id, transcript }) => {
    window.drawerSubscriptions.at(-1).send('change', { upserts: [{ topic: 'history.agent', id: 'history', revision: 2,
      source: 'kusto.queryable', data: { agent_id: id, view: 'transcript', status: 200, value: { ...transcript, turns: [] } } }],
    removals: [] });
  }, { id, transcript });
  await expect(drawer(page).getByText('No recorded turns in this session.')).toBeVisible();
  await selectTab(page, 'Overview');
  await expect.poll(() => page.evaluate(() => window.drawerSubscriptions.at(-1)?.watch)).toBe(`detail:${id}`);
  await page.evaluate(({ id, detail }) => {
    window.drawerSubscriptions.at(-1).send('change', { upserts: [{ topic: 'history.agent', id: 'summary', revision: 2,
      source: 'kusto.queryable', data: { agent_id: id, view: 'detail', status: 200, value: detail } }],
    removals: [] });
  }, { id, detail });
  await expect(drawer(page).getByRole('heading', { name: 'Session totals' })).toBeVisible();
  expect(reads).toEqual([]);
});

test('DRW-AR-01, DRW-CM-01 and DRW-IN-01: guard artifact reads, identify observed loads and link PRs', async ({ page, snapshotReplay }) => {
  const { id, detail } = await recordedAgent(snapshotReplay);
  const file = 'X:\\example\\AGENTS.md';
  const skipped = 'X:\\example\\large.log';
  const reads = [];
  await prepare(page);
  await page.route('**/api/board/agent?*', route => route.fulfill({ json: {
    ...detail, artifacts_total: 4, artifacts_bytes: 4096,
    artifacts: [{ name: 'AGENTS.md', path: file, viewable: true, exists: true, kind: 'instructions' },
      { name: 'large.log', path: skipped, viewable: false, exists: true, kind: 'output' }],
    context_files: { read: true, source: 'record', git_root: 'X:\\example', total: 2,
      files: [{ path: file }, { path: skipped }], loaded: [{ path: file, source: 'hook', detail: 'Project', ts: 123 }] },
    commits: [{ sha: '12345678', short_sha: '1234567', ts: 1795134133, subject: 'Handle replay',
      prs: [{ number: 42, title: 'Review replay', state: 'merged', url: 'https://github.com/example/project/pull/42' }] }],
  } }));
  await page.route('**/api/file?*', route => {
    reads.push(new URL(route.request().url()).searchParams.get('path'));
    return route.fulfill({ contentType: 'text/plain', body: '## Retained artifact' });
  });
  await page.goto(agentUrl(snapshotReplay, id, 'artifacts'));
  await expect(drawer(page).getByText('Showing 2 of 4 indexed artifacts.')).toBeVisible();
  await drawer(page).getByRole('button', { name: 'Inspect large.log' }).click();
  await expect(drawer(page).getByText(/does not establish/)).toBeVisible();
  expect(reads).toEqual([]);
  await drawer(page).getByRole('searchbox', { name: 'Filter artifacts' }).fill('agents');
  await expect(drawer(page).getByRole('button', { name: 'Inspect large.log' })).toBeHidden();
  await drawer(page).getByRole('button', { name: 'Inspect AGENTS.md' }).click();
  await expect(drawer(page).getByRole('heading', { name: 'Retained artifact' })).toBeVisible();
  expect(reads).toEqual([file]);
  await selectTab(page, 'Instructions');
  await expect(drawer(page).getByRole('table', { name: 'Observed loads' })).toContainText('Project');
  await drawer(page).getByRole('searchbox', { name: 'Filter files by name or folder' }).fill('agents');
  await expect(drawer(page).getByRole('table', { name: 'Instruction files' })).toContainText('Observed');
  await expect(drawer(page).getByRole('table', { name: 'Instruction files' })).not.toContainText('large.log');
  await selectTab(page, 'Commits');
  await drawer(page).getByRole('button', { name: 'Inspect commit 1234567' }).click();
  await expect(drawer(page).getByRole('link', { name: '#42 Review replay · merged' })).toHaveAttribute('href', 'https://github.com/example/project/pull/42');
});

test('DRW-CT-01, DRW-OV-01 and DRW-OT-01: keep context estimates, spans and cost distinct', async ({ page, snapshotReplay }) => {
  const { id, detail } = await recordedAgent(snapshotReplay);
  const spans = { count: 1, last_ts: 1795134133 };
  await prepare(page);
  await page.route('**/api/board/agent?*', route => route.fulfill({ json: {
    ...detail, agent: { ...detail.agent, parent_id: null },
    context: { ...detail.context, last: 450, prompt_limit: 1000, series: [320, 450], breakdown: {
      total: 450, limit: 1000, parts: [{ key: 'user', label: 'User messages', tokens: 100, estimated: true, items: [
        { name: 'Measured source', tokens: 100 },
      ] }], reported: { source: 'tool context report', total: 275, limit: 1000,
        parts: [{ key: 'tools', label: 'Tool definitions', tokens: 275 }] },
    } },
    otel: { spans, span_events: spans, logs: spans, totals: { ai_credits: 1.25, calls: 1, matched: 1 },
      context: { current: 320, limit: 1000 }, in_context: { skills: ['review'], custom_agents: [],
        mcp_servers: [{ name: 'workspace-index', state: 'connected' }] }, mcp_lifecycle: [],
      calls: [{ ts: 1795134133, model: 'recorded-model', ai_credits: 1.25, ttft_ms: 25, server_ms: 140, matched: true }],
    },
  } }));
  await page.route('**/api/session-evidence?*', route => route.fulfill({ json: { rows: [], offset: 0, limit: 100, has_more: false } }));
  await page.route('**/api/samples?*', route => route.fulfill({ json: [] }));
  await page.goto(agentUrl(snapshotReplay, id, 'context'));
  await expect(drawer(page).getByRole('meter', { name: 'Context window used' })).toHaveAttribute('value', '450');
  await expect(drawer(page).getByRole('meter', { name: 'Current context from OTel' })).toHaveAttribute('value', '320');
  await drawer(page).getByRole('button', { name: 'Inspect User messages' }).click();
  await expect(drawer(page).getByRole('table', { name: 'User messages' })).toContainText('Measured source');
  await drawer(page).getByRole('radio', { name: 'Tool context report' }).click();
  await expect(drawer(page).getByRole('meter', { name: 'Tool definitions', exact: true })).toHaveAttribute('value', '275');
  await selectTab(page, 'Overview');
  await expect(drawer(page).getByRole('heading', { name: 'Session totals' })).toBeVisible();
  const calls = drawer(page).getByRole('table', { name: 'OTel model calls' });
  await expect(calls).toContainText('Same call');
  await expect(calls).toContainText('recorded-model');
  await expect(drawer(page).getByText('workspace-index (connected)', { exact: true })).toBeVisible();
});

test('DRW-TM-01 and DRW-PR-01: put team children under their parent and keep recorded process roles', async ({ page, snapshotReplay }) => {
  const { id } = await recordedAgent(snapshotReplay);
  await prepare(page);
  await page.route('**/api/session-stats?*', route => route.fulfill({ json: {
    session_id: id, agents: [{ agent_id: 'nested', parent_agent_id: 'lead', agent_type: 'reviewer' },
      { agent_id: 'lead', agent_type: 'coordinator' }],
    tasks: [{ task_id: 't1', name: 'Read evidence', state: 'done' }, { task_id: 't2', name: 'Reply', state: 'pending' }],
  } }));
  await page.route('**/api/session-processes?*', route => route.fulfill({ json: {
    session_id: id, total: 2, by_role: { lead: 1, child: 1 },
    processes: [{ pid: 12, role: 'child', joined_at: 4, left_at: 6 }, { pid: 10, role: 'lead', joined_at: 0, left_at: null }],
  } }));
  await page.goto(agentUrl(snapshotReplay, id, 'team'));
  const rows = drawer(page).getByRole('table', { name: 'Team agents' }).getByRole('row');
  await expect(rows.nth(1)).toContainText('coordinator');
  await expect(rows.nth(2)).toContainText('↳ reviewer');
  await expect(drawer(page).getByRole('table', { name: 'Done tasks' })).toContainText('Read evidence');
  await expect(drawer(page).getByRole('table', { name: 'Pending tasks' })).toContainText('Reply');
  await selectTab(page, 'Processes');
  const recorded = drawer(page).getByRole('table', { name: 'Recorded processes' }).getByRole('row');
  await expect(recorded.nth(1)).toContainText('10');
  await expect(recorded.nth(2)).toContainText('↳ 12');
});

test('DRW-DH-01/02/03/04: audit uses the project filter and labels partial results', async ({ page, snapshotReplay }) => {
  const requests = [];
  await prepare(page);
  await page.route('**/api/context-audit?*', route => {
    const query = new URL(route.request().url()).searchParams;
    requests.push(Object.fromEntries(query));
    return route.fulfill({ json: {
      project: 'X:\\verified-project', scanned_at: 1795134133, duration_ms: 11,
      effective_models: { 'copilot-cli': { value: 'active-model', why_in_effect: 'latest setting' } },
      counts: { findings: 1 }, sources: [{ path: 'example.md', tool: 'copilot-cli', est_tokens: 40 }],
      transcripts_read: 3, failed_steps: ['workflow sources'], incomplete: [],
      findings: [{ rule: 'check instructions', severity: 'medium', path: 'example.md' }],
      unattributed: [{ session_id: 'session', tool: 'copilot-cli', tokens: 11, method: 'residual' }],
      drift: { baseline_created: true, new: [], changed: [], removed: [], agent_writes: [] },
    } });
  });
  const params = new URLSearchParams({ tab: 'hidden', project: 'X:\\missing-project' });
  await page.goto(`${snapshotReplay.url}${boardUrl}&${params}`);
  await expect(drawer(page).getByText(/This scan covers X:/)).toBeVisible();
  await expect(drawer(page).getByText('Partial scan: workflow sources')).toBeVisible();
  await expect(drawer(page).getByRole('table', { name: 'Sources and estimates' })).toContainText('example.md');
  await expect(drawer(page).getByRole('table', { name: 'Effective models' })).toContainText('active-model');
  await expect(drawer(page).getByRole('table', { name: 'Unexplained context' })).toContainText('residual');
  await expect(drawer(page).getByText(/Baseline established/)).toBeVisible();
  await drawer(page).getByRole('button', { name: 'Scan again' }).click();
  await expect.poll(() => requests.find(row => row.refresh === '1')?.project).toBe('X:\\missing-project');
});
