import { createMemo } from 'solid-js'
import type { PanelProps } from '../types'
import { MODES, objects, record, text, type StoreView } from './healthModel'
import { Detail, field, HealthBody, HealthTable, rowId } from './HealthParts'
import { HealthComparison, StatTiles, perMinute } from './HealthVisuals'

export const modeName = { queued: 'Queued DM', streaming: 'Streaming', inline: 'Inline' }
export const mode = (store: StoreView | null | undefined, id: (typeof MODES)[number]) => record(store?.ingestion_traffic?.[id])
export function modeGroups(store: StoreView | null | undefined) {
  const reports = MODES.map(id => objects(mode(store, id)?.groups))
  if (!reports.some(Boolean)) return
  return reports.flatMap((groups, index) => (groups ?? []).flatMap(group => {
    const id = text(group.id)
    if (!id) return []
    return [{ ...group, id, label: text(group.label) ?? id, mode: modeName[MODES[index]],
      tables: Array.isArray(group.tables) ? group.tables.filter(table => typeof table === 'string').join(', ') || 'No tables reported' : undefined }]
  }))
}

const rates = [
  field('rows_per_s', 'Rows/s', 'per_s'), field('bytes_per_s', 'Bytes/s', 'rate_bps'), field('rate_per_s', 'Requests/s', 'per_s'),
]
const membership = [field('label', 'Table group'), field('mode', 'Mode'), field('tables', 'Tables')]
const matrixColumns = [field('label', 'Table group'), ...MODES.flatMap(id => [
  field(`${id}.rows_per_s`, `${modeName[id]} rows/s`, 'per_s'), field(`${id}.bytes_per_s`, `${modeName[id]} bytes/s`, 'rate_bps'),
])]
export function Membership(props: { ctx: PanelProps['ctx']; store: StoreView | null | undefined }) {
  return <HealthTable ctx={props.ctx} label="Reported table membership by mode" fields={membership}
    rows={modeGroups(props.store)} rowId={row => rowId(row, 'mode', 'id')} empty="No table memberships reported." />
}

export default function Traffic(props: PanelProps) {
  return <HealthBody ctx={props.ctx} select={data => data.store}>{data => {
    const store = () => data().store
    const grouped = createMemo(() => modeGroups(store()))
    const matrix = createMemo(() => {
      if (!grouped()) return
      const byId = new Map<string, Record<string, unknown> & { id: string }>()
      for (const row of grouped()!) {
        const group = byId.get(row.id) ?? { id: row.id, label: row.label }
        const modeId = MODES.find(id => modeName[id] === row.mode)
        if (modeId) group[modeId] = row
        byId.set(row.id, group)
      }
      return [...byId.values()]
    })
    const modes = createMemo(() => store()?.ingestion_traffic ? MODES.map(id => ({
      ...mode(store(), id), mode: modeName[id], pending: mode(store(), id)?.pending_history_rows,
    })) : undefined)
    return <>
      <StatTiles items={MODES.map(id => ({
        label: `${modeName[id]} submissions`, value: perMinute(mode(store(), id)?.rows_per_s), unit: 'rows/min',
      }))} />
      <HealthComparison id="ingestion-modes" label="Submission rate by ingestion mode" unit="rows/min"
        items={MODES.map(id => ({ id, label: modeName[id], value: perMinute(mode(store(), id)?.rows_per_s) }))} />
      <HealthTable ctx={props.ctx} label="Destination traffic by physical ingestion mode" rows={matrix()}
        fields={matrixColumns} rowId={row => row.id} empty="No table-group activity reported in this window." />
      <Detail label="Batch and queue details">
        <p>Client submissions are not confirmed queryable.</p>
        <p>Pending rows count tracked receipts or local queues, not the DM service backlog. Upload sizes are client acknowledgements, not server-merged batches.</p>
        <HealthTable ctx={props.ctx} label="Ingestion mode uploads" rows={modes()} rowId={row => row.mode}
          fields={[field('mode', 'Mode'), ...rates, field('pending', 'Tracked pending rows'), field('pending_scope', 'Pending scope'),
            field('successful_requests', 'Acknowledged requests'), field('avg_rows', 'Average rows/upload'),
            field('avg_bytes', 'Average bytes/upload', 'bytes'), field('last_rows', 'Last upload rows'),
            field('last_bytes', 'Last upload bytes', 'bytes'), field('failed', 'Failures'), field('last_error', 'Last error')]} />
        <HealthTable ctx={props.ctx} label="Per-mode group activity" rows={grouped()}
          fields={[...membership.slice(0, 2), ...rates, field('pending', 'Pending rows'), field('failed', 'Failures since start')]}
          rowId={row => rowId(row, 'mode', 'id')} empty="No table-group activity reported in this window." />
      </Detail>
      <Detail label="Combined table-group totals">
        <p>Totals across the modes reported for each table group. This table is not a substitute for per-mode measurements.</p>
        <HealthTable ctx={props.ctx} label="Combined table-group totals" rows={store()?.traffic_groups} rowId={row => row.id}
          fields={[field('label', 'Group'), ...rates, field('requests', 'Requests'), field('rows', 'Rows'), field('bytes', 'Bytes', 'bytes'), field('measurement_scope', 'Scope')]} />
      </Detail>
    </>
  }}</HealthBody>
}
