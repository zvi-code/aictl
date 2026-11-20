import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.mjs',
  timeout: 45_000,
  expect: { timeout: 10_000, toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.001 } },
  workers: 1,
  outputDir: './node_modules/.cache/aictl-ui-test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}-{platform}{ext}',
  ...process.platform !== 'win32' && { updateSnapshots: 'missing' },
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'legacy', testMatch: ['**/legacy.spec.mjs', '**/replay.spec.mjs'] },
    { name: 'drawer', testMatch: '**/drawer.spec.mjs' },
    { name: 'settings', testMatch: '**/settings.spec.mjs' },
    { name: 'board', testMatch: ['**/shell.spec.mjs', '**/board-a.spec.mjs', '**/board-b.spec.mjs', '**/health.spec.mjs'] },
    { name: 'dock-layout', testDir: './test/replay', testMatch: '**/dock-layout.spec.mjs' },
    { name: 'gallery', testMatch: '**/gallery.spec.mjs' },
    ...process.env.UI_LEGACY_QUALITY === '1' ? [{ name: 'legacy-quality', testMatch: '**/legacy-quality.spec.mjs' }] : [],
    ...process.env.UI_SPIKES === '1' ? [{ name: 'spikes', testMatch: '**/spikes.spec.mjs' }] : [],
  ],
});
