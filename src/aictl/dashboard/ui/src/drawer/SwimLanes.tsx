import { createMemo, For } from 'solid-js'
import { stamp } from '../design/format'
import { describe, eventIdentity, laneOf, lanesOf, type PlacedEvent } from './flowModel'
import { VirtualList } from './VirtualList'
import styles from './drawer.module.css'

export function SwimLanes(props: {
  events: readonly PlacedEvent[]; grouped: boolean; selected?: string; select: (id: string) => void
}) {
  const lanes = createMemo(() => lanesOf(props.events, props.grouped))
  const positions = createMemo(() => new Map(lanes().map((name, index) => [name, index + 1])))
  return <div class={styles.lanes} role="region" aria-label="Session streams" tabindex={0}>
    <div class={styles.laneGrid} style={{ '--lane-count': lanes().length }}>
      <div class={styles.laneHeader}><For each={lanes()}>{name => <span title={name}>{name}</span>}</For></div>
      <VirtualList label="Swim-lane events" rows={props.events} identity={eventIdentity} estimate={52}>
        {event => {
          const from = () => laneOf(event()._from, props.grouped)
          const to = () => laneOf(event()._to, props.grouped)
          const fromCol = () => positions().get(from()) ?? 1
          const toCol = () => positions().get(to()) ?? 1
          const id = () => eventIdentity(event())
          return <div class={styles.laneRow}>
            <span class={styles.laneEdge} aria-hidden="true"
              data-direction={fromCol() <= toCol() ? 'right' : 'left'}
              style={{ 'grid-column': `${Math.min(fromCol(), toCol())} / ${Math.max(fromCol(), toCol()) + 1}` }} />
            <button type="button" class={styles.laneEvent} style={{ 'grid-column': toCol() }}
              aria-pressed={props.selected === id() ? 'true' : 'false'}
              aria-label={`${stamp(event().ts, true)} · ${from()} to ${to()} · ${describe(event())}`}
              onClick={() => props.select(id())}>{describe(event())}</button>
          </div>
        }}
      </VirtualList>
    </div>
  </div>
}
