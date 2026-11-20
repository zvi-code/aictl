import { boardUrl, checkAxe, expect, goToBoard, recordedUrl, test } from './fixtures.mjs';

const inventory = [
  ['BRD-21', 'inventory', 'Files each tool reads', 'context', 'Context'],
  ['BRD-22', 'lifetime', 'Lifetime totals', 'context', 'Context'],
  ['BRD-23', 'toolCalls', 'Tool calls', 'tools', 'Tools, failures and speed'],
  ['BRD-24', 'confirms', 'Tool confirmations', 'tools', 'Tools, failures and speed'],
  ['BRD-25', 'errors', 'Failures and errors', 'tools', 'Tools, failures and speed'],
  ['BRD-26', 'latency', 'Latency and durations', 'tools', 'Tools, failures and speed'],
  ['BRD-27', 'loops', 'Loops', 'tools', 'Tools, failures and speed'],
  ['BRD-28', 'changesT', 'Changes', 'changes', 'Changes and testing'],
  ['BRD-29', 'tests', 'Testing', 'changes', 'Changes and testing'],
  ['BRD-30', 'memfiles', 'Memory and instruction files', 'changes', 'Changes and testing'],
  ['BRD-31', 'cpu', 'CPU', 'resources', 'Machine'],
  ['BRD-32', 'ram', 'RAM', 'resources', 'Machine'],
  ['BRD-33', 'alerts', 'Needs a look', 'resources', 'Machine'],
  ['BRD-34', 'procs', 'Processes', 'resources', 'Machine'],
  ['BRD-35', 'traffic', 'Network, tokens and files', 'resources', 'Machine'],
  ['BRD-36', 'daemon', 'aictl resources and history', 'resources', 'Machine'],
  ['BRD-37', 'findings', 'Hidden changes and conflicts', 'effect', 'Settings in effect'],
  ['BRD-38', 'settings', 'Values in force', 'effect', 'Settings in effect'],
  ['BRD-39', 'coverage', 'What each tool reports', 'sources', 'What each tool reports'],
];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T00:21:24Z'));
});

async function openPanel(page, id) {
  const panel = page.locator(`#p-${id}`);
  await panel.scrollIntoViewIfNeeded();
  return panel;
}

async function press(button, key = 'Enter') {
  await button.scrollIntoViewIfNeeded();
  await button.focus();
  await button.press(key);
}

const sortButton = (table, name) => table.getByRole('button', { name, exact: true });

test('BRD-21–39: each panel is in its default section', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  for (const [row, id, title, section, heading] of inventory) {
    await test.step(row, async () => {
      const location = page.locator(`#sec-${section}`);
      await expect(location.locator('h2')).toHaveText(heading);
      await openPanel(page, id);
      await expect(location.locator(`#p-${id}`).getByRole('heading', { name: title, exact: true })).toBeVisible();
    });
  }
});

function stat(panel, label) {
  return panel.locator('[data-summary] dl').filter({ has: panel.page().getByText(label, { exact: true }) }).locator('dd');
}

test('BRD-21: group, fold and preview a recorded inventory file', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'inventory');
  await expect(stat(panel, 'Reported file records')).toHaveText('19,696');
  await expect(stat(panel, 'Listed file records')).toHaveText('448');
  await expect(panel.getByRole('group', { name: 'Top tools by reported files' }).getByRole('meter').first()).toHaveAttribute('value', '19648');
  await expect(panel).toContainText('The largest');
  const kind = panel.getByRole('radio', { name: 'Kind', exact: true });
  await press(kind, 'ArrowRight');
  await expect(panel.getByRole('radio', { name: 'Tool', exact: true })).toBeChecked();
  const group = panel.locator('summary').first();
  await press(group);
  await expect(group.locator('..')).toHaveAttribute('open', '');
  await press(group);
  await expect(group.locator('..')).not.toHaveAttribute('open');
  await press(panel.getByRole('radio', { name: 'Tool', exact: true }), 'ArrowRight');
  const table = panel.getByRole('table', { name: 'Files each tool reads', exact: true });
  await expect(table).toBeVisible();
  const file = (await recordedUrl(snapshotReplay, '/api/file')).searchParams.get('path');
  const context = await (await fetch(snapshotReplay.url + '/api/board/context')).json();
  const match = context.files.flatMap(tool => tool.files).find(row => row.path === file);
  expect(match).toBeTruthy();
  const viewport = panel.getByRole('region', { name: 'Files each tool reads scroll area' });
  const button = table.getByRole('button', { name: `Preview ${match.name}`, exact: true });
  for (let i = 0; i < 80 && !await button.count(); i++) {
    const moved = await viewport.evaluate(async element => {
      const before = element.scrollTop;
      element.scrollTop += element.clientHeight / 2;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return element.scrollTop > before;
    });
    if (!moved) break;
  }
  await press(button);
  const preview = panel.getByRole('region', { name: 'File preview' });
  await expect(preview).toContainText(file);
  await expect(preview.getByRole('group', { name: 'File contents scroll area' })).toBeVisible();
  await press(preview.getByRole('button', { name: 'Open at source' }));
  await expect(page).toHaveURL(url => url.searchParams.get('detail') === 'file' && url.searchParams.get('record') === file);
});

test('BRD-22: tool totals and model folds stay separate from the time range', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'lifetime');
  await expect(panel).toContainText('Overview time range does not apply');
  const table = panel.getByRole('table', { name: 'Lifetime totals' });
  await expect(table).toContainText('83,798,752');
  await expect(table).toContainText('Not available from this source');
  await press(table.getByRole('button', { name: /^Breakdown for / }).first());
  await press(panel.locator('summary').filter({ hasText: 'Models for' }));
  await expect(panel.getByRole('table', { name: 'Lifetime models' })).toBeVisible();
  await press(panel.locator('summary').filter({ hasText: 'Errors for' }));
  await expect(panel.getByText('No results', { exact: true })).toBeVisible();
});

test('BRD-23/24: tool totals, named calls and unavailable waits', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const tools = await openPanel(page, 'toolCalls');
  const calls = tools.getByRole('table', { name: 'Tool calls' });
  await expect(calls).toContainText('2,578');
  await expect(tools).toContainText('Calls without a tool name');
  await press(sortButton(calls, 'Calls'));
  await expect(calls.getByRole('columnheader', { name: 'Calls', exact: true })).toHaveAttribute('aria-sort', 'ascending');
  const confirmations = await openPanel(page, 'confirms');
  await expect(confirmations).toContainText('No pending confirmations.');
  const outcomes = confirmations.getByRole('group', { name: 'Confirmation outcomes' });
  await expect(outcomes.getByText('Blocked by a rule')).toBeVisible();
  const confirmed = confirmations.getByRole('table', { name: 'Tool confirmations' });
  await expect(confirmed.getByRole('cell', { name: '0', exact: true }).first()).toBeVisible();
  await expect(confirmed.getByRole('cell', { name: 'Not available from this source' }).first()).toBeVisible();
  await press(confirmed.getByRole('button', { name: /^Open tool / }).first());
  await expect(page).toHaveURL(url => url.searchParams.get('detail') === 'tool' && Boolean(url.searchParams.get('record')));
});

for (const [row, id, title] of inventory.filter(([, id]) => ['errors', 'latency', 'tests', 'cpu', 'ram'].includes(id))) {
  test(`${row}: chart table, pointer brush and keyboard bucket selection`, async ({ page, snapshotReplay }) => {
    await goToBoard(page, snapshotReplay);
    const panel = await openPanel(page, id);
    const canvas = panel.locator('canvas');
    await expect(canvas).toBeVisible();
    await press(panel.getByRole('button', { name: 'Show data table' }));
    const table = panel.getByRole('table', { name: `${title} data` });
    await expect(table).toBeVisible();
    await expect(table.locator('[data-row-id]').first()).toHaveAttribute('data-row-id', /^\d+$/);
    await press(panel.getByRole('button', { name: 'Show chart' }));
    const plot = panel.locator('.u-over');
    await plot.scrollIntoViewIfNeeded();
    const box = await plot.boundingBox();
    // The full plot can be taller than its scrollport. Start on its hit-tested
    // visible area, not on a point from an unchecked viewport rectangle.
    const position = { x: Math.round(box.width * 0.3), y: Math.round(box.height / 2) };
    await plot.hover({ position });
    const ready = await plot.boundingBox();
    const y = ready.y + position.y;
    await page.mouse.down();
    await page.mouse.move(ready.x + ready.width * 0.6, y, { steps: 5 });
    await page.mouse.up();
    await expect(page).toHaveURL(url => /^\d+-\d+$/.test(url.searchParams.get('sel') ?? ''));
    await press(page.getByRole('button', { name: 'Clear time selection' }));
    await expect(page).toHaveURL(url => !url.searchParams.has('sel'));
    // The tape has only the starting range. Start a fresh replay for the keyboard path.
    await page.goto(snapshotReplay.url + boardUrl);
    const bucket = (await openPanel(page, id)).getByRole('button', { name: 'Select chart bucket' });
    await expect(bucket).toBeVisible();
    await bucket.scrollIntoViewIfNeeded();
    const start = await bucket.textContent();
    await press(bucket, 'ArrowRight');
    await expect(bucket).not.toHaveText(start);
    await press(bucket);
    await expect(page).toHaveURL(url => /^\d+-\d+$/.test(url.searchParams.get('sel') ?? '') && !url.searchParams.has('scope'));
  });
}

test('BRD-25/26/29: inspect grouped errors, duration distributions and test commands', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const latency = (await openPanel(page, 'latency')).getByRole('table', { name: 'Duration distributions' });
  await expect(latency).toContainText('5,186');
  await press(sortButton(latency, 'p99'));
  await expect(latency.getByRole('columnheader', { name: 'p99' })).toHaveAttribute('aria-sort', 'ascending');
  const tests = (await openPanel(page, 'tests')).getByRole('table', { name: 'Test commands' });
  await expect(tests).toContainText('anon_759c23343a4d099023a802f6');
  await press(sortButton(tests, 'Failed'));
  await expect(tests.getByRole('cell', { name: '0', exact: true }).first()).toBeVisible();
  const errors = (await openPanel(page, 'errors')).getByRole('table', { name: 'Grouped errors' });
  await expect(errors).toContainText('268');
  await press(errors.getByRole('button', { name: /^Open error / }).first());
  await expect(page).toHaveURL(url => url.searchParams.get('detail') === 'error' && Boolean(url.searchParams.get('record')));
});

test('BRD-27: recorded loop identity and keyboard drawer route', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'loops');
  await expect(stat(panel, 'Repeats')).toHaveText('6');
  await expect(stat(panel, 'Tokens spent')).toHaveText('773,201');
  await expect(panel.getByRole('figure', { name: /^Listed loops by start day/ }).locator('canvas')).toBeVisible();
  const table = panel.getByRole('table', { name: 'Loops' });
  const row = table.getByRole('row').filter({ hasText: '773,201' });
  await expect(row).toHaveAttribute('data-row-id', /anon_2c25f8040480efb57e384f34/);
  await press(row.getByRole('button', { name: /^Open / }));
  await expect(page).toHaveURL(url => url.searchParams.get('tab') === 'errors' && url.searchParams.get('agent') === 'anon_fca71b2fcab29ade4417bd4f');
});

for (const [row, id, tableName] of [
  ['BRD-28', 'changesT', 'Changed files'], ['BRD-30', 'memfiles', 'Memory and instruction files'],
]) {
  test(`${row}: file metadata and keyboard file route`, async ({ page, snapshotReplay }) => {
    await goToBoard(page, snapshotReplay);
    const panel = await openPanel(page, id);
    if (id === 'memfiles') {
      await expect(stat(panel, 'Listed file records')).toHaveText('9');
      await expect(panel.getByRole('group', { name: 'Top listed files by tokens per call' }).getByRole('meter')).toHaveCount(3);
    } else {
      await expect(stat(panel, 'Files')).toHaveText('525');
      await expect(panel.getByRole('meter', { name: 'Added', exact: true })).toHaveAttribute('value', '55548');
      await expect(panel.getByRole('meter', { name: 'Removed', exact: true })).toHaveAttribute('value', '7640');
    }
    const table = panel.getByRole('table', { name: tableName });
    const item = table.locator('[data-row-id]').first();
    await expect(item).toContainText(id === 'memfiles' ? '105' : '0');
    if (id === 'memfiles') await expect(item).toContainText('Not available from this source');
    if (id === 'changesT') await expect(table).toHaveAttribute('aria-rowcount', '41');
    const button = item.getByRole('button', { name: /^Open file / });
    const path = (await button.textContent()).trim().slice('Open file '.length);
    await press(button);
    await expect(page).toHaveURL(url => url.searchParams.get('detail') === 'file' && url.searchParams.get('record') === path);
  });
}

test('BRD-31/32/33/35: recorded machine sources, empty alerts and stale values', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const cpu = await openPanel(page, 'cpu');
  await expect(cpu.getByRole('group', { name: 'Whole-machine CPU cores' }).getByRole('meter')).toHaveCount(32);
  await expect(cpu).toContainText('Current total across tools');
  const ram = await openPanel(page, 'ram');
  await expect(ram.getByText(/\d+(?:\.\d+)? (?:GB|MB)$/, { exact: true })).toBeVisible();
  const alerts = await openPanel(page, 'alerts');
  await expect(stat(alerts, 'Process alerts')).toHaveText('0');
  await expect(alerts).toContainText('No process anomalies found on this node.');
  const panel = await openPanel(page, 'traffic');
  const table = panel.getByRole('table', { name: 'Network, tokens and files' });
  await expect(panel).toContainText('network estimates, not tool-reported counts');
  await expect(table).toContainText('65,524.14');
  await press(sortButton(table, 'Received'));
  await expect(table.getByRole('columnheader', { name: 'Received' })).toHaveAttribute('aria-sort', 'ascending');
  await press(page.getByRole('button', { name: 'Pause live' }));
  await expect(panel.locator('[data-status="stale"]')).toBeVisible();
  await expect(table).toContainText('65,524.14');
});

test('BRD-34: change process view and scroll past the first window', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'procs');
  await expect(stat(panel, 'Live processes')).toHaveText('101');
  for (const name of ['Top processes by CPU', 'Top processes by resident memory']) {
    await expect(panel.getByRole('group', { name, exact: true }).getByRole('meter')).toHaveCount(3);
  }
  const table = panel.getByRole('table', { name: 'Processes' });
  const first = table.locator('[data-row-id]').first();
  await expect(first).toHaveAttribute('data-row-id', '[6148,1794935706.0133832]');
  const key = await first.getAttribute('data-row-id');
  const viewport = panel.getByRole('region', { name: 'Processes scroll area' });
  const total = Number(await table.getAttribute('aria-rowcount')) - 1;
  expect(await table.locator('[data-row-id]').count()).toBeLessThan(total);
  await press(viewport, 'End');
  await expect(table.locator(`[aria-rowindex="${total + 1}"]`)).toBeVisible();
  await expect(table.locator('[data-row-id]').first()).not.toHaveAttribute('data-row-id', key);
  await press(panel.getByRole('radio', { name: 'List', exact: true }), 'ArrowRight');
  const tree = panel.getByRole('table', { name: 'Process tree' });
  await expect(tree).toBeVisible();
  await expect(tree).toHaveAttribute('aria-rowcount', String(total + 1));
});

test('BRD-36: reported daemon and keyboard Health action', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'daemon');
  await expect(panel).toContainText('144.9%');
  await expect(panel).toContainText('Not available from this source');
  await press(panel.getByRole('button', { name: 'Open aictl Health' }));
  await expect(page).toHaveURL(url => url.searchParams.get('screen') === 'health');
});

test('BRD-37: expand related findings and open the sources drawer', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'findings');
  await expect(stat(panel, 'Open findings')).toHaveText('260');
  await expect(panel.getByRole('group', { name: 'Findings by severity' }).getByRole('meter')).toHaveCount(3);
  const table = panel.getByRole('table', { name: 'Hidden changes and conflicts' });
  await expect(table).toBeVisible();
  const unfold = table.getByRole('button', { name: /^Show \d+ places$/ }).first();
  await press(unfold);
  await expect(table.getByRole('button', { name: 'Fold places' })).toBeVisible();
  await expect(stat(panel, 'Open findings')).toHaveText('260');
  await press(panel.getByRole('button', { name: 'See every source' }));
  await expect(page).toHaveURL(url => url.searchParams.get('tab') === 'hidden');
});

test('BRD-37: reserve the wrapped stale notice when sources become current', async ({ page, snapshotReplay }) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/api/effective-models', async route => {
    await pending;
    await route.continue();
  });
  try {
    await goToBoard(page, snapshotReplay);
    const panel = await openPanel(page, 'findings');
    await page.addStyleTag({ content: '#p-findings [data-status="stale"] { max-inline-size: 15rem }' });
    const table = panel.getByRole('table', { name: 'Hidden changes and conflicts' });
    const stale = panel.locator('[data-status="stale"]', { hasText: 'Not all settings sources' });
    await expect(table).toBeVisible();
    await expect(stale).toBeVisible();
    const textBounds = () => stale.locator('[role=status] span').evaluate(text => {
      const range = document.createRange();
      range.selectNodeContents(text);
      return { height: text.getBoundingClientRect().height, lines: range.getClientRects().length };
    });
    const wrapped = await textBounds();
    expect(wrapped.lines).toBeGreaterThan(1);
    const top = () => table.evaluate(element => element.getBoundingClientRect().top -
      element.closest('#p-findings').getBoundingClientRect().top);
    const staleTop = await top();
    release();
    await expect(stale).toBeHidden();
    await expect(stale.locator('..')).toHaveAttribute('aria-hidden', 'true');
    expect(await textBounds()).toEqual(wrapped);
    expect(await top()).toBeCloseTo(staleTop);
  } finally {
    release();
  }
});

test('BRD-38: sort reported setting values and open Settings', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'settings');
  await expect(stat(panel, 'Settings with values')).toHaveText('3');
  await expect(stat(panel, 'Tools with values')).toHaveText('5');
  const table = panel.getByRole('table', { name: 'Values in force' });
  await expect(table).toContainText('Telemetry receiver');
  await expect(table).toContainText('Not available from this source');
  await press(sortButton(table, 'Setting'));
  await expect(table.getByRole('columnheader', { name: 'Setting' })).toHaveAttribute('aria-sort', 'ascending');
  await press(panel.getByRole('button', { name: 'Open the Settings screen' }));
  await expect(page).toHaveURL(url => url.searchParams.get('screen') === 'settings');
});

test('BRD-39: sort recorded collection states and check contrast in both themes', async ({ page, snapshotReplay }) => {
  await goToBoard(page, snapshotReplay);
  const panel = await openPanel(page, 'coverage');
  await expect(stat(panel, 'Data types')).toHaveText('27');
  await expect(stat(panel, 'Selected tools')).toHaveText('3');
  await expect(panel.getByRole('group', { name: 'Most common collection states' }).getByRole('meter')).toHaveCount(3);
  const table = panel.getByRole('table', { name: 'What each tool reports' });
  await expect(table).toContainText('anon_3cc232b87671fdbc09d946c4');
  await press(sortButton(table, 'Data'));
  await expect(table.getByRole('columnheader', { name: 'Data' })).toHaveAttribute('aria-sort', 'ascending');
  await checkAxe(page, '#p-coverage', 'Coverage panel in light theme');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await openPanel(page, 'coverage');
  await expect(table).toBeVisible();
  await checkAxe(page, '#p-coverage', 'Coverage panel in dark theme');
});
