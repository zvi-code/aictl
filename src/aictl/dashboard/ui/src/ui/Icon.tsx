import { For } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import type { Activity } from 'lucide'
import styles from './Icon.module.css'

export function Icon(props: { data: typeof Activity; label?: string }) {
  return <svg class={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width={2} stroke-linecap="round" stroke-linejoin="round"
    role={props.label ? 'img' : undefined} aria-label={props.label} aria-hidden={props.label ? undefined : 'true'}>
    <For each={props.data}>{([tag, attributes]) =>
      <Dynamic component={tag as 'path'} {...attributes} />
    }</For>
  </svg>
}
