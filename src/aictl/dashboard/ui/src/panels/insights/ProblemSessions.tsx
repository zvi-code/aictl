import { For, Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  money, NOT_REPORTED, plural, problemFinding, problemHero, share, SIGNAL_LABELS, SIGNALS, toolLabel,
  type Label, type ProblemBody, type SignalCell,
} from './insightsModel'
import styles from './Insights.module.css'

/** The tint of a cell: the share of the tool's sessions it flags, as a mix of the danger colour into the surface. */
const tint = (cell: SignalCell) => `color-mix(in srgb, var(--color-danger) ${Math.round(Math.min(1, cell.share ?? 0) * 50)}%, var(--color-surface))`

/** Signals down, tools across: the sessions each signal flags, tinted by their share; a signal a tool cannot show is drawn as such. */
function SignalGrid(props: { body: ProblemBody; label: Label }) {
  const tools = () => props.body.tools.filter(tool => tool.reports)
  return <>
    <div class={styles.gridScroll}>
      <table class={styles.signalGrid} aria-label="Sessions flagged per signal and tool">
        <thead><tr><th scope="col">Signal</th>
          <For each={tools()}>{tool => <th scope="col">{props.label(tool.tool)}<small>{plural(tool.sessions, 'session')}</small></th>}</For>
        </tr></thead>
        <tbody>
          <For each={SIGNALS}>{(signal, i) => <tr data-signal={signal}>
            <th scope="row">{SIGNAL_LABELS[signal]}</th>
            <For each={tools()}>{tool => {
              const cell = () => tool.signals[i()]
              return <Show when={cell().reported} fallback={<td class={styles.unreportedCell} data-cell="not-reported"
                title={`${props.label(tool.tool)} does not record ${SIGNAL_LABELS[signal].toLowerCase()}`}>{NOT_REPORTED}</td>}>
                <td data-cell={cell().sessions} style={{ background: tint(cell()) }}
                  title={`${props.label(tool.tool)}: ${plural(cell().sessions ?? 0, 'session')}, ${share(cell().share)} of its sessions, ` +
                    `${money(cell().cost_usd)} at list price`}>
                  <strong>{fmtNum(cell().sessions)}</strong><small>{share(cell().share)}</small>
                </td>
              </Show>
            }}</For>
          </tr>}</For>
        </tbody>
      </table>
    </div>
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
      <section>
        <h3 class={styles.subhead}>Projects with the most flagged sessions</h3>
        <Show when={props.body.projects.length} fallback={<p class={styles.note}>No flagged session has a project.</p>}>
          <ol class={styles.rankList} data-projects>
            <For each={props.body.projects}>{row => <li>
              <span>{projectName(row.project)} <small>{row.tools.map(props.label).join(', ')}</small></span>
              <span>{fmtNum(row.sessions)} of {plural(row.all_sessions, 'session')} · {money(row.cost_usd)}</span>
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
      'not a bill. A project is the last folder of the session\'s project path.'}
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
