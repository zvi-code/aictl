// Settings workspace: the four pivots, the inspector, search, the scope
// fallback for rows without `scope`, and opening the file viewer at a line.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import SettingsWorkspace from '../src/components/settings/SettingsWorkspace.js';
import TabToolConfig from '../src/components/TabToolConfig.js';
import FileViewer from '../src/components/FileViewer.js';
import * as utils from '../src/utils.js';
import axe from 'axe-core';
import {
  deriveScope, deriveLocation, readSettingsUrl, rowChain, toolEntries, whyWins, getSections, SECTION_ORDER,
} from '../src/components/settings/model.js';

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
  history.replaceState(null, '', '/?tab=config');
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

function renderAt(search, { snap = SNAP, openViewer = vi.fn(), enabledTools = null } = {}) {
  history.replaceState(null, '', '/?tab=config' + (search ? '&' + search : ''));
  const r = render(html`<${SnapContext.Provider} value=${{ snap, openViewer, enabledTools, recentFiles: new Map() }}>
    <${SettingsWorkspace}/>
  </${SnapContext.Provider}>`);
  return { ...r, openViewer };
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
    // 11 agent files plus settings.json from the Claude record: 12, of which 8 show.
    expect(group.querySelectorAll('.st-row').length).toBe(8);
    expect(group.textContent).toContain('4 more');
    fireEvent.click(getByText(/4 more/));
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
    const { container, getByText, openViewer } = renderAt('pivot=findings');
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
    expect(openViewer).toHaveBeenCalledWith(CODEX, { line: 2 });
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
  it('a set-in click calls openViewer with the line', () => {
    const { container, openViewer } = renderAt('tool=vscode');
    fireEvent.click(rowByKey(container, 'chat.tools.global.autoApprove').querySelector('.st-src'));
    expect(openViewer).toHaveBeenCalledWith(VS_USER, { line: 412 });
    // The inspector action opens the same place.
    fireEvent.click(rowByKey(container, 'chat.tools.global.autoApprove'));
    fireEvent.click([...container.querySelectorAll('.st-btn')].find(b => b.textContent === 'Open settings.json at line 412'));
    expect(openViewer).toHaveBeenLastCalledWith(VS_USER, { line: 412 });
  });

  it('FileViewer shows every line, in the source view, with the line highlighted', async () => {
    const text = Array.from({ length: 60 }, (_, i) => 'line ' + (i + 1)).join('\n');
    vi.spyOn(utils, 'fetchFileContent').mockResolvedValue('# Title\n' + text);
    const { container } = render(html`<${SnapContext.Provider} value=${{ snap: { tools: [], agent_memory: [] } }}>
      <${FileViewer} path="/p/CLAUDE.md" line=${40} onClose=${() => {}}/>
    </${SnapContext.Provider}>`);
    await waitFor(() => expect(container.querySelector('.fv-line--hit')).toBeTruthy());
    expect(container.querySelector('.fv-line--hit .fv-ln').textContent).toBe('40');
    expect(container.querySelector('.fv-ellipsis')).toBeNull();
    expect(container.querySelector('.md h1')).toBeNull();
  });
});

describe('Routing', () => {
  it('TabToolConfig renders the workspace, and the URL keeps tab next to the pivot', () => {
    history.replaceState(null, '', '/?tab=config');
    const { container, getByText } = render(html`<${SnapContext.Provider} value=${{ snap: SNAP, openViewer: () => {}, enabledTools: null }}>
      <${TabToolConfig}/>
    </${SnapContext.Provider}>`);
    expect(container.querySelector('.st-ws')).toBeTruthy();
    fireEvent.click(getByText('By topic'));
    const q = readSettingsUrl(window.location.search);
    expect(q.view).toBe('topic');
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('config');
    cleanup();
    expect(window.location.search).toBe('?tab=config');
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
    // An unlocked row keeps the phase-2 hint.
    fireEvent.click(rowByKey(container, 'model'));
    expect(container.querySelector('[data-testid="st-change-hint"]').textContent).toContain('phase 2');
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
    const { container, openViewer } = renderAt('tool=claude-code', { snap: SNAP2 });
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
    expect(openViewer).toHaveBeenLastCalledWith(AGENT_DIR + 'reviewer.md', { line: 4 });
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
