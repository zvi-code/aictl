import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';
import { boardReady, prepareBoard } from './catalog.mjs';
import { startReplay } from './server.mjs';

const dist = resolve(process.env.UI_DIST ?? 'node_modules/.cache/aictl-ui-baseline');
const key = 'aictl-dock-board-v1';
const mode = page => page.locator('[data-dock-mode]');
const assets = url => /\/assets\/(?:DockEditor|dockview)-/.test(url);
let replay;
test.beforeAll(async () => { replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true }); });
test.afterAll(async () => { await replay.close(); });

async function open(page) {
  await prepareBoard(page);
  await page.goto(`${replay.url}/?screen=board&range=7d`);
  await boardReady(page);
  await expect(mode(page)).toHaveAttribute('data-dock-mode', 'static');
}

function boxes(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-dock-mode] [id^="p-"]')]
    .filter(element => element.getClientRects().length)
    .map(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return [element.id, [x + scrollX, y + scrollY, width, height]];
    })));
}

function sameBoxes(before, after) {
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  for (const [id, rect] of Object.entries(before)) {
    for (const [i, edge] of rect.entries()) expect(Math.abs(after[id][i] - edge), `${id}, dimension ${i}`).toBeLessThanOrEqual(1);
  }
}

async function checkThemes(page) {
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Theme').selectOption(theme);
    const report = await new AxeBuilder({ page }).analyze();
    expect(report.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
  }
}

async function attachWithoutMoving(page, title = 'Overview summary') {
  const action = page.getByRole('button', { name: `${title} layout` });
  await action.press('ArrowDown');
  // A group with no horizontal sibling already occupies the full width.
  await page.getByRole('menuitem', { name: 'Wider', exact: true }).press('Enter');
  await expect(mode(page)).toHaveAttribute('data-dock-mode', 'editor');
  await expect(action).toBeFocused();
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
  test(`static and Dockview panel boxes agree at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      window.dockShifts = [];
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          // Measure dock geometry, not movement inside a panel as its data changes.
          if (entry.sources.some(({ node }) => {
            const element = node instanceof Element ? node : node?.parentElement;
            const panel = element?.closest('[id^="p-"]');
            return element?.closest('[data-dock-mode="static"]') && (!panel || panel === element);
          })) window.dockShifts.push(entry.toJSON());
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await open(page);
    expect(requests.filter(assets)).toEqual([]);
    expect(await page.evaluate(() => window.dockShifts)).toEqual([]);
    const before = await boxes(page);
    expect(Object.keys(before).length).toBeGreaterThan(30);
    const pin = await page.locator('#p-kpis').elementHandle();
    const scroll = await page.evaluate(() => scrollY);
    const apiBefore = requests.filter(url => url.includes('/api/'));
    await attachWithoutMoving(page);
    sameBoxes(before, await boxes(page));
    expect(await pin.evaluate(node => node === document.querySelector('#p-kpis'))).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    expect(requests.filter(url => url.includes('/api/'))).toEqual(apiBefore);
    expect(requests.some(url => /\/assets\/dockview-.*\.js$/.test(url))).toBe(true);
    expect(requests.some(url => /\/assets\/DockEditor-.*\.css$/.test(url))).toBe(true);
  });
}

test('attach at a scrolled panel without restarting its in-flight read', async ({ page }) => {
  let release, reads = 0;
  const held = new Promise(resolve => { release = resolve; });
  const path = '/api/effective-models';
  await page.route(`**${path}`, async route => {
    reads++;
    await held;
    await route.continue();
  });
  try {
    await open(page);
    const findings = page.locator('#p-findings');
    await findings.scrollIntoViewIfNeeded();
    const stale = findings.locator('[data-status="stale"]', { hasText: 'Not all settings sources' });
    await expect(stale).toBeVisible();
    await expect.poll(() => reads).toBe(1);
    const scroll = await page.evaluate(() => scrollY);
    expect(scroll).toBeGreaterThan(0);
    const table = findings.getByRole('table', { name: 'Hidden changes and conflicts' });
    const original = await table.elementHandle();
    await attachWithoutMoving(page, 'Hidden changes and conflicts');
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    expect(await original.evaluate(node => node.isConnected)).toBe(true);
    const response = page.waitForResponse(r => r.url().endsWith(path) && r.ok());
    release();
    await response;
    await expect(stale).toBeHidden();
    expect(reads).toBe(1);
  } finally { release(); }
});

test('resize and drag before attachment; restore saved tabs and geometry', async ({ page }) => {
  await open(page);
  const usage = page.locator('#dock-usage');
  const sash = usage.getByRole('button', { name: 'Resize columns 1 and 2', exact: true }).first();
  await sash.scrollIntoViewIfNeeded();
  const { x, y, width, height } = await sash.boundingBox();
  const oldWidth = (await boxes(page))['p-tokens'][2];
  await page.mouse.move(x + width / 2, y + height / 2);
  await page.mouse.down();
  await page.mouse.move(x + width / 2 + 20, y + height / 2);
  await page.mouse.up();
  expect((await boxes(page))['p-tokens'][2]).toBe(oldWidth + 20);
  await sash.press('ArrowRight');
  await expect(mode(page)).toHaveAttribute('data-dock-mode', 'static');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(saved.tree.find(section => section.id === 'usage').tree.grid.root.data[0].data[0].size)
    .toBe((await boxes(page))['p-tokens'][2]);
  const tokenTab = usage.locator('button[data-dock-tab="tokens"]');
  const cacheTab = usage.locator('button[data-dock-tab="cacheRate"]');
  await tokenTab.dragTo(cacheTab);
  await expect(mode(page)).toHaveAttribute('data-dock-mode', 'editor');
  await page.reload();
  await boardReady(page);
  const group = usage.getByRole('tablist').filter({ has: page.locator('[data-dock-tab="tokens"]') });
  const token = group.locator('[data-dock-tab="tokens"]');
  const cache = group.locator('[data-dock-tab="cacheRate"]');
  await expect(group.getByRole('tab')).toHaveCount(2);
  await cache.click();
  await expect(cache).toHaveAttribute('aria-selected', 'true');
  await cache.press('ArrowRight');
  await expect(token).toBeFocused();
  await expect(token).toHaveAttribute('aria-selected', 'true');
  await expect(token).toHaveAttribute('tabindex', '0');
  await expect(cache).toHaveAttribute('tabindex', '-1');
  await page.reload();
  await boardReady(page);
  await expect(token).toHaveAttribute('aria-selected', 'true');
  await checkThemes(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => scrollTo(0, 0));
  const before = await boxes(page);
  await attachWithoutMoving(page);
  sameBoxes(before, await boxes(page));
  await checkThemes(page);
});
