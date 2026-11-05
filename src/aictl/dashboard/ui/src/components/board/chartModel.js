// ─── chartModel — pure geometry and text for the light SVG chart ─
import { NA, UNIT, dayLabel, fmtN, hourLabel, stamp } from './format.js';

const isNil = v => v === null || v === undefined;

function niceMax(mx) {
  if (mx <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(mx)));
  const m = mx / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** The buckets a selected time covers, or null. */
export function selToIndex(sel, starts, bucketS) {
  if (!sel || !starts?.length) return null;
  let lo = -1;
  let hi = -1;
  starts.forEach((s, i) => {
    if (s + bucketS > sel.since && s < sel.until) {
      if (lo < 0) lo = i;
      hi = i;
    }
  });
  return lo < 0 ? null : { a: lo, b: hi };
}
export function indexToSel(a, b, starts, bucketS) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return { since: starts[lo], until: starts[hi] + bucketS };
}

export function bucketLabel(i, starts, bucketS) {
  const ts = i < starts.length ? starts[i] : starts[starts.length - 1] + bucketS;
  return bucketS >= 86400 ? dayLabel(ts) : stamp(ts, true);
}

/** Totals used for the y axis and the tooltip. A bucket of only nulls has total null. */
export function bucketTotals(kind, series, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let t = null;
    for (const s of series) {
      const v = s.vals[i];
      if (isNil(v)) continue;
      t = kind === 'stack' ? (t || 0) + v : Math.max(t === null ? v : t, v);
    }
    out.push(t);
  }
  return out;
}

export function chartModel({ kind, series, unit, h, starts, bucketS, max, sel, width, legendFmt }) {
  const n = starts?.length || 0;
  const fmt = UNIT[unit] || fmtN;
  const totals = bucketTotals(kind, series, n);
  const top = max || niceMax(Math.max(1e-9, ...totals.filter(v => !isNil(v))));
  const yt = [0, 0.5, 1].map(f => ({ b: f * 100, label: f === 0 ? '0' : fmt(top * f) }));
  const stepX = Math.max(1, Math.round(n / 6));
  const xt = [];
  for (let i = stepX >> 1; i < n; i += stepX) {
    xt.push({ l: ((i + 0.5) / n) * 100, label: bucketS >= 43200 ? dayLabel(starts[i]) : hourLabel(starts[i]) });
  }
  const colW = n ? width / n : 0;
  const isOn = i => !sel || (i >= sel.a && i <= sel.b);
  const bars = [];
  const lines = [];
  if (kind === 'stack') {
    const barW = Math.min(24, Math.max(1, colW * 0.62));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * colW - barW / 2;
      let y = h;
      const segs = [];
      for (const s of series) {
        const v = s.vals[i];
        if (isNil(v)) continue;
        const sh = (v / top) * h;
        if (sh <= 0.2) continue;
        y -= sh;
        segs.push({ x, y, w: barW, h: sh, c: s.c });
        y -= 2;
      }
      if (segs.length) bars.push({ i, on: isOn(i), segs });
    }
  } else {
    for (const s of series) {
      let cur = [];
      const flush = () => {
        if (!cur.length) return;
        lines.push({ c: s.c, pts: (cur.length === 1 ? [cur[0], cur[0]] : cur).join(' ') });
        cur = [];
      };
      s.vals.forEach((v, i) => {
        if (i >= n) return;
        if (isNil(v)) { flush(); return; }
        cur.push(((i + 0.5) * colW).toFixed(1) + ',' + (h - (v / top) * h).toFixed(1));
      });
      flush();
    }
  }
  const legend = series.map(s => {
    let value = '';
    if (legendFmt) value = legendFmt(s);
    else if (unit !== 'pct') {
      let sum = null;
      s.vals.forEach((v, i) => { if (!isNil(v) && isOn(i)) sum = (sum || 0) + v; });
      value = fmt(sum);
    }
    return { label: s.label, c: s.c, value };
  });
  return { n, yt, xt, bars, lines, legend, totals, fmt, top };
}

export function tipFor(i, kind, series, starts, bucketS, fmt, totals) {
  const rows = series.map(s => ({ c: s.c, label: s.label, value: isNil(s.vals[i]) ? 'No data' : fmt(s.vals[i]) }));
  if (kind === 'stack' && series.length > 1) {
    rows.push({ c: 'transparent', label: 'Total', value: isNil(totals[i]) ? NA : fmt(totals[i]) });
  }
  return { title: bucketLabel(i, starts, bucketS) + ' to ' + bucketLabel(i + 1, starts, bucketS), rows };
}
