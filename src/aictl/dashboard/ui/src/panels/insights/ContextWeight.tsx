import { untrack } from 'solid-js'
import { fmtN, fmtNum } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { contextHero,
  CONTEXT_BUCKETS, CONTEXT_LABELS, contextCellHover, contextFinding, contextPercentileHover, count, money, plural, share, SMALL_STEP_OUTPUT,
  smallStepHover, tokens, toolLabel, type ContextBody, type Label,
} from './insightsModel'

const TONE = [6, 2, 0, 1, 3]
const legend = CONTEXT_BUCKETS.map((bucket, i) => ({ label: `${CONTEXT_LABELS[bucket]} tokens`, tone: TONE[i] }))
const NONE = 'token counts not reported'

function bucketRows(body: ContextBody, label: Label, of: 'requests' | 'cost'): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool),
    total: !tool.reported ? NONE : of === 'requests' ? plural(tool.reported, 'request') : money(tool.cost_usd),
    parts: tool.reported ? tool.buckets.map((cell, i) => ({
      key: cell.bucket, label: `${CONTEXT_LABELS[cell.bucket]} tokens`, tone: TONE[i],
      value: of === 'requests' ? cell.requests : cell.cost_usd,
      text: of === 'requests' ? `${fmtNum(cell.requests)} · ${share(cell.request_share)}` : `${money(cell.cost_usd)} · ${share(cell.cost_share)}`,
      hover: contextCellHover(tool, cell, label),
    })) : [],
  }))
}

function percentileRows(body: ContextBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.reported).flatMap(tool => (['p50', 'p90'] as const).map(which => {
    const value = which === 'p50' ? tool.p50_context : tool.p90_context
    return { key: `${tool.tool}:${which}`, label: `${label(tool.tool)}: ${which === 'p50' ? 'median' : '90th percentile'}`, total: tokens(value),
      parts: [{ key: which, label: which === 'p50' ? 'median' : '90th percentile', value, tone: which === 'p50' ? 2 : 1,
        text: value == null ? '' : fmtN(value), hover: contextPercentileHover(tool, which, label) }] }
  }))
}

function smallRows(body: ContextBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool),
    total: tool.small_requests == null ? 'not reported' : `${count(tool.small_requests)} requests · ${money(tool.small_cost_usd)}`,
    parts: tool.small_requests == null ? [] : [{ key: 'small', label: 'requests', value: tool.small_requests, tone: 3,
      text: fmtNum(tool.small_requests), hover: smallStepHover(tool, label) }],
  }))
}

function Stacks(props: { body: ContextBody; label: Label }) {
  return <>
    <Bars name="context-requests" title="Requests by the size of the context they read, per tool" scale="whole" legend={legend}
      axis="Bar: the tool's requests with token counts (100%); segments: count and share per bucket." rows={bucketRows(props.body, props.label, 'requests')} />
    <Bars name="context-cost" title="Cost by the size of the context read, per tool" scale="whole" legend={legend}
      axis="Bar: the tool's cost at list price (100%); segments: cost and share per bucket." rows={bucketRows(props.body, props.label, 'cost')} />
    <Bars name="context-percentiles" title="Context read per request: median and 90th percentile, per tool"
      axis="Length: tokens, linear from 0." rows={percentileRows(props.body, props.label)} />
    <Bars name="context-small" title={`Requests with under ${SMALL_STEP_OUTPUT} output tokens and no thinking time, per tool`}
      axis="Length: requests, linear from 0; beside it their cost at list price." rows={smallRows(props.body, props.label)} />
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
