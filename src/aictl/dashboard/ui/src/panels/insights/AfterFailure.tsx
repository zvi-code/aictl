import { For, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { failureHero,
  count, failureFinding, flowBands, OUTCOME_LABELS, OUTCOME_SHORT, OUTCOMES, type FailureBody, type FailureTool, toolLabel, type Label,
} from './insightsModel'
import styles from './Insights.module.css'

const W = 330, TOP = 18, NODE = 8, RIGHT = 150, SHOWN = 4

/** One tool: a flow from its failed calls to the five things the next call did, widths by count. */
function Flow(props: { tool: FailureTool; label: Label }) {
  const height = 150
  const bands = () => flowBands(props.tool.outcomes, TOP, height)
  const followed = () => {
    const outcomes = props.tool.outcomes
    return OUTCOMES.reduce((sum, outcome) => sum + outcomes[outcome], 0)
  }
  const tall = () => Math.max(TOP + height + 6, ...bands().map(band => band.labelY + 6))
  const middle = (NODE + RIGHT) / 2
  return <figure class={styles.flow}>
    <h3>{props.label(props.tool.tool)} · {fmtNum(props.tool.failures)} failed calls · {fmtNum(props.tool.streaks)} streaks of 3+, longest {count(props.tool.longest)}</h3>
    <svg class={styles.chart} viewBox={`0 0 ${W} ${tall()}`} role="img"
      aria-label={`${props.label(props.tool.tool)}: the next call after ${fmtNum(followed())} failed calls. ` +
        OUTCOMES.map(outcome => `${OUTCOME_LABELS[outcome]} ${fmtNum(props.tool.outcomes[outcome])}`).join(', ')}>
      <text x={0} y={TOP - 6}>{fmtNum(followed())} failed, then:</text>
      <rect class={styles.node} x={0} width={NODE} y={bands()[0]?.left[0] ?? TOP} height={(bands().at(-1)?.left[1] ?? TOP) - (bands()[0]?.left[0] ?? TOP)} />
      <For each={bands()}>{band => <g>
        <path class={`${styles.band} ${styles[`o${band.index}`]}`}
          d={`M${NODE} ${band.left[0]} C${middle} ${band.left[0]} ${middle} ${band.right[0]} ${RIGHT} ${band.right[0]} ` +
            `L${RIGHT} ${band.right[1]} C${middle} ${band.right[1]} ${middle} ${band.left[1]} ${NODE} ${band.left[1]} Z`}>
          <title>{`${OUTCOME_LABELS[band.outcome]}: ${fmtNum(band.calls)}`}</title>
        </path>
        <rect class={styles[`o${band.index}`]} x={RIGHT} width={NODE} y={band.right[0]} height={Math.max(1, band.right[1] - band.right[0])} />
        <text x={RIGHT + NODE + 6} y={band.labelY}>{OUTCOME_SHORT[band.outcome]} · {fmtNum(band.calls)}</text>
      </g>}</For>
    </svg>
  </figure>
}

export default function AfterFailure(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<FailureBody> {...props} card="failures" title="After a failure" tab="errors"
    hero={failureHero}
    finding={body => failureFinding(body, label)}
    visual={body => <div class={styles.flows}>
      <For each={body.tools.slice(0, SHOWN)}>{tool => <Flow tool={tool} label={label} />}</For>
    </div>}
    note={'The next call is the next tool call of the same session and agent. "Same call" means the same tool name and the ' +
      'same target (command, path or URL), compared by a hash in the cluster; where the store keeps no command text, the ' +
      'target is the program name only. A failed call that was the last call of its agent has no next call. A streak is ' +
      '3 or more failed calls in a row. Only calls in the period count. The 4 tools with the most failures are drawn.'}
    table={{
      label: 'After a failure by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), failures: tool.failures, ...tool.outcomes, last: tool.last_failures,
        streaks: tool.streaks, streak_calls: tool.streak_calls, longest: tool.longest ?? undefined,
      })),
      fields: [textField('tool', 'Tool'), numberField('failures', 'Failed calls', fmtNum),
        ...OUTCOMES.map(outcome => numberField(outcome, OUTCOME_LABELS[outcome], fmtNum)),
        numberField('last', 'Last call of its agent', fmtNum), numberField('streaks', 'Streaks of 3 or more', fmtNum),
        numberField('streak_calls', 'Calls in streaks', fmtNum), numberField('longest', 'Longest streak', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('longest', 'Longest streak', fmtNum), numberField('streaks', 'Streaks of 3 or more', fmtNum),
      numberField('streak_calls', 'Calls in streaks', fmtNum)]} />
}
