import { describe, expect, it } from 'vitest'
import { aggregateFor, axisNaming, rangeValues } from '../src/panels/kinds/seriesReadout'

const rows = [
  { x: 1, values: [2, 0.5, 10] }, { x: 2, values: [215, 0.7, null] }, { x: 3, values: [0, null, 30] },
]

describe('SERIES-READOUT · the readout under a chart', () => {
  it('shows a total for counts and an average for rates, never a sum of shares', () => {
    expect(rangeValues(rows, ['count', 'ratio', 'seconds'])).toEqual([217, 0.6, 20])
  })

  it('shows n/a, not zero, for a column with no value in the range', () => {
    expect(rangeValues([{ x: 1, values: [null] }], ['count'])).toEqual([null])
    expect(rangeValues([], ['count'])).toEqual([null])
  })

  it('sums counts, tokens and money; averages shares, gauges and durations', () => {
    expect(['count', 'tokens', 'usd', 'ai_credits', undefined].map(aggregateFor)).toEqual(['sum', 'sum', 'sum', 'sum', 'sum'])
    expect(['percent', 'ratio', 'seconds', 'bytes', 'rate_bps'].map(aggregateFor)).toEqual(['mean', 'mean', 'mean', 'mean', 'mean'])
  })

  it('names the value axis by its unit: formatted ticks for sizes, times and money, a title for tokens', () => {
    expect(axisNaming(['bytes', 'bytes'])).toEqual({ formatTicks: true })
    expect(axisNaming(['seconds'])).toEqual({ formatTicks: true })
    expect(axisNaming(['usd'])).toEqual({ formatTicks: true })
    expect(axisNaming(['tokens', 'tokens'])).toEqual({ label: 'tokens' })
    expect(axisNaming(['tokens', 'count'])).toEqual({})
    expect(axisNaming([undefined])).toEqual({})
  })
})
