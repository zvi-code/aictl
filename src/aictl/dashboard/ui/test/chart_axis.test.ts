import { describe, expect, it } from 'vitest'
import { flatRange, isolatedIndices, tickLabels } from '../src/ui/chartData'

describe('CHART-AXIS · a flat or single-point series', () => {
  it('gets a range around zero, not a sliver around the value', () => {
    expect(flatRange(16.8, 16.8)).toEqual([0, 16.8 * 1.5])
    expect(flatRange(0, 0)).toEqual([0, 1])
    expect(flatRange(-4, -4)).toEqual([-6, 0])
    expect(flatRange(1, 5)).toBeNull()
    expect(flatRange(2, null)).toBeNull()
  })

  it('marks a value whose neighbours are both missing', () => {
    expect(isolatedIndices([null, 4, null, 5, 6, null, 7])).toEqual([1, 6])
    expect(isolatedIndices([3])).toEqual([0])
    expect(isolatedIndices([1, 2, 3])).toEqual([])
  })

  it('never repeats a tick label', () => {
    for (const ticks of [[16.5, 16.6, 16.7, 16.8, 16.9, 17], [0, 0.2, 0.4, 0.6], [0, 5000, 10000, 15000, 20000],
      [1_200_000, 1_210_000, 1_220_000], [0.001, 0.002, 0.003]]) {
      const labels = tickLabels(ticks)
      expect(new Set(labels).size, labels.join(' ')).toBe(ticks.length)
    }
    expect(tickLabels([16.5, 16.6, 16.7], '%')).toEqual(['16.5%', '16.6%', '16.7%'])
    expect(tickLabels([0, 5000, 20000])).toEqual(['0', '5K', '20K'])
  })
})
