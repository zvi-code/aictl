// Snapshot-age pill + always-visible OTel badge (GlobalHeader).
// A dead refresh loop used to look "live" forever because the header only
// showed SSE connection state; these tests pin the data-age surface.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/preact';
import { html } from 'htm/preact';

import GlobalHeader, { SnapshotAge } from '../src/components/shell/GlobalHeader.js';

const HEADER_DEFAULTS = {
  searchQuery: '', onSearchChange: () => {},
  theme: 'auto', cycleTheme: () => {},
  density: 'normal', setDensity: () => {},
  otelActive: false, connected: true,
  globalRange: { id: '1h', since: 0, until: null },
  onPreset: () => {}, onApplyCustom: () => {},
  snap: null, enabledTools: null,
  onToggleTool: () => {}, onSetAllTools: () => {},
  views: [], matchingView: null,
  onApplyView: () => {}, onDeleteView: () => {}, onSaveView: () => {},
  onOpenPalette: () => {},
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-14T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const nowSec = () => Math.floor(Date.now() / 1000);

describe('SnapshotAge', () => {
  it('renders nothing without a timestamp', () => {
    const { container } = render(html`<${SnapshotAge} timestamp=${null}/>`);
    expect(container.textContent).toBe('');
  });

  it('shows a fresh green age pill under the stale threshold', () => {
    const { container } = render(html`<${SnapshotAge} timestamp=${nowSec() - 5}/>`);
    const pill = container.querySelector('.conn.ok');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('● 5s');
    expect(container.querySelector('.conn.stale')).toBeNull();
    expect(pill.getAttribute('aria-live')).toBe('polite');
  });

  it('turns orange with a stale label past 30s', () => {
    const { container } = render(html`<${SnapshotAge} timestamp=${nowSec() - 45}/>`);
    const pill = container.querySelector('.conn.stale');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('stale 45s');
    expect(pill.title).toContain('45s ago');
  });

  it('ticks to stale on its 5s interval without new SSE data', () => {
    const { container } = render(html`<${SnapshotAge} timestamp=${nowSec() - 28}/>`);
    expect(container.querySelector('.conn.ok')).toBeTruthy();
    // Two interval ticks later the same timestamp is 38s old — stale.
    act(() => { vi.advanceTimersByTime(10_000); });
    const pill = container.querySelector('.conn.stale');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('stale 38s');
  });
});

describe('GlobalHeader data-age + OTel badge', () => {
  it('renders the snapshot age from snap.timestamp', () => {
    const { container } = render(html`<${GlobalHeader}
      ...${HEADER_DEFAULTS} snap=${{ tools: [], timestamp: nowSec() - 45 }}/>`);
    const pill = container.querySelector('.conn.stale');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('stale 45s');
  });

  it('always shows the OTel badge — muted "off" when inactive', () => {
    const { container } = render(html`<${GlobalHeader}
      ...${HEADER_DEFAULTS} otelActive=${false}/>`);
    const badge = container.querySelector('.conn.off');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('OTel off');
    expect(badge.title).toContain('aictl otel enable');
  });

  it('shows the OTel badge green when active', () => {
    const { container } = render(html`<${GlobalHeader}
      ...${HEADER_DEFAULTS} otelActive=${true}/>`);
    expect(container.querySelector('.conn.off')).toBeNull();
    const badges = [...container.querySelectorAll('.conn.ok')];
    expect(badges.some(b => b.textContent === 'OTel')).toBe(true);
  });
});
