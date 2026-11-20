import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { boardReady, prepareBoard } from './catalog.mjs';
import { startReplay } from './server.mjs';

const dist = resolve(process.env.UI_DIST ?? 'node_modules/.cache/aictl-ui-baseline');
const output = resolve(process.env.UI_INSPECT_OUTPUT ?? 'node_modules/.cache/aictl-ui-inspect.json');
const boardUrl = '/?screen=board&range=7d';
const minute = 60_000;
const replay = await startReplay({ dist, loop: true, boardWindow: true });

async function assets(page) {
  const cdp = await page.context().newCDPSession(page);
  const scripts = new Map();
  const sheets = new Map();
  cdp.on('Debugger.scriptParsed', info => {
    if (info.url.startsWith(`${replay.url}/assets/`)) scripts.set(info.url, info.scriptId);
  });
  cdp.on('CSS.styleSheetAdded', ({ header }) => {
    if (header.sourceURL.startsWith(`${replay.url}/assets/`)) sheets.set(header.sourceURL, header.styleSheetId);
  });
  await cdp.send('Debugger.enable');
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  await prepareBoard(page);
  await page.goto(replay.url + boardUrl);
  await boardReady(page);
  const js = await Promise.all([...scripts].map(async ([url, scriptId]) => {
    const { scriptSource } = await cdp.send('Debugger.getScriptSource', { scriptId });
    return { path: new URL(url).pathname, parsedSourceBytes: Buffer.byteLength(scriptSource) };
  }));
  const css = await Promise.all([...sheets].map(async ([url, styleSheetId]) => {
    const { text } = await cdp.send('CSS.getStyleSheetText', { styleSheetId });
    return { path: new URL(url).pathname, parsedSourceBytes: Buffer.byteLength(text) };
  }));
  return { js, css };
}

async function requestRates(pages) {
  const byPage = pages.map(page => {
    const requests = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === replay.url && url.pathname.startsWith('/api/')) {
        requests.push({ time: performance.now(), path: url.pathname });
      }
    });
    return requests;
  });
  const start = performance.now();
  await Promise.all(pages.map(async page => {
    await prepareBoard(page);
    await page.goto(replay.url + boardUrl);
    await boardReady(page);
  }));
  await sleep(Math.max(0, start + 3 * minute - performance.now()));
  return byPage.map(records => {
    const byMinute = [0, 0, 0];
    for (const { time } of records) {
      const index = Math.floor((time - start) / minute);
      if (index >= 0 && index < byMinute.length) byMinute[index] += 1;
    }
    return { byMinute, routes: [...new Set(records.map(record => record.path))].sort() };
  });
}

let browser;
try {
  browser = await chromium.launch();
  const single = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const parsed = await assets(single);
  await single.close();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const tabs = await Promise.all([context.newPage(), context.newPage()]);
  const rates = await requestRates(tabs);
  const report = { chromium: browser.version(), recording: 'busy/main', speed: 1, parsed, twoTabs: rates };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await replay.close();
}
