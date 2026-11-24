import { Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { HeatGrid } from './charts/HeatGrid'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  money, plural, problemCountHover, problemCountRepos, problemCounts, problemHero, share, SIGNAL_LABELS, toolLabel,
  type Label, type ProblemBody,
} from './insightsModel'
import { pairBlank, pairGrid, problemLine, projectColumns, projectGrid, signalToolGrid } from './problemsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther, repoParts } from './repoSplit'
import styles from './Insights.module.css'
import own from './ProblemSessions.module.css'

const COUNT_NAMES = { multi: 'two or more signals', one: 'one signal', none: 'no signal' } as const

/** Per tool, its sessions with two or more, one and no signal, each a row split by repository. */
function countRepoRows(body: ProblemBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.reports && tool.repos?.length).flatMap(tool => {
    const split = problemCountRepos(tool), n = problemCounts(tool)
    return (['multi', 'one', 'none'] as const).map(part => ({
      key: `${tool.tool}:${part}`, label: `${label(tool.tool)}: ${COUNT_NAMES[part]}`, total: plural(n[part], 'session'),
      parts: repoParts(split[part], 'sessions', body.repo_order, fmtNum, `${label(tool.tool)}, sessions with ${COUNT_NAMES[part]}`, 'sessions',
        problemCountHover(tool, part, label)),
    })).filter(row => row.parts.length)
  })
}

/** Per tool, its sessions by how many signals they recorded: one 100% bar each. */
function countRows(body: ProblemBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.reports).map(tool => {
    const n = problemCounts(tool)
    return {
      key: tool.tool, label: label(tool.tool), total: plural(tool.sessions, 'session'),
      parts: [
        { key: 'multi', label: 'two or more signals', value: n.multi, tone: 1, text: fmtNum(n.multi), hover: problemCountHover(tool, 'multi', label) },
        { key: 'one', label: 'one signal', value: n.one, tone: 5, text: fmtNum(n.one), hover: problemCountHover(tool, 'one', label) },
        { key: 'none', label: 'no signal', value: n.none, tone: 7, text: fmtNum(n.none), hover: problemCountHover(tool, 'none', label) },
      ],
    }
  })
}

/** Whether any mark of the answer is split by repository: the view then offers the colour switch. */
const problemSplit = (body: ProblemBody) => body.tools.some(tool => tool.reports && tool.repos?.length)

function Visual(props: { body: ProblemBody; label: Label; mode: ColourMode; setMode: (mode: ColourMode) => void }) {
  const byRepo = () => problemSplit(props.body) && props.mode === 'repo'
  const tools = () => signalToolGrid(props.body, props.label)
  const pairs = () => pairGrid(props.body)
  const projects = () => projectGrid(props.body)
  const few = () => projectColumns(props.body).few
  return <>
    <ColourBy parts="Number of signals" value={byRepo() ? 'repo' : 'parts'} onChange={props.setMode} split={problemSplit(props.body)} />
    <Show when={byRepo()}>
      <RepoLegend split={props.body} other={hasOther([...props.body.tools, ...props.body.tools.flatMap(tool => tool.signals), ...props.body.pairs])} />
    </Show>
    <div class={own.grid}>
      <Show when={byRepo()} fallback={<Bars name="problem-counts" title="Sessions by number of signals, per tool" scale="whole"
        legend={[{ label: 'Two or more signals', tone: 1 }, { label: 'One signal', tone: 5 }, { label: 'No signal', tone: 7 }]}
        axis="Bar: the tool's sessions in the period, 100%." rows={countRows(props.body, props.label)} />}>
        <Bars name="problem-counts-repos" title="Sessions by number of signals, per tool"
          axis="Length: sessions, one linear scale from 0; a segment per repository." rows={countRepoRows(props.body, props.label)} />
      </Show>
      <HeatGrid name="problem-tools" title="Sessions per signal and tool" corner="signal ↓ · tool →" columns={tools().columns}
        rows={tools().rows} blank={() => 'No figure.'} empty="No tool that records a signal has a session in this period."
        axis="Cell: sessions that recorded the signal, and their share of the tool's sessions (the shade). Hatched: not recorded by the tool." />
      <HeatGrid name="problem-pairs" title="Sessions with both signals" corner="signal ↓ · signal →" columns={pairs().columns}
        rows={pairs().rows} blank={pairBlank} empty="No session recorded two signals in this period."
        axis="Cell: sessions that recorded both signals, and their list price. Shade: against the largest pair." />
      <HeatGrid name="problem-projects" title="Sessions per signal and project" corner="signal ↓ · project →" columns={projects().columns}
        rows={projects().rows} blank={() => 'No figure.'} empty="No project in this period."
        axis="Columns: the projects whose flagged sessions cost the most, the rest summed. Cell: sessions; shade: share of the project's sessions." />
    </div>
    <Show when={few().length}>
      <p class={styles.note} data-few-projects>Summed into other projects, too few sessions to compare: {few().map(row =>
        `${projectName(row.project)} (${plural(row.all_sessions, 'session')})`).join(', ')}.</p>
    </Show>
    <Show when={props.body.summary.not_reporting.length}>
      <p class={styles.note} data-not-reporting>No signal is recorded by {props.body.summary.not_reporting.map(props.label).join(', ')}; left out.</p>
    </Show>
  </>
}

type Row = Record<string, unknown>

export default function ProblemSessions(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [mode, setMode] = useColourBy()
  return <InsightCard<ProblemBody> {...props} card="problems" tab="errors"
    hero={problemHero}
    finding={problemLine}
    visual={body => <Visual body={body} label={label} mode={mode()} setMode={setMode} />}
    note={'A signal is an event the session recorded; the card counts the sessions with each. Repeated compaction: 3 or more compactions in the session. ' +
      'Failure streak: 3 or more failed tool calls in a row by one agent (as in After a failure). Failed delegation: a failed ' +
      'call that starts a subagent or task (Agent, Task, task, runSubagent) or collects one (read_agent, TaskOutput, ' +
      'SubagentHandback); task_complete and todo calls are not delegation. Ended on an API error: a turn that ended on an ' +
      'API error. Open todos: a todo list with items left open. Hook failure: a hook that failed. A tool whose records ' +
      'cannot show a signal is not reported for it and left out of its share: only Claude Code records turns (API errors); ' +
      'Copilot VS Code records no compactions or hooks; Claude Code\'s recent sessions keep no todo count. The sessions of a ' +
      'tool are those with a request or a tool call in the period; cost is the list price of their requests in the period, ' +
      'not a bill. A project is the last folder of the session\'s project path. The grid shows the five projects whose ' +
      'flagged sessions cost the most, each cell shaded by the share of the project\'s sessions it flags; every other flagged ' +
      'session, and those with no project, is summed in one column. The grid of pairs shades each cell against the pair with the ' +
      'most sessions. The hover of a cell names its sessions per repository where the answer splits them. The data table below has ' +
      'the figures by tool.'}
    table={{
      label: 'Problem signals by tool',
      rows: body => body.tools.filter(tool => tool.reports).flatMap(tool => tool.signals.map((cell): Row => ({
        id: `${tool.tool}:${cell.signal}`, tool: label(tool.tool), signal: SIGNAL_LABELS[cell.signal], sessions: cell.sessions ?? undefined,
        share: cell.share ?? undefined, cost: cell.cost_usd ?? undefined, of: tool.sessions,
      }))),
      fields: [textField('tool', 'Tool'), textField('signal', 'Signal'), numberField('sessions', 'Sessions flagged', fmtNum),
        numberField('of', 'Sessions of the tool', fmtNum), numberField('share', 'Share of the tool\'s sessions', value => share(value)),
        numberField('cost', 'Cost of the flagged sessions (list price)', value => money(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('signals', 'Signals', fmtNum),
      textField('names', 'Which', row => (Array.isArray(row.names) ? row.names as (keyof typeof SIGNAL_LABELS)[] : [])
        .map(name => SIGNAL_LABELS[name]).join(', ')),
      textField('project_name', 'Project', row => row.project_name ? projectName(row.project_name) : ''),
      numberField('cost_usd', 'Cost (list price)', value => money(value))]} />
}
