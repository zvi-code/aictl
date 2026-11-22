import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { TurnMark } from '../data/contract.gen'
import { fmtMs, fmtN, stamp } from '../design/format'
import { CodeView } from '../ui/CodeView'
import { Icon, type Glyph } from '../ui/Icon'
import { moveFocus } from '../ui/keyboard'
import {
  clockTime, describe, durationOf, eventIdentity, eventTokens, failedEvent, inputOf, kindLabels, kindOf, outputOf,
  type EventKind, type PlacedEvent,
} from './flowModel'
import { clip } from './shared'
import { VirtualList } from './VirtualList'
import styles from './flow.module.css'

export const kindGlyphs: Record<EventKind, Glyph> = {
  prompt: 'prompts', model: 'bot', reply: 'reply', tool: 'tools', agent: 'agents', hook: 'hook', skill: 'spark',
  context: 'context', error: 'warn', other: 'dots',
}

/** Where the event goes, as "from → to", without the generic assistant hop. */
export function routeOf(event: PlacedEvent) {
  return event._from === event._to ? event._from : `${event._from} → ${event._to}`
}

function details(event: PlacedEvent) {
  const tokens = eventTokens(event)
  const duration = durationOf(event)
  return [
    event._turnIndex ? `Turn ${event._turnIndex}` : undefined,
    event.model || undefined,
    tokens ? `${fmtN(tokens)} tokens` : undefined,
    duration ? fmtMs(duration) : undefined,
    failedEvent(event) && event.type !== 'error' ? 'Failed' : undefined,
  ].filter(Boolean) as string[]
}

type HoverState = { source: HTMLElement; content: () => JSX.Element }
export type Hover = ReturnType<typeof createHover>

/** One hover card for a list of events: it opens after the pointer rests on a row and follows it. */
export function createHover(delay = 300) {
  const [current, setCurrent] = createSignal<HoverState>()
  let opening: ReturnType<typeof setTimeout> | undefined
  let closing: ReturnType<typeof setTimeout> | undefined
  const cancel = () => { clearTimeout(opening); clearTimeout(closing) }
  const hide = () => { cancel(); setCurrent(undefined) }
  // A short grace period lets the card move straight to the next row instead of waiting again.
  const leave = () => { cancel(); closing = setTimeout(() => setCurrent(undefined), delay / 3) }
  const show = (source: HTMLElement, content: () => JSX.Element) => {
    cancel()
    opening = setTimeout(() => setCurrent({ source, content }), current() ? 0 : delay)
  }
  const bind = (content: () => JSX.Element) => ({
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== 'touch') show(event.currentTarget as HTMLElement, content)
    },
    onPointerLeave: leave,
    onPointerDown: hide,
  })
  return { current, show, hide, bind }
}

export function HoverCard(props: { hover: Hover }) {
  let card!: HTMLDivElement
  createEffect(() => props.hover.current(), value => {
    if (card.matches(':popover-open')) card.hidePopover()
    if (!value?.source.isConnected) return
    card.showPopover({ source: value.source })
    const close = () => props.hover.hide()
    document.addEventListener('scroll', close, true)
    return () => document.removeEventListener('scroll', close, true)
  })
  return <div ref={card} popover="manual" aria-hidden="true" class={styles.hover}>
    {props.hover.current()?.content()}
  </div>
}

export function EventPreview(props: { event: PlacedEvent }) {
  const kind = () => kindOf(props.event)
  const input = () => inputOf(props.event)
  const output = () => outputOf(props.event)
  return <>
    <div class={styles.hoverHead} data-kind={kind()}>
      <span class={styles.kindLabel}><Icon glyph={kindGlyphs[kind()]} small />{kindLabels[kind()]}</span>
      <span class={styles.hoverHint}>{routeOf(props.event)}</span>
      <time>{clockTime(props.event.ts)}</time>
    </div>
    <p class={styles.hoverTitle}>{describe(props.event)}</p>
    <Show when={details(props.event).length}><span class={styles.hoverHint}>{details(props.event).join(' · ')}</span></Show>
    <Show when={input()}>{value => <pre class={styles.hoverText}>{clip(value(), 420)}</pre>}</Show>
    <Show when={output()}>{value => <pre class={styles.hoverText}>{clip(value(), 420)}</pre>}</Show>
    <span class={styles.hoverHint}>Select to inspect</span>
  </>
}

/**
 * A bar per turn: its width follows the number of events and its height the tokens of the turn.
 * `visible` is the time range, in seconds, of the events in view.
 */
export function TurnScrubber(props: {
  marks: readonly TurnMark[]; loadedFrom: number; visible?: readonly [number, number]
  hover: Hover; pick: (mark: TurnMark) => void
}) {
  const largest = createMemo(() => Math.max(1, ...props.marks.map(mark => mark.tokens)))
  const [focus, setFocus] = createSignal(0)
  const shown = (mark: TurnMark) => !!props.visible && mark.ts <= props.visible[1] && Math.max(mark.ts, mark.end_ts) >= props.visible[0]
  const count = (value: number, one: string, many: string) => `${fmtN(value)} ${value === 1 ? one : many}`
  const label = (mark: TurnMark) => [`Turn ${mark.turn}`, count(mark.events, 'event', 'events'), count(mark.tokens, 'token', 'tokens'),
    mark.tools ? count(mark.tools, 'tool use', 'tool uses') : '', mark.errors ? `${fmtN(mark.errors)} failed` : ''].filter(Boolean).join(' · ')
  return <section class={styles.scrubber} aria-label="Turn overview">
    <header>
      <span><strong>{fmtN(props.marks.length)} turns</strong> · bar height shows turn tokens</span>
      <span>{stamp(props.marks[0]?.ts, true)} – {stamp(props.marks.at(-1)?.end_ts, true)}</span>
    </header>
    <div class={styles.marks} role="group" aria-label="Turns" onKeyDown={event => {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
      const next = moveFocus(event, buttons, 'ArrowLeft', 'ArrowRight')
      if (next) setFocus(buttons.indexOf(next as HTMLButtonElement))
    }}>
      <For each={props.marks} keyed={mark => `${mark.turn}:${mark.offset}`}>{(mark, index) =>
        <button type="button" class={styles.mark} tabindex={index() === focus() ? 0 : -1} aria-label={label(mark())}
          style={{ '--grow': Math.max(1, mark().events), '--level': mark().tokens / largest() }}
          data-loaded={mark().offset + mark().events > props.loadedFrom ? 'true' : 'false'}
          data-visible={shown(mark()) ? 'true' : 'false'} data-errors={mark().errors ? 'true' : 'false'}
          {...props.hover.bind(() => <>
            <div class={styles.hoverHead}><strong>Turn {mark().turn}</strong><time>{clockTime(mark().ts)}</time></div>
            <Show when={mark().prompt}><p class={styles.hoverTitle}>{mark().prompt}</p></Show>
            <span class={styles.hoverHint}>{label(mark()).split(' · ').slice(1).join(' · ')}</span>
            <span class={styles.hoverHint}>Select to show this turn</span>
          </>)}
          onFocus={() => setFocus(index())} onClick={() => props.pick(mark())} />
      }</For>
    </div>
  </section>
}

/** The events in time order, newest at the end, with a heading where each turn starts. */
export function EventList(props: {
  events: readonly PlacedEvent[]; selected?: string; select: (id: string) => void; hover: Hover
  reveal?: { id: string }; onStart: () => void; onRange: (first: number, last: number) => void; empty: string
}) {
  return <Show when={props.events.length} fallback={<div class={styles.list}><p class={styles.empty}>{props.empty}</p></div>}>
    <VirtualList label="Flow events" class={styles.list} rows={props.events} identity={eventIdentity} estimate={44} end
      reveal={props.reveal} onStart={props.onStart} onRange={props.onRange}>
      {(event, index) => {
        const kind = () => kindOf(event())
        const id = () => eventIdentity(event())
        const starts = () => index() === 0 || props.events[index() - 1]?._turnIndex !== event()._turnIndex
        const side = () => {
          const tokens = eventTokens(event()), duration = durationOf(event())
          return [tokens ? `${fmtN(tokens)} tokens` : '', duration ? fmtMs(duration) : ''].filter(Boolean)
        }
        const sub = () => [routeOf(event()), event().model, failedEvent(event()) && event().type !== 'error' ? 'Failed' : '']
          .filter(Boolean).join(' · ')
        return <>
          <Show when={starts() && event()._turnIndex > 0}>
            <div class={styles.rule} data-first={index() === 0 ? 'true' : 'false'}>
              <strong>Turn {event()._turnIndex}</strong>
              <Show when={event().type === 'user_message'}><span>{stamp(event().ts, true)}</span></Show>
            </div>
          </Show>
          <button type="button" class={styles.event} data-kind={kind()} aria-pressed={props.selected === id() ? 'true' : 'false'}
            {...props.hover.bind(() => <EventPreview event={event()} />)} onClick={() => props.select(id())}>
            <time class={styles.time} datetime={new Date(event().ts * 1000).toISOString()}>{clockTime(event().ts)}</time>
            <span class={styles.chip}><Icon glyph={kindGlyphs[kind()]} small label={kindLabels[kind()]} /></span>
            <span class={styles.main}>
              <strong>{clip(describe(event()), 200)}</strong>
              <span>{sub()}</span>
            </span>
            <span class={styles.side}><For each={side()}>{value => <span>{value}</span>}</For></span>
          </button>
        </>
      }}
    </VirtualList>
  </Show>
}

export function Inspector(props: { event: PlacedEvent; close: () => void; evidence?: () => void }) {
  const kind = () => kindOf(props.event)
  const facts = createMemo(() => {
    const event = props.event
    const tokens = event.tokens
    return [
      ['Time', stamp(event.ts, true)],
      ['Duration', durationOf(event) == null ? undefined : fmtMs(durationOf(event))],
      ['Turn', event._turnIndex ? String(event._turnIndex) : undefined],
      ['Stream', routeOf(event)],
      ['Model', event.model],
      ['Input tokens', tokens?.input == null ? undefined : fmtN(tokens.input)],
      ['Output tokens', tokens?.output == null ? undefined : fmtN(tokens.output)],
      ['Cache read', tokens?.cache_read ? fmtN(tokens.cache_read) : undefined],
      ['Turn tokens', event.rt_tokens == null ? undefined : fmtN(event.rt_tokens)],
      ['First token', event.ttft_ms == null ? undefined : fmtMs(event.ttft_ms)],
      ['Result', event.success === false || event.is_error ? 'Failed' : event.success ? 'Succeeded' : undefined],
      ['Exit code', event.exit_code == null ? undefined : String(event.exit_code)],
      ['Agent', event.agent_name || event.agent_id],
      ['Source', event.source],
    ].filter((fact): fact is [string, string] => fact[1] != null && fact[1] !== '')
  })
  return <section class={styles.inspector} aria-label="Event inspector" data-kind={kind()}>
    <div class={styles.inspectorHead}>
      <h3>Event inspector</h3>
      <span class={styles.kindLabel}><Icon glyph={kindGlyphs[kind()]} small />{kindLabels[kind()]}</span>
      <button type="button" class={styles.iconButton} aria-label="Close event inspector" onClick={() => props.close()}>
        <Icon glyph="close" small /></button>
    </div>
    <p class={styles.summary}>{describe(props.event)}</p>
    <dl class={styles.facts}><For each={facts()}>{fact => <><dt>{fact[0]}</dt><dd>{fact[1]}</dd></>}</For></dl>
    <Show when={inputOf(props.event)}>{value => <CodeView label="Event input" text={value()} wrap />}</Show>
    <Show when={outputOf(props.event)}>{value => <CodeView label="Event output" text={value()} wrap />}</Show>
    <Show when={props.evidence}>
      <button class={styles.button} type="button" onClick={() => props.evidence?.()}><Icon glyph="file" small />Open source evidence</button>
    </Show>
  </section>
}


