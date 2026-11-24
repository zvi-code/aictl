// The thinking search screen: the request it sends, and how a result reads. Every count and page comes from the
// store (/api/board/thinking/search); nothing here counts rows.
import type { DetailThinkingSearch } from '../../data/contract.gen'
import { fmtNum, fmtShare } from '../../design/format'

export type SearchBlock = DetailThinkingSearch['blocks'][number]
export type SearchSort = 'ts' | 'chars'
export type SearchState = { q: string; sort: SearchSort; ascending: boolean; offset: number }
export const PAGE_SIZE = 50

/** The query of one page: the search, its order and page, and the page's period, tools and model. */
export function searchQuery(state: SearchState, period: { since: number; until: number },
  tools: readonly string[] | null, model: string): URLSearchParams {
  const query = new URLSearchParams({
    since: String(period.since), until: String(period.until), sort: state.sort, order: state.ascending ? 'asc' : 'desc',
    offset: String(state.offset), limit: String(PAGE_SIZE),
  })
  if (state.q.trim()) query.set('q', state.q.trim())
  if (tools) query.set('tool', tools.join(','))
  if (model && model !== 'all') query.set('model', model)
  return query
}

/** The snippet as it sits in the block: an ellipsis where text before or after it is left out. */
export function snippetText(block: SearchBlock): string {
  if (!block.snippet) return ''
  const start = block.snippet_at ?? 0
  const before = start > 0 ? '…' : ''
  const after = block.chars != null && start + block.snippet.length < block.chars ? '…' : ''
  return `${before}${block.snippet.replace(/\s+/g, ' ').trim()}${after}`
}

/** "1,204 blocks · 37%" of one tool or model among all matches. */
export const shareText = (blocks: number, total: number) =>
  `${fmtNum(blocks)} ${blocks === 1 ? 'block' : 'blocks'} · ${total ? fmtShare(blocks / total) : '0%'}`

/** "51–100 of 4,059". */
export function pageText(offset: number, shown: number, total: number) {
  return shown ? `${fmtNum(offset + 1)}–${fmtNum(offset + shown)} of ${fmtNum(total)}` : `0 of ${fmtNum(total)}`
}

/** Where a result opens: its session's flow, at its model call when the block names one. */
export function flowTarget(block: SearchBlock): { id: string; extra?: Record<string, unknown> } {
  return block.call_ts != null
    ? { id: block.session_id, extra: { callAt: block.call_ts } }
    : { id: block.session_id }
}

/** What the search did, in words: whole terms, quoted phrases, or every block. */
export function searchSummary(search: DetailThinkingSearch['search']): string {
  const parts = [
    search.terms.length ? `whole terms ${search.terms.map(term => `“${term}”`).join(' and ')}` : '',
    search.phrases.length ? `the text ${search.phrases.map(phrase => `“${phrase}”`).join(' and ')}` : '',
  ].filter(Boolean)
  return parts.length ? `Blocks with ${parts.join(' and ')}` : 'Every block'
}
