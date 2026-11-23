import { createMemo, Show, untrack } from 'solid-js'
import type { TopicRuntimeOutput } from '../../data/contract.gen'
import { nativeOutput } from '../../data/store'
import { stamp } from '../../design/format'
import { PanelState } from '../../ui/PanelState'
import { Section, Stats, type TabProps } from '../shared'
import { VirtualList } from '../VirtualList'
import styles from '../drawer.module.css'

export default function NativeOutput(props: TabProps) {
  const store = untrack(() => props.shell.ctx.client.store)
  const session = () => props.runtime()?.session_id ?? props.session()
  const entries = createMemo(() => {
    const id = session()
    return id && props.shell.ctx.scope() === 'local' ? nativeOutput(store, id) : []
  })
  // The time of the newest line the tail holds.
  const newest = () => entries().reduce<number | undefined>((latest, entry) => {
    const ts = (entry.data as TopicRuntimeOutput).ts
    return typeof ts === 'number' && (latest == null || ts > latest) ? ts : latest
  }, undefined)
  const capture = () => store.meta.capabilities?.capture_mode ?? props.shell.ctx.board('capture_mode')
  const retained = (data: TopicRuntimeOutput) => (capture() == null || capture() === 'full') &&
    data.content_retained === true && !data.text_suppressed
  return <Section title="Native output">
    <Show when={props.shell.ctx.scope() === 'local' && session()} fallback={<PanelState state="unavailable" />}>
      <Stats items={[{ label: 'Live entries', value: store.meta.ready ? entries().length : undefined }]} />
      <Show when={props.shell.ctx.client.status.error}><PanelState state="stale" message="The live connection was interrupted." updatedAt={newest()} /></Show>
      <Show when={entries().length} fallback={<PanelState state={store.meta.ready ? 'empty' : 'loading'}
        message={store.meta.ready ? 'No entries in the live tail.' : undefined} />}>
        <Show when={store.meta.orderedGap || entries().some(entry => entry.data.tail_truncated)}>
          <PanelState state="stale" message="Only the recent tail is available; earlier entries may be missing." updatedAt={newest()} />
        </Show>
        <VirtualList label="Ordered native output" rows={entries()} identity={entry => entry.id} estimate={84}>
          {entry => {
            const data = () => entry().data as TopicRuntimeOutput
            return <article class={styles.turn}>
              <strong>{data().kind} · {stamp(data().ts, true)}</strong>
              <pre class={styles.pre}>{retained(data()) ? data().text : 'Text not retained.'}</pre>
              <Show when={data().text_truncated}><span>Text truncated</span></Show>
            </article>
          }}
        </VirtualList>
      </Show>
    </Show>
  </Section>
}
