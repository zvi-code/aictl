// ─── Agent drawer: what reached aictl for a session, and what only OTel says ──
// Sources: how many records came from the session file, OpenTelemetry and hooks,
// so the reader sees whether OTel reached this session. The OTel panels show the
// values that only Copilot's spans carry: AI credits, time to first chunk and
// server time per model call, the context use against the limit, and what each
// turn had in context. Tokens stay the session file's: a span never adds to them.
import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import { FixedPanel } from '../Drawer.js';
import { Stats } from '../Panel.js';
import { NA, fmtCredits, fmtMs, fmtN, fmtShare, stamp } from '../format.js';
import Table from '../Table.js';

const OTEL_TIP = 'From OpenTelemetry: the spans the tool sent to aictl';
const HASH_CHARS = 8;

/** "Session file 12 records · OTel 4 spans, last 14:20 · Hooks 0". */
export function sourcesLine(s, now = Date.now()) {
  if (!s) return '';
  const otel = s.otel_spans || s.otel_span_events
    ? 'OTel ' + fmtN(s.otel_spans) + (s.otel_spans === 1 ? ' span' : ' spans') + (s.otel_last_ts ? ', last ' + stamp(s.otel_last_ts, false, now) : '')
    : 'OTel none';
  return ['Session file ' + fmtN(s.session_file) + (s.session_file === 1 ? ' record' : ' records'), otel, 'Hooks ' + fmtN(s.hooks)].join(' · ');
}

/** The note under the line: whether OTel reached the session, and how to check when it did not. */
export function sourcesNote(s, tool) {
  if (!s) return '';
  if (s.otel_spans || s.otel_span_events) return fmtN(s.otel_span_events) + ' span events came with the spans. Values marked OTel come from them.';
  return (tool || '').startsWith('copilot')
    ? 'No OTel reached this session. Copilot CLI sends its spans when a session ends, to the address in OTEL_EXPORTER_OTLP_ENDPOINT. aictl otel status says whether it is set.'
    : 'No OTel reached this session.';
}

/** An MCP server as Copilot names it: the name when aictl knows it, else the start of its SHA-256. */
export function serverLabel(s) {
  return s.name || 'server ' + String(s.hash || '').slice(0, HASH_CHARS);
}

/** The table of model calls with the values only OTel has. */
export function otelCallsDef(otel) {
  return {
    cols: [
      { k: 'at', l: 'Time', w: '58px' }, { k: 'm', l: 'Model' },
      { k: 'cr', l: 'AI credits', n: true, w: '70px', t: 'github.copilot.nano_aiu of the call, in AI credits' },
      { k: 'ft', l: 'First chunk', n: true, w: '76px', t: 'gen_ai.response.time_to_first_chunk: time to the first part of the reply' },
      { k: 'sv', l: 'Server', n: true, w: '62px', t: 'github.copilot.server_duration: time the call took on the server' },
      { k: 'sf', l: 'Session file', w: '92px', t: 'Whether the session file has the same call. Its tokens are the ones counted.' },
    ],
    rows: (otel?.calls || []).map((c, i) => ({
      id: i,
      sort: { at: c.ts, m: c.model, cr: c.ai_credits, ft: c.ttft_ms, sv: c.server_ms, sf: c.matched ? 1 : 0 },
      cells: {
        at: { v: stamp(c.ts), cls: 'dim', title: stamp(c.ts, true) + (c.turn_id ? ', turn ' + c.turn_id : '') + (c.initiator ? ', started by ' + c.initiator : '') },
        m: { v: c.model || NA, cls: c.model ? '' : 'dim' },
        cr: { v: fmtCredits(c.ai_credits), title: c.nano_aiu == null ? OTEL_TIP : fmtN(c.nano_aiu) + ' nano AIU. ' + OTEL_TIP },
        ft: { v: fmtMs(c.ttft_ms) },
        sv: { v: fmtMs(c.server_ms) },
        sf: c.matched
          ? { v: 'Same call', cls: 'dim', title: 'The session file has this call; its tokens come from there' }
          : { v: 'Not in it', cls: 'warn', title: 'The session file has no such call. OTel tokens: ' + (c.tokens ? fmtN(c.tokens.input) + ' in, ' + fmtN(c.tokens.output) + ' out' : NA) + '. No total adds them.' },
      },
    })),
    sort: { k: 'at', dir: 'asc' }, limit: 120, none: 'No model call span reached aictl.',
  };
}

/** What the last turn had in context, by kind, as invoke_agent reported it. */
export function inContextModel(otel) {
  const c = otel?.in_context;
  if (!c) return null;
  return {
    at: c.ts,
    turns: c.turns,
    groups: [
      { label: 'Skills', items: c.skills || [] },
      { label: 'Custom agents', items: c.custom_agents || [] },
      { label: 'MCP servers', items: (c.mcp_servers || []).map(s => serverLabel(s) + (s.state ? ' (' + s.state + ')' : '')) },
    ],
  };
}

/** The live context use of the session against its limit, from Copilot's usage_info span events. */
export function otelContextText(otel) {
  const c = otel?.context;
  if (!c || c.current == null) return '';
  return fmtN(c.current) + ' of ' + fmtN(c.limit) + ' tokens' + (c.share != null ? ' (' + fmtShare(c.share) + ')' : '') + (c.messages != null ? ', ' + fmtN(c.messages) + ' messages' : '');
}

/** The Sources line at the top of the Overview. */
export function OtelSources({ a, data }) {
  const s = data.sources;
  if (!s) return null;
  return html`<${FixedPanel} id="asrc" title="Sources" sub="Where the records of this session came from">
    <div class="bd-ptext"><div data-testid="agent-sources">${sourcesLine(s)}</div><div class="bd-ag-dim">${sourcesNote(s, a.tool)}</div></div>
  </${FixedPanel}>`;
}

/** The OTel-only panels of the Overview: model calls, and what was in context. */
export function OtelOverview({ data }) {
  const otel = data.otel;
  const calls = useMemo(() => otelCallsDef(otel), [otel]);
  const ctxm = useMemo(() => inContextModel(otel), [otel]);
  if (!otel) return null;
  const t = otel.totals || {};
  const mcpEvents = otel.mcp_lifecycle || [];
  const stats = [
    { label: 'AI credits', value: fmtCredits(t.ai_credits), sub: 'OTel', title: 'Sum of github.copilot.nano_aiu over the model calls. ' + OTEL_TIP },
    { label: 'Model calls', value: fmtN(t.calls), sub: t.calls ? fmtN(t.matched) + ' in the session file' : '', title: 'chat spans. ' + OTEL_TIP },
    { label: 'Context now', value: otel.context?.current == null ? NA : fmtN(otel.context.current), sub: otel.context?.limit ? 'of ' + fmtN(otel.context.limit) + ' limit' : '', title: 'github.copilot.current_tokens and token_limit of the last usage_info event' + (otel.context?.ts ? ', ' + stamp(otel.context.ts, true) : '') + '. ' + OTEL_TIP },
    { label: 'MCP events', value: fmtN(mcpEvents.length), sub: (otel.mcp_servers || []).length ? (otel.mcp_servers || []).length + ' servers' : '', title: 'github.copilot.mcp.server.lifecycle span events. ' + OTEL_TIP },
  ];
  return html`<${FixedPanel} id="aotc" span=${7} title="Model calls, from OTel" sub=${fmtN(t.calls) + ' calls, ' + fmtCredits(t.ai_credits) + ' AI credits'}>
      <${Stats} stats=${stats}/>
      <${Table} def=${calls} label="Model calls, from OTel"/>
    </${FixedPanel}>
    <${FixedPanel} id="aoic" span=${5} title="In context, from OTel" sub=${ctxm ? 'Last turn, ' + stamp(ctxm.at, true) + ', ' + fmtN(ctxm.turns) + (ctxm.turns === 1 ? ' turn' : ' turns') : 'No invoke_agent span'}>
      ${ctxm ? html`<dl class="bd-facts">${ctxm.groups.map(g => html`<div key=${g.label} title=${g.items.join('\n') || 'None'}><dt>${g.label}</dt><dd class=${g.items.length ? '' : 'bd-na'}>${fmtN(g.items.length)}<small>${g.items.slice(0, 6).join(', ') + (g.items.length > 6 ? ', and ' + (g.items.length - 6) + ' more' : '')}</small></dd></div>`)}</dl>`
        : html`<div class="bd-empty">The spans name no skills, agents or MCP servers for this session.</div>`}
    </${FixedPanel}>`;
}
