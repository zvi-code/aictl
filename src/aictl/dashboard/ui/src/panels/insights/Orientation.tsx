import { Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  orientationHero, count, money, orientationFinding, orientationNeverRepoMore, orientationProjectHover, orientationRepoMore,
  orientationToolHover, plural, repoPartsWith, toolLabel, type Label, type OrientationBody,
} from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther, OTHER, repoColour, repoName } from './repoSplit'
import styles from './Insights.module.css'

/**
 * A project row is itself a repository or a folder: where its root is one of the ranked repositories, it takes that
 * repository's colour, so the card agrees with the legend; otherwise it keeps its own colour.
 */
function projectRows(body: OrientationBody, label: Label, of: 'requests' | 'cost'): BarRow[] {
  return body.projects.map(row => {
    const colour = repoColour(body.repo_order, row.project_path)
    return {
      key: row.project_path, label: projectName(row.project_path), title: row.project_path,
      sub: `${plural(row.sessions, 'session')} · ${row.tools.map(label).join(', ')}`,
      total: of === 'requests' ? `${count(row.p50_requests)} requests` : money(row.p50_cost_usd),
      parts: [{ key: of, label: of === 'requests' ? 'median requests' : 'median cost', tone: of === 'requests' ? 2 : 1,
        value: of === 'requests' ? row.p50_requests : row.p50_cost_usd,
        text: of === 'requests' ? count(row.p50_requests) : money(row.p50_cost_usd),
        hover: orientationProjectHover(row, label) +
          (colour === OTHER ? '' : ` Coloured as the repository ${repoName(body.repo_order, row.project_path)} in the legend.`),
        ...(colour === OTHER ? {} : { repo: colour }) }],
    }
  })
}

function toolRows(body: OrientationBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `no edit: ${money(tool.never_cost_usd)}`, total: plural(tool.sessions, 'session'),
    parts: [
      { key: 'edited', label: 'recorded an edit', value: tool.edited, tone: 2, text: fmtNum(tool.edited), hover: orientationToolHover(tool, 'edited', label) },
      { key: 'never', label: 'no edit', value: tool.never, tone: 7, text: fmtNum(tool.never), hover: orientationToolHover(tool, 'never', label) },
    ],
  }))
}

/** Per tool: its sessions (or the cost of those with no edit) in a segment per repository; the split by edit is the bar above. */
function repoRows(body: OrientationBody, label: Label, of: 'sessions' | 'never'): BarRow[] {
  return body.tools.filter(tool => tool.repos?.length && (of === 'sessions' || tool.never_cost_usd)).map(tool => ({
    key: tool.tool, label: label(tool.tool),
    sub: of === 'sessions' ? `${fmtNum(tool.edited)} with an edit · ${fmtNum(tool.never)} with none` : plural(tool.never, 'session'),
    total: of === 'sessions' ? plural(tool.sessions, 'session') : money(tool.never_cost_usd),
    parts: of === 'sessions'
      ? repoPartsWith(tool.repos, 'sessions', body.repo_order, value => plural(value, 'session'), `${label(tool.tool)}, sessions`, 'sessions',
        orientationToolHover(tool, 'edited', label), orientationRepoMore)
      : repoPartsWith(tool.repos, 'never_cost_usd', body.repo_order, value => money(value),
        `${label(tool.tool)}, cost of the sessions with no edit`, 'cost of the sessions with no edit', orientationToolHover(tool, 'never', label),
        orientationNeverRepoMore),
  }))
}

function ProjectBars(props: { body: OrientationBody; label: Label }) {
  return <>
    <RepoLegend split={props.body} other={hasOther(props.body.tools)} />
    <Show when={props.body.projects.length} fallback={<p class={styles.note}>No project has 3 or more sessions that edit in this period.</p>}>
      <Bars name="orientation-requests" title="Median main-agent requests before the first edit, per project"
        axis={'Length: requests, linear from 0; projects with 3 or more sessions that edit, the 10 with the most.' +
          (props.body.repo_order?.length ? ' A project that is a ranked repository has its colour; medians are not split.' : '')}
        rows={projectRows(props.body, props.label, 'requests')} />
      <Bars name="orientation-cost" title="Median cost before the first edit, per project"
        axis="Length: cost at list price, linear from $0." rows={projectRows(props.body, props.label, 'cost')} />
    </Show>
    <Bars name="orientation-tools" title="Sessions per tool: with an edit and with no edit" scale="whole"
      legend={[{ label: 'Recorded an edit', tone: 2 }, { label: 'No edit (not in the medians)', tone: 7 }]}
      axis="Bar: the tool's sessions that started in the period (100%)." rows={toolRows(props.body, props.label)} />
    <Bars name="orientation-tools-repos" title="Sessions per tool, by repository"
      axis="Length: sessions that started in the period, one linear scale from 0; a segment per repository."
      rows={repoRows(props.body, props.label, 'sessions')} />
    <Bars name="orientation-never-repos" title="Cost of the main-agent requests of sessions with no edit, per tool, by repository"
      axis="Length: cost at list price, one linear scale from $0; a segment per repository." rows={repoRows(props.body, props.label, 'never')} />
  </>
}

type Row = Record<string, unknown>

export default function Orientation(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<OrientationBody> {...props} card="orientation" tab="flow"
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
