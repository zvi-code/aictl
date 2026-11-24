// @vitest-environment jsdom
// The period picker of the board (Overview) and of Insights: the same choices, in the same order, with the
// same words, and each choice gives the window the server is asked for.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseFilters, windowOf } from '../../src/data/filters'
import { INSIGHT_RANGES } from '../../src/panels/insights/insightsModel'
import type { PanelContext } from '../../src/panels/types'
import { BoardControls } from '../../src/shell/BoardControls'
import { installDom, mount } from './dom'

beforeEach(() => installDom())
let unmount = () => {}
afterEach(() => unmount())

function controls(search: string, board: Record<string, unknown> = {}) {
  unmount()
  const asked: Record<string, unknown>[] = []
  const ctx = {
    filters: () => parseFilters(search), tools: () => null, board: (field: string) => board[field],
    navigate: (patch: Record<string, unknown>) => { asked.push(patch) }, select() {},
  } as unknown as PanelContext
  const view = mount(() => <BoardControls ctx={ctx} find={() => {}} clear={() => {}} custom={false} setCustom={() => {}}
    text="" search={() => {}} rail={false} toggleRail={() => {}} />)
  unmount = view.dispose
  const select = view.host.querySelector<HTMLSelectElement>('select')!
  return { select, asked, options: () => [...select.options].map(option => [option.value, option.textContent]) }
}

describe('The period picker', () => {
  it('offers 90 d after 30 d on the board', () => {
    const picker = controls('?range=90d')
    const ids = picker.options().map(([id]) => id)
    expect(ids.indexOf('90d')).toBe(ids.indexOf('30d') + 1)
    expect(picker.select.value).toBe('90d')
  })

  it('offers 90 d on Insights, after 30 d', () => {
    const ids = INSIGHT_RANGES.map(range => range.id)
    expect(ids.indexOf('90d')).toBe(ids.indexOf('30d') + 1)
    expect(INSIGHT_RANGES.find(range => range.id === '90d')?.label).toBe('90 d')
  })

  it('reads 90 d as 30 buckets of 3 days ending at the next 3-day boundary', () => {
    const now = 1_780_000_000
    const win = windowOf(parseFilters('?range=90d').range, now)
    expect(win.buckets).toBe(30)
    expect(win.until - win.since).toBe(90 * 86_400)
    expect(win.until % (3 * 86_400)).toBe(0)
    expect(win.until).toBeGreaterThanOrEqual(now)
    expect(win.until - now).toBeLessThan(3 * 86_400)
  })
})
