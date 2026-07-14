// ─── useSessionPicker — shared session fetch + tool/session selection ──
// The Explorer, Session Flow, Transcript and Timeline tabs all need the
// same block of state: fetch /api/session-timeline for the global range,
// dedupe the rows (cross-source duplicates), filter by the enabled-tools
// selection, auto-select a tool and a session, and expose setters for the
// pickers. This hook is the single copy of that block.
import { useState, useEffect, useMemo } from 'preact/hooks';
import { dedupeSessions } from '../selectors.js';
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
 *   sessions: object[],           // deduped, newest-first (all tools)
 *   loading: boolean,
 *   error: Error|null,
 *   tools: string[],              // unique tools after enabledTools filter
 *   toolSessions: object[],       // sessions of the active tool
 *   activeTool: string|null, setActiveTool: Function,
 *   activeSessionId: string|null, setActiveSessionId: Function,
 * }}
 */
export default function useSessionPicker({
  globalRange = null,
  enabledTools = null,
  requestedSession = null,
  onRequestApplied = null,
} = {}) {
  const [sessions, setSessions] = useState([]);
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
  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);
  const filteredSessions = useMemo(
    () => sessions.filter(s => toolMatch(s.tool)),
    [sessions, enabledTools],
  );
  const tools = useMemo(
    () => [...new Set(filteredSessions.map(s => s.tool))].sort(),
    [filteredSessions],
  );

  // Auto-select first tool (also when the active one drops out of range).
  useEffect(() => {
    if (!activeTool && tools.length > 0) setActiveTool(tools[0]);
    else if (activeTool && !tools.includes(activeTool) && tools.length > 0) setActiveTool(tools[0]);
  }, [tools.join(',')]);

  const toolSessions = useMemo(
    () => filteredSessions.filter(s => s.tool === activeTool),
    [filteredSessions, activeTool],
  );

  // Auto-select first session of the active tool.
  useEffect(() => {
    if (toolSessions.length > 0
        && (!activeSessionId || !toolSessions.find(s => s.session_id === activeSessionId))) {
      setActiveSessionId(toolSessions[0].session_id);
    }
  }, [activeTool, toolSessions.length]);

  // Apply an externally-requested session once the list contains it (the
  // request usually fires before the fetch resolves). Declared after the
  // auto-select effects above so an explicit request wins.
  useEffect(() => {
    if (!requestedSession?.sessionId) return;
    const sess = sessions.find(s => s.session_id === requestedSession.sessionId);
    if (!sess) return; // not loaded yet — stays pending until the next fetch
    setActiveTool(sess.tool);
    setActiveSessionId(sess.session_id);
    onRequestApplied?.();
  }, [requestedSession, sessions]);

  return {
    sessions, loading, error,
    tools, toolSessions,
    activeTool, setActiveTool,
    activeSessionId, setActiveSessionId,
  };
}
