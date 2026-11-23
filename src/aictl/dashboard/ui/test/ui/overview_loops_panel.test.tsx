// @vitest-environment jsdom
// Loops: with no loop the panel says so once.
import { createSignal, flush } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loopOptions } from '../../src/panels/overview/RowSummaries'
import { installDom, layoutHeaders, mount } from './dom'
import { pairs, panel } from './overviewPanel'

beforeEach(() => { installDom(); layoutHeaders() })

describe('Loops', () => {
  it('draws no zero tiles and no empty day chart when there is no loop', async () => {
    const { props } = panel('loops', {})
    const [rows, setRows] = createSignal<{ id: string; row: Record<string, unknown> }[]>([
      { id: 'a', row: { repeats: 4, tokens: 100, cost_usd: 0.5, since_ts: 1_800_000_000 } }])
    const { host, dispose } = mount(() => <>{loopOptions(props).summary!(rows)}</>)
    // The day chart is loaded on demand.
    await import('../../src/panels/overview/DailySummary'); await new Promise(resolve => setTimeout(resolve, 0)); flush()
    expect(pairs(host, 'Loop summary')[0]).toEqual(['Loops', '1'])
    setRows([]); flush()
    expect(host.textContent).toBe('')
    dispose()
  })
})

vi.mock('../../src/panels/overview/DailySummary', () => ({ default: () => 'day chart' }))
