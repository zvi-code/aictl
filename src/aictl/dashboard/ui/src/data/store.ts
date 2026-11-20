import { createSignal, createStore, flush, type Accessor, type Setter } from 'solid-js'

export const MAX_REMOVAL_REVISIONS = 4096
const boardTopics = ['catalog.board', 'configuration.board', 'history.board']

type Data = Readonly<Record<string, unknown>>

interface ValueIndex<T> {
  get(key: string): T | undefined
  values(): IterableIterator<T>
  readonly size: number
}

// Each payload is an immutable wire value. Track replacements, not its
// nested properties, and keep the other slots out of the write path.
function createIndex<T>() {
  type Slot = { value: T } | undefined
  const slots = new Map<string, [Accessor<Slot>, Setter<Slot>]>()
  const [keys, setKeys] = createSignal(0)
  let version = 0
  const changedKeys = () => setKeys(++version)
  return Object.freeze({
    get(key: string) {
      const slot = slots.get(key)
      if (slot) return slot[0]()?.value
      keys()
    },
    *values() {
      keys()
      for (const [slot] of slots.values()) {
        const entry = slot()
        if (entry) yield entry.value
      }
    },
    get size() { keys(); return slots.size },
    set(key: string, value: T) {
      const slot = slots.get(key)
      if (slot) {
        slots.delete(key)
        slots.set(key, slot)
        slot[1]({ value })
      } else {
        slots.set(key, createSignal<Slot>({ value }))
        changedKeys()
      }
    },
    delete(key: string) {
      const slot = slots.get(key)
      if (!slot) return
      slots.delete(key)
      slot[1](undefined)
      changedKeys()
    },
  })
}

export interface LiveIdentity {
  readonly topic: string
  readonly id: string
  readonly revision: number
}

export interface LiveEntity extends LiveIdentity {
  readonly source: string
  readonly data: Data
}

type Change =
  | { readonly kind: 'upsert'; readonly entity: LiveEntity }
  | { readonly kind: 'remove'; readonly entity: LiveIdentity }

export type AppliedLiveChange = Change & { readonly previous?: LiveEntity }
type AppliedListener = (changes: readonly AppliedLiveChange[]) => void

interface StreamState {
  scope: string
  epoch: string | null
  sequence: number
  cursor: string | null
  ready: boolean
  capabilities: Data | null
  orderedGap: boolean
  retention: unknown
  resetReason: unknown
}

export interface FrameScheduler {
  request(callback: () => void): void
  hidden?(): boolean
  onVisibilityChange?(callback: () => void): () => void
}

const browserFrames: FrameScheduler = {
  request(callback) { requestAnimationFrame(callback) },
  hidden: () => document.hidden,
  onVisibilityChange(callback) {
    document.addEventListener('visibilitychange', callback)
    return () => document.removeEventListener('visibilitychange', callback)
  },
}

export function canonicalScope(query = '') {
  const encode = (value: string) => encodeURIComponent(value)
    .replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, '+')
  return [...new URLSearchParams(query)]
    .filter(([key]) => key !== 'cursor' && key !== 'history')
    .sort(([ak, av], [bk, bv]) => ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0)
    .map(([key, value]) => encode(key) + '=' + encode(value)).join('&')
}

const record = (value: unknown): Data | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Data : undefined
const validRevision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const keyOf = ({ topic, id }: LiveIdentity) => `${topic.length}:${topic}${id}`
const upserted = (change: Change | undefined) => change?.kind === 'upsert' ? change.entity : undefined
const tombstone = (change: Change | undefined) => change?.kind === 'remove' ? 1 : 0

function assertIdentity(value: unknown): asserts value is LiveIdentity {
  const entity = record(value)
  if (!entity || typeof entity.topic !== 'string' || typeof entity.id !== 'string' || !entity.id || !validRevision(entity.revision)) {
    throw new Error('Invalid live entity identity or revision.')
  }
}

function readChange(kind: Change['kind'], value: unknown, topics: Data | undefined): Change {
  assertIdentity(value)
  const entity = record(value)
  if (kind === 'upsert' && !record(entity?.data)) throw new Error('Invalid live entity identity or revision.')
  const descriptor = topics && Object.hasOwn(topics, value.topic) ? record(topics[value.topic]) : undefined
  if (!descriptor || (kind === 'upsert' && (!Array.isArray(descriptor.sources) || !descriptor.sources.includes(entity?.source)))) {
    throw new Error('Live entity does not match the advertised source authority.')
  }
  return kind === 'upsert' ? { kind, entity: value as LiveEntity } : { kind, entity: value }
}

function fieldOf(entity: LiveEntity | undefined, scope: string) {
  if (entity && boardTopics.includes(entity.topic) && entity.data.scope === scope && typeof entity.data.field === 'string') {
    return entity.data.field
  }
}

/** Accept protocol messages in order. Expose data only after the next visible frame. */
export function createLiveStore({ query = '', frames = browserFrames }: { query?: string; frames?: FrameScheduler } = {}) {
  let wire: StreamState = {
    scope: canonicalScope(query), epoch: null, sequence: -1, cursor: null, ready: false,
    capabilities: null, orderedGap: false, retention: null, resetReason: null,
  }
  const [meta, setMeta] = createStore({ ...wire })
  const topics = createIndex<ReturnType<typeof createIndex<LiveEntity>>>()
  const fields = createIndex<ReturnType<typeof createIndex<LiveEntity>>>()
  const listeners = new Set<AppliedListener>()
  let committed = new Map<string, Change>()
  let pending = new Map<string, Change>()
  let removals = 0
  let replacing = false
  let frameQueued = false
  let stopWatching: (() => void) | undefined

  function applyFrame() {
    frameQueued = false
    if (frames.hidden?.()) { queueFrame(); return }
    stopWatching?.()
    stopWatching = undefined
    const batch = pending
    const replace = replacing
    const nextMeta = wire
    pending = new Map()
    replacing = false
    const applied: AppliedLiveChange[] = []
    function put(key: string, change: Change, previous: LiveEntity | undefined) {
      const { topic, id } = change.entity
      const previousField = fieldOf(previous, meta.scope)
      const next = upserted(change)
      const nextField = fieldOf(next, nextMeta.scope)
      if (previousField !== undefined && previousField !== nextField) {
        const field = fields.get(previousField)
        field?.delete(key)
        if (!field?.size) fields.delete(previousField)
      }
      if (next && nextField !== undefined) {
        let field = fields.get(nextField)
        if (!field) {
          field = createIndex<LiveEntity>()
          fields.set(nextField, field)
        }
        field.set(key, next)
      }
      let entities = topics.get(topic)
      if (next) {
        if (!entities) {
          entities = createIndex<LiveEntity>()
          topics.set(topic, entities)
        }
        entities.set(id, next)
      } else {
        entities?.delete(id)
        if (!entities?.size) topics.delete(topic)
      }
      applied.push({ ...change, previous })
    }

    if (replace) {
      for (const [key, old] of committed) {
        if (!batch.has(key) && old.kind === 'upsert') put(key, { kind: 'remove', entity: old.entity }, old.entity)
      }
    }
    for (const [key, change] of batch) {
      const old = committed.get(key)
      if (change !== old) put(key, change, upserted(old))
      if (!replace) committed.set(key, change)
    }
    if (replace) committed = batch
    setMeta(draft => { Object.assign(draft, nextMeta) })
    flush()
    for (const listener of listeners) listener(applied)
  }

  function queueFrame() {
    if (frameQueued) return
    if (frames.hidden?.() && frames.onVisibilityChange) {
      stopWatching ??= frames.onVisibilityChange(queueFrame)
      return
    }
    frameQueued = true
    frames.request(applyFrame)
  }

  function receive(type: string, message: unknown) {
    const envelope = record(message)
    if (!envelope || envelope.protocol !== 1 || typeof envelope.epoch !== 'string' || typeof envelope.scope !== 'string'
        || !validRevision(envelope.sequence) || envelope.cursor !== `${envelope.epoch}:${envelope.sequence}`) {
      throw new Error('Invalid live stream envelope.')
    }
    if (canonicalScope(envelope.scope) !== wire.scope) return false
    const bootstrap = type === 'bootstrap'
    if (!bootstrap && type !== 'change') throw new Error('Unknown live stream message.')
    if (!bootstrap && (!wire.ready || envelope.epoch !== wire.epoch)) throw new Error('The live stream requires a new snapshot.')
    if (envelope.epoch === wire.epoch && envelope.sequence < wire.sequence) return false
    if (!bootstrap && envelope.sequence === wire.sequence) return false
    const capabilities = bootstrap ? record(envelope.capabilities || wire.capabilities) : wire.capabilities
    if (capabilities?.protocol !== 1 || capabilities.enabled !== true) throw new Error('Invalid live source capabilities.')
    const upserts = bootstrap ? envelope.entities : envelope.upserts || []
    const deleted = bootstrap ? [] : envelope.removals || []
    if (!Array.isArray(upserts) || !Array.isArray(deleted)) throw new Error('Invalid live stream changes.')

    // Validate the full envelope before it can change the pending revisions or cursor.
    const staged = new Map<string, Change>()
    let count = bootstrap ? 0 : removals
    function stage(change: Change) {
      const key = keyOf(change.entity)
      const prior = staged.get(key) ?? (bootstrap ? undefined : pending.get(key) ?? (replacing ? undefined : committed.get(key)))
      if (prior && prior.entity.revision >= change.entity.revision) return
      count += tombstone(change) - tombstone(prior)
      staged.delete(key)
      staged.set(key, change)
    }
    const topics = record(capabilities.topics)
    for (const entity of upserts) stage(readChange('upsert', entity, topics))
    for (const entity of deleted) stage(readChange('remove', entity, topics))
    if (count > MAX_REMOVAL_REVISIONS) throw new Error('Live removal revision capacity requires a new snapshot.')

    if (bootstrap) {
      replacing = true
      pending = staged
    } else {
      for (const [key, change] of staged) {
        pending.delete(key)
        pending.set(key, change)
      }
    }
    removals = count
    wire = {
      ...wire, capabilities, ready: true, epoch: envelope.epoch, sequence: envelope.sequence, cursor: envelope.cursor,
      orderedGap: bootstrap ? !!envelope.ordered_gap : wire.orderedGap,
      retention: bootstrap ? envelope.retention || null : wire.retention,
      resetReason: bootstrap ? envelope.reason || null : wire.resetReason,
    }
    queueFrame()
    return true
  }

  function resetScope(query: string) {
    const retained = new Map<string, Change>()
    const keep = (key: string, change: Change) => {
      const { topic, id } = change.entity
      if (change.kind === 'upsert' && !boardTopics.includes(topic) && !(topic === 'source.status' && id.startsWith('history:'))) {
        retained.set(key, change)
      }
    }
    if (!replacing) for (const [key, change] of committed) if (!pending.has(key)) keep(key, change)
    for (const [key, change] of pending) keep(key, change)
    replacing = true
    pending = retained
    removals = 0
    wire = { ...wire, scope: canonicalScope(query), epoch: null, sequence: -1, cursor: null, ready: false }
    queueFrame()
  }

  // Read only the requested field. Use the server's row key, not its display order.
  function boardField(field: string) {
    let present = false
    let collection = false
    let value: unknown
    const rows = new Map<unknown, { id: string; value: unknown; merge: unknown; order: unknown }>()
    const entries = [...(fields.get(field)?.values() ?? [])]
    for (const topic of boardTopics) {
      for (const entity of entries) {
        if (entity.topic !== topic) continue
        const data = entity.data
        if (data.key == null) {
          present = true
          value = data.value
          collection ||= !!data.collection
        } else {
          const previous = rows.get(data.key)
          const merge = data.merge || previous?.merge
          rows.set(data.key, {
            id: String(data.key), order: Object.hasOwn(data, 'order') ? data.order : previous?.order, merge,
            value: merge ? { ...previous?.value as object, ...data.value as object } : data.value,
          })
        }
      }
    }
    const ordered = collection || rows.size ? [...rows.values()].sort(compareOrder) : undefined
    return {
      present: present || rows.size > 0,
      value: ordered ? ordered.map(row => row.value) : value,
      rowKeys: ordered?.map(row => row.id),
    }
  }

  return {
    topic(topic: string): ValueIndex<LiveEntity> | undefined { return topics.get(topic) },
    get meta(): Readonly<StreamState> { return meta },
    receive,
    resetScope,
    boardField,
    get cursor() { return wire.cursor }, // Reconnect from the accepted cursor, even before the frame runs.
    get pendingCount() { return pending.size },
    requireSnapshot() {
      wire = { ...wire, cursor: null, ready: false }
      queueFrame()
    },
    subscribeApplied(listener: AppliedListener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

function compareOrder(a: { id: string; order: unknown }, b: { id: string; order: unknown }) {
  return Number(a.order ?? 0) - Number(b.order ?? 0) || a.id.localeCompare(b.id)
}

export type LiveStore = ReturnType<typeof createLiveStore>

export function nativeOutput(store: LiveStore, sessionId: string) {
  return orderedNativeOutput(store.topic('runtime.output')?.values(), sessionId)
}

export function orderedNativeOutput(entities: Iterable<LiveEntity> | undefined, sessionId: string) {
  return [...(entities ?? [])]
    .filter(entity => entity.data.session_id === sessionId)
    .sort((a, b) => compareOrder({ id: a.id, order: a.data.order }, { id: b.id, order: b.data.order }))
}
