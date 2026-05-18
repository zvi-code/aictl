import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import CAgentsTab from '../src/components/CAgentsTab.js';

afterEach(() => cleanup());
afterEach(() => vi.restoreAllMocks());

const SNAP = {
  tools: [
    {
      tool: 'claude-code', label: 'Claude Code', vendor: 'anthropic', host: 'cli,vscode',
      meta: false,
      processes: [{ pid: 123, name: 'node', cpu_pct: 12.5, mem_mb: 200 }],
      mcp_servers: [{ name: 'file-server' }],
      memory: [],
      files: [{ kind: 'config', path: '/etc/foo', tokens: 100 }],
      live: { session_count: 2, pid_count: 1, token_estimate: { input_tokens: 4000, output_tokens: 1000 }, files_touched: 8, cpu_percent: 12.5 },
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
      live: { session_count: 1, pid_count: 1, token_estimate: { input_tokens: 1500, output_tokens: 500 }, files_touched: 3 },
    },
  ],
};

const HOOKS_STATUS = {
  tools: {
    'claude-code': {
      status: 'active', configured_count: 2, fired_24h: 7, last_fire_ts: 1779050000,
      configured_events: ['UserPromptSubmit', 'PreToolUse'], warnings: [],
      sources: [{ scope: 'project', path: '/repo/.claude/settings.local.json', configured_count: 2, host_enabled: true }],
    },
    'copilot-vscode': {
      status: 'disabled', configured_count: 1, fired_24h: 0, last_fire_ts: null,
      configured_events: ['UserPromptSubmit'],
      warnings: [{ path: '/home/.copilot/hooks/aictl.json', message: "chat.hookFilesLocations['~/.copilot/hooks'] is false" }],
      sources: [{ scope: 'user', path: '/home/.copilot/hooks/aictl.json', configured_count: 1, host_enabled: false }],
    },
  },
  counts_by_tool_kind: { 'claude-code': { UserPromptSubmit: 4, PreToolUse: 3 } },
  skill_usage: { total_calls_24h: 3, by_tool: { 'claude-code': 2 }, by_skill: [{ skill: 'review-pr', count: 2 }] },
  subagents: { starts_24h: 2, by_tool: { 'claude-code': { starts: 1, stops: 1 } } },
};

function renderTab(snap = SNAP, hooksStatus = HOOKS_STATUS) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(hooksStatus) }));
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

  it('config block shows binary and enabled', () => {
    const { container } = renderTab();
    const text = container.querySelector('.cagents-config-block').textContent;
    expect(text).toContain('enabled');
    expect(text).toContain('true');
  });

  it('shows hook counts, configured events, skills, and subagents', async () => {
    const { findByText, getByText } = renderTab();
    expect(await findByText('active')).toBeInTheDocument();
    expect(getByText('7 fired / 24h')).toBeInTheDocument();
    expect(getByText('UserPromptSubmit')).toBeInTheDocument();
    expect(getByText('PreToolUse 3')).toBeInTheDocument();
    expect(getByText('review-pr 2')).toBeInTheDocument();
    expect(getByText('2 starts / 24h')).toBeInTheDocument();
  });

  it('shows exact VS Code hookFilesLocations fix when host ignores hooks', async () => {
    const snap = {
      tools: [{
        tool: 'copilot-vscode', label: 'Copilot VS Code', vendor: 'github', host: 'vscode',
        processes: [{ pid: 9, name: 'Code Helper', cpu_pct: 1 }], mcp_servers: [], memory: [], files: [],
        live: { session_count: 1, pid_count: 1, token_estimate: { input_tokens: 0, output_tokens: 0 } },
      }],
    };
    const { findByText, getByText } = renderTab(snap);
    expect(await findByText('host-disabled')).toBeInTheDocument();
    expect(getByText('"chat.hookFilesLocations": { "~/.copilot/hooks": true }')).toBeInTheDocument();
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
