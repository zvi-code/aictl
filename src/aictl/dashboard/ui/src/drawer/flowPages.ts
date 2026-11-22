import { createEffect, createMemo, createSignal, type Accessor } from 'solid-js'
import type { DetailAgentFlow, FlowEvent } from '../data/contract.gen'
import { json } from '../panels/data'
import { eventIdentity } from './flowModel'

/** Events in the newest window, and in each older window read while the reader scrolls back. */
export const FLOW_PAGE = 500
/** The largest window the server returns in one read (MAX_FLOW_EVENTS). */
const FLOW_CHUNK = 5000

type Older = { key: string; from: number; events: readonly FlowEvent[] }
const windowStart = (data: DetailAgentFlow) => data.summary?.offset ?? data.summary?.omitted_events ?? 0

/**
 * One session flow assembled from windows of the server's matching events.
 *
 * `head` is the newest window, which the live stream replaces as events arrive. Older windows are
 * read by offset (0 is the oldest matching event) and kept below the head, so the loaded events
 * always cover one unbroken range that ends at the newest event. Events that leave the head window
 * when it moves forward are kept, so a reader who scrolled back does not lose them.
 */
export function flowPages(head: Accessor<DetailAgentFlow | undefined>, key: Accessor<string>,
  endpoint: (offset: number, limit: number) => string) {
  const [older, setOlder] = createSignal<Older>()
  const [loading, setLoading] = createSignal(false)
  const [problem, setProblem] = createSignal('')
  let last: { key: string; start: number; events: readonly FlowEvent[] } | undefined
  let running: Promise<void> | undefined

  createEffect(() => ({ data: head(), key: key() }), ({ data, key: current }) => {
    if (!data) return
    const start = windowStart(data)
    const previous = last?.key === current ? last : undefined
    last = { key: current, start, events: data.turns }
    if (!previous || start <= previous.start) return
    const left = previous.events.slice(0, start - previous.start)
    const kept = older()?.key === current ? older() : undefined
    setOlder({ key: current, from: kept?.from ?? previous.start, events: [...kept?.events ?? [], ...left] })
  })

  const below = () => older()?.key === key() ? older() : undefined
  const oldest = createMemo(() => {
    const data = head()
    return below()?.from ?? (data ? windowStart(data) : 0)
  })
  const matched = () => {
    const data = head()
    return data ? data.summary?.matched_events ?? windowStart(data) + data.turns.length : 0
  }
  const events = createMemo(() => {
    const merged = new Map<string, FlowEvent>()
    for (const event of below()?.events ?? []) merged.set(eventIdentity(event), event)
    for (const event of head()?.turns ?? []) merged.set(eventIdentity(event), event)
    return [...merged.values()]
  })

  /** Read older windows down to offset `target`, or one more window when no target is given. */
  function loadOlder(target?: number) {
    if (running) return running
    const current = key()
    let from = oldest()
    const until = Math.max(0, target ?? from - FLOW_PAGE)
    if (!head() || from <= until) return Promise.resolve()
    setLoading(true); setProblem('')
    running = (async () => {
      try {
        while (from > until && key() === current) {
          const offset = Math.max(until, from - FLOW_CHUNK)
          const data = await json<DetailAgentFlow>(endpoint(offset, from - offset))
          if (key() !== current) return
          const kept = below()
          setOlder({ key: current, from: offset, events: [...data.turns, ...kept?.events ?? []] })
          from = offset
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

  return { events, oldest, matched, loading, problem, loadOlder }
}
