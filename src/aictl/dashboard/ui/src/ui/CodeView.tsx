import { createMemo, createSignal, For, Show } from 'solid-js'
import styles from './CodeView.module.css'

export function CodeView(props: {
  text: string
  language?: string
  label?: string
  firstLine?: number
  highlight?: readonly number[]
  wrap?: boolean
  copy?: boolean
}) {
  const lines = createMemo(() => props.text.split(/\r\n?|\n/))
  const [copyStatus, setCopyStatus] = createSignal('')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.text)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Could not copy')
    }
  }
  return <div class={styles.view}>
    <Show when={props.language || props.copy}>
      <div class={styles.header}>
        <span>{props.language}</span>
        <Show when={props.copy}>
          <span class={styles.copy}><span role="status">{copyStatus()}</span>
            <button type="button" class={styles.button} disabled={!props.text} onClick={copy}>Copy code</button></span>
        </Show>
      </div>
    </Show>
    <Show when={props.text} fallback={<p class={styles.empty}>No code to display</p>}>
      <pre class={styles.code} data-wrap={props.wrap || undefined}
        role="group" tabindex={0} aria-label={`${props.label ?? 'Code'} scroll area`}><code>
          <Show when={props.firstLine != null || props.highlight?.length} fallback={<span class={styles.plain}>{props.text}</span>}>
            <For each={lines()} keyed={false}>{(line, index) => {
              const lineNumber = () => (props.firstLine ?? 1) + index
              return <span class={styles.line} data-highlight={props.highlight?.includes(lineNumber()) || undefined}>
                <Show when={props.firstLine != null}><span class={styles.number} aria-hidden="true">{lineNumber()}</span></Show>
                <span>{line()}{index < lines().length - 1 ? '\n' : ''}</span>
              </span>
            }}</For>
          </Show>
        </code></pre>
    </Show>
  </div>
}
