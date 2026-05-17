// TokenBurnBand — rolling token-burn rate as a line+area band.
//
// Input shape is either:
//   points: [{ ts: <seconds>, tokens: <cumulative or delta> }, ...]
// or pre-bucketed:
//   series: [[ts, value], ...]
//
// Props:
//   points:     optional raw points (ts + tokens per event).
//   series:     optional pre-bucketed [[ts, v], ...].
//   windowSec:  rolling window for rate (default 300s).
//   stepSec:    sampling step (default 60s). Ignored if `series` is passed.
//   isCumulative: whether `tokens` is cumulative. Default true.
//   height:     px (default 220).
//   title:      optional label for the area.

import { useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import EChart, { buildPalette } from './EChart.js';

/** Resample raw events into [ts_ms, tokens_in_window] pairs. */
function computeSeries(points, windowSec, stepSec, isCumulative) {
  if (!points || !points.length) return [];
  const sorted = [...points].sort((a, b) => a.ts - b.ts);
  // Convert cumulative -> deltas if requested.
  const deltas = [];
  let prev = 0;
  for (const p of sorted) {
    const v = Number(p.tokens) || 0;
    if (isCumulative) {
      const d = Math.max(0, v - prev);
      deltas.push({ ts: p.ts, v: d });
      prev = v;
    } else {
      deltas.push({ ts: p.ts, v });
    }
  }
  const start = sorted[0].ts;
  const end = sorted[sorted.length - 1].ts;
  const out = [];
  for (let t = start; t <= end; t += stepSec) {
    let sum = 0;
    const from = t - windowSec;
    for (const d of deltas) {
      if (d.ts > t) break;
      if (d.ts >= from) sum += d.v;
    }
    out.push([t * 1000, sum]);
  }
  return out;
}

export default function TokenBurnBand({
  points, series, windowSec, stepSec, isCumulative, height, title,
}) {
  const h = height || 220;

  const option = useMemo(() => {
    const palette = buildPalette();
    const data = series && series.length
      ? series
      : computeSeries(points, windowSec || 300, stepSec || 60, isCumulative !== false);
    const color = palette[1] || '#34d399';
    return {
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      tooltip: {
        trigger: 'axis',
        formatter: (p) => {
          const row = Array.isArray(p) ? p[0] : p;
          const d = new Date(row.value[0]).toLocaleTimeString([], { hour12: false });
          return `${d}<br/><b>${Math.round(row.value[1]).toLocaleString()}</b> tokens`;
        },
      },
      xAxis: {
        type: 'time',
        axisLabel: { fontSize: 10, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        name: title || 'tokens / window',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 },
      },
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      series: [{
        name: title || 'burn',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data,
        lineStyle: { width: 1.5, color },
        areaStyle: { opacity: 0.25, color },
      }],
    };
  }, [points, series, windowSec, stepSec, isCumulative, title]);

  return html`<${EChart}
    option=${option}
    style=${'width:100%;height:' + h + 'px'}
    aria-label="token burn rate"
  />`;
}
