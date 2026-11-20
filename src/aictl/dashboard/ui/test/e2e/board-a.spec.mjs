import { boardUrl, captureFrame, checkAxe, checkConsole, expect, goToBoard, recordedUrl, test } from './fixtures.mjs';

const sessionMiss = '/api/board/sessions?limit=50&offset=0&q=';
const unavailable = 'Not available from this source';
const inventory = [
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

test('BRD-02: the recorded empty attention list reports zero', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await showPanel(page, 'attention');
  await expect(stat(panel, 'Needs attention')).toHaveText('0');
  await expect(panel.getByRole('group', { name: 'Attention by kind' }).getByRole('meter')).toHaveCount(0);
  await expect(panel.getByText('Nothing needs attention.')).toBeVisible();
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
  await page.route('**/api/board?**', route => {
    const params = new URL(route.request().url()).searchParams;
    return params.size === 3 && params.get('buckets') === '14' ? route.fulfill({ json: whole }) : route.fallback();
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

test('BRD-03: sort, group, fold and reach rows beyond the first window', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await showPanel(page, 'agentsT');
  const table = panel.getByRole('table', { name: 'Agents and subagents' });
  const first = row(table, 'anon_33186031882f5bc3b1a54036');
  await expect(first).toContainText('anon_2c2f5bb3489bbb651fa965a6');
  await expect(first.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(first.getByText(unavailable, { exact: true }).first()).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Node', exact: true })).toHaveCount(0);
  const viewport = panel.getByRole('region', { name: 'Agents and subagents scroll area' });
  const late = row(table, 'runtime:anon_df00885f95ef8deeff1ef17d');
  await expect(late).toHaveCount(0);
  await viewport.press('End');
  await expect(table.getByText('Activity unknown', { exact: true }).first()).toBeVisible();
  await viewport.press('Home');
  const mode = panel.getByRole('radiogroup', { name: 'Group agents by' });
  await mode.getByRole('radio', { name: 'No groups' }).press('ArrowRight');
  await expect(mode.getByRole('radio', { name: 'Project' })).toHaveAttribute('aria-checked', 'true');
  const fold = table.getByRole('button', { name: /^Fold / }).first();
  await fold.press('Enter');
  await expect(table.getByRole('button', { name: /^Unfold / }).first()).toHaveAttribute('aria-expanded', 'false');
  await table.getByRole('button', { name: 'Status', exact: true }).press('Enter');
  await expect(table.getByRole('columnheader', { name: 'Status', exact: true })).toHaveAttribute('aria-sort', 'ascending');
});

test('BRD-04/05: model participants, filter toggles and role totals', async ({ page, snapshotReplay }) => {
  await replayFacet(page, snapshotReplay, 'model', 'by_model');
  await goToBoard(page, snapshotReplay);
  const model = 'anon_eb574eb0c91a8699ae7f3fe7';
  const panel = await showPanel(page, 'byModel');
  const parent = row(panel, 'anon_43ada58e9cdd2e0c9deaca20');
  await expect(parent).toContainText('701,991,452');
  await expect(parent).toContainText(unavailable);
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
  await expect(total).toContainText('1,204,105,997');
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
        return url.pathname === '/api/board' && url.searchParams.get('buckets') === '14' && response.ok();
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
  await page.getByLabel('Theme').selectOption('dark');
  await showPanel(page, 'dailyModels');
  await captureFrame(page);
  await checkAxe(page, '#p-dailyModels', 'daily use in dark theme');
});
