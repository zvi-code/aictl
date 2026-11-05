// Null costs, billing units, live sessions in the picker, all-tools notes, capture
// config text, hidden-context summary and local_data.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import {
  CostValue, billingUnitLabel, costFigure, sumKnownCost, summarizeUsage,
} from '../src/utils/cost.js';
import { mergeLiveSessions } from '../src/hooks/useSessionPicker.js';
import { contextWindowFor } from '../src/models.js';
import { captureHowto } from '../src/components/ui/TextNotRetained.js';
import AllToolsNote from '../src/components/ui/AllToolsNote.js';
import { summaryFromAudit } from '../src/components/HiddenContextSlot.js';
import { cloudOnly, scopeIsCloudOnly } from '../src/utils/tools.js';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('costFigure', () => {
  it('null is n/a with the reason, never $0', () => {
    const f = costFigure({ cost_usd: null, cost_reason: 'no list price for: x' });
    expect(f).toMatchObject({ main: 'n/a', title: 'no list price for: x', kind: 'none' });
    expect(costFigure(undefined).main).toBe('n/a');
  });
  it('a real zero stays a figure', () => {
    expect(costFigure({ cost_usd: 0 }).main).toBe('$0.00');
  });
  it('billing units lead, the list price is labelled an estimate', () => {
    const f = costFigure({
      billing_unit: 'ai_credits', billing_amount: 27.2403, premium_requests: 2, estimated_list_usd: 0.2724, cost_usd: null,
    });
    expect(f.main).toBe('27.24 AI credits');
    expect(f.sub).toBe('2 premium requests, est. $0.27 at list price');
    expect(f.kind).toBe('billing');
  });
  it('list-price figures are marked est.', () => {
    expect(costFigure({ cost_usd: 1.5 })).toMatchObject({ main: '$1.50', sub: 'est.', kind: 'estimate' });
  });
  it('billingUnitLabel reads naturally', () => {
    expect(billingUnitLabel('premium_requests')).toBe('premium requests');
  });
  it('CostValue puts the reason on hover', () => {
    const { container } = render(html`<${CostValue} row=${{ cost_usd: null, cost_reason: 'why' }}/>`);
    expect(container.textContent).toBe('n/a');
    expect(container.querySelector('[title="why"]')).toBeTruthy();
  });
});

describe('summarizeUsage', () => {
  const usage = { tools: [
    { tool: 'claude-code', cost_usd: 10, total_tokens: 100, sessions: 1 },
    { tool: 'codex-cli', cost_usd: null, cost_reason: 'unpriced', total_tokens: 5, sessions: 1 },
    { tool: 'copilot-cli', billing_unit: 'ai_credits', billing_amount: 3, premium_requests: 1, cost_usd: null, total_tokens: 7, sessions: 2 },
    { tool: 'x', cost_usd: 99, counted_in_totals: false },
  ] };
  it('splits billed from estimated and skips rows not counted', () => {
    const s = summarizeUsage(usage, null);
    expect(s.listUsd).toBe(10);
    expect(s.billed).toEqual([{ unit: 'ai_credits', amount: 3 }]);
    expect(s.premium).toBe(1);
    expect(s.unpriced).toBe(1);
    expect(s.unpricedReason).toBe('unpriced');
    expect(s.tokens).toBe(112);
  });
  it('honours the tool filter', () => {
    const s = summarizeUsage(usage, ['copilot-cli']);
    expect(s.listUsd).toBeNull();
    expect(s.rows.map(r => r.tool)).toEqual(['copilot-cli']);
  });
});

describe('sumKnownCost', () => {
  it('all unknown stays null, partial says what is missing', () => {
    expect(sumKnownCost([{ cost_usd: null, cost_reason: 'r' }])).toEqual({ cost_usd: null, cost_reason: 'r' });
    const p = sumKnownCost([{ cost_usd: 2 }, { cost_usd: null }]);
    expect(p.cost_usd).toBe(2);
    expect(p.cost_reason).toContain('1 of 2');
  });
});

describe('mergeLiveSessions', () => {
  const live = [
    { session_id: 'copilot-vscode:1:100', tool: 'copilot-vscode', started_at: 100, duration_s: 5, files_touched: [] },
    { session_id: 'a', tool: 'claude-code', started_at: 50 },
  ];
  it('adds live sessions the timeline hid, marked live, newest first', () => {
    const out = mergeLiveSessions([{ session_id: 'a', tool: 'claude-code', started_at: 50, files_modified: 3 }], live);
    expect(out.map(s => s.session_id)).toEqual(['copilot-vscode:1:100', 'a']);
    expect(out[0].active).toBe(true);
  });
  it('keeps the richer timeline row when both have the session', () => {
    const out = mergeLiveSessions([{ session_id: 'a', tool: 'claude-code', started_at: 50, files_modified: 3 }], live);
    expect(out.find(s => s.session_id === 'a').files_modified).toBe(3);
  });
  it('tolerates a missing snapshot', () => {
    expect(mergeLiveSessions([{ session_id: 'a' }], undefined)).toHaveLength(1);
  });
});

describe('models', () => {
  it('claude-haiku-5-5 has a 1M window', () => {
    expect(contextWindowFor('claude-haiku-5-5')).toBe(1000000);
  });
});

describe('capture config text', () => {
  it('names the real key and the path for this OS', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Windows NT 10.0' });
    expect(captureHowto()).toContain('capture = "full"');
    expect(captureHowto()).toContain('%APPDATA%\\aictl\\config.toml');
    expect(captureHowto()).not.toContain('capture_mode');
    vi.stubGlobal('navigator', { platform: 'Linux x86_64', userAgent: 'X11' });
    expect(captureHowto()).toContain('~/.config/aictl/config.toml');
  });
});

describe('AllToolsNote', () => {
  it('appears only while a tool filter is active', () => {
    const { container, rerender } = render(html`<${AllToolsNote} enabledTools=${null} what="These charts"/>`);
    expect(container.textContent).toBe('');
    rerender(html`<${AllToolsNote} enabledTools=${['copilot-cli']} what="These charts"/>`);
    expect(container.textContent).toContain('These charts cover all tools');
  });
});

describe('hidden context summary', () => {
  it('counts findings above info, scoped by nothing else', () => {
    const s = summaryFromAudit({ counts: { high: 1, medium: 4, low: 2, info: 10 } });
    expect(s.count).toBe(7);
    expect(s.detail).toContain('1 high');
    expect(summaryFromAudit({ counts: { info: 3 } }).count).toBe(0);
    expect(summaryFromAudit(null)).toBeNull();
  });
});

describe('local_data drives the cloud-only state', () => {
  const none = { sessions: false, tokens: false, cost: false, prompts: false, responses: false };
  const row = { tool: 'copilot365', label: 'M365', files: [{}], processes: [] };
  it('all-false means not available even when config files exist locally', () => {
    const snap = { tools: [row], tool_configs: [{ tool: 'copilot365', local_data: none }] };
    expect(cloudOnly(row, snap)).toBe(true);
    expect(scopeIsCloudOnly(snap, ['copilot365'])).toBe(true);
  });
  it('any tool can declare it; a true value keeps its views', () => {
    const other = { tool: 'foo', files: [], processes: [] };
    expect(cloudOnly(other, { tool_configs: [{ tool: 'foo', local_data: none }] })).toBe(true);
    expect(cloudOnly(other, { tool_configs: [{ tool: 'foo', local_data: { ...none, tokens: true } }] })).toBe(false);
  });
  it('a live session outranks the declaration', () => {
    const live = { ...row, live: { session_count: 1 } };
    expect(cloudOnly(live, { tool_configs: [{ tool: 'copilot365', local_data: none }] })).toBe(false);
  });
});
