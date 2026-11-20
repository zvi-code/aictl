import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailApiCalls, DetailCopilotArtifact, DetailCopilotArtifacts, DetailSessionMcpUsage, DetailSessionRecords } from '../../data/contract.gen'
import { Meter } from '../../ui/Meter'
import { PanelState } from '../../ui/PanelState'
import { FileText } from './Artifacts'
import { number, path, records, Resource, Rows, Section, sessionPath, Stats, text, type TabProps } from '../shared'
import styles from '../drawer.module.css'

function SessionFiles(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const sessionRoute = (suffix: string) => {
    const id = props.session()
    return id ? `/api/copilot-sessions/${encodeURIComponent(id)}/${suffix}` : undefined
  }
  const files = ctx.detail<DetailCopilotArtifacts>(createMemo(() => sessionRoute('artifacts')))
  const [selected, select] = createSignal('')
  const body = ctx.detail<DetailCopilotArtifact>(createMemo(() => {
    const route = sessionRoute('artifact')
    return selected() && route ? path(props.shell.ctx, route, { path: selected() }) : undefined
  }))
  return <Section title="Copilot session files">
    <Resource read={files}>{value => <Rows label="Copilot session files" rows={value().artifacts}
      identity={['path']} columns={['name', 'type', 'size', ['modified_at', 'Changed', 'time']]}
      action={{ label: row => `Inspect ${row.name}`, run: row => { if (row.readable && row.path) select(row.path) } }} />}</Resource>
    <Show when={selected()}>
      <div class={styles.bar}>
        <button type="button" class={styles.button} onClick={() => props.shell.open({ type: 'file', path: selected(), line: 1 })}>Open as a file</button>
        <button type="button" class={styles.button} onClick={() => select('')}>Close file</button>
      </div>
      <Resource read={body}>{file =>
        <Show when={!file().binary} fallback={<PanelState state="unavailable" message="Binary file; text preview unavailable." />}>
          <Show when={file().truncated}><PanelState state="stale" message="Only the first part of this file is available." /></Show>
          <FileText path={selected()} text={file().content ?? ''} />
        </Show>
      }</Resource>
    </Show>
  </Section>
}

export default function Integrations(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const local = () => ctx.scope() === 'local'
  const mcp = ctx.detail<DetailSessionMcpUsage | Extract<DetailSessionRecords, { servers: unknown }>>(createMemo(() =>
    local() ? sessionPath(props, '/api/session-mcp-usage') : sessionPath(props, '/api/board/session/records', { part: 'mcp' })))
  const calls = ctx.detail<DetailApiCalls | Extract<DetailSessionRecords, { calls: unknown }>>(createMemo(() =>
    local() ? sessionPath(props, '/api/api-calls', { since: 0, limit: 200 }) : sessionPath(props, '/api/board/session/records', { part: 'calls', limit: 200 })))
  const resources = () => props.detail()?.data?.resources
  return <>
    <Section title="MCP servers">
      <Resource read={mcp}>{data => <>
        <Stats items={[{ label: 'Calls', value: data().total_calls }, { label: 'Servers', value: data().servers.length }]} />
        <Rows label="MCP servers" rows={data().servers} identity={['server_name']} columns={['server_name', 'call_count',
          'err_count', ['total_duration_ms', 'Total duration (ms)', 'number'], ['last_ts', 'Last activity', 'time']]} />
      </>}</Resource>
    </Section>
    <Section title="Model calls">
      <Resource read={calls}>{data => <>
        <Stats items={[{ label: 'Calls', value: data().summary?.total_calls }, { label: 'Errors', value: data().summary?.total_errors },
          { label: 'Mean latency', value: data().summary?.avg_latency_ms, unit: 'ms' }, { label: 'P95 latency', value: data().summary?.p95_latency_ms, unit: 'ms' }]} />
        <Rows label="Calls by model" rows={Object.entries(data().summary?.by_model ?? {}).map(([model, calls]) => ({ model, calls }))}
          identity={['model']} columns={['model', 'calls']} />
        <Rows label="Model calls" rows={data().calls} identity={['session_id', 'ts', 'model']} columns={[
          ['ts', 'Time', 'time'], 'model', 'input_tokens', 'output_tokens', ['duration_ms', 'Duration (ms)', 'number'], 'status']} />
      </>}</Resource>
    </Section>
    <Section title="Rate limits">
      <Show when={records(resources()?.rate_limit?.windows)} fallback={<PanelState state="unavailable" />}>{windows =>
        <div class={styles.stats}><For each={windows()}>{window => {
          const used = number(window.used_pct)
          return <div><Meter label={`${text(window.window) ?? 'Rate limit'} used`} value={used}
            tone={used == null ? 'neutral' : used > 80 ? 'danger' : used > 60 ? 'warning' : 'positive'} />
            <Show when={text(window.resets_at)}><small>Resets {text(window.resets_at)}</small></Show>
          </div>
        }}</For></div>
      }</Show>
    </Section>
    <Section title="VS Code language models by extension"><Rows label="Language model extensions" rows={resources()?.lm_by_extension}
      identity={['extension']} columns={['extension', 'total_tokens', 'input_tokens', 'output_tokens', 'calls']} /></Section>
    <Show when={local() && props.agent()?.tool.startsWith('copilot')}><SessionFiles {...props} /></Show>
  </>
}
