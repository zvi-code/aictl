// Configuration screen: glance table, fixed section order, danger badge,
// merged cards for tools that read the same files, list expansion, and the
// fallback for records without `sections`.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import TabToolConfig, { buildSections, SECTION_ORDER } from '../src/components/TabToolConfig.js';

afterEach(() => cleanup());

function renderWith(snap) {
  return render(html`
    <${SnapContext.Provider} value=${{ snap }}>
      <${TabToolConfig}/>
    </${SnapContext.Provider}>
  `);
}

const row = (key, value, kind, extra = {}) => ({
  key, label: extra.label || key, value, kind, source: extra.source || '', danger: !!extra.danger, note: extra.note || '',
});

const CLAUDE = {
  tool: 'claude-code',
  model: 'opus',
  config_files: ['/home/u/.claude/settings.json'],
  settings: { effortLevel: 'high' },
  sections: [
    // Sent out of order on purpose: the screen sorts by the fixed order.
    { id: 'other', title: 'Other settings', rows: [row('theme', 'dark', 'text')] },
    { id: 'autonomy', title: 'Autonomy and safety', rows: [
      row('skipDangerousModePermissionPrompt', true, 'flag', {
        label: 'Skip permission prompt', danger: true, note: 'Runs tools without asking.',
      }),
    ] },
    { id: 'model', title: 'Model', rows: [
      row('model', 'opus', 'text', { source: '/home/u/.claude/settings.json' }),
      row('effortLevel', 'high', 'text'),
    ] },
    { id: 'mcp', title: 'MCP servers', rows: [
      row('mcpServers', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'list', { label: 'Servers' }),
    ] },
    { id: 'hooks', title: 'Hooks', rows: [
      row('hooks', { PreToolUse: 1, PostToolUse: 2, Stop: 1, SessionStart: 1, Notification: 1 }, 'map', { label: 'Events' }),
    ] },
  ],
};

const SHARED = {
  config_files: ['/home/u/.copilot/settings.json'],
  settings: { model: 'gpt-5', banner: 'never' },
  sections: [{ id: 'model', title: 'Model', rows: [row('model', 'gpt-5', 'text')] }],
};

const SNAP = {
  tools: [
    { tool: 'claude-code', label: 'Claude Code' },
    { tool: 'copilot-cli', label: 'Copilot CLI' },
    { tool: 'copilot-desktop', label: 'Copilot Desktop' },
  ],
  tool_configs: [
    CLAUDE,
    { tool: 'copilot-cli', ...SHARED },
    { tool: 'copilot-desktop', ...SHARED },
  ],
};

describe('Configuration screen', () => {
  it('renders the glance table with one row per tool', () => {
    const { container } = renderWith(SNAP);
    const rows = container.querySelectorAll('.cfg-glance tbody tr');
    expect(rows.length).toBe(3);
    expect([...rows].map(r => r.dataset.tool)).toEqual(['claude-code', 'copilot-cli', 'copilot-desktop']);
    const claude = rows[0];
    expect(claude.textContent).toContain('Claude Code');
    expect(claude.textContent).toContain('opus');
    expect(claude.textContent).toContain('high');
    expect(claude.textContent).toContain('skipped');
    // MCP count is the number of listed servers.
    expect(claude.textContent).toContain('8');
    expect(rows[1].textContent).toContain('asked');
  });

  it('renders sections in the fixed order', () => {
    const { container } = renderWith(SNAP);
    const card = container.querySelector('#cfg-claude-code');
    const ids = [...card.querySelectorAll('.cfg-section')].map(s => s.dataset.section);
    expect(ids).toEqual(['model', 'autonomy', 'hooks', 'mcp', 'other']);
    const titles = [...card.querySelectorAll('.cfg-section__title')].map(t => t.textContent);
    expect(titles).toEqual(['Model', 'Autonomy and safety', 'Hooks', 'MCP servers', 'Other settings']);
  });

  it('shows a red danger badge and marks the danger row when it is on', () => {
    const { container } = renderWith(SNAP);
    const card = container.querySelector('#cfg-claude-code');
    const badge = card.querySelector('.cfg-card__head .cfg-badge--danger');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Permission checks skipped');
    const danger = card.querySelector('.cfg-row--danger');
    expect(danger.textContent).toContain('Skip permission prompt');
    expect(danger.querySelector('.cfg-row__note').textContent).toBe('Runs tools without asking.');
    expect(danger.querySelector('.cfg-flag--on').textContent).toBe('on');
  });

  it('merges tools that read the same files into one card', () => {
    const { container, getByText } = renderWith(SNAP);
    const cards = container.querySelectorAll('.cfg-grid .cfg-card');
    expect(cards.length).toBe(2);
    expect(getByText('Copilot CLI and Copilot Desktop')).toBeTruthy();
    expect(getByText('Both read the same files')).toBeTruthy();
    // Both tools keep an anchor for the glance table.
    expect(container.querySelector('#cfg-copilot-cli')).toBeTruthy();
    expect(container.querySelector('#cfg-copilot-desktop')).toBeTruthy();
  });

  it('shows 6 pills of an 8-item list and a "+2 more" button that expands', () => {
    const { container, getByText } = renderWith(SNAP);
    const mcp = container.querySelector('#cfg-claude-code [data-section="mcp"]');
    expect(mcp.querySelectorAll('.cfg-pill').length).toBe(6);
    const more = getByText('+2 more');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    expect(mcp.querySelectorAll('.cfg-pill').length).toBe(8);
    expect(mcp.querySelector('.cfg-more').getAttribute('aria-expanded')).toBe('true');
  });

  it('renders map values as key: value lines', () => {
    const { container } = renderWith(SNAP);
    const lines = container.querySelectorAll('#cfg-claude-code [data-section="hooks"] .cfg-map__line');
    expect(lines.length).toBe(5);
    expect(lines[0].textContent).toContain('PreToolUse:');
  });

  it('builds sections from feature_groups and settings when sections is absent', () => {
    const cfg = {
      tool: 'gemini-cli',
      config_files: ['/home/u/.gemini/settings.json'],
      otel: { enabled: true, endpoint: 'http://localhost:4318' },
      feature_groups: {
        'Safety': { globalAutoApprove: true },
        'Hooks': { claudeHooks: false },
        'Context Files': { agentsMd: true },
        'UI': { vimMode: true },
      },
      settings: { vim_mode: true, 'chat.otel.enabled': true, extra: 'x' },
      mcp_servers: ['fs'],
    };
    const sections = buildSections(cfg);
    const ids = sections.map(s => s.id);
    expect(ids).toEqual(SECTION_ORDER.filter(id => ids.includes(id)));
    expect(ids).toEqual(['telemetry', 'autonomy', 'context', 'hooks', 'mcp', 'other']);
    const auto = sections.find(s => s.id === 'autonomy').rows[0];
    expect(auto).toMatchObject({ key: 'globalAutoApprove', value: true, kind: 'flag', danger: true });
    // vimMode and vim_mode are the same setting; chat.otel.* is in Telemetry.
    const other = sections.find(s => s.id === 'other').rows.map(r => r.key);
    expect(other).toEqual(['vimMode', 'extra']);

    const { container } = renderWith({ tools: [{ tool: 'gemini-cli', label: 'Gemini CLI' }], tool_configs: [cfg] });
    expect(container.querySelectorAll('#cfg-gemini-cli .cfg-section').length).toBe(6);
    expect(container.querySelector('.cfg-glance tbody tr').textContent).toContain('http://localhost:4318');
  });

  it('renders a slim card for a tool with only hints', () => {
    const { container } = renderWith({
      tools: [{ tool: 'copilot365', label: 'Microsoft 365 Copilot' }],
      tool_configs: [{ tool: 'copilot365', hints: ['Configured in the Microsoft 365 admin center.'] }],
    });
    const card = container.querySelector('#cfg-copilot365');
    expect(card.classList.contains('cfg-card--slim')).toBe(true);
    expect(card.querySelector('.cfg-note').textContent).toContain('admin center');
  });

  it('never shows "keys:" summaries', () => {
    const big = Object.fromEntries(Array.from({ length: 9 }, (_, i) => ['rule' + i, i % 2 === 0]));
    const { container } = renderWith({
      tools: [{ tool: 'vscode', label: 'VS Code' }],
      tool_configs: [{
        tool: 'vscode',
        feature_groups: { Safety: { autoApprove: big }, Agent: { enabled: true } },
        settings: { 'chat.tools.terminal.autoApprove': { ls: true, rm: false } },
      }],
    });
    expect(container.textContent).not.toMatch(/keys?:/);
    expect(container.textContent).toContain('+3 more');
  });
});
