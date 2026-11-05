// ─── useSessionPicker — shared session fetch + tool/session selection ──
// The Explorer, Session Flow, Transcript and Timeline tabs all need the
// same block of state: fetch /api/session-timeline for the global range,
// dedupe the rows (cross-source duplicates), filter by the enabled-tools
// selection, auto-select a tool and a session, and expose setters for the
// pickers. This hook is the single copy of that block.
import { useState, useEffect, useMemo, useContext } from 'preact/hooks';
import { SnapContext } from '../context.js';
import { orderIdsBySessionCount } from '../utils/tools.js';
import { isToolSelected } from '../utils/toolScope.js';
import { dedupeSessions, findSessionRow } from '../selectors.js';
import * as api from '../api.js';

/**
 * @param {object} opts
 * @param {{since: number, until: number|null}|null} opts.globalRange
 *   Global time range from SnapContext (null = default last 24h).
 * @param {string[]|null} opts.enabledTools
 *   Tool filter from SnapContext (null = all tools enabled).
 * @param {{sessionId: string, tool?: string}|null} [opts.requestedSession]
 *   Externally-requested session (e.g. the `aictl:select-session` bus in
 *   TabExplorer). Applied — overriding the auto-select — once the fetched
 *   list contains the requested id; until then it stays pending.
 * @param {() => void} [opts.onRequestApplied]
 *   Called after a requestedSession has been applied, so the caller can
 *   clear its pending stash.
 *
 * @returns {{
 *   sessions: object[],           // deduped, newest-first, selected tools only
 *   loading: boolean,
 *   error: Error|null,
 *   tools: string[],              // unique tools after enabledTools filter
 *   toolSessions: object[],       // sessions of the active tool
 *   activeTool: string|null, setActiveTool: Function,
 *   activeSessionId: string|null, setActiveSessionId: Function,
 * }}
 */
/**
 * Add live sessions to the timeline rows. The timeline endpoint reads history and
 * hides short sessions with no file activity, so a session that just started can
 * be running, and listed by the Overview, without any timeline row. A running
 * session is never "short": it stays selectable until it ends.
 */
export function mergeLiveSessions(rows, live) {
  if (!live?.length) return rows;
  const extra = live
    .filter(s => s.session_id && s.tool && !findSessionRow(rows, s.session_id))
    .map(s => ({ ...s, active: true, live: true }));
  if (!extra.length) return rows;
  return [...rows, ...extra].sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
}

export default function useSessionPicker({
  globalRange = null,
  enabledTools = null,
  requestedSession = null,
  onRequestApplied = null,
} = {}) {
  const liveSessions = useContext(SnapContext)?.snap?.sessions;
  const [timelineSessions, setSessions] = useState([]);
  const sessions = useMemo(
    () => mergeLiveSessions(timelineSessions, liveSessions),
    [timelineSessions, liveSessions],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Fetch + dedupe the session list whenever the range changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const since = globalRange
      ? Math.min(globalRange.since, Date.now() / 1000 - 86400)
      : Date.now() / 1000 - 86400;
    const until = globalRange?.until;
    api.getSessionTimeline(null, { since, until })
      .then(data => {
        if (cancelled) return;
        const rows = dedupeSessions(data);
        rows.sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
        setSessions(rows);
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [globalRange]);

  // Derive tools and per-tool sessions from the enabled-tools filter.
  const toolMatch = (t) => isToolSelected(t, enabledTools);
  const filteredSessions = useMemo(
    () => sessions.filter(s => toolMatch(s.tool)),
    [sessions, enabledTools],
  );
  const tools = useMemo(
    () => orderIdsBySessionCount(filteredSessions),
    [filteredSessions],
  );

  // Auto-select first tool (also when the active one drops out of range or out
  // of the filter). With no tool left, nothing stays selected: a stale tool or
  // session would keep showing data for a tool the filter excludes.
  useEffect(() => {
    if (tools.length === 0) {
      if (activeTool) setActiveTool(null);
      if (activeSessionId) setActiveSessionId(null);
    } else if (!activeTool || !tools.includes(activeTool)) setActiveTool(tools[0]);
  }, [tools.join(',')]);

  const toolSessions = useMemo(
    () => filteredSessions.filter(s => s.tool === activeTool),
    [filteredSessions, activeTool],
  );

  // Auto-select first session of the active tool. Matching by ANY known id
  // (findSessionRow) keeps the selection stable when a refetch merges the
  // selected session with a duplicate and its primary id changes.
  useEffect(() => {
    if (toolSessions.length > 0
        && (!activeSessionId || !findSessionRow(toolSessions, activeSessionId))) {
      setActiveSessionId(toolSessions[0].session_id);
    }
  }, [activeTool, toolSessions.length]);

  // Apply an externally-requested session once the list contains it (the
  // request usually fires before the fetch resolves). Declared after the
  // auto-select effects above so an explicit request wins. The requested id
  // may be an alternate of a merged row — match by any known id.
  useEffect(() => {
    if (!requestedSession?.sessionId) return;
    const sess = findSessionRow(sessions, requestedSession.sessionId);
    if (!sess) return; // not loaded yet — stays pending until the next fetch
    // A session of a tool the filter excludes is not shown: drop the request.
    if (!toolMatch(sess.tool)) { onRequestApplied?.(); return; }
    setActiveTool(sess.tool);
    setActiveSessionId(sess.session_id);
    onRequestApplied?.();
  }, [requestedSession, sessions]);

  return {
    sessions: filteredSessions, loading, error,
    tools, toolSessions,
    activeTool, setActiveTool,
    activeSessionId, setActiveSessionId,
  };
}
