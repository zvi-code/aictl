// Tool lists follow real activity, and a new tool gets a full UI entry.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import {
  COST_ESTIMATE_NOTE, VERIFIED_TOOLS, orderIdsBySessionCount, orderToolsByActivity, toolLabel,
} from '../src/utils/tools.js';
import { filterSnap } from '../src/app.js';
import { toolVendor } from '../src/components/ui/ToolIcon.js';
import { deriveIssues } from '../src/utils/health.js';
import OverviewNow from '../src/components/OverviewNow.js';

afterEach(() => cleanup());

const tool = (id, sessions = 0, procs = 0) => ({
  tool: id, label: id, live: { session_count: sessions }, processes: Array(procs).fill({}), files: [],
});

describe('orderToolsByActivity', () => {
  it('orders by live sessions, then processes, then name', () => {
    const out = orderToolsByActivity([tool('b', 0, 1), tool('a'), tool('c', 5), tool('d', 0, 3)]);
    expect(out.map(t => t.tool)).toEqual(['c', 'd', 'b', 'a']);
  });
  it('tolerates tools without live data, and does not mutate its input', () => {
    const input = [{ tool: 'z', label: 'z' }, tool('y', 1)];
    expect(orderToolsByActivity(input).map(t => t.tool)).toEqual(['y', 'z']);
    expect(input[0].tool).toBe('z');
  });
  it('no tool name decides the order: swapping activity swaps the result', () => {
    const a = orderToolsByActivity([tool('copilot-cli', 1), tool('claude-code', 9)]);
    const b = orderToolsByActivity([tool('copilot-cli', 9), tool('claude-code', 1)]);
    expect(a[0].tool).toBe('claude-code');
    expect(b[0].tool).toBe('copilot-cli');
  });
  it('filterSnap applies it, so every view inherits the order', () => {
    const out = filterSnap({ tools: [tool('codex-cli', 1), tool('copilot-vscode', 4)] }, null, '');
    expect(out.tools.map(t => t.tool)).toEqual(['copilot-vscode', 'codex-cli']);
  });
  it('session picker tabs: most sessions first', () => {
    expect(orderIdsBySessionCount([{ tool: 'a' }, { tool: 'b' }, { tool: 'b' }])).toEqual(['b', 'a']);
  });
});

describe('copilot-desktop has a full UI entry', () => {
  it('is verified, keeps its sessions through the filter, and has an icon vendor and label', () => {
    expect(VERIFIED_TOOLS.has('copilot-desktop')).toBe(true);
    const out = filterSnap({
      tools: [tool('copilot-desktop', 1)], sessions: [{ tool: 'copilot-desktop' }],
    }, ['copilot-desktop'], '');
    expect(out.tools).toHaveLength(1);
    expect(out.sessions).toHaveLength(1);
    expect(toolVendor('copilot-desktop')).toBe('github');
    expect(toolLabel('copilot-desktop', { tools: [] })).toBe('Copilot Desktop');
  });
  it('prefers the label the snapshot sends', () => {
    expect(toolLabel('x', { tools: [{ tool: 'x', label: 'Tool X' }] })).toBe('Tool X');
    expect(toolLabel('any', null)).toBe('Unattributed');
  });
});

describe('fix commands name the right family', () => {
  const issue = (id, status) => deriveIssues({
    connected: true, hooks: { server_port: 8484, tools: { [id]: { tool: id, status, warnings: [] } } },
  })[0];
  it.each([
    ['copilot-cli', 'aictl enable --tool copilot --port 8484'],
    ['copilot-desktop', 'aictl enable --tool copilot --port 8484'],
    ['copilot-vscode', 'aictl enable --tool copilot --port 8484'],
    ['claude-code', 'aictl hooks install --port 8484'],
    ['newtool', 'aictl enable --port 8484'],
  ])('%s', (id, fix) => {
    expect(issue(id, 'missing').fix).toBe(fix);
  });
});

describe('cost is labelled as an estimate', () => {
  it('the first screen never presents a figure as a charge', () => {
    expect(COST_ESTIMATE_NOTE).toContain('Not a billed amount');
    const { container } = render(html`<${OverviewNow} snap=${{ tools: [], sessions: [] }}
      enabledTools=${null} connected=${true} otelActive=${true} alerts=${[]}
      onOpenSession=${() => {}} onOpenTab=${() => {}}/>`);
    expect(container.querySelector('#now-cost').textContent).toBe('Estimated cost, last 24 h');
  });
});
