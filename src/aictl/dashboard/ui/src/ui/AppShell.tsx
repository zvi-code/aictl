import { createUniqueId } from 'solid-js'
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
  return <div class={styles.shell}>
    <a class={styles.skip} href={`#${main}`}>Skip to main content</a>
    <header class={styles.header}>
      <strong class={styles.title}>{props.title}</strong>
      {props.navigation}
      <div class={styles.actions}>{props.actions}</div>
    </header>
    <main id={main} tabindex={-1} class={styles.main}>{props.children}</main>
    {props.status && <footer class={styles.footer}>{props.status}</footer>}
  </div>
}
