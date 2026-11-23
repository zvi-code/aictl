import type { BoardRange, BoardSeries, ContextLocal } from '../../data/contract.gen'
import type { Row } from '../types'
import { messageRoles } from './aFields'

type Sample = number | null
type Series = { key: string; label: string; values: Sample[] }
const total = (list: readonly Sample[]) => list.reduce<number>((sum, value) => sum + (value ?? 0), 0)
const sample = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null

export function messageBuckets(range?: BoardRange, messages?: BoardSeries['messages']) {
  return range?.bucket_starts?.flatMap((x, i) => Number.isFinite(x)
    ? [{ x, values: messageRoles.map(role => sample(messages?.[role]?.[i])) }] : []) ?? []
}

export function rankedSeries(map: Row | undefined, strictOther = false): Series[] {
  if (!map) return []
  const series = Object.entries(map).flatMap(([key, data]) =>
    Array.isArray(data) ? [{ key, label: key, values: data.map(sample) }] : [])
    .map(entry => ({ entry, total: total(entry.values) }))
    .sort((a, b) => b.total - a.total).map(({ entry }) => entry)
  const shown = series.slice(0, 5), rest = series.slice(5)
  if (!rest.length) return shown
  const values = Array.from({ length: Math.max(...rest.map(entry => entry.values.length)) }, (_, i) => {
    const bucket = rest.map(entry => entry.values[i] ?? null)
    if (bucket.every(value => value === null) || (strictOther && bucket.includes(null))) return null
    return total(bucket)
  })
  return [...shown, { key: '', label: `Other (${rest.length})`, values }]
}

type Daily = ContextLocal['daily']
export type DailyMetric = 'tokens' | 'cost_usd' | 'requests'
export function dailyValues(days: readonly string[], rows: Daily['rows'], key: DailyMetric) {
  const indexes = new Map(days.map((day, i) => [day, i]))
  const values = new Map<string, (Sample | undefined)[]>()
  for (const row of rows) {
    const i = indexes.get(row.date)
    if (i === undefined) continue
    const model = row.model || 'Model not reported'
    let series = values.get(model)
    if (!series) values.set(model, series = days.map(() => undefined))
    const value = sample(row[key])
    // Keep an unknown contribution unknown when more than one node reports the same day.
    const previous = series[i]
    series[i] = previous === null || value === null ? null : (previous ?? 0) + value
  }
  return rankedSeries(Object.fromEntries(values), true)
}

export type MapDimension = 'kind' | 'scope' | 'project' | 'policy'
type MapEntry = ContextLocal['map']['rows'][number]
type Segment = { key: string; tokens: Sample; files: Sample }
export function mapRows(rows: readonly MapEntry[], by: MapDimension) {
  const segBy = by === 'scope' ? 'kind' : 'scope'
  const groups = new Map<string, Segment & { segs: Map<string, Segment> }>()
  const add = (group: Segment, row: MapEntry) => {
    group.tokens = group.tokens === null || sample(row.tokens) === null ? null : group.tokens + row.tokens
    group.files = group.files === null || sample(row.files) === null ? null : group.files + row.files
  }
  for (const row of rows) {
    const key = row[by] ?? 'Not available from this source'
    const segment = row[segBy] ?? 'Not available from this source'
    if (!groups.has(key)) groups.set(key, { key, tokens: 0, files: 0, segs: new Map() })
    const group = groups.get(key)!
    if (!group.segs.has(segment)) group.segs.set(segment, { key: segment, tokens: 0, files: 0 })
    add(group, row)
    add(group.segs.get(segment)!, row)
  }
  const compare = (a: Segment, b: Segment) => (b.tokens ?? -1) - (a.tokens ?? -1)
  return [...groups.values()].map(group => ({ ...group, segs: [...group.segs.values()].sort(compare) })).sort(compare)
}

type Memory = ContextLocal['memory']['entries'][number]
export function memoryGroups<T extends Memory>(entries: readonly T[]) {
  const groups = new Map<string | null, { source: string | null; label: string | null;
    count: number; tokens: Sample; profiles: Map<string | null, T[]> }>()
  for (const entry of entries) {
    const { source, profile } = entry
    if (!groups.has(source)) groups.set(source, { source, label: entry.source_label || source, count: 0, tokens: 0, profiles: new Map() })
    const group = groups.get(source)!
    group.tokens = group.tokens === null || sample(entry.tokens) === null ? null : group.tokens + entry.tokens
    group.count++
    if (!group.profiles.has(profile)) group.profiles.set(profile, [])
    group.profiles.get(profile)!.push(entry)
  }
  return [...groups.values()].map(group => ({ ...group, profiles: [...group.profiles].map(([profile, items]) => ({
    profile, items, tokens: items.every(item => sample(item.tokens) !== null) ? total(items.map(item => item.tokens)) : null,
  })) }))
}

export const logWidth = (value: number, max: number) => value > 0 && max > 0
  ? Math.max(2, (Math.log10(value + 1) / Math.log10(max + 1)) * 100) : 0

export function knownSum(values: readonly unknown[]): number | undefined {
  if (!values.length) return undefined
  let total = 0
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
    total += value
  }
  return total
}

/** The cost of the rows that have a price, and the models left out of it with their tokens.
 * A row with tokens and no cost is a model the price list (data/model_pricing.py) does not have,
 * priced by the same path as the Cost panel: the total names what it leaves out, never says N/A. */
export function pricedCost(rows: readonly { model?: string | null; tokens?: number | null; cost_usd?: number | null }[]) {
  let cost: number | undefined
  const unpriced = new Map<string, number>()
  for (const row of rows) {
    if (typeof row.cost_usd === 'number' && Number.isFinite(row.cost_usd)) cost = (cost ?? 0) + row.cost_usd
    else if ((row.tokens ?? 0) > 0) unpriced.set(row.model || 'model not reported', (unpriced.get(row.model || 'model not reported') ?? 0) + row.tokens!)
  }
  return { cost, unpriced: [...unpriced].sort((a, b) => b[1] - a[1]).map(([model, tokens]) => ({ model, tokens })) }
}

export function modelAllocation(agent: Row, model: unknown) {
  if (!Array.isArray(agent.models) || agent.models.length !== 1 || agent.models[0] !== model) return {}
  const messages = agent.msgs as Row | undefined
  return {
    msgs: knownSum([messages?.user, messages?.assistant, messages?.tool]),
    tokens: knownSum([agent.input, agent.output, agent.cache_read, agent.cache_write]),
    input: agent.input, output: agent.output, cache_read: agent.cache_read,
    cache_write: agent.cache_write, cached_share: agent.cached_share, cost_usd: agent.cost_usd,
  }
}
