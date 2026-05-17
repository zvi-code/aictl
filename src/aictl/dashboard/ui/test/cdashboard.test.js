import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import CDashboardTab from '../src/components/CDashboardTab.js';

afterEach(() => cleanup());

const SNAP_WITH_SESSIONS = {
  tools: [
    {
      tool: 'claude-code', label: 'Claude Code', vendor: 'anthropic',
      processes: [{ pid: 1, cpu_pct: 10, mem_mb: 100 }],
      mcp_servers: [{ name: 'fs' }],
      files: [],
      live: {
        session_count: 2, pid_count: 1, token_estimate: 8000, files_touched: 5,
        sessions: [
          { session_id: 'cc:proj:abc', active: true, estimated_tokens: 5000, _toolLabel: 'Claude Code' },
          { session_id: 'cc:proj:xyz', active: false, estimated_tokens: 3000, _toolLabel: 'Claude Code' },
        ],
      },
    },
    {
      tool: 'copilot-cli', label: 'Copilot CLI', vendor: 'github',
      processes: [],
      mcp_servers: [],
      files: [],
      live: { session_count: 0, pid_count: 0, token_estimate: 0, files_touched: 0, sessions: [] },
    },
  ],
};

function renderDashboard(snap = SNAP_WITH_SESSIONS) {
  return render(
    html`<${SnapContext.Provider} value=${{ snap }}>
      <${CDashboardTab}/>
    </${SnapContext.Provider}>`,
  );
}

describe('CDashboardTab — stats strip', () => {
  it('renders all six stat labels', () => {
    const { getByText } = renderDashboard();
    expect(getByText('Live sessions')).toBeInTheDocument();
    expect(getByText('Processes')).toBeInTheDocument();
    expect(getByText('Est. tokens')).toBeInTheDocument();
    expect(getByText('Active tools')).toBeInTheDocument();
    expect(getByText('Files touched')).toBeInTheDocument();
    expect(getByText('MCP servers')).toBeInTheDocument();
  });

  it('shows aggregated session count from snap', () => {
    const { container } = renderDashboard();
    const vals = [...container.querySelectorAll('.cdb-stat-value')].map(el => el.textContent);
    expect(vals[0]).toBe('2');  // session_count
  });

  it('shows zero stats when no snap provided', () => {
    const { container } = render(
      html`<${SnapContext.Provider} value=${null}><${CDashboardTab}/></${SnapContext.Provider}>`,
    );
    const vals = [...container.querySelectorAll('.cdb-stat-value')].map(el => el.textContent);
    expect(vals.every(v => v === '0' || v === '0k' || v.startsWith('0'))).toBe(true);
  });
});

describe('CDashboardTab — sessions list', () => {
  it('renders active session in left pane', () => {
    const { getAllByText } = renderDashboard();
    // 'abc' short id appears in both list row and inspector
    expect(getAllByText('abc').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "No active sessions" when snap has none', () => {
    const emptySnap = {
      tools: [
        { tool: 'copilot-cli', label: 'Copilot CLI', processes: [], mcp_servers: [], files: [],
          live: { session_count: 0, pid_count: 0, token_estimate: 0, files_touched: 0, sessions: [] } },
      ],
    };
    const { getByText } = renderDashboard(emptySnap);
    expect(getByText('No active sessions')).toBeInTheDocument();
  });

  it('range buttons render and clicking sets active', () => {
    const { getByText } = renderDashboard();
    expect(getByText('Live')).toBeInTheDocument();
    expect(getByText('1h')).toBeInTheDocument();
    fireEvent.click(getByText('1h'));
    expect(getByText('1h').classList.contains('is-active')).toBe(true);
  });
});

describe('CDashboardTab — event inspector', () => {
  it('shows empty inspector when no event selected', () => {
    const { getByText } = renderDashboard();
    expect(getByText('No selection')).toBeInTheDocument();
    expect(getByText('Choose an event in the timeline to read its payload.')).toBeInTheDocument();
  });

  it('renders timeline container when a session is auto-selected', () => {
    const { container } = renderDashboard();
    expect(container.querySelector('.cdb-timeline')).toBeTruthy();
  });

  it('filter input narrows the sessions list', () => {
    const { getByLabelText, queryByText } = renderDashboard();
    const input = getByLabelText('Filter sessions');
    fireEvent.input(input, { target: { value: 'abc' } });
    expect(queryByText('xyz')).toBeNull();
  });
});
