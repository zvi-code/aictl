import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars } from './Bars'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { PercentileStrip } from './charts/PercentileStrip'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { timeHero, hours, millis, programName, share, toolLabel, type Label, type TimeBody } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import {
  countedText, KIND_LEGEND, programRows, programStrip, reasoningRows, repoTimeRows, timeLine, timeOther, timeRows, timeSplit,
} from './timeSplitModel'
import bars from './Bars.module.css'
import base from './Insights.module.css'
import styles from './TimeSplit.module.css'

function Visual(props: { body: TimeBody; label: Label; mode: ColourMode; setMode: (mode: ColourMode) => void }) {
  const split = () => timeSplit(props.body)
  const repo = () => split() && props.mode === 'repo'
  return <>
    <ColourMode parts="Kind of time" value={repo() ? 'repo' : 'parts'} onChange={props.setMode} split={split()} />
    <Show when={repo()} fallback={<ul class={bars.legend} aria-label="Kinds of time: colours of the bar segments" data-kind-legend>
      <For each={KIND_LEGEND}>{item => <li><span class={`${bars.swatch} ${bars[`t${item.tone}`]}`} />{item.label}</li>}</For>
    </ul>}>
      <RepoLegend split={props.body} other={timeOther(props.body)} />
    </Show>
    <div class={styles.grid}>
      <div class={styles.wide}>
        <Bars name="time-tools" title="Summed time per tool (hours)" rows={repo() ? repoTimeRows(props.body, props.label) : timeRows(props.body, props.label)}
          axis={repo() ? 'Length: hours of model requests and tool calls, one linear scale from 0.'
            : 'Length: hours, one linear scale from 0; thinking is part of the model time.'} />
      </div>
      <Bars name="time-programs" title="Programs by summed call time (hours)" rows={programRows(props.body, repo() ? 'repo' : 'parts')}
        axis={repo() ? 'Length: hours, linear from 0, a segment per repository.' : 'Length: hours, linear from 0; grey rows are groups, not one program.'} />
      <PercentileStrip chart={programStrip(props.body)} />
      <Show when={reasoningRows(props.body, props.label).length}>
        <div class={styles.wide}>
          <Bars name="time-reasoning" title="Reasoning tokens in their requests' output tokens" scale="whole"
            legend={[{ label: 'Reasoning tokens', tone: 3 }, { label: 'Other output tokens', tone: 6 }]}
            axis="Each bar: output tokens of the requests that report reasoning tokens (100%). Tokens, not time."
            rows={reasoningRows(props.body, props.label)} />
        </div>
      </Show>
    </div>
    <p class={base.note} data-counted>{countedText(props.body, props.label)}</p>
  </>
}

type Row = Record<string, unknown>

export default function TimeSplit(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [mode, setMode] = useColourBy()
  return <InsightCard<TimeBody> {...props} card="time" tab="tools"
    hero={timeHero}
    finding={timeLine}
    visual={body => <Visual body={body} label={label} mode={mode()} setMode={setMode} />}
    note={'Hours are summed durations of calls, not wall-clock time: parallel calls overlap, so the sums can exceed the time ' +
      'that passed. A request or call with no recorded duration is not counted, nor is one recorded as over 24 hours. A call ' +
      'that starts a subagent is left out; the subagent\'s own requests and calls hold that time. Thinking is the part of a ' +
      'request the source reports as thinking time. Reasoning tokens are a token count some sources report instead; their share ' +
      'is of the output tokens of the requests that report them only. A program is the first word of the command line as stored; ' +
      'shell keywords, builtins and variables in that place are grouped as "Shell construct, program not identified". Top 10 ' +
      'programs by time. The median and 95th percentile of a program are of the duration of one call, over all its timed calls; ' +
      'they are not split by repository.'}
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
