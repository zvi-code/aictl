import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import MiniChart from './MiniChart.js';

export default function ChartCard({label, value, valColor, data, chartColor, smooth, refLines, yMax, dp}) {
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

  return html`<div class="chart-box" role="img" aria-label=${'Chart: '+label+' — current value: '+(value||'no data')} ...${dp ? {'data-dp': dp} : {}}>
    <div class="chart-hdr">
      <span class="chart-label">${label}</span>
      <span class="chart-val" style=${'color:'+(valColor||chartColor||'var(--accent)')} aria-live="polite" aria-atomic="true">${value}</span>
    </div>
    <div style="position:relative">
      ${refPositions.map(r => html`<Fragment>
          <div class="chart-ref-line" style=${'top:'+r.pct+'%'} />
          <div class="chart-ref-label" style=${'top:calc('+r.pct+'% - 8px)'}>${r.label}</div>
        </Fragment>`)}
      ${data && data[0].length>=2 ? html`<${MiniChart} data=${data} color=${chartColor||'var(--accent)'} smooth=${smooth} yMax=${yMax}/>` :
        html`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`;
}
