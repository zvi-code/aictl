// SessionTimeline — gantt of recent sessions.
//
// Props-compatible with the previous hand-rolled SVG implementation:
//   sessions:     [{ session_id, tool, started_at, ended_at?, ... }]
//   rangeSeconds: visible window in seconds (default 24h)
//   onSelect:     (session) => void — fired on bar click.
//
// Implementation delegates to the ECharts-powered GanttChart. The thin
// wrapper here preserves the export shape so TabSessions.js and any other
// caller continues to work unchanged.

import { html } from 'htm/preact';
import GanttChart from './charts/GanttChart.js';

export default function SessionTimeline({ sessions, rangeSeconds, onSelect, height, markLines }) {
  return html`<div class="stl">
    <${GanttChart}
      sessions=${sessions}
      rangeSeconds=${rangeSeconds}
      onSessionClick=${onSelect}
      height=${height}
      markLines=${markLines}
    />
  </div>`;
}
