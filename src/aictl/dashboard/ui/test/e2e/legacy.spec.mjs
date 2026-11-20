import { boardUrl, captureFrame, checkConsole, dist, expect, goToBoard, provideCatalog, recordedUrl, test } from './fixtures.mjs';
import { startReplay } from '../replay/server.mjs';

test('opens one live stream before the board chunk and starts no polling interval', async ({ page, snapshotReplay }) => {
  await page.addInitScript(() => {
    const Source = window.EventSource;
    const interval = window.setInterval;
    const startup = window.__liveStartup = { streams: [], intervals: [] };
    window.EventSource = class extends Source {
      constructor(url, options) {
        super(url, options);
        startup.streams.push(new URL(url, location.href).pathname);
      }
    };
    window.setInterval = (callback, delay, ...args) => {
      startup.intervals.push(delay);
      return interval(callback, delay, ...args);
    };
  });
  let streamsBeforeScreen;
  await page.route('**/assets/Shell-*.js', async route => {
    streamsBeforeScreen = await page.evaluate(() => window.__liveStartup.streams);
    await route.continue();
  });
  await goToBoard(page, snapshotReplay);
  expect(streamsBeforeScreen).toEqual(['/api/live/stream']);
  expect(await page.evaluate(() => window.__liveStartup)).toEqual({
    streams: ['/api/live/stream'], intervals: [],
  });
});

async function fixedTime(page) {
  await page.clock.setFixedTime(new Date('2026-11-20T00:21:24Z'));
}

test('SHL-01, SET-01/02/03/09/10: Settings pivots', async ({ page, snapshotReplay, capture }) => {
  await fixedTime(page);
  await page.goto(`${snapshotReplay.url}/?screen=settings&range=7d`);
  const workspace = page.locator('.st-ws');
  await expect(workspace).toHaveAttribute('data-view', 'tool');
  await expect(workspace.getByTestId('st-kpis')).toBeVisible();
  await captureFrame(page);
  await expect(page).toHaveScreenshot('settings.png');
  for (const [label, view] of [['By topic', 'topic'], ['Files', 'files'], ['Findings', 'findings'], ['By tool', 'tool']]) {
    await workspace.getByText(label, { exact: true }).click();
    await expect(workspace).toHaveAttribute('data-view', view);
  }
  checkConsole(capture);
});

test('SHL-01, SET-07/12/15: Settings opens the source line and refreshes after a save', async ({ page }) => {
  const path = '/example/project/.claude/settings.local.json';
  const scope = 'project-local';
  const permissions = { allow: ['Read'], deny: [], ask: [] };
  const row = { key: 'permissions', label: 'Permissions', value: permissions, kind: 'map', source: path, scope, line: 2,
    chain: [{ scope, value: permissions, source: path, line: 2 }], wins: 0, note: '' };
  const replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true,
    mapBootstrap: data => ({ ...data, entities: data.entities.map(entity =>
      entity.topic !== 'configuration.file' || entity.id !== 'current' ? entity : {
        ...entity, data: { ...entity.data, tool_configs: [{
          tool: 'claude-code', config_files: [path],
          scopes: [{ id: scope, label: 'Project (local)', path, exists: true, changeable: true }],
          sections: [
            { id: 'autonomy', title: 'Autonomy and safety', rows: [row] },
            { id: 'hooks', title: 'Hooks', rows: [{ key: 'hooks', label: 'Hooks', value: 'configured',
              kind: 'text', source: path, scope, line: 3, note: '' }] },
          ],
        }] },
      }) }),
  });
  try {
    const opens = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/live/stream') opens.push(request.url());
    });
    await page.route('**/api/hooks-status', route => route.fulfill({ json: {
      tools: { 'claude-code': { status: 'active', configured_events: ['Stop'], fired_24h: 3, sources: [] } },
    } }));
    await page.route('**/api/tool-config/claude-code**', route => route.fulfill({
      json: route.request().method() === 'GET' ? { path, scope, exists: true, mtime: 1, permissions }
        : { path, scope, exists: true, mtime: 2, permissions: route.request().postDataJSON().permissions, backup_path: `${path}.bak` },
    }));
    await page.route('**/api/board/excerpt?**', route => route.fulfill({ json: {
      lines: [{ n: 2, text: '"permissions": {}' }],
    } }));
    await page.route('**/api/board/file?**', route => route.fulfill({ json: { path } }));
    await page.goto(`${replay.url}/?tab=config&range=7d&tool=claude-code&row=permissions`);
    const workspace = page.locator('.st-ws');
    await expect(workspace.getByTestId('st-hookstat')).toBeVisible();
    await workspace.locator('.st-row[data-key="permissions"] .st-src').click();
    const drawer = page.locator('#drawer');
    await expect(drawer.getByRole('heading', { name: path })).toBeVisible();
    await expect(drawer.getByText('Line 2', { exact: true })).toBeVisible();
    await expect(drawer.getByText('"permissions": {}', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/[?&]screen=settings/);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    await workspace.getByRole('button', { name: 'Change value…' }).click();
    const editor = workspace.getByTestId('st-perm-editor');
    await editor.locator('textarea[data-bucket="allow"]').fill('Read\nGlob');
    const before = opens.length;
    const save = page.waitForRequest(request => request.method() === 'PUT' &&
      new URL(request.url()).pathname === '/api/tool-config/claude-code');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await save).postDataJSON()).toEqual({
      scope, expected_mtime: 1, permissions: { ...permissions, allow: ['Read', 'Glob'] },
    });
    await expect(workspace.getByTestId('st-editor-saved')).toBeVisible();
    await expect.poll(() => opens.length).toBe(before + 1);
  } finally { await replay.close(); }
});

test('DRW-01: recorded session drawer and tab navigation', async ({ page, snapshotReplay, capture }) => {
  const id = (await recordedUrl(snapshotReplay, '/api/board/agent')).searchParams.get('id');
  const expectedMisses = [];
  await fixedTime(page);
  await provideCatalog(page);
  await page.goto(`${snapshotReplay.url}${boardUrl}&agent=${encodeURIComponent(id)}`);
  const drawer = page.locator('#drawer');
  const transcript = drawer.getByRole('tab', { name: 'Transcript' });
  await transcript.click();
  await expect(transcript).toHaveAttribute('aria-selected', 'true');
  await expect(drawer.getByRole('heading', { name: 'Transcript, oldest first' })).toBeVisible();
  await captureFrame(page);
  await expect(page).toHaveScreenshot('session-transcript.png');

  // The recorder used different limits and filters for these reads of the same session.
  const session = encodeURIComponent(id);
  const period = `session_id=${session}&since=1795113092&until=1795134144`;
  expectedMisses.push(
    `/api/board/agent/flow?id=${session}&limit=500`,
    `/api/board/agent/flow?id=${session}`,
    `/api/events?limit=500&${period}`,
    `/api/events/count?${period}`,
    `/api/session-evidence?kind=context&limit=100&offset=0&session_id=${session}`,
    `/api/api-calls?limit=200&session_id=${session}&since=0`,
    `/api/copilot-sessions/${session}/artifacts`,
    ...['process.cpu.utilization', 'process.memory.usage', 'process.network.io'].map(metric =>
      `/api/samples?limit=1000&metric=${metric}&since=1795113092&tag.session_id=${session}`),
  );
  for (const [label, tab] of [
    ['Flow', 'flow'], ['Context', 'context'], ['Overview', 'overview'], ['Instructions', 'instructions'],
    ['Timeline', 'timeline'], ['Turns', 'turns'], ['Tool calls', 'tools'], ['Failures and loops', 'errors'],
    ['Changes', 'changes'], ['Artifacts', 'artifacts'], ['Commits', 'commits'], ['Events', 'events'],
    ['Team', 'team'], ['Processes', 'procs'], ['Integrations', 'integrations'],
  ]) {
    const target = drawer.getByRole('tab', { name: new RegExp(`^${label}(?: \\d+)?$`) });
    await target.click();
    await expect(target).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(new RegExp(`[?&]tab=${tab}(?:&|$)`));
  }
  await drawer.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(drawer).toBeHidden();
  checkConsole(capture, expectedMisses);
});

test('DRW-DF-01/02: file drawer loads the recorded editor text without a write', async ({ page, snapshotReplay, capture }) => {
  const url = await recordedUrl(snapshotReplay, '/api/settings/file');
  const path = url.searchParams.get('path');
  const { text } = await (await fetch(url)).json();
  await fixedTime(page);
  await provideCatalog(page);
  await page.goto(`${snapshotReplay.url}${boardUrl}&detail=file&record=${encodeURIComponent(path)}`);
  const drawer = page.locator('#drawer');
  await expect(drawer.getByRole('heading', { name: path })).toBeVisible();
  await drawer.getByRole('button', { name: 'Edit file' }).click();
  await expect(drawer.getByRole('textbox', { name: 'File text' })).toHaveValue(text.replace(/\r\n/g, '\n'));
  await expect(drawer.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await drawer.getByRole('button', { name: 'Close editor' }).click();
  await expect(drawer.getByRole('textbox', { name: 'File text' })).toBeHidden();
  // The detail first requests the URL range, then uses the range of the live payload.
  const missing = [
    { buckets: '14', path, since: '1794571200', until: '1795176000' },
    { buckets: '48', path, since: '1794529800', until: '1795134600' },
  ].map(params => `/api/board/file?${new URLSearchParams(params)}`);
  checkConsole(capture, missing);
});

test('DRW-DP-01: recorded missing prompt is shown as a read error', async ({ page, snapshotReplay, capture }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/prompt');
  const params = new URLSearchParams({ detail: 'prompt', record: url.searchParams.get('session_id'),
    detail_ts: url.searchParams.get('ts') });
  await fixedTime(page);
  await provideCatalog(page);
  await page.goto(`${snapshotReplay.url}${boardUrl}&${params}`);
  const drawer = page.locator('#drawer');
  await expect(drawer.getByRole('heading', { name: 'Prompt', exact: true })).toBeVisible();
  await expect(drawer.getByRole('status')).toContainText('Could not load this: HTTP 404');
  checkConsole(capture, [], [url.pathname + url.search]);
});
