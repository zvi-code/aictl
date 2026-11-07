// ─── Board formatting — one place for number, time and null display ─
// The API sends null for a value the data cannot supply. Every formatter here
// shows null as "n/a", so a missing value never reads as zero.

export const NA = 'n/a';
const isNil = v => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));

export const fmtN = n => {
  if (isNil(n)) return NA;
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + ' M';
  if (a >= 999500) return (n / 1e6).toFixed(2) + ' M';
  if (a >= 1e4) return Math.round(n / 1e3) + ' k';
  if (a >= 1000) return (n / 1e3).toFixed(1) + ' k';
  return String(Math.round(n));
};
export const fmtUsd = n => {
  if (isNil(n)) return NA;
  return n >= 100 ? '$' + Math.round(n) : '$' + n.toFixed(2);
};
/** Copilot AI credits: the tool's own unit, never dollars. */
export const fmtCredits = n => (isNil(n) ? NA : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
export const fmtMs = n => {
  if (isNil(n)) return NA;
  if (n >= 60000) return (n / 60000).toFixed(1) + ' min';
  if (n >= 1000) return (n / 1000).toFixed(1) + ' s';
  return Math.round(n) + ' ms';
};
/** Duration given in seconds. */
export const fmtDur = s => {
  if (isNil(s)) return NA;
  const m = s / 60;
  if (m >= 1440) return Math.round(m / 1440) + ' d';
  if (m >= 60) return Math.floor(m / 60) + ' h ' + Math.round(m % 60) + ' min';
  if (m >= 1) return Math.round(m) + ' min';
  return '<1 min';
};
/** A share from the API is a ratio from 0 to 1. */
export const fmtShare = v => (isNil(v) ? NA : Math.round(v * 100) + '%');
/** A rate from the API is a ratio. One decimal, except at the ends. */
export const fmtRate = v => {
  if (isNil(v)) return NA;
  return (v * 100).toFixed(v >= 0.995 || v === 0 ? 0 : 1) + '%';
};
export const fmtCpu = v => {
  if (isNil(v)) return NA;
  return (v < 10 && v > 0 ? v.toFixed(1) : Math.round(v)) + '%';
};
export const fmtMem = mb => {
  if (isNil(mb)) return NA;
  return mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB' : Math.round(mb) + ' MB';
};
export const fmtBytes = b => {
  if (isNil(b)) return NA;
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6) return Math.round(b / 1e6) + ' MB';
  if (b >= 1e3) return Math.round(b / 1e3) + ' KB';
  return Math.round(b) + ' B';
};
/** An age in seconds: "40 s" below 90 s, else as a duration. */
export const fmtAge = s => (isNil(s) ? NA : s < 90 ? Math.round(s) + ' s' : fmtDur(s));
/** Bytes per second. */
export const fmtBps = b => (isNil(b) ? NA : fmtBytes(b) + '/s');
export const fmtLines = (add, del) => {
  if (isNil(add) && isNil(del)) return NA;
  return '+' + (isNil(add) ? NA : fmtN(add)) + ' −' + (isNil(del) ? NA : fmtN(del));
};
export const UNIT = { usd: fmtUsd, pct: v => (isNil(v) ? NA : Math.round(v) + '%'), ms: fmtMs, n: fmtN, cpu: fmtCpu, mem: fmtMem };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const dayKey = d => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();

/** "14:20" today, "Nov 4 14:20" on another day or when withDay is set. */
export function stamp(ts, withDay = false, now = Date.now()) {
  if (isNil(ts)) return NA;
  const d = new Date(ts * 1000);
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (!withDay && dayKey(d) === dayKey(new Date(now))) return hm;
  return MONTHS[d.getMonth()] + ' ' + d.getDate() + ' ' + hm;
}
export const dayLabel = ts => {
  const d = new Date(ts * 1000);
  return MONTHS[d.getMonth()] + ' ' + d.getDate();
};
export const hourLabel = ts => {
  const d = new Date(ts * 1000);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
};
export const ago = (ts, now = Date.now() / 1000) => {
  if (isNil(ts)) return 'Never';
  const s = Math.max(0, now - ts);
  if (s < 90) return Math.round(s) + ' s ago';
  if (s < 5400) return Math.round(s / 60) + ' min ago';
  if (s < 129600) return Math.round(s / 3600) + ' h ago';
  return Math.round(s / 86400) + ' d ago';
};
export const baseName = p => String(p || '').split(/[\\/]/).pop();
/** A project id is its path. Tables show the last folder; the title shows the path. */
export const projectName = (p) => {
  if (!p) return NA;
  return baseName(String(p).replace(/[\\/]+$/, '')) || String(p);
};

/** SVG path for a small trend. A null value leaves a gap. */
export function sparkPath(vals, w, h) {
  const list = Array.isArray(vals) ? vals : [];
  if (!list.length) return '';
  const mx = Math.max(1e-9, ...list.filter(v => !isNil(v)));
  const n = list.length;
  let d = '';
  let pen = false;
  list.forEach((v, i) => {
    if (isNil(v)) { pen = false; return; }
    const x = (n === 1 ? w / 2 : (i / (n - 1)) * w).toFixed(1);
    const y = (h - 1 - (v / mx) * (h - 2)).toFixed(1);
    d += (pen ? 'L' : 'M') + x + ' ' + y;
    pen = true;
  });
  return d;
}

export const STATUS = {
  running: { label: 'Running', dot: 'var(--good)', rank: 0 },
  looping: { label: 'Looping', dot: 'var(--crit)', rank: 0 },
  waiting: { label: 'Waiting', dot: 'var(--warn)', rank: 0 },
  idle: { label: 'Idle', dot: 'var(--ink2)', rank: 1 },
  ended: { label: 'Ended', dot: 'var(--ink3)', rank: 2 },
  failed: { label: 'Failed', dot: 'var(--crit)', rank: 2 },
  stopped: { label: 'Stopped', dot: 'var(--ink3)', rank: 2 },
};
export const statusMeta = s => STATUS[s] || { label: s ? String(s) : NA, dot: 'var(--ink3)', rank: 3 };
export const isLive = s => s === 'running' || s === 'looping' || s === 'waiting' || s === 'idle';

// A color stays with its tool, project or model while the page is open. The first
// id seen takes the first free slot, so nothing about the order ranks a tool.
const PALETTE = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
const assigned = { tool: new Map(), project: new Map(), model: new Map() };
export function colorFor(kind, id) {
  const m = assigned[kind] || assigned.tool;
  if (!m.has(id)) m.set(id, PALETTE[m.size % PALETTE.length]);
  return m.get(id);
}
export const OTHER_COLOR = 'var(--ink3)';
