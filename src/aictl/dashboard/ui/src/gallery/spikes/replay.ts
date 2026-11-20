import { createSignal, createStore, flush, reconcile } from 'solid-js'

export type Topic = 'runtime.agent' | 'runtime.process' | 'runtime.machine'
export type RuntimeData = {
  name?: string
  tool?: string
  status?: string
  pid?: number
  cpu_percent?: number
  mem_mb?: number
  memory_rss_bytes?: number
  generated_at?: number
  cpu_per_core?: (number | null)[]
}
type Entity = { topic: Topic; id: string; data?: RuntimeData }
type Frame = { entities?: Entity[]; upserts?: Entity[]; removals?: Entity[] }
type Arrival = { time: number; sequence: number }
type Pending = { data?: RuntimeData; receipt: Arrival }

export const entityKey = (topic: Topic, id: string) => `${topic}/${id}`
export const machineKey = entityKey('runtime.machine', 'local')

export function cpuLabel(value: number | null | undefined) {
  return value == null ? '—' : `${value.toFixed(1)} %`
}

function project(topic: Topic, data: RuntimeData): RuntimeData {
  const { name, tool, status, pid, cpu_percent, mem_mb, memory_rss_bytes, generated_at, cpu_per_core } = data
  if (topic === 'runtime.machine') return { generated_at, cpu_per_core }
  if (topic === 'runtime.agent') return { tool, status, cpu_percent, mem_mb }
  return { name, pid, cpu_percent, memory_rss_bytes }
}

export function afterPaint(callback: (time: number) => void) {
  requestAnimationFrame(() => requestAnimationFrame(() => callback(performance.now())))
}

export function createReplay(topics: readonly Topic[]) {
  const [values, setValues] = createStore<Partial<Record<string, RuntimeData>>>({})
  const [roster, setRoster] = createSignal<ReadonlyMap<Topic, string[]>>()
  let pending = new Map<string, Pending>()
  const samples = { received: 0, coalesced: 0, changes: 0, bootstraps: 0, batches: 0 }
  const source = new EventSource('/api/live/stream')
  const allowed = new Set(topics)
  let raf = 0
  let nextPaint = 0
  let measured: MutationObserver | undefined
  let initial: Map<Topic, string[]> | undefined

  function apply() {
    raf = 0
    const batch = pending
    pending = new Map()
    samples.batches++
    measured?.takeRecords()
    setValues(draft => {
      for (const [key, { data }] of batch) {
        if (data === undefined) delete draft[key]
        else if (draft[key]) reconcile(data, null)(draft[key])
        else draft[key] = data
      }
    })
    if (initial) {
      setRoster(initial)
      initial = undefined
    }
    flush()

    // Sample one batch, from the oldest retained receipt that changed the live DOM.
    let receipt: Arrival | undefined
    for (const mutation of measured?.takeRecords() ?? []) {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
      const live = target?.closest<HTMLElement>('[data-live-key], [data-row-id]')
      const key = live?.dataset.liveKey ?? live?.dataset.rowId
      const entry = key === undefined ? undefined : batch.get(key)
      if (entry && live?.isConnected && (!receipt || entry.receipt.time < receipt.time)) receipt = entry.receipt
    }
    if (receipt) {
      const arrival = receipt
      performance.mark('spike:frame-update')
      cancelAnimationFrame(nextPaint)
      nextPaint = requestAnimationFrame(() => {
        performance.measure('spike:message-to-paint', { start: arrival.time, detail: arrival.sequence })
      })
    }
  }

  function receive(event: MessageEvent<string>, bootstrap: boolean) {
    const mark = performance.mark('spike:message-received', { detail: bootstrap ? 'bootstrap' : 'change' })
    const receipt = { time: mark.startTime, sequence: ++samples.received }
    const { entities, upserts, removals } = JSON.parse(event.data) as Frame
    const enqueue = ({ topic, id, data }: Entity, remove = false) => {
      if (!allowed.has(topic)) return
      const key = entityKey(topic, id)
      if (pending.has(key)) samples.coalesced++
      pending.set(key, { data: !remove && data ? project(topic, data) : undefined, receipt })
    }
    if (bootstrap) {
      samples.bootstraps++
      // The spike uses a fixed working set from the first bootstrap. Replays can
      // reset values without replacing the rows or creating new placeholder ids.
      if (!roster() && !initial) {
        initial = new Map()
        for (const { topic, id } of entities ?? []) {
          if (!allowed.has(topic)) continue
          const ids = initial.get(topic)
          if (ids) ids.push(id)
          else initial.set(topic, [id])
        }
      }
      pending.clear()
      for (const key of Object.keys(values)) pending.set(key, { receipt })
      entities?.forEach(entity => enqueue(entity))
    } else {
      samples.changes++
      upserts?.forEach(entity => enqueue(entity))
      removals?.forEach(entity => enqueue(entity, true))
    }
    if (pending.size && !raf) raf = requestAnimationFrame(apply)
  }
  source.addEventListener('bootstrap', event => receive(event, true))
  source.addEventListener('change', event => receive(event, false))

  return {
    values, roster, samples,
    observe(root: HTMLElement) {
      measured = new MutationObserver(() => {})
      measured.observe(root, { subtree: true, childList: true, characterData: true })
    },
    close() {
      source.close()
      cancelAnimationFrame(raf)
      cancelAnimationFrame(nextPaint)
      measured?.disconnect()
    },
  }
}

export type Replay = ReturnType<typeof createReplay>

export function measureInput(event: Event) {
  const start = event.timeStamp
  afterPaint(() => performance.measure('spike:input-to-paint', { start }))
}

export function spikeReady(root: HTMLElement) {
  void document.fonts.ready.then(() => afterPaint(() => {
    root.dataset.ready = 'true'
    performance.mark('spike:first-paint')
  }))
}
