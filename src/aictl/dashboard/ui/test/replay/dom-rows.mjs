import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { boardReady, prepareBoard } from './catalog.mjs';
import { startReplay } from './server.mjs';

const dist = resolve(process.env.UI_DIST ?? 'node_modules/.cache/aictl-ui-baseline');
const output = resolve(process.env.UI_DOM_OUTPUT ?? 'node_modules/.cache/aictl-ui-dom-rows.json');
const browser = await chromium.launch();
const samples = [];
try {
  for (const limit of [24, 40, 63]) {
    const replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true, log: () => {},
      mapBootstrap(bootstrap) {
        const ids = new Set();
        const entities = bootstrap.entities.filter(entity => {
          // Keep the recorded history rows; remove the live overlay in every arm.
          if (entity.topic === 'runtime.agent') return false;
          if (entity.topic !== 'history.board' || entity.data.field !== 'agents' || entity.data.key == null) return true;
          const id = entity.data.value.id;
          if (ids.has(id) || ids.size >= limit) return false;
          ids.add(id);
          return true;
        });
        return { ...bootstrap, entities };
      },
    });
    try {
      for (let run = 1; run <= 5; run += 1) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
        try {
          await prepareBoard(page);
          await page.goto(`${replay.url}/?screen=board&range=7d`);
          await boardReady(page);
          const panel = page.locator('#p-agentsT');
          await panel.scrollIntoViewIfNeeded();
          const table = panel.getByRole('table');
          await table.locator('tbody tr[data-row-id]').first().waitFor();
          const sample = await table.evaluate(async table => {
            await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return {
              rows: Number(table.getAttribute('aria-rowcount')) - 1,
              renderedRows: table.querySelectorAll('tbody tr[data-row-id]').length,
              tableElements: table.querySelectorAll('*').length,
              pageElements: document.querySelectorAll('*').length,
            };
          });
          if (sample.rows !== limit) throw new Error(`Expected ${limit} recorded rows, observed ${sample.rows}.`);
          samples.push({ run, ...sample });
        } finally { await page.context().close(); }
      }
    } finally { await replay.close(); }
  }
  const report = { chromium: browser.version(), recording: 'busy/main bootstrap', samples };
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
