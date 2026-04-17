// ─── API client — single module for all backend calls ──────────
// Replaces hard-coded fetch('/api/...') scattered across 14 files.
// Accepts optional baseUrl for testing (default: '' = relative URLs).

let _baseUrl = '';

/** Set the base URL for all API calls (useful for tests). */
export function setBaseUrl(url) { _baseUrl = url; }

/** Get current base URL. */
export function getBaseUrl() { return _baseUrl; }

function url(path) { return _baseUrl + path; }

// ─── Snapshot & History ────────────────────────────────────────

export async function getSnapshot() {
  const r = await fetch(url('/api/snapshot'));
  return r.json();
}

export async function getHistory(opts = {}) {
  let path = '/api/history';
  const params = [];
  if (opts.range) params.push('range=' + opts.range);
  if (opts.since != null) params.push('since=' + opts.since);
  if (opts.until != null) params.push('until=' + opts.until);
  if (opts.tool) params.push('tool=' + encodeURIComponent(opts.tool));
  if (params.length) path += '?' + params.join('&');
  const r = await fetch(url(path));
  return r.json();
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
  const r = await fetch(url(path));
  return r.json();
}

// ─── Sessions ──────────────────────────────────────────────────

export async function getSessions(opts = {}) {
  let path = '/api/sessions';
  const params = [];
  if (opts.tool) params.push('tool=' + encodeURIComponent(opts.tool));
  if (opts.active != null) params.push('active=' + opts.active);
  if (opts.limit) params.push('limit=' + opts.limit);
  if (params.length) path += '?' + params.join('&');
  const r = await fetch(url(path));
  return r.json();
}

export async function getSessionFlow(sessionId, since, until) {
  let path = `/api/session-flow?session_id=${encodeURIComponent(sessionId)}&since=${since}&until=${until}`;
  const r = await fetch(url(path));
  return r.json();
}

export async function getSessionTimeline(sessionId, opts = {}) {
  let path = '/api/session-timeline';
  const params = [];
  if (sessionId) params.push('session_id=' + encodeURIComponent(sessionId));
  if (opts.since != null) params.push('since=' + opts.since);
  if (opts.until != null) params.push('until=' + opts.until);
  if (params.length) path += '?' + params.join('&');
  const r = await fetch(url(path));
  return r.json();
}

export async function getSessionRuns(project, tool, days = 30, limit = 20) {
  const path = `/api/session-runs?project=${encodeURIComponent(project)}&tool=${encodeURIComponent(tool)}&days=${days}&limit=${limit}`;
  const r = await fetch(url(path));
  return r.json();
}

export async function getSessionEvents(sessionId, opts = {}) {
  let path = '/api/events?session_id=' + encodeURIComponent(sessionId);
  if (opts.since != null) path += '&since=' + opts.since;
  if (opts.until != null) path += '&until=' + opts.until;
  if (opts.limit != null) path += '&limit=' + opts.limit;
  const r = await fetch(url(path));
  return r.json();
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
  const r = await fetch(url(path));
  return r.json();
}

/** Per-session subprocess breakdown. Returns {counts: [{name, count}], recent, total}. */
export async function getSessionSubprocesses(sessionId) {
  const r = await fetch(url('/api/session-subprocesses?session_id=' + encodeURIComponent(sessionId)));
  return r.json();
}

/** Per-session MCP server usage. Returns {servers: [...], total_calls,
 *  configured_servers: [name, ...]}. */
export async function getSessionMcpUsage(sessionId) {
  const r = await fetch(url('/api/session-mcp-usage?session_id=' + encodeURIComponent(sessionId)));
  return r.json();
}

/** Per-session deduced stats + enrichments (e.g. vscode_lm_usage).
 *  Returns the SessionEntityState dict, optionally with vscode_lm_usage
 *  when OTel language_model.usage events exist. */
export async function getSessionStats(sessionId) {
  const r = await fetch(url('/api/session-stats?session_id=' + encodeURIComponent(sessionId)));
  return r.json();
}

/** Per-session git commit attribution.
 *  Returns {session_id, branch, commits: [{sha, short_sha, author_name,
 *  author_email, ts, subject, current_branch_match}]}. */
export async function getSessionCommits(sessionId) {
  const r = await fetch(url('/api/session-commits?session_id=' + encodeURIComponent(sessionId)));
  return r.json();
}

export async function getAgentTeams(sessionId) {
  const r = await fetch(url('/api/agent-teams?session_id=' + encodeURIComponent(sessionId)));
  return r.json();
}

/** Fetch the Claude Code memory diff (start vs end snapshot) for a session.
 *  Returns {files: [{path, change, added_lines, removed_lines, unified_diff}],
 *  summary: {added, modified, removed}}. */
export async function getSessionMemoryDiff(sessionId) {
  const r = await fetch(url('/api/session-memory-diff?session_id=' + encodeURIComponent(sessionId)));
  return r.json();
}

// ─── Session Transcripts ───────────────────────────────────────

export async function getTranscript(sessionId) {
  const r = await fetch(url('/api/transcript/' + encodeURIComponent(sessionId)));
  return r.json();
}

export async function getTranscripts(cutoff = 300) {
  const r = await fetch(url('/api/transcripts?cutoff=' + cutoff));
  return r.json();
}

// ─── Analytics & Costs ─────────────────────────────────────────

export async function getAnalytics(path, opts = {}) {
  const r = await fetch(url(path), opts);
  return r.json();
}

export async function getProjectCosts(days = 7) {
  const r = await fetch(url('/api/project-costs?days=' + days));
  return r.json();
}

export async function getApiCalls(since, limit = 100) {
  const r = await fetch(url(`/api/api-calls?since=${since}&limit=${limit}`));
  return r.json();
}

// ─── Budget ────────────────────────────────────────────────────

export async function getBudget() {
  const r = await fetch(url('/api/budget'));
  return r.json();
}

// ─── Files ─────────────────────────────────────────────────────

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
  const r = await fetch(url('/api/samples?list=1'));
  return r.json();
}

export async function getSamplesSeries(name, since) {
  const r = await fetch(url('/api/samples?series=' + encodeURIComponent(name) + '&since=' + since));
  return r.json();
}

export async function getSamplesRaw(name, since) {
  const r = await fetch(url('/api/samples?metric=' + encodeURIComponent(name) + '&since=' + since));
  return r.json();
}

// ─── Health ────────────────────────────────────────────────────

export async function getOtelStatus() {
  const r = await fetch(url('/api/otel-status'));
  return r.json();
}

export async function getSelfStatus() {
  const r = await fetch(url('/api/self-status'));
  return r.json();
}

// ─── Datapoints ────────────────────────────────────────────────

let _datapointCache = null;

export async function getDatapoints() {
  if (!_datapointCache) {
    _datapointCache = fetch(url('/api/datapoints')).then(r => r.json());
  }
  return _datapointCache;
}

export function resetDatapointCache() { _datapointCache = null; }

// ─── SSE stream URL ────────────────────────────────────────────

export function streamUrl() { return url('/api/stream'); }
