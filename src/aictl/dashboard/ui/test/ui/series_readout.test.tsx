// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flush } from 'solid-js'
import { SeriesView } from '../../src/panels/kinds/Series'
import type { PanelProps, Read } from '../../src/panels/types'
import { installDom, key, mount } from './dom'

vi.mock('uplot', () => ({ default: class { setSize() {} setData() {} setSeries() {} redraw() {} destroy() {} } }))
vi.mock('uplot/dist/uPlot.min.css', () => ({}))

const units: Record<string, string> = { failed: 'count', share: 'ratio' }
const ctx = {
  metadata: (path: string) => ({ unit: units[path] }),
  board: () => ({ bucket_s: 3600 }),
  select: () => {}, refresh: () => {},
} as unknown as PanelProps['ctx']
const panel = { ctx, def: { title: 'Failures', empty: 'none' } } as unknown as PanelProps
const ready = (value: unknown): Read => ({ state: 'ready', value })

beforeEach(() => installDom())

function view() {
  const source = ready({ failed: [2, 215, 0], share: [0.5, 0.7, null] })
  return mount(() => <SeriesView panel={panel} select time
    columns={() => [{ path: 'failed', label: 'Tool failures' }, { path: 'share', label: 'Share' }]}
    source={() => source} axis={() => ready([3600, 7200, 10800])} description="Failures" />)
}
const readout = (host: Element) => host.querySelector('[class*="chartTools"] > span')!.textContent

describe('SERIES-READOUT · the line under a chart', () => {
  it('shows the range total, not the oldest bucket, until a bucket is picked', () => {
    const { host, dispose } = view()
    expect(readout(host)).toBe('Range · Tool failures: 217 · Share (avg): 60%')
    dispose()
  })

  it('shows the picked bucket and returns to the range on Escape', () => {
    const { host, dispose } = view()
    const bucket = host.querySelector<HTMLButtonElement>('[class*="chartBucket"]')!
    key(bucket, 'ArrowRight'); flush()
    expect(readout(host)).toBe('Tool failures: 2 · Share: 50%')
    key(bucket, 'ArrowRight'); flush()
    expect(readout(host)).toBe('Tool failures: 215 · Share: 70%')
    key(bucket, 'Escape'); flush()
    expect(readout(host)).toBe('Range · Tool failures: 217 · Share (avg): 60%')
    dispose()
  })
})
