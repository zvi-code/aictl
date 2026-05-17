import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import McpUsagePanel from '../src/components/session_detail/McpUsagePanel.js';
import * as api from '../src/api.js';

beforeEach(() => cleanup());
afterEach(() => vi.restoreAllMocks());

describe('McpUsagePanel', () => {
  it('renders empty-state when nothing is configured and nothing was called', async () => {
    vi.spyOn(api, 'getSessionMcpUsage').mockResolvedValue({
      session_id: 's1', servers: [], total_calls: 0, configured_servers: [],
    });
    render(html`<${McpUsagePanel} sessionId="s1"/>`);
    await waitFor(() => {
      expect(screen.getByText(/No MCP servers called in this session/)).toBeTruthy();
    });
  });

  it('renders a dimmed "configured but unused" block when configured servers were never called', async () => {
    vi.spyOn(api, 'getSessionMcpUsage').mockResolvedValue({
      session_id: 's2', servers: [], total_calls: 0,
      configured_servers: ['github', 'filesystem'],
    });
    const { container } = render(html`<${McpUsagePanel} sessionId="s2"/>`);
    await waitFor(() => {
      expect(container.querySelector('.mcp-usage-unused')).toBeTruthy();
    });
    const unused = container.querySelector('.mcp-usage-unused');
    expect(unused.textContent).toMatch(/github/);
    expect(unused.textContent).toMatch(/filesystem/);
    expect(unused.textContent).toMatch(/2/);
  });

  it('renders active servers with call counts and hides unused ones that were called', async () => {
    vi.spyOn(api, 'getSessionMcpUsage').mockResolvedValue({
      session_id: 's3',
      servers: [
        { server_name: 'github', call_count: 4, first_ts: 0, last_ts: 10,
          total_duration_ms: 40, err_count: 0 },
        { server_name: 'memory', call_count: 1, first_ts: 5, last_ts: 5,
          total_duration_ms: 2, err_count: 0 },
      ],
      total_calls: 5,
      configured_servers: ['github', 'memory', 'filesystem'],
    });
    const { container } = render(html`<${McpUsagePanel} sessionId="s3"/>`);
    await waitFor(() => {
      expect(container.querySelectorAll('.mcp-usage-row').length).toBe(2);
    });
    const rows = [...container.querySelectorAll('.mcp-usage-row')].map(r => r.textContent);
    expect(rows[0]).toMatch(/github/);
    expect(rows[0]).toMatch(/4/);
    // The only unused one is filesystem.
    const unused = container.querySelector('.mcp-usage-unused');
    expect(unused).toBeTruthy();
    expect(unused.textContent).toMatch(/filesystem/);
    expect(unused.textContent).not.toMatch(/github/);
  });

  it('shows an error badge when err_count > 0', async () => {
    vi.spyOn(api, 'getSessionMcpUsage').mockResolvedValue({
      session_id: 's4',
      servers: [
        { server_name: 'flaky', call_count: 3, first_ts: 0, last_ts: 1,
          total_duration_ms: 5, err_count: 2 },
      ],
      total_calls: 3,
      configured_servers: ['flaky'],
    });
    const { container } = render(html`<${McpUsagePanel} sessionId="s4"/>`);
    await waitFor(() => {
      expect(container.querySelector('.mcp-usage-row')).toBeTruthy();
    });
    const row = container.querySelector('.mcp-usage-row');
    expect(row.textContent).toMatch(/!2/);
  });
});
