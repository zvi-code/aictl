import { fileURLToPath } from 'node:url';
import { captureFrame, checkAxe, checkConsole, dist, expect, provideCatalog, provideHealthSeries, test } from './fixtures.mjs';
import { startReplay } from '../replay/server.mjs';

const now = 1795134732;
const missing = 'n/a';
const quiet = fileURLToPath(new URL('../../../../../../test/recordings/quiet/', import.meta.url));
const healthTest = test.extend({
  healthReplay: [async ({}, use) => {
    const replay = await startReplay({ directory: quiet, dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true,
      mapBootstrap: data => ({ ...data, entities: data.entities.filter(entity =>
        !['history.board', 'catalog.board', 'configuration.board'].includes(entity.topic)
        && !(entity.topic === 'source.status' && entity.id.startsWith('history:'))).map(entity => {
        if (entity.topic !== 'runtime.health') return entity;
        // The tape anonymized the inventory entity ID. Restore the contract ID.
        if (entity.data.inventory) return { ...entity, id: 'table_inventory' };
        if (entity.id !== 'local') return entity;
        const { monitor, pipeline, store } = entity.data;
        return { ...entity, data: { ...entity.data, monitor: { ...monitor, roots: [
          { kind: 'workspace', path: 'X:\\Replay\\health-fixture' }, ...monitor.roots,
        ] }, pipeline: { ...pipeline,
          data_quality: Array.from({ length: 12 }, (_, i) => ({ ...pipeline.data_quality[0], ts: now - i,
            component: 'health-replay', severity: i === 0 ? 'error' : 'info', text: `Fixture event ${i}`, count: i })),
          ingesters: [{ ...pipeline.ingesters[0], name: 'replay-ingester', status: 'ok', last_poll: now - 1, last_ok: now - 30, rows: 0 }],
        }, store: { ...store, reader: { status: 'ok', queries: 3, query_failures: 0, last_latency_ms: 10 },
          query_cpu: { started_at: now - 60, queries: 5, failed: 1, reported: 4, total_cpu_s: 12.25 },
          writer: { status: 'ok', tables: { fixture_table: {
            mode: 'queued', queue_depth: 7, queue_bytes: 420, in_flight: 0, rows_sent: 31, rows_dropped: 2,
            lost_at_exit: 0, last_error: null, ingest_requests: 3, ingest_failures: 0, bytes_sent: 1950, last_sent_at: now - 5, last_error_at: null,
          }, second_table: {
            mode: 'queued', queue_depth: 3, queue_bytes: 150, in_flight: 0, rows_sent: 10, rows_dropped: 0,
            lost_at_exit: 0, last_error: null, ingest_requests: 1, ingest_failures: 0, bytes_sent: 500, last_sent_at: now - 5, last_error_at: null,
          } } },
          reads: { ...store.reads, rate_per_s: 2 },
          ingestion_traffic: { ...store.ingestion_traffic, queued: { ...store.ingestion_traffic.queued,
            rows_per_s: 3,
            groups: [{ ...store.ingestion_traffic.queued.groups[0], id: 'fixtures', label: 'Fixture group', tables: ['fixture_table'],
              rows_per_s: 0, bytes_per_s: null, pending: 7 }, ...store.ingestion_traffic.queued.groups.slice(1)] } },
        } } };
      }) }),
    });
    try { await use(replay); } finally { await replay.close(); }
  }, { scope: 'worker' }],
});

async function open(page, replay, query = '') {
  await page.clock.setFixedTime(new Date(now * 1000));
  await provideCatalog(page);
  const series = await provideHealthSeries(page);
  // The replay maps the history bootstrap only. Use its mapped, runtime-only fixture.
  await page.route('**/api/live/stream?**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('history') !== '0') return route.continue();
    url.searchParams.set('history', '1');
    return route.continue({ url: url.href });
  });
  await page.goto(`${replay.url}/?screen=health${query}`);
  await expect(page.getByRole('heading', { name: 'aictl Health', level: 1 })).toBeVisible();
  return series;
}

async function panel(page, id) {
  const box = page.locator(`#p-${id}`);
  await box.scrollIntoViewIfNeeded();
  return box;
}

async function showAll(page) {
  await page.getByRole('checkbox', { name: 'Show all metrics' }).press('Space');
  await expect(page.getByRole('checkbox', { name: 'Show all metrics' })).toBeChecked();
  await expect(page).not.toHaveURL(/all.metrics/i);
}

healthTest('HLT-01 and HLT-06: show live health, actionable issues and source disclosures', async ({ page, healthReplay, capture }) => {
  await open(page, healthReplay);
  const highlights = await panel(page, 'healthHighlights');
  await expect(highlights.getByText('Health updated')).toBeVisible();
  await expect(highlights.getByText('Degraded', { exact: true })).toBeVisible();
  const diagnostics = await panel(page, 'healthDiagnostics');
  await expect(diagnostics.getByText('Reasons', { exact: true }).locator('..').locator('dd').first()).toHaveText(/^[1-9]\d*$/);
  // Every reason of the status is listed, not folded.
  await expect(diagnostics.getByText('health-replay: Fixture event 0')).toBeVisible();
  await diagnostics.getByText('Collectors', { exact: true }).press('Enter');
  await expect(diagnostics.getByText('Collectors', { exact: true }).locator('..').locator('li').first()).toBeVisible();
  await diagnostics.getByText('Collectors', { exact: true }).press('Space');
  await expect(diagnostics.getByText('Collectors', { exact: true }).locator('..')).not.toHaveAttribute('open', '');
  await expect(page.getByRole('heading', { name: 'Table inventory', exact: true })).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await captureFrame(page);
  await expect(page).toHaveScreenshot('health-highlights.png');
  await page.getByRole('button', { name: 'Pause live' }).click();
  await expect(highlights.locator('[data-status="stale"]')).toBeVisible();
  await expect(highlights.getByText('Health updated')).toBeVisible();
  checkConsole(capture);
});

healthTest('HLT-02 and HLT-03: inspect store requests, writer counters and physical modes', async ({ page, healthReplay }) => {
  await open(page, healthReplay);
  const store = await panel(page, 'storeHealth');
  const stat = label => store.getByText(label, { exact: true }).locator('..').locator('dd');
  await expect(stat('Kusto query CPU')).toHaveText('12.25 s');
  await expect(stat('Read requests/min')).toHaveText('120');
  await expect(stat('Writer queue depth')).toHaveText('10 rows');
  await expect(stat('Writer rows dropped')).toHaveText('2');
  await expect(store.getByRole('meter', { name: 'Failed share since client start' })).toHaveAttribute('value', '20');
  for (const id of ['writer-queue', 'writer-drops'])
    await expect(store.locator(`[data-health-chart="${id}"] canvas`).first()).toBeVisible();
  await store.getByText('Store details', { exact: true }).press('Enter');
  const requests = store.getByRole('table', { name: 'Client requests since daemon start' });
  await expect(requests.getByRole('row', { name: /Read requests/ })).toBeVisible();
  const cpu = store.getByRole('table', { name: 'Kusto query CPU per daemon' });
  await expect(cpu.getByRole('row', { name: /5 1 4 12\.25 s/ })).toBeVisible();
  const writer = store.getByRole('table', { name: 'Writer counters by table' });
  await expect(writer.getByRole('columnheader', { name: /Queue depth/ })).toBeVisible();
  for (const [label, value] of [['Queue depth', '7'], ['Rows dropped', '2'], ['In flight', '0']]) {
    const headers = await writer.getByRole('columnheader').allTextContents();
    const column = headers.findIndex(name => name.startsWith(label));
    expect(column).toBeGreaterThan(-1);
    await expect(writer.getByRole('row', { name: /fixture_table/ }).getByRole('cell').nth(column)).toHaveText(value);
  }
  const membership = store.getByRole('table', { name: 'Reported table membership by mode' });
  await expect(membership.getByRole('row', { name: /Fixture group Queued DM fixture_table/ })).toBeVisible();
  await expect(membership.getByRole('row', { name: /Streaming fixture_table/ })).toHaveCount(0);

  const traffic = await panel(page, 'ingestionTraffic');
  await expect(traffic.getByText('Queued DM submissions', { exact: true }).locator('..').locator('dd')).toHaveText('180 rows/min');
  const group = traffic.getByRole('row', { name: /Fixture group/ });
  await expect(group.getByRole('cell', { name: '0/s', exact: true }).first()).toBeVisible();
  await expect(group.getByRole('cell', { name: missing, exact: true }).first()).toBeVisible();
  await traffic.getByText('Batch and queue details', { exact: true }).press('Space');
  await expect(traffic.getByRole('table', { name: 'Ingestion mode uploads' })).toBeVisible();
  await expect(traffic.getByText(/not the DM service backlog/)).toBeVisible();
});

healthTest('HLT-04 and HLT-05: inspect host rows and scroll the virtual inventory', async ({ page, healthReplay }) => {
  await open(page, healthReplay);
  const resources = await panel(page, 'hostResources');
  const runtime = resources.getByRole('table', { name: 'Reported node runtime' });
  await expect(runtime.getByRole('columnheader', { name: /Daemon CPU/ })).toBeVisible();
  await expect(resources.getByRole('table', { name: 'Network traffic by node' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Table inventory', exact: true })).toBeHidden();
  await showAll(page);
  const inventory = await panel(page, 'tableInventory');
  const table = inventory.getByRole('table', { name: 'Table inventory' });
  await expect(inventory.getByText('Physical tables', { exact: true }).locator('..').locator('dd')).toHaveText('57');
  await expect(table).toHaveAttribute('aria-rowcount', '58');
  const last = table.locator('[data-row-id=\'["vscode_chat_messages"]\']');
  await expect(last).toHaveCount(0);
  const area = inventory.getByRole('region', { name: 'Table inventory scroll area' });
  await area.press('End');
  await expect(last).toBeVisible();
  const sort = table.getByRole('button', { name: 'Extent rows' });
  await sort.press('Enter');
  await expect(table.getByRole('columnheader', { name: /Extent rows/ })).toHaveAttribute('aria-sort', 'ascending');
  await inventory.getByRole('searchbox', { name: 'Find a table' }).fill('table-not-in-fixture');
  await expect(inventory.getByText('No matching table.')).toBeVisible();
});

healthTest('HLT-07 and HLT-08: open collection counters and compare sources by tool', async ({ page, healthReplay }) => {
  await open(page, healthReplay);
  await showAll(page);
  const collection = await panel(page, 'self');
  await collection.getByText('Collection details', { exact: true }).press('Space');
  await expect(collection.getByText('Live viewers')).toBeVisible();
  await expect(collection.getByText('OTel metrics received')).toBeVisible();
  const sources = await panel(page, 'sources');
  const tools = sources.getByRole('table', { name: 'Data sources', exact: true });
  await expect(tools.locator('[data-row-id="copilot-cli"]')).toBeVisible();
  await expect(tools.getByRole('columnheader', { name: /Hooks in 24 h/ })).toBeVisible();
  await tools.getByRole('button', { name: 'Last data', exact: true }).press('Enter');
  await expect(tools.getByRole('columnheader', { name: /Last data/ })).toHaveAttribute('aria-sort', 'ascending');
});

healthTest('HLT-09 and HLT-10: unfold folders and separate a poll from its last success', async ({ page, healthReplay }) => {
  await open(page, healthReplay);
  await showAll(page);
  const collectors = await panel(page, 'collectors');
  await expect(collectors.getByRole('table', { name: 'Collector status' })).toBeVisible();
  const folds = collectors.getByText('Monitored folders', { exact: true });
  await folds.press('Enter');
  const roots = collectors.getByRole('table', { name: 'Monitored folders' });
  await expect(roots.getByText('X:\\Replay\\health-fixture', { exact: true })).toBeVisible();
  await folds.press('Space');
  await expect(roots).toBeHidden();

  const quality = await panel(page, 'quality');
  await expect(quality.getByText('Quality errors', { exact: true }).locator('..').locator('dd')).toHaveText('1');
  const polls = quality.getByRole('table', { name: 'Ingester polls' });
  await expect(polls.getByRole('columnheader', { name: /Last poll started/ })).toBeVisible();
  await expect(polls.getByRole('columnheader', { name: /Last successful poll/ })).toBeVisible();
  await expect(polls.locator('[data-row-id="replay-ingester"]').getByRole('cell').nth(4)).toHaveText('0');
  const events = quality.getByRole('table', { name: 'Data quality events' });
  await expect(events).toHaveAttribute('aria-rowcount', '11');
  await expect(events.getByText('Fixture event 0', { exact: true })).toBeVisible();
  await expect(quality.getByText('Showing the 10 newest of 12 reported events.')).toBeVisible();
});

healthTest('HLT-01/02/04/05: use only the selected scope and share capacity once', async ({ page, healthReplay }) => {
  await page.clock.install({ time: new Date(now * 1000) });
  const rows = ['alpha', 'beta', 'gamma'].map((node_id, i) => ({ node_id, daemon_pid: i + 10, status: 'reported', captured_at: now - 1,
    activity_at: now - 1, cpu_percent: 5 + i, inbound_bps: i, outbound_bps: null,
    client_sample: i === 2 ? null : { at: now - 1, pid: i + 10, store: { reads: { total: i + 1, recent_avg_ms: 0, recent_completed: i + 1 },
      query_cpu: { started_at: now - 60, queries: 4, failed: i, reported: 4, total_cpu_s: i ? 0 : 4.5 } },
      runtime: { daemon: { cpu_percent: i, rss_bytes: 1024 } } },
  }));
  let release, fleetReads = 0;
  const first = new Promise(resolve => { release = resolve; });
  await page.route(/\/api\/board\/nodes\?view=health&scope=(fleet|node)/, async route => {
    const query = new URL(route.request().url()).searchParams;
    const scope = query.get('scope');
    if (scope === 'fleet') await first;
    const generatedAt = scope === 'fleet' ? now + 30 * Math.min(fleetReads++, 1) : now;
    await route.fulfill({ json: { view: 'health', scope, local_node: { node_id: 'serving', source: 'hostname' }, generated_at: generatedAt,
      read_only: true, fleet_available: true, rows: rows.filter(row => scope === 'fleet' || row.node_id === query.get('node_id')),
      shared_kusto: { scope: 'shared', cluster: 'store.example.test', database: 'fixture', capacity_total: 12,
        capacity_available: 0, capacity_checked_at: now, capacity_status: 'cached',
        table_inventory: { status: 'cached', checked_at: now, tables: [], truncated: false },
      },
    } });
  });
  try {
    await open(page, healthReplay, '&scope=fleet');
    await expect((await panel(page, 'healthHighlights')).locator('[data-status="loading"]')).toBeVisible();
  } finally { release(); }
  const highlights = await panel(page, 'healthHighlights');
  await expect(highlights.getByRole('meter', { name: 'Client counters: 2 of 3 nodes' })).toBeVisible();
  await expect(highlights.getByRole('link', { name: 'Node measurements' })).toHaveAttribute('href', '/api/board/nodes?view=health&scope=fleet');
  const store = await panel(page, 'storeHealth');
  await expect(store.getByText('Cluster slots total', { exact: true }).locator('..').locator('dd')).toHaveText('12');
  await expect(store.getByText('24', { exact: true })).toHaveCount(0);
  await expect(store.locator('[data-health-chart="query-cpu"] canvas').first()).toBeVisible();
  await store.getByText('Store details', { exact: true }).press('Enter');
  await expect(store.getByRole('row', { name: /Read requests 3 / })).toBeVisible();
  const cpu = store.getByRole('table', { name: 'Kusto query CPU per daemon' });
  await expect(cpu.getByRole('row', { name: /^alpha/ }).getByRole('cell', { name: '4.5 s', exact: true })).toBeVisible();
  await expect(cpu.getByRole('row', { name: /^beta/ }).getByRole('cell', { name: '0 s', exact: true })).toBeVisible();
  await expect(cpu.getByRole('row', { name: /^gamma/ }).getByRole('cell', { name: missing }).first()).toBeVisible();
  await showAll(page);
  await expect((await panel(page, 'tableInventory')).getByText('No table rows reported.')).toBeVisible();
  const trends = await panel(page, 'healthTrends');
  const summary = trends.getByRole('table', { name: 'Nodes over the selected range' });
  await expect(summary.locator('[data-row-id="gamma"]')).toBeVisible();
  // Twelve nodes report: per-node lines show the busiest few, additive charts sum the rest as Other.
  await expect(trends.locator('[data-health-chart="host-cpu"]')).toContainText('node-12');
  await expect(trends.locator('[data-health-chart="query-cpu"]')).toContainText('Other 9');
  await expect(trends.locator('[data-health-chart="flow-nodes"]')).toContainText('Other 9');
  await expect(trends.locator('[data-health-chart="flow-rows"]')).toContainText('Other 5');
  const senders = trends.getByRole('table', { name: 'Sending nodes' });
  await expect(senders.locator('[data-row-id]')).toHaveCount(12);
  await expect(senders.locator('[data-row-id]').first()).toHaveAttribute('data-row-id', 'node-12');
  const hosts = await panel(page, 'hostResources');
  await expect(hosts.locator('[data-health-chart="host-cpu"] canvas').first()).toBeVisible();
  await hosts.getByRole('button', { name: 'View beta' }).press('Enter');
  await expect(page).toHaveURL(/[?&]scope=node&node_id=beta/);
  await expect(hosts.getByRole('row').filter({ hasText: 'alpha' })).toHaveCount(0);
  await expect(hosts.getByRole('table', { name: 'Reported node runtime' }).locator('[data-row-id="beta"]')).toBeVisible();
});

healthTest('HLT-11: move through health history buckets, ranges and the data table', async ({ page, healthReplay }) => {
  const requests = await open(page, healthReplay);
  const trends = await panel(page, 'healthTrends');
  await expect(trends.locator('h4')).toHaveText(['Ingestion flows', 'Kusto backend', 'Hosts and daemons']);
  for (const id of ['flow-rows', 'flow-bytes', 'ingestion', 'flow-queue', 'backend-cpu', 'backend-commands', 'host-cpu'])
    await expect(trends.locator(`[data-health-chart="${id}"] canvas`).first()).toBeVisible();
  await expect(trends.locator('[data-health-chart="flow-nodes"]')).toHaveCount(0);
  const flows = trends.locator('[data-health-section="flows"]');
  await expect(flows.getByText('Tables', { exact: true }).locator('..').locator('dd').first()).toHaveText('8');
  await expect(trends.getByRole('table', { name: 'Destination tables' }).locator('[data-row-id]').first()).toHaveAttribute('data-row-id', 'Events');
  await expect(trends.getByRole('table', { name: 'aictl views by cluster CPU' }).locator('[data-row-id]').first())
    .toHaveAttribute('data-row-id', 'aictl.live.keys');
  const day = requests.at(-1);
  expect(Number(day.get('until')) - Number(day.get('since'))).toBe(86_400);
  const bucket = trends.getByRole('button', { name: /^Bucket / });
  const newest = await bucket.textContent();
  await bucket.press('ArrowLeft');
  await expect(trends.getByRole('button', { name: 'Show newest' })).toBeVisible();
  await expect(bucket).not.toHaveText(newest);
  await bucket.press('End');
  await expect(trends.getByRole('button', { name: 'Show newest' })).toBeHidden();
  await expect(bucket).toHaveText(newest);
  await trends.getByRole('radio', { name: '7 d' }).click();
  await expect.poll(() => { const last = requests.at(-1); return Number(last.get('until')) - Number(last.get('since')); }).toBe(604_800);
  await trends.getByRole('radio', { name: 'Data table' }).click();
  for (const name of ['Ingestion flow buckets', 'Kusto backend buckets']) await expect(trends.getByRole('table', { name })).toBeVisible();
  const table = trends.getByRole('table', { name: 'Health history buckets' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: /Bucket start/ })).toBeVisible();
});

healthTest('HLT-11: explain once that health history needs a Kusto store', async ({ page, healthReplay }) => {
  await page.route(/\/api\/board\/nodes\?view=(series|flows|backend)&/, route =>
    route.fulfill({ status: 409, json: { error: 'Health history requires a Kusto store' } }));
  await page.clock.setFixedTime(new Date(now * 1000));
  await provideCatalog(page);
  await page.goto(`${healthReplay.url}/?screen=health`);
  await expect((await panel(page, 'healthTrends')).getByText('Health history needs a Kusto store.')).toBeVisible();
});

healthTest('HLT-01 and HLT-06: show a read error instead of historical data', async ({ page, healthReplay }) => {
  await page.route('**/api/board/nodes?view=health&scope=node&node_id=missing', route =>
    route.fulfill({ status: 503, json: { error: 'Fixture health read failed.' } }));
  await open(page, healthReplay, '&scope=node&node_id=missing');
  for (const id of ['healthHighlights', 'healthDiagnostics']) {
    await expect((await panel(page, id)).getByRole('alert')).toContainText('History is not used as a substitute.');
  }
});

healthTest('Health controls and contrast work in both themes', async ({ page, healthReplay, capture }) => {
  await open(page, healthReplay);
  await expect((await panel(page, 'healthHighlights')).getByText('Health updated')).toBeVisible();
  await showAll(page);
  await checkAxe(page, '[data-screen="health"]', 'Light Health');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await checkAxe(page, '[data-screen="health"]', 'Dark Health');
  checkConsole(capture);
});
