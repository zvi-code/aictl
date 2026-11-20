import { expect, test } from '@playwright/test';
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

async function edit(page) {
  await page.getByRole('button', { name: 'Edit layout', exact: true }).press('Enter');
  await expect(mode(page)).toHaveAttribute('data-dock-mode', 'editor');
}

test('SHL-05: edit mode is lazy and keeps visible panel roots mounted', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await open(page);
  expect(requests.filter(assets)).toEqual([]);
  await expect(page.getByRole('tablist', { name: 'Panels' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Resize columns/ })).toHaveCount(0);
  const pin = await page.locator('#p-kpis').getByText('Messages', { exact: true }).elementHandle();
  await edit(page);
  await expect(page.getByRole('button', { name: 'Done editing' })).toBeFocused();
  expect(requests.some(url => /\/assets\/dockview-.*\.js$/.test(url))).toBe(true);
  expect(await pin.evaluate(node => node.isConnected)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit layout', exact: true })).toBeFocused();
  expect(await pin.evaluate(node => node.isConnected)).toBe(true);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`SHL-01: Overview uses page scrolling at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const agents = page.locator('#sec-agents');
    await page.keyboard.press('2');
    await expect(agents).toBeFocused();
    await expect(agents.getByRole('heading', { name: 'Needs you now' })).toBeVisible();
    const layout = await agents.evaluate(section => ({
      width: section.getBoundingClientRect().width, x: section.getBoundingClientRect().x,
      overflow: [...section.querySelectorAll('[data-flow], [id^="dock-"]')].map(node =>
        [node.id, getComputedStyle(node).overflowY, ...[...node.children].map(child => getComputedStyle(child).overflowY)]),
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.width).toBeGreaterThan(viewport.width * 0.87);
    expect(layout.x).toBeLessThan(32);
    expect(layout.pageWidth).toBeLessThanOrEqual(viewport.width);
    expect(layout.overflow.flat()).not.toContain('auto');
    expect(layout.overflow.flat()).not.toContain('scroll');
    const before = await page.evaluate(() => scrollY);
    await page.keyboard.press('PageDown');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  });
}

test('SHL-05: direct moves persist and retain keyboard focus', async ({ page }) => {
  await open(page);
  await edit(page);
  const agents = page.locator('#sec-agents');
  const ordering = () => agents.locator('[id^="p-"]').evaluateAll(nodes => nodes.map(node => node.id));
  const before = await ordering();
  await agents.locator('#p-agentsT').scrollIntoViewIfNeeded();
  const up = agents.getByRole('button', { name: 'Move Agents and subagents up', exact: true });
  const down = agents.getByRole('button', { name: 'Move Agents and subagents down', exact: true });
  const moved = [...before];
  for (let index = before.indexOf('p-agentsT'); index > 0; index--) {
    await up.press('Enter');
    await expect(index === 1 ? down : up).toBeFocused();
    [moved[index - 1], moved[index]] = [moved[index], moved[index - 1]];
    await expect.poll(ordering).toEqual(moved);
  }
  await expect(mode(page).getByRole('status').filter({ hasText: 'Moved Agents and subagents to position 1' })).toBeAttached();
  const earlier = page.getByRole('button', { name: 'Move Agents section up' });
  await earlier.press('Enter');
  await expect(earlier).toBeFocused();
  await page.reload();
  await boardReady(page);
  await expect(mode(page)).toHaveAttribute('data-dock-mode', 'static');
  await expect.poll(ordering).toEqual(moved);
  await page.keyboard.press('1');
  await expect(page).toHaveURL(/#sec-agents$/);
});

test('SHL-05: resize and stack by pointer, restore tabs and keyboard navigation', async ({ page }) => {
  await open(page);
  await edit(page);
  const usage = page.locator('#dock-usage');
  const sash = usage.getByRole('button', { name: 'Resize columns 1 and 2', exact: true }).first();
  await sash.scrollIntoViewIfNeeded();
  const { x, y, width, height } = await sash.boundingBox();
  const panel = usage.locator('#p-tokens');
  const oldWidth = (await panel.boundingBox()).width;
  await page.mouse.move(x + width / 2, y + height / 2);
  await page.mouse.down();
  await page.mouse.move(x + width / 2 + 20, y + height / 2);
  await page.mouse.up();
  await expect.poll(async () => (await panel.boundingBox()).width).toBeGreaterThan(oldWidth + 18);
  await sash.press('ArrowRight');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(saved.tree.find(section => section.id === 'usage').tree.grid.root.data[0].data[0].size).toBeGreaterThan(oldWidth + 30);
  const grip = panel.locator('[draggable]');
  const target = usage.locator('#p-cacheRate');
  const handle = await grip.boundingBox();
  const onto = await target.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(onto.x + onto.width / 2, onto.y + onto.height / 2, { steps: 10 });
  await page.mouse.move(onto.x + onto.width / 2 + 1, onto.y + onto.height / 2);
  await page.mouse.up();
  await expect(usage.getByRole('tab', { name: 'Tokens, cached and not cached' })).toBeVisible();
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
});
