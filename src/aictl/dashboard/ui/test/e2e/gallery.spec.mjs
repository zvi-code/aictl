import { captureFrame, checkAxe, checkConsole, checkRendering, expect, hasGallery, startGallery, test } from './fixtures.mjs';

const galleryTest = test.extend({
  galleryReplay: [async ({}, provide) => {
    const replay = await startGallery();
    try { await provide(replay); } finally { await replay.close(); }
  }, { scope: 'worker' }],
});

galleryTest.skip(!hasGallery, 'gallery.html is not in the worktree and UI_VITE is not set.');

for (const theme of ['light', 'dark']) {
  galleryTest(`gallery primitives in ${theme}`, async ({ page, galleryReplay, capture }) => {
    galleryTest.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: theme });
    const response = await page.goto(`${galleryReplay.url}/gallery.html?theme=${theme}`);
    expect(response?.ok(), 'Vite served gallery.html').toBe(true);
    const galleries = page.locator('[data-gallery]');
    await expect(galleries.first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const start = await captureFrame(page);
    await page.waitForFunction(t => performance.now() >= t + 500, start);
    await checkRendering(page, start);
    const sections = await galleries.evaluateAll(elements => elements.map(element => ({
      name: element.dataset.gallery,
      states: [...element.querySelectorAll('[data-state]')].map(state => state.dataset.state),
    })));
    const names = sections.map(section => section.name);
    expect(names.every(Boolean), 'each primitive names its section').toBe(true);
    expect(new Set(names).size, 'one section per primitive').toBe(names.length);
    for (const { name, states } of sections) {
      await galleryTest.step(`${name}: ${theme} axe`, async () => {
        const selector = await page.evaluate(value => `[data-gallery="${CSS.escape(value)}"]`, name);
        const section = page.locator(selector);
        await expect(section).toBeVisible();
        expect(states.length, `${name} has examples`).toBeGreaterThan(0);
        await checkAxe(page, selector, `${name} (${theme}): ${states.join(', ')}`);
      });
    }

    checkConsole(capture);
    await expect.soft(page).toHaveScreenshot(`gallery-${theme}.png`, { fullPage: true });
    const previous = page.getByRole('region', { name: 'Recorded activity: unavailable content', exact: true });
    await previous.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('region', { name: 'Recorded activity: stale content', exact: true })).toBeFocused();
  });
}

galleryTest('Recorded table values keep the same text origin when their width changes', async ({ page, galleryReplay, capture }) => {
  await page.goto(`${galleryReplay.url}/spike-gallery.html`);
  await expect(page.locator('#spike')).toHaveAttribute('data-ready', 'true');
  const cpu = page.getByRole('table', { name: 'Processes' })
    .locator('tr[aria-rowindex="3"]').getByRole('cell').nth(2);
  const { before, after } = await cpu.evaluate(cell => new Promise((resolve, reject) => {
    const range = document.createRange();
    const measure = () => {
      range.selectNodeContents(cell);
      const { x, y, width } = range.getBoundingClientRect();
      return { x, y, width, text: cell.textContent };
    };
    const before = measure();
    const observer = new MutationObserver(() => {
      const after = measure();
      if (before.width === after.width || before.text === after.text) return;
      observer.disconnect();
      clearTimeout(deadline);
      resolve({ before, after });
    });
    const deadline = setTimeout(() => {
      observer.disconnect();
      reject(new Error('The recorded CPU value did not change width.'));
    }, 9000);
    observer.observe(cell, { childList: true, characterData: true, subtree: true });
  }));
  expect([after.x, after.y], `${before.text} → ${after.text}`).toEqual([before.x, before.y]);
  checkConsole(capture);
});
