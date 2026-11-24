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
  return n >= 100 ? '$' + Math.round(n).toLocaleString('en-US') : '$' + n.toFixed(2);
};
/** Copilot AI credits: the tool's own unit, never dollars. */
export const fmtCredits = (n: NumberValue) => (isNil(n) ? NA : n >= 10000 ? fmtN(n) : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
/** A time in milliseconds: whole ms below a second, then seconds, minutes, hours and days. */
export const fmtMs = (n: NumberValue) => {
  if (isNil(n)) return NA;
  if (n < 999.5) return Math.round(n) + ' ms';
  return fmtDur(n / 1000);
};
/**
 * Duration given in seconds. Each unit is rounded before it is shown, so a value that
 * rounds up to its limit shows in the next unit: 59.6 s is "1 min", 59.6 min is "1 h".
 */
export const fmtDur = (s: NumberValue) => {
  if (isNil(s)) return NA;
  s = Math.max(0, s);
  if (s < 0.9995) return Math.round(s * 1000) + ' ms';
  if (s < 59.95) return Number(s.toFixed(1)) + ' s';
  if (s < 600) {
    const total = Math.round(s);
    return total % 60 ? Math.floor(total / 60) + ' min ' + (total % 60) + ' s' : total / 60 + ' min';
  }
  const minutes = Math.round(s / 60);
  if (minutes < 60) return minutes + ' min';
  if (minutes < 1440) return minutes % 60 ? Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min' : minutes / 60 + ' h';
  const hours = Math.round(s / 3600);
  const days = Math.floor(hours / 24);
  if (days >= 7) return Math.round(s / 86400) + ' d';
  return hours % 24 ? days + ' d ' + (hours % 24) + ' h' : days + ' d';
};
/**
 * A sum of durations in milliseconds, in hours. Summed call time is not wall-clock time, so it is never
 * shown as days: whole hours with thousands grouped from 100 h, one decimal below, minutes under an hour.
 */
export const fmtHours = (ms: NumberValue) => {
  if (isNil(ms)) return NA;
  const hours = Math.max(0, ms) / 3.6e6;
  if (hours < 0.995) return fmtMs(ms);
  return (hours >= 99.5 ? Math.round(hours).toLocaleString('en-US') : String(Number(hours.toFixed(1)))) + ' h';
};
/** A share from the API is a ratio from 0 to 1. */
export const fmtShare = (v: NumberValue) => (isNil(v) ? NA : Math.round(v * 100) + '%');
/** How many times one amount is of another: one decimal below ten, whole from ten up. */
export const fmtTimes = (v: NumberValue) => (isNil(v) ? NA : (v >= 10 ? fmtN(Math.round(v)) : v.toFixed(1)) + '×');
/** A percentage: one decimal, none when it is a whole number from 10 up. */
export const fmtPct = (v: NumberValue) => {
  if (isNil(v)) return NA;
  if (v === 0) return '0%';
  const tenth = Math.round(v * 10) / 10;
  return (Math.abs(tenth) >= 10 && Number.isInteger(tenth) ? String(tenth) : tenth.toFixed(1)) + '%';
};
/** A rate from the API is a ratio. */
export const fmtRate = (v: NumberValue) => (isNil(v) ? NA : fmtPct(v * 100));
export const fmtCpu = (v: NumberValue) => {
  if (isNil(v)) return NA;
  return (v < 10 && v > 0 ? v.toFixed(1) : Math.round(v)) + '%';
};
export const fmtMem = (mb: NumberValue) => (isNil(mb) ? NA : fmtBytes(mb * 1e6));
// The one estimate of tokens from text, as aictl.utils.estimate_tokens on the server: UTF-8 bytes / 4, rounded up.
const BYTES_PER_TOKEN = 4;
export const estTokensFromSize = (n: NumberValue) => (n == null ? null : n > 0 ? Math.ceil(n / BYTES_PER_TOKEN) : 0);
export const estTokens = (text: unknown) => (text == null ? null : estTokensFromSize(new TextEncoder().encode(String(text)).length));

/** A size with three significant digits. */
export const fmtBytes = (b: NumberValue) => {
  if (isNil(b)) return NA;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Math.abs(b);
  let unit = 0;
  while (unit < units.length - 1 && (unit === 0 ? Math.round(value) : Number(value.toPrecision(3))) >= 1000) {
    value /= 1000;
    unit++;
  }
  return (b < 0 ? '-' : '') + (unit === 0 ? Math.round(value) : Number(value.toPrecision(3))) + ' ' + units[unit];
};
/** Money: two decimals, four below one cent. */
export const fmtMoney = (n: NumberValue) => {
  if (isNil(n)) return NA;
  const digits = n !== 0 && Math.abs(n) < 0.01 ? 4 : 2;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
};
/** A cost per request: three significant digits below a dollar, so $0.327 and $0.075 stay apart. */
export const fmtUsdEach = (n: NumberValue) => (isNil(n) ? NA : n >= 1 ? fmtUsd(n) : '$' + Number(n.toPrecision(3)));
/** A plain number: whole from 1,000 up, else three significant digits. */
export const fmtNum = (n: NumberValue) => {
  if (isNil(n)) return NA;
  if (Math.abs(n) >= 1000 || Number.isInteger(n)) return Math.round(n).toLocaleString('en-US');
  return String(Number(n.toPrecision(3)));
};
/** An age in seconds, as a duration. */
export const fmtAge = (s: NumberValue) => (isNil(s) ? NA : fmtDur(s));
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
/** "Nov 23 14:51:07": a time to the second, for rows that are seconds apart. */
export const stampSec = (ts: NumberValue) => isNil(ts) ? NA : stamp(ts, true) + ':' + pad(new Date(ts * 1000).getSeconds());
export const dayLabel = (ts: number) => {
  const d = new Date(ts * 1000);
  return MONTHS[d.getMonth()] + ' ' + d.getDate();
};
/** "Jul 9, 2026": a day with its year, for the start of a long period. */
export const dateLabel = (ts: number) => dayLabel(ts) + ', ' + new Date(ts * 1000).getFullYear();
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
  if (s < 3570) return Math.round(s / 60) + ' min ago';
  const hours = Math.round(s / 3600);
  if (hours < 24) return hours + ' h ago';
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
