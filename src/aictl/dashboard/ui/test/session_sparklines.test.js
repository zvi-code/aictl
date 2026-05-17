import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import SessionSparklines from '../src/components/SessionSparklines.js';
import * as api from '../src/api.js';

beforeEach(() => cleanup());
afterEach(() => vi.restoreAllMocks());

describe('SessionSparklines', () => {
  it('queries samples by session_id first, falls back to tool tag when empty', async () => {
    const session = {
      session_id: 's1',
      tool: 'claude-code',
      started_at: 1000,
      ended_at: 2000,
    };
    const samples = vi.spyOn(api, 'getSamples').mockImplementation(async (metric, opts) => {
      if (opts.tags?.session_id) return [];
      return [{ ts: 1500, value: 0.25 }, { ts: 1600, value: 0.3 }];
    });
    vi.spyOn(api, 'getSessionEvents').mockResolvedValue([]);

    render(html`<${SessionSparklines} session=${session}/>`);

    await waitFor(() => {
      const calls = samples.mock.calls;
      expect(calls.some(([, opts]) => opts.tags?.session_id === 's1')).toBe(true);
      expect(calls.some(([, opts]) => opts.tags?.['aictl.tool'] === 'claude-code')).toBe(true);
    });
  });

  it('buckets api_request events into per-minute tokens for the Tok/min spark', async () => {
    const session = { session_id: 's2', tool: 'claude-code', started_at: 1000, ended_at: null };
    vi.spyOn(api, 'getSamples').mockResolvedValue([]);
    const ev = vi.spyOn(api, 'getSessionEvents').mockResolvedValue([
      { ts: 1060, kind: 'otel:claude_code.api_request', detail: { input_tokens: 50, output_tokens: 10 } },
      { ts: 1090, kind: 'otel:claude_code.api_request', detail: { input_tokens: 20, output_tokens: 5 } },
      { ts: 1140, kind: 'otel:claude_code.api_request', detail: { input_tokens: 100, output_tokens: 0 } },
      { ts: 1200, kind: 'session_start', detail: {} },
    ]);

    render(html`<${SessionSparklines} session=${session}/>`);

    await waitFor(() => expect(ev).toHaveBeenCalledWith('s2', expect.objectContaining({ since: 1000 })));
  });

  it('renders nothing when session has no id', () => {
    const { container } = render(html`<${SessionSparklines} session=${{}}/>`);
    expect(container.textContent.trim()).toBe('');
  });
});
