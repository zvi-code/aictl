import { useState, useEffect, useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { esc } from '../utils.js';
import * as api from '../api.js';
import ToolTabs from './session_flow/ToolTabs.js';
import SessionTabs from './session_flow/SessionTabs.js';
import SeqArrow from './session_flow/SeqArrow.js';
import SeqMarker from './session_flow/SeqMarker.js';
import SummaryBar from './session_flow/SummaryBar.js';
import { discoverParticipants } from './session_flow/participants.js';

// Thin orchestrator — fetches sessions/flow data, owns tool + session
// selection state, and composes sub-components under components/session_flow/.
export default function TabSessionFlow() {
  const {globalRange, enabledTools} = useContext(SnapContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Fetch sessions
  useEffect(() => {
    setLoading(true);
    const since = globalRange ? Math.min(globalRange.since, Date.now() / 1000 - 86400) : Date.now() / 1000 - 86400;
    const until = globalRange?.until;
    api.getSessionTimeline(null, { since, until })
      .then(data => {
        data.sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [globalRange]);

  // Derive tools and filtered sessions
  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);
  const filteredSessions = sessions.filter(sess => toolMatch(sess.tool));
  const tools = [...new Set(filteredSessions.map(s => s.tool))].sort();

  // Auto-select first tool
  useEffect(() => {
    if (!activeTool && tools.length > 0) setActiveTool(tools[0]);
    else if (activeTool && !tools.includes(activeTool) && tools.length > 0) setActiveTool(tools[0]);
  }, [tools.join(',')]);

  const toolSessions = filteredSessions.filter(s => s.tool === activeTool);

  // Auto-select first session of active tool
  useEffect(() => {
    if (toolSessions.length > 0 && (!activeSessionId || !toolSessions.find(s => s.session_id === activeSessionId))) {
      setActiveSessionId(toolSessions[0].session_id);
    }
  }, [activeTool, toolSessions.length]);

  // Fetch flow data
  useEffect(() => {
    if (!activeSessionId) { setFlowData(null); return; }
    setFlowLoading(true);
    const sess = sessions.find(s => s.session_id === activeSessionId);
    const since = sess?.started_at ? sess.started_at - 60 : Date.now() / 1000 - 86400;
    const until = sess?.ended_at ? sess.ended_at + 60 : Date.now() / 1000 + 60;
    api.getSessionFlow(activeSessionId, since, until)
      .then(data => { setFlowData(data); setFlowLoading(false); })
      .catch(() => { setFlowData(null); setFlowLoading(false); });
  }, [activeSessionId]);

  // Process turns: assign _from/_to and compute running token totals
  const {processedTurns, participants} = useMemo(() => {
    const turns = flowData?.turns || [];
    if (!turns.length) return {processedTurns: [], participants: []};

    const processed = turns.map(t => {
      const ev = {...t};
      if (t.type === 'user_message') {
        ev._from = 'user'; ev._to = 'tool';
      } else if (t.type === 'api_call') {
        ev._from = t.from || 'tool'; ev._to = 'api';
      } else if (t.type === 'api_response') {
        ev._from = 'api'; ev._to = 'tool';
      } else if (t.type === 'error') {
        ev._from = 'api'; ev._to = 'tool';
      } else if (t.type === 'tool_use') {
        ev._from = 'tool'; ev._to = 'skill:' + (t.to || 'tool');
      } else if (t.type === 'subagent') {
        ev._from = 'tool'; ev._to = 'subagent:' + (t.to || 'agent');
      } else if (t.type === 'hook') {
        ev._from = 'tool'; ev._to = 'hook';
      }
      return ev;
    });

    // Compute cumulative and round-trip token columns
    let cumTok = 0;
    let rtTok = 0;
    for (const ev of processed) {
      const tok = ev.tokens || {};
      const total = (tok.input || 0) + (tok.output || 0);
      if (ev.type === 'user_message') {
        rtTok = 0; // reset on user message
      }
      if (ev.type === 'api_call') {
        cumTok += total;
        rtTok += total;
      }
      ev._cumTok = cumTok;
      ev._rtTok = rtTok;
    }

    const parts = discoverParticipants(processed, activeTool);
    return {processedTurns: processed, participants: parts};
  }, [flowData, activeTool]);

  const summary = flowData?.summary || {};

  return html`<div class="sf-container">
    <${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>

    <${SessionTabs} sessions=${toolSessions} activeId=${activeSessionId}
      onSelect=${setActiveSessionId} loading=${loading}/>

    <${SummaryBar} summary=${summary}/>

    <div class="sf-seq-container">
      ${flowLoading
        ? html`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`
        : processedTurns.length === 0
          ? html`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`
          : html`
            <div class="sf-seq-header">
              <div class="sf-seq-tokens">
                <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
              </div>
              <div class="sf-seq-time"></div>
              <div class="sf-seq-arrow-area">
                ${participants.map((p, i) => {
                  const colW = 100 / participants.length;
                  return html`<div key=${p.id} class="sf-seq-participant"
                    style="left:${(i + 0.5) * colW}%;color:${p.color}">
                    <div class="sf-seq-participant-box" style="border-color:${p.color}">${esc(p.label)}</div>
                  </div>`;
                })}
              </div>
            </div>
            <div class="sf-seq-body">
              ${processedTurns.map((ev, idx) => {
                if (ev._from && ev._to) {
                  return html`<${SeqArrow} key=${idx} event=${ev} participants=${participants}
                    hoveredIdx=${hoveredIdx} idx=${idx} onHover=${setHoveredIdx}/>`;
                }
                return html`<${SeqMarker} key=${idx} event=${ev} participants=${participants}/>`;
              })}
            </div>
          `}
    </div>
  </div>`;
}
