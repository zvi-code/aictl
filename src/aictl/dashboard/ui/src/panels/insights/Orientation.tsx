import { Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { DotRows } from './charts/DotRows'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  money, orientationNeverRepoMore, orientationRepoMore, orientationToolHover, plural, repoPartsWith, toolLabel,
  type Label, type OrientationBody,
} from './insightsModel'
import { neverCostRows, orientationLine, orientationUnpriced, projectDots } from './orientationModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import styles from './Insights.module.css'
import own from './Orientation.module.css'

function toolRows(body: OrientationBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `no edit: ${money(tool.never_cost_usd)}`, total: plural(tool.sessions, 'session'),
    parts: [
      { key: 'edited', label: 'recorded an edit', value: tool.edited, tone: 2, text: fmtNum(tool.edited), hover: orientationToolHover(tool, 'edited', label) },
      { key: 'never', label: 'no edit', value: tool.never, tone: 7, text: fmtNum(tool.never), hover: orientationToolHover(tool, 'never', label) },
    ],
  }))
}

/** Per tool: its sessions (or the cost of those with no edit) in a segment per repository. */
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

/** Whether the answer splits any bar by repository, or ranks a repository a project row can take the colour of. */
const orientationSplit = (body: OrientationBody) => body.tools.some(tool => tool.repos?.length) || !!body.repo_order?.length

function Visual(props: { body: OrientationBody; label: Label; mode: ColourMode; setMode: (mode: ColourMode) => void }) {
  const byRepo = () => orientationSplit(props.body) && props.mode === 'repo'
  const dots = () => projectDots(props.body, props.label, byRepo())
  return <>
    <ColourBy parts="Edit" value={byRepo() ? 'repo' : 'parts'} onChange={props.setMode} split={orientationSplit(props.body)} />
    <Show when={byRepo()}><RepoLegend split={props.body} other={hasOther(props.body.tools)} /></Show>
    <div class={own.grid}>
      <div class={own.wide}>
        <DotRows name="orientation-projects" title="Before the first edit, per project" measures={dots().measures} rows={dots().rows}
          empty="No project has 3 or more sessions that edit in this period."
          axis="Medians over the project's sessions that edit; projects with 3 or more such sessions, the 10 with the most. Each measure on its own axis from 0." />
      </div>
      <Show when={byRepo()} fallback={<Bars name="orientation-tools" title="Sessions per tool, with and without an edit" scale="whole"
        legend={[{ label: 'Recorded an edit', tone: 2 }, { label: 'No edit (not in the medians)', tone: 7 }]}
        axis="Bar: the tool's sessions that started in the period, 100%." rows={toolRows(props.body, props.label)} />}>
        <Bars name="orientation-tools-repos" title="Sessions per tool"
          axis="Length: sessions that started in the period, one linear scale from 0; a segment per repository."
          rows={repoRows(props.body, props.label, 'sessions')} />
      </Show>
      <Show when={byRepo()} fallback={<Bars name="orientation-never" title="Cost of the sessions with no edit, per tool"
        axis="Length: list price of their main-agent requests, linear from $0." rows={neverCostRows(props.body, props.label)} />}>
        <Bars name="orientation-never-repos" title="Cost of the sessions with no edit, per tool"
          axis="Length: list price of their main-agent requests, one linear scale from $0; a segment per repository."
          rows={repoRows(props.body, props.label, 'never')} />
      </Show>
    </div>
    <Show when={orientationUnpriced(props.body)}>{text => <p class={styles.note} data-unpriced>{text()}</p>}</Show>
  </>
}

type Row = Record<string, unknown>

export default function Orientation(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [mode, setMode] = useColourBy()
  return <InsightCard<OrientationBody> {...props} card="orientation" tab="flow"
    finding={orientationLine}
    visual={body => <Visual body={body} label={label} mode={mode()} setMode={setMode} />}
    note={'Before the first edit: the requests of the main agent (agent id empty or equal to the session id) up to the ' +
      'session\'s first edit call, by any agent; an edit call is one the board counts as an edit. A session resumed from an ' +
      'earlier one starts oriented, so it shows few requests. A session whose first edit is by a subagent counts the main ' +
      'agent\'s requests up to that time. A session counts in the period it started in. Only projects with 3 or more ' +
      'sessions that edit are shown, the 10 with the most; sessions that never edit are counted per tool, not in the medians. ' +
      'Cost is list price, not a bill. Colour by Repository gives a project that is one of the ranked repositories that ' +
      'repository\'s colour (medians are not split) and splits the bars per tool by repository.'}
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
