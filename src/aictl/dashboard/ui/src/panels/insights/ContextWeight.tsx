import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { contextHero,
  CONTEXT_BUCKETS, CONTEXT_LABELS, contextFinding, count, money, share, SMALL_STEP_OUTPUT, tokens, toolLabel,
  type ContextBody, type ContextCell, type ContextTool, type Label,
} from './insightsModel'
import styles from './Insights.module.css'

/** One stacked bar over the five context buckets: the share of requests or the share of cost in each. */
function Stack(props: { tool: ContextTool; label: Label; side: 'request_share' | 'cost_share' }) {
  const name = () => props.side === 'request_share' ? 'Requests' : 'Cost'
  const part = (cell: ContextCell) => `${((cell[props.side] ?? 0) * 100).toFixed(2)}%`
  const tip = (cell: ContextCell) => `${CONTEXT_LABELS[cell.bucket]}: ${fmtNum(cell.requests)} requests (${share(cell.request_share)}), ` +
    `${money(cell.cost_usd)} (${share(cell.cost_share)} of cost)`
  return <span class={styles.stackRow}>
    <span class={styles.stackName}>{name()}</span>
    <span class={styles.split} role="img" aria-label={`${props.label(props.tool.tool)}, share of ${name().toLowerCase()} by context: ` +
      props.tool.buckets.map(cell => `${CONTEXT_LABELS[cell.bucket]} ${share(cell[props.side])}`).join(', ')}>
      <For each={props.tool.buckets}>{(cell, i) => <span class={styles[`c${i()}`]} style={{ 'inline-size': part(cell) }} title={tip(cell)} />}</For>
    </span>
  </span>
}

function Stacks(props: { body: ContextBody; label: Label }) {
  return <>
    <ul class={styles.legend} aria-label="Context buckets">
      <For each={CONTEXT_BUCKETS}>{(bucket, i) => <li><span class={`${styles.swatch} ${styles[`c${i()}`]}`} />{CONTEXT_LABELS[bucket]}</li>}</For>
    </ul>
    <ol class={styles.bars} aria-label="Share of requests and of cost by context, per tool">
      <For each={props.body.tools}>{tool => <li class={styles.barRow} data-tool={tool.tool}>
        <span class={styles.barName}>{props.label(tool.tool)}<small>{tool.reported
          ? `median ${tokens(tool.p50_context)} · 90th percentile ${tokens(tool.p90_context)}` : 'token counts not reported'}</small></span>
        <Show when={tool.reported} fallback={<span class={styles.splitText}>{fmtNum(tool.requests)} requests without token counts</span>}>
          <span class={styles.barTrack}>
            <Stack tool={tool} label={props.label} side="request_share" />
            <Stack tool={tool} label={props.label} side="cost_share" />
            <span class={styles.splitText}>200k and more: {share((tool.heavy_requests / tool.reported) || 0)} of {fmtNum(tool.reported)} requests,
              {' '}{money(tool.heavy_cost_usd)} of {money(tool.cost_usd)}</span>
          </span>
        </Show>
      </li>}</For>
    </ol>
    <h3 class={styles.subhead}>Small steps: under {SMALL_STEP_OUTPUT} output tokens and no thinking time</h3>
    <ul class={styles.smallSteps} data-small>
      <For each={props.body.tools}>{tool => <li>{props.label(tool.tool)}: {tool.small_requests == null ? 'not reported'
        : `${count(tool.small_requests)} requests, ${money(tool.small_cost_usd)}`}</li>}</For>
    </ul>
  </>
}

type Row = Record<string, unknown>

export default function ContextWeight(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<ContextBody> {...props} card="context" title="Context weight" tab="context"
    hero={contextHero}
    finding={body => contextFinding(body, label)}
    visual={body => <Stacks body={body} label={label} />}
    note={'Context of a request: input + cache read + cache write tokens, everything the model read for it. A bucket ' +
      'includes its lower bound: 200k tokens is in 200k–500k. A request with no token counts (or all zero) is not reported, ' +
      'not a request of 0 tokens. Cost is list price, not a bill; a cache read costs less than input, so cost does not grow ' +
      `in step with context. Small steps: under ${SMALL_STEP_OUTPUT} output tokens and no thinking time recorded; a source ` +
      'that does not report thinking records none. Only requests in the period count.'}
    table={{
      label: 'Context weight by tool and bucket',
      rows: body => body.tools.flatMap(tool => tool.buckets.map((cell): Row => ({
        id: `${tool.tool}:${cell.bucket}`, tool: label(tool.tool), bucket: CONTEXT_LABELS[cell.bucket], requests: cell.requests,
        request_share: cell.request_share ?? undefined, cost_usd: cell.cost_usd ?? undefined, cost_share: cell.cost_share ?? undefined,
        p50: tool.p50_context ?? undefined, p90: tool.p90_context ?? undefined,
      }))),
      fields: [textField('tool', 'Tool'), textField('bucket', 'Context'), numberField('requests', 'Requests', fmtNum),
        numberField('request_share', 'Share of requests', value => share(value)),
        numberField('cost_usd', 'Cost (list price)', value => money(value)), numberField('cost_share', 'Share of cost', value => share(value)),
        numberField('p50', 'Tool median context', value => tokens(value)), numberField('p90', 'Tool 90th percentile', value => tokens(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('requests', 'Requests of 200k tokens or more', fmtNum),
      numberField('cost_usd', 'Their cost (list price)', value => money(value))]} />
}
