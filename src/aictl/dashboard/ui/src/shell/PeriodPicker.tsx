import { createSignal, For, Show, untrack } from 'solid-js'
import { PERIODS, periodLabel } from '../data/filters'
import type { PanelContext } from '../panels/types'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import styles from './Shell.module.css'

/**
 * The period of every screen that reads history: one control in the top row, kept in the URL key `range`, so a
 * change of screen keeps the period. `resolved` is the start the store found for "All history", when a screen has it.
 */
export function PeriodPicker(props: {
  ctx: PanelContext; custom: boolean; setCustom: (open: boolean) => void; resolved?: { since: number } | null
}) {
  const ctx = untrack(() => props.ctx)
  const [error, setError] = createSignal('')
  const date = (seconds: number | undefined) => {
    if (!seconds) return ''
    const time = new Date(seconds * 1000)
    return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  const edit = () => { setError(''); props.setCustom(true) }
  return <>
    <label class={styles.filter} data-period><Icon glyph="clock" /><span class={styles.srOnly}>Time range</span>
      <select value={ctx.filters().range.id} onChange={event => {
        const range = event.currentTarget.value
        if (range === 'custom') { edit(); event.currentTarget.value = ctx.filters().range.id }
        else ctx.navigate({ range, since: null, until: null, sel: null })
      }}>
        <For each={PERIODS}>{range => <option value={range.id}>{periodLabel(range, props.resolved)}</option>}</For>
        <option value="custom">Custom</option>
      </select><Icon glyph="down" small /></label>
    <Show when={ctx.filters().range.id === 'custom'}><button class={styles.small} type="button" onClick={edit}>Edit custom range</button></Show>
    <Dialog title="Custom time range" open={props.custom} onClose={() => props.setCustom(false)}>
      <form class={styles.form} onSubmit={event => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        const since = Math.floor(new Date(String(values.get('since'))).getTime() / 1000)
        const until = Math.floor(new Date(String(values.get('until'))).getTime() / 1000)
        if (!(since > 0 && until > since)) { setError('Enter an end time after the start time.'); return }
        ctx.navigate({ range: 'custom', since, until, sel: null })
        props.setCustom(false)
      }}>
        <label>Start <input class={styles.input} type="datetime-local" name="since" value={date(ctx.filters().range.since)} required /></label>
        <label>End <input class={styles.input} type="datetime-local" name="until" value={date(ctx.filters().range.until)} required /></label>
        <Show when={error()}><span role="alert">{error()}</span></Show>
        <button class={styles.primary} type="submit">Apply range</button>
      </form>
    </Dialog>
  </>
}
