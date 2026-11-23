import { For, Show, type Accessor } from 'solid-js'
import type { DetailAgent } from '../data/contract.gen'
import { fmtCredits, fmtN, stamp } from '../design/format'
import { Meter } from '../ui/Meter'
import { PanelState } from '../ui/PanelState'
import { clip, number, records, Rows, Section, Stats, text } from './shared'

export function OtelSections(props: { data: Accessor<DetailAgent> }) {
  const otel = () => props.data().otel
  const sources = () => props.data().sources
  const context = () => otel()?.context
  const names = (field: 'skills' | 'custom_agents' | 'mcp_servers') => {
    const value = otel()?.in_context?.[field]
    return Array.isArray(value) ? value.flatMap(item => {
      if (typeof item === 'string') return [item]
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = item as Record<string, unknown>
        // A span names a server by a hash of its name; the label says what the hash is.
        const label = text(row.name) ?? (row.hash ? `server id hash ${clip(text(row.hash), 8)}` : undefined)
        const state = text(row.state)
        if (label) return [state ? `${label} (${state})` : label]
      }
      return []
    }) : undefined
  }
  const lifecycle = () => records(otel()?.mcp_lifecycle)
  return <>
    <Section title="OpenTelemetry sources">
      <Stats items={[
        { label: 'Spans', value: otel()?.spans.count ?? sources()?.otel_spans,
          detail: sources()?.otel_last_ts ? `Last span ${stamp(sources()?.otel_last_ts, true)}` : undefined },
        { label: 'Span events', value: otel()?.span_events.count ?? sources()?.otel_span_events },
        { label: 'Logs', value: otel()?.logs.count }, { label: 'Session file rows', value: sources()?.session_file, detail: 'model calls, tool calls and prompts the session file recorded' },
        { label: 'aictl hook events', value: sources()?.hooks,
          detail: sources()?.hooks_last_ts ? `Last hook ${stamp(sources()?.hooks_last_ts, true)}` : 'sent by aictl\u2019s own hooks, not Copilot\u2019s hook spans' },
        { label: 'AI credits', value: number(otel()?.totals?.ai_credits) == null ? undefined : fmtCredits(number(otel()?.totals?.ai_credits)) },
        { label: 'Model calls', value: number(otel()?.totals?.calls),
          detail: number(otel()?.totals?.matched) == null ? undefined : `${fmtN(number(otel()?.totals?.matched))} matched to the session file` },
      ]} />
      <Show when={number(context()?.current) != null}>
        <Meter label="Current context from OTel" value={number(context()?.current)} max={number(context()?.limit)}
          display={`${fmtN(number(context()?.current))} / ${fmtN(number(context()?.limit))} tokens`} />
      </Show>
      <Show when={sources() && !sources()?.otel_spans && !sources()?.otel_span_events}>
        <PanelState state="empty" message="No OpenTelemetry spans reached this session." />
      </Show>
    </Section>
    <Show when={otel()}>
      <Section title="OTel model calls">
        <Rows label="OTel model calls" rows={otel()?.calls.map(row => ({ ...row,
          session_file: typeof row.matched === 'boolean' ? row.matched ? 'Same call' : 'Not in session file' : undefined,
        }))} identity={['trace_id', 'span_id', 'ts', 'turn_id', 'model']} columns={[
          ['ts', 'Time', 'time'], 'model', ['ai_credits', 'AI credits', 'number'],
          ['ttft_ms', 'First chunk (ms)', 'number'], ['server_ms', 'Server (ms)', 'number'],
          'session_file', 'initiator', 'turn_id',
        ]} />
      </Section>
      <Section title="Context inputs">
        <Stats items={(['skills', 'custom_agents', 'mcp_servers'] as const).map((field, index) => {
          const value = names(field)
          return { label: ['Skills', 'Custom agents', 'MCP servers'][index], value: value?.length }
        })} />
        <Show when={otel()?.in_context} fallback={<PanelState state="unavailable" message="Spans did not name context inputs." />}>
          <dl><For each={['skills', 'custom_agents', 'mcp_servers'] as const}>{field =>
            <Show when={names(field)?.length}><dt>{field.replaceAll('_', ' ')}</dt><dd>{names(field)?.join(', ')}</dd></Show>
          }</For></dl>
        </Show>
        <Rows label="MCP lifecycle" rows={lifecycle()} identity={['ts', 'hash', 'state']}
          columns={[['ts', 'Time', 'time'], ...(lifecycle()?.some(row => row.name) ? [['name', 'Name']] as const : []),
            ['hash', 'Server id hash'], 'state', 'source']} />
      </Section>
    </Show>
  </>
}
