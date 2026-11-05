// HiddenContextPanel — what can reach each tool's model, and what conceals itself there.
// Self-contained: it fetches /api/context-audit and needs no props.
import { html } from 'htm/preact';
import { useState, useContext, useMemo } from 'preact/hooks';
import { SnapContext } from '../context.js';
import { scopeAudit } from '../utils/auditScope.js';
import { isFiltered } from '../utils/toolScope.js';
import ToolScopeEmpty from './ui/ToolScopeEmpty.js';
import { fetchJson } from '../api.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';

export const STALE_AFTER_S = 600;

const SEVERITY_COLOR = {
  high: 'var(--red)',
  medium: 'var(--orange)',
  low: 'var(--yellow)',
  info: 'var(--fg2)',
};

const cell = { padding: '2px 8px', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const mono = { fontFamily: 'var(--font-mono, monospace)', wordBreak: 'break-all' };

function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtAge(seconds) {
  if (seconds < 90) return `${Math.round(seconds)} s ago`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
  return `${Math.round(seconds / 3600)} h ago`;
}

function SeverityBadge({ severity, count }) {
  return html`<span
    data-severity=${severity}
    title=${`${severity} severity`}
    style=${{ color: SEVERITY_COLOR[severity], fontWeight: 600, marginRight: '10px' }}
  >${count === undefined ? severity : `${count} ${severity}`}</span>`;
}

function FindingRow({ finding }) {
  const where = finding.path + (finding.line ? `:${finding.line}` : '');
  return html`<details data-rule=${finding.rule} style=${{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
    <summary style=${{ cursor: 'pointer' }} title=${finding.why}>
      <${SeverityBadge} severity=${finding.severity} />
      <span style=${mono}>${finding.rule}</span>
      ${finding.count > 1 ? html` <span style=${{ color: 'var(--fg2)' }}>x${finding.count}</span>` : null}
      <div style=${{ ...mono, color: 'var(--fg2)' }}>${where}</div>
      ${finding.snippet ? html`<div style=${mono}>${finding.snippet}</div>` : null}
    </summary>
    <div style=${{ padding: '4px 0 4px 12px' }}>
      <div><b>Why:</b> ${finding.why}</div>
      ${finding.action ? html`<div><b>What to do:</b> ${finding.action}</div>` : null}
      ${finding.session_id ? html`<div><b>Session:</b> <span style=${mono}>${finding.session_id}</span></div>` : null}
      ${finding.tools && finding.tools.length ? html`<div><b>Tools:</b> ${finding.tools.join(', ')}</div>` : null}
    </div>
  </details>`;
}

function SourcesTable({ sources }) {
  return html`<table style=${{ width: '100%', borderCollapse: 'collapse' }}>
    <thead><tr>
      ${['Tool', 'Scope', 'Loading', 'Size', 'Tokens', 'Git', 'Path'].map(h => html`<th key=${h} style=${cell}>${h}</th>`)}
    </tr></thead>
    <tbody>
      ${sources.map(s => html`<tr key=${`${s.tool}|${s.path}`} title=${s.note || s.origin}>
        <td style=${cell}>${s.tool}</td>
        <td style=${cell}>${s.scope}</td>
        <td style=${cell}>${s.readable ? s.loading : `${s.loading} (no file shows this)`}</td>
        <td style=${cell}>${fmtBytes(s.bytes)}</td>
        <td style=${cell}>${s.est_tokens ? `~${s.est_tokens}` : '0'}</td>
        <td style=${cell}>${s.git_state || 'n/a'}</td>
        <td style=${{ ...cell, ...mono }}>
          ${s.path}${s.symlink_target ? ` -> ${s.symlink_target}` : ''}
          ${s.note ? html`<div style=${{ color: 'var(--fg2)' }}>${s.note}</div>` : null}
          ${s.why_in_effect && !s.in_project ? html`<div data-testid="outside-project" style=${{ color: 'var(--orange)' }}>${s.why_in_effect}</div>` : null}
        </td>
      </tr>`)}
    </tbody>
  </table>`;
}

function DriftSummary({ drift }) {
  if (!drift) return null;
  if (drift.baseline_created) {
    return html`<div data-testid="drift">Baseline created now. Later changes will show here.</div>`;
  }
  const rows = [...drift.new.map(r => ['new', r]), ...drift.changed.map(r => ['changed', r]), ...drift.removed.map(r => ['removed', r])];
  return html`<details data-testid="drift">
    <summary style=${{ cursor: 'pointer' }}>
      Drift: ${drift.new.length} new, ${drift.changed.length} changed, ${drift.removed.length} removed,
      ${' '}${drift.agent_writes.length} agent writes
    </summary>
    ${rows.map(([kind, r]) => html`<div key=${`${kind}|${r.path}`} style=${mono} title=${r.tool}>${kind}: ${r.path}</div>`)}
    ${drift.agent_writes.map(w => html`<div key=${`w|${w.path}|${w.session_id}`} style=${mono}>
      agent write: ${w.path} (session ${w.session_id}, via ${w.via})
    </div>`)}
  </details>`;
}

function UnattributedRow({ row }) {
  return html`<div data-testid="unattributed" title=${row.method}>
    ${row.tool}: about ${row.residual_tokens} of ${row.first_request_tokens_median} first-request tokens are not
    explained, after ~${row.inventory_always_tokens} inventory, ~${row.dynamic_tokens} dynamic and a
    ${' '}${row.builtin_allowance_tokens} built-in allowance. Estimate from ${row.sessions_sampled} sessions.
  </div>`;
}

function fmtWhere(path, line) {
  return line ? `${path}:${line}` : path;
}

function EffectiveModelRow({ eff }) {
  const conflicts = eff.conflicts || [];
  const limited = eff.limited || [];
  return html`<div data-testid="effective-model" data-tool=${eff.tool} data-conflict=${conflicts.length ? 'yes' : 'no'}
    style=${{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
    ${conflicts.map(c => html`<div key=${fmtWhere(c.request.path, c.request.line)} data-testid="effective-conflict"
      style=${{ color: 'var(--red)', fontWeight: 600 }}>
      Conflict: ${c.request.values.join(', ')} requested at <span style=${mono}>${fmtWhere(c.request.path, c.request.line)}</span>,
      ${' '}but ${c.pin.value} is pinned at <span style=${mono}>${fmtWhere(c.pin.path, c.pin.line)}</span>
    </div>`)}
    <div><b>${eff.tool}:</b> <span style=${mono}>${eff.value || 'no pin'}</span>
      ${eff.value && !eff.verified ? html` <span style=${{ color: 'var(--orange)' }}>(order unverified)</span>` : null}
    </div>
    ${eff.value ? html`<div style=${{ ...mono, color: 'var(--fg2)' }}>${fmtWhere(eff.source, eff.line)} (${eff.scope})</div>` : null}
    <div style=${{ color: eff.in_project ? 'var(--fg2)' : 'var(--orange)' }}>${eff.why_in_effect}</div>
    ${(eff.overrides || []).map(o => html`<div key=${fmtWhere(o.path, o.line)} style=${mono}>
      overrides ${o.value} at ${fmtWhere(o.path, o.line)} (${o.scope})
    </div>`)}
    ${limited.length ? html`<details>
      <summary style=${{ cursor: 'pointer' }}>${limited.length} pins limited to one agent, prompt or setting</summary>
      ${limited.map(p => html`<div key=${`${p.path}|${p.setting}|${p.line}`} style=${mono}
        title=${p.why_in_effect}>${p.applies}: ${p.value} at ${fmtWhere(p.path, p.line)} (${p.in_project ? 'in this project' : 'not in this project'})</div>`)}
    </details>` : null}
  </div>`;
}

function EffectiveModels({ models }) {
  const rows = Object.values(models || {});
  if (!rows.length) return null;
  const ordered = [...rows].sort((a, b) => (b.conflicts || []).length - (a.conflicts || []).length);
  return html`<section data-testid="effective-models" style=${{ marginBottom: '8px' }}>
    <h4 style=${{ margin: '0 0 4px' }}>Effective model</h4>
    ${ordered.map(eff => html`<${EffectiveModelRow} key=${eff.tool} eff=${eff} />`)}
  </section>`;
}

export function HiddenContextPanel() {
  const [generation, setGeneration] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const ctx = useContext(SnapContext);
  const enabledTools = ctx?.enabledTools ?? null;
  const { data: audit, loading, error } = useAsyncResource(
    // The server keeps the audit for a few minutes; Rescan asks for a new one.
    () => fetchJson(generation ? '/api/context-audit?refresh=1' : '/api/context-audit'), [generation]);
  // The audit comes from the server for all tools; the filter scopes it here.
  const data = useMemo(() => scopeAudit(audit, enabledTools), [audit, enabledTools]);
  const refresh = () => setGeneration(g => g + 1);
  const refreshButton = html`<button type="button" onClick=${refresh}>Rescan</button>`;

  if (loading && !data) {
    return html`<div data-state="loading" style=${{ color: 'var(--fg2)' }}>Scanning context sources...</div>`;
  }
  if (error) {
    return html`<div data-state="error" style=${{ color: 'var(--red)' }}>
      Context audit failed: ${String(error.message || error)} ${refreshButton}
    </div>`;
  }
  const sources = (data && data.sources) || [];
  const findings = (data && data.findings) || [];
  const hadRows = !!audit && ((audit.sources || []).length || (audit.findings || []).length);
  if (!sources.length && !findings.length && isFiltered(enabledTools) && hadRows) {
    return html`<${ToolScopeEmpty} enabledTools=${enabledTools} snap=${ctx?.snap} what="hidden context"/>`;
  }
  if (!sources.length && !findings.length) {
    return html`<div data-state="empty" style=${{ color: 'var(--fg2)' }}>
      No context sources found for ${(data && data.project) || 'this project'}. ${refreshButton}
    </div>`;
  }
  const age = Date.now() / 1000 - (data.scanned_at || 0);
  const stale = age > STALE_AFTER_S;
  const counts = data.counts || {};
  const visible = showInfo ? findings : findings.filter(f => f.severity !== 'info');
  const alwaysTokens = sources.filter(s => s.loading === 'always').reduce((sum, s) => sum + (s.est_tokens || 0), 0);
  const tools = Object.entries(data.sources_per_tool || {});

  return html`<div data-state=${stale ? 'stale' : 'ready'}>
    <${EffectiveModels} models=${data.effective_models} />
    <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'baseline' }}>
      ${['high', 'medium', 'low', 'info'].map(s => html`<${SeverityBadge} key=${s} severity=${s} count=${counts[s] || 0} />`)}
      <span title=${tools.map(([t, n]) => `${t}: ${n}`).join('\n')}>${sources.length} sources</span>
      <span title="Estimated at four characters per token">~${alwaysTokens} always-loaded tokens</span>
      <span style=${{ color: stale ? 'var(--orange)' : 'var(--fg2)' }} data-testid="scan-age">
        ${stale ? 'Stale: ' : ''}scanned ${fmtAge(age)} in ${data.duration_ms} ms
      </span>
      ${refreshButton}
    </div>
    <${DriftSummary} drift=${data.drift} />
    ${(data.unattributed || []).map(row => html`<${UnattributedRow} key=${row.tool} row=${row} />`)}
    <div style=${{ marginTop: '8px' }}>
      ${visible.length ? visible.map(f => html`<${FindingRow} key=${`${f.rule}|${f.path}|${f.line}|${f.session_id}`} finding=${f} />`)
        : html`<div data-testid="no-findings" style=${{ color: 'var(--fg2)' }}>No findings above info level.</div>`}
      ${counts.info ? html`<button type="button" onClick=${() => setShowInfo(v => !v)}>
        ${showInfo ? 'Hide' : 'Show'} ${counts.info} info findings
      </button>` : null}
    </div>
    <details style=${{ marginTop: '8px' }}>
      <summary style=${{ cursor: 'pointer' }}>All ${sources.length} sources</summary>
      <${SourcesTable} sources=${sources} />
    </details>
  </div>`;
}

export default HiddenContextPanel;
