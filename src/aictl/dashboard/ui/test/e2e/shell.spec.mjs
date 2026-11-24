import { boardUrl, captureFrame, checkAxe, checkConsole, dist, expect, goToBoard, provideCatalog, provideHealthSeries, recordedUrl, test } from './fixtures.mjs';
import { startReplay } from '../replay/server.mjs';
import board from '../../src/panels/layouts/board.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T00:21:24Z'));
});

test('SHL-01 and BRD-01/02/07: sections and recorded Overview panels', async ({ page, snapshotReplay, capture }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await goToBoard(page, snapshotReplay);
  for (const section of board.tree) {
    await expect(page.locator(`#sec-${section.id} h2`)).toHaveText(section.title);
  }
  await expect(page.locator('#p-kpis')).toContainText('Sessions live now');
  await expect(page.locator('#p-kpis')).toContainText('18,065');
  await expect(page.locator('#p-kpis')).toContainText('93.8%');
  await expect(page.locator('#p-kpis')).toBeInViewport();
  await expect(page.locator('#p-tokens canvas')).toBeInViewport({ ratio: 0.99 });
  await expect(page.locator('#p-cacheRate canvas')).toBeInViewport({ ratio: 0.99 });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('#p-attention').getByRole('heading', { name: 'Needs you now' })).toBeVisible();
  await page.goto(page.url().replace(/#.*$/, '') + '#sec-usage');
  await expect(page.locator('#p-tokens canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cache read', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Cache read', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cache read', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Show data table' }).click();
  await expect(page.getByRole('table', { name: 'Tokens, cached and not cached data' })).toBeVisible();
  const sections = page.getByRole('button', { name: 'Sections', exact: true });
  await sections.click();
  await page.getByRole('navigation', { name: 'Overview sections' }).getByRole('link', { name: 'Agents', exact: true }).press('Enter');
  await expect(page).toHaveURL(/#sec-agents$/);
  await sections.click();
  await expect(page.getByRole('navigation', { name: 'Overview sections' })).toBeHidden();
  checkConsole(capture, ['/api/board/sessions?limit=50&offset=0&order=desc&sort=last_activity']);
});

test('Overview snapshot', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  await captureFrame(page);
  await expect(page).toHaveScreenshot('overview.png');
});

for (const state of ['pending', 'failed']) {
  test(`SHL-03/BRD-01: ${state} history shows the available runtime, then recovers`, async ({ page, snapshotReplay }) => {
    let monitored;
    const cold = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true,
      mapBootstrap: data => {
        monitored = new Set(data.entities.filter(e => e.topic === 'runtime.agent' && e.data.running === true &&
          !e.data.parent_id && e.data.session_id && !e.data.unlinked_reason).map(e => e.data.session_id)).size;
        return { ...data, entities: data.entities.filter(e => e.topic !== 'history.board').map(e =>
          e.topic === 'source.status' && e.data.component === 'history' ? { ...e, data: { ...e.data,
            ready: false, pending: state === 'pending', stale: state === 'failed',
            error: state === 'failed' ? 'Inventory read did not complete' : null,
          } } : e) };
      },
    });
    try {
      await provideCatalog(page);
      await page.goto(cold.url + boardUrl);
      const history = page.getByRole('region', { name: 'Selected history' });
      await expect(history.getByRole('status')).toHaveText(state === 'pending'
        ? 'Waiting for the first history result.' : 'History could not be loaded.');
      const runtime = page.getByRole('region', { name: 'Monitored sessions by tool' });
      expect(monitored).toBeGreaterThan(0);
      await expect(runtime).toContainText(`${monitored} monitored sessions`);
      await expect(runtime.getByRole('meter').first()).toBeVisible();
      await expect(page.locator('#p-tokens, #p-cacheRate')).toHaveCount(0);
      if (state === 'failed') {
        await history.locator('summary').press('Enter');
        await expect(history).toContainText('Inventory read did not complete');
      } else {
        await captureFrame(page);
        await expect(page).toHaveScreenshot('overview-waiting.png');
      }
      await checkAxe(page, '[data-screen="board"]', 'Overview startup');
      // The next connection has a complete bootstrap for the same selected scope.
      await page.route('**/api/live/stream?**', route => {
        const url = new URL(route.request().url());
        return route.continue({ url: snapshotReplay.url + url.pathname + url.search });
      });
      await history.getByRole('button', { name: 'Retry history' }).press('Enter');
      await expect(page.locator('#p-kpis')).toContainText('18,065');
      await expect(page.locator('#p-tokens canvas')).toBeInViewport();
      await expect(history).toHaveCount(0);
    } finally { await page.goto('about:blank'); await cold.close(); }
  });
}

test('SHL-01: Health navigation and snapshot', async ({ page, snapshotReplay, capture }) => {
  await provideHealthSeries(page);
  await goToBoard(page, snapshotReplay);
  await page.getByRole('button', { name: 'Health', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'aictl Health', level: 1 })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Find' })).toBeHidden();
  await expect(page.getByText('This node · Live — some sources are delayed or unavailable', { exact: true })).toBeVisible();
  await expect(page.locator('#p-healthTrends [data-health-chart="host-cpu"] canvas').first()).toBeVisible();
  await captureFrame(page);
  // The history window follows the wall clock. HLT-01 captures it with a fixed clock.
  await expect(page).toHaveScreenshot('health.png', { mask: [page.locator('#p-healthTrends')] });
  checkConsole(capture, ['/api/board/sessions?limit=50&offset=0&order=desc&sort=last_activity']);
});

test('BRD-02: each attention kind opens its agent tab', async ({ page, snapshotReplay }) => {
  const agentId = (await recordedUrl(snapshotReplay, '/api/board/agent')).searchParams.get('id');
  // The recorded bootstrap has no actionable attention rows. Add two contract rows for the recorded agent.
  const replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true,
    mapBootstrap: data => ({ ...data, entities: [...data.entities, ...['waiting', 'loop'].map((kind, order) => ({
      topic: 'history.board', source: 'kusto.queryable', id: `test-attention-${kind}`, revision: 1,
      data: { scope: data.scope, field: 'attention', key: `test-attention-${kind}`, order,
        value: { kind, agent_id: agentId, title: kind === 'waiting' ? 'Waiting agent' : 'Looping agent',
          detail: kind, cost_usd: null, tokens: null, since_ts: 1795113092 } },
    }))] }),
  });
  try {
    await goToBoard(page, replay);
    await page.locator('#p-attention').scrollIntoViewIfNeeded();
    const waiting = page.getByRole('button', { name: 'Open Waiting agent' });
    const looping = page.getByRole('button', { name: 'Open Looping agent' });
    await expect(waiting.locator('xpath=ancestor::tr')).toHaveAttribute('data-row-id', 'test-attention-waiting');
    await waiting.click();
    await expect(page).toHaveURL(/[?&]tab=tools/);
    await expect(page.locator('#drawer').getByRole('tab', { name: /^\bTool calls/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await looping.click();
    await expect(page).toHaveURL(/[?&]tab=errors/);
    await expect(page.locator('#drawer').getByRole('tab', { name: /^Failures and loops/ })).toHaveAttribute('aria-selected', 'true');
  } finally { await replay.close(); }
});

test('SHL-03: collector staleness has a source clock and age, or an explicit unknown time', async ({ page }) => {
  const timestamp = Date.parse('2026-11-20T00:21:24Z') / 1000 - 8500;
  for (const known of [true, false]) {
    const replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true,
      mapBootstrap: data => ({ ...data, entities: data.entities.map(entity =>
        entity.topic === 'runtime.health' && entity.id === 'local' ? {
          ...entity, data: { ...entity.data, pipeline: { ...entity.data.pipeline,
            stream: { ...entity.data.pipeline?.stream, snapshot_age_s: 8500, snapshot_ts: known ? timestamp : null },
          } },
        } : entity) }),
    });
    try {
      await goToBoard(page, replay);
      const notice = page.getByText('This node · Collector snapshot is stale', { exact: true }).locator('..');
      if (known) {
        await expect(notice.locator('time')).toHaveAttribute('datetime', new Date(timestamp * 1000).toISOString());
        await expect(notice).toContainText('hours ago');
      } else {
        await expect(notice).toContainText('Last updated: unknown');
        await expect(notice.locator('time')).toHaveCount(0);
      }
    } finally { await page.goto('about:blank'); await replay.close(); }
  }
});

test('SHL-01/02: legacy session URL, manual node scope and Back', async ({ page, snapshotReplay }) => {
  const id = (await recordedUrl(snapshotReplay, '/api/board/agent')).searchParams.get('id');
  await provideCatalog(page);
  await page.goto(`${snapshotReplay.url}/?range=7d&tab=explorer&session=${id}`);
  await expect(page).toHaveURL(new RegExp(`agent=${id}`));
  await expect(page.locator('#drawer').getByRole('tab', { name: 'Flow' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#drawer')).toBeHidden();
  const picker = page.getByRole('button', { name: 'Node scope: This node' });
  await picker.click();
  await expect(page.getByRole('button', { name: 'Untagged node' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Node ID' }).fill(' Laboratory ');
  await page.keyboard.press('Escape');
  await expect(picker).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await picker.click();
  await page.getByRole('textbox', { name: 'Node ID' }).fill(' Laboratory ');
  await page.getByRole('textbox', { name: 'Node ID' }).press('Enter');
  await expect(page).toHaveURL(/scope=node&node_id=laboratory/);
  await expect(page.getByText('Tool configuration files and policy findings are not reported for this scope.')).toBeVisible();
  await page.goBack();
  await expect(picker).toBeVisible();
  await page.evaluate(id => document.dispatchEvent(new CustomEvent('aictl:select-session', {
    detail: { sessionId: id },
  })), id);
  await expect(page).toHaveURL(url => url.searchParams.get('agent') === id);
  await expect(page.locator('#drawer').getByRole('tab', { name: 'Flow' })).toHaveAttribute('aria-selected', 'true');
});

test('SHL-03/04: provenance, pause, refresh, time and filter URLs', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  await expect(page.locator('[data-scope-status]')).toBeVisible();
  await page.getByRole('button', { name: 'Pause live' }).click();
  await expect(page.getByText('This node · Live paused')).toBeVisible();
  await expect(page.locator('#p-kpis [data-status=stale]')).toBeVisible();
  await page.getByRole('button', { name: 'Resume live' }).click();
  const request = page.waitForRequest('**/api/live/stream?**');
  await page.getByRole('button', { name: 'Refresh' }).click();
  await request;
  await page.goto(page.url().replace(/#.*$/, '') + '#sec-usage');
  const bucket = page.locator('#p-tokens').getByRole('button', { name: 'Select chart bucket' });
  await bucket.press('ArrowRight');
  await bucket.press('Enter');
  await expect(page).toHaveURL(/[?&]sel=\d+-\d+/);
  await page.getByRole('button', { name: 'Clear time selection' }).click();
  await expect(page).not.toHaveURL(/[?&]sel=/);
  await page.getByRole('searchbox', { name: 'Find' }).fill('sample');
  await expect(page).toHaveURL(/[?&]q=sample/);
  await page.getByLabel('Status').selectOption('waiting');
  await expect(page).toHaveURL(/[?&]status=waiting/);
  await page.getByRole('button', { name: 'Tool: All' }).click();
  await page.getByRole('button', { name: 'No tools' }).click();
  await expect(page).toHaveURL(/[?&]tools=(?:&|#|$)/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).not.toHaveURL(/[?&](q|status|tools)=/);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page).toHaveURL(/[?&]status=waiting/);
  await page.getByRole('combobox', { name: 'Time range', exact: true }).selectOption('custom');
  const range = page.getByRole('dialog', { name: 'Custom time range' });
  await range.getByLabel('Start').fill('2026-11-19T13:00');
  await range.getByLabel('End').fill('2026-11-19T12:00');
  await range.getByRole('button', { name: 'Apply range' }).click();
  await expect(range.getByRole('alert')).toHaveText('Enter an end time after the start time.');
  await range.getByLabel('End').fill('2026-11-19T14:00');
  await range.getByLabel('End').press('Enter');
  await expect(page).toHaveURL(/[?&]range=custom.*&since=\d+&until=\d+/);
});

test('SHL-05: restore geometry and preferences, re-add panels and reset invalid layouts', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const layout = page.getByRole('button', { name: 'Options for Overview summary' });
  const panel = page.locator('#p-kpis section');
  const edit = page.getByRole('button', { name: 'Edit layout', exact: true });
  await expect(layout).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add panel' })).toBeHidden();
  await edit.press('Enter');
  await layout.press('ArrowDown');
  await page.getByRole('menuitem', { name: 'Taller' }).press('Enter');
  await expect(panel).toHaveCSS('min-block-size', '384px');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.reload();
  await expect(panel).toHaveCSS('min-block-size', '384px');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await edit.press('Enter');
  await page.getByLabel('Move Overview summary to section').selectOption('sessions');
  await expect(page.locator('#sec-sessions #p-kpis')).toBeVisible();
  await layout.press('ArrowDown');
  await page.getByRole('menuitem', { name: 'Hide panel' }).press('Enter');
  await expect(page.locator('#p-kpis')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add panel' }).press('ArrowDown');
  await page.getByRole('menuitem', { name: 'Overview summary' }).press('Enter');
  await expect(page.locator('#sec-top #p-kpis')).toBeVisible();
  await page.getByRole('button', { name: 'Reset layout' }).click();
  await expect(panel).toHaveCSS('min-block-size', '0px');
  await page.keyboard.press('Escape');
  await expect(edit).toBeFocused();
  await page.evaluate(() => localStorage.setItem('aictl-dock-board-v1', '{"version":99}'));
  await page.reload();
  await expect(page.locator('#sec-top #p-kpis')).toBeVisible();
});

test('SHL-06: palette keyboard, focus return, recent commands', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const commands = page.getByRole('button', { name: 'Commands', exact: true });
  await commands.focus();
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  const input = palette.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.fill('not a command');
  await expect(palette.getByText('No matching commands.')).toBeVisible();
  await input.press('Escape');
  await expect(commands).toBeFocused();
  await commands.click();
  await input.fill('theme');
  await input.press('Control+End');
  await input.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await commands.click();
  await expect(palette.getByRole('option', { name: /theme.*Recent/ })).toBeVisible();
  await input.press('Escape');
});

test('SHL-07: Stop confirms before posting and reports partial results', async ({ page, snapshotReplay }) => {
  const agent = await recordedUrl(snapshotReplay, '/api/board/agent');
  const payload = await (await fetch(agent)).json();
  await page.route('**/api/board/agent?**', route =>
    route.fulfill({ json: { ...payload, agent: { ...payload.agent, running: true, parent_id: null, status: 'running' } } }));
  let submissions = 0;
  let finish;
  const hold = new Promise(resolve => { finish = resolve; });
  await page.route('**/api/session-kill', async route => {
    submissions++;
    expect(route.request().postDataJSON()).toEqual({ session_id: agent.searchParams.get('id'), confirm: true, signal: 'TERM' });
    await hold;
    await route.fulfill({ json: { signaled: [1], failed: [2] } });
  });
  await provideCatalog(page);
  await page.goto(`${snapshotReplay.url}${boardUrl}&agent=${agent.searchParams.get('id')}&tab=transcript`);
  const stop = page.locator('#drawer').getByRole('button', { name: 'Stop', exact: true });
  await stop.click();
  const modal = page.getByRole('dialog', { name: 'Stop this agent?' });
  await modal.getByRole('button', { name: 'Cancel' }).click();
  expect(submissions).toBe(0);
  await expect(stop).toBeFocused();
  await stop.click();
  try {
    await modal.getByRole('button', { name: 'Stop agent' }).click();
    await expect(modal.getByRole('button', { name: 'Applying…' })).toBeDisabled();
    await modal.getByRole('button', { name: 'Applying…' }).press('Escape');
    await expect(modal).toBeVisible();
  } finally { finish(); }
  await expect(page.getByText(/Stopped 1 process.*1 could not be stopped/)).toBeVisible();
  expect(submissions).toBe(1);
});

test('Overview has accessible controls and contrast in both themes', async ({ page, snapshotReplay, capture }) => {
  await goToBoard(page, snapshotReplay);
  await checkAxe(page, '#app', 'light shell');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await checkAxe(page, '#app', 'dark shell');
  checkConsole(capture);
});
