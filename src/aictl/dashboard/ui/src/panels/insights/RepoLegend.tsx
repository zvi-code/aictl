import { For, Show } from 'solid-js'
import { repoClass } from './Bars'
import styles from './Bars.module.css'
import { repoLegend, type RepoSplit } from './repoSplit'

/**
 * The colours of the repositories on a card, placed once above its charts: each of the 8 repositories with the highest
 * list-price cost in the period, in rank order, then "Other repositories" (`other`: a bar of the card has an "other"
 * segment). The same repository has the same colour on every card of the screen.
 */
export function RepoLegend(props: { split: RepoSplit; other?: boolean }) {
  const items = () => repoLegend(props.split, props.other)
  return <Show when={items().length}>
    <ul class={styles.legend} aria-label="Repositories: colours of the bar segments" data-repo-legend>
      <For each={items()}>{item => <li title={item.title} data-repo={item.key}>
        <span class={`${styles.swatch} ${repoClass(item.colour)}`} />{item.label}
      </li>}</For>
    </ul>
  </Show>
}
