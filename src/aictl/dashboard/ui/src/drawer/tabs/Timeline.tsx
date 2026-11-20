import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { FlowEvent } from '../../data/contract.gen'
import { fmtDur, fmtN, stamp } from '../../design/format'
import { PanelState } from '../../ui/PanelState'
import { Segmented } from '../../ui/Segmented'
import { Tooltip } from '../../ui/Tooltip'
import { describe, flowModel } from '../flowModel'
import { watchedDetail } from '../liveAgent'
import { agentPath, openAgent, Resource, Section, Stats, type TabProps } from '../shared'
import { entityOf, slotsOf, tokensFor, type TokenMode } from '../timelineModel'
import { VirtualList } from '../VirtualList'
import styles from '../drawer.module.css'

export default function Timeline(props: TabProps) {
  const read = watchedDetail(untrack(() => props.shell.ctx), 'flow', createMemo(() => props.entry.id),
    createMemo(() => agentPath(props, '/flow')), () => true)
  const [mode, setMode] = createSignal<TokenMode>('all')
  const [hidden, setHidden] = createSignal<ReadonlySet<string>>(new Set())
  const toggle = (id: string) => setHidden(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  return <Resource read={read}>{data => {
    const events = createMemo(() => flowModel(data().turns, data().summary).events)
    const entities = createMemo(() => [...new Set(events().map(entityOf))].sort())
    const shown = createMemo(() => events().filter(event => !hidden().has(entityOf(event))))
    const rows = createMemo(() => slotsOf(shown()))
    const max = createMemo(() => Math.max(1, ...shown().map(event => tokensFor(event, mode()) ?? 0)))
    return <Section title="Timeline">
      <Stats items={[
        { label: 'Duration', value: data().summary?.duration_s == null ? undefined : fmtDur(data().summary.duration_s) },
        { label: 'Shown', value: shown().length }, { label: 'Retained events', value: events().length },
        { label: 'Omitted earlier events', value: data().summary?.omitted_events },
      ]} />
      <div class={styles.bar}>
        <Segmented label="Timeline tokens" value={mode()} onChange={value => setMode(value as TokenMode)} options={[
          { id: 'all', label: 'All tokens' }, { id: 'fresh', label: 'Not cached' }, { id: 'cached', label: 'Cached only' },
        ]} />
        <button type="button" class={styles.button} onClick={() => setHidden(new Set<string>())}>All entities</button>
        <button type="button" class={styles.button} onClick={() => setHidden(new Set(entities()))}>No entities</button>
      </div>
      <div class={styles.bar} role="group" aria-label="Show or hide entities"><For each={entities()}>{name =>
        <button type="button" class={styles.button} aria-pressed={hidden().has(name) ? 'false' : 'true'}
          onClick={() => toggle(name)}>{name}</button>
      }</For></div>
      <Show when={rows().length} fallback={<PanelState state="empty" message="No event matches these filters." />}>
        <VirtualList label="Events by time" rows={rows()} identity={row => row.id} estimate={42}>{slot =>
          <Show when={(slot() as { event?: FlowEvent }).event}
            fallback={<div class={styles.gap}>{'gap' in slot() && fmtDur((slot() as { gap: number }).gap)} without events</div>}>{event => {
            const value = () => tokensFor(event(), mode())
            const cached = () => mode() === 'all' ? tokensFor(event(), 'cached') : undefined
            const label = () => `${entityOf(event())} at ${stamp(event().ts, true)}`
            return <Tooltip text={describe(event())} class={styles.timeBar}
              label={`${label()}, ${value() == null ? 'tokens not recorded' : `${fmtN(value())} tokens`}`}
              onClick={() => openAgent(props, props.entry.id, 'flow', event().step_key
                ? { flowRef: { field: 'step_key', id: event().step_key! } } : undefined)}>
                <span>{label()}</span>
                <span class={styles.timeTrack}>
                  <span class={styles.timeValue} style={{ width: `${value() == null ? 0 : Math.log1p(value()!) / Math.log1p(max()) * 100}%` }}>
                    <span style={{ width: `${value() && cached() ? cached()! / value()! * 100 : 0}%` }} />
                  </span>
                </span>
                <span>{value() == null ? 'Not available' : fmtN(value())}</span>
            </Tooltip>
          }}</Show>
        }</VirtualList>
        <p class={styles.muted}>Bars use a logarithmic token scale. Shading shows cached tokens. Pauses over 30 s are folded.</p>
      </Show>
    </Section>
  }}</Resource>
}
