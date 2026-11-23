import { createMemo, Show, untrack } from 'solid-js'
import { fmtBytes, fmtDur, fmtMs, fmtN } from '../design/format'
import { Definitions, QueryDetails } from '../panels/overview/b/Patterns'
import { share, windowQuery, type McpServerBody } from '../panels/overview/b/patternsModel'
import type { Detail } from '../panels/types'
import type { DrawerProps } from '../shell/drawerTypes'
import { Chart } from '../ui/Chart'
import { PanelState } from '../ui/PanelState'
import { path, Resource, Rows, Section, Stats } from './shared'

/** One MCP server (or the built-in or unknown-server group): its tools, calls over time, failures and sessions. */
export default function McpDetail(props: { shell: DrawerProps; entry: Detail }) {
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<McpServerBody>(createMemo(() =>
    path(ctx, '/api/board/mcp/server', { ...Object.fromEntries(windowQuery(ctx)), id: props.entry.name })))
  return <Resource read={read}>{data => <Show when={data().group} fallback={
    <PanelState state="empty" message={`No calls of ${data().label} in this time.`} />}>{group => <>
    <Section title={group().kind === 'mcp' ? `MCP server ${group().label}` : group().label}>
      <Stats items={[
        { label: 'Calls', value: group().calls }, { label: 'Sessions', value: group().sessions,
          detail: group().sessions_at_least ? 'At least: the session list of a tool was cut at 5,000.' : undefined },
        { label: 'Failures', value: group().failures }, { label: 'Failure rate', value: share(group().fail_rate) },
        { label: 'Total time', value: group().total_ms != null ? fmtMs(group().total_ms) : undefined },
        { label: 'p50 (≈)', value: group().p50_ms != null ? fmtMs(group().p50_ms) : undefined },
        { label: 'p95 (≈)', value: group().p95_ms != null ? fmtMs(group().p95_ms) : undefined },
        { label: 'Result bytes', value: group().output_bytes != null ? fmtBytes(group().output_bytes) : undefined },
        { label: 'Tokens (estimate)', value: group().est_tokens != null ? fmtN(group().est_tokens) : undefined,
          detail: 'Result bytes divided by 4.' },
        { label: 'Share of tool time', value: share(group().time_share) },
      ]} />
    </Section>
    <Section title={`Tools (${group().tools.length})`}>
      <Rows label="Tools of this server" rows={group().tools} identity={['name']} columns={['name', 'calls', 'sessions', 'failures',
        ['total_ms', 'Total time (ms)', 'number'], ['p50_ms', 'p50 ≈ (ms)', 'number'], ['p95_ms', 'p95 ≈ (ms)', 'number'],
        ['output_bytes', 'Result bytes', 'bytes'], ['est_tokens', 'Tokens (estimate)', 'number'], ['last_ts', 'Last call', 'time']]}
        actionColumn="name" action={{ label: row => `Open tool ${row.name}`, run: row => props.shell.open({ type: 'tool', name: row.name }) }} />
    </Section>
    <Section title="Calls over time">
      <Chart label="Calls and failures" description={`Calls and failures per ${fmtDur(data().bucket_s ?? 0)} bucket.`} xAxis="time"
        series={[{ label: 'Calls', color: 0 }, { label: 'Failures', color: 1 }]}
        points={data().series.map(cell => ({ x: cell.ts, values: [cell.calls, cell.failures] }))} />
    </Section>
    <Section title="Failures by message">
      <p>{data().failures_read} of {group().failures} failures read (the newest 500), grouped by their first line with numbers removed.</p>
      <Rows label="Failures by message" rows={data().errors} identity={['key']} empty="No failures in this time."
        columns={['tool', 'count', 'sample', ['last_ts', 'Last', 'time']]} actionColumn="sample"
        action={{ label: row => `Open failures of ${row.tool}`, run: row => props.shell.open({ type: 'error', key: row.key }) }} />
    </Section>
    <Section title={`Sessions (${data().sessions.length} of ${data().sessions_total ?? data().sessions.length})`}>
      <Rows label="Sessions that used this server" rows={data().sessions} identity={['node_id', 'session_id']}
        columns={['title', 'calls', 'failures', ['total_ms', 'Total time (ms)', 'number'], ['output_bytes', 'Result bytes', 'bytes'],
          ['first_ts', 'First call', 'time'], ['last_ts', 'Last call', 'time']]} actionColumn="title"
        action={{ label: row => `Open session ${row.title || row.session_id}`,
          run: row => props.shell.open({ type: 'agent', id: row.session_id, tab: 'tools' }) }} />
    </Section>
    <Definitions items={data().definitions} />
    <QueryDetails query={data().query} copy={ctx.copy} />
  </>}</Show>}</Resource>
}
