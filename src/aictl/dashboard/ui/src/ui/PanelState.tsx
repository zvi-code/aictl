import { createEffect, createSignal, Show } from 'solid-js'
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

const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })
const dayAndClock = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' })
const units = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]] as const

export function Freshness(props: { updatedAt?: number | null, compact?: boolean }) {
  const [now, setNow] = createSignal(Date.now() / 1000)
  const updated = () => {
    const ts = props.updatedAt
    return typeof ts === 'number' && ts > 0 && ts <= 8.64e12 ? new Date(ts * 1000) : undefined
  }
  createEffect(updated, date => {
    if (!date) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const current = Date.now() / 1000
      setNow(current)
      timer = setTimeout(tick, Math.abs(current - date.getTime() / 1000) < 60 ? 1000 : 30_000)
    }
    tick()
    return () => clearTimeout(timer)
  })
  const age = (date: Date) => Math.floor(now() - date.getTime() / 1000)
  const ageText = (date: Date) => {
    const seconds = age(date)
    if (seconds < 0) return 'source clock is ahead'
    const [unit, scale] = units.find(([, size]) => seconds >= size) ?? units[3]
    return seconds === 0 ? 'just now' : relative.format(-Math.floor(seconds / scale), unit)
  }
  return <span class={styles.freshness}>Last updated<Show when={updated()} fallback=": unknown">{date =>
    <Show when={!props.compact} fallback={<> <time datetime={date().toISOString()} title={dayAndClock.format(date())}>{ageText(date())}</time></>}>
      <> <time datetime={date().toISOString()} title={dayAndClock.format(date())}>
        {(Math.abs(age(date())) >= 86400 ? dayAndClock : clock).format(date())}
      </time>{` (${ageText(date())})`}</>
    </Show>}</Show></span>
}

export function PanelState(props: {
  state: PanelStatus
  message?: string
  onRetry?: () => void
  children?: JSX.Element
  inline?: boolean
  updatedAt?: number | null
}) {
  return <div class={styles.box} data-status={props.state} data-inline={props.inline ? '' : undefined}>
    <div class={styles.notice}>
      <Icon data={states[props.state].icon} />
      <span role={props.state === 'error' ? 'alert' : 'status'}>{props.message ?? states[props.state].label}</span>
      <Show when={props.state === 'stale' && props.updatedAt != null}><Freshness compact updatedAt={props.updatedAt} /></Show>
    </div>
    <Show when={props.onRetry}>
      <button type="button" class={styles.retry} onClick={() => props.onRetry?.()}>Retry</button>
    </Show>
    <Show when={props.state === 'stale'}>{props.children}</Show>
  </div>
}
