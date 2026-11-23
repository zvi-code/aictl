import { describe, expect, it } from 'vitest'
import { countPoints, rangeBins } from '../../../src/panels/overview/DailySummary'

describe('the prompt chart covers the selected time', () => {
  it('counts listed prompts per bucket of the board range and leaves out rows outside it', () => {
    // Found on real data: with a 24 h range the chart was drawn over UTC days.
    const range = { since: 0, until: 3 * 3600, bucket_s: 3600, bucket_starts: [0, 3600, 7200] }
    const rows = [10, 3700, 3800, 7300, 99999, -5].map((ts, i) => ({ id: String(i), row: { ts } }))
    expect(rangeBins(rows, 'ts', range)).toEqual({
      bins: [{ x: 0, count: 1 }, { x: 3600, count: 2 }, { x: 7200, count: 1 }], total: 4,
    })
  })
})

describe('the prompt chart shows how many prompts each bucket has', () => {
  it('plots the count of each bucket, padded by one empty step at each end', () => {
    // Found on the board: "Share of dated rows" from 0 to 100% with tiny bars that read as nothing.
    const bins = [{ x: 0, count: 1 }, { x: 3600, count: 12 }, { x: 7200, count: 0 }]
    expect(countPoints(bins, 3600)).toEqual([
      { x: -3600, values: [null] }, { x: 0, values: [1] }, { x: 3600, values: [12] }, { x: 7200, values: [0] }, { x: 10800, values: [null] }])
    expect(countPoints([{ x: 0, count: 0 }], 3600)).toEqual([])
  })
})
