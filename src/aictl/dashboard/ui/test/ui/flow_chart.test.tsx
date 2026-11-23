// @vitest-environment jsdom
import { createSignal, flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FlowEvent } from '../../src/data/contract.gen'
import { repeatsOf, scalesOf, tracksOf } from '../../src/drawer/chartModel'
import { chartColumns, FlowChart } from '../../src/drawer/FlowChart'
import { createHover } from '../../src/drawer/FlowParts'
import { flowModel } from '../../src/drawer/flowModel'
import { rowsOf, stepsOf } from '../../src/drawer/flowSteps'
import { resolveWidths } from '../../src/drawer/flowWidths'
import { installDom, mount } from './dom'

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const tokens = { input: 2, output: 383, cache_read: 225_000, cache_creation: 1_200 }

const events = [
  event('user_message', 100, { step: 1, message: 'Fix the flow chart' }),
  event('api_call', 110, { step: 2, request_n: 8768, model: 'claude-opus-5-5', duration_ms: 6000, tokens, cost_usd: 0.12 }),
  event('tool_use', 110.5, { step: 2, to: 'Bash', params: JSON.stringify({ command: 'cd /Users/zvi/Projects/aictl && python3 scripts/check.py' }),
    target: 'cd /Users/zvi/Projects/aictl && python3 scripts/check.py', duration_ms: 1250, output_bytes: 4096 }),
  event('api_call', 120, { step: 3, request_n: 8769, model: 'claude-opus-5-5', duration_ms: 5000, tokens }),
  event('tool_use', 120.2, { step: 3, to: 'Read', target: '/repo/src/a.ts', duration_ms: 20 }),
  event('api_call', 130, { step: 4, request_n: 8770, model: 'claude-opus-5-5', duration_ms: 4000, tokens, finish_reason: 'end_turn' }),
]

function render(options: { selected?: string } = {}) {
  const steps = stepsOf(flowModel(events).events)
  const rows = rowsOf(steps)
  const scales = scalesOf(steps)
  const tracks = tracksOf(steps)
  const columns = chartColumns(scales, tracks.count)
  const picked: string[] = []
  let closed = 0
  const [selected, select] = createSignal(options.selected)
  const view = mount(() => <FlowChart rows={rows} columns={columns} widths={resolveWidths(columns, { widths: {} })} tracks={tracks} scales={scales}
    repeats={repeatsOf(steps)} scopeAgent="" selected={selected()} select={id => { picked.push(id); select(id) }} hover={createHover()}
    onStart={() => {}} onRange={() => {}} initial={() => 0} toggleSpan={() => {}} toggleRun={() => {}} close={() => { closed++ }}
    moveColumn={() => {}} hideColumn={() => {}} resize={() => {}} />)
  return { ...view, picked, closed: () => closed, steps }
}

const stepRows = (host: Element) => Array.from(host.querySelectorAll<HTMLButtonElement>('[data-step-row]'))
const key = (target: Element, name: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }))

beforeEach(() => { installDom() })

describe('DRW-FL-15 · The Flow chart', () => {
  it('spends the row on what varies: no running request or step number in the visible text', () => {
    const { host, dispose } = render()
    const rows = stepRows(host)
    expect(rows).toHaveLength(4)
    const text = rows.map(row => row.textContent).join(' | ')
    expect(text).not.toMatch(/req|#\d|8768|8769/)
    expect(rows[1].textContent).toContain('python3 check.py')
    expect(rows[1].textContent).not.toContain('cd /Users')
    dispose()
  })

  it('carries the exact values and the step and request ids on hover and in the accessible name', () => {
    const { host, dispose } = render()
    const round = stepRows(host)[1]
    expect(round.getAttribute('aria-label')).toMatch(/^Step 2, request 8768 at /)
    const bars = Array.from(round.querySelectorAll<HTMLElement>('[data-work]')).map(bar => bar.getAttribute('title')).filter(Boolean)
    expect(bars).toContain('Model reply · claude-opus-5-5 · 6 s · request 8768')
    expect(bars.some(title => /^Bash · python3 check\.py · 1\.3 s$/.test(title!))).toBe(true)
    const titles = Array.from(round.querySelectorAll<HTMLElement>('[title]')).map(node => node.getAttribute('title'))
    expect(titles).toContain('Context 226,202 tokens')
    expect(titles).toContain('Output 383 tokens')
    expect(titles).toContain('Results returned: 4,096 bytes')
    // A call without a reported size says so; it is not drawn as zero.
    const read = stepRows(host)[2]
    expect(read.querySelector('[data-missing]')?.textContent).toBe('not reported')
    dispose()
  })

  it('names each column with its scale, and explains the scale on hover', () => {
    const { host, dispose } = render()
    const heads = Array.from(host.querySelectorAll<HTMLElement>('[title]')).filter(node => node.closest('[class*="chartHeader"]'))
    const names = heads.map(head => head.textContent?.trim()).filter(Boolean)
    expect(names.slice(0, 2)).toEqual(['Time', 'Step'])
    expect(names.some(name => /^Took ≤ /.test(name!))).toBe(true)
    expect(heads.find(head => /^Took/.test(head.textContent ?? ''))?.getAttribute('title')).toMatch(/full width is/)
    dispose()
  })

  it('moves between steps with the arrow keys, opens one with Enter and closes the detail with Escape', () => {
    const { host, dispose, picked, closed } = render()
    const rows = stepRows(host)
    rows[0].focus()
    // With no step open, Escape is not the chart's: it goes on to the drawer.
    expect(key(rows[0], 'Escape')).toBe(true)
    expect(closed()).toBe(0)
    key(rows[0], 'ArrowDown')
    expect(document.activeElement).toBe(rows[1])
    key(rows[1], 'End')
    expect(document.activeElement).toBe(stepRows(host)[3])
    key(document.activeElement!, 'Home')
    expect(document.activeElement).toBe(stepRows(host)[0])
    ;(document.activeElement as HTMLButtonElement).click()
    expect(picked).toEqual(['step:1'])
    flush()
    expect(stepRows(host)[0].getAttribute('aria-pressed')).toBe('true')
    key(stepRows(host)[0], 'Escape')
    expect(closed()).toBe(1)
    dispose()
  })
})
