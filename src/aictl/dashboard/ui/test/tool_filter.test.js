// The header tool filter must apply on every screen.
//
// One table row per nav tab. The table is checked against the real tab list
// (LAYOUT.tabs), so a new screen cannot ship without a row here. Each row renders
// the real screen from app.js (tabRenderers) with the real filterSnap, and
// asserts that a sentinel tool's data is gone while a selected tool's data stays.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SnapContext } from '../src/context.js';
import { LAYOUT } from '../src/layoutConfig.js';
import { filterSnap, tabRenderers } from '../src/app.js';
import ToolTabs from '../src/components/ToolTabs.js';
import {
  isToolSelected, isNoneSelected, filterByTool, memoryOwners, resolveActiveTool,
  toolsParam, selectionKey, answerCoversSelection, sumByTool,
} from '../src/utils/toolScope.js';
import { scopeTotals, scopeHistory } from '../src/selectors.js';
import { scopeAudit } from '../src/utils/auditScope.js';

const KEEP = 'copilot-vscode';        // selected in the tests
const SENTINEL = 'gemini-cli';        // never selected: its data must not appear
const NOW = Math.floor(Date.now() / 1000);

const SENTINEL_TERMS = [/sentinel/i, /gemini/i];

const toolRow = (id, label, slug) => ({
  tool: id, label, vendor: 'github', host: 'any', meta: false,
  files: [
    { path: `/work/${slug}/AGENTS.md`, kind: 'instructions', tokens: 120, size: 400, scope: 'project', sent_to_llm: 'yes', mtime: NOW - 60 },
    { path: `/work/${slug}/${slug}.prompt.md`, kind: 'prompt', tokens: 30, size: 100, scope: 'project', sent_to_llm: 'on-demand', mtime: NOW - 60 },
  ],
  processes: [{ pid: id === KEEP ? 4101 : 4102, name: `${slug}-proc`, cmdline: `${slug}-proc --run`, cpu_pct: 1.5, mem_mb: 120, process_type: 'cli' }],
  mcp_servers: [],
  token_breakdown: { total: 150, always_loaded: 120, on_demand: 30, conditional: 0, never_sent: 0 },
  live: {
    session_count: 1, pid_count: 1, cpu_percent: 1.5, mem_mb: 120, outbound_rate_bps: 10, inbound_rate_bps: 20,
    token_estimate: { input_tokens: 500, output_tokens: 250, confidence: 0.5, source: 'network-inference' },
    processes: [], workspaces: [`/work/${slug}`], sources: [],
  },
});

function buildSnap() {
  return {
    timestamp: NOW, root: '/work', cpu_cores: 4, cpu_per_core: [10, 20, 30, 40],
    total_files: 4, total_tokens: 300, total_size: 1000, total_processes: 2, total_cpu: 3, total_mem_mb: 240,
    total_mcp_servers: 2, total_memory_tokens: 40, total_live_sessions: 2, total_live_estimated_tokens: 1500,
    total_live_outbound_rate_bps: 20, total_live_inbound_rate_bps: 40,
    tools: [toolRow(KEEP, 'Keep Tool', 'keep'), toolRow(SENTINEL, 'Sentinel Tool', 'sentinel')],
    sessions: [KEEP, SENTINEL].map(id => ({
      session_id: `${id}-session`, tool: id, project: `/work/${id === KEEP ? 'keep' : 'sentinel'}-proj`,
      duration_s: 60, cpu_percent: 1, exact_input_tokens: 10, exact_output_tokens: 5,
    })),
    tool_telemetry: [KEEP, SENTINEL].map(id => ({
      tool: id, source: 'otel', confidence: 0.9, input_tokens: 1000, output_tokens: 500, total_sessions: 1,
      cache_read_tokens: 0, cache_creation_tokens: 0, cost_usd: null, by_model: {}, daily: [], errors: [],
    })),
    tool_configs: [
      { tool: 'vscode', settings: { 'chat.agent.enabled': true }, features: {}, mcp_servers: [], extensions: [], otel: {}, hints: [], feature_groups: { Agent: { enabled: true } } },
      ...[KEEP, SENTINEL].map(id => ({
        tool: id, version: '1.0', settings: { 'a.setting': true }, features: {}, mcp_servers: [], extensions: [], otel: {}, hints: [], feature_groups: {}, config_files: [`/cfg/${id}.json`],
      })),
    ],
    mcp_detail: [KEEP, SENTINEL].map(id => ({ name: `${id}-mcp`, tool: id, status: 'running', transport: 'stdio' })),
    events: [KEEP, SENTINEL].map(id => ({ ts: NOW, tool: id, kind: 'hook:Start', detail: {} })),
    agent_memory: [
      { source: 'copilot-user-memory', profile: '(global)', file: '/home/keep-memory.md', tokens: 20, lines: 2, mtime: NOW },
      { source: 'gemini-user-memory', profile: '(global)', file: '/home/sentinel-memory.md', tokens: 20, lines: 2, mtime: NOW },
      { source: 'aictx-hint', profile: '(project)', file: '/work/shared-hint.md', tokens: 5, lines: 1, mtime: NOW },
    ],
    live_monitor: { diagnostics: {}, workspace_paths: ['/work'], state_paths: [] },
    agent_teams: [],
  };
}

const AUDIT = {
  project: '/work', scanned_at: NOW, duration_ms: 5,
  sources: [KEEP, SENTINEL].map(id => ({
    tool: id, scope: 'project', path: `/work/${id === KEEP ? 'keep' : 'sentinel'}-instructions.md`, kind: 'instructions',
    loading: 'always', bytes: 10, est_tokens: 3, git_state: 'tracked', readable: true, symlink_target: '', note: '', origin: 'builtin',
  })),
  findings: [], counts: { high: 0, medium: 0, low: 0, info: 0 },
  sources_per_tool: { [KEEP]: 1, [SENTINEL]: 1 },
  drift: { baseline_created: false, new: [], changed: [], removed: [], agent_writes: [] },
  unattributed: [], effective_models: {},
};

const HISTORY = {
  ts: [NOW - 20, NOW - 10, NOW], files: [1, 1, 1], tokens: [1, 2, 3], cpu: [1, 1, 1], mem_mb: [1, 1, 1], mcp: [0, 0, 0],
  mem_tokens: [1, 1, 1], live_sessions: [1, 1, 1], live_tokens: [1, 2, 3], live_in_rate: [0, 0, 0], live_out_rate: [0, 0, 0],
  by_tool: Object.fromEntries([KEEP, SENTINEL].map(id => [id, { ts: [NOW - 20, NOW - 10, NOW], cpu: [1, 1, 1], mem_mb: [1, 1, 1], tokens: [1, 2, 3], traffic: [1, 1, 1] }])),
};

// Responses the screens fetch for themselves. Rows for the sentinel are always
// included: the screens, not the server stub, must leave them out.
function route(path) {
  const u = new URL(path, 'http://x');
  const p = u.pathname;
  if (p === '/api/context-audit') return AUDIT;
  if (p === '/api/usage') return { tools: [KEEP, SENTINEL].map(id => ({ tool: id, total_tokens: 1500, sessions: 1, cost_usd: null })) };
  if (p === '/api/budget') return budgetFor(u);
  if (p === '/api/session-timeline') {
    return [KEEP, SENTINEL].map(id => ({
      session_id: `${id}-session`, tool: id, project: `/work/${id === KEEP ? 'keep' : 'sentinel'}-proj`,
      started_at: NOW - 100, ended_at: NOW - 40, duration_s: 60, exact_input_tokens: 10, exact_output_tokens: 5,
    }));
  }
  if (p === '/api/history') return HISTORY;
  if (p === '/api/events') {
    const tool = u.searchParams.get('tool');
    return [{ ts: NOW, tool, kind: 'hook:Start', detail: {} }];
  }
  if (p === '/api/hooks-status') return { tools: {}, total_configured: 0, total_fired_24h: 0 };
  if (p === '/api/data-quality') return { items: [] };
  if (p === '/api/effective-models') return {};
  if (p === '/api/ingesters') return { ingesters: [] };
  if (p === '/api/analytics') return analyticsFor(u);
  if (p === '/api/samples') return [];
  return {};
}

// The server computes Analytics and Budget per selection and states which one it
// answered for (`selection`). These stubs do the same, so a screen cannot pass by
// filtering on its own: it has to ask for the selection and show what comes back.
function selectionOf(u) {
  const raw = u.searchParams.get('tools');
  const tools = raw === null ? null : raw.split(',').filter(Boolean).sort();
  return { tools, block: { all_tools: tools === null, tools } };
}
const budgetTokens = { [KEEP]: 100, [SENTINEL]: 9000 };
function budgetFor(u) {
  const { tools, block } = selectionOf(u);
  const always = Object.entries(budgetTokens).reduce((n, [id, v]) => n + (tools === null || tools.includes(id) ? v : 0), 0);
  return { selection: block, always_loaded_tokens: always, on_demand_tokens: 10, conditional_tokens: 0, cacheable_tokens: 0, total_potential_tokens: always + 10, project_count: 1 };
}
function analyticsFor(u) {
  const { tools, block } = selectionOf(u);
  const has = id => tools === null || tools.includes(id);
  const invocations = [];
  if (has(KEEP)) invocations.push({ tool_name: 'keep-read', count: 3, avg_ms: 10, p95_ms: 20, error_count: 0 });
  if (has(SENTINEL)) invocations.push({ tool_name: 'sentinel-read', count: 4, avg_ms: 10, p95_ms: 20, error_count: 0 });
  const hidden = tools === null ? 0 : 2;
  return {
    pending: false, selection: block,
    response_time: { requests: [], by_model: [], unattributed_hidden: hidden },
    tools: { invocations, cli_tools: [], unattributed_hidden: 0 },
    files: { memory_timeline: {}, memory_events: [], unattributed_hidden: 0 },
  };
}

// jsdom has no canvas or ResizeObserver; the charts only need them not to throw.
const noop = () => {};
const ctx2d = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : noop), set: () => true });
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
HTMLCanvasElement.prototype.getContext = () => ctx2d;
globalThis.Path2D = globalThis.Path2D || class { addPath() {} moveTo() {} lineTo() {} rect() {} arc() {} closePath() {} };

let fetchSpy;
beforeEach(() => {
  fetchSpy = vi.fn(async (path) => ({ ok: true, status: 200, json: async () => route(String(path)), text: async () => '' }));
  globalThis.fetch = fetchSpy;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Screen({ tab, enabledTools, theme = 'auto' }) {
  const raw = buildSnap();
  const snap = filterSnap(raw, enabledTools, '');
  const ctx = {
    snap, history: HISTORY, openViewer: () => {}, recentFiles: new Map(), enabledTools,
    globalRange: { id: '24h', since: NOW - 86400, until: null }, rangeSeconds: 86400,
  };
  const renderers = tabRenderers({
    theme, snap: raw, filteredSnap: snap, enabledTools, effectiveHistory: HISTORY, activeTab: tab,
    connected: true, otelActive: true, alerts: [], selfStatus: null,
    openSession: () => {}, setActiveTab: () => {}, setTheme: () => {},
  });
  return html`<${SnapContext.Provider} value=${ctx}>${renderers[tab]()}</${SnapContext.Provider}>`;
}

// What each screen must show for the kept tool, and whether an empty selection
// shows the shared empty state.
const SCREENS = {
  overview:  { keep: 'Keep Tool', empty: true },
  hidden:    { keep: 'keep-instructions.md', empty: true },
  live:      { keep: 'Keep Tool', empty: true },
  procs:     { keep: 'Keep Tool', empty: true },
  events:    { keep: 'Keep Tool', empty: true },
  explorer:  { keep: 'keep-proj', empty: true },
  agents:    { keep: 'Keep Tool', empty: true },
  prompts:   { keep: 'Keep Tool', empty: true },
  budget:    { keep: 'Keep Tool', empty: true },
  analytics: { keep: 'keep-read', empty: true },
  memory:    { keep: 'Copilot Instructions', empty: true },
  config:    { keep: 'Keep Tool', empty: true },
};

const EDITORIAL = {
  overview: { keep: 'Keep Tool', empty: true },
  explorer: { keep: 'keep-proj', empty: true },
};

function expectNoSentinel(text) {
  for (const term of SENTINEL_TERMS) {
    if (term instanceof RegExp) expect(text).not.toMatch(term);
    else expect(text).not.toContain(term);
  }
}

describe('every screen is in the filter table', () => {
  it('has a row for each nav tab, and no row for a tab that does not exist', () => {
    const ids = LAYOUT.tabs.map(t => t.id).sort();
    expect(Object.keys(SCREENS).sort()).toEqual(ids);
    const renderers = tabRenderers({ theme: 'auto', snap: null, filteredSnap: null, enabledTools: null,
      effectiveHistory: null, activeTab: 'overview', setActiveTab: () => {}, setTheme: () => {} });
    expect(Object.keys(renderers).sort()).toEqual(ids);
  });
});

describe.each(Object.entries(SCREENS))('screen %s under the tool filter', (tab, spec) => {
  it(`shows the selected tool and not the sentinel`, async () => {
    const { container } = render(html`<${Screen} tab=${tab} enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.textContent).toContain(spec.keep), { timeout: 4000 });
    expectNoSentinel(container.textContent);
  });

  it('with All tools shows the sentinel too (the filter is what removes it)', async () => {
    const { container } = render(html`<${Screen} tab=${tab} enabledTools=${null}/>`);
    await waitFor(() => expect(container.textContent).toContain(spec.keep), { timeout: 4000 });
    await waitFor(() => expect(/sentinel|Gemini/i.test(container.textContent)).toBe(true), { timeout: 4000 });
  });

  it('with an explicit empty selection shows the empty state, not other tools', async () => {
    const { container } = render(html`<${Screen} tab=${tab} enabledTools=${[]}/>`);
    await waitFor(() => expect(container.querySelector('[data-testid="tool-scope-empty"]')).toBeTruthy(), { timeout: 4000 });
    expect(container.textContent).not.toContain('Keep Tool');
    expectNoSentinel(container.textContent);
  });

  it('with a selected tool that has no data here, names the selection', async () => {
    const { container } = render(html`<${Screen} tab=${tab} enabledTools=${['codex-cli']}/>`);
    await waitFor(() => expect(container.querySelector('[data-testid="tool-scope-empty"]')).toBeTruthy(), { timeout: 4000 });
    const note = container.querySelector('[data-testid="tool-scope-empty"]').textContent;
    expect(note).toContain('The selected tools have no data here');
    expect(note).toContain('Codex CLI');
    expect(container.textContent).not.toContain('Keep Tool');
    expectNoSentinel(container.textContent);
  });
});

describe.each(Object.entries(EDITORIAL))('editorial theme, screen %s', (tab, spec) => {
  it('shows the selected tool and not the sentinel; an empty selection shows the empty state', async () => {
    const first = render(html`<${Screen} tab=${tab} theme="editorial" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(first.container.textContent).toContain(spec.keep), { timeout: 4000 });
    expectNoSentinel(first.container.textContent);
    cleanup();
    const none = render(html`<${Screen} tab=${tab} theme="editorial" enabledTools=${[]}/>`);
    await waitFor(() => expect(none.container.querySelector('[data-testid="tool-scope-empty"]')).toBeTruthy(), { timeout: 4000 });
    expectNoSentinel(none.container.textContent);
  });
});

describe('screens that name a screen-wide limit, not a tool', () => {
  it('config keeps the VS Code panel and the aictl card under any filter', async () => {
    const { container } = render(html`<${Screen} tab="config" enabledTools=${[]}/>`);
    await waitFor(() => expect(container.textContent).toContain('applies to all AI tools'), { timeout: 4000 });
    expect(container.textContent).toContain('aictl');
  });

  it('overview totals are recomputed from the selected tools, and say what has no tool split', async () => {
    const { container } = render(html`<${Screen} tab="overview" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.textContent).toContain('whole machine, all tools'), { timeout: 4000 });
    expect(container.textContent).toContain('Keep Tool');
  });

});

const fetchedUrls = () => fetchSpy.mock.calls.map(([p]) => String(p));

describe('Analytics follows the tool filter through the server', () => {
  it('asks for the selection, shows only its figures, and drops the all-tools note', async () => {
    const { container } = render(html`<${Screen} tab="analytics" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.textContent).toContain('keep-read'), { timeout: 4000 });
    expect(fetchedUrls().some(u => u.startsWith('/api/analytics') && u.includes('tools=' + KEEP))).toBe(true);
    expectNoSentinel(container.textContent);
    expect(container.textContent).not.toContain('Analytics cover all tools');
    // The only note left is the raw metrics explorer, which has no per-tool data.
    for (const note of container.querySelectorAll('[role="note"]')) {
      expect(note.closest('details') || note.dataset.testid === 'filter-hidden-note').toBeTruthy();
    }
  });

  it('counts rows with no recoverable tool instead of dropping them silently', async () => {
    const { container } = render(html`<${Screen} tab="analytics" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.querySelector('[data-testid="filter-hidden-note"]')).toBeTruthy(), { timeout: 4000 });
    expect(container.querySelector('[data-testid="filter-hidden-note"]').textContent).toContain('2 rows');
  });

  it('sends no tools parameter for All tools, and fetches nothing for an empty selection', async () => {
    const all = render(html`<${Screen} tab="analytics" enabledTools=${null}/>`);
    await waitFor(() => expect(all.container.textContent).toContain('sentinel-read'), { timeout: 4000 });
    expect(fetchedUrls().filter(u => u.startsWith('/api/analytics')).every(u => !u.includes('tools='))).toBe(true);
    cleanup();
    fetchSpy.mockClear();
    const none = render(html`<${Screen} tab="analytics" enabledTools=${[]}/>`);
    await waitFor(() => expect(none.container.querySelector('[data-testid="tool-scope-empty"]')).toBeTruthy());
    expect(fetchedUrls().some(u => u.startsWith('/api/analytics'))).toBe(false);
  });

  it('refetches when the selection changes, without a reload', async () => {
    const view = render(html`<${Screen} tab="analytics" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(view.container.textContent).toContain('keep-read'), { timeout: 4000 });
    view.rerender(html`<${Screen} tab="analytics" enabledTools=${[SENTINEL]}/>`);
    await waitFor(() => expect(view.container.textContent).toContain('sentinel-read'), { timeout: 4000 });
    expect(view.container.textContent).not.toContain('keep-read');
    expect(fetchedUrls().some(u => u.includes('tools=' + SENTINEL))).toBe(true);
  });

  it('shows the loading state, not the previous selection, while the new one is computed', async () => {
    let release;
    const gate = new Promise(r => { release = r; });
    const view = render(html`<${Screen} tab="analytics" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(view.container.textContent).toContain('keep-read'), { timeout: 4000 });
    globalThis.fetch = vi.fn(async (path) => {
      const u = new URL(String(path), 'http://x');
      if (u.pathname === '/api/analytics') await gate;
      return { ok: true, status: 200, json: async () => route(String(path)), text: async () => '' };
    });
    view.rerender(html`<${Screen} tab="analytics" enabledTools=${[SENTINEL]}/>`);
    await waitFor(() => expect(view.container.querySelector('[aria-busy="true"]')).toBeTruthy());
    expect(view.container.textContent).not.toContain('keep-read');
    expect(view.container.textContent).not.toContain('sentinel-read');
    release();
    await waitFor(() => expect(view.container.textContent).toContain('sentinel-read'), { timeout: 4000 });
  });

  it('keeps asking while the server says pending, and shows nothing for it', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async (path) => {
      const u = new URL(String(path), 'http://x');
      const body = u.pathname === '/api/analytics' && ++calls < 3
        ? { pending: true, selection: selectionOf(u).block }
        : route(String(path));
      return { ok: true, status: 200, json: async () => body, text: async () => '' };
    });
    const { container } = render(html`<${Screen} tab="analytics" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.textContent).toContain('keep-read'), { timeout: 6000 });
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('does not show an answer for another selection as filtered', async () => {
    // An older server ignores `tools` and answers for all tools.
    globalThis.fetch = vi.fn(async (path) => {
      const u = new URL(String(path), 'http://x');
      const body = u.pathname === '/api/analytics'
        ? analyticsFor(new URL('/api/analytics', 'http://x'))
        : route(String(path));
      return { ok: true, status: 200, json: async () => body, text: async () => '' };
    });
    const { container } = render(html`<${Screen} tab="analytics" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.textContent).toContain('different tool selection'), { timeout: 4000 });
    expect(container.textContent).not.toContain('keep-read');
    expect(container.textContent).not.toContain('sentinel-read');
  });
});

describe('Budget follows the tool filter through the server', () => {
  it('asks for the selection and shows the selected tools context-window figures, with no all-tools note', async () => {
    const { container } = render(html`<${Screen} tab="budget" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.textContent).toContain('Always: 100'), { timeout: 4000 });
    expect(fetchedUrls().some(u => u.startsWith('/api/budget') && u.includes('tools=' + KEEP))).toBe(true);
    expect(container.querySelector('[data-testid="budget-all-tools-note"]')).toBeNull();
    expect(container.textContent).not.toContain('cover all tools');
    expect(container.textContent).not.toMatch(/Always: 9/);
  });

  it('sends no parameter for All tools and shows the machine figure', async () => {
    const { container } = render(html`<${Screen} tab="budget" enabledTools=${null}/>`);
    await waitFor(() => expect(container.textContent).toContain('Always: 9.1K'), { timeout: 4000 });
    expect(fetchedUrls().filter(u => u.startsWith('/api/budget')).every(u => !u.includes('tools='))).toBe(true);
  });

  it('refetches when the selection changes and never shows the previous selection meanwhile', async () => {
    const view = render(html`<${Screen} tab="budget" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(view.container.textContent).toContain('Always: 100'), { timeout: 4000 });
    let release;
    const gate = new Promise(r => { release = r; });
    globalThis.fetch = vi.fn(async (path) => {
      const u = new URL(String(path), 'http://x');
      if (u.pathname === '/api/budget') await gate;
      return { ok: true, status: 200, json: async () => route(String(path)), text: async () => '' };
    });
    view.rerender(html`<${Screen} tab="budget" enabledTools=${[SENTINEL]}/>`);
    await waitFor(() => expect(view.container.querySelector('[aria-busy="true"]')).toBeTruthy());
    expect(view.container.textContent).not.toContain('Always: 100');
    release();
    await waitFor(() => expect(view.container.textContent).toContain('Always: 9K'), { timeout: 4000 });
  });

  it('does not show an answer for another selection as filtered', async () => {
    globalThis.fetch = vi.fn(async (path) => {
      const u = new URL(String(path), 'http://x');
      const body = u.pathname === '/api/budget' ? budgetFor(new URL('/api/budget', 'http://x')) : route(String(path));
      return { ok: true, status: 200, json: async () => body, text: async () => '' };
    });
    const { container } = render(html`<${Screen} tab="budget" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(container.textContent).toContain('different tool selection'), { timeout: 4000 });
    expect(container.textContent).not.toContain('Always: ');
  });
});

describe('Agents 24h counters follow the selection', () => {
  const hooks = { tools: {}, total_configured: 0, total_fired_24h: 0,
    tool_calls: { total_calls_24h: 20, by_tool: { [KEEP]: 3, [SENTINEL]: 5, 'claude-code': 4, unknown: 8 }, by_tool_name: {} },
    skill_usage: { total_calls_24h: 0, by_tool: {}, by_skill: [], by_tool_skill: {} },
    subagents: { starts_24h: 0, by_tool: {} } };
  const withHooks = () => {
    globalThis.fetch = vi.fn(async (path) => {
      const body = new URL(String(path), 'http://x').pathname === '/api/hooks-status' ? hooks : route(String(path));
      return { ok: true, status: 200, json: async () => body, text: async () => '' };
    });
  };

  it('shows the machine total with All tools and the selected sum under a filter', async () => {
    withHooks();
    const all = render(html`<${Screen} tab="agents" enabledTools=${null}/>`);
    await waitFor(() => expect(all.container.querySelector('[data-testid="agents-calls-total"]')?.textContent).toContain('20 all tools / 24h'), { timeout: 4000 });
    cleanup();
    withHooks();
    const one = render(html`<${Screen} tab="agents" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(one.container.querySelector('[data-testid="agents-calls-total"]')?.textContent).toContain('3 selected tools / 24h'), { timeout: 4000 });
    const el = one.container.querySelector('[data-testid="agents-calls-total"]');
    expect(one.container.textContent).not.toContain('all tools / 24h');
    expect(el.getAttribute('title')).toContain('8 from tools that could not be identified');
  });
});

describe('the server selection helpers', () => {
  it('toolsParam sends nothing for all tools, an empty value for none, sorted exact ids otherwise', () => {
    expect(toolsParam(null)).toBe('');
    expect(toolsParam(undefined)).toBe('');
    expect(toolsParam([])).toBe('tools=');
    expect(toolsParam(['codex-cli', 'claude-code', 'codex-cli'])).toBe('tools=claude-code,codex-cli');
    expect(toolsParam(['copilot'])).not.toBe(toolsParam(['copilot-vscode']));
  });
  it('an answer covers a selection only when it states exactly that selection', () => {
    const all = { selection: { all_tools: true, tools: null } };
    const some = ids => ({ selection: { all_tools: false, tools: ids } });
    expect(answerCoversSelection(all, null)).toBe(true);
    expect(answerCoversSelection({}, null)).toBe(true);
    expect(answerCoversSelection(all, ['a'])).toBe(false);
    expect(answerCoversSelection({}, ['a'])).toBe(false);
    expect(answerCoversSelection(some(['a']), null)).toBe(false);
    expect(answerCoversSelection(some(['b', 'a']), ['a', 'b'])).toBe(true);
    expect(answerCoversSelection(some(['a']), ['a', 'b'])).toBe(false);
    expect(answerCoversSelection(some([]), [])).toBe(true);
    expect(answerCoversSelection(some(['copilot']), ['copilot-vscode'])).toBe(false);
    expect(selectionKey([])).not.toBe(selectionKey(null));
  });
  it('sumByTool adds the selected tools and counts the unattributed apart', () => {
    const by = { a: 1, b: 2, unknown: 5, '': 1 };
    expect(sumByTool(by, null)).toEqual({ total: 9, hidden: 0 });
    expect(sumByTool(by, ['a'])).toEqual({ total: 1, hidden: 6 });
    expect(sumByTool(by, [])).toEqual({ total: 0, hidden: 6 });
    expect(sumByTool({ x: { starts: 2 } }, ['x'], v => v.starts)).toEqual({ total: 2, hidden: 0 });
  });
});

describe('sub-tabs follow the filter', () => {
  it('events fetches nothing for a tool that stops being selected', async () => {
    const view = render(html`<${Screen} tab="events" enabledTools=${null}/>`);
    await waitFor(() => expect(view.container.textContent).toContain('Sentinel Tool'), { timeout: 4000 });
    fireEvent.click([...view.container.querySelectorAll('.es-tool-btn')].find(b => b.textContent.includes('Sentinel Tool')));
    await waitFor(() => expect(fetchSpy.mock.calls.some(([p]) => String(p).includes('tool=' + SENTINEL))).toBe(true));
    fetchSpy.mockClear();
    view.rerender(html`<${Screen} tab="events" enabledTools=${[KEEP]}/>`);
    await waitFor(() => expect(fetchSpy.mock.calls.some(([p]) => String(p).includes('tool=' + KEEP))).toBe(true));
    expect(fetchSpy.mock.calls.some(([p]) => String(p).includes('tool=' + SENTINEL))).toBe(false);
    expect([...view.container.querySelectorAll('.es-tool-btn')].map(b => b.textContent)).toEqual(
      [expect.stringContaining('Keep Tool')]);
  });

  it('ToolTabs lists only selected tools and moves off a tool that is no longer selected', () => {
    const onSelect = vi.fn();
    const ctx = { snap: filterSnap(buildSnap(), null, ''), enabledTools: [KEEP] };
    const { container } = render(html`<${SnapContext.Provider} value=${ctx}>
      <${ToolTabs} tools=${[SENTINEL, KEEP, 'copilot-cli']} activeTool=${SENTINEL} onSelect=${onSelect}/>
    </${SnapContext.Provider}>`);
    // One tool left on offer: no choice, so no tab strip; the active tab moves to it.
    expect(container.querySelector('.sf-tool-tabs')).toBeNull();
    expect(onSelect).toHaveBeenCalledWith(KEEP);

    cleanup();
    const wide = { snap: ctx.snap, enabledTools: [KEEP, 'copilot-cli'] };
    const two = render(html`<${SnapContext.Provider} value=${wide}>
      <${ToolTabs} tools=${[SENTINEL, KEEP, 'copilot-cli']} activeTool=${KEEP} onSelect=${() => {}}/>
    </${SnapContext.Provider}>`);
    expect([...two.container.querySelectorAll('.sf-tool-tab')]).toHaveLength(2);
    expect(two.container.textContent).not.toContain('Sentinel');
  });
});

describe('the shared definition of "selected"', () => {
  it('null is every tool, an empty list is none, ids match exactly', () => {
    expect(isToolSelected('claude-code', null)).toBe(true);
    expect(isToolSelected('claude-code', [])).toBe(false);
    expect(isNoneSelected([])).toBe(true);
    expect(isNoneSelected(null)).toBe(false);
    expect(isToolSelected('copilot-vscode', ['copilot'])).toBe(false);
    expect(isToolSelected('copilot', ['copilot-vscode', 'copilot-cli'])).toBe(false);
    expect(isToolSelected('copilot-cli', ['copilot-cli'])).toBe(true);
  });
  it('panels and rows that belong to no tool stay; an unattributed or unlisted id does not', () => {
    for (const id of ['aictl', 'vscode', 'project-env', undefined, '']) expect(isToolSelected(id, [])).toBe(true);
    expect(isToolSelected('any', ['claude-code'])).toBe(false);
    expect(isToolSelected('cursor', ['claude-code'])).toBe(false);
    expect(filterByTool([{ tool: 'a' }, { tool: 'b' }, {}], ['a'])).toEqual([{ tool: 'a' }, {}]);
  });
  it('memory rows are owned by source, with exact tool ids', () => {
    expect(memoryOwners({ source: 'copilot-user-memory' })).toContain('copilot-vscode');
    expect(memoryOwners({ source: 'copilot-user-memory' })).not.toContain('copilot365');
    expect(memoryOwners({ source: 'aictx-hint' })).toBeNull();
    expect(memoryOwners({ source: 'claude-auto-memory', tool: 'x' })).toEqual(['x']);
  });
  it('resolveActiveTool keeps the current tool only while it is on offer', () => {
    expect(resolveActiveTool(['a', 'b'], 'b')).toBe('b');
    expect(resolveActiveTool(['a', 'b'], 'c')).toBe('a');
    expect(resolveActiveTool([], 'a')).toBeNull();
  });
});

describe('filterSnap scopes every per-tool list in the snapshot', () => {
  const summaryKeys = () => {
    const py = readFileSync(resolve(process.cwd(), '../web_server.py'), 'utf8');
    const block = py.match(/_SSE_OMITTABLE_KEYS = frozenset\(\s*\{([^}]*)\}/);
    return block ? [...block[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]) : null;
  };
  // Lists the server sends that belong to no single tool.
  const GLOBAL_LISTS = new Set(['live_monitor', 'agent_teams']);
  // Lists scoped by filterSnap, with the sentinel row that must disappear.
  const SCOPED = ['agent_memory', 'mcp_detail', 'tool_telemetry', 'tool_configs', 'events', 'sessions'];

  it('classifies every large summary key the server sends', () => {
    const keys = summaryKeys();
    expect(keys, 'could not read the server summary keys').not.toBeNull();
    const unclassified = keys.filter(k => !SCOPED.includes(k) && !GLOBAL_LISTS.has(k));
    expect(unclassified, 'new snapshot list: scope it in filterSnap or declare it global here').toEqual([]);
  });

  it.each(SCOPED)('drops sentinel rows from %s', (key) => {
    const out = filterSnap(buildSnap(), [KEEP], '');
    const text = JSON.stringify(out[key]);
    expect(text).not.toMatch(/sentinel|gemini/i);
    expect(out[key].length).toBeGreaterThan(0);
  });

  it('keeps the Copilot settings card for Copilot in VS Code, and no other tool', () => {
    const raw = { tools: [], tool_configs: [{ tool: 'copilot' }, { tool: 'gemini-cli' }] };
    const cards = enabled => filterSnap(raw, enabled, '').tool_configs.map(c => c.tool);
    expect(cards(['copilot-vscode'])).toEqual(['copilot']);
    expect(cards(['copilot'])).toEqual(['copilot']);
    expect(cards(['copilot-cli'])).toEqual([]);
    expect(cards(null)).toEqual(['copilot', 'gemini-cli']);
  });

  it('counts rows it hides only because their tool id is not in the filter list', () => {
    const snap = buildSnap();
    snap.sessions.push({ session_id: 'u', tool: 'any' }, { session_id: 'v', tool: 'cursor' });
    expect(filterSnap(snap, [KEEP], '').filter_hidden_unlisted).toBe(2);
    expect(filterSnap(snap, null, '').filter_hidden_unlisted).toBe(0);
  });
});

describe('totals and audit follow the selected tools', () => {
  it('scopeTotals sums only the kept tools', () => {
    const out = filterSnap(buildSnap(), [KEEP], '');
    const t = scopeTotals(out);
    expect(t.total_files).toBe(2);
    expect(t.total_tokens).toBe(150);
    expect(t.total_live_sessions).toBe(1);
    expect(t.total_live_estimated_tokens).toBe(750);
    expect(t.total_mcp_servers).toBe(1);
    expect(t.total_memory_tokens).toBe(25);
  });
  it('scopeHistory sums per-tool series and has none for the rest', () => {
    const h = scopeHistory(HISTORY, [KEEP]);
    expect(h.tokens).toEqual([1, 2, 3]);
    expect(h.files).toBeUndefined();
    expect(scopeHistory(HISTORY, [KEEP, SENTINEL]).tokens).toEqual([2, 4, 6]);
  });
  it('scopeAudit recounts severities from the findings that stay', () => {
    const audit = { ...AUDIT, findings: [
      { rule: 'r1', severity: 'high', tools: [KEEP, 'cursor'] },
      { rule: 'r2', severity: 'high', tools: [SENTINEL] },
      { rule: 'r3', severity: 'low', tools: [] },
    ], counts: { high: 2, low: 1 } };
    const out = scopeAudit(audit, [KEEP]);
    expect(out.findings.map(f => f.rule)).toEqual(['r1', 'r3']);
    expect(out.counts).toEqual({ high: 1, medium: 0, low: 1, info: 0 });
    expect(out.sources.map(s => s.tool)).toEqual([KEEP]);
  });
});
