// ─── Pure data selectors — extracted from app.js for testability ─
// All functions are pure: (input) → output, no side effects.

const MAX_GLOBAL = 200;
const MAX_TOOL = 80;

export const GLOBAL_KEYS = ['ts','files','tokens','cpu','mem_mb','mcp','mem_tokens',
                     'live_sessions','live_tokens','live_in_rate','live_out_rate'];

/**
 * Merge an SSE summary update into the existing snapshot.
 * Tool-level fields (live, vendor, host) are updated; everything else is spread.
 */
export function mergeSseSummary(prev, data) {
  if(!prev) return data;
  const toolMap = Object.fromEntries((data.tools || []).map(t => [t.tool, t]));
  return {
    ...prev,
    ...data,
    tools: prev.tools.map(t => {
      const update = toolMap[t.tool];
      if(!update) return t;
      return { ...t, live: update.live, vendor: update.vendor || t.vendor, host: update.host || t.host };
    }),
  };
}

/**
 * Append a single SSE data point to the running history arrays.
 * Trims to MAX_GLOBAL entries to bound memory.
 */
export function appendHistory(prev, data) {
  if(!prev) return prev;
  prev.ts.push(data.timestamp);
  prev.files.push(data.total_files);
  prev.tokens.push(data.total_tokens);
  prev.cpu.push(Math.round(data.total_cpu * 10) / 10);
  prev.mem_mb.push(Math.round(data.total_mem_mb * 10) / 10);
  prev.mcp.push(data.total_mcp_servers);
  prev.mem_tokens.push(data.total_memory_tokens);
  prev.live_sessions.push(data.total_live_sessions);
  prev.live_tokens.push(data.total_live_estimated_tokens);
  prev.live_in_rate.push(Math.round((data.total_live_inbound_rate_bps || 0) * 100) / 100);
  prev.live_out_rate.push(Math.round((data.total_live_outbound_rate_bps || 0) * 100) / 100);
  if(prev.ts.length > MAX_GLOBAL) {
    for(const k of GLOBAL_KEYS) prev[k] = prev[k].slice(-MAX_GLOBAL);
  }
  const bt = prev.by_tool || {};
  for(const t of (data.tools || [])) {
    if(t.tool === 'aictl') continue;
    const cpu = t.live?.cpu_percent || 0;
    const mem = t.live?.mem_mb || 0;
    const tok = t.tokens || 0;
    const tr = (t.live?.outbound_rate_bps || 0) + (t.live?.inbound_rate_bps || 0);
    if(!bt[t.tool]) bt[t.tool] = { ts: [], cpu: [], mem_mb: [], tokens: [], traffic: [] };
    const th = bt[t.tool];
    th.ts.push(data.timestamp);
    th.cpu.push(Math.round(cpu * 10) / 10);
    th.mem_mb.push(Math.round(mem * 10) / 10);
    th.tokens.push(tok);
    th.traffic.push(Math.round(tr * 100) / 100);
    if(th.ts.length > MAX_TOOL) {
      for(const k of Object.keys(th)) th[k] = th[k].slice(-MAX_TOOL);
    }
  }
  return { ...prev, by_tool: bt };
}

/**
 * Filter a tools array by the enabled set.
 * If enabledTools is null, all tools pass (no filter active).
 */
export function filterToolsByEnabled(tools, enabledTools) {
  if (enabledTools === null) return tools;
  return tools.filter(t => enabledTools.includes(t.tool));
}

// ─── Session dedup (defensive against backend double-reporting) ──

/** Near-duplicate collapse windows (multi-source duplicate-chip signature). */
const DEDUPE_START_WINDOW_S = 15;
const DEDUPE_DURATION_WINDOW_S = 5;

function sessionRowId(s) {
  return s?.session_id ?? s?.id ?? null;
}

/** UUID anywhere in a session id — hook/JSONL/OTel rows carry the tool's
 *  own session UUID; correlator rows look like `tool:pid:started`. */
const SESSION_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function sessionAltIds(s) {
  return Array.isArray(s?.alt_session_ids) ? s.alt_session_ids : [];
}

/**
 * Ordered lookup candidates for a session row: primary id first, then every
 * alternate id the row was merged from (frontend near-dup merge and backend
 * profile merge both record them). Feed these to flow/transcript/tool-call
 * fetches so a merged session stays reachable by all of its ids.
 */
export function sessionIdCandidates(s) {
  const out = [];
  for (const id of [sessionRowId(s), ...sessionAltIds(s)]) {
    if (id != null && id !== '' && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Find a session row by ANY of its ids (primary or alternate). */
export function findSessionRow(sessions, sessionId) {
  if (sessionId == null) return undefined;
  return (sessions || []).find(s => sessionIdCandidates(s).includes(sessionId));
}

/** Most recent activity timestamp we can attribute to a session row. */
function sessionActivity(s) {
  return Math.max(s?.ended_at || 0, s?.started_at || 0, s?.last_activity || 0);
}

/** Duration in seconds, or null when the row is still live / unknown. */
function sessionDurationS(s) {
  if (s?.duration_s) return s.duration_s;
  if (s?.ended_at && s?.started_at) return s.ended_at - s.started_at;
  return null;
}

/**
 * Merge two rows believed to describe the same session: keep the row with
 * the most recent activity for its field data, take the max of token/file
 * counters (a stale duplicate must not win on partial data), and fill any
 * fields the kept row is missing from the discarded one.
 *
 * Identity: the merged row retains EVERY id either row was known by. The
 * primary id prefers a UUID-bearing id — flow/transcript/request data is
 * stored under the tool's own session UUID, while correlator ids
 * (`tool:pid:started`) mostly carry process-level data; keeping the PID
 * identity made rich sessions render an empty Flow tab. All other ids go
 * to `alt_session_ids` so lookups can fall back to them.
 */
function mergeSessionRows(a, b) {
  const [keep, other] = sessionActivity(b) > sessionActivity(a) ? [b, a] : [a, b];
  const merged = { ...keep };
  for (const k of ['input_tokens', 'output_tokens',
                   'exact_input_tokens', 'exact_output_tokens',
                   'files_modified']) {
    const ov = other?.[k] || 0;
    if (ov > (merged[k] || 0)) merged[k] = ov;
  }
  for (const k of Object.keys(other || {})) {
    if (merged[k] == null && other[k] != null) merged[k] = other[k];
  }
  const ids = [];
  for (const id of [...sessionIdCandidates(keep), ...sessionIdCandidates(other)]) {
    if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length > 1) {
    const primary = SESSION_UUID_RE.test(String(ids[0]))
      ? ids[0]
      : (ids.find(id => SESSION_UUID_RE.test(String(id))) ?? ids[0]);
    merged.session_id = primary;
    if (merged.id != null) merged.id = primary;
    merged.alt_session_ids = ids.filter(id => id !== primary);
  }
  return merged;
}

/** Same tool + started_at within 15s + duration within 5s (or both live). */
function isNearDuplicate(a, b) {
  if (!a?.tool || a.tool !== b?.tool) return false;
  if (a.started_at == null || b.started_at == null) return false;
  if (Math.abs(a.started_at - b.started_at) > DEDUPE_START_WINDOW_S) return false;
  const da = sessionDurationS(a), db = sessionDurationS(b);
  if (da == null && db == null) return true;          // both still live
  if (da == null || db == null) return false;         // one ended, one live → distinct
  return Math.abs(da - db) <= DEDUPE_DURATION_WINDOW_S;
}

/**
 * Deduplicate session rows (e.g. /api/session-timeline responses).
 *
 * Backend dedup is being fixed separately; the UI stays defensive:
 *  1. Exact `session_id` duplicates collapse into one row (most recent
 *     activity wins; token/file counters merge as maxima).
 *  2. Near-duplicates from multiple reporting sources collapse too:
 *     same tool, started_at within 15s and duration within 5s — the
 *     duplicate-chip signature.
 * Order of surviving rows follows first appearance; callers re-sort.
 */
export function dedupeSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  if (sessions.length < 2) return sessions.slice();

  // Pass 1 — exact id duplicates.
  const byId = new Map();
  const rows = [];
  for (const s of sessions) {
    if (!s) continue;
    const id = sessionRowId(s);
    if (id != null && byId.has(id)) {
      const idx = byId.get(id);
      rows[idx] = mergeSessionRows(rows[idx], s);
    } else {
      if (id != null) byId.set(id, rows.length);
      rows.push(s);
    }
  }

  // Pass 2 — cross-source near-duplicates.
  const out = [];
  for (const s of rows) {
    const dupIdx = out.findIndex(r => isNearDuplicate(r, s));
    if (dupIdx >= 0) out[dupIdx] = mergeSessionRows(out[dupIdx], s);
    else out.push(s);
  }
  return out;
}

// ─── Totals recomputed for the tools the filter keeps ───────────
// The server sends machine-wide `total_*` figures with no per-tool split. Under
// a filter they would read as the selected tools' numbers, so the Overview
// recomputes them from the already-filtered snapshot, with the server's own
// formulas (DashboardSnapshot in models.py).

const num = v => Number(v) || 0;

/** `total_*` fields for exactly the tools in `snap.tools` (the filtered snapshot). */
export function scopeTotals(snap) {
  const tools = (snap?.tools || []).filter(t => t.tool !== 'aictl');
  const files = t => (Array.isArray(t.files) ? t.files : []);
  const sum = fn => tools.reduce((a, t) => a + fn(t), 0);
  const liveOf = t => t.live || {};
  const mem = snap?.agent_memory || [];
  const tokenEst = t => num(liveOf(t).token_estimate?.input_tokens) + num(liveOf(t).token_estimate?.output_tokens);
  return {
    total_files: sum(t => (Array.isArray(t.files) ? t.files.length : num(t.files_count))),
    total_tokens: sum(t => files(t).reduce((a, f) => a + num(f.tokens), 0)),
    total_size: sum(t => files(t).reduce((a, f) => a + num(f.size), 0)),
    total_processes: sum(t => Math.max(
      Array.isArray(t.processes) ? t.processes.length : num(t.processes_count),
      num(liveOf(t).pid_count))),
    total_cpu: Math.round(sum(t => (liveOf(t).cpu_percent
      ? num(liveOf(t).cpu_percent)
      : (t.processes || []).reduce((a, p) => a + num(p.cpu_pct), 0))) * 10) / 10,
    total_mem_mb: Math.round(sum(t => (t.processes || []).reduce((a, p) => a + num(p.mem_mb), 0)) * 10) / 10,
    total_mcp_servers: (snap?.mcp_detail || []).length,
    total_memory_tokens: mem.reduce((a, m) => a + num(m.tokens), 0),
    total_live_sessions: sum(t => num(liveOf(t).session_count)),
    total_live_estimated_tokens: sum(tokenEst),
    total_live_outbound_rate_bps: Math.round(sum(t => num(liveOf(t).outbound_rate_bps)) * 100) / 100,
    total_live_inbound_rate_bps: Math.round(sum(t => num(liveOf(t).inbound_rate_bps)) * 100) / 100,
  };
}

/**
 * History series summed over the selected tools, from `history.by_tool`.
 * Only cpu, mem_mb and tokens have a per-tool series; every other key is null,
 * meaning "no per-tool trend", never a made-up flat line.
 */
export function scopeHistory(history, enabledTools) {
  if (!history || !Array.isArray(enabledTools)) return history;
  const by = history.by_tool || {};
  const ids = enabledTools.filter(id => by[id]?.ts?.length);
  const stamps = [...new Set(ids.flatMap(id => by[id].ts))].sort((a, b) => a - b);
  const series = key => stamps.map(ts => ids.reduce((acc, id) => {
    const i = by[id].ts.indexOf(ts);
    return acc + (i >= 0 ? num(by[id][key]?.[i]) : 0);
  }, 0));
  return { ts: stamps, cpu: series('cpu'), mem_mb: series('mem_mb'), tokens: series('tokens'), by_tool: by };
}
