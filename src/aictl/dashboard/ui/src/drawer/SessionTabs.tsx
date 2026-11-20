import { createSignal, createUniqueId, For, Show } from 'solid-js'
import type { Tab } from '../ui/Tabs'
import { moveFocus } from '../ui/keyboard'
import { fmtN } from '../design/format'
import styles from './sessionTabs.module.css'

export type SessionTab = Tab & { groupStart?: boolean; count?: () => number | undefined }

export function SessionTabs(props: {
  items: readonly SessionTab[]; value: string; onChange: (id: string) => void
}) {
  const base = createUniqueId()
  const [focus, setFocus] = createSignal<string>()
  return <div class={styles.tabs}>
    <div role="tablist" aria-label="Session views" class={styles.list}
      onFocusOut={event => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocus(undefined)
      }}
      onKeyDown={event => {
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
        moveFocus(event, Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]:not(:disabled)')),
          rtl ? 'ArrowRight' : 'ArrowLeft', rtl ? 'ArrowLeft' : 'ArrowRight')
      }}>
      <For each={props.items}>{item => {
        const id = `${base}-${item.id}`
        const count = () => item.count?.()
        return <>
          <Show when={item.groupStart}><span aria-hidden="true" class={styles.divider} /></Show>
          <button type="button" role="tab" class={styles.tab} id={`${id}-tab`}
            aria-label={item.label} aria-controls={`${id}-panel`} aria-describedby={count() == null ? undefined : `${id}-count`}
            aria-selected={props.value === item.id ? 'true' : 'false'} disabled={item.disabled}
            tabindex={(focus() ?? props.value) === item.id ? 0 : -1}
            onFocus={() => setFocus(item.id)} onClick={() => props.onChange(item.id)}>
            {item.label}
            <Show when={count() != null}>
              <span class={styles.badge} title={count()?.toLocaleString()} id={`${id}-count`}>{fmtN(count())}</span>
            </Show>
          </button>
        </>
      }}</For>
    </div>
    <For each={props.items}>{item =>
      <div role="tabpanel" class={styles.content} id={`${base}-${item.id}-panel`}
        aria-labelledby={`${base}-${item.id}-tab`} hidden={props.value !== item.id} tabindex={0}>
        <Show when={props.value === item.id}>{item.content()}</Show>
      </div>
    }</For>
  </div>
}
