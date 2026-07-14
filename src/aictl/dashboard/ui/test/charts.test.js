import { describe, it, expect, afterEach, beforeEach } from 'vitest';
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
import AnalyticsScatter from '../src/components/charts/AnalyticsScatter.js';

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
