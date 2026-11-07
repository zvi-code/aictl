// The tool filter's shared definition of "selected" and audit scoping.
import { describe, it, expect } from 'vitest';
import { isToolSelected, isNoneSelected } from '../src/utils/toolScope.js';
import { scopeAudit } from '../src/utils/auditScope.js';

const KEEP = 'copilot-vscode';
const SENTINEL = 'gemini-cli';
const NOW = Math.floor(Date.now() / 1000);

const AUDIT = {
  project: '/work', scanned_at: NOW, duration_ms: 5,
  sources: [KEEP, SENTINEL].map(id => ({
    tool: id, scope: 'project', path: `/work/${id === KEEP ? 'keep' : 'sentinel'}-instructions.md`, kind: 'instructions',
    loading: 'always', bytes: 10, est_tokens: 3, git_state: 'tracked', readable: true, symlink_target: '', note: '', origin: 'builtin',
  })),
  findings: [], counts: { high: 0, medium: 0, low: 0, info: 0 },
  sources_per_tool: { [KEEP]: 1, [SENTINEL]: 1 },
  drift: { baseline_created: false, new: [], changed: [], removed: [], agent_writes: [] },
  unattributed: [], effective_models: {},
};

describe('the shared definition of "selected"', () => {
  it('null is every tool, an empty list is none, ids match exactly', () => {
    expect(isToolSelected('claude-code', null)).toBe(true);
    expect(isToolSelected('claude-code', [])).toBe(false);
    expect(isNoneSelected([])).toBe(true);
    expect(isNoneSelected(null)).toBe(false);
    expect(isToolSelected('copilot-vscode', ['copilot'])).toBe(false);
    expect(isToolSelected('copilot', ['copilot-vscode', 'copilot-cli'])).toBe(false);
    expect(isToolSelected('copilot-cli', ['copilot-cli'])).toBe(true);
  });
  it('panels and rows that belong to no tool stay; an unattributed or unlisted id does not', () => {
    for (const id of ['aictl', 'vscode', 'project-env', undefined, '']) expect(isToolSelected(id, [])).toBe(true);
    expect(isToolSelected('any', ['claude-code'])).toBe(false);
    expect(isToolSelected('cursor', ['claude-code'])).toBe(false);
  });
});

describe('audit follows the selected tools', () => {
  it('scopeAudit recounts severities from the findings that stay', () => {
    const audit = { ...AUDIT, findings: [
      { rule: 'r1', severity: 'high', tools: [KEEP, 'cursor'] },
      { rule: 'r2', severity: 'high', tools: [SENTINEL] },
      { rule: 'r3', severity: 'low', tools: [] },
    ], counts: { high: 2, low: 1 } };
    const out = scopeAudit(audit, [KEEP]);
    expect(out.findings.map(f => f.rule)).toEqual(['r1', 'r3']);
    expect(out.counts).toEqual({ high: 1, medium: 0, low: 1, info: 0 });
    expect(out.sources.map(s => s.tool)).toEqual([KEEP]);
  });
});
