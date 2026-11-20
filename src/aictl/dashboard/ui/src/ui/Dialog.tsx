import { createEffect, createUniqueId, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import styles from './Dialog.module.css'

export function Dialog(props: {
  id?: string
  title: string
  open: boolean
  onClose: () => void
  onShow?: () => void
  children: JSX.Element
  actions?: JSX.Element
  blockClose?: boolean
}) {
  const title = createUniqueId()
  let dialog!: HTMLDialogElement
  createEffect(() => props.open, open => {
    if (open && !dialog.open) {
      dialog.showModal()
      props.onShow?.()
    }
    if (!open && dialog.open) dialog.close()
  })
  return <dialog ref={dialog} id={props.id} class={styles.dialog} aria-labelledby={title}
    onCancel={event => { if (props.blockClose) event.preventDefault() }}
    onClose={() => { if (props.open && !dialog.open) props.onClose() }}>
    <h3 id={title} class={styles.title}>{props.title}</h3>
    <Show when={props.open}>{props.children}</Show>
    <footer class={styles.actions}>
      <button type="button" class={styles.close} autofocus disabled={props.blockClose} onClick={() => props.onClose()}>Close</button>
      {props.actions}
    </footer>
  </dialog>
}
