// First-screen logic: what is broken (with the exact fix), what is running,
// what it cost, and the panel state vocabulary.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import { runningSummary, deriveIssues, runningSessions, sessionMemMb, summarizeCosts } from '../src/utils/health.js';
import PanelState, { panelStatus, errorText } from '../src/components/ui/PanelState.js';
import { gateContext, STATIC_REFRESH_MS } from '../src/utils/gateContext.js';
import { toolFilterLabel } from '../src/components/ToolFilterBar.js';
import { filterSnap } from '../src/app.js';

afterEach(() => cleanup());

describe('deriveIssues', () => {
  const base = { connected: true, snapAgeS: 1, otelActive: true };

  it('is empty when everything is healthy', () => {
    expect(deriveIssues({ ...base, hooks: { tools: {}, total_configured: 0 }, quality: { items: [] } })).toEqual([]);
  });
  it('gives the exact command for missing Claude Code hooks, on the serving port', () => {
    const [i] = deriveIssues({ ...base, hooks: { server_port: 8484, tools: {
      'claude-code': { tool: 'claude-code', status: 'missing' },
    } } });
    expect(i.level).toBe('warn');
    expect(i.fix).toBe('aictl hooks install --port 8484');
  });
  it('does not warn about missing hooks for a tool that is not running', () => {
    const hooks = { server_port: 8484, tools: {
      'gemini-cli': { tool: 'gemini-cli', status: 'missing' },
      'copilot-vscode': { tool: 'copilot-vscode', status: 'missing' },
    } };
    const issues = deriveIssues({ ...base, hooks, runningTools: new Set(['copilot-desktop']) });
    expect(issues.map(i => i.id)).toEqual(['hooks:copilot-vscode']);
  });
  it('does not treat a store the machine does not have as a problem', () => {
    const quality = { items: [{ component: 'ingester:cursor', status: 'source_missing', severity: 'warning', message: 'x' }] };
    expect(deriveIssues({ ...base, quality })).toEqual([]);
  });
  it('quotes the host setting when VS Code disabled the hook file', () => {
    const [i] = deriveIssues({ ...base, hooks: { server_port: 8484, tools: {
      'copilot-vscode': { tool: 'copilot-vscode', status: 'disabled', sources: [
        { host_enabled: false, host_reason: "chat.hookFilesLocations['~/.copilot/hooks'] is false" },
      ] },
    } } });
    expect(i.fix).toBe("Set chat.hookFilesLocations['~/.copilot/hooks'] to true in VS Code settings");
  });
  it('flags a port mismatch as an error and counts the remaining warnings', () => {
    const [i] = deriveIssues({ ...base, hooks: { server_port: 8599, tools: {
      'gemini-cli': { tool: 'gemini-cli', status: 'misconfigured', warnings: [
        { message: 'posts to 8484', path: '/g/settings.json' }, { message: 'x', path: '/g/settings.json' },
      ] },
    } } });
    expect(i.level).toBe('error');
    expect(i.detail).toContain('+1 more');
    expect(i.fix).toBe('aictl enable --tool gemini --port 8599');
  });
  it('warns when configured hooks never fired', () => {
    const [i] = deriveIssues({ ...base, hooks: { tools: {}, total_configured: 18, total_fired_24h: 0 } });
    expect(i.title).toContain('0 fired');
  });
  it('sorts errors first and surfaces a dead stream above everything', () => {
    const out = deriveIssues({
      connected: false, otelActive: false, alerts: [{ level: 'orange', msg: 'orphan' }],
      quality: { items: [{ component: 'c', status: 'schema_unknown', severity: 'warning', message: 'm' },
        { component: 'ok', status: 'ok', severity: 'info', message: 'fine' }] },
    });
    expect(out.map(i => i.level)).toEqual(['error', 'warn', 'warn', 'info']);
    expect(out[0].id).toBe('sse');
    expect(out.some(i => i.id === 'quality:ok')).toBe(false);
    expect(out.at(-1).fix).toBe('aictl otel enable');
  });
  it('tolerates missing payloads while fetches are pending', () => {
    expect(deriveIssues({ connected: true, snapAgeS: null, hooks: null, quality: null, otelActive: null })).toEqual([]);
  });
  it('reports a stale snapshot only on a live connection', () => {
    expect(deriveIssues({ connected: true, snapAgeS: 120 })[0].id).toBe('stale');
    expect(deriveIssues({ connected: false, snapAgeS: 120 })[0].id).toBe('sse');
  });
});

describe('runningSessions', () => {
  const snap = { sessions: [
    { session_id: 'a', tool: 'claude-code', cpu_percent: 1 },
    { session_id: 'b', tool: 'codex-cli', cpu_percent: 9 },
  ] };
  it('orders by CPU and honours the tool filter', () => {
    expect(runningSessions(snap, null).map(s => s.session_id)).toEqual(['b', 'a']);
    expect(runningSessions(snap, ['claude-code']).map(s => s.session_id)).toEqual(['a']);
    expect(runningSessions(snap, [])).toEqual([]);
  });
  it('tolerates a snapshot with no sessions field', () => {
    expect(runningSessions({}, null)).toEqual([]);
  });
  it('sums memory across the whole process tree', () => {
    expect(sessionMemMb({ process_tree: [{ mem_mb: 2, children: [{ mem_mb: 3, children: [] }] }] })).toBe(5);
  });
  it('uses the total a live update carries when the tree is not sent', () => {
    expect(sessionMemMb({ mem_mb: 7.5 })).toBe(7.5);
    expect(sessionMemMb({ process_tree: [], mem_mb: 7.5 })).toBe(7.5);
    expect(sessionMemMb({})).toBe(0);
  });
});

describe('summarizeCosts', () => {
  it('totals rows and keeps the top priced projects', () => {
    const s = summarizeCosts([
      { project: 'a', cost_usd: 1, total_tokens: 10, sessions: 1 },
      { project: 'b', cost_usd: 5, total_tokens: 20, sessions: 2 },
      { project: 'c', cost_usd: 0, total_tokens: 0, sessions: 3 },
    ]);
    expect(s).toMatchObject({ cost: 6, tokens: 30, sessions: 6 });
    expect(s.top.map(r => r.project)).toEqual(['b', 'a']);
  });
  it('tolerates a non-array payload', () => {
    expect(summarizeCosts(null).cost).toBe(0);
  });
});

describe('panelStatus', () => {
  const now = 1_000_000;
  it('distinguishes every state', () => {
    expect(panelStatus({ loading: true, data: null })).toBe('loading');
    expect(panelStatus({ error: new Error('x'), data: null })).toBe('error');
    expect(panelStatus({ data: null })).toBe('empty');
    expect(panelStatus({ data: [], isEmpty: d => !d.length })).toBe('empty');
    expect(panelStatus({ data: [1], updatedAt: now, now })).toBe('ready');
  });
  it('keeps data on a failed refresh and calls it stale, not error', () => {
    expect(panelStatus({ data: [1], error: new Error('x'), updatedAt: now, now })).toBe('stale');
  });
  it('turns stale by age alone', () => {
    expect(panelStatus({ data: [1], updatedAt: now - 999999, now, staleMs: 1000 })).toBe('stale');
  });
  it('a refreshing panel with data does not fall back to a skeleton', () => {
    expect(panelStatus({ loading: true, data: [1], updatedAt: now, now })).toBe('ready');
  });
});

describe('PanelState', () => {
  it('empty says why and what to do', () => {
    const { getByText } = render(html`<${PanelState} status="empty" emptyTitle="Nothing"
      emptyHint="Because." emptyFix="aictl otel enable"/>`);
    expect(getByText('Because.')).toBeTruthy();
    expect(getByText('aictl otel enable')).toBeTruthy();
  });
  it('error is an alert with a working Retry', () => {
    const retry = vi.fn();
    const { getByRole } = render(html`<${PanelState} status="error" label="cost"
      error=${new Error('HTTP 500')} onRetry=${retry}/>`);
    expect(getByRole('alert').textContent).toContain('HTTP 500');
    fireEvent.click(getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('stale keeps the content and adds a warning', () => {
    const { getByText, getByRole } = render(html`<${PanelState} status="stale" updatedAt=${Date.now() - 300000}>
      <p>old numbers</p></${PanelState}>`);
    expect(getByText('old numbers')).toBeTruthy();
    expect(getByRole('status').textContent).toContain('ago');
  });
  it('loading is announced busy and hides the content', () => {
    const { queryByText, getByRole } = render(html`<${PanelState} status="loading"><p>content</p></${PanelState}>`);
    expect(getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(queryByText('content')).toBeNull();
  });
  it('errorText never renders an empty message', () => {
    expect(errorText(null)).toBeTruthy();
    expect(errorText(new Error(''))).toBeTruthy();
  });
});

describe('usePolledResource', () => {
  it('keeps the last data when a refresh fails', async () => {
    const { usePolledResource } = await import('../src/hooks/usePolledResource.js');
    let fail = false;
    const fetchFn = () => (fail ? Promise.reject(new Error('down')) : Promise.resolve([1]));
    let latest;
    const Probe = () => { latest = usePolledResource(fetchFn); return null; };
    render(html`<${Probe}/>`);
    await waitFor(() => expect(latest.data).toEqual([1]));
    fail = true;
    latest.reload();
    await waitFor(() => expect(latest.error?.message).toBe('down'));
    expect(latest.data).toEqual([1]);
  });
});

describe('gateContext', () => {
  const v = (snap, extra = {}) => ({ snap, enabledTools: null, globalRange: 'r', ...extra });
  it('live views always get the new value', () => {
    const a = gateContext(null, v(1), { activeTab: 'overview', now: 0 });
    const b = gateContext(a, v(2), { activeTab: 'overview', now: 10 });
    expect(b.value.snap).toBe(2);
  });
  it('static views hold the value until the refresh interval', () => {
    const a = gateContext(null, v(1), { activeTab: 'budget', now: 0 });
    expect(gateContext(a, v(2), { activeTab: 'budget', now: 10 }).value.snap).toBe(1);
    expect(gateContext(a, v(2), { activeTab: 'budget', now: STATIC_REFRESH_MS }).value.snap).toBe(2);
  });
  it('a filter change or tab switch passes through at once', () => {
    const a = gateContext(null, v(1), { activeTab: 'budget', now: 0 });
    expect(gateContext(a, v(2, { enabledTools: ['x'] }), { activeTab: 'budget', now: 1 }).value.snap).toBe(2);
    expect(gateContext(a, v(2), { activeTab: 'config', now: 1 }).value.snap).toBe(2);
  });
  it('never holds back the first real snapshot', () => {
    const a = gateContext(null, v(null), { activeTab: 'budget', now: 0 });
    expect(gateContext(a, v(1), { activeTab: 'budget', now: 1 }).value.snap).toBe(1);
  });
});

describe('tool filter', () => {
  const tools = [
    { tool: 'claude-code', label: 'Claude Code' },
    { tool: 'codex-cli', label: 'Codex CLI' },
    { tool: 'gemini-cli', label: 'Gemini CLI' },
    { tool: 'cursor', label: 'Cursor' },
  ];
  it('the trigger names the selection', () => {
    expect(toolFilterLabel(tools, null)).toBe('All tools (3)');
    expect(toolFilterLabel(tools, [])).toBe('No tools');
    expect(toolFilterLabel(tools, ['codex-cli'])).toBe('Codex CLI');
    expect(toolFilterLabel(tools, ['claude-code', 'codex-cli', 'gemini-cli'])).toBe('Claude Code +2');
  });
  it('filterSnap scopes the flat per-tool lists, not only snap.tools', () => {
    const out = filterSnap({
      tools: [{ tool: 'claude-code', label: 'CC' }, { tool: 'codex-cli', label: 'Codex' }],
      sessions: [{ tool: 'claude-code' }, { tool: 'codex-cli' }],
      tool_telemetry: [{ tool: 'codex-cli' }],
      mcp_detail: [{ tool: 'claude-code' }],
      events: [{ tool: 'codex-cli' }, { kind: 'global' }],
    }, ['claude-code'], '');
    expect(out.tools.map(t => t.tool)).toEqual(['claude-code']);
    expect(out.sessions).toEqual([{ tool: 'claude-code' }]);
    expect(out.tool_telemetry).toEqual([]);
    expect(out.mcp_detail).toHaveLength(1);
    expect(out.events).toEqual([{ kind: 'global' }]);
  });
});

describe('runningSummary', () => {
  const tree = { tool: 'codex-desktop', session_id: 'codex-desktop:82697:1793871614' };
  const session = { tool: 'copilot-cli', session_id: 'f2cf44a6-8ea0-4999-bb13-1dd7ccb7c44d' };
  it('does not call helper processes sessions', () => {
    expect(runningSummary([tree, tree])).toBe('process trees in 1 tool');
    expect(runningSummary([session, tree])).toBe('1 session and 1 process tree in 2 tools');
    expect(runningSummary([session])).toBe('session in 1 tool');
    expect(runningSummary([])).toBe('sessions in 0 tools');
  });
});
