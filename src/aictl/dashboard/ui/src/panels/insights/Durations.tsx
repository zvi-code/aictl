import { For, Show, untrack } from 'solid-js'
import { fmtHours, fmtNum, fmtShare } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { Bars as SplitBars } from './Bars'
import { share, toolLabel } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import { Bars, Ranges } from './WorkCharts'
import {
  durationFinding, durationFirstChangeRange, durationHero, durationModelToolChart, durationSessionRange, durationWorkChart, markRepos,
  medianNote, MIN_TIMED_SESSIONS, modelRange, modelTimeChart, SHOWN, smallText, span, splitRows, toolRange, toolTimeChart, TOOLS_SHOWN,
  withNote, type BarChart, type DurationBody, type DurationRepo, type RangeChart,
} from './workModel'
import styles from './Insights.module.css'
import own from './Work.module.css'

const hours = (value: number | null) => value == null ? 'not reported' : fmtHours(value)

/** What one repository row opens to: every time figure the body carries for it, wall-clock length among them. */
function RepoFacts(props: { repo: DurationRepo }) {
  const facts = (repo: DurationRepo): [string, string][] => [
    ['Sessions with turn times', `${fmtNum(repo.timed)} of ${fmtNum(repo.sessions)}`],
    ['Agent working time', `${hours(repo.agent_ms)} (${share(repo.agent_share)} of all)`],
    ['Working time per session', repo.small ? `fewer than ${MIN_TIMED_SESSIONS} sessions with turn times`
      : `median ${span(repo.p50_agent_ms)}, 90th percentile ${span(repo.p90_agent_ms)}`],
    ['Longest session at work', span(repo.max_agent_ms)],
    ['Waiting for a person', `${hours(repo.wait_ms)} over ${fmtNum(repo.waits)} waits`],
    ['Model request time (summed)', `${hours(repo.model_ms)} over ${fmtNum(repo.requests)} requests`],
    ['Tool-call time (summed)', `${hours(repo.tool_ms)} over ${fmtNum(repo.calls)} calls`],
    ['Time to the first file change', repo.changed < MIN_TIMED_SESSIONS ? `${fmtNum(repo.changed)} sessions changed a file`
      : `median ${span(repo.p50_first_change_ms)}, 90th percentile ${span(repo.p90_first_change_ms)}`],
    ['Wall-clock length (open time, not work)', repo.walled < MIN_TIMED_SESSIONS ? `${fmtNum(repo.walled)} sessions started in the period`
      : `median ${span(repo.p50_wall_ms)}, 90th percentile ${span(repo.p90_wall_ms)}, longest ${span(repo.max_wall_ms)}`],
  ]
  return <div class={own.detail} data-repo-detail>
    <dl class={own.facts}><For each={facts(props.repo)}>{([label, value]) => <div><dt>{label}</dt><dd>{value}</dd></div>}</For></dl>
  </div>
}

/** A chart of summed time per tool or model: split by repository where the server split it, else as before. */
function TimeBars(props: { chart: BarChart; items: readonly { repos?: DurationBody['tools'][number]['repos'] }[]; order: DurationBody['repo_order'] }) {
  const rows = () => splitRows(props.chart, props.items, 'total_ms', props.order, fmtHours, 'summed time', medianNote(props.order))
  return <Show when={rows()} fallback={<Bars chart={props.chart} />}>{split => <SplitBars name={props.chart.id} title={props.chart.title}
    axis={`${props.chart.axis} A segment per repository.`} rows={split()} />}</Show>
}

function Visual(props: { body: DurationBody }) {
  const order = () => props.body.repo_order
  // Charts whose rows are the first repositories: each row marked with its repository's colour.
  const marked = (chart: BarChart): BarChart => ({ ...chart, rows: markRepos(chart.rows, props.body.repos.slice(0, SHOWN), order()) })
  const markedRange = (chart: RangeChart): RangeChart => ({ ...chart, rows: markRepos(chart.rows, props.body.repos.slice(0, SHOWN), order()) })
  return <>
    <RepoLegend split={props.body} other={hasOther([...props.body.repos, ...props.body.tools, ...props.body.models])} />
    <Bars chart={marked(durationWorkChart(props.body))} />
    <Ranges chart={markedRange(durationSessionRange(props.body))} />
    <Ranges chart={markedRange(durationFirstChangeRange(props.body))} />
    <Bars chart={marked(durationModelToolChart(props.body))} />
    <Show when={smallText(props.body.summary.small, `fewer than ${MIN_TIMED_SESSIONS} sessions with turn times`)}>{text =>
      <p class={styles.note} data-small-list>{text()}</p>}</Show>
    <Show when={props.body.tools.length}>
      <h3 class={styles.subhead}>Tools and programs</h3>
      <TimeBars chart={toolTimeChart(props.body)} items={props.body.tools.slice(0, TOOLS_SHOWN)} order={order()} />
      <Ranges chart={withNote(toolRange(props.body), medianNote(order()))} />
      <Show when={props.body.tools.length > TOOLS_SHOWN}>
        <p class={styles.note}>{fmtNum(props.body.tools.length - TOOLS_SHOWN)} more tools and programs not drawn.</p>
      </Show>
    </Show>
    <Show when={props.body.models.length}>
      <h3 class={styles.subhead}>Models</h3>
      <TimeBars chart={modelTimeChart(props.body)} items={props.body.models} order={order()} />
      <Ranges chart={withNote(modelRange(props.body), medianNote(order()))} />
    </Show>
    <h3 class={styles.subhead}>Each repository: every time figure</h3>
    <ol class={own.rows} aria-label="Session times per repository">
      <For each={props.body.repos.slice(0, SHOWN)}>{repo => <li><details class={own.row} data-repo={repo.name}
        data-small={repo.small ? '' : undefined}>
        <summary>
          <span class={own.name}>{repo.name}</span><span class={own.kind}>{repo.kind}</span>
          <span class={own.rowText}>worked {hours(repo.agent_ms)} · waited {hours(repo.wait_ms)} · {fmtNum(repo.sessions)} sessions</span>
        </summary>
        <RepoFacts repo={repo} />
      </details></li>}</For>
    </ol>
    <Show when={props.body.repos.length > SHOWN}>
      <p class={styles.note}>{fmtNum(props.body.repos.length - SHOWN)} more in the data table.</p>
    </Show>
  </>
}

type Row = Record<string, unknown>

const NOTE = 'Agent working time is the sum of a session\'s turns that start in the period, each from its first to its last ' +
  'line (at most 24 hours a turn); it is the time the agent was busy on a request. Waiting for a person is the gap from the end ' +
  'of a turn to the start of the session\'s next turn when a person (or no recorded origin) started it, at most 24 hours a ' +
  'gap; a gap before a turn a script or another agent started is not counted, and a person who walked away counts as waiting. ' +
  'Not measured: how long a person took to read or approve inside a turn, and time between sessions. Wall-clock length (start ' +
  'to end or last activity, for sessions that started in the period) includes the time a session sat open, so it is shown ' +
  'only in the detail. Time to the first change runs from the session start to its first file write. Model and tool times ' +
  'are summed durations of requests and calls; parallel calls overlap, so sums can exceed elapsed time. A call that starts ' +
  'a subagent and any duration over 24 hours are left out. A program is the first word of a command line; other calls go by ' +
  'their tool name; "most time in" names the repository where the tool or program had the most summed time. Too little ' +
  'data: medians of a repository need 5 sessions with turn times (time to the first change: 5 sessions that changed a file); ' +
  'a 95th percentile needs 20 timed calls or requests. Charts show the first 15 repositories by working time and the first ' +
  '10 tools and programs by summed time. The card "Where the time goes" sums the same model and tool times per tool and ' +
  'lists programs; this card splits them by repository and adds working, waiting and first-change times. The page\'s ' +
  'project, tool and model filters apply.'

export default function Durations(props: CardProps) {
  untrack(() => props.ctx)
  return <InsightCard<DurationBody> {...props} card="durations" tab="flow" filtered
    hero={durationHero}
    finding={durationFinding}
    visual={body => <Show when={body.repos.length} fallback={<p class={styles.note}>No session in this period.</p>}>
      <Visual body={body} />
    </Show>}
    note={NOTE}
    table={{
      label: 'Where session time goes by repository',
      rows: body => body.repos.map((repo): Row => ({
        id: repo.repo, name: repo.name, sessions: repo.sessions, agent_ms: repo.agent_ms ?? undefined,
        agent_share: repo.agent_share ?? undefined, wait_ms: repo.wait_ms ?? undefined, model_ms: repo.model_ms ?? undefined,
        tool_ms: repo.tool_ms ?? undefined, p50_agent_ms: repo.p50_agent_ms ?? undefined, p90_agent_ms: repo.p90_agent_ms ?? undefined,
        p50_first_change_ms: repo.p50_first_change_ms ?? undefined, p50_wall_ms: repo.p50_wall_ms ?? undefined,
        small: repo.small ? 'too few sessions' : '',
      })),
      fields: [textField('name', 'Repository or folder'), numberField('sessions', 'Sessions', fmtNum),
        numberField('agent_ms', 'Working time', fmtHours), numberField('agent_share', 'Share', fmtShare),
        numberField('wait_ms', 'Waiting for a person', fmtHours), numberField('model_ms', 'Model time', fmtHours),
        numberField('tool_ms', 'Tool-call time', fmtHours), numberField('p50_agent_ms', 'Median session at work', span),
        numberField('p90_agent_ms', '90th percentile', span), numberField('p50_first_change_ms', 'Median to first change', span),
        numberField('p50_wall_ms', 'Median wall-clock', span), textField('small', 'Evidence')],
    }}
    sessionFields={[textField('tool', 'Tool', row => toolLabel(String(row.tool ?? ''))),
      textField('repo', 'Repository', row => String(row.repo ?? '')),
      numberField('agent_ms', 'Working time', fmtHours), numberField('wait_ms', 'Waiting for a person', fmtHours),
      numberField('model_ms', 'Model time', fmtHours), numberField('tool_ms', 'Tool-call time', fmtHours),
      numberField('first_change_ms', 'To first change', span), numberField('wall_ms', 'Wall-clock', span)]} />
}
