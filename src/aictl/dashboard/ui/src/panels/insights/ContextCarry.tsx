import { For, Show, untrack } from 'solid-js'
import { fmtNum, toolDisplayName } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, carryFinding, count, scaled, type CarryBody, type Label } from './insightsModel'
import styles from './Insights.module.css'

const width = (value: number | null, largest: number) => `max(var(--space-1), ${(scaled(value, largest) * 85).toFixed(2)}%)`

/** Per tool name: a bar for the bytes its results had, beside a bar for the bytes sent again with later requests. */
function CarryBars(props: { body: CarryBody; label: Label }) {
  const largest = () => Math.max(0, ...props.body.tool_names.map(row => row.carried_bytes))
  return <>
    <ul class={styles.legend}>
      <li><span class={`${styles.swatch} ${styles.produced}`} />Result bytes</li>
      <li><span class={`${styles.swatch} ${styles.carried}`} />Bytes carried (upper bound)</li>
    </ul>
    <ol class={styles.bars} aria-label="Tool names that carry the most bytes">
      <For each={props.body.tool_names}>{row => <li class={styles.barRow}>
        <span class={styles.barName}>{toolDisplayName(row.tool_name)}<small>{props.label(row.tool)} · {fmtNum(row.calls)} calls · ≈ {count(row.avg_later_requests)} later requests</small></span>
        <span class={styles.barTrack}>
          <span class={styles.bar}><span class={`${styles.fill} ${styles.produced}`} style={{ 'inline-size': width(row.output_bytes, largest()) }} />{bytes(row.output_bytes)}</span>
          <span class={styles.bar}><span class={`${styles.fill} ${styles.carried}`} style={{ 'inline-size': width(row.carried_bytes, largest()) }} />{bytes(row.carried_bytes)}</span>
        </span>
      </li>}</For>
    </ol>
    <Show when={props.body.summary.not_reported.length}>
      <p class={styles.note}>Result size not reported by: {props.body.summary.not_reported.map(props.label).join(', ')}.</p>
    </Show>
  </>
}

export default function ContextCarry(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? tool
  return <InsightCard<CarryBody> {...props} card="carry" title="Context carry" tab="context"
    finding={body => carryFinding(body, label)}
    visual={body => <CarryBars body={body} label={label} />}
    note={'Upper bound: bytes carried = result bytes × the later requests of the same session and agent. Compaction and ' +
      'truncation of the context are not taken into account, so the real figure is lower. Bytes as the source recorded them, ' +
      'not tokens or cost. Only requests and calls in the period count. The 10 tool names that carry the most are shown.'}
    table={{
      label: 'Context carry by tool name',
      rows: body => [
        ...body.tool_names.map(row => ({ id: `${row.tool}:${row.tool_name}`, tool: label(row.tool), name: row.tool_name,
          calls: row.calls, output_bytes: row.output_bytes, avg_later: row.avg_later_requests ?? undefined, carried_bytes: row.carried_bytes })),
        ...body.tools.map(row => ({ id: `${row.tool}:*`, tool: label(row.tool), name: 'All tool names', calls: row.calls,
          output_bytes: row.output_bytes ?? undefined, carried_bytes: row.carried_bytes ?? undefined,
          reported: row.reported })),
      ],
      fields: [textField('tool', 'Tool'), textField('name', 'Tool name'), numberField('calls', 'Calls', fmtNum),
        numberField('reported', 'Calls with a size', fmtNum), numberField('output_bytes', 'Result bytes', value => bytes(value)),
        numberField('avg_later', 'Later requests (average)', value => count(value)),
        numberField('carried_bytes', 'Bytes carried (upper bound)', value => bytes(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('calls', 'Calls', fmtNum), numberField('output_bytes', 'Result bytes', value => bytes(value)),
      numberField('carried_bytes', 'Bytes carried (upper bound)', value => bytes(value))]} />
}
