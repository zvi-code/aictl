import { describe, it, expect } from 'vitest';
import { mergeSseSummary, applySessionsDelta, fillToolLive, appendHistory, filterToolsByEnabled, GLOBAL_KEYS } from '../src/selectors.js';

// ─── mergeSseSummary ───────────────────────────────────────────
describe('mergeSseSummary', () => {
  it('returns data when prev is null', () => {
    const data = { total_tokens: 100 };
    expect(mergeSseSummary(null, data)).toBe(data);
  });

  it('merges top-level fields', () => {
    const prev = { total_tokens: 100, tools: [] };
    const data = { total_tokens: 200, tools: [] };
    const result = mergeSseSummary(prev, data);
    expect(result.total_tokens).toBe(200);
  });

  it('updates tool live data', () => {
    const prev = {
      total_tokens: 100,
      tools: [{ tool: 'claude-code', live: { cpu_percent: 5 }, vendor: 'anthropic' }],
    };
    const data = {
      total_tokens: 150,
      tools: [{ tool: 'claude-code', live: { cpu_percent: 15 } }],
    };
    const result = mergeSseSummary(prev, data);
    expect(result.tools[0].live.cpu_percent).toBe(15);
    expect(result.tools[0].vendor).toBe('anthropic'); // preserved
  });

  it('preserves tools not in update', () => {
    const prev = {
      total_tokens: 100,
      tools: [
        { tool: 'claude-code', live: { cpu_percent: 5 } },
        { tool: 'copilot', live: { cpu_percent: 3 } },
      ],
    };
    const data = {
      total_tokens: 150,
      tools: [{ tool: 'claude-code', live: { cpu_percent: 15 } }],
    };
    const result = mergeSseSummary(prev, data);
    expect(result.tools[1].live.cpu_percent).toBe(3); // unchanged
  });
});

describe('fillToolLive', () => {
  it('puts back the live block of a tool the server left out, and remembers new ones', () => {
    const held = {};
    fillToolLive({ tools: [{ tool: 'a', live: { cpu_percent: 3 } }, { tool: 'b', live: null }] }, held);
    const out = fillToolLive({ tools: [{ tool: 'a' }, { tool: 'b' }, { tool: 'c' }] }, held);
    expect(out.tools[0].live).toEqual({ cpu_percent: 3 });
    expect(out.tools[1].live).toBeNull();
    expect('live' in out.tools[2]).toBe(false);
    const next = fillToolLive({ tools: [{ tool: 'a', live: { cpu_percent: 8 } }] }, held);
    expect(fillToolLive({ tools: [{ tool: 'a' }] }, held).tools[0].live).toEqual({ cpu_percent: 8 });
    expect(next.tools[0].live.cpu_percent).toBe(8);
  });
});

describe('mergeSseSummary session rows and revision', () => {
  const rows = [{ session_id: 'a', cpu_percent: 1 }, { session_id: 'b', cpu_percent: 2 }];

  it('applies a sessions_delta over the held rows', () => {
    const prev = { tools: [], sessions: rows };
    const out = mergeSseSummary(prev, {
      tools: [],
      sessions_delta: { upsert: [{ session_id: 'b', cpu_percent: 9 }, { session_id: 'c', cpu_percent: 3 }], remove: ['a'] },
    });
    expect(out.sessions).toEqual([{ session_id: 'b', cpu_percent: 9 }, { session_id: 'c', cpu_percent: 3 }]);
    expect(out.sessions_delta).toBeUndefined();
  });

  it('patches only the fields that changed and ignores a patch for an unknown row', () => {
    const prev = { tools: [], sessions: [{ session_id: 'a', cpu_percent: 1, project: '/p' }] };
    const out = mergeSseSummary(prev, {
      tools: [],
      sessions_delta: { upsert: [], patch: [{ session_id: 'a', cpu_percent: 5 }, { session_id: 'zz', cpu_percent: 1 }], remove: [] },
    });
    expect(out.sessions).toEqual([{ session_id: 'a', cpu_percent: 5, project: '/p' }]);
  });

  it('keeps the held rows when the message has no session change', () => {
    expect(mergeSseSummary({ tools: [], sessions: rows }, { tools: [] }).sessions).toBe(rows);
  });

  it('replaces the rows when a message carries the whole list', () => {
    const out = mergeSseSummary({ tools: [], sessions: rows }, { tools: [], sessions: [{ session_id: 'z' }] });
    expect(out.sessions).toEqual([{ session_id: 'z' }]);
  });

  it('does not overwrite the revision of the fetched snapshot', () => {
    const out = mergeSseSummary({ tools: [], tools_rev: 'old' }, { tools: [], tools_rev: 'new' });
    expect(out.tools_rev).toBe('old');
  });

  it('applySessionsDelta leaves its input alone', () => {
    applySessionsDelta(rows, { upsert: [{ session_id: 'a', cpu_percent: 7 }], remove: [] });
    expect(rows[0].cpu_percent).toBe(1);
  });
});

// ─── appendHistory ─────────────────────────────────────────────
describe('appendHistory', () => {
  function makeHistory() {
    const h = { by_tool: {} };
    for (const k of GLOBAL_KEYS) h[k] = [];
    return h;
  }

  function makeDataPoint(ts = 1000) {
    return {
      timestamp: ts,
      total_files: 10,
      total_tokens: 5000,
      total_cpu: 25.5,
      total_mem_mb: 512.3,
      total_mcp_servers: 2,
      total_memory_tokens: 1000,
      total_live_sessions: 1,
      total_live_estimated_tokens: 3000,
      total_live_inbound_rate_bps: 100.555,
      total_live_outbound_rate_bps: 200.777,
      tools: [],
    };
  }

  it('returns null when prev is null', () => {
    expect(appendHistory(null, makeDataPoint())).toBe(null);
  });

  it('appends a data point', () => {
    const h = makeHistory();
    const result = appendHistory(h, makeDataPoint(1000));
    expect(result.ts).toEqual([1000]);
    expect(result.files).toEqual([10]);
    expect(result.tokens).toEqual([5000]);
    expect(result.cpu).toEqual([25.5]);
    expect(result.mem_mb).toEqual([512.3]);
  });

  it('rounds inbound/outbound rates to 2 decimals', () => {
    const h = makeHistory();
    const result = appendHistory(h, makeDataPoint());
    expect(result.live_in_rate[0]).toBe(100.56);
    expect(result.live_out_rate[0]).toBe(200.78);
  });

  it('trims to MAX_GLOBAL (200)', () => {
    const h = makeHistory();
    for (let i = 0; i < 205; i++) {
      appendHistory(h, makeDataPoint(i));
    }
    expect(h.ts.length).toBe(200);
    // Should have the latest 200, starting from 5
    expect(h.ts[0]).toBe(5);
  });

  it('tracks per-tool history', () => {
    const h = makeHistory();
    const dp = makeDataPoint();
    dp.tools = [{ tool: 'claude-code', live: { cpu_percent: 10, mem_mb: 256 }, tokens: 1000 }];
    appendHistory(h, dp);
    expect(h.by_tool['claude-code'].cpu).toEqual([10]);
    expect(h.by_tool['claude-code'].tokens).toEqual([1000]);
  });

  it('skips aictl tool', () => {
    const h = makeHistory();
    const dp = makeDataPoint();
    dp.tools = [{ tool: 'aictl', live: { cpu_percent: 1 }, tokens: 10 }];
    appendHistory(h, dp);
    expect(h.by_tool['aictl']).toBeUndefined();
  });
});

// ─── filterToolsByEnabled ──────────────────────────────────────
describe('filterToolsByEnabled', () => {
  const tools = [
    { tool: 'claude-code' },
    { tool: 'copilot' },
    { tool: 'cursor' },
  ];

  it('returns all when enabledTools is null', () => {
    expect(filterToolsByEnabled(tools, null)).toBe(tools);
  });

  it('filters to enabled set', () => {
    const result = filterToolsByEnabled(tools, ['claude-code', 'cursor']);
    expect(result).toHaveLength(2);
    expect(result.map(t => t.tool)).toEqual(['claude-code', 'cursor']);
  });

  it('returns empty for empty enabled set', () => {
    expect(filterToolsByEnabled(tools, [])).toHaveLength(0);
  });
});
