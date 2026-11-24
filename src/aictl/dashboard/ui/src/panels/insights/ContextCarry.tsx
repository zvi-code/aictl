import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { toneClass } from './charts/Columns'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { PairedBars, type Lane } from './charts/PairedBars'
import charts from './charts/Charts.module.css'
import { carryLine, carryNameRows, carrySplit, carryToolRows } from './costModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, carryHero, count, type CarryBody, toolLabel, type Label } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'

const LANES: [Lane, Lane] = [{ title: 'Result bytes' }, { title: 'Sent again, estimate (upper bound)', estimate: true }]
const LEGEND = [{ label: 'Result bytes, recorded', tone: 2 }, { label: 'Sent again, estimate (upper bound)', tone: 0 }]

function CarryBars(props: { body: CarryBody; label: Label; by: ColourMode; setBy: (by: ColourMode) => void }) {
  const split = () => carrySplit(props.body)
  const by = (): ColourMode => split() ? props.by : 'parts'
  const axis = (what: string) => `${what}; each lane on its own scale from 0${by() === 'repo' ? '; a segment per repository' : ''}.`
  return <>
    <ColourBy parts="Measure" value={by()} onChange={props.setBy} split={split()} />
    <Show when={by() === 'repo'} fallback={<ul class={charts.legend} aria-label="Measures: colours of the bars" data-parts-legend>
      <For each={LEGEND}>{item => <li><span class={`${charts.swatch} ${toneClass(item.tone)}`} />{item.label}</li>}</For>
    </ul>}>
      <RepoLegend split={props.body} other={hasOther([...props.body.tool_names, ...props.body.tools])} />
    </Show>
    <PairedBars name="carry-names" title="Per tool name, the 10 with the largest estimate" lanes={LANES} scale="each"
      axis={axis('Bytes as recorded; estimate = result bytes × later requests of the same session and agent')}
      rows={carryNameRows(props.body, by(), props.label)} />
    <PairedBars name="carry-tools" title="Per tool" lanes={LANES} scale="each" axis={axis('Bytes as recorded')}
      rows={carryToolRows(props.body, by(), props.label)} />
    <Show when={props.body.summary.not_reported.length}>
      <p class={charts.note} data-not-reported>Result size not reported by: {props.body.summary.not_reported.map(props.label).join(', ')}.</p>
    </Show>
  </>
}

export default function ContextCarry(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [by, setBy] = useColourBy()
  return <InsightCard<CarryBody> {...props} card="carry" tab="context"
    hero={carryHero}
    finding={carryLine}
    visual={body => <CarryBars body={body} label={label} by={by()} setBy={setBy} />}
    note={'Upper bound: bytes carried = result bytes × the later requests of the same session and agent. Compaction and ' +
      'truncation of the context are not taken into account, so the real figure is lower. The estimate lane is hatched and ' +
      'its values are marked as estimates. Bytes as the source recorded them, not tokens or cost. Only requests and calls in ' +
      'the period count. The 10 tool names that carry the most are shown. Each lane has its own scale: the estimate is ' +
      'usually many times the result bytes. Colour by Repository: each bar split into one segment per repository.'}
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
