// Numbers on the older screens must be the real totals, or say they are not known.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import * as api from '../src/api.js';
import { SnapContext } from '../src/context.js';
import CPromptsTab from '../src/components/CPromptsTab.js';
import TabEventsStats, { eventsHeading } from '../src/components/TabEventsStats.js';
import RunHistoryPanel from '../src/components/session_detail/RunHistoryPanel.js';
import ToolCallsPanel from '../src/components/session_detail/ToolCallsPanel.js';
import { liveMemMb } from '../src/selectors.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const NOW = Math.floor(Date.now() / 1000);

describe('Prompts tab', () => {
  const snap = {
    tools: [{
      tool: 'claude-code', label: 'Claude Code', processes: [], mcp_servers: [],
      files: [
        { path: '/w/p/.claude/commands/deploy.md', kind: 'commands', size: 10, tokens: 3, mtime: NOW },
        { path: '/w/p/test/fixtures/proj/.claude/commands/sample.md', kind: 'commands', size: 10, tokens: 3, mtime: NOW },
        { path: '/w/p/test/fixtures/zzz.prompt.md', kind: 'prompt', size: 10, tokens: 3, mtime: NOW },
      ],
    }],
  };
  it('lists commands files (kind "commands") and leaves out test fixtures', () => {
    const { container } = render(html`<${SnapContext.Provider} value=${{ snap }}><${CPromptsTab}/></${SnapContext.Provider}>`);
    const text = container.textContent;
    expect(text).toContain('deploy');
    expect(text).not.toContain('sample');
    expect(text).not.toContain('zzz');
  });
});

describe('Events tab', () => {
  it('shows the limit as a limit and the true count', () => {
    expect(eventsHeading(500, 14203)).toBe('Events (newest 500 of 14203)');
    expect(eventsHeading(12, 12)).toBe('Events (12)');
    expect(eventsHeading(500, null)).toBe('Events (newest 500; total not known)');
    expect(eventsHeading(3, null)).toBe('Events (3)');
  });

  it('reads memory from memory_rss_bytes, not mem_mb', () => {
    expect(liveMemMb({ memory_rss_bytes: 3 * 1048576 })).toBe(3);
    expect(liveMemMb({ mem_mb: 5 })).toBeNull();
    expect(liveMemMb(null)).toBeNull();
  });

  function renderTab(snap, history) {
    vi.spyOn(api, 'getEvents').mockResolvedValue([]);
    vi.spyOn(api, 'getEventsCount').mockResolvedValue({ count: 0 });
    vi.spyOn(api, 'getHistory').mockResolvedValue(history);
    return render(html`<${SnapContext.Provider} value=${{ snap, globalRange: { id: '1h', since: NOW - 3600, until: null } }}>
      <${TabEventsStats}/></${SnapContext.Provider}>`);
  }

  it('shows live memory and the telemetry cache date; leaves out series the store does not keep', async () => {
    const snap = {
      tools: [{
        tool: 'claude-code', label: 'Claude Code', vendor: null, files: [{ path: '/x', tokens: 1 }], processes: [],
        live: { session_count: 1, pid_count: 2, cpu_percent: 12, memory_rss_bytes: 2 * 1048576, inbound_rate_bps: 0, outbound_rate_bps: 0 },
      }],
      tool_telemetry: [{ tool: 'claude-code', source: 'stats-cache', confidence: 0.95, as_of: '2026-04-25', input_tokens: 1, output_tokens: 1 }],
    };
    const { container, findByText } = renderTab(snap, { by_tool: { 'claude-code': { ts: [1, 2], cpu: [1, 2], mem_mb: [1, 2] } } });
    await findByText('Time Series');
    const mem = [...container.querySelectorAll('.es-kv-card')].find(c => c.textContent.startsWith('Memory'));
    expect(mem.textContent).toContain('2');
    expect(mem.textContent).not.toMatch(/^Memory\s*0\s*B/);
    expect(container.querySelector('[data-testid="telemetry-as-of"]').textContent).toContain('2026-04-25');
    const labels = [...container.querySelectorAll('.chart-box')].map(c => c.getAttribute('aria-label'));
    expect(labels.some(l => l.includes('Memory (MB)') && !l.includes('no data'))).toBe(true);
    expect(labels.some(l => l.includes('Context (tok)'))).toBe(false);
  });
});

describe('Run history panel', () => {
  it('counts every run in the window, not a page of 20', async () => {
    const rows = Array.from({ length: 31 }, (_, i) => ({ session_id: 's' + i, ts: NOW - i * 60, duration_s: 10, total_tokens: 100 }));
    const spy = vi.spyOn(api, 'getSessionRuns').mockResolvedValue(rows);
    const { findByText, container } = render(html`<${RunHistoryPanel} project="/p" tool="claude-code"/>`);
    await findByText('Runs (30d)');
    expect(spy.mock.calls[0][3]).toBeGreaterThanOrEqual(1000);
    expect(container.querySelector('.es-kv-card .value').textContent).toBe('31');
  });
});

describe('Tool calls panel', () => {
  it('shows the true totals and says the timeline is the newest part', async () => {
    vi.spyOn(api, 'getSessionToolCalls').mockResolvedValue({
      total: 15090, errors: 388, by_tool: { Bash: 15000, Read: 90 },
      calls: Array.from({ length: 500 }, (_, i) => ({ ts: NOW - i, tool_name: 'Bash', is_error: false, input: '' })),
    });
    const { findByText, container } = render(html`<${ToolCallsPanel} sessionId="s1"/>`);
    await findByText('Timeline (newest 60 of 15090)');
    expect(container.textContent).toContain('15090');
    expect(container.textContent).toContain('388');
  });
});
