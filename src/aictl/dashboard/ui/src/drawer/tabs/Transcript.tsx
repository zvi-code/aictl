import { createMemo, createSignal, For, lazy, Loading, Show, untrack } from 'solid-js'
import type { DetailAgentTranscript, TranscriptTurn } from '../../data/contract.gen'
import { fmtMs, fmtN, stamp } from '../../design/format'
import { CodeView } from '../../ui/CodeView'
import { Markdown } from '../../ui/Markdown'
import { PanelState } from '../../ui/PanelState'
import { TOKENS_IO } from '../figures'
import { watchedDetail } from '../liveAgent'
import { agentPath, clip, Resource, Rows, Section, Stats, type TabProps } from '../shared'
import { responseOf, tokenParts, transcriptIdentity, visibleTurns } from '../transcriptModel'
import { VirtualList } from '../VirtualList'
import styles from '../drawer.module.css'

const NativeOutput = lazy(() => import('./NativeOutput'))

function TurnCard(props: {
  tab: TabProps; turn: TranscriptTurn; index: number; open: boolean; toggle: () => void; withheld: boolean
}) {
  const [source, setSource] = createSignal(false)
  const ctx = untrack(() => props.tab.shell.ctx)
  const read = ctx.detail<DetailAgentTranscript>(createMemo(() =>
    props.open && props.turn.detail ? agentPath(props.tab, '/transcript', { turn: props.turn.ts }) : undefined))
  const turn = () => {
    const value = read()?.data
    return value && 'turn' in value ? value.turn : props.turn
  }
  const reply = createMemo(() => props.open ? responseOf(turn()) : clip(turn().response_preview, 240))
  const parts = createMemo(() => tokenParts(turn().tokens))
  return <article class={styles.turn}>
    <button class={styles.button} type="button" aria-expanded={props.open ? 'true' : 'false'} onClick={() => props.toggle()}>
      Turn {props.index + 1} · {stamp(turn().ts, true)}{turn().model && ` · ${turn().model}`}
      {turn().wall_ms > 0 && ` · ${fmtMs(turn().wall_ms)}`} · {fmtN(turn().tool_use_count)} tool calls
    </button>
    <div class={props.open ? undefined : styles.preview}><strong>You: </strong>
      {props.withheld ? 'Text not retained.' : (props.open ? turn().prompt || turn().prompt_preview : clip(turn().prompt_preview, 200)) || 'No prompt captured.'}
    </div>
    <Show when={parts().length}>
      <div class={styles.track} role="img" aria-label={parts().map(part => `${part.label}: ${fmtN(part.count)}`).join(', ')}>
        <For each={parts()}>{part => <span title={`${part.label}: ${fmtN(part.count)}`} style={{ 'flex-grow': part.count }} />}</For>
      </div>
    </Show>
    <Show when={props.open} fallback={<Show when={reply()}><div class={styles.preview}><strong>Reply: </strong>{reply()}</div></Show>}>
      <Show when={props.turn.detail && read()?.status === 'loading'}><PanelState state="loading" message="Reading the turn…" /></Show>
      <Show when={read()?.status === 'error'}><PanelState state="error" message="Could not read the full turn." onRetry={read.retry} /></Show>
      <strong>Reply</strong>
      <Show when={!props.withheld && reply()} fallback={<span class={styles.muted}>{props.withheld ? 'Text not retained.' : 'No reply captured.'}</span>}>
        <button type="button" class={styles.button} aria-pressed={source() ? 'true' : 'false'} onClick={() => setSource(value => !value)}>Source</button>
        <Show when={source()} fallback={<Markdown text={reply()} />}><CodeView text={reply()} label="Reply source" wrap /></Show>
      </Show>
      <Show when={turn().actions.length}>
        <Rows label={`Actions of turn ${props.index + 1}`} rows={turn().actions} identity={['ts', 'kind', 'name', 'target']}
          columns={['kind', 'name', 'summary', ['duration_ms', 'Duration (ms)', 'number'], 'success']} />
      </Show>
    </Show>
  </article>
}

export default function Transcript(props: TabProps) {
  const read = watchedDetail(untrack(() => props.shell.ctx), 'transcript', createMemo(() => props.entry.id),
    createMemo(() => agentPath(props, '/transcript')), () => true)
  const [all, setAll] = createSignal(false)
  const [exceptions, setExceptions] = createSignal<ReadonlySet<string>>(new Set())
  const open = (id: string) => all() !== exceptions().has(id)
  const toggle = (id: string) => setExceptions(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  return <><Resource read={read}>{data => {
    const turns = createMemo(() => visibleTurns(data()))
    const withheld = () => data().capture_mode !== 'full'
    const summary = () => data().summary
    return <>
      <Section title="Historical summary">
        <Stats items={[
          { label: 'Turns', value: summary()?.total_turns }, { label: 'Model calls', value: summary()?.total_api_calls },
          { label: 'Tool calls', value: summary()?.total_tool_uses }, { label: TOKENS_IO, value: summary()?.total_tokens },
          { label: 'Errors', value: summary()?.errors }, { label: 'Subagents', value: summary()?.subagents },
          { label: 'Compactions', value: summary()?.compactions },
        ]} />
      </Section>
      <Section title="Transcript, oldest first">
        <Show when={withheld()}><PanelState state="unavailable" message="Text not retained in this capture mode. Counts, times, models and tools are still available." /></Show>
        <Show when={!withheld() && !data().replies_kept && data().reply_note}><p class={styles.muted}>{data().reply_note}</p></Show>
        <Show when={turns().length} fallback={<PanelState state="empty" message="No recorded turns in this session." />}>
          <div class={styles.bar}><button class={styles.button} type="button" onClick={() => { setAll(value => !value); setExceptions(new Set<string>()) }}>
            {all() ? 'Collapse all' : 'Expand all'}
          </button></div>
          <VirtualList label="Transcript turns" rows={turns()} identity={transcriptIdentity} estimate={132}>
            {(turn, index) => <TurnCard tab={props} turn={turn()} index={index()} open={open(transcriptIdentity(turn()))}
              toggle={() => toggle(transcriptIdentity(turn()))} withheld={withheld()} />}
          </VirtualList>
        </Show>
      </Section>
    </>
  }}</Resource>
    <Show when={props.runtime()?.session_id && props.shell.ctx.scope() === 'local'}>
      <Loading fallback={<PanelState state="loading" message="Loading native output…" />}><NativeOutput {...props} /></Loading>
    </Show>
  </>
}
