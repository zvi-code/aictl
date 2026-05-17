import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/api.js', () => ({
  getApiCalls: vi.fn(),
}));

import * as api from '../src/api.js';
import ApiCallsPanel from '../src/components/session_detail/ApiCallsPanel.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function mockCalls(calls) {
  api.getApiCalls.mockResolvedValue({
    calls,
    summary: {
      total_calls: calls.filter(c => c.status === 'ok').length,
      total_errors: calls.filter(c => c.status === 'error').length,
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      by_model: {},
    },
  });
}

describe('ApiCallsPanel OTel badges', () => {
  it('renders finish_reason=length badge', async () => {
    mockCalls([{
      ts: 1_700_000_000,
      model: 'claude-sonnet-4',
      duration_ms: 500,
      input_tokens: 100,
      output_tokens: 50,
      status: 'ok',
      finish_reason: 'length',
    }]);
    const { container } = render(html`<${ApiCallsPanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(container.textContent).toContain('length');
    });
    const badges = Array.from(container.querySelectorAll('.badge'))
      .filter(b => b.textContent.trim() === 'length');
    expect(badges.length).toBe(1);
    expect(badges[0].getAttribute('style') || '').toContain('orange');
  });

  it('renders error_type text for error calls', async () => {
    mockCalls([{
      ts: 1_700_000_001,
      model: 'claude-sonnet-4',
      status: 'error',
      error: 'Too many requests',
      error_type: 'rate_limit',
      http_status: 429,
    }]);
    const { container } = render(html`<${ApiCallsPanel} sessionId="s2"/>`);
    await waitFor(() => {
      expect(container.textContent).toContain('rate_limit');
    });
    const rateBadge = Array.from(container.querySelectorAll('.badge'))
      .find(b => b.textContent.trim() === 'rate_limit');
    expect(rateBadge).toBeTruthy();
    const httpBadge = Array.from(container.querySelectorAll('.badge'))
      .find(b => b.textContent.trim() === '429');
    expect(httpBadge).toBeTruthy();
  });

  it('treats string http_status defensively (coerces to number for color gate)', async () => {
    mockCalls([{
      ts: 1_700_000_002,
      model: 'claude-sonnet-4',
      status: 'error',
      error: 'srv err',
      error_type: 'server',
      http_status: '500', // string — backend should normalize but UI must not misrender
    }]);
    const { container } = render(html`<${ApiCallsPanel} sessionId="s3"/>`);
    await waitFor(() => {
      expect(container.textContent).toContain('500');
    });
    const httpBadge = Array.from(container.querySelectorAll('.badge'))
      .find(b => b.textContent.trim() === '500');
    expect(httpBadge).toBeTruthy();
    // 500 >= 400 so red color gate should fire despite string input
    expect(httpBadge.getAttribute('style') || '').toContain('red');
  });
});
