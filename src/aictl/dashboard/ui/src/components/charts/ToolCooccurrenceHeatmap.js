// ToolCooccurrenceHeatmap — heatmap of which tools fire in the same session.
//
// Preferred input: sessions[] where each session has a `tools: [...]` field
// (array of tool identifiers used within that session). If `tools` is
// missing, we fall back to the scalar `session.tool`, which degenerates
// the heatmap to a diagonal — still informative (session counts per tool).
//
// TODO(backend): expose per-session tool-usage sets. Today
// /api/session-timeline returns a single `tool` string per session. The
// richer breakdown lives inside /api/session-flow but requires a round-trip
// per session. Add a `tools: [...]` array to the timeline payload when
// practical; this component picks it up with no client changes.
//
// Props:
//   sessions:   [{ session_id, tool, tools?: [] }, ...]
//   height:     px (default 360)
//   minCount:   suppress cells with count < minCount (default 0).
//   maxTools:   cap axes to top-K tools by appearance (default 20).
//   onCellClick:(toolA, toolB, sessionIds) => void

import { useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import EChart from './EChart.js';

function extractToolSet(s) {
  if (Array.isArray(s.tools) && s.tools.length) return [...new Set(s.tools)];
  if (s.tool) return [s.tool];
  return [];
}

export default function ToolCooccurrenceHeatmap({
  sessions, height, minCount, maxTools, onCellClick,
}) {
  const cap = maxTools || 20;
  const floor = minCount || 0;
  const h = height || 360;

  const option = useMemo(() => {
    // 1. Aggregate per-tool appearance counts to pick the axis set.
    const toolFreq = new Map();
    const sessToolSets = (sessions || []).map(s => {
      const set = extractToolSet(s);
      for (const t of set) toolFreq.set(t, (toolFreq.get(t) || 0) + 1);
      return { sid: s.session_id, tools: set };
    });
    const axisTools = [...toolFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([t]) => t);

    const idx = new Map(axisTools.map((t, i) => [t, i]));

    // 2. Count cooccurrences. Diagonal = session count.
    const N = axisTools.length;
    const counts = Array.from({ length: N }, () => new Array(N).fill(0));
    const exemplars = Array.from({ length: N }, () => new Array(N).fill(null));
    for (const { sid, tools } of sessToolSets) {
      const present = tools.filter(t => idx.has(t));
      for (let i = 0; i < present.length; i++) {
        const a = idx.get(present[i]);
        counts[a][a] += 1;
        if (!exemplars[a][a]) exemplars[a][a] = sid;
        for (let j = i + 1; j < present.length; j++) {
          const b = idx.get(present[j]);
          counts[a][b] += 1;
          counts[b][a] += 1;
          if (!exemplars[a][b]) exemplars[a][b] = sid;
          if (!exemplars[b][a]) exemplars[b][a] = sid;
        }
      }
    }

    const cells = [];
    let maxCount = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const c = counts[i][j];
        if (c < floor) continue;
        if (c === 0) continue;
        if (c > maxCount) maxCount = c;
        cells.push([i, j, c, exemplars[i][j]]);
      }
    }

    return {
      grid: { left: 92, right: 28, top: 28, bottom: 92, containLabel: false },
      tooltip: {
        position: 'top',
        formatter: (p) => {
          const [i, j, c, sid] = p.data;
          const a = axisTools[i];
          const b = axisTools[j];
          const kind = (i === j) ? 'sessions using' : 'cooccur in';
          return `<b>${a} × ${b}</b><br/>${kind}: ${c} session${c === 1 ? '' : 's'}` +
            (sid ? `<br/><span style="opacity:.7">e.g. ${String(sid).slice(0, 24)}</span>` : '');
        },
      },
      xAxis: {
        type: 'category',
        data: axisTools,
        axisLabel: { fontSize: 10, rotate: 45, hideOverlap: true },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: axisTools,
        axisLabel: { fontSize: 10 },
        splitArea: { show: true },
      },
      visualMap: {
        min: 0,
        max: Math.max(1, maxCount),
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        itemHeight: 80,
        itemWidth: 10,
        textStyle: { fontSize: 10 },
        inRange: { color: ['#1f2937', '#3b82f6', '#22d3ee', '#facc15', '#ef4444'] },
      },
      series: [{
        name: 'cooccurrence',
        type: 'heatmap',
        data: cells,
        emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
        progressive: 1000,
      }],
    };
  }, [sessions, cap, floor]);

  const onEvent = useMemo(() => (onCellClick ? {
    click: (p) => {
      if (!Array.isArray(p?.data)) return;
      const [i, j, , sid] = p.data;
      const axis = option?.xAxis?.data || [];
      onCellClick(axis[i], axis[j], sid ? [sid] : []);
    },
  } : undefined), [onCellClick, option]);

  return html`<${EChart}
    option=${option}
    style=${'width:100%;height:' + h + 'px'}
    aria-label="tool cooccurrence heatmap"
    onEvent=${onEvent}
  />`;
}
