import { describe, expect, it, vi } from 'vitest'
import { canonicalScope, MAX_REMOVAL_REVISIONS, nativeOutput } from '../../src/data/store'
import { liveBootstrap, liveEntity, liveEnvelope, liveField } from '../fixtures/live.fixture'
import { dataOf, storeHarness } from './harness'

const agent = (cpu: number, revision = 1) => liveEntity('runtime.agent', 'a', { cpu_percent: cpu }, revision)
const removeAgent = (revision: number) => ({ topic: 'runtime.agent', id: 'a', revision })
const output = (id: string, order: number, revision = 1) =>
  liveEntity('runtime.output', id, { session_id: 'a', order, text: id, tokens: 999 }, revision)

describe('live store', () => {
  it('accepts sequence jumps and rejects duplicate sequences, old sequences and stale revisions', () => {
    const h = storeHarness()
    h.bootstrap([agent(1)])
    expect(h.change(20, [agent(4, 5)])).toBe(true)
    expect(h.change(20, [agent(99, 8)])).toBe(false)
    expect(h.change(30, [agent(2, 3)])).toBe(true)
    expect(h.change(29, [agent(99, 99)])).toBe(false)
    h.tick()
    expect(dataOf(h.store, 'runtime.agent', 'a')?.cpu_percent).toBe(4)
    expect(h.store.meta.cursor).toBe('daemon:30')
  })

  it('keeps tombstones across frames and allows only a newer revision to restore the entity', () => {
    const h = storeHarness()
    h.bootstrap([agent(1)])
    h.tick()
    h.change(2, [agent(2, 5)], [removeAgent(5)])
    h.tick()
    expect(dataOf(h.store, 'runtime.agent', 'a')?.cpu_percent).toBe(2)
    h.change(3, [agent(3, 5)], [removeAgent(6)])
    h.change(4, [agent(99, 5)])
    h.tick()
    expect(dataOf(h.store, 'runtime.agent', 'a')).toBeUndefined()
    h.change(5, [agent(99, 6)])
    h.tick()
    expect(dataOf(h.store, 'runtime.agent', 'a')).toBeUndefined()
    h.change(6, [agent(7, 7)])
    h.tick()
    expect(dataOf(h.store, 'runtime.agent', 'a')?.cpu_percent).toBe(7)
  })

  it('checks the tombstone limit per envelope and rejects an over-limit envelope in full', () => {
    const h = storeHarness()
    const entities = Array.from({ length: MAX_REMOVAL_REVISIONS + 1 }, (_, index) =>
      liveEntity('runtime.process', String(index), { pid: index }))
    const removals = entities.map(({ topic, id }) => ({ topic, id, revision: 2 }))
    h.bootstrap(entities)
    h.tick()
    expect(() => h.change(2, [agent(3, 2)], removals)).toThrow('new snapshot')
    expect(h.store.pendingCount).toBe(0)
    expect(h.store.cursor).toBe('daemon:1')
    expect(dataOf(h.store, 'runtime.process', '0')?.pid).toBe(0)
    h.change(2, [], removals.slice(1))
    expect(() => h.change(3, [], removals.slice(0, 1))).toThrow('new snapshot')
    h.change(3, [liveEntity('runtime.process', '1', { pid: 1 }, 3)], removals.slice(0, 1))
    h.tick()
    expect(dataOf(h.store, 'runtime.process', '1')?.pid).toBe(1)
    expect(dataOf(h.store, 'runtime.process', '0')).toBeUndefined()
  })

  it('accepts a same-sequence reset and starts a fresh revision domain on a new epoch', () => {
    const h = storeHarness()
    h.bootstrap([output('old', 1, 80)])
    h.change(8, [agent(10, 9)], [removeAgent(80)])
    h.tick()
    expect(h.bootstrap([], 7)).toBe(false)
    h.bootstrap([output('old', 2)], 8, { reason: 'overflow', ordered_gap: true })
    h.tick()
    expect(nativeOutput(h.store, 'a').map(entity => entity.revision)).toEqual([1])
    expect(h.store.meta).toMatchObject({ orderedGap: true, resetReason: 'overflow' })
    h.bootstrap([output('new', 2), agent(3)], 1, {
      epoch: 'restarted', cursor: 'restarted:1', reason: 'resume_miss', ordered_gap: true, retention: { native_output: { max_entries: 2 } },
    })
    h.tick()
    expect(nativeOutput(h.store, 'a').map(entity => entity.id)).toEqual(['new'])
    expect(dataOf(h.store, 'runtime.agent', 'a')?.cpu_percent).toBe(3)
    expect(h.store.meta).toMatchObject({
      orderedGap: true, resetReason: 'resume_miss', retention: { native_output: { max_entries: 2 } },
    })
    expect(() => h.change(9)).toThrow('new snapshot')
    h.store.receive('change', liveEnvelope(2, { epoch: 'restarted', cursor: 'restarted:2' }))
    h.tick()
    expect(h.store.meta).toMatchObject({ orderedGap: true, resetReason: 'resume_miss' })
    h.bootstrap([output('new', 2)], 2, { epoch: 'restarted', cursor: 'restarted:2' })
    h.tick()
    expect(h.store.meta).toMatchObject({ orderedGap: false, resetReason: null, retention: null })
  })

  it('validates envelopes and scope before staging revisions', () => {
    const h = storeHarness('tool=a')
    expect(h.store.receive('change', liveEnvelope(2, {}, 'tool=b'))).toBe(false)
    expect(() => h.change(2)).toThrow('new snapshot')
    expect(() => h.store.receive('bootstrap', liveBootstrap([], 'tool=b', 1, { cursor: '?' }))).toThrow('envelope')
    h.bootstrap([agent(1)])
    expect(() => h.store.receive('bad', liveEnvelope(2, {}, 'tool=a'))).toThrow('Unknown')
    expect(() => h.store.receive('change', liveEnvelope(2, { removals: {} }, 'tool=a'))).toThrow('changes')
    expect(() => h.change(2, [agent(2, 2), agent(3, -1)])).toThrow('identity')
    expect(() => h.change(2, [agent(2, 2), { ...agent(3, 3), data: [] }])).toThrow('identity')
    expect(() => h.change(2, [agent(2, 2)], [{ ...removeAgent(4), topic: 'unknown' }])).toThrow('source authority')
    expect(h.store.cursor).toBe('daemon:1')
    h.change(2, [agent(2, 2)])
    h.tick()
    expect(dataOf(h.store, 'runtime.agent', 'a')?.cpu_percent).toBe(2)
  })

  it('rejects unauthorized sources and keeps operational, runtime and historical fields separate', () => {
    const h = storeHarness()
    const health = {
      store: { otel_sink: { pending_rows: 900 }, writes: { rows: 800 } },
      pipeline: { self: { cpu: 2, rss: 1048576 }, stream: { snapshot_age_s: 3 }, hooks: { copilot: { count: 100 } } },
    }
    h.bootstrap([liveEntity('runtime.health', 'local', health)])
    h.tick()
    expect(() => h.change(2, [liveEntity('history.board', 'kpis:', {}, 2, 'runtime.native')])).toThrow('source authority')
    expect(h.store.boardField('kpis').present).toBe(false)
    expect(dataOf(h.store, 'runtime.health', 'local')).toEqual(health)
    h.change(2, [
      liveField('kpis', { tokens: 7, cost_usd: 0.2 }, '', 2),
      liveEntity('runtime.agent', 'a', { input: 999, activity: 'working', cost_usd: 999 }, 2),
      output('second', 2), output('first', 1),
    ])
    h.tick()
    const capabilities = h.store.meta.capabilities
    expect(capabilities?.topics).toMatchObject({ 'runtime.agent': { fields: expect.not.arrayContaining(['input']) } })
    expect(h.store.boardField('kpis').value).toEqual({ tokens: 7, cost_usd: 0.2 })
    expect(nativeOutput(h.store, 'a').map(entity => entity.data.text)).toEqual(['first', 'second'])
  })

  it('projects a field by server row key and order without changing unrelated entity identity', () => {
    const h = storeHarness()
    h.bootstrap([
      liveField('agents', [], '', 1, { collection: true }),
      liveField('agents', { id: 'b' }, '', 1, { key: 'id-b', order: 2 }),
      liveField('agents', { id: 'a' }, '', 1, { key: 'id-a', order: 1 }),
      liveField('agents', { id: 'scoped-out' }, 'project=other', 1, { key: 'id-c' }),
      liveField('kpis', { tokens: 10 }),
    ])
    h.tick()
    const agents = h.store.boardField('agents')
    const kpis = h.store.boardField('kpis').value
    expect(agents).toEqual({ present: true, rowKeys: ['id-a', 'id-b'], value: [{ id: 'a' }, { id: 'b' }] })
    h.change(2, [agent(5, 2)])
    h.tick()
    expect((h.store.boardField('agents').value as unknown[])[1]).toBe((agents.value as unknown[])[1])
    h.change(3, [], [{ topic: 'history.board', id: 'agents:id-a', revision: 3 }])
    h.tick()
    expect(h.store.boardField('agents')).toEqual({ present: true, rowKeys: ['id-b'], value: [{ id: 'b' }] })
    expect(h.store.boardField('kpis').value).toBe(kpis)
    h.change(4, [], [{ topic: 'history.board', id: 'agents:id-b', revision: 4 }])
    h.tick()
    expect(h.store.boardField('agents')).toEqual({ present: true, rowKeys: [], value: [] })
  })

  it('shares each immutable wire payload between the topic and board-field reads', () => {
    const h = storeHarness()
    const first = { tokens: 10 }
    const next = { tokens: 20 }
    h.bootstrap([liveField('kpis', first)])
    h.tick()
    expect(h.store.boardField('kpis').value).toBe(first)
    expect(dataOf(h.store, 'history.board', 'kpis:')?.value).toBe(first)
    h.change(2, [liveField('kpis', next, '', 2)])
    expect(h.store.boardField('kpis').value).toBe(first)
    h.tick()
    expect(h.store.boardField('kpis').value).toBe(next)
    expect(dataOf(h.store, 'history.board', 'kpis:')?.value).toBe(next)
  })

  it('merges complementary configuration and history in source order without losing the row key', () => {
    const h = storeHarness()
    const config = liveEntity('configuration.board', 'skill-config', {
      scope: '', field: 'skills', key: 'check', merge: true, value: { name: 'check', path: 'check.md', description: 'Current configuration' },
    })
    h.bootstrap([liveField('skills', { name: 'check', uses: 3, tokens: 20 }, '', 1, { key: 'check', merge: true }), config])
    h.tick()
    expect(h.store.boardField('skills')).toEqual({
      present: true, rowKeys: ['check'], value: [{ name: 'check', path: 'check.md', description: 'Current configuration', uses: 3, tokens: 20 }],
    })
    h.change(2, [], [{ topic: 'history.board', id: 'skills:check', revision: 2 }])
    h.tick()
    expect(h.store.boardField('skills').value).toEqual([{ name: 'check', path: 'check.md', description: 'Current configuration' }])
  })

  it('keeps file configuration independent of loaded evidence for the same ID', () => {
    const h = storeHarness()
    const file = liveEntity('configuration.file', 'a', { configured_only: true, model: 'configured-model' })
    const loaded = (model: string, revision: number) => liveEntity('configuration.loaded', 'a', {
      configured_on_disk: false, effective_known: true, evidence: [{ key: 'model', value: model }], unknown: ['reasoning_effort'],
    }, revision)
    h.bootstrap([file, loaded('initial-model', 1)])
    h.tick()
    const initialFile = dataOf(h.store, 'configuration.file', 'a')
    h.change(2, [loaded('updated-model', 2)])
    h.tick()
    expect(initialFile).toEqual(file.data)
    expect(dataOf(h.store, 'configuration.file', 'a')).toBe(initialFile)
    expect(dataOf(h.store, 'configuration.loaded', 'a')).toEqual(loaded('updated-model', 2).data)
  })

  it('keeps unknown runtime counts distinct from a complete empty sample', () => {
    const h = storeHarness()
    const sample = (ready: boolean, process_count: number | null, revision: number) =>
      liveEntity('source.status', 'runtime', { producer: 'runtime-collector', ready, process_count }, revision)
    h.bootstrap([sample(false, null, 1)])
    h.tick()
    expect(dataOf(h.store, 'source.status', 'runtime')).toMatchObject({ ready: false, process_count: null })
    h.change(2, [sample(true, 0, 2)])
    h.tick()
    expect(dataOf(h.store, 'source.status', 'runtime')).toMatchObject({ ready: true, process_count: 0 })
  })

  it('keeps distinct native output entries, orders ties by identity, and updates repeated entry IDs in place', () => {
    const h = storeHarness()
    h.bootstrap([output('z', 1), output('a', 1), { ...output('other', 0), data: { session_id: 'b', order: 0 } }])
    h.change(2, [output('a', 3, 2), output('middle', 2, 2)])
    h.tick()
    expect(nativeOutput(h.store, 'a').map(entity => entity.id)).toEqual(['z', 'middle', 'a'])
    h.change(3, [output('a', 1, 3)])
    h.tick()
    expect(nativeOutput(h.store, 'a').map(entity => entity.id)).toEqual(['a', 'z', 'middle'])
  })

  it('matches scope encoding and distinguishes an empty filter from an omitted filter', () => {
    expect(canonicalScope('q=~*!%27%28%29+a&tool=b&history=0&cursor=e%3A1&empty=&tool=a'))
      .toBe('empty=&q=~%2A%21%27%28%29+a&tool=a&tool=b')
    expect(canonicalScope('tool=&history=0&cursor=')).toBe('tool=')
    expect(canonicalScope('tool=')).not.toBe(canonicalScope(''))
  })

  it('coalesces by topic and ID and notifies all subscribers once after a complete frame', () => {
    const h = storeHarness()
    h.bootstrap([agent(1)])
    h.tick()
    const first = vi.fn(() => {
      expect(h.store.meta.sequence).toBe(10)
      expect(dataOf(h.store, 'runtime.agent', 'a')?.cpu_percent).toBe(10)
      expect(dataOf(h.store, 'runtime.process', 'a')?.pid).toBe(7)
    })
    const second = vi.fn()
    h.store.subscribeApplied(first)
    h.store.subscribeApplied(second)
    for (let i = 2; i <= 10; i++) h.change(i, [agent(i, i), liveEntity('runtime.process', 'a', { pid: 7 }, i)])
    expect(h.clock.queued).toBe(1)
    expect(h.store.pendingCount).toBe(2)
    expect(h.store.meta.sequence).toBe(1)
    expect(first).not.toHaveBeenCalled()
    h.tick()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ kind: 'upsert', entity: agent(10, 10), previous: agent(1) }),
      expect.objectContaining({ kind: 'upsert', entity: liveEntity('runtime.process', 'a', { pid: 7 }, 10) }),
    ])
  })

  it('keeps one pending change per entity while hidden and applies it on the next visible frame', () => {
    const h = storeHarness()
    h.bootstrap([agent(1)])
    h.setHidden(true)
    h.tick()
    for (let i = 2; i <= 200; i++) h.change(i, [agent(i, i), output('same', i, i)])
    h.change(201, [], [removeAgent(201)])
    h.change(202, [agent(99, 199), output('other', 1, 202)])
    expect(h.store.pendingCount).toBe(3)
    expect(h.clock.queued).toBe(0)
    expect(h.store.meta.ready).toBe(false)
    h.setHidden(false)
    expect(h.clock.queued).toBe(1)
    h.tick()
    expect(h.store.pendingCount).toBe(0)
    expect(dataOf(h.store, 'runtime.agent', 'a')).toBeUndefined()
    expect(nativeOutput(h.store, 'a').map(entity => [entity.id, entity.revision])).toEqual([['other', 202], ['same', 200]])
  })

  it('reports entities lost in a reset after the new state is visible', () => {
    const h = storeHarness()
    h.bootstrap([agent(1)])
    h.tick()
    const listener = vi.fn(() => expect(dataOf(h.store, 'runtime.agent', 'a')).toBeUndefined())
    h.store.subscribeApplied(listener)
    h.bootstrap([], 2, { reason: 'overflow' })
    h.tick()
    expect(listener).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ kind: 'remove', previous: agent(1) }),
    ])
  })
})
