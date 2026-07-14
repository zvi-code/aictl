import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchJson,
  getSnapshot, getHistory, getEvents, getSessions, getSessionFlow,
  getSessionEvents, getFileAt, getSamples,
  getBudget, getOtelStatus, getSelfStatus, getSamplesList,
  getDataQuality, getSessionMessages,
  getToolConfig, updateToolConfig, killSession,
  getDatapoints, resetDatapointCache, setBaseUrl, getBaseUrl, streamUrl,
} from '../src/api.js';

// ─── Mock fetch globally ───────────────────────────────────────
beforeEach(() => {
  setBaseUrl('');
  resetDatapointCache();
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ mocked: true }),
    text: () => Promise.resolve('mocked'),
    status: 200,
  });
});

// ─── Base URL ──────────────────────────────────────────────────
describe('setBaseUrl / getBaseUrl', () => {
  it('defaults to empty', () => {
    expect(getBaseUrl()).toBe('');
  });

  it('sets and gets base URL', () => {
    setBaseUrl('http://localhost:9090');
    expect(getBaseUrl()).toBe('http://localhost:9090');
  });

  it('prepends base URL to fetch calls', async () => {
    setBaseUrl('http://test:8080');
    await getSnapshot();
    expect(fetch).toHaveBeenCalledWith('http://test:8080/api/snapshot');
  });
});

// ─── streamUrl ─────────────────────────────────────────────────
describe('streamUrl', () => {
  it('returns relative path by default', () => {
    expect(streamUrl()).toBe('/api/stream');
  });

  it('prepends base URL', () => {
    setBaseUrl('http://x:9000');
    expect(streamUrl()).toBe('http://x:9000/api/stream');
  });
});

// ─── getSnapshot ───────────────────────────────────────────────
describe('getSnapshot', () => {
  it('fetches /api/snapshot', async () => {
    const result = await getSnapshot();
    expect(fetch).toHaveBeenCalledWith('/api/snapshot');
    expect(result).toEqual({ mocked: true });
  });
});

// ─── getHistory ────────────────────────────────────────────────
describe('getHistory', () => {
  it('fetches /api/history with no opts', async () => {
    await getHistory();
    expect(fetch).toHaveBeenCalledWith('/api/history');
  });

  it('adds range param', async () => {
    await getHistory({ range: '24h' });
    expect(fetch).toHaveBeenCalledWith('/api/history?range=24h');
  });

  it('adds since and until params', async () => {
    await getHistory({ since: 1000, until: 2000 });
    expect(fetch).toHaveBeenCalledWith('/api/history?since=1000&until=2000');
  });
});

// ─── getEvents ─────────────────────────────────────────────────
describe('getEvents', () => {
  it('fetches /api/events with no opts', async () => {
    await getEvents();
    expect(fetch).toHaveBeenCalledWith('/api/events');
  });

  it('adds since param', async () => {
    await getEvents({ since: 1000 });
    expect(fetch).toHaveBeenCalledWith('/api/events?since=1000');
  });

  it('adds sessionId param', async () => {
    await getEvents({ sessionId: 'abc-123' });
    expect(fetch).toHaveBeenCalledWith('/api/events?session_id=abc-123');
  });

  it('adds limit param', async () => {
    await getEvents({ limit: 50 });
    expect(fetch).toHaveBeenCalledWith('/api/events?limit=50');
  });
});

// ─── getSessions ───────────────────────────────────────────────
describe('getSessions', () => {
  it('adds tool and active params', async () => {
    await getSessions({ tool: 'claude-code', active: false });
    expect(fetch).toHaveBeenCalledWith('/api/sessions?tool=claude-code&active=false');
  });
});

// ─── getSessionFlow ────────────────────────────────────────────
describe('getSessionFlow', () => {
  it('builds correct URL', async () => {
    await getSessionFlow('sess-1', 1000, 2000);
    expect(fetch).toHaveBeenCalledWith('/api/session-flow?session_id=sess-1&since=1000&until=2000');
  });
});

describe('getSessionEvents', () => {
  it('builds URL with required session id and optional range filters', async () => {
    await getSessionEvents('sess-2', { since: 111, until: 222, limit: 50 });
    expect(fetch).toHaveBeenCalledWith('/api/events?session_id=sess-2&since=111&until=222&limit=50');
  });
});

describe('getFileAt', () => {
  it('builds /api/files/history URL with path and ts', async () => {
    await getFileAt('/tmp/a b.txt', 1700000000);
    expect(fetch).toHaveBeenCalledWith('/api/files/history?path=%2Ftmp%2Fa%20b.txt&ts=1700000000');
  });
});

describe('getSamples', () => {
  it('builds /api/samples URL with tag filters and since', async () => {
    await getSamples('process.cpu.utilization', {
      since: 1000,
      limit: 200,
      tags: { session_id: 's-1', 'aictl.tool': 'claude-code' },
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/samples?metric=process.cpu.utilization&since=1000&limit=200'
      + '&tag.session_id=s-1&tag.aictl.tool=claude-code',
    );
  });

  it('omits null tag values and the tags block when absent', async () => {
    await getSamples('m');
    expect(fetch).toHaveBeenCalledWith('/api/samples?metric=m');
  });
});

// ─── getBudget ─────────────────────────────────────────────────
describe('getBudget', () => {
  it('fetches /api/budget', async () => {
    await getBudget();
    expect(fetch).toHaveBeenCalledWith('/api/budget');
  });
});

// ─── getOtelStatus / getSelfStatus ─────────────────────────────
describe('health endpoints', () => {
  it('fetches otel-status', async () => {
    await getOtelStatus();
    expect(fetch).toHaveBeenCalledWith('/api/otel-status');
  });

  it('fetches self-status', async () => {
    await getSelfStatus();
    expect(fetch).toHaveBeenCalledWith('/api/self-status');
  });
});

// ─── getDataQuality ────────────────────────────────────────────
describe('getDataQuality', () => {
  it('fetches /api/data-quality without params by default', async () => {
    await getDataQuality();
    expect(fetch).toHaveBeenCalledWith('/api/data-quality');
  });

  it('builds URL with status, kind, component and limit filters', async () => {
    await getDataQuality({ status: 'degraded', kind: 'sink', component: 'a b', limit: 20 });
    expect(fetch).toHaveBeenCalledWith(
      '/api/data-quality?status=degraded&kind=sink&component=a%20b&limit=20',
    );
  });
});

// ─── getSessionMessages ────────────────────────────────────────
describe('getSessionMessages', () => {
  it('builds /api/session-messages URL with encoded session id and default limit', async () => {
    await getSessionMessages('tool:12:34');
    expect(fetch).toHaveBeenCalledWith('/api/session-messages?session_id=tool%3A12%3A34&limit=200');
  });

  it('honors a custom limit', async () => {
    await getSessionMessages('s1', 50);
    expect(fetch).toHaveBeenCalledWith('/api/session-messages?session_id=s1&limit=50');
  });
});

// ─── getSamplesList ────────────────────────────────────────────
describe('getSamplesList', () => {
  it('fetches /api/samples?list=1', async () => {
    await getSamplesList();
    expect(fetch).toHaveBeenCalledWith('/api/samples?list=1');
  });
});

// ─── fetchJson error handling ──────────────────────────────────
describe('fetchJson', () => {
  function mockErrorResponse(status, body) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: () => Promise.resolve(body),
      json: () => Promise.resolve(JSON.parse(body || '{}')),
    });
  }

  it('returns parsed JSON on 2xx', async () => {
    const result = await fetchJson('/api/anything');
    expect(result).toEqual({ mocked: true });
  });

  it('throws on !ok with status and path in the message', async () => {
    mockErrorResponse(500, 'boom');
    const err = await fetchJson('/api/snapshot').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(500);
    expect(err.message).toContain('500');
    expect(err.message).toContain('/api/snapshot');
    expect(err.message).toContain('boom');
  });

  it('extracts the JSON error field from error bodies', async () => {
    mockErrorResponse(400, JSON.stringify({ error: 'bad session id' }));
    const err = await fetchJson('/api/session-kill').catch(e => e);
    expect(err.message).toContain('bad session id');
    expect(err.status).toBe(400);
  });

  it('still throws when the body is unreadable', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.reject(new Error('stream error')),
    });
    const err = await fetchJson('/api/x').catch(e => e);
    expect(err.status).toBe(502);
    expect(err.message).toContain('HTTP 502 /api/x');
  });

  it('truncates very long error bodies', async () => {
    mockErrorResponse(500, 'x'.repeat(5000));
    const err = await fetchJson('/api/x').catch(e => e);
    expect(err.message.length).toBeLessThan(300);
  });

  it('getters reject on !ok instead of returning the error body', async () => {
    mockErrorResponse(500, JSON.stringify({ error: 'db locked' }));
    await expect(getSnapshot()).rejects.toThrow(/500/);
    await expect(getEvents()).rejects.toThrow(/db locked/);
    await expect(getBudget()).rejects.toThrow(/500/);
  });

  it('getToolConfig / updateToolConfig / killSession use the same error path', async () => {
    mockErrorResponse(409, JSON.stringify({ error: 'config changed on disk' }));
    await expect(getToolConfig('claude-code')).rejects.toThrow(/config changed on disk/);
    await expect(updateToolConfig('claude-code', {})).rejects.toThrow(/409/);
    await expect(killSession('s1')).rejects.toThrow(/config changed on disk/);
  });

  it('forwards request opts (method, body) to fetch', async () => {
    await killSession('sess-9', 'KILL');
    expect(fetch).toHaveBeenCalledWith('/api/session-kill', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ session_id: 'sess-9', confirm: true, signal: 'KILL' }),
    }));
  });
});

// ─── getDatapoints (cached) ────────────────────────────────────
describe('getDatapoints', () => {
  it('caches the promise', async () => {
    await getDatapoints();
    await getDatapoints();
    // Should only fetch once
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('resets cache', async () => {
    await getDatapoints();
    resetDatapointCache();
    await getDatapoints();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
