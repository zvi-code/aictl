import { describe, expect, it } from 'vitest'
import type { SerializedDockview } from 'dockview-core'
import { panelOrder, pruneDock, reorderPanel, restoreLayout, sections } from '../src/panels/layout'
import { keyedRows, nodeColumn } from '../src/panels/kinds/model'

describe('saved dock layout', () => {
  const tree = {
    grid: { width: 1200, height: 320, orientation: 'HORIZONTAL',
      root: { type: 'branch', size: 1200, data: [{ type: 'leaf', size: 1200,
        data: { id: 'group', views: ['removed', 'tokens'], activeView: 'removed' } }] } },
    panels: {
      removed: { id: 'removed', contentComponent: 'panel' },
      tokens: { id: 'tokens', contentComponent: 'panel', params: { series: 'output' } },
    },
    activeGroup: 'group',
  } as SerializedDockview

  it('drops removed IDs, preserves parameters and selects a surviving tab', () => {
    const restored = pruneDock(tree, new Set(['tokens']), new Set())
    expect(Object.keys(restored.panels)).toEqual(['tokens'])
    expect(restored.panels.tokens.params).toEqual({ series: 'output' })
    expect(restored.grid.root.data).toMatchObject([{ data: { views: ['tokens'], activeView: 'tokens' } }])
    expect(pruneDock(tree, new Set(['tokens']), new Set(['tokens'])).grid.root.data).toEqual([])
  })

  it('rejects invalid grids and duplicate sections', () => {
    expect(() => pruneDock({ ...tree, grid: { ...tree.grid, width: NaN } }, new Set(), new Set())).toThrow()
    const saved = sections.board.map(section => ({ id: section.id, open: true, height: 300, tree }))
    expect(restoreLayout(JSON.stringify({ version: 1, screen: 'board', tree: saved }), 'board')).toHaveLength(saved.length)
    expect(restoreLayout(JSON.stringify({ version: 1, screen: 'board', tree: [...saved, saved[0]] }), 'board')).toBeUndefined()
  })

  it('moves a panel across a stack boundary without changing group sizes or panel parameters', () => {
    const group = { type: 'leaf', size: 400, data: { id: 'group2', views: ['cost'], activeView: 'cost' } } as const
    const input = {
      ...tree,
      grid: { ...tree.grid, root: { ...tree.grid.root, data: [...tree.grid.root.data as SerializedDockview['grid']['root'][], group] } },
    } as SerializedDockview
    const moved = reorderPanel(input, 'tokens', 1)
    expect(panelOrder(moved)).toEqual(['removed', 'cost', 'tokens'])
    expect(moved.grid.root.data).toMatchObject([{ size: 1200 }, { size: 400, data: { activeView: 'tokens' } }])
    expect(moved.panels.tokens.params).toEqual({ series: 'output' })
    expect(reorderPanel(input, 'removed', -1)).toBe(input)
  })
})

describe('declarative rows', () => {
  it('uses stream keys and scopes matching native IDs from different nodes', () => {
    const value = [{ id: 'session', node_id: 'a' }, { id: 'session', node_id: 'b' }, { id: 'session' }]
    const live = keyedRows({ state: 'ready', value, rowKeys: ['one', 'two', 'three'] }, ['id'])
    expect(live.map(row => row.id)).toEqual(['one', 'two', 'three'])
    const remote = keyedRows({ state: 'ready', value }, ['id'])
    expect(new Set(remote.map(row => row.id)).size).toBe(3)
    expect(nodeColumn('fleet', remote)).toBe(true)
    expect(nodeColumn('node', remote.slice(2))).toBe(false)
    expect(nodeColumn('local', live)).toBe(false)
  })
})
