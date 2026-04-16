// GanttChart — ECharts-powered replacement for the hand-rolled SVG gantt in
// SessionTimeline.js.
//
// Props:
//   sessions:     [{ session_id, tool, started_at, ended_at?, model?, tokens?,
//                    conversations?, subagents?, source_files?, bytes_written?,
//                    project? }, ...]
//   rangeSeconds: visible window (default 24h)
//   now:          clock (default Date.now()/1000)
//   onSessionClick: (session) => void
//   height:       px (default auto from lanes)
//   markLines:    [{ ts, label, color? }] — e.g. model-switch events.
//
// Live sessions (no ended_at) are pinned to a dedicated "live" lane at the
// top and treated as running to `now`.

import { useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import EChart, { buildPalette } from './EChart.js';
import { COLORS } from '../../utils.js';

const ROW_H = 12;
const GAP = 3;
const LIVE_LANE = 'live';

function assignLanes(sessions, now) {
  // First-fit lane packing by start time.  Returns [{ s, lane }...], laneCount.
  const ended = sessions.filter(s => s.ended_at).sort((a,b) => a.started_at - b.started_at);
  const lanes = []; // ending time per lane
  const out = [];
  for (const s of ended) {
    const end = s.ended_at;
    let placed = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (s.started_at >= lanes[i] + 2) { lanes[i] = end; placed = i; break; }
    }
    if (placed < 0) { placed = lanes.length; lanes.push(end); }
    out.push({ s, lane: placed });
  }
  const live = sessions.filter(s => !s.ended_at).map(s => ({
    s: { ...s, ended_at: now },
    lane: LIVE_LANE,
  }));
  return { rows: [...live, ...out], laneCount: lanes.length };
}

function fmtDur(sec) {
  if (!sec || sec <= 0) return '0s';
  if (sec >= 3600) return (sec/3600).toFixed(1) + 'h';
  if (sec >= 60) return Math.round(sec/60) + 'm';
  return Math.round(sec) + 's';
}

function sessionColor(tool, palette) {
  if (tool && COLORS[tool]) {
    // COLORS[] values are often CSS var refs like "var(--green)" — ECharts
    // canvas renderer cannot parse those, so resolve at render time.
    const v = COLORS[tool];
    if (v.startsWith('var(')) {
      const name = v.slice(4, -1).trim();
      const resolved = typeof document !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
        : '';
      if (resolved) return resolved;
    } else {
      return v;
    }
  }
  // Deterministic fallback hash into palette.
  let h = 0;
  const k = String(tool || '?');
  for (let i = 0; i < k.length; i++) h = (h*31 + k.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length];
}

export default function GanttChart({ sessions, rangeSeconds, now, onSessionClick, height, markLines }) {
  const nowTs = now ?? (Date.now() / 1000);
  const span = rangeSeconds || 86400;
  const windowStart = nowTs - span;

  const filtered = (sessions || []).filter(s =>
    (s.ended_at || nowTs) >= windowStart && s.started_at <= nowTs,
  );

  const { option, laneCount } = useMemo(() => {
    const palette = buildPalette();
    const { rows, laneCount: endedLanes } = assignLanes(filtered, nowTs);

    // Categories for yAxis — "live" on top, then lane 0..N top-down.
    const categories = [LIVE_LANE, ...Array.from({ length: endedLanes }, (_, i) => `L${i}`)];

    const items = rows.map(({ s, lane }) => {
      const start = Math.max(s.started_at, windowStart) * 1000;
      const end = s.ended_at * 1000;
      const laneKey = lane === LIVE_LANE ? LIVE_LANE : `L${lane}`;
      return {
        name: s.tool || '?',
        value: [laneKey, start, end, s],
        itemStyle: { color: sessionColor(s.tool, palette), opacity: lane === LIVE_LANE ? 0.95 : 0.85 },
      };
    });

    const renderItem = (params, apiFn) => {
      const laneIdx = apiFn.value(0);
      const start = apiFn.coord([apiFn.value(1), laneIdx]);
      const end = apiFn.coord([apiFn.value(2), laneIdx]);
      const bandH = apiFn.size([0, 1])[1] * 0.6;
      const x = start[0];
      const y = start[1] - bandH / 2;
      const w = Math.max(1, end[0] - start[0]);
      const rectShape = { x, y, width: w, height: bandH };
      const coordSys = params.coordSys;
      const clipped = echartsClip(rectShape, coordSys);
      return clipped && {
        type: 'rect',
        transition: ['shape'],
        shape: clipped,
        style: apiFn.style(),
      };
    };

    const markLineData = (markLines || [])
      .filter(m => m && m.ts >= windowStart && m.ts <= nowTs + 5)
      .map(m => ({
        xAxis: m.ts * 1000,
        label: { show: true, formatter: m.label || '', color: m.color || undefined },
        lineStyle: { color: m.color || undefined, type: 'dashed' },
      }));
    // Always add a "now" marker.
    markLineData.push({
      xAxis: nowTs * 1000,
      label: { show: true, formatter: 'now' },
      lineStyle: { type: 'solid', opacity: 0.5 },
    });

    const opt = {
      grid: { left: 56, right: 16, top: 8, bottom: 48, containLabel: false },
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const s = p.value?.[3];
          if (!s) return '';
          const dur = fmtDur((s.ended_at || nowTs) - s.started_at);
          const startStr = new Date(s.started_at * 1000).toLocaleTimeString([], { hour12: false });
          const endStr = s.ended_at
            ? new Date(s.ended_at * 1000).toLocaleTimeString([], { hour12: false })
            : 'now';
          const lines = [
            `<b>${escapeHtml(s.tool || '?')}</b>  <span style="opacity:.7">${dur}</span>`,
            `${startStr} – ${endStr}`,
          ];
          if (s.model) lines.push(`model: ${escapeHtml(s.model)}`);
          if (s.tokens) lines.push(`tokens: ${s.tokens.toLocaleString()}`);
          if (s.conversations) lines.push(`conv: ${s.conversations}`);
          if (s.source_files || s.unique_files) lines.push(`files: ${s.source_files ?? s.unique_files}`);
          if (s.project) {
            const short = String(s.project).replace(/\\/g,'/').split('/').pop();
            lines.push(`<span style="opacity:.7">${escapeHtml(short)}</span>`);
          }
          return lines.join('<br/>');
        },
      },
      xAxis: {
        type: 'time',
        min: windowStart * 1000,
        max: nowTs * 1000,
        axisLabel: { hideOverlap: true, fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: categories,
        inverse: true,
        axisTick: { show: false },
        axisLabel: {
          fontSize: 10,
          formatter: (v) => v === LIVE_LANE ? 'live' : '',
        },
        splitLine: { show: false },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseWheel: false, moveOnMouseMove: true },
        { type: 'slider', xAxisIndex: 0, height: 18, bottom: 8 },
      ],
      series: [{
        type: 'custom',
        renderItem,
        encode: { x: [1, 2], y: 0 },
        data: items,
        markLine: markLineData.length
          ? { silent: true, symbol: 'none', data: markLineData, animation: false }
          : undefined,
      }],
    };
    return { option: opt, laneCount: categories.length };
  }, [filtered, nowTs, windowStart, markLines]);

  const px = height || Math.max(120, laneCount * (ROW_H + GAP) + 80);
  const onEvent = useMemo(() => (onSessionClick ? {
    click: (p) => {
      const s = p?.value?.[3];
      if (s) onSessionClick(s);
    },
  } : undefined), [onSessionClick]);

  return html`<${EChart}
    option=${option}
    style=${'width:100%;height:' + px + 'px'}
    aria-label="session gantt"
    onEvent=${onEvent}
  />`;
}

// --- helpers -----------------------------------------------------------

function echartsClip(rect, coordSys) {
  // Mirrors the clipRectByRect logic ECharts uses for custom series to
  // avoid rendering bars outside the grid region.
  const x = Math.max(rect.x, coordSys.x);
  const y = Math.max(rect.y, coordSys.y);
  const x2 = Math.min(rect.x + rect.width, coordSys.x + coordSys.width);
  const y2 = Math.min(rect.y + rect.height, coordSys.y + coordSys.height);
  if (x2 <= x || y2 <= y) return null;
  return { x, y, width: x2 - x, height: y2 - y };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
