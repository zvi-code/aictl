// ─── Board drawer — beside the dashboard, with a back stack ───────
// Loads on first use. Agent, tool, error, file and prompt details come from the
// /api/board/* routes when opened.
import { html } from 'htm/preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { NA, colorFor, projectName, fmtCpu, fmtDur, fmtLines, fmtMem, fmtMs, fmtN, fmtShare, fmtUsd, isLive, stamp, statusMeta } from './format.js';
import { Ico, PATHS } from './icons.js';
import { Actions, Stats } from './Panel.js';
import { statusCell } from './panels.js';
import Table from './Table.js';

/** Fetch on open. A new `tick` fetches again and keeps the old data on screen meanwhile. */
function useDetail(load, key, tick = 0) {
  const [state, setState] = useState({ key: null, data: null, error: null });
  useEffect(() => {
    let live = true;
    const ctrl = new AbortController();
    setState(s => (s.key === key ? s : { key, data: null, error: null }));
    load({ signal: ctrl.signal }).then((data) => {
      if (live) setState({ key, data, error: null });
    }).catch((e) => {
      if (live && e?.name !== 'AbortError') setState(s => (s.key === key && s.data ? s : { key, data: null, error: e }));
    });
    return () => { live = false; ctrl.abort(); };
  }, [key, tick]);
  return state.key === key ? state : { data: null, error: null };
}

function FixedPanel({ id, title, sub, children }) {
  const [open, setOpen] = useState(true);
  const label = open ? 'Fold this panel' : 'Unfold this panel';
  return html`<section class=${'bd-panel' + (open ? '' : ' bd-folded')} id=${'dr-' + id} style="grid-column:span 12" aria-label=${title}>
    <div class="bd-ph bd-ph-fixed">
      <h3>${title}</h3><span class="bd-psub" title=${sub || ''}>${sub || ''}</span>
      <button type="button" class="bd-ib-btn" aria-label=${label} title=${label} aria-expanded=${open ? 'true' : 'false'} onClick=${() => setOpen(!open)}><${Ico} d=${PATHS.chev} cls=${'bd-chev' + (open ? ' bd-open' : '')}/></button>
    </div>
    ${open ? html`<div class="bd-pb">${children}</div>` : null}
  </section>`;
}

const Frame = ({ title, sub, canBack, back, close, actions, tabs, children }) => html`<aside class="bd-area bd-dr" id="drawer" aria-label=${title}>
  <div class="bd-drh">
    <div class="bd-drh1">
      ${canBack ? html`<button type="button" class="bd-ib-btn" aria-label="Back" onClick=${back}><${Ico} d=${PATHS.back}/></button>` : null}
      <h2 title=${title}>${title}</h2>
      ${(actions || []).map(a => html`<button key=${a.label} type="button" class="bd-btn" onClick=${a.go}>${a.label}</button>`)}
      <button type="button" class="bd-ib-btn" aria-label="Close" onClick=${close}><${Ico} d=${PATHS.close}/></button>
    </div>
    <div class="bd-drsub" title=${sub}>${sub}</div>
    ${tabs ? html`<div class="bd-tabs" role="tablist">${tabs.map(tb => html`<button key=${tb.id} type="button" role="tab" aria-selected=${tb.on ? 'true' : 'false'} onClick=${tb.pick}>${tb.label}</button>`)}</div>` : null}
  </div>
  <div class="bd-grid">${children}</div>
</aside>`;

const Pending = ({ error }) => html`<div class="bd-empty" role="status">${error ? 'Could not load this: ' + error.message : 'Loading...'}</div>`;
const titleOf = a => (a.parent_id ? (a.role || a.title) + ' (subagent)' : a.title);
const toolListText = t => (Array.isArray(t) ? t.join(', ') : (t == null ? '' : String(t)));

function AgentDrawer({ d, ctx, frame, act }) {
  const { data, error } = useDetail(opts => api.getBoardAgent(d.id, opts), 'agent:' + d.id, ctx.refreshKey);
  const listed = ctx.data.agents.find(a => a.id === d.id);
  const a = data?.agent || listed || { id: d.id, title: d.id };
  const st = ctx.stopped[a.id] ? 'stopped' : a.status;
  const pending = a.pending && st === 'waiting' ? a.pending : null;
  const tabs = [
    ['overview', 'Overview'],
    ['turns', 'Turns' + (data ? ' (' + (data.turns || []).length + ')' : '')],
    ['tools', 'Tool calls' + (data ? ' (' + (data.tool_calls || []).length + ')' : a.tool_calls != null ? ' (' + a.tool_calls + ')' : '')],
    ['changes', 'Changes'],
    ['errors', 'Failures and loops'],
  ].map(([id, label]) => ({ id, label, on: d.tab === id, pick: () => act.setDrawerTab(id) }));
  const models = (a.models || []).join(', ');
  const sub = [ctx.toolName(a.tool), a.project ? projectName(a.project) : '', models, statusMeta(st).label, a.id].filter(Boolean).join(', ');
  // Only a main agent owns a process tree; a subagent stops with its parent.
  const actions = isLive(st) && !a.parent_id ? [{ label: 'Stop', go: () => act.stopAgent(a) }] : [];
  const body = () => {
    if (!data) return html`<${Pending} error=${error}/>`;
    if (d.tab === 'turns') return html`<${TurnsTab} data=${data}/>`;
    if (d.tab === 'tools') return html`<${ToolsTab} data=${data} pending=${pending}/>`;
    if (d.tab === 'changes') return html`<${ChangesTab} data=${data} act=${act}/>`;
    if (d.tab === 'errors') return html`<${ErrorsTab} data=${data}/>`;
    return html`<${OverviewTab} a=${a} data=${data} st=${st} ctx=${ctx} act=${act} pending=${pending}/>`;
  };
  return html`<${Frame} ...${frame} title=${a.title ? titleOf(a) : a.id} sub=${sub} tabs=${tabs} actions=${actions}>${body()}</${Frame}>`;
}

function OverviewTab({ a, data, st, ctx, act, pending }) {
  const proc = data.process || {};
  const live = isLive(st);
  const msgs = a.msgs ? a.msgs.user + a.msgs.assistant + a.msgs.tool : null;
  const tokens = [a.input, a.output, a.cache_read, a.cache_write].some(v => v != null) ? (a.input || 0) + (a.output || 0) + (a.cache_read || 0) + (a.cache_write || 0) : null;
  const addLines = (data.files || []).reduce((s, f) => s + (f.lines_added || 0), 0);
  const delLines = (data.files || []).reduce((s, f) => s + (f.lines_removed || 0), 0);
  const stats = [
    { label: 'Messages', value: fmtN(msgs), sub: a.msgs ? a.msgs.user + ' prompts' : '' },
    { label: 'Tokens', value: fmtN(tokens) },
    { label: 'Cached', value: fmtShare(a.cached_share), sub: a.cache_read == null ? '' : fmtN(a.cache_read) + ' read' },
    { label: 'Cost', value: fmtUsd(a.cost_usd) },
    { label: 'Tool calls', value: fmtN(a.tool_calls), sub: a.failures == null ? '' : a.failures + ' failed' },
    { label: 'Time', value: fmtDur((a.ended_at || Date.now() / 1000) - a.started_at) },
    { label: 'Lines', value: (data.files || []).length ? '+' + fmtN(addLines) : NA, sub: (data.files || []).length ? '−' + fmtN(delLines) : '' },
  ];
  const models = useMemo(() => ({
    cols: [{ k: 'm', l: 'Model' }, { k: 'msgs', l: 'Msgs', n: true, w: '50px' }, { k: 'input', l: 'Input', n: true, w: '60px' }, { k: 'output', l: 'Output', n: true, w: '60px' }, { k: 'cr', l: 'Cache read', n: true, w: '76px' }, { k: 'cw', l: 'Cache write', n: true, w: '80px' }, { k: 'cost', l: 'Cost', n: true, w: '60px' }],
    rows: (data.by_model || []).map(x => ({ id: x.model, sort: { m: x.model, msgs: x.msgs, input: x.input, output: x.output, cr: x.cache_read, cw: x.cache_write, cost: x.cost_usd }, cells: { m: { v: x.model, sw: colorFor('model', x.model) }, msgs: { v: fmtN(x.msgs) }, input: { v: fmtN(x.input) }, output: { v: fmtN(x.output) }, cr: { v: fmtN(x.cache_read) }, cw: { v: fmtN(x.cache_write) }, cost: { v: fmtUsd(x.cost_usd) } } })),
  }), [data]);
  const kids = useMemo(() => ({
    cols: [{ k: 'n', l: 'Subagent' }, { k: 's', l: 'Status', w: '100px' }, { k: 'm', l: 'Model', w: '70px' }, { k: 't', l: 'Tokens', n: true, w: '60px' }, { k: 'c', l: 'Cost', n: true, w: '60px' }],
    rows: (data.subagents || []).map(k => {
      const t = (k.input || 0) + (k.output || 0) + (k.cache_read || 0) + (k.cache_write || 0);
      return { id: k.id, go: () => act.openDrawer({ type: 'agent', id: k.id, tab: 'overview' }), sort: { n: k.role, t, c: k.cost_usd }, cells: { n: { v: k.role || k.title, sub: k.short }, s: statusCell(k, ctx.stopped), m: { v: (k.models || []).join(', ') || NA, cls: 'dim' }, t: { v: fmtN(t) }, c: { v: fmtUsd(k.cost_usd) } } };
    }),
    sort: { k: 't', dir: 'desc' },
  }), [data, ctx.stopped]);
  const copyLink = window.location.origin + window.location.pathname + '?agent=' + encodeURIComponent(a.id);
  return html`
    ${pending ? html`<${FixedPanel} id="ap" title="Waiting for your confirmation"><div class="bd-ptext">${pending.name + ': ' + pending.target + '\nWaiting for ' + fmtDur(Date.now() / 1000 - pending.since_ts) + '. Answer in the tool that asks.'}</div></${FixedPanel}>` : null}
    <${FixedPanel} id="ast" title="Totals"><${Stats} stats=${stats}/></${FixedPanel}>
    <${FixedPanel} id="am" title="Usage by model"><${Table} def=${models} label="Usage by model"/></${FixedPanel}>
    ${(data.subagents || []).length ? html`<${FixedPanel} id="ak" title="Subagents"><${Table} def=${kids} label="Subagents"/></${FixedPanel}>` : null}
    <${FixedPanel} id="ar" title="Process">
      <${Stats} stats=${[{ label: 'CPU', value: live ? fmtCpu(proc.cpu_percent) : NA }, { label: 'RAM', value: live ? fmtMem(proc.mem_mb) : NA }, { label: 'Processes', value: live && Array.isArray(proc.pids) && proc.pids.length ? proc.pids.length : NA }, { label: 'Started', value: stamp(proc.started_at ?? a.started_at, true) }]}/>
      <${Actions} actions=${[{ label: 'Copy session ID', go: () => act.copy(a.id, 'Copied ' + a.id) }, { label: 'Copy link to this agent', go: () => act.copy(copyLink, 'Copied the link') }]}/>
    </${FixedPanel}>`;
}

function TurnsTab({ data }) {
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '58px' }, { k: 'text', l: 'Prompt or tools' }, { k: 'm', l: 'Model', w: '62px' }, { k: 'i', l: 'In', n: true, w: '50px' }, { k: 'o', l: 'Out', n: true, w: '50px' }, { k: 'c', l: 'Cached', n: true, w: '54px' }, { k: 'l', l: 'Reply', n: true, w: '56px' }],
    rows: (data.turns || []).map((t, i) => {
      const tools = toolListText(t.tools);
      return { id: i, sort: { at: t.ts, i: t.input, o: t.output, c: t.cache_read, l: t.reply_ms }, cells: { at: { v: stamp(t.ts), cls: 'dim' }, text: { v: t.text || tools || 'Reply only', cls: t.text ? '' : 'dim' }, m: { v: t.model || NA, cls: 'dim' }, i: { v: fmtN(t.input) }, o: { v: fmtN(t.output) }, c: { v: fmtN(t.cache_read) }, l: { v: fmtMs(t.reply_ms) } } };
    }),
    sort: { k: 'at', dir: 'asc' }, limit: 120, none: 'No turns recorded.',
  }), [data]);
  return html`<${FixedPanel} id="at" title="Turns, oldest first"><${Table} def=${def} label="Turns"/></${FixedPanel}>`;
}

function ToolsTab({ data, pending }) {
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '58px' }, { k: 'n', l: 'Tool', w: '120px' }, { k: 'tg', l: 'Target' }, { k: 'ms', l: 'Took', n: true, w: '58px' }, { k: 'ok', l: 'Result', w: '52px' }, { k: 'conf', l: 'Confirm', w: '66px' }],
    rows: (data.tool_calls || []).map((c, i) => ({ id: i, sort: { at: c.ts, ms: c.duration_ms, n: c.name }, cells: { at: { v: stamp(c.ts), cls: 'dim' }, n: { v: c.name, cls: 'm' }, tg: { v: c.target || NA, cls: 'm dim' }, ms: { v: fmtMs(c.duration_ms) }, ok: { v: c.failed ? 'Failed' : 'OK', cls: c.failed ? 'crit' : 'dim' }, conf: { v: c.confirm || NA, cls: 'dim' } } })),
    sort: { k: 'at', dir: 'desc' }, limit: 120, none: 'No tool calls recorded.',
  }), [data]);
  return html`${pending ? html`<${FixedPanel} id="ap2" title="Waiting for your confirmation"><div class="bd-ptext">${pending.name + ': ' + pending.target}</div></${FixedPanel}>` : null}
    <${FixedPanel} id="atc" title="Tool calls"><${Table} def=${def} label="Tool calls"/></${FixedPanel}>`;
}

function ChangesTab({ data, act }) {
  const files = useMemo(() => ({
    cols: [{ k: 'f', l: 'File' }, { k: 'l', l: 'Lines', n: true, w: '90px' }, { k: 'n', l: 'Edits', n: true, w: '46px' }],
    rows: (data.files || []).map(f => ({ id: f.path, go: () => act.openDrawer({ type: 'file', path: f.path }), sort: { f: f.path, l: (f.lines_added || 0) + (f.lines_removed || 0), n: f.edits }, cells: { f: { v: f.path, cls: 'm' }, l: { v: fmtLines(f.lines_added, f.lines_removed) }, n: { v: f.edits ?? NA } } })),
    sort: { k: 'l', dir: 'desc' }, none: 'This agent changed no files.',
  }), [data]);
  const tests = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '58px' }, { k: 'cmd', l: 'Command' }, { k: 'r', l: 'Result', w: '70px' }, { k: 'd', l: 'Took', n: true, w: '56px' }],
    rows: (data.tests || []).map((t, i) => ({ id: i, sort: { at: t.ts }, cells: { at: { v: stamp(t.ts), cls: 'dim' }, cmd: { v: t.command, cls: 'm' }, r: { v: t.passed ? 'Passed' : 'Failed', cls: t.passed ? 'dim' : 'crit' }, d: { v: fmtMs(t.duration_ms) } } })),
    sort: { k: 'at', dir: 'desc' }, none: 'This agent ran no tests.',
  }), [data]);
  return html`<${FixedPanel} id="afc" title="Files changed"><${Table} def=${files} label="Files changed"/></${FixedPanel}>
    <${FixedPanel} id="atst" title="Test runs"><${Table} def=${tests} label="Test runs"/></${FixedPanel}>`;
}

function ErrorsTab({ data }) {
  const { loop } = data;
  const rows = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '60px' }, { k: 'k', l: 'What', w: '160px' }, { k: 'd', l: 'Detail' }],
    rows: (data.errors || []).map((e, i) => ({ id: i, sort: { at: e.ts }, cells: { at: { v: stamp(e.ts), cls: 'dim' }, k: { v: e.key }, d: { v: e.detail || NA, cls: 'm dim' } } })),
    sort: { k: 'at', dir: 'desc' }, none: 'No failures for this agent.',
  }), [data]);
  return html`${loop ? html`<${FixedPanel} id="al" title="Loop"><div class="bd-ptext">${loop.pattern + '\nRepeated ' + loop.repeats + ' times, ' + fmtN(loop.tokens) + ' tokens, ' + fmtUsd(loop.cost_usd) + '.'}</div></${FixedPanel}>` : null}
    <${FixedPanel} id="ae" title="Failures and errors"><${Table} def=${rows} label="Failures and errors"/></${FixedPanel}>`;
}

function ToolDrawer({ d, ctx, frame, act }) {
  const { data, error } = useDetail(opts => api.getBoardTool(d.name, ctx.query, opts), 'tool:' + d.name + ':' + ctx.query);
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '60px' }, { k: 'target', l: 'Target' }, { k: 'ag', l: 'Agent', w: '74px' }, { k: 'ms', l: 'Took', n: true, w: '58px' }, { k: 'ok', l: 'Result', w: '56px' }, { k: 'conf', l: 'Confirm', w: '68px' }],
    rows: (data?.calls || []).map((c, i) => ({ id: i, go: c.agent_id ? () => act.openDrawer({ type: 'agent', id: c.agent_id, tab: 'tools' }) : null, sort: { at: c.ts, ms: c.duration_ms, ok: c.failed ? 1 : 0 }, cells: { at: { v: stamp(c.ts), cls: 'dim' }, target: { v: c.target || NA, cls: 'm' }, ag: { v: (c.agent_id || '').slice(0, 8) || NA, cls: 'dim', title: c.title || '' }, ms: { v: fmtMs(c.duration_ms) }, ok: { v: c.failed ? 'Failed' : 'OK', cls: c.failed ? 'crit' : 'dim' }, conf: { v: c.confirm || NA, cls: 'dim' } } })),
    sort: { k: 'at', dir: 'desc' }, limit: 80, none: 'No calls in this time.', primary: 'target',
  }), [data]);
  return html`<${Frame} ...${frame} title=${d.name} sub=${data ? (data.calls || []).length + ' calls in this time' : 'Loading...'}>
    ${data ? html`<${FixedPanel} id="tc" title="Calls"><${Table} def=${def} label="Calls"/></${FixedPanel}>` : html`<${Pending} error=${error}/>`}
  </${Frame}>`;
}

function ErrorDrawer({ d, ctx, frame, act }) {
  const { data, error } = useDetail(opts => api.getBoardError(d.key, ctx.query, opts), 'error:' + d.key + ':' + ctx.query);
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '60px' }, { k: 'msg', l: 'Detail' }, { k: 'ag', l: 'Agent', w: '220px' }],
    rows: (data?.items || []).map((x, i) => ({ id: i, go: x.agent_id ? () => act.openDrawer({ type: 'agent', id: x.agent_id, tab: 'errors' }) : null, sort: { at: x.ts }, cells: { at: { v: stamp(x.ts), cls: 'dim' }, msg: { v: x.detail || NA, cls: 'm' }, ag: { v: x.title || NA, cls: 'dim' } } })),
    sort: { k: 'at', dir: 'desc' }, none: 'Nothing in this time.', primary: 'msg',
  }), [data]);
  return html`<${Frame} ...${frame} title=${d.key} sub=${data ? (data.items || []).length + ' times in this time' : 'Loading...'}>
    ${data ? html`<${FixedPanel} id="ev" title="Each time it happened"><${Table} def=${def} label="Each time it happened"/></${FixedPanel}>` : html`<${Pending} error=${error}/>`}
  </${Frame}>`;
}

const CODE_STYLE = {
  add: { background: 'var(--add)', color: 'var(--addink)' },
  del: { background: 'var(--del)', color: 'var(--delink)' },
  same: { color: 'var(--ink)' },
  hit: { background: 'var(--warnbg)', color: 'var(--warnink)' },
};
const CODE_SIGN = { add: '+', del: '-' };
const CodeLines = ({ lines }) => html`<div class="bd-code">${lines.map((ln, i) => {
  const st = CODE_STYLE[ln.kind] || CODE_STYLE.same;
  return html`<div key=${i} style=${st.background ? { background: st.background } : null}><span>${CODE_SIGN[ln.kind] || ln.n}</span><span style=${{ color: st.color }}>${ln.text}</span></div>`;
})}</div>`;

/** The lines around one line of a file, for a finding that points at it. */
function useExcerpt(path, line) {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!path || !line) { setState(null); return undefined; }
    let live = true;
    api.getFile(path).then(r => (r.ok ? r.text() : null)).then((text) => {
      if (!live || typeof text !== 'string') return;
      const all = text.split('\n');
      const from = Math.max(0, line - 4);
      setState(all.slice(from, line + 3).map((t, i) => ({ n: from + i + 1, text: t, kind: from + i + 1 === line ? 'hit' : 'same' })));
    }).catch(() => { /* the file is not readable here: the panel says so */ });
    return () => { live = false; };
  }, [path, line]);
  return state;
}

function FileDrawer({ d, ctx, frame, act }) {
  const { data, error } = useDetail(opts => api.getBoardFile(d.path, ctx.query, opts), 'file:' + d.path + ':' + ctx.query);
  const excerpt = useExcerpt(d.path, d.line);
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '110px' }, { k: 'ag', l: 'Agent' }, { k: 'ch', l: 'Lines', n: true, w: '80px' }],
    rows: (data?.edits || []).map((e, i) => ({ id: i, go: e.agent_id ? () => act.openDrawer({ type: 'agent', id: e.agent_id, tab: 'changes' }) : null, sort: { at: e.ts }, cells: { at: { v: stamp(e.ts, true), cls: 'dim' }, ag: { v: e.title || NA }, ch: { v: fmtLines(e.lines_added, e.lines_removed) } } })),
    sort: { k: 'at', dir: 'desc' }, none: 'No agent edited this file in this time.', primary: 'ag',
  }), [data]);
  const sub = d.line ? 'Line ' + d.line : (data?.diff ? 'Diff of the last edit' : '');
  return html`<${Frame} ...${frame} title=${d.path} sub=${sub}>
    ${excerpt ? html`<${FixedPanel} id="code" title="File"><${CodeLines} lines=${excerpt}/><div class="bd-note">Values under names that look like secrets are never shown.</div></${FixedPanel}>` : null}
    ${data ? html`
      ${!d.line || data.diff ? html`<${FixedPanel} id="diff" title="Diff">
        ${data.diff ? html`<${CodeLines} lines=${data.diff}/><div class="bd-note">Values under names that look like secrets are masked.</div>` : html`<div class="bd-empty">n/a. No diff is stored for this file.</div>`}
      </${FixedPanel}>` : null}
      <${FixedPanel} id="edits" title="Edits in this time"><${Table} def=${def} label="Edits in this time"/></${FixedPanel}>`
      : html`<${Pending} error=${error}/>`}
  </${Frame}>`;
}

function PromptDrawer({ d, ctx, frame, act }) {
  const listed = ctx.data.agents.find(a => a.id === d.agent_id);
  const sessionId = listed?.parent_id || d.agent_id;
  const { data, error } = useDetail(opts => api.getBoardPrompt(d.ts, sessionId, opts), 'prompt:' + d.ts + ':' + sessionId);
  const metadata = ctx.data.capture_mode === 'metadata';
  const text = data?.text || (metadata ? 'The text of this prompt is not stored, because the capture mode is metadata.' : NA);
  const sub = [stamp(d.ts, true), projectName(data?.project || d.summary?.project), data?.title].filter(Boolean).join(', ');
  return html`<${Frame} ...${frame} title="Prompt" sub=${sub}>
    ${data ? html`<${FixedPanel} id="ptxt" title="Full text"><div class="bd-ptext">${text}${data.prompt_file ? '\n\nUses the prompt file ' + data.prompt_file : ''}</div></${FixedPanel}>
      <${FixedPanel} id="pst" title="What it cost">
        <${Stats} stats=${[{ label: 'Input', value: fmtN(data.input) }, { label: 'Output', value: fmtN(data.output) }, { label: 'Cache read', value: fmtN(data.cache_read) }, { label: 'Reply', value: fmtMs(data.reply_ms) }, { label: 'Tool calls', value: data.tool_calls ?? NA }]}/>
        ${d.agent_id ? html`<${Actions} actions=${[{ label: 'Open agent', go: () => act.openDrawer({ type: 'agent', id: d.agent_id, tab: 'overview' }) }]}/>` : null}
      </${FixedPanel}>` : html`<${Pending} error=${error}/>`}
  </${Frame}>`;
}

const VIEWS = { agent: AgentDrawer, tool: ToolDrawer, error: ErrorDrawer, file: FileDrawer, prompt: PromptDrawer };

export default function Drawer({ stack, ctx, act }) {
  const d = stack[stack.length - 1];
  const View = VIEWS[d.type];
  if (!View) return null;
  const frame = { canBack: stack.length > 1, back: act.drawerBack, close: act.drawerClose };
  return html`<${View} d=${d} ctx=${ctx} act=${act} frame=${frame} key=${d.type}/>`;
}
