// ─── API client — single module for all backend calls ──────────
// Accepts optional baseUrl for testing (default: '' = relative URLs).

let _baseUrl = '';

/** Set the base URL for all API calls (useful for tests). */
export function setBaseUrl(url) { _baseUrl = url; }

function url(path) { return _baseUrl + path; }

/**
 * Fetch `path` and parse the JSON body, throwing on any non-2xx status.
 * Without this, 500-error JSON bodies flowed into components as if they
 * were data and crashed later at property-access time.
 *
 * The thrown Error carries `.status` (HTTP status code) and a message of
 * the form "HTTP <status> <path>: <detail>", where detail is the JSON
 * body's `error` field when present, else the raw body text (truncated).
 */
export async function fetchJson(path, opts = undefined) {
  // Only forward opts when given — keeps plain GETs as single-argument
  // fetch(url) calls (matching prior behaviour and call-site assertions).
  const r = await (opts === undefined ? fetch(url(path)) : fetch(url(path), opts));
  if (!r.ok) {
    let detail = '';
    try {
      const text = await r.text();
      if (text) {
        try { detail = JSON.parse(text).error || text; }
        catch { detail = text; }
      }
    } catch { /* body unreadable — status alone will have to do */ }
    const err = new Error(
      `HTTP ${r.status} ${path}` + (detail ? `: ${String(detail).slice(0, 200)}` : ''),
    );
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// ─── Events ────────────────────────────────────────────────────

/** True number of events for the same filters as getEvents (no limit). Returns {count}. */
export async function getEventsCount(opts = {}) {
  const params = [];
  if (opts.tool) params.push('tool=' + encodeURIComponent(opts.tool));
  if (opts.since != null) params.push('since=' + opts.since);
  if (opts.until != null) params.push('until=' + opts.until);
  if (opts.sessionId) params.push('session_id=' + encodeURIComponent(opts.sessionId));
  return fetchJson('/api/events/count' + (params.length ? '?' + params.join('&') : ''));
}

// ─── Sessions ──────────────────────────────────────────────────

export async function getSessionEvents(sessionId, opts = {}) {
  let path = '/api/events?session_id=' + encodeURIComponent(sessionId);
  if (opts.since != null) path += '&since=' + opts.since;
  if (opts.until != null) path += '&until=' + opts.until;
  if (opts.limit != null) path += '&limit=' + opts.limit;
  return fetchJson(path);
}

/** Query /api/samples with tag filters. Samples carry `tags` so the caller
 *  can pass any combination of {'session_id': 'X', 'aictl.tool': 'Y'} etc. */
export async function getSamples(metric, opts = {}) {
  let path = '/api/samples?metric=' + encodeURIComponent(metric);
  if (opts.since != null) path += '&since=' + opts.since;
  if (opts.limit != null) path += '&limit=' + opts.limit;
  if (opts.tags) {
    for (const [k, v] of Object.entries(opts.tags)) {
      if (v == null) continue;
      path += '&tag.' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
    }
  }
  return fetchJson(path);
}

/** Per-session MCP server usage. Returns {servers: [...], total_calls,
 *  configured_servers: [name, ...]}. */
export async function getSessionMcpUsage(sessionId) {
  return fetchJson('/api/session-mcp-usage?session_id=' + encodeURIComponent(sessionId));
}

/** Per-session process genealogy (survives session end).
 *  Returns {session_id, total, by_role: {role: count},
 *  processes: [{pid, tool, role, joined_at}]}. */
export async function getSessionProcesses(sessionId) {
  return fetchJson('/api/session-processes?session_id=' + encodeURIComponent(sessionId));
}

/** Per-session deduced stats + enrichments (e.g. vscode_lm_usage).
 *  Returns the SessionEntityState dict, optionally with vscode_lm_usage
 *  when OTel language_model.usage events exist. */
export async function getSessionStats(sessionId) {
  return fetchJson('/api/session-stats?session_id=' + encodeURIComponent(sessionId));
}

/** Per-session git commit attribution.
 *  Returns {session_id, branch, commits: [{sha, short_sha, author_name,
 *  author_email, ts, subject, current_branch_match}]}. */
export async function getSessionCommits(sessionId) {
  return fetchJson('/api/session-commits?session_id=' + encodeURIComponent(sessionId));
}

// ─── Analytics & Costs ─────────────────────────────────────────

export async function getApiCalls(since, limit = 100, sessionId = null) {
  const qs = new URLSearchParams({since: String(since), limit: String(limit)});
  if (sessionId) qs.set('session_id', sessionId);
  return fetchJson(`/api/api-calls?${qs.toString()}`);
}

// ─── Files ─────────────────────────────────────────────────────
// This returns the raw Response (callers need .status / .headers), so it stays on fetch.

export async function getFile(path, headers = {}) {
  return fetch(url('/api/file?path=' + encodeURIComponent(path)), { headers });
}

// ─── Health ────────────────────────────────────────────────────

export async function getOtelStatus() {
  return fetchJson('/api/otel-status');
}

export async function getEffectiveModels() {
  return fetchJson('/api/effective-models');
}

export async function getHooksStatus() {
  return fetchJson('/api/hooks-status');
}

/** The editable settings file of a tool; `scope` picks it (project by default, or project-local). */
export async function getToolConfig(tool, scope = '') {
  return fetchJson('/api/tool-config/' + encodeURIComponent(tool) + (scope ? '?scope=' + encodeURIComponent(scope) : ''));
}

export async function updateToolConfig(tool, payload) {
  return fetchJson('/api/tool-config/' + encodeURIComponent(tool), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ─── Session control ───────────────────────────────────────────

/** Signal a live session's tracked process tree. `signal` is "TERM" (default)
 *  or "KILL". Requires the backend's confirm gate — we always pass confirm:true
 *  because the UI presents its own confirmation dialog before calling this. */
export async function killSession(sessionId, signal = 'TERM') {
  return fetchJson('/api/session-kill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, confirm: true, signal }),
  });
}

// ─── SSE stream URL ────────────────────────────────────────────

export function streamUrl() { return url('/api/stream'); }

// ─── Board ─────────────────────────────────────────────────────

/** GET /api/board. Returns {status: 304} when the etag still matches. */
export async function getBoard(query, { signal, etag } = {}) {
  const opts = {};
  if (signal) opts.signal = signal;
  if (etag) opts.headers = { 'If-None-Match': etag };
  const r = await fetch(url('/api/board?' + query), opts);
  if (r.status === 304) return { status: 304 };
  if (!r.ok) {
    const err = new Error(`HTTP ${r.status} /api/board`);
    err.status = r.status;
    throw err;
  }
  return { status: r.status, etag: r.headers.get('ETag'), data: await r.json() };
}

export const getBoardAgent = (id, opts) => fetchJson('/api/board/agent?id=' + encodeURIComponent(id), opts);
/** The session flow of a board agent: events from the store, with hook and OTel events merged in. `query` is `since=..&until=..`. */
/** Session search over all time: {q, tool (list of ids, or [] for none), limit, offset}. */
export function getBoardSessions({ q = '', tool = null, limit = 50, offset = 0 } = {}, opts) {
  const p = new URLSearchParams();
  p.set('q', q);
  if (tool) p.set('tool', tool.length ? tool.join(',') : '-');
  p.set('limit', String(limit));
  p.set('offset', String(offset));
  return fetchJson('/api/board/sessions?' + p.toString(), opts);
}
export const getBoardAgentFlow = (id, query = '', opts) => fetchJson('/api/board/agent/flow?id=' + encodeURIComponent(id) + (query ? '&' + query : ''), opts);
/** The transcript of a board agent's session: each prompt with its reply, actions and tokens. */
export const getBoardAgentTranscript = (id, opts) => fetchJson('/api/board/agent/transcript?id=' + encodeURIComponent(id), opts);
/** One turn whole: its actions and full texts. `ts` is the turn's timestamp. */
export const getBoardAgentTranscriptTurn = (id, ts, opts) => fetchJson('/api/board/agent/transcript?id=' + encodeURIComponent(id) + '&turn=' + encodeURIComponent(ts), opts);
export const getBoardTool = (name, query = '', opts) => fetchJson('/api/board/tool?name=' + encodeURIComponent(name) + (query ? '&' + query : ''), opts);
export const getBoardError = (key, query = '', opts) => fetchJson('/api/board/error?key=' + encodeURIComponent(key) + (query ? '&' + query : ''), opts);
export const getBoardSkill = (name, query = '', opts) => fetchJson('/api/board/skill?name=' + encodeURIComponent(name) + (query ? '&' + query : ''), opts);
export const getBoardExcerpt = (path, line, opts) => fetchJson('/api/board/excerpt?path=' + encodeURIComponent(path) + '&line=' + encodeURIComponent(line), opts);
export const getBoardFile = (path, query = '', opts) => fetchJson('/api/board/file?path=' + encodeURIComponent(path) + (query ? '&' + query : ''), opts);
export const getBoardPrompt = (ts, sessionId, opts) => fetchJson('/api/board/prompt?ts=' + encodeURIComponent(ts) + '&session_id=' + encodeURIComponent(sessionId), opts);

/** Run one command the dialog has shown to the user. */
export async function boardAction(action, args = {}) {
  return fetchJson('/api/board/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args, confirm: true }),
  });
}

/** The text of one settings file aictl has found, for the editor. Secret-shaped values arrive masked. */
export async function getSettingsFile(path) {
  return fetchJson('/api/settings/file?path=' + encodeURIComponent(path));
}

/** Write the text of a settings file. `expectedMtime` is the mtime the text was read at. */
export async function saveSettingsFile(path, text, expectedMtime) {
  return fetchJson('/api/settings/file', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, text, expected_mtime: expectedMtime ?? null }),
  });
}

/** Every file the settings come from, with where it lives and which tools read it. */
export async function getSettingsFiles() {
  return fetchJson('/api/settings/files');
}

/** Every tool's settings record, the tool names and aictl's own collectors, for the Settings screen. */
export async function getSettingsTools() {
  return fetchJson('/api/settings/tools');
}

/** The hidden-context scan. It runs on the server's own thread, so this asks how far it is. */
export async function getContextAudit(refresh = false, onProgress = null, { pollMs = 2000, maxMs = 600000, project = null } = {}) {
  const started = Date.now();
  const base = '/api/context-audit?nowait=1' + (project ? '&project=' + encodeURIComponent(project) : '');
  let r = await fetchJson(base + (refresh ? '&refresh=1' : ''));
  while (r?.status === 'scanning') {
    onProgress?.(r);
    if (Date.now() - started > maxMs) throw new Error('The scan has not finished. It is at: ' + r.step);
    await new Promise(done => setTimeout(done, pollMs));
    r = await fetchJson(base);
  }
  if (r?.error) throw new Error(r.error);
  return r;
}
