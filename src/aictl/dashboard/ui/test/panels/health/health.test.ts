import { describe, expect, it } from 'vitest'
import type { TableInventory } from '../../../src/data/contract.gen'
import { inventoryRead } from '../../../src/panels/health/healthData'
import { healthSources } from '../../../src/panels/health/healthModel'
import { confirmedHealth, scopedHealth, writerRows, type HealthNodeView } from '../../../src/panels/health/scopedHealth'

const now = 1000
const inventory: TableInventory = {
  attempted_at: now, checked_at: null, last_error: null, limit: 500, refresh_interval_s: 300,
  scope: 'shared', size_scope: 'sealed extents', status: 'pending', truncated: false, tables: [],
}

describe('Health inventory', () => {
  it('distinguishes a first inventory attempt from zero measured rows', () => {
    expect(inventoryRead(inventory, { state: 'ready' }).state).toBe('loading')
    expect(inventoryRead({ ...inventory, status: 'error' }, { state: 'ready' }).state).toBe('error')
    expect(inventoryRead(undefined, { state: 'ready' }).state).toBe('unavailable')
    expect(inventoryRead({ ...inventory, status: 'cached', checked_at: now }, { state: 'ready' }).state).toBe('empty')
  })

  it('keeps the last measured table after a read error and preserves zero', () => {
    const tables = [{ name: 'measured', rows: 0, extent_count: 0, compressed_bytes: null, extent_bytes: null, hot_bytes: null, original_bytes: null }]
    expect(inventoryRead({ ...inventory, status: 'error', last_error: 'Timeout', checked_at: now - 60, tables }, { state: 'ready' }))
      .toMatchObject({ state: 'stale', value: tables, message: expect.stringContaining('Timeout') })
  })
})

describe('Scoped Health', () => {
  const sample = (node: string, pid: number, at: number, readRate: number): HealthNodeView['rows'][number] => ({
    node_id: node, captured_at: now, status: 'reported', cpu_percent: 5, memory_total_mb: null, memory_used_mb: null,
    active_sessions: 0, active_processes: 0, daemon_pid: pid, activity_at: now,
    client_sample: { at, pid, store: { reads: { rate_per_s: readRate }, ingestion_traffic: {
      queued: { groups: [{ id: 'events', tables: [node], rows_per_s: readRate }] },
    } } },
  })
  const report: HealthNodeView = {
    scope: 'fleet', view: 'health', rows: [sample('a', 1, now, 0), sample('b', 2, now, 8), sample('c', 3, 500, 300)],
    generated_at: now, read_only: true, fleet_available: true, local_node: { node_id: 'other', source: 'hostname' },
    shared_kusto: { scope: 'shared', cluster: 'store.example.test', database: 'example',
      capacity_total: 12, capacity_available: 0, capacity_checked_at: now, table_inventory: inventory },
  }

  it('combines only fresh client counters and keeps one shared inventory', () => {
    const value = scopedHealth(report)
    expect(value.node_report?.contributors).toEqual(['a', 'b'])
    expect(value.store?.reads?.rate_per_s).toBe(8)
    expect(value.store?.ingestion_capacity).toMatchObject({ total: 12, available: 0, in_use: 12 })
    expect(value.store?.table_inventory).toBe(inventory)
    expect(value.store?.ingestion_traffic).toMatchObject({
      queued: { groups: [{ id: 'events', tables: ['a', 'b'], rows_per_s: 8 }] },
    })
    expect(value.store?.ingestion_traffic?.inline).toBeUndefined()
    expect(value.writers).toEqual([])
  })

  it('rejects a node response with a row from another scope', () => {
    expect(confirmedHealth({ ...report, scope: 'node' }, 'node', 'a')).toBe(false)
    expect(confirmedHealth({ ...report, scope: 'node', rows: [report.rows[0]] }, 'node', 'a')).toBe(true)
  })

  it('keeps zero drops and does not invent a missing queue value', () => {
    const rows = writerRows([{ node_id: 'a', tables: { events: { rows_dropped: 0 } } }, { node_id: 'b', tables: { events: { queue_depth: 7 } } }])
    expect(rows).toEqual([{ name: 'events', node_id: 'a', rows_dropped: 0 }, { name: 'events', node_id: 'b', queue_depth: 7 }])
  })

  it('keeps a hook-only tool and does not invent receiver counts', () => {
    expect(healthSources({ generated_at: now, pipeline: { hooks: { 'hook-tool': { count: 0, last_fire_ts: null } } } }))
      .toMatchObject([{ tool: 'hook-tool', hook_count: 0, metrics: undefined, last_data_ts: null }])
  })
})
