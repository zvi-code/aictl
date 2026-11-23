import { createMemo, untrack } from 'solid-js'
import type { DetailSessionProcesses, DetailSessionRecords, TopicRuntimeProcess } from '../../data/contract.gen'
import { fmtBytes, fmtDur, fmtMem } from '../../design/format'
import type { Row } from '../../panels/types'
import { Meter } from '../../ui/Meter'
import { indent, sessionProcesses } from '../hierarchy'
import { number, records, Resource, Rows, Section, sessionPath, Stats, text, type TabProps } from '../shared'

/** Whether a recorded process runs now: known only when the session's current process ids are. */
export const runningNow = (pid: number, current?: readonly number[]) => current == null ? 'not known' : current.includes(pid) ? 'yes' : 'no'

export default function Processes(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const local = () => ctx.scope() === 'local'
  const read = ctx.detail<DetailSessionProcesses | Extract<DetailSessionRecords, { processes: unknown }>>(createMemo(() =>
    local() ? sessionPath(props, '/api/session-processes') : sessionPath(props, '/api/board/session/records', { part: 'processes' })))
  const resources = () => props.detail()?.data?.resources
  const agent = () => props.agent() ?? props.detail()?.data?.agent
  const live = createMemo(() => {
    const runtime = props.runtime()
    if (!local() || !runtime) return undefined
    const rows = [...ctx.client.store.topic('runtime.process')?.values() ?? []].map(entity => entity.data as TopicRuntimeProcess)
    return sessionProcesses(rows, runtime.pids, new Set([runtime.id, runtime.session_id, runtime.native_session_id].filter((id): id is string => !!id)))
  })
  // The tree of the session detail: the process scan the daemon made when it read the detail.
  const scanned = createMemo(() => records(resources()?.process_tree))
  const tree = createMemo(() => live()?.length
    ? { source: 'live now', rows: live()!.map(({ row, depth }): Row => ({ ...row, name: indent(row.name, depth) })) }
    : scanned()?.length ? { source: 'from the detail read', rows: scanned()!.map((row): Row => ({
      pid: row.pid, ppid: row.ppid, name: indent(text(row.name) ?? '', number(row.depth) ?? 0), cpu_percent: row.cpu_percent,
      memory_rss_bytes: number(row.mem_mb) == null ? undefined : number(row.mem_mb)! * 1048576 })) }
      : undefined)
  const programTotals = createMemo(() => {
    const names = new Map<string, { name: string; count?: number; cpu?: number; memory?: number }>()
    for (const item of records(resources()?.subprocesses) ?? []) {
      const name = text(item.name)
      if (name) names.set(name, { name, count: number(item.count) })
    }
    const running = live()?.length ? live()!.map(({ row }) => ({ name: row.name, cpu: row.cpu_percent, bytes: row.memory_rss_bytes }))
      : (scanned() ?? []).map(row => ({ name: text(row.name), cpu: number(row.cpu_percent), bytes: number(row.mem_mb) == null ? null : number(row.mem_mb)! * 1048576 }))
    for (const { name, cpu, bytes } of running) {
      if (!name) continue
      const stats = names.get(name) ?? { name }
      if (cpu != null) stats.cpu = (stats.cpu ?? 0) + cpu
      if (bytes != null) stats.memory = (stats.memory ?? 0) + bytes / 1048576
      names.set(name, stats)
    }
    return live() || resources() ? [...names.values()].sort((a, b) => (b.count ?? -1) - (a.count ?? -1)) : undefined
  })
  const cpu = () => props.runtime()?.cpu_percent ?? props.detail()?.data?.process?.cpu_percent
  const memory = () => props.runtime()?.mem_mb ?? props.detail()?.data?.process?.mem_mb
  const currentPids = () => props.runtime()?.pids ?? props.detail()?.data?.process?.pids
  const recorded = (data: { processes: readonly Row[] }) => {
    const known = new Map((scanned() ?? []).map(row => [number(row.pid), row]))
    return data.processes.map((row): Row => {
      const seen = known.get(number(row.pid))
      return { ...row, name: seen?.name, ppid: seen?.ppid, running: runningNow(number(row.pid) ?? -1, currentPids()) }
    })
  }
  const calls = () => agent()?.tool_calls
  const span = () => {
    const start = agent()?.started_at, end = agent()?.last_activity_at ?? agent()?.ended_at
    return start != null && end != null && end > start ? end - start : undefined
  }
  return <>
    <Section title="Session resources">
      <Stats items={[
        { label: 'Memory', value: memory() == null ? undefined : fmtMem(memory()) },
        { label: 'Peak CPU', value: resources()?.cpu_peak, unit: '%' },
        { label: 'Tool calls', value: calls(), detail: span() == null ? undefined : `in ${fmtDur(span())} from start to last activity` },
        ...(['bytes_in', 'bytes_out', 'state_writes'] as const).map((field, index) => ({
          label: ['Received', 'Sent', 'State written'][index], value: resources()?.[field] == null ? undefined : fmtBytes(resources()?.[field]),
        })),
      ]} />
      <Meter label="CPU utilization" value={cpu()} max={Math.max(100, cpu() ?? 0)} display={cpu() == null ? undefined : `${cpu()!.toFixed(1)}%`}
        tone={(cpu() ?? 0) > 85 ? 'warning' : 'neutral'} />
    </Section>
    <Section title={tree() ? `Process tree · ${tree()!.source}` : 'Process tree'}>
      <Rows label="Process tree" rows={tree()?.rows} identity={['pid', 'created_at']}
        columns={['name', ['pid', 'PID', 'id'], ['ppid', 'Parent PID', 'id'], ['cpu_percent', 'CPU (%)', 'number'], ['memory_rss_bytes', 'Memory (RSS)', 'bytes']]} />
    </Section>
    <Section title="Recorded processes">
      <Resource read={read}>{data => <>
        <Stats items={[{ label: 'Processes', value: data().total }]} />
        <Rows label="Recorded processes" rows={recorded(data())} identity={['pid', 'joined_at']}
          columns={[['pid', 'PID', 'id'], 'name', ['ppid', 'Parent PID', 'id'], 'tool', ['joined_at', 'First seen by aictl', 'time'], ['running', 'Running now']]} />
      </>}</Resource>
    </Section>
    <Section title="Subprocesses by name">
      <Rows label="Subprocesses" rows={programTotals()} identity={['name']}
        columns={['name', ['count', 'Recorded starts'], ['cpu', 'CPU (%)', 'number'], ['memory', 'Memory (MB)', 'number']]} />
    </Section>
  </>
}
