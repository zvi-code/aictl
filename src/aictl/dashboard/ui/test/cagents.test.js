import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import CAgentsTab from '../src/components/CAgentsTab.js';

afterEach(() => cleanup());

const SNAP = {
  tools: [
    {
      tool: 'claude-code', label: 'Claude Code', vendor: 'anthropic', host: 'cli,vscode',
      meta: false,
      processes: [{ pid: 123, name: 'node', cpu_pct: 12.5, mem_mb: 200 }],
      mcp_servers: [{ name: 'file-server' }],
      memory: [],
      files: [{ kind: 'config', path: '/etc/foo', tokens: 100 }],
      live: { session_count: 2, pid_count: 1, token_estimate: 5000, files_touched: 8, cpu_percent: 12.5 },
    },
    {
      tool: 'copilot-cli', label: 'GitHub Copilot CLI', vendor: 'github', host: 'cli',
      meta: false,
      processes: [],
      mcp_servers: [],
      memory: [],
      files: [],
      live: { session_count: 0, pid_count: 0, token_estimate: 0, files_touched: 0 },
    },
    {
      tool: 'cursor', label: 'Cursor', vendor: 'anysphere', host: 'ide',
      meta: false,
      processes: [{ pid: 200, name: 'cursor', cpu_pct: 5, mem_mb: 512 }],
      mcp_servers: [],
      memory: [],
      files: [],
      live: { session_count: 1, pid_count: 1, token_estimate: 2000, files_touched: 3 },
    },
  ],
};

function renderTab(snap = SNAP) {
  return render(
    html`<${SnapContext.Provider} value=${{ snap }}>
      <${CAgentsTab}/>
    </${SnapContext.Provider}>`,
  );
}

describe('CAgentsTab — agent list', () => {
  it('renders active agents in "Instrumented" group', () => {
    const { getAllByText, getByText } = renderTab();
    expect(getByText('Instrumented')).toBeInTheDocument();
    // Claude Code appears in both list row and detail panel
    expect(getAllByText('Claude Code').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Cursor').length).toBeGreaterThanOrEqual(1);
  });

  it('renders inactive agent in "Detected, not active" group', () => {
    const { getByText } = renderTab();
    expect(getByText('Detected, not active')).toBeInTheDocument();
    expect(getByText('GitHub Copilot CLI')).toBeInTheDocument();
  });

  it('shows toolbar count of active vs total', () => {
    const { container } = renderTab();
    const count = container.querySelector('.cagents-toolbar-count');
    expect(count.textContent).toMatch(/2 of 3 agents active/);
  });
});

describe('CAgentsTab — detail panel', () => {
  it('auto-selects the first active agent', () => {
    const { container } = renderTab();
    // Detail panel should show claude-code's profile
    expect(container.querySelector('.cagents-detail-title').textContent).toBe('Claude Code');
  });

  it('clicking a different agent shows its detail', () => {
    const { getByText, container } = renderTab();
    fireEvent.click(getByText('Cursor'));
    expect(container.querySelector('.cagents-detail-title').textContent).toBe('Cursor');
  });

  it('shows Stats, Permissions, Configuration sections', () => {
    const { getByText } = renderTab();
    expect(getByText('Stats')).toBeInTheDocument();
    expect(getByText('Permissions')).toBeInTheDocument();
    expect(getByText('Configuration')).toBeInTheDocument();
  });

  it('shows session count and token estimate in stats', () => {
    const { container } = renderTab();
    const values = [...container.querySelectorAll('.cagents-stat-value')].map(el => el.textContent);
    expect(values).toContain('2');  // session_count
    expect(values.some(v => v.match(/5k|5\.0k/i))).toBe(true);  // token_estimate
  });

  it('config block shows tool id', () => {
    const { container } = renderTab();
    expect(container.querySelector('.cagents-config-block').textContent).toContain('claude-code');
  });
});

describe('CAgentsTab — empty state', () => {
  it('shows empty message when no snap', () => {
    const { container } = render(
      html`<${SnapContext.Provider} value=${null}><${CAgentsTab}/></${SnapContext.Provider}>`,
    );
    expect(container.querySelector('.cagents-empty')).toBeInTheDocument();
  });
});
