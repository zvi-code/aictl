import { DEFAULT_LAYOUT } from '../../src/components/board/layout.js';
import { boardUrl, captureFrame, checkConsole, expect, goToBoard, initialMisses, recordedUrl, test } from './fixtures.mjs';

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
  await page.route('**/assets/root-*.js', async route => {
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

test('SHL-01/03/06, BRD-01–39: Overview sections, palette and session search', async ({ page, snapshotReplay, capture }) => {
  await fixedTime(page);
  await goToBoard(page, snapshotReplay);
  for (const section of DEFAULT_LAYOUT.filter(section => section.id !== 'health')) {
    const region = page.locator(`#${section.anchor}`);
    await expect(region.locator(':scope > .bd-sech .bd-sect')).toHaveText(section.title);
    for (const [id] of section.panels) await expect(region.locator(`#p-${id} h3`)).toBeVisible();
  }
  await captureFrame(page);
  await expect(page).toHaveScreenshot('overview.png');
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(palette).toBeHidden();
  await expect(page.locator('#p-sessionsT')).toContainText('No recorded response');
  expect(capture.misses).toEqual(expect.arrayContaining(initialMisses));
  checkConsole(capture, initialMisses);
});

test('SHL-01, HLT-01–10: Health and store details', async ({ page, snapshotReplay, capture }) => {
  await fixedTime(page);
  await page.goto(`${snapshotReplay.url}/?screen=health&range=7d`);
  const main = page.getByRole('main', { name: 'aictl Health' });
  await expect(main.getByRole('heading', { name: 'aictl Health' })).toBeVisible();
  await expect(main.locator('.bd-healthview')).toBeVisible();
  await expect(main.locator('#health-diagnostics')).toBeVisible();
  await captureFrame(page);
  await expect(page).toHaveScreenshot('health.png');
  await main.getByRole('checkbox', { name: 'Show all metrics' }).check();
  await expect(main.getByRole('region', { name: 'Table inventory' })).toBeVisible();
  const details = main.locator('#health-store-details');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(details.getByRole('heading', { name: 'Reported table membership by mode' })).toBeVisible();
  checkConsole(capture, initialMisses);
});

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
  checkConsole(capture, initialMisses);
});

test('DRW-01: recorded session drawer and tab navigation', async ({ page, snapshotReplay, capture }) => {
  const id = (await recordedUrl(snapshotReplay, '/api/board/agent')).searchParams.get('id');
  const expectedMisses = [...initialMisses];
  await fixedTime(page);
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
  checkConsole(capture, [...initialMisses, ...missing]);
});

test('DRW-DP-01: recorded missing prompt is shown as a read error', async ({ page, snapshotReplay, capture }) => {
  const url = await recordedUrl(snapshotReplay, '/api/board/prompt');
  const params = new URLSearchParams({ detail: 'prompt', record: url.searchParams.get('session_id'),
    detail_ts: url.searchParams.get('ts') });
  await fixedTime(page);
  await page.goto(`${snapshotReplay.url}${boardUrl}&${params}`);
  const drawer = page.locator('#drawer');
  await expect(drawer.getByRole('heading', { name: 'Prompt', exact: true })).toBeVisible();
  await expect(drawer.getByRole('status')).toContainText('Could not load this: HTTP 404');
  checkConsole(capture, initialMisses, [url.pathname + url.search]);
});
