import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { BUCKET_LABELS, money, pauseFinding, scaled, share, toolLabel, type Label, type PauseBody } from './insightsModel'
import styles from './Insights.module.css'

const W = 300, H = 172, TOP = 34, BOTTOM = 36, SIDE = 6
const SLOT = (W - 2 * SIDE) / 4, BAR = SLOT * 0.56

/** Average cost per request for each pause bucket of one tool, with the 5-minute cache limit marked. */
function ToolChart(props: { tool: PauseBody['tools'][number]; index: number; label: Label }) {
  const largest = () => Math.max(0, ...props.tool.buckets.map(cell => cell.avg_cost_usd ?? 0))
  const plot = H - TOP - BOTTOM
  const fill = () => props.tool.cache_reported ? styles[`s${props.index % 4}`] : styles.unreported
  return <figure class={styles.flow}>
    <h3>{props.label(props.tool.tool)}<Show when={!props.tool.cache_reported}> · cache not reported</Show></h3>
    <svg class={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${props.label(props.tool.tool)}: average cost per request by pause before it` +
        (props.tool.cache_reported ? '' : '; this source reports no cache writes')}>
      <line class={styles.axis} x1={SIDE} x2={W - SIDE} y1={H - BOTTOM} y2={H - BOTTOM} />
      <For each={props.tool.buckets}>{(cell, i) => {
        const height = () => scaled(cell.avg_cost_usd, largest()) * plot
        const x = () => SIDE + i() * SLOT + (SLOT - BAR) / 2
        return <g>
          <rect class={fill()} x={x()} width={BAR} y={H - BOTTOM - height()} height={height()}>
            <title>{`${BUCKET_LABELS[cell.bucket]}: ${fmtNum(cell.requests)} requests, ${money(cell.avg_cost_usd)} per request, ` +
              `${money(cell.cost_usd)} in all, cache hits ${share(cell.cache_hit_share)} of input`}</title>
          </rect>
          <text x={x() + BAR / 2} y={H - BOTTOM - height() - 4} text-anchor="middle">{money(cell.avg_cost_usd)}</text>
          <text x={x() + BAR / 2} y={H - BOTTOM + 14} text-anchor="middle">{BUCKET_LABELS[cell.bucket]}</text>
          <text class={styles.muted} x={x() + BAR / 2} y={H - BOTTOM + 28} text-anchor="middle">{fmtNum(cell.requests)} req</text>
        </g>
      }}</For>
      <line class={styles.limit} x1={SIDE + 2 * SLOT} x2={SIDE + 2 * SLOT} y1={8} y2={H - BOTTOM} />
      <text class={styles.limitText} x={SIDE + 2 * SLOT + 4} y={12}>5 min: cache lapses</text>
    </svg>
  </figure>
}

type Row = Record<string, unknown>

export default function PauseTax(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<PauseBody> {...props} card="pause" title="Pause tax" tab="flow"
    finding={body => pauseFinding(body, label)}
    visual={body => <div class={styles.flows}>
      <For each={body.tools}>{(tool, i) => <ToolChart tool={tool} index={i()} label={label} />}</For>
    </div>}
    note={'Pause: from the end of the previous request of the same session and agent to the start of this one. ' +
      'Only requests in the period count, so a session that started before it loses its first pause. Average cost per ' +
      'priced request; cost is list price, not a bill. "Cache not reported": the source writes no cache tokens, so its ' +
      'costs cannot show a lapsed cache and it is left out of the finding.'}
    table={{
      label: 'Pause tax by tool and pause',
      rows: body => body.tools.flatMap(tool => tool.buckets.map((cell): Row => ({
        id: `${tool.tool}:${cell.bucket}`, tool: label(tool.tool), pause: BUCKET_LABELS[cell.bucket], requests: cell.requests,
        cache_hit_share: cell.cache_hit_share ?? undefined, avg_cost_usd: cell.avg_cost_usd ?? undefined,
        cost_usd: cell.cost_usd ?? undefined, cache: tool.cache_reported ? 'reported' : 'not reported',
      }))),
      fields: [textField('tool', 'Tool'), textField('pause', 'Pause'), numberField('requests', 'Requests', fmtNum),
        numberField('cache_hit_share', 'Cache hits (share of input)', value => share(value)),
        numberField('avg_cost_usd', 'Average cost (list price)', value => money(value)),
        numberField('cost_usd', 'Cost (list price)', value => money(value)), textField('cache', 'Cache writes')],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('requests', 'Requests after a pause over 5 min', fmtNum),
      numberField('cost_usd', 'Their cost (list price)', value => money(value))]} />
}
