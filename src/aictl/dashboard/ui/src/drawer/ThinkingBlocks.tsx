import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailThinking, FlowEvent } from '../data/contract.gen'
import type { PanelContext } from '../panels/types'
import { CodeView } from '../ui/CodeView'
import { clockTime } from './flowModel'
import { path, Resource } from './shared'
import { blockNote, blockTitle, missingNote, reportsThinking, thinkingQuery } from './thinkingModel'
import styles from './flow.module.css'

/**
 * The thinking text of one model call in the step inspector, read on demand: each block in order with its size and
 * time. A call that reported thinking reads it when the inspector shows the call; any other call offers a closed
 * "Look up thinking text" that reads it when opened (a source may store text without reporting its size).
 */
export function ThinkingBlocks(props: { ctx: PanelContext; session: string; call: FlowEvent }) {
  const ctx = untrack(() => props.ctx)
  const [opened, setOpened] = createSignal(false)
  const wanted = () => reportsThinking(props.call) || opened()
  const read = ctx.detail<DetailThinking>(createMemo(() =>
    wanted() ? path(ctx, '/api/board/thinking', thinkingQuery(props.session, props.call)) : undefined))
  const blocks = () => <Resource read={read} what="the thinking text">{data => <Show when={data().blocks.length}
    fallback={<p class={styles.notice} role="status">{missingNote(props.call)}</p>}>
    <For each={data().blocks}>{(block, index) =>
      <details class={styles.toolDetail} open={data().blocks.length <= 3}>
        <summary><strong>{blockTitle(block, index(), data().blocks.length)}</strong> <time>{clockTime(block.ts)}</time></summary>
        <Show when={block.text} fallback={<p class={styles.notice}>{blockNote(block)}</p>}>
          <CodeView label={`Thinking block ${index() + 1}`} text={block.text} wrap copy />
        </Show>
      </details>
    }</For>
  </Show>}</Resource>
  return <Show when={reportsThinking(props.call)} fallback={
    <details class={styles.toolDetail} onToggle={event => { if (event.currentTarget.open) setOpened(true) }}>
      <summary>Look up thinking text <span class={styles.target}>not reported for this call</span></summary>
      <Show when={opened()}>{blocks()}</Show>
    </details>
  }>{blocks()}</Show>
}
