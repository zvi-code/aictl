import { For, Show } from 'solid-js'
import { Icon, type Glyph } from './Icon'
import { moveFocus } from './keyboard'
import styles from './Segmented.module.css'

export type Choice = { id: string; label: string; disabled?: boolean; glyph?: Glyph }

export function Segmented(props: {
  label: string
  options: readonly Choice[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const tabStop = () => props.options.find(option => !option.disabled && option.id === props.value)?.id
    ?? props.options.find(option => !option.disabled)?.id
  return <div role="radiogroup" aria-label={props.label} aria-disabled={props.disabled ? 'true' : undefined} class={styles.group}
    onKeyDown={event => {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown'
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
      moveFocus(event, buttons, vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft',
        vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight')?.click()
    }}>
    <For each={props.options} keyed={option => option.id}>{option =>
      <button type="button" class={props.value === option().id ? styles.selected : styles.option}
        role="radio" aria-checked={props.value === option().id ? 'true' : 'false'} tabindex={option().id === tabStop() ? 0 : -1}
        disabled={props.disabled || option().disabled} onClick={() => props.onChange(option().id)}>
        <Show when={option().glyph}>{glyph => <Icon glyph={glyph()} small />}</Show>{option().label}
      </button>
    }</For>
  </div>
}
