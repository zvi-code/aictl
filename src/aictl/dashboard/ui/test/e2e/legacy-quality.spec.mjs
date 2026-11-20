import { startReplay } from '../replay/server.mjs';
import { captureFrame, checkAxe, checkConsole, checkRendering, dist, expect, goToBoard, test } from './fixtures.mjs';

for (const speed of [1, 10]) {
  test(`legacy Overview meets render and console budgets at ${speed}x`, async ({ page, capture }) => {
    const replay = await startReplay({ dist, speed, boardWindow: true });
    try {
      await goToBoard(page, replay);
      const start = await captureFrame(page);
      // Observe after load with no user input. Do not include axe or screenshots.
      await page.waitForFunction(t => performance.now() >= t + 8000, start);
      await checkRendering(page, start);
      checkConsole(capture);
    } finally { await replay.close(); }
  });
}

test('legacy Overview passes axe including color contrast', async ({ page, snapshotReplay, capture }) => {
  test.setTimeout(90_000);
  await goToBoard(page, snapshotReplay);
  await expect(page.locator('main')).toBeVisible();
  await checkAxe(page, '.bd-app', 'legacy Overview accessibility');
  checkConsole(capture);
});
