import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import ContextMap from '../src/components/ContextMap.js';

afterEach(() => cleanup());

// Categories spanning 6 orders of magnitude — the live shape that motivated the
// log-width bars (a 23M transcript next to double-digit hooks). On a LINEAR
// scale the small rows rendered ~0-width slivers; log widths keep every
// non-zero row visible while preserving order.
const SNAP = {
  root: '/w',
  tools: [{
    tool: 'claude-code', label: 'Claude Code',
    files: [
      { path: '/w/p/transcript.jsonl', kind: 'transcript', scope: 'session', tokens: 23_000_000, sent_to_llm: 'no' },
      { path: '/w/p/CLAUDE.md', kind: 'memory', scope: 'project', tokens: 24_000, sent_to_llm: 'yes' },
      { path: '/w/p/hook.sh', kind: 'hooks', scope: 'project', tokens: 67, sent_to_llm: 'no' },
    ],
  }],
};

function barWidths(container) {
  // Per-category rows: the label span is followed by the track whose first
  // child carries the computed width:<pct>% inline style.
  const out = {};
  for (const label of ['transcript', 'memory', 'hooks']) {
    // The ROW label (80px right-aligned span), not the top stacked-bar segment.
    const span = [...container.querySelectorAll('span.text-bold.text-right')]
      .find((e) => e.textContent === label);
    if (!span) continue;
    const track = span.nextElementSibling;
    const fill = track && track.firstElementChild;
    const m = fill && /width:\s*([\d.]+)%/.exec(fill.getAttribute('style') || '');
    if (m) out[label] = parseFloat(m[1]);
  }
  return out;
}

describe('ContextMap — per-category bar scale', () => {
  it('keeps small categories visible (log widths) while preserving order', () => {
    const { container } = render(
      html`<${SnapContext.Provider} value=${{ snap: SNAP }}><${ContextMap}/></${SnapContext.Provider}>`,
    );
    const w = barWidths(container);
    expect(w.transcript).toBeGreaterThan(w.memory);
    expect(w.memory).toBeGreaterThan(w.hooks);
    // The linear widths were 0.1% (memory) and 0.0003% (hooks) — invisible.
    expect(w.memory).toBeGreaterThan(30);
    expect(w.hooks).toBeGreaterThan(10);
  });

  it('labels the encoding so widths are not read as linear', () => {
    const { getByText } = render(
      html`<${SnapContext.Provider} value=${{ snap: SNAP }}><${ContextMap}/></${SnapContext.Provider}>`,
    );
    expect(getByText('bar length: log scale')).toBeInTheDocument();
  });
});
