import { useState, useEffect, useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, fmtAgo, fmtPct, fmtSz, esc, COLORS, ICONS } from '../utils.js';
import * as api from '../api.js';

const STATUS_COLORS = { active: 'var(--green)', degraded: 'var(--orange)', disabled: 'var(--fg2)', unknown: 'var(--fg2)' };

function fmtDuration(s) {
  if (!s || s < 0) return '\u2014';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CollectorHealth() {
  const { snap: s } = useContext(SnapContext);
  const [otel, setOtel] = useState(null);
  const [selfStatus, setSelfStatus] = useState(null);

  // Poll OTel + self status every 15s
  useEffect(() => {
    let running = true;
    const poll = () => {
      api.getOtelStatus()
        .then(d => { if (running) setOtel(d); }).catch(() => {});
      api.getSelfStatus()
        .then(d => { if (running) setSelfStatus(d); }).catch(() => {});
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { running = false; clearInterval(id); };
  }, []);

  const toolHealth = useMemo(() => {
    if (!s) return [];
    const telemetry = s.tool_telemetry || [];
    return s.tools
      .filter(t => t.tool !== 'aictl' && t.tool !== 'any')
      .map(t => {
        const telem = telemetry.find(r => r.tool === t.tool);
        const live = t.live || {};
        const lastSeen = live.last_seen_at || 0;
        const agoSec = lastSeen > 0 ? Math.floor(Date.now() / 1000 - lastSeen) : -1;
        const stale = agoSec > 3600 || agoSec < 0;
        return {
          tool: t.tool, label: t.label,
          // Source info
          source: telem?.source || (live.session_count ? 'live-monitor' : 'discovery'),
          confidence: telem?.confidence || (live.token_estimate?.confidence || 0),
          // Tokens
          inputTokens: telem?.input_tokens || 0,
          outputTokens: telem?.output_tokens || 0,
          cost: telem?.cost_usd || 0,
          sessions: telem?.total_sessions || live.session_count || 0,
          // Health
          errors: telem?.errors?.length || 0,
          lastError: telem?.errors?.[0] || null,
          // Freshness
          lastSeen: agoSec, stale,
          // Coverage
          fileCount: t.files.length,
          procCount: t.processes.length,
          hasLive: !!t.live,
          hasOtel: !!(live.sources || []).includes?.('otel'),
        };
      })
      .sort((a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens));
  }, [s]);

  const collectors = useMemo(() => {
    if (!s?.live_monitor?.diagnostics) return [];
    return Object.entries(s.live_monitor.diagnostics).map(([name, d]) => ({
      name, status: d.status || 'unknown', mode: d.mode || '', detail: d.detail || '',
    }));
  }, [s]);

  if (!s) return null;

  const totalTools = toolHealth.length;
  const withData = toolHealth.filter(t => t.inputTokens + t.outputTokens > 0).length;
  const withLive = toolHealth.filter(t => t.hasLive).length;
  const staleCount = toolHealth.filter(t => t.stale && t.hasLive).length;
  const totalErrors = toolHealth.reduce((a, t) => a + t.errors, 0);

  return html`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{ marginBottom: 'var(--sp-4)' }}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--bg)">${withData}/${totalTools} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--bg)">${withLive} live</span>
      ${staleCount > 0 ? html`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--bg)">${staleCount} stale</span>` : null}
      ${totalErrors > 0 ? html`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--bg)">${totalErrors} errors</span>` : null}
      ${otel?.active ? html`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--bg)">OTel active</span>`
        : html`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${selfStatus ? html`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value">${fmtPct(selfStatus.cpu_percent || 0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value">${fmtSz(selfStatus.memory_rss_bytes || 0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${fmtSz(selfStatus.db?.file_size_bytes || 0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${fmtDuration(selfStatus.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${selfStatus.threads || '\u2014'}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${fmtK((selfStatus.db?.metrics_count || 0) + (selfStatus.db?.tool_metrics_count || 0) +
              (selfStatus.db?.events_count || 0) + (selfStatus.db?.samples_count || 0))}</div>
        </div>
      </div>
      ${selfStatus.sink ? html`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${fmtK(selfStatus.sink.total_emitted || 0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${fmtK(selfStatus.sink.total_flushed || 0)}</div>
        </div>
        <div class="metric-chip" style="${(selfStatus.sink.total_dropped || 0) > 0 ? 'background:rgba(248,113,113,0.15);border:1px solid var(--red)' : ''}">
          <div class="metric-chip-label" style="${(selfStatus.sink.total_dropped || 0) > 0 ? 'color:var(--red);font-weight:600' : 'color:var(--fg2)'}">Dropped</div>
          <div class="metric-chip-value" style="${(selfStatus.sink.total_dropped || 0) > 0 ? 'color:var(--red)' : ''}">${fmtK(selfStatus.sink.total_dropped || 0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${fmtK(selfStatus.sink.metrics_tracked || 0)}</div>
        </div>
      </div>
      ${selfStatus.sink.is_flooding ? html`<div style="margin-top:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:rgba(248,113,113,0.15);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:var(--fs-xs);font-weight:600">
        DATA LOSS: Flood protection active \u2014 dropping samples (>${selfStatus.sink.total_dropped} lost)
      </div>` : null}` : null}
      <div class="text-xs text-muted" style="margin-top:var(--sp-1)">
        PID ${selfStatus.pid} \u00b7 These metrics are about the aictl monitoring service itself, not the AI tools it monitors.
      </div>
    </div>` : null}

    <!-- OTel receiver stats -->
    ${otel ? html`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">OTel Receiver</div>
      <div class="flex-row gap-md flex-wrap">
        <span>Metrics: <strong>${otel.metrics_received || 0}</strong></span>
        <span>Events: <strong>${otel.events_received || 0}</strong></span>
        <span>API calls: <strong>${otel.api_calls_total || 0}</strong></span>
        ${otel.api_errors_total > 0 ? html`<span class="text-red">Errors: <strong>${otel.api_errors_total}</strong></span>` : null}
        ${otel.errors > 0 ? html`<span class="text-orange">Parse errors: <strong>${otel.errors}</strong></span>` : null}
        ${otel.last_receive_at > 0 ? html`<span class="text-muted">Last: ${fmtAgo(otel.last_receive_at)}</span>` : null}
      </div>
    </div>` : null}

    <!-- Per-tool health table -->
    <div class="mb-md">
      <div class="es-section-title">Per-Tool Status</div>
      <div style="overflow-x:auto">
        <table role="table" class="text-sm" style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2)">Tool</th>
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2)">Source</th>
            <th style="text-align:center;padding:var(--sp-1) var(--sp-2)">Conf</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Input tok</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Output tok</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Sessions</th>
            <th style="text-align:center;padding:var(--sp-1) var(--sp-2)">Errors</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Last seen</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Files</th>
          </tr></thead>
          <tbody>${toolHealth.map(t => html`<tr key=${t.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${t.stale && !t.fileCount ? 0.4 : 1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <span style="color:${COLORS[t.tool] || 'var(--fg2)'}">${ICONS[t.tool] || '\u{1F539}'}</span>
              ${esc(t.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${t.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${t.confidence >= 0.9 ? 'var(--green)' : t.confidence >= 0.7 ? 'var(--yellow)' : 'var(--orange)'}">
                ${t.confidence > 0 ? fmtPct(t.confidence * 100) : '\u2014'}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${t.inputTokens ? fmtK(t.inputTokens) : '\u2014'}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${t.outputTokens ? fmtK(t.outputTokens) : '\u2014'}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${t.sessions || '\u2014'}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${t.errors > 0
                ? html`<span class="text-red" title=${t.lastError?.message || ''}>${t.errors}</span>`
                : html`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${t.lastSeen >= 0
                ? html`<span style="color:${t.stale ? 'var(--orange)' : 'var(--fg2)'}">${fmtAgo(Date.now()/1000 - t.lastSeen)}</span>`
                : html`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${t.fileCount}</td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>

    <!-- Collector pipeline status -->
    ${collectors.length > 0 ? html`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${collectors.map(c => html`<div key=${c.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${STATUS_COLORS[c.status] || 'var(--fg2)'}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${c.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${c.status}</span>
          </div>
          ${c.detail ? html`<div class="text-xs text-muted" style="margin-top:2px">${esc(c.detail)}</div>` : null}
        </div>`)}
      </div>
    </div>` : null}
  </div>`;
}
