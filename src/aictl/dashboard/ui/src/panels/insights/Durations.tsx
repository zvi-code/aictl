import { For, Show, untrack } from 'solid-js'
import { fmtHours, fmtNum, fmtShare } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { share, toolLabel } from './insightsModel'
import { durationFinding, durationHero, smallText, span, toolName, type DurationBody, type DurationRepo } from './workModel'
import styles from './Insights.module.css'
import own from './Work.module.css'

const SHOWN = 15
const hours = (value: number | null) => value == null ? 'not reported' : fmtHours(value)
const width = (value: number | null, largest: number) => `${largest && value ? (value / largest * 100).toFixed(1) : 0}%`

/** One row per repository: working time and waiting time on one scale; open for how long things take there. */
function RepoTimes(props: { body: DurationBody }) {
  const largest = () => Math.max(0, ...props.body.repos.map(repo => Math.max(repo.agent_ms ?? 0, repo.wait_ms ?? 0)))
  const facts = (repo: DurationRepo): [string, string][] => [
    ['Sessions with turn times', `${fmtNum(repo.timed)} of ${fmtNum(repo.sessions)}`],
    ['Working time per session', repo.small ? 'too few sessions' : `median ${span(repo.p50_agent_ms)}, 90th percentile ${span(repo.p90_agent_ms)}`],
    ['Longest session at work', span(repo.max_agent_ms)],
    ['Waiting for a person', `${hours(repo.wait_ms)} over ${fmtNum(repo.waits)} waits`],
    ['Model request time (summed)', hours(repo.model_ms)],
    ['Tool-call time (summed)', hours(repo.tool_ms)],
    ['Time to the first file change', repo.changed < 5 ? `${fmtNum(repo.changed)} sessions changed a file`
      : `median ${span(repo.p50_first_change_ms)}, 90th percentile ${span(repo.p90_first_change_ms)}`],
    ['Wall-clock length (open time, not work)', repo.walled < 5 ? `${fmtNum(repo.walled)} sessions started in the period`
      : `median ${span(repo.p50_wall_ms)}, 90th percentile ${span(repo.p90_wall_ms)}, longest ${span(repo.max_wall_ms)}`],
  ]
  return <>
    <ul class={styles.legend}>
      <li><span class={`${styles.swatch} ${own.spend}`} />Agent working time</li>
      <li><span class={`${styles.swatch} ${own.alt}`} />Waiting for a person between turns</li>
    </ul>
    <ol class={own.rows} aria-label="Working and waiting time per repository">
      <For each={props.body.repos.slice(0, SHOWN)}>{repo => <li><details class={own.row} data-repo={repo.name}
        data-small={repo.small ? '' : undefined}>
        <summary>
          <span class={own.name}>{repo.name}<span class={own.kind}>{repo.kind}</span>
            <small>{fmtNum(repo.sessions)} sessions · {share(repo.agent_share)} of working time</small></span>
          <span class={own.figures}>
            <span class={own.meter}><span class={own.track}><span class={repo.small ? own.muted : own.spend}
              style={{ 'inline-size': width(repo.agent_ms, largest()) }} /></span><span>worked {hours(repo.agent_ms)}</span></span>
            <span class={own.meter}><span class={own.track}><span class={repo.small ? own.muted : own.alt}
              style={{ 'inline-size': width(repo.wait_ms, largest()) }} /></span><span>waited {hours(repo.wait_ms)}</span></span>
            <small>{repo.small ? 'too few sessions for a median' : `median session ${span(repo.p50_agent_ms)} · 90th percentile ${span(repo.p90_agent_ms)}`}</small>
          </span>
        </summary>
        <div class={own.detail} data-repo-detail>
          <dl class={own.facts}><For each={facts(repo)}>{([label, value]) => <div><dt>{label}</dt><dd>{value}</dd></div>}</For></dl>
        </div>
      </details></li>}</For>
    </ol>
    <Show when={props.body.repos.length > SHOWN}>
      <p class={styles.note}>{fmtNum(props.body.repos.length - SHOWN)} more in the data table.</p>
    </Show>
    <Show when={props.body.summary.small.length}>
      <p class={styles.note} data-small-list>{smallText(props.body.summary.small).replace('fewer than 50 model requests',
        'fewer than 5 sessions with turn times')}</p>
    </Show>
  </>
}

/** The tools and programs with the most summed time, with their median and 95th percentile and where they ran most. */
function SlowTools(props: { body: DurationBody }) {
  const largest = () => Math.max(0, ...props.body.tools.map(tool => tool.total_ms ?? 0))
  return <ol class={styles.bars} aria-label="Tools and programs by summed time">
    <For each={props.body.tools.slice(0, 10)}>{tool => <li class={styles.barRow} data-tool-name={tool.name ?? ''}>
      <span class={styles.barName}>{toolName(tool)}<small>{fmtNum(tool.calls)} calls · {share(tool.failed_share)} failed
        {tool.repo_name ? ` · most in ${tool.repo_name}` : ''}</small></span>
      <span class={styles.bar}>
        <span class={`${styles.fill} ${tool.small ? styles.unreported : styles.sub}`}
          style={{ 'inline-size': `max(var(--space-1), ${(largest() ? (tool.total_ms ?? 0) / largest() * 60 : 0).toFixed(2)}%)` }} />
        {hours(tool.total_ms)} · median {span(tool.p50_ms)} · {tool.small ? 'too few calls for a 95th percentile' : `p95 ${span(tool.p95_ms)}`}
      </span>
    </li>}</For>
  </ol>
}

function ModelTimes(props: { body: DurationBody }) {
  return <ol class={styles.rankList} aria-label="Model requests by model">
    <For each={props.body.models}>{model => <li data-model={model.model ?? ''}>
      <span>{model.model ?? 'not reported'}: {hours(model.total_ms)} in {fmtNum(model.requests)} requests</span>
      <span>median {span(model.p50_ms)} · {model.small ? 'too few requests for a 95th percentile' : `p95 ${span(model.p95_ms)}`}</span>
    </li>}</For>
  </ol>
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
  'their tool name. Too little data: medians of a repository need 5 sessions with turn times; a 95th percentile needs 20 ' +
  'calls or requests. The card "Where the time goes" sums the same model and tool times per tool and lists programs; this ' +
  'card splits them by repository and adds working, waiting and first-change times. The page\'s project, tool and model ' +
  'filters apply.'

export default function Durations(props: CardProps) {
  untrack(() => props.ctx)
  return <InsightCard<DurationBody> {...props} card="durations" title="Where session time goes" tab="flow" filtered
    hero={durationHero}
    finding={durationFinding}
    visual={body => <Show when={body.repos.length} fallback={<p class={styles.note}>No session in this period.</p>}>
      <RepoTimes body={body} />
      <h3 class={styles.subhead}>Tools and programs by summed time</h3>
      <SlowTools body={body} />
      <h3 class={styles.subhead}>Model requests by model</h3>
      <ModelTimes body={body} />
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
