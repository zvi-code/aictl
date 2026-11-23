// ─── Verified before commit — the payload of /api/board/insights/verified and its sentence ─
// A count the tool does not record is null and reads "not reported", never 0.
import { fmtNum, fmtShare } from '../../design/format'
import type { Base, Hero, Label } from './insightsModel'

type Num = number | null
export type VerifiedTool = {
  tool: string
  commits: Num; passed: Num; unreported: Num; failed: Num; changed_after: Num; never_tested: Num; no_change: Num
  unknown_change: Num; not_recorded: Num; by_subagent: Num; own_unseen: Num; commit_sessions: Num; top_session_commits: Num
  edit_sessions: Num; untested_sessions: Num; commands: Num; commands_with_text: Num; test_runs: Num; test_results: Num
  remote_commits: Num; edits_no_file: Num; sessions_no_text: Num; sessions_edits_unrecorded: Num
  classified: Num; unseen: Num; checked: boolean; unseen_share: Num; own_unseen_share: Num; unchecked: Num
  /** Whether the tool records an exit code of 0, so that it can report a pass at all. */
  pass_tool: boolean
}
export type VerifiedBody = Base<'verified'> & {
  tools: VerifiedTool[]
  summary: {
    commits: Num; classified: Num; unseen: Num; unseen_share: Num; own_unseen: Num; own_unseen_share: Num
    changed_after: Num; never_tested: Num; no_change: Num; failed: Num; passed: Num; unchecked: Num; edit_sessions: Num; untested_sessions: Num
    remote_commits: Num; sessions_no_text: Num; checked_tools: string[]; not_reported: string[]; not_classified: string[]
    one_session: string[]
  }
}

/** The parts of a tool's bar, left to right; each count is a field of the tool's row. */
export type Segment = { id: string; label: string; count: (tool: VerifiedTool) => Num }
export const SEGMENTS: Segment[] = [
  { id: 'passed', label: 'Tested, passed', count: tool => tool.passed },
  { id: 'unreported', label: 'Tested, result not recorded', count: tool => tool.unreported },
  { id: 'failed', label: 'Tested, failed', count: tool => tool.failed },
  { id: 'changed_after', label: 'Changed after last test', count: tool => tool.changed_after },
  { id: 'never_tested', label: 'Never tested', count: tool => tool.never_tested },
  { id: 'no_change', label: 'No code change', count: tool => tool.no_change },
  { id: 'unclassified', label: 'Not classified: edits not recorded or file unknown',
    count: tool => tool.commits == null ? null : (tool.not_recorded ?? 0) + (tool.unknown_change ?? 0) },
]

const list = (items: readonly string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
const commits = (n: number) => `${fmtNum(n)} ${n === 1 ? 'commit' : 'commits'}`

/** "13 of 59 sessions that changed source files never tested", or why a tool has no such figure. */
export function untestedText(tool: VerifiedTool) {
  if (tool.untested_sessions == null) return 'sessions that never tested: not reported'
  if (!tool.edit_sessions) return 'no session changed source files'
  return `${fmtNum(tool.untested_sessions)} of ${fmtNum(tool.edit_sessions)} sessions that changed source files never tested`
}

/** Why a tool's bar has no pass count: the tool never records one, or no test run of the period has a result. */
export function passMissingText(tool: VerifiedTool) {
  return tool.pass_tool ? 'no test run with a recorded result in this period' : 'pass not recorded by this tool'
}

/** Per tool, "13 of the 59 Copilot CLI sessions": only tools that report sessions that changed source files. */
function untestedSessions(body: VerifiedBody, label: Label) {
  const parts = body.tools.filter(tool => tool.untested_sessions != null && tool.edit_sessions)
    .map(tool => `${fmtNum(tool.untested_sessions ?? 0)} of the ${fmtNum(tool.edit_sessions ?? 0)} ${label(tool.tool)} ${tool.edit_sessions === 1 ? 'session' : 'sessions'}`)
  return parts.length ? `${list(parts)} that changed source files never ran a recognised test` : ''
}

/** The share on a tool's bar: commits no test run saw, or why there is none. */
export function shareText(tool: VerifiedTool) {
  if (tool.commits == null) return 'commits not reported: command text not kept'
  if (!tool.commits) return 'no commit'
  if (!tool.checked) return 'not classified: edits not recorded'
  const own = tool.own_unseen_share == null ? '' : ` (own agent ${fmtShare(tool.own_unseen_share)})`
  return `${fmtShare(tool.unseen_share)} no test saw${own} · ${fmtNum(tool.unseen)} of ${fmtNum(tool.classified)} classified`
}

export function verifiedFinding(body: VerifiedBody, label: Label) {
  const s = body.summary
  if (s.commits == null) {
    return s.not_reported.length ? `The sources in this period keep no command text (${list(s.not_reported.map(label))}), so their commits cannot be seen.`
      : 'No agent commit in this period.'
  }
  // Per tool: a total would credit the untested sessions of a tool that is not named to the tools that are.
  const untested = untestedSessions(body, label)
  if (!s.commits) return untested ? `No agent commit in this period; ${untested}.` : 'No agent commit in this period.'
  const names = s.checked_tools.length && s.checked_tools.length <= 2 ? `${list(s.checked_tools.map(label))} ` : ''
  const own = s.own_unseen_share == null ? '' : ` (${fmtShare(s.own_unseen_share)} counting only the committing agent's own work)`
  const noChange = s.no_change ?? 0
  const main = !s.classified ? `None of the ${commits(s.commits)} in this period can be checked`
    : noChange >= s.classified
      ? `None of the ${fmtNum(s.classified)} ${names}${s.classified === 1 ? 'commit' : 'commits'} that can be checked followed a source change`
      : `${fmtNum(s.unseen ?? 0)} of the ${fmtNum(s.classified)} ${names}commits that can be checked (${fmtShare(s.unseen_share)}) ` +
        `were made after source changes no test run had seen${own}`
  // When most checked commits followed no source change, the share rests on the few that did.
  const unchanged = s.classified && noChange && noChange < s.classified && noChange * 2 >= s.classified
    ? ` ${fmtNum(noChange)} of the ${fmtNum(s.classified)} checked commits followed no source change.` : ''
  const more = s.classified && s.unchecked
    ? ` ${fmtNum(s.unchecked)} more ${s.unchecked === 1 ? 'commit' : 'commits'} could not be checked because the tool did not record what ${s.unchecked === 1 ? 'it' : 'they'} changed.`
    : ''
  const why = !s.classified ? ' because the tool did not record what they changed' : ''
  const failed = s.failed ? ` ${commits(s.failed)} followed a failing test run with no source change in between.` : ''
  const one = s.one_session.map(tool => ` Most of ${label(tool)}'s commits come from one session.`).join('')
  return `${main}${untested ? `${why}, and ${untested}` : why}.${unchanged}${more}${failed}${one}`
}

export function verifiedHero(body: VerifiedBody): Hero | undefined {
  const s = body.summary
  if (s.unseen_share == null || s.classified == null || s.unseen == null) return undefined
  // No checked commit followed a source change: a 0% would read as "all tested".
  if ((s.no_change ?? 0) >= s.classified) return undefined
  return { value: fmtShare(s.unseen_share),
    label: `of classified agent commits were made after source changes no test run saw (${fmtNum(s.unseen)} of ${fmtNum(s.classified)})` }
}
