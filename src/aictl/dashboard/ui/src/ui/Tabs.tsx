import { createSignal, createUniqueId, For, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Icon } from './Icon'
import { moveFocus } from './keyboard'
import type { Choice } from './Segmented'
import styles from './Tabs.module.css'

export type Tab = Choice & { content: () => JSX.Element }

export function Tabs(props: {
  label: string
  items: readonly Tab[]
  value: string
  onChange: (id: string) => void
}) {
  const base = createUniqueId()
  const [focused, setFocused] = createSignal<string>()
  const tabStop = () => focused() ?? props.value
  return <div class={styles.tabs}>
    <div role="tablist" aria-label={props.label} class={styles.list}
      onFocusOut={event => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocused(undefined)
      }}
      onKeyDown={event => {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
        moveFocus(event, buttons, rtl ? 'ArrowRight' : 'ArrowLeft', rtl ? 'ArrowLeft' : 'ArrowRight')
      }}>
      <For each={props.items} keyed={item => item.id}>{item =>
        <button type="button" id={`${base}-tab-${item().id}`} role="tab" class={styles.tab}
          aria-controls={`${base}-panel-${item().id}`} aria-selected={props.value === item().id ? 'true' : 'false'}
          disabled={item().disabled} tabindex={tabStop() === item().id ? 0 : -1}
          onFocus={() => setFocused(item().id)} onClick={() => props.onChange(item().id)}>
          <Show when={item().glyph}>{glyph => <Icon glyph={glyph()} />}</Show>{item().label}
        </button>
      }</For>
    </div>
    <For each={props.items} keyed={item => item.id}>{item =>
      <div role="tabpanel" class={styles.content} id={`${base}-panel-${item().id}`}
        aria-labelledby={`${base}-tab-${item().id}`} hidden={props.value !== item().id} tabindex={0}>
        <Show when={props.value === item().id}>{item().content()}</Show>
      </div>
    }</For>
  </div>
}
