import { describe, expect, it } from 'vitest'
import { createTableModel, makeColumns, updateTableModel, type Field } from '../src/ui/tableModel'

describe('DRW-ET-01 · drawer list sorting', () => {
  const rows = [
    { key: 'unknown', size: null }, { key: 'measured-empty', size: 0 }, { key: 'long', size: 1200 }, { key: 'short', size: 100 },
  ]
  type Entry = typeof rows[number]
  const fields: Field<Entry>[] = [
    { id: 'key', label: 'Path', read: row => row.key },
    { id: 'size', label: 'Size', read: row => row.size, format: value => `${value} B` },
    { id: 'action', label: 'Action', read: () => undefined, sortable: false },
  ]

  it('sorts raw sizes with unknown last in both directions and keeps stable row identities', () => {
    const table = createTableModel<Entry>(row => row.key)
    const columns = makeColumns(fields)
    const ids = (desc: boolean) => updateTableModel(table, rows, columns, [{ id: 'size', desc }]).map(row => row.id)
    expect(ids(false)).toEqual(['measured-empty', 'short', 'long', 'unknown'])
    expect(ids(true)).toEqual(['long', 'short', 'measured-empty', 'unknown'])
    expect(table.getColumn('action')?.getCanSort()).toBe(false)
  })
})
