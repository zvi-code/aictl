import { createMemo, Show, untrack } from 'solid-js'
import { CodeView } from '../../ui/CodeView'
import { Markdown } from '../../ui/Markdown'
import { detailRead } from '../data'
import { States } from '../kinds/States'
import type { PanelContext } from '../types'
import css from './overviewA.module.css'

export function FilePreview(props: { path: string; ctx: PanelContext; close: () => void }) {
  const ctx = untrack(() => props.ctx)
  const path = createMemo(() => ctx.scope() === 'local' ? `/api/file?${new URLSearchParams({ path: props.path })}` : undefined)
  const file = untrack(() => ctx.detail<string>(path, 'text'))
  return <section class={css.preview} aria-label={`Preview of ${props.path}`}>
    <div class={css.controls}>
      <strong>{props.path}</strong>
      <Show when={props.ctx.scope() === 'local'}>
        <button type="button" class={css.button} onClick={() => props.ctx.openDetail({ type: 'file', path: props.path, line: 1 })}>Open file</button>
      </Show>
      <button type="button" class={css.button} onClick={() => props.close()}>Close preview</button>
    </div>
    <Show when={props.ctx.scope() === 'local'} fallback={<p class={css.note}>Recorded metadata only. File text is available on This node.</p>}>
      <States result={() => detailRead(file(), file()?.data)} retry={file.retry}>
        <Show when={/\.(md|markdown)$/i.test(props.path)}
          fallback={<CodeView text={file()?.data ?? ''} label={props.path} wrap />}>
          <Markdown text={file()?.data} headingOffset={3} />
        </Show>
      </States>
    </Show>
  </section>
}
