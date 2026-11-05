// ─── OverviewNow — the first screen ────────────────────────────
// Three questions, answered with figures: what is running now, what did it
// cost, is anything broken (and the exact command that fixes it).
import { html } from 'htm/preact';
import { useMemo, useState } from 'preact/hooks';
import * as api from '../api.js';
import { fmtDurSec, fmtK, fmtPct, fmtSz } from '../utils.js';
import { usePolledResource } from '../hooks/usePolledResource.js';
import { deriveIssues, runningSessions, runningSummary, sessionMemMb, storageSummary, storageText } from '../utils/health.js';
import { CostValue, NO_COST_REASON, billingUnitLabel, fmtUsd, summarizeUsage } from '../utils/cost.js';
import { loadHiddenContextSummary } from './HiddenContextSlot.js';
import { COST_ESTIMATE_NOTE, scopeIsCloudOnly, toolLabel } from '../utils/tools.js';
import { baseName } from '../utils/paths.js';
import PanelState, { panelStatus } from './ui/PanelState.js';
import { ToolIcon } from './ui/index.js';

const SESSION_ROWS = 8;

function RunningPanel({ snap, enabledTools, onOpenSession, onShowAll }) {
  const rows = useMemo(() => runningSessions(snap, enabledTools), [snap, enabledTools]);
  return html`<section class="now-panel now-panel--running" aria-labelledby="now-running">
    <header class="now-panel__head">
      <h2 id="now-running">Running now</h2>
      ${!scopeIsCloudOnly(snap, enabledTools) && html`<span class="now-panel__figure">${rows.length}</span>
      <span class="now-panel__sub">${runningSummary(rows)}</span>`}
    </header>
    ${rows.length === 0
      ? html`<${PanelState} status="empty" label="running sessions"
          emptyTitle=${scopeIsCloudOnly(snap, enabledTools) ? 'Not available from this machine' : enabledTools ? 'No sessions for the selected tools' : 'No live sessions'}
          emptyHint=${scopeIsCloudOnly(snap, enabledTools) ? 'The selected tool runs in the vendor\'s cloud and has no local sessions.'
            : enabledTools ? 'Widen the tool filter, or start a session in one of the selected tools.'
            : 'Start an AI coding tool. Sessions appear here within one sample interval.'}/>`
      : html`<div class="now-table-wrap"><table class="now-table">
          <thead><tr>
            <th scope="col">Tool</th><th scope="col">Project</th>
            <th scope="col" class="num">Age</th><th scope="col" class="num">CPU</th>
            <th scope="col" class="num">RAM</th><th scope="col" class="num">Tokens</th>
          </tr></thead>
          <tbody>
            ${rows.slice(0, SESSION_ROWS).map(s => {
              const tokens = (s.exact_input_tokens || 0) + (s.exact_output_tokens || 0);
              const mem = sessionMemMb(s);
              return html`<tr key=${s.session_id}>
                <td class="now-table__tool"><${ToolIcon} tool=${s.tool} size="1em"/> ${s.label || toolLabel(s.tool, snap)}</td>
                <td class="now-table__project">
                  <button type="button" class="now-link" title=${(s.project || 'no project') + '\n' + s.session_id}
                    onClick=${() => onOpenSession(s.session_id, s.tool)}>${baseName(s.project) || 'no project'}</button>
                </td>
                <td class="num">${fmtDurSec(s.duration_s || 0)}</td>
                <td class="num">${fmtPct(s.cpu_percent || 0)}</td>
                <td class="num">${mem ? fmtSz(mem * 1048576) : '-'}</td>
                <td class="num" title=${tokens ? tokens.toLocaleString() + ' exact tokens' : 'No exact token data for this session'}>${tokens ? fmtK(tokens) : '-'}</td>
              </tr>`;
            })}
          </tbody>
        </table></div>
        ${rows.length > SESSION_ROWS && html`<button type="button" class="now-link now-panel__more" onClick=${onShowAll}>
          Show all ${rows.length} sessions</button>`}`}
  </section>`;
}

function CostPanel({ onOpenBudget, cloudScope, enabledTools, snap }) {
  const res = usePolledResource(() => api.getUsage({ since: Date.now() / 1000 - 86400 }), [], { pollMs: 60000 });
  const summary = useMemo(() => summarizeUsage(res.data, enabledTools), [res.data, enabledTools]);
  const status = panelStatus({ ...res, data: res.data ? summary.rows : null, isEmpty: rows => !rows.length });
  if (cloudScope) {
    return html`<section class="now-panel" aria-labelledby="now-cost">
      <header class="now-panel__head"><h2 id="now-cost">Cost, last 24 h</h2></header>
      <${PanelState} status="empty" emptyTitle="Not available from this machine"
        emptyHint="The selected tool is billed and metered in the vendor's cloud, so no local token counts exist to estimate from."/>
    </section>`;
  }
  const hasFigure = summary.billed.length > 0 || summary.listUsd !== null;
  return html`<section class="now-panel" aria-labelledby="now-cost">
    <header class="now-panel__head">
      <h2 id="now-cost">Cost, last 24 h</h2>
      ${res.data && summary.billed.map(b => html`<span key=${b.unit} class="now-panel__figure">${b.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}<small class="now-panel__unit"> ${billingUnitLabel(b.unit)}</small></span>`)}
      ${res.data && summary.listUsd !== null && html`<span class="now-panel__figure" title=${COST_ESTIMATE_NOTE}>${fmtUsd(summary.listUsd)}<small class="now-panel__unit"> est.</small></span>`}
      ${res.data && !hasFigure && summary.rows.length > 0 && html`<span class="now-panel__figure" title=${summary.unpricedReason || NO_COST_REASON}>n/a</span>`}
    </header>
    <${PanelState} status=${status} error=${res.error} updatedAt=${res.updatedAt} onRetry=${res.reload}
      label="cost" emptyTitle=${enabledTools ? 'No recorded usage for the selected tools in the last 24 h' : 'No recorded usage in the last 24 h'}
      emptyHint="Usage comes from per-request telemetry. Turn on the OTel receiver if a tool is running but nothing shows."
      emptyFix="aictl otel enable">
      <div class="now-panel__sub">${fmtK(summary.tokens)} tokens, ${summary.sessions} sessions${summary.listUsd !== null ? '. Dollar figures are list-price estimates, not billed amounts.' : ''}${summary.unpriced ? ` ${summary.unpriced} tool${summary.unpriced === 1 ? ' has' : 's have'} no known price.` : ''}</div>
      <table class="now-table now-table--plain">
        <tbody>${summary.rows.slice(0, 5).map(r => html`<tr key=${r.tool}>
          <td class="now-table__project" title=${(r.tokens_source || []).length ? 'Tokens from ' + r.tokens_source.join(', ') + (r.tokens_quality ? ' (' + r.tokens_quality + ')' : '') : (r.tokens_reason || '')}><${ToolIcon} tool=${r.tool} size="1em"/> ${toolLabel(r.tool, snap)}</td>
          <td class="num">${fmtK(r.total_tokens || 0)}</td>
          <td class="num"><${CostValue} row=${r}/></td>
        </tr>`)}</tbody>
      </table>
      <button type="button" class="now-link now-panel__more" onClick=${onOpenBudget}>Open budget</button>
    </${PanelState}>
  </section>`;
}

function CopyFix({ command }) {
  const [copied, setCopied] = useState(false);
  if (!command) return null;
  const isCommand = command.startsWith('aictl ');
  const copy = () => {
    try {
      navigator.clipboard?.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked: the command stays selectable */ }
  };
  return html`<div class="now-issue__fix">
    <code>${command}</code>
    ${isCommand && html`<button type="button" class="now-link" onClick=${copy}
      aria-label=${'Copy command: ' + command}>${copied ? 'Copied' : 'Copy'}</button>`}
  </div>`;
}

/** Capture mode and disk use against budget, always as concrete figures. */
export function StorageRow({ selfStatus }) {
  const s = storageSummary(selfStatus);
  if (!s) return null;
  return html`<div class=${'now-storage' + (s.degraded ? ' is-degraded' : '')}>
    <span>Capture <strong>${s.mode || 'not reported'}</strong></span>
    <span>Disk <strong>${storageText(s)}</strong></span>
    ${s.pct != null && html`<div class="now-storage__bar" role="meter" aria-label="Disk use against budget"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(s.pct, 100)}>
      <span class=${s.pct >= 90 ? 'is-high' : ''} style=${{ width: Math.min(s.pct, 100) + '%' }}></span>
    </div>`}
  </div>`;
}

export function ModelPinsRows({ models }) {
  const pinned = Object.values(models && !models.error ? models : {}).filter(row => row.value || row.conflicts?.length);
  if (!pinned.length) return null;
  // Tools that share one settings file show as one row.
  const groups = new Map();
  for (const row of pinned) {
    const key = JSON.stringify([row.value, row.source, row.line, row.conflicts]);
    if (groups.has(key)) groups.get(key).labels.push(toolLabel(row.tool));
    else groups.set(key, { ...row, labels: [toolLabel(row.tool)] });
  }
  return html`<div class="now-models" data-testid="now-models">
    ${[...groups.values()].map(row => html`<div key=${row.tool} class="now-models__row">
      <span>${row.labels.join(', ')} model <strong>${row.value || 'no pin'}</strong></span>
      ${row.source && html`<span class="now-models__source" title=${row.why_in_effect}>
        ${row.line ? `${row.source}:${row.line}` : row.source}${row.in_project ? '' : ' (not in this project, still in effect)'}
      </span>`}
      ${(row.conflicts || []).map(c => html`<span key=${c.requested_at} class="now-models__conflict" data-testid="now-model-conflict">
        Conflict: ${c.requested.join(', ')} requested at ${c.requested_at}, ${c.pinned} is pinned
      </span>`)}
    </div>`)}
  </div>`;
}

function HealthPanel({ snap, enabledTools, connected, otelActive, alerts, selfStatus, onOpenTab }) {
  const models = usePolledResource(() => api.getEffectiveModels(), [], { pollMs: 60000 });
  const hooks = usePolledResource(() => api.getHooksStatus(), [], { pollMs: 60000 });
  const quality = usePolledResource(() => api.getDataQuality(), [], { pollMs: 60000 });
  const hidden = usePolledResource(() => loadHiddenContextSummary(enabledTools), [enabledTools], { pollMs: 60000 });
  const snapAgeS = snap?.timestamp ? Date.now() / 1000 - snap.timestamp : null;
  const storage = useMemo(() => storageSummary(selfStatus), [selfStatus]);
  // undefined until the first check settles, so nothing flashes "not checked".
  const hiddenContext = hidden.updatedAt ? hidden.data : undefined;
  const runningTools = useMemo(() => new Set((snap?.sessions || []).map(row => row.tool)), [snap]);
  const issues = useMemo(() => deriveIssues({
    connected, snapAgeS, hooks: hooks.data, quality: quality.data, otelActive, alerts, storage, runningTools, hiddenContext, enabledTools,
  }), [connected, snapAgeS, hooks.data, quality.data, otelActive, alerts, storage, runningTools, hiddenContext, enabledTools]);
  const errors = issues.filter(i => i.level === 'error').length;
  const warns = issues.filter(i => i.level === 'warn').length;
  const loading = hooks.loading && !hooks.data && quality.loading && !quality.data;
  const figure = loading ? '...' : errors + warns;
  return html`<section class="now-panel now-panel--health" aria-labelledby="now-health">
    <header class="now-panel__head">
      <h2 id="now-health">Needs attention</h2>
      <span class=${'now-panel__figure' + (errors ? ' is-error' : warns ? ' is-warn' : ' is-ok')}>${figure}</span>
      <span class="now-panel__sub">${errors} error${errors === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'}</span>
    </header>
    <${StorageRow} selfStatus=${selfStatus}/>
    <${ModelPinsRows} models=${models.data}/>
    ${hooks.error && !hooks.data && html`<${PanelState} status="error" error=${hooks.error}
      onRetry=${hooks.reload} label="hook status"/>`}
    ${issues.length === 0 && !loading && !hooks.error
      ? html`<${PanelState} status="empty" emptyTitle="All collectors and hooks are healthy"
          emptyHint="Hook delivery, data quality and the live stream all report OK."/>`
      : html`<ul class="now-issues">
          ${issues.slice(0, 7).map(i => html`<li key=${i.id} class=${'now-issue now-issue--' + i.level}>
            <span class="now-issue__level">${i.level === 'error' ? 'Error' : i.level === 'warn' ? 'Warn' : 'Info'}</span>
            <div class="now-issue__body">
              <div class="now-issue__title">${i.tab
                ? html`<button type="button" class="now-link" onClick=${() => onOpenTab(i.tab)}>${i.title}</button>`
                : i.title}</div>
              <div class="now-issue__detail">${i.detail}</div>
              <${CopyFix} command=${i.fix}/>
            </div>
          </li>`)}
          ${issues.length > 7 && html`<li class="now-panel__sub">${issues.length - 7} more in Monitoring health below.</li>`}
        </ul>`}
  </section>`;
}

export default function OverviewNow({
  snap, enabledTools, connected, otelActive, alerts, selfStatus, onOpenSession, onOpenTab,
}) {
  return html`<div class="now-grid">
    <${RunningPanel} snap=${snap} enabledTools=${enabledTools}
      onOpenSession=${onOpenSession} onShowAll=${() => onOpenTab('live')}/>
    <${CostPanel} onOpenBudget=${() => onOpenTab('budget')} cloudScope=${scopeIsCloudOnly(snap, enabledTools)} enabledTools=${enabledTools} snap=${snap}/>
    <${HealthPanel} snap=${snap} enabledTools=${enabledTools} connected=${connected} otelActive=${otelActive}
      alerts=${alerts} selfStatus=${selfStatus} onOpenTab=${onOpenTab}/>
  </div>`;
}
