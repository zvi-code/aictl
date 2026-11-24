// ─── Findings summary — the payload of /api/board/insights/summary and the sentence of each finding ─
// The server builds the ranked list from the cards' own answers; this file only words it.
import { createSignal } from 'solid-js'
import { fmtBytes, fmtNum, fmtShare, fmtUsd, projectName } from '../../design/format'
import { plural, SMALL_STEP_OUTPUT, type CardId } from './insightsModel'

type Num = number | null
export type FindingKind = 'problem_sessions' | 'top_session' | 'never_edited' | 'heavy_context' | 'small_steps' | 'pause_tax'
  | 'subagents' | 'untested' | 'rereads' | 'failure_runs'
export type Finding = {
  kind: FindingKind; card: CardId; unit: 'usd' | 'sessions' | 'reads' | 'runs'; stake: number; share: Num; sessions: Num
  project: { name: string; sessions: Num; stake: number } | null
  session: { session_id: string; node_id?: string | null; tool?: string | null } | null
  opens: 'sessions' | 'session' | 'card'; detail: Record<string, number | null | undefined>
}
export type SummaryBody = {
  card: 'summary'; range: { since: number; until: number }; computed_at: number; total_usd: Num; findings: Finding[]; missing: CardId[]
  node_scope?: { kind: string; node_id: string | null }
}

/** The stake of a finding as it is shown: dollars at list price, or the count it measures. */
export function stakeText(item: Finding) {
  return item.unit === 'usd' ? fmtUsd(item.stake) : plural(item.stake, item.unit === 'sessions' ? 'session' : item.unit === 'reads' ? 'read' : 'run')
}

const n = (value: number | null | undefined) => fmtNum(value ?? 0)

/** The finding in plain words, with its stake. */
export function findingText(item: Finding) {
  const d = item.detail
  const sessions = item.sessions == null ? '' : ` in ${plural(item.sessions, 'session')}`
  switch (item.kind) {
    case 'problem_sessions': return `${plural(item.sessions ?? 0, 'session')} showed a problem (a failure streak, repeated compaction, ` +
      `a failed subagent, an API error, open todos or a failed hook) and cost ${fmtUsd(item.stake)}.`
    case 'top_session': return `One session cost ${fmtUsd(item.stake)} on its own.`
    case 'never_edited': return `${plural(item.sessions ?? 0, 'session')} never changed a file; their main agent cost ${fmtUsd(item.stake)}.`
    case 'heavy_context': return `${plural(d.requests ?? 0, 'request')} read 200k tokens of context or more${sessions} ` +
      `(${fmtShare(d.request_share)} of requests) and cost ${fmtUsd(item.stake)}.`
    case 'small_steps': return `${plural(d.requests ?? 0, 'request')} were small steps (under ${SMALL_STEP_OUTPUT} output tokens, no thinking) ` +
      `and cost ${fmtUsd(item.stake)}.`
    case 'pause_tax': return `${plural(d.requests ?? 0, 'request')} came after a pause of over 5 minutes${sessions} and cost ` +
      `${fmtUsd(d.cost_usd)}; without the pause they would cost about ${fmtUsd(d.baseline_usd)}, so the pauses cost ${fmtUsd(item.stake)} more.`
    case 'subagents': return `${plural(d.subagents ?? 0, 'subagent')}${sessions} made ${plural(d.requests ?? 0, 'request')} and cost ${fmtUsd(item.stake)}.`
    case 'untested': return `${n(item.stake)} of ${plural(d.edit_sessions ?? 0, 'session')} that changed source code never ran a test.`
    case 'rereads': return `${n(item.stake)} of ${plural(d.reads ?? 0, 'file read')} read a file the same agent had already read` +
      (d.repeat_bytes == null ? '.' : `, ${fmtBytes(d.repeat_bytes)} again.`)
    case 'failure_runs': return `${plural(item.stake, 'run')} of 3 or more failed calls in a row, ${plural(d.streak_calls ?? 0, 'call')} in all` +
      (d.longest == null ? '.' : `; the longest was ${plural(d.longest, 'call')}.`)
  }
}

/** What the share of a finding is a share of. */
export function shareText(item: Finding) {
  if (item.share == null) return ''
  const of = item.unit === 'usd' ? 'of the period\'s cost' : item.unit === 'sessions' ? 'of the sessions that changed source'
    : item.unit === 'reads' ? 'of file reads' : 'of failed calls'
  return `${fmtShare(item.share)} ${of}`
}

/** Where a finding sits: its one session's project, or the project that carries the most of it. */
export function whereText(item: Finding) {
  const p = item.project
  if (!p) return item.sessions != null && item.unit === 'usd' && item.kind !== 'top_session' ? plural(item.sessions, 'session') : ''
  if (item.kind === 'top_session') return `in ${projectName(p.name)}`
  const part = item.unit === 'usd' ? `${fmtUsd(p.stake)} (${fmtShare(p.stake / item.stake)})` : n(p.stake)
  return `most in ${projectName(p.name)}: ${part}${p.sessions == null ? '' : `, ${plural(p.sessions, 'session')}`}`
}

/** The label of a finding's link. */
export const linkText = (item: Finding) => item.opens === 'session' ? 'Open the session' : item.opens === 'sessions' ? 'Show the sessions' : 'Show the card'

/** The card a finding's link asked to show, and whether its sessions should open: the card opens them once it has loaded. */
export const [revealed, reveal] = createSignal<{ card: CardId; sessions: boolean } | null>(null)
