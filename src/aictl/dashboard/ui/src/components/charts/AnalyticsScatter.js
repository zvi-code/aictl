// AnalyticsScatter — ECharts-powered scatter replacing the uPlot-scatter
// mode in AnalyticsChart.js.
//
// Props:
//   data:    uPlot-style column data [xs, ys0, ys1, ...] — one y-series per
//            category (model, event kind, ...).
//   labels:  series labels (per y-series).
//   height:  px (default 220).
//   logX:    use log x-axis.
//   fmtX / fmtY: optional axis formatters.
//   visualMap: when true, enables density visualMap on the first series.
//
// Legend is click-toggleable — ECharts handles hide/show by series name.

import { useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import EChart, { buildPalette } from './EChart.js';

function pairs(xs, ys) {
  const out = [];
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y == null) continue;
    out.push([xs[i], y]);
  }
  return out;
}

export default function AnalyticsScatter({
  data, labels, height, logX, fmtX, fmtY, xLabel, yLabel, visualMap,
}) {
  const h = height || 220;

  const option = useMemo(() => {
    const palette = buildPalette();
    if (!data || data.length < 2 || !data[0] || data[0].length === 0) {
      return { series: [] };
    }
    const [xs, ...ySeries] = data;
    const series = ySeries.map((ys, i) => ({
      name: labels?.[i] || `Series ${i + 1}`,
      type: 'scatter',
      data: pairs(xs, ys),
      symbolSize: 6,
      itemStyle: { color: palette[i % palette.length], opacity: 0.7 },
      emphasis: { focus: 'series' },
    }));
    return {
      grid: { left: 48, right: 16, top: 24, bottom: 40 },
      legend: { top: 0, type: 'scroll', textStyle: { fontSize: 10 } },
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const [x, y] = p.value;
          const xs = fmtX ? fmtX(x) : String(x);
          const ys = fmtY ? fmtY(y) : String(y);
          return `<b>${p.seriesName}</b><br/>${xLabel || 'x'}: ${xs}<br/>${yLabel || 'y'}: ${ys}`;
        },
      },
      xAxis: {
        type: logX ? 'log' : 'value',
        name: xLabel,
        nameLocation: 'middle',
        nameGap: 24,
        axisLabel: { fontSize: 10, formatter: fmtX },
        splitLine: { show: true },
      },
      yAxis: {
        type: 'value',
        name: yLabel,
        nameLocation: 'middle',
        nameGap: 36,
        axisLabel: { fontSize: 10, formatter: fmtY },
        splitLine: { show: true },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, yAxisIndex: 0, filterMode: 'none', zoomOnMouseWheel: true },
      ],
      visualMap: visualMap ? [{
        type: 'continuous',
        dimension: 1,
        min: 0,
        max: Math.max(1, ...ySeries.flat().filter(v => v != null)),
        inRange: { colorAlpha: [0.3, 1] },
        show: false,
      }] : undefined,
      series,
    };
  }, [data, labels, logX, fmtX, fmtY, xLabel, yLabel, visualMap]);

  return html`<${EChart}
    option=${option}
    style=${'width:100%;height:' + h + 'px'}
    aria-label="scatter chart"
  />`;
}
