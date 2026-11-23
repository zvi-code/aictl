import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installProbe, layoutShift } from '../replay/browser-probe.mjs';
import { startReplay } from '../replay/server.mjs';

export const dist = resolve(process.env.UI_DIST ?? 'node_modules/.cache/aictl-ui-baseline');
export const boardUrl = '/?screen=board&range=7d';
const catalogUrl = new URL('../../../../../../docs/datapoint-catalog.csv', import.meta.url);

export const test = base.extend({
  shiftSources: [false, { option: true }],
  snapshotReplay: [async ({}, provide) => {
    const replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true });
    try { await provide(replay); } finally { await replay.close(); }
  }, { scope: 'worker' }],
  capture: async ({ page, shiftSources }, provide, testInfo) => {
    const errors = [];
    const misses = [];
    const http = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push({ text: message.text(), url: message.location().url, kind: 'console' });
    });
    page.on('pageerror', error => errors.push({ text: error.message, kind: 'exception' }));
    page.on('response', response => {
      if (response.status() >= 400) {
        http.push(response.url());
        if (response.headers()['x-replay-miss']) misses.push(normalizedPath(response.url()));
      }
    });
    await page.addInitScript(installProbe, { shiftSources });
    await provide({ errors, misses, http });
    await testInfo.attach('browser diagnostics', {
      contentType: 'application/json', body: JSON.stringify({ errors, misses, http }, null, 2),
    });
  },
});

export { expect };

function normalizedPath(value) {
  const url = new URL(value);
  url.searchParams.sort();
  return url.pathname + (url.searchParams.size ? '?' + url.searchParams : '');
}

export function checkConsole(capture, expectedMisses = [], recordedErrors = []) {
  const expected = new Set(expectedMisses);
  expect.soft([...new Set(capture.misses)].filter(path => !expected.has(path)), 'new replay coverage gaps').toEqual([]);
  const unexpected = capture.errors.filter(error => {
    if (error.kind !== 'console' || !error.url || !error.text.startsWith('Failed to load resource:')) return true;
    const path = normalizedPath(error.url);
    return !(expected.has(path) && capture.misses.includes(path)) &&
      !(recordedErrors.includes(path) && capture.http.includes(error.url) && !capture.misses.includes(path));
  });
  expect.soft(unexpected, 'unexpected browser console errors').toEqual([]);
}

export async function provideCatalog(page) {
  // The Phase 0 tape predates this read. Use the checked-in datapoint metadata.
  const rows = (await readFile(catalogUrl, 'utf8')).split(/\r?\n/).slice(1).filter(Boolean).map(line => {
    const [key, , unit] = line.split(',', 3);
    return { key, unit };
  });
  await page.route('**/api/datapoints', route => route.fulfill({ json: rows }));
}

const manyNodes = ['alpha', 'beta', 'gamma', ...Array.from({ length: 9 }, (_, i) => `node-${String(i + 4).padStart(2, '0')}`)];
const flowTables = ['Events', 'ToolCalls', 'Sessions', 'Metrics', 'Logs', 'Files', 'Spans', 'Prompts'];
const backendViews = ['aictl.live.keys', 'aictl.tools.activity_rows', 'aictl.board.sessions', 'aictl.sequence.event_log',
  'aictl.usage.sessions', 'aictl.health.series'];

// The recorded tapes predate the health series, flows and backend views. Answer them with contract-shaped
// fixture buckets for the requested window; the third bucket from the end has no node snapshot.
// A fleet has twelve reporting nodes, so the charts must group the smaller ones.
export async function provideHealthSeries(page, { fleet = manyNodes, local = 'replay-node' } = {}) {
  const requests = [];
  await page.route(/\/api\/board\/nodes\?view=(series|flows|backend)&/, route => {
    const query = new URL(route.request().url()).searchParams;
    const view = query.get('view');
    if (view === 'series') requests.push(query);
    const scope = query.get('scope'), since = Number(query.get('since')), until = Number(query.get('until'));
    const step = Math.max(30, Math.ceil((until - since) / 240 / 30) * 30);
    const nodes = scope === 'fleet' ? fleet : [scope === 'node' ? query.get('node_id') : local];
    const head = { view, scope, local_node: { node_id: local, source: 'hostname' }, fleet_available: true,
      generated_at: until, read_only: true, since, until, step };
    if (view === 'flows') {
      const tables = [];
      for (let t = since, i = 0; t < until; t += step, i++) {
        if (t === until - 3 * step) continue;
        flowTables.forEach((table, k) => {
          const rows = (8 - k) * (1 + nodes.length * 0.5) + (i % 5);
          tables.push({ table, t, rows_per_s: rows, bytes_per_s: rows * 350, requests_per_s: 0.2 * (8 - k),
            failures: i === 10 && k === 0 ? 2 : 0, rows_dropped: i === 20 && k === 1 ? 5 : 0, queue_depth: k === 2 ? i % 6 : 0,
            nodes: nodes.length });
        });
      }
      const flowNodes = nodes.flatMap((node_id, n) => flowTables.map((table, k) => {
        const rows = (8 - k) * (n + 1) * 1000;
        return { node_id, table, mode: k % 2 ? 'queued' : 'streaming', rows, bytes: rows * 350, requests: (8 - k) * 20,
          failures: n === 0 && k === 0 ? 2 : 0, rows_dropped: n === 1 && k === 1 ? 5 : 0, peak_rows_per_s: (8 - k) * (n + 1),
          queue_depth: n === 0 && k === 2 ? 3 : 0, last_at: until - step };
      }));
      return route.fulfill({ json: { ...head, truncated: false, tables, nodes: flowNodes } });
    }
    if (view === 'backend') {
      const series = [];
      for (let t = since, i = 0; t < until; t += step, i++) {
        series.push(
          { t, work: 'aictl_queries', commands: step * 0.5, failed: i % 30 === 0 ? 1 : 0, cpu_s: step * (0.3 + (i % 7) * 0.02), memory_peak: 2e8 },
          { t, work: 'other_queries', commands: step * 0.05, failed: 0, cpu_s: step * 0.05, memory_peak: 1e8 },
          { t, work: 'ingestion', commands: step * 0.2, failed: 0, cpu_s: step * 0.1, memory_peak: 3e8 },
          { t, work: 'maintenance', commands: step * 0.01, failed: 0, cpu_s: step * 0.02, memory_peak: 5e7 },
        );
      }
      const views = backendViews.map((name, k) => ({ view: name, commands: 1200 - k * 150, failed: k === 3 ? 2 : 0,
        cpu_s: 1400 - k * 200, mean_ms: 400 + k * 300, max_ms: 4000 + k * 900, memory_peak: 2e8 - k * 1e7 }));
      return route.fulfill({ json: { ...head, database: 'fixture', checked_at: until, series, views,
        measurement_scope: 'Commands and queries that the cluster recorded for this database.' } });
    }
    const rows = [];
    for (let t = since, i = 0; t < until; t += step, i++) {
      if (t === until - 3 * step) continue;
      nodes.forEach((node_id, n) => rows.push({
        node_id, t, samples: 6, restarts: i === 5 && n === 0 ? 1 : 0,
        host_cpu: 20 + (i % 12) * 2 + n * 9, host_cpu_max: 35 + (i % 12) * 3 + n * 9, host_mem_mb: 18_000 + (i % 24) * 40,
        host_mem_total_mb: 32_768, tools_cpu: 4, tools_mem_mb: 900, daemon_cpu: 2 + (i % 5), daemon_cpu_max: 6 + (i % 5),
        daemon_rss_mb: 210 + n * 30, daemon_threads: 40, sessions: 3 + n, processes: 7 + n, in_rate: 1200 + i * 3, out_rate: 600 + i,
        reads_per_s: 1.5 + (i % 6) * 0.25, writes_per_s: 0.5, commands_per_s: 0.1, read_ms: 80 + (i % 10) * 9, read_ms_max: 240 + (i % 10) * 20,
        write_ms: 45, write_ms_max: 120, reads_in_flight: 0, writes_in_flight: 0, query_cpu: 0.02 + n * 0.01, bytes_per_s: 3000,
        streaming_rows_per_s: 4 + (i % 4), queued_rows_per_s: 2, inline_rows_per_s: 0, otel_metrics_per_s: 12, otel_events_per_s: 3,
        queue_depth: i % 8, queue_bytes: (i % 8) * 120, read_failures: i % 40 === 0 ? 1 : 0, write_failures: 0, command_failures: 0,
        ingest_failures: 0, rows_dropped: 0, otel_errors: 0, otel_dropped: 0, sink_dropped: 0,
      }));
    }
    return route.fulfill({ json: { ...head, truncated: false, rows } });
  });
  return requests;
}

export async function goToBoard(page, replay) {
  await provideCatalog(page);
  await page.goto(replay.url + boardUrl);
  await expect(page.locator('#p-kpis').getByText('Messages', { exact: true })).toBeVisible();
}

export async function captureFrame(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return performance.now();
  });
}

export async function checkRendering(page, since, end = Infinity) {
  const { entries, supported, overflow } = await page.evaluate(() => window.__replayProbe.snapshot());
  expect.soft(supported, 'Chromium observer support').toEqual(expect.arrayContaining(['layout-shift', 'longtask']));
  expect.soft(overflow, 'horizontal page overflow in pixels').toBe(0);
  expect.soft(layoutShift(entries['layout-shift'], since, end).sum, 'unexpected layout shift after load').toBe(0);
  const longTasks = entries.longtask.filter(entry => entry.startTime >= since && entry.startTime < end && entry.duration > 50);
  expect.soft(longTasks.map(entry => Math.round(entry.duration)), 'main-thread long tasks in milliseconds').toEqual([]);
}

export async function checkAxe(page, selector, description) {
  const { violations } = await new AxeBuilder({ page })
    .include(selector)
    .options({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: true } } })
    .analyze();
  expect.soft(violations.map(({ id, impact, nodes }) => ({
    id, impact, targets: nodes.map(node => node.target),
  })), description).toEqual([]);
}

export async function recordedUrl(replay, pathname) {
  const response = await fetch(`${replay.url}/__replay/ready`);
  const { rest } = await response.json();
  const url = rest.map(path => new URL(path, replay.url)).find(url => url.pathname === pathname);
  if (!url) throw new Error(`${pathname} is not in this REST snapshot.`);
  return url;
}

export const hasGallery = Boolean(process.env.UI_VITE) || await access(resolve('gallery.html')).then(() => true, error => {
  if (error.code !== 'ENOENT') throw error;
  return false;
});

export async function startGallery(options = {}) {
  let vite;
  try {
    if (!process.env.UI_VITE) {
      const { createServer } = await import('vite');
      vite = await createServer({ server: { host: '127.0.0.1', port: 0 } });
      await vite.listen();
    }
    const url = process.env.UI_VITE ?? vite.resolvedUrls.local[0];
    const replay = await startReplay({ vite: url, speed: 10, ...options });
    return { ...replay, close: async () => {
      try { await replay.close(); } finally { await vite?.close(); }
    } };
  } catch (error) {
    await vite?.close();
    throw error;
  }
}
