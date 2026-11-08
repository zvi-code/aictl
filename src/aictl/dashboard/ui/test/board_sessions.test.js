// The Sessions panel (search of every past session) and the Artifacts and Commits tabs
// of the agent side panel. Fixtures follow the session-record contract.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import Drawer from '../src/components/board/Drawer.js';
import { DEFAULT_LAYOUT, sanitizeLayout } from '../src/components/board/layout.js';
import { PANEL_IDS, buildPanel } from '../src/components/board/panels.js';
import { SessionsView, sessionsDef } from '../src/components/board/sessionsPanel.js';
import { tableModel } from '../src/components/board/tableModel.js';
import { normalizeAgentDetail } from '../src/components/board/useBoardData.js';

const NOW = 1_800_000_000;

if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const row = (o = {}) => ({
  id: 's1', tool: 'copilot-cli', title: 'Fix the parser', project: '/p/alpha', started_at: NOW - 7200, ended_at: NOW - 3600,
  tokens: 12345, cost_usd: 0.42, tool_calls: 33, prompts: 4, artifacts: 7, commits: 2, match: '', match_text: '', ...o,
});
const ROWS = [
  row(),
  row({ id: 's2', tool: 'claude-code', title: 'Add the report', project: '/p/beta', started_at: NOW - 1000, ended_at: null, tokens: 99, cost_usd: null, tool_calls: 5, prompts: 1, artifacts: 0, commits: 0 }),
  row({ id: 's3', title: 'Zebra work', started_at: NOW - 90000, tokens: 5000, cost_usd: 1.5, tool_calls: 70, prompts: 9, artifacts: 20, commits: 6 }),
];

const stubSessions = (answer = { rows: ROWS, total: ROWS.length }) => {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url) => { calls.push(String(url)); return json(typeof answer === 'function' ? answer(String(url)) : answer); }));
  return calls;
};

const mountView = (over = {}) => {
  const actions = { openDrawer: vi.fn() };
  const ctx = { tools: null, toolName: x => x, actions, ...over };
  return { ...render(html`<${SessionsView} ctx=${ctx}/>`), actions };
};

beforeEach(() => { try { localStorage.clear(); } catch { /* storage blocked */ } });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Sessions section', () => {
  it('comes right after Agents and has one full-width panel', () => {
    const ids = DEFAULT_LAYOUT.map(s => s.id);
    expect(ids[ids.indexOf('agents') + 1]).toBe('sessions');
    expect(DEFAULT_LAYOUT.find(s => s.id === 'sessions').panels).toEqual([['sessionsT', 12]]);
    expect(PANEL_IDS).toContain('sessionsT');
  });

  it('a layout saved before the section existed gains it after Agents', () => {
    const stored = [{ id: 'agents', open: true, panels: [] }, { id: 'usage', open: true, panels: [] }];
    const ids = sanitizeLayout(stored).map(s => s.id);
    expect(ids.indexOf('sessions')).toBe(ids.indexOf('agents') + 1);
  });

  it('says in its subtitle that it covers all time', () => {
    expect(buildPanel('sessionsT', {}, {}, {}).sub).toMatch(/All time/);
  });

  it('renders a row per session with its numbers', async () => {
    stubSessions();
    const { findByText, container } = mountView();
    await findByText('Fix the parser');
    const trs = container.querySelectorAll('tbody tr');
    expect(trs.length).toBe(3);
    expect(container.textContent).toContain('12 k');
    expect(container.querySelector('[role="status"]').textContent).toContain('3 of 3 sessions');
    expect([...container.querySelectorAll('th')].map(t => t.dataset.col)).toEqual(['tool', 'title', 'project', 'started', 'dur', 'tokens', 'cost', 'calls', 'prompts', 'arts', 'commits']);
  });

  it('sorts every column, and a second click reverses', async () => {
    stubSessions();
    const { findByText, container } = mountView();
    await findByText('Fix the parser');
    const titles = () => [...container.querySelectorAll('tbody tr')].map(tr => tr.children[1].textContent);
    for (const th of [...container.querySelectorAll('th')]) {
      const btn = th.querySelector('button');
      expect(btn, th.dataset.col).toBeTruthy();
      fireEvent.click(btn);
      expect(titles().length).toBe(3);
    }
    fireEvent.click(container.querySelector('th[data-col="title"] button'));
    expect(titles()).toEqual(['Add the report', 'Fix the parser', 'Zebra work']);
    fireEvent.click(container.querySelector('th[data-col="title"] button'));
    expect(titles()).toEqual(['Zebra work', 'Fix the parser', 'Add the report']);
    fireEvent.click(container.querySelector('th[data-col="tokens"] button'));
    expect(titles()[0]).toBe('Fix the parser');
  });

  it('every column of the table sorts, also with the Matched in column', () => {
    const rows = ROWS.map(r => ({ ...r, match: 'prompt', match_text: '…the parser…' }));
    for (const q of ['', 'parser']) {
      const m = tableModel(sessionsDef(rows, { q }));
      expect(m.cols.filter(c => !c.sortable).map(c => c.k)).toEqual([]);
      expect(m.cols.some(c => c.k === 'match')).toBe(!!q);
    }
  });

  it('shows the match type and excerpt when a search text is set', () => {
    const m = tableModel(sessionsDef([row({ match: 'artifact', match_text: '…report.md…' })], { q: 'report' }));
    expect(m.rows[0].cells.match.v).toBe('Artifact: …report.md…');
  });

  it('asks the route with the typed text after a pause, and not on every key', async () => {
    const calls = stubSessions();
    const { findByText, getByLabelText } = mountView();
    await findByText('Fix the parser');
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain('/api/board/sessions?q=&');
    const box = getByLabelText('Search all past sessions');
    fireEvent.input(box, { target: { value: 'pa' } });
    fireEvent.input(box, { target: { value: 'pars' } });
    expect(calls.length).toBe(1);
    await waitFor(() => expect(calls.length).toBe(2));
    expect(calls[1]).toContain('q=pars');
    expect(calls[1]).toContain('offset=0');
  });

  it('adds the Matched in column once a text is set', async () => {
    stubSessions(u => (u.includes('q=pars') ? { rows: [row({ match: 'prompt', match_text: '…fix the parser…' })], total: 1 } : { rows: ROWS, total: 3 }));
    const { findByText, getByLabelText, container } = mountView();
    await findByText('Zebra work');
    expect(container.querySelector('th[data-col="match"]')).toBeNull();
    fireEvent.input(getByLabelText('Search all past sessions'), { target: { value: 'pars' } });
    await findByText('Prompt: …fix the parser…');
    expect(container.querySelector('th[data-col="match"]')).toBeTruthy();
  });

  it('passes the Tool filter to the route', async () => {
    const calls = stubSessions();
    const { findByText } = mountView({ tools: ['copilot-cli', 'claude-code'] });
    await findByText('Fix the parser');
    expect(calls[0]).toContain('tool=copilot-cli%2Cclaude-code');
  });

  it('a click on a row opens the agent in the side panel', async () => {
    stubSessions();
    const { findByText, actions } = mountView();
    fireEvent.click(await findByText('Add the report'));
    expect(actions.openDrawer).toHaveBeenCalledWith({ type: 'agent', id: 's2', tab: 'overview' }, true);
  });

  it('shows more with the next offset and keeps the rows it has', async () => {
    const calls = stubSessions(u => (u.includes('offset=3')
      ? { rows: [row({ id: 's4', title: 'Fourth' })], total: 4 }
      : { rows: ROWS, total: 4 }));
    const { findByText, findByRole, container } = mountView();
    await findByText('Fix the parser');
    fireEvent.click(await findByRole('button', { name: /Show 1 more/ }));
    await findByText('Fourth');
    expect(calls.at(-1)).toContain('offset=3');
    expect(container.querySelectorAll('tbody tr').length).toBe(4);
  });

  it('says what went wrong when the server has no route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    const { findByText } = mountView();
    await findByText(/does not have session search yet/);
  });
});

const art = (o = {}) => ({
  path: '/h/.copilot/session-state/s1/research/notes.md', name: 'notes.md', ext: 'md', kind: 'session-folder', folder: 'research',
  size_bytes: 2048, mtime: NOW - 100, exists: true, writes: 0, first_ts: null, last_ts: null, viewable: true, ...o,
});
const agentDetail = (over = {}) => ({
  agent: { id: 's1', title: 'Fix the parser', parent_id: null, status: 'ended', tool: 'copilot-cli', project: '/p/alpha', models: [], started_at: NOW - 600, ended_at: NOW - 60 },
  by_model: [], subagents: [], process: {}, turns: [], tool_calls: [], tool_totals: [], files: [], tests: [], errors: [], ...over,
});

function mountDrawer(detail, tab, extra = () => null) {
  const fn = vi.fn(async (url) => {
    const u = String(url);
    const custom = extra(u);
    if (custom) return custom;
    if (u.startsWith('/api/board/agent?')) return json(detail);
    return json({});
  });
  vi.stubGlobal('fetch', fn);
  const act = { openDrawer: vi.fn(), setDrawerTab: vi.fn(), drawerBack: vi.fn(), drawerClose: vi.fn(), copy: vi.fn(), stopAgent: vi.fn() };
  const ctx = { data: { agents: [], capture_mode: 'full' }, stopped: {}, toolName: x => x, refreshKey: 1, query: '' };
  return { ...render(html`<${Drawer} stack=${[{ type: 'agent', id: 's1', tab }]} ctx=${ctx} act=${act}/>`), act, fn };
}

describe('Artifacts tab', () => {
  const list = [
    art(),
    art({ path: '/h/out/report.csv', name: 'report.csv', ext: 'csv', kind: 'written', folder: '', writes: 3, size_bytes: 10, viewable: false }),
    art({ path: '/h/gone.md', name: 'gone.md', ext: 'md', kind: 'written', folder: '', exists: false, size_bytes: null, mtime: null, viewable: false, writes: 1 }),
  ];
  const detail = () => agentDetail({ artifacts: list, artifacts_total: 120, artifacts_bytes: 987654 });

  it('lists the files with name, where, type, size, exists and writes, and shows the cap', async () => {
    const { findByText, container } = mountDrawer(detail(), 'artifacts');
    await findByText('notes.md');
    const heads = [...container.querySelectorAll('th')].map(t => t.dataset.col);
    expect(heads).toEqual(['name', 'where', 'ext', 'size', 'mtime', 'exists', 'writes']);
    expect(container.querySelector('td[title="/h/.copilot/session-state/s1/research/notes.md"]')).toBeTruthy();
    expect(container.textContent).toContain('research');
    expect(container.textContent).toContain('Written');
    expect(container.textContent).toContain('Missing');
    expect(container.textContent).toContain('Showing 3 of 120 artifacts');
    expect(container.textContent).toContain('120');
    expect(container.textContent).toContain('988 KB');
  });

  it('filters by text', async () => {
    const { findByText, getByLabelText, container } = mountDrawer(detail(), 'artifacts');
    await findByText('notes.md');
    fireEvent.input(getByLabelText('Filter artifacts by text'), { target: { value: 'csv' } });
    expect([...container.querySelectorAll('tbody tr')].length).toBe(1);
  });

  it('reads a viewable file live from /api/file', async () => {
    const { findByText, fn } = mountDrawer(detail(), 'artifacts', u => (u.startsWith('/api/file?path=') ? new Response('# Notes body', { status: 200 }) : null));
    fireEvent.click(await findByText('notes.md'));
    await waitFor(() => expect(fn.mock.calls.some(c => String(c[0]) === '/api/file?path=' + encodeURIComponent('/h/.copilot/session-state/s1/research/notes.md'))).toBe(true));
    await findByText('Notes body');
  });

  it('gives the reason and Copy path for a file that is not viewable or missing', async () => {
    const { findByText, findByRole, act } = mountDrawer(detail(), 'artifacts');
    fireEvent.click(await findByText('gone.md'));
    await findByText(/no longer on disk/);
    fireEvent.click(await findByRole('button', { name: 'Copy path' }));
    expect(act.copy).toHaveBeenCalledWith('/h/gone.md', expect.any(String));
    fireEvent.click(await findByText('report.csv'));
    await findByText(/cannot show this file as text/);
  });

  it('sorts every column', async () => {
    const { findByText, container } = mountDrawer(detail(), 'artifacts');
    await findByText('notes.md');
    for (const th of [...container.querySelectorAll('th')]) expect(th.querySelector('button'), th.dataset.col).toBeTruthy();
  });
});

describe('Commits tab', () => {
  const commits = [
    { sha: 'a'.repeat(40), short_sha: 'aaaaaaa', subject: 'Fix the tokenizer', author_name: 'Ada', ts: NOW - 500, prs: [{ number: 12, url: 'https://github.com/o/r/pull/12', title: 'Tokenizer fix', state: 'MERGED' }] },
    { sha: 'b'.repeat(40), short_sha: 'bbbbbbb', subject: 'Side work', author_name: 'Bob', ts: NOW - 400, prs: [] },
  ];

  it('shows sha, subject, author, time and the pull requests as links', async () => {
    const { findByText, container } = mountDrawer(agentDetail({ commits, prs_note: '' }), 'commits');
    await findByText('Fix the tokenizer');
    const link = container.querySelector('a[href="https://github.com/o/r/pull/12"]');
    expect(link.textContent).toContain('#12 Tokenizer fix (merged)');
    expect(container.textContent).toContain('aaaaaaa');
    expect(container.textContent).toContain('Ada');
    expect(container.textContent).not.toContain('Pull requests are missing');
  });

  it('shows why pull requests are missing', async () => {
    const { findByText } = mountDrawer(agentDetail({ commits, prs_note: 'gh not installed' }), 'commits');
    await findByText('Pull requests are missing: gh not installed');
  });
});

describe('Overview stats', () => {
  it('counts artifacts and commits on their tabs, and keeps the strip to the six session totals', async () => {
    const d = agentDetail({ artifacts: [art()], artifacts_total: 7, artifacts_bytes: 4096, commits: [{ sha: 'c', short_sha: 'c', subject: 's', author_name: 'x', ts: 1, prs: [{ number: 1, url: 'u', title: 't', state: 'OPEN' }] }] });
    const { findByRole, getAllByRole, container } = mountDrawer(d, 'overview');
    const strip = await findByRole('group', { name: 'Totals' });
    expect([...strip.querySelectorAll('.bd-l')].map(x => x.textContent)).toEqual(['Tokens', 'Cost', 'Time', 'Messages', 'Tool calls']);
    const tab = name => getAllByRole('tab').find(t => t.textContent.startsWith(name)).textContent;
    await waitFor(() => expect(tab('Artifacts')).toBe('Artifacts 7'));
    expect(tab('Commits')).toBe('Commits 1');
    expect(container.querySelector('.bd-drkpis').textContent).not.toContain('Commits');
  });
});

describe('an older server without the new fields', () => {
  it('normalizes to empty lists', () => {
    const n = normalizeAgentDetail({ agent: { id: 'x' } });
    expect(n.artifacts).toEqual([]);
    expect(n.commits).toEqual([]);
    expect(n.artifacts_total).toBe(0);
    expect(n.prs_note).toBe('');
  });

  it('renders the Overview, Artifacts and Commits tabs without a crash', async () => {
    for (const [tab, text] of [['overview', 'Usage by model'], ['artifacts', 'No artifact is stored for this session.'], ['commits', 'No commit is stored for this session.']]) {
      const { findByText, unmount } = mountDrawer(agentDetail(), tab);
      await findByText(text);
      unmount();
    }
  });
});

describe('Files that can affect a session', () => {
  it('lists the files of the session folder, and opens one', async () => {
    const files = { git_root: '/r/app', read: true, total: 2, files: [{ path: '/r/app/AGENTS.md', name: 'AGENTS.md' }, { path: '/r/app/src/AGENTS.md', name: 'AGENTS.md' }] };
    const { findByText, container, act } = mountDrawer(agentDetail({ context_files: files }), 'overview');
    await findByText('2 files in 2 folders of /r/app apply to the session folder');
    const chip = container.querySelector('button[title="/r/app/src/AGENTS.md"]');
    expect(chip.textContent).toBe('AGENTS.md');
    fireEvent.click(chip);
    expect(act.openDrawer).toHaveBeenCalledWith({ type: 'file', path: '/r/app/src/AGENTS.md' });
  });

  it('shows each folder once, relative to the repository root, with its files as chips', async () => {
    const files = { git_root: '/r/app/', read: true, total: 3, files: [{ path: '/r/app/src/b.md', name: 'b.md' }, { path: '/r/app/AGENTS.md', name: 'AGENTS.md' }, { path: '/r/app/src/a.md', name: 'a.md' }] };
    const { findByText, container } = mountDrawer(agentDetail({ context_files: files }), 'overview');
    await findByText('3 files in 2 folders of /r/app/ apply to the session folder');
    const groups = [...container.querySelectorAll('#dr-actxf .bd-fgrp')];
    expect(groups.map(g => g.querySelector('.bd-fdir').textContent)).toEqual(['/repository root · 1 file', 'src/2 files']);
    expect(groups.map(g => [...g.querySelectorAll('.bd-fchip')].map(c => c.textContent))).toEqual([['AGENTS.md'], ['a.md', 'b.md']]);
    expect(groups[1].querySelector('.bd-fdir').getAttribute('title')).toBe('/r/app/src/');
    expect(container.querySelector('#dr-actxf .bd-fq')).toBeNull();
  });

  it('offers a filter from nine files on, and narrows the groups by name or folder', async () => {
    const list = Array.from({ length: 9 }, (_, i) => ({ path: '/r/app/' + (i < 5 ? 'a/' : 'b/') + 'f' + i + '.md', name: 'f' + i + '.md' }));
    const files = { git_root: '/r/app', read: true, total: 9, files: list };
    const { findByText, container } = mountDrawer(agentDetail({ context_files: files }), 'overview');
    await findByText('9 files in 2 folders of /r/app apply to the session folder');
    const q = container.querySelector('#dr-actxf .bd-fq');
    fireEvent.input(q, { target: { value: 'f7' } });
    expect([...container.querySelectorAll('#dr-actxf .bd-fchip')].map(c => c.textContent)).toEqual(['f7.md']);
    expect(container.querySelectorAll('#dr-actxf .bd-fgrp').length).toBe(1);
    fireEvent.input(q, { target: { value: 'nothing' } });
    expect(container.querySelector('#dr-actxf .bd-empty').textContent).toBe('No file matches.');
  });

  it('says the total when more files apply than are listed', async () => {
    const files = { git_root: '/r/app', read: true, total: 500, files: [{ path: '/r/app/AGENTS.md', name: 'AGENTS.md' }] };
    const { findByText } = mountDrawer(agentDetail({ context_files: files }), 'overview');
    await findByText('500 files in 1 folder of /r/app apply to the session folder, 1 listed');
  });

  it('says why when the repository is not read yet', async () => {
    const { findByText } = mountDrawer(agentDetail({ context_files: { git_root: '/r/app', read: false, total: 0, files: [] } }), 'overview');
    await findByText(/has not read this repository yet/);
  });
});
