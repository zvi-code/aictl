import type { FieldRef } from '../types'

export const field = (path: string, label: string, datapoint?: string, format?: 'timestamp'): FieldRef =>
  ({ path, label, datapoint, format })
export const tokens = (path: string, label: string) => field(path, label, 'board.kpi.tokens')
export const count = (path: string, label: string, key = 'board.kpi.messages') => field(path, label, key)
export const cost = (path = 'cost_usd', label = 'Cost') => field(path, label, 'board.kpi.cost_usd')
export const stamp = (path: string, label: string) => field(path, label, undefined, 'timestamp')
export const bucketAxis = { field: 'range', path: 'bucket_starts', wholeRange: true } as const
export const missing = 'Not available from this source'
