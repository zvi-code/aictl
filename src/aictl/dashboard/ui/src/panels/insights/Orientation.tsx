import { For, Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { orientationHero, count, money, orientationFinding, scaled, toolLabel, type Label, type OrientationBody } from './insightsModel'
import styles from './Insights.module.css'

/** One row per project: a bar for the median requests before the first edit, the median cost beside it. */
function ProjectBars(props: { body: OrientationBody; label: Label }) {
  const largest = () => Math.max(0, ...props.body.projects.map(row => row.p50_requests ?? 0))
  return <>
    <ol class={styles.bars} aria-label="Median requests before the first edit, per project">
      <For each={props.body.projects}>{row => <li class={styles.barRow} data-project>
        <span class={styles.barName} title={row.project_path}>{projectName(row.project_path)}
          <small>{fmtNum(row.sessions)} sessions · {row.tools.map(props.label).join(', ')}</small></span>
        <span class={styles.bar} role="img" aria-label={`${projectName(row.project_path)}: median ${count(row.p50_requests)} requests, ` +
          `${money(row.p50_cost_usd)} before the first edit`}>
          <span class={`${styles.fill} ${styles.main}`}
            style={{ 'inline-size': `max(var(--space-1), ${(scaled(row.p50_requests, largest()) * 60).toFixed(2)}%)` }} />
          {count(row.p50_requests)} requests · {money(row.p50_cost_usd)}
        </span>
      </li>}</For>
    </ol>
    <Show when={!props.body.projects.length}>
      <p class={styles.note}>No project has 3 or more sessions that edit in this period.</p>
    </Show>
    <h3 class={styles.subhead}>Sessions that never edit, apart from the medians</h3>
    <ul class={styles.smallSteps} data-never>
      <For each={props.body.tools}>{tool => <li>{props.label(tool.tool)}: {fmtNum(tool.never)} of {fmtNum(tool.sessions)} sessions,
        {' '}{money(tool.never_cost_usd)}</li>}</For>
    </ul>
  </>
}

type Row = Record<string, unknown>

export default function Orientation(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<OrientationBody> {...props} card="orientation" title="Orientation cost by repository" tab="flow"
    hero={orientationHero}
    finding={body => orientationFinding(body)}
    visual={body => <ProjectBars body={body} label={label} />}
    note={'Before the first edit: the requests of the main agent (agent id empty or equal to the session id) up to the ' +
      'session\'s first edit call, by any agent; an edit call is one the board counts as an edit. A session resumed from an ' +
      'earlier one starts oriented, so it shows few requests. A session whose first edit is by a subagent counts the main ' +
      'agent\'s requests up to that time. A session counts in the period it started in. Only projects with 3 or more ' +
      'sessions that edit are shown, the 10 with the most; sessions that never edit are counted per tool, not in the medians. ' +
      'Cost is list price, not a bill.'}
    table={{
      label: 'Orientation cost by project',
      rows: body => body.projects.map((row): Row => ({
        id: row.project_path, project: projectName(row.project_path), path: row.project_path, sessions: row.sessions,
        tools: row.tools.map(label).join(', '), p50_requests: row.p50_requests ?? undefined, p50_cost: row.p50_cost_usd ?? undefined,
      })),
      fields: [textField('project', 'Project'), textField('path', 'Path'), numberField('sessions', 'Sessions that edit', fmtNum),
        textField('tools', 'Tools'), numberField('p50_requests', 'Median requests before the first edit', fmtNum),
        numberField('p50_cost', 'Median cost before the first edit', value => money(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('requests', 'Requests before the first edit', fmtNum),
      numberField('before_cost', 'Their cost (list price)', value => money(value))]} />
}
