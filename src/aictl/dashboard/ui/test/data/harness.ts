import { createLiveStore, type FrameScheduler, type LiveStore } from '../../src/data/store'
import { liveBootstrap, liveEnvelope } from '../fixtures/live.fixture'

export function frameClock() {
  let hidden = false
  const callbacks: (() => void)[] = []
  const listeners = new Set<() => void>()
  const frames: FrameScheduler = {
    request: callback => { callbacks.push(callback) },
    hidden: () => hidden,
    onVisibilityChange(callback) {
      listeners.add(callback)
      return () => { listeners.delete(callback) }
    },
  }
  return {
    frames,
    tick() { for (const callback of callbacks.splice(0)) callback() },
    get queued() { return callbacks.length },
    setHidden(value: boolean) {
      hidden = value
      for (const listener of listeners) listener()
    },
  }
}

export function storeHarness(query = '') {
  const clock = frameClock()
  const store = createLiveStore({ query, frames: clock.frames })
  return {
    tick: clock.tick,
    setHidden: clock.setHidden,
    clock,
    store,
    bootstrap(entities: unknown[] = [], sequence = 1, fields = {}) {
      return store.receive('bootstrap', liveBootstrap(entities, query, sequence, fields))
    },
    change(sequence: number, upserts: unknown[] = [], removals: unknown[] = []) {
      return store.receive('change', liveEnvelope(sequence, { upserts, removals }, query))
    },
  }
}

export function dataOf(store: LiveStore, topic: string, id: string) {
  return store.topic(topic)?.get(id)?.data
}
