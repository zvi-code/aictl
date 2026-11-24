import { For, Show, untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { CodeView } from '../../ui/CodeView'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, hours, plural, share, toolLabel, type Label } from './insightsModel'
import { FAILURE_LABELS, kindName, kqlCoverage, kqlFinding, kqlHero, type KqlBody } from './kqlModel'
import styles from './Insights.module.css'

/** Runs by kind and verb as bars: changes of schema or data apart from reads and queries. */
function Kinds(props: { body: KqlBody }) {
  const largest = () => Math.max(0, ...props.body.kinds.map(item => item.runs))
  return <section class={styles.flow} data-kinds>
    <h3 class={styles.subhead}>Queries and management commands</h3>
    <ul class={styles.bars}>
      <For each={props.body.kinds.slice(0, 8)}>{item => <li class={styles.barRow} data-kind={kindName(item.kind, item.verb)}>
        <span class={styles.barName}>{kindName(item.kind, item.verb)}<small>{item.change ? 'changes schema or data' : 'reads'}</small></span>
        <span class={styles.bar} title={`${kindName(item.kind, item.verb)}: ${plural(item.runs, 'run')}, ${fmtNum(item.failures)} failed, ` +
          `${hours(item.sum_ms)}, ${bytes(item.output_bytes)} returned`}>
          <span class={`${styles.fill} ${item.change ? styles.carried : styles.produced}`}
            style={{ 'inline-size': `${largest() ? Math.max(2, item.runs / largest() * 100) : 0}%` }} />
          {plural(item.runs, 'run')} · {fmtNum(item.failures)} failed
        </span>
      </li>}</For>
    </ul>
  </section>
}

function Lists(props: { body: KqlBody }) {
  return <div class={styles.lists}>
    <section>
      <h3 class={styles.subhead}>Queries run most (literals as ?)</h3>
      <Show when={props.body.shapes.length} fallback={<p class={styles.note}>No run kept its query text.</p>}>
        <ol class={styles.rankList} data-shapes>
          <For each={props.body.shapes.slice(0, 5)}>{shape => <li>
            <span><code>{shape.snippet}</code></span>
            <span>{plural(shape.runs, 'run')} · {plural(shape.sessions, 'session')}
              {shape.most_in_session ? ` · up to ${fmtNum(shape.most_in_session)} in one session` : ''}</span></li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>Clusters and databases</h3>
      <Show when={props.body.targets.length} fallback={<p class={styles.note}>No run named its cluster.</p>}>
        <ol class={styles.rankList} data-targets>
          <For each={props.body.targets.slice(0, 5)}>{row => <li>
            <span>{row.cluster ?? 'cluster not named'} · {row.database ?? 'database not named'}</span>
            <span>{plural(row.runs, 'run')} · {fmtNum(row.changes)} changes · {fmtNum(row.failures)} failed</span></li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>Why runs failed</h3>
      <Show when={props.body.failure_kinds.length} fallback={<p class={styles.note}>No run failed.</p>}>
        <ol class={styles.rankList} data-failures>
          <For each={props.body.failure_kinds}>{row => <li>
            <span>{FAILURE_LABELS[row.failure] ?? row.failure}</span><span>{plural(row.runs, 'run')}</span></li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>By project</h3>
      <Show when={props.body.projects.length} fallback={<p class={styles.note}>No project with 5 runs.</p>}>
        <ol class={styles.rankList} data-projects>
          <For each={props.body.projects.slice(0, 8)}>{row => <li>
            <span>{projectName(row.project)}</span>
            <span>{plural(row.runs, 'run')} · {fmtNum(row.changes)} changes · {fmtNum(row.failures)} failed · {plural(row.sessions, 'session')}</span></li>}</For>
        </ol>
      </Show>
    </section>
  </div>
}

/** The runs that brought 100 KB or more into the context: a snippet each, the full query text on expand. */
function Large(props: { body: KqlBody }) {
  return <Show when={props.body.large.length}>
    <section class={styles.flow} data-large>
      <h3 class={styles.subhead}>Results of 100 KB or more</h3>
      <For each={props.body.large.slice(0, 5)}>{run => <details class={styles.disclosure}>
        <summary>{bytes(run.output_bytes)} · {kindName(run.kind, run.verb)} · <code>{run.snippet || 'text not kept'}</code></summary>
        <Show when={run.text} fallback={<p class={styles.note}>The query text was not kept.</p>}>
          <CodeView label="Query text of the run" text={run.text} wrap />
        </Show>
      </details>}</For>
    </section>
  </Show>
}

type Row = Record<string, unknown>

export default function Kql(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<KqlBody> {...props} card="kql" title="Kusto queries" tab="tools"
    hero={kqlHero}
    finding={kqlFinding}
    visual={body => <>
      <Kinds body={body} />
      <Lists body={body} />
      <Large body={body} />
      <p class={styles.note} data-coverage>{kqlCoverage(body, label)}</p>
    </>}
    note={'A run is recognised from the call: an MCP tool whose server or tool name contains kusto, kql or adx; a command line ' +
      'that runs Kusto.Cli, kusto-cli, kql, az kusto query or az kusto script (az kusto cluster and database commands manage ' +
      'the Azure resource and run no KQL); or a command line, not a text tool such as grep or sed, that names a Kusto cluster ' +
      'URL and a Kusto client (KustoClient, azure.kusto, Kusto.Data, execute_query, Invoke-KustoQuery). Command lines that name ' +
      'kusto or kql and are none of these are counted as not recognised. The query text is read from the stored arguments: an ' +
      'MCP tool\'s query or command, the text after -execute: or --query, or the first quoted string of a script that starts ' +
      'with a dot or reads like a query. A text starting with a dot is a management command; create, alter, drop, ingest, ' +
      'set, append, delete, purge, rename, move, replace, clear, attach, detach and update change schema or data. A shape is ' +
      'the text with string, number, timespan and datetime literals replaced by ?. Failure kinds are read from the stored ' +
      'error summary. Too small to compare: a period with fewer than 20 runs in 3 sessions (no finding, no failure share), a ' +
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
