import { useRef, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import uPlot from 'uplot';
import { fmtK } from '../utils.js';

/** Resolve a CSS color to rgba with given alpha for canvas. */
function _resolveAlpha(color, alpha) {
  if (typeof document === 'undefined') return `rgba(100,100,100,${alpha})`;
  const el = document.createElement('span');
  el.style.color = color;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).color;
  el.remove();
  const m = resolved.match(/[\d.]+/g);
  if (m && m.length >= 3) return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`;
  return `rgba(100,100,100,${alpha})`;
}

function tooltipPlugin(fmtX, fmtY, isTime) {
  let tip;
  return {
    hooks: {
      init(u) {
        tip = document.createElement('div');
        tip.className = 'chart-tooltip';
        tip.style.display = 'none';
        u.over.appendChild(tip);
      },
      setCursor(u) {
        const idx = u.cursor.idx;
        if (idx == null) { tip.style.display = 'none'; return; }
        const parts = [];
        for (let si = 1; si < u.series.length; si++) {
          const v = u.data[si]?.[idx];
          if (v != null) parts.push(fmtY ? fmtY(v) : fmtK(v));
        }
        if (!parts.length) { tip.style.display = 'none'; return; }
        const xv = u.data[0][idx];
        const xLabel = isTime
          ? new Date(xv * 1000).toLocaleTimeString([], {hourCycle: 'h23'})
          : (fmtX ? fmtX(xv) : fmtK(xv));
        tip.innerHTML = `<b>${parts.join(', ')}</b> ${xLabel}`;
        const left = Math.round(u.valToPos(xv, 'x'));
        tip.style.left = Math.min(left, u.over.clientWidth - 100) + 'px';
        tip.style.display = '';
      },
    }
  };
}

const MODEL_COLORS = [
  'var(--green)', 'var(--orange)', 'var(--accent)', 'var(--red)',
  'var(--yellow)', '#8b5cf6', '#06b6d4', '#f472b6',
];

/** Format values for log-scale axis ticks (1, 10, 100, 1K, 10K, 100K, 1M). */
function _fmtLog(v) {
  if (v == null || v === 0) return '0';
  if (v >= 1e6) return Math.round(v / 1e6) + 'M';
  if (v >= 1e3) return Math.round(v / 1e3) + 'K';
  if (v >= 1) return Math.round(v).toString();
  return v.toPrecision(1);
}

/** Pick at most 3 power-of-10 splits for log-scale x-axes. */
function _logSplits(u, axisIdx, scaleMin, scaleMax) {
  const lo = Math.max(0, Math.floor(Math.log10(Math.max(1, scaleMin))));
  const hi = Math.ceil(Math.log10(Math.max(1, scaleMax)));
  const pows = [];
  for (let p = lo; p <= hi; p++) pows.push(Math.pow(10, p));
  if (pows.length <= 3) return pows;
  const mid = Math.floor((lo + hi) / 2);
  return [Math.pow(10, lo), Math.pow(10, mid), Math.pow(10, hi)];
}

/**
 * Flexible chart component for analytics — supports line and scatter modes,
 * non-time x-axes, multi-series, and taller charts.
 *
 * Props:
 *   mode: 'line' | 'scatter'
 *   data: [[x0,x1,...], [y0,y1,...], ...] — column-major, one y-series per model
 *   labels: ['model1', 'model2', ...] — series labels (optional)
 *   colors: ['color1', ...] — per-series colors (optional, defaults to MODEL_COLORS)
 *   height: chart height in px (default 200)
 *   isTime: whether x-axis is time (default false)
 *   fmtX: x-value formatter (optional)
 *   fmtY: y-value formatter (optional)
 *   xLabel: axis label for x (optional)
 *   yLabel: axis label for y (optional)
 */
export default function AnalyticsChart({mode, data, labels, colors, height, isTime, fmtX, fmtY, xLabel, yLabel, logX}) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const h = height || 200;

  useEffect(() => {
    if (!ref.current || !data || data.length < 2 || !data[0] || data[0].length < 2) return;

    try { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } } catch(e) { chartRef.current = null; }

    const seriesCount = data.length - 1;
    const palette = colors || MODEL_COLORS;

    const series = [{}]; // x-axis series placeholder
    for (let i = 0; i < seriesCount; i++) {
      const c = palette[i % palette.length];
      const resolved = _resolveAlpha(c, 0.6);
      if (mode === 'scatter') {
        series.push({
          label: labels?.[i] || `Series ${i+1}`,
          stroke: 'transparent',
          paths: () => null,
          points: { show: true, size: 8, fill: resolved, stroke: 'transparent', width: 0 },
        });
      } else {
        series.push({
          label: labels?.[i] || `Series ${i+1}`,
          stroke: c,
          width: 1.5,
          fill: _resolveAlpha(c, 0.08),
          points: { show: false },
        });
      }
    }

    const opts = {
      width: ref.current.clientWidth || 300,
      height: h,
      padding: [8, 8, 0, 0],
      cursor: { show: true, x: true, y: false, points: { show: mode !== 'scatter' } },
      legend: { show: false },
      select: { show: false },
      scales: {
        x: {
          time: !!isTime,
          ...(logX ? {
            distr: 3,  // uPlot log distribution (base-10 log)
            log: 10,
          } : {}),
        },
        y: { auto: true, range: (u, dMin, dMax) => [Math.max(0, dMin * 0.9), dMax * 1.1 || 1] },
      },
      axes: [
        {
          show: true, size: 28, gap: 2,
          ...(logX ? { splits: _logSplits } : {}),
          values: isTime ? undefined : (u, vals) => vals.map(v => logX ? _fmtLog(v) : (fmtX ? fmtX(v) : fmtK(v))),
          stroke: 'var(--fg2)', font: '10px sans-serif',
          ticks: { stroke: 'var(--border)', width: 1 },
          grid: { stroke: 'var(--border)', width: 1, dash: [2, 4] },
        },
        {
          show: true, size: 50, gap: 2,
          values: (u, vals) => vals.map(v => fmtY ? fmtY(v) : fmtK(v)),
          stroke: 'var(--fg2)', font: '10px sans-serif',
          ticks: { stroke: 'var(--border)', width: 1 },
          grid: { stroke: 'var(--border)', width: 1, dash: [2, 4] },
        },
      ],
      series,
      plugins: [tooltipPlugin(fmtX, fmtY, isTime)],
    };

    try {
      chartRef.current = new uPlot(opts, data, ref.current);
    } catch (e) {
      console.warn('AnalyticsChart: uPlot init failed', e);
      chartRef.current = null;
    }
    return () => { try { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } } catch(e) {} };
  }, [data, mode, colors, labels, isTime, logX, h]);

  useEffect(() => {
    if (!chartRef.current || !ref.current) return;
    const ro = new ResizeObserver(() => {
      if (chartRef.current && ref.current)
        chartRef.current.setSize({ width: ref.current.clientWidth, height: h });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [h]);

  return html`<div class="analytics-chart-wrap" style=${'height:'+h+'px'} ref=${ref}></div>`;
}
