// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createMemo, createRoot, createSignal, flush } from 'solid-js'
import type { DetailAgentFlow, FlowEvent } from '../src/data/contract.gen'

/** A server flow of 30 events at positions -20..9: the first read started at the event at position 0. */
const all: FlowEvent[] = Array.from({ length: 30 }, (_, i) => ({ ts: 1000 + i, type: 'tool_use', to: `t${i}`, source: 'store' }) as FlowEvent)
const position = (i: number) => i - 20
let read = -5 // the oldest position the server has read
const reads: number[] = []

function window(offset: number, limit: number, epoch = 'e1'): DetailAgentFlow {
  // The server reads older segments (five events each) until the window's start is read.
  while (read > offset && read > -20) read -= 5
  const start = Math.max(offset, read)
  const events = all.filter((_, i) => position(i) >= start && position(i) < offset + limit)
  return { turns: events, summary: { offset: start, first_offset: read, matched_events: 10, older_events: read > -20,
    complete: read <= -20, flow_epoch: epoch } } as unknown as DetailAgentFlow
}

vi.mock('../src/panels/data', () => ({
  json: async (url: string) => {
    const params = new URL(url, 'http://x').searchParams
    const offset = Number(params.get('offset')), limit = Number(params.get('limit'))
    reads.push(offset)
    return window(offset, limit)
  },
}))

describe('FLOW-PAGES · a flow read newest first', () => {
  it('reads older windows at negative positions until the server has no older events', async () => {
    const { flowPages } = await import('../src/drawer/flowPages')
    const { pages, dispose } = createRoot(dispose => {
      const [head] = createSignal<DetailAgentFlow | undefined>(window(5, 5))
      return { pages: flowPages(createMemo(() => head()), () => 'k', (offset, limit) => `/flow?offset=${offset}&limit=${limit}`), dispose }
    })
    flush()
    expect(pages.oldest()).toBe(5)
    expect(pages.more()).toBe(true)
    expect(pages.complete()).toBe(false)
    await pages.loadOlder(-Infinity)
    flush()
    expect(pages.oldest()).toBe(-20)
    expect(pages.more()).toBe(false)
    expect(pages.complete()).toBe(true)
    expect(pages.events().map(event => event.ts)).toEqual(all.map(event => event.ts))
    expect(reads.every(offset => offset < 5)).toBe(true)
    dispose()
  })

  it('drops older windows when the server starts the flow again', async () => {
    const { flowPages } = await import('../src/drawer/flowPages')
    read = -5
    const { pages, setHead, dispose } = createRoot(dispose => {
      const [head, setHead] = createSignal<DetailAgentFlow | undefined>(window(5, 5))
      return { pages: flowPages(createMemo(() => head()), () => 'k', (offset, limit) => `/flow?offset=${offset}&limit=${limit}`), setHead, dispose }
    })
    flush()
    await pages.loadOlder()
    flush()
    expect(pages.oldest()).toBeLessThan(5)
    setHead(window(5, 5, 'e2'))
    flush()
    expect(pages.oldest()).toBe(5)
    dispose()
  })
})
