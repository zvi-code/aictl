// ─── API client — single module for all backend calls ──────────
// Replaces hard-coded fetch('/api/...') scattered across 14 files.
// Accepts optional baseUrl for testing (default: '' = relative URLs).

let _baseUrl = '';

/** Set the base URL for all API calls (useful for tests). */
export function setBaseUrl(url) { _baseUrl = url; }

/** Get current base URL. */
export function getBaseUrl() { return _baseUrl; }

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

// ─── Snapshot & History ────────────────────────────────────────

export async function getSnapshot() {
  return fetchJson('/api/snapshot');
}

export async function getHistory(opts = {}) {
  let path = '/api/history';
  const params = [];
  if (opts.range) params.push('range=' + opts.range);
  if (opts.since != null) params.push('since=' + opts.since);
  if (opts.until != null) params.push('until=' + opts.until);
  if (opts.tool) params.push('tool=' + encodeURIComponent(opts.tool));
  if (params.length) path += '?' + params.join('&');
  return fetchJson(path);
}

export async function getEvents(opts = {}) {
  let path = '/api/events';
  const params = [];
  if (opts.tool) params.push('tool=' + encodeURIComponent(opts.tool));
  if (opts.since != null) params.push('since=' + opts.since);
  if (opts.until != null) params.push('until=' + opts.until);
  if (opts.sessionId) params.push('session_id=' + encodeURIComponent(opts.sessionId));
  if (opts.limit) params.push('limit=' + opts.limit);
  if (params.length) path += '?' + params.join('&');
  return fetchJson(path);
}

// ─── Sessions ──────────────────────────────────────────────────

export async function getSessions(opts = {}) {
  let path = '/api/sessions';
  const params = [];
  if (opts.tool) params.push('tool=' + encodeURIComponent(opts.tool));
  if (opts.active != null) params.push('active=' + opts.active);
  if (opts.limit) params.push('limit=' + opts.limit);
  if (params.length) path += '?' + params.join('&');
  return fetchJson(path);
}

export async function getSessionFlow(sessionId, since, until) {
  return fetchJson(`/api/session-flow?session_id=${encodeURIComponent(sessionId)}&since=${since}&until=${until}`);
}

export async function getSessionTimeline(sessionId, opts = {}) {
  let path = '/api/session-timeline';
  const params = [];
  if (sessionId) params.push('session_id=' + encodeURIComponent(sessionId));
  if (opts.since != null) params.push('since=' + opts.since);
  if (opts.until != null) params.push('until=' + opts.until);
  if (params.length) path += '?' + params.join('&');
  return fetchJson(path);
}

export async function getSessionRuns(project, tool, days = 30, limit = 20) {
  return fetchJson(`/api/session-runs?project=${encodeURIComponent(project)}&tool=${encodeURIComponent(tool)}&days=${days}&limit=${limit}`);
}

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

/** Per-session subprocess breakdown. Returns {counts: [{name, count}], recent, total}. */
export async function getSessionSubprocesses(sessionId) {
  return fetchJson('/api/session-subprocesses?session_id=' + encodeURIComponent(sessionId));
}

/** Per-session MCP server usage. Returns {servers: [...], total_calls,
 *  configured_servers: [name, ...]}. */
export async function getSessionMcpUsage(sessionId) {
  return fetchJson('/api/session-mcp-usage?session_id=' + encodeURIComponent(sessionId));
}

/** Per-session cost broken down by model.
 *  Returns {session_id, models: [{model, requests, input_tokens,
 *  output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd}],
 *  totals: {...}}. */
export async function getSessionCostByModel(sessionId) {
  return fetchJson('/api/session-cost-by-model?session_id=' + encodeURIComponent(sessionId));
}

/** Per-session process genealogy (survives session end).
 *  Returns {session_id, total, by_role: {role: count},
 *  processes: [{pid, tool, role, joined_at}]}. */
export async function getSessionProcesses(sessionId) {
  return fetchJson('/api/session-processes?session_id=' + encodeURIComponent(sessionId));
}

/** Per-session tool-call timeline.
 *  Returns {session_id, total, errors, by_tool: {tool: count},
 *  calls: [{ts, tool_name, is_error, duration_ms, result_summary}]}. */
export async function getSessionToolCalls(sessionId) {
  return fetchJson('/api/session-tool-calls?session_id=' + encodeURIComponent(sessionId));
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

export async function getAgentTeams(sessionId) {
  return fetchJson('/api/agent-teams?session_id=' + encodeURIComponent(sessionId));
}

/** Fetch the Claude Code memory diff (start vs end snapshot) for a session.
 *  Returns {files: [{path, change, added_lines, removed_lines, unified_diff}],
 *  summary: {added, modified, removed}}. */
export async function getSessionMemoryDiff(sessionId) {
  return fetchJson('/api/session-memory-diff?session_id=' + encodeURIComponent(sessionId));
}

// ─── Session Transcripts ───────────────────────────────────────

export async function getTranscript(sessionId) {
  return fetchJson('/api/transcript/' + encodeURIComponent(sessionId));
}

export async function getTranscripts(cutoff = 300) {
  return fetchJson('/api/transcripts?cutoff=' + cutoff);
}

// ─── Analytics & Costs ─────────────────────────────────────────

export async function getAnalytics(path, opts = {}) {
  return fetchJson(path, opts);
}

export async function getProjectCosts(days = 7) {
  return fetchJson('/api/project-costs?days=' + days);
}

export async function getApiCalls(since, limit = 100, sessionId = null) {
  const qs = new URLSearchParams({since: String(since), limit: String(limit)});
  if (sessionId) qs.set('session_id', sessionId);
  return fetchJson(`/api/api-calls?${qs.toString()}`);
}

// ─── Budget ────────────────────────────────────────────────────

export async function getBudget() {
  return fetchJson('/api/budget');
}

// ─── Files ─────────────────────────────────────────────────────
// These return the raw Response (callers need .status / .headers for the
// ETag & 304 handling in utils.fetchFileContent), so they stay on fetch.

export async function getFile(path, headers = {}) {
  return fetch(url('/api/file?path=' + encodeURIComponent(path)), { headers });
}

/** Fetch historical file content at a specific timestamp.
 *  Returns a fetch Response; caller should check .ok and read .text().
 *  Backed by /api/files/history?path=X&ts=Y which returns plain text. */
export async function getFileAt(path, ts) {
  return fetch(url('/api/files/history?path=' + encodeURIComponent(path) + '&ts=' + ts));
}

// ─── Samples ───────────────────────────────────────────────────

export async function getSamplesList() {
  return fetchJson('/api/samples?list=1');
}

export async function getSamplesSeries(name, since) {
  return fetchJson('/api/samples?series=' + encodeURIComponent(name) + '&since=' + since);
}

export async function getSamplesRaw(name, since) {
  return fetchJson('/api/samples?metric=' + encodeURIComponent(name) + '&since=' + since);
}

// ─── Health ────────────────────────────────────────────────────

export async function getOtelStatus() {
  return fetchJson('/api/otel-status');
}

export async function getSelfStatus() {
  return fetchJson('/api/self-status');
}

export async function getHooksStatus() {
  return fetchJson('/api/hooks-status');
}

export async function getToolConfig(tool) {
  return fetchJson('/api/tool-config/' + encodeURIComponent(tool));
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

// ─── Datapoints ────────────────────────────────────────────────

let _datapointCache = null;

export async function getDatapoints() {
  if (!_datapointCache) {
    _datapointCache = fetchJson('/api/datapoints');
  }
  return _datapointCache;
}

export function resetDatapointCache() { _datapointCache = null; }

// ─── SSE stream URL ────────────────────────────────────────────

export function streamUrl() { return url('/api/stream'); }
