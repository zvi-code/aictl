// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { Bars, type BarRow } from '../../src/panels/insights/Bars'
import { installDom, mount } from './dom'

beforeEach(() => installDom())

const part = (key: string, value: number) => ({ key, label: key, value, text: String(value), hover: key, tone: 0 })

describe('Insights bars', () => {
  it('sizes each segment by its share of the row, so values that sum to less than 1 still fill the bar', () => {
    // A failure share or a per-request cost: raw flex factors 0.03 and 0.01 would fill 4% of the bar.
    const rows: BarRow[] = [
      { key: 'shares', label: 'Shares', parts: [part('a', 0.03), part('b', 0.01)], total: '4%' },
      { key: 'counts', label: 'Counts', parts: [part('a', 30), part('b', 10), part('none', 0)], total: '40' },
    ]
    const { host, dispose } = mount(() => <Bars name="t" title="T" axis="" rows={rows} />)
    const grow = (row: string) => [...host.querySelectorAll<HTMLElement>(`[data-row="${row}"] [data-part]`)].map(el => el.style.flexGrow)
    expect(grow('shares')).toEqual(['75', '25'])
    expect(grow('counts')).toEqual(['75', '25'])
    dispose()
  })
})
