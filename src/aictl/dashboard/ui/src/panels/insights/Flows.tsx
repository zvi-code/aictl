import { For, Show, untrack } from 'solid-js'
import { fmtNum, fmtShare, projectName } from '../../design/format'
import { BarChart } from './FlowsBars'
import { axisText, barTop, type BarRow } from './flowBarModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  columnName, cycleAxis, cycleName, cycleRows, endingLegend, endingRepoRows, endingRows, flowsFinding, flowsHero, flowToolRows,
  lastStepRows, OUTCOME_LABELS, OUTCOMES, pathRows, projectRepoRows, projectRows, step, tooSmall, transitionMatrix, workTime,
  type FlowOutcome, type FlowsBody, type Step,
} from './flowsModel'
import { money, plural, share, toolLabel, type Label } from './insightsModel'
import styles from './Insights.module.css'
import bars from './FlowsBars.module.css'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'

const LEFT = 120, CELL = 58, ROW = 32, HEAD = 64

/** What follows each kind of step: one row per step kind, one column per next step kind, share and count in each cell. */
function Matrix(props: { body: FlowsBody }) {
  const matrix = () => transitionMatrix(props.body)
  const width = () => LEFT + matrix().columns.length * CELL
  const height = () => HEAD + matrix().rows.length * ROW
  return <figure class={bars.figure} data-transitions>
    <figcaption class={bars.title}>Next step after each kind of step (share of the step's calls, and count)</figcaption>
    <Show when={matrix().rows.length} fallback={<p class={bars.empty}>No step kind with 30 or more calls.</p>}>
      <div class={bars.matrixScroll}>
        <svg class={bars.matrix} width={width()} height={height()} viewBox={`0 0 ${width()} ${height()}`} role="img"
          aria-label="Transition matrix: rows are the step, columns the next step of the same agent">
          <text class={bars.dim} x={0} y={HEAD - 8}>step ↓ · next step →</text>
          <For each={matrix().columns}>{(column, i) => <text x={LEFT + i() * CELL + CELL / 2} y={HEAD - 8}
            transform={`rotate(-35 ${LEFT + i() * CELL + CELL / 2} ${HEAD - 8})`}>{columnName(column)}</text>}</For>
          <For each={matrix().rows}>{(row, r) => <g data-from={row.from}>
            <text x={0} y={HEAD + r() * ROW + 13}>{step(row.from)}</text>
            <text class={bars.dim} x={0} y={HEAD + r() * ROW + 26}>{plural(row.calls, 'call')}</text>
            <For each={row.cells}>{(cell, c) => <Show when={cell} fallback={<rect class={bars.blank} x={LEFT + c() * CELL + 1}
              y={HEAD + r() * ROW + 1} width={CELL - 2} height={ROW - 2}><title>{`After ${step(row.from)}: ${columnName(matrix().columns[c()])} ` +
                'is not among its 4 most frequent next steps'}</title></rect>}>{value => <g data-cell={`${row.from}:${value().to}`}>
              <rect class={bars.cell} x={LEFT + c() * CELL + 1} y={HEAD + r() * ROW + 1} width={CELL - 2} height={ROW - 2}
                fill-opacity={0.12 + 0.5 * value().share}><title>{value().hover}</title></rect>
              <text x={LEFT + c() * CELL + CELL / 2} y={HEAD + r() * ROW + 14} text-anchor="middle">{fmtShare(value().share)}</text>
              <text class={bars.dim} x={LEFT + c() * CELL + CELL / 2} y={HEAD + r() * ROW + 26} text-anchor="middle">{fmtNum(value().calls)}</text>
            </g>}</Show>}</For>
          </g>}</For>
        </svg>
      </div>
      <p class={bars.axis}>Cell shade grows with the share. Blank: not among the step's 4 most frequent next steps; "other" sums the rest.
        {' '}What follows a failed call is in the card After a failure. Not split by repository.</p>
    </Show>
  </figure>
}

/** Every bar of the card the server split by repository, for the legend's "Other repositories". */
function splitBars(body: FlowsBody) {
  const endings = OUTCOMES.map(outcome => body.endings[outcome])
  return [...endings, ...endings.flatMap(ending => ending.last_steps), ...body.first_paths, ...body.last_paths, ...body.cycles,
    ...body.projects, ...body.tools]
}
/** The axis line of a chart, saying so when its bars are split by repository. */
const splitAxis = (text: string, rows: readonly BarRow[]) =>
  rows.some(row => row.parts.some(part => part.repo != null)) ? `${text} A segment per repository.` : text

function Visual(props: { body: FlowsBody; label: Label }) {
  const ended = () => OUTCOMES.filter(outcome => props.body.endings[outcome].last_steps.length)
  const stepAxis = (outcome: FlowOutcome) => splitAxis(axisText('sessions', fmtNum(barTop(lastStepRows(props.body, outcome)))),
    lastStepRows(props.body, outcome))
  const pathAxis = (which: 'first' | 'last') => splitAxis(axisText('sessions', fmtNum(barTop(pathRows(props.body, which)))),
    pathRows(props.body, which))
  return <>
    <RepoLegend split={props.body} other={hasOther(splitBars(props.body))} />
    <BarChart data="endings" title="How sessions ended (sessions)" rows={endingRows(props.body)} legend={endingLegend}
      axis="One bar of all sessions, split by how they ended." empty="No session ended in this period." />
    <Show when={endingRepoRows(props.body).length}>
      <BarChart data="endings-repos" title="Sessions per ending, by repository (sessions)" rows={endingRepoRows(props.body)}
        axis={splitAxis(axisText('sessions', fmtNum(barTop(endingRepoRows(props.body)))), endingRepoRows(props.body))} />
    </Show>
    <div class={styles.lists}>
      <For each={ended()}>{outcome => <BarChart data={`last-${outcome}`} title={`Last step: ${OUTCOME_LABELS[outcome].toLowerCase()}`}
        rows={lastStepRows(props.body, outcome)} axis={stepAxis(outcome)} />}</For>
    </div>
    <Matrix body={props.body} />
    <BarChart data="cycles" title="Cycles of two alternating steps, by working time" rows={cycleRows(props.body)}
      axis={splitAxis(cycleAxis(props.body), cycleRows(props.body))} empty="No cycle seen in 3 or more sessions." />
    <div class={styles.lists}>
      <BarChart data="first-paths" title="First steps of sessions (sessions)" rows={pathRows(props.body, 'first')}
        axis={pathAxis('first')} empty="No start shared by 3 or more sessions." />
      <BarChart data="last-paths" title="Last steps of sessions (sessions)" rows={pathRows(props.body, 'last')}
        axis={pathAxis('last')} empty="No end shared by 3 or more sessions." />
    </div>
    <BarChart data="projects" title="Sessions per project, by how they ended (committed · changed · changed no file)"
      rows={projectRows(props.body)} legend={endingLegend} axis={axisText('sessions', fmtNum(barTop(projectRows(props.body))))}
      empty="No project with 5 or more sessions." />
    <Show when={projectRepoRows(props.body).length}>
      <BarChart data="projects-repos" title="Sessions per project, by repository (sessions)" rows={projectRepoRows(props.body)}
        axis={splitAxis(axisText('sessions', fmtNum(barTop(projectRepoRows(props.body)))), projectRepoRows(props.body))} />
    </Show>
    <BarChart data="tools" title="Tool calls per tool" rows={flowToolRows(props.body, props.label)}
      axis={splitAxis(axisText('tool calls', fmtNum(barTop(flowToolRows(props.body, props.label)))), flowToolRows(props.body, props.label))} empty="No tool call in this period." />
    <Show when={tooSmall(props.body, props.label)}>{text => <p class={styles.note} data-small>{text()}</p>}</Show>
  </>
}

type Row = Record<string, unknown>

export default function Flows(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<FlowsBody> {...props} card="flows" tab="flow"
    hero={flowsHero}
    finding={flowsFinding}
    visual={body => <Visual body={body} label={label} />}
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
      'sessions states no figures in its sentence. A project is the last folder of the session\'s working folder.'}
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
