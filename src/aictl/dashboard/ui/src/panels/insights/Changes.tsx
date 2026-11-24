import { Show } from 'solid-js'
import { fmtNum, fmtShare, fmtUsd } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { Bars as SplitBars } from './Bars'
import { activeRepos, changeLine, changeSplit, filesByKind, inRepoColour, kindTotal, perCommitDots, plainColumns } from './changesModel'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { DotRows } from './charts/DotRows'
import { plural, toolLabel } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther, type RepoSegment } from './repoSplit'
import { Bars, Columns } from './WorkCharts'
import {
  CHANGE_SMALL, changeBinChart, changeFilesChart, changeHero, changeKindChart, changeSessionsChart, changeWritesChart, FILE_KINDS,
  reworkedChart, SHOWN, smallText, splitRows, type BarChart, type ChangeBody,
} from './workModel'
import styles from './Insights.module.css'
import own from './Changes.module.css'

/** A one-measure chart split by repository where the server split it, else drawn whole. */
function CountBars(props: { chart: BarChart; items: readonly { repos?: RepoSegment[] }[]; order: ChangeBody['repo_order']; measureKey: string
  unit: string; measure: string }) {
  const rows = () => {
    const unit = props.unit
    return splitRows(props.chart, props.items, props.measureKey, props.order, value => plural(value, unit), props.measure)
  }
  return <Show when={rows()} fallback={<Bars chart={props.chart} />}>{split => <SplitBars name={props.chart.id} title={props.chart.title}
    axis={`${props.chart.axis} A segment per repository.`} rows={split()} />}</Show>
}

function Visual(props: { body: ChangeBody; mode: ColourMode; setMode: (mode: ColourMode) => void }) {
  const split = () => changeSplit(props.body)
  const byRepo = () => split() && props.mode === 'repo'
  const shown = () => activeRepos(props.body, SHOWN)
  const order = () => props.body.repo_order
  // Charts whose rows are repositories: by their own parts, or each bar in its repository's colour.
  const coloured = (chart: BarChart, items = shown()) => byRepo() ? inRepoColour(chart, items, order()) : chart
  const kinds = () => FILE_KINDS.map(kind => ({ repos: props.body.summary.kind_repos?.[kind.id] }))
  const dots = () => perCommitDots(props.body, shown(), byRepo())
  const bins = (what: 'commits' | 'writes') => byRepo() ? changeBinChart(props.body, what) : plainColumns(changeBinChart(props.body, what))
  return <>
    <ColourBy parts="Kind of file and commit" value={byRepo() ? 'repo' : 'parts'} onChange={props.setMode} split={split()} />
    <Show when={byRepo()}>
      <RepoLegend split={props.body} other={hasOther([...props.body.repos, ...props.body.files, ...props.body.bins, ...kinds()])} />
    </Show>
    <div class={own.grid}>
      <Bars chart={byRepo() ? inRepoColour(changeFilesChart(props.body), shown(), order()) : filesByKind(props.body)} />
      <Show when={byRepo()} fallback={<Bars chart={kindTotal(props.body)} />}>
        <CountBars chart={changeKindChart(props.body)} items={kinds()} order={order()} measureKey="files" unit="file" measure="changed files" />
      </Show>
      <Bars chart={coloured(changeWritesChart(props.body))} />
      <Bars chart={coloured(changeSessionsChart(props.body))} />
      <Show when={props.body.bins.length} fallback={<p class={styles.note}>No agent commit or file write in this period.</p>}>
        <Columns chart={bins('commits')} wide />
        <Columns chart={bins('writes')} wide />
      </Show>
      <DotRows name="per-commit" title="Spend and agent working time per commit" measures={dots().measures} rows={dots().rows}
        axis="Each measure on its own linear axis from 0. Spend is list price, not a bill; needs 3 commits." />
      <Show when={props.body.files.length} fallback={<p class={styles.note}>No file was written in 3 sessions or 5 times in one.</p>}>
        <Show when={byRepo()} fallback={<Bars chart={reworkedChart(props.body)} />}>
          <CountBars chart={reworkedChart(props.body)} items={props.body.files.slice(0, SHOWN)} order={order()} measureKey="writes" unit="write"
            measure="writes" />
        </Show>
      </Show>
    </div>
    <Show when={smallText(props.body.summary.small, CHANGE_SMALL)}>{text => <p class={styles.note} data-small-list>{text()}</p>}</Show>
  </>
}

type Row = Record<string, unknown>

const NOTE = 'A change is a file write event of the period that an agent made (a change the tool reports as made outside ' +
  'the session is left out); files are distinct paths. Lines are as the tool reported them; a write without a count is ' +
  'counted apart. Written in 3 or more sessions or 5 or more times in one session: listed among the rewritten files. Kind ' +
  'of file, by its path: memory and instructions (an instruction or memory file the store recognizes), tests (a tests, ' +
  'test, __tests__ or spec folder, or a test_, _test., .test. or .spec. name), docs (.md, .mdx, .rst, .txt, .adoc or a docs ' +
  'folder), config and data (.json, .yaml, .toml, .ini, .cfg, .conf, .lock, .env, .xml, .csproj, .props, dotfiles, ' +
  'Dockerfile, Makefile), source (code, query, style and markup files by extension), else other. A commit is a successful ' +
  'shell call that runs git commit (not a dry run, not printed or searched for); commits made outside an agent\'s shell ' +
  '(a person, a script, a tool\'s own commit button) are not seen, so "no commit followed" means no agent commit of the same ' +
  'session followed the write. A commit followed a write when the same session committed at or after it. Spend and ' +
  'working time per commit are the repository\'s spend at list price and agent working time divided by its commits, and need 3 ' +
  'commits. Bins are UTC days, or whole days so the period has at most 31 bins (all history: a year). Too little data: a ' +
  'repository with fewer than 20 writes and fewer than 3 commits is drawn grey (coloured by kind) and named under the ' +
  'charts. Charts show the first 15 repositories by ' +
  'changed files; in the dots of spend and time per commit, a repository with fewer than 3 commits has no dot. Colour by ' +
  'Repository draws each repository bar in its repository\'s colour (the same on every view) and splits the kinds, the ' +
  'columns and the rewritten files by repository. Whether a test ran between the last source change and each commit is the ' +
  'view "Verified before commit". ' +
  'Not measured: changes to stored data or schemas made by commands (Kusto management commands, SQL, migrations); no stored ' +
  'field marks them. The page\'s project, tool and model filters apply.'

export default function Changes(props: CardProps) {
  const [mode, setMode] = useColourBy()
  return <InsightCard<ChangeBody> {...props} card="changes" tab="flow" filtered
    hero={changeHero}
    finding={changeLine}
    visual={body => <Show when={body.repos.length} fallback={<p class={styles.note}>No session in this period.</p>}>
      <Visual body={body} mode={mode()} setMode={setMode} />
    </Show>}
    note={NOTE}
    table={{
      label: 'What the agents changed by repository',
      rows: body => body.repos.map((repo): Row => ({
        id: repo.repo, name: repo.name, files: repo.files, writes: repo.writes, committed_share: repo.committed_share ?? undefined,
        lines_added: repo.lines_added, lines_removed: repo.lines_removed, reworked: repo.reworked, commits: repo.commits,
        commit_days: repo.commit_days, source: repo.kinds.source, tests: repo.kinds.tests, docs: repo.kinds.docs,
        config: repo.kinds.config, cost_per_commit: repo.cost_per_commit ?? undefined, uncommitted_sessions: repo.uncommitted_sessions,
        small: repo.small ? 'too small' : '',
      })),
      fields: [textField('name', 'Repository or folder'), numberField('files', 'Files changed', fmtNum),
        numberField('writes', 'Writes', fmtNum), numberField('committed_share', 'Committed', fmtShare),
        numberField('lines_added', 'Lines added', fmtNum), numberField('lines_removed', 'Lines removed', fmtNum),
        numberField('reworked', 'Reworked files', fmtNum), numberField('commits', 'Commits', fmtNum),
        numberField('commit_days', 'Days with a commit', fmtNum), numberField('source', 'Source files', fmtNum),
        numberField('tests', 'Test files', fmtNum), numberField('docs', 'Docs', fmtNum), numberField('config', 'Config and data', fmtNum),
        numberField('cost_per_commit', 'Spend per commit', fmtUsd), numberField('uncommitted_sessions', 'Sessions with no commit', fmtNum),
        textField('small', 'Evidence')],
    }}
    sessionFields={[textField('tool', 'Tool', row => toolLabel(String(row.tool ?? ''))),
      textField('repo', 'Repository', row => String(row.repo ?? '')),
      numberField('writes', 'Writes', fmtNum), numberField('committed_writes', 'Committed', fmtNum),
      numberField('files', 'Files', fmtNum), numberField('commits', 'Commits', fmtNum)]} />
}
