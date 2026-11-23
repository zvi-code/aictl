import { createMemo, Show } from 'solid-js'
import { fmtN } from '../../design/format'
import { Meter } from '../../ui/Meter'
import { labelOf, Resource, Rows, Section, Stats, type TabProps } from '../shared'
import { mcpTotals } from '../toolModel'

export default function Tools(props: TabProps) {
  return <Resource read={props.detail}>{data => {
    const calls = () => data().tool_calls
    const failures = () => calls()?.filter(row => row.failed).length
    const servers = createMemo(() => mcpTotals(data().tool_totals))
    // A tool with no MCP server is not an MCP tool: it is said so, not left as unavailable.
    const byTool = () => data().tool_totals?.map(row => ({ ...row, mcp_server: row.mcp_server ?? 'built-in' }))
    // The list is the newest calls only; the total says how many calls the session made.
    const shown = () => {
      const total = data().agent?.tool_calls
      return total != null && calls() != null && calls()!.length < total ? { shown: calls()!.length, total } : undefined
    }
    return <>
      <Section title="Tool calls">
        <Stats items={[{ label: 'Calls', value: data().agent?.tool_calls ?? calls()?.length }, { label: 'Failed', value: failures() }]} />
        <Meter label="Failed calls" value={failures()} max={Math.max(1, calls()?.length ?? 0)} tone="danger" />
        <Show when={data().agent?.pending}><p role="status">Confirmation pending. Answer in the tool that requested it.</p></Show>
        <Rows label="Calls by tool" rows={byTool()} identity={['mcp_server', 'name']} columns={['name', ['mcp_server', 'MCP server'], 'calls',
          'failed', ['p50_ms', 'P50'], ['p95_ms', 'P95'], ['input_bytes', 'Input', 'bytes'], ['output_bytes', 'Output', 'bytes']]}
          action={{ label: row => `Open ${labelOf(row.name)}`, run: row => props.shell.open({ type: 'tool', name: row.name }) }} />
      </Section>
      <Section title="MCP server totals"><Rows label="MCP server totals" rows={servers()} identity={['server']}
        columns={['server', 'calls', 'failed', ['total_ms', 'Recorded run time'], ['input', 'Recorded input', 'bytes'],
          ['output', 'Recorded output', 'bytes'], ['partial', 'Some times or sizes unavailable']]} /></Section>
      <Section title={shown() == null ? 'Individual calls' : `Individual calls · newest ${fmtN(shown()!.shown)} of ${fmtN(shown()!.total)} shown`}>
        <Rows label="Individual calls" rows={calls()} identity={['ts', 'agent_id', 'name', 'target']} hints={{ agent: row => row.agent_id }}
          columns={[[ 'ts', 'Time', 'timeSec' ], 'agent', 'name', 'target', 'duration_ms', ['input_bytes', 'Input', 'bytes'],
            ['output_bytes', 'Output', 'bytes'], 'failed', 'confirm']} /></Section>
    </>
  }}</Resource>
}
