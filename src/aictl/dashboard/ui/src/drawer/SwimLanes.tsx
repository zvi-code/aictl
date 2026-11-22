import { createMemo, For } from 'solid-js'
import { stamp } from '../design/format'
import { Icon, type Glyph } from '../ui/Icon'
import { clockTime, describe, eventIdentity, kindOf, laneOf, lanesOf, type PlacedEvent } from './flowModel'
import { EventPreview, kindGlyphs, type Hover } from './FlowParts'
import { VirtualList } from './VirtualList'
import styles from './flow.module.css'

const laneGlyphs: Record<string, Glyph> = {
  User: 'prompts', Assistant: 'bot', Model: 'spark', Tools: 'tools', Subagents: 'agents', Hooks: 'hook', Session: 'dots',
}

export function SwimLanes(props: {
  events: readonly PlacedEvent[]; grouped: boolean; selected?: string; select: (id: string) => void
  hover: Hover; reveal?: { id: string }; onStart: () => void; onRange: (first: number, last: number) => void
}) {
  const lanes = createMemo(() => lanesOf(props.events, props.grouped))
  const positions = createMemo(() => new Map(lanes().map((name, index) => [name, index + 2])))
  return <div class={styles.lanes} role="region" aria-label="Session streams" tabindex={0}>
    <div class={styles.laneGrid} style={{ '--lane-count': lanes().length }}>
      <div class={styles.laneHeader}>
        <span><span>Time</span></span>
        <For each={lanes()}>{name =>
          <span title={name}><Icon glyph={laneGlyphs[name.split(' · ', 1)[0]] ?? 'dots'} small /><span>{name}</span></span>
        }</For>
      </div>
      <VirtualList label="Swim-lane events" class={styles.laneList} rows={props.events} identity={eventIdentity} estimate={36} end
        reveal={props.reveal} onStart={props.onStart} onRange={props.onRange}>
        {event => {
          const from = () => laneOf(event()._from, props.grouped)
          const to = () => laneOf(event()._to, props.grouped)
          const fromCol = () => positions().get(from()) ?? 2
          const toCol = () => positions().get(to()) ?? 2
          const id = () => eventIdentity(event())
          const kind = () => kindOf(event())
          return <div class={styles.laneRow} data-kind={kind()}>
            <time class={styles.laneTime}>{clockTime(event().ts)}</time>
            <span class={styles.laneEdge} aria-hidden="true" hidden={fromCol() === toCol()}
              data-direction={fromCol() <= toCol() ? 'right' : 'left'}
              style={{ 'grid-column': `${Math.min(fromCol(), toCol())} / ${Math.max(fromCol(), toCol()) + 1}`,
                '--span': Math.abs(toCol() - fromCol()) + 1 }} />
            <button type="button" class={styles.laneEvent} style={{ 'grid-column': toCol() }}
              aria-pressed={props.selected === id() ? 'true' : 'false'}
              aria-label={`${stamp(event().ts, true)} · ${from()} to ${to()} · ${describe(event())}`}
              {...props.hover.bind(() => <EventPreview event={event()} />)}
              onClick={() => props.select(id())}><Icon glyph={kindGlyphs[kind()]} small /><span>{describe(event())}</span></button>
          </div>
        }}
      </VirtualList>
    </div>
  </div>
}
