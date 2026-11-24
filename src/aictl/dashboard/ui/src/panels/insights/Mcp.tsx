import { untrack } from 'solid-js'
import { fmtNum, projectName } from '../../design/format'
import { BarChart } from './FlowsBars'
import { opening, opens, type Opens } from './charts/Open'
import { ColourBy, useColourBy, drawnBy, type ColourMode } from './charts/ColourBy'
import { axisText, barTop, type BarLegend, type BarRow } from './flowBarModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, hours, millis, share, toolLabel, type Label } from './insightsModel'
import {
  callLegend, listedLegend, listedRows, mcpCoverage, mcpFinding, mcpHero, mcpMeasured, mcpProjectRows, mcpServerId, mcpSplit, mcpToolName,
  serverBytesRows, serverCallRows, serverSumRows, serverTimeRows, toolCallRows, type McpBody, type McpServer, type McpToolRow,
} from './mcpModel'
import { RepoLegend } from './RepoLegend'
import styles from './CallsViews.module.css'

const calls = (rows: BarRow[]) => axisText('calls', fmtNum(barTop(rows)))

/** The rows of a chart with what their names open: a server its detail, a server tool the tool. A project is named
 * by its last folder: its name narrows the page to every stored folder of that name. */
const links = (open: Opens) => ({
  server: (rows: BarRow[]) => opening(rows, row => open.mcp(mcpServerId(row.key), row.name)),
  listed: (rows: (BarRow & { server: string })[]) => opening(rows, row => open.mcp(mcpServerId(row.server), row.server)),
  tool: (rows: McpToolRow[]) => opening(rows, row => open.tool(mcpToolName(row.server, row.tool_name))),
  project: (rows: BarRow[]) => opening(rows, row => open.projectNamed(row.name)),
})
type Links = ReturnType<typeof links>

/** Rankings side by side, one scale each: calls, call time, tool time, bytes per server; then server tools, listings, projects. */
function Visual(props: { body: McpBody; label: Label; by: ColourMode; setBy: (value: ColourMode) => void; link: Links }) {
  const empty = 'No server with 20 calls in 3 sessions.'
  const split = () => mcpSplit(props.body)
  const repo = () => drawnBy(props.by, split()) === 'repo'
  const along = () => repo() ? ' A segment per repository.' : ''
  const legend = (own: BarLegend) => repo() ? undefined : own
  const other = () => [props.body.servers, props.body.projects, props.body.listed].some(list => list.some(row => row.repos?.some(segment => !segment.repo)))
  return <div class={styles.charts}>
    <ColourBy parts="Succeeded / failed" split={split()} value={props.by} onChange={props.setBy} />
    {repo() ? <RepoLegend split={props.body} other={other()} /> : null}
    <div class={styles.columns}>
      <BarChart data="calls" title="Calls per server" rows={props.link.server(serverCallRows(props.body, repo()))} legend={legend(callLegend)}
        axis={calls(serverCallRows(props.body)) + along()} empty={empty} />
      <BarChart data="time" title="Time per call: median (bar), 95th percentile (mark)" rows={props.link.server(serverTimeRows(props.body))}
        axis={axisText('time per call', millis(barTop(serverTimeRows(props.body)))) + ' Beside: median · 95th percentile.' +
          (repo() ? ' Not split by repository.' : '')} empty={empty} />
      <BarChart data="sum" title="Tool time per server" rows={props.link.server(serverSumRows(props.body, repo()))}
        axis={axisText('summed call durations', hours(barTop(serverSumRows(props.body)))) + along()} empty={empty} />
      <BarChart data="returned" title="Result bytes returned per server" rows={props.link.server(serverBytesRows(props.body, 'output_bytes', repo()))}
        axis={axisText('bytes', bytes(barTop(serverBytesRows(props.body, 'output_bytes')))) + along()} empty={empty} />
      <BarChart data="carried" title="Bytes carried with later requests (upper bound)" rows={props.link.server(serverBytesRows(props.body, 'carried_bytes', repo()))}
        axis={axisText('bytes', bytes(barTop(serverBytesRows(props.body, 'carried_bytes')))) + along()} empty={empty} />
    </div>
    <BarChart data="server-tools" title="Calls per server tool" rows={props.link.tool(toolCallRows(props.body, repo()))} legend={legend(callLegend)}
      axis={calls(toolCallRows(props.body)) + along() + ' Beside: median and 95th percentile time per call.'}
      empty="No server tool with 20 calls in 3 sessions." />
    <div class={styles.columns}>
      <BarChart data="listed" title="Sessions that listed a server's tools" rows={props.link.listed(listedRows(props.body, props.label, repo()))}
        legend={legend(listedLegend)} axis={axisText('sessions', fmtNum(barTop(listedRows(props.body, props.label)))) + along()}
        empty="No MCP tool listing recorded in this period." />
      <BarChart data="projects" title="MCP calls per project" rows={props.link.project(mcpProjectRows(props.body, repo()))} legend={legend(callLegend)}
        axis={calls(mcpProjectRows(props.body)) + along()} empty="No project with 20 MCP calls." />
    </div>
    <p class={styles.note} data-coverage>{mcpCoverage(props.body, props.label)}</p>
    <details class={styles.totals} data-totals><summary>Totals of the period</summary><p>{mcpFinding(props.body, props.label)}</p></details>
  </div>
}

type Row = Record<string, unknown>
const serverRows = (item: McpServer, small: boolean): Row[] => [item, ...item.calls_by_tool.map(tool => ({ ...tool, server: item.server }))]
  .map(row => {
    const figures = row as McpServer & { tool_name?: string }
    return {
      id: `${figures.server}:${figures.tool_name ?? ''}`, server: figures.server, tool_name: figures.tool_name ?? '(all tools)',
      tool_key: mcpToolName(figures.server, figures.tool_name ?? ''),
      calls: figures.calls, sessions: figures.sessions, failures: figures.failures, failure_share: figures.failure_share ?? undefined,
      p50: figures.p50_ms ?? undefined, p95: figures.p95_ms ?? undefined, sum: figures.sum_ms ?? undefined,
      output: figures.output_bytes ?? undefined, carried: figures.carried_bytes ?? undefined, small: small || !figures.enough ? 'too few to compare' : '',
    }
  })

export default function Mcp(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [by, setBy] = useColourBy()
  const open = opens(ctx)
  const link = links(open)
  return <InsightCard<McpBody> {...props} card="mcp" tab="tools"
    hero={mcpHero}
    finding={() => mcpMeasured}
    visual={body => <Visual body={body} label={label} by={by()} setBy={setBy} link={link} />}
    note={'An MCP call is a tool call with a stored MCP server, or a name mcp__<server>__<tool>. Tool time is the calls\' ' +
      'duration as the tool recorded it; median and 95th percentile are over the calls with a duration. Failed is the stored ' +
      'failure flag. Carried is the measure of the card Context carry: a result is sent again with every later request of the ' +
      'same session and agent in the period, so carried = result bytes × later requests, an upper bound (compaction and ' +
      'truncation are not counted). Listed and not called: the MCP tools a session\'s main agent was told of in the period, ' +
      'each once per session; a server listed in a session that did not call it counts its listing tokens (estimated from ' +
      'size) there. Too small to compare: a server or tool with fewer than 20 calls or 3 sessions (no failure share), a ' +
      'project with fewer than 20 MCP calls. A project is the last folder of the call\'s working folder. The median and 95th ' +
      'percentile are of all a server\'s calls and are not split by repository.'}
    table={{
      label: 'MCP servers and their tools',
      rows: body => [...body.servers.flatMap(item => serverRows(item, false)), ...body.small_servers.flatMap(item => serverRows(item, true))],
      fields: [{ ...textField('server', 'Server'), action: { label: row => `Open MCP server ${String(row.server)}`,
        run: row => open.mcp(mcpServerId(String(row.server)), String(row.server))?.run() } },
        { ...textField('tool_name', 'Tool'), action: { label: row => row.tool_key ? `Open tool ${String(row.tool_key)}` : '',
          run: row => open.tool(String(row.tool_key ?? ''))?.run() } },
        numberField('calls', 'Calls', fmtNum),
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

