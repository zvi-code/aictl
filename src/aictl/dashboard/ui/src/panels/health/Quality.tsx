import { createMemo, Show, untrack } from 'solid-js'
import type { PanelProps } from '../types'
import { field, HealthBody, HealthTable, rowId, time } from './HealthParts'
import { ingesterState, qualityContext } from './healthModel'
import { StatTiles } from './HealthVisuals'

const ingesterFields = [
  field('name', 'Ingester'), field('activity', 'Status'), time('last_poll', 'Last poll started'), time('last_ok', 'Last successful poll'),
  field('rows', 'Rows on last success'), field('rows_total', 'Total rows'), field('source', 'Source'),
  field('source_path', 'Source path'), field('last_poll_duration_ms', 'Poll duration', 'ms'), field('error', 'Error'),
]
const eventFields = [
  time('ts', 'When'), field('severity', 'Severity'), field('component', 'Component'), field('source', 'Source'),
  field('status', 'Status'), field('text', 'Message'), field('count', 'Seen', undefined, 'board.quality.row'),
  field('error', 'Error'), field('context', 'Recovery'), time('last_ok', 'Last success'),
]

export default function Quality(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  return <HealthBody ctx={ctx} def={props.def} select={data => data.pipeline}>{data => {
    const ingesters = createMemo(() => data().pipeline?.ingesters?.map(row => ({ ...row,
      activity: row.status ? ingesterState(row).status : undefined,
      last_ok: row.last_ok === null ? 'No successful poll yet' : row.last_ok,
      // A poll that did not fail has no error to report; a failed poll without a message stays unreported.
      error: row.error ?? (['ok', 'running', 'waiting', 'off'].includes(row.status ?? '') ? 'no error' : undefined),
    })))
    const events = createMemo(() => data().pipeline?.data_quality?.slice().sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
      .slice(0, 10).map(row => ({ ...row, context: qualityContext(row, data().pipeline?.ingesters ?? []) ?? '',
        error: row.error ?? (row.severity === 'error' ? undefined : 'no error') })))
    return <>
      <StatTiles items={[
        { label: 'Reporting ingesters', value: ingesters()?.length },
        { label: 'Quality events', value: data().pipeline?.data_quality?.length },
        { label: 'Quality errors', value: data().pipeline?.data_quality?.filter(row => row.severity === 'error').length, tone: 'warning' },
        { label: 'Quality warnings', value: data().pipeline?.data_quality?.filter(row => row.severity === 'warning').length },
      ]} />
      <h4>Ingesters</h4>
      <HealthTable ctx={ctx} label="Ingester polls" fields={ingesterFields} rows={ingesters()} rowId={row => row.name ?? ''}
        empty="No ingester reports." />
      <h4>Data quality events</h4>
      <Show when={(data().pipeline?.data_quality?.length ?? 0) > 10}>
        <p>Showing the 10 newest of {data().pipeline?.data_quality?.length} reported events.</p>
      </Show>
      <HealthTable ctx={ctx} label="Data quality events" fields={eventFields} rows={events()}
        rowId={row => rowId(row, 'component', 'kind', 'source', 'status', 'ts')} empty="No data-quality events." />
    </>
  }}</HealthBody>
}
