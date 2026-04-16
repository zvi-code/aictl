import { useState, useEffect, useContext, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import * as api from '../api.js';
import ToolTabs from './transcript/ToolTabs.js';
import SessionSelector from './transcript/SessionSelector.js';
import TurnCard from './transcript/TurnCard.js';
import SummaryHeader from './transcript/SummaryHeader.js';
import { isSessionFlowFormat, normalizeFlowToTranscript } from './transcript/normalize.js';

// Thin orchestrator — owns session/transcript fetch state and composes
// sub-components from components/transcript/.
export default function TabTranscript() {
  const { globalRange, enabledTools } = useContext(SnapContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch session list
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

  // Auto-select first session
  useEffect(() => {
    if (toolSessions.length > 0 && (!activeSessionId || !toolSessions.find(s => s.session_id === activeSessionId))) {
      setActiveSessionId(toolSessions[0].session_id);
    }
  }, [activeTool, toolSessions.length]);

  // Fetch transcript (with session-flow fallback)
  const fetchTranscript = useCallback(() => {
    if (!activeSessionId) { setTranscript(null); return; }
    setTranscriptLoading(true);
    api.getTranscript(activeSessionId)
      .then(data => {
        if (isSessionFlowFormat(data)) {
          setTranscript(normalizeFlowToTranscript(data, activeSessionId));
        } else {
          setTranscript(data);
        }
        setTranscriptLoading(false);
      })
      .catch(() => {
        const sess = sessions.find(s => s.session_id === activeSessionId);
        const since = sess?.started_at ? sess.started_at - 60 : Date.now() / 1000 - 86400;
        const until = sess?.ended_at ? sess.ended_at + 60 : Date.now() / 1000 + 60;
        api.getSessionFlow(activeSessionId, since, until)
          .then(flow => {
            setTranscript(normalizeFlowToTranscript(flow, activeSessionId));
            setTranscriptLoading(false);
          })
          .catch(() => { setTranscript(null); setTranscriptLoading(false); });
      });
  }, [activeSessionId, sessions]);

  useEffect(fetchTranscript, [fetchTranscript]);

  // Auto-refresh for live sessions
  useEffect(() => {
    if (!autoRefresh || !transcript?.is_live) return;
    const timer = setInterval(fetchTranscript, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, transcript?.is_live, fetchTranscript]);

  const toggleTurn = useCallback((idx) => {
    setExpandedTurns(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const turns = transcript?.turns || [];
    if (expandAll) {
      setExpandedTurns(new Set());
      setExpandAll(false);
    } else {
      setExpandedTurns(new Set(turns.map((_, i) => i)));
      setExpandAll(true);
    }
  }, [expandAll, transcript]);

  const turns = (transcript?.turns || []).filter(t =>
    (t.prompt && t.prompt.length > 0) || (t.actions && t.actions.length > 0)
    || (t.tool_use_count > 0)
  );
  const summary = transcript?.summary || null;

  return html`<div class="tr-container">
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${turns.length > 0 ? html`<button class="chip" onClick=${toggleAll}
          style="font-size:var(--fs-xs)">
          ${expandAll ? '\u22A1 Collapse all' : '\u229E Expand all'}
        </button>` : null}
        ${transcript?.is_live ? html`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${autoRefresh}
            onChange=${e => setAutoRefresh(e.target.checked)}/>
          Auto-refresh
        </label>` : null}
      </div>
    </div>

    <${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>

    <${SessionSelector} sessions=${toolSessions} activeId=${activeSessionId}
      onSelect=${setActiveSessionId} loading=${loading}/>

    <${SummaryHeader} summary=${summary} transcript=${transcript}/>

    <div class="tr-turns">
      ${transcriptLoading
        ? html`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript\u2026</div>`
        : turns.length === 0
          ? html`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                Prompts require hooks enabled: set <code>AICTL_URL</code> in your tool config
              </p>
            </div>`
          : turns.map((turn, i) => html`<${TurnCard}
              key=${i} turn=${turn} index=${i}
              expanded=${expandedTurns.has(i)}
              onToggle=${() => toggleTurn(i)}/>`)}
    </div>
  </div>`;
}
