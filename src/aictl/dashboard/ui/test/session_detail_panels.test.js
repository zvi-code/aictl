import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';

vi.mock('../src/api.js', () => ({
  getSessionCostByModel: vi.fn(),
  getSessionProcesses: vi.fn(),
  getSessionToolCalls: vi.fn(),
}));

import * as api from '../src/api.js';
import CostByModelPanel from '../src/components/session_detail/CostByModelPanel.js';
import ProcessTreePanel from '../src/components/session_detail/ProcessTreePanel.js';
import ToolCallsPanel from '../src/components/session_detail/ToolCallsPanel.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CostByModelPanel', () => {
  it('renders per-model rows with cost and tokens', async () => {
    api.getSessionCostByModel.mockResolvedValue({
      session_id: 's1',
      models: [
        { model: 'claude-sonnet-4', requests: 2, input_tokens: 1000, output_tokens: 500, cache_read_tokens: 3000, cache_creation_tokens: 0, cost_usd: 0.0123 },
        { model: 'claude-haiku', requests: 1, input_tokens: 200, output_tokens: 100, cache_read_tokens: 0, cache_creation_tokens: 0, cost_usd: 0.0004 },
      ],
      totals: { requests: 3, input_tokens: 1200, output_tokens: 600, cache_read_tokens: 3000, cache_creation_tokens: 0, cost_usd: 0.0127 },
    });
    const { container } = render(html`<${CostByModelPanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(container.textContent).toContain('claude-sonnet-4');
    });
    expect(container.textContent).toContain('claude-haiku');
    expect(container.textContent).toContain('$0.0127');
    expect(container.textContent).toContain('cache-read');
  });

  it('shows empty state when no models', async () => {
    api.getSessionCostByModel.mockResolvedValue({ session_id: 's1', models: [], totals: {} });
    const { container } = render(html`<${CostByModelPanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(container.querySelector('.empty-state')).toBeTruthy();
    });
  });
});

describe('ProcessTreePanel', () => {
  it('renders process rows grouped by role', async () => {
    api.getSessionProcesses.mockResolvedValue({
      session_id: 's1',
      total: 2,
      by_role: { lead: 1, subagent: 1 },
      processes: [
        { pid: 4242, tool: 'claude', role: 'lead', joined_at: 1_700_000_000 },
        { pid: 4243, tool: 'claude', role: 'subagent', joined_at: 1_700_000_010 },
      ],
    });
    const { container } = render(html`<${ProcessTreePanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(container.textContent).toContain('4242');
    });
    expect(container.textContent).toContain('4243');
    expect(container.textContent).toContain('lead');
    expect(container.textContent).toContain('subagent');
  });

  it('shows empty state when no processes', async () => {
    api.getSessionProcesses.mockResolvedValue({ session_id: 's1', total: 0, by_role: {}, processes: [] });
    const { container } = render(html`<${ProcessTreePanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(container.querySelector('.empty-state')).toBeTruthy();
    });
  });
});

describe('ToolCallsPanel', () => {
  it('renders tool-call timeline and by-tool breakdown', async () => {
    api.getSessionToolCalls.mockResolvedValue({
      session_id: 's1',
      total: 2,
      errors: 1,
      by_tool: { Read: 1, Bash: 1 },
      calls: [
        { ts: 1_700_000_000, tool_name: 'Read', duration_ms: 12, is_error: false, result_summary: 'ok' },
        { ts: 1_700_000_005, tool_name: 'Bash', duration_ms: 200, is_error: true, result_summary: 'boom' },
      ],
    });
    const { container } = render(html`<${ToolCallsPanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(container.textContent).toContain('Read');
    });
    expect(container.textContent).toContain('Bash');
    expect(container.textContent).toContain('boom');
  });

  it('shows empty state when no calls', async () => {
    api.getSessionToolCalls.mockResolvedValue({ session_id: 's1', total: 0, errors: 0, by_tool: {}, calls: [] });
    const { container } = render(html`<${ToolCallsPanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(container.querySelector('.empty-state')).toBeTruthy();
    });
  });

  it('renders the invocation input and toggles expansion on click', async () => {
    api.getSessionToolCalls.mockResolvedValue({
      session_id: 's1',
      total: 1,
      errors: 0,
      by_tool: { Bash: 1 },
      calls: [
        {
          ts: 1_700_000_000, tool_name: 'Bash', duration_ms: 12, is_error: false,
          result_summary: 'ok', input: '{"command":"git status"}', input_truncated: false,
        },
      ],
    });
    const { container, findByLabelText } = render(html`<${ToolCallsPanel} sessionId="s1"/>`);
    // The input line (the actual command) renders under the tool name.
    await waitFor(() => expect(container.textContent).toContain('git status'));

    const btn = await findByLabelText('Expand input for Bash');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    await waitFor(() =>
      expect(container.querySelector('.tcp-input').getAttribute('aria-expanded')).toBe('true'));
  });
});
