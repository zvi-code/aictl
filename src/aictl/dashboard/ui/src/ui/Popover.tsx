import { createSignal, createUniqueId } from 'solid-js'
import type { JSX } from '@solidjs/web'
import styles from './Popover.module.css'

export function Popover(props: { label: string; title: string; children: JSX.Element; disabled?: boolean }) {
  const id = createUniqueId()
  const [open, setOpen] = createSignal(false)
  return <>
    <button type="button" class={styles.button} popovertarget={id} disabled={props.disabled}
      aria-controls={id} aria-expanded={open() ? 'true' : 'false'}>{props.label}</button>
    <section id={id} popover="auto" class={styles.surface} aria-labelledby={`${id}-title`}
      onToggle={event => setOpen(event.newState === 'open')}>
      <strong id={`${id}-title`}>{props.title}</strong>
      <div class={styles.content}>{props.children}</div>
      <button type="button" class={styles.button} popovertarget={id} popovertargetaction="hide">Close {props.title}</button>
    </section>
  </>
}
