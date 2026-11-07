// ─── urlState — the view's shareable state lives in the query string ─
// `?range=24h&tools=claude-code,codex-cli`, or for a custom window
// `?range=custom&since=1700000000&until=1700003600`. The URL wins over
// localStorage on load, so a pasted link shows the view it was copied from.
// The board's filter hooks (useBoardFilters, useTools) own these parameters.

export function parseUrlState(search) {
  const q = new URLSearchParams(search || '');
  const out = {};
  if (q.has('range')) {
    const id = q.get('range');
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
export function mergeSearch(search, patch) {
  const q = new URLSearchParams(search || '');
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) q.delete(k);
    else q.set(k, String(v));
  }
  const s = q.toString().replace(/%2C/g, ',');
  return s ? '?' + s : '';
}

export function rangeToParams(range) {
  if (!range || range.id === 'live') return { range: null, since: null, until: null };
  if (range.id === 'custom') {
    return { range: 'custom', since: Math.floor(range.since), until: Math.floor(range.until) };
  }
  return { range: range.id, since: null, until: null };
}

export function toolsToParams(tools) {
  return { tools: tools === null || tools === undefined ? null : tools.join(',') };
}

function currentLocation() {
  return typeof window !== 'undefined' ? window.location : null;
}

/** Write to the URL. Changes with `push` add a history entry (Back works); the rest replace the entry. */
export function writeUrl(patch, { push = false } = {}) {
  const loc = currentLocation();
  if (!loc || typeof history === 'undefined') return;
  const next = mergeSearch(loc.search, patch);
  if (next === loc.search) return;
  const target = loc.pathname + next + loc.hash;
  try {
    if (push) history.pushState(null, '', target);
    else history.replaceState(null, '', target);
  } catch { /* sandboxed document: the view still works, only the URL is stale */ }
}

export function readUrl() {
  const loc = currentLocation();
  return parseUrlState(loc ? loc.search : '');
}
