import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import MiniChart from './MiniChart.js';
import { Icon } from './ui/index.js';

// Muted trend delta (direction + %) computed from the sparkline series.
// Direction only — no good/bad colour — so it stays informational and avoids
// implying a value judgement on metrics that aren't inherently good or bad.
function computeTrend(data) {
  if (!data || !data[1]) return null;
  const series = data[1].filter(v => v != null && !isNaN(v));
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (first > 0) {
    const pct = ((last - first) / first) * 100;
    if (Math.abs(pct) < 1) return null; // stable — show nothing
    return { dir: pct > 0 ? '\u25B2' : '\u25BC', pct: Math.round(Math.abs(pct)) };
  }
  if (last > 0) return { dir: '\u25B2', pct: null }; // rose from zero
  return null;
}

export default function ChartCard({label, value, valColor, data, chartColor, smooth, refLines, yMax, dp, iconName}) {
  const refPositions = useMemo(() => {
    if(!data || !data[1] || data[1].length < 2) return [];
    const max = yMax
      ? Math.max(yMax, data[1].reduce((a, b) => Math.max(a, b), 0) * 1.05)
      : data[1].reduce((a, b) => Math.max(a, b), 0) * 1.1;
    return (refLines || []).map(r => {
      if(max <= 0) return null;
      const pct = (1 - r.value / max) * 100;
      return pct >= 0 && pct <= 95 ? { ...r, pct } : null;
    }).filter(Boolean);
  }, [data, refLines, yMax]);

  const trend = useMemo(() => computeTrend(data), [data]);

  return html`<div class="chart-box" role="img" aria-label=${'Chart: '+label+' — current value: '+(value||'no data')} ...${dp ? {'data-dp': dp} : {}}>
    <div class="chart-hdr">
      <span class="chart-label">${iconName ? html`<${Icon} name=${iconName} size="0.85em"/> ` : ''}${label}</span>
      <span class="chart-val-group">
        ${trend ? html`<span class="chart-trend" aria-hidden="true">${trend.dir}${trend.pct != null ? ' ' + trend.pct + '%' : ''}</span>` : ''}
        <span class="chart-val" style=${'color:'+(valColor||chartColor||'var(--accent)')} aria-live="polite" aria-atomic="true">${value}</span>
      </span>
    </div>
    <div style="position:relative">
      ${refPositions.map(r => html`<Fragment>
          <div class="chart-ref-line" style=${'top:'+r.pct+'%'} />
          <div class="chart-ref-label" style=${'top:calc('+r.pct+'% - 8px)'}>${r.label}</div>
        </Fragment>`)}
      ${data && data[0].length>=2 ? html`<${MiniChart} data=${data} color=${chartColor||'var(--accent)'} smooth=${smooth} yMax=${yMax}/>` :
        html`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`;
}
