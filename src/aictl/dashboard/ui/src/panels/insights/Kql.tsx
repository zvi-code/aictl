import { For, Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { CodeView } from '../../ui/CodeView'
import { BarChart } from './FlowsBars'
import { ColourBy, useColourBy, drawnBy, type ColourMode } from './charts/ColourBy'
import { axisText, barTop, type BarLegend, type BarRow } from './flowBarModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, hours, share, toolLabel, type Label } from './insightsModel'
import {
  failureRows, kindLegend, kindName, kindRows, kqlCoverage, kqlFinding, kqlHero, kqlMeasured, kqlProjectRows, kqlSplit, largeRows, routeRows,
  runLegend, shapeLegend, shapeRows, targetRows, type KqlBody,
} from './kqlModel'
import { RepoLegend } from './RepoLegend'
import styles from './CallsViews.module.css'
import insights from './Insights.module.css'

const runs = (rows: BarRow[]) => axisText('runs', fmtNum(barTop(rows)))

/** The runs that brought 100 KB or more into the context: their bytes as bars, then the full query text of each on expand. */
function Large(props: { body: KqlBody; label: Label; repo: boolean; along: string }) {
  return <Show when={props.body.large.length}>
    <section class={styles.group} data-large>
      <BarChart data="large" title="Results of 100 KB or more, per run" rows={largeRows(props.body, props.label, props.repo)}
        axis={axisText('bytes returned', bytes(barTop(largeRows(props.body, props.label)))) + props.along} />
      <For each={props.body.large.slice(0, 6)}>{run => <details class={insights.disclosure}>
        <summary>{bytes(run.output_bytes)} · {kindName(run.kind, run.verb)} · <code>{run.snippet || 'text not kept'}</code></summary>
        <Show when={run.text} fallback={<p class={styles.note}>The query text was not kept.</p>}>
          <CodeView label="Query text of the run" text={run.text} wrap />
        </Show>
      </details>}</For>
    </section>
  </Show>
}

/** Rankings side by side, one scale each: routes, failure kinds and kinds; targets and projects; then shapes and large results. */
function Visual(props: { body: KqlBody; label: Label; by: ColourMode; setBy: (value: ColourMode) => void }) {
  const split = () => kqlSplit(props.body)
  const repo = () => drawnBy(props.by, split()) === 'repo'
  const along = () => repo() ? ' A segment per repository.' : ''
  const legend = (own: BarLegend) => repo() ? undefined : own
  const other = () => [props.body.routes ?? [], props.body.failure_kinds, props.body.kinds, props.body.targets, props.body.shapes, props.body.projects,
    props.body.large].some(list => list.some(row => row.repos?.some(segment => !segment.repo)))
  return <div class={styles.charts}>
    <ColourBy parts="Failed / kind" split={split()} value={props.by} onChange={props.setBy} />
    {repo() ? <RepoLegend split={props.body} other={other()} /> : null}
    <div class={styles.columns}>
      <BarChart data="routes" title="Recognised runs by route" rows={routeRows(props.body, repo())} axis={runs(routeRows(props.body)) + along()}
        empty="No recognised Kusto run in this period." />
      <BarChart data="failures" title="Failed runs by kind of failure" rows={failureRows(props.body, repo())}
        axis={runs(failureRows(props.body)) + along()} empty="No run failed." />
      <BarChart data="kinds" title="Runs by kind and management verb" rows={kindRows(props.body, repo())} legend={legend(kindLegend)}
        axis={runs(kindRows(props.body)) + along()} empty="No recognised Kusto run in this period." />
    </div>
    <div class={styles.columns}>
      <BarChart data="targets" title="Runs per cluster and database" rows={targetRows(props.body, repo())} legend={legend(runLegend)}
        axis={runs(targetRows(props.body)) + along()} empty="No run named its cluster." />
      <BarChart data="projects" title="Runs per project" rows={kqlProjectRows(props.body, repo())} legend={legend(runLegend)}
        axis={runs(kqlProjectRows(props.body)) + along()} empty="No project with 5 runs." />
    </div>
    <BarChart data="shapes" title="Query shapes run most (literals as ?)" rows={shapeRows(props.body, repo())} legend={legend(shapeLegend)}
      axis={runs(shapeRows(props.body)) + along()} empty="No run kept its query text." />
    <Large body={props.body} label={props.label} repo={repo()} along={along()} />
    <p class={styles.note} data-coverage>{kqlCoverage(props.body, props.label)}</p>
    <details class={styles.totals} data-totals><summary>Totals of the period</summary><p>{kqlFinding(props.body)}</p></details>
  </div>
}

type Row = Record<string, unknown>

export default function Kql(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [by, setBy] = useColourBy()
  return <InsightCard<KqlBody> {...props} card="kql" tab="tools"
    hero={kqlHero}
    finding={() => kqlMeasured}
    visual={body => <Visual body={body} label={label} by={by()} setBy={setBy} />}
    note={'A run is recognised from the call: an MCP tool whose server or tool name contains kusto, kql or adx; a command line ' +
      'that runs Kusto.Cli, kusto-cli, kql, az kusto query or az kusto script (az kusto cluster and database commands manage ' +
      'the Azure resource and run no KQL); or a command line, not a text tool such as grep or sed, that names a Kusto cluster ' +
      'URL and a Kusto client (KustoClient, azure.kusto, Kusto.Data, execute_query, Invoke-KustoQuery). Command lines that name ' +
      'kusto or kql and are none of these are counted as not recognised. The query text is read from the stored arguments: an ' +
      'MCP tool\'s query or command, the text after -execute: or --query, or the first quoted string of a script that starts ' +
      'with a dot or reads like a query. A text starting with a dot is a management command; create, alter, drop, ingest, ' +
      'set, append, delete, purge, rename, move, replace, clear, attach, detach and update change schema or data. A shape is ' +
      'the text with string, number, timespan and datetime literals replaced by ?. Failure kinds are read from the stored ' +
      'error summary. Too small to compare: a period with fewer than 20 runs in 3 sessions (counts only, no failure share), a ' +
      'project with fewer than 5 runs. A shape\'s runs in sessions that ran it 3 times or more are not split by repository.'}
    table={{
      label: 'Kusto runs by kind',
      rows: body => body.kinds.map((item): Row => ({
        id: `${item.kind}:${item.verb ?? ''}`, kind: kindName(item.kind, item.verb), change: item.change ? 'yes' : 'no',
        runs: item.runs, sessions: item.sessions, failures: item.failures, time: item.sum_ms, output: item.output_bytes,
        share: item.runs ? item.failures / item.runs : undefined,
      })),
      fields: [textField('kind', 'Kind'), textField('change', 'Changes schema or data'), numberField('runs', 'Runs', fmtNum),
        numberField('sessions', 'Sessions', fmtNum), numberField('failures', 'Failed', fmtNum),
        numberField('share', 'Failed share', value => share(value)), numberField('time', 'Time', value => hours(value)),
        numberField('output', 'Returned', value => bytes(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      textField('project_name', 'Project', row => row.project_name ? projectName(row.project_name) : ''),
      numberField('runs', 'Kusto runs', fmtNum), numberField('changes', 'Changes', fmtNum), numberField('failures', 'Failed', fmtNum),
      numberField('large', 'Large results', fmtNum), numberField('output_bytes', 'Returned', value => bytes(value))]} />
}
