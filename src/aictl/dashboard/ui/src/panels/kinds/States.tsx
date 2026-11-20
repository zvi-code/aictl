import { createMemo, Show, type Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { PanelState } from '../../ui/PanelState'
import type { Read } from '../types'
import styles from './kinds.module.css'

export function States(props: {
  result: Accessor<Read>; empty?: string; retry: () => void; children: JSX.Element; reserveStaleSpace?: boolean
}) {
  const state = () => props.result().state
  const stale = () => state() === 'stale'
  const usable = () => state() === 'ready' || stale()
  const notice = createMemo<string | undefined>(previous => {
    if (!usable()) return undefined
    if (!stale()) return previous
    const message = props.result().message
    return message ? `Showing the last available data: ${message}` : undefined
  })
  return <>
    <Show when={usable()} fallback={<PanelState state={state() as 'loading' | 'empty' | 'error' | 'unavailable'}
      message={props.result().message ?? (state() === 'empty' ? props.empty : undefined)}
      onRetry={state() === 'error' ? props.retry : undefined} />}>
      <Show when={stale() || props.reserveStaleSpace}>
        <div class={styles.staleNotice} aria-hidden={stale() ? undefined : 'true'}>
          <PanelState state="stale" inline message={notice()} updatedAt={props.result().updatedAt} />
        </div>
      </Show>
      {props.children}
    </Show>
  </>
}
