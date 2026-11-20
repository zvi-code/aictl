import { describe, expect, it } from 'vitest';
import { boardQuery, filtersToParams, parseFilters, windowOf } from '../src/data/filters';
import type { DetailContextAudit, DetailEffectiveModels, DetailHooksStatus, DetailOtelStatus } from '../src/data/contract.gen';
import { buildFindings, buildSettings, tailPath } from '../src/panels/overview/b/findings';
import { errorLabel, fmtCredits, fmtDur, fmtLines, fmtMs, fmtN, fmtRate, fmtShare, fmtUsd, sparkPath, toolDisplayName, weekdayLabel } from '../src/design/format';

describe('filters in the URL', () => {
  it('round trips every filter', () => {
    const f = parseFilters('?range=7d&project=alpha&model=m&status=failed&q=retry&sel=100-200&tools=a,b');
    expect(f).toMatchObject({ range: { id: '7d' }, project: 'alpha', model: 'm', status: 'failed', q: 'retry', sel: { since: 100, until: 200 } });
    expect(filtersToParams(f)).toMatchObject({ range: '7d', project: 'alpha', model: 'm', status: 'failed', q: 'retry', sel: '100-200' });
  });
  it('leaves the default out of the URL and ignores unknown values', () => {
    const f = parseFilters('?range=live&status=nonsense&sel=9-1');
    expect(f.range.id).toBe('24h');
    expect(f.status).toBe('all');
    expect(f.sel).toBeNull();
    expect(filtersToParams(f)).toMatchObject({ range: null, status: null, sel: null });
  });
  it('keeps a custom range', () => {
    const f = parseFilters('?range=custom&since=100&until=500');
    expect(f.range).toEqual({ id: 'custom', since: 100, until: 500 });
    expect(windowOf(f.range)).toMatchObject({ since: 100, until: 500 });
  });
  it('asks the API with the contract names, and none selected selects nothing', () => {
    const f = parseFilters('?project=alpha&q=x');
    const q = new URLSearchParams(boardQuery(f, ['a', 'b'], { since: 1, until: 2, buckets: 3 }));
    expect(Object.fromEntries(q)).toEqual({ since: '1', until: '2', buckets: '3', tool: 'a,b', project: 'alpha', q: 'x' });
    expect(new URLSearchParams(boardQuery(f, [], { since: 1, until: 2 })).get('tool')).toBe('-');
    expect(new URLSearchParams(boardQuery(f, null, { since: 1, until: 2 })).has('tool')).toBe(false);
  });
  it('rounds a preset window so repeat calls can match', () => {
    expect(windowOf({ id: '24h' }, 1000)).toEqual(windowOf({ id: '24h' }, 1001));
    expect(windowOf({ id: '24h' }, 1000).until - windowOf({ id: '24h' }, 1000).since).toBe(86400);
  });
});

describe('null display', () => {
  it('formats null as n/a and never as zero', () => {
    for (const f of [fmtN, fmtUsd, fmtMs, fmtDur, fmtShare, fmtRate]) {
      expect(f(null)).toBe('n/a');
      expect(f(undefined)).toBe('n/a');
    }
    expect(fmtLines(null, null)).toBe('n/a');
    expect(fmtN(0)).toBe('0');
    expect(fmtUsd(0)).toBe('$0.00');
  });
  it('leaves a gap in a small trend for null', () => {
    expect(sparkPath([1, null, 3], 60, 16).match(/M/g)).toHaveLength(2);
    expect(sparkPath(null, 60, 16)).toBe('');
  });
});

describe('findings', () => {
  const audit: Extract<DetailContextAudit, { findings: unknown }> = {
    project: '/p', scanned_at: 1, duration_ms: 10, capture_mode: 'summary',
    effective_models: {}, sources_per_tool: {}, transcripts_read: 0, drift: {},
    unknown_loaded: [], unattributed: [], failed_steps: [], incomplete: [], timings_ms: {},
    counts: { high: 1, medium: 1 },
    sources: [{ tool: 'tool-a', path: 'a.md', loading: 'always', est_tokens: 2100, in_project: false }],
    findings: [
      { rule: 'drift.changed-source', severity: 'medium', tool: 'tool-a', path: 'a.md', why: 'Sent with each call' },
      { rule: 'dynamic.mcp-server', severity: 'high', tool: 'tool-b', path: 'b.json', line: 3, why: 'Adds a server' },
      { rule: 'x.quiet', severity: 'info', tool: 'tool-a', path: 'c' },
    ],
  };
  const pin = { scope: null, line: null, in_project: false, verified: true, why_in_effect: null, conflicts: [], narrower_pins: 0 };
  const effective: DetailEffectiveModels = {
    'tool-a': { ...pin, tool: 'tool-a', value: 'model-a', source: '~/s.json', line: 88, why_in_effect: 'pin',
      conflicts: [{ requested: ['model-b'], requested_at: 'r.md:3', pinned: 'model-a' }] },
  };
  it('keeps the audit rules: info stays out, and the tool filter applies', () => {
    expect(buildFindings({ audit }).filter(f => f.path !== '~/s.json').map(f => f.path)).toEqual(['a.md', 'b.json']);
    expect(buildFindings({ audit, tools: ['tool-b'] }).map(f => f.path)).toEqual(['b.json']);
  });
  it('offers a command only where one exists, and names it', () => {
    const hooks: DetailHooksStatus = {
      generated_at: 1, window_seconds: 86400, server_port: null, total_configured: 0, total_fired_24h: 0, last_fire_ts: null,
      counts_by_kind: {}, counts_by_tool_kind: {}, warnings: [], sources: [],
      vscode: { settings_path: null, use_hooks: null, hook_files_locations: {} },
      skill_usage: { total_calls_24h: 0, by_skill: [], by_tool: {}, by_tool_skill: {} },
      subagents: { starts_24h: 0, stops_24h: 0, by_tool: {}, recent: [] },
      tool_calls: { total_calls_24h: 0, by_name: [], by_tool: {}, by_tool_name: {} },
      tools: { 'tool-a': { tool: 'tool-a', configured: false, configured_count: 0, configured_events: [], missing_events: [],
        fired_24h: 0, last_fire_ts: null, status: 'unconfigured', warnings: [{ text: 'Written by an older aictl' }], sources: [] } },
    };
    const otel: DetailOtelStatus = {
      active: false, last_receive_at: 0, metrics_received: 0, events_received: 0, errors: 0,
      api_calls_total: 0, api_errors_total: 0, dropped: 0, by_tool: {},
    };
    const list = buildFindings({ audit, effective, hooks, otel });
    expect(list.find(f => f.path === 'a.md')).toHaveProperty('command', 'aictl ctx audit --update-baseline');
    expect(tailPath('/a/b/c/d/e.md')).toBe('…/c/d/e.md');
    expect(tailPath('x/y.md')).toBe('x/y.md');
    expect(list.find(f => f.path === 'b.json')).toMatchObject({ fix: 'Show the line' });
    expect(list.find(f => f.path === '~/s.json')?.effect).toContain('r.md:3');
    expect(list.find(f => f.id === 'hook|tool-a')).toMatchObject({ command: 'aictl hooks repair', what: 'Hook from an older aictl' });
    expect(list.find(f => f.id === 'otel')).toHaveProperty('command', 'aictl otel enable');
  });
  it('shows a pin conflict once when the audit and the effective models both report it', () => {
    const withConflict = { ...audit, findings: [{ rule: 'model.pin-conflicts-request', severity: 'high', tools: ['tool-a'], path: 'r.md', line: 3, why: 'Two models' }] };
    const list = buildFindings({ audit: withConflict, effective });
    expect(list.map(f => f.path)).toEqual(['r.md']);
    expect(list[0].what).toBe('Model set elsewhere overrides what this file asks for');
  });
  it('builds values in force from the same data', () => {
    const { rows, note } = buildSettings({ audit, effective, hooks: null, otel: null, toolIds: ['tool-a', 'tool-b'] });
    expect(rows.map(r => r.label)).toEqual(['Model', 'Instructions sent each call']);
    expect(rows[0].values['tool-a'].warn).toBe(true);
    expect(rows[1].values['tool-a'].v).toBe('1 file, ~2.1 k tokens');
    expect(note).toContain('r.md:3');
  });
  it('counts instructions registered under the generic copilot tool for every Copilot tool', () => {
    const sources = [
      { tool: 'copilot', path: '/p/.github/copilot-instructions.md', loading: 'always', est_tokens: 2227, in_project: true },
      { tool: 'copilot-cli', path: '/h/.copilot/copilot-instructions.md', loading: 'always', est_tokens: 253, in_project: false },
      { tool: 'copilot', path: '/p/.github/instructions/a.instructions.md', loading: 'conditional', est_tokens: 300, in_project: true },
    ];
    const { rows } = buildSettings({ audit: { ...audit, sources }, toolIds: ['copilot-cli', 'copilot-vscode', 'claude-code'] });
    const values = rows.find(r => r.label === 'Instructions sent each call')?.values;
    expect(values).toEqual({ 'copilot-cli': expect.objectContaining({ v: '2 files, ~2.5 k tokens' }),
      'copilot-vscode': expect.objectContaining({ v: '1 file, ~2.2 k tokens' }) });
  });
  it('shows the Claude model with the Copilot models, and a missing pin as no pin', () => {
    const eff: DetailEffectiveModels = {
      'claude-code': { ...pin, tool: 'claude-code', value: 'opus', source: '/h/.claude/settings.json', line: 4 },
      'copilot-cli': { ...pin, tool: 'copilot-cli', value: '', source: '', line: 0, why_in_effect: 'No file pins a model' },
    };
    const { rows } = buildSettings({ effective: eff, toolIds: [] });
    expect(rows.find(r => r.label === 'Model')?.values).toMatchObject({
      'claude-code': { v: 'opus' }, 'copilot-cli': { v: 'No pin' },
    });
  });
});

describe('numbers people can read', () => {
  it('rolls tokens to billions, money to thousands, and time to hours and days', () => {
    expect(fmtN(1_534_900_000)).toBe('1.53 B');
    expect(fmtN(12_300_000_000)).toBe('12.3 B');
    expect(fmtN(999_400_000)).toBe('999.4 M');
    expect(fmtUsd(13482)).toBe('$13 k');
    expect(fmtUsd(9999)).toBe('$9999');
    expect(fmtUsd(1746)).toBe('$1746');
    expect(fmtCredits(48955.93)).toBe('49 k');
    expect(fmtCredits(5423.85)).toBe('5,423.85');
    expect(fmtMs(87.6 * 60000)).toBe('1 h 28 min');
    expect(fmtMs(5189.6 * 60000)).toBe('3 d 14 h');
    expect(fmtMs(59.9 * 60000)).toBe('59.9 min');
    expect(fmtDur(26 * 3600)).toBe('1 d 2 h');
    expect(fmtDur(3 * 86400)).toBe('3 d');
    expect(weekdayLabel(new Date(2026, 10, 7, 12).getTime() / 1000)).toBe('Sat Nov 7');
  });
  it('names MCP tools and error keys for people', () => {
    expect(toolDisplayName('mcp__ingestion-tools__local_query')).toBe('ingestion-tools › local_query');
    expect(toolDisplayName('Bash')).toBe('Bash');
    expect(errorLabel('tool:Bash:Exit code #')).toBe('Bash: Exit code #');
    expect(errorLabel('tool:mcp__ccd_turn__update_plan:PreToolUse hook')).toBe('ccd_turn › update_plan: PreToolUse hook');
    expect(errorLabel('api:api_error')).toBe('API: error');
    expect(errorLabel('api:api_error:')).toBe('API: error');
    expect(errorLabel('api:api_error:overloaded')).toBe('API: error overloaded');
    expect(errorLabel('api:rate_limit')).toBe('API: rate limit');
    expect(errorLabel('')).toBe('n/a');
  });
});
