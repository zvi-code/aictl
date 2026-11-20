import { createMemo } from 'solid-js'
import type { FieldRef, Read, RowOptions } from '../types'
import { healthSources } from './healthModel'
import { useHealth } from './healthData'
import { StatTiles, totalOf } from './HealthVisuals'

export const sourceColumns: readonly FieldRef[] = [
  { path: 'name', label: 'Tool' }, { path: 'data_from', label: 'Data from' }, { path: 'workspaces', label: 'Reported workspaces' },
  { path: 'last_data_ts', label: 'Last data', format: 'timestamp' }, { path: 'freshness', label: 'Freshness' },
  { path: 'last_seen', label: 'Last seen', format: 'timestamp' }, { path: 'confidence', label: 'Confidence (%)', scale: 100 },
  { path: 'hook_count', label: 'Hooks in 24 h' }, { path: 'last_hook_at', label: 'Last hook', format: 'timestamp' },
  { path: 'metrics', label: 'OTel metrics', datapoint: 'otel.receiver.metrics_received' },
  { path: 'events', label: 'OTel events', datapoint: 'otel.receiver.events_received' },
  { path: 'last_otel_at', label: 'Last OTel data', format: 'timestamp' }, { path: 'config', label: 'Local OTel config' },
  { path: 'config_source', label: 'Configuration source' }, { path: 'config_variable', label: 'Configuration variable' },
  { path: 'errors', label: 'Tool/session errors', datapoint: 'board.source.errors' }, { path: 'last_error', label: 'Last error' },
]

export function setupSources(): RowOptions {
  const health = useHealth()
  const result = createMemo<Read>(() => {
    const read = health.read(), data = read.value
    if (!data) return read
    const pipe = data.pipeline
    if (!pipe?.freshness && !pipe?.hooks && !pipe?.otel_receiver?.by_tool && !pipe?.otel_setup && !data.monitor?.per_tool)
      return { state: 'unavailable' }
    const value = healthSources(data).map(row => ({ ...row, name: row.label ?? row.tool,
      freshness: row.last_seen ? health.now() - row.last_seen > 3600 ? 'No recent activity' : 'Active' : undefined,
    }))
    return { ...read, value, rowKeys: value.map(row => row.tool) }
  })
  const rows = () => result().value
  const listed = () => {
    const value = rows()
    return Array.isArray(value) ? value : undefined
  }
  return { result, description: <StatTiles items={[
    { label: 'Reporting tools', value: listed()?.length },
    { label: 'Recent sources', value: listed()?.filter(row => row.freshness === 'Active').length },
    { label: 'Hooks in 24 h', value: totalOf(listed()?.map(row => row.hook_count)) },
  ]} /> }
}
