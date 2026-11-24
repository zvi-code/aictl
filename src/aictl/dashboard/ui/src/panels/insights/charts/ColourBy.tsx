// The switch above a view's charts: colour the bars by the view's own parts, or by repository. One encoding and one
// legend at a time. The choice is kept in the address (`by=repo`; the view's own parts when absent).
import { createSignal } from 'solid-js'
import { Segmented } from '../../../ui/Segmented'
import type { PanelContext } from '../../types'
import styles from './ColourBy.module.css'

export type ColourMode = 'own' | 'repo'

/** The mode the address names: `by=repo` is the repository, anything else the view's own parts. */
export function readColourBy(search: string): ColourMode {
  return new URLSearchParams(search).get('by') === 'repo' ? 'repo' : 'own'
}

/**
 * The mode of one view: read from the address when the view opens, written back on every change. The view is not
 * handed the address, so it reads `location.search` once and keeps the choice in a signal from then on.
 */
export function colourByState(ctx: PanelContext) {
  const [mode, setMode] = createSignal<ColourMode>(readColourBy(typeof location === 'undefined' ? '' : location.search))
  const choose = (next: ColourMode) => {
    setMode(next)
    ctx.navigate({ by: next === 'repo' ? 'repo' : null })
  }
  return [mode, choose] as const
}

/** "Colour by: <own> | Repository", a real radio group of buttons. */
export function ColourBy(props: { own: string; value: ColourMode; onChange: (mode: ColourMode) => void }) {
  return <div class={styles.switch} data-colour-by={props.value}>
    <span class={styles.label} aria-hidden="true">Colour by</span>
    <Segmented label="Colour by" value={props.value} onChange={id => props.onChange(id === 'repo' ? 'repo' : 'own')}
      options={[{ id: 'own', label: props.own }, { id: 'repo', label: 'Repository' }]} />
  </div>
}
