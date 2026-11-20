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
