// Context size and hidden context in the board drawer: values with units, unknown never as 0.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, within } from '@testing-library/preact';
import { html } from 'htm/preact';
import Drawer, { breakdownModel, largestResults, reportModel } from '../src/components/board/Drawer.js';
import { instructionsByTool } from '../src/components/board/findings.js';
import { getContextAudit } from '../src/api.js';
import { NOW, agentDetailFixture, boardFixture } from './fixtures/board.fixture.js';

const jsonResponse = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const base = { calls: 2, first: 1000, last: 23650, peak: 40000, drops: 0, series: [1000, 23650] };

function openAgent(tool, context, parent_id = null, tab = 'context', act = {}) {
  const data = boardFixture();
  const id = data.agents[0].id;
  const fixture = agentDetailFixture(id);
  const detail = { ...fixture, agent: { ...fixture.agent, tool, parent_id }, context };
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(detail)));
  const ctx = { data, refreshKey: 1, stopped: {}, toolName: x => x, query: '' };
  return render(html`<${Drawer} stack=${[{ type: 'agent', id, tab }]} ctx=${ctx} act=${act}/>`);
}

function openHidden(audit, filters = { project: 'all' }, loading = false) {
  const ctx = { data: boardFixture(), findings: { audit, loading, error: null, scan: null, incomplete: [], failed: [] }, tools: null, toolName: x => x, settingToolIds: ['claude-code', 'cursor'], filters };
  return render(html`<${Drawer} stack=${[{ type: 'hidden' }]} ctx=${ctx} act=${{}}/>`);
}

afterEach(() => vi.unstubAllGlobals());

/** The value of one label under the context chart, unit and detail included. */
const fact = (container, label) => [...container.querySelectorAll('#dr-actx .bd-facts dt')].find(x => x.textContent === label).nextElementSibling.textContent;

describe('agent context section', () => {
  it('shows what Copilot reports, with units', async () => {
    const { container } = openAgent('copilot-cli', {
      ...base, tool_tokens: 6181, prompt_limit: 922000, limit_share: 0.0256, request_bytes_last: 121075, request_bytes_peak: 500000, available_tools: 35, compactions: [],
      split: { ts: NOW, current: 163801, system: 16479, conversation: 138254, tools: 9065 },
    });
    await waitFor(() => expect(container.textContent).toContain('Tool definitions'));
    const text = container.textContent;
    expect(container.querySelector('#dr-actx .bd-ctxbig').textContent).toBe('24 ktokens at the last call');
    expect(container.querySelector('#dr-actx .bd-ctxof').textContent).toBe('3% of the 922 k prompt limit');
    expect(container.querySelector('#dr-actx .bd-ctxlimit i').style.width).toBe('2.56%');
    expect(fact(container, 'Tool definitions')).toBe('6.2 k tokens35 tools available');
    expect(fact(container, 'Request body')).toBe('121 KBpeak 500 KB');
    expect(text).toContain('Split at the last shutdown');
    expect(text).toContain('164 k tokens');
    expect([...container.querySelectorAll('#dr-actx .bd-ctxbar .bd-segpart')].map(x => x.textContent)).toEqual(['16 k', '138 k', '9.1 k']);
    expect(container.querySelector('#dr-actx .bd-ctxleg').textContent).toBe('System prompt16 k10%Conversation138 k84%Tool definitions9.1 k6%');
    expect(container.querySelector('#dr-actx .bd-ctxlab').textContent).toBe('1.0 k first call');
    expect(container.querySelector('#dr-actx .bd-ctxlab-r').textContent).toBe('24 k last call, peak 40 k · 2 calls');
  });

  it('names the peak once when it is the last call', async () => {
    const { container } = openAgent('copilot-cli', { ...base, peak: 23650, compactions: [], split: null });
    await waitFor(() => expect(container.querySelector('#dr-actx .bd-ctxlab-r')).toBeTruthy());
    expect(container.querySelector('#dr-actx .bd-ctxlab-r').textContent).toBe('24 k last call = peak · 2 calls');
  });

  it('shows each value Copilot did not report as not known, never 0', async () => {
    const { container } = openAgent('copilot-cli', { ...base, tool_tokens: null, prompt_limit: null, limit_share: null, request_bytes_last: null, request_bytes_peak: null, available_tools: null, compactions: [], split: null });
    await waitFor(() => expect(container.textContent).toContain('Split at shutdown: not known'));
    expect(container.querySelector('#dr-actx .bd-ctxof').textContent).toBe('prompt limit n/a');
    expect(container.querySelector('#dr-actx .bd-ctxlimit')).toBeNull();
    expect(fact(container, 'Tool definitions')).toBe('n/atools available n/a');
    expect(fact(container, 'Request body')).toBe('n/apeak n/a');
    expect(fact(container, 'Compactions')).toBe('n/anone stored');
    // The legend keeps its three rows, so a reader sees which figures are missing; no bar is drawn from them.
    expect([...container.querySelectorAll('#dr-actx .bd-ctxlegv')].map(x => x.textContent)).toEqual(['n/a', 'n/a', 'n/a']);
    expect(container.querySelector('#dr-actx .bd-ctxbar')).toBeNull();
  });

  it('lists the compactions of Claude Code, without Copilot figures', async () => {
    const { container } = openAgent('claude-code', { ...base, compactions: [{ ts: NOW, tool: 'claude-code', trigger: 'auto', before: 570051, after: 29283, freed: 540768, duration_ms: 68210 }], split: null });
    await waitFor(() => expect(container.textContent).toContain('Compactions'));
    const text = container.textContent;
    expect(text).toContain('570 k tokens');
    expect(text).toContain('29 k tokens');
    expect(text).toContain('541 k tokens');
    expect(text).toContain('1.1 min');
    expect(text).toContain('auto');
    expect(text).not.toContain('prompt limit');
    expect(text).not.toContain('not known');
    expect(container.querySelector('#dr-actx .bd-ctxsplit')).toBeNull();
    expect(container.querySelector('#dr-actx').style.gridColumn).toBe('span 12');
  });

  it('gives a subagent no shutdown split, because the session owns it', async () => {
    const { container } = openAgent('copilot-cli', { ...base, compactions: [], split: null }, 'parent');
    await waitFor(() => expect(container.textContent).toContain('prompt limit'));
    expect(container.textContent).not.toContain('Split at');
    expect(container.querySelector('#dr-actx .bd-ctxsplit')).toBeNull();
  });

  it('gives the main Copilot agent the split beside the chart on the Context tab, at full width', async () => {
    const { container } = openAgent('copilot-cli', { ...base, compactions: [], split: { ts: NOW, current: 100, system: 50, conversation: 30, tools: 20 } });
    await waitFor(() => expect(container.querySelector('#dr-actx .bd-ctxsplit')).toBeTruthy());
    expect(container.querySelector('#dr-actx').style.gridColumn).toBe('span 12');
    expect(container.querySelector('#dr-actx .bd-ctx2')).toBeTruthy();
  });

  it('shows a short context card in the Overview, the split under the chart, and links to the Context tab', async () => {
    const setDrawerTab = vi.fn();
    const { container } = openAgent('copilot-cli', { ...base, compactions: [], split: { ts: NOW, current: 100, system: 50, conversation: 30, tools: 20 } }, null, 'overview', { setDrawerTab });
    await waitFor(() => expect(container.querySelector('#dr-actxs .bd-ctxsplit')).toBeTruthy());
    const card = container.querySelector('#dr-actxs');
    expect(card.querySelector('.bd-ctx2')).toBeNull();
    expect(card.querySelector('.bd-facts')).toBeNull();
    expect(container.querySelector('#dr-actx')).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: 'Context →' }));
    expect(setDrawerTab).toHaveBeenCalledWith('context');
  });
});

describe('hidden context drawer', () => {
  const audit = {
    project: '/p/alpha', scanned_at: NOW, duration_ms: 5, counts: {}, findings: [], transcripts_read: 3,
    sources: [
      { tool: 'claude-code', path: '/a/CLAUDE.md', loading: 'always', bytes: 4000, est_tokens: 1000, readable: true, scope: 'user', loaded_sessions: 2 },
      { tool: 'claude-code', path: '/a/AGENTS.md', loading: 'always', bytes: 2000, est_tokens: 500, readable: true, scope: 'project', loaded_sessions: 0 },
      { tool: 'cursor', path: '/a/.cursorrules', loading: 'always', bytes: 800, est_tokens: 200, readable: true, scope: 'project', loaded_sessions: null },
      { tool: 'cursor', path: 'server flags', loading: 'dynamic', bytes: 0, est_tokens: 0, readable: false, scope: 'dynamic', loaded_sessions: null },
    ],
  };

  it('shows tokens per tool as an estimate, not one sum', () => {
    const { container } = openHidden(audit);
    const panel = container.querySelector('#dr-hsent');
    expect(panel.textContent).toContain('Estimate from instruction files');
    expect(panel.textContent).toContain('~1.5 k');
    expect(panel.textContent).toContain('~200');
    expect(container.textContent).not.toContain('~1.7 k');
    expect(container.textContent).not.toContain('Tokens sent each call');
  });

  it('names the project that was scanned', () => {
    const { container } = openHidden(audit);
    expect(container.querySelector('.bd-drsub').textContent).toContain('Project /p/alpha');
    expect(container.querySelector('#dr-hsum').textContent).toContain('Project scanned');
    expect(container.querySelector('#dr-hsum').textContent).toContain('alpha');
  });

  it('says when the Project filter could not be scanned', () => {
    const { container } = openHidden(audit, { project: 'gone' });
    expect(container.querySelector('#dr-hsum').textContent).toContain('This scan is of /p/alpha');
  });

  it('says nothing more when the filter is the project that was scanned', () => {
    const { container } = openHidden(audit, { project: '/p/alpha' });
    expect(container.querySelector('#dr-hsum').textContent).not.toContain('This scan is of');
  });

  it('shows a source no file shows as not known, and how many session files loaded a file', () => {
    const { container } = openHidden(audit);
    const rows = [...container.querySelectorAll('#dr-hsrc tbody tr')].map(r => r.textContent);
    expect(rows.find(r => r.includes('server flags'))).toContain('n/a');
    expect(rows.find(r => r.includes('server flags'))).not.toMatch(/~0/);
    expect(rows.find(r => r.includes('/a/CLAUDE.md'))).toContain('2 of 3');
    expect(rows.find(r => r.includes('/a/AGENTS.md'))).toContain('0 of 3');
  });
});

describe('instructionsByTool', () => {
  it('counts a Copilot file for each Copilot tool, and leaves a tool with no always file out', () => {
    const rows = instructionsByTool([
      { tool: 'copilot', loading: 'always', est_tokens: 10, bytes: 40 },
      { tool: 'copilot-cli', loading: 'always', est_tokens: 5, bytes: 20 },
      { tool: 'cursor', loading: 'conditional', est_tokens: 99, bytes: 1 },
    ], ['copilot-cli', 'copilot-vscode', 'cursor']);
    expect(rows.map(r => [r.tool, r.tokens, r.files])).toEqual([['copilot-cli', 15, 2], ['copilot-vscode', 10, 1]]);
  });

  it('gives null, not 0, when no file of a tool can be read', () => {
    const [row] = instructionsByTool([{ tool: 'a', loading: 'always', est_tokens: 0, readable: false }], []);
    expect(row).toMatchObject({ tokens: null, bytes: null, unread: 1, files: 1 });
  });
});

describe('getContextAudit project', () => {
  it('asks about the project on every poll', async () => {
    const answers = [{ status: 'scanning', step: 'x', elapsed_s: 1 }, { findings: [] }];
    const fetchMock = vi.fn(async () => jsonResponse(answers.shift()));
    vi.stubGlobal('fetch', fetchMock);
    await getContextAudit(false, null, { pollMs: 1, project: '/p/a b' });
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual([expect.stringContaining('project=%2Fp%2Fa%20b'), expect.stringContaining('project=%2Fp%2Fa%20b')]);
  });

  it('asks without a project when none is chosen', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ findings: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await getContextAudit();
    expect(fetchMock.mock.calls[0][0]).not.toContain('project=');
  });
});

describe('what fills the context', () => {
  const claude = {
    at_ts: NOW, total: 60000, limit: 200000,
    parts: [
      { key: 'skills', label: 'Skills', tokens: 9000, estimated: true, items: [] },
      { key: 'memory_files', label: 'Memory files', tokens: 4000, estimated: true, items: [{ name: 'AGENTS.md', path: '/r/AGENTS.md', tokens: 3000, estimated: true }, { name: 'CLAUDE.md', path: '/h/CLAUDE.md', tokens: 1000, estimated: true }] },
      { key: 'custom_agents', label: 'Custom agents', tokens: 0, estimated: true, items: [] },
    ],
    rest: { key: 'rest', label: 'System prompt, tools and conversation (not itemized)', tokens: 47000 },
  };
  const rows = c => [...c.querySelectorAll('#dr-actxb .bd-bkrow')].map(r => r.textContent);

  it('lists each kind with its tokens and share of the limit, the part not itemized, then the free space', async () => {
    const { container } = openAgent('claude-code', { ...base, breakdown: claude }, null, 'overview', { setDrawerTab: vi.fn() });
    await waitFor(() => expect(container.querySelector('#dr-actxb')).toBeTruthy());
    expect(rows(container)).toEqual([
      'Skills~9.0 k5%',
      'Memory files2~4.0 k2%',
      'System prompt, tools and conversation (not itemized)47 k24%',
      'Free space140 k70%',
    ]);
    expect(container.querySelector('#dr-actxb').textContent).toContain('30% of the 200 k limit');
    expect(container.querySelector('#dr-actxb').style.gridColumn).toBe('span 6');
    expect(container.querySelector('#dr-actxs')).toBeNull();
  });

  it('opens a kind to its items, largest first', async () => {
    const { container } = openAgent('claude-code', { ...base, breakdown: claude }, null, 'overview', { setDrawerTab: vi.fn() });
    await waitFor(() => expect(container.querySelector('#dr-actxb')).toBeTruthy());
    fireEvent.click(within(container.querySelector('#dr-actxb')).getByRole('button', { name: /Memory files/ }));
    expect([...container.querySelectorAll('.bd-bkitem')].map(i => i.textContent)).toEqual(['AGENTS.md~3.0 k', 'CLAUDE.md~1.0 k']);
  });

  it('keeps the colour of a kind when another kind is missing', () => {
    const one = breakdownModel(claude).rows.find(r => r.key === 'memory_files').c;
    const two = breakdownModel({ ...claude, parts: claude.parts.filter(p => p.key !== 'skills') }).rows.find(r => r.key === 'memory_files').c;
    expect(one).toBe(two);
  });

  it('draws no free space without a limit, and shares are of the last call then', () => {
    const m = breakdownModel({ ...claude, limit: null });
    expect(m.rows.map(r => r.key)).toEqual(['skills', 'memory_files', 'rest']);
    expect(m.whole).toBe(60000);
  });

  it('falls back to the context size card when the record has no breakdown', async () => {
    const { container } = openAgent('copilot-cli', { ...base, compactions: [], split: null }, null, 'overview', { setDrawerTab: vi.fn() });
    await waitFor(() => expect(container.querySelector('#dr-actxs')).toBeTruthy());
    expect(container.querySelector('#dr-actxb')).toBeNull();
  });

  it('puts the breakdown above the full context panel on the Context tab', async () => {
    const { container } = openAgent('claude-code', { ...base, compactions: [], breakdown: claude });
    await waitFor(() => expect(container.querySelector('#dr-actxb')).toBeTruthy());
    expect(container.querySelector('#dr-actxb').nextElementSibling.id).toBe('dr-actx');
  });
});

describe('largest tool results', () => {
  it('lists the five largest results with their size and an estimate in tokens', () => {
    const calls = [10, 4000, 0, 800, 120000, 50, 9000, null].map((b, i) => ({ name: 't' + i, output_bytes: b, ts: NOW }));
    expect(largestResults(calls).map(c => c.name)).toEqual(['t4', 't6', 't1', 't3', 't5']);
  });
});

describe("the tool's own /context report and the measured steps", () => {
  const reported = { ts: NOW - 3600, model: 'claude-opus-5-5', total: 131000, limit: 600000, source: 'claude /context', parts: [
    { key: 'free_space', label: 'Free space', tokens: 436000 },
    { key: 'mcp_tools_deferred', label: 'MCP tools (deferred)', tokens: 167000 },
    { key: 'messages', label: 'Messages', tokens: 59800 },
    { key: 'autocompact_buffer', label: 'Autocompact buffer', tokens: 33000 },
    { key: 'mcp_tools', label: 'MCP tools', tokens: 17400, items: [{ name: 'mcp__a__b', tokens: 156 }] },
    { key: 'memory_files', label: 'Memory files', tokens: 4900 },
  ] };
  const b = { at_ts: NOW, total: 300000, limit: 600000, fixed: 100000, parts: [{ key: 'conversation', label: 'Conversation', tokens: 200000, estimated: false, items: [{ name: 'Tool results: Bash', tokens: 60000, estimated: true, basis: 'call delta' }] }],
    rest: { key: 'rest', label: 'System prompt and tool definitions (not itemized)', tokens: 100000 }, reported,
    heaviest: [{ ts: NOW - 60, tokens: 12218, kind: 'Tool results', name: 'Bash' }, { ts: NOW - 30, tokens: 7372, kind: 'Replies and tool calls', name: null }] };

  it('keeps deferred tools out of the bar and lists them last, the buffer grey before the free space', () => {
    const m = reportModel(reported);
    expect(m.rows.map(r => r.key)).toEqual(['messages', 'mcp_tools', 'memory_files', 'autocompact_buffer', 'free_space']);
    expect(m.outside.map(r => r.key)).toEqual(['mcp_tools_deferred']);
    expect(m.whole).toBe(600000);
  });

  it('says nothing about a fixed first call when the split is the tool\'s own', () => {
    expect(breakdownModel({ ...b, parts: [{ key: 'conversation', label: 'Conversation', tokens: 200000, estimated: false, items: [] }] }).fixed).toBeNull();
    expect(breakdownModel(b).fixed).toBe(100000);
  });

  it('gives a kind the same colour in both views', () => {
    const now = breakdownModel({ ...b, parts: [{ key: 'memory_files', label: 'Memory files', tokens: 3000, estimated: true }] });
    expect(now.rows[0].c).toBe(reportModel(reported).rows.find(r => r.key === 'memory_files').c);
  });

  it('switches between the last call and the report, and names the source', async () => {
    const { container } = openAgent('claude-code', { ...base, breakdown: b }, null, 'overview', { setDrawerTab: vi.fn() });
    await waitFor(() => expect(container.querySelector('#dr-actxb')).toBeTruthy());
    const panel = container.querySelector('#dr-actxb');
    expect(panel.textContent).toContain('100 k tokens were fixed at the first call');
    fireEvent.click(within(panel).getByRole('button', { name: /^\/context, / }));
    expect(panel.querySelector('.bd-psub').textContent).toContain('As claude-opus-5-5 reported it with /context');
    expect(panel.textContent).toContain('22% of the 600 k limit');
    expect(panel.textContent).toContain('Deferred tools are listed by name only');
    const deferred = [...panel.querySelectorAll('.bd-bkrow')].find(r => r.textContent.startsWith('MCP tools (deferred)'));
    expect(deferred.querySelector('.bd-bks').textContent).toBe('');
  });

  it('lists the largest measured additions, named by what came in', async () => {
    const setDrawerTab = vi.fn();
    const { container } = openAgent('claude-code', { ...base, breakdown: b }, null, 'overview', { setDrawerTab });
    await waitFor(() => expect(container.querySelector('#dr-abig tbody tr')).toBeTruthy());
    const rows = [...container.querySelectorAll('#dr-abig tbody tr')].map(r => r.textContent);
    expect(rows[0]).toContain('Tool results: Bash');
    expect(rows[0]).toContain('12 k');
    expect(rows[1]).toContain('Replies and tool calls');
    expect(container.querySelector('#dr-abig .bd-psub').textContent).toBe('Measured from one call to the next');
  });
});
