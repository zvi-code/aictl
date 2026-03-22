import { html } from 'htm/preact';
import { COLORS, ICONS, fmtSz } from '../utils.js';

function timeTicks(earliest, latest, maxTicks) {
  const span = latest - earliest;
  const candidates = [300,600,900,1800,3600,7200,10800,21600,43200,86400];
  let interval = candidates[candidates.length - 1];
  for (const c of candidates) {
    if (span / c <= maxTicks) { interval = c; break; }
  }
  const first = Math.ceil(earliest / interval) * interval;
  const ticks = [];
  for (let t = first; t <= latest; t += interval) {
    const d = new Date(t * 1000);
    let label;
    if (interval >= 86400) label = d.toLocaleDateString([], {month:'short', day:'numeric'});
    else if (span > 86400) label = d.toLocaleString([], {hourCycle:'h23', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    else label = d.toLocaleTimeString([], {hourCycle:'h23', hour:'2-digit', minute:'2-digit'});
    ticks.push({ts: t, label});
  }
  return ticks;
}

function fmtDur(sec) {
  if (sec >= 3600) return (sec / 3600).toFixed(1) + 'h';
  if (sec >= 60) return Math.round(sec / 60) + 'm';
  return Math.round(sec) + 's';
}

function buildTip(s, color, icon, now) {
  const dur = s.duration_s || ((s.ended_at || now) - s.started_at);
  const startStr = new Date(s.started_at * 1000)
    .toLocaleTimeString([], {hourCycle:'h23', hour:'2-digit', minute:'2-digit'});
  const endStr = s.ended_at
    ? new Date(s.ended_at * 1000).toLocaleTimeString([], {hourCycle:'h23', hour:'2-digit', minute:'2-digit'})
    : 'now';
  const parts = [fmtDur(dur)];
  if (s.conversations) parts.push(s.conversations + ' conv');
  if (s.subagents) parts.push(s.subagents + ' agents');
  if (s.source_files) parts.push(s.source_files + ' src files');
  else if (s.unique_files) parts.push(s.unique_files + ' files');
  if (s.bytes_written > 1024) parts.push(fmtSz(s.bytes_written));
  const isLive = !s.ended_at;

  return html`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${'color:' + color}>${icon}</span>
      <strong>${s.tool}</strong>
      ${isLive ? html`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>` : ''}
    </div>
    <div class="stl-tip-time">${startStr} – ${endStr}</div>
    <div class="stl-tip-stats">${parts.join(' · ')}</div>
    ${s.project ? html`<div class="stl-tip-proj">${s.project.replace(/\\/g,'/').split('/').pop()}</div>` : ''}
  </div>`;
}

/**
 * SessionTimeline — Gantt chart with two sections:
 *   Top: completed sessions (have start+end) as bars
 *   Bottom: live/no-end sessions as marker dots at start time
 */
export default function SessionTimeline({sessions, rangeSeconds, onSelect}) {
  const now = Date.now() / 1000;
  const span = rangeSeconds || 86400;
  const earliest = now - span;

  const all = (sessions || []).filter(s =>
    (s.ended_at || now) >= earliest && s.started_at <= now
  );

  const ended = all.filter(s => s.ended_at).sort((a, b) => a.started_at - b.started_at);
  const live = all.filter(s => !s.ended_at).sort((a, b) => a.started_at - b.started_at);

  // Lane assignment for ended sessions
  const lanes = [];
  const laneOf = [];
  for (const s of ended) {
    const start = Math.max(s.started_at, earliest);
    const end = s.ended_at;
    let placed = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (start >= lanes[i] + 2) { lanes[i] = end; placed = i; break; }
    }
    if (placed < 0) { placed = lanes.length; lanes.push(end); }
    laneOf.push(placed);
  }

  const rowH = 10;
  const gap = 2;
  const axisH = 18;
  const liveRowH = 14;

  const endedLanes = Math.max(lanes.length, 0);
  const endedH = endedLanes > 0 ? endedLanes * (rowH + gap) + gap : 0;
  const liveH = live.length > 0 ? liveRowH + gap * 2 : 0;
  const dividerH = (endedH > 0 && liveH > 0) ? 1 : 0;
  const chartH = endedH + dividerH + liveH;
  const totalH = Math.max(chartH, 20) + axisH;

  const ticks = timeTicks(earliest, now, 8);
  const pct = (ts) => ((Math.max(ts, earliest) - earliest) / span) * 100;

  return html`<div class="stl">
    <div class="stl-chart" style=${'height:' + totalH + 'px'}>
      ${ticks.map(t => html`<div key=${t.ts} class="stl-grid"
        style=${'left:' + pct(t.ts).toFixed(2) + '%;bottom:' + axisH + 'px'} />`)}

      <!-- ended session bars -->
      ${ended.map((s, i) => {
        const start = Math.max(s.started_at, earliest);
        const left = pct(start);
        const width = Math.max(0.15, pct(s.ended_at) - left);
        const top = laneOf[i] * (rowH + gap) + gap;
        const color = COLORS[s.tool] || 'var(--fg2)';
        const icon = ICONS[s.tool] || '\u{1F539}';
        return html`<div key=${s.session_id} class="stl-bar"
          style=${'left:' + left.toFixed(2) + '%;width:' + width.toFixed(2) + '%;top:' + top + 'px;height:' + rowH + 'px;background:' + color}
          onClick=${() => onSelect && onSelect(s)}>
          ${buildTip(s, color, icon, now)}
        </div>`;
      })}

      <!-- divider between ended and live -->
      ${dividerH ? html`<div class="stl-divider" style=${'top:' + endedH + 'px'} />` : ''}

      <!-- live session markers -->
      ${live.map(s => {
        const left = pct(s.started_at);
        const top = endedH + dividerH + gap;
        const color = COLORS[s.tool] || 'var(--fg2)';
        const icon = ICONS[s.tool] || '\u{1F539}';
        return html`<div key=${s.session_id} class="stl-marker"
          style=${'left:' + left.toFixed(2) + '%;top:' + top + 'px;background:' + color}
          onClick=${() => onSelect && onSelect(s)}>
          ${buildTip(s, color, icon, now)}
        </div>`;
      })}

      <div class="stl-axis" style=${'top:' + (totalH - axisH) + 'px'}>
        ${ticks.map(t => html`<span key=${t.ts} class="stl-tick"
          style=${'left:' + pct(t.ts).toFixed(2) + '%'}>${t.label}</span>`)}
      </div>
    </div>
  </div>`;
}
