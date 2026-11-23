// ─── Session finder state — kept in the URL under its own keys ─────
// The finder has its own time range, "all history" by default, because the board's
// 24 h default would hide most sessions. Its keys start with `f` so they never change
// the board: fq, fstatus, ftools, fproject, fmodel, fname, ferrors, fmin_tokens,
// fmin_cost, frange (with fsince and funtil for a custom range), fsort, forder.
// While the URL has none of them, the board's tool, project, model and status filters
// give the finder its first values; after the first change the finder's keys rule.
import type { DetailSessions } from '../../data/contract.gen'
import type { Filters } from '../../data/filters'
import type { UrlPatch } from '../../data/urlState'

/** Another part of the page (the command palette) asks the finder to search for a text. */
export const FIND_EVENT = 'aictl:find-sessions'

export type FinderStatus = '' | 'running' | 'ended' | 'inferred' | 'importing' | 'not_imported'
export type FinderSort = 'last_activity' | 'started' | 'duration' | 'tokens' | 'cost' | 'tool_calls'
export type NameSource = '' | 'user' | 'tool' | 'prompt' | 'none'
export type FinderRange = 'all' | '24h' | '7d' | '30d' | '90d' | 'custom'
export type FinderState = {
  q: string
  status: FinderStatus
  tools: string[] | null
  project: string
  model: string
  name: NameSource
  errors: boolean
  minTokens: number
  minCost: number
  range: FinderRange
  since?: number
  until?: number
  sort: FinderSort
  order: 'asc' | 'desc'
}
export type FinderRow = DetailSessions['rows'][number]
export type FinderPage = DetailSessions

export const STATUS_LABELS: Record<Exclude<FinderStatus, ''>, string> = {
  running: 'Running', ended: 'Ended', inferred: 'Ended (inferred)', importing: 'Still importing',
  not_imported: 'Not imported yet',
}
export const SORT_LABELS: Record<FinderSort, string> = {
  last_activity: 'Last activity', started: 'Started', duration: 'Duration', tokens: 'Tokens', cost: 'Cost',
  tool_calls: 'Tool calls',
}
export const NAME_LABELS: Record<Exclude<NameSource, ''>, string> = {
  user: 'Named by you', tool: 'Named by the tool', prompt: 'Named by first prompt', none: 'No name',
}
export const RANGE_LABELS: Record<FinderRange, string> = {
  all: 'All history', '24h': 'Last 24 h', '7d': 'Last 7 d', '30d': 'Last 30 d', '90d': 'Last 90 d', custom: 'Custom',
}
const RANGE_SECONDS: Partial<Record<FinderRange, number>> = { '24h': 86400, '7d': 7 * 86400, '30d': 30 * 86400, '90d': 90 * 86400 }
/** The table column that each server sort orders by. */
export const SORT_COLUMNS: Record<string, FinderSort> = {
  last_activity_at: 'last_activity', started_at: 'started', duration: 'duration', tokens: 'tokens', cost_usd: 'cost',
  tool_calls: 'tool_calls',
}
const KEYS = ['fq', 'fstatus', 'ftools', 'fproject', 'fmodel', 'fname', 'ferrors', 'fmin_tokens', 'fmin_cost', 'frange',
  'fsince', 'funtil', 'fsort', 'forder'] as const

export const DEFAULT_FINDER: FinderState = {
  q: '', status: '', tools: null, project: '', model: '', name: '', errors: false, minTokens: 0, minCost: 0,
  range: 'all', sort: 'last_activity', order: 'desc',
}

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.find(item => item === value) ?? fallback
const amount = (value: string | null) => {
  const number = Number(value)
  return value && Number.isFinite(number) && number > 0 ? number : 0
}

/** The finder's state from the URL, seeded from the board's filters while the URL has no finder key. */
export function parseFinder(search: string, board?: { filters?: Filters; tools?: readonly string[] | null }): FinderState {
  const q = new URLSearchParams(search || '')
  if (!KEYS.some(key => q.has(key))) {
    const filters = board?.filters
    return {
      ...DEFAULT_FINDER,
      tools: board?.tools ? [...board.tools] : null,
      project: filters && filters.project !== 'all' ? filters.project : '',
      model: filters && filters.model !== 'all' ? filters.model : '',
      status: filters?.status === 'running' || filters?.status === 'active' ? 'running'
        : filters?.status === 'ended' ? 'ended' : '',
    }
  }
  const range = pick(q.get('frange'), Object.keys(RANGE_LABELS) as FinderRange[], 'all')
  const since = Number(q.get('fsince')), until = Number(q.get('funtil'))
  const custom = range === 'custom' && since > 0 && until > since
  return {
    q: q.get('fq') ?? '',
    status: pick(q.get('fstatus'), ['running', 'ended', 'inferred', 'importing', 'not_imported'], ''),
    tools: q.has('ftools') ? (q.get('ftools') ?? '').split(',').filter(Boolean) : null,
    project: q.get('fproject') ?? '',
    model: q.get('fmodel') ?? '',
    name: pick(q.get('fname'), ['user', 'tool', 'prompt', 'none'], ''),
    errors: q.get('ferrors') === '1',
    minTokens: Math.floor(amount(q.get('fmin_tokens'))),
    minCost: amount(q.get('fmin_cost')),
    range: custom || range !== 'custom' ? range : 'all',
    ...(custom ? { since, until } : {}),
    sort: pick(q.get('fsort'), Object.keys(SORT_LABELS) as FinderSort[], 'last_activity'),
    order: q.get('forder') === 'asc' ? 'asc' : 'desc',
  }
}

/** The URL keys of a state. Defaults are removed; fsort always stays so the board no longer seeds the finder. */
export function finderToParams(state: FinderState): UrlPatch {
  const custom = state.range === 'custom' && state.since != null && state.until != null
  return {
    fq: state.q || null,
    fstatus: state.status || null,
    ftools: state.tools === null ? null : state.tools.join(','),
    fproject: state.project || null,
    fmodel: state.model || null,
    fname: state.name || null,
    ferrors: state.errors ? '1' : null,
    fmin_tokens: state.minTokens > 0 ? state.minTokens : null,
    fmin_cost: state.minCost > 0 ? state.minCost : null,
    frange: state.range === 'all' || (state.range === 'custom' && !custom) ? null : state.range,
    fsince: custom ? Math.floor(state.since!) : null,
    funtil: custom ? Math.floor(state.until!) : null,
    fsort: state.sort,
    forder: state.order === 'asc' ? 'asc' : null,
  }
}

/** The time window of a range. A preset ends at `now` rounded up to the minute, so repeated reads share a cache key. */
export function finderWindow(state: FinderState, nowS: number): { since?: number; until?: number } {
  if (state.range === 'custom' && state.since != null && state.until != null) return { since: state.since, until: state.until }
  const span = RANGE_SECONDS[state.range]
  if (!span) return {}
  const until = Math.ceil(nowS / 60) * 60
  return { since: until - span }
}

/** The /api/board/sessions query of one page. */
export function finderRequest(state: FinderState, nowS: number, offset: number, limit: number): URLSearchParams {
  const query = new URLSearchParams()
  if (state.q.trim()) query.set('q', state.q.trim())
  if (state.tools) query.set('tool', state.tools.join(','))
  if (state.project.trim()) query.set('project', state.project.trim())
  if (state.model.trim()) query.set('model', state.model.trim())
  if (state.status) query.set('status', state.status)
  if (state.name) query.set('name', state.name)
  if (state.errors) query.set('errors', '1')
  if (state.minTokens > 0) query.set('min_tokens', String(Math.floor(state.minTokens)))
  if (state.minCost > 0) query.set('min_cost', String(state.minCost))
  const window = finderWindow(state, nowS)
  if (window.since != null) query.set('since', String(Math.floor(window.since)))
  if (window.until != null) query.set('until', String(Math.floor(window.until)))
  query.set('sort', state.sort)
  query.set('order', state.order)
  query.set('limit', String(limit))
  query.set('offset', String(offset))
  return query
}

/** A click on a column header: the same column flips the order, another one sorts by it, largest first. */
export function sortByColumn(state: FinderState, column: string): FinderState | undefined {
  const sort = SORT_COLUMNS[column]
  if (!sort) return
  if (sort === state.sort) return { ...state, order: state.order === 'desc' ? 'asc' : 'desc' }
  return { ...state, sort, order: 'desc' }
}

export type Chip = { key: string; label: string; value: string; clear: Partial<FinderState> }

/** The filters in force, each with its value and what clears it. */
export function finderChips(state: FinderState, toolLabel: (id: string) => string = id => id): Chip[] {
  const chips: Chip[] = []
  if (state.q.trim()) chips.push({ key: 'q', label: 'Text', value: state.q.trim(), clear: { q: '' } })
  if (state.status) chips.push({ key: 'status', label: 'Status', value: STATUS_LABELS[state.status], clear: { status: '' } })
  if (state.tools) {
    chips.push({ key: 'tools', label: 'Tool', value: state.tools.length ? state.tools.map(toolLabel).join(', ') : 'None',
      clear: { tools: null } })
  }
  if (state.project.trim()) chips.push({ key: 'project', label: 'Project', value: state.project.trim(), clear: { project: '' } })
  if (state.model.trim()) chips.push({ key: 'model', label: 'Model', value: state.model.trim(), clear: { model: '' } })
  if (state.name) chips.push({ key: 'name_source', label: 'Name', value: NAME_LABELS[state.name], clear: { name: '' } })
  if (state.errors) chips.push({ key: 'errors', label: 'Errors', value: 'Has errors', clear: { errors: false } })
  if (state.minTokens > 0) {
    chips.push({ key: 'min_tokens', label: 'Tokens', value: `≥ ${state.minTokens.toLocaleString()}`, clear: { minTokens: 0 } })
  }
  if (state.minCost > 0) chips.push({ key: 'min_cost', label: 'Cost', value: `≥ $${state.minCost}`, clear: { minCost: 0 } })
  if (state.range !== 'all') {
    const value = state.range === 'custom' && state.since != null && state.until != null
      ? `${new Date(state.since * 1000).toLocaleDateString()} – ${new Date(state.until * 1000).toLocaleDateString()}`
      : RANGE_LABELS[state.range]
    chips.push({ key: 'range', label: 'Active in', value, clear: { range: 'all', since: undefined, until: undefined } })
  }
  return chips
}

export const clearAll = (state: FinderState): FinderState => ({ ...DEFAULT_FINDER, sort: state.sort, order: state.order })

/** Why nothing is listed, naming the filter that excludes everything when the answer says which. */
export function emptyReason(state: FinderState, page: Pick<FinderPage, 'total' | 'without' | 'unfiltered'> | undefined,
  chips = finderChips(state)): string {
  if (!chips.length) return 'No session is stored yet, and no session file was found on disk.'
  const without = page?.without as Record<string, number> | undefined
  for (const chip of chips) {
    const count = without?.[chip.key]
    if (typeof count === 'number' && count > 0) {
      return `The ${chip.label} filter (${chip.value}) excludes all ${count.toLocaleString()} sessions that match the other filters.`
    }
  }
  const early = chips.filter(chip => ['q', 'tools', 'project', 'range'].includes(chip.key))
  if (early.length) {
    return `No session matches ${early.map(chip => `${chip.label}: ${chip.value}`).join(' and ')}.` +
      (chips.length > early.length ? ' The other filters were not checked.' : '')
  }
  return `No session matches ${chips.map(chip => `${chip.label}: ${chip.value}`).join(', ')}.`
}

export type RowState = { status: string; label: string; history: string; opens: boolean; reason?: string }

/** How a row reads in the list: its status words, its import state and whether it opens. */
export function rowState(row: Pick<FinderRow, 'status' | 'import_state' | 'import' | 'openable' | 'closed_reason'>): RowState {
  const status = row.status ?? 'ended'
  const label = status === 'running' ? '● Running' : STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status
  const imp = row.import
  const history = row.import_state === 'complete' ? 'Complete'
    : row.import_state === 'reading'
      ? `Importing${imp && imp.size_bytes ? ` ${Math.min(100, Math.floor(100 * (imp.bytes_read ?? 0) / imp.size_bytes))}%` : ''}`
      : row.import_state === 'partial' ? `Partial: ${imp?.outside_window ?? 0} of ${imp?.files ?? 0} files outside window`
        : row.import_state === 'waiting' ? 'Not imported yet' : 'Live only'
  const opens = row.openable !== false
  return { status, label, history, opens, ...(opens ? {} : { reason: row.closed_reason ?? 'This session cannot be opened.' }) }
}

/** The counts above the list; each one is a status filter. */
export function summaryItems(facets: FinderPage['facets'] | undefined): { status: FinderStatus; label: string; count?: number }[] {
  return [
    { status: '', label: 'sessions', count: facets?.sessions },
    { status: 'running', label: 'running', count: facets?.running },
    { status: 'importing', label: 'still importing', count: facets?.importing },
    { status: 'not_imported', label: 'not imported yet', count: facets?.not_imported },
  ]
}
