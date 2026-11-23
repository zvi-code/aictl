// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flush } from 'solid-js'
import { Chart } from '../../src/ui/Chart'
import { installDom, mount } from './dom'

// A box model small enough to show a resize loop. An element is as tall as its
// own height, else as tall as its in-flow children or its min-height. The plot
// row of a figure is the figure's own height (the `1fr` row). A canvas in flow
// carries 4px of line-box slack, as a real inline canvas does.
const SLACK = 4
const px = (value: string) => parseFloat(value) || 0
function boxHeight(el: HTMLElement): number {
  if (el.style.height) return px(el.style.height)
  const flow = Array.from(el.children).filter(child => (child as HTMLElement).style.position !== 'absolute')
    .reduce((sum, child) => sum + boxHeight(child as HTMLElement) + (child.classList.contains('uplot') ? SLACK : 0), 0)
  const row = el.parentElement?.tagName === 'FIGURE' && el.getAttribute('aria-hidden') === 'true'
    ? px(el.parentElement.style.height || el.parentElement.style.minHeight) : 0
  return Math.max(px(el.style.minHeight), flow, row)
}

type Axis = { splits?: (u: unknown) => number[]; values?: (u: unknown, splits: number[]) => string[] }
type Seen = { sizes: { width: number; height: number }[]; root: HTMLElement; axes: Axis[]; data: unknown }
const plots: Seen[] = []
class FakePlot {
  series: unknown[]
  seen: Seen
  constructor(opts: { width: number; height: number; series: unknown[]; axes: Axis[] }, data: unknown, host: HTMLElement) {
    this.series = opts.series
    const root = document.createElement('div')
    root.className = 'uplot'
    root.style.height = `${opts.height}px`
    host.append(root)
    this.seen = { sizes: [{ width: opts.width, height: opts.height }], root, axes: opts.axes, data }
    plots.push(this.seen)
  }
  setSize(size: { width: number; height: number }) {
    this.seen.sizes.push(size)
    this.seen.root.style.height = `${size.height}px`
  }
  setData() {} setSeries() {} redraw() {} destroy() {}
}
vi.mock('uplot', () => ({ default: FakePlot }))
vi.mock('uplot/dist/uPlot.min.css', () => ({}))

const observed: { target: Element; callback: ResizeObserverCallback }[] = []
class FakeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) { observed.push({ target, callback: this.callback }) }
  unobserve() {} disconnect() {}
}
const frames: FrameRequestCallback[] = []
const settle = async () => { await vi.dynamicImportSettled(); for (let i = 0; i < 8; i++) { await Promise.resolve(); flush() } }
const cycle = () => {
  for (const { target, callback } of observed) {
    const height = boxHeight(target as HTMLElement)
    callback([{ contentRect: { width: 600, height } } as ResizeObserverEntry], {} as ResizeObserver)
  }
  while (frames.length) frames.shift()!(0)
}

beforeEach(() => {
  installDom()
  plots.length = 0; observed.length = 0; frames.length = 0
  vi.stubGlobal('ResizeObserver', FakeObserver)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '', fontSize: '12px', fontFamily: 'sans-serif' }))
})
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = '' })

const points = [{ x: 1, values: [1] }, { x: 2, values: [2] }]
const chart = () => <Chart label="CPU" description="CPU" series={[{ label: 'a' }]} points={points} xAxis="time" />

describe('CHART-SIZE · a chart never sizes its container', () => {
  it('keeps its size when the figure has only a minimum height', async () => {
    const { host, dispose } = mount(chart)
    host.querySelector<HTMLElement>('figure')!.style.minHeight = '160px'
    await settle()
    for (let i = 0; i < 12; i++) cycle()
    expect(plots).toHaveLength(1)
    expect(Math.max(...plots[0].sizes.map(size => size.height))).toBe(160)
    dispose()
  })

  it('draws at the height of a fixed container', async () => {
    const { host, dispose } = mount(chart)
    host.querySelector<HTMLElement>('figure')!.style.height = '300px'
    await settle()
    for (let i = 0; i < 4; i++) cycle()
    expect(plots).toHaveLength(1)
    expect(plots[0].sizes.at(-1)!.height).toBe(300)
    dispose()
  })
})

describe('CHART-CATEGORY · a category chart names its ticks', () => {
  it('labels one tick per category with its name', async () => {
    const names = ['sessions', 'events', 'spans']
    const { host, dispose } = mount(() => <Chart label="Rows" description="Rows" series={[{ label: 'rows' }]} xAxis="number"
      categories={names} points={names.map((_, i) => ({ x: i + 1, values: [i] }))} />)
    host.querySelector<HTMLElement>('figure')!.style.height = '300px'
    await settle()
    for (let i = 0; i < 3; i++) cycle()
    const x = plots[0].axes[0]
    const chart = { data: plots[0].data, bbox: { width: 600 * devicePixelRatio } }
    const splits = x.splits!(chart)
    expect(splits).toEqual([1, 2, 3])
    expect(x.values!(chart, splits)).toEqual(names)
    dispose()
  })
})
