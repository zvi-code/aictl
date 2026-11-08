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

export function FixedPanel({ id, title, sub, span = 12, go, children }) {
  const [open, setOpen] = useState(true);
  const label = open ? 'Fold this panel' : 'Unfold this panel';
  return html`<section class=${'bd-panel' + (open ? '' : ' bd-folded')} id=${'dr-' + id} style=${'grid-column:span ' + span} aria-label=${title}>
    <div class="bd-ph bd-ph-fixed">
      <h3>${title}</h3><span class="bd-psub" title=${sub || ''}>${sub || ''}</span>
      ${go ? html`<button type="button" class="bd-plink" onClick=${go.pick}>${go.label + ' →'}</button>` : null}
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

/** One labelled value in the drawer header: a status with its dot, the tool, the project, a short id with a copy button. */
function MetaChip({ k, v, sub, title, dot, mono, copy }) {
  return html`<span class=${'bd-kv' + (mono ? ' bd-kv-mono' : '')} title=${title || (k ? k + ': ' + v : v)}>
    ${dot ? html`<i class="bd-kvdot" style=${{ background: dot }}></i>` : null}
    ${k ? html`<span class="bd-kvk">${k}</span>` : null}
    <b>${v}</b>${sub ? html`<span class="bd-kvs">${sub}</span>` : null}
    ${copy ? html`<button type="button" class="bd-kvcopy" aria-label=${copy.label} title=${copy.label} onClick=${copy.go}>Copy</button>` : null}
  </span>`;
}

function Frame({ title, sub, meta, head, canBack, back, close, actions, tabs, children }) {
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
    ${sub ? html`<div class="bd-drsub" title=${sub}>${sub}</div>` : null}
    ${meta || head ? html`<div class="bd-drmeta">${(meta || []).map(m => html`<${MetaChip} key=${m.k || m.v} ...${m}/>`)}${head || null}</div>` : null}
    ${tabs ? html`<div class="bd-tabs" role="tablist">${tabs.map(tb => (tb.sep
      ? html`<span key=${tb.id} class="bd-tabsep" aria-hidden="true"></span>`
      : html`<button key=${tb.id} type="button" role="tab" aria-selected=${tb.on ? 'true' : 'false'} onClick=${tb.pick}>${tb.label}${tb.count != null ? html`<i class="bd-tabn">${' ' + tb.count}</i>` : null}</button>`))}</div>` : null}
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
  // Three groups: what the agent did, what it changed, how it ran. A count on a tab is the rows it holds.
  const tabs = [
    ['overview', 'Overview'],
    ['context', 'Context'],
    ['instructions', 'Instructions', data?.context_files ? new Set((data.context_files.loaded || []).map(x => x.path)).size || null : null],
    ['transcript', 'Transcript'],
    ['flow', 'Flow'],
    ['timeline', 'Timeline'],
    ['turns', 'Turns', data ? (data.turns || []).length : null],
    ['tools', 'Tool calls', a.tool_calls != null ? a.tool_calls : data ? (data.tool_calls || []).length : null],
    ['errors', 'Failures and loops', data ? (data.errors || []).length + (data.loop ? 1 : 0) : null],
    ['sep1'],
    ['changes', 'Changes', data ? (data.files || []).length : null],
    ['artifacts', 'Artifacts', data ? data.artifacts_total : null],
    ['commits', 'Commits', data ? data.commits.length : null],
    ['sep2'],
    ['events', 'Events'],
    ['team', 'Team'],
    ['procs', 'Processes'],
    ['integrations', 'Integrations'],
  ].map(([id, label, count]) => (label ? { id, label, count, on: d.tab === id, pick: () => act.setDrawerTab(id) } : { id, sep: true }));
  const models = (a.models || []).join(', ');
  const sm = statusMeta(st);
  const dur = a.started_at ? fmtDur((a.ended_at || Date.now() / 1000) - a.started_at) : '';
  const meta = [
    st ? { v: sm.label, dot: sm.dot, sub: a.ended_at ? stamp(a.ended_at, true) + (dur ? ' · ' + dur : '') : dur ? dur + ' so far' : '', title: a.ended_at ? 'Ended ' + stamp(a.ended_at, true) + (a.started_at ? ', started ' + stamp(a.started_at, true) : '') : sm.label } : null,
    a.tool ? { k: 'Tool', v: ctx.toolName(a.tool) } : null,
    a.project ? { k: 'Project', v: projectName(a.project), title: a.project } : null,
    models ? { k: (a.models || []).length > 1 ? 'Models' : 'Model', v: models } : null,
    { k: 'ID', v: String(a.id).slice(0, 8), mono: true, title: a.id, copy: act.copy ? { label: 'Copy session ID ' + a.id, go: () => act.copy(a.id, 'Copied ' + a.id) } : null },
  ].filter(Boolean);
  // Only a main agent owns a process tree; a subagent stops with its parent.
  const actions = isLive(st) && !a.parent_id ? [{ label: 'Stop', go: () => act.stopAgent(a) }] : [];
  const body = () => {
    if (!data) return html`<${Pending} error=${error}/>`;
    if (d.tab === 'turns') return html`<${TurnsTab} data=${data}/>`;
    if (d.tab === 'tools') return html`<${ToolsTab} data=${data} pending=${pending}/>`;
    if (d.tab === 'changes') return html`<${ChangesTab} data=${data} act=${act}/>`;
    if (d.tab === 'errors') return html`<${ErrorsTab} data=${data}/>`;
    if (d.tab === 'context') return html`<${ContextTab} a=${a} data=${data} act=${act}/>`;
    if (d.tab === 'instructions') return html`<${InstructionsTab} a=${a} data=${data} act=${act}/>`;
    if (d.tab !== 'overview' && AGENT_PARTS[d.tab]) return html`<${Part} key=${d.tab} part=${d.tab} a=${a} data=${data} st=${st} ctx=${ctx} act=${act}/>`;
    return html`<${OverviewTab} a=${a} data=${data} st=${st} ctx=${ctx} act=${act} pending=${pending}/>
      <${Part} part="overview" name="OverviewExtras" a=${a} data=${data} st=${st} ctx=${ctx} act=${act}/>`;
  };
  const head = data?.git ? html`<${Part} part="overview" name="GitBadge" git=${data.git} a=${a}/>` : null;
  return html`<${Frame} ...${frame} title=${a.title ? titleOf(a) : a.id} meta=${meta} head=${head} tabs=${tabs} actions=${actions}>${body()}</${Frame}>`;
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

/** Shares of the shutdown split, in series order. A missing figure stays n/a; it is never drawn as 0. */
function splitParts(split) {
  return [
    { label: 'System prompt', v: split?.system, c: 'var(--s1)', title: 'systemTokens of the last shutdown record' },
    { label: 'Conversation', v: split?.conversation, c: 'var(--s2)', title: 'conversationTokens of the last shutdown record' },
    { label: 'Tool definitions', v: split?.tools, c: 'var(--s3)', title: 'toolDefinitionsTokens of the last shutdown record' },
  ];
}

/** Label and value pairs under a chart: a unit in the value, a detail in small type, unknown as n/a. */
function Facts({ facts }) {
  return html`<dl class="bd-facts">${facts.map(f => html`<div key=${f.label} title=${f.title || f.label}><dt>${f.label}</dt><dd class=${f.value === NA ? 'bd-na' : ''}>${f.value}${f.sub ? html`<small>${f.sub}</small>` : null}</dd></div>`)}</dl>`;
}

/** Context size: the last call against the limit, the growth per call, and for a Copilot session the split at shutdown. */
function ContextPanel({ a, context, copilot, subagents, act, compact = false, span = 0 }) {
  const split = context.split;
  const byAgent = useMemo(() => {
    const rows = context.by_agent || [];
    if (rows.length < 2) return null;
    const kids = new Map((subagents || []).map(k => [k.id, k]));
    return {
      cols: [{ k: 'n', l: 'Agent' }, { k: 'c', l: 'Calls', n: true, w: '50px' }, { k: 'f', l: 'First', n: true, w: '64px', t: 'What the first model call sent' }, { k: 'p', l: 'Peak', n: true, w: '64px' }, { k: 'l', l: 'Last', n: true, w: '64px' }],
      rows: rows.map(r => {
        const kid = r.agent_id ? kids.get(r.agent_id) : null;
        return {
          id: r.agent_id || 'main', go: r.agent_id ? () => act.openDrawer({ type: 'agent', id: r.agent_id, tab: 'overview' }) : null,
          sort: { n: r.agent_id ? 1 : 0, c: r.calls, f: r.first, p: r.peak, l: r.last },
          cells: { n: r.agent_id ? { v: kid?.role || kid?.title || r.agent_id, sub: kid?.short, title: r.agent_id } : { v: 'Main agent', title: 'The session itself, without its subagents' }, c: { v: fmtN(r.calls) }, f: { v: fmtN(r.first) }, p: { v: fmtN(r.peak) }, l: { v: fmtN(r.last) } },
        };
      }),
      sort: { k: 'n', dir: 'asc' }, primary: 'n',
    };
  }, [context, subagents]);
  const hasSplit = copilot && !a.parent_id;
  // In the Overview the split sits under the growth line; on the Context tab it sits beside it.
  const withSplit = hasSplit && !compact;
  const parts = splitParts(split);
  const known = parts.filter(p => p.v != null);
  const total = split?.current ?? (known.length ? known.reduce((n, p) => n + p.v, 0) : null);
  const peakText = context.peak == null || context.last == null ? '' : context.peak === context.last ? ' = peak' : ', peak ' + fmtN(context.peak);
  const share = context.limit_share;
  const compactionDef = useMemo(() => ({
    cols: [{ k: 'at', l: 'Time', w: '110px' }, { k: 'why', l: 'Trigger', w: '80px' }, { k: 'b', l: 'Before', n: true, t: 'Tokens before it, as the tool reports them' }, { k: 'a', l: 'After', n: true, t: 'Tokens after it, as the tool reports them' }, { k: 'f', l: 'Freed', n: true }, { k: 'd', l: 'Took', n: true, w: '70px' }],
    rows: (context.compactions || []).map(c => ({
      id: c.ts, sort: { at: c.ts, b: c.before, a: c.after, f: c.freed, d: c.duration_ms },
      cells: { at: { v: stamp(c.ts, true), cls: 'dim' }, why: { v: c.trigger || NA, cls: 'dim' }, b: { v: fmtTokens(c.before) }, a: { v: fmtTokens(c.after) }, f: { v: fmtTokens(c.freed) }, d: { v: fmtMs(c.duration_ms) } },
    })),
    sort: { k: 'at', dir: 'asc' }, none: 'No compaction is stored for this agent.', primary: 'at',
  }), [context]);
  const facts = [
    ...(copilot ? [
      { label: 'Tool definitions', value: fmtTokens(context.tool_tokens), sub: context.available_tools == null ? 'tools available n/a' : context.available_tools + ' tools available', title: 'toolTokenCount and availableToolCount of the last model call that reports them' },
      { label: 'Request body', value: fmtBytes(context.request_bytes_last), sub: context.request_bytes_peak == null ? 'peak n/a' : 'peak ' + fmtBytes(context.request_bytes_peak), title: 'requestBodyBytes of the last model call that reports it, before compression' },
    ] : []),
    { label: 'Times it shrank', value: fmtN(context.drops), title: 'The size fell by more than half, as compaction does' },
    { label: 'Compactions', value: context.compactions?.length ? fmtN(context.compactions.length) : NA, sub: context.compactions?.length ? '' : 'none stored', title: 'Compaction records in the session file. Only the time that aictl reads from these files is stored, so no record does not prove that none happened.' },
  ];
  const go = compact ? { label: 'Context', pick: () => act.setDrawerTab('context') } : null;
  return html`<${FixedPanel} id=${compact ? 'actxs' : 'actx'} span=${span || (compact ? 6 : 12)} go=${go} title="Context size" sub=${a.parent_id ? 'What this subagent sent with each model call' : compact ? 'What the main agent sent with each call' : 'What the main agent sent with each model call. Each subagent has its own.'}>
    <div class=${'bd-ctx' + (withSplit ? ' bd-ctx2' : '')}>
      <div>
        <div class="bd-ctxhead">
          <span class="bd-ctxbig" title="Input, cache read and cache write of the last call">${fmtN(context.last)}<small>tokens at the last call</small></span>
          ${copilot ? html`<span class="bd-ctxof" title="Last call, as a share of the prompt limit (maxPromptTokens of the last model call that reports it)">${context.prompt_limit == null && share == null ? html`prompt limit <b>${NA}</b>` : html`<b>${fmtShare(share)}</b> of the ${fmtN(context.prompt_limit)} prompt limit`}</span>` : null}
        </div>
        ${copilot && share != null ? html`<div class="bd-ctxlimit" role="img" aria-label=${fmtShare(share) + ' of the prompt limit'}><i style=${{ width: Math.max(0.5, Math.min(100, share * 100)) + '%' }}></i></div>` : null}
        <div class="bd-ctxspk">
          <span class="bd-ctxlab" title="Everything loaded before work began: system prompt, tools, instructions and the first prompt"><b>${fmtN(context.first)}</b> first call</span>
          <span class="bd-ctxlab bd-ctxlab-r"><b>${fmtN(context.last)}</b> last call${peakText} · ${fmtN(context.calls)} calls</span>
          <svg class="bd-ctxspark" viewBox="0 0 600 60" preserveAspectRatio="none" role="img" aria-label=${'Context size per call, from ' + fmtN(context.first) + ' to ' + fmtN(context.last) + ', peak ' + fmtN(context.peak)}><path d=${sparkPath(context.series, 600, 60)} fill="none" stroke="var(--s1)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>
        </div>
      </div>
      ${hasSplit ? html`<div class="bd-ctxsplit">
        <div class="bd-ctxst">${split
          ? html`<span>${'Split at the last shutdown, ' + stamp(split.ts, true)}</span><b title="currentTokens of the last shutdown record">${fmtTokens(split.current)}</b>`
          : html`<span>Split at shutdown: not known. The session wrote no shutdown record that aictl holds.</span>`}</div>
        ${split && known.length ? html`<div class="bd-segbar bd-ctxbar" role="img" aria-label=${known.map(p => p.label + ' ' + fmtN(p.v)).join(', ')}>${known.map(p => html`<span key=${p.label} class="bd-segpart" style=${{ flex: p.v + ' 1 0', background: p.c }} title=${p.title}>${fmtN(p.v)}</span>`)}</div>` : null}
        <div class="bd-ctxleg">${parts.map(p => html`<i key=${p.label + 'c'} class="bd-sw" style=${{ background: p.c }}></i><span key=${p.label} title=${p.title}>${p.label}</span><span key=${p.label + 'v'} class="bd-ctxlegv">${fmtN(p.v)}${p.v != null && total ? html`<small>${fmtShare(p.v / total)}</small>` : null}</span>`)}</div>
      </div>` : null}
    </div>
    ${compact ? null : html`<${Facts} facts=${facts}/>`}
    ${compact ? null : html`<div class="bd-note">${copilot
      ? 'First, last and peak are input, cache read and cache write of each call. Copilot compaction figures count the conversation only, without the system prompt and tools.'
      : 'Input, cache read and cache write of each call. This tool reports the total, not how it splits into instructions, tools and conversation.'}</div>`}
    ${compact ? null : byAgent ? html`<div class="bd-ctxsub">Context by agent. Each subagent has its own context; the numbers are what each one sent.</div><${Table} def=${byAgent} label="Context by agent"/>` : null}
    ${!compact && context.compactions?.length ? html`<${Table} def=${compactionDef} label="Compactions"/>` : null}
  </${FixedPanel}>`;
}

const TIMELINE_LANES = 8;
const LANE_COLORS = ['var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];

/** The agents of the session over its time: one lane each, with the prompts, failures and compactions of the main agent as ticks. */
export function timelineModel(a, data, now = Date.now() / 1000) {
  if (!a.started_at) return null;
  const end = a.ended_at || now;
  const span = Math.max(1, end - a.started_at);
  const at = ts => Math.max(0, Math.min(100, ((ts - a.started_at) / span) * 100));
  // The longest subagents get the lanes; they are drawn in start order.
  const all = (data.subagents || []).filter(k => k.started_at);
  const kids = all.slice().sort((x, y) => ((y.ended_at || end) - y.started_at) - ((x.ended_at || end) - x.started_at)).slice(0, TIMELINE_LANES).sort((x, y) => x.started_at - y.started_at);
  const lanes = [
    { id: a.id, name: a.parent_id ? a.role || a.title : 'Main agent', from: 0, to: 100, c: 'var(--s1)', start: a.started_at, end: a.ended_at, tokens: (a.input || 0) + (a.output || 0) + (a.cache_read || 0) + (a.cache_write || 0), main: true },
    ...kids.map((k, i) => ({ id: k.id, name: k.role || k.title || k.short || k.id, from: at(k.started_at), to: at(k.ended_at || end), c: LANE_COLORS[i % LANE_COLORS.length], start: k.started_at, end: k.ended_at, tokens: (k.input || 0) + (k.output || 0) + (k.cache_read || 0) + (k.cache_write || 0) })),
  ];
  const ticks = [
    ...(data.turns || []).filter(t => t.ts).map(t => ({ kind: 'Prompt', ts: t.ts, x: at(t.ts), c: 'var(--good)' })),
    ...(data.context?.compactions || []).filter(c => c.ts).map(c => ({ kind: 'Compaction', ts: c.ts, x: at(c.ts), c: 'var(--warn)' })),
    ...(data.errors || []).filter(e => e.ts).map(e => ({ kind: 'Failure', ts: e.ts, x: at(e.ts), c: 'var(--crit)', what: errorLabel(e.key) })),
  ];
  return { lanes, ticks, more: Math.max(0, all.length - TIMELINE_LANES), start: a.started_at, end, live: !a.ended_at };
}

/** True when the session has more to draw than the main agent's bar alone. */
export const hasTimeline = m => !!m && (m.lanes.length > 1 || m.ticks.length > 0);

function AgentTimeline({ m, act, span = 12 }) {
  if (!hasTimeline(m)) return null;
  const kinds = [...new Set(m.ticks.map(t => t.kind))];
  const tickColor = { Prompt: 'var(--good)', Compaction: 'var(--warn)', Failure: 'var(--crit)' };
  const sub = (m.lanes.length === 1 ? 'The main agent alone' : m.lanes.length - 1 + (m.more ? ' of ' + (m.lanes.length - 1 + m.more) : '') + (m.lanes.length - 1 + m.more === 1 ? ' subagent' : ' subagents')) + ' over ' + fmtDur(m.end - m.start) + (m.live ? ' so far' : '');
  return html`<${FixedPanel} id="atl" span=${span} title="Agents over time" sub=${sub} go=${{ label: 'Timeline', pick: () => act.setDrawerTab('timeline') }}>
    <div class="bd-tl" role="list" aria-label="Agents over time">
      ${m.lanes.map(l => html`<div key=${l.id} class="bd-tlrow" role="listitem">
        <span class="bd-tlname" title=${l.name}>${l.main ? html`<b>${l.name}</b>` : l.name}</span>
        <div class="bd-tltrack">
          ${l.main ? null : html`<button type="button" class="bd-tlbar" style=${{ left: l.from + '%', width: Math.max(0.4, l.to - l.from) + '%', background: l.c }} title=${l.name + ': ' + stamp(l.start) + (l.end ? ' to ' + stamp(l.end) : ', running') + ', ' + fmtDur((l.end || m.end) - l.start) + ', ' + fmtN(l.tokens) + ' tokens'} aria-label=${l.name + ', ' + fmtDur((l.end || m.end) - l.start)} onClick=${() => act.openDrawer({ type: 'agent', id: l.id, tab: 'overview' })}></button>`}
          ${l.main ? html`<span class="bd-tlbar bd-tlmain" style=${{ left: '0%', width: '100%', background: l.c }} title=${l.name + ': ' + stamp(l.start) + (l.end ? ' to ' + stamp(l.end) : ', running') + ', ' + fmtN(l.tokens) + ' tokens'}></span>
            ${m.ticks.map((t, i) => html`<i key=${i} class="bd-tltick" style=${{ left: t.x + '%', background: t.c }} title=${t.kind + (t.what ? ': ' + t.what : '') + ' at ' + stamp(t.ts)}></i>`)}` : null}
        </div>
      </div>`)}
      ${m.more ? html`<div class="bd-tlrow"><span></span><button type="button" class="bd-lnk bd-tlmore" onClick=${() => act.setDrawerTab('team')}>${'+ ' + m.more + ' more in Team'}</button></div>` : null}
      <div class="bd-tlaxis"><span></span><div><span>${stamp(m.start)}</span><span>${stamp(m.start + (m.end - m.start) / 2)}</span><span>${m.live ? 'now' : stamp(m.end)}</span></div></div>
    </div>
    ${kinds.length ? html`<div class="bd-legend">${kinds.map(k => html`<span key=${k} class="bd-li"><i class="bd-sw" style=${{ background: tickColor[k] }}></i>${k === 'Prompt' ? 'Prompt' : k === 'Compaction' ? 'Compaction' : 'Failed call or error'}</span>`)}</div>` : null}
  </${FixedPanel}>`;
}

/** One line under the totals when the session has failures or a loop, with the way to the tab that lists them. */
function Anomalies({ data, act }) {
  const errors = data.errors || [];
  const loop = data.loop;
  if (!errors.length && !loop) return null;
  const groups = new Map();
  for (const e of errors) { const k = errorLabel(e.key); groups.set(k, (groups.get(k) || 0) + 1); }
  const top = [...groups.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => (n > 1 ? k + ' ×' + n : k)).join(', ');
  const parts = [];
  if (errors.length) parts.push((errors.length === 1 ? '1 failure' : errors.length + ' failures') + (top ? ': ' + top : '') + (groups.size > 3 ? ', …' : ''));
  if (loop) parts.push('Loop: ' + loop.pattern + ', repeated ' + fmtN(loop.repeats) + ' times');
  return html`<div class=${'bd-kpipill ' + (loop ? 'bd-crit' : 'bd-warn')} role="status">
    <${Ico} d=${PATHS.warn}/><span class="bd-kpipilltx" title=${parts.join(' · ')}>${parts.join(' · ')}</span>
    <button type="button" class="bd-plink" onClick=${() => act.setDrawerTab('errors')}>Failures and loops →</button>
  </div>`;
}

/** The files of the repository that apply to the session folder, one row per folder, names as chips that open the file. */
export function groupContextFiles(files, gitRoot) {
  const root = gitRoot ? gitRoot.replace(/\/+$/, '') + '/' : '';
  const byDir = new Map();
  for (const f of files) {
    const dir = f.path.slice(0, f.path.length - f.name.length);
    const rel = root && dir.startsWith(root) ? dir.slice(root.length) : dir;
    const g = byDir.get(dir) || { dir, rel: rel || '/', files: [] };
    g.files.push(f);
    byDir.set(dir, g);
  }
  return [...byDir.values()].sort((x, y) => x.dir.localeCompare(y.dir)).map(g => ({ ...g, files: g.files.slice().sort((x, y) => x.name.localeCompare(y.name)) }));
}

const FILTER_FROM = 9;

function ContextFiles({ cf, act }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => groupContextFiles(cf.files, cf.git_root), [cf]);
  const needle = q.trim().toLowerCase();
  const shown = needle ? groups.map(g => ({ ...g, files: g.files.filter(f => f.path.toLowerCase().includes(needle)) })).filter(g => g.files.length) : groups;
  if (!cf.files.length) {
    return html`<div class="bd-empty">${!cf.git_root ? 'The session folder is not in a git repository, so aictl links no files to it.' : cf.read ? 'No instruction or config file of this repository applies to the session folder.' : 'aictl has not read this repository yet. It reads it in the background.'}</div>`;
  }
  return html`
    ${cf.files.length >= FILTER_FROM ? html`<div class="bd-ffilter">
      <input class="bd-fq" type="search" value=${q} placeholder="Filter files" aria-label="Filter the files by name or folder" onInput=${e => setQ(e.target.value)}/>
      <span class="bd-ffnote">${'Folders are relative to ' + cf.git_root + '. Click a file to open it.'}</span>
    </div>` : null}
    ${shown.map(g => html`<div key=${g.dir} class="bd-fgrp">
      <div class="bd-fdir" title=${g.dir}><span class="bd-mono">${g.rel}</span><small>${(g.rel === '/' ? 'repository root · ' : '') + (g.files.length === 1 ? '1 file' : g.files.length + ' files')}</small></div>
      <div class="bd-fchips">${g.files.map(f => html`<button key=${f.path} type="button" class=${'bd-fchip' + (f.loaded ? ' bd-floaded' : '')} title=${f.path + (f.loaded ? '\nLoaded by this session' : '')} onClick=${() => act.openDrawer({ type: 'file', path: f.path })}>${f.name}</button>`)}</div>
    </div>`)}
    ${needle && !shown.length ? html`<div class="bd-empty">No file matches.</div>` : null}`;
}

// How a session loaded a file, as the tool records it.
const LOAD_HOW = {
  instructions: x => ({ User: 'User instructions', Project: 'Project instructions', AutoMem: 'Agent memory', Local: 'Local instructions' }[x.detail] || (x.detail ? x.detail + ' instructions' : 'Instructions')),
  nested_memory: () => 'Folder instructions',
  skill: () => 'Skill',
  custom_agent: () => 'Custom agent',
  system_prompt: () => 'In the system prompt',
};
const LOAD_TIP = {
  instructions: 'The tool wrote in its transcript that it loaded this file',
  nested_memory: 'The tool loaded this file when the session worked in its folder',
  skill: 'The session invoked this skill',
  custom_agent: 'The session ran as this custom agent',
  system_prompt: 'Most of the lines of this file are in the system prompt that the tool sent',
};
const REPORTS_LOADS = ['claude-code', 'copilot-cli'];

/** One row per loaded file; a file loaded in two ways shows both. */
export function loadedRows(loaded) {
  const by = new Map();
  for (const x of loaded || []) {
    const r = by.get(x.path) || { path: x.path, name: x.name, ts: x.ts, hows: [], tips: [] };
    const label = (LOAD_HOW[x.how] || (() => x.how))(x);
    if (!r.hows.includes(label)) { r.hows.push(label); r.tips.push((LOAD_TIP[x.how] || '') + (x.how === 'system_prompt' && x.detail ? ': ' + x.detail : '')); }
    if (x.ts && (!r.ts || x.ts < r.ts)) r.ts = x.ts;
    by.set(x.path, r);
  }
  return [...by.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0));
}

function loadedDef(rows, gitRoot, act, max = 0) {
  const root = gitRoot ? gitRoot.replace(/\/+$/, '') + '/' : '';
  const shown = max ? rows.slice(0, max) : rows;
  return {
    cols: [{ k: 'n', l: 'File' }, { k: 'h', l: 'Loaded as', w: '250px', t: 'How the tool recorded the load. Hover a value for the evidence.' }, ...(max ? [] : [{ k: 't', l: 'First load', w: '110px' }])],
    rows: shown.map(r => {
      const dir = r.path.slice(0, r.path.length - r.name.length);
      const where = root && dir.startsWith(root) ? dir.slice(root.length) || 'repository root' : dir;
      return { id: r.path, go: r.path.startsWith('/') ? () => act.openDrawer({ type: 'file', path: r.path }) : null, sort: { n: r.name, h: r.hows[0], t: r.ts },
        cells: { n: { v: r.name, sub: where, cls: 'm', title: r.path }, h: { v: r.hows.join(', '), title: r.tips.filter(Boolean).join('\n') }, t: { v: stamp(r.ts, true), cls: 'dim' } } };
    }),
    sort: { k: 't', dir: 'asc' }, primary: 'n',
  };
}

function loadedNone(a) {
  return REPORTS_LOADS.includes(a.tool)
    ? 'No loaded file is recorded for this session.'
    : 'This tool does not report which files it loads. The files that can apply are not proof of a load.';
}

/** The Overview card: the files the session loaded, and how many more can apply. */
function InstructionsCard({ a, cf, act }) {
  const rows = useMemo(() => loadedRows(cf.loaded), [cf]);
  const def = useMemo(() => loadedDef(rows, cf.git_root, act, 5), [rows, cf]);
  const sub = (rows.length === 1 ? '1 loaded' : rows.length + ' loaded') + (cf.git_root && cf.read ? ' · ' + fmtN(cf.total) + ' can apply' : '');
  return html`<${FixedPanel} id="ains" span=${6} title="Instructions" sub=${sub} go=${{ label: 'Instructions', pick: () => act.setDrawerTab('instructions') }}>
    ${rows.length ? html`<${Table} def=${def} label="Loaded instructions"/>` : html`<div class="bd-empty">${loadedNone(a)}</div>`}
    ${rows.length > 5 ? html`<button type="button" class="bd-lnk" onClick=${() => act.setDrawerTab('instructions')}>${'+ ' + (rows.length - 5) + ' more'}</button>` : null}
    <div class="bd-note">${!cf.git_root ? 'The session folder is not in a git repository.' : !cf.read ? 'aictl has not read this repository yet, so the files that can apply are not known. It reads it in the background.' : cf.git_root
      ? fmtN(cf.total) + (cf.total === 1 ? ' file' : ' files') + ' of the repository can apply to the session folder. A file that can apply was not always loaded.'
      : 'The session folder is not in a git repository.'}</div>
  </${FixedPanel}>`;
}

function InstructionsTab({ a, data, act }) {
  const cf = data.context_files || { files: [], total: 0, git_root: null, read: false, loaded: [] };
  const rows = useMemo(() => loadedRows(cf.loaded), [cf]);
  const def = useMemo(() => loadedDef(rows, cf.git_root, act), [rows, cf]);
  const folders = useMemo(() => new Set(cf.files.map(f => f.path.slice(0, f.path.length - f.name.length))).size, [cf]);
  const hit = cf.files.filter(f => f.loaded).length;
  return html`
    <${FixedPanel} id="aiload" title="Loaded by this session" sub=${rows.length ? rows.length + (rows.length === 1 ? ' file' : ' files') : ''}>
      ${rows.length ? html`<${Table} def=${def} label="Loaded by this session"/>` : html`<div class="bd-empty">${loadedNone(a)}</div>`}
    </${FixedPanel}>
    ${a.parent_id ? null : html`<${FixedPanel} id="actxf" title="Files that can affect this session" go=${act.settingsPivot ? { label: 'All files in Settings', pick: () => act.settingsPivot('files') } : null} sub=${cf.git_root ? fmtN(cf.total) + ' files in ' + folders + (folders === 1 ? ' folder of ' : ' folders of ') + cf.git_root + ' apply to the session folder' + (hit ? ', ' + hit + ' loaded' : '') + (cf.total > cf.files.length ? ', ' + cf.files.length + ' listed' : '') : 'No git repository'}><${ContextFiles} cf=${cf} act=${act}/></${FixedPanel}>`}`;
}

function ContextTab({ a, data, act }) {
  if (!data.context) return html`<div class="bd-empty">No model call of this agent is stored, so its context size is not known.</div>`;
  return html`<${ContextPanel} a=${a} context=${data.context} copilot=${(a.tool || '').startsWith('copilot')} subagents=${data.subagents} act=${act}/>`;
}

const OUTPUT_ROWS = 5;

/** The Overview card: what the session left behind, changed files first, then the files it wrote. */
export function outputRows(data) {
  const changed = (data.files || []).slice().sort((x, y) => ((y.lines_added || 0) + (y.lines_removed || 0)) - ((x.lines_added || 0) + (x.lines_removed || 0)))
    .map(f => ({ path: f.path, name: f.path.split('/').pop(), kind: 'Changed', value: fmtLines(f.lines_added, f.lines_removed), ts: null }));
  const arts = (data.artifacts || []).slice().sort((x, y) => (x.kind === 'written' ? 0 : 1) - (y.kind === 'written' ? 0 : 1) || (y.mtime || 0) - (x.mtime || 0))
    .map(x => ({ path: x.path, name: x.name || x.path, kind: x.kind === 'written' ? 'Written' : 'Session folder', value: fmtBytes(x.size_bytes), ts: x.mtime }));
  return [...changed, ...arts];
}

function OutputsCard({ data, act, span }) {
  const rows = useMemo(() => outputRows(data), [data]);
  const changed = data.files || [];
  const commits = data.commits || [];
  const counts = [
    { label: 'Changes', value: changed.length ? fmtN(changed.length) + (changed.length === 1 ? ' file' : ' files') : 'None', sub: changed.length ? fmtLines(changed.reduce((s, f) => s + (f.lines_added || 0), 0), changed.reduce((s, f) => s + (f.lines_removed || 0), 0)) : '', tab: 'changes' },
    { label: 'Artifacts', value: data.artifacts_total ? fmtN(data.artifacts_total) + (data.artifacts_total === 1 ? ' file' : ' files') : 'None', sub: data.artifacts_total ? fmtBytes(data.artifacts_bytes) : '', tab: 'artifacts' },
    { label: 'Commits', value: commits.length ? fmtN(commits.length) : 'None', sub: commits.length ? commits.reduce((n, c) => n + ((c.prs || []).length), 0) + ' PRs' : '', tab: 'commits' },
  ];
  const def = {
    cols: [{ k: 'n', l: 'File' }, { k: 'k', l: 'Kind', w: '110px' }, { k: 'v', l: 'Size', n: true, w: '90px', t: 'Lines added and removed for a changed file, bytes for a written file' }],
    rows: rows.slice(0, OUTPUT_ROWS).map((r, i) => ({ id: r.kind + r.path + i, go: () => act.openDrawer({ type: 'file', path: r.path }), cells: { n: { v: r.name, cls: 'm', title: r.path }, k: { v: r.kind, cls: 'dim' }, v: { v: r.value } } })),
    primary: 'n',
  };
  return html`<${FixedPanel} id="aout" span=${span} title="Outputs" sub=${rows.length ? rows.length + (rows.length === 1 ? ' file' : ' files') : 'Nothing written'}>
    <div class="bd-ocounts">${counts.map(c => html`<button key=${c.label} type="button" class="bd-ocount" onClick=${() => act.setDrawerTab(c.tab)} title=${'Open ' + c.label}><span class="bd-l">${c.label}</span><b class=${c.value === 'None' ? 'bd-na' : ''}>${c.value}</b><small>${c.sub}</small></button>`)}</div>
    ${rows.length ? html`<${Table} def=${def} label="Outputs"/>` : html`<div class="bd-empty">The session changed no file in the project and wrote no file elsewhere.</div>`}
    ${rows.length > OUTPUT_ROWS ? html`<div class="bd-note">${'The ' + OUTPUT_ROWS + ' first of ' + rows.length + '. Changes and Artifacts list them all.'}</div>` : null}
  </${FixedPanel}>`;
}

function OverviewTab({ a, data, st, ctx, act, pending }) {
  const proc = data.process || {};
  const live = isLive(st);
  const msgs = a.msgs ? a.msgs.user + a.msgs.assistant + a.msgs.tool : null;
  const tokens = [a.input, a.output, a.cache_read, a.cache_write].some(v => v != null) ? (a.input || 0) + (a.output || 0) + (a.cache_read || 0) + (a.cache_write || 0) : null;
  const context = data.context;
  const models = (a.models || []).join(', ');
  // The strip at the top: the numbers a reader opens a session for.
  const kpis = [
    { label: 'Tokens', value: fmtN(tokens), sub: a.cached_share != null ? fmtShare(a.cached_share) + ' cached' : a.cache_read != null ? fmtN(a.cache_read) + ' cache read' : '', title: 'Input, output, cache read and cache write' },
    { label: 'Cost', value: fmtUsd(a.cost_usd), sub: models },
    { label: 'Time', value: fmtDur((a.ended_at || Date.now() / 1000) - a.started_at), sub: a.started_at ? stamp(a.started_at, true) + (a.ended_at ? ' → ' + stamp(a.ended_at, false, a.started_at * 1000) : '') : '' },
    { label: 'Messages', value: fmtN(msgs), sub: a.msgs ? a.msgs.user + (a.parent_id ? ' task prompts' : ' prompts') : '' },
    { label: 'Tool calls', value: fmtN(a.tool_calls), sub: a.failures == null ? '' : a.failures + ' failed', cls: a.failures ? 'crit' : '' },
    context ? { label: 'Model calls', value: fmtN(context.calls), sub: 'context ' + fmtN(context.first) + ' → ' + fmtN(context.last), title: 'Calls to a model, and what the first and the last call sent' } : null,
  ].filter(Boolean);
  const modelDef = useMemo(() => ({
    cols: [{ k: 'm', l: 'Model' }, { k: 'msgs', l: 'Calls', n: true, w: '50px', t: 'Calls to this model' }, { k: 'input', l: 'Input', n: true, w: '60px' }, { k: 'output', l: 'Output', n: true, w: '60px' }, { k: 'cr', l: 'Cache read', n: true, w: '76px' }, { k: 'cw', l: 'Cache write', n: true, w: '80px' }, { k: 'cost', l: 'Cost', n: true, w: '60px' }],
    rows: (data.by_model || []).map(x => ({ id: x.model || 'none', sort: { m: x.model || NO_MODEL, msgs: x.msgs, input: x.input, output: x.output, cr: x.cache_read, cw: x.cache_write, cost: x.cost_usd }, cells: { m: { v: x.model || NO_MODEL, sw: colorFor('model', x.model), title: x.model ? x.model : 'The record carries no model id', cls: x.model ? '' : 'dim' }, msgs: { v: fmtN(x.msgs) }, input: { v: fmtN(x.input) }, output: { v: fmtN(x.output) }, cr: { v: fmtN(x.cache_read) }, cw: { v: fmtN(x.cache_write) }, cost: { v: fmtUsd(x.cost_usd) } } })),
    sort: { k: 'cost', dir: 'desc' },
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
  const cf = data.context_files || { files: [], total: 0, git_root: null, read: false, loaded: [] };
  const copilot = (a.tool || '').startsWith('copilot');
  const copyLink = window.location.origin + window.location.pathname + '?agent=' + encodeURIComponent(a.id);
  const main = !a.parent_id;
  const tl = useMemo(() => (main ? timelineModel(a, data) : null), [a, data]);
  const hasTl = hasTimeline(tl);
  return html`
    ${pending ? html`<${FixedPanel} id="ap" title="Waiting for your confirmation"><div class="bd-ptext">${pending.name + ': ' + pending.target + '\nWaiting for ' + fmtDur(Date.now() / 1000 - pending.since_ts) + '. Answer in the tool that asks.'}</div></${FixedPanel}>` : null}
    <div class="bd-kpis bd-drkpis" role="group" aria-label="Totals">${kpis.map(k => html`<div key=${k.label} class="bd-kpi" title=${k.title || k.label}><span class="bd-l">${k.label}</span><span class="bd-v">${k.value}</span><span class=${'bd-d' + (k.cls ? ' bd-' + k.cls : '')}>${k.sub || ''}</span></div>`)}<${Anomalies} data=${data} act=${act}/></div>
    ${main && hasTl ? html`<${AgentTimeline} m=${tl} act=${act} span=${context ? 6 : 12}/>` : null}
    ${context ? html`<${ContextPanel} a=${a} context=${context} copilot=${copilot} subagents=${data.subagents} act=${act} compact=${true} span=${main && hasTl ? 6 : 12}/>` : null}
    <${OutputsCard} data=${data} act=${act} span=${main ? 6 : 12}/>
    ${main ? html`<${InstructionsCard} a=${a} cf=${cf} act=${act}/>` : null}
    <${FixedPanel} id="am" span=${6} title="Usage by model" sub=${(data.by_model || []).length ? (data.by_model.length === 1 ? '1 model' : data.by_model.length + ' models') : ''}><${Table} def=${modelDef} label="Usage by model"/></${FixedPanel}>
    <div class="bd-drcol" style="grid-column:span 6">
      <${FixedPanel} id="askill" title="Skills used" sub=${(data.skills || []).length ? data.skills.reduce((n, x) => n + x.uses, 0) + ' uses of ' + data.skills.length + ' skills' + (a.parent_id ? '' : ', with its subagents') : 'None in this session'}><${Table} def=${skills} label="Skills used"/></${FixedPanel}>
      <${FixedPanel} id="ar" title="Process" sub=${live ? '' : 'Ended, nothing running'} go=${{ label: 'Processes', pick: () => act.setDrawerTab('procs') }}>
        <${Stats} stats=${live
          ? [{ label: 'Started', value: stamp(proc.started_at ?? a.started_at, true) }, { label: 'CPU', value: fmtCpu(proc.cpu_percent) }, { label: 'RAM', value: fmtMem(proc.mem_mb) }, { label: 'Processes', value: Array.isArray(proc.pids) && proc.pids.length ? proc.pids.length : NA }]
          : [{ label: 'Started', value: stamp(proc.started_at ?? a.started_at, true) }, { label: 'Ended', value: stamp(a.ended_at, true) }]}/>
        <${Actions} actions=${[{ label: 'Copy session ID', go: () => act.copy(a.id, 'Copied ' + a.id) }, { label: 'Copy link to this agent', go: () => act.copy(copyLink, 'Copied the link') }]}/>
      </${FixedPanel}>
    </div>
    ${(data.subagents || []).length ? html`<${FixedPanel} id="ak" title="Subagents" go=${{ label: 'Team', pick: () => act.setDrawerTab('team') }}><${Table} def=${kids} label="Subagents"/></${FixedPanel}>` : null}`;
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
  const changed = data.files || [];
  const lines = changed.length ? '+' + fmtN(changed.reduce((s, f) => s + (f.lines_added || 0), 0)) + ' −' + fmtN(changed.reduce((s, f) => s + (f.lines_removed || 0), 0)) + ' lines in ' + changed.length + (changed.length === 1 ? ' file' : ' files') : 'No file changed';
  return html`<${FixedPanel} id="afc" title="Files changed" sub=${lines}><${Table} def=${files} label="Files changed"/></${FixedPanel}>
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
