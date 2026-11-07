// ─── Agent drawer: Team — subagents and tasks the tool reported ───
// From the entity state that aictl builds from hook events and subagent files
// (/api/session-stats). A tool that sends none of these has no team here.
import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import * as api from '../../../api.js';
import { FixedPanel, subagentDef, useDetail } from '../Drawer.js';
import { NA, fmtDur, fmtN, stamp } from '../format.js';
import Table from '../Table.js';
import { Wait, SessionNote, isActive, sessionIdOf } from './common.js';

const STATE = {
  active: { label: 'Active', dot: 'var(--good)' },
  idle: { label: 'Idle', dot: 'var(--warn)' },
  ended: { label: 'Ended', dot: 'var(--ink3)' },
  not_spawned: { label: 'Not started', dot: 'var(--ink3)' },
  pending: { label: 'Pending', dot: 'var(--ink3)' },
  done: { label: 'Done', dot: 'var(--good)' },
};
const stateOf = s => STATE[s] || { label: s || NA, dot: 'var(--ink3)' };
export const TASK_COLUMNS = [['pending', 'Pending'], ['active', 'Active'], ['done', 'Done']];

/** Agents in tree order: each agent follows its parent, one level deeper. */
export function treeOrder(agents) {
  const ids = new Set(agents.map(x => x.agent_id));
  const kids = new Map();
  for (const x of agents) {
    const p = x.parent_agent_id && ids.has(x.parent_agent_id) ? x.parent_agent_id : '';
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p).push(x);
  }
  const out = [];
  const walk = (p, depth) => {
    for (const x of (kids.get(p) || []).sort((u, v) => (u.started_at || 0) - (v.started_at || 0))) {
      out.push({ ...x, depth });
      if (depth < 8) walk(x.agent_id, depth + 1);
    }
  };
  walk('', 0);
  return out;
}

export default function TeamTab({ a, st, ctx, act, data: detail }) {
  const sid = sessionIdOf(a);
  const tick = isActive(st) ? ctx.refreshKey : 0;
  const { data, error } = useDetail(() => api.getSessionStats(sid).catch(e => (e?.status === 404 ? {} : Promise.reject(e))), 'team:' + sid, tick);
  const agents = useMemo(() => treeOrder(Array.isArray(data?.agents) ? data.agents : []), [data]);
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const def = useMemo(() => {
    const now = Date.now() / 1000;
    return {
    cols: [{ k: 'n', l: 'Agent' }, { k: 's', l: 'State', w: '96px' }, { k: 'm', l: 'Model', w: '120px' }, { k: 't', l: 'Task' }, { k: 'd', l: 'Time', n: true, w: '64px' }, { k: 'tok', l: 'Tokens', n: true, w: '64px' }],
    rows: agents.map(x => {
      const s = stateOf(x.state);
      const tok = (x.input_tokens || 0) + (x.output_tokens || 0);
      const dur = x.started_at ? (x.ended_at || now) - x.started_at : null;
      return {
        id: x.agent_id,
        sort: { n: x.agent_id, d: dur, tok },
        cells: { n: { v: x.agent_type || x.agent_id, sub: x.agent_type ? x.agent_id : '', pad: x.depth * 14, title: x.agent_id }, s: { v: s.label, dot: s.dot }, m: { v: x.model || NA, cls: 'dim' }, t: { v: x.task || NA, cls: 'dim', title: x.task || '' }, d: { v: fmtDur(dur) }, tok: { v: tok ? fmtN(tok) : NA } },
      };
    }),
    none: 'No agents.',
    };
  }, [agents]);
  const subs = Array.isArray(detail?.subagents) ? detail.subagents : [];
  const subDef = useMemo(() => subagentDef(subs, ctx, act, true), [detail, ctx.stopped]);
  if (!data) return html`<${Wait} error=${error} what="the team"/>`;
  if (!agents.length && !tasks.length && subs.length) {
    return html`<${SessionNote} a=${a}/>
      <${FixedPanel} id="agtm" title="Team" sub=${subs.length + ' subagents'}>
        <div class="bd-note">Tasks and messages between agents are not recorded for this tool. The subagents come from the session files.</div>
        <${Table} def=${subDef} label="Team"/>
      </${FixedPanel}>`;
  }
  if (!agents.length && !tasks.length) {
    return html`<${SessionNote} a=${a}/><${FixedPanel} id="agtm" title="Team"><div class="bd-empty">${(ctx.toolName ? ctx.toolName(a.tool) : a.tool) || 'This tool'} recorded no team for this session: no subagent or task events reached aictl.</div></${FixedPanel}>`;
  }
  return html`<${SessionNote} a=${a}/>
    <${FixedPanel} id="agtm" title="Team" sub=${agents.length + ' agents, ' + agents.filter(x => x.state === 'active').length + ' active'}><${Table} def=${def} label="Team"/></${FixedPanel}>
    <${FixedPanel} id="agtk" title="Tasks" sub=${tasks.length + ' tasks'}>
      <div class="bd-ag-board">${TASK_COLUMNS.map(([id, label]) => {
        const items = tasks.filter(t => (t.state || 'pending') === id);
        return html`<section key=${id} class="bd-ag-colb" aria-label=${label}>
          <h4 style=${{ borderColor: stateOf(id).dot }}>${label} <em>${items.length}</em></h4>
          ${items.length ? items.map(t => html`<div key=${t.task_id} class="bd-ag-card"><b>${t.name || t.task_id}</b>${t.agent_id ? html`<span>${'Agent ' + t.agent_id}</span>` : null}${t.created_at ? html`<span>${stamp(t.created_at, true)}</span>` : null}</div>`) : html`<div class="bd-ag-none">None</div>`}
        </section>`;
      })}</div>
    </${FixedPanel}>`;
}
