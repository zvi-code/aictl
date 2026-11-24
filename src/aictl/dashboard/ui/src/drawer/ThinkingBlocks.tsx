import { createMemo, For, Show, untrack } from 'solid-js'
import type { DetailThinking, FlowEvent } from '../data/contract.gen'
import type { PanelContext } from '../panels/types'
import { CodeView } from '../ui/CodeView'
import { clockTime } from './flowModel'
import { path, Resource } from './shared'
import { blockNote, blockTitle, missingNote, thinkingQuery } from './thinkingModel'
import styles from './flow.module.css'

/**
 * The thinking text of one model call, read when the inspector opens the call: each block in order with its size and
 * time. A block without text says why, with the size the source reported.
 */
export function ThinkingBlocks(props: { ctx: PanelContext; session: string; call: FlowEvent }) {
  const ctx = untrack(() => props.ctx)
  const read = ctx.detail<DetailThinking>(createMemo(() => path(ctx, '/api/board/thinking', thinkingQuery(props.session, props.call))))
  return <Resource read={read} what="the thinking text">{data => <Show when={data().blocks.length}
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
}
