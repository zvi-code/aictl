import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import panelSource from '../src/components/HiddenContextPanel.js?raw';
import { HiddenContextPanel, STALE_AFTER_S } from '../src/components/HiddenContextPanel.js';

const finding = {
  rule: 'content.tag-chars',
  severity: 'high',
  tool: 'claude-code',
  path: '/repo/CLAUDE.md',
  line: 3,
  snippet: 'Normal U+E0068',
  why: 'Unicode tag characters',
  action: 'Delete the hidden characters.',
  session_id: '',
  count: 2,
  tools: ['claude-code', 'cursor'],
};

function report(over = {}) {
  return {
    project: '/repo',
    scanned_at: Date.now() / 1000,
    duration_ms: 123,
    sources: [{
      tool: 'claude-code', scope: 'project', path: '/repo/CLAUDE.md', kind: 'instructions', loading: 'always',
      bytes: 2048, est_tokens: 512, git_state: 'tracked', readable: true, symlink_target: '', note: '', origin: 'builtin',
    }],
    findings: [finding, { ...finding, rule: 'content.html-comment', severity: 'info', line: 9 }],
    counts: { high: 1, medium: 0, low: 0, info: 1 },
    sources_per_tool: { 'claude-code': 1 },
    drift: {
      baseline_created: false, new: [{ path: '/repo/NEW.md', tool: 'cursor' }], changed: [], removed: [],
      agent_writes: [{ path: '/repo/CLAUDE.md', session_id: 'sess-1', via: 'Edit' }],
    },
    unattributed: [{
      tool: 'claude-code', residual_tokens: 9000, first_request_tokens_median: 40000, inventory_always_tokens: 512,
      dynamic_tokens: 10, builtin_allowance_tokens: 25000, sessions_sampled: 3, method: 'estimate',
    }],
    ...over,
  };
}

function mockFetch(body, ok = true, status = 200) {
  globalThis.fetch = vi.fn(async () => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }));
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const pin = {
  tool: 'copilot-cli', value: 'gpt-x', verified: true, source: '/home/.copilot/settings.json', line: 7, scope: 'user',
  in_project: false, why_in_effect: 'Not in this project, still in effect.', overrides: [], limited: [], conflicts: [],
};

describe('HiddenContextPanel effective model', () => {
  it('shows the value, source path and what it overrides', async () => {
    mockFetch(report({ effective_models: { 'copilot-cli': {
      ...pin,
      overrides: [{ value: 'gpt-old', path: '/repo/.github/copilot/settings.json', line: 2, scope: 'repo' }],
      limited: [{ applies: 'subagent:builder', setting: 's', value: 'gpt-y', path: '/home/.copilot/settings.json', line: 9, in_project: false, why_in_effect: 'w' }],
    } } }));
    render(html`<${HiddenContextPanel} />`);
    const section = await screen.findByTestId('effective-models');
    expect(section.textContent).toContain('gpt-x');
    expect(section.textContent).toContain('/home/.copilot/settings.json:7');
    expect(section.textContent).toContain('Not in this project, still in effect.');
    expect(section.textContent).toContain('overrides gpt-old at /repo/.github/copilot/settings.json:2');
    expect(section.textContent).toContain('subagent:builder: gpt-y');
    expect(section.querySelector('[data-testid="effective-conflict"]')).toBeNull();
  });

  it('puts a conflict first, above every other tool and the counts', async () => {
    const conflict = { request: { values: ['gpt-z'], path: '/repo/.github/agents/a.agent.md', line: 3 }, pin: { value: 'gpt-x', path: '/home/s.json', line: 7 } };
    mockFetch(report({ effective_models: { 'copilot-cli': pin, 'copilot-desktop': { ...pin, tool: 'copilot-desktop', conflicts: [conflict] } } }));
    const { container } = render(html`<${HiddenContextPanel} />`);
    const section = await screen.findByTestId('effective-models');
    expect(container.querySelector('[data-state]').firstElementChild).toBe(section);
    expect(section.querySelector('[data-testid="effective-model"]').dataset.tool).toBe('copilot-desktop');
    const text = screen.getByTestId('effective-conflict').textContent;
    expect(text).toContain('gpt-z');
    expect(text).toContain('/repo/.github/agents/a.agent.md:3');
    expect(text).toContain('/home/s.json:7');
  });

  it('marks an unverified order and states when nothing is pinned', async () => {
    mockFetch(report({ effective_models: {
      'copilot-cli': { ...pin, verified: false },
      'copilot-vscode': { ...pin, tool: 'copilot-vscode', value: '', source: '', why_in_effect: 'No file pins a model.' },
    } }));
    render(html`<${HiddenContextPanel} />`);
    const section = await screen.findByTestId('effective-models');
    expect(section.textContent).toContain('order unverified');
    expect(section.textContent).toContain('no pin');
    expect(section.textContent).toContain('No file pins a model.');
  });

  it('renders no section for a report without models', async () => {
    mockFetch(report());
    const { container } = render(html`<${HiddenContextPanel} />`);
    await waitFor(() => expect(container.querySelector('[data-state="ready"]')).toBeTruthy());
    expect(screen.queryByTestId('effective-models')).toBeNull();
  });
});

describe('HiddenContextPanel', () => {
  it('shows a loading state, then concrete values', async () => {
    mockFetch(report());
    const { container } = render(html`<${HiddenContextPanel} />`);
    expect(container.querySelector('[data-state="loading"]')).toBeTruthy();
    await waitFor(() => expect(container.querySelector('[data-state="ready"]')).toBeTruthy());
    expect(globalThis.fetch.mock.calls[0][0]).toContain('/api/context-audit');
    expect(container.textContent).toContain('/repo/CLAUDE.md:3');
    expect(container.textContent).toContain('content.tag-chars');
    expect(container.textContent).toContain('Normal U+E0068');
    expect(container.textContent).toContain('Delete the hidden characters.');
    expect(container.textContent).toContain('1 high');
    expect(container.textContent).toContain('~512 always-loaded tokens');
    expect(container.textContent).toContain('1 new');
    expect(container.textContent).toContain('sess-1');
    expect(screen.getByTestId('unattributed').textContent).toContain('about 9000 of 40000');
  });

  it('keeps info findings collapsed, and shows the count', async () => {
    mockFetch(report());
    const { container } = render(html`<${HiddenContextPanel} />`);
    await waitFor(() => expect(container.querySelector('[data-state="ready"]')).toBeTruthy());
    expect(container.querySelector('[data-rule="content.html-comment"]')).toBeNull();
    fireEvent.click(screen.getByText('Show 1 info findings'));
    await waitFor(() => expect(container.querySelector('[data-rule="content.html-comment"]')).toBeTruthy());
  });

  it('shows an error state with the message, and rescan recovers', async () => {
    mockFetch({ error: 'boom' }, false, 500);
    const { container } = render(html`<${HiddenContextPanel} />`);
    await waitFor(() => expect(container.querySelector('[data-state="error"]')).toBeTruthy());
    expect(container.textContent).toContain('boom');
    mockFetch(report());
    fireEvent.click(screen.getByText('Rescan'));
    await waitFor(() => expect(container.querySelector('[data-state="ready"]')).toBeTruthy());
  });

  it('shows an empty state', async () => {
    mockFetch(report({ sources: [], findings: [], counts: {} }));
    const { container } = render(html`<${HiddenContextPanel} />`);
    await waitFor(() => expect(container.querySelector('[data-state="empty"]')).toBeTruthy());
    expect(container.textContent).toContain('/repo');
  });

  it('marks an old scan as stale', async () => {
    mockFetch(report({ scanned_at: Date.now() / 1000 - STALE_AFTER_S - 60 }));
    const { container } = render(html`<${HiddenContextPanel} />`);
    await waitFor(() => expect(container.querySelector('[data-state="stale"]')).toBeTruthy());
    expect(screen.getByTestId('scan-age').textContent).toContain('Stale');
  });

  it('says plainly when a source is not readable from a file', async () => {
    const row = { ...report().sources[0], readable: false, loading: 'dynamic', path: 'env:X', note: 'Set; value not shown', git_state: '' };
    mockFetch(report({ sources: [row] }));
    const { container } = render(html`<${HiddenContextPanel} />`);
    await waitFor(() => expect(container.querySelector('[data-state="ready"]')).toBeTruthy());
    expect(container.textContent).toContain('no file shows this');
    expect(container.textContent).toContain('Set; value not shown');
  });

  it('uses theme tokens only and no hardcoded colors', () => {
    expect(panelSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(panelSource).not.toMatch(/\brgba?\(/);
  });
});
