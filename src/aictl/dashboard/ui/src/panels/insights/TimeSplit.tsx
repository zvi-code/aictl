import { Show, untrack } from 'solid-js'
import { fmtN, fmtNum } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { timeHero,
  hours, millis, modelRest, plural, programHover, programName, reasoningHover, reasoningText, share, timeFinding, timePartHover,
  toolLabel, type Label, type TimeBody,
} from './insightsModel'
import styles from './Insights.module.css'

const NO_THINKING = 'thinking time not recorded by this tool'

function timeRows(body: TimeBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool),
    sub: `${plural(tool.requests, 'request')} · ${plural(tool.calls, 'call')}${tool.thinking_ms == null ? ` · ${NO_THINKING}` : ''}`,
    total: hours((tool.model_ms ?? 0) + (tool.tool_ms ?? 0)),
    parts: [
      { key: 'thinking', label: 'model, thinking', value: tool.thinking_ms, tone: 3, text: hours(tool.thinking_ms),
        hover: timePartHover(tool, 'thinking', label) },
      { key: 'model', label: 'model, rest of the request', value: modelRest(tool), tone: 2, text: hours(modelRest(tool)),
        hover: timePartHover(tool, 'model', label) },
      { key: 'tools', label: 'tool calls', value: tool.tool_ms, tone: 1, text: hours(tool.tool_ms), hover: timePartHover(tool, 'tools', label) },
    ],
  }))
}

/** Per tool that reports them: its reasoning tokens inside the output tokens of the same requests. */
function reasoningRows(body: TimeBody, label: Label): BarRow[] {
  return body.tools.filter(tool => (tool.reasoning_requests ?? 0) > 0).map(tool => {
    const reasoning = tool.reasoning_tokens ?? null, output = tool.reasoning_output_tokens ?? null
    const rest = reasoning != null && output != null ? Math.max(0, output - reasoning) : null
    return {
      key: tool.tool, label: label(tool.tool), sub: tool.thinking_ms == null ? NO_THINKING : undefined, total: reasoningText(tool),
      parts: [
        { key: 'reasoning', label: 'reasoning tokens', value: reasoning, tone: 3, text: reasoning == null ? '' : `${fmtN(reasoning)}`,
          hover: reasoningHover(tool, label) },
        { key: 'output', label: 'other output tokens', value: rest, tone: 6, text: rest == null ? '' : `${fmtN(rest)}`,
          hover: reasoningHover(tool, label) },
      ],
    }
  })
}

function programRows(body: TimeBody): BarRow[] {
  const total = body.programs.reduce((sum, row) => sum + (row.duration_ms ?? 0), 0)
  return body.programs.map(row => ({
    key: `${row.group}:${row.program ?? ''}`, label: programName(row),
    sub: `${plural(row.calls, 'call')} · ${share(row.failure_share)} failed`,
    total: `${hours(row.duration_ms)} · median ${millis(row.p50_ms)} · p95 ${millis(row.p95_ms)}`,
    parts: [{ key: 'time', label: 'summed time', value: row.duration_ms, tone: row.group === 'program' ? 1 : 7, text: hours(row.duration_ms),
      hover: programHover(row, total) }],
  }))
}

type Row = Record<string, unknown>

export default function TimeSplit(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<TimeBody> {...props} card="time" title="Where the time goes" tab="tools"
    hero={timeHero}
    finding={body => timeFinding(body, label)}
    visual={body => <>
      <Bars name="time-tools" title="Summed time per tool: model requests and tool calls"
        legend={[{ label: 'Model: thinking', tone: 3 }, { label: 'Model: rest of the request', tone: 2 }, { label: 'Tool calls', tone: 1 }]}
        axis="Length: summed hours, one linear scale for every tool from 0; thinking is part of the model time."
        rows={timeRows(body, label)} />
      <Show when={reasoningRows(body, label).length}>
        <Bars name="time-reasoning" title="Reasoning tokens in the requests that report them, per tool" scale="whole"
          legend={[{ label: 'Reasoning tokens', tone: 3 }, { label: 'Other output tokens', tone: 6 }]}
          axis="Bar: the output tokens of the requests that report reasoning tokens (100%). A token count, not time."
          rows={reasoningRows(body, label)} />
      </Show>
      <Bars name="time-programs" title="Programs run by command calls, by summed time"
        axis="Length: summed hours, linear from 0; grey rows are groups, not one program."
        rows={programRows(body)} />
      <p class={styles.note} data-counted>
        Without a recorded duration: {fmtNum(body.summary.untimed_requests)} requests and {fmtNum(body.summary.untimed_calls)} calls.
        <Show when={body.summary.overlong}> Left out as recording errors: {fmtNum(body.summary.overlong)} requests or calls
          recorded as over 24 hours ({hours(body.summary.overlong_ms)} in all).</Show>
        <Show when={body.tools.some(tool => tool.thinking_ms == null)}> Thinking time not recorded by: {
          body.tools.filter(tool => tool.thinking_ms == null).map(tool => label(tool.tool)).join(', ')}.</Show>
      </p>
    </>}
    note={'Hours are summed durations of calls, not wall-clock time: parallel calls overlap, so the sums can exceed the time ' +
      'that passed. A request or call with no recorded duration is not counted, nor is one recorded as over 24 hours. A call ' +
      'that starts a subagent is left out; the subagent\'s own requests and calls hold that time. Thinking is the part of a ' +
      'request the source reports as thinking time. Reasoning tokens are a token count some sources report instead; their share ' +
      'is of the output tokens of the requests that report them only. A program is the first word of the command line as stored; ' +
      'shell keywords, builtins and variables in that place are grouped as "Shell construct, program not identified". Top 10 ' +
      'programs by time.'}
    table={{
      label: 'Where the time goes by tool and program',
      rows: body => [
        ...body.tools.map((tool): Row => ({
          id: `tool:${tool.tool}`, name: label(tool.tool), kind: 'Tool', count: tool.requests + tool.calls,
          model_ms: tool.model_ms ?? undefined, thinking_ms: tool.thinking_ms ?? undefined, tool_ms: tool.tool_ms ?? undefined,
          untimed: tool.untimed_requests + tool.untimed_calls, reasoning: tool.reasoning_tokens ?? undefined,
          reasoning_output: tool.reasoning_output_tokens ?? undefined, reasoning_requests: tool.reasoning_requests || undefined,
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
        numberField('failure_share', 'Failed', value => share(value)), numberField('untimed', 'No duration', fmtNum),
        numberField('reasoning_requests', 'Requests reporting reasoning tokens', fmtNum),
        numberField('reasoning', 'Reasoning tokens', fmtNum), numberField('reasoning_output', 'Their output tokens', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('tool_ms', 'Tool-call time', value => hours(value)), numberField('calls', 'Calls', fmtNum),
      numberField('model_ms', 'Model time', value => hours(value)), numberField('requests', 'Requests', fmtNum)]} />
}
