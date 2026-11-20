import { describe, expect, it } from 'vitest'
import { completeSum, coreBars, latestTotal, procTree } from '../../../src/panels/overview/b/resources'

describe('machine measurements', () => {
  it('distinguishes a reported zero from a missing contribution', () => {
    expect(completeSum([0, 0])).toBe(0)
    expect(completeSum([0, null])).toBeUndefined()
    expect(completeSum([])).toBeUndefined()
  })

  it('uses the latest bucket with readings for every tool', () => {
    expect(latestTotal({ first: [1, 2, null], second: [3, 5, 6] })).toBe(7)
    expect(latestTotal({ first: [null, 2], second: [3, null] })).toBeUndefined()
  })

  it('keeps core positions when a reading is missing', () => {
    expect(coreBars([0, null, 90])?.list.map(core => [core.i, core.value])).toEqual([[0, 0], [1, null], [2, 90]])
    expect(coreBars([null])).toBeNull()
  })

  it('lists cycles and orphans without repeating a process', () => {
    const rows = procTree([{ pid: 1, parent: 2 }, { pid: 2, parent: 1 }, { pid: 3, parent: 7 }],
      row => row.pid, row => row.parent)
    expect(rows.map(row => [row.x.pid, row.depth])).toEqual([[3, 0], [1, 0], [2, 1]])
  })
})
