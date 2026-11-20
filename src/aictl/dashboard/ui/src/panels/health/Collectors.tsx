import { untrack } from 'solid-js'
import type { PanelProps } from '../types'
import { Detail, field, HealthBody, HealthTable, rowId } from './HealthParts'
import { Meter } from '../../ui/Meter'
import { StatTiles, percentOf } from './HealthVisuals'

const columns = [field('name', 'Collector'), field('status', 'Status'), field('mode', 'Mode'), field('detail', 'Detail')]
const roots = [field('kind', 'Kind'), field('path', 'Path')]

export default function Collectors(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  return <HealthBody ctx={ctx} select={data => data.monitor}>{data => {
    const collectors = () => data().monitor?.collectors
    const active = () => collectors()?.filter(row => ['active', 'ok'].includes(row.status)).length
    return <>
      <StatTiles items={[
        { label: 'Reporting collectors', value: collectors()?.length },
        { label: 'Active collectors', value: active() },
        { label: 'Folders tracked', value: data().monitor?.roots?.length },
      ]} />
      <Meter label="Active share of collectors" value={percentOf(active(), collectors()?.length)} />
      <HealthTable ctx={ctx} label="Collector status" fields={columns} rows={collectors()} rowId={row => row.name}
        empty="No collector reports." />
      <Detail label="Monitored folders">
        <HealthTable ctx={ctx} label="Monitored folders" fields={roots} rows={data().monitor?.roots} rowId={row => rowId(row, 'kind', 'path')}
          empty="No monitored folders were reported." />
      </Detail>
    </>
  }}</HealthBody>
}
