import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSnapshot, getHistory, getEvents, getSessions, getSessionFlow,
  getBudget, getOtelStatus, getSelfStatus, getSamplesList,
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

// ─── getSamplesList ────────────────────────────────────────────
describe('getSamplesList', () => {
  it('fetches /api/samples?list=1', async () => {
    await getSamplesList();
    expect(fetch).toHaveBeenCalledWith('/api/samples?list=1');
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
