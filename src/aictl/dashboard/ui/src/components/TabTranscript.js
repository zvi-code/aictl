import { useState, useEffect, useContext, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import * as api from '../api.js';
import useSessionPicker from '../hooks/useSessionPicker.js';
import ToolTabs from './ToolTabs.js';
import SessionSelector from './transcript/SessionSelector.js';
import TurnCard from './transcript/TurnCard.js';
import SummaryHeader from './transcript/SummaryHeader.js';
import { isSessionFlowFormat, normalizeFlowToTranscript } from './transcript/normalize.js';

// Thin orchestrator — owns session/transcript fetch state and composes
// sub-components from components/transcript/.
//
// When `externalSessionId` is passed (e.g. from TabExplorer), the internal
// tool/session pickers are hidden and the component acts as a headless
// transcript renderer for the given session.
export default function TabTranscript({ externalSessionId = null } = {}) {
  const { globalRange, enabledTools } = useContext(SnapContext);
  const {
    sessions, loading, error, tools, toolSessions,
    activeTool, setActiveTool, activeSessionId, setActiveSessionId,
  } = useSessionPicker({ globalRange, enabledTools });
  const [transcript, setTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const embedded = externalSessionId != null;
  const effectiveSessionId = embedded ? externalSessionId : activeSessionId;

  // Fetch transcript (with session-flow fallback)
  const fetchTranscript = useCallback(() => {
    if (!effectiveSessionId) { setTranscript(null); return; }
    setTranscriptLoading(true);
    api.getTranscript(effectiveSessionId)
      .then(data => {
        if (isSessionFlowFormat(data)) {
          setTranscript(normalizeFlowToTranscript(data, effectiveSessionId));
        } else {
          setTranscript(data);
        }
        setTranscriptLoading(false);
      })
      .catch(() => {
        const sess = sessions.find(s => s.session_id === effectiveSessionId);
        const since = sess?.started_at ? sess.started_at - 60 : Date.now() / 1000 - 86400;
        const until = sess?.ended_at ? sess.ended_at + 60 : Date.now() / 1000 + 60;
        api.getSessionFlow(effectiveSessionId, since, until)
          .then(flow => {
            setTranscript(normalizeFlowToTranscript(flow, effectiveSessionId));
            setTranscriptLoading(false);
          })
          .catch(() => { setTranscript(null); setTranscriptLoading(false); });
      });
  }, [effectiveSessionId, sessions]);

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
        ${turns.length > 0 ? html`<button class="tc-filter-btn" onClick=${toggleAll}
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

    ${!embedded && tools.length > 1 && html`<${ToolTabs} tools=${tools} activeTool=${activeTool} onSelect=${setActiveTool}/>`}

    ${!embedded && html`<${SessionSelector} sessions=${toolSessions} activeId=${activeSessionId}
      onSelect=${setActiveSessionId} loading=${loading} error=${error}/>`}

    <${SummaryHeader} summary=${summary} transcript=${transcript}/>

    <div class="tr-turns">
      ${transcriptLoading
        ? html`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript\u2026</div>`
        : turns.length === 0
          ? html`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                No prompt or tool events were captured for this session.
              </p>
            </div>`
          : turns.map((turn, i) => html`<${TurnCard}
              key=${i} turn=${turn} index=${i}
              expanded=${expandedTurns.has(i)}
              onToggle=${() => toggleTurn(i)}/>`)}
    </div>
  </div>`;
}
