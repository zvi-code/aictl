import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { BoardSeries, DetailMachine, MachineLocal, MachinePipeline, TopicRuntimeAgent, TopicRuntimeProcess } from '../../../data/contract.gen'
import { Segmented } from '../../../ui/Segmented'
import { isStoredToolSelected } from '../../../utils/toolScope.js'
import { SeriesView } from '../../kinds/Series'
import type { PanelProps, Read, Row } from '../../types'
import { buckets, field, health, machine, metric, processes } from '../b'
import { Bars, bins, Comparisons, severityLabel, severityTone, StatStrip, topRows, usable } from '../Summary'
import { completeSum, coreBars, latestTotal, procTree } from './resources'
import { DataTable, detailRead, displayField, identity, join, Metrics, number, rowsFrom, scopedPath, scopeMatches, styles, text, toolName, View, withRows, type Entry } from './View'

type ReportedMachine = Extract<DetailMachine, { hosts: unknown }>
const inScope = (ctx: PanelProps['ctx'], row: { node_id: string }) =>
  Boolean(row.node_id) && (ctx.scope() !== 'node' || row.node_id === ctx.nodeId())

function useMachine(ctx: PanelProps['ctx'], restrictTools = false) {
  const response = ctx.detail<DetailMachine>(() => {
    if (ctx.scope() === 'local') return
    const query = new URLSearchParams()
    const tools = restrictTools ? ctx.tools() : null
    if (tools) query.set('tool', tools.length ? tools.join(',') : '-')
    return scopedPath(ctx, 'machine', query)
  })
  const wrongScope = () => {
    const data = response()?.data
    return data && (!('hosts' in data) || !scopeMatches(ctx, data) ||
      data.hosts.some(row => !inScope(ctx, row)) || data.recorded_processes.some(row => !inScope(ctx, row)))
  }
  const data = () => {
    const value = response()?.data
    return value && 'hosts' in value && !wrongScope() ? value as ReportedMachine : undefined
  }
  return {
    data,
    result: (value: unknown) => wrongScope()
      ? { state: 'error', message: 'The server did not confirm the requested node scope.' } as const
      : detailRead(response(), value, ctx.paused()),
  }
}

function selectedProcesses(ctx: PanelProps['ctx'], read: Read) {
  return (read.value as TopicRuntimeProcess[] | undefined)?.filter(process =>
    process.present && isStoredToolSelected(process.tool, ctx.tools()))
}

export function ResourceHistory(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const cpu = def.id === 'cpu'
  const source = def.sources[0]
  const history = createMemo(() => ctx.read(source))
  const data = () => history().value as BoardSeries['cpu'] | undefined
  const seriesIds = createMemo(() => Object.keys(data() ?? {}).sort(), {
    equals: (a, b) => a.length === b.length && a.every((id, index) => id === b[index]),
  })
  const live = createMemo(() => ctx.read(processes))
  const liveProcesses = createMemo(() => selectedProcesses(ctx, live()))
  const coresSource = { ...machine, path: 'cpu_per_core' }
  const coresRead = () => ctx.read(coresSource)
  const cores = createMemo(() => coreBars(coresRead().value as MachineLocal['cpu_per_core'] | undefined))
  const liveTotal = () => live().state === 'ready' || live().state === 'stale'
  const total = createMemo(() => {
    if (ctx.scope() === 'local' && liveTotal() && liveProcesses()?.length) {
      return completeSum(liveProcesses()!.map(row => cpu ? row.cpu_percent : row.memory_rss_bytes == null ? undefined : row.memory_rss_bytes / 1048576))
    }
    return data() ? latestTotal(data()!) : undefined
  })
  const liveReported = () => ctx.scope() === 'local' && liveTotal() && Boolean(liveProcesses()?.length)
  const metricLabel = () => liveReported() ? (live().state === 'stale' ? 'Last available total' : 'Current total') : 'Latest recorded total'
  const seriesKey = (id: string) => encodeURIComponent(id).replaceAll('.', '%2E')
  const columns = createMemo(() => seriesIds().map(id => ({
    ...def.columns[0], path: seriesKey(id), label: toolName(ctx, id),
  })))
  const series = () => ({
    ...history(), value: Object.fromEntries(seriesIds().map(id => [seriesKey(id), data()?.[id]])),
  })
  return <div class={styles.stack}>
    <p class={styles.note}>History follows the Tool filter and time range, not project, model or status.</p>
    <Metrics ctx={ctx} columns={[{ ...def.columns[0], label: `${metricLabel()} across tools` }]}
      value={{ [def.columns[0].path]: total() }} />
    <Show when={seriesIds().length} fallback={
      <View result={() => history().state === 'ready' ? { state: 'empty' } : history()} empty={def.empty} retry={ctx.refresh} />
    }>
      <div class={styles.resourceChart}>
        <SeriesView panel={props} columns={columns} source={series} axis={() => ctx.read(buckets)} time select
          description={cpu ? 'CPU by tool over time. 100% is one full core.' : 'Resident memory by tool over time (MiB).'} />
      </div>
    </Show>
    <Show when={cpu}>
      <View result={() => cores() ? coresRead() : coresRead().state === 'ready' ? { state: 'unavailable' } : coresRead()}
        retry={ctx.refresh} empty="No whole-machine core samples.">
        <p>Whole machine, all programs: {cores()?.label}</p>
        <div class={styles.cores} role="group" aria-label="Whole-machine CPU cores">
          <For each={cores()?.list} keyed={core => core.i}>{core =>
            <label title={core().title}>Core {core().i}
              <Show when={number(core().value) != null} fallback={<span>Not available from this source</span>}>
                <meter min={0} max={100} value={core().value!} aria-valuetext={`${core().value}% busy`} />
              </Show>
            </label>}
          </For>
        </div>
      </View>
    </Show>
  </div>
}

function runtimeAgents(ctx: PanelProps['ctx']) {
  return ctx.read({ topic: 'runtime.agent' }).value as TopicRuntimeAgent[] | undefined
}

export function Alerts(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const excluded = createMemo(() => new Set((runtimeAgents(ctx) ?? []).filter(agent => ctx.stopped(agent.session_id) || ctx.stopped(agent.id))
    .flatMap(agent => agent.pids ?? [])))
  const rows = createMemo(() => rowsFrom(((result().value ?? []) as MachineLocal['alerts']).flatMap(alert => {
    const pids = alert.pids ?? (alert.pid == null ? undefined : [alert.pid])
    const active = pids?.filter(pid => !excluded().has(pid))
    if (pids?.length && !active?.length) return []
    return [{ ...alert, pid_list: join(active), action: active?.length === pids?.length ? alert.action : undefined }]
  }), row => identity(row.kind, row.tool, row.pid, row.pids)))
  const reported = () => ctx.scope() === 'local' && usable(result()) && Array.isArray(result().value) ? rows() : undefined
  const severity = createMemo(() => reported() && bins(reported()!.map(({ row }) => row.severity), severityLabel, severityTone))
  return <div class={styles.stack}>
    <StatStrip label="Anomaly summary" items={[{ label: 'Process alerts', value: reported()?.length }]} />
    <Bars label="Alerts by severity" items={severity()} max={reported()?.length} />
    <View result={() => ctx.scope() !== 'local' ? { state: 'unavailable',
      message: 'Process anomalies are checked on this node only.' } : withRows(result(), rows())} retry={ctx.refresh} empty={def.empty}>
      <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={{
        label: ({ row }) => row.action ? 'Copy command' : '',
        run: ({ row }) => { const command = text(row.action); if (command) ctx.copy(command) },
      }} />
    </View>
  </div>
}

export function Processes(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const [mode, setMode] = createSignal('list')
  const [selected, setSelected] = createSignal<string>()
  const [closed, setClosed] = createSignal(new Set<number>())
  const local = () => ctx.scope() === 'local'
  const remote = useMachine(ctx, true)
  const runtime = createMemo(() => ctx.read(processes))
  const info = createMemo(() => new Map(((ctx.read(def.sources[1]).value ?? []) as MachineLocal['processes']).map(row => [row.pid, row])))
  const historical = createMemo(() => new Map((ctx.board('agents') ?? []).filter(agent => !agent.placeholder)
    .flatMap(agent => [agent.id, agent.session_id].flatMap(id => id ? [[id, agent] as const] : []))))
  const liveOwners = createMemo(() => {
    const map = new Map<number, TopicRuntimeAgent | null>()
    for (const agent of runtimeAgents(ctx) ?? []) {
      for (const pid of agent.pids ?? []) map.set(pid, map.has(pid) ? null : agent)
    }
    return map
  })
  const samples = createMemo(() => selectedProcesses(ctx, runtime()))
  const localRows = createMemo(() => (samples() ?? []).map(process => {
    const extra = info().get(process.pid)
    const candidate = liveOwners().get(process.pid)
    const owner = (process.session_id ? historical().get(process.session_id) : undefined) ??
      (candidate ? historical().get(candidate.session_id) ?? historical().get(candidate.native_session_id ?? '') : undefined)
    const mem = number(process.memory_rss_bytes)
    return { ...extra, ...process, name: process.name ?? extra?.name, ppid: process.ppid ?? extra?.ppid,
      mem_mb: mem == null ? extra?.mem_mb : mem / 1048576, owner: owner?.title ?? candidate?.title,
      anomaly_text: extra?.anomalies?.length ? extra.anomalies.map(item => `${item.severity}: ${item.text}`).join('; ')
        : extra?.anomalies ? 'None reported' : undefined,
      owner_id: owner?.id }
  }))
  const tree = createMemo(() => procTree(localRows(), row => row.pid, row => row.ppid))
  const activeTree = createMemo(() => {
    const blocked = new Set<number>()
    return tree().flatMap(({ x, parent, children, depth }) => {
      if (closed().has(x.pid) || (parent != null && blocked.has(parent))) blocked.add(x.pid)
      return parent != null && blocked.has(parent) ? [] :
        [{ ...x, name: `${'↳ '.repeat(Math.min(depth, 8))}${x.name}`, children }]
    })
  })
  const rows = createMemo(() => {
    if (local()) return rowsFrom(mode() === 'tree' ? activeTree() : localRows(), row => identity(row.pid, row.created_at))
    return rowsFrom((remote.data()?.recorded_processes ?? []).map(process => ({
      ...process, name: text(process.role) ?? 'Recorded process',
      owner: process.session_id, owner_id: (ctx.board('agents') ?? []).find(agent =>
        agent.node_id === process.node_id && !agent.placeholder && (agent.id === process.session_id || agent.session_id === process.session_id))?.id,
    })), row => identity(row.node_id, row.pid, row.joined_at, row.session_id))
  })
  const result = () => local() ? withRows(runtime(), rows()) : remote.result(remote.data()?.recorded_processes)
  const samplesForRank = createMemo(() => samples() && rowsFrom(samples()!.map(process => {
    const extra = info().get(process.pid)
    const rss = number(process.memory_rss_bytes)
    return { ...process, name: process.name ?? extra?.name, mem_mb: rss == null ? extra?.mem_mb : rss / 1048576 }
  }), row => identity(row.pid, row.created_at)))
  const processLabel = ({ row }: Entry) => `${text(row.name) ?? 'Process'} · PID ${row.pid}`
  const memory = createMemo(() => topRows(samplesForRank(), 'mem_mb', processLabel))
  const cpu = createMemo(() => topRows(samplesForRank(), 'cpu_percent', processLabel))
  const cpuField = def.columns.find(column => column.path === 'cpu_percent')!
  const ramField = def.columns.find(column => column.path === 'mem_mb')!
  const selectedRow = createMemo(() => rows().find(entry => entry.id === selected())?.row as Row | undefined)
  const toggle = (pid: number) => setClosed(value => {
    const next = new Set(value)
    if (next.has(pid)) next.delete(pid)
    else next.add(pid)
    return next
  })
  return <div class={styles.stack}>
    <StatStrip label="Process summary" items={[{
      label: local() ? 'Live processes' : 'Recorded process rows',
      value: local() ? samples()?.length : remote.data()?.recorded_processes?.length,
    }]} />
    <Comparisons>
      <Bars label="Top processes by CPU" items={local() ? cpu() : undefined} format={displayField(ctx, cpuField).format} />
      <Bars label="Top processes by resident memory" items={local() ? memory() : undefined} format={displayField(ctx, ramField).format} />
    </Comparisons>
    <View result={result} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>{local() ? 'Live processes. The time range does not apply.' : 'Recorded session processes. Local process diagnostics are not available.'}</p>
    <Show when={local()}>
      <Segmented label="Show processes as" value={mode()} onChange={setMode}
        options={[{ id: 'list', label: 'List' }, { id: 'tree', label: 'Tree' }]} />
    </Show>
    <Show when={selectedRow()}>{row =>
      <div class={styles.actions} role="group" aria-label={`Actions for process ${row().pid}`}>
        <Show when={mode() === 'tree' && row().children}>
          <button type="button" aria-expanded={closed().has(Number(row().pid)) ? 'false' : 'true'}
            onClick={() => toggle(Number(row().pid))}>{closed().has(Number(row().pid)) ? 'Unfold children' : 'Fold children'}</button>
        </Show>
        <Show when={text(row().owner_id)}>{id =>
          <button type="button" onClick={() => ctx.openAgent(id())}>Open owner</button>}
        </Show>
        <Show when={local() && text(row().cleanup_cmd)}>{command =>
          <button type="button" onClick={() => ctx.copy(command())}>Copy cleanup command</button>}
        </Show>
        <Show when={local() && text(row().cmdline)}>{command => <p class={styles.previewPath}>{command()}</p>}</Show>
      </div>}
    </Show>
    <DataTable ctx={ctx} label={local() && mode() === 'tree' ? 'Process tree' : def.title} columns={def.columns}
      rows={rows()} columnMenu action={{
        label: ({ row }) => row.children || row.owner_id || row.cleanup_cmd || row.cmdline ? `Inspect process ${row.pid}` : '',
        run: ({ id }) => setSelected(value => value === id ? undefined : id),
      }} />
    </View>
  </div>
}

export function Traffic(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const local = () => ctx.scope() === 'local'
  const remote = useMachine(ctx)
  const live = () => ctx.read(def.sources[0])
  const rows = createMemo(() => local()
    ? rowsFrom(((live().value ?? []) as MachineLocal['monitor']['per_tool']).map(row => ({
      ...row, label: toolName(ctx, row.tool), workspace_list: join(row.workspaces),
    })), row => identity(row.tool))
    : rowsFrom((remote.data()?.hosts ?? []).map(host => ({ ...host, label: 'Whole host', sessions: host.live_sessions,
      pids: host.active_processes, inbound_bps: host.live_in_rate, outbound_bps: host.live_out_rate,
      est_tokens: host.ai_token_rate, cpu_pct: host.host_cpu_percent,
    })), row => identity(row.node_id)))
  return <View result={() => local() ? live() : remote.result(remote.data()?.hosts)} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>{local() ? 'Live network and file measurements.' : 'Last host samples. The Tool filter and time range do not apply.'} Token values are network estimates, not tool-reported counts.</p>
    <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} columnMenu />
  </View>
}

const historyFields = [
  metric('history_live_bytes', 'board.self.history', 'Live history size'), metric('history_bytes', 'board.self.history', 'History on disk'),
  metric('history_limit_bytes', 'board.self.history', 'History size limit'), field('retention_days', 'Retention (days)'),
]
const streamFields = [field('connected_clients', 'Stream clients'), metric('snapshot_age_s', 'board.self.stream', 'Snapshot age')]

export function Daemon(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const remote = useMachine(ctx)
  const local = () => ctx.scope() === 'local'
  const read = () => ctx.read(def.sources[1])
  const self = () => ctx.board('self')
  const pipeline = () => read().value as MachinePipeline['self'] | undefined
  const stream = () => ctx.read({ ...health, path: 'pipeline.stream' })
  const helpers = createMemo(() => rowsFrom(self()?.children ?? [], row => identity(row.pid)))
  return <div class={styles.stack}>
    <div class={styles.actions}><button type="button" onClick={() => ctx.navigate({ screen: 'health' })}>Open aictl Health</button></div>
    <Show when={local()} fallback={<View result={() => remote.result(remote.data()?.hosts)} retry={ctx.refresh} empty={def.empty}>
      <DataTable ctx={ctx} label="Recorded daemons" columns={[field('daemon_pid', 'Daemon PID')]}
        rows={rowsFrom(remote.data()?.hosts ?? [], row => identity(row.node_id))} />
      <p class={styles.note}>Local daemon resources are not available from this source.</p>
    </View>}>
      <View result={() => self() && read().state === 'unavailable' ? ctx.read(def.sources[0]) : read()} retry={ctx.refresh} empty={def.empty}>
        <Metrics fixed ctx={ctx} columns={def.columns} value={{ ...pipeline(), cpu: pipeline()?.cpu ?? self()?.cpu_percent,
          rss: pipeline()?.rss ?? self()?.memory_rss_bytes }} />
        <Metrics ctx={ctx} columns={historyFields} value={self()} />
        <Show when={helpers().length}>
          <DataTable ctx={ctx} label="aictl helper processes" rows={helpers()} columns={[field('name', 'Process'), field('pid', 'PID'),
            metric('cpu_percent', 'self.cpu_percent', 'CPU'), metric('memory_rss_bytes', 'self.memory_rss', 'RAM')]} />
        </Show>
      </View>
      <View result={stream} retry={ctx.refresh}><Metrics ctx={ctx} columns={streamFields} value={stream().value} /></View>
    </Show>
  </div>
}
