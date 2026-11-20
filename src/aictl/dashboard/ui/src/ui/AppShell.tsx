import { createUniqueId, onCleanup } from 'solid-js'
import type { JSX } from '@solidjs/web'
import styles from './AppShell.module.css'

export function AppShell(props: {
  title: string
  navigation?: JSX.Element
  actions?: JSX.Element
  status?: JSX.Element
  children: JSX.Element
}) {
  const main = createUniqueId()
  let shell!: HTMLDivElement
  const headerSize = new ResizeObserver(([entry]) => {
    const height = entry.borderBoxSize[0]?.blockSize
    if (height) shell.style.setProperty('--app-header-height', `${height}px`)
  })
  onCleanup(() => headerSize.disconnect())
  return <div class={styles.shell} ref={shell}>
    <a class={styles.skip} href={`#${main}`}>Skip to main content</a>
    <header class={styles.header} ref={header => headerSize.observe(header)}>
      <strong class={styles.title}>{props.title}</strong>
      {props.navigation}
      <div class={styles.actions}>{props.actions}</div>
    </header>
    <main id={main} tabindex={-1} class={styles.main}>{props.children}</main>
    {props.status && <footer class={styles.footer}>{props.status}</footer>}
  </div>
}
