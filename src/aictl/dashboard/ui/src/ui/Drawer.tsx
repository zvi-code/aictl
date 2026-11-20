import { createEffect, createUniqueId, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { X } from 'lucide'
import { Icon } from './Icon'
import styles from './Drawer.module.css'

export function Drawer(props: {
  id?: string
  title: string
  open: boolean
  onClose: () => void
  children: JSX.Element
}) {
  const title = createUniqueId()
  let close!: HTMLButtonElement
  createEffect(() => props.open, open => {
    if (!open) return
    const previous = document.activeElement
    close.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  })
  return <aside id={props.id} class={styles.drawer} aria-labelledby={title} hidden={!props.open}
    onKeyDown={event => {
      if (event.defaultPrevented || event.key !== 'Escape') return
      event.stopPropagation()
      props.onClose()
    }}>
    <header class={styles.header}>
      <h3 id={title}>{props.title}</h3>
      <button ref={close} type="button" class={styles.close} aria-label={`Close ${props.title}`}
        onClick={() => props.onClose()}><Icon data={X} /></button>
    </header>
    <div class={styles.body}><Show when={props.open}>{props.children}</Show></div>
  </aside>
}
