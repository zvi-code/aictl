import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { boardNodePath, withNodeScope } from '../../api.js';
import { fmtCpu, fmtMem, fmtN, fmtUsd, NA, stamp } from './format.js';
import { useNodeView } from './NodeScope.js';

const text = v => (typeof v === 'string' && v) || Number.isFinite(v) ? String(v) : NA;
const time = v => Number.isFinite(v) ? stamp(v, true) : 'Unknown';
const NODE = ['node_id', 'Reporting node'];
const SAMPLE = [NODE, ['captured_at', 'Captured at', time], ['status', 'Report status']];
const SETTINGS = [...SAMPLE, ['node_source', 'Node ID source'], ['capture', 'Capture'], ['ingestion', 'Ingestion'],
  ['retention_days', 'Retention (days)'], ['content_retention_days', 'Content retention (days)']];

export function ReportTable({ title, columns, rows, links, source, note, error, refresh }) {
  return html`<section class="bd-healthcard bd-reporttable"><h2>${title}</h2>
    <div class="bd-healthtable-wrap" tabindex="0" role="region" aria-label=${title}>
      <table aria-label=${title}><thead><tr>${columns.map(([key, label]) => html`<th key=${key} scope="col">${label}</th>`)}</tr></thead>
      <tbody>${rows.map((r, i) => html`<tr key=${r.id || i}>${columns.map(([key, , fmt = text]) => {
        const val = links?.[key] ? links[key](r) : key === 'node_id' && r[key] === 'legacy' ? 'Untagged history' : fmt(r[key]);
        return key === 'node_id' ? html`<th key=${key} scope="row">${val}</th>` : html`<td key=${key}>${val}</td>`;
      })}</tr>`)}</tbody></table>
    </div>
    ${!rows.length && html`<p>No records were reported for this scope.</p>`}
    ${note || source ? html`<p class="bd-note" role=${error ? 'alert' : undefined}>${note}${source ? html` <a class="bd-link" href=${source}>Source data</a>` : null}
      ${refresh ? html` <button type="button" class="bd-link" onClick=${refresh}>Refresh report</button>` : null}</p>` : null}
  </section>`;
}
const count = k => (Number.isFinite(k) ? k.toLocaleString('en-US') : NA);
const ACTIVITY = {
  top: ['Activity by node', ['agents', 'Agents'], ['messages', 'Messages'], ['tokens', 'Tokens'], ['calls', 'Tool calls']],
  agents: ['Agents by node', ['agents', 'Agents and subagents'], ['sessions', 'Root sessions'], ['messages', 'Messages']],
  usage: ['Usage by node', ['tokens', 'Tokens'], ['cache_read', 'Cache read tokens'], ['replies', 'Model calls'], ['cost_usd', 'Cost (USD)', fmtUsd]],
  prompts: ['Prompts and skills by node', ['prompts', 'Recorded prompts'], ['skill_uses', 'Skill uses']],
  tools: ['Tool activity by node', ['calls', 'Tool calls'], ['tool_errors', 'Failed tool calls'], ['api_errors', 'API errors']],
  changes: ['Changes and tests by node', ['files', 'Changed files'], ['edits', 'Edits'], ['tests', 'Test runs'], ['failed_tests', 'Failed tests']],
  sources: ['Sources with activity by node', ['tools', 'Tools', v => v?.join(', ') || NA], ['replies', 'Model calls'], ['calls', 'Tool calls'], ['prompts', 'Recorded prompts']],
};
export const reportPath = (ctx, path, query = '') => path + '?' + withNodeScope(query, ctx.nodeScope, ctx.nodeId);
const toolQuery = ctx => ctx.tools ? 'tool=' + encodeURIComponent(ctx.tools.join(',') || '-') : '';

export function NodeBreakdown({ section, ctx }) {
  const spec = ACTIVITY[section];
  if (spec) {
    const [title, ...fields] = spec;
    const k = ctx.data.kpis || {};
    const totals = ctx.data.changes?.totals || {};
    const local = { node_id: ctx.localNode || 'This node', agents: ctx.data.scope?.shown_agents, sessions: ctx.data.scope?.shown_sessions,
      messages: k.messages, tokens: k.tokens, cache_read: ctx.data.by_model?.reduce((s, r) => s + (r.cache_read || 0), 0),
      replies: ctx.data.series?.messages?.assistant?.reduce((s, v) => s + (v || 0), 0), cost_usd: k.cost_usd,
      calls: k.tool_calls, tool_errors: k.failures, api_errors: ctx.data.series?.failures?.api?.reduce((s, v) => s + (v || 0), 0),
      prompts: ctx.data.prompts_total, files: totals.files, edits: totals.edits };
    const rows = ctx.remote ? ctx.data.by_node || [] : ctx.data.generated_at ? [local] : [];
    return html`<${ReportTable} title=${title} columns=${[NODE, ...fields.map(([k, l, fmt = count]) => [k, l, fmt])]}
      rows=${rows} source=${reportPath(ctx, '/api/board', ctx.query)} note="Selected time and filters. Zero means no matching records; it does not establish that the node collected that metric."/>`;
  }
  if (section === 'resources') {
    const m = ctx.data.machine;
    const local = m?.cpu_per_core?.filter(Number.isFinite) || [];
    const hosts = ctx.remote ? m?.hosts || [] : m?.generated_at ? [{ node_id: ctx.localNode || 'This node', ts: m.generated_at,
      status: 'Live', host_cpu_percent: local.length ? local.reduce((s, v) => s + v, 0) / local.length : null }] : [];
    return html`<${ReportTable} title="Last host sample by node" columns=${[NODE, ['ts', 'Captured at', time], ['status', 'Report status'],
      ['host_cpu_percent', 'Host CPU', fmtCpu], ['host_memory_used_mb', 'Used RAM', fmtMem], ['host_memory_total_mb', 'Total RAM', fmtMem]]}
      rows=${hosts} source=${reportPath(ctx, '/api/board/machine', toolQuery(ctx))} note=${m?.unavailable || 'Whole-host measurements. The activity range and tool filter do not apply.'}/>`;
  }
  if (section === 'context') {
    const c = ctx.data.contextData;
    const nodes = c?.nodes || (!ctx.remote && c?.loaded ? [{ ...c, node_id: ctx.localNode || 'This node' }] : []);
    const rows = nodes.map(n => ({ node_id: n.node_id, files: n.files.reduce((a, x) => a + x.count, 0),
      memory: n.memory.entries.length, telemetry: n.telemetry.length, calls: n.daily.rows.reduce((a, x) => a + x.requests, 0) }));
    return html`<${ReportTable} title="Context inventory by node" rows=${rows} columns=${[NODE, ['files', 'Indexed files', count],
      ['memory', 'Memory and instruction files', count], ['telemetry', 'Tool reports', count], ['calls', 'Model calls · 7 days', count]]}
      source=${reportPath(ctx, '/api/board/context', toolQuery(ctx))} note=${c?.unavailable || 'A context budget describes one tool on one host, not a sum of host budgets.'}/>`;
  }
  return null;
}

export function ReportedValues({ ctx }) {
  const request = { view: 'settings', scope: ctx.nodeScope || 'local', nodeId: ctx.nodeId, enabled: !!ctx.nodeScope };
  const [revision, setRevision] = useState(0);
  const { data, error } = useNodeView(request, revision);
  return html`<${ReportTable} title="Reported daemon settings" columns=${SETTINGS} rows=${data?.rows || []} source=${boardNodePath(request)} error=${error} refresh=${() => setRevision(n => n + 1)}
    note=${error ? reportError(error) : !data ? 'Reading reported settings…' : 'Last daemon settings per node, not the configuration a running agent loaded.'}/>`;
}

function reportError(error) {
  if (error.status === 409) return 'This history is unavailable. Fleet reports require a shared Kusto store with queryable history.';
  if (error.status === 404) return 'The requested report was not found on this node or the server does not support node views.';
  if (error.status === 400) return 'The server rejected this request. Check the node ID, session ID and time range.';
  return error.status ? `The server could not read this report (HTTP ${error.status}).` : error.message;
}

// On a rolling upgrade the old daemon has only session-start totals. Keep those
// usable without passing them off as activity KPIs or showing unscoped history.
export function PreviousDaemonOverview({ scope, nodeId, since, until }) {
  const { data, error } = useNodeView({ view: 'overview', scope, nodeId, since, until });
  if (error) return html`<p role="alert">${reportError(error)}</p>`;
  if (!data) return html`<p role="status">Loading reported sessions…</p>`;
  return html`<${ReportTable} title="Reported session totals" rows=${data.rows}
    columns=${[NODE, ['sessions', 'Sessions', fmtN], ['requests', 'Requests', fmtN],
      ['input_tokens', 'Input tokens', fmtN], ['output_tokens', 'Output tokens', fmtN]]}/>
    <p class="bd-muted">Lifetime totals for sessions that started in this time range. Detailed activity requires the updated daemon.</p>`;
}
