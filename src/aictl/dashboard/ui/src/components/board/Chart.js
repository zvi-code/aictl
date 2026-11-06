// ─── Board chart — stacked bars or lines in plain SVG ─────────────
// Hover writes to the crosshair and the shared tooltip directly, so moving over
// a chart renders nothing. Dragging marks a time; on release every panel follows.
import { html } from 'htm/preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { chartModel, indexToSel, selToIndex, tipFor } from './chartModel.js';
import { hideTip, showTip } from './tip.js';

const FALLBACK_W = 600;
const NO_STARTS = [];

// One observer for all charts: a resize costs one callback.
let ro = null;
const watchers = new Map();
function watch(el, fn) {
  if (typeof ResizeObserver === 'undefined') return () => {};
  if (!ro) {
    ro = new ResizeObserver(entries => {
      for (const e of entries) watchers.get(e.target)?.(e.contentRect.width);
    });
  }
  watchers.set(el, fn);
  ro.observe(el);
  return () => { watchers.delete(el); ro.unobserve(el); };
}

const barPath = s => {
  const r = Math.min(3, s.w / 2, s.h);
  return `M${s.x} ${s.y + s.h}V${s.y + r}Q${s.x} ${s.y} ${s.x + r} ${s.y}H${s.x + s.w - r}Q${s.x + s.w} ${s.y} ${s.x + s.w} ${s.y + r}V${s.y + s.h}Z`;
};

export default function Chart({ kind, series, unit, h, range, sel, onSelect, aria, max, legendFmt }) {
  const plotRef = useRef(null);
  const crossRef = useRef(null);
  const [width, setWidth] = useState(FALLBACK_W);
  const [brush, setBrush] = useState(null);
  const brushRef = useRef(null);
  brushRef.current = brush;
  const keyIdx = useRef(null);
  const starts = range?.bucket_starts || NO_STARTS;
  const bucketS = range?.bucket_s || 0;
  const n = starts.length;
  const partial = range?.partial_bucket ?? null;

  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return undefined;
    const w = el.getBoundingClientRect().width;
    if (w) setWidth(w);
    return watch(el, nw => { if (nw) setWidth(nw); });
  }, []);

  const selIdx = useMemo(() => selToIndex(sel, starts, bucketS), [sel, starts, bucketS]);
  const shown = brush ? { a: Math.min(brush.a, brush.b), b: Math.max(brush.a, brush.b) } : selIdx;
  const m = useMemo(
    () => chartModel({ kind, series, unit, h, starts, bucketS, max, sel: shown, width, legendFmt, partial }),
    [kind, series, unit, h, starts, bucketS, max, shown?.a, shown?.b, width, legendFmt, partial],
  );
  const mRef = useRef(m);
  mRef.current = m;
  const argsRef = useRef(null);
  argsRef.current = { kind, series, starts, bucketS, partial };

  const idxAt = clientX => {
    const r = plotRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(n - 1, Math.floor(((clientX - r.left) / r.width) * n)));
  };
  const showAt = (i, x, y) => {
    const a = argsRef.current;
    const mm = mRef.current;
    if (crossRef.current) {
      crossRef.current.style.left = ((i + 0.5) / n) * 100 + '%';
      crossRef.current.hidden = false;
    }
    showTip(x, y, tipFor(i, a.kind, a.series, a.starts, a.bucketS, mm.fmt, mm.totals, a.partial));
  };
  const clearHover = () => {
    if (crossRef.current) crossRef.current.hidden = true;
    hideTip();
  };
  useEffect(() => clearHover, []);

  const lastIdx = useRef(-1);
  const onMove = e => {
    if (!n) return;
    const i = idxAt(e.clientX);
    if (brushRef.current && brushRef.current.b !== i) setBrush({ ...brushRef.current, b: i });
    lastIdx.current = i;
    showAt(i, e.clientX, e.clientY);
  };
  const commit = b => {
    if (!onSelect) return;
    const next = indexToSel(b.a, b.b, starts, bucketS);
    const cur = selIdx;
    const lo = Math.min(b.a, b.b);
    const hi = Math.max(b.a, b.b);
    onSelect(cur && cur.a === lo && cur.b === hi ? null : next);
  };
  const onDown = e => {
    if (!n || e.button) return;
    e.preventDefault();
    const i = idxAt(e.clientX);
    const b = { a: i, b: i };
    setBrush(b);
    const up = () => {
      window.removeEventListener('mouseup', up);
      const cur = brushRef.current;
      setBrush(null);
      if (cur) commit(cur);
    };
    window.addEventListener('mouseup', up);
  };
  const onLeave = () => { clearHover(); };

  // Keyboard route for the same actions: arrows read, Shift with arrows marks a
  // time, Enter applies it, Escape clears it.
  const onKey = e => {
    if (!n) return;
    const here = keyIdx.current == null ? (selIdx ? selIdx.b : n - 1) : keyIdx.current;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const i = Math.max(0, Math.min(n - 1, here + (e.key === 'ArrowRight' ? 1 : -1)));
      keyIdx.current = i;
      if (e.shiftKey) setBrush(b => ({ a: b ? b.a : here, b: i }));
      const r = plotRef.current.getBoundingClientRect();
      showAt(i, r.left + ((i + 0.5) / n) * r.width, r.top + 10);
    } else if (e.key === 'Enter' && brushRef.current) {
      e.preventDefault();
      commit(brushRef.current);
      setBrush(null);
    } else if (e.key === 'Escape') {
      if (brushRef.current) { e.stopPropagation(); setBrush(null); } else if (sel && onSelect) { e.stopPropagation(); onSelect(null); }
      clearHover();
    }
  };

  const selL = shown ? (shown.a / n) * 100 : 0;
  const selW = shown ? ((shown.b - shown.a + 1) / n) * 100 : 0;
  return html`<div class="bd-chart">
    <div class="bd-yax" style=${{ height: h + 'px' }} aria-hidden="true">${m.yt.map(y => html`<span key=${y.b} style=${{ bottom: y.b + '%' }}>${y.label}</span>`)}</div>
    <div class="bd-plot" ref=${plotRef} style=${{ height: h + 'px' }} tabindex="0" role="group"
      aria-label=${aria + '. Left and right arrows read each time. Shift with an arrow marks a time, Enter selects it, Escape clears it.'}
      onMouseDown=${onDown} onMouseMove=${onMove} onMouseLeave=${onLeave} onKeyDown=${onKey} onBlur=${clearHover}>
      ${m.yt.map(y => html`<div key=${y.b} class="bd-gl" style=${{ bottom: y.b + '%' }}></div>`)}
      <svg width=${width} height=${h} viewBox=${`0 0 ${width} ${h}`} aria-hidden="true">
        ${m.bars.map(b => html`<g key=${b.i} class=${b.partial ? 'bd-partial' : null} opacity=${b.on ? null : 0.35}>
          ${b.segs.map((s, j) => (j === b.segs.length - 1
            ? html`<path key=${j} d=${barPath(s)} fill=${s.c}/>`
            : html`<rect key=${j} x=${s.x} y=${s.y} width=${s.w} height=${s.h} fill=${s.c}/>`))}
        </g>`)}
        ${m.lines.map((l, j) => html`<polyline key=${j} points=${l.pts} stroke=${l.c}/>`)}
      </svg>
      ${shown ? html`<div class="bd-sel" style=${{ left: selL + '%', width: selW + '%' }}></div>` : null}
      <div class="bd-cross" ref=${crossRef} hidden></div>
    </div>
    <div class="bd-xax" aria-hidden="true">${m.xt.map(x => html`<span key=${x.l} style=${{ left: x.l + '%' }}>${x.label}</span>`)}</div>
  </div>
  <div class="bd-legend">${m.legend.map(l => html`<span class="bd-li" key=${l.label}><i class="bd-sw" style=${{ background: l.c }}></i>${l.label} <em>${l.value}</em></span>`)}</div>`;
}
