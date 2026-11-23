import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { BoardSeries, DetailMachine, DetailNodes, MachineLocal, MachinePipeline, TopicRuntimeAgent, TopicRuntimeProcess } from '../../../data/contract.gen'
import { fmtBytes } from '../../../design/format'
import { Segmented } from '../../../ui/Segmented'
import { isStoredToolSelected } from '../../../data/toolScope'
import { SeriesView } from '../../kinds/Series'
import type { PanelProps, Read, Row } from '../../types'
import { buckets, field, health, machine, metric, processes, stamp } from '../b'
import { Bars, bins, Comparisons, severityLabel, severityTone, StatStrip, topRows, usable } from '../Summary'
import { healthNodePath } from '../../health/scopedHealth'
import { completeSum, coreBars, daemonReports, latestTotal, procTree, runningSessions, UNLISTED_SESSION } from './resources'
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

type RuntimeNodes = Extract<DetailNodes, { view: 'runtime' }>
/** The node reports of the running sessions: `view=runtime` of the node list, in the board's scope. */
export function runtimeNodesPath(ctx: PanelProps['ctx']) {
  if (ctx.scope() === 'local') return
  const query = new URLSearchParams({ view: 'runtime', scope: ctx.scope() })
  if (ctx.scope() === 'node') {
    if (!ctx.nodeId()) return
    query.set('node_id', ctx.nodeId()!)
  }
  return '/api/board/nodes?' + query
}

const sessionColumns = [field('title', 'Session'), field('tool_label', 'Tool'), field('status', 'Activity'),
  stamp('started_at', 'Running since'), metric('cpu_percent', 'procs.tool.cpu_pct', 'CPU'),
  { ...metric('mem_mb', 'procs.tool.mem_rss', 'RAM'), scale: 1048576 }, field('pid_list', 'Process ids')]

/** In node and fleet scope: the sessions each node runs now, what they hold, and their recorded process ids. */
function FleetProcesses(props: PanelProps) {
  const { ctx } = untrack(() => props)
  const response = ctx.detail<DetailNodes>(() => runtimeNodesPath(ctx))
  const recorded = useMachine(ctx, true)
  const view = () => {
    const value = response()?.data
    if (!value || value.view !== 'runtime' || value.scope !== ctx.scope()) return
    return ctx.scope() === 'node' && value.rows.some(row => row.node_id !== ctx.nodeId()) ? undefined : value as RuntimeNodes
  }
  const model = createMemo(() => runningSessions(view()?.rows ?? [], recorded.data()?.recorded_processes ?? [],
    ctx.board('agents') ?? [], tool => isStoredToolSelected(tool, ctx.tools())))
  const rows = createMemo(() => rowsFrom(model().rows.map(row => ({ ...row, tool_label: toolName(ctx, row.tool),
    pid_list: row.pid_list ?? (recorded.data() ? 'None recorded' : undefined) })), row => row.open_id))
  const result = () => withRows(detailRead(response(), view()?.rows, ctx.paused()), rows())
  const cpuField = sessionColumns[4], ramField = sessionColumns[5]
  const label = ({ row }: Entry) => `${row.title === UNLISTED_SESSION ? toolName(ctx, String(row.tool)) : row.title} · ${row.node_id}`
  const cpu = createMemo(() => topRows(rows(), 'cpu_percent', label))
  const memory = createMemo(() => topRows(rows(), 'mem_mb', label))
  const held = (path: string, column: typeof cpuField) => {
    const total = completeSum(rows().map(({ row }) => (row as Row)[path]))
    return total == null ? undefined : displayField(ctx, column).format(total)
  }
  const reporting = () => view()?.rows.length
  return <div class={styles.stack}>
    <StatStrip label="Running sessions summary" items={[
      { label: 'Running sessions', value: view() ? rows().length : undefined },
      ...(reporting() ? [{ label: 'Nodes reporting now', value: `${reporting()! - model().silent.length} of ${reporting()}` }] : []),
      ...(held('cpu_percent', cpuField) ? [{ label: 'CPU held by these sessions', value: held('cpu_percent', cpuField) }] : []),
      ...(held('mem_mb', ramField) ? [{ label: 'Memory held by these sessions', value: held('mem_mb', ramField) }] : []),
    ]} />
    <Show when={cpu()?.length || memory()?.length}>
      <Comparisons>
        <Show when={cpu()?.length}><Bars label="Top sessions by CPU" items={cpu()} format={displayField(ctx, cpuField).format} /></Show>
        <Show when={memory()?.length}><Bars label="Top sessions by memory" items={memory()} format={displayField(ctx, ramField).format} /></Show>
      </Comparisons>
    </Show>
    <View result={result} retry={ctx.refresh}
      empty={model().silent.length ? 'No node reports its running sessions.' : 'No node reports a running session for the selected tools.'}>
      <p class={styles.note}>Sessions running now, as each node last reported them in the past five minutes. The time range does not apply.</p>
      <DataTable ctx={ctx} label="Running sessions" columns={sessionColumns} rows={rows()} action={{
        label: ({ row }) => row.title === UNLISTED_SESSION ? 'Open session' : `Open ${row.title}`,
        run: ({ row }) => ctx.openAgent(String(row.open_id)),
      }} />
    </View>
    <Show when={model().silent.length}>
      <p class={styles.note}>Not reported by {model().silent.join(', ')}: that daemon sends no list of its running sessions.</p>
    </Show>
    <Show when={model().capped.length}>
      <p class={styles.note}>{model().capped.join(', ')} runs more sessions than its report lists; only the listed ones are shown.</p>
    </Show>
  </div>
}

export function Processes(props: PanelProps) {
  return <Show when={props.ctx.scope() === 'local'} fallback={<FleetProcesses {...props} />}><LocalProcesses {...props} /></Show>
}

function LocalProcesses(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const [mode, setMode] = createSignal('list')
  const [selected, setSelected] = createSignal<string>()
  const [closed, setClosed] = createSignal(new Set<number>())
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
  const rows = createMemo(() => rowsFrom(mode() === 'tree' ? activeTree() : localRows(), row => identity(row.pid, row.created_at)))
  const result = () => withRows(runtime(), rows())
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
    <StatStrip label="Process summary" items={[{ label: 'Live processes', value: samples()?.length }]} />
    <Comparisons>
      <Bars label="Top processes by CPU" items={cpu()} format={displayField(ctx, cpuField).format} />
      <Bars label="Top processes by resident memory" items={memory()} format={displayField(ctx, ramField).format} />
    </Comparisons>
    <View result={result} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>Live processes. The time range does not apply.</p>
    <Segmented label="Show processes as" value={mode()} onChange={setMode}
      options={[{ id: 'list', label: 'List' }, { id: 'tree', label: 'Tree' }]} />
    <Show when={selectedRow()}>{row =>
      <div class={styles.actions} role="group" aria-label={`Actions for process ${row().pid}`}>
        <Show when={mode() === 'tree' && row().children}>
          <button type="button" aria-expanded={closed().has(Number(row().pid)) ? 'false' : 'true'}
            onClick={() => toggle(Number(row().pid))}>{closed().has(Number(row().pid)) ? 'Unfold children' : 'Fold children'}</button>
        </Show>
        <Show when={text(row().owner_id)}>{id =>
          <button type="button" onClick={() => ctx.openAgent(id())}>Open owner</button>}
        </Show>
        <Show when={text(row().cleanup_cmd)}>{command =>
          <button type="button" onClick={() => ctx.copy(command())}>Copy cleanup command</button>}
        </Show>
        <Show when={text(row().cmdline)}>{command => <p class={styles.previewPath}>{command()}</p>}</Show>
      </div>}
    </Show>
    <DataTable ctx={ctx} label={mode() === 'tree' ? 'Process tree' : def.title} columns={def.columns}
      rows={rows()} action={{
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
    : rowsFrom((remote.data()?.hosts ?? []).map(hostRow), row => identity(row.node_id)))
  const estimates = () => rows().some(({ row }) => number(row.est_tokens) != null)
  return <View result={() => local() ? live() : remote.result(remote.data()?.hosts)} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>{local() ? 'Live network and file measurements.' : 'Each node’s last report of its whole machine. The Tool filter and time range do not apply.'}
      {estimates() ? ' Token values are network estimates, not tool-reported counts.' : ''}</p>
    <DataTable ctx={ctx} label={def.title} columns={local() ? def.columns : hostColumns} rows={rows()} />
  </View>
}

/** One node's last machine report: the columns that mean something for a whole host. */
export const hostColumns = [stamp('ts', 'Last report'), field('report', 'Report'),
  metric('sessions', 'procs.tool.live.session_count', 'Live sessions'), metric('pids', 'procs.tool.live.pid_count', 'Processes'),
  metric('inbound_bps', 'events.tool.live.inbound_rate_bps', 'Received'), metric('outbound_bps', 'events.tool.live.outbound_rate_bps', 'Sent'),
  metric('est_tokens', 'procs.tool.live.tokens', 'Tokens per second (estimate)'), metric('cpu_pct', 'procs.tool.live.cpu', 'Machine CPU'),
  field('memory', 'Machine memory used')]

export function hostRow(host: ReportedMachine['hosts'][number]) {
  const used = number(host.host_memory_used_mb), total = number(host.host_memory_total_mb)
  return {
    node_id: host.node_id, ts: host.ts, report: host.status === 'reported' ? 'Current' : host.status === 'stale' ? 'Older than 5 minutes' : 'Unknown',
    sessions: host.live_sessions, pids: host.active_processes, inbound_bps: host.live_in_rate, outbound_bps: host.live_out_rate,
    est_tokens: host.ai_token_rate, cpu_pct: host.host_cpu_percent,
    memory: used == null ? undefined : total == null ? fmtBytes(used * 1048576) : `${fmtBytes(used * 1048576)} of ${fmtBytes(total * 1048576)}`,
  }
}

const historyFields = [
  metric('history_live_bytes', 'board.self.history', 'Live history size'), metric('history_bytes', 'board.self.history', 'History on disk'),
  metric('history_limit_bytes', 'board.self.history', 'History size limit'), field('retention_days', 'Retention (days)'),
]
const streamFields = [field('connected_clients', 'Stream clients'), metric('snapshot_age_s', 'board.self.stream', 'Snapshot age')]

const daemonColumns = [field('reporting', 'Reporting now'), stamp('captured_at', 'Last report'),
  metric('cpu', 'self.cpu_percent', 'Daemon CPU'), metric('rss', 'self.memory_rss', 'Daemon RAM'), metric('threads', 'self.threads', 'Threads'),
  metric('uptime_s', 'self.uptime', 'Running for'), field('writer', 'Store writer'),
  metric('rows_sent', 'self.db_rows', 'Rows written since start'), metric('rows_dropped', 'self.db_rows', 'Rows dropped'),
  metric('ingest_failures', 'board.kpi.failures', 'Ingest failures')]

/** In node and fleet scope: each node's aictl daemon as its last health report states it. */
function FleetDaemons(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const response = ctx.detail<DetailNodes>(() => healthNodePath(ctx.scope(), ctx.nodeId()))
  const view = () => {
    const value = response()?.data
    return value && value.view === 'health' && value.scope === ctx.scope() &&
      (ctx.scope() !== 'node' || value.rows.every(row => row.node_id === ctx.nodeId())) ? value : undefined
  }
  const rows = createMemo(() => rowsFrom(daemonReports(view()?.rows ?? []), row => identity(row.node_id)))
  return <View result={() => withRows(detailRead(response(), view()?.rows, ctx.paused()), rows())} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>The last health report of each node’s aictl daemon. The time range does not apply.</p>
    <DataTable ctx={ctx} label="aictl on each node" columns={daemonColumns} rows={rows()} />
  </View>
}

export function Daemon(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const local = () => ctx.scope() === 'local'
  const read = () => ctx.read(def.sources[1])
  const self = () => ctx.board('self')
  const pipeline = () => read().value as MachinePipeline['self'] | undefined
  const stream = () => ctx.read({ ...health, path: 'pipeline.stream' })
  const helpers = createMemo(() => rowsFrom(self()?.children ?? [], row => identity(row.pid)))
  return <div class={styles.stack}>
    <div class={styles.actions}><button type="button" onClick={() => ctx.navigate({ screen: 'health' })}>Open aictl Health</button></div>
    <Show when={local()} fallback={<FleetDaemons {...props} />}>
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
