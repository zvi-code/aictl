import { Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Activity, CircleAlert, Clock, Inbox, Info } from 'lucide'
import { Icon } from './Icon'
import styles from './PanelState.module.css'

const states = {
  loading: { label: 'Loading…', icon: Activity },
  empty: { label: 'No results', icon: Inbox },
  error: { label: 'Could not load this panel', icon: CircleAlert },
  unavailable: { label: 'Not available from this source', icon: Info },
  stale: { label: 'Showing the last available data', icon: Clock },
}

export type PanelStatus = keyof typeof states

export function PanelState(props: {
  state: PanelStatus
  message?: string
  onRetry?: () => void
  children?: JSX.Element
}) {
  return <div class={styles.box} data-status={props.state}>
    <div class={styles.notice} role={props.state === 'error' ? 'alert' : 'status'}>
      <Icon data={states[props.state].icon} />
      <span>{props.message ?? states[props.state].label}</span>
    </div>
    <Show when={props.onRetry}>
      <button type="button" class={styles.retry} onClick={() => props.onRetry?.()}>Retry</button>
    </Show>
    <Show when={props.state === 'stale'}>{props.children}</Show>
  </div>
}
