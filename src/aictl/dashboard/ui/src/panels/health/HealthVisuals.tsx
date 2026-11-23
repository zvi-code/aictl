import { createMemo, For, Show } from 'solid-js'
import { BarPlot } from '../kinds/BarPlot'
import { PanelState } from '../../ui/PanelState'
import { Stat } from '../../ui/Stat'
import { Meter } from '../../ui/Meter'
import { finite, NA, NA_REASON } from './healthModel'
import styles from './Health.module.css'

const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })
export const perMinute = (rate: unknown) => finite(rate) ? rate * 60 : undefined
export const percentOf = (value: unknown, total: unknown) =>
  finite(value) && finite(total) && total > 0 && value >= 0 && value <= total ? 100 * value / total : undefined
export const totalOf = (values: unknown[] | undefined) =>
  values?.every(finite) ? values.reduce((total, value) => total + value, 0) : undefined

type Tone = 'neutral' | 'positive' | 'warning'
type Metric = { label: string; value?: unknown; unit?: string; tone?: Tone; detail?: string }

export function StatTiles(props: { items: readonly Metric[] }) {
  return <div class={styles.stats}><For each={props.items} keyed={item => item.label}>{item => {
    const value = () => {
      const current = item().value
      return typeof current === 'string' || finite(current) ? current : undefined
    }
    // A value the source does not report reads "n/a"; the reason is in the hover text.
    return <div class={styles.tile} title={value() === undefined ? `${item().label}: ${NA_REASON}` : item().detail}>
      <Stat label={item().label} value={value() ?? NA} unit={value() === undefined ? undefined : item().unit} tone={item().tone} detail={item().detail} />
    </div>
  }}</For></div>
}

type ComparisonItem = { id: string; label: string; value?: number | null }
const MAX_BARS = 8

export function HealthComparison(props: { id: string; label: string; unit: string; window?: string; items?: readonly ComparisonItem[] }) {
  const rows = createMemo(() => (props.items ?? []).filter(row => finite(row.value) && row.value >= 0)
    .sort((a, b) => b.value! - a.value! || a.label.localeCompare(b.label)).slice(0, MAX_BARS))
  const points = createMemo(() => rows().map(({ value }, i) => ({ x: i + 1, values: [value!] })))
  return <Show when={rows().length} fallback={<PanelState state="unavailable" inline />}>
    <section class={styles.comparison} aria-label={props.label}>
      <Show when={rows().length > 1} fallback={
        <Stat label={`${props.label}: ${rows()[0]?.label}`} value={rows()[0]?.value} unit={props.unit} />
      }>
        <div class={styles.chart} data-health-chart={props.id}>
          <BarPlot label={props.label} description={`Up to ${MAX_BARS} reporting items · ${props.unit}${props.window ? ` · ${props.window}` : ''}`}
            points={points()} xAxis="number" />
        </div>
        <ol class={styles.chartKey}><For each={rows()} keyed={row => row.id}>{row =>
          <li><span>{row().label}</span> <strong>{format.format(row().value!)} {props.unit}</strong></li>
        }</For></ol>
      </Show>
    </section>
  </Show>
}

/** A meter for a reported value; a value the source does not report reads "n/a" on one short line. */
export function HealthMeter(props: Parameters<typeof Meter>[0]) {
  const valid = () => props.value != null && Number.isFinite(props.value) && props.value >= 0
  return <Show when={valid()} fallback={
    <div class={styles.line} title={`${props.label}: ${NA_REASON}`}><span class={styles.note}>{props.label}</span> <strong>{NA}</strong></div>
  }><Meter {...props} /></Show>
}
