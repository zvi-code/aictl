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
import { esc, fmtK, COLORS } from '../utils.js';
import * as api from '../api.js';
import SessionDetail from './SessionDetail.js';
import TabSessionFlow from './TabSessionFlow.js';
import TabTranscript from './TabTranscript.js';
import TabTimelineChart from './TabTimelineChart.js';
import EventsPanel from './session_detail/EventsPanel.js';
import ToolTabs from './session_flow/ToolTabs.js';
import SessionTabs from './session_flow/SessionTabs.js';
import { fmtDurSec } from './session_flow/helpers.js';

const VIEWS = [
  { id: 'overview',   label: 'Overview',   hint: 'Metrics, actions, context, memory' },
  { id: 'flow',       label: 'Flow',       hint: 'Sequence of messages & tool calls' },
  { id: 'transcript', label: 'Transcript', hint: 'Readable prompts & replies' },
  { id: 'timeline',   label: 'Timeline',   hint: 'Activity bar chart over time' },
  { id: 'events',     label: 'Events',     hint: 'Raw session event stream' },
];

export function SessionHeader({ session }) {
  if (!session) return null;
  const c = COLORS[session.tool] || 'var(--fg2)';
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
  </div>`;
}

export default function TabExplorer() {
  const { globalRange, enabledTools } = useContext(SnapContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeView, setActiveView] = useState(() => {
    try { return localStorage.getItem('aictl-explorer-view') || 'overview'; }
    catch { return 'overview'; }
  });

  const changeView = (v) => {
    setActiveView(v);
    try { localStorage.setItem('aictl-explorer-view', v); } catch { /* ignore */ }
  };

  // Fetch sessions list (shared across sub-views)
  useEffect(() => {
    setLoading(true);
    const since = globalRange
      ? Math.min(globalRange.since, Date.now() / 1000 - 86400)
      : Date.now() / 1000 - 86400;
    const until = globalRange?.until;
    api.getSessionTimeline(null, { since, until })
      .then(data => {
        data.sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [globalRange]);

  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);
  const filteredSessions = sessions.filter(sess => toolMatch(sess.tool));
  const tools = [...new Set(filteredSessions.map(s => s.tool))].sort();

  useEffect(() => {
    if (!activeTool && tools.length > 0) setActiveTool(tools[0]);
    else if (activeTool && !tools.includes(activeTool) && tools.length > 0) setActiveTool(tools[0]);
  }, [tools.join(',')]);

  const toolSessions = filteredSessions.filter(s => s.tool === activeTool);

  useEffect(() => {
    if (toolSessions.length > 0
        && (!activeSessionId || !toolSessions.find(s => s.session_id === activeSessionId))) {
      setActiveSessionId(toolSessions[0].session_id);
    }
  }, [activeTool, toolSessions.length]);

  const activeSession = sessions.find(s => s.session_id === activeSessionId);

  return html`<div class="explorer-container">
    <div class="explorer-picker">
      <${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>
      <${SessionTabs} sessions=${toolSessions} activeId=${activeSessionId}
        onSelect=${setActiveSessionId} loading=${loading}/>
    </div>

    <${SessionHeader} session=${activeSession}/>

    <div class="explorer-subtabs" role="tablist" aria-label="Session views">
      ${VIEWS.map(v => html`<button key=${v.id}
        class="tab-btn explorer-subtab-btn"
        role="tab"
        aria-current=${activeView === v.id ? 'page' : null}
        aria-selected=${activeView === v.id}
        title=${v.hint}
        onClick=${() => changeView(v.id)}>${v.label}</button>`)}
    </div>

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
