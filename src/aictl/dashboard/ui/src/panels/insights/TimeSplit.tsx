import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { timeHero,
  hours, millis, programName, scaled, share, timeFinding, toolLabel, type Label, type TimeBody, type TimeTool,
} from './insightsModel'
import styles from './Insights.module.css'

const pct = (value: number | null, largest: number) => `${(scaled(value, largest) * 100).toFixed(2)}%`

/** Per tool: one bar of model time (thinking marked inside it) then tool-call time, on one scale for all tools. */
function ToolBars(props: { body: TimeBody; label: Label }) {
  const total = (tool: TimeTool) => (tool.model_ms ?? 0) + (tool.tool_ms ?? 0)
  const largest = () => Math.max(0, ...props.body.tools.map(total))
  const rest = (tool: TimeTool) => tool.model_ms == null ? null : tool.model_ms - (tool.thinking_ms ?? 0)
  return <>
    <ul class={styles.legend}>
      <li><span class={`${styles.swatch} ${styles.think}`} />Model: thinking</li>
      <li><span class={`${styles.swatch} ${styles.main}`} />Model: rest of the request</li>
      <li><span class={`${styles.swatch} ${styles.sub}`} />Tool calls</li>
    </ul>
    <ol class={styles.bars} aria-label="Summed time of model requests and of tool calls per tool">
      <For each={props.body.tools}>{tool => <li class={styles.barRow}>
        <span class={styles.barName}>{props.label(tool.tool)}<small>{fmtNum(tool.requests)} requests · {fmtNum(tool.calls)} calls</small></span>
        <span class={styles.barTrack}>
          <span class={styles.split} role="img" aria-label={`${props.label(tool.tool)}: model ${hours(tool.model_ms)}, ` +
            `thinking ${hours(tool.thinking_ms)}, tool calls ${hours(tool.tool_ms)}`}>
            <span class={styles.think} style={{ 'inline-size': pct(tool.thinking_ms, largest()) }} />
            <span class={styles.main} style={{ 'inline-size': pct(rest(tool), largest()) }} />
            <span class={styles.sub} style={{ 'inline-size': pct(tool.tool_ms, largest()) }} />
          </span>
          <span class={styles.splitText}>model {hours(tool.model_ms)} (thinking {hours(tool.thinking_ms)}) · tools {hours(tool.tool_ms)}</span>
        </span>
      </li>}</For>
    </ol>
  </>
}

/** The programs with the most summed time, each a bar with its median and 95th percentile duration. */
function ProgramBars(props: { body: TimeBody }) {
  const largest = () => Math.max(0, ...props.body.programs.map(row => row.duration_ms ?? 0))
  return <ol class={styles.bars} aria-label="Programs that command calls ran, by summed time">
    <For each={props.body.programs}>{row => <li class={styles.barRow} data-group={row.group}>
      <span class={styles.barName}>{programName(row)}<small>{fmtNum(row.calls)} calls · {share(row.failure_share)} failed</small></span>
      <span class={styles.bar}>
        <span class={`${styles.fill} ${row.group === 'program' ? styles.sub : styles.unreported}`}
          style={{ 'inline-size': `max(var(--space-1), ${(scaled(row.duration_ms, largest()) * 60).toFixed(2)}%)` }} />
        {hours(row.duration_ms)} · median {millis(row.p50_ms)} · p95 {millis(row.p95_ms)}
      </span>
    </li>}</For>
  </ol>
}

type Row = Record<string, unknown>

export default function TimeSplit(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<TimeBody> {...props} card="time" title="Where the time goes" tab="tools"
    hero={timeHero}
    finding={body => timeFinding(body, label)}
    visual={body => <>
      <ToolBars body={body} label={label} />
      <h3 class={styles.subhead}>Programs run by command calls</h3>
      <ProgramBars body={body} />
      <p class={styles.note} data-counted>
        Without a recorded duration: {fmtNum(body.summary.untimed_requests)} requests and {fmtNum(body.summary.untimed_calls)} calls.
        <Show when={body.summary.overlong}> Left out as recording errors: {fmtNum(body.summary.overlong)} requests or calls
          recorded as over 24 hours ({hours(body.summary.overlong_ms)} in all).</Show>
        <Show when={body.tools.some(tool => tool.thinking_ms == null)}> Thinking not reported by: {
          body.tools.filter(tool => tool.thinking_ms == null).map(tool => label(tool.tool)).join(', ')}.</Show>
      </p>
    </>}
    note={'Hours are summed durations of calls, not wall-clock time: parallel calls overlap, so the sums can exceed the time ' +
      'that passed. A request or call with no recorded duration is not counted, nor is one recorded as over 24 hours. A call ' +
      'that starts a subagent is left out; the subagent\'s own requests and calls hold that time. Thinking is the part of a ' +
      'request the source reports as thinking. A program is the first word of the command line as stored; shell keywords, ' +
      'builtins and variables in that place are grouped as "Shell construct, program not identified". Top 10 programs by time.'}
    table={{
      label: 'Where the time goes by tool and program',
      rows: body => [
        ...body.tools.map((tool): Row => ({
          id: `tool:${tool.tool}`, name: label(tool.tool), kind: 'Tool', count: tool.requests + tool.calls,
          model_ms: tool.model_ms ?? undefined, thinking_ms: tool.thinking_ms ?? undefined, tool_ms: tool.tool_ms ?? undefined,
          untimed: tool.untimed_requests + tool.untimed_calls,
        })),
        ...body.programs.map((row): Row => ({
          id: `program:${row.group}:${row.program ?? ''}`, name: programName(row), kind: 'Program', count: row.calls,
          tool_ms: row.duration_ms ?? undefined, p50_ms: row.p50_ms ?? undefined, p95_ms: row.p95_ms ?? undefined,
          failure_share: row.failure_share ?? undefined, untimed: row.untimed,
        })),
      ],
      fields: [textField('kind', 'Row'), textField('name', 'Tool or program'),
        numberField('count', 'Requests and calls', fmtNum),
        numberField('model_ms', 'Model time', value => hours(value)), numberField('thinking_ms', 'Of it thinking', value => hours(value)),
        numberField('tool_ms', 'Tool-call time', value => hours(value)), numberField('p50_ms', 'Median call', value => millis(value)),
        numberField('p95_ms', '95th percentile call', value => millis(value)),
        numberField('failure_share', 'Failed', value => share(value)), numberField('untimed', 'No duration', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('tool_ms', 'Tool-call time', value => hours(value)), numberField('calls', 'Calls', fmtNum),
      numberField('model_ms', 'Model time', value => hours(value)), numberField('requests', 'Requests', fmtNum)]} />
}
