import { describe, expect, it } from 'vitest'
import { emptyBoxes, hiddenBoxes, readBoxes, reduceBoxes, writeBoxes, type BoxEvent, type BoxState } from '../src/ui/boxState'

const run = (...events: BoxEvent[]) => events.reduce(reduceBoxes, emptyBoxes())
const memory = () => {
  const items = new Map<string, string>()
  return { items, getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value) },
    removeItem: (key: string) => { items.delete(key) } }
}

describe('UI-BOX-01 · Box controls', () => {
  it('folds and unfolds a box, and expands it to its container and back', () => {
    expect(run({ type: 'fold', id: 'a' }).folded).toEqual(['a'])
    expect(run({ type: 'fold', id: 'a' }, { type: 'fold', id: 'a' }).folded).toEqual([])
    expect(run({ type: 'expand', id: 'a' }).expanded).toEqual(['a'])
    expect(run({ type: 'expand', id: 'a' }, { type: 'expand', id: 'a' }).expanded).toEqual([])
  })

  it('shows one box full screen, open, and returns it with the same button or Escape', () => {
    const full = run({ type: 'fold', id: 'chart' }, { type: 'full', id: 'chart' })
    expect(full).toMatchObject({ full: 'chart', folded: [] })
    expect(reduceBoxes(full, { type: 'full', id: 'chart' }).full).toBeUndefined()
    expect(reduceBoxes(full, { type: 'escape' }).full).toBeUndefined()
    expect(reduceBoxes(full, { type: 'full', id: 'other' }).full).toBe('other')
    expect(reduceBoxes(full, { type: 'fold', id: 'chart' })).toMatchObject({ full: undefined, folded: ['chart'] })
    const quiet = emptyBoxes()
    expect(reduceBoxes(quiet, { type: 'escape' })).toBe(quiet)
  })

  it('hides a box, leaves full screen when it was the full one, and restores it from the hidden list', () => {
    const hidden = run({ type: 'full', id: 'chart' }, { type: 'hide', id: 'chart' }, { type: 'hide', id: 'chart' }, { type: 'hide', id: 'totals' })
    expect(hidden).toMatchObject({ hidden: ['chart', 'totals'], full: undefined })
    const labels = new Map([['chart', 'Flow chart'], ['totals', 'Session totals'], ['filters', 'Filters']])
    expect(hiddenBoxes(hidden, labels)).toEqual([{ id: 'chart', label: 'Flow chart' }, { id: 'totals', label: 'Session totals' }])
    expect(reduceBoxes(hidden, { type: 'restore', id: 'chart' }).hidden).toEqual(['totals'])
    // A hidden box whose label is not registered on this screen is not offered.
    expect(hiddenBoxes({ ...hidden, hidden: ['gone'] }, labels)).toEqual([])
  })

  it('keeps folded, expanded and hidden boxes per browser but never full screen, and works without storage', () => {
    const storage = memory()
    const state: BoxState = { folded: ['a'], expanded: ['b'], hidden: ['c'], full: 'b' }
    writeBoxes(storage, 'k', state)
    expect(readBoxes(storage, 'k')).toEqual({ folded: ['a'], expanded: ['b'], hidden: ['c'] })
    writeBoxes(storage, 'k', emptyBoxes())
    expect(storage.items.has('k')).toBe(false)
    storage.setItem('k', '{"folded":[1,"x"],"hidden":"no"}')
    expect(readBoxes(storage, 'k')).toEqual({ folded: ['x'], expanded: [], hidden: [] })
    storage.setItem('k', 'not json')
    expect(readBoxes(storage, 'k')).toEqual(emptyBoxes())
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    expect(readBoxes(broken, 'k')).toEqual(emptyBoxes())
    expect(() => writeBoxes(broken, 'k', state)).not.toThrow()
    expect(readBoxes(undefined, 'k')).toEqual(emptyBoxes())
  })
})
