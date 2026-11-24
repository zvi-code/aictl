import { For, Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { EVIDENCE } from './evidence'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  money, plural, problemFinding, problemHero, share, SIGNAL_LABELS, SIGNALS, toolLabel,
  type Label, type ProblemBody, type Signal,
} from './insightsModel'
import styles from './Insights.module.css'

/** The tint of a cell: the share of the project's sessions it flags, as a mix of the danger colour into the surface. */
const tint = (share: number) => `color-mix(in srgb, var(--color-danger) ${Math.round(Math.min(1, share) * 50)}%, var(--color-surface))`

/** A column of the grid: one project, or every other flagged session summed (no share, so no tint). */
type Column = { id: string; name: string; title: string; sessions: number; all: number | null; cost: number | null; cells: Partial<Record<Signal, number>> }

/** The projects the grid draws: those with the card's minimum of sessions; smaller ones are summed into the rest. */
function columns(body: ProblemBody): { shown: Column[]; few: ProblemBody['projects'] } {
  const least = EVIDENCE.problems.minimum
  const shown = body.projects.filter(row => row.all_sessions >= least && row.signals)
  const few = body.projects.filter(row => !shown.includes(row))
  const other = body.other_projects
  const rest: Column | null = other ? {
    id: 'other', name: 'Other projects', title: 'Every other flagged session, and sessions with no project, summed',
    sessions: other.sessions + few.reduce((sum, row) => sum + row.sessions, 0),
    all: null, cost: other.cost_usd == null ? null : other.cost_usd + few.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0),
    cells: Object.fromEntries(SIGNALS.map(signal => [signal, (other.signals[signal] ?? 0) +
      few.reduce((sum, row) => sum + (row.signals?.[signal] ?? 0), 0)])),
  } : null
  return {
    shown: [...shown.map((row): Column => ({ id: row.project, name: projectName(row.project), title: row.project, sessions: row.sessions,
      all: row.all_sessions, cost: row.cost_usd, cells: row.signals ?? {} })), ...(rest && rest.sessions > 0 ? [rest] : [])],
    few,
  }
}

/** Signals down, the projects whose flagged sessions cost the most across: the sessions each signal flags in each. */
function SignalGrid(props: { body: ProblemBody; label: Label }) {
  const split = () => columns(props.body)
  const tools = () => props.body.tools.filter(tool => tool.reports)
  return <>
    <div class={styles.gridScroll}>
      {/* A chart laid out as a grid, not a data table: the data table below the card holds the figures by tool. */}
      <div class={styles.signalGrid} role="table" aria-label="Sessions flagged per signal and project"
        style={{ 'grid-template-columns': `minmax(8rem, auto) repeat(${split().shown.length}, minmax(5.5rem, 1fr))` }}>
        <div role="row" class={styles.gridRow} data-head>
          <span role="columnheader" class={styles.gridHead}>Signal</span>
          <For each={split().shown}>{column => <span role="columnheader" class={styles.gridHead} title={column.title} data-column={column.id}>
            {column.name}<small>{column.all == null ? `${plural(column.sessions, 'session')} flagged`
              : `${fmtNum(column.sessions)} of ${plural(column.all, 'session')}`} · {money(column.cost)}</small></span>}</For>
        </div>
        <For each={SIGNALS}>{signal => <div role="row" class={styles.gridRow} data-signal={signal}>
          <span role="rowheader" class={styles.gridHead}>{SIGNAL_LABELS[signal]}</span>
          <For each={split().shown}>{column => {
            const sessions = () => column.cells[signal] ?? 0
            const part = () => column.all ? sessions() / column.all : null
            return <span role="cell" class={styles.gridCell} data-cell={sessions()}
              style={part() == null ? undefined : { background: tint(part()!) }}
              title={`${column.name}: ${plural(sessions(), 'session')}` + (part() == null ? '' : `, ${share(part())} of its sessions`)}>
              <strong>{fmtNum(sessions())}</strong><small>{part() == null ? '' : share(part())}</small>
            </span>
          }}</For>
        </div>}</For>
      </div>
    </div>
    <Show when={split().few.length}>
      <p class={styles.note} data-few-projects>Summed into other projects, too few sessions to compare: {split().few.map(row =>
        `${projectName(row.project)} (${plural(row.all_sessions, 'session')})`).join(', ')}.</p>
    </Show>
    <p class={styles.note} data-by-tool>By tool: {tools().map(tool => `${props.label(tool.tool)} ${fmtNum(tool.flagged)} of ` +
      `${plural(tool.sessions, 'session')} (${share(tool.sessions ? (tool.flagged ?? 0) / tool.sessions : null)})`).join(' · ')}.</p>
    <Show when={props.body.summary.not_reporting.length}>
      <p class={styles.note}>No signal is recorded by {props.body.summary.not_reporting.map(props.label).join(', ')}; left out.</p>
    </Show>
    <div class={styles.lists}>
      <section>
        <h3 class={styles.subhead}>Signals that come together</h3>
        <Show when={props.body.pairs.length} fallback={<p class={styles.note}>No session showed two signals in this period.</p>}>
          <ol class={styles.rankList} data-pairs>
            <For each={props.body.pairs}>{pair => <li>
              <span>{SIGNAL_LABELS[pair.signals[0]]} + {SIGNAL_LABELS[pair.signals[1]].toLowerCase()}</span>
              <span>{plural(pair.sessions, 'session')} · {money(pair.cost_usd)}</span>
            </li>}</For>
          </ol>
        </Show>
      </section>
    </div>
  </>
}

type Row = Record<string, unknown>

export default function ProblemSessions(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<ProblemBody> {...props} card="problems" title="Problem sessions" tab="errors"
    hero={problemHero}
    finding={body => problemFinding(body, label)}
    visual={body => <SignalGrid body={body} label={label} />}
    note={'A flag is a signal worth opening, not a verdict. Repeated compaction: 3 or more compactions in the session. ' +
      'Failure streak: 3 or more failed tool calls in a row by one agent (as in After a failure). Failed delegation: a failed ' +
      'call that starts a subagent or task (Agent, Task, task, runSubagent) or collects one (read_agent, TaskOutput, ' +
      'SubagentHandback); task_complete and todo calls are not delegation. Ended on an API error: a turn that ended on an ' +
      'API error. Open todos: a todo list with items left open. Hook failure: a hook that failed. A tool whose records ' +
      'cannot show a signal is not reported for it and left out of its share: only Claude Code records turns (API errors); ' +
      'Copilot VS Code records no compactions or hooks; Claude Code\'s recent sessions keep no todo count. The sessions of a ' +
      'tool are those with a request or a tool call in the period; cost is the list price of their requests in the period, ' +
      'not a bill. A project is the last folder of the session\'s project path. The grid shows the five projects whose ' +
      'flagged sessions cost the most, each cell tinted by the share of the project\'s sessions it flags; every other flagged ' +
      'session, and those with no project, is summed in one column. The data table below has the figures by tool.'}
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
