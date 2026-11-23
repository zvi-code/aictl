import { createMemo, Show } from 'solid-js'
import { Meter } from '../../ui/Meter'
import { labelOf, Resource, Rows, Section, Stats, type TabProps } from '../shared'
import { mcpTotals } from '../toolModel'

export default function Tools(props: TabProps) {
  return <Resource read={props.detail}>{data => {
    const calls = () => data().tool_calls
    const failures = () => calls()?.filter(row => row.failed).length
    const servers = createMemo(() => mcpTotals(data().tool_totals))
    return <>
      <Section title="Tool calls">
        <Stats items={[{ label: 'Calls', value: data().agent?.tool_calls ?? calls()?.length }, { label: 'Failed', value: failures() }]} />
        <Meter label="Failed calls" value={failures()} max={Math.max(1, calls()?.length ?? 0)} tone="danger" />
        <Show when={data().agent?.pending}><p role="status">Confirmation pending. Answer in the tool that requested it.</p></Show>
        <Rows label="Calls by tool" rows={data().tool_totals} identity={['mcp_server', 'name']} columns={['name', 'mcp_server', 'calls',
          'failed', ['p50_ms', 'P50 (ms)', 'number'], ['p95_ms', 'P95 (ms)', 'number'], 'input_bytes', 'output_bytes']}
          action={{ label: row => `Open ${labelOf(row.name)}`, run: row => props.shell.open({ type: 'tool', name: row.name }) }} />
      </Section>
      <Section title="MCP server totals"><Rows label="MCP server totals" rows={servers()} identity={['server']}
        columns={['server', 'calls', 'failed', ['total_ms', 'Recorded run time (ms)', 'number'], ['input', 'Recorded input (bytes)', 'number'],
          ['output', 'Recorded output (bytes)', 'number'], ['partial', 'Some times or sizes unavailable']]} /></Section>
      <Section title="Individual calls"><Rows label="Individual calls" rows={calls()} identity={['ts', 'name', 'target']}
        columns={[[ 'ts', 'Time', 'time' ], 'name', 'target', ['duration_ms', 'Duration (ms)', 'number'],
          'input_bytes', 'output_bytes', 'failed', 'confirm']} /></Section>
    </>
  }}</Resource>
}
