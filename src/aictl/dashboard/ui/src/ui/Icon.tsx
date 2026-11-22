import { For, Show } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import type { Activity } from 'lucide'
import { glyphs, type Glyph } from './glyphs'
import styles from './Icon.module.css'

export type { Glyph }

export function Icon(props: { data?: typeof Activity; glyph?: Glyph; label?: string; small?: boolean }) {
  return <svg class={props.small ? styles.small : styles.icon} viewBox={props.glyph ? '0 0 16 16' : '0 0 24 24'} fill="none" stroke="currentColor"
    stroke-width={props.glyph ? 1.5 : 2} stroke-linecap="round" stroke-linejoin="round"
    role={props.label ? 'img' : undefined} aria-label={props.label} aria-hidden={props.label ? undefined : 'true'}>
    <Show when={props.glyph} fallback={<For each={props.data ?? []}>{([tag, attributes]) =>
      <Dynamic component={tag as 'path'} {...attributes} />
    }</For>}>{glyph => <path d={glyphs[glyph()]} />}</Show>
  </svg>
}
