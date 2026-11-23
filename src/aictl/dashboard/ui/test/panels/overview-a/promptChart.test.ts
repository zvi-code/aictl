import { describe, expect, it } from 'vitest'
import { rangeBins } from '../../../src/panels/overview/DailySummary'

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
