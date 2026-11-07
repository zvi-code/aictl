// The board's Context section, its Workflows panel, the command palette and the
// keyboard shortcuts, from /api/board/context.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';

import BoardScreen from '../src/components/board/BoardScreen.js';
import { RECENT_KEY, boardCommands, rankCommands, scoreCommand } from '../src/components/board/CommandPalette.js';
import { contextSummary, dailySeries, fmtWindowShare, logWidth, mapRows, memoryGroups } from '../src/components/board/contextPanels.js';
import { DEFAULT_LAYOUT, TITLES, sanitizeLayout } from '../src/components/board/layout.js';
import { PANEL_IDS, buildPanel } from '../src/components/board/panels.js';
import { parseFilters } from '../src/components/board/filters.js';
import { EMPTY_CONTEXT, normalizeBoard, normalizeContext } from '../src/components/board/useBoardData.js';
import { NOW, agentDetailFixture, boardFixture, machineFixture } from './fixtures/board.fixture.js';

if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const DAYS = ['2027-01-09', '2027-01-10', '2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15'];
const file = (path, name, kind, scope, project, size, tokens, sent, when, mtime, recent) => ({
  path, name, tool: 'claude-code', kind, scope, project, size, tokens, sent_to_llm: sent, policy: sent === 'yes' ? 'yes' : sent === 'on-demand' ? 'on-demand' : 'no',
  load: sent === 'yes' ? 'always' : sent === 'on-demand' ? 'on_demand' : 'never', loaded_when: when, cacheable: null, mtime, recent,
});

export function contextFixture() {
  return {
    generated_at: NOW, root: '/r',
    budget: {
      tools: [
        {
          tool: 'claude-code', label: 'Claude Code', model: 'claude-opus-5', model_from: 'settings', window: 1_000_000, window_assumed: false,
          always: 300_000, on_demand: 20_000, conditional: 0, cacheable: 1000, survives_compaction: 0, never_sent_files: 1, max_potential: 320_000,
          always_share: 0.3, potential_share: 0.32, global_tokens: 200_000, largest_project: 'alpha', raw_total: 340_000,
          projects: [
            { project: 'alpha', always: 100_000, on_demand: 20_000, conditional: 0, tokens: 120_000, estimate: 320_000, share: 0.32 },
            { project: 'beta', always: 20_000, on_demand: 0, conditional: 0, tokens: 20_000, estimate: 220_000, share: 0.22 },
          ],
        },
        {
          tool: 'codex-cli', label: 'Codex CLI', model: null, model_from: null, window: 200_000, window_assumed: true, always: 0, on_demand: 0, conditional: 70,
          cacheable: 0, survives_compaction: 0, never_sent_files: 0, max_potential: 70, always_share: 0, potential_share: 0.0004, global_tokens: 70, largest_project: null, raw_total: 70, projects: [],
        },
      ],
      totals: { always: 300_000 },
    },
    categories: [{
      tool: 'claude-code', label: 'Claude Code', tokens: 305_060, sent: 300_060, never_sent: 5000,
      kinds: [
        { kind: 'instructions', files: 2, bytes: 1_200_000, tokens: 300_000, sent: 300_000, never_sent: 0, always: 300_000, on_demand: 0, conditional: 0 },
        { kind: 'transcript', files: 1, bytes: 20_000, tokens: 5000, sent: 0, never_sent: 5000, always: 0, on_demand: 0, conditional: 0 },
        { kind: 'skills', files: 1, bytes: 240, tokens: 60, sent: 60, never_sent: 0, always: 0, on_demand: 60, conditional: 0 },
      ],
    }],
    map: {
      total: 305_060, policy: { yes: 300_000, 'on-demand': 60, conditional: 0, no: 5000 },
      rows: [
        { tool: 'claude-code', kind: 'instructions', scope: 'global', project: '(global)', policy: 'yes', files: 1, tokens: 200_000 },
        { tool: 'claude-code', kind: 'instructions', scope: 'project', project: 'alpha', policy: 'yes', files: 1, tokens: 100_000 },
        { tool: 'claude-code', kind: 'transcript', scope: 'shadow', project: '(shadow)', policy: 'no', files: 1, tokens: 5000 },
        { tool: 'claude-code', kind: 'skills', scope: 'project', project: 'alpha', policy: 'on-demand', files: 1, tokens: 60 },
      ],
      items: [{ project: 'alpha', kind: 'instructions', name: 'CLAUDE', tokens: 100_000 }, { project: 'alpha', kind: 'skills', name: 'review', tokens: 60 }],
    },
    memory: {
      entries: [{ file: '/home/me/.claude/memory/notes.md', name: 'notes.md', source: 'claude-auto-memory', source_label: 'Claude auto memory', profile: 'alpha', tokens: 120, lines: 9, mtime: NOW - 30, recent: true }],
      tokens: 120,
      growth: [{ ts: NOW - 7200, mem_tokens: 100, memory_entries: 1 }, { ts: NOW - 3600, mem_tokens: 110, memory_entries: 1 }, { ts: NOW, mem_tokens: 120, memory_entries: 1 }],
    },
    files: [{
      tool: 'claude-code', label: 'Claude Code', count: 4, truncated: false,
      files: [
        file('/home/me/.claude/CLAUDE.md', 'CLAUDE.md', 'instructions', 'global', '(global)', 800_000, 200_000, 'yes', 'every-call', NOW - 86400, false),
        file('/r/alpha/AGENTS.md', 'AGENTS.md', 'instructions', 'project', 'alpha', 400_000, 100_000, 'yes', 'every-call', NOW - 20, true),
        file('/home/me/.claude/projects/x/s.jsonl', 's.jsonl', 'transcript', 'shadow', '(shadow)', 20_000, 5000, 'no', null, NOW - 4000, false),
        file('/r/alpha/.claude/skills/review/SKILL.md', 'SKILL.md', 'skills', 'project', 'alpha', 240, 60, 'on-demand', 'on-demand', null, false),
      ],
    }],
    telemetry: [{
      tool: 'copilot-cli', label: 'Copilot CLI', source: 'events-jsonl', confidence: 0.9, as_of: '2027-01-14', token_quality: 'exact',
      input: 1000, output: 200, cache_read: 50, cache_write: 5, sessions: 3, messages: 40, cost_usd: null, cost_quality: 'unknown', cost_reason: null, premium_requests: 12,
      quota: { premium_requests: 12, api_duration_ms: 9000, current_model: 'gpt-5' }, active: null,
      by_model: [{ model: 'gpt-5', input: 1000, output: 200, cache_read: 0, cache_write: 0, requests: 7, cost_usd: null }],
      errors: [
        { ts: '2027-01-14T10:00:03', type: 'rate_limit', message: 'Too many requests', model: 'gpt-5' },
        { ts: '2027-01-14T10:00:02', type: 'timeout', message: 'The request timed out', model: null },
        { ts: '2027-01-14T10:00:01', type: 'api_error', message: 'Bad gateway', model: null },
      ],
    }],
    daily: {
      days: DAYS, since: 0,
      models: [{ model: 'claude-sonnet-5', tokens: 165, requests: 2, cost_usd: 0.01 }, { model: 'gpt-5', tokens: 7, requests: 1, cost_usd: null }],
      rows: [
        { date: DAYS[6], model: 'claude-sonnet-5', requests: 2, input: 110, output: 55, cache_read: 0, cache_write: 0, tokens: 165, cost_usd: 0.01 },
        { date: DAYS[5], model: 'gpt-5', requests: 1, input: 7, output: 0, cache_read: 0, cache_write: 0, tokens: 7, cost_usd: null },
      ],
    },
    workflows: [
      { path: '/r/alpha/.github/workflows/release.workflow.md', name: 'release', type: 'workflow', kind: 'workflows', tool: 'copilot-vscode', size: 120, tokens: 30, mtime: NOW - 600 },
      { path: '/r/alpha/.github/prompts/review.prompt.md', name: 'review', type: 'prompt', kind: 'prompt', tool: 'copilot-vscode', size: 80, tokens: 20, mtime: null },
    ],
  };
}

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch(context = contextFixture()) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith('/api/board/context')) return jsonResponse(context);
    if (u.startsWith('/api/board/machine')) return jsonResponse(machineFixture());
    if (u.startsWith('/api/board/agent')) return jsonResponse(agentDetailFixture(new URL(u, 'http://x').searchParams.get('id')));
    if (u.startsWith('/api/board?')) return jsonResponse(boardFixture());
    if (u.startsWith('/api/file?')) return new Response('# Notes\n\nKeep **this** in mind.', { status: 200 });
    if (u.startsWith('/api/context-audit')) return jsonResponse({ findings: [], sources: [], counts: {} });
    return jsonResponse({});
  }));
  return calls;
}
class FakeES { constructor() { FakeES.last = this; } close() {} }

let scrolled = [];
beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  window.history.replaceState(null, '', '/');
  localStorage.clear?.();
  scrolled = [];
  Element.prototype.scrollIntoView = function scrollIntoView() { scrolled.push(this.id); };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete Element.prototype.scrollIntoView;
});

async function mountBoard(context) {
  const calls = stubFetch(context);
  const view = render(html`<${BoardScreen}/>`);
  await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
  await waitFor(() => expect(view.container.querySelector('#p-budget .bd-bud')).toBeTruthy());
  return { ...view, calls };
}
const panel = (container, id) => container.querySelector('#p-' + id);

describe('layout of the Context section', () => {
  it('comes after Prompts and skills and holds the context panels', () => {
    const ids = DEFAULT_LAYOUT.map(s => s.id);
    expect(ids.indexOf('context')).toBe(ids.indexOf('prompts') + 1);
    expect(DEFAULT_LAYOUT.find(s => s.id === 'context').panels.map(p => p[0])).toEqual(['budget', 'tokenSplit', 'ctxMap', 'memory', 'dailyModels', 'inventory', 'lifetime']);
    expect(DEFAULT_LAYOUT.find(s => s.id === 'prompts').panels.map(p => p[0])).toContain('workflows');
    for (const id of ['budget', 'tokenSplit', 'ctxMap', 'memory', 'dailyModels', 'inventory', 'lifetime', 'workflows']) {
      expect(TITLES[id], id).toBeTruthy();
      expect(PANEL_IDS).toContain(id);
    }
  });
  it('adds the section to a layout stored before it existed', () => {
    const stored = DEFAULT_LAYOUT.filter(s => s.id !== 'context').map(s => ({ id: s.id, open: true, panels: s.panels.filter(p => p[0] !== 'workflows').map(([id, span]) => ({ id, span })) }));
    const out = sanitizeLayout(stored);
    expect(out.find(s => s.id === 'context').panels.map(p => p.id)).toContain('memory');
    expect(out.find(s => s.id === 'prompts').panels.map(p => p.id)).toContain('workflows');
  });
});

describe('normalizeContext and the pure helpers', () => {
  it('fills what an answer leaves out, so no panel can crash', () => {
    const c = normalizeContext({ budget: { tools: [{ tool: 'x' }] }, files: [{ tool: 'x' }], telemetry: [{ tool: 'x' }], memory: null });
    expect(c.budget.tools[0].projects).toEqual([]);
    expect(c.files[0].files).toEqual([]);
    expect(c.telemetry[0].errors).toEqual([]);
    expect(c.memory.entries).toEqual([]);
    expect(c.loaded).toBe(true);
    expect(normalizeContext(null)).toBe(EMPTY_CONTEXT);
  });
  it('builds every context panel from an empty answer', () => {
    const data = normalizeBoard({});
    const ctx = { data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: id => id, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: {} };
    const local = { mode: (k, d) => d, tableView: false, folded: {}, setFold() {} };
    for (const id of ['budget', 'tokenSplit', 'ctxMap', 'memory', 'dailyModels', 'inventory', 'lifetime', 'workflows']) {
      expect(() => buildPanel(id, ctx, local, { id }), id).not.toThrow();
    }
    expect(contextSummary(data)).toBe('n/a');
  });
  it('splits each map row by scope, or by category in the scope view', () => {
    const rows = mapRows(contextFixture().map.rows, 'kind');
    expect(rows.map(r => [r.key, r.tokens, r.files])).toEqual([['instructions', 300_000, 2], ['transcript', 5000, 1], ['skills', 60, 1]]);
    expect(rows[0].segs.map(s => s.key)).toEqual(['global', 'project']);
    expect(mapRows(contextFixture().map.rows, 'scope')[0].segs.map(s => s.key)).toEqual(['instructions']);
  });
  it('keeps small rows visible on the log scale, and a small share above 0', () => {
    expect(logWidth(60, 300_000)).toBeGreaterThan(20);
    expect(logWidth(0, 300_000)).toBe(0);
    expect(fmtWindowShare(0.0004)).toBe('<1%');
    expect(fmtWindowShare(null)).toBe('n/a');
  });
  it('groups memory by source, then profile', () => {
    const g = memoryGroups([...contextFixture().memory.entries, { file: 'b', source: 'claude-auto-memory', profile: 'beta', tokens: 5 }]);
    expect(g).toHaveLength(1);
    expect(g[0].profiles.map(p => [p.profile, p.tokens])).toEqual([['alpha', 120], ['beta', 5]]);
  });
  it('puts a model with no price as an unknown cost, never 0', () => {
    const d = contextFixture().daily;
    const cost = dailySeries(d, 'cost_usd');
    expect(cost.find(s => s.label === 'gpt-5').vals[5]).toBeNull();
    expect(dailySeries(d, 'tokens').find(s => s.label === 'claude-sonnet-5').vals[6]).toBe(165);
  });
});

describe('context panels on the board', () => {
  it('fetches /api/board/context and shows each panel', async () => {
    const { container, calls } = await mountBoard();
    expect(calls.some(u => u.startsWith('/api/board/context'))).toBe(true);
    const budget = panel(container, 'budget').textContent;
    expect(budget).toContain('claude-opus-5, 1.00 M token window');
    expect(budget).toContain('30%');
    expect(budget).toContain('Model not known, 200 k token window (assumed)');
    expect(panel(container, 'tokenSplit').textContent).toContain('300 k sent, 5.0 k never sent');
    expect(panel(container, 'ctxMap').textContent).toContain('Sent to the model 300 k');
    expect(panel(container, 'memory').textContent).toContain('Claude auto memory');
    expect(panel(container, 'memory').querySelector('.bd-chart')).toBeTruthy();
    expect(panel(container, 'dailyModels').textContent).toContain('claude-sonnet-5');
    expect(panel(container, 'dailyModels').querySelector('svg')).toBeTruthy();
    expect(panel(container, 'lifetime').textContent).toContain('Copilot CLI');
    expect(panel(container, 'lifetime').textContent).toContain('2027-01-14');
    expect(panel(container, 'workflows').textContent).toContain('release');
    expect(container.querySelector('.bd-navi[href="#sec-context"]').textContent).toContain('30% of a window, 1 memory file');
  });
  it('unfolds the projects of a tool in the budget', async () => {
    const { container, getByRole } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'Each project (2)' }));
    const t = within(panel(container, 'budget')).getByRole('table');
    expect(t.textContent).toContain('alpha');
    expect(t.textContent).toContain('320 k');
  });
  it('opens the file list of a category from the token split, and a file in it', async () => {
    const { container } = await mountBoard();
    const p = panel(container, 'tokenSplit');
    fireEvent.click(p.querySelector('.bd-splitseg[aria-label*="instructions"]'));
    const list = within(p).getByRole('region', { name: 'Files: Claude Code, instructions' });
    expect(list.textContent).toContain('AGENTS.md');
    expect(list.textContent).not.toContain('s.jsonl');
    fireEvent.click(within(list).getByRole('button', { name: 'AGENTS.md' }));
    await waitFor(() => expect(list.querySelector('.bd-prev strong')?.textContent).toBe('this'));
    fireEvent.click(within(p).getByRole('button', { name: 'Close the file list' }));
    expect(within(p).queryByRole('region', { name: 'Files: Claude Code, instructions' })).toBeNull();
  });
  it('drills into a project on the context map', async () => {
    const { container } = await mountBoard();
    const p = panel(container, 'ctxMap');
    fireEvent.click(within(p).getByRole('button', { name: /^alpha/ }));
    const drill = within(p).getByRole('region', { name: 'Project alpha' });
    expect(drill.textContent).toContain('review');
    fireEvent.click(within(p).getByRole('button', { name: 'Scope' }));
    expect(p.textContent).toContain('By scope');
  });
  it('renders a memory file as Markdown in its preview', async () => {
    const { container, calls } = await mountBoard();
    const p = panel(container, 'memory');
    fireEvent.click(p.querySelector('.bd-mrow'));
    await waitFor(() => expect(p.querySelector('.bd-prev h1')?.textContent).toBe('Notes'));
    expect(p.querySelector('.bd-prev strong').textContent).toBe('this');
    expect(calls.some(u => u === '/api/file?path=' + encodeURIComponent('/home/me/.claude/memory/notes.md'))).toBe(true);
  });
  it('sorts and groups the file inventory', async () => {
    const { container } = await mountBoard();
    const p = panel(container, 'inventory');
    const names = () => [...p.querySelectorAll('tbody tr')].map(tr => tr.querySelector('td').textContent.trim());
    expect(names()[0]).toMatch(/^instructions/);
    expect(names()).toContain('skills1 files');
    fireEvent.click(within(p).getByRole('button', { name: 'No groups' }));
    expect(names()).toEqual(['CLAUDE.md', 'AGENTS.md', 's.jsonl', 'SKILL.md']);
    fireEvent.click(within(p).getByRole('button', { name: 'Tokens' }));
    expect(names()).toEqual(['SKILL.md', 's.jsonl', 'AGENTS.md', 'CLAUDE.md']);
    const recent = [...p.querySelectorAll('tbody tr')].find(tr => tr.textContent.includes('AGENTS.md'));
    expect(recent.querySelector('.bd-st i').getAttribute('style')).toContain('var(--good)');
  });
  it('unfolds the errors a tool reported, newest first', async () => {
    const { container } = await mountBoard();
    const p = panel(container, 'lifetime');
    fireEvent.click(within(p).getByRole('button', { name: '3 errors' }));
    const errs = within(p).getByRole('region', { name: 'Errors Copilot CLI reported' });
    expect(errs.textContent.indexOf('Too many requests')).toBeLessThan(errs.textContent.indexOf('Bad gateway'));
  });
  it('shows a cost that has no price as n/a', async () => {
    const { container } = await mountBoard();
    const row = [...panel(container, 'lifetime').querySelectorAll('tbody tr')].find(tr => tr.textContent.includes('Copilot CLI'));
    expect(row.textContent).toContain('n/a');
    expect(row.textContent).not.toContain('$0.00');
  });
});

describe('command palette', () => {
  it('ranks a label that starts with the query first, and finds by keyword', () => {
    const cmds = [{ id: 'a', label: 'Go to Usage and cost', group: 'Go to' }, { id: 'b', label: 'Usage panel', group: 'X' }, { id: 'c', label: 'Open agent Fix', keywords: 'run00001aaaa' }];
    expect(rankCommands(cmds, 'usage').map(c => c.id)).toEqual(['b', 'a']);
    expect(rankCommands(cmds, 'run0000').map(c => c.id)).toEqual(['c']);
    expect(scoreCommand(cmds[0], 'zzz')).toBe(0);
    expect(rankCommands(cmds, '', ['c'])[0]).toMatchObject({ id: 'c', group: 'Recent' });
  });
  it('lists sections, screens, ranges, tools, agents, display and reset', () => {
    const go = new Proxy({}, { get: () => () => {} });
    const cmds = boardCommands({ sections: [{ id: 'agents', title: 'Agents' }], ranges: [{ id: '1h', label: '1 h' }], rangeId: '1h', tools: [{ id: 't', label: 'Tool T', on: true }], agents: [{ id: 'x1', title: 'Fix it' }, { id: 'p', title: 'proc', placeholder: true }], theme: 'dark', density: 'compact', screen: 'board', go });
    const labels = cmds.map(c => c.label);
    for (const l of ['Go to Agents', 'Settings', 'Settings: By topic', 'Show the last 1 h', 'Hide Tool T', 'Open agent Fix it', 'Theme: Light', 'Row height: Comfortable', 'Reset layout', 'Keyboard shortcuts']) expect(labels).toContain(l);
    expect(labels).not.toContain('Open agent proc');
    const withPanels = boardCommands({ sections: [{ id: 'context', title: 'Context', keywords: 'Agent memory' }], ranges: [], tools: [], agents: [{ id: 'y', title: 'Rename the memo field' }], go });
    expect(rankCommands(withPanels, 'memory')[0].label).toBe('Go to Context');
  });
  it('opens on Cmd+K, filters, runs a command and keeps it first next time', async () => {
    const { findByRole, getByRole, queryByRole } = await mountBoard();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const dlg = await findByRole('dialog', { name: 'Command palette' });
    const input = within(dlg).getByRole('combobox');
    await waitFor(() => expect(document.activeElement).toBe(input));
    fireEvent.input(input, { target: { value: 'usage' } });
    const first = within(dlg).getAllByRole('option')[0];
    expect(first.textContent).toContain('Go to Usage and cost');
    expect(first.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(queryByRole('dialog', { name: 'Command palette' })).toBeNull();
    await waitFor(() => expect(scrolled).toContain('sec-usage'));
    expect(JSON.parse(localStorage.getItem(RECENT_KEY))[0]).toBe('sec:usage');
    fireEvent.click(getByRole('button', { name: 'Open the command palette' }));
    const again = await findByRole('dialog', { name: 'Command palette' });
    expect(within(again).getAllByRole('option')[0].textContent).toContain('Go to Usage and cost');
    expect(within(again).getByRole('group', { name: 'Recent' })).toBeTruthy();
    fireEvent.keyDown(within(again).getByRole('combobox'), { key: 'Escape' });
    expect(queryByRole('dialog', { name: 'Command palette' })).toBeNull();
  });
  it('moves with the arrow keys and opens an agent by name', async () => {
    const { findByRole } = await mountBoard();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const dlg = await findByRole('dialog', { name: 'Command palette' });
    const input = within(dlg).getByRole('combobox');
    fireEvent.input(input, { target: { value: 'open agent' } });
    const opts = within(dlg).getAllByRole('option');
    expect(opts.length).toBeGreaterThan(1);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(within(dlg).getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.input(input, { target: { value: 'fix retry' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await findByRole('heading', { name: 'Fix retry logic' });
  });
});

describe('keyboard shortcuts', () => {
  it('lists the shortcuts on ?', async () => {
    const { findByRole, queryByRole } = await mountBoard();
    fireEvent.keyDown(document, { key: '?', shiftKey: true });
    const dlg = await findByRole('dialog', { name: 'Keyboard shortcuts' });
    for (const k of ['/', 'Cmd/Ctrl+K', 'Esc', '1 to 9', '[ and ]', 's']) expect(dlg.textContent).toContain(k);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByRole('dialog', { name: 'Keyboard shortcuts' })).toBeNull();
  });
  it('jumps to the nth section on a digit, and steps with [ and ]', async () => {
    const { container } = await mountBoard();
    fireEvent.keyDown(document, { key: '4' });
    await waitFor(() => expect(scrolled.at(-1)).toBe('sec-context'));
    fireEvent.keyDown(document, { key: ']' });
    await waitFor(() => expect(scrolled.at(-1)).toBe('sec-tools'));
    fireEvent.keyDown(document, { key: '[' });
    fireEvent.keyDown(document, { key: '[' });
    await waitFor(() => expect(scrolled.at(-1)).toBe('sec-prompts'));
    // A folded section opens when it is jumped to.
    fireEvent.click(container.querySelector('#sec-usage .bd-sect'));
    expect(container.querySelector('#sec-usage .bd-grid')).toBeNull();
    fireEvent.keyDown(document, { key: '2' });
    await waitFor(() => expect(container.querySelector('#sec-usage .bd-grid')).toBeTruthy());
  });
  it('ignores the keys while typing in a field', async () => {
    const { container } = await mountBoard();
    const find = container.querySelector('#bd-find');
    find.focus();
    fireEvent.keyDown(find, { key: '4' });
    fireEvent.keyDown(find, { key: 's' });
    await new Promise(r => setTimeout(r, 10));
    expect(scrolled).not.toContain('sec-context');
    expect(window.location.search).not.toContain('screen=settings');
  });
  it('opens Settings on s', async () => {
    const { findByRole } = await mountBoard();
    fireEvent.keyDown(document, { key: 's' });
    await waitFor(() => expect(window.location.search).toContain('screen=settings'));
    await findByRole('main', { name: 'Settings' });
  });
});
