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

export async function getAgentTeams(sessionId) {
  const r = await fetch(url('/api/agent-teams?session_id=' + encodeURIComponent(sessionId)));
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
