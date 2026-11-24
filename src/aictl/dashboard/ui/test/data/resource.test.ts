import { expect, it, vi } from 'vitest'
import { createResourceCache, IDLE_KEYS } from '../../src/data/resource'
import { liveEntity } from '../fixtures/live.fixture'
import { storeHarness } from './harness'

function fetchHarness() {
  const pending: { signal: AbortSignal | null | undefined; resolve: (response: Response) => void }[] = []
  const requests = vi.fn<typeof globalThis.fetch>((_, init) => new Promise(resolve => {
    pending.push({ signal: init?.signal, resolve })
  }))
  const load = async (key: string, signal: AbortSignal, fetch: typeof globalThis.fetch) => {
    const response = await fetch(key, { signal })
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response.text()
  }
  return { requests, pending, load }
}

it('deduplicates readers by key and keeps a released read for the next reader of its key', async () => {
  const { requests, pending, load } = fetchHarness()
  const cache = createResourceCache({ load, fetch: requests })
  const one = cache.acquire('/detail/a')
  const two = cache.acquire('/detail/a')
  const other = cache.acquire('/detail/b')
  expect(one.state).toBe(two.state)
  expect(requests).toHaveBeenCalledTimes(2)
  one.refetch()
  one.release()
  one.release()
  two.release()
  expect(pending[0].signal?.aborted).toBe(false)
  const next = cache.acquire('/detail/a')
  expect(requests).toHaveBeenCalledTimes(2)
  pending[0].resolve(new Response('current'))
  await vi.waitFor(() => expect(next.state).toMatchObject({ status: 'ready', data: 'current' }))
  expect(other.state.status).toBe('loading')
  next.release()
  other.release()
})

// A panel unmounts when it scrolls far away. A read of 40 s was aborted each time and started over
// on the way back, so a user who scrolled past "MCP servers and tools" saw "Loading…" for minutes.
it('RES-IDLE-10 · a panel that scrolls away and back joins its read in flight', async () => {
  const { requests, pending, load } = fetchHarness()
  const cache = createResourceCache({ load, fetch: requests })
  for (let pass = 0; pass < 3; pass++) cache.acquire('/api/board/mcp').release()
  const back = cache.acquire('/api/board/mcp')
  expect(requests).toHaveBeenCalledTimes(1)
  expect(pending[0].signal?.aborted).toBe(false)
  pending[0].resolve(new Response('servers'))
  await vi.waitFor(() => expect(back.state).toMatchObject({ status: 'ready', data: 'servers' }))
  // Away and back once more: the last answer shows while it is read again.
  back.release()
  const again = cache.acquire('/api/board/mcp')
  expect(again.state).toMatchObject({ status: 'refreshing', data: 'servers' })
  pending[1].resolve(new Response('servers 2'))
  await vi.waitFor(() => expect(again.state).toMatchObject({ status: 'ready', data: 'servers 2' }))
  again.release()
})

it('RES-IDLE-11 · keeps only a few released keys and aborts the oldest read beyond them', () => {
  const { requests, pending, load } = fetchHarness()
  const cache = createResourceCache({ load, fetch: requests })
  for (let i = 0; i <= IDLE_KEYS; i++) cache.acquire(`/detail/${i}`).release()
  expect(pending.map(entry => entry.signal?.aborted)).toEqual([true, ...Array(IDLE_KEYS).fill(false)])
  cache.acquire('/detail/0').release()
  expect(requests).toHaveBeenCalledTimes(IDLE_KEYS + 2)
  expect(pending[1].signal?.aborted).toBe(true)
})

it('refetches once on related applied changes, not on unrelated or rejected changes', async () => {
  const { requests, pending, load } = fetchHarness()
  const h = storeHarness()
  h.bootstrap()
  h.tick()
  const cache = createResourceCache({
    load, fetch: requests,
    live: { store: h.store, relatesTo: (key, { entity }) => entity.topic === 'runtime.agent' && key === `/detail/${entity.id}` },
  })
  const one = cache.acquire('/detail/a')
  const two = cache.acquire('/detail/a')
  pending[0].resolve(new Response('before'))
  await vi.waitFor(() => expect(one.state).toMatchObject({ status: 'ready', data: 'before' }))
  h.change(2, [liveEntity('runtime.agent', 'b', {}, 2)])
  h.tick()
  expect(requests).toHaveBeenCalledTimes(1)
  h.change(3, [liveEntity('runtime.agent', 'a', {}, 3)])
  h.change(4, [liveEntity('runtime.agent', 'a', {}, 4)])
  expect(requests).toHaveBeenCalledTimes(1)
  h.tick()
  expect(requests).toHaveBeenCalledTimes(2)
  expect(two.state).toMatchObject({ status: 'refreshing', data: 'before' })
  pending[1].resolve(new Response('after'))
  await vi.waitFor(() => expect(two.state).toMatchObject({ status: 'ready', data: 'after' }))
  h.change(5, [liveEntity('runtime.agent', 'a', {}, 3)])
  h.tick()
  expect(requests).toHaveBeenCalledTimes(2)
  h.change(6, [], [{ topic: 'runtime.agent', id: 'a', revision: 6 }])
  h.tick()
  expect(requests).toHaveBeenCalledTimes(3)
  one.release()
  two.release()
  h.change(7, [liveEntity('runtime.agent', 'a', {}, 7)])
  h.tick()
  // A released key reads nothing more on its own.
  pending[2].resolve(new Response('released'))
  await new Promise(resolve => setImmediate(resolve))
  expect(requests).toHaveBeenCalledTimes(3)
})

it('merges invalidations during an in-flight read into one follow-up and makes none after release', async () => {
  const { requests, pending, load } = fetchHarness()
  const h = storeHarness()
  h.bootstrap()
  h.tick()
  const cache = createResourceCache({
    load, fetch: requests,
    live: { store: h.store, relatesTo: (_, change) => change.entity.id === 'a' },
  })
  const one = cache.acquire('/detail/a')
  for (let i = 2; i <= 4; i++) {
    h.change(i, [liveEntity('runtime.agent', 'a', {}, i)])
    h.tick()
  }
  expect(requests).toHaveBeenCalledTimes(1)
  pending[0].resolve(new Response('before'))
  await vi.waitFor(() => expect(requests).toHaveBeenCalledTimes(2))
  h.change(5, [liveEntity('runtime.agent', 'a', {}, 5)])
  h.tick()
  one.release()
  pending[1].resolve(new Response('obsolete'))
  await new Promise(resolve => setImmediate(resolve))
  expect(requests).toHaveBeenCalledTimes(2)
  // The next reader reads again: the answer it finds was invalidated while it was read.
  const next = cache.acquire('/detail/a')
  expect(requests).toHaveBeenCalledTimes(3)
  next.release()
})

it('distinguishes an initial error from a failed refresh with usable same-key data', async () => {
  const { requests, pending, load } = fetchHarness()
  const cache = createResourceCache({ load, fetch: requests })
  const one = cache.acquire('/detail/a')
  pending[0].resolve(new Response(null, { status: 503 }))
  await vi.waitFor(() => expect(one.state).toMatchObject({ status: 'error', data: undefined }))
  const retry = one.refetch()
  pending[1].resolve(new Response(''))
  await retry
  expect(one.state).toMatchObject({ status: 'ready', data: '', error: null })
  const refresh = one.refetch()
  pending[2].resolve(new Response(null, { status: 503 }))
  await refresh
  expect(one.state).toMatchObject({ status: 'stale', data: '', error: new Error('Request failed: 503') })
  one.release()
})

it('shows a kept answer again without reading, until the token it was read for changes', async () => {
  const { requests, pending, load } = fetchHarness()
  const cache = createResourceCache({ load, fetch: requests, keepAnswers: true })
  const first = cache.acquire('/section/a', 0)
  pending[0].resolve(new Response('answer'))
  await vi.waitFor(() => expect(first.state.status).toBe('ready'))
  first.release()
  // Another screen was open; the board comes back with the same refresh count.
  const again = cache.acquire('/section/a', 0)
  expect(again.state).toMatchObject({ status: 'ready', data: 'answer' })
  expect(requests).toHaveBeenCalledTimes(1)
  again.release()
  // After a refresh the kept answer is shown while it is read again.
  const refreshed = cache.acquire('/section/a', 1)
  expect(refreshed.state).toMatchObject({ status: 'refreshing', data: 'answer' })
  expect(requests).toHaveBeenCalledTimes(2)
  refreshed.release()
})

it('keeps as many released answers as it is told to', async () => {
  const { requests, pending, load } = fetchHarness()
  const cache = createResourceCache({ load, fetch: requests, keepAnswers: true, idleKeys: 10 })
  const keys = Array.from({ length: 8 }, (_, index) => `/section/${index}`)
  const handles = keys.map(key => cache.acquire(key, 0))
  pending.forEach((request, index) => request.resolve(new Response(`answer ${index}`)))
  await vi.waitFor(() => expect(handles.every(handle => handle.state.status === 'ready')).toBe(true))
  handles.forEach(handle => handle.release())
  const back = keys.map(key => cache.acquire(key, 0))
  expect(back.map(handle => handle.state.data)).toEqual(keys.map((_, index) => `answer ${index}`))
  expect(requests).toHaveBeenCalledTimes(8)
  back.forEach(handle => handle.release())
})

it('lets only a few released reads go on, and reads a stopped key again when it is wanted', async () => {
  const { requests, pending, load } = fetchHarness()
  const cache = createResourceCache({ load, fetch: requests, keepAnswers: true, idleKeys: 10 })
  const keys = Array.from({ length: IDLE_KEYS + 2 }, (_, index) => `/section/${index}`)
  // The first key has an answer and is being read again; the others have none yet.
  const first = cache.acquire(keys[0], 0)
  pending[0].resolve(new Response('answer'))
  await vi.waitFor(() => expect(first.state.status).toBe('ready'))
  void first.refetch(1)
  const others = keys.slice(1).map(key => cache.acquire(key, 0))
  first.release()
  others.forEach(handle => handle.release())
  // Released oldest first: the two oldest reads are stopped, IDLE_KEYS go on.
  expect(pending.slice(1).map(request => request.signal?.aborted)).toEqual([true, true, ...Array(IDLE_KEYS).fill(false)])
  const before = requests.mock.calls.length
  const back = cache.acquire(keys[0], 1)
  expect(back.state).toMatchObject({ status: 'refreshing', data: 'answer' })
  expect(requests).toHaveBeenCalledTimes(before + 1)
  back.release()
})
