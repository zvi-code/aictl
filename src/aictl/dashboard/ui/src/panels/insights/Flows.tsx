import { For, Show, untrack } from 'solid-js'
import { fmtNum, fmtShare, projectName } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  cycleName, flowsFinding, flowsHero, OUTCOME_LABELS, STEP_LABELS, stepPath, tooSmall, workTime,
  type FlowOutcome, type FlowsBody, type Step,
} from './flowsModel'
import { money, plural, share, toolLabel, type Label } from './insightsModel'
import styles from './Insights.module.css'

const OUTCOMES: FlowOutcome[] = ['committed', 'changed', 'no_change']
const OUTCOME_CLASS: Record<FlowOutcome, string> = { committed: 'o1', changed: 'o3', no_change: 'o0' }
const SHOWN_FROM = 6
const step = (value: Step) => STEP_LABELS[value] ?? value

/** Sessions by how they ended: committed, changed files only, changed nothing; then the steps those that changed nothing stopped on. */
function Endings(props: { body: FlowsBody }) {
  const total = () => {
    const endings = props.body.endings
    return OUTCOMES.reduce((sum, outcome) => sum + endings[outcome].sessions, 0)
  }
  return <section class={styles.flow} data-endings>
    <h3 class={styles.subhead}>How sessions ended</h3>
    <div class={styles.split} role="img" aria-label={OUTCOMES.map(outcome =>
      `${OUTCOME_LABELS[outcome]}: ${plural(props.body.endings[outcome].sessions, 'session')}`).join(', ')}>
      <For each={OUTCOMES}>{outcome => <span class={styles[OUTCOME_CLASS[outcome]]}
        style={{ 'inline-size': `${total() ? props.body.endings[outcome].sessions / total() * 100 : 0}%` }}
        title={`${OUTCOME_LABELS[outcome]}: ${plural(props.body.endings[outcome].sessions, 'session')}, ` +
          `${money(props.body.endings[outcome].cost_usd)} at list price`} />}</For>
    </div>
    <ul class={styles.legend}>
      <For each={OUTCOMES}>{outcome => <li><span class={`${styles.swatch} ${styles[OUTCOME_CLASS[outcome]]}`} />
        {OUTCOME_LABELS[outcome]} · {fmtNum(props.body.endings[outcome].sessions)} · {money(props.body.endings[outcome].cost_usd)}</li>}</For>
    </ul>
    <Show when={props.body.endings.no_change.last_steps.length}>
      <p class={styles.note}>Sessions that changed nothing stopped on: {props.body.endings.no_change.last_steps.slice(0, 5)
        .map(item => `${step(item.step)} ${fmtNum(item.sessions)} (${money(item.cost_usd)})`).join(' · ')}</p>
    </Show>
  </section>
}

/** After each kind of step, the 4 most frequent next steps of the same agent, as bars of their share. */
function Transitions(props: { body: FlowsBody }) {
  return <section class={styles.flow} data-transitions>
    <h3 class={styles.subhead}>What follows each step</h3>
    <ul class={styles.bars}>
      <For each={props.body.transitions.slice(0, SHOWN_FROM)}>{row => <li class={styles.barRow}>
        <span class={styles.barName}>Next after {step(row.from_step)}<small>{plural(row.calls, 'call')}</small></span>
        <span class={styles.barTrack}>
          <For each={row.next}>{next => <span class={styles.bar}
            title={`${step(row.from_step)} → ${step(next.to_step)}: ${plural(next.calls, 'call')}, ${fmtShare(next.share)}`}>
            <span class={`${styles.fill} ${styles.carried}`} style={{ 'inline-size': `${Math.max(2, next.share * 100)}%` }} />
            {step(next.to_step)} {fmtShare(next.share)}
          </span>}</For>
        </span>
      </li>}</For>
    </ul>
    <p class={styles.note}>What follows a failed call is in the card After a failure.</p>
  </section>
}

function Lists(props: { body: FlowsBody }) {
  return <div class={styles.lists}>
    <section>
      <h3 class={styles.subhead}>Cycles that repeat</h3>
      <Show when={props.body.cycles.length} fallback={<p class={styles.note}>No cycle seen in 3 or more sessions.</p>}>
        <ol class={styles.rankList} data-cycles>
          <For each={props.body.cycles.slice(0, 5)}>{cycle => <li>
            <span>{cycleName(cycle.pair)}</span>
            <span>{plural(cycle.rounds, 'round')} · {plural(cycle.sessions, 'session')} · {workTime(cycle.seconds)} ({share(cycle.time_share)})</span>
          </li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>How sessions start</h3>
      <Show when={props.body.first_paths.length} fallback={<p class={styles.note}>No start shared by 3 or more sessions.</p>}>
        <ol class={styles.rankList} data-first-paths>
          <For each={props.body.first_paths.slice(0, 5)}>{path => <li>
            <span>{stepPath(path.steps)}</span><span>{plural(path.sessions, 'session')}</span></li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>How sessions end</h3>
      <Show when={props.body.last_paths.length} fallback={<p class={styles.note}>No end shared by 3 or more sessions.</p>}>
        <ol class={styles.rankList} data-last-paths>
          <For each={props.body.last_paths.slice(0, 5)}>{path => <li>
            <span>{stepPath(path.steps)}</span><span>{plural(path.sessions, 'session')}</span></li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>By project</h3>
      <Show when={props.body.projects.length} fallback={<p class={styles.note}>No project with 5 or more sessions.</p>}>
        <ol class={styles.rankList} data-projects>
          <For each={props.body.projects.slice(0, 8)}>{row => <li>
            <span>{projectName(row.project)}</span>
            <span>{plural(row.sessions, 'session')} · {fmtNum(row.no_change)} changed nothing ({share(row.no_change_share)},
              {' '}{money(row.no_change_cost)}) · cycles {workTime(row.cycle_seconds)}</span>
          </li>}</For>
        </ol>
      </Show>
    </section>
  </div>
}

type Row = Record<string, unknown>

export default function Flows(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<FlowsBody> {...props} card="flows" title="Flows" tab="flow"
    hero={flowsHero}
    finding={flowsFinding}
    visual={body => <>
      <Endings body={body} />
      <Transitions body={body} />
      <Lists body={body} />
      <Show when={tooSmall(body, label)}>{text => <p class={styles.note} data-small>{text()}</p>}</Show>
    </>}
    note={'Each tool call is one step, by the first rule that holds: ask the person (AskUserQuestion, ask_user); report done ' +
      '(task_complete); subagent (a call that starts or talks to one); MCP tool (an MCP server\'s tool); skill; test run (the ' +
      'stored test-run flag: the command\'s first program is a test runner); commit (a successful git commit, the rule of ' +
      'Verified before commit); edit (an edit tool, or create and create_file); command; search; read; web fetch; other. A ' +
      'path joins repeats of one step into one and follows the main agent: its first 4 and last 3 steps. A transition is a ' +
      'call and the next call of the same session and agent. A session committed when any agent of it committed, changed ' +
      'when any agent edited a file, else it changed nothing; it ends on its main agent\'s last step. A cycle is two steps ' +
      'taking turns 3 rounds or more (A B A B A B); its working time runs from each call to the next of the same agent, ' +
      'with any pause over 5 minutes counted as 5 minutes. Cost is the list price of the session\'s requests in the period, ' +
      'not a bill. Too small to compare: a project with fewer than 5 sessions, a path or cycle of fewer than 3 sessions, ' +
      'the steps after a kind with fewer than 30 calls; a period with fewer than 10 sessions states no finding. A project ' +
      'is the last folder of the session\'s working folder.'}
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
