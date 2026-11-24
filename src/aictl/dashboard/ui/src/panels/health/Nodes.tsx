import { createMemo, For, Show, untrack } from 'solid-js'
import type { PanelContext, PanelProps } from '../types'
import { PanelState } from '../../ui/PanelState'
import { Table } from '../../ui/Table'
import type { Field } from '../../ui/tableModel'
import { fmtBytes, fmtDur, fmtNum, NA, stamp } from '../../design/format'
import { Detail, HealthBox } from './HealthParts'
import { useHealth } from './healthData'
import {
  bytesText, filesText, lastError, leftText, nodeState, rateText, reportAge, runningTasks,
  type HistoryRead, type StatusRecord, type StatusRow,
} from './nodeStatus'
import styles from './Health.module.css'
import { nodeNoun, nodeTag, nodeTitle } from '../../data/nodeNames'

type Reader = NonNullable<StatusRecord['readers']>[number]
type Task = NonNullable<StatusRecord['tasks']>[number]
type ToolRow = NonNullable<HistoryRead['by_tool']>[number]

const history = (row: StatusRow) => row.record?.history ?? undefined
const when = (ts: number | null | undefined) => ts == null ? NA : stamp(ts, true)

function nodeFields(now: () => number): Field<StatusRow>[] {
  return [
    // The one table that introduces the node numbers: each with its host name.
    { id: 'node_id', label: 'Node', read: row => nodeTitle(row.node_id) },
    { id: 'status', label: 'Status', read: row => nodeState(row, now()).label,
      hint: row => row.status === 'none' ? 'This node publishes no status record: its daemon runs an older aictl, or has not started.' : undefined },
    { id: 'version', label: 'Version and layout', read: row => row.record
      ? `${row.record.version ?? NA} · layout ${row.record.layout?.version ?? NA}` : undefined,
      hint: row => row.record?.layout?.data_epoch ? `Data epoch ${row.record.layout.data_epoch}` : undefined },
    { id: 'reported_at', label: 'Last report', read: row => row.reported_at == null ? undefined : reportAge(row, now()),
      hint: row => row.reported_at == null ? undefined : `Reported at ${when(row.reported_at)}` },
    { id: 'files', label: 'History files', read: row => history(row) ? filesText(history(row)!) : undefined,
      hint: row => { const h = history(row); return h ? `${fmtNum(h.reading)} being read, ${fmtNum(h.waiting)} waiting, `
        + `${fmtNum(h.outside_window ?? 0)} outside the history window` : undefined } },
    { id: 'bytes', label: 'History bytes', read: row => history(row) ? bytesText(history(row)!) : undefined },
    { id: 'left', label: 'Time left', read: row => history(row) ? leftText(history(row)!) : undefined,
      hint: row => history(row) ? `Read rate ${rateText(history(row)!)}` : undefined },
    { id: 'queued', label: 'Rows queued', numeric: true, read: row => row.record?.writer?.rows_queued ?? undefined,
      format: value => fmtNum(value as number) },
    { id: 'tasks', label: 'Running tasks', read: row => row.record
      ? runningTasks(row.record).map(t => t.label).join(', ') || 'none' : undefined },
    { id: 'error', label: 'Last error', read: row => lastError(row.record) ?? (row.record ? 'none' : undefined) },
  ]
}

const readerFields: Field<Reader>[] = [
  { id: 'label', label: 'Reader', read: r => r.label },
  { id: 'state', label: 'State', read: r => r.state },
  { id: 'files', label: 'Files', read: r => {
    const p = r.progress as HistoryRead | null | undefined
    return p ? filesText(p) : undefined
  } },
  { id: 'bytes', label: 'Bytes read', read: r => {
    const p = r.progress as HistoryRead | null | undefined
    return p ? bytesText(p) : undefined
  } },
  { id: 'rate', label: 'Rate', read: r => {
    const p = r.progress as HistoryRead | null | undefined
    return p ? rateText(p) : undefined
  } },
  { id: 'left', label: 'Time left', read: r => {
    const p = r.progress as HistoryRead | null | undefined
    return p ? leftText(p) : undefined
  } },
  { id: 'last_success_at', label: 'Last successful poll', read: r => r.last_success_at == null ? undefined : when(r.last_success_at) },
  { id: 'rows_total', label: 'Rows since start', numeric: true, read: r => r.rows_total ?? undefined, format: value => fmtNum(value as number) },
  { id: 'last_error', label: 'Last error', read: r => r.last_error ?? 'none' },
]

const toolFields: Field<ToolRow>[] = [
  { id: 'tool', label: 'Tool', read: t => t.tool },
  { id: 'files', label: 'Files', read: t => `${fmtNum(t.complete)} of ${fmtNum(t.complete + t.reading + t.waiting)}` },
  { id: 'waiting', label: 'Waiting', numeric: true, read: t => t.waiting, format: value => fmtNum(value as number) },
  { id: 'bytes', label: 'Bytes read', read: t => `${fmtBytes(t.bytes_read)} of ${fmtBytes(t.bytes - (t.bytes_skipped ?? 0))}` },
  { id: 'left', label: 'Bytes left', read: t => fmtBytes(t.bytes_to_read) },
]

const taskFields: Field<Task>[] = [
  { id: 'label', label: 'Task', read: t => t.label },
  { id: 'state', label: 'State', read: t => t.state },
  { id: 'started_at', label: 'Started', read: t => t.started_at == null ? undefined : when(t.started_at) },
  { id: 'took', label: 'Took', read: t => t.started_at != null && t.ended_at != null ? fmtDur(t.ended_at - t.started_at) : undefined },
  { id: 'progress', label: 'Progress or result', read: t => t.progress || t.result || undefined },
  { id: 'last_error', label: 'Last error', read: t => t.last_error ?? 'none' },
]

/** One row per node, and per node a disclosure with its readers, history per tool, writer and tasks. */
export function NodeStatusTable(props: { ctx: PanelContext; rows: readonly StatusRow[]; now: () => number }) {
  const fields = createMemo(() => nodeFields(props.now))
  return <>
    <div class={styles.grid} data-columns="wide">
      <Table label="Node status" fields={fields()} rows={props.rows} rowId={row => row.node_id}
        action={props.ctx.scope() === 'fleet' ? {
          label: row => row.node_id === 'legacy' ? '' : `View ${nodeNoun(row.node_id)}`,
          run: row => props.ctx.navigate({ scope: 'node', node_id: row.node_id }),
        } : undefined} />
    </div>
    <For each={props.rows.filter(row => row.record)} keyed={row => row.node_id}>{row => {
      const record = () => row().record!
      return <Detail label={`Node ${nodeTag(row().node_id)}: readers, history per tool, writer and tasks`} hint={nodeTitle(row().node_id)}>
        <Table label={`Readers of ${nodeNoun(row().node_id)}`} tableId="node-status-readers" fields={readerFields}
          rows={record().readers ?? []} rowId={r => r.name} />
        <Show when={record().history?.by_tool?.length}>
          <Table label={`History per tool of ${nodeNoun(row().node_id)}`} tableId="node-status-tools" fields={toolFields}
            rows={record().history!.by_tool!} rowId={t => t.tool} />
        </Show>
        <Show when={record().writer}>{writer =>
          <p class={styles.note}>Writer {writer().status ?? NA}: {fmtNum(writer().rows_queued ?? null)} rows queued
            ({fmtBytes(writer().bytes_queued ?? null)}), {fmtNum(writer().in_flight ?? null)} in flight,
            {' '}{fmtNum(writer().failures ?? null)} failed requests, {fmtNum(writer().rows_dropped ?? null)} rows dropped
            {writer().tables_failing?.length ? `; failing: ${writer().tables_failing!.join(', ')}` : ''}.</p>}
        </Show>
        <Show when={record().tasks?.length} fallback={<p class={styles.note}>No background task ran since the daemon started.</p>}>
          <Table label={`Background tasks of ${nodeNoun(row().node_id)}`} tableId="node-status-tasks" fields={taskFields}
            rows={record().tasks!} rowId={t => t.name} />
        </Show>
        <p class={styles.note}>Daemon started {when(record().daemon_started_at)}; report at {when(record().reported_at)}
          {record().history?.scan_ms != null ? `; history scan took ${fmtDur(record().history!.scan_ms! / 1000)}` : ''}.</p>
      </Detail>
    }}</For>
  </>
}

export default function Nodes(props: PanelProps) {
  const ctx = untrack(() => props.ctx)
  const health = useHealth()
  const status = () => health.nodeStatus()
  return <HealthBox def={props.def}>
    <div class={styles.flow}>
      <Show when={status().error}>{error => <PanelState state="error" inline message={`Could not read node status: ${error()}`} />}</Show>
      <Show when={status().rows} fallback={<PanelState state={status().loading ? 'loading' : 'unavailable'} inline />}>{rows =>
        <Show when={rows().length} fallback={<PanelState state="empty" inline message="No node reported a status." />}>
          <NodeStatusTable ctx={ctx} rows={rows()} now={health.now} />
        </Show>}
      </Show>
    </div>
  </HealthBox>
}
