import { closeSync, openSync, writeSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { boardReady, prepareBoard } from './catalog.mjs';
import { startReplay } from './server.mjs';

const dist = resolve(process.env.UI_DIST ?? 'node_modules/.cache/aictl-ui-baseline');
const output = resolve(process.env.UI_HEAP_OUTPUT ?? 'node_modules/.cache/aictl-ui-heap.json');
const minute = 60_000;
const minutes = Number(process.env.UI_HEAP_MINUTES ?? 30);
const speed = Number(process.env.UI_HEAP_SPEED ?? 1);
const snapshots = new Set((process.env.UI_HEAP_SNAPSHOTS ?? '').split(',').filter(Boolean).map(Number));
if (!Number.isInteger(minutes) || minutes < 1) throw new Error('Use a positive whole number of heap minutes.');
if (!Number.isFinite(speed) || speed <= 0 ||
    [...snapshots].some(index => !Number.isInteger(index) || index < 0 || index > minutes)) {
  throw new Error('Invalid heap replay speed or snapshot minute.');
}
const replay = await startReplay({ dist, loop: true, boardWindow: true, speed });
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let requests = 0;
  const routes = new Set();
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === replay.url && url.pathname.startsWith('/api/')) {
      requests += 1;
      routes.add(url.pathname + url.search);
    }
  });
  await page.addInitScript(() => {
    const source = window.EventSource;
    window.replayMessages = { bootstrap: 0, change: 0, epoch: null };
    window.EventSource = class extends source {
      constructor(url, options) {
        super(url, options);
        if (new URL(url, location.href).pathname !== '/api/live/stream') return;
        this.addEventListener('bootstrap', event => {
          window.replayMessages.bootstrap += 1;
          window.replayMessages.epoch = event.lastEventId.split(':')[0];
        });
        this.addEventListener('change', () => { window.replayMessages.change += 1; });
      }
    };
  });
  const cdp = await page.context().newCDPSession(page);
  const run = { chromium: browser.version(), speed, recording: 'busy/main',
    startedAt: new Date().toISOString(), startupRequests: 0, samples: [] };
  await prepareBoard(page);
  await page.goto(`${replay.url}/?screen=board&range=7d`);
  await boardReady(page);
  run.startupRequests = requests;
  let previousRequests = requests;
  const start = performance.now();
  await mkdir(dirname(output), { recursive: true });
  for (let index = 0; index <= minutes; index += 1) {
    if (index) await sleep(Math.max(0, start + index * minute - performance.now()));
    const { usedSize, totalSize } = await cdp.send('Runtime.getHeapUsage');
    await cdp.send('HeapProfiler.collectGarbage');
    const retained = await cdp.send('Runtime.getHeapUsage');
    const { nodes, jsEventListeners } = await cdp.send('Memory.getDOMCounters');
    const document = await page.evaluate(() => ({
      visibility: window.document.visibilityState,
      elements: window.document.getElementsByTagName('*').length,
      ...window.replayMessages,
    }));
    const sample = { minute: index, elapsedMs: performance.now() - start, usedSize, totalSize,
      retainedBytes: retained.usedSize, nodes, jsEventListeners, ...document, apiRequests: requests - previousRequests };
    previousRequests = requests;
    run.samples.push(sample);
    run.routes = [...routes].sort();
    if (snapshots.has(index)) {
      const path = `${output}.${index}.heapsnapshot`;
      const fd = openSync(path, 'w');
      const chunk = ({ chunk }) => writeSync(fd, chunk);
      cdp.on('HeapProfiler.addHeapSnapshotChunk', chunk);
      try { await cdp.send('HeapProfiler.takeHeapSnapshot'); }
      finally {
        cdp.off('HeapProfiler.addHeapSnapshotChunk', chunk);
        closeSync(fd);
      }
      sample.snapshot = path;
    }
    console.log(JSON.stringify(sample));
    await writeFile(output, JSON.stringify(run, null, 2) + '\n');
  }
  if (run.samples.at(-1).bootstrap < 2 || run.samples[0].change >= run.samples.at(-1).change) {
    throw new Error('The board did not receive looped stream updates.');
  }
} finally {
  await browser?.close();
  await replay.close();
}
