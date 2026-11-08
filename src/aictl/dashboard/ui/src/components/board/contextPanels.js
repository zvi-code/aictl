// ─── Board context panels — what each tool loads into a model's context ─
// Builders for the Context section and the Workflows panel, from /api/board/context.
// Token counts are estimates at four characters per token. A panel whose content
// is more than a table returns `view`: a component with its own fold and preview state.
import { html } from 'htm/preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as api from '../../api.js';
import Chart from './Chart.js';
import { Ico, PATHS } from './icons.js';
import { NA, OTHER_COLOR, ago, colorFor, fmtBytes, fmtMs, fmtN, fmtUsd, stamp, NO_MODEL, tailPath, weekdayLabel } from './format.js';
import Table from './Table.js';
import { EMPTY_CONTEXT } from './useBoardData.js';

/** The /api/board/context answer the board holds, or an empty one. */
export const contextOf = ctx => ctx.data?.contextData || EMPTY_CONTEXT;

const WAITING = 'Reading the context files...';
const noneText = (c, text) => (c.loaded ? text : WAITING);
const sumOf = list => list.reduce((s, v) => s + (v || 0), 0);
const TOP_SERIES = 5;

export const POLICIES = [
  { id: 'yes', label: 'Sent to the model', c: 'var(--s1)' },
  { id: 'on-demand', label: 'On demand', c: 'var(--s4)' },
  { id: 'conditional', label: 'Conditional', c: 'var(--s3)' },
  { id: 'no', label: 'Not sent', c: 'var(--ink3)' },
];
const POLICY_BY_ID = Object.fromEntries(POLICIES.map(p => [p.id, p]));
const SENT_LABEL = { yes: 'Yes', 'on-demand': 'On demand', conditional: 'Conditional', no: 'No' };
const SCOPE_COLOR = { project: 'var(--s1)', global: 'var(--s2)', shadow: 'var(--s3)', session: 'var(--s4)', parent: 'var(--s5)' };
const scopeColor = s => SCOPE_COLOR[s] || OTHER_COLOR;
const ITEM_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--ink2)'];

/** Bar width on a log scale: category totals span many orders of magnitude. */
export const logWidth = (v, mx) => (v > 0 && mx > 0 ? Math.max(2, (Math.log10(v + 1) / Math.log10(mx + 1)) * 100) : 0);
/** A share of a context window. Below 1% is "<1%", so a small file never reads as 0. */
export const fmtWindowShare = v => (v == null ? NA : v > 0 && v < 0.01 ? '<1%' : Math.round(v * 100) + '%');
const shareLevel = v => (v > 0.8 ? 'crit' : v > 0.5 ? 'warn' : 'ok');

function readText(path) {
  return api.getFile(path).then((r) => {
    if (r.ok) return r.text();
    throw new Error(r.status === 403 ? 'aictl may not read this file.' : 'Could not read the file (HTTP ' + r.status + ').');
  });
}

/** The text of one file, rendered when it is Markdown, with a way to open it in the drawer. */
export function Preview({ path, ctx, onClose }) {
  const [st, setSt] = useState({ loading: true });
  useEffect(() => {
    let live = true;
    setSt({ loading: true });
    Promise.all([readText(path), import('../ui/TextView.js')]).then(
      ([text, m]) => { if (live) setSt({ text, TV: m.default }); },
      (e) => { if (live) setSt({ error: e?.message || 'Could not read the file.' }); },
    );
    return () => { live = false; };
  }, [path]);
  const TV = st.TV;
  return html`<div class="bd-prev" role="region" aria-label=${'Preview of ' + path}>
    <div class="bd-prevh"><span class="bd-mono" title=${path}>${path}</span><span class="bd-sp"></span>
      <button type="button" class="bd-link" onClick=${() => ctx.actions.openFile?.(path, 1)}>Open</button>
      ${onClose ? html`<button type="button" class="bd-ib-btn" aria-label="Close the preview" title="Close the preview" onClick=${onClose}><${Ico} d=${PATHS.close}/></button>` : null}
    </div>
    ${st.loading ? html`<div class="bd-empty" role="status">Reading the file...</div>` : null}
    ${st.error ? html`<div class="bd-empty" role="status">${st.error}</div>` : null}
    ${TV ? html`<div class="bd-prevb"><${TV} text=${st.text} path=${path} source=${html`<div class="bd-ptext">${st.text}</div>`}/></div>` : null}
  </div>`;
}

const fold = (open, label) => html`<${Ico} d=${PATHS.chev} cls=${'bd-chev' + (open ? ' bd-open' : '')}/>${label}`;

// ─── Context window budget ────────────────────────────────────────

function projectsDef(b) {
  return {
    cols: [{ k: 'p', l: 'Project' }, { k: 'always', l: 'Always', n: true, w: '64px' }, { k: 'od', l: 'On demand', n: true, w: '76px' }, { k: 'cond', l: 'Conditional', n: true, w: '80px' }, { k: 'est', l: 'With global files', n: true, w: '112px', t: 'The project files plus the global files every session loads' }, { k: 'share', l: 'Of the window', n: true, w: '96px' }],
    rows: b.projects.map(p => ({
      id: p.project, sort: { p: p.project, always: p.always, od: p.on_demand, cond: p.conditional, est: p.estimate, share: p.share },
      cells: { p: { v: p.project, title: p.project === b.largest_project ? 'The largest project: the estimate above uses it' : p.project, sub: p.project === b.largest_project ? 'largest' : '' }, always: { v: fmtN(p.always) }, od: { v: fmtN(p.on_demand) }, cond: { v: fmtN(p.conditional) }, est: { v: fmtN(p.estimate) }, share: { v: fmtWindowShare(p.share), cls: shareLevel(p.share) } },
    })),
    sort: { k: 'est', dir: 'desc' },
  };
}

function BudgetRow({ b, ctx }) {
  const [open, setOpen] = useState(false);
  const def = useMemo(() => projectsDef(b), [b]);
  const level = shareLevel(b.always_share);
  const label = b.label || ctx.toolName(b.tool);
  const windowText = fmtN(b.window) + ' token window' + (b.window_assumed ? ' (assumed)' : '');
  const modelTitle = b.model
    ? b.model + (b.model_from ? ', from ' + b.model_from : '') + (b.window_assumed ? '. Its window is not known, so 200 k is assumed.' : '')
    : 'No model is set or reported for this tool, so a 200 k window is assumed.';
  return html`<div class="bd-bud">
    <div class="bd-budh"><i class="bd-sw" style=${{ background: colorFor('tool', b.tool) }}></i><b>${label}</b>
      <span class="bd-dim" title=${modelTitle}>${(b.model || 'Model not known') + ', ' + windowText}</span><span class="bd-sp"></span>
      <b class=${'bd-budpct bd-' + level} title="Always loaded, as a share of the window">${fmtWindowShare(b.always_share)}</b></div>
    <div class="bd-meter" role="img" aria-label=${label + ': always loaded ' + fmtN(b.always) + ' of ' + fmtN(b.window) + ' tokens, ' + fmtWindowShare(b.always_share) + '. Max potential ' + fmtN(b.max_potential) + ', ' + fmtWindowShare(b.potential_share)}>
      <span class="bd-meterpot" style=${{ width: Math.min(100, (b.potential_share || 0) * 100) + '%' }}></span>
      <span class=${'bd-meterfill bd-' + level} style=${{ width: Math.min(100, (b.always_share || 0) * 100) + '%' }}></span>
    </div>
    <div class="bd-budv">
      <span title="Files sent with every call: the global files and the largest project">Always loaded <b>${fmtN(b.always)}</b></span>
      <span title="Files the model reads when it asks for them">On demand <b>${fmtN(b.on_demand)}</b></span>
      <span title="Files sent when they apply, such as rules for some paths">Conditional <b>${fmtN(b.conditional)}</b></span>
      <span title="Tokens a prompt cache can serve">Cacheable <b>${fmtN(b.cacheable)}</b></span>
      <span title="Always loaded, on demand and conditional together">Max potential <b>${fmtN(b.max_potential)}</b> (${fmtWindowShare(b.potential_share)})</span>
      <span title="Files this tool keeps that are never sent, such as transcripts">Never sent <b>${fmtN(b.never_sent_files)} files</b></span>
    </div>
    ${b.projects.length ? html`<button type="button" class="bd-budfold" aria-expanded=${open ? 'true' : 'false'} onClick=${() => setOpen(!open)}>${fold(open, 'Each project (' + b.projects.length + ')')}</button>
      ${open ? html`<${Table} def=${def} label=${'Each project for ' + label}/>` : null}` : null}
  </div>`;
}

function BudgetView({ rows, none, ctx }) {
  if (!rows.length) return html`<div class="bd-empty">${none}</div>`;
  return html`<div class="bd-buds">${rows.map(b => html`<${BudgetRow} key=${b.tool} b=${b} ctx=${ctx}/>`)}</div>`;
}

function panelBudget(ctx) {
  const c = contextOf(ctx);
  const rows = c.budget.tools;
  const top = rows.reduce((m, b) => (b.always_share > (m?.always_share ?? -1) ? b : m), null);
  return {
    sub: top ? 'Largest: ' + (top.label || ctx.toolName(top.tool)) + ', ' + fmtWindowShare(top.always_share) + ' of its window before the first prompt' : 'Files each tool loads, against its model\'s window',
    view: { C: BudgetView, props: { rows, none: noneText(c, 'No context files found for these tools.') } },
    note: 'Estimates at four characters per token. Always loaded counts the global files plus the largest project, as one session loads one project. The system prompt, tool definitions and the conversation are not in these numbers.',
  };
}

// ─── Tokens by category, sent and never sent ──────────────────────

function fileDef(list, ctx, go) {
  return {
    cols: [{ k: 'n', l: 'File' }, { k: 'sc', l: 'Scope', w: '70px' }, { k: 'sz', l: 'Size', n: true, w: '64px' }, { k: 't', l: 'Tokens', n: true, w: '64px' }, { k: 's', l: 'Sent', w: '86px', t: 'Sent to the model' }],
    rows: list.map(f => ({
      id: f.path, go: () => go(f.path),
      sort: { n: f.name, sc: f.scope, sz: f.size, t: f.tokens, s: f.policy },
      cells: { n: { v: f.name, title: f.path }, sc: { v: f.scope || NA, cls: 'dim' }, sz: { v: fmtBytes(f.size) }, t: { v: fmtN(f.tokens) }, s: { v: SENT_LABEL[f.policy] || NA, cls: f.policy === 'no' ? 'dim' : '', title: 'sent_to_llm: ' + (f.sent_to_llm || 'not set') } },
    })),
    sort: { k: 't', dir: 'desc' }, limit: 50, none: 'No files of this kind.',
  };
}

function SplitView({ cats, files, none, ctx }) {
  const [pick, setPick] = useState(null);
  const [path, setPath] = useState(null);
  const picked = pick && files.find(f => f.tool === pick.tool);
  const list = useMemo(() => (picked ? picked.files.filter(f => f.kind === pick.kind) : []), [picked, pick]);
  const def = useMemo(() => fileDef(list, ctx, p => setPath(cur => (cur === p ? null : p))), [list, ctx]);
  if (!cats.length) return html`<div class="bd-empty">${none}</div>`;
  const choose = (tool, kind) => { setPath(null); setPick(pick && pick.tool === tool && pick.kind === kind ? null : { tool, kind }); };
  return html`<div class="bd-splits">
    ${cats.map((c) => {
      const label = c.label || ctx.toolName(c.tool);
      return html`<div key=${c.tool} class="bd-split">
        <div class="bd-budh"><i class="bd-sw" style=${{ background: colorFor('tool', c.tool) }}></i><b>${label}</b>
          <span class="bd-dim">${fmtN(c.sent) + ' sent, ' + fmtN(c.never_sent) + ' never sent'}</span></div>
        <div class="bd-splitbar">${c.kinds.filter(k => k.tokens > 0).map((k) => {
          const on = pick && pick.tool === c.tool && pick.kind === k.kind;
          const text = k.kind + ': ' + fmtN(k.tokens) + ' tokens in ' + k.files + ' files, ' + fmtN(k.sent) + ' sent, ' + fmtN(k.never_sent) + ' never sent';
          return html`<button key=${k.kind} type="button" class="bd-splitseg" style=${{ flex: k.tokens + ' 1 0' }} title=${text} aria-label=${label + ', ' + text + '. Show the files'} aria-pressed=${on ? 'true' : 'false'} onClick=${() => choose(c.tool, k.kind)}>
            ${k.sent ? html`<span style=${{ flex: k.sent + ' 1 0', background: colorFor('kind', k.kind) }}></span>` : null}
            ${k.never_sent ? html`<span class="bd-never" style=${{ flex: k.never_sent + ' 1 0', background: colorFor('kind', k.kind) }}></span>` : null}
          </button>`;
        })}</div>
        <div class="bd-legend">${c.kinds.map(k => html`<button key=${k.kind} type="button" aria-pressed=${pick && pick.tool === c.tool && pick.kind === k.kind ? 'true' : 'false'} title=${'Show the ' + k.kind + ' files'} onClick=${() => choose(c.tool, k.kind)}><i class="bd-sw" style=${{ background: colorFor('kind', k.kind) }}></i>${k.kind} <em>${fmtN(k.tokens)}</em></button>`)}</div>
      </div>`;
    })}
    <div class="bd-legend bd-key"><span class="bd-li"><i class="bd-sw" style="background:var(--ink2)"></i>Sent to the model</span><span class="bd-li"><i class="bd-sw bd-never" style="background:var(--ink2)"></i>Never sent</span></div>
    ${picked ? html`<div class="bd-flist" role="region" aria-label=${'Files: ' + (picked.label || ctx.toolName(picked.tool)) + ', ' + pick.kind}>
      <div class="bd-prevh"><b>${(picked.label || ctx.toolName(picked.tool)) + ', ' + pick.kind + ' (' + list.length + ')'}</b><span class="bd-sp"></span>
        <button type="button" class="bd-ib-btn" aria-label="Close the file list" title="Close the file list" onClick=${() => { setPick(null); setPath(null); }}><${Ico} d=${PATHS.close}/></button></div>
      <${Table} def=${def} label=${'Files: ' + pick.kind}/>
      ${picked.truncated ? html`<div class="bd-note">This tool has ${fmtN(picked.count)} files. Only the largest ${fmtN(picked.files.length)} are listed.</div>` : null}
      ${path ? html`<${Preview} key=${path} path=${path} ctx=${ctx} onClose=${() => setPath(null)}/>` : null}
    </div>` : null}
  </div>`;
}

function panelTokenSplit(ctx) {
  const c = contextOf(ctx);
  return {
    sub: 'Each tool\'s files by category. Click a category for its files',
    view: { C: SplitView, props: { cats: c.categories, files: c.files, none: noneText(c, 'No context files found for these tools.') } },
    note: 'A striped part is never sent to the model, such as transcripts and logs. It still takes disk space and scan time.',
  };
}

// ─── Context window map ───────────────────────────────────────────

const MAP_DIMS = { kind: 'Category', scope: 'Scope', project: 'Project', policy: 'Policy' };

/** Rows of the map for one dimension; each row is split by scope, or by category in the scope view. */
export function mapRows(rows, by) {
  const segBy = by === 'scope' ? 'kind' : 'scope';
  const out = new Map();
  for (const r of rows) {
    const key = r[by] || NA;
    if (!out.has(key)) out.set(key, { key, tokens: 0, files: 0, segs: new Map() });
    const row = out.get(key);
    row.tokens += r.tokens || 0;
    row.files += r.files || 0;
    const sk = r[segBy] || NA;
    const seg = row.segs.get(sk) || { key: sk, tokens: 0, files: 0 };
    seg.tokens += r.tokens || 0;
    seg.files += r.files || 0;
    row.segs.set(sk, seg);
  }
  return [...out.values()].map(r => ({ ...r, segs: [...r.segs.values()].sort((a, b) => b.tokens - a.tokens) })).sort((a, b) => b.tokens - a.tokens);
}

function MapRow({ label, tokens, files, max, segs, colorOf, title }) {
  return html`<div class="bd-maprow">
    <span class="bd-mapk" title=${title || label}>${label}</span>
    <div class="bd-maptrack"><div class="bd-mapbar" style=${{ width: logWidth(tokens, max) + '%' }}>
      ${segs.filter(s => s.tokens > 0).map((s, i) => html`<span key=${s.key} style=${{ flex: s.tokens + ' 1 0', background: colorOf(s, i) }} title=${s.key + ': ' + fmtN(s.tokens) + ' tokens' + (s.files != null ? ' in ' + s.files + ' files' : '')}></span>`)}
    </div></div>
    <span class="bd-mapv">${fmtN(tokens)}</span>
    <span class="bd-mapf">${files == null ? '' : files + ' files'}</span>
  </div>`;
}

function MapView({ map, by, none, ctx }) {
  const [proj, setProj] = useState(null);
  const rows = useMemo(() => mapRows(map.rows, by), [map, by]);
  const projects = useMemo(() => mapRows(map.rows, 'project'), [map]);
  if (!map.total) return html`<div class="bd-empty">${none}</div>`;
  const max = Math.max(1, ...rows.map(r => r.tokens));
  const segColor = by === 'scope' ? s => colorFor('kind', s.key) : s => scopeColor(s.key);
  const segKeys = [...new Set(rows.flatMap(r => r.segs.map(s => s.key)))];
  const label = k => (by === 'policy' ? POLICY_BY_ID[k]?.label || k : k);
  let drill = null;
  if (proj) {
    const p = projects.find(x => x.key === proj);
    const items = map.items.filter(i => i.project === proj);
    const byKind = new Map();
    for (const i of items) {
      if (!byKind.has(i.kind)) byKind.set(i.kind, []);
      byKind.get(i.kind).push(i);
    }
    const kinds = [...byKind.entries()].map(([kind, list]) => ({ kind, list, tokens: sumOf(list.map(i => i.tokens)) })).sort((a, b) => b.tokens - a.tokens);
    const mx = Math.max(1, ...kinds.map(k => k.tokens));
    drill = html`<div class="bd-mapdrill" role="region" aria-label=${'Project ' + proj}>
      <div class="bd-maph">${proj}: ${fmtN(p?.tokens)} tokens in ${p?.files ?? NA} files</div>
      ${kinds.map(k => html`<div key=${k.kind}>
        <${MapRow} label=${k.kind} tokens=${k.tokens} files=${null} max=${mx} segs=${k.list.map(i => ({ key: i.name, tokens: i.tokens, files: null }))} colorOf=${(s, i) => ITEM_COLORS[i % ITEM_COLORS.length]}/>
        <div class="bd-legend bd-mapitems">${k.list.map((i, j) => html`<span class="bd-li" key=${i.name}><i class="bd-sw" style=${{ background: ITEM_COLORS[j % ITEM_COLORS.length] }}></i>${i.name} <em>${fmtN(i.tokens)}</em></span>`)}</div>
      </div>`)}
    </div>`;
  }
  return html`<div class="bd-map">
    <div class="bd-chips">${POLICIES.map(p => html`<span key=${p.id} class="bd-chipv" title=${p.label + ': ' + fmtN(map.policy[p.id] || 0) + ' tokens'}><i class="bd-sw" style=${{ background: p.c }}></i>${p.label} <b>${fmtN(map.policy[p.id] || 0)}</b></span>`)}</div>
    <div class="bd-maph">By ${MAP_DIMS[by].toLowerCase()}, ${fmtN(map.total)} tokens. Bar length on a log scale</div>
    ${rows.map(r => html`<${MapRow} key=${r.key} label=${label(r.key)} tokens=${r.tokens} files=${r.files} max=${max} segs=${r.segs} colorOf=${segColor}
      title=${label(r.key) + ': ' + fmtN(r.tokens) + ' tokens in ' + r.files + ' files'}/>`)}
    <div class="bd-legend">${segKeys.map(k => html`<span class="bd-li" key=${k}><i class="bd-sw" style=${{ background: segColor({ key: k }) }}></i>${k}</span>`)}</div>
    <div class="bd-ptabs" role="group" aria-label="Projects">${projects.map(p => html`<button key=${p.key} type="button" aria-pressed=${proj === p.key ? 'true' : 'false'} onClick=${() => setProj(proj === p.key ? null : p.key)} title=${p.key + ': ' + fmtN(p.tokens) + ' tokens in ' + p.files + ' files'}>${p.key} <em>${fmtN(p.tokens)}</em></button>`)}</div>
    ${drill}
  </div>`;
}

function panelCtxMap(ctx, local) {
  const c = contextOf(ctx);
  const by = local.mode('by', 'kind');
  return {
    sub: 'Tokens by ' + MAP_DIMS[by].toLowerCase() + '. Hover a part for its total, pick a project for its files',
    modes: [{ key: 'by', label: 'Map by', def: 'kind', items: Object.entries(MAP_DIMS) }],
    view: { C: MapView, props: { map: c.map, by, none: noneText(c, 'No token data collected yet.') } },
    note: 'Not sent counts files such as transcripts, logs and settings. They are in the totals but are not context.',
  };
}

// ─── Agent memory ─────────────────────────────────────────────────

/** Memory entries by source, then profile, in the order they first appear. */
export function memoryGroups(entries) {
  const out = new Map();
  for (const m of entries) {
    if (!out.has(m.source)) out.set(m.source, { source: m.source, label: m.source_label || m.source, tokens: 0, count: 0, profiles: new Map() });
    const g = out.get(m.source);
    g.tokens += m.tokens || 0;
    g.count += 1;
    if (!g.profiles.has(m.profile)) g.profiles.set(m.profile, []);
    g.profiles.get(m.profile).push(m);
  }
  return [...out.values()].map(g => ({ ...g, profiles: [...g.profiles.entries()].map(([profile, items]) => ({ profile, items, tokens: sumOf(items.map(i => i.tokens)) })) }));
}

const LAST_TOKENS = s => { for (let i = s.vals.length - 1; i >= 0; i--) if (s.vals[i] != null) return fmtN(s.vals[i]); return NA; };

function MemoryView({ mem, none, ctx }) {
  const [open, setOpen] = useState({});
  const [path, setPath] = useState(null);
  const groups = useMemo(() => memoryGroups(mem.entries), [mem.entries]);
  const growth = mem.growth;
  const range = useMemo(() => {
    const starts = growth.map(g => g.ts);
    const step = starts.length > 1 ? (starts[starts.length - 1] - starts[0]) / (starts.length - 1) : 60;
    return { bucket_starts: starts, bucket_s: step };
  }, [growth]);
  const series = useMemo(() => [{ label: 'Memory tokens', c: 'var(--s1)', vals: growth.map(g => g.mem_tokens) }], [growth]);
  const isOpen = (k, def) => (open[k] === undefined ? def : open[k]);
  const toggle = (k, def) => setOpen(o => ({ ...o, [k]: !isOpen(k, def) }));
  const nowS = ctx.nowS;
  return html`<div class="bd-mem">
    ${growth.length >= 2 ? html`<${Chart} kind="line" series=${series} unit="n" h=${64} range=${range} sel=${null} onSelect=${null} legendFmt=${LAST_TOKENS} aria="Agent memory tokens over the last days"/>` : null}
    ${groups.length ? groups.map((g) => {
      const gk = 's:' + g.source;
      const gOpen = isOpen(gk, groups.length === 1);
      return html`<div key=${g.source} class="bd-mg">
        <button type="button" class="bd-mgh" aria-expanded=${gOpen ? 'true' : 'false'} onClick=${() => toggle(gk, groups.length === 1)}>${fold(gOpen, g.label)}<span class="bd-ct">${g.count + ' files, ' + fmtN(g.tokens) + ' tokens'}</span></button>
        ${gOpen ? g.profiles.map((p) => {
          const pk = 'p:' + g.source + '|' + p.profile;
          const pOpen = isOpen(pk, p.items.length <= 5);
          return html`<div key=${p.profile} class="bd-mp">
            <button type="button" class="bd-mgh bd-mph" aria-expanded=${pOpen ? 'true' : 'false'} title=${p.profile} onClick=${() => toggle(pk, p.items.length <= 5)}>${fold(pOpen, p.profile || 'No profile')}<span class="bd-ct">${p.items.length + ' files, ' + fmtN(p.tokens) + ' tokens'}</span></button>
            ${pOpen ? p.items.map(m => html`<div key=${m.file} class="bd-mitem">
              <button type="button" class="bd-mrow" aria-expanded=${path === m.file ? 'true' : 'false'} title=${m.file} onClick=${() => setPath(path === m.file ? null : m.file)}>
                <span class="bd-st"><i style=${{ background: m.recent ? 'var(--good)' : 'var(--line2)' }} title=${m.recent ? 'Changed in the last 5 min' : 'No change in the last 5 min'}></i></span>
                <span class="bd-mname">${m.name}</span>
                <span class="bd-ct">${fmtN(m.tokens) + ' tokens, ' + fmtN(m.lines) + ' lines' + (m.mtime ? ', ' + ago(m.mtime, nowS) : '')}</span>
              </button>
              ${path === m.file ? html`<${Preview} path=${m.file} ctx=${ctx} onClose=${() => setPath(null)}/>` : null}
            </div>`) : null}
          </div>`;
        }) : null}
      </div>`;
    }) : html`<div class="bd-empty">${none}</div>`}
  </div>`;
}

function panelMemory(ctx) {
  const c = contextOf(ctx);
  const mem = c.memory;
  return {
    sub: mem.entries.length + ' memory files, ' + fmtN(mem.tokens) + ' tokens. Click a file to read it',
    view: { C: MemoryView, props: { mem, none: noneText(c, 'No agent memory found.') } },
    note: 'Memory is not split by tool, so the Tool filter does not apply here.' + (mem.growth.length >= 2 ? ' The chart is the memory size since ' + stamp(mem.growth[0].ts, true) + ', as far back as the history goes within the last 7 days.' : ''),
  };
}

// ─── File inventory ───────────────────────────────────────────────

/** A live session's title from the board's agent list, else its id. */
function sessionName(ctx, id) {
  const a = (ctx.data?.agents || []).find(x => x.id === id || x.session_id === id);
  return a ? (a.title || id) + ' (' + id + ')' : id;
}

const LOAD_LABEL = { always: 'Every call', on_demand: 'On demand', conditional: 'When it applies', never: 'Never' };

function InventoryView({ c, group, ctx }) {
  const [path, setPath] = useState(null);
  const [folded, setFolded] = useState({});
  const nowS = ctx.nowS;
  const def = useMemo(() => {
    const all = c.files.flatMap(t => t.files);
    const keyOf = f => (group === 'kind' ? f.kind : group === 'tool' ? ctx.toolName(f.tool) : null);
    const rows = all.map(f => ({
      id: f.tool + '|' + f.path, groupKey: keyOf(f), go: () => setPath(p => (p === f.path ? null : f.path)),
      sort: { n: f.name, tool: f.tool, kind: f.kind, sc: f.scope, sz: f.size, t: f.tokens, s: f.policy, w: f.loaded_when, ch: f.mtime, ses: (f.sessions || []).length },
      cells: {
        n: { v: f.name, title: f.path + (f.recent ? '\nChanged in the last 5 min' : ''), dot: f.recent ? 'var(--good)' : 'var(--line2)' },
        tool: { v: ctx.toolName(f.tool), cls: 'dim' }, kind: { v: f.kind, cls: 'dim' }, sc: { v: f.scope || NA, cls: 'dim', title: (f.scope || NA) + (f.project ? ', project ' + f.project : '') },
        sz: { v: fmtBytes(f.size) }, t: { v: fmtN(f.tokens) },
        s: { v: SENT_LABEL[f.policy] || NA, cls: f.policy === 'no' ? 'dim' : '', title: 'sent_to_llm: ' + (f.sent_to_llm || 'not set') + (f.load ? '. Loads: ' + LOAD_LABEL[f.load] : '') },
        w: { v: f.loaded_when || NA, cls: 'dim' },
        ses: (f.sessions || []).length
          ? { v: fmtN(f.sessions.length), title: 'Live sessions this file can affect:\n' + f.sessions.map(id => sessionName(ctx, id)).join('\n') }
          : { v: NA, cls: 'dim', title: 'No live session works in this folder or below it' },
        ch: { v: f.mtime ? ago(f.mtime, nowS) : NA, cls: f.recent ? '' : 'dim', title: f.mtime ? 'Changed ' + stamp(f.mtime, true) + (f.recent ? '. Changed in the last 5 min' : '') : 'No change time known' },
      },
    }));
    const groupRow = group === 'none' ? null : (k, members) => {
      const fid = 'g:' + k;
      const isFolded = !!folded[fid];
      return {
        id: fid, group: true, folded: isFolded, sort: {},
        cells: {
          n: { v: k, sub: members.length + ' files', foldOn: true, foldOpen: !isFolded, foldLabel: isFolded ? 'Unfold this group' : 'Fold this group', fold: () => setFolded(x => ({ ...x, [fid]: !isFolded })) },
          sz: { v: fmtBytes(sumOf(members.map(m => m.sort.sz))) }, t: { v: fmtN(sumOf(members.map(m => m.sort.t))) },
        },
      };
    };
    return {
      cols: [
        { k: 'n', l: 'File', w: '220px' }, { k: 'tool', l: 'Tool', w: '104px' }, { k: 'kind', l: 'Kind', w: '92px' }, { k: 'sc', l: 'Scope', w: '70px' },
        { k: 'sz', l: 'Size', n: true, w: '64px' }, { k: 't', l: 'Tokens', n: true, w: '64px' }, { k: 's', l: 'Sent to model', w: '100px' },
        { k: 'w', l: 'Loaded when', w: '120px' }, { k: 'ch', l: 'Changed', n: true, w: '84px', t: 'A green dot: changed in the last 5 min' },
        { k: 'ses', l: 'Sessions', n: true, w: '76px', t: 'Live sessions that work in the file\'s folder or below it, so the file can affect them' },
      ],
      rows, groupRow, sort: { k: 't', dir: 'desc' }, limit: 200, none: noneText(c, 'No files found for these tools.'),
    };
  }, [c, group, folded, nowS, ctx]);
  const cut = c.files.filter(t => t.truncated);
  return html`<${Table} def=${def} label="Files each tool reads"/>
    ${cut.length ? html`<div class="bd-note">${cut.map(t => (t.label || ctx.toolName(t.tool)) + ' has ' + fmtN(t.count) + ' files; the largest ' + fmtN(t.files.length) + ' are listed').join('. ')}.</div>` : null}
    ${path ? html`<${Preview} key=${path} path=${path} ctx=${ctx} onClose=${() => setPath(null)}/>` : null}`;
}

function panelInventory(ctx, local) {
  const c = contextOf(ctx);
  const group = local.mode('group', 'kind');
  const n = sumOf(c.files.map(t => t.count));
  const recent = c.files.reduce((s, t) => s + t.files.filter(f => f.recent).length, 0);
  return {
    sub: fmtN(n) + ' files' + (recent ? ', ' + recent + ' changed in the last 5 min' : '') + '. Click a file to read it',
    modes: [{ key: 'group', label: 'Group files by', def: 'kind', items: [['kind', 'Kind'], ['tool', 'Tool'], ['none', 'No groups']] }],
    view: { C: InventoryView, props: { c, group } },
  };
}

// ─── Daily usage by model ─────────────────────────────────────────

const dayStart = d => { const [y, m, day] = String(d).split('-').map(Number); return new Date(y, m - 1, day).getTime() / 1000; };
const dayText = d => weekdayLabel(dayStart(d));

/** One series per model, the largest TOP_SERIES with a color and the rest as Other. */
export function dailySeries(daily, key) {
  const idx = new Map(daily.days.map((d, i) => [d, i]));
  const map = new Map();
  for (const r of daily.rows) {
    const i = idx.get(r.date);
    if (i === undefined) continue;
    const m = r.model || NO_MODEL;
    if (!map.has(m)) map.set(m, daily.days.map(() => 0));
    const vals = map.get(m);
    const v = r[key];
    vals[i] = v == null || vals[i] == null ? null : vals[i] + v;
  }
  const total = vals => sumOf(vals);
  const ranked = [...map.entries()].sort((a, b) => total(b[1]) - total(a[1]));
  const series = ranked.slice(0, TOP_SERIES).map(([m, vals]) => ({ label: m, c: colorFor('model', m), vals }));
  const rest = ranked.slice(TOP_SERIES);
  if (rest.length) {
    series.push({ label: 'Other (' + rest.length + ')', c: OTHER_COLOR, vals: daily.days.map((_, i) => rest.reduce((s, [, v]) => (s == null || v[i] == null ? null : s + v[i]), 0)) });
  }
  return series;
}

function panelDailyModels(ctx, local) {
  const c = contextOf(ctx);
  const d = c.daily;
  const by = local.mode('by', 'tokens');
  const key = by === 'cost' ? 'cost_usd' : by;
  const series = dailySeries(d, key);
  const rows = d.rows.map((r, i) => ({
    id: r.date + '|' + (r.model || '') + '|' + i,
    sort: { d: r.date, m: r.model, n: r.requests, i: r.input, o: r.output, cr: r.cache_read, cw: r.cache_write, t: r.tokens, c: r.cost_usd },
    cells: {
      d: { v: dayText(r.date), title: r.date }, m: { v: r.model || NO_MODEL, sw: colorFor('model', r.model || NO_MODEL) }, n: { v: fmtN(r.requests) },
      i: { v: fmtN(r.input) }, o: { v: fmtN(r.output) }, cr: { v: fmtN(r.cache_read), cls: 'dim' }, cw: { v: fmtN(r.cache_write), cls: 'dim' }, t: { v: fmtN(r.tokens) },
      c: { v: fmtUsd(r.cost_usd), title: r.cost_usd == null ? 'No price is known for this model' : 'List price, not a bill' },
    },
  }));
  const costs = d.rows.map(r => r.cost_usd);
  const cost = costs.some(v => v == null) ? null : sumOf(costs);
  return {
    sub: 'Model calls in the history, last 7 days. The time range does not apply',
    modes: [{ key: 'by', label: 'Show', def: 'tokens', items: [['tokens', 'Tokens'], ['cost', 'Cost'], ['requests', 'Calls']] }],
    stats: [
      { label: 'Tokens', value: fmtN(sumOf(d.rows.map(r => r.tokens))) },
      { label: 'Calls', value: fmtN(sumOf(d.rows.map(r => r.requests))) },
      { label: 'Cost', value: fmtUsd(cost), title: cost == null && d.rows.length ? 'Some models have no known price, so the total is not known' : 'List price, not a bill' },
      { label: 'Models', value: String(d.models.length) },
    ],
    chart: d.days.length ? { kind: 'stack', series, unit: by === 'cost' ? 'usd' : 'n', h: 120, range: { bucket_starts: d.days.map(dayStart), bucket_s: 86400 }, aria: 'Daily ' + by + ' by model, last 7 days' } : null,
    table: {
      cols: [{ k: 'd', l: 'Day', w: '92px' }, { k: 'm', l: 'Model' }, { k: 'n', l: 'Calls', n: true, w: '52px' }, { k: 'i', l: 'Input', n: true, w: '58px' }, { k: 'o', l: 'Output', n: true, w: '58px' }, { k: 'cr', l: 'Cache read', n: true, w: '72px' }, { k: 'cw', l: 'Cache write', n: true, w: '76px' }, { k: 't', l: 'Total', n: true, w: '58px' }, { k: 'c', l: 'Cost', n: true, w: '58px' }],
      rows, sort: { k: 'd', dir: 'desc' }, none: noneText(c, 'No model calls in the last 7 days.'),
    },
  };
}

// ─── Lifetime totals each tool reports ────────────────────────────

const COST_NOTE = { reported: 'reported', estimated: 'estimate' };

function lifetimeDef(list, ctx, open, setOpen, errOpen, setErrOpen) {
  const rows = [];
  for (const t of list) {
    const isOpen = !!open[t.tool];
    const reqs = t.by_model.some(m => m.requests != null) ? sumOf(t.by_model.map(m => m.requests)) : null;
    const q = t.quota || {};
    rows.push({
      id: t.tool,
      sort: { tool: t.label || t.tool, src: t.source, asof: t.as_of, i: t.input, o: t.output, cr: t.cache_read, cw: t.cache_write, s: t.sessions, msg: t.messages, req: reqs, c: t.cost_usd, pr: t.premium_requests, api: q.api_duration_ms, e: t.errors.length },
      cells: {
        tool: { v: t.label || ctx.toolName(t.tool), sw: colorFor('tool', t.tool), foldOn: t.by_model.length > 0, foldSp: !t.by_model.length, foldOpen: isOpen, foldLabel: isOpen ? 'Fold the models' : 'Unfold the models', fold: () => setOpen({ ...open, [t.tool]: !isOpen }) },
        src: { v: t.source || NA, cls: 'dim', sub: t.confidence == null ? '' : Math.round(t.confidence * 100) + '% sure', title: 'Read from ' + (t.source || NA) + (t.token_quality ? '. Tokens: ' + t.token_quality : '') },
        asof: { v: t.as_of || 'Now', cls: 'dim', title: t.as_of ? 'This source is a cache the tool last computed on ' + t.as_of + '. Later usage is not in these totals.' : 'Read from the tool\'s live files' },
        i: { v: fmtN(t.input) }, o: { v: fmtN(t.output) }, cr: { v: fmtN(t.cache_read), cls: 'dim' }, cw: { v: fmtN(t.cache_write), cls: 'dim' },
        s: { v: fmtN(t.sessions) }, msg: { v: fmtN(t.messages) }, req: { v: fmtN(reqs) },
        c: { v: fmtUsd(t.cost_usd), sub: COST_NOTE[t.cost_quality] || '', title: t.cost_reason || (t.cost_usd == null ? 'No price is known for this usage' : 'List price, not a bill') },
        pr: { v: fmtN(t.premium_requests), cls: t.premium_requests ? '' : 'dim', title: 'Premium requests the tool counts against its quota' + (q.current_model ? '. Model: ' + q.current_model : '') },
        api: { v: fmtMs(q.api_duration_ms), cls: 'dim', title: 'Time spent waiting on the model API' + (q.lines_added != null ? '. Code changes: +' + q.lines_added + ' −' + q.lines_removed + ' in ' + q.files_modified + ' files' : '') },
        e: t.errors.length
          ? { v: t.errors.length + (t.errors.length === 1 ? ' error' : ' errors'), cls: 'lk', go: () => setErrOpen({ ...errOpen, [t.tool]: !errOpen[t.tool] }), title: errOpen[t.tool] ? 'Fold the errors' : 'Show the errors, newest first' }
          : { v: 'None', cls: 'dim' },
      },
    });
    if (isOpen) {
      for (const m of t.by_model) {
        rows.push({
          id: t.tool + '|' + m.model, parentId: t.tool, level: 1,
          sort: { tool: m.model, i: m.input, o: m.output, cr: m.cache_read, cw: m.cache_write, req: m.requests, c: m.cost_usd },
          cells: { tool: { v: m.model, pad: 16, foldSp: true, sw: colorFor('model', m.model) }, i: { v: fmtN(m.input) }, o: { v: fmtN(m.output) }, cr: { v: fmtN(m.cache_read), cls: 'dim' }, cw: { v: fmtN(m.cache_write), cls: 'dim' }, req: { v: fmtN(m.requests) }, c: { v: fmtUsd(m.cost_usd) } },
        });
      }
    }
  }
  return {
    cols: [
      { k: 'tool', l: 'Tool', w: '170px' }, { k: 'src', l: 'Source', w: '120px' }, { k: 'asof', l: 'As of', w: '84px', t: 'When a cached source was last computed' },
      { k: 'i', l: 'Input', n: true, w: '62px' }, { k: 'o', l: 'Output', n: true, w: '62px' }, { k: 'cr', l: 'Cache read', n: true, w: '72px' }, { k: 'cw', l: 'Cache write', n: true, w: '76px' },
      { k: 's', l: 'Sessions', n: true, w: '62px' }, { k: 'msg', l: 'Messages', n: true, w: '66px' }, { k: 'req', l: 'Requests', n: true, w: '66px' },
      { k: 'c', l: 'Cost', n: true, w: '76px' }, { k: 'pr', l: 'Premium', n: true, w: '64px', t: 'Premium requests used' }, { k: 'api', l: 'API time', n: true, w: '70px' }, { k: 'e', l: 'Errors', w: '84px', t: 'The newest 20 errors the tool logged' },
    ],
    rows, tree: true, sort: { k: 'i', dir: 'desc' },
  };
}

function LifetimeView({ list, none, ctx }) {
  const [open, setOpen] = useState({});
  const [errOpen, setErrOpen] = useState({});
  const def = useMemo(() => lifetimeDef(list, ctx, open, setOpen, errOpen, setErrOpen), [list, ctx, open, errOpen]);
  if (!list.length) return html`<div class="bd-empty">${none}</div>`;
  return html`<${Table} def=${def} label="Lifetime totals each tool reports"/>
    ${list.filter(t => errOpen[t.tool] && t.errors.length).map(t => html`<div key=${t.tool} class="bd-errl" role="region" aria-label=${'Errors ' + (t.label || t.tool) + ' reported'}>
      <div class="bd-prevh"><b>${'Errors ' + (t.label || ctx.toolName(t.tool)) + ' reported, newest first (' + t.errors.length + ')'}</b><span class="bd-sp"></span>
        <button type="button" class="bd-ib-btn" aria-label="Fold the errors" title="Fold the errors" onClick=${() => setErrOpen({ ...errOpen, [t.tool]: false })}><${Ico} d=${PATHS.close}/></button></div>
      ${t.errors.map((e, i) => html`<div key=${i} class="bd-errrow"><span class="bd-mono bd-dim">${e.ts || NA}</span><span class="bd-tag bd-tag-crit">${e.type || 'error'}</span><span class="bd-errm" title=${e.message}>${e.message || NA}</span>${e.model ? html`<span class="bd-mono bd-dim">${e.model}</span>` : null}</div>`)}
    </div>`)}`;
}

function panelLifetime(ctx) {
  const c = contextOf(ctx);
  const list = c.telemetry;
  const asOf = list.filter(t => t.as_of);
  return {
    sub: 'What each tool keeps about its own use, since it was installed. The time range does not apply',
    view: { C: LifetimeView, props: { list, none: noneText(c, 'No tool reports lifetime totals.') } },
    note: asOf.length ? asOf.map(t => (t.label || ctx.toolName(t.tool)) + ' reads a cache computed on ' + t.as_of).join('. ') + '. Later usage is not in those totals.' : null,
  };
}

// ─── Workflows and prompt files ───────────────────────────────────

const TYPE_LABEL = { workflow: 'Workflow', prompt: 'Prompt file' };

function panelWorkflows(ctx, local) {
  const c = contextOf(ctx);
  const show = local.mode('show', 'all');
  const list = c.workflows.filter(w => show === 'all' || w.type === show);
  const rows = list.map(w => ({
    id: w.path, go: () => ctx.actions.openFile?.(w.path, 1),
    sort: { n: w.name, ty: w.type, tool: w.tool, sz: w.size, t: w.tokens, ch: w.mtime },
    cells: {
      n: { v: w.name, title: w.path, sub: tailPath(w.path, 3) }, ty: { v: TYPE_LABEL[w.type] || w.type, cls: 'dim' }, tool: { v: ctx.toolName(w.tool), sw: colorFor('tool', w.tool) },
      sz: { v: fmtBytes(w.size) }, t: { v: fmtN(w.tokens) }, ch: { v: w.mtime ? ago(w.mtime, ctx.nowS) : NA, cls: 'dim', title: w.mtime ? stamp(w.mtime, true) : NA },
    },
  }));
  const wf = c.workflows.filter(w => w.type === 'workflow').length;
  return {
    sub: wf + ' workflows, ' + (c.workflows.length - wf) + ' prompt files. Click one for its text',
    modes: [{ key: 'show', label: 'Show', def: 'all', items: [['all', 'All'], ['workflow', 'Workflows'], ['prompt', 'Prompt files']] }],
    table: {
      cols: [{ k: 'n', l: 'Name' }, { k: 'ty', l: 'Type', w: '88px' }, { k: 'tool', l: 'Tool', w: '120px' }, { k: 'sz', l: 'Size', n: true, w: '64px' }, { k: 't', l: 'Tokens', n: true, w: '64px' }, { k: 'ch', l: 'Changed', n: true, w: '84px' }],
      rows, sort: { k: 'n', dir: 'asc' }, primary: 'n',
      none: noneText(c, 'No workflow or prompt files found. Workflows are .workflow.md files, as in .github/workflows/; prompt files are .prompt.md files and slash commands.'),
    },
  };
}

export const CONTEXT_BUILDERS = {
  budget: panelBudget, tokenSplit: panelTokenSplit, ctxMap: panelCtxMap, memory: panelMemory,
  inventory: panelInventory, dailyModels: panelDailyModels, lifetime: panelLifetime, workflows: panelWorkflows,
};

/** The rail line of the Context section. */
export function contextSummary(data) {
  const c = data?.contextData || EMPTY_CONTEXT;
  if (!c.loaded) return 'n/a';
  const top = c.budget.tools.reduce((m, b) => (b.always_share > (m?.always_share ?? -1) ? b : m), null);
  const mem = c.memory.entries.length;
  return (top ? fmtWindowShare(top.always_share) + ' of a window, ' : 'No context files, ') + mem + (mem === 1 ? ' memory file' : ' memory files');
}
