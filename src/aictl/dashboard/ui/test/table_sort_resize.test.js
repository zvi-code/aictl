// Settings tables and the agent drawer's Events table: a header click sorts, a second click
// reverses, empty values stay last, and a saved column width (aictl.colw.<id>) is applied.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import SettingsWorkspace from '../src/components/settings/SettingsWorkspace.js';
import EventsTab from '../src/components/board/agent/EventsTab.js';
import { sortRows } from '../src/components/settings/tableGrid.js';

if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const HOME = '/home/u';
const PROJ = HOME + '/proj';
const CLAUDE_USER = HOME + '/.claude/settings.json';
const CODEX = HOME + '/.codex/config.toml';
const AGENT_DIR = HOME + '/.claude/agents/';

const row = (key, value, kind, extra = {}) => ({
  key, label: extra.label || key, value, kind, source: extra.source ?? '', danger: false, note: '', scope: 'user', set: true, ...extra,
});
const agentRow = (name, value, agent) => row('agent/' + name, value, 'agent', {
  label: name, source: agent.defined_in,
  agent: { name, description: '', model: '', model_policy: 'optional', effort: '', context_tier: '', tools: [], target: 'claude-code',
    defined_in: '', defined_line: 0, pinned_in: '', pinned_line: 0, inherits: false, scope_defined: 'user', scope_pinned: '', ...agent },
});

const CLAUDE = {
  tool: 'claude-code',
  config_files: [CLAUDE_USER],
  sections: [
    { id: 'model', title: 'Model', rows: [
      row('model', 'opus', 'text', { label: 'Model', source: CLAUDE_USER, tip: 'zeta' }),
      row('effortLevel', 'high', 'text', { label: 'Effort level', source: CLAUDE_USER, tip: 'alpha' }),
    ] },
    { id: 'agents', title: 'Agents', rows: [
      agentRow('reviewer', 'opus', { model: 'opus', effort: 'high', tools: ['Read', 'Grep', 'Bash'], defined_in: AGENT_DIR + 'reviewer.md' }),
      agentRow('planner', 'haiku', { model: 'haiku', defined_in: AGENT_DIR + 'planner.md' }),
      agentRow('helper', 'inherits', { inherits: true, tools: ['Read'], defined_in: AGENT_DIR + 'helper.md' }),
    ] },
    { id: 'autonomy', title: 'Autonomy and safety', rows: [
      row('maxTurns', 30, 'number', { label: 'Max turns', source: CLAUDE_USER }),
      row('maxRequests', 100, 'number', { label: 'Max requests', source: CLAUDE_USER }),
      row('maxIdle', null, 'number', { label: 'Max idle', source: CLAUDE_USER }),
    ] },
  ],
};
const CODEX_CFG = {
  tool: 'codex-cli',
  config_files: [CODEX],
  sections: [
    { id: 'autonomy', title: 'Autonomy and safety', rows: [
      row('maxTurns', 5, 'number', { label: 'Max turns', source: CODEX, scope: 'user' }),
      row('maxRequests', 400, 'number', { label: 'Max requests', source: CODEX, scope: 'user' }),
      row('approval_policy', 'on-request', 'text', { label: 'Approval policy', source: CODEX }),
    ] },
    { id: 'agents', title: 'Agents', rows: [
      agentRow('scout', 'gpt-5', { model: 'gpt-5', tools: ['a', 'b'], target: 'codex-cli', defined_in: HOME + '/.codex/agents/scout.md' }),
    ] },
  ],
};
const SNAP = {
  root: PROJ,
  tools: [{ tool: 'claude-code', label: 'Claude Code', files: [] }, { tool: 'codex-cli', label: 'Codex CLI', files: [] }],
  tool_configs: [CLAUDE, CODEX_CFG],
  live_monitor: { diagnostics: { zeta: { status: 'active', mode: 'push', detail: 'a' }, alpha: { status: 'idle', mode: 'pull', detail: 'b' } }, workspace_paths: [PROJ], state_paths: [] },
};

const file = (name, o = {}) => ({
  path: `${HOME}/.claude/agents/${name}`, name, location: 'tool-home', location_root: HOME + '/.claude', scope: 'user', kind: 'agents',
  tools: ['claude-code'], settings: 0, bytes: 100, mtime: 1000, git_state: 'tracked', exists: true, ...o,
});

let filesResponse;
let auditResponse;
beforeEach(() => {
  try { localStorage.clear(); } catch { /* storage off */ }
  history.replaceState(null, '', '/?screen=settings');
  filesResponse = { status: 200, body: { files: [
    file('a.md', { bytes: 300, mtime: 3000, git_state: 'tracked' }),
    file('b.md', { bytes: 100, mtime: 1000, git_state: 'ignored' }),
    file('c.md', { bytes: 200, mtime: 2000, git_state: '' }),
    file('d.md', { bytes: null, mtime: 0, git_state: 'untracked' }),
    { ...file('AGENTS.md'), path: PROJ + '/AGENTS.md', location: 'project', location_root: PROJ, kind: 'instructions', scope: 'project', bytes: 10 },
  ] } };
  auditResponse = { findings: [
    { rule: 'r', severity: 'low', tool: 'claude-code', path: HOME + '/b.md', line: 2, why: 'beta' },
    { rule: 'r', severity: 'low', tool: 'codex-cli', path: HOME + '/a.md', line: 1, why: 'alpha' },
    { rule: 'r', severity: 'low', tool: 'claude-code', path: HOME + '/c.md', line: 3, why: 'gamma' },
  ], sources: [], effective_models: {}, transcripts_read: 0 };
  globalThis.fetch = vi.fn(async (path) => {
    const p = String(path);
    let res = { status: 200, body: {} };
    if (p.startsWith('/api/settings/files')) res = filesResponse;
    else if (p.startsWith('/api/context-audit')) res = { status: 200, body: auditResponse };
    return { ok: res.status < 400, status: res.status, json: async () => res.body, text: async () => JSON.stringify(res.body) };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function renderAt(search) {
  history.replaceState(null, '', '/?screen=settings&' + search);
  const source = {
    toolConfigs: SNAP.tool_configs, tools: SNAP.tools, monitor: SNAP.live_monitor, root: SNAP.root,
    enabledTools: null, recentFiles: new Map(), openFile: vi.fn(),
    findings: { list: [], audit: auditResponse, loading: false, error: null, scan: null, incomplete: [], failed: [], rescan: vi.fn() },
  };
  return render(html`<${SettingsWorkspace} source=${source}/>`);
}

const head = (root, col) => root.querySelector(`th[data-col="${col}"]`);
const click = (root, col) => fireEvent.click(head(root, col).querySelector('button'));
const sortOf = (root, col) => head(root, col).getAttribute('aria-sort');
const texts = (root, sel) => [...root.querySelectorAll(sel)].map(e => e.textContent.trim());

/** Click a header twice: [order after the 1st click, order after the 2nd]; checks aria-sort and the arrow. */
function twice(root, col, read) {
  click(root, col);
  const first = read();
  const s1 = sortOf(root, col);
  const arrow1 = head(root, col).textContent;
  click(root, col);
  return { first, second: read(), s1, s2: sortOf(root, col), arrow1, arrow2: head(root, col).textContent };
}

describe('sortRows', () => {
  const col = { k: 'v', get: r => r.v };
  const rows = [{ v: 2 }, { v: undefined }, { v: 10 }, { v: '' }, { v: 1 }];
  it('puts empty values last whichever way it sorts', () => {
    expect(sortRows(rows, col, { k: 'v', dir: 'asc' }).map(r => r.v)).toEqual([1, 2, 10, undefined, '']);
    expect(sortRows(rows, col, { k: 'v', dir: 'desc' }).map(r => r.v)).toEqual([10, 2, 1, undefined, '']);
  });
  it('leaves rows alone when another column is the sorted one', () => {
    expect(sortRows(rows, col, { k: 'x', dir: 'asc' })).toBe(rows);
  });
});

describe('By tool settings table (settings.tool)', () => {
  const keys = c => texts(c.querySelector('tbody[data-section="autonomy"]'), '.st-row .st-label');
  it('sorts text low to high, then reverses; empty values stay last', () => {
    const { container } = renderAt('tool=claude-code');
    const t = twice(container, 'setting', () => texts(container.querySelector('tbody[data-section="model"]'), '.st-row .st-label'));
    expect(t.first).toEqual(['Effort level', 'Model']);
    expect(t.second).toEqual(['Model', 'Effort level']);
    expect([t.s1, t.s2]).toEqual(['ascending', 'descending']);
    expect(t.arrow1).toContain('↑');
    expect(t.arrow2).toContain('↓');
    // The Autonomy table holds only numbers in this column: high to low first; a row with no value is last both ways.
    const autonomy = container.querySelector('tbody[data-section="autonomy"]').closest('table');
    const v = twice(autonomy, 'value', () => keys(container));
    expect(v.first).toEqual(['Max requests', 'Max turns', 'Max idle']);
    expect(v.second).toEqual(['Max turns', 'Max requests', 'Max idle']);
    expect([v.s1, v.s2]).toEqual(['descending', 'ascending']);
    // The tables of the tool sort as one: the Model table follows the same column and direction.
    expect(sortOf(container.querySelector('tbody[data-section="model"]').closest('table'), 'value')).toBe('ascending');
  });
  it('sorts by the what-it-does text', () => {
    const { container } = renderAt('tool=claude-code');
    click(container, 'what');
    expect(texts(container.querySelector('tbody[data-section="model"]'), '.st-row .st-label')).toEqual(['Effort level', 'Model']);
  });
  it('applies a saved width', () => {
    localStorage.setItem('aictl.colw.settings.tool', JSON.stringify({ setting: 321, value: 111 }));
    const { container } = renderAt('tool=claude-code');
    const table = head(container, 'setting').closest('table');
    expect(head(container, 'setting').style.width).toBe('321px');
    expect(head(container, 'value').style.width).toBe('111px');
    expect(table.style.tableLayout).toBe('fixed');
    expect(head(container, 'scope').style.width).toBe('');
  });
});

describe('Agents tables (settings.agents, settings.agents.all)', () => {
  const names = c => texts(c.querySelector('table[data-section="agents"]'), 'tbody .st-agentrow .st-label');
  it('sorts by name and model, and by tool count from the most', () => {
    const { container } = renderAt('tool=claude-code&sec=agents');
    const a = twice(container, 'agent', () => names(container));
    expect(a.first).toEqual(['helper', 'planner', 'reviewer']);
    expect(a.second).toEqual(['reviewer', 'planner', 'helper']);
    const m = twice(container, 'model', () => names(container));
    expect(m.first).toEqual(['planner', 'reviewer', 'helper']);
    expect(m.second).toEqual(['reviewer', 'planner', 'helper']);
    const n = twice(container, 'tools', () => names(container));
    expect(n.first).toEqual(['reviewer', 'helper', 'planner']);
    expect(n.second).toEqual(['helper', 'reviewer', 'planner']);
    expect([n.s1, n.s2]).toEqual(['descending', 'ascending']);
  });
  it('applies a saved width', () => {
    localStorage.setItem('aictl.colw.settings.agents', JSON.stringify({ agent: 250 }));
    const { container } = renderAt('tool=claude-code&sec=agents');
    expect(head(container, 'agent').style.width).toBe('250px');
    expect(head(container, 'agent').closest('table').style.tableLayout).toBe('fixed');
  });
  it('sorts every tool\'s agents by tool and agent in By topic', () => {
    const { container } = renderAt('pivot=topic&sec=agents');
    const order = () => texts(container, '.st-agents--all tbody .st-agentrow .st-label');
    expect(order()).toEqual(['helper', 'planner', 'reviewer', 'scout']);
    const a = twice(container, 'agent', order);
    expect(a.first).toEqual(['helper', 'planner', 'reviewer', 'scout']);
    expect(a.second).toEqual(['scout', 'reviewer', 'planner', 'helper']);
    click(container, 'tool');
    click(container, 'tool');
    expect(order()[0]).toBe('scout');
  });
  it('applies a saved width in By topic', () => {
    localStorage.setItem('aictl.colw.settings.agents.all', JSON.stringify({ model: 140 }));
    const { container } = renderAt('pivot=topic&sec=agents');
    expect(head(container, 'model').style.width).toBe('140px');
  });
});

describe('By topic matrix (settings.topic)', () => {
  const labels = c => texts(c.querySelector('table.st-matrix'), 'tbody th[scope="row"]');
  it('sorts rows by the setting name, and by one tool\'s value', () => {
    const { container } = renderAt('pivot=topic&sec=autonomy');
    const s = twice(container, 'setting', () => labels(container));
    expect(s.first).toEqual([...s.first].sort((x, y) => x.localeCompare(y)));
    expect(s.second).toEqual([...s.first].reverse());
    // Codex CLI: Max requests 400, Max turns 5, Approval policy text; the others have no value there.
    // The column mixes numbers and text, so it sorts as text (numbers by value inside it).
    const c = twice(container, 'codex-cli', () => labels(container));
    expect(c.s1).toBe('ascending');
    expect(c.first.slice(0, 3)).toEqual(['Max turns', 'Max requests', 'Approval policy']);
    expect(c.second.slice(0, 3)).toEqual(['Approval policy', 'Max requests', 'Max turns']);
    expect(c.first.at(-1)).toBe(c.second.at(-1));
  });
  it('applies a saved width', () => {
    localStorage.setItem('aictl.colw.settings.topic', JSON.stringify({ 'codex-cli': 200 }));
    const { container } = renderAt('pivot=topic&sec=autonomy');
    expect(head(container, 'codex-cli').style.width).toBe('200px');
  });
});

describe('Permission matrices (settings.perms, settings.perms.all)', () => {
  it('sorts the tools of the By topic matrix by name and by a capability', () => {
    const { container } = renderAt('pivot=topic&sec=autonomy');
    const box = container.querySelector('[data-testid="st-perms-topic"]');
    const tools = () => texts(box, 'tbody th[scope="row"]');
    const t = twice(box, 'tool', tools);
    expect(t.first).toEqual([...t.first].sort((a, b) => a.localeCompare(b)));
    expect(t.second).toEqual([...t.first].reverse());
    click(box, 'shell');
    expect(sortOf(box, 'shell')).toBe('ascending');
    const cells = [...box.querySelectorAll('tbody tr')].map(tr => tr.querySelector('td[data-cap="shell"]').textContent.trim());
    expect(cells).toEqual([...cells].sort((a, b) => a.localeCompare(b)));
  });
  it('applies saved widths; the single-row matrix of one tool resizes but has nothing to sort', () => {
    localStorage.setItem('aictl.colw.settings.perms.all', JSON.stringify({ tool: 130 }));
    const topic = renderAt('pivot=topic&sec=autonomy');
    expect(head(topic.container.querySelector('[data-testid="st-perms-topic"]'), 'tool').style.width).toBe('130px');
    cleanup();
    localStorage.setItem('aictl.colw.settings.perms', JSON.stringify({ shell: 99 }));
    const { container } = renderAt('tool=codex-cli&sec=autonomy');
    const box = container.querySelector('[data-testid="st-perms"]');
    expect(head(box, 'shell').style.width).toBe('99px');
    expect(head(box, 'shell').querySelector('button')).toBeNull();
    expect(head(box, 'shell').querySelector('.bd-colgrip')).toBeTruthy();
  });
});

describe('Files tables (settings.files, settings.files.matrix)', () => {
  const group = c => c.querySelector(`tbody[data-root="${HOME}/.claude"]`);
  const names = c => texts(group(c), '.st-row .st-fname');
  async function loaded(search) {
    const r = renderAt(search);
    await waitFor(() => expect(r.container.textContent).not.toContain('File details are loading'));
    await waitFor(() => expect(group(r.container)).toBeTruthy());
    return r.container;
  }
  it('sorts the files inside each group; size and time start with the largest and newest; empty last', async () => {
    const c = await loaded('pivot=files');
    const n = twice(c, 'file', () => names(c));
    expect(n.first.filter(x => /^[a-d]\.md$/.test(x))).toEqual(['a.md', 'b.md', 'c.md', 'd.md']);
    expect(n.second.filter(x => /^[a-d]\.md$/.test(x))).toEqual(['d.md', 'c.md', 'b.md', 'a.md']);
    const s = twice(c, 'size', () => names(c).filter(x => /^[a-d]\.md$/.test(x)));
    expect(s.first).toEqual(['a.md', 'c.md', 'b.md', 'd.md']);
    expect(s.second).toEqual(['b.md', 'c.md', 'a.md', 'd.md']);
    const m = twice(c, 'changed', () => names(c).filter(x => /^[a-d]\.md$/.test(x)));
    expect(m.first).toEqual(['a.md', 'c.md', 'b.md', 'd.md']);
    expect(m.second).toEqual(['b.md', 'c.md', 'a.md', 'd.md']);
    const g = twice(c, 'git', () => names(c).filter(x => /^[a-d]\.md$/.test(x)));
    expect(g.first).toEqual(['b.md', 'a.md', 'd.md', 'c.md']);
    expect(g.second).toEqual(['d.md', 'a.md', 'b.md', 'c.md']);
  });
  it('keeps the files under their group when a column sorts', async () => {
    const c = await loaded('pivot=files');
    click(c, 'size');
    expect(texts(c.querySelector(`tbody[data-root="${PROJ}"]`), '.st-row .st-fname')).toEqual(['AGENTS.md']);
  });
  it('sorts the purpose by location matrix', async () => {
    const c = await loaded('pivot=files');
    const box = c.querySelector('[data-testid="st-file-matrix"]');
    const rows = () => texts(box, 'tbody th[scope="row"]');
    const p = twice(box, 'purpose', rows);
    expect(p.first).toEqual([...p.first].sort((a, b) => a.localeCompare(b)));
    expect(p.second).toEqual([...p.first].reverse());
  });
  it('applies saved widths', async () => {
    localStorage.setItem('aictl.colw.settings.files', JSON.stringify({ file: 222 }));
    localStorage.setItem('aictl.colw.settings.files.matrix', JSON.stringify({ purpose: 150 }));
    const c = await loaded('pivot=files');
    expect(head(c.querySelector('table.st-files'), 'file').style.width).toBe('222px');
    expect(head(c.querySelector('[data-testid="st-file-matrix"]'), 'purpose').style.width).toBe('150px');
  });
});

describe('Findings table (settings.findings)', () => {
  async function loaded() {
    const r = renderAt('pivot=findings');
    await waitFor(() => expect(r.container.querySelector('tbody[data-rule="r"]')).toBeTruthy());
    return r.container;
  }
  it('sorts the findings inside a rule group', async () => {
    const c = await loaded();
    const where = () => texts(c, 'tbody[data-rule="r"] .st-row .st-c-where');
    const w = twice(c, 'where', where);
    expect(w.first.map(x => x.slice(-4))).toEqual(['a.md', 'b.md', 'c.md'].map(x => x.slice(-4)).map((x, i) => w.first[i].slice(-4)));
    expect(w.first[0]).toContain('a.md');
    expect(w.second[0]).toContain('c.md');
    const what = () => texts(c, 'tbody[data-rule="r"] .st-row .st-c-what');
    const x = twice(c, 'what', what);
    expect(x.first).toEqual(['alpha', 'beta', 'gamma']);
    expect(x.second).toEqual(['gamma', 'beta', 'alpha']);
    const t = twice(c, 'tool', () => texts(c, 'tbody[data-rule="r"] .st-row .st-c-tool'));
    expect(t.first[0]).toBe('Claude Code');
    expect(t.second[0]).toBe('Codex CLI');
  });
  it('leaves the action column (a button per row) unsortable and applies a saved width', async () => {
    localStorage.setItem('aictl.colw.settings.findings', JSON.stringify({ what: 280 }));
    const c = await loaded();
    expect(head(c, 'action').querySelector('button')).toBeNull();
    expect(head(c, 'what').style.width).toBe('280px');
  });
});

describe('aictl collectors table (settings.collectors)', () => {
  it('sorts by name and status, and applies a saved width', () => {
    localStorage.setItem('aictl.colw.settings.collectors', JSON.stringify({ detail: 210 }));
    const { container } = renderAt('tool=aictl');
    expect(head(container, 'detail').style.width).toBe('210px');
    const names = () => texts(container, 'tbody .st-row .st-c-set');
    const n = twice(container, 'collector', names);
    expect(n.first).toEqual(['alpha', 'zeta']);
    expect(n.second).toEqual(['zeta', 'alpha']);
    const s = twice(container, 'status', names);
    expect(s.first).toEqual(['zeta', 'alpha']);
    expect(s.second).toEqual(['alpha', 'zeta']);
  });
});

describe('Agent drawer Events table (agent.events)', () => {
  const NOW = Math.floor(Date.now() / 1000);
  const evs = [
    { ts: NOW - 100, kind: 'hook:b', tool: 'claude-code', detail: { z: 1 } },
    { ts: NOW - 300, kind: 'hook:a', tool: 'codex-cli', detail: { z: 2 } },
    { ts: NOW - 200, kind: '', tool: '', detail: { z: 3 } },
  ];
  const a = { id: 'sess-1', tool: 'claude-code', started_at: NOW - 600, ended_at: NOW - 10 };
  async function mount() {
    globalThis.fetch = vi.fn(async (u) => ({
      ok: true, status: 200,
      json: async () => (String(u).startsWith('/api/events/count') ? { count: 3 } : evs),
      text: async () => '',
    }));
    const r = render(html`<${EventsTab} a=${a} st="ended" ctx=${{ refreshKey: 1, toolName: x => x }}/>`);
    await waitFor(() => expect(r.container.querySelector('.bd-ag-evt tbody tr')).toBeTruthy());
    return r.container;
  }
  const kinds = c => [...c.querySelectorAll('.bd-ag-evt tbody tr:not(.bd-ag-detrow)')].map(r => r.children[1].textContent);
  it('sorts by kind with empty kinds last, and by time from the newest', async () => {
    const c = await mount();
    expect(kinds(c)).toEqual(['hook:b', '', 'hook:a']);
    const k = twice(c, 'kind', () => kinds(c));
    expect(k.first).toEqual(['hook:a', 'hook:b', '']);
    expect(k.second).toEqual(['hook:b', 'hook:a', '']);
    expect([k.s1, k.s2]).toEqual(['ascending', 'descending']);
    const t = twice(c, 'time', () => kinds(c));
    expect(t.first).toEqual(['hook:b', '', 'hook:a']);
    expect(t.second).toEqual(['hook:a', '', 'hook:b']);
    const d = twice(c, 'detail', () => kinds(c));
    expect(d.first).toEqual(['hook:b', 'hook:a', '']);
  });
  it('keeps an opened detail row under its event while sorting', async () => {
    const c = await mount();
    fireEvent.click(c.querySelector('button[aria-label^="Detail of hook:a"]'));
    click(c, 'kind');
    const rows = [...c.querySelectorAll('.bd-ag-evt tbody tr')];
    const at = rows.findIndex(r => r.children[1]?.textContent === 'hook:a');
    expect(rows[at + 1].classList.contains('bd-ag-detrow')).toBe(true);
    click(c, 'kind');
    const rows2 = [...c.querySelectorAll('.bd-ag-evt tbody tr')];
    const at2 = rows2.findIndex(r => r.children[1]?.textContent === 'hook:a');
    expect(rows2[at2 + 1].classList.contains('bd-ag-detrow')).toBe(true);
  });
  it('applies a saved width', async () => {
    localStorage.setItem('aictl.colw.agent.events', JSON.stringify({ kind: 260, detail: 400 }));
    const c = await mount();
    expect(head(c, 'kind').style.width).toBe('260px');
    expect(head(c, 'kind').closest('table').style.tableLayout).toBe('fixed');
  });
});
