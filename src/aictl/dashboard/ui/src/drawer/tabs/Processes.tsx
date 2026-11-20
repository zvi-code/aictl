import { createMemo, untrack } from 'solid-js'
import type { DetailSessionProcesses, DetailSessionRecords, TopicRuntimeProcess } from '../../data/contract.gen'
import { fmtBytes } from '../../design/format'
import { Meter } from '../../ui/Meter'
import { indent, sessionProcesses } from '../hierarchy'
import { number, records, Resource, Rows, Section, sessionPath, Stats, text, type TabProps } from '../shared'

export default function Processes(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const local = () => ctx.scope() === 'local'
  const read = ctx.detail<DetailSessionProcesses | Extract<DetailSessionRecords, { processes: unknown }>>(createMemo(() =>
    local() ? sessionPath(props, '/api/session-processes') : sessionPath(props, '/api/board/session/records', { part: 'processes' })))
  const resources = () => props.detail()?.data?.resources
  const live = createMemo(() => {
    const agent = props.runtime()
    if (!local() || !agent) return undefined
    const rows = [...ctx.client.store.topic('runtime.process')?.values() ?? []].map(entity => entity.data as TopicRuntimeProcess)
    return sessionProcesses(rows, agent.pids, new Set([agent.id, agent.session_id, agent.native_session_id].filter((id): id is string => !!id)))
  })
  const programTotals = createMemo(() => {
    const names = new Map<string, { name: string; count?: number; cpu?: number; memory?: number }>()
    for (const item of records(resources()?.subprocesses) ?? []) {
      const name = text(item.name)
      if (name) names.set(name, { name, count: number(item.count) })
    }
    for (const { row } of live() ?? []) {
      if (!row.name) continue
      const stats = names.get(row.name) ?? { name: row.name }
      if (row.cpu_percent != null) stats.cpu = (stats.cpu ?? 0) + row.cpu_percent
      if (row.memory_rss_bytes != null) stats.memory = (stats.memory ?? 0) + row.memory_rss_bytes / 1048576
      names.set(row.name, stats)
    }
    return live() || resources() ? [...names.values()].sort((a, b) => (b.count ?? -1) - (a.count ?? -1)) : undefined
  })
  const cpu = () => props.runtime()?.cpu_percent ?? props.detail()?.data?.process?.cpu_percent
  const peak = () => resources()?.cpu_peak
  return <>
    <Section title="Session resources">
      <Stats items={[
        { label: 'Memory', value: props.runtime()?.mem_mb ?? props.detail()?.data?.process?.mem_mb, unit: 'MB' },
        { label: 'Peak CPU', value: peak(), unit: '%' }, { label: 'Tool calls', value: resources()?.tool_calls_per_min, unit: '/min' },
        ...(['bytes_in', 'bytes_out', 'state_writes'] as const).map((field, index) => ({
          label: ['Received', 'Sent', 'State written'][index], value: resources()?.[field] == null ? undefined : fmtBytes(resources()?.[field]),
        })),
      ]} />
      <Meter label="CPU utilization" value={cpu()} max={Math.max(100, cpu() ?? 0)} display={cpu() == null ? undefined : `${cpu()!.toFixed(1)}%`}
        tone={(cpu() ?? 0) > 85 ? 'warning' : 'neutral'} />
    </Section>
    <Section title="Live process tree">
      <Rows label="Live processes" rows={live()?.map(({ row, depth }) => ({ ...row, name: indent(row.name, depth) }))} identity={['pid', 'created_at']}
        columns={['name', 'pid', ['ppid', 'Parent PID'], ['cpu_percent', 'CPU (%)', 'number'], ['memory_rss_bytes', 'RSS (bytes)', 'number']]} />
    </Section>
    <Section title="Recorded processes">
      <Resource read={read}>{data => <>
        <Stats items={[{ label: 'Processes', value: data().total }]} />
        <Rows label="Recorded processes" rows={data().processes.slice().sort((a, b) => Number(b.role === 'lead') - Number(a.role === 'lead'))
          .map(row => ({ ...row, display_pid: indent(row.pid, row.role !== 'lead' && data().processes.some(item => item.role === 'lead') ? 1 : 0) }))}
          identity={['pid', 'joined_at']} columns={[[ 'display_pid', 'PID' ], 'role', 'tool', [ 'joined_at', 'Joined', 'time' ], [ 'left_at', 'Left', 'time' ]]} />
      </>}</Resource>
    </Section>
    <Section title="Subprocesses by name">
      <Rows label="Subprocesses" rows={programTotals()} identity={['name']}
        columns={['name', ['count', 'Recorded starts'], ['cpu', 'Live CPU (%)', 'number'], ['memory', 'Live memory (MB)', 'number']]} />
    </Section>
  </>
}
