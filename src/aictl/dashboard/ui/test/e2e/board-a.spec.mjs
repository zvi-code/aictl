import { boardUrl, captureFrame, checkAxe, checkConsole, dist, expect, goToBoard, provideCatalog, recordedUrl, test } from './fixtures.mjs';
import { agentsFrame } from '../replay/agents-frame.mjs';
import { startReplay } from '../replay/server.mjs';

const sessionMiss = '/api/board/sessions?limit=50&offset=0&q=';
const unavailable = 'Not available from this source';
const inventory = [
  ['BRD-03', 'agents', 'agentActivity', 'Recorded agent activity'],
  ['BRD-02', 'agents', 'attention', 'Needs you now'], ['BRD-03', 'agents', 'agentsT', 'Agents and subagents'],
  ['BRD-04', 'agents', 'byModel', 'Usage by model'],
  ['BRD-05', 'agents', 'byRole', 'Main agents and subagents'], ['BRD-06', 'sessions', 'sessionsT', 'Find a session'],
  ['BRD-08', 'usage', 'cacheRate', 'Cache hit rate'], ['BRD-09', 'usage', 'cost', 'Cost'], ['BRD-10', 'usage', 'messages', 'Messages'],
  ['BRD-11', 'usage', 'projects', 'Projects'], ['BRD-12', 'prompts', 'promptsL', 'Prompts'],
  ['BRD-13', 'prompts', 'pprompts', 'Project prompts'], ['BRD-14', 'prompts', 'skills', 'Skills used'],
  ['BRD-15', 'prompts', 'workflows', 'Workflows and prompt files'], ['BRD-16', 'context', 'budget', 'Context window budget'],
  ['BRD-17', 'context', 'tokenSplit', 'Tokens by category'], ['BRD-18', 'context', 'ctxMap', 'Context window map'],
  ['BRD-19', 'context', 'memory', 'Agent memory'], ['BRD-20', 'context', 'dailyModels', 'Daily usage by model'],
];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T00:21:24Z'));
});

async function showPanel(page, id) {
  const panel = page.locator(`#p-${id}`);
  await panel.scrollIntoViewIfNeeded();
  return panel;
}

function stat(panel, label) {
  return panel.locator('[data-summary] dl').filter({ has: panel.page().getByText(label, { exact: true }) }).locator('dd');
}

test('BRD-02: a stale empty attention report is compact and does not give an all-clear', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await showPanel(page, 'attention');
  await expect(panel.getByRole('status')).toContainText('Attention data is stale.');
  await expect(panel.getByText('Nothing needs attention.')).toHaveCount(0);
  await expect(panel.locator('time')).toHaveAttribute('datetime', /^2026-11-20T/);
  await expect(panel.locator('[data-summary]')).toHaveCount(0);
  await expect(panel.getByRole('group', { name: 'Attention by kind' })).toHaveCount(0);
  expect((await panel.boundingBox()).height).toBeLessThan(110);
});

async function contextRecord(replay) {
  const url = await recordedUrl(replay, '/api/board/context');
  return (await fetch(url)).json();
}

function row(panel, id) {
  return panel.locator(`[data-row-id=${JSON.stringify(id)}]`);
}

async function recordedBootstrap(replay) {
  const response = await fetch(`${replay.url}/api/live/stream`);
  expect(response.ok).toBe(true);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let wire = '';
  try {
    while (!wire.includes('\n\n')) {
      const { value, done } = await reader.read();
      if (done) throw new Error('The tape did not send a bootstrap.');
      wire += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel();
  }
  expect(wire.split('\n\n')[0]).toContain('event: bootstrap');
  return JSON.parse(wire.split('\n').find(line => line.startsWith('data: ')).slice(6));
}

function serveBootstrap(route, bootstrap, params, keep) {
  params.delete('history');
  params.delete('cursor');
  params.sort();
  const scope = params.toString();
  const entities = bootstrap.entities.filter(keep).map(entity => entity.data.scope === bootstrap.scope
    ? { ...entity, data: { ...entity.data, scope } } : entity);
  return route.fulfill({ contentType: 'text/event-stream',
    body: `event: bootstrap\nid: ${bootstrap.cursor}\ndata: ${JSON.stringify({ ...bootstrap, scope, entities })}\n\n` });
}

for (const state of ['empty', 'unknown-time', 'missing', 'populated']) {
  test(`BRD-02: handles ${state} attention`, async ({ page }) => {
    const replay = await startReplay({
      dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true,
      mapBootstrap(recorded) {
        const entities = recorded.entities.filter(({ data }) =>
          (state !== 'missing' || data.field !== 'attention') && (state !== 'unknown-time' || data.field !== 'generated_at'))
          .map(entity => entity.data.component === 'history' ? { ...entity, data: {
            ...entity.data, error: null, reason: null, stale: false,
            ...(state === 'unknown-time' && { computed_at: undefined, attempted_at: undefined }),
          } } : entity);
        if (state === 'populated') {
          const agent = entities.find(({ data }) => data.field === 'agents' && data.key && !data.value.parent_id);
          const marker = entities.find(({ data }) => data.field === 'attention' && data.collection);
          entities.push({ ...marker, id: 'test-attention-wait', data: {
            scope: marker.data.scope, field: 'attention', key: 'test-wait', order: 0,
            value: { agent_id: agent.data.value.id, title: agent.data.value.title, kind: 'waiting',
              detail: 'Waiting for confirmation', since_ts: 1795134000, tokens: null, cost_usd: 0 },
          } });
        }
        return { ...recorded, entities };
      },
    });
    try {
      await goToBoard(page, replay);
      const panel = await showPanel(page, 'attention');
      if (state === 'empty') {
        await expect(panel.getByRole('status')).toContainText('Nothing needs attention.');
        await expect(panel.locator('[data-summary]')).toHaveCount(0);
      } else if (state === 'unknown-time') {
        await expect(panel.getByRole('status')).toContainText('No attention items reported.');
        await expect(panel.getByText('Last updated: unknown')).toBeVisible();
        await expect(panel.getByText('Nothing needs attention.')).toHaveCount(0);
      } else if (state === 'missing') {
        await expect(panel.getByRole('status')).toContainText('Attention data is not available');
        await expect(panel.getByText('Nothing needs attention.')).toHaveCount(0);
      } else {
        await expect(stat(panel, 'Needs attention')).toHaveText('1');
        await expect(stat(panel, 'Tokens')).toHaveText(unavailable);
        await expect(stat(panel, 'Listed cost')).toHaveText('$0.00');
        await expect(panel.getByRole('meter', { name: 'Waiting' })).toBeVisible();
      }
    } finally { await replay.close(); }
  });
}

async function replayFacet(page, replay, facet, field) {
  // The tape has only the unfiltered stream. Keep recorded rows for the selected value.
  const bootstrap = await recordedBootstrap(replay);
  await page.route('**/api/live/stream?**', route => {
    const params = new URL(route.request().url()).searchParams;
    const selected = params.get(facet);
    if (!selected) return route.fallback();
    return serveBootstrap(route, bootstrap, params, ({ data }) =>
      data.field !== field || data.key == null || data.value?.[facet] === selected);
  });
}

async function replayBrush(page, replay) {
  // A brush fetches the complete range for its chart, separate from the selected stream.
  const bootstrap = await recordedBootstrap(replay);
  const whole = Object.fromEntries(bootstrap.entities
    .filter(({ data }) => ['range', 'series'].includes(data.field) && data.key == null)
    .map(({ data }) => [data.field, data.value]));
  await page.route('**/api/history/board?**', route => {
    const params = new URL(route.request().url()).searchParams;
    return params.get('view') === 'charts' && params.get('buckets') === '14'
      ? route.fulfill({ json: { node_scope: { kind: 'local', node_id: null }, ...whole } })
      : route.fallback();
  });
  await page.route('**/api/live/stream?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has('buckets') || !params.has('since') || !params.has('until')) return route.fallback();
    return serveBootstrap(route, bootstrap, params, entity => entity.topic !== 'history.board');
  });
}

test('Overview A panels are in their default sections', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  for (const [id, section, panel, title] of inventory) {
    await test.step(id, async () => {
      await showPanel(page, panel);
      await expect(page.locator(`#sec-${section} #p-${panel}`).getByRole('heading', { level: 3, name: title, exact: true })).toBeVisible();
    });
  }
});

for (const [width, theme] of [[1440, 'light'], [1440, 'dark'], [768, 'light']]) {
  test(`BRD-02–04: Agents first screen at ${width} in ${theme}`, async ({ page, snapshotReplay }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(theme => localStorage.setItem('aictl-theme', theme), theme);
    await provideCatalog(page);
    await page.goto(snapshotReplay.url + boardUrl + '#sec-agents');
    await agentsFrame(page);
    const activity = page.locator('#p-agentActivity');
    await expect(activity.getByText('Final bucket partial', { exact: false })).toBeVisible();
    await expect(activity).toContainText('78 recorded agents · 52 sessions');
    await expect(activity).toContainText(/Nov 13.*Nov 20/s);
    const ranking = activity.getByRole('region', { name: 'Tokens by model' });
    const meters = ranking.getByRole('meter');
    await expect(meters).toHaveCount(4);
    await expect(meters.first()).toHaveAttribute('aria-valuetext', '701,991,452 tokens');
    await expect(activity.getByRole('meter', { name: 'Failure rate' })).toHaveAttribute('aria-valuetext', '4.1%');
    const positions = await activity.evaluate(node => {
      const top = document.querySelector('header').getBoundingClientRect().bottom;
      const bottom = Math.min(innerHeight, document.querySelector('#p-agentsT').getBoundingClientRect().top);
      return [...node.querySelectorAll('canvas, meter')].map(el => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.top >= top && box.bottom <= bottom;
      });
    });
    expect(positions.every(Boolean)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page).toHaveScreenshot(`agents-${width}-${theme}.png`);
    await checkAxe(page, '#sec-agents', 'Agents overview and drill-down');
  });
}

test('BRD-03/04: inspect bucket values and filter a ranked model by keyboard, then return', async ({ page, snapshotReplay }) => {
  await replayFacet(page, snapshotReplay, 'model', 'by_model');
  await provideCatalog(page);
  const url = snapshotReplay.url + boardUrl + '#sec-agents';
  await page.goto(url);
  await agentsFrame(page);
  const panel = page.locator('#p-agentActivity');
  const values = panel.getByRole('button', { name: 'Show bucket values' });
  await values.press('Enter');
  const table = panel.getByRole('table', { name: 'Message counts by bucket' });
  await expect(table).toHaveAttribute('aria-rowcount', '49');
  await table.getByRole('button', { name: 'Tool', exact: true }).press('Enter');
  await table.getByRole('button', { name: 'Tool', exact: true }).press('Enter');
  await expect(table.locator('tbody tr').first()).toContainText('2,540');
  await panel.getByRole('button', { name: 'Show message chart' }).press('Space');
  await expect(values).toBeFocused();
  const model = 'anon_eb574eb0c91a8699ae7f3fe7';
  const filter = panel.getByRole('button', { name: `Filter by model ${model}`, exact: true });
  await filter.focus();
  await expect(panel.getByText('701,991,452 tokens', { exact: true })).toBeVisible();
  await filter.press('Enter');
  await expect(panel.getByRole('button', { name: `Clear filter for model ${model}` })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByText('Top 1 of 1 reported totals', { exact: false })).toBeVisible();
  const selected = new URL(page.url());
  expect([selected.searchParams.get('range'), selected.searchParams.get('model'), selected.hash]).toEqual(['7d', model, '#sec-agents']);
  await page.goBack();
  await expect(page).toHaveURL(url);
  await expect(panel.getByText('Top 4 of 8 reported totals', { exact: false })).toBeInViewport();
});

test('BRD-03: partial history keeps a reported zero model without inventing time, counts or freshness', async ({ page }) => {
  const replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true,
    mapBootstrap: recorded => ({ ...recorded, entities: recorded.entities.filter(({ data }) =>
      !['range', 'scope', 'kpis', 'generated_at'].includes(data.field) &&
      !(data.field === 'by_model' && data.key && data.value.tokens !== 0)).map(entity =>
      entity.data.component === 'history' ? { ...entity, data: { ...entity.data, computed_at: undefined } } : entity) }),
  });
  try {
    await provideCatalog(page);
    await page.goto(replay.url + boardUrl + '#sec-agents');
    const activity = await showPanel(page, 'agentActivity');
    await expect(activity.getByText('Message counts by time are not available from this source.')).toBeVisible();
    await expect(activity.locator('canvas, time')).toHaveCount(0);
    await expect(activity.getByText('Last updated: unknown')).toBeVisible();
    await expect(activity).toContainText('N/A recorded agents · N/A sessions');
    const rank = activity.getByRole('region', { name: 'Tokens by model' });
    await expect(rank.getByText('0', { exact: true })).toBeVisible();
    await expect(activity.getByRole('region', { name: 'Tool call outcomes' })).toContainText(unavailable);
  } finally { await replay.close(); }
});

test('BRD-03: the 768px agent list fits whole metric headings and two-line tool names', async ({ page, snapshotReplay }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await provideCatalog(page);
  await page.goto(snapshotReplay.url + boardUrl + '#sec-agents');
  await agentsFrame(page);
  const panel = page.locator('#p-agentsT');
  await panel.evaluate(node => {
    const header = document.querySelector('header').getBoundingClientRect();
    window.scrollBy(0, node.getBoundingClientRect().top - header.bottom);
  });
  const table = panel.getByRole('table', { name: 'Agents and subagents' });
  await expect(table.getByRole('columnheader')).toHaveText(['Agent', 'Status', 'Tool', 'Messages', 'Tool calls', 'Failures']);
  await expect(table.locator('tbody tr').first().getByRole('cell').nth(2)).toHaveText('anon_2c2f5bb3489bbb651fa965a6');
  await expect(page).toHaveScreenshot('agents-list-768-light.png');
  const next = panel.getByRole('button', { name: 'Next page' });
  for (;;) {
    const layout = await table.evaluate(el => {
      const rects = cell => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        return [...range.getClientRects()].filter(rect => rect.width > 0);
      };
      const lines = cell => new Set(rects(cell).map(rect => rect.top)).size;
      const headings = [...el.tHead.rows[0].cells];
      const tools = [...el.tBodies[0].rows].map(row => row.cells[2]);
      return {
        metricLines: [3, 5].map(i => lines(headings[i].querySelector('button').firstChild)),
        wrappedTools: tools.filter(cell => lines(cell) > 2 || rects(cell).some(rect => {
          const box = cell.getBoundingClientRect();
          return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.bottom > box.bottom + 1;
        })).map(cell => cell.textContent),
        tableOverflow: el.parentElement.scrollWidth - el.parentElement.clientWidth,
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(layout).toEqual({ metricLines: [1, 1], wrappedTools: [], tableOverflow: 0, pageOverflow: 0 });
    if (await next.getAttribute('aria-disabled') === 'true') break;
    await next.press('Enter');
  }
});

test('BRD-03: readable agent names, keyboard paging, sorting, grouping and folding', async ({ page, snapshotReplay }, testInfo) => {
  await goToBoard(page, snapshotReplay);
  const panel = await showPanel(page, 'agentsT');
  const table = panel.getByRole('table', { name: 'Agents and subagents' });
  const first = row(table, 'anon_33186031882f5bc3b1a54036');
  const name = first.getByRole('button', { name: 'Open anon_2c2f5bb3489bbb651fa965a6', exact: true });
  await expect(name).toHaveText('anon_2c2f5bb3489bbb651fa965a6');
  expect(await name.evaluate(button => {
    const range = document.createRange();
    range.selectNodeContents(button);
    const bounds = range.getBoundingClientRect();
    const cell = button.closest('td').getBoundingClientRect();
    return bounds.left >= cell.left && bounds.right <= cell.right && bounds.bottom <= cell.bottom;
  })).toBe(true);
  await expect(first.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveText(['Agent', 'Status', 'Tool', 'Messages', 'Tool calls', 'Failures']);
  await expect(panel.getByRole('region', { name: 'Agents and subagents scroll area' })).toHaveCount(0);
  await expect(table.locator('tbody tr')).toHaveCount(10);
  await panel.evaluate(tablePanel => tablePanel.scrollIntoView());
  expect(await table.locator('tbody tr').evaluateAll(rows => rows.filter(row => {
    const bounds = row.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= innerHeight;
  }).length)).toBeGreaterThanOrEqual(5);
  await page.screenshot({ path: testInfo.outputPath('agents-light.png') });
  const pager = panel.getByRole('group', { name: 'Agents and subagents pages' });
  await expect(pager.getByRole('status')).toContainText('1–10 of ');
  const next = pager.getByRole('button', { name: 'Next page' });
  await next.press('Enter');
  await expect(next).toBeFocused();
  await expect(pager.getByRole('status')).toContainText('11–20 of ');
  await expect(first).toHaveCount(0);
  await pager.getByRole('button', { name: 'Previous page' }).press('Space');
  await expect(first).toBeVisible();
  const columns = panel.getByRole('button', { name: 'Columns', exact: true });
  await columns.press('Enter');
  await expect(columns).toHaveAttribute('aria-expanded', 'true');
  const cpu = panel.getByRole('checkbox', { name: 'CPU', exact: true });
  await cpu.press('Space');
  await expect(cpu).toBeChecked();
  await expect(table.getByRole('columnheader', { name: 'CPU', exact: true })).toBeVisible();
  await expect(first.getByText('N/A', { exact: true }).last()).toBeVisible();
  await cpu.press('Escape');
  await expect(columns).toBeFocused();
  await checkAxe(page, '#p-agentsT', 'Agent table in light theme');
  await page.locator('html').evaluate(node => node.setAttribute('data-theme', 'dark'));
  await columns.press('Enter');
  await checkAxe(page, '#p-agentsT', 'Agent table and open column chooser in dark theme');
  await page.screenshot({ path: testInfo.outputPath('agents-columns-dark.png') });
  await page.keyboard.press('Escape');
  const mode = panel.getByRole('radiogroup', { name: 'Group agents by' });
  await mode.getByRole('radio', { name: 'No groups' }).press('ArrowRight');
  await expect(mode.getByRole('radio', { name: 'Project' })).toHaveAttribute('aria-checked', 'true');
  const fold = table.getByRole('button', { name: /^Fold / }).first();
  await fold.press('Enter');
  await expect(table.getByRole('button', { name: /^Unfold / }).first()).toHaveAttribute('aria-expanded', 'false');
  await table.getByRole('button', { name: 'Status', exact: true }).press('Enter');
  await expect(table.getByRole('columnheader', { name: 'Status', exact: true })).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.getByRole('button', { name: 'Status', exact: true })).toBeFocused();
});

test('BRD-04/05: model participants, filter toggles and role totals', async ({ page, snapshotReplay }) => {
  await replayFacet(page, snapshotReplay, 'model', 'by_model');
  await goToBoard(page, snapshotReplay);
  const model = 'anon_eb574eb0c91a8699ae7f3fe7';
  const panel = await showPanel(page, 'byModel');
  const parent = row(panel, 'anon_43ada58e9cdd2e0c9deaca20');
  await expect(parent).toContainText('702.0 M');
  await expect(parent.getByTitle('701,991,452', { exact: true })).toBeVisible();
  await expect(parent.getByText('N/A', { exact: true })).toBeVisible();
  const count = Number(await panel.getByRole('table').getAttribute('aria-rowcount'));
  await parent.getByRole('button', { name: `Unfold ${model}` }).press('Space');
  await expect.poll(async () => Number(await panel.getByRole('table').getAttribute('aria-rowcount'))).toBeGreaterThan(count);
  await parent.getByRole('button', { name: `Fold ${model}` }).press('Enter');
  await expect(panel.getByRole('table')).toHaveAttribute('aria-rowcount', String(count));
  await parent.getByRole('button', { name: 'Toggle model filter' }).press('Enter');
  await expect(page).toHaveURL(new RegExp(`[?&]model=${model}`));
  await expect(panel.getByRole('button', { name: 'Toggle model filter' })).toHaveCount(1);
  await parent.getByRole('button', { name: 'Toggle model filter' }).press('Enter');
  await expect(page).not.toHaveURL(/[?&]model=/);
  const roles = await showPanel(page, 'byRole');
  const total = row(roles, 'anon_bfccafddcc1259437c0a1df0');
  await expect(total).toContainText('1.20 B');
  await roles.getByRole('button', { name: 'Runs' }).press('Enter');
  await expect(roles.getByRole('columnheader', { name: 'Runs' })).toHaveAttribute('aria-sort', 'ascending');
});

test('BRD-06: report the unrecorded search read', async ({ page, snapshotReplay, capture }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await showPanel(page, 'sessionsT');
  await expect(panel.getByRole('alert')).toContainText('Could not load sessions: No recorded response');
  await expect(stat(panel, 'Matching sessions')).toHaveText(unavailable);
  await expect(panel.getByRole('searchbox', { name: 'Search all past sessions' })).toBeVisible();
  expect(capture.misses).toContain(sessionMiss);
  checkConsole(capture, [sessionMiss]);
});

test('BRD-06: debounce, page, retry and follow the Tool filter', async ({ page, snapshotReplay }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/agent');
  const { agent } = await (await fetch(url)).json();
  const paths = [];
  let pageReads = 0;
  await page.route('**/api/board/sessions?**', route => {
    const query = new URL(route.request().url()).searchParams;
    const q = query.get('q'), offset = query.get('offset');
    paths.push({ q, offset, tool: query.get('tool') });
    if (q !== 'stored') return route.fulfill({ json: { rows: [], total: 0 } });
    if (offset === '50' && !pageReads++) return route.fulfill({ status: 503, json: { error: 'Page not ready' } });
    const rows = Array.from({ length: offset === '0' ? 50 : 1 }, (_, index) => ({
      ...agent, id: index === 0 && offset === '0' ? agent.id : `${offset}:${index}`,
      title: offset === '0' ? `Stored session ${index + 1}` : 'Last stored session',
      tokens: index === 0 ? null : 0, match: 'title', match_text: 'stored',
    }));
    return route.fulfill({ json: { rows, total: 51 } });
  });
  await goToBoard(page, snapshotReplay);
  const panel = await showPanel(page, 'sessionsT');
  await expect(panel.getByText('No session is stored yet.')).toBeVisible();
  await expect(stat(panel, 'Matching sessions')).toHaveText('0');
  const search = panel.getByRole('searchbox', { name: 'Search all past sessions' });
  for (const text of ['sto', 'stor', 'stored']) await search.fill(text);
  await expect(stat(panel, 'Matching sessions')).toHaveText('51');
  await expect(stat(panel, 'Sessions loaded')).toHaveText('50');
  await expect(panel.getByRole('group', { name: 'Top tools among loaded sessions' }).getByRole('meter')).toHaveAttribute('value', '50');
  expect(paths.map(({ q }) => q)).toEqual(['', 'stored']);
  const table = panel.getByRole('table');
  const first = row(table, JSON.stringify([agent.id]));
  await expect(first).toContainText('Stored session 1');
  await expect(first).toContainText(unavailable);
  await expect(table.getByText('Title: stored').first()).toBeVisible();
  const more = panel.getByRole('button', { name: 'Show 1 more' });
  await more.press('Enter');
  await expect(panel.getByRole('alert')).toHaveText('Could not load more sessions: Page not ready');
  await more.press('Space');
  await expect(stat(panel, 'Sessions loaded')).toHaveText('51');
  await panel.getByRole('region', { name: 'Find a session scroll area' }).press('End');
  await expect(row(table, JSON.stringify(['50:0']))).toContainText('Last stored session');
  await panel.getByRole('region', { name: 'Find a session scroll area' }).press('Home');
  await first.getByRole('button', { name: 'Open Stored session 1' }).press('Enter');
  await expect(page).toHaveURL(/[?&]tab=flow/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tool: All' }).click();
  await page.getByRole('button', { name: 'No tools' }).click();
  await page.keyboard.press('Escape');
  await showPanel(page, 'sessionsT');
  await expect(panel.getByText('No tools are selected.')).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]q=stored/);
});

for (const [id, panelId, title, legend, summary] of [
  ['BRD-08', 'cacheRate', 'Cache hit rate', 'Cached share of input', 'Extra cache-write cost is not deducted'],
  ['BRD-09', 'cost', 'Cost', null, 'Unpriced tokens'],
  ['BRD-10', 'messages', 'Messages', 'Assistant', 'Tokens per message'],
]) {
  test(`${id}: switch chart and table, read values and select a bucket`, async ({ page, snapshotReplay, capture }) => {
    await replayBrush(page, snapshotReplay);
    await goToBoard(page, snapshotReplay);
    const panel = await showPanel(page, panelId);
    await expect(panel.locator('canvas')).toBeVisible();
    await expect(panel.getByText(summary, { exact: id !== 'BRD-08' })).toBeVisible();
    if (legend) {
      await panel.getByRole('button', { name: legend, exact: true }).press('Enter');
      await expect(panel.getByRole('button', { name: legend, exact: true })).toHaveAttribute('aria-pressed', 'false');
    }
    if (id === 'BRD-09') {
      await panel.getByRole('radio', { name: 'Tool' }).press('ArrowRight');
      await expect(panel.getByRole('radio', { name: 'Project' })).toHaveAttribute('aria-checked', 'true');
      await panel.getByRole('radio', { name: 'Project' }).press('ArrowRight');
      await expect(panel.getByRole('radio', { name: 'Model' })).toHaveAttribute('aria-checked', 'true');
    }
    await panel.getByRole('button', { name: `Show ${title} table` }).press('Enter');
    const table = panel.getByRole('table', { name: `${title} data` });
    await expect(table.locator('[data-row-id]').first()).toBeVisible();
    await expect(table.getByText(id === 'BRD-10' ? '0' : unavailable, { exact: true }).first()).toBeVisible();
    await panel.getByRole('button', { name: `Show ${title} chart` }).press('Space');
    await expect(panel.locator('canvas')).toBeVisible();
    const bucket = panel.getByRole('button', { name: `Select ${title} time bucket` });
    const first = await bucket.textContent();
    await bucket.press('ArrowRight');
    await expect(bucket).not.toHaveText(first);
    await Promise.all([
      page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/history/board' && url.searchParams.get('buckets') === '14' && response.ok();
      }),
      bucket.press('Enter'),
    ]);
    await expect(page).toHaveURL(/[?&]sel=\d+-\d+/);
    const keyboardRange = new URL(page.url()).searchParams.get('sel');
    const plot = panel.locator('.u-over');
    await expect(async () => {
      await plot.scrollIntoViewIfNeeded({ timeout: 1_000 });
    }).toPass({ timeout: 5_000 });
    const box = await plot.boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, y, { steps: 5 });
    await page.mouse.up();
    await expect(page).toHaveURL(url => /^\d+-\d+$/.test(url.searchParams.get('sel') ?? '') && url.searchParams.get('sel') !== keyboardRange);
    await expect(panel.locator('canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Clear time selection' }).press('Enter');
    await expect(page).not.toHaveURL(/[?&]sel=/);
    checkConsole(capture, [sessionMiss]);
  });
}

test('BRD-11/12/13/14: filter a project, read prompt files and open prompt and skill details', async ({ page, snapshotReplay }) => {
  await replayFacet(page, snapshotReplay, 'project', 'projects');
  await goToBoard(page, snapshotReplay);
  const projects = await showPanel(page, 'projects');
  const project = row(projects, 'anon_8168e8f80c29232501b25c9c');
  await expect(project).toContainText('617,842,280');
  await expect(project).toContainText(unavailable);
  await project.getByRole('button', { name: 'Toggle project filter' }).press('Enter');
  await expect(page).toHaveURL(/[?&]project=/);
  // Two recorded row keys share the anonymized project name.
  await expect(projects.getByRole('table')).toHaveAttribute('aria-rowcount', '3');
  await project.getByRole('button', { name: 'Toggle project filter' }).press('Enter');
  await expect(page).not.toHaveURL(/[?&]project=/);
  const prompts = await showPanel(page, 'promptsL');
  await expect(stat(prompts, 'Listed prompts')).toHaveText('100');
  await expect(stat(prompts, 'Total prompts')).toHaveText('331');
  await expect(stat(prompts, 'Listed prompt tokens')).toHaveText(unavailable);
  await expect(prompts.getByRole('figure', { name: /^Listed prompts by day/ }).locator('canvas')).toBeVisible();
  const prompt = row(prompts, 'anon_dd85c5690df1d5d8b5136112');
  await expect(prompt).toContainText('anon_6132d9ba726c0d2cbc921d3f');
  const list = prompts.getByRole('region', { name: 'Prompts scroll area' });
  await list.press('End');
  await expect(prompt).toHaveCount(0);
  await list.press('Home');
  await prompt.getByRole('button', { name: 'Open prompt' }).press('Space');
  await expect(page).toHaveURL(/[?&]detail=prompt.*[?&]detail_ts=/);
  await page.keyboard.press('Escape');
  const projectPrompts = await showPanel(page, 'pprompts');
  // The recording includes file references but does not report their use counts.
  await expect(stat(projectPrompts, 'File references')).toHaveText('23');
  await expect(stat(projectPrompts, 'Uses')).toHaveText(unavailable);
  const references = projectPrompts.getByRole('table', { name: 'Project prompts' });
  await expect(references.getByRole('cell', { name: 'anon_35113d4c9b4556165f79ee20', exact: true })).toBeVisible();
  await expect(references.getByText(unavailable, { exact: true }).first()).toBeVisible();
  await references.getByRole('button', { name: 'Prompt file' }).press('Enter');
  await expect(references.getByRole('columnheader', { name: 'Prompt file' })).toHaveAttribute('aria-sort', 'ascending');
  const skills = await showPanel(page, 'skills');
  const skill = row(skills, 'anon_129bb554841e4f1ff82e337d');
  await expect(skill).toContainText(unavailable);
  await skill.getByRole('button', { name: 'Open anon_4a714904af55c450d3b0727c' }).press('Enter');
  await expect(page).toHaveURL(/[?&]detail=skill.*[?&]record=anon_4a714904af55c450d3b0727c/);
});

test('BRD-15/16: filter workflow inventory and unfold a reported tool budget', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const workflows = await showPanel(page, 'workflows');
  await expect(workflows.getByText('No workflow or prompt files found.')).toBeVisible();
  await expect(stat(workflows, 'Matching items')).toHaveText('0');
  await workflows.getByRole('radio', { name: 'All' }).press('ArrowRight');
  await expect(workflows.getByRole('radio', { name: 'Workflows' })).toHaveAttribute('aria-checked', 'true');
  await expect(workflows.getByText('No workflow or prompt files found.')).toBeVisible();
  const budget = await showPanel(page, 'budget');
  const { budget: recording } = await contextRecord(snapshotReplay);
  const tool = recording.tools.find(tool => tool.projects.length > 0);
  const toolRow = row(budget, JSON.stringify([tool.tool]));
  await expect(toolRow).toContainText(tool.window.toLocaleString('en-US'));
  await expect(toolRow).toContainText('Window assumed');
  await toolRow.getByRole('button', { name: `Unfold ${tool.label}` }).press('Enter');
  await expect(budget.getByRole('cell', { name: tool.projects[0].project, exact: true })).toBeVisible();
});

test('BRD-17/18: inspect files in a category and in a project', async ({ page, snapshotReplay }) => {
  const data = await contextRecord(snapshotReplay);
  await goToBoard(page, snapshotReplay);
  const split = await showPanel(page, 'tokenSplit');
  const first = data.files[0].files[0];
  await split.getByRole('button', { name: new RegExp(`^${first.kind} · `) }).first().press('Enter');
  const files = split.getByRole('table', { name: `Files: ${first.kind}` });
  const file = row(files, JSON.stringify([null, first.path]));
  await expect(file.getByText(first.name, { exact: true })).toBeVisible();
  await page.route('**/api/file?**', route => route.fulfill({ body: 'Preview content', contentType: 'text/plain' }));
  await file.getByRole('button', { name: `Preview ${first.name}` }).press('Enter');
  const preview = split.getByRole('region', { name: `Preview of ${first.path}` });
  await expect(preview).toContainText('Preview content');
  await preview.getByRole('button', { name: 'Open file' }).press('Enter');
  await expect(page).toHaveURL(url => url.searchParams.get('detail') === 'file' && url.searchParams.get('record') === first.path);
  await page.keyboard.press('Escape');
  await split.getByRole('button', { name: 'Close preview' }).press('Enter');
  await expect(split.getByRole('region', { name: `Preview of ${first.path}` })).toBeHidden();
  const map = await showPanel(page, 'ctxMap');
  const project = data.map.items[0].project;
  await map.getByRole('radio', { name: 'Category' }).press('ArrowRight');
  await expect(map.getByRole('radio', { name: 'Scope' })).toHaveAttribute('aria-checked', 'true');
  await map.getByRole('group', { name: 'Projects' }).getByRole('button', { name: project, exact: true }).press('Space');
  await expect(map.getByRole('table', { name: `Files for ${project}` })).toContainText(data.map.items[0].name);
});

test('BRD-19/20: memory and daily charts keep independent time ranges', async ({ page, snapshotReplay }) => {
  const data = await contextRecord(snapshotReplay);
  await goToBoard(page, snapshotReplay);
  const memory = await showPanel(page, 'memory');
  await expect(memory.locator('canvas')).toBeVisible();
  await memory.getByRole('button', { name: 'Show Agent memory growth table' }).press('Enter');
  await expect(memory.getByRole('table', { name: 'Agent memory growth data' })).toContainText('8,588');
  await expect(memory.getByRole('button', { name: 'Select chart bucket' })).toHaveCount(0);
  const group = data.memory.entries[0].source_label;
  const fold = memory.getByRole('button', { name: new RegExp(`^(Unfold|Fold) ${group}$`) });
  const expanded = await fold.getAttribute('aria-expanded');
  await fold.press('Space');
  await expect(memory.getByRole('button', { name: `${expanded === 'true' ? 'Unfold' : 'Fold'} ${group}` })).toBeVisible();
  const daily = await showPanel(page, 'dailyModels');
  await expect(daily.locator('canvas')).toBeVisible();
  await daily.getByRole('radio', { name: 'Tokens' }).press('ArrowRight');
  await expect(daily.getByRole('radio', { name: 'Cost' })).toHaveAttribute('aria-checked', 'true');
  await daily.getByRole('button', { name: 'Show Daily usage by model table' }).press('Enter');
  const table = daily.getByRole('table', { name: 'Daily usage by model data' });
  await expect(table).toContainText('2,480,140');
  await expect(table.getByText(unavailable, { exact: true }).first()).toBeVisible();
  await expect(table.getByText('0', { exact: true }).first()).toBeVisible();
  await daily.getByRole('radio', { name: 'Cost' }).press('ArrowRight');
  await expect(daily.getByRole('radio', { name: 'Calls' })).toHaveAttribute('aria-checked', 'true');
  await daily.getByRole('button', { name: 'Show Daily usage by model chart' }).press('Enter');
  await expect(daily.locator('canvas')).toBeVisible();
  await expect(daily.getByRole('button', { name: 'Select chart bucket' })).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(boardUrl.replace(/[?]/g, '\\?')));
});

test('BRD-03/20: retain values while paused; check contrast in both themes', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const agents = await showPanel(page, 'agentsT');
  await checkAxe(page, '#p-agentsT', 'agents in light theme');
  await page.getByRole('button', { name: 'Pause live' }).click();
  await showPanel(page, 'agentsT');
  await expect(agents.locator('[data-status=stale]')).toBeVisible();
  await expect(row(agents, 'anon_33186031882f5bc3b1a54036')).toBeVisible();
  const daily = await showPanel(page, 'dailyModels');
  await expect(daily.locator('[data-status=stale]')).toBeVisible();
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await showPanel(page, 'dailyModels');
  await captureFrame(page);
  await checkAxe(page, '#p-dailyModels', 'daily use in dark theme');
});
