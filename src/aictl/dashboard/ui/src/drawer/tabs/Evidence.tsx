import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailSessionEvidence, SessionEvidenceRow } from '../../data/contract.gen'
import { CodeView } from '../../ui/CodeView'
import { PanelState } from '../../ui/PanelState'
import { openAgent, Resource, Rows, Section, sessionPath, Stats, type Reference, type TabProps } from '../shared'
import styles from '../drawer.module.css'

const refs: readonly Reference['field'][] = ['turn_id', 'round_id', 'request_id', 'message_id', 'tool_call_id', 'span_id', 'trace_id']
const kinds = ['message', 'turn', 'context', 'tool_call', 'tool_result', 'command', 'session_command', 'model_call', 'skill']
const retained = (row: SessionEvidenceRow) => row.text_status === 'captured' || row.text_status === 'truncated'

export function EvidenceBrowser(props: { tab: TabProps; contextGroup?: string; contextOnly?: boolean }) {
  const [offset, setOffset] = createSignal(0)
  const [draft, setDraft] = createSignal('')
  const [query, setQuery] = createSignal('')
  const [kind, setKind] = createSignal('')
  const ctx = untrack(() => props.tab.shell.ctx)
  const [step, setStep] = createSignal(untrack(() => props.tab.entry.flowRef?.field === 'step_key' ? props.tab.entry.flowRef.id : undefined))
  const ref = () => props.tab.entry.flowRef
  const request = () => {
    const reference = ref()
    return sessionPath(props.tab, '/api/session-evidence', {
      q: query(), kind: props.contextOnly ? 'context' : kind(), context_group: props.contextGroup, offset: offset(), limit: 100,
      ...(reference && reference.field !== 'step_key' && { [reference.field]: reference.id, trace_id: reference.traceId }),
    })
  }
  const read = ctx.detail<DetailSessionEvidence>(createMemo(request))
  const detail = ctx.detail<DetailSessionEvidence>(createMemo(() =>
    step() ? sessionPath(props.tab, '/api/session-evidence', { step_key: step(), offset: 0, limit: 100 }) : undefined))
  const link = (row: SessionEvidenceRow, field: Reference['field'], id: string) =>
    openAgent(props.tab, props.tab.entry.id, 'evidence', { flowRef: { field, id, traceId: field === 'span_id' ? row.trace_id ?? undefined : undefined } })
  return <Section title={props.contextOnly ? 'Context measurements' : 'Source steps'}>
    <Show when={props.tab.session()} fallback={<PanelState state="unavailable" message="A native session ID is not available from this source." />}>
      <Show when={step()} fallback={<>
        <form class={styles.bar} role="search" aria-label="Source steps filters" onSubmit={event => {
          event.preventDefault(); setQuery(draft().trim()); setOffset(0)
        }}>
          <label class={styles.field}>Search retained text<input type="search" value={draft()} onInput={event => setDraft(event.currentTarget.value)} /></label>
          <Show when={!props.contextOnly}><label class={styles.field}>Kind<select value={kind()} onChange={event => { setKind(event.currentTarget.value); setOffset(0) }}>
            <option value="">All kinds</option><For each={kinds}>{value => <option value={value}>{value.replaceAll('_', ' ')}</option>}</For>
          </select></label></Show>
          <button type="submit" class={styles.button}>Search</button>
        </form>
        <Resource read={read}>{data => <>
          <Stats items={[{ label: 'Shown', value: data().rows.length }, { label: 'Offset', value: data().offset }]} />
          <Rows label="Source steps" rows={data().rows.map(row => ({ ...row, text_preview: retained(row) ? row.text_preview : null }))} identity={['step_key']}
            columns={props.contextGroup ? [['ts', 'Time', 'time'], 'source', 'model', 'phase', 'kind', 'context_tokens',
              'before_tokens', 'after_tokens', 'input_tokens', 'output_tokens', 'cache_read_tokens', 'reasoning_tokens'] :
              [['ts', 'Time', 'time'], 'kind', 'source', 'phase', ['text_preview', 'Preview'], 'text_status']}
            empty="No matching source steps." action={{ label: row => `Inspect step ${row.step_key}`, run: row => setStep(row.step_key) }} />
          <div class={styles.bar}>
            <button type="button" class={styles.button} disabled={!offset()} onClick={() => setOffset(old => Math.max(0, old - data().limit))}>Newer</button>
            <button type="button" class={styles.button} disabled={!data().has_more} onClick={() => setOffset(old => old + data().limit)}>Older</button>
          </div>
        </>}</Resource>
      </>}>
        <button type="button" class={styles.button} onClick={() => setStep(undefined)}>Back to source steps</button>
        <Resource read={detail}>{data => <Show when={data().rows.find(row => row.step_key === step())}
          fallback={<PanelState state="empty" message="The selected step is not available." />}>{row => <>
          <Stats items={[{ label: 'Input', value: row().input_tokens, unit: 'tokens' },
            { label: 'Output', value: row().output_tokens, unit: 'tokens' }, { label: 'Duration', value: row().duration_ms, unit: 'ms' }]} />
          <p>{row().kind} · {row().source} · {row().phase} · {row().text_status}</p>
          <Show when={retained(row()) && (row().text || row().text_preview)} fallback={<PanelState state="unavailable" message="Text not retained." />}>{value =>
            <CodeView label="Source step" text={value()} wrap />
          }</Show>
          <Show when={row().reported_skills?.length}><p>Reported skills: {row().reported_skills?.join(', ')}</p></Show>
          <Show when={row().reported_mcp_servers?.length}><p>Reported MCP servers: {row().reported_mcp_servers?.join(', ')}</p></Show>
          <div class={styles.bar}>
            <button type="button" class={styles.button} onClick={() => openAgent(props.tab, props.tab.entry.id, 'flow',
              { flowRef: { field: 'step_key', id: row().step_key } })}>Open in Flow</button>
            <Show when={row().turn_id}><button type="button" class={styles.button} onClick={() =>
              openAgent(props.tab, props.tab.entry.id, 'turns', { turnId: row().turn_id! })}>Open turn</button></Show>
            <For each={refs}>{field => <Show when={row()[field]}>{id =>
              <button type="button" class={styles.button} title={id()} onClick={() => link(row(), field, id())}>Related {field.replaceAll('_', ' ')}</button>
            }</Show>}</For>
          </div>
        </>}</Show>}</Resource>
      </Show>
    </Show>
  </Section>
}

export default function Evidence(props: TabProps) { return <EvidenceBrowser tab={props} /> }
