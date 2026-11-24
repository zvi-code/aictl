// The session finder keeps its state in the URL under its own keys, maps it onto the
// /api/board/sessions query, and reads each row's status and import state as the server sent it.
import { describe, expect, it } from 'vitest'
import { parseFilters } from '../../../src/data/filters'
import { mergeSearch } from '../../../src/data/urlState'
import {
  clearAll, DEFAULT_FINDER, emptyReason, finderChips, finderRequest, finderToParams, parseFinder, rowState, sortByColumn,
  summaryItems, type FinderState,
} from '../../../src/panels/overview/sessionFinder'

const NOW = 1_800_000_030
const state = (patch: Partial<FinderState> = {}): FinderState => ({ ...DEFAULT_FINDER, ...patch })
const request = (patch: Partial<FinderState>, offset = 0) => Object.fromEntries(finderRequest(state(patch), NOW, offset, 50))

describe('finder URL state', () => {
  it('round-trips every filter, the custom range and the order through the URL', () => {
    const full = state({
      q: 'fix parser', status: 'inferred', tools: ['claude-code', 'codex-cli'], model: 'gpt-5',
      name: 'user', errors: true, minTokens: 5000, minCost: 1.5, range: 'custom', since: 1_700_000_000,
      until: 1_700_086_400, sort: 'cost', order: 'asc',
    })
    const search = mergeSearch('?range=7d&agent=x', finderToParams(full))
    expect(parseFinder(search)).toEqual(full)
    // The board's own keys are untouched.
    expect(new URLSearchParams(search).get('range')).toBe('7d')
    expect(new URLSearchParams(search).get('agent')).toBe('x')
  })

  it('keeps a plain URL for the defaults, except the sort that marks the finder as set', () => {
    expect(mergeSearch('', finderToParams(DEFAULT_FINDER))).toBe('?fsort=last_activity')
    expect(parseFinder('?fsort=last_activity')).toEqual(DEFAULT_FINDER)
  })

  it('takes the board filters as first values only while the URL has no finder key', () => {
    const board = { filters: parseFilters('?project=/p/a&model=opus&status=running&range=24h'), tools: ['codex-cli'] }
    // The project is not a finder value: the page's project filter applies to the finder's request (withProjects).
    expect(parseFinder('?project=/p/a', board)).toEqual(state({ model: 'opus', status: 'running', tools: ['codex-cli'] }))
    // The board's 24 h range never narrows the finder: it searches all history.
    expect(parseFinder('', board).range).toBe('all')
    expect(parseFinder('?fsort=tokens', board)).toEqual(state({ sort: 'tokens' }))
  })

  it('ignores values it does not know and a custom range without a valid window', () => {
    expect(parseFinder('?fstatus=done&fsort=name&fname=robot&fmin_tokens=-5&frange=custom&fsince=20&funtil=10'))
      .toEqual(DEFAULT_FINDER)
    expect(parseFinder('?ftools=').tools).toEqual([])
  })
})

describe('filter to request mapping', () => {
  it('sends only the filters in use, with the sort and the page', () => {
    expect(request({}, 100)).toEqual({ sort: 'last_activity', order: 'desc', limit: '50', offset: '100' })
    expect(request({
      q: '  widget ', tools: ['claude-code'], model: 'opus', status: 'not_imported', name: 'tool',
      errors: true, minTokens: 1000.7, minCost: 0.25, sort: 'tool_calls', order: 'asc',
    })).toEqual({
      q: 'widget', tool: 'claude-code', model: 'opus', status: 'not_imported', name: 'tool', errors: '1',
      min_tokens: '1000', min_cost: '0.25', sort: 'tool_calls', order: 'asc', limit: '50', offset: '0',
    })
    expect(request({ tools: [] }).tool).toBe('')
  })

  it('turns a preset range into a window that ends at the next minute, and passes a custom one as is', () => {
    expect(request({ range: '7d' })).toMatchObject({ since: String(1_800_000_060 - 7 * 86400) })
    expect(request({ range: '7d' }).until).toBeUndefined()
    expect(request({ range: 'custom', since: 10, until: 20 })).toMatchObject({ since: '10', until: '20' })
    expect(request({ range: 'all' }).since).toBeUndefined()
  })

  it('sorts by a column on the server: a new column largest first, the same column flips', () => {
    const byTokens = sortByColumn(state(), 'tokens')!
    expect([byTokens.sort, byTokens.order]).toEqual(['tokens', 'desc'])
    const flipped = sortByColumn(byTokens, 'tokens')!
    expect([flipped.sort, flipped.order]).toEqual(['tokens', 'asc'])
    expect(sortByColumn(state(), 'cost_usd')!.sort).toBe('cost')
    expect(sortByColumn(state(), 'title')).toBeUndefined()
  })
})

describe('chips and the empty state', () => {
  const busy = state({ q: 'x', status: 'running', model: 'opus', minTokens: 10, range: '30d', tools: ['codex-cli'] })

  it('shows each filter with its value and clears all but the order', () => {
    const chips = finderChips(busy, id => id.toUpperCase())
    expect(chips.map(chip => `${chip.label}: ${chip.value}`)).toEqual([
      'Text: x', 'Status: Live now', 'Tool: CODEX-CLI', 'Model: opus', 'Tokens: ≥ 10', 'Active in: Last 30 d',
    ])
    expect(clearAll({ ...busy, sort: 'cost' })).toEqual(state({ sort: 'cost' }))
  })

  it('names the filter that excludes every session', () => {
    const page = { total: 0, unfiltered: 9, without: { status: 0, model: 4, name_source: 0, errors: 0, min_tokens: 0, min_cost: 0 } }
    expect(emptyReason(busy, page)).toBe('The Model filter (opus) excludes all 4 sessions that match the other filters.')
    const none = { ...page, without: { ...page.without, model: 0 } }
    expect(emptyReason(busy, none)).toBe('No session matches Text: x and Tool: codex-cli and Active in: Last 30 d. The other filters were not checked.')
    expect(emptyReason(DEFAULT_FINDER, undefined)).toBe('No session is stored yet, and no session file was found on disk.')
  })
})

describe('row states', () => {
  const row = (patch: Record<string, unknown>) => ({
    status: 'ended', import_state: 'complete', import: { files: 1, complete: 1, reading: 0, waiting: 0, outside_window: 0,
      size_bytes: 4000, bytes_read: 4000, modified_at: 1, source_file: '/f' }, openable: true, closed_reason: null, ...patch,
  }) as Parameters<typeof rowState>[0]

  it('reads running, ended, inferred and not imported rows', () => {
    expect(rowState(row({ status: 'running' }))).toEqual({ status: 'running', label: '● Running', history: 'Complete', opens: true })
    expect(rowState(row({})).label).toBe('Ended')
    expect(rowState(row({ status: 'idle' })).label).toBe('● Idle')
    expect(rowState(row({ status: 'unknown' })).label).toBe('● Activity unknown')
    expect(rowState(row({ status: 'inferred' })).label).toBe('Ended (inferred)')
    expect(rowState(row({ status: 'not_imported', import_state: 'waiting', openable: false, closed_reason: 'Not imported yet: why' })))
      .toEqual({ status: 'not_imported', label: 'Not imported yet', history: 'Not imported yet', opens: false, reason: 'Not imported yet: why' })
  })

  it('reads the import state of a stored row', () => {
    const reading = { files: 2, complete: 1, reading: 1, waiting: 0, outside_window: 0, size_bytes: 4000, bytes_read: 1000, modified_at: 1, source_file: '/f' }
    expect(rowState(row({ import_state: 'reading', import: reading })).history).toBe('Importing 25%')
    expect(rowState(row({ import_state: 'partial', import: { ...reading, files: 5, outside_window: 2 } })).history)
      .toBe('Partial: 2 of 5 files outside window')
    expect(rowState(row({ import_state: 'none', import: null })).history).toBe('Live only')
  })

  it('lists the summary counts as status filters', () => {
    expect(summaryItems({ sessions: 9, running: 2, ended: 3, inferred: 1, importing: 1, not_imported: 2 }).map(item =>
      [item.status, item.count])).toEqual([['', 9], ['running', 2], ['importing', 1], ['not_imported', 2]])
    // Before the first answer no count chip is drawn, rather than "… sessions · … live now".
    expect(summaryItems(undefined)).toEqual([])
    expect(summaryItems({ sessions: 4 } as never).map(item => item.label)).toEqual(['sessions'])
  })
})
