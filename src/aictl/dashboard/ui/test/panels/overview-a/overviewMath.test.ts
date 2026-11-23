import { describe, expect, it } from 'vitest'
import type { ContextLocal } from '../../../src/data/contract.gen'
import { dailyValues, knownSum, messageBuckets, modelAllocation, pricedCost, rankedSeries } from '../../../src/panels/overview/overviewMath'

describe('Overview usage projection', () => {
  it('aligns message counts to the returned starts without filling missing roles, gaps or tail samples', () => {
    const range = { since: 10, until: 41, bucket_s: 10, bucket_starts: [10, 20, 40], partial_bucket: 2 }
    expect(messageBuckets(range, { user: [0, null], assistant: [], tool: [3, 5, 0, 7] })).toEqual([
      { x: 10, values: [0, null, 3] }, { x: 20, values: [null, null, 5] }, { x: 40, values: [null, null, 0] },
    ])
    expect(messageBuckets(undefined, { user: [0], assistant: [0], tool: [0] })).toEqual([])
  })

  it('does not assign a multi-model agent’s totals to one model', () => {
    const usage = { input: 5, output: 1, cache_read: 0, cache_write: 0, cost_usd: 0 }
    expect(modelAllocation({ ...usage, models: ['a', 'b'] }, 'a')).toEqual({})
    expect(modelAllocation({ ...usage, models: [] }, 'a')).toEqual({})
    expect(modelAllocation({ ...usage, models: ['a'] }, 'a')).toMatchObject({ tokens: 6, cost_usd: 0 })
    expect(modelAllocation({ ...usage, models: ['a'], input: null }, 'a').tokens).toBeUndefined()
    expect(knownSum([0, 0])).toBe(0)
    expect(knownSum([0, undefined])).toBeUndefined()
  })

  it('prices the daily total like the Cost panel and names the models it leaves out', () => {
    // Found on real data: one unpriced model (claude-fable-5-2) made the whole seven-day cost N/A.
    const rows = [{ model: 'opus', tokens: 10, cost_usd: 1.5 }, { model: 'fable', tokens: 70, cost_usd: null },
      { model: 'fable', tokens: 1, cost_usd: null }, { model: null, tokens: 0, cost_usd: null }, { model: 'sonnet', tokens: 5, cost_usd: 0.25 }]
    expect(pricedCost(rows)).toEqual({ cost: 1.75, unpriced: [{ model: 'fable', tokens: 71 }] })
    expect(pricedCost([]).cost).toBeUndefined()
  })

  it('keeps an unknown node cost unknown in the daily series', () => {
    const date = '2026-11-19'
    const row: ContextLocal['daily']['rows'][number] = {
      date, model: 'a', cost_usd: null, requests: 1, tokens: 2, input: 1, output: 1, cache_read: 0, cache_write: 0,
    }
    const rows = [row, { ...row, cost_usd: 0, date: '2026-11-20' }, { ...row, cost_usd: 2 }]
    expect(dailyValues([date, '2026-11-20', '2026-11-21'], rows, 'cost_usd')[0].values).toEqual([null, 0, null])
    expect(dailyValues([date, '2026-11-20'], rows, 'requests')[0].values).toEqual([2, 1])
  })

  it('keeps gaps in the combined cost series and preserves reported zero', () => {
    const rows = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((key, index) => [key, [index, 0, null]]))
    expect(rankedSeries(rows).at(-1)).toMatchObject({ label: 'Other (2)', values: [1, 0, null] })
  })
})
