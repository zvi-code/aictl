import { expect, it, vi } from 'vitest'
import { createResourceCache } from '../../src/data/resource'
import { liveEntity } from '../fixtures/live.fixture.js'
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

it('deduplicates readers by key and aborts only on the last release', async () => {
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
  expect(pending[0].signal?.aborted).toBe(false)
  two.release()
  expect(pending[0].signal?.aborted).toBe(true)
  expect(pending[1].signal?.aborted).toBe(false)
  const next = cache.acquire('/detail/a')
  expect(requests).toHaveBeenCalledTimes(3)
  pending[0].resolve(new Response('obsolete'))
  pending[2].resolve(new Response('current'))
  await vi.waitFor(() => expect(next.state).toMatchObject({ status: 'ready', data: 'current' }))
  expect(two.state.data).toBeUndefined()
  expect(other.state.status).toBe('loading')
  next.release()
  other.release()
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
  expect(pending[2].signal?.aborted).toBe(true)
  expect(requests).toHaveBeenCalledTimes(3)
})

it('merges invalidations during an in-flight read into one follow-up and drops it on release', async () => {
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
  expect(pending[1].signal?.aborted).toBe(true)
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
