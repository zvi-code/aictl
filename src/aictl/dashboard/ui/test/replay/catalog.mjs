import { readFile } from 'node:fs/promises';
import { installProbe } from './browser-probe.mjs';

const catalogUrl = new URL('../../../../../../docs/datapoint-catalog.csv', import.meta.url);
const catalog = readFile(catalogUrl, 'utf8').then(text =>
  text.split(/\r?\n/).slice(1).filter(Boolean).map(line => {
    const [key, , unit] = line.split(',', 3);
    return { key, unit };
  }));

export async function provideCatalog(page) {
  const rows = await catalog;
  await page.route('**/api/datapoints', route => route.fulfill({ json: rows }));
}

export async function prepareBoard(page) {
  await provideCatalog(page);
  await page.addInitScript(installProbe, { measureBoard: true });
}

export function boardReady(page, timeout = 15_000) {
  return page.waitForFunction(() => window.__replayProbe.firstBoardPaint != null, null, { timeout });
}
