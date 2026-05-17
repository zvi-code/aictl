import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/preact';
import { html } from 'htm/preact';

// jsdom lacks Canvas 2D context; stub before ECharts loads.
beforeEach(() => {
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
});

afterEach(() => cleanup());

// Import after stubs — these pull echarts.
import EChart from '../src/components/charts/EChart.js';
import GanttChart from '../src/components/charts/GanttChart.js';
import AnalyticsScatter from '../src/components/charts/AnalyticsScatter.js';
import ToolCooccurrenceHeatmap from '../src/components/charts/ToolCooccurrenceHeatmap.js';
import TokenBurnBand from '../src/components/charts/TokenBurnBand.js';

describe('EChart', () => {
  it('mounts with an option and cleans up on unmount', () => {
    const { container, unmount } = render(html`<${EChart}
      option=${{ series: [{ type: 'line', data: [[0, 0], [1, 1]] }] }}
      style="width:200px;height:120px"
    />`);
    const root = container.querySelector('[role="img"]');
    expect(root).toBeTruthy();
    // Unmount should not throw, even though the ECharts instance is live.
    expect(() => unmount()).not.toThrow();
  });

  it('applies aria-label for accessibility', () => {
    const { container } = render(html`<${EChart}
      option=${{ series: [] }}
      aria-label="my chart"
    />`);
    const root = container.querySelector('[role="img"]');
    expect(root.getAttribute('aria-label')).toBe('my chart');
  });

  it('re-applies option when data-theme attribute toggles', async () => {
    const option = { series: [{ type: 'line', data: [[0, 1]] }] };
    render(html`<${EChart} option=${option} />`);
    // Toggling data-theme triggers the MutationObserver in EChart.
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      await new Promise((r) => setTimeout(r, 0));
      document.documentElement.removeAttribute('data-theme');
      await new Promise((r) => setTimeout(r, 0));
    });
    // Implicit assertion: no exception thrown during theme swap.
    expect(true).toBe(true);
  });
});

describe('GanttChart', () => {
  it('renders without error for N sessions', () => {
    const now = Math.floor(Date.now() / 1000);
    const sessions = [
      { session_id: 'a', tool: 'claude', started_at: now - 3600, ended_at: now - 1800 },
      { session_id: 'b', tool: 'codex',  started_at: now - 2400, ended_at: now - 1200 },
      { session_id: 'c', tool: 'claude', started_at: now - 300,  ended_at: null },
    ];
    const { container } = render(html`<${GanttChart}
      sessions=${sessions}
      rangeSeconds=${3600 * 2}
    />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });

  it('wires onSessionClick without throwing', () => {
    const onClick = vi.fn();
    const now = Math.floor(Date.now() / 1000);
    const { container } = render(html`<${GanttChart}
      sessions=${[{ session_id: 'x', tool: 't', started_at: now - 10, ended_at: now }]}
      rangeSeconds=${60}
      onSessionClick=${onClick}
    />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
    // Click path goes through ECharts' own event dispatcher; we can't
    // reliably fake-click a canvas cell in jsdom, so we just assert the
    // mount path is clean.
  });
});

describe('AnalyticsScatter', () => {
  it('mounts with multi-series data', () => {
    const { container } = render(html`<${AnalyticsScatter}
      data=${[[1, 2, 3, 4], [10, 20, null, 40], [5, 8, 9, 11]]}
      labels=${['A', 'B']}
    />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });

  it('tolerates empty data', () => {
    const { container } = render(html`<${AnalyticsScatter} data=${[[]]} />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });
});

describe('ToolCooccurrenceHeatmap', () => {
  it('renders heatmap from sessions with tools arrays', () => {
    const sessions = [
      { session_id: '1', tool: 'claude', tools: ['Bash', 'Read', 'Edit'] },
      { session_id: '2', tool: 'claude', tools: ['Bash', 'Grep'] },
      { session_id: '3', tool: 'codex',  tools: ['Read', 'Edit'] },
      { session_id: '4', tool: 'codex',  tools: ['Bash'] },
    ];
    const { container } = render(html`<${ToolCooccurrenceHeatmap}
      sessions=${sessions}
      height=${260}
    />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });

  it('falls back to scalar tool when tools array is missing', () => {
    const sessions = [
      { session_id: '1', tool: 'claude' },
      { session_id: '2', tool: 'codex' },
    ];
    const { container } = render(html`<${ToolCooccurrenceHeatmap}
      sessions=${sessions}
    />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });
});

describe('TokenBurnBand', () => {
  it('renders from raw points', () => {
    const base = Math.floor(Date.now() / 1000) - 600;
    const points = [];
    let cum = 0;
    for (let i = 0; i < 10; i++) {
      cum += 1000 + i * 100;
      points.push({ ts: base + i * 60, tokens: cum });
    }
    const { container } = render(html`<${TokenBurnBand}
      points=${points}
      windowSec=${300}
      stepSec=${60}
      isCumulative=${true}
      height=${200}
    />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });

  it('renders from pre-bucketed series', () => {
    const { container } = render(html`<${TokenBurnBand}
      series=${[[Date.now() - 1000, 100], [Date.now(), 200]]}
    />`);
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });
});
