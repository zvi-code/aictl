import { untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import {
  failedRows, failureMeasured, failureSplit, failureTotal, nextLegend, nextRepoRows, nextRows, runLegend, runRows, type ToolBar,
} from './afterFailureModel'
import { Bars } from './Bars'
import { opening, opens } from './charts/Open'
import { ColourBy, useColourBy, drawnBy } from './charts/ColourBy'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { failureFinding, OUTCOME_LABELS, OUTCOMES, toolLabel, type FailureBody, type Label } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import styles from './CallsViews.module.css'

export default function AfterFailure(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const open = opens(ctx)
  /** A bar of one coding tool narrows the page to it; the bar of all tools names no one tool. */
  const product = (rows: ToolBar[]) => opening(rows, row => row.tool ? open.product(row.tool, label(row.tool)) : undefined)
  const [by, setBy] = useColourBy()
  return <InsightCard<FailureBody> {...props} card="failures" tab="errors"
    hero={failureTotal}
    finding={() => failureMeasured}
    visual={body => {
      const repo = () => drawnBy(by(), failureSplit(body)) === 'repo'
      return <div class={styles.charts}>
        <ColourBy parts="Next call" split={failureSplit(body)} value={by()} onChange={setBy} />
        {repo() ? <RepoLegend split={body} other={hasOther(body.tools)} /> : null}
        {repo()
          ? <Bars name="failure-next-repos" title="Next call after a failed call, by repository" rows={product(nextRepoRows(body, label))}
            axis="Length: failed calls, one scale for every row; a segment per repository." />
          : <Bars name="failure-next" title="Next call after a failed call" scale="whole" legend={nextLegend} rows={product(nextRows(body, label))}
            axis="Bar: a tool's failed calls = 100%; a segment per next call of the same agent." />}
        <div class={styles.columns}>
          <Bars name="failure-calls" title="Failed calls per tool" rows={product(failedRows(body, label, repo()))} legend={repo() ? undefined : runLegend}
            axis={`Length: failed calls, one scale${repo() ? '; a segment per repository' : ''}. Beside: share of the tool's calls.`} />
          <Bars name="failure-runs" title="Runs of 3 or more failed calls in a row" rows={product(runRows(body, label, repo()))}
            axis={`Length: runs, one scale${repo() ? '; a segment per repository' : ''}. Beside: the longest run, in calls.`} />
        </div>
        <details class={styles.totals} data-totals><summary>Totals of the period</summary><p>{failureFinding(body, label)}</p></details>
      </div>
    }}
    note={'The next call is the next tool call of the same session and agent. "Identical call" means the same tool name and the ' +
      'same target (command, path or URL), compared by a hash in the cluster; where the store keeps no command text, the ' +
      'target is the program name only. "Changed call": the same tool name with another target. A failed call that was the ' +
      'last call of its agent has no next call. A run is 3 or more failed calls in a row. Only calls in the period count. ' +
      'The bar of all tools counts every tool, those too small to compare among them.'}
    table={{
      label: 'After a failure by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), calls: tool.calls, failures: tool.failures, ...tool.outcomes, last: tool.last_failures,
        streaks: tool.streaks, streak_calls: tool.streak_calls, longest: tool.longest ?? undefined,
      })),
      fields: [{ ...textField('tool', 'Tool'), action: { label: row => open.product(String(row.id), String(row.tool))?.label,
        run: row => open.product(String(row.id), String(row.tool))?.run() } }, numberField('calls', 'Calls', fmtNum), numberField('failures', 'Failed calls', fmtNum),
        ...OUTCOMES.map(outcome => numberField(outcome, OUTCOME_LABELS[outcome], fmtNum)),
        numberField('last', 'Last call of its agent', fmtNum), numberField('streaks', 'Runs of 3 or more', fmtNum),
        numberField('streak_calls', 'Calls in runs', fmtNum), numberField('longest', 'Longest run', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('longest', 'Longest run', fmtNum), numberField('streaks', 'Runs of 3 or more', fmtNum),
      numberField('streak_calls', 'Calls in runs', fmtNum)]} />
}
