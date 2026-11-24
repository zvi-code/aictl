// @vitest-environment jsdom
// The period picker in the top row, shared by the board (Overview), Insights and Thinking: its choices, their order
// and words, and the window each choice asks the server for.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { boardQuery, filtersToParams, parseFilters, periodLabel, PERIODS, windowOf } from '../../src/data/filters'
import { mergeSearch } from '../../src/data/urlState'
import { dateLabel } from '../../src/design/format'
import { INSIGHT_RANGES, insightWindow } from '../../src/panels/insights/insightsModel'
import { RANGE_LABELS as FINDER_RANGE_LABELS } from '../../src/panels/overview/sessionFinder'
import type { PanelContext } from '../../src/panels/types'
import { BoardControls } from '../../src/shell/BoardControls'
import { PeriodPicker } from '../../src/shell/PeriodPicker'
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
  const view = mount(() => <>
    <div data-top><PeriodPicker ctx={ctx} custom={false} setCustom={() => {}} resolved={board.range as { since: number } | undefined} /></div>
    <div data-board><BoardControls ctx={ctx} find={() => {}} clear={() => {}} text="" search={() => {}} rail={false} toggleRail={() => {}} /></div>
  </>)
  unmount = view.dispose
  const select = view.host.querySelector<HTMLSelectElement>('[data-top] [data-period] select')!
  return { select, asked, host: view.host, options: () => [...select.options].map(option => [option.value, option.textContent]) }
}

describe('The period picker', () => {
  it('is one control in the top row: the board\'s own filter row has no period of its own', () => {
    const picker = controls('?range=7d&screen=insights')
    expect(picker.select.value).toBe('7d')
    const own = [...picker.host.querySelectorAll('[data-board] select')].flatMap(select => [...(select as HTMLSelectElement).options])
    expect(own.map(option => option.value)).not.toContain('90d')
    picker.select.value = '30d'
    picker.select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(picker.asked).toEqual([{ range: '30d', since: null, until: null, sel: null }])
  })

  it('offers 90 d after 30 d', () => {
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

describe('All history', () => {
  const resolved = { since: 1_783_555_200, until: 1_795_564_800, bucket_s: 3 * 86_400, bucket_starts: [] }

  it('follows 90 d and comes before Custom, with the start the board\'s answer resolved', () => {
    const picker = controls('?range=all&scope=fleet', { range: resolved })
    expect(picker.options().map(([id]) => id).slice(-3)).toEqual(['90d', 'all', 'custom'])
    expect(picker.select.value).toBe('all')
    expect(picker.options().find(([id]) => id === 'all')?.[1]).toBe(`All history · since ${dateLabel(resolved.since)}`)
    expect(controls('?range=all').options().find(([id]) => id === 'all')?.[1]).toBe('All history')
  })

  it('has the same words on Insights, the board and the session finder', () => {
    expect(INSIGHT_RANGES.at(-1)).toEqual({ id: 'all', label: 'All history' })
    expect(INSIGHT_RANGES).toEqual(PERIODS)
    expect(FINDER_RANGE_LABELS.all).toBe('All history')
  })

  it('stays in the address and asks the server to resolve the window, with or without a selected interval', () => {
    const filters = parseFilters('?range=all&sel=1790000000-1790003600&scope=fleet')
    expect(filters.range.id).toBe('all')
    expect(mergeSearch('?scope=fleet', filtersToParams(filters))).toContain('range=all')
    const whole = new URLSearchParams(boardQuery(filters, null, windowOf(filters.range, 1_795_521_000)))
    expect(Object.fromEntries(whole)).toMatchObject({ since: 'all', until: '1795521600' })
    expect(whole.has('buckets')).toBe(false)
    expect(new URLSearchParams(boardQuery(filters, null, filters.sel!)).get('since')).toBe('1790000000')
    // Insights keeps its own totals over all history: from the start of time.
    expect(insightWindow('?range=all', 1_795_521_000)).toEqual({ id: 'all', since: 0, until: 1_795_521_600 })
  })

  it('names the resolved period', () => {
    expect(periodLabel({ id: 'all' }, resolved)).toBe(`All history · since ${dateLabel(resolved.since)}`)
    expect(periodLabel({ id: '90d' }, resolved)).toBe('90 d')
  })
})
