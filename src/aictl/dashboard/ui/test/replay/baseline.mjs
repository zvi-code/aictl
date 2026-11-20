import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, release } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { gunzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { fmtBytes, fmtCpu } from '../../src/components/board/format.js';
import { installProbe, layoutShift } from './browser-probe.mjs';
import { startReplay } from './server.mjs';

const recordings = fileURLToPath(new URL('../../../../../../test/recordings/', import.meta.url));
const boardUrl = '/?screen=board&range=7d';
const dist = resolve(process.env.UI_DIST ?? 'node_modules/.cache/aictl-ui-baseline');
const output = resolve(process.env.UI_BASELINE_OUTPUT ?? 'node_modules/.cache/aictl-ui-baseline.json');
const repetitions = Number(process.env.UI_BASELINE_RUNS ?? 5);
const duration = Number(process.env.UI_BASELINE_SECONDS ?? 60) * 1000;
const modes = (process.env.UI_BASELINE_WINDOWS ?? 'quiet,busy').split(',');
const speeds = (process.env.UI_BASELINE_SPEEDS ?? '1,10').split(',').map(Number);
if (!Number.isInteger(repetitions) || repetitions < 1 || duration < 6000 || !Number.isFinite(duration)) {
  throw new Error('Use a positive run count and a window of at least six seconds.');
}

async function statFrames(directory) {
  // Map the sequence to the two values the daemon panel shows. Do not parse SSE twice in the page.
  const bytes = await readFile(resolve(directory, 'main-sse.jsonl.gz'));
  const frames = {};
  for (const line of gunzipSync(bytes).toString().trimEnd().split('\n')) {
    const record = JSON.parse(line);
    if (record.event !== 'change') continue;
    const health = record.data.upserts?.find(entity => entity.topic === 'runtime.health' && entity.id === 'local');
    const self = health?.data.pipeline?.self;
    if (!self || !Number.isFinite(self.cpu) || !Number.isFinite(self.rss)) continue;
    frames[record.data.sequence] = [fmtCpu(self.cpu), fmtBytes(self.rss)];
  }
  return frames;
}

async function traceTasks(cdp) {
  const tasks = [];
  const marks = new Map();
  const end = new Promise(ok => cdp.once('Tracing.tracingComplete', ok));
  cdp.on('Tracing.dataCollected', ({ value }) => {
    for (const entry of value) {
      if (entry.cat === 'blink.user_timing' && entry.name.startsWith('aictl-')) marks.set(entry.name, entry);
      if (entry.ph === 'X' && entry.name === 'ThreadControllerImpl::RunTask' && entry.dur > 16_000) {
        tasks.push(entry);
      }
    }
  });
  await cdp.send('Tracing.start', { categories: 'toplevel,blink.user_timing', transferMode: 'ReportEvents' });
  return async () => {
    await cdp.send('Tracing.end');
    await end;
    const start = marks.get('aictl-replay-start');
    const cutoff = marks.get('aictl-replay-end');
    if (!start || !cutoff) throw new Error('Chromium trace is missing the replay window marks');
    return tasks.filter(task => task.pid === start.pid && task.tid === start.tid &&
      task.ts >= start.ts && task.ts < cutoff.ts).map(task => (task.dur / 1000));
  };
}

function requestLog(page, origin) {
  const records = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) return;
    records.push({ path: `${url.pathname}${url.search}`, method: request.method(), time: performance.now() });
  });
  return records;
}

async function measure(browser, replay, frames) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  try {
    const page = await context.newPage();
    const requests = requestLog(page, replay.url);
    await page.addInitScript(installProbe, { measureBoard: true, statFrames: frames });
    const cdp = await context.newCDPSession(page);
    const stopTrace = await traceTasks(cdp);
    const navigation = performance.now();
    await page.goto(replay.url + boardUrl);
    await page.waitForFunction(() => window.__replayProbe.firstBoardPaint != null, null, { timeout: 75_000 });
    await page.locator('#p-daemon .bd-stats').scrollIntoViewIfNeeded();
    const startMs = await page.evaluate(() => {
      window.__replayProbe.trackStats();
      return performance.getEntriesByName('aictl-replay-start')[0].startTime;
    });
    const start = performance.now();
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    for (let index = 1; index <= 8; index += 1) {
      await sleep(Math.max(0, start + duration * index / 9 - performance.now()));
      await page.evaluate(() => window.__replayProbe.armPalette());
      await page.keyboard.press('Control+k');
      await palette.waitFor();
      await page.waitForFunction(n => window.__replayProbe.interactions.length >= n, index);
      await page.keyboard.press('Escape');
      await palette.waitFor({ state: 'hidden' });
    }
    await sleep(Math.max(0, start + duration - performance.now()));
    const result = await page.evaluate(() => {
      performance.mark('aictl-replay-end');
      return window.__replayProbe.snapshot();
    });
    const mainTasks = await stopTrace();
    const bytes = Object.fromEntries(['js', 'css'].map(ext => {
      const assets = result.assets.filter(asset => asset.path.endsWith(`.${ext}`) && asset.responseEnd <= result.firstBoardPaint);
      return [ext, Object.fromEntries(['transferSize', 'encodedBodySize', 'decodedBodySize'].map(field =>
        [field, assets.reduce((sum, asset) => sum + asset[field], 0)]))];
    }));
    const longTasks = result.entries.longtask.filter(entry => entry.startTime >= result.firstBoardPaint);
    return {
      ...result, bytes, mainTasks, longTasks, startMs,
      layout: layoutShift(result.entries['layout-shift'], result.firstBoardPaint),
      requestsFirstMinute: duration >= 60_000 ? requests.filter(record => record.time < navigation + 60_000).length : null,
      requestsDuringReplay: requests.filter(record => record.time >= start && record.time < start + duration).length,
      routes: [...new Set(requests.map(record => `${record.method} ${record.path}`))].sort(),
    };
  } finally {
    await context.close();
  }
}

const report = { platform: process.platform, os: release(), cpu: cpus()[0]?.model, node: process.version,
  date: new Date().toISOString(), duration, cases: [] };
await mkdir(dirname(output), { recursive: true });
const browser = await chromium.launch();
try {
  report.chromium = browser.version();
  for (const mode of modes) {
    if (!['quiet', 'busy'].includes(mode)) throw new Error(`Unknown window: ${mode}`);
    const directory = resolve(recordings, mode);
    const frames = await statFrames(directory);
    for (const speed of speeds) {
      const misses = new Set();
      const replay = await startReplay({ directory, dist, speed, loop: true, boardWindow: true, onApi: record => {
        if (record.missing) misses.add(`${record.method} ${record.path}`);
      }, log: message => { if (!message.startsWith('[replay] 404 unrecorded')) console.error(message); } });
      const group = { mode, speed, runs: [], misses: [] };
      report.cases.push(group);
      try {
        for (let run = 1; run <= repetitions; run += 1) {
          const result = await measure(browser, replay, frames);
          group.runs.push(result);
          group.misses = [...misses].sort();
          console.log(JSON.stringify({ mode, speed, run, firstBoardPaint: result.firstBoardPaint,
            messageSamples: result.messages.samples.length, interactions: result.interactions.length,
            mainTasks: result.mainTasks.length, longTasks: result.longTasks.length, cls: result.layout.cls }));
          await writeFile(output, JSON.stringify(report, null, 2) + '\n');
        }
      } finally {
        await replay.close();
      }
    }
  }
} finally {
  await browser.close();
}
