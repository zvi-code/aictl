// ─── urlState — the view's shareable state lives in the query string ─
// `?range=24h&tools=claude-code,codex-cli`, or for a custom window
// `?range=custom&since=1700000000&until=1700003600`. The URL wins over
// localStorage on load, so a pasted link shows the view it was copied from.
// The board's filter hooks (useBoardFilters, useTools) own these parameters.

/** `all`: all stored history up to `until`; the server resolves the start and the buckets (`since=all`). */
export type TimeWindow = { since: number; until: number; buckets?: number; all?: boolean };
export type Range = { id: string; since?: number; until?: number };
/** A list value writes the key once per entry (`?project=/a&project=/b`); an empty list removes it. */
export type UrlPatch = Record<string, string | number | readonly string[] | null | undefined>;

export function parseUrlState(search: string) {
  const q = new URLSearchParams(search || '');
  const out: { range?: Range; tools?: string[] } = {};
  if (q.has('range')) {
    const id = q.get('range')!;
    if (id === 'custom') {
      const since = Number(q.get('since'));
      const until = Number(q.get('until'));
      if (since > 0 && until > since) out.range = { id, since, until };
    } else {
      out.range = { id };
    }
  }
  if (q.has('tools')) {
    const raw = q.get('tools');
    // `tools=` (empty) is the explicit "none selected" state, not "all".
    out.tools = raw ? raw.split(',').filter(Boolean) : [];
  }
  return out;
}

/** Merge `patch` into `search`. `null` removes a key. Unrelated keys survive. */
export function mergeSearch(search: string, patch: UrlPatch) {
  const q = new URLSearchParams(search || '');
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) q.delete(k);
    else if (Array.isArray(v)) { q.delete(k); for (const item of v) q.append(k, item); }
    else q.set(k, String(v));
  }
  const s = q.toString().replace(/%2C/g, ',');
  return s ? '?' + s : '';
}

export type BoardScope = 'local' | 'node' | 'fleet';

// The scope an address without `scope` shows. "All nodes" is where the page opens; main.ts
// switches it to "This node" when the daemon has no shared history store to answer fleet reads.
let defaultScope: 'local' | 'fleet' = 'fleet';
export const defaultNodeScope = () => defaultScope;
export function setDefaultNodeScope(scope: 'local' | 'fleet') { defaultScope = scope; }

/**
 * The scope an address shows. `scope=local` is the explicit "This node". Any other value of
 * `scope` (e.g. `project-local`) belongs to the Settings workspace, which exists only in
 * "This node", so it also means local.
 */
export function boardNodeScope(search: string): BoardScope {
  const q = new URLSearchParams(search);
  const scope = q.get('scope');
  if (scope === 'fleet' || scope === 'node') return scope;
  if (scope) return 'local';
  return q.has('node_id') ? 'node' : defaultScope;
}

/** The `scope` value that makes an address show `scope`; null when the default already does. */
export const scopeParam = (scope: BoardScope) => scope === defaultScope ? null : scope;

export function loadToolFilter(search: string): string[] | null {
  const fromUrl = parseUrlState(search).tools;
  if (fromUrl !== undefined) return fromUrl;
  try {
    const value: unknown = JSON.parse(localStorage.getItem('aictl-pref-tool_filter') ?? 'null');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : null;
  }
  catch { return null; }
}

/** The board query that opens one agent in the drawer, from any current query. */
export function agentLinkOf(search: string, sessionId: string, nodeId: string | null = null) {
  const params = new URLSearchParams(search);
  const node = nodeId || (boardNodeScope(search) === 'node' ? params.get('node_id') : null);
  let agent = sessionId;
  if (node) {
    let qualified = false;
    try { qualified = Array.isArray(JSON.parse(sessionId)); } catch { /* native ID */ }
    if (!qualified) agent = JSON.stringify([node.trim().toLowerCase(), sessionId]);
  }
  return mergeSearch(search, { tab: null, session: null, screen: null, session_id: null, agent,
    ...(nodeId ? { scope: 'node', node_id: nodeId } : {}) });
}

const SESSION_TABS = new Set(['explorer', 'sessions', 'session-explorer']);

export function redirectOf(search: string) {
  const params = new URLSearchParams(search);
  if (boardNodeScope(search) === 'node' && params.get('session_id') && !params.get('agent')) {
    return agentLinkOf(search, params.get('session_id')!);
  }
  const tab = params.get('tab');
  if (!tab || tab === 'hidden') return null;
  const sid = params.get('session');
  if (SESSION_TABS.has(tab) && sid) return agentLinkOf(search, sid);
  if (params.has('agent') && tab !== 'config' && tab !== 'configuration') return null;
  return mergeSearch(search, tab === 'config' || tab === 'configuration'
    ? { tab: null, screen: 'settings' } : { tab: null });
}

// Do not carry a local settings row (which can be an absolute file path) into a report link.
export const CLEAR_SETTINGS_PARAMS = {
  pivot: null, tool: null, sec: null, row: null, scope: null, unset: null,
  group: null, purpose: null, fscope: null, git: null, recent: null, cell: null,
};

export function rangeToParams(range: Range | null) {
  if (!range || range.id === 'live') return { range: null, since: null, until: null };
  if (range.id === 'custom' && range.since != null && range.until != null) {
    return { range: 'custom', since: Math.floor(range.since), until: Math.floor(range.until) };
  }
  return { range: range.id, since: null, until: null };
}

export function toolsToParams(tools?: readonly string[] | null) {
  return { tools: tools === null || tools === undefined ? null : tools.join(',') };
}

function currentLocation() {
  return typeof window !== 'undefined' ? window.location : null;
}

/** Write to the URL. Changes with `push` add a history entry (Back works); the rest replace the entry. */
export function writeUrl(patch: UrlPatch, { push = false, state }: { push?: boolean; state?: unknown } = {}) {
  const loc = currentLocation();
  if (!loc || typeof history === 'undefined') return;
  const next = mergeSearch(loc.search, patch);
  if (next === loc.search) return;
  const target = loc.pathname + next + loc.hash;
  try {
    if (push) history.pushState(state ?? null, '', target);
    else history.replaceState(state === undefined ? history.state : state, '', target);
  } catch { /* sandboxed document: the view still works, only the URL is stale */ }
}
