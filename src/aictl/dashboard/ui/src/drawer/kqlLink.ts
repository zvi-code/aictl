import type { PanelContext } from '../panels/types'

type Filters = Record<string, string | number | boolean | null | undefined>
const filters = new WeakMap<PanelContext, { id: string; scope: string; node: string | null; values?: Filters }>()

export function saveFlowFilters(ctx: PanelContext, id: string, values?: Filters) {
  filters.set(ctx, { id, scope: ctx.scope(), node: ctx.nodeId(), values })
}

export function lastFlowFilters(ctx: PanelContext, id: string) {
  const entry = filters.get(ctx)
  return entry?.id === id && entry.scope === ctx.scope() && entry.node === ctx.nodeId() ? entry.values : undefined
}

export function kustoLink(value?: string | null, query?: string) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || !/^\/[^/]+$/.test(url.pathname)) return undefined
    url.hash = ''
    if (query != null) {
      if (!query.trim()) return undefined
      url.search = new URLSearchParams({ web: '1', autorun: 'false', query }).toString()
    } else url.searchParams.set('autorun', 'false')
    return url.href
  } catch { return undefined }
}
