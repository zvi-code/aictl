import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars } from './Bars'
import { Columns, toneClass } from './charts/Columns'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { Name, opening, opens, type Opens } from './charts/Open'
import { PairedBars } from './charts/PairedBars'
import charts from './charts/Charts.module.css'
import {
  CAUSE_TONE, PAUSE_LEGEND, pauseCallRows, pauseCauseRows, pauseColumns, pauseEstimateRows, pauseLine, pauseProjectRows, pauseSplit,
  toolAction, type ToolNamed,
} from './costModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  BUCKET_LABELS, CAUSE_LABELS, money, PAUSE_CAUSES, pauseHero, pauseProjects, share, toolLabel, type Label, type PauseBody,
} from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'

const REPO_AXIS = 'a segment per repository'
const perRepo = (on: boolean) => on ? `; ${REPO_AXIS}` : ''

/** What the names open: a coding tool narrows the page, a project narrows it to the project, a call opens its tool. */
const links = (open: Opens, label: Label) => ({
  product: (tool: string) => open.product(tool, label(tool)),
  tools: <T extends ToolNamed>(rows: T[]) => opening(rows, row => row.tool ? open.product(row.tool, label(row.tool)) : undefined),
  projects: <T extends { project?: string }>(rows: T[]) => opening(rows, row => row.project ? open.project(row.project) : undefined),
  calls: <T extends { toolName: string }>(rows: T[]) => opening(rows, row => open.tool(row.toolName)),
})
type Links = ReturnType<typeof links>

function Visual(props: { body: PauseBody; label: Label; link: Links; by: ColourMode; setBy: (by: ColourMode) => void }) {
  const split = () => pauseSplit(props.body)
  const by = (): ColourMode => split() ? props.by : 'parts'
  const repo = () => by() === 'repo'
  const causes = () => pauseCauseRows(props.body, by(), props.label)
  const shownCauses = () => PAUSE_CAUSES.filter(cause => (props.body.causes ?? [])
    .some(row => row.cause === cause && props.body.tools.some(tool => tool.tool === row.tool)))
  const longs = () => props.body.tools.flatMap(tool => tool.long_pause ? [tool.long_pause] : [])
  return <>
    <ColourBy parts="Pause length" value={by()} onChange={props.setBy} split={split()} />
    <Show when={repo()} fallback={<ul class={charts.legend} aria-label="Pause length: colours of the columns" data-parts-legend>
      <For each={PAUSE_LEGEND}>{item => <li><span class={`${charts.swatch} ${toneClass(item.tone)}`} />{item.label}</li>}</For>
    </ul>}>
      <RepoLegend split={props.body} other={hasOther([...props.body.tools.flatMap(tool => tool.buckets), ...longs(),
        ...(props.body.projects ?? []), ...(props.body.causes ?? []), ...(props.body.cause_tools ?? [])])} />
    </Show>
    <For each={props.body.tools}>{tool => <section class={charts.group} data-tool={tool.tool} aria-label={props.label(tool.tool)}>
      <h2 class={charts.groupTitle}><Name text={props.label(tool.tool)} open={props.link.product(tool.tool)} /></h2>
      <Show when={!tool.cache_reported}><p class={charts.note} data-no-cache>This source reports no cache writes.</p></Show>
      <div class={charts.grid}>
        <Columns name={`pause-requests-${tool.tool}`} title="Requests by pause length"
          axis={`Requests, one scale from 0; under each column its share of the tool's requests${perRepo(repo())}.`}
          columns={pauseColumns(props.body, tool, 'requests', by(), props.label)} />
        <Columns name={`pause-cost-${tool.tool}`} title="Cost by pause length"
          axis={`Cost at list price, one scale from $0; under each column its share of the tool's cost${perRepo(repo())}.`}
          columns={pauseColumns(props.body, tool, 'cost', by(), props.label)} />
        <Columns name={`pause-average-${tool.tool}`} title="Average cost per request by pause length"
          axis={`Dollars per priced request at list price, one scale from $0${repo() ? '; not split by repository' : ''}.`}
          columns={pauseColumns(props.body, tool, 'average', by(), props.label)} />
      </div>
    </section>}</For>
    <div class={charts.gridWide}>
      <Show when={causes().length}>
        <Bars name="pause-causes" title="Cost after pauses of 5 min or more, by recorded cause" scale={repo() ? 'shared' : 'whole'}
          legend={repo() ? undefined : shownCauses().map(cause => ({ label: CAUSE_LABELS[cause], tone: CAUSE_TONE[cause] }))}
          axis={repo() ? `Cost at list price, one scale from $0${perRepo(true)}.` : 'Bar: the tool\'s cost after these pauses (100%).'}
          rows={props.link.tools(causes())} />
      </Show>
      <PairedBars name="pause-estimate" title="Cost after pauses of 5 min or more: measured and estimate"
        lanes={[{ title: 'Measured' }, { title: 'Estimate, not measured', estimate: true }]} scale="shared"
        axis={'Cost at list price, one scale from $0. Estimate: priced requests × the tool\'s average cost per request after a ' +
          `pause under 1 min${perRepo(repo())}.`}
        rows={props.link.tools(pauseEstimateRows(props.body, by(), props.label))} />
      <Show when={pauseProjects(props.body).top.length}>
        <Bars name="pause-projects" title="Measured cost minus the estimate, per project"
          axis={`Dollars at list price, one scale from $0; the five largest projects, the rest summed${perRepo(repo())}.`}
          rows={props.link.projects(pauseProjectRows(props.body, by()))} />
      </Show>
      <Show when={props.body.cause_tools?.length}>
        <Bars name="pause-calls" title="Calls still running through a long pause"
          axis={`Cost at list price of the requests after those pauses, one scale from $0${perRepo(repo())}.`}
          rows={props.link.calls(pauseCallRows(props.body, by(), props.label))} />
      </Show>
    </div>
  </>
}

type Row = Record<string, unknown>

export default function PauseTax(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [by, setBy] = useColourBy()
  const open = opens(ctx)
  const link = links(open, label)
  const product = toolAction<Row>(open, label, 'tool_id')
  return <InsightCard<PauseBody> {...props} card="pause" tab="flow"
    hero={pauseHero}
    finding={pauseLine}
    visual={body => <Visual body={body} label={label} link={link} by={by()} setBy={setBy} />}
    note={'Pause: from the end of the previous request of the same session and agent to the start of this one; buckets are under ' +
      '1 minute, 1 to under 5 minutes, 5 to under 60 minutes and 60 minutes or more. The prompt cache of these tools expires ' +
      'after 5 minutes, so the columns of pauses of 5 minutes or more have their own colour. Only requests in the period count, ' +
      'so a session that started before it loses its first pause. Average cost per priced request; cost is list price, not a ' +
      'bill. "No cache writes": the source writes no cache tokens, so it is left out of the estimate. Estimate (hatched, in its ' +
      'own lane): the priced requests after a pause of 5 minutes or more × the tool\'s average cost per request after a pause ' +
      'under 1 minute; it is not measured. Per project: the measured cost of its requests after a pause of 5 minutes or more ' +
      'less that estimate; the five largest projects are drawn, every other project and the requests with no project are ' +
      'summed. What the pause recorded, the first that holds: the agent\'s own calls ran for at least half the pause (a call ' +
      'still running; a call that starts a subagent is not counted); another agent of the session made a request in it, or a ' +
      'call that starts a subagent ran for half of it (another agent working); a call waited for a person to approve it or ' +
      'answer; a prompt arrived; the agent made only short or untimed calls; nothing was recorded. A call is placed by its ' +
      'start time. Colour by Repository: requests and cost split into one segment per repository; an average is not split.'}
    table={{
      label: 'Pause tax by tool and pause',
      rows: body => body.tools.flatMap(tool => tool.buckets.map((cell): Row => ({
        id: `${tool.tool}:${cell.bucket}`, tool: label(tool.tool), tool_id: tool.tool, pause: BUCKET_LABELS[cell.bucket], requests: cell.requests,
        cache_hit_share: cell.cache_hit_share ?? undefined, avg_cost_usd: cell.avg_cost_usd ?? undefined,
        cost_usd: cell.cost_usd ?? undefined, cache: tool.cache_reported ? 'reported' : 'not reported',
      }))),
      fields: [{ ...textField('tool', 'Tool'), action: product }, textField('pause', 'Pause'), numberField('requests', 'Requests', fmtNum),
        numberField('cache_hit_share', 'Cache hits (share of input)', value => share(value)),
        numberField('avg_cost_usd', 'Average cost (list price)', value => money(value)),
        numberField('cost_usd', 'Cost (list price)', value => money(value)), textField('cache', 'Cache writes')],
    }}
    sessionFields={[{ ...textField('tool', 'Tool', row => label(String(row.tool ?? ''))), action: toolAction(open, label, 'tool') },
      numberField('requests', 'Requests after a pause of 5 min or more', fmtNum),
      numberField('cost_usd', 'Their cost (list price)', value => money(value))]} />
}
