import { Show } from 'solid-js'
import styles from './Meter.module.css'

export type MeterTone = 'neutral' | 'positive' | 'warning' | 'danger'
const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })

export function Meter(props: {
  label: string
  value?: number | null
  max?: number
  display?: string
  tone?: MeterTone
  stale?: boolean
  compact?: boolean
}) {
  const max = () => props.max ?? 100
  const valid = () => props.value != null && Number.isFinite(props.value) && props.value >= 0
  const display = () => valid() ? props.display ?? `${format.format(props.value!)}${props.max == null ? '%' : ''}`
    : 'Not available from this source'
  return <div class={styles.meter} data-tone={props.tone ?? 'neutral'} data-compact={props.compact || undefined}>
    <div class={styles.readout}>
      <span class={styles.label} title={props.label}>{props.label}</span>
      <strong>{display()}{props.stale ? ' · Stale' : ''}</strong>
    </div>
    <div class={styles.track}>
      <Show when={valid() && Number.isFinite(max()) && max() > 0 && props.value! <= max()}>
        <meter aria-label={props.label} aria-valuetext={props.stale ? `${display()} · Stale` : display()}
          min={0} max={max()} value={props.value!}>{display()}</meter>
      </Show>
    </div>
  </div>
}
