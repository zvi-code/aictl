import { For, Show, untrack } from 'solid-js'
import { fmtDur, fmtNum, projectName } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  pauseHero, BUCKET_LABELS, BUCKETS, CAUSE_LABELS, money, PAUSE_CAUSES, pauseBucketHover, pauseCallHover, pauseCauseBars, pauseCauseHover,
  pauseEstimate, pauseEstimateHover, pauseFinding, pauseMeasuredHover, pauseProjectHover, pauseProjects, plural, share,
  toolLabel, type Bucket, type Label, type PauseBody, type PauseCause,
} from './insightsModel'

const BUCKET_TONE: Record<Bucket, number> = { under_1m: 6, '1_5m': 2, '5_60m': 1, over_60m: 3 }
const CAUSE_TONE: Record<PauseCause, number> = {
  tool_running: 1, other_agent_working: 5, person_asked: 4, new_prompt: 0, tool_short_or_untimed: 3, nothing_recorded: 7,
}
const bucketLegend = BUCKETS.map(bucket => ({ label: `Pause ${BUCKET_LABELS[bucket]}`, tone: BUCKET_TONE[bucket] }))
const toolSub = (tool: PauseBody['tools'][number]) => tool.cache_reported ? undefined : 'cache writes not reported'

/** Per tool, its requests (or their cost) split by the pause before them: four segments that make the whole. */
function bucketRows(body: PauseBody, label: Label, of: 'requests' | 'cost'): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: toolSub(tool),
    total: of === 'requests' ? plural(tool.buckets.reduce((sum, cell) => sum + cell.requests, 0), 'request')
      : money(tool.buckets.reduce((sum, cell) => sum + (cell.cost_usd ?? 0), 0)),
    parts: tool.buckets.map(cell => ({
      key: cell.bucket, label: `pause ${BUCKET_LABELS[cell.bucket]}`, tone: BUCKET_TONE[cell.bucket],
      value: of === 'requests' ? cell.requests : cell.cost_usd,
      text: of === 'requests' ? fmtNum(cell.requests) : money(cell.cost_usd), hover: pauseBucketHover(tool, cell, label),
    })),
  }))
}

/** Per tool and bucket, the average cost of a request: one linear scale for every bar of one tool. */
function averageRows(tool: PauseBody['tools'][number], label: Label): BarRow[] {
  return tool.buckets.map(cell => ({
    key: cell.bucket, label: `Pause ${BUCKET_LABELS[cell.bucket]}`, sub: plural(cell.requests, 'request'), total: money(cell.avg_cost_usd),
    parts: [{ key: cell.bucket, label: 'average cost per request', value: cell.avg_cost_usd, tone: BUCKET_TONE[cell.bucket],
      text: money(cell.avg_cost_usd), hover: pauseBucketHover(tool, cell, label) }],
  }))
}

/** Per tool, the measured cost of its requests after a pause of 5 minutes or more against the estimate at its under-1-minute average. */
function estimateRows(body: PauseBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.cache_reported && pauseEstimate(tool).requests > 0).flatMap(tool => {
    const e = pauseEstimate(tool)
    return [
      { key: `${tool.tool}:measured`, label: `${label(tool.tool)}: measured`, sub: plural(e.requests, 'request'), total: money(e.cost),
        parts: [{ key: 'measured', label: 'measured cost', value: e.cost, tone: 1, text: money(e.cost), hover: pauseMeasuredHover(tool, label) }] },
      { key: `${tool.tool}:estimate`, label: `${label(tool.tool)}: estimate`, sub: `${fmtNum(e.priced)} × ${money(e.average)}`,
        total: money(e.estimate),
        parts: [{ key: 'estimate', label: 'estimate', value: e.estimate, tone: 6, text: money(e.estimate), hover: pauseEstimateHover(tool, label) }] },
    ]
  })
}

function causeRows(body: PauseBody, label: Label): BarRow[] {
  return pauseCauseBars(body).map(bar => ({
    key: bar.tool, label: label(bar.tool), sub: plural(bar.requests, 'request'), total: money(bar.total),
    parts: bar.causes.map(row => ({
      key: row.cause, label: CAUSE_LABELS[row.cause], value: row.cost_usd, tone: CAUSE_TONE[row.cause],
      text: `${money(row.cost_usd)} · ${share(row.share)}`, hover: pauseCauseHover(row, bar.total, label),
    })),
  }))
}

function projectRows(body: PauseBody): BarRow[] {
  const split = pauseProjects(body)
  return [
    ...split.top.map((row): BarRow => ({
      key: row.project, label: projectName(row.project), title: row.project, sub: `${plural(row.sessions, 'session')} · ${plural(row.requests, 'request')}`,
      total: money(row.extra), parts: [{ key: 'difference', label: 'measured minus estimate', value: row.extra, tone: 1, text: money(row.extra),
        hover: pauseProjectHover(row, 0) }],
    })),
    ...(split.rest ? [{ key: 'rest', label: 'Other projects', sub: 'summed', total: money(split.rest),
      parts: [{ key: 'difference', label: 'measured minus estimate', value: split.rest, tone: 7, text: money(split.rest),
        hover: pauseProjectHover(null, split.rest) }] }] : []),
  ]
}

function callRows(body: PauseBody, label: Label): BarRow[] {
  return (body.cause_tools ?? []).map((row, i) => ({
    key: `${row.tool}:${row.tool_name ?? ''}:${row.program ?? ''}:${i}`,
    label: `${row.tool_name ?? 'unnamed call'}${row.program ? ` (${row.program})` : ''}`,
    sub: `${label(row.tool)} · ${plural(row.requests, 'pause')} · ran ${fmtDur(row.p50_call_s)} median, ${fmtDur(row.max_call_s)} at most`,
    total: money(row.cost_usd),
    parts: [{ key: 'cost', label: 'cost after the pauses', value: row.cost_usd, tone: CAUSE_TONE.tool_running, text: money(row.cost_usd),
      hover: pauseCallHover(row, label) }],
  }))
}

function Visual(props: { body: PauseBody; label: Label }) {
  const causes = () => causeRows(props.body, props.label)
  const shownCauses = () => PAUSE_CAUSES.filter(cause => causes().some(row => row.parts.some(part => part.key === cause)))
  return <>
    <Show when={props.body.tools.length}>
      <Bars name="pause-requests" title="Requests by the pause before them, per tool" scale="whole" legend={bucketLegend}
        axis="Bar: all requests of the tool in the period (100%); segments: requests in each pause bucket, count written on each."
        rows={bucketRows(props.body, props.label, 'requests')} />
      <Bars name="pause-cost" title="Cost by the pause before the request, per tool" scale="whole" legend={bucketLegend}
        axis="Bar: the tool's cost at list price in the period (100%); segments: cost of the requests in each pause bucket."
        rows={bucketRows(props.body, props.label, 'cost')} />
    </Show>
    <Show when={causes().length}>
      <Bars name="pause-causes" title="Cost after pauses of 5 minutes or more, by what the pause recorded, per tool" scale="whole"
        legend={shownCauses().map(cause => ({ label: CAUSE_LABELS[cause], tone: CAUSE_TONE[cause] }))}
        axis="Bar: the tool's cost after pauses of 5 minutes or more (100%); segments: cost and share per recorded cause."
        rows={causes()} />
    </Show>
    <Show when={estimateRows(props.body, props.label).length}>
      <Bars name="pause-estimate" title="After pauses of 5 minutes or more: measured cost and estimate, per tool"
        axis="Length: cost at list price, linear from $0. Estimate = priced requests × the tool's average cost per request after a pause under 1 minute (hover for each)."
        rows={estimateRows(props.body, props.label)} />
    </Show>
    <Show when={pauseProjects(props.body).top.length}>
      <Bars name="pause-projects" title="Measured cost minus the estimate, per project"
        axis="Length: dollars at list price, linear from $0; the five largest projects, every other one summed (grey)."
        rows={projectRows(props.body)} />
    </Show>
    <Show when={props.body.cause_tools?.length}>
      <Bars name="pause-calls" title="Calls still running through a pause of 5 minutes or more"
        axis="Length: cost at list price of the requests after those pauses, linear from $0."
        rows={callRows(props.body, props.label)} />
    </Show>
    <For each={props.body.tools}>{tool => <Bars name={`pause-average-${tool.tool}`}
      title={`${props.label(tool.tool)}: average cost per request by the pause before it${tool.cache_reported ? '' : ' (cache writes not reported)'}`}
      axis="Length: dollars per priced request at list price, linear from $0 to this tool's largest average."
      rows={averageRows(tool, props.label)} />}</For>
  </>
}

type Row = Record<string, unknown>

export default function PauseTax(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<PauseBody> {...props} card="pause" title="Pause tax" tab="flow"
    hero={pauseHero}
    finding={body => pauseFinding(body, label)}
    visual={body => <Visual body={body} label={label} />}
    note={'Pause: from the end of the previous request of the same session and agent to the start of this one; buckets are under ' +
      '1 minute, 1 to under 5 minutes, 5 to under 60 minutes and 60 minutes or more. The prompt cache of these tools expires ' +
      'after 5 minutes. Only requests in the period count, so a session that started before it loses its first pause. Average ' +
      'cost per priced request; cost is list price, not a bill. "Cache not reported": the source writes no cache tokens, so it ' +
      'is left out of the sentence and the estimate. Estimate: the priced requests after a pause of 5 minutes or more × the ' +
      'tool\'s average cost per request after a pause under 1 minute; it is not measured. Per project: the measured cost of its ' +
      'requests after a pause of 5 minutes or more less that estimate; the five largest projects are drawn, every other project ' +
      'and the requests with no project are summed. What the pause recorded, the first that holds: the agent\'s own calls ran ' +
      'for at least half the pause (a call still running; a call that starts a subagent is not counted); another agent of the ' +
      'session made a request in it, or a call that starts a subagent ran for half of it (another agent working); a call waited ' +
      'for a person to approve it or answer; a prompt arrived; the agent made only short or untimed calls; nothing was recorded. ' +
      'A call is placed by its start time.'}
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
      numberField('requests', 'Requests after a pause of 5 min or more', fmtNum),
      numberField('cost_usd', 'Their cost (list price)', value => money(value))]} />
}
