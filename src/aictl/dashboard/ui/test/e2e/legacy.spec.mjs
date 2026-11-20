import { expect, goToBoard, test } from './fixtures.mjs';

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
  await page.route('**/assets/Shell-*.js', async route => {
    streamsBeforeScreen = await page.evaluate(() => window.__liveStartup.streams);
    await route.continue();
  });
  await goToBoard(page, snapshotReplay);
  expect(streamsBeforeScreen).toEqual(['/api/live/stream']);
  expect(await page.evaluate(() => window.__liveStartup)).toEqual({
    streams: ['/api/live/stream'], intervals: [],
  });
});
