// ─── Board drawer — beside the dashboard, with a back stack ───────
// Loads on first use. Agent, tool, error, file and prompt details come from the
// /api/board/* routes when opened. The hidden context view uses the scan that the
// board already holds.
import { html } from 'htm/preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as api from '../../api.js';
import { NA, NO_MODEL, errorLabel, colorFor, projectName, fmtBytes, fmtCpu, fmtDur, fmtLines, fmtMem, fmtMs, fmtN, fmtShare, fmtUsd, isLive, sparkPath, stamp, statusMeta } from './format.js';
import { Ico, PATHS } from './icons.js';
import { Actions, Stats } from './Panel.js';
import { statusCell } from './panels.js';
import Table from './Table.js';
import TextView from '../ui/TextView.js';
import { scopeAudit } from '../../utils/auditScope.js';
import { instructionsByTool } from './findings.js';
import FileEditor from './FileEditor.js';
import { normalizeAgentDetail } from './useBoardData.js';

/** Fetch on open. A new `tick` fetches again and keeps the old data on screen meanwhile. */
export function useDetail(load, key, tick = 0) {
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

export function FixedPanel({ id, title, sub, children }) {
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

// The width of the drawer, set by dragging its left edge, is kept in this browser.
const DRAWER_W_KEY = 'aictl.drawerWidth';
export const DRAWER_MIN_PX = 320;
const BOARD_MIN_PX = 360;
const DRAWER_STEP_PX = 20;
const loadDrawerWidth = () => { try { return parseInt(localStorage.getItem(DRAWER_W_KEY), 10) || null; } catch { return null; } };
const saveDrawerWidth = w => { try { if (w) localStorage.setItem(DRAWER_W_KEY, String(w)); else localStorage.removeItem(DRAWER_W_KEY); } catch { /* this page only */ } };
const clampDrawer = w => Math.round(Math.max(DRAWER_MIN_PX, Math.min(w, Math.max(DRAWER_MIN_PX, window.innerWidth - BOARD_MIN_PX))));

function SplitGrip({ width, setWidth }) {
  const begin = e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const right = e.currentTarget.parentElement.getBoundingClientRect().right;
    let w = width;
    const move = ev => { w = clampDrawer(right - ev.clientX); setWidth(w); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('bd-resizing');
      saveDrawerWidth(w);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.classList.add('bd-resizing');
  };
  const key = e => {
    const d = e.key === 'ArrowLeft' ? DRAWER_STEP_PX : e.key === 'ArrowRight' ? -DRAWER_STEP_PX : 0;
    if (!d) return;
    e.preventDefault();
    const w = clampDrawer((width || e.currentTarget.parentElement.getBoundingClientRect().width) + d);
    setWidth(w);
    saveDrawerWidth(w);
  };
  return html`<div class="bd-drgrip" role="separator" aria-orientation="vertical" tabIndex="0"
    aria-valuemin="0" aria-valuenow=${width || 0}
    aria-label="Width of the side panel. Drag or use the arrow keys. Double-click resets it."
    title="Drag to change the width. Double-click to reset."
    onPointerDown=${begin} onKeyDown=${key} onDblClick=${() => { setWidth(null); saveDrawerWidth(null); }}></div>`;
}

function Frame({ title, sub, head, canBack, back, close, actions, tabs, children }) {
  const [width, setWidth] = useState(loadDrawerWidth);
  return html`<aside class="bd-area bd-dr" id="drawer" aria-label=${title} style=${width ? { '--drw': clampDrawer(width) + 'px' } : null}>
  <${SplitGrip} width=${width} setWidth=${setWidth}/>
  <div class="bd-drh">
    <div class="bd-drh1">
      ${canBack ? html`<button type="button" class="bd-ib-btn" aria-label="Back" onClick=${back}><${Ico} d=${PATHS.back}/></button>` : null}
      <h2 title=${title}>${title}</h2>
      ${(actions || []).map(a => html`<button key=${a.label} type="button" class="bd-btn" onClick=${a.go}>${a.label}</button>`)}
      <button type="button" class="bd-ib-btn" aria-label="Close" onClick=${close}><${Ico} d=${PATHS.close}/></button>
    </div>
    <div class="bd-drsub" title=${sub}>${sub}</div>
    ${head || null}
    ${tabs ? html`<div class="bd-tabs" role="tablist">${tabs.map(tb => html`<button key=${tb.id} type="button" role="tab" aria-selected=${tb.on ? 'true' : 'false'} onClick=${tb.pick}>${tb.label}</button>`)}</div>` : null}
  </div>
  <div class="bd-grid">${children}</div>
</aside>`;
}

const fmtTokens = n => (n == null ? NA : fmtN(n) + ' tokens');
export const Pending = ({ error }) => html`<div class="bd-empty" role="status">${error ? 'Could not load this: ' + error.message : 'Loading...'}</div>`;
const titleOf = a => (a.parent_id ? (a.role || a.title) + ' (subagent)' : a.title);
const toolListText = t => (Array.isArray(t) ? t.join(', ') : (t == null ? '' : String(t)));

function AgentDrawer({ d, ctx, frame, act }) {
  const { data: raw, error } = useDetail(opts => api.getBoardAgent(d.id, opts), 'agent:' + d.id, ctx.refreshKey);
  const data = useMemo(() => normalizeAgentDetail(raw), [raw]);
  const listed = ctx.data.agents.find(a => a.id === d.id);
  const a = data?.agent || listed || { id: d.id, title: d.id };
  const st = ctx.stopped[a.id] ? 'stopped' : a.status;
  const pending = a.pending && st === 'waiting' ? a.pending : null;
  const tabs = [
    ['overview', 'Overview'],
    ['transcript', 'Transcript'],
    ['flow', 'Flow'],
    ['timeline', 'Timeline'],
    ['turns', 'Turns' + (data ? ' (' + (data.turns || []).length + ')' : '')],
    ['tools', 'Tool calls' + (a.tool_calls != null ? ' (' + a.tool_calls + ')' : data ? ' (' + (data.tool_calls || []).length + ')' : '')],
    ['changes', 'Changes'],
    ['artifacts', 'Artifacts' + (data ? ' (' + data.artifacts_total + ')' : '')],
    ['commits', 'Commits' + (data ? ' (' + data.commits.length + ')' : '')],
    ['errors', 'Failures and loops'],
    ['events', 'Events'],
    ['team', 'Team'],
    ['procs', 'Processes'],
    ['integrations', 'Integrations'],
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
    if (d.tab !== 'overview' && AGENT_PARTS[d.tab]) return html`<${Part} key=${d.tab} part=${d.tab} a=${a} data=${data} st=${st} ctx=${ctx} act=${act}/>`;
    return html`<${OverviewTab} a=${a} data=${data} st=${st} ctx=${ctx} act=${act} pending=${pending}/>
      <${Part} part="overview" name="OverviewExtras" a=${a} data=${data} st=${st} ctx=${ctx} act=${act}/>`;
  };
  const head = data?.git ? html`<${Part} part="overview" name="GitBadge" git=${data.git} a=${a}/>` : null;
  return html`<${Frame} ...${frame} title=${a.title ? titleOf(a) : a.id} sub=${sub} head=${head} tabs=${tabs} actions=${actions}>${body()}</${Frame}>`;
}

// The session views load when their tab opens, so the board's first chunk stays small.
const AGENT_PARTS = {
  overview: () => import('./agent/OverviewExtras.js'),
  transcript: () => import('./agent/TranscriptTab.js'),
  flow: () => import('./agent/FlowTab.js'),
  timeline: () => import('./agent/TimelineTab.js'),
  artifacts: () => import('./agent/ArtifactsTab.js'),
  commits: () => import('./agent/CommitsTab.js'),
  events: () => import('./agent/EventsTab.js'),
  team: () => import('./agent/TeamTab.js'),
  procs: () => import('./agent/ProcessesTab.js'),
  integrations: () => import('./agent/IntegrationsTab.js'),
};

/** One export of a lazily loaded agent view. Shows Loading until a whole tab arrives. */
function Part({ part, name = 'default', ...props }) {
  const [mod, setMod] = useState(null);
  useEffect(() => {
    let live = true;
    AGENT_PARTS[part]().then((m) => { if (live) setMod(() => m); })
      .catch((e) => { if (live) setMod({ failed: e }); });
    return () => { live = false; };
  }, [part]);
  const View = mod?.[name];
  if (View) return html`<${View} ...${props}/>`;
  if (name !== 'default') return null;
  return html`<div class="bd-ag-top"><${Pending} error=${mod?.failed || null}/></div>`;
}

/** The table of a session's subagents, for the Overview and, when no team is stored, the Team tab. */
export function subagentDef(subagents, ctx, act, withTime = false) {
  const now = Date.now() / 1000;
  return {
    cols: [{ k: 'n', l: 'Subagent' }, { k: 's', l: 'Status', w: '100px' }, { k: 'm', l: 'Model', w: '70px' }, { k: 't', l: 'Tokens', n: true, w: '60px' }, { k: 'c', l: 'Cost', n: true, w: '60px' }, ...(withTime ? [{ k: 'd', l: 'Time', n: true, w: '64px' }] : [])],
    rows: (subagents || []).map(k => {
      const t = (k.input || 0) + (k.output || 0) + (k.cache_read || 0) + (k.cache_write || 0);
      const dur = k.started_at ? (k.ended_at || now) - k.started_at : null;
      return { id: k.id, go: () => act.openDrawer({ type: 'agent', id: k.id, tab: 'overview' }), sort: { n: k.role, t, c: k.cost_usd, d: dur }, cells: { n: { v: k.role || k.title, sub: k.short }, s: statusCell(k, ctx.stopped), m: { v: (k.models || []).join(', ') || NA, cls: 'dim' }, t: { v: fmtN(t) }, c: { v: fmtUsd(k.cost_usd) }, ...(withTime ? { d: { v: fmtDur(dur) } } : {}) } };
    }),
    sort: { k: 't', dir: 'desc' },
  };
}

function OverviewTab({ a, data, st, ctx, act, pending }) {
  const proc = data.process || {};
  const live = isLive(st);
  const msgs = a.msgs ? a.msgs.user + a.msgs.assistant + a.msgs.tool : null;
  const tokens = [a.input, a.output, a.cache_read, a.cache_write].some(v => v != null) ? (a.input || 0) + (a.output || 0) + (a.cache_read || 0) + (a.cache_write || 0) : null;
  const addLines = (data.files || []).reduce((s, f) => s + (f.lines_added || 0), 0);
  const delLines = (data.files || []).reduce((s, f) => s + (f.lines_removed || 0), 0);
  const stats = [
    { label: 'Messages', value: fmtN(msgs), sub: a.msgs ? a.msgs.user + (a.parent_id ? ' task prompts' : ' prompts') : '' },
    { label: 'Tokens', value: fmtN(tokens) },
    { label: 'Cached', value: fmtShare(a.cached_share), sub: a.cache_read == null ? '' : fmtN(a.cache_read) + ' read' },
    { label: 'Cost', value: fmtUsd(a.cost_usd) },
    { label: 'Tool calls', value: fmtN(a.tool_calls), sub: a.failures == null ? '' : a.failures + ' failed' },
    { label: 'Time', value: fmtDur((a.ended_at || Date.now() / 1000) - a.started_at) },
    { label: 'Lines', value: (data.files || []).length ? '+' + fmtN(addLines) : NA, sub: (data.files || []).length ? '−' + fmtN(delLines) : '' },
    { label: 'Artifacts', value: fmtN(data.artifacts_total), sub: data.artifacts_bytes == null ? '' : fmtBytes(data.artifacts_bytes), title: 'Files of the session folder and files the session wrote outside its project' },
    { label: 'Commits', value: fmtN(data.commits.length), sub: ((n) => n + (n === 1 ? ' pull request' : ' pull requests'))(data.commits.reduce((n, c) => n + c.prs.length, 0)) },
  ];
  const models = useMemo(() => ({
    cols: [{ k: 'm', l: 'Model' }, { k: 'msgs', l: 'Calls', n: true, w: '50px', t: 'Calls to this model' }, { k: 'input', l: 'Input', n: true, w: '60px' }, { k: 'output', l: 'Output', n: true, w: '60px' }, { k: 'cr', l: 'Cache read', n: true, w: '76px' }, { k: 'cw', l: 'Cache write', n: true, w: '80px' }, { k: 'cost', l: 'Cost', n: true, w: '60px' }],
    rows: (data.by_model || []).map(x => ({ id: x.model || 'none', sort: { m: x.model || NO_MODEL, msgs: x.msgs, input: x.input, output: x.output, cr: x.cache_read, cw: x.cache_write, cost: x.cost_usd }, cells: { m: { v: x.model || NO_MODEL, sw: colorFor('model', x.model), title: x.model ? x.model : 'The record carries no model id', cls: x.model ? '' : 'dim' }, msgs: { v: fmtN(x.msgs) }, input: { v: fmtN(x.input) }, output: { v: fmtN(x.output) }, cr: { v: fmtN(x.cache_read) }, cw: { v: fmtN(x.cache_write) }, cost: { v: fmtUsd(x.cost_usd) } } })),
  }), [data]);
  const kids = useMemo(() => subagentDef(data.subagents, ctx, act), [data, ctx.stopped]);
  const skills = useMemo(() => ({
    cols: [{ k: 'n', l: 'Skill' }, { k: 'u', l: 'Uses', n: true, w: '46px' }, { k: 'b', l: 'Started by', w: '130px' }, { k: 'l', l: 'Last use', w: '110px' }],
    rows: (data.skills || []).map(x => ({
      id: x.name, go: () => act.openDrawer({ type: 'skill', name: x.name }), sort: { n: x.name, u: x.uses, l: x.last_ts },
      cells: { n: { v: x.name, title: x.name }, u: { v: x.uses }, b: { v: (x.started_by || '').split(',').filter(Boolean).join(', ') || NA, cls: 'dim' }, l: { v: stamp(x.last_ts, true), cls: 'dim' } },
    })),
    sort: { k: 'u', dir: 'desc' }, none: 'This agent used no skill. Skill uses are read from Claude Code, Copilot CLI and VS Code sessions.',
  }), [data]);
  const cf = data.context_files || { files: [], total: 0, git_root: null, read: false };
  const ctxFiles = useMemo(() => ({
    cols: [{ k: 'n', l: 'File', w: '200px' }, { k: 'p', l: 'Folder' }],
    rows: cf.files.map(f => ({
      id: f.path, go: () => act.openDrawer({ type: 'file', path: f.path }),
      sort: { n: f.name, p: f.path },
      cells: { n: { v: f.name, title: f.path }, p: { v: f.path.slice(0, f.path.length - f.name.length) || NA, cls: 'dim', title: f.path } },
    })),
    sort: { k: 'p', dir: 'asc' },
    none: !cf.git_root ? 'The session folder is not in a git repository, so aictl links no files to it.' : cf.read ? 'No instruction or config file of this repository applies to the session folder.' : 'aictl has not read this repository yet. It reads it in the background.',
  }), [data]);
  const context = data.context;
  const compactionDef = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '110px' }, { k: 'why', l: 'Trigger', w: '80px' }, { k: 'b', l: 'Before', n: true, t: 'Tokens before it, as the tool reports them' }, { k: 'a', l: 'After', n: true, t: 'Tokens after it, as the tool reports them' }, { k: 'f', l: 'Freed', n: true }, { k: 'd', l: 'Took', n: true, w: '70px' }],
    rows: (context?.compactions || []).map(c => ({
      id: c.ts, sort: { at: c.ts, b: c.before, a: c.after, f: c.freed, d: c.duration_ms },
      cells: { at: { v: stamp(c.ts, true), cls: 'dim' }, why: { v: c.trigger || NA, cls: 'dim' }, b: { v: fmtTokens(c.before) }, a: { v: fmtTokens(c.after) }, f: { v: fmtTokens(c.freed) }, d: { v: fmtMs(c.duration_ms) } },
    })),
    sort: { k: 'at', dir: 'asc' }, none: 'No compaction is stored for this agent.', primary: 'at',
  }), [data]);
  const copilot = (a.tool || '').startsWith('copilot');
  const split = context?.split;
  const copyLink = window.location.origin + window.location.pathname + '?agent=' + encodeURIComponent(a.id);
  return html`
    ${pending ? html`<${FixedPanel} id="ap" title="Waiting for your confirmation"><div class="bd-ptext">${pending.name + ': ' + pending.target + '\nWaiting for ' + fmtDur(Date.now() / 1000 - pending.since_ts) + '. Answer in the tool that asks.'}</div></${FixedPanel}>` : null}
    ${context ? html`<${FixedPanel} id="actx" title="Context size" sub=${a.parent_id ? 'What this subagent sent with each model call' : 'What the main agent sent with each model call. Each subagent has its own.'}>
      <${Stats} stats=${[{ label: 'First call', sub: 'tokens', value: fmtN(context.first), title: 'Everything loaded before work began: system prompt, tools, instructions and the first prompt' }, { label: 'Last call', sub: 'tokens', value: fmtN(context.last) }, { label: 'Peak', sub: 'tokens', value: fmtN(context.peak) }, { label: 'Calls', value: fmtN(context.calls) }, { label: 'Times it shrank', value: fmtN(context.drops), title: 'The size fell by more than half, as compaction does' }, { label: 'Compactions', value: context.compactions?.length ? fmtN(context.compactions.length) : NA, sub: context.compactions?.length ? '' : 'none stored', title: 'Compaction records in the session file. Only the time that aictl reads from these files is stored, so no record does not prove that none happened.' }]}/>
      <svg class="bd-ctxspark" viewBox="0 0 600 60" preserveAspectRatio="none" role="img" aria-label=${'Context size per call, from ' + fmtN(context.first) + ' to ' + fmtN(context.last) + ', peak ' + fmtN(context.peak)}><path d=${sparkPath(context.series, 600, 60)} fill="none" stroke="var(--s1)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>
      ${copilot ? html`
        <${Stats} stats=${[{ label: 'Tool definitions', sub: 'tokens', value: fmtN(context.tool_tokens), title: 'toolTokenCount of the last model call that reports it' }, { label: 'Tools available', value: fmtN(context.available_tools), title: 'availableToolCount of the last model call that reports it' }, { label: 'Prompt limit', sub: 'tokens', value: fmtN(context.prompt_limit), title: 'maxPromptTokens of the last model call that reports it' }, { label: 'Share of limit', value: fmtShare(context.limit_share), title: 'Last call, as a share of the prompt limit' }, { label: 'Request size', value: fmtBytes(context.request_bytes_last), sub: context.request_bytes_peak == null ? '' : 'peak ' + fmtBytes(context.request_bytes_peak), title: 'requestBodyBytes of the last model call that reports it, before compression' }]}/>
        ${a.parent_id ? null : html`<div class="bd-note">${split ? 'Split at the last shutdown, ' + stamp(split.ts, true) + '.' : 'Split at shutdown: not known. The session wrote no shutdown record that aictl holds.'}</div>
        <${Stats} stats=${[{ label: 'Total at shutdown', sub: 'tokens', value: fmtN(split?.current), title: 'currentTokens of the last shutdown record' }, { label: 'System', sub: 'tokens', value: fmtN(split?.system), title: 'systemTokens of the last shutdown record' }, { label: 'Conversation', sub: 'tokens', value: fmtN(split?.conversation), title: 'conversationTokens of the last shutdown record' }, { label: 'Tool definitions', sub: 'tokens', value: fmtN(split?.tools), title: 'toolDefinitionsTokens of the last shutdown record' }]}/>`}
      ` : null}
      <div class="bd-note">${copilot
        ? 'First, last and peak are input, cache read and cache write of each call. Copilot compaction figures count the conversation only, without the system prompt and tools.'
        : 'Input, cache read and cache write of each call. This tool reports the total, not how it splits into instructions, tools and conversation.'}</div>
      ${context.compactions?.length ? html`<${Table} def=${compactionDef} label="Compactions"/>` : null}
    </${FixedPanel}>` : null}
    ${a.parent_id ? null : html`<${FixedPanel} id="actxf" title="Files that can affect this session" sub=${cf.git_root ? fmtN(cf.total) + ' files of ' + cf.git_root + ' that apply to the session folder' + (cf.total > cf.files.length ? ', ' + cf.files.length + ' listed' : '') : 'No git repository'}><${Table} def=${ctxFiles} label="Files that can affect this session"/></${FixedPanel}>`}
    <${FixedPanel} id="askill" title="Skills used" sub=${(data.skills || []).length ? data.skills.reduce((n, x) => n + x.uses, 0) + ' uses of ' + data.skills.length + ' skills' + (a.parent_id ? '' : ', with its subagents') : 'None in this session'}><${Table} def=${skills} label="Skills used"/></${FixedPanel}>
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
      const tools = t.tools ? toolListText(t.tools) + ' tool calls' : '';
      return { id: i, sort: { at: t.ts, i: t.input, o: t.output, c: t.cache_read, l: t.reply_ms }, cells: { at: { v: stamp(t.ts), cls: 'dim' }, text: { v: t.text || tools || 'Reply only', cls: t.text ? '' : 'dim' }, m: { v: t.model || NA, cls: 'dim' }, i: { v: fmtN(t.input) }, o: { v: fmtN(t.output) }, c: { v: fmtN(t.cache_read) }, l: { v: fmtMs(t.reply_ms) } } };
    }),
    sort: { k: 'at', dir: 'asc' }, limit: 120, none: 'No turns recorded.',
  }), [data]);
  return html`<${FixedPanel} id="at" title="Turns, oldest first"><${Table} def=${def} label="Turns"/></${FixedPanel}>`;
}

const sizeTip = 'Size of the arguments sent to the tool and of the result it returned, as text. Calls read before aictl recorded sizes have none.';

function ToolsTab({ data, pending }) {
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '58px' }, { k: 'n', l: 'Tool', w: '120px' }, { k: 'tg', l: 'Target' }, { k: 'ms', l: 'Took', n: true, w: '58px' }, { k: 'in', l: 'In', n: true, w: '56px', t: sizeTip }, { k: 'out', l: 'Out', n: true, w: '58px', t: sizeTip }, { k: 'ok', l: 'Result', w: '52px' }, { k: 'conf', l: 'Confirm', w: '66px' }],
    rows: (data.tool_calls || []).map((c, i) => ({ id: i, sort: { at: c.ts, ms: c.duration_ms, n: c.name, tg: c.target, in: c.input_bytes, out: c.output_bytes, ok: c.failed ? 1 : 0, conf: c.confirm }, cells: { at: { v: stamp(c.ts), cls: 'dim' }, n: { v: c.name, cls: 'm' }, tg: { v: c.target || NA, cls: 'm dim', path: !!c.target, title: c.target || '' }, ms: { v: fmtMs(c.duration_ms) }, in: { v: fmtBytes(c.input_bytes), cls: 'dim' }, out: { v: fmtBytes(c.output_bytes) }, ok: { v: c.failed ? 'Failed' : 'OK', cls: c.failed ? 'crit' : 'dim' }, conf: { v: c.confirm || NA, cls: 'dim' } } })),
    sort: { k: 'at', dir: 'desc' }, limit: 120, none: 'No tool calls recorded.',
  }), [data]);
  const totals = useMemo(() => ({
    cols: [{ k: 'n', l: 'Tool' }, { k: 'c', l: 'Calls', n: true, w: '52px' }, { k: 'f', l: 'Failed', n: true, w: '50px' },
      { k: 'p50', l: 'Median', n: true, w: '60px', t: 'Median run time of one call' }, { k: 'p95', l: 'p95', n: true, w: '58px', t: '95 of 100 calls took this long or less' }, { k: 'max', l: 'Max', n: true, w: '58px' },
      { k: 'ms', l: 'Total time', n: true, w: '70px' }, { k: 'in', l: 'Avg in', n: true, w: '62px', t: sizeTip }, { k: 'out', l: 'Avg out', n: true, w: '64px', t: sizeTip }, { k: 'tout', l: 'Total out', n: true, w: '70px', t: sizeTip }],
    rows: (data.tool_totals || []).map(t => ({
      id: t.name,
      sort: { n: t.name, c: t.calls, f: t.failed, p50: t.p50_ms, p95: t.p95_ms, max: t.max_ms, ms: t.total_ms, in: t.avg_input_bytes, out: t.avg_output_bytes, tout: t.output_bytes },
      cells: {
        n: { v: t.name, cls: 'm', chips: t.mcp_server != null ? [{ text: t.mcp_server ? 'MCP ' + t.mcp_server : 'MCP', title: 'A tool of an MCP server' }] : null },
        c: { v: fmtN(t.calls) }, f: { v: t.failed, cls: t.failed ? 'crit' : 'dim' },
        p50: { v: fmtMs(t.p50_ms) }, p95: { v: fmtMs(t.p95_ms) }, max: { v: fmtMs(t.max_ms), cls: 'dim' }, ms: { v: fmtMs(t.total_ms), cls: 'dim' },
        in: { v: fmtBytes(t.avg_input_bytes), cls: 'dim' }, out: { v: fmtBytes(t.avg_output_bytes) }, tout: { v: fmtBytes(t.output_bytes), cls: 'dim', title: t.max_output_bytes != null ? 'Largest result ' + fmtBytes(t.max_output_bytes) : '' },
      },
    })),
    sort: { k: 'c', dir: 'desc' }, limit: 40, none: 'No tool calls recorded.',
  }), [data]);
  // MCP servers: each server's tools added up. Medians do not add up, so the time is a total.
  const servers = useMemo(() => {
    const by = new Map();
    for (const t of data.tool_totals || []) {
      if (t.mcp_server == null) continue;
      const k = t.mcp_server || 'Server not named';
      const s = by.get(k) || { k, tools: 0, calls: 0, failed: 0, ms: 0, out: 0, hasOut: false };
      s.tools += 1; s.calls += t.calls; s.failed += t.failed; s.ms += t.total_ms || 0;
      if (t.output_bytes != null) { s.out += t.output_bytes; s.hasOut = true; }
      by.set(k, s);
    }
    return {
      cols: [{ k: 'k', l: 'MCP server' }, { k: 'tools', l: 'Tools', n: true, w: '48px' }, { k: 'c', l: 'Calls', n: true, w: '52px' }, { k: 'f', l: 'Failed', n: true, w: '50px' }, { k: 'ms', l: 'Total time', n: true, w: '70px' }, { k: 'avg', l: 'Avg time', n: true, w: '64px' }, { k: 'out', l: 'Total out', n: true, w: '70px', t: sizeTip }],
      rows: [...by.values()].map(s => ({
        id: s.k, sort: { k: s.k, tools: s.tools, c: s.calls, f: s.failed, ms: s.ms || null, avg: s.ms ? s.ms / s.calls : null, out: s.hasOut ? s.out : null },
        cells: { k: { v: s.k, cls: 'm' }, tools: { v: s.tools }, c: { v: fmtN(s.calls) }, f: { v: s.failed, cls: s.failed ? 'crit' : 'dim' }, ms: { v: fmtMs(s.ms || null), cls: 'dim' }, avg: { v: fmtMs(s.ms ? s.ms / s.calls : null) }, out: { v: s.hasOut ? fmtBytes(s.out) : NA, cls: 'dim' } },
      })),
      sort: { k: 'c', dir: 'desc' }, none: 'This agent called no MCP server.',
    };
  }, [data]);
  return html`${pending ? html`<${FixedPanel} id="ap2" title="Waiting for your confirmation"><div class="bd-ptext">${pending.name + ': ' + pending.target}</div></${FixedPanel}>` : null}
    <${FixedPanel} id="att" title="Tools used" sub=${'All ' + fmtN((data.tool_totals || []).reduce((a, t) => a + t.calls, 0)) + ' calls' + (data.agent?.parent_id ? '' : ', with its subagents')}><${Table} def=${totals} label="Tools used"/></${FixedPanel}>
    <${FixedPanel} id="amcp" title="MCP servers" sub=${servers.rows.length ? servers.rows.length + ' servers, ' + fmtN(servers.rows.reduce((n, r) => n + r.sort.c, 0)) + ' calls' : 'None called'}><${Table} def=${servers} label="MCP servers"/></${FixedPanel}>
    <${FixedPanel} id="atc" title="Tool calls" sub=${data.agent?.tool_calls > (data.tool_calls || []).length ? 'Newest ' + (data.tool_calls || []).length + ' of ' + data.agent.tool_calls + ', with calls of its subagents' : ''}><${Table} def=${def} label="Tool calls"/></${FixedPanel}>`;
}

function ChangesTab({ data, act }) {
  const files = useMemo(() => ({
    cols: [{ k: 'f', l: 'File' }, { k: 'l', l: 'Lines', n: true, w: '90px' }, { k: 'n', l: 'Edits', n: true, w: '46px' }],
    rows: (data.files || []).map(f => ({ id: f.path, go: () => act.openDrawer({ type: 'file', path: f.path }), sort: { f: f.path, l: (f.lines_added || 0) + (f.lines_removed || 0), n: f.edits }, cells: { f: { v: f.path, cls: 'm', path: true, title: f.path }, l: { v: fmtLines(f.lines_added, f.lines_removed) }, n: { v: f.edits ?? NA } } })),
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

const bare = e => !e.detail || (e.key === 'api:api_error' && e.detail === 'api_error');

function ErrorsTab({ data }) {
  const { loop } = data;
  const rows = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '60px' }, { k: 'k', l: 'What', w: '160px' }, { k: 'd', l: 'Detail' }],
    rows: (data.errors || []).map((e, i) => ({ id: i, sort: { at: e.ts }, cells: { at: { v: stamp(e.ts), cls: 'dim' }, k: { v: errorLabel(e.key), title: e.key }, d: bare(e) ? { v: 'No detail recorded', cls: 'dim' } : { v: e.detail || NA, cls: 'm dim' } } })),
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
  return html`<${Frame} ...${frame} title=${d.name} sub=${data ? (data.total ?? (data.calls || []).length) + ' calls in this time' + ((data.total ?? 0) > (data.calls || []).length ? ', newest ' + data.calls.length + ' listed' : '') : 'Loading...'}>
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
function useExcerpt(path, line, version = 0) {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!path || !line) { setState(null); return undefined; }
    let live = true;
    api.getBoardExcerpt(path, line).then((r) => {
      if (live) setState({ lines: r.lines.map(x => ({ n: x.n, text: x.text, kind: x.n === line ? 'hit' : 'same' })) });
    }).catch((e) => { if (live) setState({ error: e?.message || 'The file cannot be read.' }); });
    return () => { live = false; };
  }, [path, line, version]);
  return state;
}

const CONTEXT_FILE = /(^|[\\/])\.context\.toml$/;

function FileDrawer({ d, ctx, frame, act }) {
  const { data, error } = useDetail(opts => api.getBoardFile(d.path, ctx.query, opts), 'file:' + d.path + ':' + ctx.query);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);
  const excerpt = useExcerpt(d.path, d.line, version);
  const fileActions = [
    editing ? null : { label: 'Edit file', go: () => setEditing(true) },
    CONTEXT_FILE.test(d.path) && act.runCommand ? { label: 'Deploy the context', go: () => act.runCommand({ title: 'Deploy the context files', lead: 'This writes every tool\'s native files from the .context.toml files of the project, the same as the command below.', command: 'aictl ctx deploy', applyLabel: 'Run this command', action: 'ctx-deploy', done: 'Deployed the context' }) } : null,
  ].filter(Boolean);
  const def = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '110px' }, { k: 'ag', l: 'Agent' }, { k: 'ch', l: 'Lines', n: true, w: '80px' }],
    rows: (data?.edits || []).map((e, i) => ({ id: i, go: e.agent_id ? () => act.openDrawer({ type: 'agent', id: e.agent_id, tab: 'changes' }) : null, sort: { at: e.ts }, cells: { at: { v: stamp(e.ts, true), cls: 'dim' }, ag: { v: e.title || NA }, ch: { v: fmtLines(e.lines_added, e.lines_removed) } } })),
    sort: { k: 'at', dir: 'desc' }, none: 'No agent edited this file in this time.', primary: 'ag',
  }), [data]);
  const sub = d.line ? 'Line ' + d.line : (data?.diff ? 'Diff of the last edit' : '');
  return html`<${Frame} ...${frame} title=${d.path} sub=${sub}>
    <${FixedPanel} id="edit" title=${editing ? 'Edit' : 'Actions'} sub=${editing ? d.path : ''}>
      ${editing ? html`<${FileEditor} path=${d.path} onClose=${() => setEditing(false)} onSaved=${() => setVersion(v => v + 1)}/>` : html`<${Actions} actions=${fileActions}/>`}
    </${FixedPanel}>
    ${excerpt?.error ? html`<${FixedPanel} id="code" title="File"><div class="bd-empty" role="status">${excerpt.error}</div></${FixedPanel}>` : null}
    ${excerpt?.lines ? html`<${FixedPanel} id="code" title="File"><${CodeLines} lines=${excerpt.lines}/><div class="bd-note">Values under names that look like secrets are never shown.</div></${FixedPanel}>` : null}
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
    ${data ? html`<${FixedPanel} id="ptxt" title="Full text"><${TextView} text=${text} source=${html`<div class="bd-ptext">${text}</div>`}/>${data.prompt_file ? html`<div class="bd-ptext">${'Uses the prompt file ' + data.prompt_file}</div>` : null}</${FixedPanel}>
      <${FixedPanel} id="pst" title="What it cost">
        <${Stats} stats=${[{ label: 'Cost', value: fmtUsd(data.cost_usd) }, { label: 'Input', value: fmtN(data.input) }, { label: 'Output', value: fmtN(data.output) }, { label: 'Cache read', value: fmtN(data.cache_read) }, { label: 'Cache write', value: fmtN(data.cache_write) }, { label: 'Model calls', value: fmtN(data.calls), sub: data.subagent_calls ? data.subagent_calls + ' by subagents' : '' }, { label: 'Model time', value: fmtMs(data.reply_ms), title: 'The time of all model calls added up. Calls can overlap.' }, { label: 'Tool calls', value: data.tool_calls ?? NA }]}/>
        ${d.agent_id ? html`<${Actions} actions=${[{ label: 'Open agent', go: () => act.openDrawer({ type: 'agent', id: d.agent_id, tab: 'overview' }) }]}/>` : null}
      </${FixedPanel}>` : html`<${Pending} error=${error}/>`}
  </${Frame}>`;
}

function SkillDrawer({ d, ctx, frame, act }) {
  const { data, error } = useDetail(opts => api.getBoardSkill(d.name, ctx.query, opts), 'skill:' + d.name + ':' + ctx.query);
  const locations = data?.locations || [];
  const whereDef = useMemo(() => ({
    cols: [{ k: 'sc', l: 'Scope', w: '74px' }, { k: 'who', l: 'Who can see it' }, { k: 'start', l: 'Who can start it', w: '170px' }, { k: 'tools', l: 'Tools that read it', w: '200px' }, { k: 'path', l: 'File', w: '280px' }],
    rows: locations.map(l => ({
      id: l.path, sort: { sc: l.scope, path: l.path },
      cells: { sc: { v: l.scope }, who: (extra => ({ v: l.reach, sub: extra, warn: !!l.blocked, title: [l.reach, extra].filter(Boolean).join('\n') }))([l.blocked, l.note].filter(Boolean).join(' ')), start: { v: l.starter, title: [l.starter, l.allowed_tools ? 'Tools allowed without asking: ' + l.allowed_tools : ''].filter(Boolean).join('\n'), sub: l.allowed_tools ? 'Allowed tools: ' + l.allowed_tools : '' }, tools: (txt => ({ v: txt, cls: 'dim', title: txt }))(l.tools.map(ctx.toolName).join(', ')), path: { v: l.path, cls: 'm', title: l.path } },
    })),
    none: 'aictl found no file with this name. The tool can include the skill, your organization can host it, or its file can be in a folder that this machine does not have.', primary: 'who',
  }), [data]);
  const useDef = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '110px' }, { k: 'ag', l: 'Agent' }, { k: 'tool', l: 'Tool', w: '130px' }, { k: 'proj', l: 'Project', w: '150px' }, { k: 'how', l: 'Started by', w: '110px' }],
    rows: (data?.calls || []).map((c, i) => ({
      id: i, go: c.agent_id ? () => act.openDrawer({ type: 'agent', id: c.agent_id, tab: 'overview' }) : null,
      sort: { at: c.ts, tool: c.tool, proj: c.project, how: c.trigger },
      cells: { at: { v: stamp(c.ts, true), cls: 'dim' }, ag: { v: c.title || c.agent_id, title: c.title || c.agent_id }, tool: { v: ctx.toolName(c.tool) }, proj: { v: projectName(c.project), cls: 'dim', title: c.project || '' }, how: { v: c.trigger || NA, cls: 'dim' } },
    })),
    sort: { k: 'at', dir: 'desc' }, limit: 80, none: 'No uses in this time.', primary: 'ag',
  }), [data]);
  const readDef = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '110px' }, { k: 'ag', l: 'Agent' }, { k: 'tool', l: 'Tool', w: '130px' }, { k: 'proj', l: 'Project', w: '150px' }],
    rows: (data?.reads || []).map((c, i) => ({
      id: i, go: c.agent_id ? () => act.openDrawer({ type: 'agent', id: c.agent_id, tab: 'overview' }) : null,
      sort: { at: c.ts, tool: c.tool, proj: c.project },
      cells: { at: { v: stamp(c.ts, true), cls: 'dim' }, ag: { v: c.title || c.agent_id, title: c.title || c.agent_id }, tool: { v: ctx.toolName(c.tool) }, proj: { v: projectName(c.project), cls: 'dim', title: c.project || '' } },
    })),
    sort: { k: 'at', dir: 'desc' }, limit: 80, none: 'No reads of the skill file in this time.', primary: 'ag',
  }), [data]);
  const tokens = d.summary?.tokens;
  const fileTokens = d.summary?.file_tokens ?? (locations[0]?.content ? Math.round(locations[0].content.length / 4) : null);
  const description = locations.find(l => l.description)?.description || d.summary?.description;
  const sub = data ? [locations.length ? [...new Set(locations.map(l => l.scope))].join(', ') : 'No file found', data.uses + ' uses in this time'].join(', ') : 'Loading...';
  return html`<${Frame} ...${frame} title=${d.name} sub=${sub}>
    ${data ? html`
      <${FixedPanel} id="skwhere" title="Who can see it" sub=${description || ''}>
        ${description ? html`<div class="bd-note">${description}</div>` : null}
        <${Table} def=${whereDef} label="Who can see it"/>
      </${FixedPanel}>
      <${FixedPanel} id="skuse" title="Usage">
        <${Stats} stats=${[{ label: 'Uses in this time', value: fmtN(data.uses) }, { label: 'Agents in this time', value: fmtN(data.agents) }, { label: 'File reads in this time', value: data.file_reads == null ? NA : fmtN(data.file_reads), title: 'Reads of SKILL.md with a file-read tool. Counted apart from the uses, and not counted when the same turn started the skill' }, { label: 'Tokens in those turns', value: fmtN(tokens), title: 'All tokens of every agent in those turns, not only the skill' }, { label: 'Skill file', value: fileTokens != null ? '~' + fmtN(fileTokens) : NA, title: 'Estimate at four characters per token' }, { label: 'Uses kept', value: fmtN(data.total_uses), title: 'All uses in the history that aictl keeps' }, { label: 'First use', value: data.first_ts ? stamp(data.first_ts, true) : NA }, { label: 'Last use', value: data.last_ts ? stamp(data.last_ts, true) : NA }]}/>
        <${Table} def=${useDef} label="Usage"/>
        ${data.file_reads ? html`<${Table} def=${readDef} label="File reads"/>` : null}
      </${FixedPanel}>
      ${locations.map((l, i) => html`<${FixedPanel} key=${l.path} id=${'sktext' + i} title="Content" sub=${l.path}>
        ${l.same_as ? html`<div class="bd-note">Same text as ${l.same_as}.</div>` : l.content == null ? html`<div class="bd-empty">This file is not readable.</div>` : html`<${TextView} text=${l.content} path=${l.path} source=${html`<div class="bd-ptext">${l.content}</div>`}/>`}
        ${l.truncated ? html`<div class="bd-note">The first 100,000 characters are shown.</div>` : null}
        ${l.content != null ? html`<div class="bd-note">Values under names that look like secrets are masked.</div>` : null}
      </${FixedPanel}>`)}`
      : html`<${Pending} error=${error}/>`}
  </${Frame}>`;
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2, info: 3 };
const whereText = (path, line) => (line ? path + ':' + line : path || NA);

function HiddenDrawer({ ctx, frame, act }) {
  const { audit: raw, loading, error, scan, incomplete, failed } = ctx.findings;
  const audit = useMemo(() => scopeAudit(raw, ctx.tools), [raw, ctx.tools]);
  const openFile = (path, line) => (path ? () => act.openDrawer({ type: 'file', path, line }) : null);
  const findings = audit?.findings || [];
  const sources = audit?.sources || [];
  const findingDef = useMemo(() => ({
    cols: [{ k: 'sev', l: 'Severity', w: '84px' }, { k: 'rule', l: 'Finding', w: '220px' }, { k: 'where', l: 'Where', w: '260px' }, { k: 'why', l: 'Why it matters' }, { k: 'todo', l: 'What to do' }, { k: 'for', l: 'Applies to', w: '170px' }],
    rows: findings.map((f, i) => ({
      id: i, go: openFile(f.path, f.line),
      sort: { sev: SEVERITY_RANK[f.severity] ?? 9, rule: f.rule, where: f.path },
      cells: { sev: { v: f.severity, warn: f.severity === 'high' || f.severity === 'medium' }, rule: { v: f.rule + (f.count > 1 ? ' x' + f.count : ''), cls: 'm' }, where: { v: whereText(f.path, f.line), cls: 'm', title: whereText(f.path, f.line) }, why: { v: f.why, cls: 'dim', title: f.why }, todo: { v: f.action || NA, cls: 'dim', title: f.action || '' }, for: (txt => ({ v: txt || NA, cls: 'dim', title: txt }))([(f.tools || []).map(ctx.toolName).join(', '), f.session_id ? 'session ' + f.session_id : ''].filter(Boolean).join(', ')) },
    })),
    sort: { k: 'sev', dir: 'asc' }, none: 'No findings for the selected tools.', primary: 'rule',
  }), [findings]);
  const sourceDef = useMemo(() => ({
    cols: [{ k: 'tool', l: 'Tool', w: '130px' }, { k: 'scope', l: 'Scope', w: '80px' }, { k: 'load', l: 'Loading', w: '120px' }, { k: 'size', l: 'Size', n: true, w: '80px' }, { k: 'tok', l: 'Tokens', n: true, w: '70px', t: 'Estimate at four characters per token' }, { k: 'seen', l: 'Seen loaded', n: true, w: '90px', t: 'Session files read that show this file loaded. n/a: this tool has no such record.' }, { k: 'git', l: 'Git', w: '80px' }, { k: 'path', l: 'Path' }],
    rows: sources.map(s => ({
      id: s.tool + '|' + s.path, go: s.kind === 'skill' ? () => act.openDrawer({ type: 'skill', name: s.path.split(/[\\/]/).slice(-2)[0] }) : openFile(s.path),
      sort: { tool: s.tool, scope: s.scope, load: s.loading, size: s.bytes, tok: s.est_tokens, seen: s.loaded_sessions, git: s.git_state, path: s.path },
      cells: { tool: { v: ctx.toolName(s.tool), sw: colorFor('tool', s.tool) }, scope: { v: s.scope }, load: { v: s.readable ? s.loading : s.loading + ' (no file shows this)' }, size: { v: s.readable === false && !s.bytes ? NA : fmtBytes(s.bytes) }, tok: { v: s.readable === false && !s.est_tokens ? NA : '~' + fmtN(s.est_tokens) }, seen: { v: s.loaded_sessions == null ? NA : s.loaded_sessions + ' of ' + audit.transcripts_read }, git: { v: s.git_state || NA, cls: 'dim' }, path: { v: s.path + (s.symlink_target ? ' -> ' + s.symlink_target : ''), sub: [s.note, s.in_project ? '' : s.why_in_effect].filter(Boolean).join(' '), cls: 'm', title: [s.path, s.symlink_target, s.note, s.why_in_effect, s.origin].filter(Boolean).join('\n') } },
    })),
    sort: { k: 'tok', dir: 'desc' }, none: 'No sources for the selected tools.', primary: 'path',
  }), [sources]);
  const modelDef = useMemo(() => ({
    cols: [{ k: 'tool', l: 'Tool', w: '130px' }, { k: 'val', l: 'Model', w: '160px' }, { k: 'where', l: 'Set in', w: '280px' }, { k: 'why', l: 'Why it is in force' }],
    rows: Object.entries(audit?.effective_models || {}).map(([id, m]) => ({
      id, go: openFile(m.source, m.line),
      sort: { tool: m.tool || id, val: m.value },
      cells: { tool: { v: ctx.toolName(m.tool || id), sw: colorFor('tool', m.tool || id) }, val: { v: m.value || 'No pin', warn: (m.conflicts || []).length > 0 }, where: { v: m.value ? whereText(m.source, m.line) : NA, cls: 'm', title: m.source || '' }, why: { v: m.why_in_effect || NA, cls: 'dim', title: m.why_in_effect || '' } },
    })),
    none: 'No model settings found.', primary: 'tool',
  }), [audit]);
  const pinDef = useMemo(() => ({
    cols: [{ k: 'kind', l: 'Kind', w: '110px' }, { k: 'tool', l: 'Tool', w: '130px' }, { k: 'val', l: 'Value', w: '220px' }, { k: 'where', l: 'Where', w: '280px' }, { k: 'note', l: 'Detail' }],
    rows: Object.entries(audit?.effective_models || {}).flatMap(([id, m]) => {
      const tool = m.tool || id;
      const row = (kind, val, path, line, note, warn) => ({
        id: [kind, tool, path, line, val].join('|'), go: openFile(path, line),
        sort: { kind, tool, val, where: path },
        cells: { kind: { v: kind, warn }, tool: { v: ctx.toolName(tool) }, val: { v: val || NA, title: val || '' }, where: { v: whereText(path, line), cls: 'm', title: whereText(path, line) }, note: { v: note || NA, cls: 'dim', title: note || '' } },
      });
      return [
        ...(m.conflicts || []).map(c => row('Conflict', (c.request?.values || []).join(', '), c.request?.path, c.request?.line, c.pin ? c.pin.value + ' is pinned at ' + whereText(c.pin.path, c.pin.line) : '', true)),
        ...(m.overrides || []).map(o => row('Overridden', o.value, o.path, o.line, o.scope)),
        ...(m.limited || []).map(p => row('Limited', p.value, p.path, p.line, [p.applies, p.in_project ? 'in this project' : 'not in this project', p.why_in_effect].filter(Boolean).join(', '))),
      ];
    }),
    none: 'No conflicts, overridden values or limited pins.', primary: 'val',
  }), [audit]);
  const unattributedDef = useMemo(() => ({
    cols: [{ k: 'tool', l: 'Tool', w: '130px' }, { k: 'left', l: 'Not explained', n: true, w: '100px' }, { k: 'first', l: 'First request', n: true, w: '100px' }, { k: 'inv', l: 'Files', n: true, w: '80px' }, { k: 'dyn', l: 'Dynamic', n: true, w: '80px' }, { k: 'built', l: 'Built-in', n: true, w: '80px' }, { k: 'n', l: 'Sessions', n: true, w: '76px' }, { k: 'how', l: 'Method' }],
    rows: (audit?.unattributed || []).map(r => ({
      id: r.tool, sort: { tool: r.tool, left: r.residual_tokens, first: r.first_request_tokens_median },
      cells: { tool: { v: ctx.toolName(r.tool) }, left: { v: fmtN(r.residual_tokens) }, first: { v: fmtN(r.first_request_tokens_median) }, inv: { v: fmtN(r.inventory_always_tokens) }, dyn: { v: fmtN(r.dynamic_tokens) }, built: { v: fmtN(r.builtin_allowance_tokens) }, n: { v: fmtN(r.sessions_sampled) }, how: { v: r.method || NA, cls: 'dim', title: r.method || '' } },
    })),
    none: 'Nothing to explain.', primary: 'tool',
  }), [audit]);
  const drift = audit?.drift;
  const driftRows = drift && !drift.baseline_created ? [
    ...['new', 'changed', 'removed'].flatMap(kind => (drift[kind] || []).map(r => ({ kind, ...r }))),
    ...(drift.agent_writes || []).map(w => ({ kind: 'agent write', path: w.path, note: 'Session ' + w.session_id + ', via ' + w.via })),
  ] : [];
  const driftDef = useMemo(() => ({
    cols: [{ k: 'kind', l: 'Change', w: '84px' }, { k: 'tool', l: 'Tool', w: '130px' }, { k: 'path', l: 'Path' }, { k: 'note', l: 'Detail', w: '260px' }],
    rows: driftRows.map(r => ({ id: r.kind + r.path + (r.note || ''), go: r.kind === 'removed' ? null : openFile(r.path), sort: { kind: r.kind, tool: r.tool, path: r.path }, cells: { kind: { v: r.kind }, tool: { v: r.tool ? ctx.toolName(r.tool) : NA }, path: { v: r.path, cls: 'm', title: r.path }, note: { v: r.note || NA, cls: 'dim', title: r.note || '' } } })),
    none: 'No changes since the last scan.', primary: 'path',
  }), [audit]);
  const counts = audit?.counts || {};
  const perToolDef = useMemo(() => ({
    cols: [{ k: 'tool', l: 'Tool' }, { k: 'tok', l: 'Tokens each call, estimate', n: true, w: '170px' }, { k: 'size', l: 'Size', n: true, w: '80px' }, { k: 'n', l: 'Files', n: true, w: '60px' }],
    rows: instructionsByTool(sources, ctx.settingToolIds || []).map(r => ({
      id: r.tool, sort: { tool: r.tool, tok: r.tokens, size: r.bytes, n: r.files },
      cells: { tool: { v: ctx.toolName(r.tool), sw: colorFor('tool', r.tool) }, tok: { v: r.tokens == null ? NA : '~' + fmtN(r.tokens) }, size: { v: fmtBytes(r.bytes) }, n: { v: r.files, sub: r.unread ? r.unread + ' not readable' : '' } },
    })),
    sort: { k: 'tok', dir: 'desc' }, none: 'No instruction file is always sent for the selected tools.', primary: 'tool',
  }), [sources]);
  const wanted = ctx.filters?.project && ctx.filters.project !== 'all' ? ctx.filters.project : null;
  const scanText = [audit?.project ? 'Project ' + audit.project : '', loading ? 'Reading the settings...' + (scan ? ' ' + scan.step + ', ' + Math.round(scan.elapsed_s) + ' s' : '')
    : audit ? 'Scanned ' + stamp(audit.scanned_at, true) + ' in ' + fmtMs(audit.duration_ms) : ''].filter(Boolean).join(', ');
  return html`<${Frame} ...${frame} title="Hidden context" sub=${scanText} actions=${[{ label: 'Rescan', go: act.rescan }]}>
    ${error ? html`<div class="bd-empty" role="alert">Could not read the settings: ${error}</div>` : null}
    ${!audit && !error ? html`<div class="bd-empty" role="status">${scanText || 'Loading...'}</div>` : null}
    ${audit ? html`
      <${FixedPanel} id="hsum" title="Summary">
        <${Stats} stats=${[{ label: 'High', value: fmtN(counts.high || 0) }, { label: 'Medium', value: fmtN(counts.medium || 0) }, { label: 'Low', value: fmtN(counts.low || 0) }, { label: 'Info', value: fmtN(counts.info || 0) }, { label: 'Sources', value: fmtN(sources.length) }, { label: 'Project scanned', value: projectName(audit.project) || NA, title: audit.project }]}/>
        ${!loading && wanted && audit.project && wanted !== audit.project ? html`<div class="bd-note">The Project filter is ${wanted}, which is not a folder on this machine. This scan is of ${audit.project}.</div>` : null}
        ${incomplete.length ? html`<div class="bd-note">The scan reached its time limit and skipped: ${incomplete.join(', ')}.</div>` : null}
        ${failed.map(f => html`<div class="bd-note" key=${f.step}>The scan could not read ${f.step}: ${f.error}</div>`)}
      </${FixedPanel}>
      <${FixedPanel} id="hsent" title="Instruction files sent each call" sub="Estimate from instruction files, at four characters per token"><${Table} def=${perToolDef} label="Instruction files sent each call"/><div class="bd-note">Each tool has its own context, so these do not add up. The system prompt, tool definitions and conversation are not in this estimate.</div></${FixedPanel}>
      <${FixedPanel} id="hmod" title="Model in force"><${Table} def=${modelDef} label="Model in force"/></${FixedPanel}>
      <${FixedPanel} id="hpin" title="Other model settings" sub="Conflicts, overridden values and pins limited to one agent, prompt or setting"><${Table} def=${pinDef} label="Other model settings"/></${FixedPanel}>
      <${FixedPanel} id="hfind" title="Findings" sub=${findings.length + ' for the selected tools'}><${Table} def=${findingDef} label="Findings"/></${FixedPanel}>
      <${FixedPanel} id="hsrc" title="Every source" sub=${sources.length + ' files and settings that reach the model'}><${Table} def=${sourceDef} label="Every source"/></${FixedPanel}>
      ${(audit.unattributed || []).length ? html`<${FixedPanel} id="hun" title="Tokens not explained" sub="Estimate: the median first request less the files, dynamic text and built-in allowance"><${Table} def=${unattributedDef} label="Tokens not explained"/></${FixedPanel}>` : null}
      ${drift?.baseline_created ? html`<div class="bd-note">Baseline created now. Later changes will show here.</div>` : null}
      ${drift && !drift.baseline_created ? html`<${FixedPanel} id="hdrift" title="Changes since the last scan" sub=${driftRows.length + ' changed'}><${Table} def=${driftDef} label="Changes since the last scan"/></${FixedPanel}>` : null}` : null}
  </${Frame}>`;
}

const VIEWS = { agent: AgentDrawer, tool: ToolDrawer, error: ErrorDrawer, file: FileDrawer, prompt: PromptDrawer, hidden: HiddenDrawer, skill: SkillDrawer };

export default function Drawer({ stack, ctx, act }) {
  const d = stack[stack.length - 1];
  const View = VIEWS[d.type];
  if (!View) return null;
  const frame = { canBack: stack.length > 1, back: act.drawerBack, close: act.drawerClose };
  return html`<${View} d=${d} ctx=${ctx} act=${act} frame=${frame} key=${d.type}/>`;
}
