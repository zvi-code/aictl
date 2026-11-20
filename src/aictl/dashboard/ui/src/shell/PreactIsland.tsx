import { createEffect, onCleanup } from 'solid-js'
import { h, render, type ComponentType } from 'preact'
import type { LiveClient } from '../data/live'
import { LiveProvider } from '../live/context'
import './island.css'
import styles from './Shell.module.css'

export function PreactIsland<P extends object>(props: {
  component: ComponentType<P>; values: P; client: LiveClient; local: boolean
  theme: string; density: string; drawer?: boolean
}) {
  let host!: HTMLDivElement
  createEffect(() => ({ component: props.component, values: props.values, client: props.client, local: props.local }), value => {
    render(h(LiveProvider, { controller: value.client, enabled: value.local, manageConnection: false },
      h(value.component, value.values)), host)
  })
  onCleanup(() => render(null, host))
  return <div ref={host} class={`bd-app ${styles.island}`} data-drawer={props.drawer ? '' : undefined}
    data-theme={props.theme} data-density={props.density} />
}
