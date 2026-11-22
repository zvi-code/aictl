import { createSignal, createUniqueId } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Icon, type Glyph } from './Icon'
import styles from './Popover.module.css'

export function Popover(props: { label: string; title: string; children: JSX.Element; disabled?: boolean; glyph?: Glyph; text?: string }) {
  const id = createUniqueId()
  const [open, setOpen] = createSignal(false)
  return <>
    <button type="button" class={props.glyph ? props.text ? styles.button : styles.iconButton : styles.button} popovertarget={id} disabled={props.disabled}
      title={props.glyph && !props.text ? props.label : undefined}
      aria-controls={id} aria-expanded={open() ? 'true' : 'false'}>{props.glyph ? <><Icon glyph={props.glyph} />{props.text ?? <span class={styles.srOnly}>{props.label}</span>}</> : props.label}</button>
    <section id={id} popover="auto" class={styles.surface} aria-labelledby={`${id}-title`}
      onToggle={event => setOpen(event.newState === 'open')}>
      <strong id={`${id}-title`}>{props.title}</strong>
      <div class={styles.content}>{props.children}</div>
      <button type="button" class={styles.close} popovertarget={id} popovertargetaction="hide">Close {props.title}</button>
    </section>
  </>
}
