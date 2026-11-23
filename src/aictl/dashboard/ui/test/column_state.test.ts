// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRoot, createSignal, flush } from 'solid-js'
import {
  arrangeColumns, clampWidth, createColumnLayout, emptyLayout, hideColumn, loadLayout, maxWidth, minWidth, moveColumn,
  normalizeLayout, placeColumn, saveLayout, showColumn, tableKey, type ColumnSpec,
} from '../src/ui/columnState'

class MemoryStorage {
  data = new Map<string, string>()
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, String(value)) }
  removeItem(key: string) { this.data.delete(key) }
  clear() { this.data.clear() }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  get length() { return this.data.size }
}

const storage = new MemoryStorage()
beforeEach(() => { storage.clear(); Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true }) })
afterEach(() => { Reflect.deleteProperty(globalThis, 'localStorage') })

const columns: ColumnSpec[] = [
  { id: 'name', label: 'Name' }, { id: 'status', label: 'Status' }, { id: 'tokens', label: 'Tokens' }, { id: 'cost', label: 'Cost' },
]
const ids = (list: readonly ColumnSpec[]) => list.map(column => column.id)

describe('TBL-COL-01 · column layout model', () => {
  it('names one storage key per table under one prefix', () => {
    expect(tableKey('Recorded agents')).toBe('aictl-table-v1:Recorded agents')
  })

  it('applies order, hidden and widths to the fields', () => {
    const layout = { order: ['cost', 'name', 'status', 'tokens'], hidden: ['status'], widths: { name: 120 } }
    const { visible, all } = arrangeColumns(columns, layout)
    expect(ids(visible)).toEqual(['cost', 'name', 'tokens'])
    expect(ids(all)).toEqual(['cost', 'name', 'status', 'tokens'])
  })

  it('drops columns that no longer exist and appends new columns visible', () => {
    const stale = { order: ['gone', 'tokens', 'name'], hidden: ['gone', 'status'], widths: { gone: 90, tokens: 99999, name: 1 } }
    const layout = normalizeLayout(stale, columns)
    expect(layout).toEqual({ order: ['tokens', 'name', 'status', 'cost'], hidden: ['status'], widths: { tokens: maxWidth, name: minWidth } })
    expect(ids(arrangeColumns(columns, layout).visible)).toEqual(['tokens', 'name', 'cost'])
  })

  it('rejects malformed stored state instead of throwing', () => {
    expect(normalizeLayout('nonsense', columns)).toEqual({ order: ids(columns), hidden: [], widths: {} })
    expect(normalizeLayout({ order: 3, hidden: [1, 'cost'], widths: { name: 'wide', cost: Number.NaN } }, columns))
      .toEqual({ order: ids(columns), hidden: ['cost'], widths: {} })
  })

  it('always keeps one column visible', () => {
    let layout = emptyLayout(columns)
    for (const id of ['name', 'status', 'tokens']) layout = hideColumn(layout, columns, id)
    expect(hideColumn(layout, columns, 'cost')).toBe(layout)
    expect(ids(arrangeColumns(columns, normalizeLayout({ hidden: ids(columns) }, columns)).visible)).toEqual(['name'])
  })

  it('keeps pinned columns in place and visible', () => {
    const pinned: ColumnSpec[] = [{ id: 'name', label: 'Name', pin: 'start' }, ...columns.slice(1), { id: 'action', label: 'Actions', pin: 'end' }]
    const layout = normalizeLayout({ order: ['action', 'cost', 'name'], hidden: ['name', 'action'] }, pinned)
    expect(layout.hidden).toEqual([])
    expect(ids(arrangeColumns(pinned, layout).visible)).toEqual(['name', 'cost', 'status', 'tokens', 'action'])
    expect(hideColumn(layout, pinned, 'name')).toBe(layout)
    expect(moveColumn(layout, pinned, 'name', 1)).toBe(layout)
    expect(moveColumn(layout, pinned, 'cost', -1)).toBe(layout)
    expect(placeColumn(layout, pinned, 'tokens', 'name', 'before')).toBe(layout)
  })

  it('moves a column past its visible neighbour, skipping hidden ones', () => {
    let layout = hideColumn(emptyLayout(columns), columns, 'status')
    layout = moveColumn(layout, columns, 'name', 1)
    expect(ids(arrangeColumns(columns, layout).visible)).toEqual(['tokens', 'name', 'cost'])
    expect(moveColumn(layout, columns, 'cost', 1)).toBe(layout)
    layout = placeColumn(layout, columns, 'cost', 'tokens', 'before')
    expect(ids(arrangeColumns(columns, layout).visible)).toEqual(['cost', 'tokens', 'name'])
    layout = showColumn(layout, columns, 'status')
    expect(arrangeColumns(columns, layout).visible.length).toBe(4)
  })

  it('clamps widths to the narrow minimum and the maximum', () => {
    expect(clampWidth(3)).toBe(minWidth)
    expect(clampWidth(5000)).toBe(maxWidth)
    expect(clampWidth(100.4)).toBe(100)
    expect(minWidth).toBeLessThanOrEqual(40)
  })
})

describe('TBL-COL-02 · column layout persistence', () => {
  it('round-trips through one key and removes the key when the layout is the default again', () => {
    const key = tableKey('Agents')
    const layout = { order: ['status', 'name', 'tokens', 'cost'], hidden: ['cost'], widths: { status: 80 } }
    saveLayout(key, layout, columns)
    expect(JSON.parse(storage.getItem(key)!)).toEqual(layout)
    expect(loadLayout(key, columns)).toEqual(layout)
    saveLayout(key, emptyLayout(columns), columns)
    expect(storage.getItem(key)).toBeNull()
  })

  it('treats default-hidden columns as the default and restores them on reset', () => {
    const key = tableKey('Sessions')
    expect(loadLayout(key, columns, { defaultHidden: ['cost'] }).hidden).toEqual(['cost'])
    saveLayout(key, emptyLayout(columns, ['cost']), columns, ['cost'])
    expect(storage.getItem(key)).toBeNull()
    saveLayout(key, emptyLayout(columns), columns, ['cost'])
    expect(JSON.parse(storage.getItem(key)!).hidden).toEqual([])
  })

  it('works without storage and ignores unreadable values', () => {
    Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('denied') }, configurable: true })
    expect(loadLayout(tableKey('x'), columns)).toEqual(emptyLayout(columns))
    expect(() => saveLayout(tableKey('x'), emptyLayout(columns), columns)).not.toThrow()
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
    storage.setItem(tableKey('x'), '{not json')
    expect(loadLayout(tableKey('x'), columns)).toEqual(emptyLayout(columns))
  })

  it('migrates old keys once and tolerates bad old values', () => {
    storage.setItem('old-hidden', JSON.stringify(['status', 7]))
    expect(loadLayout(tableKey('a'), columns, { legacy: { hidden: 'old-hidden' } }).hidden).toEqual(['status'])
    storage.setItem('old-visible', JSON.stringify(['tokens']))
    expect(loadLayout(tableKey('b'), columns, { legacy: { visible: 'old-visible' } }).hidden).toEqual(['status', 'cost'])
    storage.setItem('old-widths', JSON.stringify([100, 60, 70, 80, 90]))
    expect(loadLayout(tableKey('c'), columns, { legacy: { widths: 'old-widths', widthIds: [...ids(columns), 'action'] } }).widths)
      .toEqual({ name: 100, status: 60, tokens: 70, cost: 80 })
    storage.setItem('old-bad', '{')
    expect(loadLayout(tableKey('d'), columns, { legacy: { hidden: 'old-bad', widths: 'old-bad', widthIds: ids(columns) } })).toEqual(emptyLayout(columns))
    // The new key wins once it exists.
    saveLayout(tableKey('a'), emptyLayout(columns, []), columns, ['tokens'])
    expect(loadLayout(tableKey('a'), columns, { legacy: { hidden: 'old-hidden' }, defaultHidden: ['tokens'] }).hidden).toEqual([])
  })
})

describe('TBL-COL-04 · one column control', () => {
  it('keeps column layout storage and header grips in the shared module only', () => {
    const root = join(process.cwd(), 'src')
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter(file => /\.tsx?$/.test(file))
    const offenders = files.filter(file => {
      const text = readFileSync(join(root, file), 'utf8')
      const columnStorage = /localStorage/.test(text) && /column/i.test(text) && !file.endsWith('columnState.ts') && !file.includes('Flow')
      return columnStorage || /ResizableTable|TableColumns|columnMenu/.test(text)
    })
    expect(offenders).toEqual([])
  })
})

describe('TBL-COL-03 · column layout controller', () => {
  it('hides, moves, resizes and resets with one saved key', () => {
    const { control, dispose } = createRoot(dispose => ({
      control: createColumnLayout({ key: () => tableKey('Agents'), columns: () => columns }), dispose,
    }))
    {
      control.hide('status')
      flush()
      expect(ids(control.visible())).toEqual(['name', 'tokens', 'cost'])
      expect(control.hiddenCount()).toBe(1)
      control.move('name', 1)
      control.setWidth('cost', 77)
      flush()
      expect(ids(control.visible())).toEqual(['tokens', 'name', 'cost'])
      expect(control.width('cost')).toBe(77)
      expect(JSON.parse(storage.getItem(tableKey('Agents'))!)).toEqual({ order: ['status', 'tokens', 'name', 'cost'], hidden: ['status'], widths: { cost: 77 } })
      control.reset()
      flush()
      expect(ids(control.visible())).toEqual(ids(columns))
      expect(storage.getItem(tableKey('Agents'))).toBeNull()
      dispose()
    }
  })

  it('reads the layout of the new key when a dynamic label changes', () => {
    saveLayout(tableKey('two'), { order: ids(columns), hidden: ['cost'], widths: {} }, columns)
    const [label, setLabel] = createSignal('one')
    const { control, dispose } = createRoot(dispose => ({
      control: createColumnLayout({ key: () => tableKey(label()), columns: () => columns }), dispose,
    }))
    control.hide('status')
    flush()
    expect(control.hiddenCount()).toBe(1)
    setLabel('two')
    flush()
    expect(ids(control.visible())).toEqual(['name', 'status', 'tokens'])
    setLabel('one')
    flush()
    expect(ids(control.visible())).toEqual(['name', 'tokens', 'cost'])
    dispose()
  })
})
