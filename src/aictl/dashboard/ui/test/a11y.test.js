// Axe-core accessibility ratchet. Renders App with mocked data and asserts
// there are no SERIOUS or CRITICAL a11y violations. Also hosts focused
// keyboard/ARIA regression tests for individual primitives.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, act } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import axe from 'axe-core';

// Mock SSE + API so App stays in "connected + snapshot" ready state.
vi.mock('../src/useSse.js', () => ({
  useSse: () => ({ connected: true }),
}));

vi.mock('../src/api.js', () => {
  const empty = { tools: [], sparklines: {}, total_live_sessions: 0 };
  return {
    getSnapshot: () => Promise.resolve(empty),
    getHistory:  () => Promise.resolve({ timestamps: [], series: {} }),
    getEvents:   () => Promise.resolve([]),
    getOtelStatus: () => Promise.resolve({ active: false }),
    streamUrl:   () => 'about:blank',
    getFile:     () => Promise.resolve({ content: '' }),
  };
});

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});
afterEach(() => cleanup());

describe('axe a11y ratchet', () => {
  it('App renders with no serious/critical violations', async () => {
    const { default: App } = await import('../src/app.js');
    const { container } = render(html`<${App}/>`);
    // Wait for initial snapshot fetch + skeleton → real content.
    await waitFor(() => {
      expect(container.querySelector('header[role="banner"]')).toBeTruthy();
    });

    const results = await axe.run(container, {
      // Limit to rules jsdom can evaluate meaningfully.
      rules: {
        'color-contrast': { enabled: false }, // jsdom has no layout
        'region': { enabled: false },         // false positive in partial mount
      },
    });
    const serious = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical',
    );
    if (serious.length) {
      // eslint-disable-next-line no-console
      console.error('Axe violations:\n' + serious.map(v =>
        `  [${v.impact}] ${v.id}: ${v.description}\n    ${v.nodes.map(n => n.html).join('\n    ')}`
      ).join('\n'));
    }
    expect(serious).toEqual([]);
  }, 15000);
});

// ─── Keyboard operability regression tests ─────────────────────

describe('DataTable — keyboard sortable header', () => {
  it('renders the sort toggle as a real <button> whose activation cycles aria-sort', async () => {
    const { default: DataTable } = await import('../src/components/ui/DataTable.js');
    const cols = [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'age',  header: 'Age' },
    ];
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob',   age: 25 },
    ];
    const { getByText, getAllByRole } = render(
      html`<${DataTable} data=${data} columns=${cols}/>`,
    );
    const btn = getByText('Age');
    // A native button is keyboard-activatable (Enter/Space dispatch click).
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
    btn.focus();
    expect(document.activeElement).toBe(btn);
    // Activation (what Enter produces on a native button) changes aria-sort.
    fireEvent.click(btn);
    expect(getAllByRole('columnheader')[1].getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(btn);
    expect(getAllByRole('columnheader')[1].getAttribute('aria-sort')).toBe('descending');
  });
});

describe('Segmented — arrow-key navigation', () => {
  async function setup() {
    const { default: Segmented } = await import('../src/components/ui/Segmented.js');
    function Wrap() {
      const [v, setV] = useState('a');
      return html`<${Segmented} ariaLabel="Pick"
        options=${[{label:'A',value:'a'},{label:'B',value:'b'},{label:'C',value:'c'}]}
        value=${v} onChange=${setV}/>`;
    }
    return render(html`<${Wrap}/>`);
  }

  it('ArrowRight moves selection and focus; wraps at the end', async () => {
    const { getByText, container } = await setup();
    fireEvent.keyDown(getByText('A'), { key: 'ArrowRight' });
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('B');
    expect(document.activeElement.textContent).toBe('B');
    fireEvent.keyDown(getByText('B'), { key: 'ArrowRight' });
    fireEvent.keyDown(getByText('C'), { key: 'ArrowRight' }); // wrap C -> A
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('A');
  });

  it('Home/End jump to first/last option', async () => {
    const { getByText, container } = await setup();
    fireEvent.keyDown(getByText('A'), { key: 'End' });
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('C');
    fireEvent.keyDown(getByText('C'), { key: 'Home' });
    expect(container.querySelector('[aria-checked="true"]').textContent).toBe('A');
  });

  it('keeps roving tabindex: only the selected option is tabbable', async () => {
    const { container } = await setup();
    const tabbable = [...container.querySelectorAll('[role="radio"]')]
      .filter(b => b.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0].textContent).toBe('A');
  });
});

describe('TurnCard — keyboard-toggleable header', () => {
  it('header is a real <button> with aria-expanded that fires onToggle', async () => {
    const { default: TurnCard } = await import('../src/components/transcript/TurnCard.js');
    const onToggle = vi.fn();
    const turn = { ts: 100, prompt: 'p', prompt_preview: 'p', actions: [], tokens: {} };
    const { container } = render(
      html`<${TurnCard} turn=${turn} index=${0} expanded=${false} onToggle=${onToggle}/>`,
    );
    const btn = container.querySelector('.tr-turn-header');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn); // native button: Enter/Space produce click
    expect(onToggle).toHaveBeenCalledOnce();
    // Chevron glyph is decorative.
    expect(container.querySelector('.tr-turn-chevron').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Toast — dismiss button and single live region', () => {
  it('renders a dismiss button that removes the toast', async () => {
    const { default: ToastProvider } = await import('../src/components/ui/ToastProvider.js');
    const { toast } = await import('../src/components/ui/Toast.js');
    const { container, queryByText, getByLabelText } = render(html`<${ToastProvider}/>`);
    act(() => { toast.info('heads up'); });
    expect(queryByText('heads up')).toBeTruthy();
    // Stack container must NOT be its own live region (per-toast roles handle
    // announcements; a container aria-live would double-announce).
    const stack = container.querySelector('.aictl-ui-toast-stack');
    expect(stack.hasAttribute('aria-live')).toBe(false);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    fireEvent.click(getByLabelText('Dismiss notification'));
    expect(queryByText('heads up')).toBeNull();
  });

  it('clears TTL timers for toasts evicted on overflow', async () => {
    vi.useFakeTimers();
    try {
      const { default: ToastProvider } = await import('../src/components/ui/ToastProvider.js');
      const { toast, TOAST_MAX, TOAST_TTL_MS } = await import('../src/components/ui/Toast.js');
      const { container } = render(html`<${ToastProvider}/>`);
      act(() => {
        for (let i = 0; i < TOAST_MAX + 2; i++) toast.info('msg-' + i);
      });
      expect(container.querySelectorAll('.aictl-ui-toast').length).toBe(TOAST_MAX);
      // Advancing past TTL must not throw and must clear the remaining toasts.
      act(() => { vi.advanceTimersByTime(TOAST_TTL_MS + 100); });
      expect(container.querySelectorAll('.aictl-ui-toast').length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses the TTL while hovered and resumes on leave', async () => {
    vi.useFakeTimers();
    try {
      const { default: ToastProvider } = await import('../src/components/ui/ToastProvider.js');
      const { toast, TOAST_TTL_MS } = await import('../src/components/ui/Toast.js');
      const { container, queryByText } = render(html`<${ToastProvider}/>`);
      act(() => { toast.info('sticky'); });
      const el = container.querySelector('.aictl-ui-toast');
      fireEvent.mouseEnter(el);
      act(() => { vi.advanceTimersByTime(TOAST_TTL_MS * 3); });
      expect(queryByText('sticky')).toBeTruthy(); // paused — still visible
      fireEvent.mouseLeave(el);
      act(() => { vi.advanceTimersByTime(TOAST_TTL_MS + 100); });
      expect(queryByText('sticky')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ErrorBoundary — announces failures', () => {
  it('fallback container has role=alert', async () => {
    const { default: ErrorBoundary } = await import('../src/components/ErrorBoundary.js');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      function Thrower() { throw new Error('kaput'); }
      const { container } = render(
        html`<${ErrorBoundary}><${Thrower}/></${ErrorBoundary}>`,
      );
      const alertEl = container.querySelector('[role="alert"]');
      expect(alertEl).toBeTruthy();
      expect(alertEl.textContent).toContain('Something went wrong');
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe('MiniChart / ChartCard — single labelled img role', () => {
  beforeEach(() => {
    // jsdom lacks Canvas 2D + ResizeObserver (needed by uPlot inside MiniChart).
    if (!HTMLCanvasElement.prototype.getContext
      || !HTMLCanvasElement.prototype.getContext.__stubbed) {
      const stub = function () {
        return {
          fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
          putImageData: () => {}, createImageData: () => ({}), setTransform: () => {},
          drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
          beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
          stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
          arc: () => {}, fill: () => {}, measureText: () => ({ width: 10 }),
          transform: () => {}, rect: () => {}, clip: () => {}, setLineDash: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
          strokeRect: () => {},
        };
      };
      stub.__stubbed = true;
      HTMLCanvasElement.prototype.getContext = stub;
    }
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {} unobserve() {} disconnect() {}
      };
    }
    if (typeof globalThis.Path2D === 'undefined') {
      globalThis.Path2D = class {
        moveTo() {} lineTo() {} rect() {} arc() {} arcTo() {}
        closePath() {} addPath() {} bezierCurveTo() {} quadraticCurveTo() {}
        ellipse() {}
      };
    }
  });

  const data = [[1, 2, 3], [10, 20, 15]];

  it('ChartCard exposes exactly one img role with the metric label', async () => {
    const { default: ChartCard } = await import('../src/components/ChartCard.js');
    const { container } = render(
      html`<${ChartCard} label="CPU" value="42%" data=${data}/>`,
    );
    const imgs = container.querySelectorAll('[role="img"]');
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('aria-label')).toContain('CPU');
    // The inner MiniChart is decorative inside the labelled card.
    const wrap = container.querySelector('.chart-wrap');
    expect(wrap.getAttribute('aria-hidden')).toBe('true');
    expect(wrap.getAttribute('role')).toBeNull();
  });

  it('standalone MiniChart keeps a labelled img role', async () => {
    const { default: MiniChart } = await import('../src/components/MiniChart.js');
    const { container } = render(
      html`<${MiniChart} data=${data} ariaLabel="Tokens per minute sparkline"/>`,
    );
    const img = container.querySelector('[role="img"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('aria-label')).toBe('Tokens per minute sparkline');
  });
});
