// ─── "Colour by": one chart, two encodings ─
// A view whose bars have parts of their own (main agent and subagents, thinking and tool calls) and also a split by
// repository draws each bar once, coloured by one of the two. The choice is kept in the address (`by=repo`), so a link
// opens the view as it was seen; without `by` the view colours by its own parts.
import { createSignal, Show, type Accessor } from 'solid-js'
import { writeUrl } from '../../../data/urlState'
import { Segmented } from '../../../ui/Segmented'
import styles from './ColourBy.module.css'

export type ColourMode = 'parts' | 'repo'

/** The URL value of the choice: `by=repo`, or no `by` for the view's own parts. */
export function readColourBy(search: string): ColourMode {
  return new URLSearchParams(search || '').get('by') === 'repo' ? 'repo' : 'parts'
}

/** The view's choice, read once from the address and written back to it (replacing the entry, no history step). */
export function useColourBy(): [Accessor<ColourMode>, (mode: ColourMode) => void] {
  const [mode, setMode] = createSignal<ColourMode>(readColourBy(typeof location === 'undefined' ? '' : location.search))
  return [mode, next => { setMode(next); writeUrl({ by: next === 'repo' ? 'repo' : null }) }]
}

/**
 * The switch above a view's charts: "Colour by: <parts> | Repository". Drawn only when the answer carries a split by
 * repository (`split`); without one the view keeps its own parts and shows no switch.
 */
export function ColourBy(props: { parts: string; value: ColourMode; onChange: (mode: ColourMode) => void; split: boolean }) {
  return <Show when={props.split}>
    <div class={styles.switch} data-colour-by={props.value}>
      <span class={styles.label} aria-hidden="true">Colour by</span>
      <Segmented label="Colour by" value={props.value} onChange={id => props.onChange(id === 'repo' ? 'repo' : 'parts')}
        options={[{ id: 'parts', label: props.parts }, { id: 'repo', label: 'Repository' }]} />
    </div>
  </Show>
}
