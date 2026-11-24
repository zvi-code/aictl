import { createContext, createEffect, createMemo, createSignal, untrack, useContext } from 'solid-js'
import type { DetailNodes, HealthLocal, TableInventory } from '../../data/contract.gen'
import type { PanelContext, Read } from '../types'
import { STALE_AFTER_S, finite, type HealthView } from './healthModel'
import { confirmedHealth, healthNodePath, needsSupplement, scopedHealth } from './scopedHealth'
import { createBoxes } from '../../ui/Box'
import { confirmedBackend, confirmedFlows, type BackendView, type FlowsView } from './flowTrends'
import { confirmedSeries, seriesPath, seriesWindow, type SeriesView, type TrendView } from './trendModel'
import type { HealthWindow } from './windowFacts'
import { statusPath, statusRows, type StatusRow } from './nodeStatus'

const WINDOW_S = 86400
const WINDOW_LABEL = 'last 24 h'

const localHealth = { topic: 'runtime.health', entity: 'local' } as const

type HealthRead = Omit<Read, 'value'> & { value?: HealthView }
export const HealthContext = createContext<ReturnType<typeof healthData>>()

export function useHealth() {
  const data = useContext(HealthContext)
  if (!data) throw new Error('Health data is not available outside the Health screen.')
  return data
}

export function inventoryRead(inventory: TableInventory | null | undefined, parent: Read): Read {
  if (!inventory) return ['loading', 'error'].includes(parent.state) ? parent : { state: 'unavailable' }
  const checked = finite(inventory.checked_at) && inventory.checked_at > 0
  if (!checked) {
    if (inventory.status === 'error') return { state: 'error', message: inventory.last_error ?? 'Could not read table inventory.' }
    if (['pending', 'loading'].includes(inventory.status)) return { state: 'loading', message: 'Waiting for table measurements…' }
    return { state: 'unavailable' }
  }
  if (!Array.isArray(inventory.tables)) return { state: 'unavailable' }
  const time = `Measured ${new Date(inventory.checked_at! * 1000).toLocaleString()}.`
  const note = [inventory.last_error, time, inventory.truncated ? 'The inventory is incomplete.' : undefined].filter(Boolean).join(' ')
  const stale = parent.state === 'stale' || Boolean(inventory.last_error)
    || ['stale', 'error', 'pending'].includes(inventory.status) || inventory.truncated
  return {
    state: stale ? 'stale' : inventory.tables.length ? 'ready' : 'empty',
    value: inventory.tables, message: stale ? note : undefined,
  }
}

export function healthData(ctx: PanelContext) {
  const [now, setNow] = createSignal(Date.now() / 1000)
  createEffect(() => true, () => {
    const tick = () => { if (!document.hidden) setNow(Date.now() / 1000) }
    const timer = setInterval(tick, 5000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  })
  const path = createMemo(() => ctx.scope() === 'local' ? undefined : healthNodePath(ctx.scope(), ctx.nodeId()))
  const remote = untrack(() => ctx.detail<DetailNodes>(path))
  const report = createMemo(() => {
    const value = remote()?.data
    return confirmedHealth(value, ctx.scope(), ctx.nodeId()) ? value : undefined
  })
  const supplementPath = createMemo(() => {
    const value = report()
    return value && needsSupplement(value) ? healthNodePath('local') : undefined
  })
  const supplement = untrack(() => ctx.detail<DetailNodes>(supplementPath))
  createEffect(path, key => {
    if (!key) return
    const refresh = () => {
      if (document.hidden) return
      remote.retry()
      supplement.retry()
    }
    const timer = setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  })
  // Every node's status record: in node and fleet scope part of the health answer (one read for all nodes),
  // in local scope the serving daemon's own record.
  const localStatusPath = createMemo(() => ctx.scope() === 'local' ? statusPath('local') : undefined)
  const localStatus = untrack(() => ctx.detail<DetailNodes>(localStatusPath))
  createEffect(localStatusPath, key => {
    if (!key) return
    const timer = setInterval(() => { if (!document.hidden) localStatus.retry() }, 30000)
    return () => clearInterval(timer)
  })
  const nodeStatus = createMemo<{ rows?: StatusRow[]; error?: string | null; loading: boolean }>(() => {
    if (ctx.scope() === 'local') {
      const response = localStatus()
      const body = response?.data as { error?: string | null } | undefined
      return { rows: statusRows(response?.data), error: response?.error ? String(response.error) : body?.error ?? null,
        loading: !response }
    }
    const value = report()
    return { rows: value?.node_status, error: value?.node_status_error ?? null, loading: !value && !remote()?.error }
  })
  const projection = createMemo(() => {
    const scoped = report()
    if (!scoped) return
    const response = supplement(), local = response?.data
    const runtime = confirmedHealth(local, 'local') && local.local_node?.node_id === scoped.local_node?.node_id ? local.local_runtime : undefined
    const stale = response?.status === 'stale' || Boolean(runtime &&
      (runtime.generated_at < scoped.generated_at - 300 || runtime.generated_at > scoped.generated_at + 60))
    const live = stale ? undefined : runtime
    const message = stale ? 'Serving-node measurements are stale.' : needsSupplement(scoped) && !live
      ? response?.status === 'error' || local ? 'Serving-node measurements could not be refreshed.' : 'Serving-node measurements are pending.'
      : null
    return scopedHealth(scoped, live, message)
  })
  const read = createMemo<HealthRead>(() => {
    if (ctx.scope() === 'local') {
      const source = ctx.read(localHealth)
      const value = source.value as HealthLocal | undefined
      if (source.state === 'error') return { state: 'error', message: `Could not read live health. History is not used as a substitute.${source.message ? ` ${source.message}` : ''}` }
      if (value && (!value.generated_at || now() - value.generated_at > STALE_AFTER_S)) return {
        state: 'stale', value, message: value.generated_at ? 'Health response is stale.' : 'The server does not report a health timestamp.',
      }
      return { ...source, value }
    }
    if (!path()) return { state: 'unavailable', message: 'Choose a node ID to read its health report.' }
    const response = remote(), value = projection()
    if (!value) {
      if (response?.error || response?.data) return {
        state: 'error', message: response?.error
          ? `Could not read node health. History is not used as a substitute. ${String(response.error)}`
          : 'The server did not return the requested node view.',
      }
      return { state: 'loading' }
    }
    const stale = response?.status === 'refreshing' || response?.status === 'stale' || now() - value.generated_at > STALE_AFTER_S
    return { state: stale ? 'stale' : 'ready', value, message: response?.error ? String(response.error) : undefined }
  })
  // The same 24 h windows as the default range of the trends, so the status and the charts count the same rows.
  const range = createMemo(() => seriesWindow(now(), WINDOW_S))
  const windowView = <T extends DetailNodes>(view: TrendView, confirm: (value: DetailNodes | undefined, scope: 'local' | 'node' | 'fleet', nodeId: string | null) => boolean) => {
    const where = createMemo(() => seriesPath(ctx.scope(), ctx.nodeId(), range().since, range().until, view))
    const resource = untrack(() => ctx.detail<DetailNodes>(where))
    return Object.assign(createMemo(() => {
      const value = resource()?.data
      return confirm(value, ctx.scope(), ctx.nodeId()) ? value as T : undefined
    }), { retry: resource.retry })
  }
  const seriesWindowRead = windowView<SeriesView>('series', confirmedSeries)
  const flowsWindowRead = windowView<FlowsView>('flows', confirmedFlows)
  const backendWindowRead = windowView<BackendView>('backend', confirmedBackend)
  createEffect(() => true, () => {
    const timer = setInterval(() => {
      if (document.hidden) return
      seriesWindowRead.retry(); flowsWindowRead.retry(); backendWindowRead.retry()
    }, 30000)
    return () => clearInterval(timer)
  })
  const window = createMemo<HealthWindow>(() => ({
    label: WINDOW_LABEL, series: seriesWindowRead(), flows: flowsWindowRead(), backend: backendWindowRead(),
  }))
  const boxes = createBoxes('aictl-pref-health-boxes')
  const inventory = createMemo(() => {
    if (ctx.scope() !== 'local') return read().value?.store?.table_inventory
    const live = ctx.read({ topic: 'runtime.health', entity: 'table_inventory', path: 'inventory' })
    return (live.value as TableInventory | undefined) ?? read().value?.store?.table_inventory
  })
  const readInventory = () => inventoryRead(inventory(), read())
  return { now, read, inventory, readInventory, window, boxes, nodeStatus }
}
