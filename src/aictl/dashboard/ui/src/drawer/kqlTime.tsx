import { createEffect, createSignal, untrack } from 'solid-js'
import styles from './drawer.module.css'

const zoneless = /^(\d{4}-\d\d-\d\d)(?:[ T](\d\d:\d\d(?::\d\d(?:\.\d+)?)?))?$/

/** The Unix seconds of an ISO date-time (UTC unless it names a zone) or of a plain count of seconds; undefined if neither. */
export function secondsOf(text: string): number | undefined {
  const value = text.trim()
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value)
  const bare = zoneless.exec(value)
  const ms = Date.parse(bare ? `${bare[1]}T${bare[2] ?? '00:00:00'}Z` : value)
  return Number.isFinite(ms) && ms >= 0 ? ms / 1000 : undefined
}

/** The ISO UTC date-time of Unix seconds, to the second unless the time has milliseconds; '' for no time. */
export function isoOf(seconds: string | number | null | undefined): string {
  if (seconds == null || seconds === '') return ''
  const value = Number(seconds)
  if (!Number.isFinite(value) || value < 0) return String(seconds)
  return new Date(Math.round(value * 1000)).toISOString().replace(/\.000Z$/, 'Z')
}

/**
 * A time bound the user reads and types as an ISO date-time. The query takes Unix seconds, so `seconds`
 * and `change` carry those; a raw number typed here is accepted and shown as a date-time on leaving the field.
 */
export function TimeField(props: { label: string; seconds: string; open?: string; change: (seconds: string) => void }) {
  const [text, setText] = createSignal(isoOf(props.seconds))
  const [invalid, setInvalid] = createSignal(false)
  // A bound set elsewhere (the applied Flow filters) replaces what the field shows.
  createEffect(() => props.seconds, seconds => {
    if (secondsOf(untrack(text)) !== (seconds === '' ? undefined : Number(seconds))) { setText(isoOf(seconds)); setInvalid(false) }
  })
  const edit = (value: string) => {
    setText(value)
    const parsed = value.trim() === '' ? '' : secondsOf(value)
    setInvalid(parsed === undefined)
    if (parsed !== undefined) props.change(String(parsed))
  }
  return <label class={styles.field}>{props.label}
    <input value={text()} placeholder={props.open ?? 'YYYY-MM-DDThh:mm:ssZ'} aria-invalid={invalid() ? 'true' : undefined}
      title={invalid() ? 'Not a date-time: write 2026-11-23T10:15:00Z, or Unix seconds' : 'UTC; a Unix time in seconds is accepted'}
      onInput={event => edit(event.currentTarget.value)}
      onBlur={() => { if (!invalid()) setText(isoOf(props.seconds)) }} />
  </label>
}
