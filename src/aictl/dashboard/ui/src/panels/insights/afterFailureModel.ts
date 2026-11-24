// ─── After a failure: the bars of the view, drawn by the next call or by repository ─
// The failed calls of a tool are one whole, split by what the same agent called next (five outcomes, or no next call).
import { fmtNum } from '../../design/format'
import type { BarPart, BarRow } from './Bars'
import {
  count, failureOutcomeHover, failureShareHover, failureStreakHover, OUTCOME_LABELS, OUTCOMES, plural, repoPartsWith, segmentValue, share,
  type FailureBody, type Hero, type Label, type Outcome,
} from './insightsModel'
import { notSplitNote, type RepoSegment } from './repoSplit'

export type Next = Outcome | 'last'
export const NEXT: Next[] = [...OUTCOMES, 'last']
export const NEXT_LABELS: Record<Next, string> = { ...OUTCOME_LABELS, last: 'No next call' }
/** Danger for a failed next call, success for a succeeded one, light tones for a changed call, grey for none. */
export const NEXT_TONE: Record<Next, number> = {
  identical_failed: 8, identical_succeeded: 9, changed_failed: 5, changed_succeeded: 2, other_tool: 0, last: 7,
}
export const nextLegend = NEXT.map(next => ({ label: next === 'last' ? 'No next call (last call of its agent)' : NEXT_LABELS[next], tone: NEXT_TONE[next] }))
/** The parts of a tool's failed calls: those in runs of 3 or more failed calls in a row, and the others. */
export const RUN_TONE = { runs: 3, other: 6 }
export const runLegend = [{ label: 'In a run of 3 or more failed calls', tone: RUN_TONE.runs }, { label: 'Not in a run', tone: RUN_TONE.other }]

const ratio = (part: number, whole: number) => whole > 0 ? part / whole : null
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)
const calls = (tool: { outcomes: Record<Outcome, number>; last_failures: number }, next: Next) =>
  next === 'last' ? tool.last_failures : tool.outcomes[next] ?? 0

/** The line under the title: what is measured, in technical terms. */
export const failureMeasured = 'Failed tool calls per tool, and the next tool call of the same session and agent after each one.'

/** The headline: the failed tool calls of the period. */
export const failureTotal = (body: FailureBody): Hero | undefined => body.summary.failures
  ? { value: fmtNum(body.summary.failures), label: 'failed tool calls in the period, every tool' } : undefined

/** The hover of one outcome of the bar of every tool: its calls and their shares, from the period's summary. */
export function failureAllHover(body: FailureBody, next: Next) {
  const s = body.summary
  if (next === 'last') {
    const last = Math.max(0, s.failures - s.followed)
    return `All tools, no next call: ${plural(last, 'failed call')} (${share(ratio(last, s.failures))} of ${fmtNum(s.failures)} failed calls) ` +
      'were the last call of their agent in the period.'
  }
  const n = s[next] ?? 0
  return `All tools, ${lower(OUTCOME_LABELS[next])}: ${plural(n, 'call')}, ${share(ratio(n, s.followed))} of the ${fmtNum(s.followed)} failed ` +
    `calls with a next call, ${share(ratio(n, s.failures))} of all ${fmtNum(s.failures)} failed calls.`
}

/** Per tool, and first for every tool together: its failed calls as 100%, a segment per next-call outcome. */
export function nextRows(body: FailureBody, label: Label): BarRow[] {
  const s = body.summary
  const all: BarRow[] = body.tools.length > 1 && s.failures ? [{
    key: 'all', label: 'All tools', sub: plural(s.failures, 'failed call'), total: `${fmtNum(s.failures)} failed`,
    parts: NEXT.map(next => {
      const n = next === 'last' ? Math.max(0, s.failures - s.followed) : s[next] ?? 0
      return { key: next, label: NEXT_LABELS[next], value: n, tone: NEXT_TONE[next], text: fmtNum(n), hover: failureAllHover(body, next) }
    }),
  }] : []
  return [...all, ...body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: plural(tool.failures, 'failed call'), total: `${fmtNum(tool.failures)} failed`,
    parts: NEXT.map(next => ({
      key: next, label: NEXT_LABELS[next], value: calls(tool, next), tone: NEXT_TONE[next], text: fmtNum(calls(tool, next)),
      hover: failureOutcomeHover(tool, next, label),
    })),
  }))]
}

/** A repository's failed calls of one tool with this outcome: of its failed calls. */
const nextRepoMore = (segment: RepoSegment) => `Of ${plural(segmentValue(segment, 'failures') ?? 0, 'failed call')} of this tool in this repository.`

/** Per tool and next-call outcome: its failed calls, a segment per repository, one scale for every row. */
export function nextRepoRows(body: FailureBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.repos?.length).flatMap(tool => NEXT.map(next => ({
    key: `${tool.tool}:${next}`, label: `${label(tool.tool)}: ${NEXT_LABELS[next]}`, total: plural(calls(tool, next), 'failed call'),
    parts: repoPartsWith(tool.repos, next === 'last' ? 'last_failures' : next, body.repo_order, fmtNum,
      `${label(tool.tool)}, ${lower(NEXT_LABELS[next])}`, 'failed calls with this outcome', failureOutcomeHover(tool, next, label), nextRepoMore),
  })).filter(row => row.parts.length))
}

/** The hover of the failed calls of a tool not in a run of 3 or more. */
export function notInRunHover(tool: FailureBody['tools'][number], label: Label) {
  const n = Math.max(0, tool.failures - tool.streak_calls)
  return `${label(tool.tool)}: ${plural(n, 'failed call')} not in a run of 3 or more failed calls in a row ` +
    `(${share(ratio(n, tool.failures))} of ${fmtNum(tool.failures)} failed calls); ${fmtNum(tool.failures)} failed of ${plural(tool.calls, 'tool call')}.`
}

/** A repository's figures of one tool the failed-calls bar does not show: its calls and its calls in runs. */
const failedRepoMore = (segment: RepoSegment) => `${plural(segmentValue(segment, 'calls') ?? 0, 'call')} of this tool in this repository; ` +
  `${fmtNum(segmentValue(segment, 'streak_calls') ?? 0)} of the failed ones in runs of 3 or more.`

/** Per tool: its failed calls, split into those in runs of 3 or more and the others, or by repository. */
export function failedRows(body: FailureBody, label: Label, repo: boolean): BarRow[] {
  return body.tools.map(tool => {
    const parts: BarPart[] = repo && tool.repos?.length
      ? repoPartsWith(tool.repos, 'failures', body.repo_order, fmtNum, `${label(tool.tool)}, failed calls`, 'failed calls',
        failureShareHover(tool, label), failedRepoMore)
      : [{ key: 'runs', label: 'in runs of 3 or more', value: tool.streak_calls, tone: RUN_TONE.runs, text: fmtNum(tool.streak_calls),
        hover: failureStreakHover(tool, label) },
      { key: 'other', label: 'not in a run', value: Math.max(0, tool.failures - tool.streak_calls), tone: RUN_TONE.other,
        text: fmtNum(Math.max(0, tool.failures - tool.streak_calls)), hover: notInRunHover(tool, label) }]
    return { key: tool.tool, label: label(tool.tool), sub: plural(tool.calls, 'call'),
      total: `${fmtNum(tool.failures)} · ${share(ratio(tool.failures, tool.calls))} of calls`, parts }
  })
}

/** A repository's runs of one tool: the calls in them. */
const runRepoMore = (segment: RepoSegment) => `${plural(segmentValue(segment, 'streak_calls') ?? 0, 'call')} in them in this repository.`

/** Per tool: its runs of 3 or more failed calls in a row, whole or by repository; the longest run is not split. */
export function runRows(body: FailureBody, label: Label, repo: boolean): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `${plural(tool.streak_calls, 'call')} in them`,
    total: `${plural(tool.streaks, 'run')} · longest ${count(tool.longest)}`,
    parts: repo && tool.repos?.length
      ? repoPartsWith(tool.repos, 'streaks', body.repo_order, fmtNum, `${label(tool.tool)}, runs of 3 or more`, 'runs of 3 or more',
        `${failureStreakHover(tool, label)} ${notSplitNote('longest run')}`, runRepoMore)
      : [{ key: 'runs', label: 'runs of 3 or more', value: tool.streaks, tone: RUN_TONE.runs, text: fmtNum(tool.streaks),
        hover: failureStreakHover(tool, label) }],
  }))
}

/** Whether the answer carries a repository split for any tool. */
export const failureSplit = (body: FailureBody) => !!body.repo_order?.length && body.tools.some(tool => tool.repos?.length)
