import { Show, untrack } from 'solid-js'
import type { PanelProps } from '../types'
import { date, Detail, fact, Facts, field, HealthBody, HealthTable, rowId } from './HealthParts'
import { measuredValue, sinceStart, writeWarning } from './healthModel'
import { HealthMeter, StatTiles, percentOf } from './HealthVisuals'
import styles from './Health.module.css'

export default function Collection(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  return <HealthBody ctx={ctx} def={props.def} select={data => data.pipeline}>{data => {
    const self = () => data().pipeline?.self
    const stream = () => data().pipeline?.stream
    const sink = () => data().pipeline?.sink
    const otel = () => data().pipeline?.otel_receiver
    const store = () => data().store
    const warning = () => writeWarning(self()?.writes, store()?.kind)
    const drops = () => percentOf(sink()?.dropped, sink()?.emitted)
    return <>
      <StatTiles items={[
        { label: 'Daemon uptime', value: self()?.uptime_s, unit: 's' },
        { label: 'Live viewers', value: stream()?.connected_clients, detail: 'connected now' },
        { label: 'Snapshot age', value: stream()?.snapshot_age_s, unit: 's' },
        { label: 'Samples buffered', value: sink()?.buffered, detail: 'waiting now' },
        { label: 'Samples dropped', value: sink()?.dropped, tone: sink()?.dropped ? 'warning' : 'neutral', detail: sinceStart(data()) },
      ]} />
      <HealthMeter label="Dropped share of samples" value={drops()} tone={(drops() ?? 0) > 0 ? 'warning' : 'neutral'} />
      <Show when={sink()?.flood || warning()}><p class={styles.warning}>
        {sink()?.flood ? 'Flood protection is dropping collector samples.' : warning()}
      </p></Show>
      <Detail label="Collection details">
        <Facts ctx={ctx} items={[
          fact('Daemon PID', self()?.pid), fact('Threads', self()?.threads, undefined, 'self.threads'),
          date('Newest snapshot', stream()?.snapshot_ts), fact('Stored history rows', measuredValue(store()?.volume, 'rows'), undefined, 'self.db_rows'),
          fact('Stored history size', measuredValue(store()?.volume, 'bytes'), undefined, 'self.db_size'),
          fact('History scope', store()?.volume?.scope), date('History measured', store()?.volume?.checked_at),
          fact('Samples received', sink()?.emitted, undefined, 'board.self.sink'), fact('Samples submitted', sink()?.flushed, undefined, 'board.self.sink'),
          fact('Samples buffered', sink()?.buffered, undefined, 'board.self.sink'), fact('Metrics tracked', sink()?.tracked),
          fact('Flood protection drops', sink()?.flood_drops),
          fact('OTel receiver active', otel()?.active, undefined, 'otel.receiver.active'),
          fact('OTel metrics received', otel()?.metrics_received, undefined, 'otel.receiver.metrics_received'),
          fact('OTel events received', otel()?.events_received, undefined, 'otel.receiver.events_received'),
          date('Last OTel data', otel()?.last_receive_at),
          fact('OTel model calls', otel()?.api_calls_total, undefined, 'otel.receiver.api_calls_total'),
          fact('OTel model errors', otel()?.api_errors_total, undefined, 'otel.receiver.api_errors_total'),
          fact('Rejected OTel payloads', otel()?.errors, undefined, 'otel.receiver.parse_errors'), fact('Skipped OTel items', otel()?.dropped),
        ]} />
        <HealthTable ctx={ctx} label="Active history writes" rows={self()?.writes} rowId={row => rowId(row, 'name', 'started_at')}
          fields={[field('name', 'Write'), field('age_s', 'Elapsed', 'seconds')]} empty="No writes in progress." />
      </Detail>
    </>
  }}</HealthBody>
}
