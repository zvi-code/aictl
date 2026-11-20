import { expect, test } from '@playwright/test';
import { get } from 'node:http';
import { startReplay } from '../replay/server.mjs';
import { dist } from './fixtures.mjs';

test('serves Brotli assets, exact captured responses and explicit misses', async ({ request }) => {
  const misses = [];
  const replay = await startReplay({ dist, onApi: record => { if (record.missing) misses.push(record); } });
  try {
    const origin = replay.url;
    const html = await (await request.get(origin)).text();
    const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    expect(asset, 'production entry script').toBeTruthy();
    const response = await request.get(origin + asset, { headers: { 'Accept-Encoding': 'br' } });
    expect(response.headers()['content-encoding']).toBe('br');
    expect(Number(response.headers()['content-length'])).toBeLessThan((await response.body()).length);
    const identity = await request.get(`${origin}/api/board/nodes?scope=local&view=identity`);
    expect(identity.ok()).toBe(true);
    expect((await identity.json()).local_node).toBeTruthy();
    const recordedFailure = await request.get(`${origin}/api/board/nodes?scope=fleet&view=health`);
    expect(recordedFailure.status()).toBe(503);
    expect(recordedFailure.headers()['x-replay-miss']).toBeUndefined();
    for (const response of [
      await request.get(`${origin}/api/board/nodes?scope=node&view=identity`),
      await request.post(`${origin}/api/settings/file`, { data: {} }),
      await request.get(`${origin}/api/live/stream?project=not-captured`),
    ]) {
      expect(response.status()).toBe(404);
      expect(response.headers()['x-replay-miss']).toBe('1');
      expect((await response.json()).error).toContain('No recorded response');
    }
    expect(misses).toHaveLength(3);
  } finally { await replay.close(); }
});

test('streams named events with native IDs and resets the epoch at a loop boundary', async () => {
  const replay = await startReplay({ dist, speed: 500, loop: true });
  try {
    const events = await new Promise((ok, fail) => {
      const req = get(`${replay.url}/api/live/stream?history=1`, res => {
        res.setEncoding('utf8');
        let text = '';
        const seen = [];
        res.on('data', chunk => {
          text += chunk;
          let end;
          while ((end = text.indexOf('\n\n')) !== -1) {
            const frame = text.slice(0, end);
            text = text.slice(end + 2);
            const match = /^id: ([^\n]+)\nevent: ([^\n]+)\ndata: (.+)$/s.exec(frame);
            if (!match) continue;
            if (seen.length === 0 || seen.length === 1 || match[2] === 'bootstrap') seen.push(match.slice(1));
            if (seen.length !== 3) continue;
            ok(seen);
            req.destroy();
            break;
          }
        });
      });
      req.setTimeout(5000, () => { req.destroy(); fail(new Error('The replay did not loop.')); });
      req.on('error', fail);
    });
    expect(events.map(event => event[1])).toEqual(['bootstrap', 'change', 'bootstrap']);
    const [first, change, next] = events.map(([id, , data]) => ({ id, data: JSON.parse(data) }));
    expect(first.data.epoch).toBe(change.data.epoch);
    expect(next.data.sequence).toBe(first.data.sequence);
    expect(next.data.epoch).toBe(`${first.data.epoch}-replay-1`);
    for (const event of [first, change, next]) expect(event.id).toBe(event.data.cursor);
  } finally { await replay.close(); }
});
