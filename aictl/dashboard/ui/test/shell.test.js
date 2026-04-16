import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { renderHook, act } from '@testing-library/preact';

import DeltaBadge from '../src/components/shell/DeltaBadge.js';
import SkipLink from '../src/components/shell/SkipLink.js';
import CommandPalette from '../src/components/shell/CommandPalette.js';
import GlobalHeader from '../src/components/shell/GlobalHeader.js';
import ActivityRail from '../src/components/shell/ActivityRail.js';
import Metric from '../src/components/Metric.js';

import { useSavedViews } from '../src/hooks/useSavedViews.js';
import { useCommandPalette } from '../src/hooks/useCommandPalette.js';
import { announce, focusTrap } from '../src/utils/a11y.js';

afterEach(() => cleanup());
beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});

describe('DeltaBadge', () => {
  it('renders arrow and percent', () => {
    const { getByText } = render(html`<${DeltaBadge} pct=${12} direction="up"/>`);
    expect(getByText(/▲ 12%/)).toBeInTheDocument();
  });
  it('returns null when pct missing', () => {
    const { container } = render(html`<${DeltaBadge}/>`);
    expect(container.textContent).toBe('');
  });
  it('uses danger variant when inverse + up', () => {
    const { container } = render(html`<${DeltaBadge} pct=${5} direction="up" inverse=${true}/>`);
    expect(container.querySelector('.aictl-ui-badge--danger')).toBeTruthy();
  });
  it('uses success variant when direction=up (default good-up)', () => {
    const { container } = render(html`<${DeltaBadge} pct=${5} direction="up"/>`);
    expect(container.querySelector('.aictl-ui-badge--success')).toBeTruthy();
  });
});

describe('Metric with delta', () => {
  it('renders delta badge when delta prop provided', () => {
    const { container } = render(html`<${Metric} label="CPU" value="42%"
      delta=${{ pct: 10, direction: 'up' }}/>`);
    expect(container.querySelector('.metric-delta')).toBeTruthy();
  });
  it('omits delta badge when prop absent', () => {
    const { container } = render(html`<${Metric} label="CPU" value="42%"/>`);
    expect(container.querySelector('.metric-delta')).toBeFalsy();
  });
});

describe('SkipLink', () => {
  it('renders a skip link targeting main-content', () => {
    const { container } = render(html`<${SkipLink}/>`);
    const a = container.querySelector('a.skip-link');
    expect(a).toBeTruthy();
    expect(a.getAttribute('href')).toBe('#main-content');
  });
});

describe('CommandPalette', () => {
  const baseCommands = [
    { id: 'tab:overview', group: 'Jump to tab', label: 'Dashboard', action: vi.fn() },
    { id: 'tab:sessions', group: 'Jump to tab', label: 'Sessions',  action: vi.fn() },
    { id: 'range:1h',     group: 'Range',       label: 'Set range: 1h', action: vi.fn() },
  ];

  it('renders when open and shows commands grouped', () => {
    const { getByText } = render(html`<${CommandPalette}
      commands=${baseCommands} isOpen=${true} onClose=${() => {}}/>`);
    expect(getByText('Dashboard')).toBeInTheDocument();
    expect(getByText('Jump to tab')).toBeInTheDocument();
  });

  it('filters commands by query', () => {
    const { getByLabelText, queryByText, getByText } = render(html`<${CommandPalette}
      commands=${baseCommands} isOpen=${true} onClose=${() => {}}/>`);
    const input = getByLabelText('Search commands');
    fireEvent.input(input, { target: { value: 'sess' } });
    expect(getByText('Sessions')).toBeInTheDocument();
    expect(queryByText('Dashboard')).toBeNull();
  });

  it('runs active command on Enter and calls onClose', () => {
    const onClose = vi.fn();
    const action = vi.fn();
    const cmds = [{ id: 'a', group: 'G', label: 'Alpha', action }];
    const { getByLabelText } = render(html`<${CommandPalette}
      commands=${cmds} isOpen=${true} onClose=${onClose}/>`);
    const input = getByLabelText('Search commands');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(action).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('arrow keys move selection', () => {
    const { getByLabelText, container } = render(html`<${CommandPalette}
      commands=${baseCommands} isOpen=${true} onClose=${() => {}}/>`);
    const input = getByLabelText('Search commands');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = container.querySelector('.cmdk-item--active');
    expect(active.getAttribute('data-cmd-idx')).toBe('1');
  });
});

describe('useCommandPalette hook', () => {
  it('Cmd+K toggles open state', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
    act(() => {
      const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      document.dispatchEvent(e);
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      document.dispatchEvent(e);
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('recordUse tracks LRU up to 5', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.recordUse('a');
      result.current.recordUse('b');
      result.current.recordUse('c');
      result.current.recordUse('d');
      result.current.recordUse('e');
      result.current.recordUse('f');
    });
    expect(result.current.lru.length).toBe(5);
    expect(result.current.lru[0]).toBe('f');
  });
});

describe('useSavedViews hook', () => {
  function harness() {
    return renderHook(() => {
      const [tab, setTab] = useState('overview');
      const [tools, setTools] = useState(null);
      const saved = useSavedViews(
        { tab, range: { id: '1h' }, tools, density: 'normal', theme: 'auto' },
        (v) => { setTab(v.tab); setTools(v.tools); },
      );
      return { ...saved, tab, setTab };
    });
  }

  it('saves, applies and deletes views', () => {
    const { result } = harness();
    act(() => { result.current.saveView('My View'); });
    expect(result.current.views.length).toBe(1);
    const id = result.current.views[0].id;
    act(() => { result.current.setTab('sessions'); });
    expect(result.current.tab).toBe('sessions');
    act(() => { result.current.applyView(id); });
    expect(result.current.tab).toBe('overview');
    act(() => { result.current.deleteView(id); });
    expect(result.current.views.length).toBe(0);
  });

  it('ignores empty names on save', () => {
    const { result } = harness();
    act(() => { result.current.saveView('   '); });
    expect(result.current.views.length).toBe(0);
  });

  it('matchingView detects state equality', () => {
    const { result } = harness();
    act(() => { result.current.saveView('M'); });
    expect(result.current.matchingView).toBeTruthy();
  });
});

describe('GlobalHeader', () => {
  const defaults = {
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

  it('renders banner with product name and opens palette trigger', () => {
    const openFn = vi.fn();
    const { getByRole, getByLabelText } = render(html`<${GlobalHeader}
      ...${defaults} onOpenPalette=${openFn}/>`);
    expect(getByRole('banner')).toBeInTheDocument();
    fireEvent.click(getByLabelText('Open command palette'));
    expect(openFn).toHaveBeenCalledOnce();
  });

  it('lists saved views and calls onApplyView', () => {
    const apply = vi.fn();
    const { getByLabelText, getByText } = render(html`<${GlobalHeader}
      ...${defaults}
      views=${[{ id: 'v1', name: 'Morning', tab: 'overview' }]}
      onApplyView=${apply}/>`);
    fireEvent.click(getByLabelText('Saved views'));
    expect(getByText('Morning')).toBeInTheDocument();
    fireEvent.click(getByLabelText('Apply view Morning'));
    expect(apply).toHaveBeenCalledWith('v1');
  });
});

describe('ActivityRail', () => {
  const snap = { tools: [
    { tool: 'claude-code', label: 'Claude Code', live: { sessions: [
      { session_id: 'claude-code:proj:abc', active: true, estimated_tokens: 1234, token_series: [1,2,3,4] },
    ] } },
  ] };

  it('renders active sessions', () => {
    const { getByLabelText } = render(html`<${ActivityRail} snap=${snap}/>`);
    expect(getByLabelText(/Session claude-code:proj:abc/)).toBeInTheDocument();
  });

  it('dispatches aictl:select-session on click and calls onSelectSession', () => {
    const onSel = vi.fn();
    const listener = vi.fn();
    document.addEventListener('aictl:select-session', listener);
    const { getByLabelText } = render(html`<${ActivityRail} snap=${snap}
      onSelectSession=${onSel}/>`);
    fireEvent.click(getByLabelText(/Session claude-code:proj:abc/));
    expect(onSel).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
    document.removeEventListener('aictl:select-session', listener);
  });

  it('collapse toggle persists to localStorage', () => {
    const { getByLabelText } = render(html`<${ActivityRail} snap=${snap}/>`);
    const btn = getByLabelText('Collapse activity rail');
    fireEvent.click(btn);
    // aria-expanded flips to reflect new state; toggle should also flip label.
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('a11y utils', () => {
  it('announce creates a polite live region', () => {
    announce('Hello world');
    const el = document.getElementById('aictl-a11y-live');
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-live')).toBe('polite');
  });

  it('announce with assertive uses separate region', () => {
    announce('Urgent', 'assertive');
    const el = document.getElementById('aictl-a11y-live-assertive');
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-live')).toBe('assertive');
  });

  it('focusTrap returns a teardown fn', () => {
    const div = document.createElement('div');
    const teardown = focusTrap(div);
    expect(typeof teardown).toBe('function');
    teardown();
  });
});
