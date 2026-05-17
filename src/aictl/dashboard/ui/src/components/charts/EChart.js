// Thin preact wrapper around Apache ECharts with tree-shaken imports.
//
// - Reads CSS tokens from :root to build a palette that honors --accent /
//   --green / --orange / --red / --yellow / etc., so charts follow the
//   light/dark theme automatically.
// - Observes `data-theme` attribute on <html> and re-applies palette.
// - Observes container resize via ResizeObserver.
// - Disposes the ECharts instance on unmount.
//
// Usage:
//   <EChart option=${option} style="height:320px" aria-label="sessions" />

import { useRef, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';

import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import {
  CustomChart, ScatterChart, HeatmapChart, LineChart, BarChart,
} from 'echarts/charts';
import {
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent, TitleComponent,
  VisualMapComponent, BrushComponent,
} from 'echarts/components';

echarts.use([
  CanvasRenderer,
  CustomChart, ScatterChart, HeatmapChart, LineChart, BarChart,
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent, TitleComponent,
  VisualMapComponent, BrushComponent,
]);

// Re-export so other chart modules can import without pulling echarts/core
// through a second path (keeps vite bundling the same module once).
export { echarts };

// --- Palette / theme helpers -------------------------------------------

/** Resolve a CSS variable against :root to a concrete color string. */
function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || fallback;
}

/** Build the color palette used for ECharts `color: [...]` from CSS tokens. */
export function buildPalette() {
  return [
    cssVar('--accent', '#60a5fa'),
    cssVar('--green', '#34d399'),
    cssVar('--orange', '#f97316'),
    cssVar('--yellow', '#fbbf24'),
    cssVar('--red', '#ef4444'),
    cssVar('--model-switch', '#a78bfa'),
    '#06b6d4', '#f472b6', '#84cc16', '#c084fc',
  ];
}

/** Extract a theme-aware text/axis/grid/bg spec. */
export function buildThemeSpec() {
  const bg = cssVar('--bg', '#0b0e14');
  const fg = cssVar('--fg', '#e6e6e6');
  const fg2 = cssVar('--fg2', '#9aa0a6');
  const border = cssVar('--border', '#2a2f3a');
  return { bg, fg, fg2, border };
}

/** Merge palette + theme defaults into a user option (user wins per-key). */
function applyTheme(option) {
  const t = buildThemeSpec();
  const palette = buildPalette();
  return {
    color: palette,
    backgroundColor: 'transparent',
    textStyle: { color: t.fg, fontFamily: 'inherit', fontSize: 11 },
    ...option,
    tooltip: {
      backgroundColor: t.bg,
      borderColor: t.border,
      textStyle: { color: t.fg, fontSize: 11 },
      ...(option?.tooltip || {}),
    },
    // Apply axis defaults but keep any user-provided axis array intact.
    xAxis: decorateAxis(option?.xAxis, t),
    yAxis: decorateAxis(option?.yAxis, t),
  };
}

function decorateAxis(axis, t) {
  if (!axis) return axis;
  const deco = (a) => a ? ({
    axisLine: { lineStyle: { color: t.border }, ...(a.axisLine || {}) },
    axisTick: { lineStyle: { color: t.border }, ...(a.axisTick || {}) },
    axisLabel: { color: t.fg2, ...(a.axisLabel || {}) },
    splitLine: { lineStyle: { color: t.border, opacity: 0.35 }, ...(a.splitLine || {}) },
    ...a,
  }) : a;
  return Array.isArray(axis) ? axis.map(deco) : deco(axis);
}

// --- Component ----------------------------------------------------------

/**
 * Props:
 *   option:    ECharts option object (required).
 *   style:     CSS string for the container element.
 *   className: extra CSS class for the container.
 *   onReady:   (instance) => void — called once the chart is initialised.
 *   onEvent:   { [eventName]: handler } — bound via inst.on().
 *   notMerge:  passthrough to setOption.
 *   aria-label:accessibility description (sets ECharts aria + DOM attr).
 */
export default function EChart(props) {
  const { option, style, className, onReady, onEvent, notMerge } = props;
  const ariaLabel = props['aria-label'];
  const containerRef = useRef(null);
  const instRef = useRef(null);
  const handlersRef = useRef({});

  // Initialise chart + wire observers.  Runs once; option changes flow
  // through the separate effect below.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const inst = echarts.init(el, null, { renderer: 'canvas' });
    instRef.current = inst;

    const resize = () => { try { inst.resize(); } catch { /* disposed */ } };
    const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(el);

    // Re-apply option when theme attribute changes (light/dark swap).
    const mo = (typeof MutationObserver !== 'undefined')
      ? new MutationObserver(() => {
          const current = instRef.current;
          if (!current) return;
          try {
            current.setOption(applyTheme(option || {}), { notMerge: true });
          } catch { /* ignore */ }
        })
      : null;
    if (mo && typeof document !== 'undefined') {
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }

    if (onReady) { try { onReady(inst); } catch { /* user handler */ } }

    return () => {
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
      try { inst.dispose(); } catch { /* already disposed */ }
      instRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply option whenever it changes.
  useEffect(() => {
    const inst = instRef.current;
    if (!inst || !option) return;
    try {
      inst.setOption(applyTheme(option), { notMerge: !!notMerge });
    } catch { /* option error — caller's problem */ }
  }, [option, notMerge]);

  // (Re)bind event handlers.  We diff handlersRef vs onEvent to avoid
  // piling up duplicate listeners on every render.
  useEffect(() => {
    const inst = instRef.current;
    if (!inst) return undefined;
    for (const [name, fn] of Object.entries(handlersRef.current)) {
      try { inst.off(name, fn); } catch { /* ignore */ }
    }
    handlersRef.current = {};
    if (onEvent) {
      for (const [name, fn] of Object.entries(onEvent)) {
        if (typeof fn === 'function') {
          inst.on(name, fn);
          handlersRef.current[name] = fn;
        }
      }
    }
    return undefined;
  }, [onEvent]);

  return html`<div
    ref=${containerRef}
    class=${className || 'echart-container'}
    style=${style || 'width:100%;height:260px'}
    role="img"
    aria-label=${ariaLabel || 'chart'}
  ></div>`;
}
