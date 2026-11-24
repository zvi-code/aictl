import { Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { FlowDiagram } from './charts/FlowDiagram'
import { HeatGrid } from './charts/HeatGrid'
import { BarChart } from './FlowsBars'
import { axisText, barTop, type BarRow } from './flowBarModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  cycleAxis, cycleName, cycleRows, endingFlow, endingLegend, endingRepoRows, fewSessions, flowsFinding, flowsSplit, flowToolRows,
  OUTCOME_LABELS, OUTCOMES, pathRows, projectRepoRows, projectRows, step, tooSmall, transitionGrid, withoutRepos, workTime,
  type FlowOutcome, type FlowsBody, type Step,
} from './flowsModel'
import { money, share, toolLabel, type Label } from './insightsModel'
import styles from './Insights.module.css'
import own from './Flows.module.css'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'

/** Every bar of the view the server split by repository, for the legend's "Other repositories". */
function splitBars(body: FlowsBody) {
  const endings = OUTCOMES.map(outcome => body.endings[outcome])
  return [...endings, ...endings.flatMap(ending => ending.last_steps), ...body.first_paths, ...body.last_paths, ...body.cycles,
    ...body.projects, ...body.tools]
}
/** The axis line of a chart: what the bar length measures, its scale, and that a segment is a repository where it is. */
const axisOf = (measure: string, top: string, rows: readonly BarRow[]) =>
  axisText(measure, top) + (rows.some(row => row.parts.some(part => part.repo != null)) ? ' A segment per repository.' : '')

function Visual(props: { body: FlowsBody; label: Label; mode: ColourMode; setMode: (mode: ColourMode) => void }) {
  const split = () => flowsSplit(props.body)
  const byRepo = () => split() && props.mode === 'repo'
  // Coloured by the view's own parts, the bars that have no parts of their own are drawn in one colour.
  const shown = () => byRepo() ? props.body : withoutRepos(props.body)
  const flow = () => endingFlow(props.body)
  const grid = () => transitionGrid(props.body)
  const sessionsAxis = (rows: readonly BarRow[]) => axisOf('sessions', fmtNum(barTop(rows)), rows)
  const tools = () => flowToolRows(shown(), props.label)
  return <>
    <ColourBy parts="How sessions ended" value={byRepo() ? 'repo' : 'parts'} onChange={props.setMode} split={split()} />
    <Show when={byRepo()}><RepoLegend split={props.body} other={hasOther(splitBars(props.body))} /></Show>
    <div class={own.grid}>
      <div class={own.wide}>
        <FlowDiagram name="endings" title="Last step of the main agent → how the session ended" leftHead="Last step" rightHead="Ended"
          left={flow().left} right={flow().right} links={flow().links} empty="No session ended in this period."
          axis="Band and node height: sessions, one linear scale. Right: sessions · share of all · list price." />
      </div>
      <Show when={byRepo() && endingRepoRows(props.body).length}>
        <BarChart data="endings-repos" title="Sessions per ending" rows={endingRepoRows(props.body)}
          axis={sessionsAxis(endingRepoRows(props.body))} />
      </Show>
      <div class={own.wide}>
        <HeatGrid name="transitions" title="Next step after each step" corner="step ↓ · next →" columns={grid().columns} rows={grid().rows}
          blank={(row, column) => `After ${row.name}: ${column.name} is not among its 4 most frequent next steps.`}
          empty="No step kind with 30 or more calls."
          axis="Cell: share of the row's calls whose next call of the same agent is the column, and the count. Shade grows with the share." />
      </div>
      <BarChart data="cycles" title="Two-step cycles, by working time" rows={cycleRows(shown())}
        axis={cycleAxis(shown()) + (byRepo() && cycleRows(shown()).some(row => row.parts.some(part => part.repo != null)) ? ' A segment per repository.' : '')}
        empty="No cycle seen in 3 or more sessions." />
      <BarChart data="tools" title="Tool calls per tool" rows={tools()} axis={axisOf('tool calls', fmtNum(barTop(tools())), tools())}
        empty="No tool call in this period." />
      <BarChart data="first-paths" title="First steps of sessions" rows={pathRows(shown(), 'first')}
        axis={sessionsAxis(pathRows(shown(), 'first'))} empty="No start shared by 3 or more sessions." />
      <BarChart data="last-paths" title="Last steps of sessions" rows={pathRows(shown(), 'last')}
        axis={sessionsAxis(pathRows(shown(), 'last'))} empty="No end shared by 3 or more sessions." />
      <Show when={byRepo() && projectRepoRows(props.body).length} fallback={
        <BarChart data="projects" title="Sessions per project, by how they ended" rows={projectRows(props.body)} legend={endingLegend}
          axis={sessionsAxis(projectRows(props.body))} empty="No project with 5 or more sessions." />}>
        <BarChart data="projects-repos" title="Sessions per project" rows={projectRepoRows(props.body)}
          axis={sessionsAxis(projectRepoRows(props.body))} />
      </Show>
    </div>
    <Show when={fewSessions(props.body)}>{text => <p class={styles.note} data-few-sessions>{text()}</p>}</Show>
    <Show when={tooSmall(props.body, props.label)}>{text => <p class={styles.note} data-small>{text()}</p>}</Show>
  </>
}

type Row = Record<string, unknown>

export default function Flows(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [mode, setMode] = useColourBy()
  return <InsightCard<FlowsBody> {...props} card="flows" tab="flow"
    finding={flowsFinding}
    visual={body => <Visual body={body} label={label} mode={mode()} setMode={setMode} />}
    note={'Each tool call is one step, by the first rule that holds: ask the person (AskUserQuestion, ask_user); report done ' +
      '(task_complete); subagent (a call that starts or talks to one); MCP tool (an MCP server\'s tool); skill; test run (the ' +
      'stored test-run flag: the command\'s first program is a test runner); commit (a successful git commit, the rule of ' +
      'Verified before commit); edit (an edit tool, or create and create_file); command; search; read; web fetch; other. A ' +
      'path joins repeats of one step into one and follows the main agent: its first 4 and last 3 steps. A transition is a ' +
      'call and the next call of the same session and agent; the server lists the 4 most frequent next steps of each step. A ' +
      'session committed when any agent of it committed, changed when any agent edited a file, else it changed no file; it ' +
      'ends on its main agent\'s last step. A cycle is two steps taking turns 3 rounds or more (A B A B A B); its working time ' +
      'runs from each call to the next of the same agent, with any pause over 5 minutes counted as 5 minutes. Cost is the list ' +
      'price of the session\'s requests in the period, not a bill. Too small to compare: a project with fewer than 5 sessions, ' +
      'a path or cycle of fewer than 3 sessions, the steps after a kind with fewer than 30 calls; a period with fewer than 10 ' +
      'sessions is named under the charts. A project is the last folder of the session\'s working folder. The flow lists the ' +
      'server\'s most frequent last steps of each ending (up to 6); the rest of the ending\'s sessions flow from "other last steps". ' +
      'In the grid of next steps, "other" sums the next steps outside the 4 listed per step; what follows a failed call is in ' +
      'the view After a failure. The flow and the grid are not split by repository; the hover of a band or an ending names ' +
      'its sessions per repository.'}
    table={{
      label: 'Flows: what follows each step',
      rows: body => body.transitions.flatMap(row => row.next.map((next): Row => ({
        id: `${row.from_step}:${next.to_step}`, from: step(row.from_step), to: step(next.to_step), calls: next.calls,
        share: next.share, of: row.calls,
      }))),
      fields: [textField('from', 'Step'), textField('to', 'Next step'), numberField('calls', 'Calls', fmtNum),
        numberField('of', 'Calls of the step', fmtNum), numberField('share', 'Share', value => share(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      textField('project_name', 'Project', row => row.project_name ? projectName(row.project_name) : ''),
      textField('outcome', 'Ended', row => OUTCOME_LABELS[row.outcome as FlowOutcome] ?? ''),
      textField('last_step', 'Last step', row => row.last_step ? step(row.last_step as Step) : ''),
      textField('pair', 'Cycle', row => Array.isArray(row.pair) && row.pair.length ? cycleName(row.pair as Step[]) : ''),
      numberField('cycle_seconds', 'Working time in cycles', value => workTime(value)),
      numberField('cost_usd', 'Cost (list price)', value => money(value))]} />
}
