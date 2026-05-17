import { useRef, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import uPlot from 'uplot';
import { sma3, fmtK } from '../utils.js';

function tooltipPlugin(fmtVal) {
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
        if (idx == null || !u.data[1] || u.data[1][idx] == null) {
          tip.style.display = 'none';
          return;
        }
        const ts = u.data[0][idx];
        const val = u.data[1][idx];
        const time = new Date(ts * 1000).toLocaleTimeString([], {hourCycle: 'h23'});
        tip.innerHTML = `<b>${fmtVal ? fmtVal(val) : fmtK(val)}</b> ${time}`;
        const left = Math.round(u.valToPos(ts, 'x'));
        tip.style.left = Math.min(left, u.over.clientWidth - 80) + 'px';
        tip.style.display = '';
      },
    }
  };
}

/** Resolve a CSS color (possibly a var()) to an rgba with alpha for canvas fill. */
function _resolveAlpha(color, alpha) {
  if (typeof document === 'undefined') return `rgba(100,100,100,${alpha})`;
  const el = document.createElement('span');
  el.style.color = color;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).color;
  el.remove();
  // resolved is "rgb(r, g, b)" or "rgba(r, g, b, a)"
  const m = resolved.match(/[\d.]+/g);
  if (m && m.length >= 3) return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`;
  return `rgba(100,100,100,${alpha})`;
}

export default function MiniChart({data, color, smooth, height, yMax, fmtVal}) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const h = height || 55;
  useEffect(()=>{
    if(!ref.current || !data || data[0].length<2) return;
    const vals = smooth ? sma3(data[1]) : data[1];
    const plotData = [data[0], vals];
    if(chartRef.current) { chartRef.current.setData(plotData); return; }
    const rangeY = yMax
      ? (u,dMin,dMax) => [0, Math.max(yMax, dMax*1.05)]
      : (u,dMin,dMax) => [Math.max(0,dMin*0.9), dMax*1.1];
    const opts = {
      width: ref.current.clientWidth || 200, height: h,
      padding: [2, 0, 4, 0],
      cursor:{show:true, x:true, y:false, points:{show:false}},
      legend:{show:false}, select:{show:false},
      scales:{x:{time:true},y:{auto:true,range:rangeY}},
      axes:[{show:false,size:0,gap:0},{show:false,size:0,gap:0}],
      series:[{},{stroke:color,width:1.5,fill:_resolveAlpha(color, 0.09)}],
      plugins: [tooltipPlugin(fmtVal)],
    };
    chartRef.current = new uPlot(opts, plotData, ref.current);
    return ()=>{ if(chartRef.current){chartRef.current.destroy();chartRef.current=null;} };
  },[data, color, smooth]);
  useEffect(()=>{
    if(!chartRef.current||!ref.current) return;
    const ro = new ResizeObserver(()=>{
      if(chartRef.current && ref.current) chartRef.current.setSize({width:ref.current.clientWidth,height:h});
    });
    ro.observe(ref.current);
    return ()=>ro.disconnect();
  },[]);
  return html`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${'height:'+h+'px'} ref=${ref}></div>`;
}
