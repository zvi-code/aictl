import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { expect, it } from 'vitest'
import { createLiveStore, type LiveEntity, type LiveIdentity } from '../../src/data/store'
import { projectBoard } from '../../src/live/boardProjection'
import { frameClock } from './harness'

interface TapeEvent {
  event: 'bootstrap' | 'change'
  data: {
    scope: string
    sequence: number
    entities: LiveEntity[]
    upserts?: LiveEntity[]
    removals?: LiveIdentity[]
  }
}

it('projects the same board from recorded changes and a bootstrap at the final sequence', () => {
  const file = new URL('../../../../../../test/recordings/busy/main-sse.jsonl.gz', import.meta.url)
  const events = gunzipSync(readFileSync(file)).toString('utf8').trimEnd().split('\n')
    .map(line => JSON.parse(line) as TapeEvent)
    .filter(({ event }) => event === 'bootstrap' || event === 'change')
  const [first, ...changes] = events
  const last = changes.at(-1)!
  expect(first.event).toBe('bootstrap')
  expect(last.event).toBe('change')
  expect(last.data.sequence).toBeGreaterThan(first.data.sequence)

  const clock = frameClock()
  const store = createLiveStore({ query: first.data.scope, frames: clock.frames })
  let board = projectBoard(store)
  store.subscribeApplied(applied => { board = projectBoard(store, board, applied) })
  expect(store.receive(first.event, first.data)).toBe(true)
  clock.tick()
  const initialBoard = board

  // The tape has only an opening bootstrap. Build the final bootstrap from the
  // wire entities, without using the store or its board projection as the oracle.
  const key = ({ topic, id }: LiveIdentity) => JSON.stringify([topic, id])
  const entities = new Map<string, { revision: number; entity?: LiveEntity }>()
  for (const entity of first.data.entities) entities.set(key(entity), { revision: entity.revision, entity })
  for (const [index, { event, data }] of changes.entries()) {
    expect(store.receive(event, data)).toBe(true)
    for (const entity of data.upserts ?? []) {
      const id = key(entity)
      if ((entities.get(id)?.revision ?? -1) < entity.revision) entities.set(id, { revision: entity.revision, entity })
    }
    for (const removal of data.removals ?? []) {
      const id = key(removal)
      if ((entities.get(id)?.revision ?? -1) < removal.revision) entities.set(id, { revision: removal.revision })
    }
    if (index % 8 === 7) clock.tick()
  }
  clock.tick()

  const fresh = createLiveStore({ query: first.data.scope, frames: clock.frames })
  expect(fresh.receive('bootstrap', {
    ...first.data, ...last.data,
    entities: [...entities.values()].flatMap(({ entity }) => entity ? [entity] : []),
  })).toBe(true)
  clock.tick()
  expect(store.meta.sequence).toBe(last.data.sequence)
  expect(fresh.meta.sequence).toBe(store.meta.sequence)
  expect(board).not.toEqual(initialBoard)
  expect(board).toEqual(projectBoard(fresh))
})
