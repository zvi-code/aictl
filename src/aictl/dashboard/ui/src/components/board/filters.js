// ─── Board filters — time and filters live in the URL ─────────────
// Keys: range (with since and until for custom), tools (shared with every other
// screen), project, model, status, q, and sel (a selected time, "since-until").
import { parseUrlState, rangeToParams } from '../../hooks/urlState.js';

/** Id, buckets, seconds per bucket, label. */
export const RANGES = [
  { id: '15m', buckets: 15, bucket_s: 60, label: '15 min' },
  { id: '1h', buckets: 12, bucket_s: 300, label: '1 h' },
  { id: '6h', buckets: 12, bucket_s: 1800, label: '6 h' },
  { id: '24h', buckets: 24, bucket_s: 3600, label: '24 h' },
  { id: '7d', buckets: 14, bucket_s: 43200, label: '7 d' },
  { id: '30d', buckets: 30, bucket_s: 86400, label: '30 d' },
];
export const RANGE_BY_ID = Object.fromEntries(RANGES.map(r => [r.id, r]));
export const DEFAULT_RANGE = '24h';
export const STATUSES = [
  ['all', 'All'], ['active', 'Active now'], ['running', 'Running'], ['looping', 'Looping'],
  ['waiting', 'Waiting for you'], ['ended', 'Ended'], ['failed', 'Failed'],
];
const STATUS_IDS = new Set(STATUSES.map(s => s[0]));

/** The tools a saved choice selects from those this time range lists. Null means all of them. */
export function listedTools(tools, toolIds) {
  if (!tools) return null;
  const listed = tools.filter(id => toolIds.includes(id));
  return listed.length >= toolIds.length ? null : listed;
}

/** Text of the Tool filter. */
export function toolFilterLabel(tools, toolIds, name) {
  const listed = listedTools(tools, toolIds);
  if (!listed) return 'All ' + toolIds.length;
  if (listed.length <= 2) return listed.map(name).join(', ') || 'None';
  return listed.length + ' of ' + toolIds.length;
}

export function parseFilters(search) {
  const base = parseUrlState(search);
  const q = new URLSearchParams(search || '');
  let range = { id: DEFAULT_RANGE };
  if (base.range?.id === 'custom') range = base.range;
  else if (base.range && RANGE_BY_ID[base.range.id]) range = { id: base.range.id };
  let sel = null;
  const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(q.get('sel') || '');
  if (m && Number(m[2]) > Number(m[1])) sel = { since: Number(m[1]), until: Number(m[2]) };
  const status = q.get('status');
  return {
    range,
    project: q.get('project') || 'all',
    model: q.get('model') || 'all',
    status: STATUS_IDS.has(status) ? status : 'all',
    q: q.get('q') || '',
    sel,
  };
}

export function filtersToParams(f) {
  return {
    ...rangeToParams(f.range.id === DEFAULT_RANGE ? { id: 'live' } : f.range),
    project: f.project && f.project !== 'all' ? f.project : null,
    model: f.model && f.model !== 'all' ? f.model : null,
    status: f.status && f.status !== 'all' ? f.status : null,
    q: f.q ? f.q : null,
    sel: f.sel ? Math.floor(f.sel.since) + '-' + Math.floor(f.sel.until) : null,
  };
}

/** The time window for the API. A preset ends now, rounded so repeat calls can match. */
export function windowOf(range, nowS = Date.now() / 1000) {
  if (range.id === 'custom') {
    const buckets = 24;
    return { since: Math.floor(range.since), until: Math.floor(range.until), buckets };
  }
  const r = RANGE_BY_ID[range.id] || RANGE_BY_ID[DEFAULT_RANGE];
  const until = Math.ceil(nowS / r.bucket_s) * r.bucket_s;
  return { since: until - r.buckets * r.bucket_s, until, buckets: r.buckets };
}

/** Query params for /api/board. tools null means all, [] means none. */
export function boardQuery(filters, tools, win) {
  const p = new URLSearchParams();
  p.set('since', String(win.since));
  p.set('until', String(win.until));
  if (win.buckets) p.set('buckets', String(win.buckets));
  if (tools) p.set('tool', tools.length ? tools.join(',') : '-');
  if (filters.project !== 'all') p.set('project', filters.project);
  if (filters.model !== 'all') p.set('model', filters.model);
  if (filters.status !== 'all') p.set('status', filters.status);
  if (filters.q.trim()) p.set('q', filters.q.trim());
  return p.toString().replace(/%2C/g, ',');
}

export function canClear(f, tools) {
  return !!(tools || f.project !== 'all' || f.model !== 'all' || f.status !== 'all' || f.sel || f.q);
}
export const clearedFilters = f => ({ ...f, project: 'all', model: 'all', status: 'all', sel: null, q: '' });
