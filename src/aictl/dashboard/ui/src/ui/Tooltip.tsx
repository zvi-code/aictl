import { createEffect, createSignal, createUniqueId } from 'solid-js'
import type { JSX } from '@solidjs/web'
import styles from './Tooltip.module.css'

export function Tooltip(props: {
  label: string; text: string; onClick: () => void; children?: JSX.Element; class?: string
  disabled?: boolean; pressed?: boolean; shortcut?: string
}) {
  const id = createUniqueId()
  const [hovered, setHovered] = createSignal(false)
  const [focused, setFocused] = createSignal(false)
  const [dismissed, setDismissed] = createSignal(false)
  let tip!: HTMLSpanElement
  let trigger!: HTMLButtonElement

  createEffect(() => !dismissed() && (hovered() || focused()), show => {
    if (!show) {
      tip.hidePopover()
      return
    }
    tip.showPopover({ source: trigger })
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setDismissed(true)
    }
    document.addEventListener('keydown', dismiss, true)
    return () => document.removeEventListener('keydown', dismiss, true)
  })

  return <span class={styles.wrapper}
    onPointerEnter={event => {
      if (event.pointerType === 'touch') return
      setDismissed(false)
      setHovered(true)
    }}
    onPointerLeave={() => setHovered(false)}>
    <button ref={trigger} type="button" class={props.class ?? styles.trigger} aria-label={props.children ? props.label : undefined} aria-describedby={id}
      disabled={props.disabled} aria-pressed={props.pressed == null ? undefined : props.pressed ? 'true' : 'false'}
      aria-keyshortcuts={props.shortcut} onClick={() => props.onClick()} onFocus={() => { setDismissed(false); setFocused(true) }}
      onBlur={() => setFocused(false)}>{props.children ?? props.label}</button>
    <span ref={tip} id={id} role="tooltip" popover="manual" class={styles.tip}>{props.text}</span>
  </span>
}
