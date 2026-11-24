// ─── Board filters — time and filters live in the URL ─────────────
// Keys: range (with since and until for custom), tools (shared with every other
// screen), project, model, status, q, and sel (a selected time, "since-until").
// `project` is the project filter of the whole interface: one key per chosen project, its exact
// stored value (`?project=/src/a&project=/src/b`). Every per-project request carries it (withProjects).
import { parseUrlState, rangeToParams, type Range, type TimeWindow, type UrlPatch } from './urlState';

export type Screen = 'board' | 'health' | 'insights' | 'index' | 'settings';
export type Filters = ReturnType<typeof parseFilters>;
type Tools = readonly string[] | null;

/** Id, buckets, seconds per bucket, label. */
export const RANGES = [
  { id: '15m', buckets: 15, bucket_s: 60, label: '15 min' },
  { id: '1h', buckets: 12, bucket_s: 300, label: '1 h' },
  { id: '6h', buckets: 12, bucket_s: 1800, label: '6 h' },
  { id: '24h', buckets: 24, bucket_s: 3600, label: '24 h' },
  { id: '7d', buckets: 14, bucket_s: 43200, label: '7 d' },
  { id: '30d', buckets: 30, bucket_s: 86400, label: '30 d' },
];
const RANGE_BY_ID = Object.fromEntries(RANGES.map(r => [r.id, r]));
const DEFAULT_RANGE = '24h';
export function readScreen(search: string): Screen {
  const screen = new URLSearchParams(search).get('screen');
  return screen === 'settings' || screen === 'health' || screen === 'insights' || screen === 'index' ? screen : 'board';
}

export function boardLiveRequest(filters: Filters, tools: Tools, screen: Screen, now: number) {
  return {
    query: screen !== 'board' ? '' : boardQuery(filters, tools, filters.sel
      ? { since: Math.floor(filters.sel.since), until: Math.floor(filters.sel.until) }
      : windowOf(filters.range, now)),
    history: screen === 'board',
    requiredTopics: screen === 'health' ? ['runtime.health'] : screen === 'insights' || screen === 'index' ? ['runtime.machine'] : screen === 'settings'
      ? ['configuration.file'] : ['history.board', 'runtime.machine'],
  };
}
export const STATUSES = [
  ['all', 'All'], ['active', 'Active now'], ['running', 'Running'], ['looping', 'Looping'],
  ['waiting', 'Waiting for you'], ['idle', 'Idle'], ['ended', 'Ended'], ['failed', 'Failed'],
];
const STATUS_IDS = new Set(STATUSES.map(s => s[0]));

export function parseFilters(search: string) {
  const base = parseUrlState(search);
  const q = new URLSearchParams(search || '');
  let range: Range = { id: DEFAULT_RANGE };
  if (base.range?.id === 'custom') range = base.range;
  else if (base.range && RANGE_BY_ID[base.range.id]) range = { id: base.range.id };
  let sel: TimeWindow | null = null;
  const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(q.get('sel') || '');
  if (m && Number(m[2]) > Number(m[1])) sel = { since: Number(m[1]), until: Number(m[2]) };
  const status = q.get('status');
  return {
    range,
    projects: readProjects(q),
    model: q.get('model') || 'all',
    status: status && STATUS_IDS.has(status) ? status : 'all',
    q: q.get('q') || '',
    sel,
  };
}

/** The URL keys that make the board's address say the range it shows. The board has no range such as
 * Insights' "all": it shows its default, so the address and the picker say that default too. */
export function boardRangePatch(search: string): UrlPatch | undefined {
  const asked = new URLSearchParams(search || '').get('range');
  if (asked == null || asked === parseFilters(search).range.id) return undefined;
  return { range: null, since: null, until: null, sel: null };
}

export function filtersToParams(f: Filters) {
  return {
    ...rangeToParams(f.range.id === DEFAULT_RANGE ? { id: 'live' } : f.range),
    project: f.projects.length ? f.projects : null,
    model: f.model && f.model !== 'all' ? f.model : null,
    status: f.status && f.status !== 'all' ? f.status : null,
    q: f.q ? f.q : null,
    sel: f.sel ? Math.floor(f.sel.since) + '-' + Math.floor(f.sel.until) : null,
  };
}

/** The time window for the API. A preset ends now, rounded so repeat calls can match. */
export function windowOf(range: Range, nowS = Date.now() / 1000): TimeWindow {
  if (range.id === 'custom' && range.since != null && range.until != null) {
    const buckets = 24;
    return { since: Math.floor(range.since), until: Math.floor(range.until), buckets };
  }
  const r = RANGE_BY_ID[range.id] || RANGE_BY_ID[DEFAULT_RANGE];
  const until = Math.ceil(nowS / r.bucket_s) * r.bucket_s;
  return { since: until - r.buckets * r.bucket_s, until, buckets: r.buckets };
}

/** Board history parameters shared by live and detail reads. Tools null means all, [] means none. */
export function boardQuery(filters: Filters, tools: Tools, win: TimeWindow) {
  const p = new URLSearchParams();
  p.set('since', String(win.since));
  p.set('until', String(win.until));
  if (win.buckets) p.set('buckets', String(win.buckets));
  if (tools) p.set('tool', tools.length ? tools.join(',') : '-');
  for (const project of filters.projects) p.append('project', project);
  if (filters.model !== 'all') p.set('model', filters.model);
  if (filters.status !== 'all') p.set('status', filters.status);
  if (filters.q.trim()) p.set('q', filters.q.trim());
  return p.toString().replace(/%2C/g, ',');
}

export function canClear(f: Filters, tools: Tools) {
  return !!(tools || f.projects.length || f.model !== 'all' || f.status !== 'all' || f.sel || f.q);
}
export const clearedFilters = (f: Filters): Filters => ({ ...f, projects: [], model: 'all', status: 'all', sel: null, q: '' });

/** The chosen projects of an address: each once, in a stable order; none means every project. */
export function readProjects(q: URLSearchParams): string[] {
  return [...new Set(q.getAll('project').map(value => value.trim()).filter(value => value && value !== 'all'))].sort();
}

// Routes whose data is not per project: the picker's own list, node reports, actions.
const UNFILTERED = ['/api/board/projects', '/api/board/nodes', '/api/board/action'];

/** *path* with the chosen projects, for a route of per-project data. Other routes, and a path that already
 * names projects, are returned as they are. */
export function withProjects(path: string, projects: readonly string[]): string {
  if (!projects.length || !(path.startsWith('/api/board/') || path.startsWith('/api/history/')) ||
      UNFILTERED.some(route => path === route || path.startsWith(route + '?'))) return path;
  const [route, search = ''] = path.split('?', 2);
  const query = new URLSearchParams(search);
  if (query.has('project')) return path;
  for (const project of projects) query.append('project', project);
  return `${route}?${query}`;
}

/** The hover of a Model menu entry: the spellings the tools stored under this canonical id,
 * or undefined when every tool stored the id itself. */
export function modelReportedAs(
  row: { id: string; reported_as?: readonly { id: string; tools: readonly string[] }[] },
  toolLabel: (id: string) => string,
): string | undefined {
  const spellings = row.reported_as ?? [];
  if (!spellings.some(spelling => spelling.id !== row.id)) return undefined;
  return 'Reported as ' + spellings.map(spelling =>
    spelling.id + (spelling.tools.length ? ` by ${spelling.tools.map(toolLabel).join(', ')}` : '')).join('; ');
}

/** The one id a model is grouped, filtered and shown under, whichever tool spelled it.
 *
 * The same rule as ``canonical_model_id`` in aictl/data/model_pricing.py (test/model_id_cases.json holds
 * the cases both tests read): a Claude id in any letter case, or with a dot instead of a dash in its
 * version, is one id; any other id is returned unchanged. */
export function canonicalModelId(model: string | null | undefined): string {
  if (!model) return '';
  const id = model.trim().toLowerCase();
  return id.startsWith('claude-') ? id.replaceAll('.', '-') : model;
}
