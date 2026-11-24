import { createUniqueId, onCleanup } from 'solid-js'
import type { JSX } from '@solidjs/web'
import styles from './AppShell.module.css'

export function AppShell(props: {
  title: string
  /** What sits before the title, in the top-left corner. */
  lead?: JSX.Element
  /** Makes the title a button: the way to the first screen. `current` marks it as the screen shown. */
  home?: { open: () => void; current: boolean; label: string }
  navigation?: JSX.Element
  /** What sits in the middle of the top row, between the navigation and the actions: the screen's own search and filters. */
  center?: JSX.Element
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
      {props.lead}
      {props.home
        ? <button type="button" class={styles.home} title={props.home.label} aria-label={props.home.label}
            aria-current={props.home.current ? 'page' : undefined} onClick={() => props.home!.open()}>
            <strong class={styles.title}>{props.title}</strong></button>
        : <strong class={styles.title}>{props.title}</strong>}
      {props.navigation}
      <div class={styles.center}>{props.center}</div>
      <div class={styles.actions}>{props.actions}</div>
    </header>
    <main id={main} tabindex={-1} class={styles.main}>{props.children}</main>
    {props.status && <footer class={styles.footer}>{props.status}</footer>}
  </div>
}
