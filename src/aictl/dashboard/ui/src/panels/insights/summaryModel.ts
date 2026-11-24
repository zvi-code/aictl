// ─── Findings summary — the payload of /api/board/insights/summary and the sentence of each finding ─
// The server builds the ordered list from the cards' own answers; this file only words it.
import { createSignal } from 'solid-js'
import { fmtBytes, fmtNum, fmtShare, fmtUsd, projectName } from '../../design/format'
import { causeText, plural, SMALL_STEP_OUTPUT, type CardId, type PauseCauseLead } from './insightsModel'

type Num = number | null
export type FindingKind = 'problem_sessions' | 'top_session' | 'never_edited' | 'heavy_context' | 'small_steps' | 'pause_tax'
  | 'subagents' | 'untested' | 'rereads' | 'failure_runs'
export type Finding = {
  kind: FindingKind; card: CardId; unit: 'usd' | 'sessions' | 'reads' | 'runs'; stake: number; share: Num; sessions: Num
  project: { name: string; sessions: Num; stake: number } | null
  session: { session_id: string; node_id?: string | null; tool?: string | null } | null
  opens: 'sessions' | 'session' | 'card'; detail: Record<string, number | null | undefined>
  /** The pause tax only: the largest cause of the long pauses, as the card states it. */
  cause?: PauseCauseLead | null
}
export type SummaryBody = {
  card: 'summary'; range: { since: number; until: number }; computed_at: number; total_usd: Num; findings: Finding[]; missing: CardId[]
  node_scope?: { kind: string; node_id: string | null }
}

/** The title of the card each finding comes from, as the card itself is titled. */
export const CARD_TITLES: Partial<Record<CardId, string>> = {
  problems: 'Problem sessions', orientation: 'Orientation cost by repository', context: 'Context weight', pause: 'Pause tax',
  subagents: 'Spend in subagents', verified: 'Verified before commit', rereads: 'Repeated file reads', failures: 'After a failure',
}
export const cardTitle = (card: CardId) => CARD_TITLES[card] ?? card

/** The amount of a finding as it is shown: dollars at list price, or the count it measures. */
export function stakeText(item: Finding) {
  return item.unit === 'usd' ? fmtUsd(item.stake) : plural(item.stake, item.unit === 'sessions' ? 'session' : item.unit === 'reads' ? 'read' : 'run')
}

const n = (value: number | null | undefined) => fmtNum(value ?? 0)
const unpriced = (requests: number | null | undefined) => requests
  ? ` ${plural(requests, 'request')} with no known price ${requests === 1 ? 'is' : 'are'} not in the cost.` : ''
const SIX_SIGNALS = 'a failure streak, repeated compaction, a failed delegation, a turn ended on an API error, open todos or a failed hook'

/** The line of a finding: the measure, its amount and what it was counted over. */
export function findingText(item: Finding) {
  const d = item.detail
  const sessions = item.sessions == null ? '' : ` in ${plural(item.sessions, 'session')}`
  switch (item.kind) {
    case 'problem_sessions': return `${plural(item.sessions ?? 0, 'session')} recorded at least one of six signals (${SIX_SIGNALS})` +
      (d.multi == null ? '' : `, ${n(d.multi)} of them two or more`) + `; their requests cost ${fmtUsd(item.stake)} at list price.`
    case 'top_session': return `The session with the highest cost in the period: ${fmtUsd(item.stake)} at list price` +
      (typeof d.signals === 'number' ? `, ${plural(d.signals, 'recorded signal')}.` : '.')
    case 'never_edited': return `${plural(item.sessions ?? 0, 'session')} recorded no file edit; the requests of their main agent cost ` +
      `${fmtUsd(item.stake)} at list price.` + unpriced(d.unpriced_requests)
    case 'heavy_context': return `${plural(d.requests ?? 0, 'request')} read a context of 200k tokens or more${sessions} ` +
      `(${fmtShare(d.request_share)} of the requests with token counts); they cost ${fmtUsd(item.stake)} at list price.`
    case 'small_steps': return `${plural(d.requests ?? 0, 'request')} had under ${SMALL_STEP_OUTPUT} output tokens and no thinking time; ` +
      `they cost ${fmtUsd(item.stake)} at list price.`
    case 'pause_tax': return `${plural(d.requests ?? 0, 'request')} followed a pause of 5 minutes or more${sessions}; they cost ` +
      `${fmtUsd(d.cost_usd)} at list price. At each tool's average cost per request after a pause under 1 minute they would cost ` +
      `${fmtUsd(d.baseline_usd)} (estimate); the difference is ${fmtUsd(item.stake)}.` + causeText(item.cause)
    case 'subagents': return `${plural(d.subagents ?? 0, 'subagent')}${sessions} made ${plural(d.requests ?? 0, 'request')}; ` +
      `they cost ${fmtUsd(item.stake)} at list price.`
    case 'untested': return `${n(item.stake)} of ${plural(d.edit_sessions ?? 0, 'session')} that changed source code recorded no test run.`
    case 'rereads': return `${n(item.stake)} of ${plural(d.reads ?? 0, 'file read')} read a file the same agent had already read` +
      (d.repeat_bytes == null ? '.' : `; they returned ${fmtBytes(d.repeat_bytes)}.`)
    case 'failure_runs': return `${plural(item.stake, 'run')} of 3 or more failed calls in a row, ${plural(d.streak_calls ?? 0, 'call')} in all` +
      (d.longest == null ? '.' : `; the longest was ${plural(d.longest, 'call')}.`)
  }
}

/** What the share of a finding is a share of. */
export function shareText(item: Finding) {
  if (item.share == null) return ''
  const of = item.unit === 'usd' ? 'of the period\'s cost' : item.unit === 'sessions' ? 'of the sessions that changed source'
    : item.unit === 'reads' ? 'of file reads' : 'of failed calls were in these runs'
  return `${fmtShare(item.share)} ${of}`
}

/** Where a finding sits: its one session's project, or the project with the largest part of it. */
export function whereText(item: Finding) {
  const p = item.project
  if (!p) return item.sessions != null && item.unit === 'usd' && item.kind !== 'top_session' ? plural(item.sessions, 'session') : ''
  if (item.kind === 'top_session') return `in ${projectName(p.name)}`
  const part = item.unit === 'usd' ? `${fmtUsd(p.stake)} (${fmtShare(p.stake / item.stake)})` : n(p.stake)
  return `largest project part: ${projectName(p.name)}, ${part}${p.sessions == null ? '' : `, ${plural(p.sessions, 'session')}`}`
}

/** What 100% of a finding's share bar is, in words. */
export function shareWhole(item: Finding, total: Num) {
  if (item.unit === 'usd') return total == null ? 'the period\'s cost' : `the period's cost, ${fmtUsd(total)} at list price`
  if (item.unit === 'sessions') return `the ${plural(item.detail.edit_sessions ?? 0, 'session')} that changed source code`
  if (item.unit === 'reads') return `the ${plural(item.detail.reads ?? 0, 'file read')}`
  return `the ${plural(item.detail.failures ?? 0, 'failed call')}`
}

/** The hover of a finding's share bar: the amount, its share of its whole, what it was counted over and its card. */
export function findingHover(item: Finding, total: Num) {
  const amount = item.unit === 'usd' ? `${fmtUsd(item.stake)} at list price` : stakeText(item)
  const share = item.share == null ? 'share not reported' : `${fmtShare(item.share)} of ${shareWhole(item, total)}`
  const over = item.sessions == null ? '' : ` · counted over ${plural(item.sessions, 'session')}`
  return `${amount} · ${share}${over} · from the ${cardTitle(item.card)} card, over the period`
}

/** The label of a finding's link. */
export const linkText = (item: Finding) => item.opens === 'session' ? 'Open the session' : item.opens === 'sessions' ? 'Show the sessions' : 'Show the card'

/** The card a finding's link asked to show, and whether its sessions should open: the card opens them once it has loaded. */
export const [revealed, reveal] = createSignal<{ card: CardId; sessions: boolean } | null>(null)
