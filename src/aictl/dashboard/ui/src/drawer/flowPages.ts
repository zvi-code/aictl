import { createEffect, createMemo, createSignal, type Accessor } from 'solid-js'
import type { DetailAgentFlow, FlowEvent } from '../data/contract.gen'
import { json } from '../panels/data'
import { eventIdentity } from './flowModel'

/** Events in the newest window, and in each older window read while the reader scrolls back. */
export const FLOW_PAGE = 500
/** The largest window the server returns in one read (MAX_FLOW_EVENTS). */
const FLOW_CHUNK = 5000

type Older = { key: string; epoch: string; from: number; first: number; more: boolean; events: readonly FlowEvent[] }
const windowStart = (data: DetailAgentFlow) => data.summary?.offset ?? data.summary?.omitted_events ?? 0
/** The position of the oldest event the server has read, and whether it has older ones still to read. */
const firstOf = (data: DetailAgentFlow) => data.summary?.first_offset ?? 0
const moreOf = (data: DetailAgentFlow) => data.summary?.older_events ?? false
const epochOf = (data: DetailAgentFlow) => data.summary?.flow_epoch ?? ''

/**
 * One session flow assembled from windows of the server's matching events.
 *
 * The server reads a long flow in segments, newest first, and counts positions from where its
 * first read started: the newest events have positions from 0, and older ones, read on demand,
 * negative positions. Positions of loaded events never move, so windows read at different times
 * fit together. `head` is the newest window, which the live stream replaces as events arrive.
 * Older windows are read by position and kept below the head, so the loaded events always cover
 * one unbroken range that ends at the newest event. A new `flow_epoch` means the server started
 * the flow again (its positions start over): the older windows are dropped.
 */
export function flowPages(head: Accessor<DetailAgentFlow | undefined>, key: Accessor<string>,
  endpoint: (offset: number, limit: number) => string) {
  const [older, setOlder] = createSignal<Older>()
  const [loading, setLoading] = createSignal(false)
  const [problem, setProblem] = createSignal('')
  /** A requested window was dropped: it came from another read of the flow than the newest one. */
  const [dropped, setDropped] = createSignal(false)
  let last: { key: string; epoch: string; start: number; events: readonly FlowEvent[] } | undefined
  let running: Promise<void> | undefined

  createEffect(() => ({ data: head(), key: key() }), ({ data, key: current }) => {
    if (!data) return
    const start = windowStart(data)
    const epoch = epochOf(data)
    const previous = last?.key === current && last.epoch === epoch ? last : undefined
    if (last?.key !== current) setDropped(false)
    last = { key: current, epoch, start, events: data.turns }
    if (older() && (older()!.key !== current || older()!.epoch !== epoch)) setOlder(undefined)
    if (!previous || start <= previous.start) return
    const left = previous.events.slice(0, start - previous.start)
    const kept = below()
    setOlder({ key: current, epoch, from: kept?.from ?? previous.start, first: kept?.first ?? firstOf(data),
      more: kept?.more ?? moreOf(data), events: [...kept?.events ?? [], ...left] })
  })

  const below = () => {
    const kept = older()
    const data = head()
    return kept && kept.key === key() && (!data || kept.epoch === epochOf(data)) ? kept : undefined
  }
  const oldest = createMemo(() => {
    const data = head()
    return below()?.from ?? (data ? windowStart(data) : 0)
  })
  /** The oldest position the server has read, and whether it has older events still unread. */
  const first = () => below()?.first ?? (head() ? firstOf(head()!) : 0)
  const more = () => oldest() > first() || (below()?.more ?? (head() ? moreOf(head()!) : false))
  /** Whether every event of the flow is known: the count of unloaded events is then exact. */
  const complete = () => !(below()?.more ?? (head() ? moreOf(head()!) : false))
  const matched = () => {
    const data = head()
    return data ? data.summary?.matched_events ?? windowStart(data) + data.turns.length : 0
  }
  /** Events read by the server but not loaded here; older events it has not read are not counted. */
  const unloaded = () => Math.max(0, oldest() - first())
  const events = createMemo(() => {
    const merged = new Map<string, FlowEvent>()
    for (const event of below()?.events ?? []) merged.set(eventIdentity(event), event)
    for (const event of head()?.turns ?? []) merged.set(eventIdentity(event), event)
    return [...merged.values()]
  })

  /** Read older windows down to position `target`, or one more window when no target is given.
   * `-Infinity` reads the whole flow. */
  function loadOlder(target?: number) {
    if (running || dropped()) return running ?? Promise.resolve()
    const current = key()
    const epoch = head() ? epochOf(head()!) : ''
    let from = oldest()
    const until = target ?? from - FLOW_PAGE
    if (!head() || from <= until || !more()) return Promise.resolve()
    setLoading(true); setProblem('')
    running = (async () => {
      try {
        let firstKnown = first()
        let moreKnown = more()
        while (from > until && moreKnown && key() === current) {
          const offset = Math.max(until, from - FLOW_CHUNK)
          const data = await json<DetailAgentFlow>(endpoint(offset, from - offset))
          if (key() !== current) return
          if (epochOf(data) !== epoch) {
            // The server started this flow again: its positions are new, so the window does not fit.
            // Say so and stop offering older events until a retry reads the flow's newest ones again.
            setOlder(undefined)
            setDropped(true)
            return
          }
          const start = windowStart(data)
          firstKnown = firstOf(data)
          moreKnown = start > firstKnown || moreOf(data)
          if (start >= from) {
            // Nothing older in this window: the flow starts here.
            setOlder({ key: current, epoch, from, first: firstKnown, more: false, events: below()?.events ?? [] })
            return
          }
          const kept = below()
          setOlder({ key: current, epoch, from: start, first: firstKnown, more: moreOf(data),
            events: [...data.turns, ...kept?.events ?? []] })
          from = start
        }
      } catch (error) {
        if (key() === current) setProblem(error instanceof Error ? error.message : String(error))
      } finally {
        running = undefined
        setLoading(false)
      }
    })()
    return running
  }

  /** Forget a dropped window, so older events can be asked for again. */
  const retry = () => { setDropped(false); setProblem('') }

  return { events, oldest, first, more, complete, unloaded, matched, loading, problem, dropped, retry, loadOlder }
}
