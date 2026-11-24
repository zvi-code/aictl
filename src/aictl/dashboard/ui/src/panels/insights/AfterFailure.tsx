import { untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { failureHero,
  count, failureFinding, failureOutcomeHover, failureShareHover, failureStreakHover, OUTCOME_LABELS, OUTCOMES, plural, share,
  type FailureBody, type Outcome, toolLabel, type Label,
} from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther, notSplitNote, repoParts } from './repoSplit'

const TONE: Record<Outcome | 'last', number> = {
  identical_failed: 8, identical_succeeded: 9, changed_failed: 5, changed_succeeded: 2, other_tool: 0, last: 7,
}
const legend = [...OUTCOMES.map(outcome => ({ label: OUTCOME_LABELS[outcome], tone: TONE[outcome] })),
  { label: 'No next call (last call of its agent)', tone: TONE.last }]
const ratio = (part: number, whole: number) => whole > 0 ? part / whole : null

function outcomeRows(body: FailureBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: plural(tool.failures, 'failed call'), total: `${fmtNum(tool.failures)} failed`,
    parts: [...OUTCOMES.map(outcome => ({
      key: outcome, label: OUTCOME_LABELS[outcome], value: tool.outcomes[outcome] ?? 0, tone: TONE[outcome],
      text: fmtNum(tool.outcomes[outcome] ?? 0), hover: failureOutcomeHover(tool, outcome, label),
    })), { key: 'last', label: 'No next call', value: tool.last_failures, tone: TONE.last, text: fmtNum(tool.last_failures),
      hover: failureOutcomeHover(tool, 'last', label) }],
  }))
}

/** Per tool and next-call outcome (and "no next call"), its failed calls split by repository; the bar above splits them by outcome. */
function outcomeRepoRows(body: FailureBody, label: Label): BarRow[] {
  const kinds = [...OUTCOMES.map(outcome => ({ key: outcome as Outcome | 'last', name: OUTCOME_LABELS[outcome] })),
    { key: 'last' as const, name: 'No next call' }]
  return body.tools.filter(tool => tool.repos?.length).flatMap(tool => kinds.map(kind => {
    const calls = kind.key === 'last' ? tool.last_failures : tool.outcomes[kind.key] ?? 0
    const key = kind.key === 'last' ? 'last_failures' : kind.key
    return {
      key: `${tool.tool}:${kind.key}`, label: `${label(tool.tool)}: ${kind.name}`, total: plural(calls, 'failed call'),
      parts: repoParts(tool.repos, key, body.repo_order, fmtNum, `${label(tool.tool)}, ${kind.name.toLowerCase()}`,
        `failed calls with this outcome`, failureOutcomeHover(tool, kind.key, label)),
    }
  }).filter(row => row.parts.length))
}

function failureRows(body: FailureBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: plural(tool.calls, 'call'),
    total: `${fmtNum(tool.failures)} · ${share(ratio(tool.failures, tool.calls))}`,
    parts: tool.repos?.length ? repoParts(tool.repos, 'failures', body.repo_order, fmtNum, `${label(tool.tool)}, failed calls`, 'failed calls',
      failureShareHover(tool, label))
      : [{ key: 'failed', label: 'failed calls', value: tool.failures, tone: 8, text: fmtNum(tool.failures), hover: failureShareHover(tool, label) }],
  }))
}

function streakRows(body: FailureBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `${plural(tool.streak_calls, 'call')} in them · longest ${count(tool.longest)}`,
    total: plural(tool.streaks, 'run'),
    parts: tool.repos?.length ? repoParts(tool.repos, 'streaks', body.repo_order, fmtNum, `${label(tool.tool)}, runs of 3 or more`,
      'runs of 3 or more', `${failureStreakHover(tool, label)} ${notSplitNote('longest run')}`)
      : [{ key: 'runs', label: 'runs of 3 or more', value: tool.streaks, tone: 1, text: fmtNum(tool.streaks), hover: failureStreakHover(tool, label) }],
  }))
}

const split = (body: FailureBody) => body.tools.some(tool => tool.repos?.length)

export default function AfterFailure(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<FailureBody> {...props} card="failures" tab="errors"
    hero={failureHero}
    finding={body => failureFinding(body, label)}
    visual={body => <>
      <RepoLegend split={body} other={hasOther(body.tools)} />
      <Bars name="failure-outcomes" title="What the next call of the same agent was after a failed call, per tool" scale="whole"
        legend={legend} rows={outcomeRows(body, label)}
        axis="Bar: the tool's failed calls in the period (100%); segments: calls per next-call outcome, count written on each." />
      <Bars name="failure-outcomes-repos" title="Failed calls per tool and next-call outcome, by repository" rows={outcomeRepoRows(body, label)}
        axis="Length: failed tool calls, one linear scale from 0 for every row; a segment per repository." />
      <Bars name="failure-calls" title="Failed calls per tool" rows={failureRows(body, label)}
        axis={`Length: failed tool calls, linear from 0${split(body) ? ', a segment per repository' : ''}; beside it the count and its share of the tool's calls.`} />
      <Bars name="failure-runs" title="Runs of 3 or more failed calls in a row, per tool" rows={streakRows(body, label)}
        axis={`Length: number of runs, linear from 0${split(body) ? '; a segment per repository. The longest run is not split' : ''}.`} />
    </>}
    note={'The next call is the next tool call of the same session and agent. "Identical call" means the same tool name and the ' +
      'same target (command, path or URL), compared by a hash in the cluster; where the store keeps no command text, the ' +
      'target is the program name only. "Changed call": the same tool name with another target. A failed call that was the ' +
      'last call of its agent has no next call. A run is 3 or more failed calls in a row. Only calls in the period count.'}
    table={{
      label: 'After a failure by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), failures: tool.failures, ...tool.outcomes, last: tool.last_failures,
        streaks: tool.streaks, streak_calls: tool.streak_calls, longest: tool.longest ?? undefined,
      })),
      fields: [textField('tool', 'Tool'), numberField('failures', 'Failed calls', fmtNum),
        ...OUTCOMES.map(outcome => numberField(outcome, OUTCOME_LABELS[outcome], fmtNum)),
        numberField('last', 'Last call of its agent', fmtNum), numberField('streaks', 'Runs of 3 or more', fmtNum),
        numberField('streak_calls', 'Calls in runs', fmtNum), numberField('longest', 'Longest run', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('longest', 'Longest run', fmtNum), numberField('streaks', 'Runs of 3 or more', fmtNum),
      numberField('streak_calls', 'Calls in runs', fmtNum)]} />
}
