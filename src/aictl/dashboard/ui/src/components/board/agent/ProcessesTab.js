// ─── Agent drawer: Processes — the process tree and what it started ─
// The live tree comes from the monitor while the agent runs, indented by parent.
// The recorded list (/api/session-processes) is kept after the session ends.
import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import * as api from '../../../api.js';
import { FixedPanel, Pending, useDetail } from '../Drawer.js';
import { NA, fmtBytes, fmtCpu, fmtMem, fmtN, stamp } from '../format.js';
import { Stats } from '../Panel.js';
import Table from '../Table.js';
import { Failed, SessionNote, isActive, sessionIdOf } from './common.js';

const INDENT = 16;

/** Recorded processes as a tree: the lead first, every other process under it. */
export function recordedTree(processes) {
  const list = Array.isArray(processes) ? processes : [];
  const lead = list.filter(p => p.role === 'lead');
  const rest = list.filter(p => p.role !== 'lead');
  return [...lead.map(p => ({ ...p, depth: 0 })), ...rest.map(p => ({ ...p, depth: lead.length ? 1 : 0 }))];
}

/** Count, CPU and RAM of each program name the agent started. */
export function byName(subprocesses, tree) {
  const rows = new Map();
  for (const s of subprocesses || []) rows.set(s.name, { name: s.name, count: s.count, cpu: null, mem: null });
  for (const p of tree || []) {
    if (!p.name) continue;
    const r = rows.get(p.name) || { name: p.name, count: null, cpu: null, mem: null };
    if (p.cpu_percent != null) r.cpu = (r.cpu || 0) + p.cpu_percent;
    if (p.mem_mb != null) r.mem = (r.mem || 0) + p.mem_mb;
    rows.set(p.name, r);
  }
  return [...rows.values()];
}

export default function ProcessesTab({ a, st, ctx, data }) {
  const sid = sessionIdOf(a);
  const tick = isActive(st) ? ctx.refreshKey : 0;
  const rec = useDetail(() => api.getSessionProcesses(sid), 'procs:' + sid, tick);
  const res = data.resources || {};
  const live = useMemo(() => res.process_tree || [], [res.process_tree]);
  const recorded = useMemo(() => recordedTree(rec.data?.processes), [rec.data]);
  const liveDef = useMemo(() => ({
    cols: [{ k: 'n', l: 'Process' }, { k: 'pid', l: 'PID', n: true, w: '64px' }, { k: 'r', l: 'Role', w: '90px' }, { k: 'c', l: 'CPU', n: true, w: '56px' }, { k: 'm', l: 'RAM', n: true, w: '64px' }],
    rows: live.map((p, i) => ({ id: p.pid ?? i, cells: { n: { v: p.name || NA, pad: p.depth * INDENT, title: p.name + (p.ppid != null ? ', parent ' + p.ppid : '') }, pid: { v: p.pid ?? NA, cls: 'dim' }, r: { v: p.role || NA, cls: 'dim' }, c: { v: fmtCpu(p.cpu_percent) }, m: { v: fmtMem(p.mem_mb) } } })),
    none: 'No live process.', primary: 'n',
  }), [live]);
  const recDef = useMemo(() => ({
    cols: [{ k: 'pid', l: 'PID' }, { k: 'r', l: 'Role', w: '96px' }, { k: 't', l: 'Tool', w: '120px' }, { k: 'j', l: 'Joined', w: '110px' }],
    rows: recorded.map((p, i) => ({ id: p.pid + ':' + i, cells: { pid: { v: p.pid, pad: p.depth * INDENT }, r: { v: p.role || 'unknown' }, t: { v: p.tool ? (ctx.toolName ? ctx.toolName(p.tool) : p.tool) : NA, cls: 'dim' }, j: { v: p.joined_at ? stamp(p.joined_at, true) : NA, cls: 'dim' } } })),
    none: 'No process is recorded for this session.', primary: 'pid',
  }), [recorded, ctx]);
  const names = useMemo(() => byName(res.subprocesses, live), [res.subprocesses, live]);
  const nameDef = useMemo(() => ({
    cols: [{ k: 'n', l: 'Program' }, { k: 'c', l: 'Started', n: true, w: '64px', t: 'Times the agent started it' }, { k: 'cpu', l: 'CPU now', n: true, w: '64px' }, { k: 'm', l: 'RAM now', n: true, w: '70px' }],
    rows: names.map(r => ({ id: r.name, sort: { n: r.name, c: r.count, cpu: r.cpu, m: r.mem }, cells: { n: { v: r.name, cls: 'm' }, c: { v: fmtN(r.count) }, cpu: { v: fmtCpu(r.cpu) }, m: { v: fmtMem(r.mem) } } })),
    sort: { k: 'c', dir: 'desc' }, limit: 20, none: 'No subprocess seen. The monitor counts them only while the agent runs.',
  }), [names]);
  const extras = [
    { label: 'Bytes in', value: fmtBytes(res.bytes_in), title: 'Network bytes received by its processes, while aictl watched' },
    { label: 'Bytes out', value: fmtBytes(res.bytes_out), title: 'Network bytes sent by its processes, while aictl watched' },
    { label: 'State writes', value: fmtBytes(res.state_writes), title: 'Growth of the tool state files' },
    { label: 'Peak CPU', value: fmtCpu(res.cpu_peak) },
    { label: 'Tool calls a minute', value: res.tool_calls_per_min == null ? NA : String(res.tool_calls_per_min) },
  ];
  return html`<${SessionNote} a=${a}/>
    <${FixedPanel} id="agrx" title="Resources"><${Stats} stats=${extras}/><div class="bd-note">Network, state writes and peak CPU come from the live monitor and are n/a once the agent stops.</div></${FixedPanel}>
    ${live.length ? html`<${FixedPanel} id="agpt" title="Process tree" sub=${live.length + ' processes, indented under their parent'}><${Table} def=${liveDef} label="Process tree"/></${FixedPanel}>` : null}
    <${FixedPanel} id="agpr" title="Processes recorded" sub=${rec.data ? fmtN(rec.data.total ?? recorded.length) + ' processes, kept after the session ends' : ''}>
      ${rec.data ? html`<${Table} def=${recDef} label="Processes recorded"/>` : rec.error ? html`<${Failed} error=${rec.error} what="the processes"/>` : html`<${Pending}/>`}
    </${FixedPanel}>
    <${FixedPanel} id="agsp" title="Subprocesses by name"><${Table} def=${nameDef} label="Subprocesses by name"/></${FixedPanel}>`;
}
