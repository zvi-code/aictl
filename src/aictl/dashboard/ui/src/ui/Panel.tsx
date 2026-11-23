import { createEffect, createSignal, createUniqueId, Errored, Loading, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { PanelState } from './PanelState'
import styles from './Panel.module.css'

export function Panel(props: {
  title: string
  size?: 'small' | 'medium' | 'large'
  active?: boolean
  observeViewport?: boolean
  fill?: boolean
  flow?: boolean
  heading?: 'visible' | 'sr-only'
  height?: number
  /** The most room a flowing panel takes; its content scrolls inside beyond that. */
  maxHeight?: number
  actions?: JSX.Element
  children: JSX.Element
}) {
  const title = createUniqueId()
  const [visible, setVisible] = createSignal(false)
  const showContent = () => props.active !== false && (props.observeViewport === false || visible())
  let box!: HTMLElement
  createEffect(() => props.active !== false && props.observeViewport !== false, observe => {
    if (!observe) {
      setVisible(false)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(box)
    return () => observer.disconnect()
  })

  return <section ref={box} class={styles.panel} data-size={props.size ?? 'medium'} data-fill={props.fill ? '' : undefined}
    data-flow={props.flow ? '' : undefined} data-capped={props.maxHeight ? '' : undefined}
    style={{ 'min-block-size': props.height ? `${props.height}px` : undefined, 'max-block-size': props.maxHeight ? `${props.maxHeight}px` : undefined }}
    aria-labelledby={title}>
    <header class={styles.header}>
      <h3 id={title} class={props.heading === 'sr-only' ? styles.visuallyHidden : styles.title}>{props.title}</h3>
      {props.actions}
    </header>
    <div class={styles.content} role={props.flow ? undefined : 'region'} aria-label={props.flow ? undefined : `${props.title} content`}
      tabindex={!props.flow && showContent() ? 0 : undefined}>
      <Show when={showContent()}>
        <Errored fallback={(_error, reset) => <PanelState state="error" onRetry={reset} />}>
          <Loading fallback={<PanelState state="loading" />}>{props.children}</Loading>
        </Errored>
      </Show>
    </div>
  </section>
}
