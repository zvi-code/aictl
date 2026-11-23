import { Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { fmtNum } from '../design/format'
import styles from './Meter.module.css'

export type MeterTone = 'neutral' | 'positive' | 'warning' | 'danger'

export function Meter(props: {
  label: string
  labelContent?: JSX.Element
  value?: number | null
  max?: number
  display?: string
  exactDisplay?: string
  tone?: MeterTone
  stale?: boolean
  compact?: boolean
}) {
  const max = () => props.max ?? 100
  const valid = () => props.value != null && Number.isFinite(props.value) && props.value >= 0
  const display = () => valid() ? props.display ?? `${fmtNum(props.value!)}${props.max == null ? '%' : ''}`
    : 'Not available from this source'
  return <div class={styles.meter} data-tone={props.tone ?? 'neutral'} data-compact={props.compact || undefined}>
    <div class={styles.readout}>
      <span class={styles.label} title={props.label}>{props.labelContent ?? props.label}</span>
      <strong title={props.exactDisplay}>
        <Show when={valid() && props.exactDisplay} fallback={display()}>{exact => <>
          <span class={styles.short}>{display()}</span><span class={styles.exact}>{exact()}</span>
        </>}</Show>{props.stale ? ' · Stale' : ''}
      </strong>
    </div>
    <div class={styles.track}>
      <Show when={valid() && Number.isFinite(max()) && max() > 0 && props.value! <= max()}>
        <meter aria-label={props.label} aria-valuetext={`${props.exactDisplay ?? display()}${props.stale ? ' · Stale' : ''}`}
          min={0} max={max()} value={props.value!}>{display()}</meter>
      </Show>
    </div>
  </div>
}
