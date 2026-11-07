// ─── Agent drawer: Overview additions — git, run history, trends ──
// GitBadge sits in the drawer header. OverviewExtras adds the run history of
// the same tool in the same project and small charts of CPU, RAM, network and
// tokens a minute over the agent's time.
import { html } from 'htm/preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as api from '../../../api.js';
import Chart from '../Chart.js';
import { FixedPanel, Pending, useDetail } from '../Drawer.js';
import { NA, fmtDur, fmtN, stamp } from '../format.js';
import Table from '../Table.js';
import { Failed, isActive, sessionIdOf, windowOf } from './common.js';

const MAX_COMMITS = 20;

/** Branch, commit and the commits attributed to the session; the list opens on click. */
export function GitBadge({ git, a }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null);
  const sid = sessionIdOf(a);
  const count = state?.commits ? state.commits.length : git?.commits_in_session || 0;
  useEffect(() => {
    if (!open || state) return undefined;
    let live = true;
    api.getSessionCommits(sid).then((d) => { if (live) setState({ commits: d?.commits || [], branch: d?.branch || '' }); })
      .catch((e) => { if (live) setState({ error: e?.message || 'unknown error' }); });
    return () => { live = false; };
  }, [open, state, sid]);
  if (!git || (!git.branch && !git.commit && !count)) return null;
  const label = count === 1 ? '1 commit in this session' : count + ' commits in this session';
  const canLook = !count && !!git.branch && !!a.ended_at;
  return html`<div class="bd-ag-git">
    ${git.branch ? html`<span class="bd-ag-pill" title="Branch the session started on">${'Branch ' + git.branch}</span>` : null}
    ${git.commit ? html`<span class="bd-ag-pill" title=${git.commit}>${'Commit ' + git.commit.slice(0, 7)}</span>` : null}
    ${count || canLook ? html`<span class="bd-anch">
      <button type="button" class="bd-ag-pill bd-ag-pillb" aria-expanded=${open ? 'true' : 'false'} onClick=${() => setOpen(!open)}>${count ? label : 'Look for commits'}</button>
      ${open ? html`<div class="bd-menu bd-ag-commits" role="group" aria-label="Commits of this session">
        ${!state ? html`<div class="bd-empty">Loading...</div>`
          : state.error ? html`<div class="bd-empty">${'Could not load the commits: ' + state.error}</div>`
            : !state.commits.length ? html`<div class="bd-empty">No commit in the time of this session.</div>`
              : html`<ul>${state.commits.slice(0, MAX_COMMITS).map(c => {
                const off = state.branch && !c.current_branch_match;
                return html`<li key=${c.sha} class=${off ? 'bd-ag-off' : null} title=${off ? 'Not on ' + state.branch : (c.author_name || '')}><code>${c.short_sha || String(c.sha).slice(0, 7)}</code><span>${c.subject || 'No subject'}</span>${off ? html`<em>${'not on ' + state.branch}</em>` : null}</li>`;
              })}${state.commits.length > MAX_COMMITS ? html`<li class="bd-ag-dim">${'And ' + (state.commits.length - MAX_COMMITS) + ' more'}</li>` : null}</ul>`}
      </div>` : null}
    </span>` : null}
  </div>`;
}

export function median(values) {
  const v = values.filter(x => x != null && Number.isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Up, down or about the same as the median: within 5% is the same. */
export function trend(value, med) {
  if (value == null || !med) return { dir: 'same', pct: null };
  const pct = (value - med) / med;
  if (Math.abs(pct) < 0.05) return { dir: 'same', pct };
  return { dir: pct > 0 ? 'up' : 'down', pct };
}

const pctText = t => (t.pct == null ? '' : t.dir === 'same' ? 'about the same' : (t.pct > 0 ? '+' : '') + Math.round(t.pct * 100) + '%');

function RunHistory({ a, data }) {
  const [showRuns, setShowRuns] = useState(false);
  const runs = useMemo(() => data.runs || [], [data.runs]);
  const prior = runs.filter(r => !r.current);
  const cur = runs.find(r => r.current);
  const tokens = [a.input, a.output].some(v => v != null) ? (a.input || 0) + (a.output || 0) : null;
  const now = {
    duration_s: cur ? cur.duration_s : a.started_at ? (a.ended_at || Date.now() / 1000) - a.started_at : null,
    tokens: cur ? cur.tokens : tokens,
    file_churn: cur ? cur.file_churn : (data.files || []).length,
  };
  const metrics = [['Duration', 'duration_s', fmtDur], ['Tokens', 'tokens', fmtN], ['Files changed', 'file_churn', v => (v == null ? NA : String(Math.round(v)))]];
  const def = useMemo(() => ({
    cols: [{ k: 'e', l: 'Ended', w: '110px' }, { k: 'd', l: 'Duration', n: true, w: '80px' }, { k: 't', l: 'Tokens', n: true, w: '70px' }, { k: 'f', l: 'Files', n: true, w: '50px' }, { k: 'r', l: 'Tokens vs median', n: true, w: '110px' }],
    rows: runs.map(r => ({ id: r.session_id, sort: { e: r.ended_at, d: r.duration_s, t: r.tokens, f: r.file_churn, r: r.tokens_ratio }, cells: { e: { v: stamp(r.ended_at, true), sub: r.current ? 'this run' : '' }, d: { v: fmtDur(r.duration_s) }, t: { v: fmtN(r.tokens) }, f: { v: fmtN(r.file_churn) }, r: { v: r.tokens_ratio == null ? NA : r.tokens_ratio.toFixed(2) + 'x', cls: 'dim' } } })),
    sort: { k: 'e', dir: 'desc' }, limit: 30, none: 'No ended run in 30 days.',
  }), [runs]);
  if (!a.project) return null;
  return html`<${FixedPanel} id="agrun" title="Run history" sub=${prior.length + ' other runs of this tool in this project, 30 days'}>
    ${prior.length < 2 ? html`<div class="bd-empty">Not enough runs to compare: a comparison needs at least 2 other ended runs.</div>` : html`
      <div class="bd-ag-trend" role="group" aria-label=${'This run against the median of ' + prior.length + ' runs'}>${metrics.map(([label, key, fmt]) => {
        const med = median(prior.map(r => r[key]));
        const t = trend(now[key], med);
        return html`<div key=${key} data-dir=${t.dir} title=${label + ': this run ' + fmt(now[key]) + ', median ' + fmt(med)}>
          <span class="bd-l">${label}</span><b>${fmt(now[key])}</b>
          <span class=${'bd-ag-delta bd-ag-' + t.dir}>${(t.dir === 'up' ? '↑ ' : t.dir === 'down' ? '↓ ' : '') + pctText(t)}</span>
          <em>${'median ' + fmt(med)}</em>
        </div>`;
      })}</div>`}
    <button type="button" class="bd-more" aria-expanded=${showRuns ? 'true' : 'false'} onClick=${() => setShowRuns(!showRuns)}>${showRuns ? 'Hide the runs' : 'Show the ' + runs.length + ' runs'}</button>
    ${showRuns ? html`<${Table} def=${def} label="Runs"/>` : null}
  </${FixedPanel}>`;
}

const BUCKETS = 40;

/** Values in equal buckets over the window: the average, or the sum for counts. */
export function bucketize(points, since, until, sum = false) {
  const step = Math.max(1, (until - since) / BUCKETS);
  const total = new Array(BUCKETS).fill(null);
  const seen = new Array(BUCKETS).fill(0);
  for (const p of points) {
    if (p.ts == null || p.value == null || p.ts < since || p.ts > until) continue;
    const i = Math.min(BUCKETS - 1, Math.floor((p.ts - since) / step));
    total[i] = (total[i] || 0) + p.value;
    seen[i]++;
  }
  const vals = total.map((v, i) => (v == null ? null : sum ? v : v / seen[i]));
  return { vals, starts: Array.from({ length: BUCKETS }, (_, i) => since + i * step), step };
}

function samplesOf(metric, sid, tool, since) {
  return api.getSamples(metric, { since, limit: 1000, tags: { session_id: sid } })
    .then(rows => (Array.isArray(rows) && rows.length ? rows : tool ? api.getSamples(metric, { since, limit: 1000, tags: { 'aictl.tool': tool } }) : []))
    .then(rows => (Array.isArray(rows) ? rows : []));
}

const SPARKS = [
  { id: 'cpu', label: 'CPU', metric: 'process.cpu.utilization', unit: 'cpu', c: 'var(--s1)', scale: v => v * 100 },
  { id: 'ram', label: 'RAM', metric: 'process.memory.usage', unit: 'mem', c: 'var(--s3)', scale: v => v / 1048576 },
  { id: 'net', label: 'Network', metric: 'process.network.io', unit: 'n', c: 'var(--s4)', scale: v => v, sum: true, suffix: ' B' },
];

function Sparklines({ a, data, tick }) {
  const sid = sessionIdOf(a);
  const win = windowOf(a);
  const load = () => Promise.all(SPARKS.map(s => samplesOf(s.metric, sid, a.tool, win.since).catch(() => [])));
  const { data: samples, error } = useDetail(load, 'samples:' + sid, tick);
  const charts = useMemo(() => {
    const out = SPARKS.map((s, i) => {
      const b = bucketize((samples?.[i] || []).map(r => ({ ts: r.ts, value: r.value == null ? null : s.scale(r.value) })), win.since, win.until, s.sum);
      return { ...s, b };
    });
    const tok = bucketize((data.turns || []).map(t => ({ ts: t.ts, value: (t.input || 0) + (t.output || 0) })), win.since, win.until, true);
    const perMin = tok.step / 60;
    out.push({ id: 'tok', label: 'Tokens a minute', unit: 'n', c: 'var(--s2)', b: { ...tok, vals: tok.vals.map(v => (v == null ? null : v / perMin)) } });
    return out;
  }, [samples, data, win.since, win.until]);
  return html`<${FixedPanel} id="agspk" title="Over its time" sub=${stamp(win.since, true) + ' to ' + stamp(win.until, true)}>
    ${error ? html`<${Failed} error=${error} what="the samples"/>` : !samples ? html`<${Pending}/>` : html`<div class="bd-ag-sparks">${charts.map((c) => {
      const has = c.b.vals.some(v => v != null);
      const peak = has ? Math.max(...c.b.vals.filter(v => v != null)) : null;
      return html`<div key=${c.id} class="bd-ag-spark" data-chart=${c.id}>
        <div class="bd-ag-sparkh"><span>${c.label}</span><b>${has ? 'peak ' + (c.unit === 'cpu' ? Math.round(peak) + '%' : c.unit === 'mem' ? Math.round(peak) + ' MB' : fmtN(peak) + (c.suffix || '')) : 'no data'}</b></div>
        ${has ? html`<${Chart} kind="line" unit=${c.unit} h=${44} series=${[{ label: c.label, c: c.c, vals: c.b.vals }]} range=${{ bucket_starts: c.b.starts, bucket_s: c.b.step }} aria=${c.label + ' over the time of this agent'} legendFmt=${() => ''}/>` : null}
      </div>`;
    })}</div>`}
  </${FixedPanel}>`;
}

export function OverviewExtras({ a, data, st, ctx }) {
  const tick = isActive(st) ? ctx.refreshKey : 0;
  return html`${a.parent_id ? null : html`<${RunHistory} a=${a} data=${data}/>`}<${Sparklines} a=${a} data=${data} tick=${tick}/>`;
}
export default OverviewExtras;
