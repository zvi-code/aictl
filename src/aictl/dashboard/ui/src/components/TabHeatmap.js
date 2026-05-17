import { useState, useEffect, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import * as api from '../api.js';
import ToolCooccurrenceHeatmap from './charts/ToolCooccurrenceHeatmap.js';

// Tool Heatmap tab — visualises which tools fire in the same session across
// the selected range. Diagonal = session count per tool; off-diagonal =
// cooccurrence count. Falls back to diagonal-only when the backend does not
// yet expose per-session tool sets (see ToolCooccurrenceHeatmap header).
export default function TabHeatmap() {
  const { globalRange, enabledTools } = useContext(SnapContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const since = globalRange
      ? Math.min(globalRange.since, Date.now() / 1000 - 86400)
      : Date.now() / 1000 - 86400;
    const until = globalRange?.until;
    api.getSessionTimeline(null, { since, until })
      .then(data => {
        setSessions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        setError(String(e?.message || e));
        setLoading(false);
      });
  }, [globalRange]);

  const toolMatch = (t) => enabledTools === null || enabledTools.includes(t);
  const filtered = sessions.filter(s => toolMatch(s.tool));

  if (loading) return html`<p class="text-muted">Loading heatmap…</p>`;
  if (error)   return html`<p class="text-muted" role="alert">Failed to load sessions: ${error}</p>`;
  if (!filtered.length) return html`<p class="text-muted">No sessions in range.</p>`;

  return html`<section aria-label="Tool cooccurrence heatmap">
    <header class="mb-md">
      <h2 class="h-section">Tool Heatmap</h2>
      <p class="text-muted" style="margin:0">
        Diagonal = session count per tool. Off-diagonal cells = sessions that used both tools
        (requires backend per-session tool sets; otherwise shows diagonal only).
      </p>
    </header>
    <${ToolCooccurrenceHeatmap} sessions=${filtered} height=${480}/>
  </section>`;
}
