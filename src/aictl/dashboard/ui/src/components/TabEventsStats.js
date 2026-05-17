import { useState, useMemo, useEffect, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, ICONS, VENDOR_LABELS, EVENT_COLORS, fmtK, fmtTok, fmtSz, fmtRate, fmtPct, esc, liveTokenTotal } from '../utils.js';
import ChartCard from './ChartCard.js';
import * as api from '../api.js';

export default function TabEventsStats() {
  const {snap: s, globalRange} = useContext(SnapContext);
  const [selectedTool, setTool] = useState(null);
  const [events, setEvents] = useState([]);
  const [toolHistory, setToolHistory] = useState(null);

  const tools = useMemo(() => {
    if (!s) return [];
    return s.tools.filter(t => !t.meta && (t.files.length || t.processes.length || t.live))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [s]);

  useEffect(() => {
    if (!selectedTool && tools.length) setTool(tools[0].tool);
  }, [tools, selectedTool]);

  // Fetch events when tool or global range changes
  useEffect(() => {
    if (!selectedTool || !globalRange) return;
    api.getEvents({ tool: selectedTool, since: globalRange.since, limit: 500, until: globalRange.until })
      .then(setEvents).catch(() => setEvents([]));
  }, [selectedTool, globalRange]);

  // Fetch tool history when tool or global range changes
  useEffect(() => {
    if (!selectedTool || !globalRange) return;
    api.getHistory({ since: globalRange.since, tool: selectedTool, until: globalRange.until })
      .then(h => setToolHistory(h?.by_tool?.[selectedTool] || null))
      .catch(() => setToolHistory(null));
  }, [selectedTool, globalRange]);

  if (!s) return html`<p class="loading-state">Loading...</p>`;

  const tool = tools.find(t => t.tool === selectedTool);
  const telem = s.tool_telemetry?.find(t => t.tool === selectedTool);
  const live = tool?.live;
  const c = COLORS[selectedTool] || 'var(--fg2)';

  const fmtOpts = {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'};
  const rangeLabel = globalRange.until != null
    ? new Date(globalRange.since * 1000).toLocaleString(undefined, fmtOpts)
      + ' \u2013 '
      + new Date(globalRange.until * 1000).toLocaleString(undefined, fmtOpts)
    : '';

  return html`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${tools.map(t => html`<button key=${t.tool}
        class=${selectedTool === t.tool ? 'es-tool-btn active' : 'es-tool-btn'}
        onClick=${() => setTool(t.tool)}>
        <span style="color:${COLORS[t.tool] || 'var(--fg2)'}">${ICONS[t.tool] || '\u{1F539}'}</span>
        ${t.label}
        ${t.live ? html`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>` : ''}
      </button>`)}
    </div>
    <div>
      ${selectedTool && html`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${c}">${ICONS[selectedTool] || '\u{1F539}'}</span>
          ${tool?.label || selectedTool}
          ${tool?.vendor ? html`<span class="badge">${VENDOR_LABELS[tool.vendor] || tool.vendor}</span>` : ''}
          ${telem?.model ? html`<span class="badge mono">${telem.model}</span>` : ''}
        </h3>

        ${toolHistory && toolHistory.ts?.length >= 2 ? html`<div class="es-section">
          <div class="es-section-title">Time Series${rangeLabel ? html` <span class="badge">${rangeLabel}</span>` : ''}</div>
          <div class="es-charts">
            <${ChartCard} label="CPU %" value=${tool?.live?.cpu_percent != null ? fmtPct(tool.live.cpu_percent || 0) : '-'}
              data=${[toolHistory.ts, toolHistory.cpu]} chartColor=${c} smooth />
            <${ChartCard} label="Memory (MB)" value=${tool?.live?.mem_mb != null ? fmtSz((tool.live.mem_mb || 0) * 1048576) : '-'}
              data=${[toolHistory.ts, toolHistory.mem_mb]} chartColor="var(--green)" smooth />
            <${ChartCard} label="Context (tok)" value=${fmtTok(toolHistory.tokens[toolHistory.tokens.length - 1] || 0)}
              data=${[toolHistory.ts, toolHistory.tokens]} chartColor="var(--accent)" />
            <${ChartCard} label="Network (B/s)"
              value=${fmtRate(live ? (live.outbound_rate_bps||0)+(live.inbound_rate_bps||0) : (toolHistory.traffic[toolHistory.traffic.length-1]||0))}
              valColor=${live ? 'var(--orange)' : undefined}
              data=${[toolHistory.ts, toolHistory.traffic]} chartColor="var(--orange)" />
          </div>
        </div>` : html`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="loading-state">No data for this range.</p>
        </div>`}

        ${telem ? html`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${telem.source}</span>
            <span class="badge">${fmtPct(telem.confidence * 100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${fmtTok(telem.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${fmtTok(telem.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${fmtTok(telem.cache_read_tokens || 0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${fmtTok(telem.cache_creation_tokens || 0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${fmtK(telem.total_sessions || 0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${fmtK(telem.total_messages || 0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${telem.cost_usd ? '$' + telem.cost_usd.toFixed(2) : '-'}</div></div>
          </div>
          ${Object.keys(telem.by_model || {}).length > 0 && html`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(telem.by_model).map(([model, u]) => html`<div key=${model}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${model}</span>
              <span>in: ${fmtTok(u.input || u.input_tokens || 0)} tok \u00B7 out: ${fmtTok(u.output || u.output_tokens || 0)} tok${u.cache_read_tokens ? ' \u00B7 cR:' + fmtTok(u.cache_read_tokens) : ''}${u.cache_creation_tokens ? ' \u00B7 cW:' + fmtTok(u.cache_creation_tokens) : ''}${u.cost_usd ? ' \u00B7 $' + u.cost_usd.toFixed(2) : ''}</span>
            </div>`)}
          </div>`}
        </div>` : ''}

        ${live ? html`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${live.session_count || 0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${live.pid_count || 0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${fmtPct(live.cpu_percent || 0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${fmtSz((live.mem_mb || 0) * 1048576)}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${fmtRate(live.outbound_rate_bps || 0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${fmtRate(live.inbound_rate_bps || 0)}</div></div>
          </div>
        </div>` : ''}

        <div class="es-section">
          <div class="es-section-title">Events (${events.length})</div>
          ${events.length ? html`<div class="es-feed">
            ${events.map((e, i) => {
              const color = EVENT_COLORS[e.kind] || 'var(--fg2)';
              const time = new Date(e.ts * 1000).toLocaleString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'});
              const detail = e.detail ? Object.entries(e.detail).map(([k, v]) => k + '=' + v).join(', ') : '';
              return html`<div key=${e.ts + '-' + e.tool + '-' + i} class="es-event">
                <span class="es-event-time">${time}</span>
                <span class="es-event-kind" style="color:${color}">${e.kind}</span>
                <span class="es-event-detail" title=${detail}>${detail || '-'}</span>
              </div>`;
            })}
          </div>` : html`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`;
}
