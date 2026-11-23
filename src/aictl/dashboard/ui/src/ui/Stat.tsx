import { Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { fmtNum } from '../design/format'
import styles from './Stat.module.css'

export function Stat(props: {
  label: string
  value?: string | number | null
  unit?: string
  detail?: JSX.Element
  tone?: 'neutral' | 'positive' | 'warning'
}) {
  return <dl class={styles.stat} data-tone={props.tone ?? 'neutral'}>
    <dt>{props.label}</dt>
    <dd class={styles.value}>
      <Show when={props.value != null} fallback={<span class={styles.missing}>Not available from this source</span>}>
        {typeof props.value === 'number' ? fmtNum(props.value) : props.value}
        <Show when={props.unit}>{' '}<span class={styles.unit}>{props.unit}</span></Show>
      </Show>
    </dd>
    {props.detail && <dd class={styles.detail}>{props.detail}</dd>}
  </dl>
}
