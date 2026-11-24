import { For, Show, untrack } from 'solid-js'
import { fmtN, fmtNum, projectName } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, hours, millis, plural, share, toolLabel, type Label } from './insightsModel'
import { mcpCoverage, mcpFinding, mcpHero, type McpBody, type McpServer } from './mcpModel'
import styles from './Insights.module.css'

const SHOWN = 8

/** Per server: its tool time as a bar, with calls, sessions, failures, latency and bytes carried. */
function ServerBars(props: { body: McpBody }) {
  const largest = () => Math.max(0, ...props.body.servers.map(item => item.sum_ms ?? 0))
  return <section class={styles.flow} data-servers>
    <h3 class={styles.subhead}>Servers by tool time</h3>
    <Show when={props.body.servers.length} fallback={<p class={styles.note}>No server with 20 calls in 3 sessions.</p>}>
      <ul class={styles.bars}>
        <For each={props.body.servers.slice(0, SHOWN)}>{item => <li class={styles.barRow} data-server={item.server}>
          <span class={styles.barName}>{item.server}<small>{plural(item.calls, 'call')} · {plural(item.sessions, 'session')} · {plural(item.projects, 'project')}</small></span>
          <span class={styles.barTrack}>
            <span class={styles.bar} title={`${item.server}: ${hours(item.sum_ms)} in ${plural(item.calls, 'call')}, median ` +
              `${millis(item.p50_ms)}, 95th percentile ${millis(item.p95_ms)}`}>
              <span class={`${styles.fill} ${styles.produced}`}
                style={{ 'inline-size': `${largest() ? Math.max(2, (item.sum_ms ?? 0) / largest() * 100) : 0}%` }} />
              {hours(item.sum_ms)} · median {millis(item.p50_ms)} · p95 {millis(item.p95_ms)}
            </span>
            <span class={styles.splitText}>{share(item.failure_share)} failed · {bytes(item.output_bytes)} returned · carried {bytes(item.carried_bytes)}</span>
          </span>
        </li>}</For>
      </ul>
    </Show>
  </section>
}

function Lists(props: { body: McpBody }) {
  return <div class={styles.lists}>
    <section>
      <h3 class={styles.subhead}>Listed and not called</h3>
      <Show when={props.body.listed.length} fallback={<p class={styles.note}>No MCP tool listing recorded in this period.</p>}>
        <ol class={styles.rankList} data-listed>
          <For each={props.body.listed.slice(0, 6)}>{item => <li>
            <span>{item.server} <small>{plural(item.listed_tools, 'tool')}</small></span>
            <span>called in {fmtNum(item.called_sessions)} of {plural(item.sessions, 'session')} · {fmtN(item.unused_tokens)} tokens unused</span></li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>By project</h3>
      <Show when={props.body.projects.length} fallback={<p class={styles.note}>No project with 20 MCP calls.</p>}>
        <ol class={styles.rankList} data-projects>
          <For each={props.body.projects.slice(0, 8)}>{row => <li>
            <span>{projectName(row.project)}</span>
            <span>{plural(row.calls, 'call')} to {plural(row.servers, 'server')} · {plural(row.sessions, 'session')} · {hours(row.sum_ms)}</span></li>}</For>
        </ol>
      </Show>
    </section>
  </div>
}

type Row = Record<string, unknown>
const serverRows = (item: McpServer, small: boolean): Row[] => [item, ...item.calls_by_tool.map(tool => ({ ...tool, server: item.server }))]
  .map(row => {
    const figures = row as McpServer & { tool_name?: string }
    return {
      id: `${figures.server}:${figures.tool_name ?? ''}`, server: figures.server, tool_name: figures.tool_name ?? '(all tools)',
      calls: figures.calls, sessions: figures.sessions, failures: figures.failures, failure_share: figures.failure_share ?? undefined,
      p50: figures.p50_ms ?? undefined, p95: figures.p95_ms ?? undefined, sum: figures.sum_ms ?? undefined,
      output: figures.output_bytes ?? undefined, carried: figures.carried_bytes ?? undefined, small: small || !figures.enough ? 'too few to compare' : '',
    }
  })

export default function Mcp(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<McpBody> {...props} card="mcp" title="MCP servers" tab="tools"
    hero={mcpHero}
    finding={body => mcpFinding(body, label)}
    visual={body => <>
      <ServerBars body={body} />
      <Lists body={body} />
      <p class={styles.note} data-coverage>{mcpCoverage(body, label)}</p>
    </>}
    note={'An MCP call is a tool call with a stored MCP server, or a name mcp__<server>__<tool>. Tool time is the calls\' ' +
      'duration as the tool recorded it; median and 95th percentile are over the calls with a duration. Failed is the stored ' +
      'failure flag. Carried is the measure of the card Context carry: a result is sent again with every later request of the ' +
      'same session and agent in the period, so carried = result bytes × later requests, an upper bound (compaction and ' +
      'truncation are not counted). Listed and not called: the MCP tools a session\'s main agent was told of in the period, ' +
      'each once per session; a server listed in a session that did not call it counts its listing tokens (estimated from ' +
      'size) there. Too small to compare: a server or tool with fewer than 20 calls or 3 sessions (no failure share), a ' +
      'project with fewer than 20 MCP calls. A project is the last folder of the call\'s working folder.'}
    table={{
      label: 'MCP servers and their tools',
      rows: body => [...body.servers.flatMap(item => serverRows(item, false)), ...body.small_servers.flatMap(item => serverRows(item, true))],
      fields: [textField('server', 'Server'), textField('tool_name', 'Tool'), numberField('calls', 'Calls', fmtNum),
        numberField('sessions', 'Sessions', fmtNum), numberField('failures', 'Failed', fmtNum),
        numberField('failure_share', 'Failed share', value => share(value)), numberField('p50', 'Median', value => millis(value)),
        numberField('p95', '95th percentile', value => millis(value)), numberField('sum', 'Tool time', value => hours(value)),
        numberField('output', 'Returned', value => bytes(value)), numberField('carried', 'Carried (upper bound)', value => bytes(value)),
        textField('small', 'Evidence')],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      textField('project_name', 'Project', row => row.project_name ? projectName(row.project_name) : ''),
      numberField('calls', 'MCP calls', fmtNum), numberField('failures', 'Failed', fmtNum), numberField('servers', 'Servers', fmtNum),
      numberField('sum_ms', 'Tool time', value => hours(value)), numberField('output_bytes', 'Returned', value => bytes(value))]} />
}
