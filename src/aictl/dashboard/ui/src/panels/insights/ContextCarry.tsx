import { Show, untrack } from 'solid-js'
import { fmtNum, toolDisplayName } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { carryHero, bytes, carryFinding, carryHover, carryToolHover, count, plural, type CarryBody, toolLabel, type Label } from './insightsModel'
import styles from './Insights.module.css'
import { RepoLegend } from './RepoLegend'
import { hasOther, repoParts } from './repoSplit'

const MEASURE = { output: 'result bytes', carried: 'bytes sent again (upper bound)' }

/** Each tool name's bar, in segments per repository (repo_order colours) where the server split it. */
function nameRows(body: CarryBody, label: Label, of: 'output' | 'carried'): BarRow[] {
  return body.tool_names.map(row => {
    const key = of === 'output' ? 'output_bytes' : 'carried_bytes'
    const name = `${toolDisplayName(row.tool_name)} (${label(row.tool)}), ${MEASURE[of]}`
    return {
      key: `${row.tool}:${row.tool_name}`, label: toolDisplayName(row.tool_name),
      sub: `${label(row.tool)} · ${plural(row.calls, 'call')}${of === 'carried' ? ` · ≈ ${count(row.avg_later_requests)} later requests` : ''}`,
      total: bytes(row[key]),
      parts: row.repos?.length ? repoParts(row.repos, key, body.repo_order, value => bytes(value), name, MEASURE[of], carryHover(row, label))
        : [{ key: of, label: MEASURE[of], tone: of === 'output' ? 2 : 0, value: row[key], text: bytes(row[key]), hover: carryHover(row, label) }],
    }
  })
}

function toolRows(body: CarryBody, label: Label): BarRow[] {
  return body.tools.map(row => ({
    key: row.tool, label: label(row.tool), sub: `${fmtNum(row.reported)} of ${plural(row.calls, 'call')} with a size`,
    total: row.output_bytes == null ? 'result size not reported' : `${bytes(row.output_bytes)} · up to ${bytes(row.carried_bytes)} again`,
    parts: row.output_bytes == null ? [] : row.repos?.length
      ? repoParts(row.repos, 'output_bytes', body.repo_order, value => bytes(value), `${label(row.tool)}, ${MEASURE.output}`, MEASURE.output,
        carryToolHover(row, label))
      : [{ key: 'output', label: 'result bytes', value: row.output_bytes, tone: 2, text: bytes(row.output_bytes),
        hover: carryToolHover(row, label) }],
  }))
}

function CarryBars(props: { body: CarryBody; label: Label }) {
  return <>
    <RepoLegend split={props.body} other={hasOther([...props.body.tool_names, ...props.body.tools])} />
    <Bars name="carry-output" title="Result bytes per tool name (the 10 with the largest estimate)"
      axis="Length: bytes the results had, as the source recorded them, linear from 0; a segment per repository." rows={nameRows(props.body, props.label, 'output')} />
    <Bars name="carry-carried" title="Bytes sent again with later requests per tool name (estimate, upper bound)"
      axis="Length: result bytes × later requests of the same session and agent, linear from 0; a segment per repository."
      rows={nameRows(props.body, props.label, 'carried')} />
    <Bars name="carry-tools" title="Result bytes per tool" axis="Length: bytes, linear from 0, a segment per repository; beside it the upper-bound estimate."
      rows={toolRows(props.body, props.label)} />
    <Show when={props.body.summary.not_reported.length}>
      <p class={styles.note}>Result size not reported by: {props.body.summary.not_reported.map(props.label).join(', ')}.</p>
    </Show>
  </>
}

export default function ContextCarry(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<CarryBody> {...props} card="carry" tab="context"
    hero={carryHero}
    finding={body => carryFinding(body, label)}
    visual={body => <CarryBars body={body} label={label} />}
    note={'Upper bound: bytes carried = result bytes × the later requests of the same session and agent. Compaction and ' +
      'truncation of the context are not taken into account, so the real figure is lower. Bytes as the source recorded them, ' +
      'not tokens or cost. Only requests and calls in the period count. The 10 tool names that carry the most are shown.'}
    table={{
      label: 'Context carry by tool name',
      rows: body => [
        ...body.tool_names.map(row => ({ id: `${row.tool}:${row.tool_name}`, tool: label(row.tool), name: row.tool_name,
          calls: row.calls, output_bytes: row.output_bytes, avg_later: row.avg_later_requests ?? undefined, carried_bytes: row.carried_bytes })),
        ...body.tools.map(row => ({ id: `${row.tool}:*`, tool: label(row.tool), name: 'All tool names', calls: row.calls,
          output_bytes: row.output_bytes ?? undefined, carried_bytes: row.carried_bytes ?? undefined,
          reported: row.reported })),
      ],
      fields: [textField('tool', 'Tool'), textField('name', 'Tool name'), numberField('calls', 'Calls', fmtNum),
        numberField('reported', 'Calls with a size', fmtNum), numberField('output_bytes', 'Result bytes', value => bytes(value)),
        numberField('avg_later', 'Later requests (average)', value => count(value)),
        numberField('carried_bytes', 'Bytes carried (upper bound)', value => bytes(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('calls', 'Calls', fmtNum), numberField('output_bytes', 'Result bytes', value => bytes(value)),
      numberField('carried_bytes', 'Bytes carried (upper bound)', value => bytes(value))]} />
}
