/**
 * TabExplorer — unified session-inspection workspace.
 *
 * Merges the previously separate Sessions / Session Flow / Transcript /
 * Timeline tabs into a single top-level view.  A shared tool + session
 * picker sits at the top; inner sub-tabs switch between four
 * complementary lenses over the selected session:
 *
 *   Overview    full session detail (metrics, actions, context, memory,
 *               resources, deliverables, API calls, cost, run history)
 *   Flow        sequence-diagram view of user ↔ tool ↔ API ↔ skills
 *   Transcript  human-readable turn-by-turn prompts & actions
 *   Timeline    horizontal bar chart of activity over time
 *
 * The goal is "one place to inspect everything a session did" without
 * losing any of the information the old tabs exposed.  Each inner view
 * reuses its original component in embedded mode (externalSessionId prop)
 * so there is a single source of truth for each rendering.
 */
import { useState, useEffect, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { esc, fmtK, fmtDurSec, toolColor } from '../utils.js';
import useSessionPicker from '../hooks/useSessionPicker.js';
import * as api from '../api.js';

// ─── Session-select bus ──────────────────────────────────────────
// ActivityRail, the command palette and CSessionsTab's "Inspect session"
// button dispatch `aictl:select-session` on document
// (detail = { sessionId, tool }). The dispatch usually happens in the same
// click that switches to the explorer tab — i.e. *before* this component
// mounts — so a module-level listener stashes the latest request and the
// component consumes it on mount. While mounted, the component's own
// listener reacts to further events directly.
let pendingSelect = null;
if (typeof document !== 'undefined') {
  document.addEventListener('aictl:select-session', (e) => {
    pendingSelect = e?.detail?.sessionId ? e.detail : null;
  });
}
import SessionDetail from './SessionDetail.js';
import TabSessionFlow from './TabSessionFlow.js';
import TabTranscript from './TabTranscript.js';
import TabTimelineChart from './TabTimelineChart.js';
import EventsPanel from './session_detail/EventsPanel.js';
import SessionSparklines from './SessionSparklines.js';
import RunTrendStrip from './session_detail/RunTrendStrip.js';
import SessionCommitsBadge from './session_detail/SessionCommitsBadge.js';
import ToolTabs from './ToolTabs.js';
import SessionTabs from './session_flow/SessionTabs.js';

const VIEWS = [
  { id: 'overview',   label: 'Overview',   hint: 'Metrics, actions, context, memory' },
  { id: 'flow',       label: 'Flow',       hint: 'Sequence of messages & tool calls' },
  { id: 'transcript', label: 'Transcript', hint: 'Readable prompts & replies' },
  { id: 'timeline',   label: 'Timeline',   hint: 'Activity bar chart over time' },
  { id: 'events',     label: 'Events',     hint: 'Raw session event stream' },
];

export function SessionHeader({ session }) {
  if (!session) return null;
  const c = toolColor(session.tool);
  const inTok = session.exact_input_tokens || session.input_tokens || 0;
  const outTok = session.exact_output_tokens || session.output_tokens || 0;
  const totalTok = inTok + outTok;
  const dur = session.duration_s
    || (session.ended_at && session.started_at ? session.ended_at - session.started_at : 0);
  const isLive = !session.ended_at;
  const projShort = session.project
    ? session.project.replace(/\\/g, '/').split('/').filter(Boolean).slice(-2).join('/')
    : '';
  const started = session.started_at
    ? new Date(session.started_at * 1000).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '';
  return html`<div class="explorer-session-header" style="border-left:3px solid ${c}">
    <div class="flex-row gap-md" style="align-items:baseline;flex-wrap:wrap">
      <strong style="font-size:var(--fs-lg);color:${c}">${esc(session.tool)}</strong>
      ${projShort && html`<span class="text-muted text-xs mono text-ellipsis"
        style="max-width:360px" title=${session.project}>${esc(projShort)}</span>`}
      ${session.git_branch && html`<span class="badge text-xs"
        style="background:var(--bg2);color:var(--fg2)"
        title="git branch">⎇ ${esc(session.git_branch)}</span>`}
      ${session.git_commit && html`<span class="badge text-xs mono"
        style="background:var(--bg2);color:var(--fg2)"
        title=${session.git_commit}>${esc(String(session.git_commit).slice(0, 7))}</span>`}
      <${SessionCommitsBadge} session=${session}/>
      ${started && html`<span class="text-muted text-xs">${esc(started)}</span>`}
      ${dur > 0 && html`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)">${fmtDurSec(dur)}</span>`}
      ${totalTok > 0 && html`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)"
        title="input ${inTok.toLocaleString()} · output ${outTok.toLocaleString()}">
        ${fmtK(totalTok)}t
      </span>`}
      ${(session.files_modified || 0) > 0 && html`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)">
        ${session.files_modified} files
      </span>`}
      ${isLive && html`<span class="badge"
        style="background:var(--red);color:var(--bg);font-size:var(--fs-xs)">● LIVE</span>`}
      <span class="text-muted text-xs mono"
        style="margin-left:auto;opacity:0.6"
        title=${session.session_id}>${esc(session.session_id)}</span>
    </div>
    <${SessionSparklines} session=${session}/>
  </div>`;
}

export default function TabExplorer() {
  const { globalRange, enabledTools } = useContext(SnapContext);
  const [activeView, setActiveView] = useState(() => {
    try { return localStorage.getItem('aictl-explorer-view') || 'overview'; }
    catch { return 'overview'; }
  });
  // Session-select request (from the bus above). Consumed once sessions
  // containing the requested id have loaded.
  const [pending, setPending] = useState(() => {
    const p = pendingSelect;
    pendingSelect = null;
    return p;
  });

  // Fetch + dedupe + tool/session auto-select (shared with the Flow /
  // Transcript / Timeline tabs). The pending select-session request is
  // handed to the hook, which applies it — overriding the auto-select —
  // once the fetched list contains the requested id.
  const {
    sessions, loading, error, tools, toolSessions,
    activeTool, setActiveTool, activeSessionId, setActiveSessionId,
  } = useSessionPicker({
    globalRange, enabledTools,
    requestedSession: pending,
    onRequestApplied: () => setPending(null),
  });

  const changeView = (v) => {
    setActiveView(v);
    try { localStorage.setItem('aictl-explorer-view', v); } catch { /* ignore */ }
  };

  // Live select-session events while mounted.
  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail;
      if (!d?.sessionId) return;
      setPending(d);
      pendingSelect = null; // consumed here; don't replay on a later mount
    };
    document.addEventListener('aictl:select-session', handler);
    return () => document.removeEventListener('aictl:select-session', handler);
  }, []);

  const activeSession = sessions.find(s => s.session_id === activeSessionId);

  // Short, no-file sessions are hidden by the backend but counted. The count
  // rides on the module (the shared useSessionPicker hook re-derives a fresh
  // array and can't forward it); read it once loading settles. Optional call
  // keeps partial api mocks in tests from throwing.
  const filteredCount = (!loading && api.sessionTimelineFilteredCount)
    ? api.sessionTimelineFilteredCount() : 0;

  return html`<div class="explorer-container">
    <div class="explorer-picker">
      <${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>
      <${SessionTabs} sessions=${toolSessions} activeId=${activeSessionId}
        onSelect=${setActiveSessionId} loading=${loading} error=${error}/>
      ${filteredCount > 0 ? html`<div class="text-muted text-xs" style="margin-top:var(--sp-1)"
        title="Short sessions with no file activity and under 60s are hidden">
        ${filteredCount} short session${filteredCount === 1 ? '' : 's'} hidden</div>` : null}
    </div>

    ${activeSession && activeSession.project && activeSession.tool && html`<${RunTrendStrip}
      sessionId=${activeSession.session_id}
      project=${activeSession.project}
      tool=${activeSession.tool}
      currentDurationS=${activeSession.duration_s
        || (activeSession.ended_at && activeSession.started_at
            ? activeSession.ended_at - activeSession.started_at : 0)}
      currentTokens=${(activeSession.exact_input_tokens || activeSession.input_tokens || 0)
        + (activeSession.exact_output_tokens || activeSession.output_tokens || 0)}
      currentFileChurn=${activeSession.files_modified || 0}/>`}

    <${SessionHeader} session=${activeSession}/>

    <nav class="explorer-subtabs" aria-label="Session views">
      ${VIEWS.map(v => html`<button key=${v.id}
        class="tab-btn explorer-subtab-btn"
        aria-current=${activeView === v.id ? 'page' : null}
        title=${v.hint}
        onClick=${() => changeView(v.id)}>${v.label}</button>`)}
    </nav>

    <div class="explorer-content">
      ${!activeSessionId
        ? html`<div class="empty-state" style="padding:var(--sp-8);text-align:center">
            <p>${loading ? 'Loading sessions\u2026' : 'Select a session above to inspect it.'}</p>
            ${!loading && tools.length === 0 && html`<p class="text-muted text-xs"
              style="margin-top:var(--sp-3)">
              No sessions in the current time range. Try widening the range bar above.
            </p>`}
          </div>`
        : activeView === 'overview'
          ? (activeSession
              ? html`<${SessionDetail} session=${activeSession}/>`
              : html`<div class="loading-state" style="padding:var(--sp-8)">Loading session\u2026</div>`)
          : activeView === 'flow'
            ? html`<${TabSessionFlow} key=${'ex-flow-' + activeSessionId}
                externalSessionId=${activeSessionId}/>`
            : activeView === 'transcript'
              ? html`<${TabTranscript} key=${'ex-tr-' + activeSessionId}
                  externalSessionId=${activeSessionId}/>`
              : activeView === 'timeline'
                ? html`<${TabTimelineChart} key=${'ex-tl-' + activeSessionId}
                    externalSessionId=${activeSessionId}/>`
                : html`<${EventsPanel}
                    key=${'ex-ev-' + activeSessionId}
                    sessionId=${activeSessionId}
                    since=${globalRange?.since}
                    until=${globalRange?.until}
                  />`}
    </div>
  </div>`;
}
