import { writeFile } from 'node:fs/promises';
import { layoutShift } from '../replay/browser-probe.mjs';
import { captureFrame, checkConsole, expect, startGallery, test } from './fixtures.mjs';

const spike = test.extend({
  slowReplay: [async ({}, use) => {
    const replay = await startGallery({ speed: 1 });
    try { await use(replay); } finally { await replay.close(); }
  }, { scope: 'worker' }],
  fastReplay: [async ({}, use) => {
    const replay = await startGallery({ speed: 10 });
    try { await use(replay); } finally { await replay.close(); }
  }, { scope: 'worker' }],
});

spike.describe.configure({ timeout: 120_000 });
spike.use({ shiftSources: true });

async function open(page, replay, path) {
  const response = await page.goto(`${replay.url}/${path}`);
  expect(response?.ok()).toBe(true);
  await expect(page.locator('#spike')).toHaveAttribute('data-ready', 'true');
}

function domCounts() {
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL);
  let nodes = 1;
  while (walk.nextNode()) nodes++;
  return {
    nodes,
    elements: document.body.getElementsByTagName('*').length,
    rows: [...document.querySelectorAll('table')].map(table => table.querySelectorAll('tr[data-row-id]').length),
  };
}

async function start(page, context) {
  const cdp = await context.newCDPSession(page);
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  const time = await page.evaluate(() => performance.getEntriesByName('spike:first-paint').at(-1).startTime);
  return { cdp, time, usedSize };
}

async function metrics(page, begin, end) {
  const raw = await page.evaluate(() => ({
    ...window.__replayProbe.snapshot(),
    receipts: performance.getEntriesByName('spike:message-received').map(({ startTime, detail }) => ({ startTime, detail })),
    frameUpdates: performance.getEntriesByName('spike:frame-update').map(({ startTime }) => startTime),
    measures: performance.getEntriesByType('measure').map(({ name, startTime, duration }) => ({ name, startTime, duration })),
  }));
  const inWindow = ({ startTime, duration = 0 }) => startTime >= begin && startTime + duration <= end;
  const longTasks = raw.entries.longtask.filter(task => task.startTime < end && task.startTime + task.duration > begin);
  const shiftEntries = raw.entries['layout-shift'].filter(entry => entry.startTime >= begin && entry.startTime < end);
  const shifts = layoutShift(shiftEntries, begin, end);
  expect(raw.supported).toEqual(expect.arrayContaining(['longtask', 'layout-shift', 'event']));
  expect(raw.overflow).toBe(0);
  return {
    durationMs: end - begin,
    changes: raw.receipts.filter(item => item.detail === 'change' && inWindow(item)).length,
    frameUpdates: raw.frameUpdates.filter(time => time >= begin && time <= end).length,
    messages: raw.measures.filter(item => item.name === 'spike:message-to-paint' && inWindow(item)).map(item => item.duration),
    input: raw.measures.filter(item => item.name === 'spike:input-to-paint' && inWindow(item)).map(item => item.duration),
    events: raw.entries.event.filter(item => item.interactionId && inWindow(item)),
    longTasks, shifts, shiftEntries,
  };
}

async function finish(page, begin, end = undefined) {
  const stop = end ?? await captureFrame(page);
  const measure = await metrics(page, begin.time, stop);
  const heap = await begin.cdp.send('Runtime.getHeapUsage');
  await begin.cdp.detach();
  return {
    ...measure,
    dom: await page.evaluate(domCounts),
    heapBytes: { first: begin.usedSize, final: heap.usedSize },
  };
}

async function save(testInfo, kind, measure) {
  const path = testInfo.outputPath('spike.json');
  await writeFile(path, JSON.stringify({ kind, run: testInfo.repeatEachIndex + 1,
    chromium: testInfo.project.use.browserName, ...measure }, null, 2));
  await testInfo.attach('spike metrics', { path, contentType: 'application/json' });
}

async function solid(page, context, replay, speed, testInfo, capture, browser) {
  await open(page, replay, 'spike-solid.html');
  await expect(page.locator('section[aria-labelledby]')).toHaveCount(20);
  for (const label of ['Agents', 'Processes']) {
    await expect(page.getByRole('table', { name: label })).toHaveAttribute('aria-rowcount', '5001');
  }
  const begin = await start(page, context);
  const toggle = page.getByRole('button', { name: 'Toggle board note' });
  if (speed === 10) {
    // Sample input at different points in the lap, not only after a quiet interval.
    for (let index = 0; index < 12; index++) {
      await page.waitForFunction(time => performance.now() >= time, begin.time + 1100 + 2300 * index);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', index % 2 === 0 ? 'true' : 'false');
    }
  }
  const windowMs = speed === 1 ? 60_000 : 36_500;
  await page.waitForFunction(time => performance.now() >= time, begin.time + windowMs);
  const result = await finish(page, begin);
  expect(result.changes).toBeGreaterThan(0);
  expect(result.messages.length).toBeGreaterThan(0);
  expect(result.dom.rows).toHaveLength(2);
  expect(result.dom.rows.every(count => count > 0 && count < 30)).toBe(true);
  if (speed === 10) {
    expect(result.input).toHaveLength(12);
    // Prove these rows are reachable and use the same viewport for the size sweep.
    const table = page.getByRole('table', { name: 'Processes' });
    await page.getByRole('region', { name: 'Processes scroll area' }).press('End');
    await expect(table.locator('tr[aria-rowindex="5001"]')).toBeVisible();
    await open(page, replay, 'spike-solid.html?rows=500');
    await expect(page.getByRole('table', { name: 'Processes' })).toHaveAttribute('aria-rowcount', '501');
    result.domAt500 = await page.evaluate(domCounts);
    expect(result.domAt500).toEqual(result.dom);
  }
  await save(testInfo, `solid-${speed}x`, { ...result, browserVersion: browser.version() });
  checkConsole(capture);
}

function middle(box) {
  if (!box) throw new Error('Control has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function gesture(page, from, to, endPoint = to) {
  await page.mouse.move(from.x, from.y);
  const begin = await page.evaluate(() => performance.now());
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 24 });
  // Keep the gesture active through a replay update. Some tape messages
  // repeat the previous CPU values, so wait for an actual DOM update.
  await page.waitForFunction(time => performance.getEntriesByName('spike:frame-update')
    .some(mark => mark.startTime >= time), begin, { timeout: 8000 });
  await page.mouse.move(endPoint.x, endPoint.y);
  await page.mouse.up();
  const end = await captureFrame(page);
  return [begin, end];
}

spike('Dockview 30 panels, drag, resize, restore and keyboard', async ({ page, context, fastReplay, capture, browser }, testInfo) => {
  await open(page, fastReplay, 'spike-dockview.html');
  const tabs = page.getByRole('tab', { includeHidden: true });
  const core = id => page.getByRole('tab', { name: `Core ${id}`, exact: true });
  const group = id => core(id).locator('xpath=ancestor::*[@role="tablist"][1]');
  await expect(tabs).toHaveCount(30);
  await expect(page.locator('[data-live-key]').first()).not.toHaveText('—');
  const begin = await start(page, context);
  await page.waitForFunction(time => performance.now() >= time, begin.time + 6200);

  const target = middle(await core(6).boundingBox());
  const drag = await gesture(page, middle(await core(1).boundingBox()), target, { x: target.x + 1, y: target.y });
  await expect(group(6).getByRole('tab', { name: 'Core 1', exact: true })).toBeVisible();
  const sash = page.locator('.dv-sash').filter({ visible: true }).first();
  const { from, isVertical } = await sash.evaluate(node => {
    const { x, y, width, height } = node.getBoundingClientRect();
    const isVertical = height > width;
    for (const fraction of [0.25, 0.75, 0.35, 0.65]) {
      const from = { x: x + width * (isVertical ? 0.5 : fraction), y: y + height * (isVertical ? fraction : 0.5) };
      if (document.elementFromPoint(from.x, from.y) === node) return { from, isVertical };
    }
    throw new Error('No pointer target on the sash');
  });
  const originalSash = middle(await sash.boundingBox());
  const resize = await gesture(page, from, { x: from.x + (isVertical ? 85 : 0), y: from.y + (isVertical ? 0 : 85) });
  await expect.poll(async () => middle(await sash.boundingBox())).not.toEqual(originalSash);

  await core(6).focus();
  await page.keyboard.press('End');
  const last = group(6).getByRole('tab').last();
  await expect(last).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(last).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-live-key]').first()).not.toHaveText('—');
  const result = await finish(page, begin);
  result.drag = await metrics(page, ...drag);
  result.resize = await metrics(page, ...resize);
  expect(result.messages.length).toBeGreaterThan(0);
  expect(result.drag.frameUpdates).toBeGreaterThan(0);
  expect(result.resize.frameUpdates).toBeGreaterThan(0);

  const resized = middle(await sash.boundingBox());
  const status = page.locator('header').getByRole('status', { includeHidden: false }).filter({ hasText: /layout/i });
  await page.getByRole('button', { name: 'Save layout' }).click();
  await expect(status).toHaveText('Layout saved');
  await page.getByRole('button', { name: 'Reset layout' }).click();
  await expect(group(6).getByRole('tab', { name: 'Core 1', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore layout' }).click();
  await expect(status).toHaveText('Layout restored');
  await expect(tabs).toHaveCount(30);
  await expect(group(6).getByRole('tab', { name: 'Core 1', exact: true })).toBeVisible();
  await expect.poll(async () => middle(await sash.boundingBox())).toEqual(resized);
  await save(testInfo, 'dockview', { ...result, browserVersion: browser.version() });
  checkConsole(capture);
});

spike('Gallery uPlot redraw, resize and recorded table sort', async ({ page, context, fastReplay, capture, browser }, testInfo) => {
  await open(page, fastReplay, 'spike-gallery.html');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const original = await canvas.elementHandle();
  const sampleCount = () => page.locator('header [data-live-key]').evaluate(node => Number(node.textContent.split(': ')[1]));
  await expect.poll(sampleCount).toBeGreaterThan(1);
  const begin = await start(page, context);
  const pixels = () => canvas.evaluate(node => node.toDataURL());
  const initialPixels = await pixels();
  const initialSamples = await sampleCount();
  await expect.poll(sampleCount).toBeGreaterThan(initialSamples);
  expect(await pixels()).not.toEqual(initialPixels);
  const initialWidth = await canvas.evaluate(node => node.width);
  await page.getByRole('button', { name: 'Resize chart' }).click();
  await expect.poll(() => canvas.evaluate(node => node.width)).toBeLessThan(initialWidth);
  expect(await canvas.evaluate((node, before) => node === before, original)).toBe(true);
  const process = page.getByRole('columnheader', { name: 'Process', exact: true });
  const first = page.getByRole('table').locator('tr[data-row-id]').first();
  const initialRow = await first.getAttribute('data-row-id');
  await process.getByRole('button').click();
  await expect(process).toHaveAttribute('aria-sort', 'ascending');
  await expect(first).not.toHaveAttribute('data-row-id', initialRow);
  await page.waitForFunction(time => performance.now() >= time, begin.time + 8000);
  const result = await finish(page, begin);
  expect(result.messages.length).toBeGreaterThan(0);
  await save(testInfo, 'recorded-gallery', { ...result, browserVersion: browser.version() });
  checkConsole(capture);
});

spike('Solid 20-panel replay at 1x', async ({ page, context, slowReplay, capture, browser }, testInfo) => {
  await solid(page, context, slowReplay, 1, testInfo, capture, browser);
});

spike('Solid 20-panel replay at 10x', async ({ page, context, fastReplay, capture, browser }, testInfo) => {
  await solid(page, context, fastReplay, 10, testInfo, capture, browser);
});
