// ─── Board formatting — one place for number, time and null display ─
// The API sends null for a value the data cannot supply. Every formatter here
// shows null as "n/a", so a missing value never reads as zero.

export const NA = 'n/a';
type NumberValue = number | null | undefined;
const isNil = (v: NumberValue): v is null | undefined => v == null || !Number.isFinite(v);

export const fmtN = (n: NumberValue) => {
  if (isNil(n)) return NA;
  const a = Math.abs(n);
  if (a >= 999500000) return (n / 1e9).toFixed(a >= 1e10 ? 1 : 2) + ' B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + ' M';
  if (a >= 999500) return (n / 1e6).toFixed(2) + ' M';
  if (a >= 1e4) return Math.round(n / 1e3) + ' k';
  if (a >= 1000) return (n / 1e3).toFixed(1) + ' k';
  return String(Math.round(n));
};
export const fmtUsd = (n: NumberValue) => {
  if (isNil(n)) return NA;
  if (n >= 10000) return '$' + fmtN(n);
  return n >= 100 ? '$' + Math.round(n) : '$' + n.toFixed(2);
};
/** Copilot AI credits: the tool's own unit, never dollars. */
export const fmtCredits = (n: NumberValue) => (isNil(n) ? NA : n >= 10000 ? fmtN(n) : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
/** A time in milliseconds: ms, then seconds, minutes, and hours or days past an hour. */
export const fmtMs = (n: NumberValue) => {
  if (isNil(n)) return NA;
  if (n >= 3600000) return fmtDur(n / 1000);
  if (n >= 60000) return (n / 60000).toFixed(1) + ' min';
  if (n >= 1000) return (n / 1000).toFixed(1) + ' s';
  return Math.round(n) + ' ms';
};
/** Duration given in seconds. */
export const fmtDur = (s: NumberValue) => {
  if (isNil(s)) return NA;
  const m = s / 60;
  if (m >= 10080) return Math.round(m / 1440) + ' d';
  if (m >= 1440) {
    const d = Math.floor(m / 1440);
    const h = Math.round((m - d * 1440) / 60);
    return h ? d + ' d ' + h + ' h' : d + ' d';
  }
  if (m >= 60) return Math.floor(m / 60) + ' h ' + Math.round(m % 60) + ' min';
  if (m >= 1) return Math.round(m) + ' min';
  return '<1 min';
};
/** A share from the API is a ratio from 0 to 1. */
export const fmtShare = (v: NumberValue) => (isNil(v) ? NA : Math.round(v * 100) + '%');
/** A rate from the API is a ratio. One decimal, except at the ends. */
export const fmtRate = (v: NumberValue) => {
  if (isNil(v)) return NA;
  return (v * 100).toFixed(v >= 0.995 || v === 0 ? 0 : 1) + '%';
};
export const fmtCpu = (v: NumberValue) => {
  if (isNil(v)) return NA;
  return (v < 10 && v > 0 ? v.toFixed(1) : Math.round(v)) + '%';
};
export const fmtMem = (mb: NumberValue) => {
  if (isNil(mb)) return NA;
  return mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB' : Math.round(mb) + ' MB';
};
// The one estimate of tokens from text, as aictl.utils.estimate_tokens on the server: UTF-8 bytes / 4, rounded up.
const BYTES_PER_TOKEN = 4;
export const estTokensFromSize = (n: NumberValue) => (n == null ? null : n > 0 ? Math.ceil(n / BYTES_PER_TOKEN) : 0);
export const estTokens = (text: unknown) => (text == null ? null : estTokensFromSize(new TextEncoder().encode(String(text)).length));

export const fmtBytes = (b: NumberValue) => {
  if (isNil(b)) return NA;
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6) return Math.round(b / 1e6) + ' MB';
  if (b >= 1e3) return Math.round(b / 1e3) + ' KB';
  return Math.round(b) + ' B';
};
/** An age in seconds: "40 s" below 90 s, else as a duration. */
export const fmtAge = (s: NumberValue) => (isNil(s) ? NA : s < 90 ? Math.round(s) + ' s' : fmtDur(s));
/** Bytes per second. */
export const fmtBps = (b: NumberValue) => (isNil(b) ? NA : fmtBytes(b) + '/s');
export const fmtLines = (add: NumberValue, del: NumberValue) => {
  if (isNil(add) && isNil(del)) return NA;
  return '+' + (isNil(add) ? NA : fmtN(add)) + ' −' + (isNil(del) ? NA : fmtN(del));
};
export const UNIT = { usd: fmtUsd, pct: (v: NumberValue) => (isNil(v) ? NA : Math.round(v) + '%'), ms: fmtMs, n: fmtN, cpu: fmtCpu, mem: fmtMem };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();

/** "14:20" today, "Nov 4 14:20" on another day or when withDay is set. */
export function stamp(ts: NumberValue, withDay = false, now = Date.now()) {
  if (isNil(ts)) return NA;
  const d = new Date(ts * 1000);
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (!withDay && dayKey(d) === dayKey(new Date(now))) return hm;
  return MONTHS[d.getMonth()] + ' ' + d.getDate() + ' ' + hm;
}
export const dayLabel = (ts: number) => {
  const d = new Date(ts * 1000);
  return MONTHS[d.getMonth()] + ' ' + d.getDate();
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Sat Nov 7": a day in a table, the same month-day order as the axes. */
export const weekdayLabel = (ts: number) => {
  const d = new Date(ts * 1000);
  return WEEKDAYS[d.getDay()] + ' ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
};
export const hourLabel = (ts: number) => {
  const d = new Date(ts * 1000);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
};
export const ago = (ts: NumberValue, now = Date.now() / 1000) => {
  if (isNil(ts)) return 'Never';
  const s = Math.max(0, now - ts);
  if (s < 90) return Math.round(s) + ' s ago';
  if (s < 5400) return Math.round(s / 60) + ' min ago';
  if (s < 129600) return Math.round(s / 3600) + ' h ago';
  return Math.round(s / 86400) + ' d ago';
};
export const baseName = (p: unknown) => String(p || '').split(/[\\/]/).pop();
/** What a tool call is named for people: an MCP tool "mcp__server__tool" reads "server › tool". */
export const toolDisplayName = (name: unknown) => {
  const m = /^mcp__([^_].*?)__(.+)$/.exec(String(name || ''));
  return m ? m[1] + ' › ' + m[2] : String(name || NA);
};
/** An error key such as "tool:Bash:Exit code #" or "api:api_error", for people. */
export const errorLabel = (key: unknown) => {
  const k = String(key || '');
  let m = /^tool:([^:]+):(.*)$/.exec(k);
  if (m) return toolDisplayName(m[1]) + ': ' + (m[2] || 'failed');
  m = /^api:(.*)$/.exec(k);
  if (m) {
    const what = m[1].replace(/^api_error:?/, 'error ').replace(/:+$/, '').replace(/_/g, ' ').trim();
    return 'API: ' + (what || 'error');
  }
  return k || NA;
};
/** The label of a model id the record does not carry. */
export const NO_MODEL = 'No model id';
/** The last `keep` folders and the file name, with an ellipsis when the path is longer. */
export function tailPath(path: unknown, keep = 3) {
  const parts = String(path || '').split(/[\\/]/);
  return parts.length > keep + 1 ? '…/' + parts.slice(-keep).join('/') : String(path || '');
}
/** A project id is its path. Tables show the last folder; the title shows the path. */
export const projectName = (p: unknown) => {
  if (!p) return NA;
  return baseName(String(p).replace(/[\\/]+$/, '')) || String(p);
};

/** SVG path for a small trend. A null value leaves a gap. */
export function sparkPath(vals: readonly NumberValue[] | null | undefined, w: number, h: number) {
  const list = Array.isArray(vals) ? vals : [];
  if (!list.length) return '';
  const mx = Math.max(1e-9, ...list.filter((v): v is number => !isNil(v)));
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

const STATUS = {
  running: { label: 'Running', dot: 'var(--good)', rank: 0 },
  looping: { label: 'Looping', dot: 'var(--crit)', rank: 0 },
  waiting: { label: 'Waiting', dot: 'var(--warn)', rank: 0 },
  idle: { label: 'Idle', dot: 'var(--ink2)', rank: 1 },
  ended: { label: 'Ended', dot: 'var(--ink3)', rank: 2 },
  failed: { label: 'Failed', dot: 'var(--crit)', rank: 2 },
  stopped: { label: 'Stopped', dot: 'var(--ink3)', rank: 2 },
};
export const statusMeta = (s: string | null | undefined) => (s && STATUS[s as keyof typeof STATUS]) || { label: s ? String(s) : NA, dot: 'var(--ink3)', rank: 3 };
export const isLive = (s: unknown) => s === 'running' || s === 'looping' || s === 'waiting' || s === 'idle';

// A color stays with its tool, project or model while the page is open. The first
// id seen takes the first free slot, so nothing about the order ranks a tool.
const PALETTE = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
const assigned: Record<string, Map<unknown, string>> = { tool: new Map(), project: new Map(), model: new Map(), kind: new Map() };
export function colorFor(kind: string, id: unknown) {
  const m = assigned[kind] || assigned.tool;
  if (!m.has(id)) m.set(id, PALETTE[m.size % PALETTE.length]);
  return m.get(id)!;
}
