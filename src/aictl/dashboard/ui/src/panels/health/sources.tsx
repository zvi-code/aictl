import { createMemo, untrack } from 'solid-js'
import type { PanelProps } from '../types'
import { useHealth } from './healthData'
import { healthSources, REPORTING_WINDOW, sourceActivity, type HealthView } from './healthModel'
import { field, HealthBody, HealthTable, time } from './HealthParts'
import { StatTiles, totalOf } from './HealthVisuals'

// A column that no tool reports is not shown, so each tool's own fields appear only when some tool has them.
export const sourceColumns = [
  field('name', 'Tool'), field('data_from', 'Data from'), field('workspaces', 'Reported workspaces'),
  time('last_data_ts', 'Last data'), field('freshness', 'Freshness'), time('last_seen', 'Last seen'),
  field('confidence', 'Confidence (%)'), field('hook_count', 'Hooks in 24 h'), time('last_hook_at', 'Last hook'),
  field('metrics', 'OTel metrics', undefined, 'otel.receiver.metrics_received'),
  field('events', 'OTel events', undefined, 'otel.receiver.events_received'),
  time('last_otel_at', 'Last OTel data'), field('config', 'Local OTel config'),
  field('config_source', 'Configuration source'), field('config_variable', 'Configuration variable'),
  field('errors', 'Tool/session errors', undefined, 'board.source.errors'), field('last_error', 'Last error'),
]

const hasSources = (data: HealthView) => {
  const pipe = data.pipeline
  return pipe?.freshness ?? pipe?.hooks ?? pipe?.otel_receiver?.by_tool ?? pipe?.otel_setup ?? data.monitor?.per_tool
}

export default function Sources(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  const health = useHealth()
  return <HealthBody ctx={ctx} def={props.def} select={hasSources}>{data => {
    const rows = createMemo(() => healthSources(data()).map(row => ({ ...row, name: row.label ?? row.tool,
      // The newest sign of the tool from any source, so the column agrees with the reporting count.
      freshness: row.last_data_ts ? health.now() - row.last_data_ts > 3600 ? 'No recent activity' : 'Active' : 'No data',
      confidence: row.confidence == null ? undefined : row.confidence * 100,
    })))
    const activity = createMemo(() => sourceActivity(healthSources(data()), health.now()))
    return <>
      <StatTiles items={[
        { label: 'Reporting tools', value: activity().reporting.length, detail: `sent data in the ${REPORTING_WINDOW}` },
        { label: 'Installed, no data', value: activity().silent.length, detail: activity().silent.map(row => row.label ?? row.tool).join(', ') || undefined },
        { label: 'Hooks in 24 h', value: totalOf(rows().map(row => row.hook_count)) },
      ]} />
      <HealthTable ctx={ctx} label="Data sources" fields={sourceColumns} rows={rows()} rowId={row => row.tool} empty="No source rows." />
    </>
  }}</HealthBody>
}
