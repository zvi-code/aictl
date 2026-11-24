import { For, Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { CodeView } from '../../ui/CodeView'
import { BarChart } from './FlowsBars'
import { axisText, barTop, type BarRow } from './flowBarModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, hours, share, toolLabel, type Label } from './insightsModel'
import {
  failureRows, kindLegend, kindName, kindRows, kqlCoverage, kqlFinding, kqlHero, kqlProjectRows, largeRows, routeRows, runLegend, shapeLegend,
  shapeRows, targetRows, type KqlBody,
} from './kqlModel'
import styles from './Insights.module.css'

const runs = (rows: BarRow[]) => axisText('runs', fmtNum(barTop(rows)))

/** The runs that brought 100 KB or more into the context: their bytes as bars, then the full query text of each on expand. */
function Large(props: { body: KqlBody; label: Label }) {
  return <Show when={props.body.large.length}>
    <section class={styles.flow} data-large>
      <BarChart data="large" title="Results of 100 KB or more (bytes per run)" rows={largeRows(props.body, props.label)}
        axis={axisText('bytes returned', bytes(barTop(largeRows(props.body, props.label))))} />
      <For each={props.body.large.slice(0, 6)}>{run => <details class={styles.disclosure}>
        <summary>{bytes(run.output_bytes)} · {kindName(run.kind, run.verb)} · <code>{run.snippet || 'text not kept'}</code></summary>
        <Show when={run.text} fallback={<p class={styles.note}>The query text was not kept.</p>}>
          <CodeView label="Query text of the run" text={run.text} wrap />
        </Show>
      </details>}</For>
    </section>
  </Show>
}

function Visual(props: { body: KqlBody; label: Label }) {
  return <>
    <div class={styles.lists}>
      <BarChart data="routes" title="Recognised runs by route" rows={routeRows(props.body)} axis={runs(routeRows(props.body))}
        empty="No recognised Kusto run in this period." />
      <BarChart data="failures" title="Failed runs by kind of failure" rows={failureRows(props.body)} axis={runs(failureRows(props.body))}
        empty="No run failed." />
    </div>
    <BarChart data="kinds" title="Runs by kind and management verb, failed and not" rows={kindRows(props.body)} legend={kindLegend}
      axis={runs(kindRows(props.body))} empty="No recognised Kusto run in this period." />
    <BarChart data="targets" title="Runs per cluster and database" rows={targetRows(props.body)} legend={runLegend}
      axis={runs(targetRows(props.body))} empty="No run named its cluster." />
    <BarChart data="shapes" title="Query shapes run most (literals as ?)" rows={shapeRows(props.body)} legend={shapeLegend}
      axis={runs(shapeRows(props.body))} empty="No run kept its query text." />
    <BarChart data="projects" title="Runs per project" rows={kqlProjectRows(props.body)} legend={runLegend} axis={runs(kqlProjectRows(props.body))}
      empty="No project with 5 runs." />
    <Large body={props.body} label={props.label} />
    <p class={styles.note} data-coverage>{kqlCoverage(props.body, props.label)}</p>
  </>
}

type Row = Record<string, unknown>

export default function Kql(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<KqlBody> {...props} card="kql" title="Kusto queries" tab="tools"
    hero={kqlHero}
    finding={kqlFinding}
    visual={body => <Visual body={body} label={label} />}
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
      'project with fewer than 5 runs.'}
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
