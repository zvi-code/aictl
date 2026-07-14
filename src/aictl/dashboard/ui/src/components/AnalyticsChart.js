// AnalyticsChart — backward-compatible wrapper that now delegates to
// ECharts-based implementations:
//   - `scatter` / log-x analytics plots → AnalyticsScatter
//   - `line` plots (time-series)        → echarts line series via EChart
//
// Props are preserved from the previous uPlot-based version:
//   mode: 'line' | 'scatter'
//   data: uPlot-shape column-major [[xs], [ys0], [ys1], ...]
//   labels, colors, height, isTime, fmtX, fmtY, xLabel, yLabel, logX

import { useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { resolveColor } from '../utils.js';
import EChart, { buildPalette } from './charts/EChart.js';
import AnalyticsScatter from './charts/AnalyticsScatter.js';

function pairs(xs, ys, isTime) {
  const out = [];
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y == null) continue;
    out.push([isTime ? xs[i] * 1000 : xs[i], y]);
  }
  return out;
}

export default function AnalyticsChart(props) {
  const { mode, data, labels, colors, height, isTime, fmtX, fmtY, xLabel, yLabel, logX } = props;

  // Line series option — always computed so hook order is stable regardless
  // of which branch renders.
  const h = height || 200;
  const option = useMemo(() => {
    const palette = buildPalette();
    if (!data || data.length < 2 || !data[0] || data[0].length === 0) {
      return { series: [] };
    }
    const [xs, ...ys] = data;
    const series = ys.map((col, i) => {
      const c = resolveColor(colors?.[i], palette[i % palette.length]);
      return {
        name: labels?.[i] || `Series ${i + 1}`,
        type: 'line',
        smooth: false,
        showSymbol: false,
        data: pairs(xs, col, !!isTime),
        lineStyle: { width: 1.5, color: c },
        areaStyle: { opacity: 0.08, color: c },
        connectNulls: false,
      };
    });
    return {
      grid: { left: 48, right: 12, top: 16, bottom: 32 },
      legend: { top: 0, type: 'scroll', textStyle: { fontSize: 10 }, show: (labels?.length || 0) > 1 },
      tooltip: {
        trigger: 'axis',
        formatter: (p) => {
          const rows = Array.isArray(p) ? p : [p];
          const ts = rows[0]?.value?.[0];
          const head = isTime
            ? new Date(ts).toLocaleTimeString([], { hour12: false })
            : (fmtX ? fmtX(ts) : String(ts));
          const body = rows.map(r => {
            const v = r.value?.[1];
            const vs = v == null ? '\u2014' : (fmtY ? fmtY(v) : String(v));
            return `<span style="color:${r.color}">\u25cf</span> ${r.seriesName}: <b>${vs}</b>`;
          }).join('<br/>');
          return `${head}<br/>${body}`;
        },
      },
      xAxis: {
        type: isTime ? 'time' : (logX ? 'log' : 'value'),
        axisLabel: { fontSize: 10, hideOverlap: true, formatter: isTime ? undefined : fmtX },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, formatter: fmtY },
      },
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      series,
    };
  }, [data, labels, colors, isTime, logX, fmtX, fmtY]);

  if (mode === 'scatter') {
    return html`<${AnalyticsScatter}
      data=${data}
      labels=${labels}
      height=${height}
      logX=${logX}
      fmtX=${fmtX}
      fmtY=${fmtY}
      xLabel=${xLabel}
      yLabel=${yLabel}
    />`;
  }

  return html`<${EChart}
    option=${option}
    style=${'width:100%;height:' + h + 'px'}
    aria-label="analytics chart"
  />`;
}
