// ─── Agent drawer: Integrations — MCP servers, model calls, limits ─
// MCP usage per server, the model-call log with a summary by model, VS Code
// language-model tokens by extension, the rate-limit report and, for Copilot,
// the files of its session folder.
import { html } from 'htm/preact';
import { useMemo, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import TextView from '../../ui/TextView.js';
import { FixedPanel, Pending, useDetail } from '../Drawer.js';
import { NA, NO_MODEL, baseName, fmtBytes, fmtMs, fmtN, stamp } from '../format.js';
import { Actions, Stats } from '../Panel.js';
import Table from '../Table.js';
import { Failed, SessionNote, clock, isActive, sessionIdOf } from './common.js';

export const API_CALL_LIMIT = 200;

function McpPanel({ sid, tick }) {
  const { data, error } = useDetail(() => api.getSessionMcpUsage(sid), 'mcp:' + sid, tick);
  const servers = Array.isArray(data?.servers) ? data.servers : [];
  const configured = Array.isArray(data?.configured_servers) ? data.configured_servers : [];
  const def = useMemo(() => {
    const servers = Array.isArray(data?.servers) ? data.servers : [];
    const configured = Array.isArray(data?.configured_servers) ? data.configured_servers : [];
    const used = new Set(servers.map(s => s.server_name));
    return {
      cols: [{ k: 'n', l: 'Server' }, { k: 'c', l: 'Calls', n: true, w: '56px' }, { k: 'e', l: 'Errors', n: true, w: '56px' }, { k: 'd', l: 'Total time', n: true, w: '76px' }, { k: 'l', l: 'Last call', w: '100px' }],
      rows: [
        ...servers.map(s => ({ id: s.server_name, sort: { n: s.server_name, c: s.call_count, e: s.err_count, d: s.total_duration_ms, l: s.last_ts }, cells: { n: { v: s.server_name, cls: 'm' }, c: { v: fmtN(s.call_count) }, e: { v: fmtN(s.err_count || 0), cls: s.err_count ? 'crit' : 'dim' }, d: { v: fmtMs(s.total_duration_ms) }, l: { v: stamp(s.last_ts, true), cls: 'dim' } } })),
        ...configured.filter(n => !used.has(n)).map(n => ({ id: 'u:' + n, sort: { n, c: 0, e: 0 }, cells: { n: { v: n, sub: 'configured, not used', cls: 'm dim' }, c: { v: 0, cls: 'dim' }, e: { v: NA, cls: 'dim' }, d: { v: NA, cls: 'dim' }, l: { v: NA, cls: 'dim' } } })),
      ],
      sort: { k: 'c', dir: 'desc' }, none: 'No MCP server is configured or called in this session.',
    };
  }, [data]);
  const sub = data ? servers.length + ' called, ' + fmtN(data.total_calls || 0) + ' calls' + (configured.length ? ', ' + configured.length + ' configured' : '') : '';
  return html`<${FixedPanel} id="agmcp" title="MCP servers" sub=${sub}>
    ${data ? html`<${Table} def=${def} label="MCP servers"/>` : error ? html`<${Failed} error=${error} what="MCP usage"/>` : html`<${Pending}/>`}
  </${FixedPanel}>`;
}

function ApiCallsPanel({ sid, tick, models }) {
  const { data, error } = useDetail(() => api.getApiCalls(0, API_CALL_LIMIT, sid), 'apicalls:' + sid, tick);
  const calls = Array.isArray(data?.calls) ? data.calls : [];
  const s = data?.summary || {};
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '70px' }, { k: 'm', l: 'Model' }, { k: 'st', l: 'Status', w: '64px' }, { k: 'lat', l: 'Took', n: true, w: '64px' }, { k: 'tok', l: 'Tokens in / out', n: true, w: '100px' }, { k: 'fr', l: 'Finish', w: '80px' }, { k: 'et', l: 'Error type', w: '100px' }],
    rows: (Array.isArray(data?.calls) ? data.calls : []).map((c, i) => {
      const bad = c.status === 'error';
      return {
        id: i, sort: { at: c.ts, m: c.model, lat: c.duration_ms, tok: (c.input_tokens || 0) + (c.output_tokens || 0) },
        cells: { at: { v: clock(c.ts), cls: 'dim' }, m: { v: c.model || NA, title: c.error || c.model || '' }, st: { v: bad ? 'Error' + (c.http_status ? ' ' + c.http_status : '') : 'OK' + (c.http_status ? ' ' + c.http_status : ''), cls: bad ? 'crit' : 'dim' }, lat: { v: bad ? NA : fmtMs(c.duration_ms) }, tok: { v: bad ? NA : fmtN(c.input_tokens || 0) + ' / ' + fmtN(c.output_tokens || 0) }, fr: { v: c.finish_reason || NA, cls: c.finish_reason === 'length' ? 'crit' : 'dim' }, et: { v: c.error_type || NA, cls: c.error_type ? 'crit' : 'dim', title: c.error || '' } },
      };
    }),
    sort: { k: 'at', dir: 'desc' }, limit: 60, none: 'No model call events for this session. Run aictl otel enable to send them.', primary: 'm',
  }), [data]);
  const stored = (Array.isArray(models) ? models : []).filter(x => x.msgs);
  const fromStore = !!data && !calls.length && !s.total_calls && stored.length > 0;
  const byModel = useMemo(() => ({
    cols: [{ k: 'm', l: 'Model' }, { k: 'c', l: 'Calls', n: true, w: '60px' }],
    rows: fromStore
      ? stored.map(x => ({ id: x.model || 'none', sort: { m: x.model || NO_MODEL, c: x.msgs }, cells: { m: { v: x.model || NO_MODEL, title: x.model || 'The record carries no model id', cls: x.model ? '' : 'dim' }, c: { v: fmtN(x.msgs) } } }))
      : Object.entries(data?.summary?.by_model || {}).map(([m, n]) => ({ id: m, sort: { m, c: n }, cells: { m: { v: m || NO_MODEL }, c: { v: fmtN(n) } } })),
    sort: { k: 'c', dir: 'desc' }, none: 'No successful call.',
  }), [data, models]);
  const storeCalls = stored.reduce((n, x) => n + (x.msgs || 0), 0);
  const stats = fromStore
    ? [{ label: 'Calls', value: fmtN(storeCalls) }, ...(stored.some(x => x.errors != null) ? [{ label: 'Errors', value: fmtN(stored.reduce((n, x) => n + (x.errors || 0), 0)) }] : []), ...(stored.some(x => x.avg_latency_ms != null) ? [{ label: 'Average time', value: fmtMs(Math.max(...stored.map(x => x.avg_latency_ms || 0))) }] : []), ...(stored.some(x => x.p95_latency_ms != null) ? [{ label: '95th percentile', value: fmtMs(Math.max(...stored.map(x => x.p95_latency_ms || 0))) }] : [])]
    : [{ label: 'Calls', value: fmtN(s.total_calls) }, { label: 'Errors', value: fmtN(s.total_errors) }, { label: 'Average time', value: s.total_calls ? fmtMs(s.avg_latency_ms) : NA }, { label: '95th percentile', value: s.total_calls ? fmtMs(s.p95_latency_ms) : NA }];
  return html`<${FixedPanel} id="agapi" title="Model calls" sub=${data ? (fromStore ? fmtN(storeCalls) + ' calls' : calls.length >= API_CALL_LIMIT ? 'Newest ' + API_CALL_LIMIT : calls.length + ' calls') : ''}>
    ${data ? html`<${Stats} stats=${stats}/>
      ${fromStore || Object.keys(s.by_model || {}).length ? html`<${Table} def=${byModel} label="Calls by model"/>` : null}
      ${fromStore ? html`<div class="bd-note">aictl read these calls from the session files. Per-call timing comes only with telemetry: run aictl otel enable to send it.</div>` : html`<${Table} def=${def} label="Model calls"/>`}` : error ? html`<${Failed} error=${error} what="model calls"/>` : html`<${Pending}/>`}
  </${FixedPanel}>`;
}

const gaugeColor = p => (p == null ? 'var(--ink3)' : p > 80 ? 'var(--crit)' : p > 60 ? 'var(--warn)' : 'var(--good)');

function RateLimit({ rl }) {
  return html`<${FixedPanel} id="agrl" title="Rate limits" sub=${'Reported ' + stamp(rl.ts, true)}>
    <div class="bd-ag-gauges">${rl.windows.map(w => html`<div key=${w.window} class="bd-ag-gauge">
      <div><span>${w.window + ' window'}</span><b>${w.used_pct == null ? NA : Math.round(w.used_pct) + '% used'}</b></div>
      <span class="bd-ag-track" role="meter" aria-label=${w.window + ' window used'} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${w.used_pct ?? 0}><i style=${{ width: Math.min(100, w.used_pct || 0) + '%', background: gaugeColor(w.used_pct) }}></i></span>
      ${w.resets_at ? html`<em>${'Resets ' + w.resets_at}</em>` : null}
    </div>`)}</div>
  </${FixedPanel}>`;
}

function LmUsage({ rows }) {
  const total = rows.reduce((n, r) => n + (r.total_tokens || 0), 0) || 1;
  const def = {
    cols: [{ k: 'e', l: 'Extension' }, { k: 't', l: 'Tokens', n: true, w: '130px' }, { k: 'io', l: 'In / out', n: true, w: '100px' }, { k: 'c', l: 'Calls', n: true, w: '54px' }, { k: 'm', l: 'Models', w: '140px' }],
    rows: rows.map(r => ({ id: r.extension, sort: { e: r.extension, t: r.total_tokens, c: r.calls }, cells: { e: { v: r.extension, cls: 'm' }, t: { v: fmtN(r.total_tokens), barOn: true, bar: ((r.total_tokens || 0) / total) * 100, barC: 'var(--s1)' }, io: { v: fmtN(r.input_tokens) + ' / ' + fmtN(r.output_tokens) }, c: { v: fmtN(r.calls) }, m: { v: (r.models || []).join(', ') || NA, cls: 'dim' } } })),
    sort: { k: 't', dir: 'desc' },
  };
  return html`<${FixedPanel} id="aglm" title="VS Code language models by extension" sub=${fmtN(total) + ' tokens'}><${Table} def=${def} label="VS Code language models by extension"/></${FixedPanel}>`;
}

function ArtifactBody({ sid, item }) {
  const { data, error } = useDetail(() => api.fetchJson('/api/copilot-sessions/' + encodeURIComponent(sid) + '/artifact?path=' + encodeURIComponent(item.path)), 'artifact:' + sid + ':' + item.path);
  if (error) return html`<${Failed} error=${error} what="this file"/>`;
  if (!data) return html`<${Pending}/>`;
  if (data.binary) return html`<div class="bd-empty">${'Binary file, ' + fmtBytes(data.size) + '. Not shown.'}</div>`;
  const text = data.content || '';
  return html`<div class="bd-ag-art">${data.truncated ? html`<div class="bd-note">${'The first part of ' + fmtBytes(data.size) + ' is shown.'}</div>` : null}
    <${TextView} text=${text} path=${item.name} source=${html`<pre class="bd-ag-pre">${text}</pre>`}/></div>`;
}

function Artifacts({ sid, act }) {
  const { data, error } = useDetail(() => api.fetchJson('/api/copilot-sessions/' + encodeURIComponent(sid) + '/artifacts'), 'artifacts:' + sid);
  const [open, setOpen] = useState(null);
  const items = Array.isArray(data?.artifacts) ? data.artifacts : [];
  const def = useMemo(() => ({
    cols: [{ k: 'n', l: 'File' }, { k: 't', l: 'Kind', w: '110px' }, { k: 's', l: 'Size', n: true, w: '70px' }, { k: 'm', l: 'Changed', w: '110px' }],
    rows: (Array.isArray(data?.artifacts) ? data.artifacts : []).map(x => {
      const can = x.readable && x.path;
      return {
        id: x.name, go: can ? () => setOpen(o => (o === x.name ? null : x.name)) : null, sort: { n: x.name, s: x.size, m: x.modified_at },
        cells: { n: { v: x.name, cls: 'm', title: x.path || x.name, sub: x.checkpoint !== undefined ? 'checkpoint ' + x.checkpoint : '' }, t: { v: x.type || NA, cls: 'dim' }, s: { v: fmtBytes(x.size) }, m: { v: stamp(x.modified_at, true), cls: 'dim' } },
      };
    }),
    sort: { k: 'm', dir: 'desc' }, none: 'No files in this session folder.', primary: 'n',
  }), [data]);
  const notFound = error && (error.status === 404 || /\b404\b/.test(error.message || ''));
  const item = items.find(x => x.name === open);
  return html`<${FixedPanel} id="agart" title="Copilot session files" sub=${data?.folder || ''}>
    ${data ? html`<${Table} def=${def} label="Copilot session files"/>`
      : notFound ? html`<div class="bd-empty">No Copilot session folder found for this session.</div>`
        : error ? html`<${Failed} error=${error} what="the session files"/>` : html`<${Pending}/>`}
    ${item ? html`<div class="bd-ag-artbox" aria-label=${'Content of ' + item.name}>
      <div class="bd-ag-insph"><b title=${item.path}>${baseName(item.name)}</b>
        <${Actions} actions=${[{ label: 'Open as a file', go: () => act.openDrawer({ type: 'file', path: item.path, line: 1 }) }, { label: 'Close', go: () => setOpen(null) }]}/></div>
      <${ArtifactBody} sid=${sid} item=${item}/>
    </div>` : null}
  </${FixedPanel}>`;
}

export default function IntegrationsTab({ a, st, ctx, act, data }) {
  const sid = sessionIdOf(a);
  const tick = isActive(st) ? ctx.refreshKey : 0;
  const res = data.resources || {};
  const copilot = String(a.tool || '').startsWith('copilot');
  return html`<${SessionNote} a=${a}/>
    <${McpPanel} sid=${sid} tick=${tick}/>
    <${ApiCallsPanel} sid=${sid} tick=${tick} models=${data.by_model}/>
    ${res.rate_limit ? html`<${RateLimit} rl=${res.rate_limit}/>` : null}
    ${res.lm_by_extension?.length ? html`<${LmUsage} rows=${res.lm_by_extension}/>` : null}
    ${copilot ? html`<${Artifacts} sid=${sid} act=${act}/>` : null}
    ${!res.rate_limit && !res.lm_by_extension?.length ? html`<div class="bd-note bd-ag-top">No rate-limit report and no VS Code language-model record for this session.</div>` : null}`;
}
