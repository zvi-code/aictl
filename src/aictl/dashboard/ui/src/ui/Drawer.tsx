import { createEffect, createSignal, createUniqueId, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { X } from 'lucide'
import { Icon } from './Icon'
import styles from './Drawer.module.css'

export function Drawer(props: {
  id?: string
  title: string
  open: boolean
  onClose: () => void
  onEscape?: () => void
  actions?: JSX.Element
  metadata?: JSX.Element
  resizable?: boolean
  children: JSX.Element
}) {
  const title = createUniqueId()
  const [width, setWidth] = createSignal(storedWidth())
  let close!: HTMLButtonElement, frame!: HTMLElement
  const resize = (next?: number) => {
    const value = next == null ? undefined : Math.round(Math.max(Math.min(352, innerWidth), Math.min(innerWidth, next)))
    setWidth(value)
    try {
      if (value == null) localStorage.removeItem(widthKey)
      else localStorage.setItem(widthKey, String(value))
    } catch { /* Width still works for the open page. */ }
  }
  createEffect(() => props.open, open => {
    if (!open) return
    const previous = document.activeElement
    close.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  })
  return <aside ref={frame} id={props.id} class={styles.drawer} aria-labelledby={title} hidden={!props.open}
    style={props.resizable ? { '--drawer-width': width() ? `${width()}px` : '64rem' } : undefined}
    onKeyDown={event => {
      if (event.defaultPrevented || event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      ;(props.onEscape ?? props.onClose)()
    }}>
    <Show when={props.resizable}><div class={styles.grip} role="separator" aria-label="Drawer width"
      aria-orientation="vertical" aria-valuenow={width() ?? undefined} tabindex={0}
      onDblClick={() => resize()}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return
        event.preventDefault()
        resize(event.key === 'Home' ? undefined : frame.getBoundingClientRect().width + (event.key === 'ArrowLeft' ? 32 : -32))
      }}
      onPointerDown={event => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(frame.getBoundingClientRect().right - event.clientX)
      }} /></Show>
    <header class={styles.header}>
      <h3 id={title}>{props.title}</h3>
      <div class={styles.actions}>{props.actions}<button ref={close} type="button" class={styles.close}
        aria-label={props.resizable ? 'Close' : `Close ${props.title}`} onClick={() => props.onClose()}><Icon data={X} /></button></div>
      <Show when={props.metadata}><div class={styles.metadata}>{props.metadata}</div></Show>
    </header>
    <div class={styles.body} role="region" aria-label="Drawer content" tabindex={0}><Show when={props.open}>{props.children}</Show></div>
  </aside>
}

const widthKey = 'aictl.drawer.width'
function storedWidth() {
  try {
    const width = Number(localStorage.getItem(widthKey))
    return Number.isFinite(width) && width > 0 ? width : undefined
  } catch { return undefined }
}
