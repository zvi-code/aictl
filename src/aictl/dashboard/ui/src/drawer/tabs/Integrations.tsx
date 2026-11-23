import { createMemo, For, Show, untrack } from 'solid-js'
import type { DetailApiCalls, DetailSessionMcpUsage, DetailSessionRecords } from '../../data/contract.gen'
import { Meter } from '../../ui/Meter'
import { PanelState } from '../../ui/PanelState'
import { number, records, Resource, Rows, Section, sessionPath, Stats, text, type TabProps } from '../shared'
import styles from '../drawer.module.css'

/** Which tool a panel can show data of: the others have no source for it, so the panel is not shown for them. */
export const rateLimitTools = (tool: string) => tool.startsWith('claude')
export const languageModelTools = (tool: string) => tool.startsWith('copilot-vscode')

export default function Integrations(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const local = () => ctx.scope() === 'local'
  const tool = () => props.agent()?.tool ?? ''
  const mcp = ctx.detail<DetailSessionMcpUsage | Extract<DetailSessionRecords, { servers: unknown }>>(createMemo(() =>
    local() ? sessionPath(props, '/api/session-mcp-usage') : sessionPath(props, '/api/board/session/records', { part: 'mcp' })))
  const calls = ctx.detail<DetailApiCalls | Extract<DetailSessionRecords, { calls: unknown }>>(createMemo(() =>
    local() ? sessionPath(props, '/api/api-calls', { since: 0, limit: 200 }) : sessionPath(props, '/api/board/session/records', { part: 'calls', limit: 200 })))
  const resources = () => props.detail()?.data?.resources
  const windows = () => records(resources()?.rate_limit?.windows)
  const extensions = () => resources()?.lm_by_extension
  const files = () => props.detail()?.data?.artifacts_total
  return <>
    <Section title="MCP servers used">
      <Resource read={mcp}>{data => {
        const configured = () => 'configured_servers' in data() ? (data() as DetailSessionMcpUsage).configured_servers : undefined
        return <>
          <Show when={data().servers.length} fallback={<PanelState state="empty" message="No MCP tool calls recorded for this session." />}>
            <Stats items={[{ label: 'MCP calls', value: data().total_calls }, { label: 'Servers used', value: data().servers.length }]} />
            <Rows label="MCP servers" rows={data().servers} identity={['server_name']} columns={['server_name', 'call_count',
              'err_count', ['total_duration_ms', 'Total duration (ms)', 'number'], ['last_ts', 'Last activity', 'time']]} />
          </Show>
          <Show when={configured()}>{names =>
            <Stats items={[{ label: 'Configured in project files', value: names().length ? names().join(', ') : 'none found' }]} />}
          </Show>
        </>
      }}</Resource>
    </Section>
    <Section title="Model calls">
      <Resource read={calls}>{data => <>
        <Show when={data().calls.length || data().summary.total_calls}
          fallback={<PanelState state="empty" message="No model calls recorded for this session." />}>
          <Stats items={[
            { label: 'Calls', value: data().summary?.total_calls, detail: 'source' in data().summary ? (data().summary as { source?: string | null }).source ?? undefined : undefined },
            { label: 'Errors', value: data().summary?.total_errors },
            { label: 'Mean latency', value: data().summary?.avg_latency_ms, unit: 'ms' },
            { label: 'P95 latency', value: data().summary?.p95_latency_ms, unit: 'ms' }]} />
          <Rows label="Calls by model" rows={Object.entries(data().summary?.by_model ?? {}).map(([model, calls]) => ({ model, calls }))}
            identity={['model']} columns={['model', 'calls']} />
          <Rows label="Model calls" rows={data().calls} identity={['session_id', 'ts', 'model']} columns={[
            ['ts', 'Time', 'time'], 'model', 'input_tokens', 'output_tokens', ['duration_ms', 'Duration (ms)', 'number'], 'status']} />
        </Show>
      </>}</Resource>
    </Section>
    <Show when={windows() || rateLimitTools(tool())}>
      <Section title="Rate limits">
        <Show when={windows()} fallback={<PanelState state="unavailable" />}>{rows =>
          <div class={styles.stats}><For each={rows()}>{window => {
            const used = number(window.used_pct)
            return <div><Meter label={`${text(window.window) ?? 'Rate limit'} used`} value={used}
              tone={used == null ? 'neutral' : used > 80 ? 'danger' : used > 60 ? 'warning' : 'positive'} />
              <Show when={text(window.resets_at)}><small>Resets {text(window.resets_at)}</small></Show>
            </div>
          }}</For></div>
        }</Show>
      </Section>
    </Show>
    <Show when={extensions() || languageModelTools(tool())}>
      <Section title="VS Code language models by extension"><Rows label="Language model extensions" rows={extensions()}
        identity={['extension']} columns={['extension', 'total_tokens', 'input_tokens', 'output_tokens', 'calls']} /></Section>
    </Show>
    <Show when={files()}>{count =>
      <Section title="Session files">
        <button type="button" class={styles.button} onClick={() => props.shell.changeTab('artifacts')}>
          {count()} session files · open Artifacts</button>
      </Section>}
    </Show>
  </>
}
