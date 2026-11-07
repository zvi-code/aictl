// The Settings screen inside the board: the rail item, the `screen` URL value,
// Back, the file drawer for "Set in", the old `?tab=config` link and the link
// from the "Settings in effect" section.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';

import BoardScreen, { readScreen } from '../src/components/board/BoardScreen.js';
import Root, { redirectOf } from '../src/root.js';
import { NOW, agentDetailFixture, boardFixture, fileDetailFixture } from './fixtures/board.fixture.js';

if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const VS_USER = '/home/u/.config/Code/User/settings.json';
const SETTINGS = {
  generated_at: NOW,
  tools: [{ tool: 'claude-code', label: 'Claude Code' }],
  tool_configs: [{
    tool: 'vscode', config_files: [VS_USER], hints: [],
    sections: [{ id: 'autonomy', title: 'Autonomy and safety', rows: [
      { key: 'chat.tools.global.autoApprove', label: 'Approve every tool call', value: true, kind: 'flag', danger: true, source: VS_USER, scope: 'user', line: 412, note: '' },
      { key: 'chat.agent.maxRequests', label: 'Max requests per turn', value: 100, kind: 'number', source: VS_USER, scope: 'user', line: 20, note: '' },
    ] }],
  }],
  monitor: { diagnostics: { 'otel-receiver': { status: 'active', mode: 'push', detail: 'port 4318' } }, workspace_paths: [], state_paths: [] },
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch() {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith('/api/settings/tools')) return json(SETTINGS);
    if (u.startsWith('/api/settings/files')) return json({ error: 'not found' }, 404);
    if (u.startsWith('/api/board/agent')) return json(agentDetailFixture());
    if (u.startsWith('/api/board/excerpt')) return json({ lines: [{ n: 411, text: '"a": 1,' }, { n: 412, text: '"chat.tools.global.autoApprove": true' }] });
    if (u.startsWith('/api/board/file')) return json(fileDetailFixture(VS_USER));
    if (u.startsWith('/api/board')) return json(boardFixture());
    if (u.startsWith('/api/context-audit')) return json({ findings: [], sources: [], counts: {} });
    return json({});
  }));
  return calls;
}
class FakeES { close() {} }

// The screen loads the workspace and the drawer on demand; load them once here so a
// first transform does not run into a test's wait.
beforeAll(async () => {
  await import('../src/components/settings/SettingsWorkspace.js');
  await import('../src/components/board/Drawer.js');
});

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function mountBoard() {
  const calls = stubFetch();
  const view = render(html`<${BoardScreen}/>`);
  await waitFor(() => expect(view.container.querySelector('#p-agentsT tbody tr')).toBeTruthy());
  return { ...view, calls };
}
const settingsLink = c => c.querySelector('a.bd-navi[href="?screen=settings"]');

describe('the Settings screen in the board', () => {
  it('has a rail item with the settings line, and opens the workspace in the main area', async () => {
    const { container, calls } = await mountBoard();
    const link = settingsLink(container);
    expect(link).toBeTruthy();
    await waitFor(() => expect(link.textContent).toContain('2 set · 1 risky · 0 agents'));
    expect(calls.some(c => c.startsWith('/api/settings/tools'))).toBe(true);
    expect(link.getAttribute('aria-current')).toBeNull();
    fireEvent.click(link);
    await waitFor(() => expect(container.querySelector('#main-area .st-ws')).toBeTruthy());
    expect(new URLSearchParams(window.location.search).get('screen')).toBe('settings');
    expect(settingsLink(container).getAttribute('aria-current')).toBe('page');
    // The board's sections and KPIs give way to the workspace; the bars stay.
    expect(container.querySelector('#p-agentsT')).toBeNull();
    expect(container.querySelector('.bd-kpis')).toBeNull();
    expect(container.querySelector('[aria-label="Filters"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="st-wsnote"]').textContent).toBe('Settings are the current values on this machine; the time range does not apply');
    expect(container.querySelector('.st-row[data-key="chat.tools.global.autoApprove"]')).toBeTruthy();
  });

  it('opens a row\'s "Set in" file in the board drawer, at the line', async () => {
    window.history.replaceState(null, '', '/?screen=settings&tool=vscode');
    const calls = stubFetch();
    const { container, findByRole } = render(html`<${BoardScreen}/>`);
    const row = await waitFor(() => {
      const r = container.querySelector('.st-row[data-key="chat.tools.global.autoApprove"]');
      expect(r).toBeTruthy();
      return r;
    });
    fireEvent.click(row.querySelector('.st-src'));
    await findByRole('heading', { name: VS_USER });
    const drawer = container.querySelector('#drawer');
    expect(within(drawer).getByText('Line 412')).toBeTruthy();
    await waitFor(() => expect(calls.some(c => c.startsWith('/api/board/excerpt') && c.includes('line=412'))).toBe(true));
    await within(drawer).findByText('"chat.tools.global.autoApprove": true');
    // The drawer sits beside the main area, and the workspace keeps its inspector inside it.
    expect(container.querySelector('#main-area .st-insp')).toBeTruthy();
    expect(drawer.closest('#main-area')).toBeNull();
    // The workspace's own URL values stay next to `screen`.
    expect(window.location.search).toContain('screen=settings');
    expect(window.location.search).toContain('tool=vscode');
  });

  it('Back returns to the board, and Forward to the Settings screen', async () => {
    const { container } = await mountBoard();
    fireEvent.click(settingsLink(container));
    await waitFor(() => expect(container.querySelector('.st-ws')).toBeTruthy());
    window.history.back();
    await waitFor(() => expect(container.querySelector('#p-agentsT')).toBeTruthy());
    expect(container.querySelector('.st-ws')).toBeNull();
    expect(readScreen(window.location.search)).toBe('board');
    expect(window.location.search).not.toContain('pivot=');
    window.history.forward();
    await waitFor(() => expect(container.querySelector('.st-ws')).toBeTruthy());
  });

  it('a section link on the Settings screen goes back to the board', async () => {
    const { container } = await mountBoard();
    fireEvent.click(settingsLink(container));
    await waitFor(() => expect(container.querySelector('.st-ws')).toBeTruthy());
    fireEvent.click([...container.querySelectorAll('.bd-navi')].find(a => a.textContent.startsWith('Agents')));
    await waitFor(() => expect(container.querySelector('#p-agentsT')).toBeTruthy());
    expect(window.location.search).not.toContain('screen=');
  });

  it('the "Settings in effect" link opens the Settings screen', async () => {
    const { container, getByRole } = await mountBoard();
    fireEvent.click(getByRole('button', { name: 'Open the Settings screen' }));
    await waitFor(() => expect(container.querySelector('.st-ws')).toBeTruthy());
    expect(window.location.search).toContain('screen=settings');
  });

  it('keeps the screen when a board filter changes', async () => {
    const { container } = await mountBoard();
    fireEvent.click(settingsLink(container));
    await waitFor(() => expect(container.querySelector('.st-ws')).toBeTruthy());
    const projectBtn = container.querySelector('[aria-label="Filters"] .bd-anch:nth-child(2) .bd-ctl');
    fireEvent.click(projectBtn);
    fireEvent.click(container.querySelector('.bd-menu').querySelectorAll('button')[1]);
    expect(window.location.search).toContain('project=alpha');
    expect(window.location.search).toContain('screen=settings');
    expect(container.querySelector('.st-ws')).toBeTruthy();
  });

  it('passes the hook status to the workspace, and reads the settings again after a permissions save', async () => {
    const local = '/home/u/proj/.claude/settings.local.json';
    const rules = { allow: ['Bash'], deny: [], ask: [] };
    const settings = {
      ...SETTINGS,
      tool_configs: [{
        tool: 'claude-code', config_files: [local],
        scopes: [{ id: 'project-local', label: 'Project (local)', path: local, exists: true, changeable: true }],
        sections: [
          { id: 'autonomy', title: 'Autonomy and safety', rows: [{ key: 'permissions', label: 'Permissions', value: rules, kind: 'map', source: local, scope: 'project-local', line: 2, chain: [{ scope: 'project-local', value: rules, source: local, line: 2 }], wins: 0, note: '' }] },
          { id: 'hooks', title: 'Hooks', rows: [{ key: 'hooks', label: 'Hooks', value: 'configured', kind: 'text', source: local, scope: 'project-local', line: 3, note: '' }] },
        ],
      }],
    };
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      const u = String(url);
      calls.push((opts?.method || 'GET') + ' ' + u);
      if (u.startsWith('/api/settings/tools')) return json(settings);
      if (u.startsWith('/api/hooks-status')) return json({ tools: { 'claude-code': { status: 'active', configured_events: ['Stop'], fired_24h: 3, sources: [] } } });
      if (u.startsWith('/api/tool-config/')) {
        return json(opts?.method === 'PUT'
          ? { path: local, exists: true, mtime: 2, permissions: JSON.parse(opts.body).permissions, backup_path: local + '.bak.1' }
          : { path: local, exists: true, mtime: 1, permissions: rules });
      }
      if (u.startsWith('/api/settings/files')) return json({ error: 'not found' }, 404);
      if (u.startsWith('/api/board')) return json(boardFixture());
      if (u.startsWith('/api/context-audit')) return json({ findings: [], sources: [], counts: {} });
      return json({});
    }));
    window.history.replaceState(null, '', '/?screen=settings&tool=claude-code&row=permissions');
    const { container } = render(html`<${BoardScreen}/>`);
    await waitFor(() => expect(container.querySelector('[data-testid="st-hookstat"]')).toBeTruthy());
    expect(calls.filter(c => c.includes('/api/hooks-status'))).toHaveLength(1);
    const reads = () => calls.filter(c => c.startsWith('GET /api/settings/tools')).length;
    const before = reads();
    fireEvent.click([...container.querySelectorAll('.st-insp button')].find(b => b.textContent === 'Change value…'));
    const area = await waitFor(() => {
      const a = container.querySelector('textarea[data-bucket="allow"]');
      expect(a).toBeTruthy();
      return a;
    });
    fireEvent.input(area, { target: { value: 'Bash\nRead(*)' } });
    fireEvent.click([...container.querySelectorAll('[data-testid="st-perm-editor"] button')].find(b => b.textContent === 'Save'));
    await waitFor(() => expect(container.querySelector('[data-testid="st-editor-saved"]')).toBeTruthy());
    await waitFor(() => expect(reads()).toBe(before + 1));
    expect(calls.filter(c => c.includes('/api/hooks-status'))).toHaveLength(1);
  });

  it('has no link to an old screen in the rail', async () => {
    const { container, queryByText } = await mountBoard();
    expect(queryByText('Detail screens')).toBeNull();
    expect(container.querySelector('a[href^="?tab="]')).toBeNull();
  });
});

describe('the old Configuration link', () => {
  it('routes to the board and rewrites the query to the Settings screen', () => {
    expect(redirectOf('?tab=config&pivot=topic')).toBe('?pivot=topic&screen=settings');
    expect(redirectOf('?tab=configuration')).toBe('?screen=settings');
    expect(redirectOf('?tab=explorer')).toBe('');
    expect(redirectOf('')).toBeNull();
  });

  it('opening ?tab=config lands on the Settings screen', async () => {
    window.history.replaceState(null, '', '/?tab=config');
    stubFetch();
    const { container } = render(html`<${Root}/>`);
    expect(window.location.search).toBe('?screen=settings');
    await waitFor(() => expect(container.querySelector('.st-ws')).toBeTruthy(), { timeout: 5000 });
  });
});
