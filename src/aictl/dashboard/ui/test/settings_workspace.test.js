// Settings workspace: the four pivots, the inspector, search, the scope
// fallback for rows without `scope`, and opening a file at a line. The workspace
// reads a `source` prop that the board builds.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import SettingsWorkspace from '../src/components/settings/SettingsWorkspace.js';
import axe from 'axe-core';
import {
  deriveScope, deriveLocation, readSettingsUrl, rowChain, toolEntries, whyWins, getSections, SECTION_ORDER,
} from '../src/components/settings/model.js';
import { derivePermissions, permissionEdit } from '../src/components/settings/permissions.js';

const HOME = '/home/u';
const PROJ = HOME + '/proj';
const VS_USER = HOME + '/.config/Code/User/settings.json';
const VS_WS = PROJ + '/.vscode/settings.json';
const CLAUDE_USER = HOME + '/.claude/settings.json';
const CLAUDE_PROJ = PROJ + '/.claude/settings.json';
const CODEX = HOME + '/.codex/config.toml';

const row = (key, value, kind, extra = {}) => ({
  key, label: extra.label || key, value, kind, source: extra.source ?? '', danger: !!extra.danger, note: extra.note || '', ...extra,
});

const VSCODE = {
  tool: 'vscode',
  config_files: [VS_USER, VS_WS],
  hints: [],
  sections: [
    { id: 'telemetry', title: 'Telemetry', rows: [
      row('github.copilot.chat.otel.exporterType', 'otlp-http', 'text', { label: 'Exporter', source: VS_USER, scope: 'user', line: 30 }),
    ] },
    { id: 'autonomy', title: 'Autonomy and safety', rows: [
      row('chat.tools.global.autoApprove', true, 'flag', {
        label: 'Approve every tool call', danger: true, note: 'Every tool call runs without asking.',
        source: VS_USER, scope: 'user', line: 412,
        chain: [
          { scope: 'default', value: false, source: '', line: 0 },
          { scope: 'user', value: true, source: VS_USER, line: 412 },
          { scope: 'workspace', source: VS_WS, line: 0, set: false },
          { scope: 'policy', set: false, source: '', line: 0 },
        ],
        wins: 1,
      }),
      row('chat.tools.terminal.sandbox.enabled', false, 'flag', {
        label: 'Terminal sandbox', danger: true, note: 'Terminal commands run outside the sandbox.', source: VS_WS, scope: 'workspace', line: 7,
      }),
      row('chat.agent.maxRequests', 100, 'number', { label: 'Max requests per turn', source: VS_USER, scope: 'user', line: 20 }),
    ] },
  ],
};

const CLAUDE = {
  tool: 'claude-code',
  config_files: [CLAUDE_USER, CLAUDE_PROJ],
  hints: ['Managed settings were not found.'],
  // No row has scope, line or chain: the screen derives them.
  sections: [
    { id: 'model', title: 'Model', rows: [row('model', 'opus', 'text', { label: 'Model', source: CLAUDE_USER })] },
    { id: 'autonomy', title: 'Autonomy and safety', rows: [
      row('permissions.defaultMode', 'plan', 'text', { label: 'Default mode', source: CLAUDE_PROJ }),
      row('autoUpdates', true, 'flag', { label: 'Max requests per turn', source: '' }),
    ] },
    { id: 'mcp', title: 'MCP servers', rows: [row('mcpServers', ['a', 'b', 'c'], 'list', { label: 'Servers', source: CLAUDE_USER })] },
  ],
};

const CODEX_CFG = {
  tool: 'codex-cli',
  config_files: [CODEX],
  sections: [
    { id: 'autonomy', title: 'Autonomy and safety', rows: [row('approval_policy', 'on-request', 'text', { label: 'Approval policy', source: CODEX })] },
  ],
};

const SNAP = {
  root: PROJ,
  tools: [
    { tool: 'claude-code', label: 'Claude Code', files: [] },
    { tool: 'codex-cli', label: 'Codex CLI', files: [] },
  ],
  tool_configs: [VSCODE, CLAUDE, CODEX_CFG],
  live_monitor: { diagnostics: { 'otel-receiver': { status: 'active', mode: 'push', detail: 'port 4318' } }, workspace_paths: [PROJ], state_paths: [] },
};

let filesResponse;
let auditResponse;
beforeEach(() => {
  history.replaceState(null, '', '/?screen=settings');
  filesResponse = { status: 404, body: { error: 'not found' } };
  auditResponse = { findings: [], sources: [], effective_models: {}, transcripts_read: 0 };
  globalThis.fetch = vi.fn(async (path) => {
    const p = String(path);
    let res = { status: 200, body: {} };
    if (p.startsWith('/api/settings/files')) res = filesResponse;
    else if (p.startsWith('/api/context-audit')) res = { status: 200, body: auditResponse };
    return { ok: res.status < 400, status: res.status, json: async () => res.body, text: async () => JSON.stringify(res.body) };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

/** A settings source as the board gives it: records, names, a file opener and the board's findings. */
function makeSource({ snap = SNAP, openFile = vi.fn(), enabledTools = null, findings } = {}) {
  return {
    toolConfigs: snap.tool_configs, tools: snap.tools, monitor: snap.live_monitor, root: snap.root,
    enabledTools, recentFiles: new Map(), openFile,
    findings: findings || { list: [], audit: auditResponse, loading: false, error: null, scan: null, incomplete: [], failed: [], rescan: vi.fn() },
  };
}

function renderAt(search, opts = {}) {
  history.replaceState(null, '', '/?screen=settings' + (search ? '&' + search : ''));
  const source = makeSource(opts);
  const r = render(html`<${SettingsWorkspace} source=${source}/>`);
  return { ...r, openFile: source.openFile, source };
}

const rowByKey = (c, key) => c.querySelector(`.st-row[data-key="${key}"]`);

describe('By tool', () => {
  it('renders the section groups and rows with a scope chip and the set-in file and line', () => {
    const { container } = renderAt('tool=vscode');
    const groups = [...container.querySelectorAll('.st-group')].map(g => g.textContent);
    expect(groups[0]).toContain('Telemetry');
    expect(groups[1]).toContain('Autonomy and safety');
    const r = rowByKey(container, 'chat.agent.maxRequests');
    expect(r.querySelector('.st-scope').textContent).toBe('user');
    expect(r.querySelector('.st-src').textContent).toBe('settings.json:20');
    expect(r.querySelector('.st-src').getAttribute('title')).toBe(VS_USER + ':20');
    expect(container.textContent).toContain('used by every AI tool in VS Code');
    // The exporter is a text setting with a few options: a select box.
    expect(rowByKey(container, 'github.copilot.chat.otel.exporterType').querySelector('.st-select').textContent).toBe('otlp-http');
  });

  it('marks a risky row red, and the inspector shows the override chain with the winner', () => {
    const { container } = renderAt('tool=vscode');
    const r = rowByKey(container, 'chat.tools.global.autoApprove');
    expect(r.classList.contains('st-row--risky')).toBe(true);
    expect(r.querySelector('.st-flag').classList.contains('is-risky')).toBe(true);
    expect(r.textContent).toContain('Every tool call runs without asking.');
    // A danger flag that is off (the sandbox) is red too.
    const sandbox = rowByKey(container, 'chat.tools.terminal.sandbox.enabled');
    expect(sandbox.classList.contains('st-row--risky')).toBe(true);
    expect(sandbox.querySelector('.st-flag__text').textContent).toBe('off');

    fireEvent.click(r);
    const insp = container.querySelector('[data-testid="st-inspector-row"]');
    expect(insp).toBeTruthy();
    expect(insp.textContent).toContain('chat.tools.global.autoApprove');
    const levels = insp.querySelectorAll('.st-chain__lv');
    expect(levels.length).toBe(4);
    const win = insp.querySelector('.st-chain__lv.is-win');
    expect(win.textContent).toContain('user');
    expect(win.textContent).toContain('settings.json:412');
    expect(levels[2].textContent).toContain('not set');
    expect(insp.textContent).toContain('The user file wins because no workspace or policy value is set.');
    expect(insp.textContent).toContain('Change value');
    expect(insp.querySelector('.st-btn--primary').disabled).toBe(true);
    expect(window.location.search).toContain('row=chat.tools.global.autoApprove');
  });

  it('lists the aictl engine last, with its collectors', () => {
    const { container } = renderAt('');
    const items = [...container.querySelectorAll('.st-nav__item')].map(b => b.dataset.tool);
    expect(items[items.length - 1]).toBe('aictl');
    fireEvent.click(container.querySelector('.st-nav__item[data-tool="aictl"]'));
    expect(container.textContent).toContain('otel-receiver');
    expect(container.textContent).toContain('Monitored roots');
  });
});

describe('By topic', () => {
  it('has one column per tool with rows in the section, and a dash where a tool has no such row', () => {
    const { container } = renderAt('pivot=topic&sec=autonomy');
    const cols = [...container.querySelectorAll('.st-matrix__tool')].map(th => th.dataset.tool);
    expect(cols.sort()).toEqual(['claude-code', 'codex-cli', 'vscode']);
    expect(container.querySelectorAll('.st-cell--none').length).toBeGreaterThan(0);
    // Rows with the same label merge across tools.
    const merged = [...container.querySelectorAll('.st-matrix tbody tr')].find(tr => tr.textContent.startsWith('Max requests per turn'));
    expect(merged.querySelectorAll('.st-cellbtn').length).toBe(2);
    // A risky cell is red.
    const risky = container.querySelector('.st-cellbtn[data-key="chat.tools.global.autoApprove"]').closest('td');
    expect(risky.classList.contains('is-risky')).toBe(true);
  });

  it('selects the tool row in the inspector when a cell is clicked', () => {
    const { container } = renderAt('pivot=topic&sec=autonomy');
    fireEvent.click(container.querySelector('.st-cellbtn[data-key="approval_policy"]'));
    const insp = container.querySelector('[data-testid="st-inspector-row"]');
    expect(insp.textContent).toContain('Approval policy');
    expect(insp.textContent).toContain('Codex CLI');
    expect(window.location.search).toContain('tool=codex-cli');
  });
});

describe('Files', () => {
  it('groups by location and folds a group past 8 files', async () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      path: `${HOME}/.claude/agents/a${i}.md`, name: `a${i}.md`, location: 'tool-home', location_root: HOME + '/.claude',
      scope: 'user', kind: 'agents', tools: ['claude-code'], settings: 0, bytes: 100, mtime: 0, git_state: 'not tracked', exists: true,
    }));
    filesResponse = { status: 200, body: { files: [
      ...many,
      { path: PROJ + '/AGENTS.md', name: 'AGENTS.md', location: 'project', location_root: PROJ, scope: 'project', kind: 'instructions', tools: ['claude-code', 'codex-cli'], settings: 0, bytes: 10, mtime: 0, git_state: 'ignored', exists: true },
    ] } };
    const { container, getByText } = renderAt('pivot=files');
    await waitFor(() => expect(container.textContent).not.toContain('File details are loading'));
    const group = container.querySelector(`tbody[data-root="${HOME}/.claude"]`);
    // 11 agent files plus settings.json from the Claude record: 12. settings.json sits in the
    // group's own folder; the agents folder is one sub-header, and its 11 files fold past 8.
    expect(group.querySelectorAll('.st-row').length).toBe(9);
    expect([...group.querySelectorAll('.st-folder')].map(r => r.dataset.dir)).toEqual([HOME + '/.claude/agents']);
    expect(group.querySelector('.st-folder').textContent).toContain('~/.claude/agents');
    expect(group.querySelector('.st-group').textContent).toContain('12 files');
    expect(group.textContent).toContain('3 more');
    fireEvent.click(getByText(/3 more/));
    expect(container.querySelector(`tbody[data-root="${HOME}/.claude"]`).querySelectorAll('.st-row').length).toBe(12);
    // Location groups in the navigator.
    expect(container.querySelector('.st-nav__item[data-loc="tool-home"]').textContent).toContain('13');
    expect(container.querySelector('.st-nav__item[data-loc="project"]').textContent).toMatch(/3$/);
    // Selecting a file fills the inspector with the settings read from it.
    fireEvent.click(container.querySelector(`.st-row[data-path="${CLAUDE_USER}"]`));
    const insp = container.querySelector('[data-testid="st-inspector-file"]');
    expect(insp.textContent).toContain('Model');
    expect(insp.textContent).toContain('Servers');
  });

  const FILES = [
    { path: PROJ + '/AGENTS.md', name: 'AGENTS.md', location: 'project', location_root: PROJ, scope: 'project', kind: 'instructions', tools: ['claude-code', 'codex-cli'], settings: 0, bytes: 2048, mtime: 0, git_state: 'untracked', loading: 'always', exists: true },
    { path: PROJ + '/.claude/agents/rev.md', name: 'rev.md', location: 'project', location_root: PROJ, scope: 'project', kind: 'agents', tools: ['claude-code'], settings: 0, bytes: 10, mtime: 0, git_state: 'tracked', exists: true },
    { path: HOME + '/.claude/skills/t/SKILL.md', name: 'SKILL.md', location: 'tool-home', location_root: HOME + '/.claude', scope: 'user', kind: 'skills', tools: ['claude-code'], settings: 0, bytes: 10, mtime: Date.now() / 1000 - 600, git_state: 'outside-repo', exists: true },
    { path: HOME + '/.codex/prompts', name: 'prompts', location: 'tool-home', location_root: HOME + '/.codex', scope: 'user', kind: 'other', tools: ['codex-cli'], settings: 0, bytes: 0, mtime: 0, git_state: 'outside-repo', exists: true, is_dir: true },
  ];

  it('switches the tree to purpose groups, and keeps the choice in the URL', async () => {
    filesResponse = { status: 200, body: { files: FILES } };
    const { container, getByText } = renderAt('pivot=files');
    await waitFor(() => expect(container.textContent).not.toContain('File details are loading'));
    fireEvent.click(getByText('By purpose'));
    expect(new URLSearchParams(window.location.search).get('group')).toBe('purpose');
    const purposes = [...container.querySelectorAll('tbody[data-purpose]')].map(t => t.dataset.purpose);
    expect(purposes).toEqual(['settings', 'instructions', 'agents', 'skills']);
    // Each folder once, under its purpose.
    const instr = container.querySelector('tbody[data-purpose="instructions"]');
    expect(instr.querySelector('.st-folder').dataset.dir).toBe(PROJ);
    expect(instr.querySelector('.st-group').textContent).toContain('2KB');
    expect(instr.querySelectorAll('.st-group .st-toolchip').length).toBe(2);
    // An always-loaded file that git does not track is in the warn tone.
    expect(container.querySelector(`.st-row[data-path="${PROJ}/AGENTS.md"] [data-git]`).classList.contains('st-warn')).toBe(true);
    expect(container.querySelector(`.st-row[data-path="${PROJ}/.claude/agents/rev.md"] [data-git]`).classList.contains('st-warn')).toBe(false);
    fireEvent.click(getByText('By location'));
    expect(new URLSearchParams(window.location.search).get('group')).toBeNull();
    expect(container.querySelector('tbody[data-purpose]')).toBeNull();
  });

  it('lists watched folders in their own group at the end, before absent managed locations', async () => {
    filesResponse = { status: 200, body: { files: FILES } };
    for (const search of ['pivot=files', 'pivot=files&group=purpose']) {
      const { container, unmount } = renderAt(search);
      await waitFor(() => expect(container.textContent).not.toContain('File details are loading'));
      const groups = [...container.querySelectorAll('tbody[data-root], tbody[data-purpose]')];
      const watched = groups[groups.length - 1];
      expect(watched.dataset.root).toBe('watched');
      expect(watched.textContent).toContain('Watched folders');
      expect([...watched.querySelectorAll('.st-row')].map(r => r.dataset.path)).toEqual([HOME + '/.codex/prompts']);
      // A folder is in no other group.
      expect(groups.slice(0, -1).some(g => g.querySelector(`.st-row[data-path="${HOME}/.codex/prompts"]`))).toBe(false);
      unmount();
    }
  });

  it('a summary cell filters the tree to its purpose and location, and a second click clears it', async () => {
    filesResponse = { status: 200, body: { files: FILES } };
    const { container } = renderAt('pivot=files');
    await waitFor(() => expect(container.textContent).not.toContain('File details are loading'));
    const cell = () => container.querySelector('[data-testid="st-file-matrix"] [data-cell="instructions:project"]');
    expect(cell().textContent).toBe('1');
    // Watched folders are not counted in the summary.
    expect(container.querySelector('[data-cell="other:tool-home"]')).toBeNull();
    fireEvent.click(cell());
    expect(cell().getAttribute('aria-pressed')).toBe('true');
    expect(cell().closest('td').classList.contains('is-sel')).toBe(true);
    expect(new URLSearchParams(window.location.search).get('cell')).toBe('instructions:project');
    expect([...container.querySelectorAll('.st-files .st-row')].map(r => r.dataset.path)).toEqual([PROJ + '/AGENTS.md']);
    expect(container.querySelector('[data-testid="st-file-chips"]').textContent).toContain('Instructions in This project');
    fireEvent.click(cell());
    expect(cell().getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelectorAll('.st-files .st-row').length).toBeGreaterThan(1);
  });

  it('a Read by filter hides the files no selected tool reads; its chip removes it', async () => {
    filesResponse = { status: 200, body: { files: FILES } };
    const { container } = renderAt('pivot=files');
    await waitFor(() => expect(container.textContent).not.toContain('File details are loading'));
    fireEvent.click(container.querySelector('.st-nav__item[data-tool="codex-cli"]'));
    expect(new URLSearchParams(window.location.search).get('tool')).toBe('codex-cli');
    const paths = [...container.querySelectorAll('.st-files .st-row')].map(r => r.dataset.path);
    expect(paths).toContain(PROJ + '/AGENTS.md');
    expect(paths).toContain(CODEX);
    expect(paths).not.toContain(PROJ + '/.claude/agents/rev.md');
    expect(paths).not.toContain(CLAUDE_USER);
    // Multi-select: a second tool adds its files.
    fireEvent.click(container.querySelector('.st-nav__item[data-tool="claude-code"]'));
    expect(new URLSearchParams(window.location.search).get('tool')).toBe('codex-cli,claude-code');
    expect([...container.querySelectorAll('.st-files .st-row')].map(r => r.dataset.path)).toContain(CLAUDE_USER);
    fireEvent.click(container.querySelector('[data-chip="tool:claude-code"]'));
    fireEvent.click(container.querySelector('[data-chip="tool:codex-cli"]'));
    expect(container.querySelector('[data-testid="st-file-chips"]')).toBeNull();
    expect(new URLSearchParams(window.location.search).get('tool')).toBeNull();
  });

  it('filters by purpose, scope, git and recent change, with counts', async () => {
    filesResponse = { status: 200, body: { files: FILES } };
    const { container } = renderAt('pivot=files');
    await waitFor(() => expect(container.textContent).not.toContain('File details are loading'));
    const rows = () => [...container.querySelectorAll('.st-files .st-row')].map(r => r.dataset.path);
    expect(container.querySelector('.st-nav__item[data-purpose="skills"] .st-nav__n').textContent).toBe('1');
    fireEvent.click(container.querySelector('.st-nav__item[data-recent]'));
    expect(rows()).toEqual([HOME + '/.claude/skills/t/SKILL.md']);
    fireEvent.click(container.querySelector('.st-nav__item[data-recent]'));
    fireEvent.click(container.querySelector('.st-nav__item[data-git="untracked"]'));
    expect(rows()).toEqual([PROJ + '/AGENTS.md']);
    fireEvent.click(container.querySelector('.st-nav__item[data-git="tracked"]'));
    expect(rows().sort()).toEqual([PROJ + '/.claude/agents/rev.md', PROJ + '/AGENTS.md']);
    fireEvent.click(container.querySelector('.st-nav__item[data-purpose="agents"]'));
    expect(rows()).toEqual([PROJ + '/.claude/agents/rev.md']);
    fireEvent.click(container.querySelector('.st-nav__item[data-scope="project"]'));
    expect(rows()).toEqual([PROJ + '/.claude/agents/rev.md']);
    fireEvent.click([...container.querySelectorAll('.st-link')].find(b => b.textContent === 'Clear filters'));
    expect(rows().length).toBeGreaterThan(3);
  });

  it('the name opens the file at once; a row click fills the inspector, whose Open file goes to the source', async () => {
    filesResponse = { status: 200, body: { files: FILES } };
    const { container, openFile } = renderAt('pivot=files');
    await waitFor(() => expect(container.textContent).not.toContain('File details are loading'));
    const row = container.querySelector(`.st-row[data-path="${PROJ}/AGENTS.md"]`);
    fireEvent.click(row.querySelector('.st-fname'));
    expect(openFile).toHaveBeenCalledWith(PROJ + '/AGENTS.md', 0);
    expect(container.querySelector('[data-testid="st-inspector-file"]')).toBeNull();
    fireEvent.click(row);
    const insp = container.querySelector('[data-testid="st-inspector-file"]');
    for (const t of [PROJ + '/AGENTS.md', 'Instructions', 'project', 'untracked', '2KB', 'always', 'Claude Code', 'Codex CLI']) expect(insp.textContent).toContain(t);
    openFile.mockClear();
    fireEvent.click([...insp.querySelectorAll('.st-btn')].find(b => b.textContent === 'Open file'));
    expect(openFile).toHaveBeenCalledWith(PROJ + '/AGENTS.md', 0);
  });

  it('renders from the tool records when the files endpoint is missing', async () => {
    const { container } = renderAt('pivot=files');
    await waitFor(() => expect(container.textContent).toContain('File details are loading'));
    expect(container.querySelector(`.st-row[data-path="${CODEX}"]`)).toBeTruthy();
    expect(container.querySelector(`.st-row[data-path="${VS_USER}"]`)).toBeTruthy();
  });
});

describe('Findings', () => {
  it('groups by rule and folds a group past 5 rows', async () => {
    auditResponse = {
      findings: [
        ...Array.from({ length: 7 }, (_, i) => ({ rule: 'differs-from-picker', severity: 'medium', tool: 'claude-code', tools: ['claude-code'], path: `${HOME}/.claude/agents/a${i}.md`, line: 4, why: 'The picker and the file ask for different models.', action: 'Pick one.' })),
        { rule: 'html-comment', severity: 'low', tool: 'codex-cli', path: CODEX, line: 2, why: 'Hidden text.', action: '' },
      ],
      sources: [], effective_models: {}, transcripts_read: 0,
    };
    const { container, getByText, openFile } = renderAt('pivot=findings');
    await waitFor(() => expect(container.querySelector('tbody[data-rule="differs-from-picker"]')).toBeTruthy());
    const big = container.querySelector('tbody[data-rule="differs-from-picker"]');
    expect(big.querySelector('.st-group').textContent).toContain('Differs from picker');
    expect(big.querySelector('.st-group').textContent).toContain('The picker and the file ask for different models.');
    expect(big.querySelectorAll('.st-row').length).toBe(5);
    expect(big.textContent).toContain('2 more');
    expect(container.querySelectorAll('tbody[data-rule]').length).toBe(2);
    // The worse rule has a red dot in the navigator.
    expect(container.querySelector('.st-nav__item[data-rule="differs-from-picker"] .st-dot')).toBeTruthy();
    expect(container.querySelector('.st-nav__item[data-rule="html-comment"] .st-dot')).toBeNull();
    fireEvent.click(getByText(/2 more/));
    expect(container.querySelector('tbody[data-rule="differs-from-picker"]').querySelectorAll('.st-row').length).toBe(7);
    fireEvent.click(container.querySelector('tbody[data-rule="html-comment"]').querySelector('.st-chip--btn'));
    expect(openFile).toHaveBeenCalledWith(CODEX, 2);
  });

  it('shows the source scan state, and Rescan asks the source', async () => {
    const rescan = vi.fn();
    const scanning = { list: [], audit: null, loading: true, error: null, scan: { step: 'reading transcripts', elapsed_s: 4.2 }, rescan };
    const { container, rerender } = renderAt('pivot=findings', { findings: scanning });
    const note = container.querySelector('[data-state="scanning"]');
    expect(note.textContent).toContain('reading transcripts, 4 s');
    expect(container.querySelector('[data-kpi="agents"]').parentElement.textContent).toContain('… findings');
    // The scan ends: the results show, and Rescan goes to the source.
    const done = { ...scanning, loading: false, scan: null, audit: { findings: [{ rule: 'a', severity: 'low', tool: 'claude-code', path: CLAUDE_USER, line: 1, why: 'x' }], incomplete: ['transcripts'] } };
    rerender(html`<${SettingsWorkspace} source=${makeSource({ findings: done })}/>`);
    expect(container.querySelector('tbody[data-rule="a"]')).toBeTruthy();
    expect(container.textContent).toContain('The scan reached its time limit and skipped: transcripts.');
    fireEvent.click([...container.querySelectorAll('.st-chip--btn')].find(b => b.textContent === 'Rescan'));
    expect(rescan).toHaveBeenCalledTimes(1);
    // A failed scan with no results shows the error and a Retry.
    rerender(html`<${SettingsWorkspace} source=${makeSource({ findings: { audit: null, loading: false, error: 'boom', rescan } })}/>`);
    expect(container.querySelector('[role="alert"]').textContent).toContain('The context audit failed: boom');
    fireEvent.click(container.querySelector('[role="alert"] .st-btn'));
    expect(rescan).toHaveBeenCalledTimes(2);
  });

  it('has no Rescan button when the source cannot rescan', () => {
    const { container } = renderAt('pivot=findings', { findings: { audit: { findings: [] }, loading: false } });
    expect([...container.querySelectorAll('button')].some(b => b.textContent === 'Rescan')).toBe(false);
  });

  it('scopes findings to the tool filter', async () => {
    auditResponse = { findings: [
      { rule: 'a', severity: 'low', tool: 'claude-code', path: CLAUDE_USER, line: 1, why: 'x' },
      { rule: 'b', severity: 'low', tool: 'codex-cli', path: CODEX, line: 1, why: 'y' },
    ] };
    const snap = { ...SNAP, tool_configs: [VSCODE, CLAUDE] };
    const { container } = renderAt('pivot=findings', { snap, enabledTools: ['claude-code'] });
    await waitFor(() => expect(container.querySelector('tbody[data-rule="a"]')).toBeTruthy());
    expect(container.querySelector('tbody[data-rule="b"]')).toBeNull();
  });
});

describe('Search and toggles', () => {
  it('filters rows by label, key, value and file name', () => {
    const { container } = renderAt('tool=claude-code');
    expect(container.querySelectorAll('.st-row').length).toBe(4);
    const box = container.querySelector('.st-search');
    fireEvent.input(box, { target: { value: 'opus' } });
    expect([...container.querySelectorAll('.st-row')].map(r => r.dataset.key)).toEqual(['model']);
    fireEvent.input(box, { target: { value: 'defaultMode' } });
    expect([...container.querySelectorAll('.st-row')].map(r => r.dataset.key)).toEqual(['permissions.defaultMode']);
    fireEvent.input(box, { target: { value: 'nothing-matches-this' } });
    expect(container.querySelectorAll('.st-row').length).toBe(0);
    expect(container.textContent).toContain('No setting matches');
  });

  it('only non-default hides rows no file sets; only risky keeps the risky ones', () => {
    const { container, getByText } = renderAt('tool=vscode');
    fireEvent.click(getByText('Only risky'));
    expect([...container.querySelectorAll('.st-row')].map(r => r.dataset.key).sort())
      .toEqual(['chat.tools.global.autoApprove', 'chat.tools.terminal.sandbox.enabled']);
    fireEvent.click(getByText('Only risky'));
    fireEvent.click(container.querySelector('.st-nav__item[data-tool="claude-code"]'));
    expect(rowByKey(container, 'autoUpdates')).toBeTruthy();
    fireEvent.click(getByText('Only non-default'));
    expect(rowByKey(container, 'autoUpdates')).toBeNull();
    expect(rowByKey(container, 'model')).toBeTruthy();
  });

  it('`/` focuses the search box', () => {
    const { container } = renderAt('');
    fireEvent.keyDown(document.body, { key: '/' });
    expect(document.activeElement).toBe(container.querySelector('.st-search'));
  });
});

describe('Scope fallback when rows have no scope', () => {
  it('derives user, project, workspace and default from the source path', () => {
    expect(deriveScope(CLAUDE_USER, [PROJ])).toBe('user');
    expect(deriveScope(CLAUDE_PROJ, [PROJ])).toBe('project');
    expect(deriveScope(VS_WS, [PROJ])).toBe('workspace');
    expect(deriveScope('', [PROJ])).toBe('default');
    expect(deriveScope('/opt/team/settings.json', [])).toBe('project');
    expect(deriveScope('C:\\Users\\u\\.claude\\settings.json', [])).toBe('user');
  });

  it('shows the derived scope in the table and one chain entry in the inspector', () => {
    const { container } = renderAt('tool=claude-code');
    expect(rowByKey(container, 'model').querySelector('.st-scope').textContent).toBe('user');
    expect(rowByKey(container, 'permissions.defaultMode').querySelector('.st-scope').textContent).toBe('project');
    expect(rowByKey(container, 'autoUpdates').querySelector('.st-scope').textContent).toBe('default');
    expect(rowByKey(container, 'model').querySelector('.st-src').textContent).toBe('settings.json');
    fireEvent.click(rowByKey(container, 'model'));
    const levels = container.querySelectorAll('.st-chain__lv');
    expect(levels.length).toBe(1);
    expect(levels[0].classList.contains('is-win')).toBe(true);
    expect(container.textContent).toContain('Only the user level sets this');
  });

  it('builds sections for an older record without `sections`', () => {
    const cfg = { tool: 'copilot', settings: { 'chat.agent.enabled': true }, config_files: ['/home/u/x.json'],
      configurable_models: [{ label: 'Explore subagent', key: 'github.copilot.chat.exploreAgent.model', value: 'GPT-5', source: 'user', description: 'Model for Explore.' }] };
    const ids = getSections(cfg).map(s => s.id);
    expect(ids.every(id => SECTION_ORDER.includes(id))).toBe(true);
    const [entry] = toolEntries({ tool_configs: [cfg], tools: [] });
    const m = entry.rows.find(r => r.key === 'github.copilot.chat.exploreAgent.model');
    expect(m.value).toBe('GPT-5');
    expect(m.scope).toBe('user');
    expect(m.chain).toHaveLength(1);
  });

  it('picks the winner of a chain without `wins`, and words why', () => {
    const chain = [{ scope: 'user', value: 'a', source: '/home/u/s.json' }, { scope: 'project', value: 'b', source: '/p/s.json' }];
    expect(rowChain({ value: 'b', source: '/p/s.json', chain }, 'project').wins).toBe(1);
    expect(whyWins(chain, 1)).toContain('highest level');
  });

  it('places files in their location groups', () => {
    expect(deriveLocation(VS_WS, [PROJ]).location).toBe('project');
    expect(deriveLocation(CLAUDE_USER, []).location).toBe('tool-home');
    expect(deriveLocation(CLAUDE_USER, []).location_root).toBe(HOME + '/.claude');
    expect(deriveLocation(HOME + '/.claude.json', []).location).toBe('home');
    expect(deriveLocation(VS_USER, []).location).toBe('vscode-user');
  });
});

describe('File viewer at a line', () => {
  it('a set-in click calls the source openFile with the line', () => {
    const { container, openFile } = renderAt('tool=vscode');
    fireEvent.click(rowByKey(container, 'chat.tools.global.autoApprove').querySelector('.st-src'));
    expect(openFile).toHaveBeenCalledWith(VS_USER, 412);
    // The inspector action opens the same place.
    fireEvent.click(rowByKey(container, 'chat.tools.global.autoApprove'));
    fireEvent.click([...container.querySelectorAll('.st-btn')].find(b => b.textContent === 'Open settings.json at line 412'));
    expect(openFile).toHaveBeenLastCalledWith(VS_USER, 412);
  });
});

describe('Accessibility', () => {
  it.each(['tool=vscode&row=chat.tools.global.autoApprove', 'pivot=topic&sec=autonomy', 'pivot=files', 'pivot=findings'])('%s has no serious or critical axe violations', async (search) => {
    auditResponse = { findings: [{ rule: 'a', severity: 'high', tool: 'claude-code', path: CLAUDE_USER, line: 1, why: 'x', action: 'y' }] };
    const { container } = renderAt(search);
    await waitFor(() => expect(container.querySelector('[data-state="scanning"]')).toBeNull());
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map(v => v.id + ': ' + v.nodes.map(n => n.html).join(' | '))).toEqual([]);
  });
});

// ─── Scopes, locked values, agents and unset knobs ───────────────
const SYS = '/etc/claude-code/managed-settings.json';
const MANAGED = '/Library/Application Support/ClaudeCode/managed-settings.json';
const CLAUDE_LOCAL = PROJ + '/.claude/settings.local.json';
const AGENT_DIR = HOME + '/.claude/agents/';

const agentRow = (name, value, agent, extra = {}) => row('agent/' + name, value, 'agent', {
  label: name, scope: 'user', source: agent.pinned_in || agent.defined_in, set: true, ...extra,
  agent: { name, description: '', model: '', model_policy: 'optional', effort: '', context_tier: '', tools: [], target: 'claude-code',
    defined_in: '', defined_line: 0, pinned_in: '', pinned_line: 0, inherits: false, scope_defined: 'user', scope_pinned: '', ...agent },
});

const CLAUDE_FULL = {
  tool: 'claude-code',
  config_files: [CLAUDE_USER, CLAUDE_PROJ],
  scopes: [
    { id: 'system', label: 'System', path: SYS, exists: true, changeable: false, note: '' },
    { id: 'user', label: 'User', path: CLAUDE_USER, exists: true, changeable: true, note: '' },
    { id: 'project', label: 'Project', path: CLAUDE_PROJ, exists: true, changeable: true, note: '' },
    { id: 'project-local', label: 'Project local', path: CLAUDE_LOCAL, exists: false, changeable: true, note: '' },
    { id: 'env', label: 'Env', path: '', exists: true, changeable: true, note: 'environment variables' },
    { id: 'managed', label: 'Managed', path: MANAGED, exists: false, changeable: false, note: 'Set by an administrator' },
  ],
  sections: [
    { id: 'model', title: 'Model', rows: [
      row('model', 'opus', 'text', { label: 'Model', source: CLAUDE_USER, scope: 'user', line: 3, set: true }),
      row('effortLevel', 'high', 'text', { label: 'Effort level', scope: 'default', set: false }),
    ] },
    { id: 'agents', title: 'Agents', rows: [
      agentRow('reviewer', 'opus', {
        description: 'Reviews diffs', model: 'sonnet', effort: 'high', context_tier: '1m',
        tools: ['Read', 'Grep', 'Glob', 'Bash', 'Edit', 'Write'],
        defined_in: AGENT_DIR + 'reviewer.md', defined_line: 4, pinned_in: CLAUDE_USER, pinned_line: 12, scope_pinned: 'user',
      }, { line: 12 }),
      agentRow('planner', 'haiku', { model: 'haiku', model_policy: 'required', defined_in: PROJ + '/.claude/agents/planner.md', defined_line: 3, scope_defined: 'project' },
        { scope: 'project', line: 3 }),
      agentRow('helper', 'inherits', { inherits: true, defined_in: AGENT_DIR + 'helper.md', defined_line: 1 },
        { note: 'The file names no model.' }),
    ] },
    { id: 'autonomy', title: 'Autonomy and safety', rows: [
      row('permissions.disableBypassPermissionsMode', 'disable', 'text', {
        label: 'Bypass mode', scope: 'system', source: SYS, line: 2, locked: true, set: true,
        chain: [
          { scope: 'user', value: 'allow', source: CLAUDE_USER, line: 5 },
          { scope: 'system', value: 'disable', source: SYS, line: 2, locked: true },
        ],
        wins: 1,
      }),
      row('mysteryKey', 'x', 'text', { label: 'mysteryKey', scope: 'project', source: CLAUDE_PROJ, line: 9, set: true, documented: false }),
      row('permissions.defaultMode', 'default', 'text', { label: 'Default mode', scope: 'default', set: false }),
    ] },
  ],
};

// No `scopes` list: the layers come from the row scopes.
const COPILOT_FULL = {
  tool: 'copilot',
  config_files: [VS_USER],
  sections: [
    { id: 'agents', title: 'Agents', rows: [
      agentRow('explore', 'GPT-5', { model: 'GPT-5', tools: ['search'], target: 'vscode', defined_in: HOME + '/.copilot/agents/explore.agent.md', defined_line: 2 }),
    ] },
  ],
};

const SNAP2 = {
  ...SNAP,
  tools: [...SNAP.tools, { tool: 'copilot', label: 'Copilot', files: [] }],
  tool_configs: [CLAUDE_FULL, COPILOT_FULL],
};

const keysShown = c => [...c.querySelectorAll('.st-row')].map(r => r.dataset.key);

describe('Configuration scopes', () => {
  it('draws the scope strip in precedence order, with a lock on locked layers and "not present" for absent ones', () => {
    const { container } = renderAt('tool=claude-code', { snap: SNAP2 });
    const strip = container.querySelector('[data-testid="st-scopes"]');
    expect(strip).toBeTruthy();
    const chips = [...strip.querySelectorAll('.st-scopechip')];
    expect(chips.map(c => c.dataset.scope)).toEqual(['system', 'user', 'project', 'project-local', 'env', 'managed']);
    expect(strip.querySelectorAll('.st-scopes__arrow').length).toBe(5);
    const managed = chips[5];
    expect(managed.querySelector('.st-lock')).toBeTruthy();
    expect(managed.textContent).toContain('Managed');
    expect(managed.textContent).toContain('not present');
    expect(chips[0].querySelector('.st-lock')).toBeTruthy();
    expect(chips[1].querySelector('.st-lock')).toBeNull();
    expect(chips[1].querySelector('.st-scopechip__file').textContent).toBe('settings.json');
    expect(chips[1].getAttribute('title')).toContain(CLAUDE_USER);
    expect(chips[3].textContent).toContain('not present');
    // Model, reviewer and helper win at the user layer.
    expect(chips[1].querySelector('.st-scopechip__n').textContent).toMatch(/^3/);
    expect(strip.textContent).toContain('Later layers override earlier ones. Locked layers cannot be changed from this machine.');
  });

  it('filters the table to one layer when its chip is clicked, and clears it on a second click', () => {
    const { container } = renderAt('tool=claude-code', { snap: SNAP2 });
    const user = () => container.querySelector('.st-scopechip[data-scope="user"]');
    fireEvent.click(user());
    expect(user().getAttribute('aria-pressed')).toBe('true');
    expect(user().classList.contains('is-on')).toBe(true);
    expect(new URLSearchParams(window.location.search).get('scope')).toBe('user');
    expect(keysShown(container).sort()).toEqual(['agent/helper', 'agent/reviewer', 'model']);
    fireEvent.click(user());
    expect(new URLSearchParams(window.location.search).get('scope')).toBeNull();
    expect(keysShown(container)).toContain('mysteryKey');
  });

  it('derives the layers from row scopes when the record has no `scopes`', () => {
    const { container } = renderAt('tool=vscode');
    expect([...container.querySelectorAll('.st-scopechip')].map(c => c.dataset.scope)).toEqual(['user', 'workspace']);
  });

  it('marks a locked row with the lock and the orange chip, and the inspector says what locks it', () => {
    const { container } = renderAt('tool=claude-code', { snap: SNAP2 });
    const r = rowByKey(container, 'permissions.disableBypassPermissionsMode');
    expect(r.querySelector('.st-c-scope .st-lock')).toBeTruthy();
    const chip = r.querySelector('.st-scope');
    expect(chip.classList.contains('st-scope--locked')).toBe(true);
    expect(chip.getAttribute('title')).toBe('Set by System; cannot be changed here');
    fireEvent.click(r);
    const insp = container.querySelector('[data-testid="st-inspector-row"]');
    expect(insp.querySelector('[data-testid="st-change-hint"]').textContent).toBe('Locked by System');
    const levels = insp.querySelectorAll('.st-chain__lv');
    expect(levels[1].classList.contains('is-locked')).toBe(true);
    expect(levels[1].querySelector('.st-lock')).toBeTruthy();
    expect(levels[0].querySelector('.st-lock')).toBeNull();
    // An unlocked row of a file the screen cannot edit says so.
    fireEvent.click(rowByKey(container, 'model'));
    expect(container.querySelector('[data-testid="st-change-hint"]').textContent).toBe('No form for this value. Open the file and use Edit file');
  });

  it('lists absent managed locations in a folded group at the end of Files', async () => {
    const { container } = renderAt('pivot=files', { snap: SNAP2 });
    await waitFor(() => expect(container.textContent).toContain('File details are loading'));
    const groups = [...container.querySelectorAll('tbody[data-root]')];
    const last = groups[groups.length - 1];
    expect(last.dataset.root).toBe('managed-absent');
    expect(last.textContent).toContain('Managed locations (not present)');
    expect(last.querySelectorAll('.st-row').length).toBe(0);
    fireEvent.click(last.querySelector('.st-fold'));
    const rows = container.querySelectorAll('tbody[data-root="managed-absent"] .st-row');
    // The absent project-local file can be changed, so only the managed one is listed.
    expect([...rows].map(x => x.dataset.path)).toEqual([MANAGED]);
  });
});

describe('Agents', () => {
  it('renders the agents section as its own table, with the inherits, required and pinned markers', () => {
    const { container } = renderAt('tool=claude-code', { snap: SNAP2 });
    const table = container.querySelector('table.st-agents');
    expect(table).toBeTruthy();
    expect([...table.querySelectorAll('thead th')].map(th => th.textContent))
      .toEqual(['Agent', 'Model', 'Effort', 'Context', 'Tools', 'Defined in', 'Pinned in']);
    const reviewer = table.querySelector('.st-row[data-key="agent/reviewer"]');
    expect(reviewer.querySelector('.st-c-model').textContent).toContain('opus');
    expect(reviewer.querySelector('.st-badge--pin').textContent).toBe('pinned');
    expect(reviewer.querySelectorAll('.st-tools .st-chip').length).toBe(5);
    expect(reviewer.querySelector('.st-more-tools').textContent).toBe('+2');
    const srcs = reviewer.querySelectorAll('.st-src');
    expect(srcs[0].textContent).toBe('reviewer.md:4');
    expect(srcs[1].textContent).toBe('settings.json:12');
    const planner = table.querySelector('.st-row[data-key="agent/planner"]');
    expect(planner.querySelector('.st-badge').textContent).toBe('required');
    expect(planner.querySelector('.st-badge--pin')).toBeNull();
    const inherit = table.querySelector('.st-row[data-key="agent/helper"] .st-inherit');
    expect(inherit.textContent).toBe('inherits');
    expect(inherit.getAttribute('title')).toBe('The file names no model.');
    // The generic table keeps the other sections.
    expect(container.querySelector('table.st-table:not(.st-agents) .st-row[data-key="model"]')).toBeTruthy();
    // The navigator counts the agents; they do not share one model, so none is named.
    const sub = [...container.querySelectorAll('.st-nav__sub')].find(b => b.textContent.startsWith('Agents'));
    expect(sub.querySelector('.st-nav__n').textContent).toBe('3');
    expect(sub.querySelector('.st-nav__model')).toBeNull();
  });

  it('opens the agent inspector with the model decision and the files', () => {
    const { container, openFile } = renderAt('tool=claude-code', { snap: SNAP2 });
    fireEvent.click(rowByKey(container, 'agent/reviewer'));
    const insp = container.querySelector('[data-testid="st-inspector-agent"]');
    expect(insp).toBeTruthy();
    expect(insp.textContent).toContain('Reviews diffs');
    const steps = insp.querySelectorAll('.st-chain__lv');
    expect([...steps].map(s => s.querySelector('.st-chain__sc').textContent)).toEqual(['Agent file', 'Settings pin', 'Effective']);
    expect(steps[0].textContent).toContain('sonnet');
    expect(steps[1].classList.contains('is-win')).toBe(true);
    expect(insp.textContent).toContain('The pin in settings.json wins over the model in the agent file.');
    expect(insp.querySelectorAll('.st-tools .st-chip').length).toBe(6);
    expect(insp.textContent).toContain('1m');
    const btn = [...insp.querySelectorAll('.st-btn--primary')].find(b => b.textContent === 'Change model…');
    expect(btn.disabled).toBe(true);
    fireEvent.click(insp.querySelector('[aria-label="Open reviewer.md at line 4"]'));
    expect(openFile).toHaveBeenLastCalledWith(AGENT_DIR + 'reviewer.md', 4);
  });

  it('names the shared model in the navigator when every agent runs on it', () => {
    const { container } = renderAt('tool=copilot', { snap: SNAP2 });
    const sub = [...container.querySelectorAll('.st-nav__sub')].find(b => b.textContent.startsWith('Agents'));
    expect(sub.querySelector('.st-nav__model').textContent).toBe('GPT-5');
  });

  it('By topic lists the agents of every tool in one table with the count line', () => {
    const { container, getByText } = renderAt('pivot=topic&sec=agents', { snap: SNAP2 });
    expect(container.querySelector('[data-testid="st-agents-count"]').textContent)
      .toBe('4 agents in 2 tools, 1 inherit the session model');
    const rows = [...container.querySelectorAll('.st-agents--all .st-row')];
    expect(rows.map(r => r.dataset.key)).toEqual(['agent/helper', 'agent/planner', 'agent/reviewer', 'agent/explore']);
    expect(rows[3].querySelector('.st-sw')).toBeTruthy();
    expect(rows[3].textContent).toContain('Copilot');
    fireEvent.click(getByText('Agent'));
    expect([...container.querySelectorAll('.st-agents--all .st-row')].map(r => r.dataset.key))
      .toEqual(['agent/explore', 'agent/helper', 'agent/planner', 'agent/reviewer']);
    fireEvent.click(rows[3]);
    expect(container.querySelector('[data-testid="st-inspector-agent"]').textContent).toContain('explore');
  });

  it('search matches an agent by name, tool and file; "Only non-default" hides agents that inherit', () => {
    const { container, getByText } = renderAt('tool=claude-code', { snap: SNAP2 });
    const box = container.querySelector('.st-search');
    fireEvent.input(box, { target: { value: 'planner' } });
    expect(keysShown(container)).toEqual(['agent/planner']);
    fireEvent.input(box, { target: { value: 'Grep' } });
    expect(keysShown(container)).toEqual(['agent/reviewer']);
    fireEvent.input(box, { target: { value: 'helper.md' } });
    expect(keysShown(container)).toEqual(['agent/helper']);
    fireEvent.input(box, { target: { value: '' } });
    fireEvent.click(getByText('Only non-default'));
    expect(keysShown(container)).not.toContain('agent/helper');
    expect(keysShown(container)).toContain('agent/reviewer');
  });

  it('counts agents in the header', () => {
    const { container } = renderAt('tool=claude-code', { snap: SNAP2 });
    expect(container.querySelector('[data-kpi="agents"]').textContent).toBe('4 agents');
  });
});

describe('Unset knobs and undocumented keys', () => {
  it('hides unset knobs behind the toggle, with "+N unset" in the section header', () => {
    const { container, getByText } = renderAt('tool=claude-code', { snap: SNAP2 });
    expect(rowByKey(container, 'effortLevel')).toBeNull();
    expect(rowByKey(container, 'permissions.defaultMode')).toBeNull();
    const head = id => container.querySelector(`tbody[data-section="${id}"] .st-group`).textContent;
    expect(head('model')).toContain('+1 unset');
    expect(head('autonomy')).toContain('+1 unset');
    fireEvent.click(getByText('Show unset knobs'));
    expect(new URLSearchParams(window.location.search).get('unset')).toBe('1');
    const r = rowByKey(container, 'effortLevel');
    expect(r.classList.contains('st-row--unset')).toBe(true);
    expect(r.querySelector('.st-scope').textContent).toBe('default');
    expect(head('model')).not.toContain('unset');
    expect(container.querySelector('[data-kpi="unset"]').textContent).toBe('2 unset');
  });

  it('says where to set an unset knob in the inspector', () => {
    const { container } = renderAt('tool=claude-code&unset=1', { snap: SNAP2 });
    fireEvent.click(rowByKey(container, 'effortLevel'));
    expect(container.querySelector('[data-testid="st-unset-text"]').textContent)
      .toBe('Not set in any file. Default: high. Set it in ~/proj/.claude/settings.local.json (Project local).');
  });

  it('shows the undocumented chip after the label of a key aictl does not know', () => {
    const { container } = renderAt('tool=claude-code', { snap: SNAP2 });
    const chip = rowByKey(container, 'mysteryKey').querySelector('.st-undoc');
    expect(chip.textContent).toBe('undocumented');
    expect(chip.getAttribute('title')).toBe('aictl has no description for this key; the value is shown as found in the file');
    expect(rowByKey(container, 'model').querySelector('.st-undoc')).toBeNull();
  });

  it('By topic shows an unset cell as a dash, and its default muted with the toggle on', () => {
    const { container, getByText } = renderAt('pivot=topic&sec=autonomy', { snap: SNAP2 });
    expect(container.querySelector('.st-cellbtn[data-key="permissions.defaultMode"]')).toBeNull();
    fireEvent.click(getByText('Show unset knobs'));
    const cell = container.querySelector('.st-cellbtn[data-key="permissions.defaultMode"]').closest('td');
    expect(cell.classList.contains('is-unset')).toBe(true);
    expect(cell.textContent).toContain('default');
  });
});

describe('Records without scopes, agents or set', () => {
  it('shows no strip, no agents table, no unset toggle, and does not crash', () => {
    const { container, queryByText } = renderAt('tool=claude-code');
    expect(container.querySelector('[data-testid="st-scopes"]')).toBeNull();
    expect(container.querySelector('table.st-agents')).toBeNull();
    expect(queryByText('Show unset knobs')).toBeNull();
    expect(container.querySelector('[data-kpi="unset"]')).toBeNull();
    expect(container.querySelector('[data-kpi="agents"]').textContent).toBe('0 agents');
    expect(container.querySelector('.st-lock')).toBeNull();
    expect(keysShown(container).length).toBe(4);
  });

  it('By topic agents says no tool reports agents', () => {
    const { container } = renderAt('pivot=topic&sec=agents');
    expect(container.textContent).toContain('No tool reports agents.');
  });
});

describe('Accessibility of scopes and agents', () => {
  it.each(['tool=claude-code&row=agent/reviewer', 'tool=claude-code&unset=1&row=permissions.disableBypassPermissionsMode', 'pivot=topic&sec=agents', 'pivot=files'])('%s has no serious or critical axe violations', async (search) => {
    const { container } = renderAt(search, { snap: SNAP2 });
    await waitFor(() => expect(container.querySelector('[data-state="scanning"]')).toBeNull());
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map(v => v.id + ': ' + v.nodes.map(n => n.html).join(' | '))).toEqual([]);
  });
});

// ─── Permissions: the matrix, the Claude Code editor, the hook status ───
const COPILOT_USER = HOME + '/.copilot/settings.json';
const CLAUDE_SCOPES = [
  { id: 'user', label: 'User', path: CLAUDE_USER, exists: true, changeable: true },
  { id: 'project', label: 'Project', path: CLAUDE_PROJ, exists: true, changeable: true },
  { id: 'project-local', label: 'Project (local)', path: CLAUDE_LOCAL, exists: true, changeable: true },
  { id: 'managed', label: 'Managed', path: '/etc/claude-code/managed-settings.json', exists: false, changeable: false },
];
const RULES = { allow: ['Bash'], deny: ['WebFetch'], ask: ['Edit'] };

/** A Claude Code record whose permission rules win at `winScope`. */
function claudePerms(winScope = 'project-local') {
  const src = { user: CLAUDE_USER, project: CLAUDE_PROJ, 'project-local': CLAUDE_LOCAL }[winScope];
  const chain = [{ scope: 'user', value: { allow: [], deny: [], ask: [] }, source: CLAUDE_USER, line: 2 }];
  if (winScope === 'user') chain[0] = { scope: 'user', value: RULES, source: CLAUDE_USER, line: 2 };
  else chain.push({ scope: winScope, value: RULES, source: src, line: 2 });
  return {
    tool: 'claude-code',
    config_files: [CLAUDE_USER, CLAUDE_PROJ, CLAUDE_LOCAL],
    scopes: CLAUDE_SCOPES,
    sections: [
      { id: 'autonomy', title: 'Autonomy and safety', rows: [
        row('permissions', RULES, 'map', { label: 'Permissions', source: src, scope: winScope, line: 2, chain, wins: chain.length - 1, set: true }),
        row('permissions.defaultMode', null, 'text', { label: 'Default mode', scope: 'default', set: false }),
      ] },
      { id: 'hooks', title: 'Hooks', rows: [row('hooks', 'configured', 'text', { label: 'Hooks', source: CLAUDE_USER, scope: 'user', line: 9 })] },
    ],
  };
}

const COPILOT_CLI = {
  tool: 'copilot-cli',
  config_files: [COPILOT_USER],
  sections: [{ id: 'autonomy', title: 'Autonomy and safety', rows: [
    row('defaultPermissionMode', 'allow-all', 'text', { label: 'Default permission mode', danger: true, source: COPILOT_USER, scope: 'user', line: 4 }),
    row('savedToolApprovals', { '/home/u/proj': 3 }, 'map', { label: 'Saved tool approvals', source: HOME + '/.copilot/permissions-config.json', scope: 'user' }),
  ] }],
};

const permSnap = (claude = claudePerms()) => ({
  root: PROJ,
  tools: [{ tool: 'claude-code', label: 'Claude Code', files: [] }, { tool: 'copilot-cli', label: 'Copilot CLI', files: [] }, { tool: 'codex-cli', label: 'Codex CLI', files: [] }],
  tool_configs: [claude, COPILOT_CLI, CODEX_CFG],
  live_monitor: {},
});

const CONFIG = { tool: 'claude-code', scope: 'project-local', path: CLAUDE_LOCAL, exists: true, mtime: 1779000000.25, permissions: RULES };

/** The test fetch, with the tool-config endpoint answered by `onConfig(method, url, body)`. */
function stubConfig(onConfig) {
  const calls = [];
  const base = globalThis.fetch;
  globalThis.fetch = vi.fn(async (url, opts) => {
    const u = String(url);
    if (!u.startsWith('/api/tool-config/')) return base(url, opts);
    const method = opts?.method || 'GET';
    const body = opts?.body ? JSON.parse(opts.body) : null;
    calls.push({ method, url: u, body });
    const res = onConfig(method, u, body) || { status: 200, body: CONFIG };
    return { ok: res.status < 400, status: res.status, json: async () => res.body, text: async () => JSON.stringify(res.body) };
  });
  return calls;
}

function renderPerms(search, { snap = permSnap(), ...extra } = {}) {
  history.replaceState(null, '', '/?screen=settings' + (search ? '&' + search : ''));
  const source = { ...makeSource({ snap }), ...extra };
  const r = render(html`<${SettingsWorkspace} source=${source}/>`);
  return { ...r, source };
}

const cellsOf = el => Object.fromEntries([...el.querySelectorAll('td[data-cap]')].map(td => [td.dataset.cap, td]));
const changeBtn = c => [...c.querySelectorAll('[data-testid="st-inspector-row"] button')].find(b => b.textContent === 'Change value…');

describe('Permission matrix', () => {
  it('shows the five capabilities for Claude Code, from allow Bash, deny WebFetch and ask Edit', () => {
    const { container } = renderPerms('tool=claude-code');
    const m = container.querySelector('[data-testid="st-perms"]');
    expect(m).toBeTruthy();
    // It sits in the Autonomy and safety section, above the rows.
    expect(m.closest('tbody').dataset.section).toBe('autonomy');
    expect([...m.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(['MCP', 'Read files', 'Write files', 'Shell', 'Web']);
    const cells = cellsOf(m);
    expect(Object.fromEntries(Object.entries(cells).map(([k, td]) => [k, td.textContent.trim()]))).toEqual({
      mcp: 'asks', read: 'allowed', write: 'asks', shell: 'allowed', web: 'denied',
    });
    expect(cells.shell.getAttribute('title')).toContain('allow Bash (Project (local))');
    expect(cells.web.getAttribute('title')).toContain('deny WebFetch');
    expect(cells.write.getAttribute('title')).toContain('ask Edit');
    expect(cells.read.getAttribute('title')).toContain('Without a rule');
  });

  it('a cell click selects the setting row behind it', () => {
    const { container } = renderPerms('tool=claude-code');
    fireEvent.click(cellsOf(container.querySelector('[data-testid="st-perms"]')).shell.querySelector('button'));
    expect(container.querySelector('[data-testid="st-inspector-row"] .st-insp__key').textContent).toBe('permissions');
  });

  it('shows every cell allowed for Copilot CLI in allow-all mode, with the saved approvals', () => {
    const { container } = renderPerms('tool=copilot-cli');
    const m = container.querySelector('[data-testid="st-perms"]');
    expect(Object.values(cellsOf(m)).map(td => td.dataset.state)).toEqual(['allowed', 'allowed', 'allowed', 'allowed', 'allowed']);
    expect(m.textContent).toContain('3 saved tool approvals in 1 folder');
  });

  it('has no matrix for a tool without permission settings', () => {
    const { container } = renderPerms('tool=claude-code', { snap: { ...permSnap(), tool_configs: [{ tool: 'claude-code', sections: [{ id: 'model', title: 'Model', rows: [row('model', 'opus', 'text')] }] }] } });
    expect(container.querySelector('[data-testid="st-perms"]')).toBeNull();
  });

  it('By topic shows one line per tool above the matrix of rows', () => {
    const { container } = renderPerms('pivot=topic&sec=autonomy');
    const block = container.querySelector('[data-testid="st-perms-topic"]');
    expect([...block.querySelectorAll('tbody tr')].map(tr => tr.dataset.tool)).toEqual(['claude-code', 'copilot-cli', 'codex-cli']);
    const codex = cellsOf(block.querySelector('tr[data-tool="codex-cli"]'));
    expect(codex.read.dataset.state).toBe('allowed');
    expect(block.compareDocumentPosition(container.querySelector('.st-matrix')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('calls a capability mixed when partial rules differ from the rest, and counts the rules', () => {
    const entry = toolEntries({ root: PROJ, tools: [], tool_configs: [{ tool: 'claude-code', sections: [{ id: 'autonomy', title: 'A', rows: [
      row('permissions', { allow: ['Bash(git status:*)', 'Read(*)'], deny: ['Bash(rm:*)'], ask: [] }, 'map', { scope: 'project', source: CLAUDE_PROJ }),
      row('permissions.defaultMode', 'acceptEdits', 'text', { scope: 'project', source: CLAUDE_PROJ }),
    ] }] }] })[0];
    const cells = Object.fromEntries(derivePermissions(entry).cells.map(c => [c.cap, c]));
    expect(cells.shell.text).toBe('mixed (2 rules)');
    expect(cells.read.state).toBe('allowed');
    expect(cells.write.state).toBe('allowed');
  });

  it('works Codex out from approval_policy and sandbox_mode', () => {
    const entry = toolEntries({ root: PROJ, tools: [], tool_configs: [{ tool: 'codex-cli', sections: [{ id: 'autonomy', title: 'A', rows: [
      row('approval_policy', 'never', 'text', { source: CODEX, scope: 'user' }),
      row('sandbox_mode', 'danger-full-access', 'text', { source: CODEX, scope: 'user' }),
    ] }] }] })[0];
    expect(derivePermissions(entry).cells.map(c => c.state)).toEqual(['allowed', 'allowed', 'allowed', 'allowed', 'allowed']);
  });
});

describe('Claude Code permissions editor', () => {
  it('opens in the inspector for a project-local permissions row, with the lists, the file and the scope', async () => {
    const calls = stubConfig(() => null);
    const { container } = renderPerms('tool=claude-code&row=permissions');
    const btn = changeBtn(container);
    expect(btn.disabled).toBe(false);
    expect(container.querySelector('[data-testid="st-change-hint"]').textContent).toContain('Project (local)');
    fireEvent.click(btn);
    const ed = container.querySelector('[data-testid="st-perm-editor"]');
    expect(ed).toBeTruthy();
    // A panel in the inspector, not a dialog.
    expect(ed.closest('.st-insp')).toBeTruthy();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await waitFor(() => expect(ed.querySelector('textarea[data-bucket="allow"]')).toBeTruthy());
    expect(calls[0].url).toBe('/api/tool-config/claude-code?scope=project-local');
    expect(ed.querySelector('textarea[data-bucket="allow"]').value).toBe('Bash');
    expect(ed.querySelector('textarea[data-bucket="deny"]').value).toBe('WebFetch');
    expect(ed.querySelector('textarea[data-bucket="ask"]').value).toBe('Edit');
    expect(ed.querySelector('[data-testid="st-editor-target"]').textContent).toContain(CLAUDE_LOCAL);
    expect(ed.querySelector('[data-testid="st-editor-target"]').textContent).toContain('Project (local)');
    const save = [...ed.querySelectorAll('button')].find(b => b.textContent === 'Save');
    expect(save.disabled).toBe(true);
    // Cancel closes the panel.
    fireEvent.click([...ed.querySelectorAll('button')].find(b => b.textContent === 'Cancel'));
    expect(container.querySelector('[data-testid="st-perm-editor"]')).toBeNull();
  });

  it('saves the lists with the expected mtime and scope, shows the backup and reads the settings again', async () => {
    const calls = stubConfig((method, _u, body) => (method === 'PUT'
      ? { status: 200, body: { ...CONFIG, permissions: body.permissions, mtime: 1779000100, backup_path: CLAUDE_LOCAL + '.bak.20260101000000' } }
      : null));
    const refresh = vi.fn();
    const { container } = renderPerms('tool=claude-code&row=permissions', { refresh });
    fireEvent.click(changeBtn(container));
    const ed = container.querySelector('[data-testid="st-perm-editor"]');
    await waitFor(() => expect(ed.querySelector('textarea[data-bucket="allow"]')).toBeTruthy());
    fireEvent.input(ed.querySelector('textarea[data-bucket="allow"]'), { target: { value: 'Bash\nRead(*)\n' } });
    fireEvent.input(ed.querySelector('textarea[data-bucket="ask"]'), { target: { value: '' } });
    const diff = ed.querySelector('[data-testid="st-editor-diff"]');
    expect(diff.querySelector('[data-bucket="allow"] .is-added').textContent).toBe('+ Read(*)');
    expect(diff.querySelector('[data-bucket="ask"] .is-removed').textContent).toBe('- Edit');
    expect(diff.querySelector('[data-bucket="deny"]').textContent).toContain('no change');
    expect(JSON.parse(ed.querySelector('[data-testid="st-editor-json"]').textContent)).toEqual({ permissions: { allow: ['Bash', 'Read(*)'], deny: ['WebFetch'], ask: [] } });
    fireEvent.click([...ed.querySelectorAll('button')].find(b => b.textContent === 'Save'));
    await waitFor(() => expect(ed.querySelector('[data-testid="st-editor-saved"]')).toBeTruthy());
    const put = calls.find(c => c.method === 'PUT');
    expect(put.url).toBe('/api/tool-config/claude-code');
    expect(put.body).toEqual({ scope: 'project-local', expected_mtime: 1779000000.25, permissions: { allow: ['Bash', 'Read(*)'], deny: ['WebFetch'], ask: [] } });
    expect(ed.querySelector('[data-testid="st-editor-saved"]').textContent).toContain('Backup: ' + CLAUDE_LOCAL + '.bak.20260101000000');
    expect(refresh).toHaveBeenCalledTimes(1);
    // The saved lists are now the base: nothing is pending.
    expect(diff.querySelector('[data-bucket="allow"]').textContent).toContain('no change');
  });

  it('shows the server error on a conflict, and Reload reads the file again', async () => {
    const calls = stubConfig(method => (method === 'PUT' ? { status: 409, body: { error: 'Config file changed since it was loaded' } } : null));
    const refresh = vi.fn();
    const { container } = renderPerms('tool=claude-code&row=permissions', { refresh });
    fireEvent.click(changeBtn(container));
    const ed = container.querySelector('[data-testid="st-perm-editor"]');
    await waitFor(() => expect(ed.querySelector('textarea[data-bucket="deny"]')).toBeTruthy());
    fireEvent.input(ed.querySelector('textarea[data-bucket="deny"]'), { target: { value: 'WebFetch\nBash(rm:*)' } });
    fireEvent.click([...ed.querySelectorAll('button')].find(b => b.textContent === 'Save'));
    const err = await waitFor(() => {
      const e = ed.querySelector('[data-testid="st-editor-error"]');
      expect(e).toBeTruthy();
      return e;
    });
    expect(err.textContent).toContain('Config file changed since it was loaded');
    expect(err.textContent).not.toContain('HTTP 409');
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click([...err.querySelectorAll('button')].find(b => b.textContent === 'Reload'));
    await waitFor(() => expect(calls.filter(c => c.method === 'GET')).toHaveLength(2));
    await waitFor(() => expect(ed.querySelector('[data-testid="st-editor-error"]')).toBeNull());
    expect(ed.querySelector('textarea[data-bucket="deny"]').value).toBe('WebFetch');
  });

  it('stays disabled, with a hint, for a user-scope permissions row and for another tool', () => {
    const { container } = renderPerms('tool=claude-code&row=permissions', { snap: permSnap(claudePerms('user')) });
    expect(changeBtn(container).disabled).toBe(true);
    expect(container.querySelector('[data-testid="st-change-hint"]').textContent).toContain('The value comes from User. Project and Project local permissions have a form here');
    cleanup();
    const other = renderPerms('tool=codex-cli&row=approval_policy');
    expect(changeBtn(other.container).disabled).toBe(true);
    expect(other.container.querySelector('[data-testid="st-change-hint"]').textContent).toBe('No form for this value. Open the file and use Edit file');
  });

  it('allows project and project-local winners only, and never a locked one', () => {
    const scoped = scope => ({ tool: 'claude-code', key: 'permissions', scope, chain: [{ scope, source: 'x' }], wins: 0 });
    expect(permissionEdit(scoped('project'), CLAUDE_SCOPES)).toMatchObject({ ok: true, scope: 'project' });
    expect(permissionEdit(scoped('project-local'), CLAUDE_SCOPES)).toMatchObject({ ok: true, scope: 'project-local' });
    expect(permissionEdit(scoped('managed'), CLAUDE_SCOPES)).toEqual({ ok: false, hint: 'Locked by Managed' });
    expect(permissionEdit({ ...scoped('project'), locked: true }, CLAUDE_SCOPES).ok).toBe(false);
    expect(permissionEdit({ ...scoped('project'), tool: 'copilot-cli' }, CLAUDE_SCOPES).ok).toBe(false);
  });
});

describe('Hook status in the Hooks section', () => {
  // "last 2m ago" is read against the clock, so the clock stands still at NOW_S.
  const NOW_S = 1_800_000_000;
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW_S * 1000); });
  afterEach(() => { vi.useRealTimers(); });
  const HOOKS = { tools: { 'claude-code': {
    status: 'active', configured_count: 2, configured_events: ['PreToolUse', 'Stop'], missing_events: ['SessionEnd'],
    fired_24h: 12, last_fire_ts: NOW_S - 120,
    sources: [{ scope: 'user', path: CLAUDE_USER, configured_count: 2, host_enabled: true }, { scope: 'project', path: CLAUDE_PROJ, configured_count: 0, host_enabled: false }],
    warnings: [{ path: HOME + '/.copilot/hooks/aictl.json', message: 'VS Code ignores ~/.copilot/hooks' }],
  } } };

  it('shows the status, the events as chips, missing events, fires, last fire and the sources', () => {
    const { container } = renderPerms('tool=claude-code', { hooks: HOOKS });
    const line = container.querySelector('[data-testid="st-hookstat"]');
    expect(line.closest('tbody').dataset.section).toBe('hooks');
    expect(line.querySelector('[data-testid="st-hookstat-status"]').textContent).toBe('active');
    expect([...line.querySelectorAll('.st-hookstat__ev')].map(c => c.textContent)).toEqual(['PreToolUse', 'Stop']);
    expect(line.textContent).toContain('1 missing: SessionEnd');
    expect(line.textContent).toContain('12 fired in 24 h');
    expect(line.textContent).toContain('last 2m ago');
    const sources = [...line.querySelectorAll('.st-hookstat__sources li')].map(li => li.textContent);
    expect(sources[0]).toContain('user');
    expect(sources[1]).toContain('ignored by the host');
    expect(line.querySelector('.st-hookstat__snippet').textContent).toBe('"chat.hookFilesLocations": { "~/.copilot/hooks": true }');
  });

  it('shows nothing without hook status', () => {
    const { container } = renderPerms('tool=claude-code');
    expect(container.querySelector('[data-testid="st-hookstat"]')).toBeNull();
  });
});

describe('Accessibility of the permission views', () => {
  it.each(['tool=claude-code&row=permissions', 'pivot=topic&sec=autonomy'])('%s has no serious or critical axe violations', async (search) => {
    stubConfig(() => null);
    const { container } = renderPerms(search, { hooks: { tools: { 'claude-code': { status: 'configured', configured_events: ['Stop'], sources: [] } } } });
    const btn = changeBtn(container);
    if (btn) {
      fireEvent.click(btn);
      await waitFor(() => expect(container.querySelector('textarea[data-bucket="allow"]')).toBeTruthy());
    }
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map(v => v.id + ': ' + v.nodes.map(n => n.html).join(' | '))).toEqual([]);
  });
});

// ─── Environment variables ───────────────────────────────────────
// The report: Copilot CLI's model came from COPILOT_MODEL, but the screen said
// only "env" (Set in, chain, a file chip that opened a file panel with "path
// must be an absolute path"). Every env source now names its variable.
const COPILOT_WIN_USER = 'C:\\Users\\u\\.copilot\\settings.json';
const COPILOT_ENV = {
  tool: 'copilot-cli',
  config_files: [COPILOT_WIN_USER],
  scopes: [
    { id: 'user', label: 'User', path: COPILOT_WIN_USER, exists: true, changeable: true, note: '' },
    { id: 'env', label: 'Environment', path: '', exists: true, changeable: true, note: '2 set: COPILOT_MODEL, GH_TOKEN.', vars: ['COPILOT_MODEL', 'GH_TOKEN'] },
  ],
  sections: [
    { id: 'model', title: 'Model', rows: [
      row('model', 'gpt-6-sol', 'text', {
        label: 'Model', source: 'env:COPILOT_MODEL', scope: 'env', line: 0, set: true,
        chain: [
          { scope: 'user', value: 'gpt-6-astra', source: COPILOT_WIN_USER, line: 19 },
          { scope: 'env', value: 'gpt-6-sol', source: 'env:COPILOT_MODEL', line: 0 },
        ],
        wins: 1,
      }),
    ] },
  ],
  env_vars: [
    { name: 'COPILOT_MODEL', set: true, value: 'gpt-6-sol', masked: false, source: 'env:COPILOT_MODEL', in_process: true,
      persisted: [{ origin: 'registry:HKEY_CURRENT_USER\\Environment', kind: 'persisted', value: 'gpt-6-sol' }],
      drives: [{ key: 'model', label: 'Model' }], label: 'Copilot model', description: 'Set the AI model.', section: 'model', documented: true },
    { name: 'GH_TOKEN', set: true, value: '<hidden>', masked: true, source: 'env:GH_TOKEN', in_process: true, persisted: [],
      drives: [], label: 'Gh token', description: 'Authentication token.', section: 'startup', documented: true },
    { name: 'COPILOT_HOME', set: false, value: '', masked: false, source: 'env:COPILOT_HOME', in_process: false, persisted: [],
      drives: [], label: 'Copilot home', description: 'Override the configuration and state directory.', section: 'startup', documented: true },
  ],
};
const SNAP_ENV = {
  root: PROJ,
  tools: [{ tool: 'copilot-cli', label: 'Copilot CLI', files: [] }],
  tool_configs: [COPILOT_ENV],
  live_monitor: {},
};

describe('Environment variables', () => {
  it('names COPILOT_MODEL in Set in, in the chain and as the chip, never a bare env', () => {
    const { container } = renderAt('tool=copilot-cli', { snap: SNAP_ENV });
    const r = rowByKey(container, 'model');
    expect(r.querySelector('.st-scope').textContent).toBe('env');
    expect(r.querySelector('.st-src').textContent).toBe('COPILOT_MODEL');
    // The header chips: the settings file and the variable; no chip named "env".
    const chips = [...container.querySelectorAll('.st-bar__files .st-chip')].map(c => c.textContent);
    expect(chips).toEqual(['settings.json', '$COPILOT_MODEL']);
    expect(container.querySelector('.st-bar__sub').textContent).toContain('in 1 file and 1 variable');
    fireEvent.click(r);
    const levels = [...container.querySelectorAll('[data-testid="st-inspector-row"] .st-chain__lv')];
    const cells = l => ['.st-chain__sc', '.st-chain__v', '.st-chain__src'].map(c => l.querySelector(c).textContent.trim());
    expect(levels.map(cells)).toEqual([['user', 'gpt-6-astra', 'settings.json:19'], ['env', 'gpt-6-sol', 'COPILOT_MODEL']]);
    expect(levels[1].classList.contains('is-win')).toBe(true);
    expect(container.textContent).toContain('The variable COPILOT_MODEL wins');
  });

  it('the Environment layer card shows the count and the names of the set variables', () => {
    const { container } = renderAt('tool=copilot-cli', { snap: SNAP_ENV });
    const card = container.querySelector('.st-scopechip[data-scope="env"]');
    expect(card.querySelector('.st-scopechip__file').textContent).toBe('COPILOT_MODEL, GH_TOKEN');
    expect(card.getAttribute('title')).toContain('Set: COPILOT_MODEL, GH_TOKEN');
    expect(card.textContent).not.toContain('environment');
  });

  it('the variable chip opens the environment panel, not the file viewer', () => {
    const { container, openFile } = renderAt('tool=copilot-cli', { snap: SNAP_ENV });
    fireEvent.click(container.querySelector('.st-bar__files .st-chip--env'));
    expect(openFile).not.toHaveBeenCalled();
    const insp = container.querySelector('[data-testid="st-inspector-env"]');
    expect(insp.querySelector('.st-insp__title').textContent).toBe('COPILOT_MODEL');
    expect(insp.querySelector('[data-testid="st-env-value"]').textContent).toBe('gpt-6-sol');
    const where = insp.querySelector('[data-testid="st-env-where"]').textContent;
    expect(where).toContain("aictl's environment");
    expect(where).toContain('Registry');
    expect(where).toContain('HKEY_CURRENT_USER\\Environment');
    expect(insp.querySelector('[data-testid="st-env-drives"]').textContent).toContain('Model');
    expect(new URLSearchParams(window.location.search).get('row')).toBe('env:COPILOT_MODEL');
    // Set in and the chain entry open the same panel.
    fireEvent.click(rowByKey(container, 'model').querySelector('.st-src'));
    expect(openFile).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="st-inspector-env"]')).toBeTruthy();
  });

  it('lists every variable of the tool, set first, the unset ones with the toggle; secrets stay hidden', () => {
    const { container, getByText } = renderAt('tool=copilot-cli', { snap: SNAP_ENV });
    const table = container.querySelector('[data-testid="st-env-table"]');
    const names = () => [...table.querySelectorAll('tr[data-env]')].map(t => t.getAttribute('data-env'));
    expect(names()).toEqual(['COPILOT_MODEL', 'GH_TOKEN']);
    expect(table.querySelector('.st-group').textContent).toContain('+1 unset');
    const token = table.querySelector('tr[data-env="GH_TOKEN"]');
    expect(token.querySelector('.st-c-val').textContent).toBe('hidden');
    expect(container.textContent).not.toContain('<hidden>');
    expect(table.querySelector('tr[data-env="COPILOT_MODEL"]').textContent).toContain('process · HKEY_CURRENT_USER\\Environment');
    fireEvent.click(getByText('Show unset knobs'));
    expect(names()).toEqual(['COPILOT_MODEL', 'GH_TOKEN', 'COPILOT_HOME']);
    fireEvent.click(token);
    expect(container.querySelector('[data-testid="st-env-value"]').textContent).toBe('hidden');
  });

  it('the navigator has an Environment variables entry that shows only the variables', () => {
    const { container } = renderAt('tool=copilot-cli', { snap: SNAP_ENV });
    fireEvent.click(container.querySelector('.st-nav__sub[data-sec="env"]'));
    expect(rowByKey(container, 'model')).toBeNull();
    expect(container.querySelector('[data-testid="st-env-table"]')).toBeTruthy();
    expect(container.querySelector('.st-empty')).toBeNull();
  });

  it('a bare env source from an older server is not a file chip and opens no file', () => {
    const old = {
      ...COPILOT_ENV, env_vars: undefined, scopes: undefined,
      sections: [{ id: 'model', title: 'Model', rows: [row('model', 'gpt-6-sol', 'text', { label: 'Model', source: 'env', scope: 'env' })] }],
    };
    const { container, openFile } = renderAt('tool=copilot-cli', { snap: { ...SNAP_ENV, tool_configs: [old] } });
    const chips = [...container.querySelectorAll('.st-bar__files .st-chip')].map(c => c.textContent);
    expect(chips).toEqual(['settings.json']);
    const src = rowByKey(container, 'model').querySelector('.st-src');
    expect(src.tagName).toBe('SPAN');
    fireEvent.click(src);
    expect(openFile).not.toHaveBeenCalled();
  });
});
