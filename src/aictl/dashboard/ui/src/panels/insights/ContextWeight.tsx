import { For, Show, untrack } from 'solid-js'
import { fmtN, fmtNum } from '../../design/format'
import { Bars } from './Bars'
import { Columns, toneClass } from './charts/Columns'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { MarkStrip } from './charts/MarkStrip'
import charts from './charts/Charts.module.css'
import {
  CONTEXT_LEGEND, CONTEXT_REFS, contextColumns, contextLine, contextSmallRows, contextSplit, contextStripRows, SMALL_TITLE,
} from './costModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { contextHero, CONTEXT_LABELS, money, SMALL_STEP_OUTPUT, share, tokens, toolLabel, type ContextBody, type Label } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'

const NONE = 'Token counts not reported by this source.'

function Visual(props: { body: ContextBody; label: Label; by: ColourMode; setBy: (by: ColourMode) => void }) {
  const split = () => contextSplit(props.body)
  const by = (): ColourMode => split() ? props.by : 'parts'
  const repo = () => by() === 'repo'
  const perRepo = () => repo() ? '; a segment per repository' : ''
  return <>
    <ColourBy parts="Context size" value={by()} onChange={props.setBy} split={split()} />
    <Show when={repo()} fallback={<ul class={charts.legend} aria-label="Context size: colours of the columns" data-parts-legend>
      <For each={CONTEXT_LEGEND}>{item => <li><span class={`${charts.swatch} ${toneClass(item.tone)}`} />{item.label}</li>}</For>
    </ul>}>
      <RepoLegend split={props.body} other={hasOther([...props.body.tools, ...props.body.tools.flatMap(tool => tool.buckets),
        ...props.body.tools.map(tool => ({ repos: tool.small_repos }))])} />
    </Show>
    <For each={props.body.tools}>{tool => <section class={charts.group} data-tool={tool.tool} aria-label={props.label(tool.tool)}>
      <h2 class={charts.groupTitle}>{props.label(tool.tool)}</h2>
      <Show when={tool.reported} fallback={<p class={charts.note} data-no-tokens>{NONE}</p>}>
        <div class={charts.grid}>
          <Columns name={`context-requests-${tool.tool}`} title="Requests by context size"
            axis={`Requests, one scale from 0; under each column its share of the tool's ${fmtNum(tool.reported)}${perRepo()}.`}
            columns={contextColumns(props.body, tool, 'requests', by(), props.label)} />
          <Columns name={`context-cost-${tool.tool}`} title="Cost by context size"
            axis={`Cost at list price, one scale from $0; under each column its share of the tool's ${money(tool.cost_usd)}${perRepo()}.`}
            columns={contextColumns(props.body, tool, 'cost', by(), props.label)} />
        </div>
      </Show>
    </section>}</For>
    <div class={charts.gridWide}>
      <MarkStrip name="context-percentiles" title="Context per request: median and 90th percentile"
        axis={`Tokens, one axis from 0 for every tool; dashed lines at the bucket boundaries${repo() ? '; not split by repository' : ''}.`}
        legend={[{ label: 'Median', shape: 'dot' }, { label: '90th percentile', shape: 'tick' }]} refs={CONTEXT_REFS}
        format={value => fmtN(value)} rows={contextStripRows(props.body, by(), props.label)} />
      <Bars name="context-small" title={SMALL_TITLE}
        axis={`Requests, one scale from 0${perRepo()}; beside it their cost at list price.`}
        rows={contextSmallRows(props.body, by(), props.label)} />
    </div>
  </>
}

type Row = Record<string, unknown>

export default function ContextWeight(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [by, setBy] = useColourBy()
  return <InsightCard<ContextBody> {...props} card="context" tab="context"
    hero={contextHero}
    finding={contextLine}
    visual={body => <Visual body={body} label={label} by={by()} setBy={setBy} />}
    note={'Context of a request: input + cache read + cache write tokens, everything the model read for it. A bucket ' +
      'includes its lower bound: 200k tokens is in 200k–500k. Columns of 200k tokens or more have their own colour. A request ' +
      'with no token counts (or all zero) is not reported, not a request of 0 tokens. Cost is list price, not a bill; a cache ' +
      'read costs less than input, so cost does not grow in step with context. The median and 90th percentile are over the ' +
      `requests with token counts; the dashed lines are the bucket boundaries. Small steps: under ${SMALL_STEP_OUTPUT} output ` +
      'tokens and no thinking time recorded; a source that does not report thinking records none. Only requests in the period ' +
      'count. Colour by Repository: requests, cost and small steps split into one segment per repository; a percentile is not split.'}
    table={{
      label: 'Context weight by tool and bucket',
      rows: body => body.tools.flatMap(tool => tool.buckets.map((cell): Row => ({
        id: `${tool.tool}:${cell.bucket}`, tool: label(tool.tool), bucket: CONTEXT_LABELS[cell.bucket], requests: cell.requests,
        request_share: cell.request_share ?? undefined, cost_usd: cell.cost_usd ?? undefined, cost_share: cell.cost_share ?? undefined,
        p50: tool.p50_context ?? undefined, p90: tool.p90_context ?? undefined,
      }))),
      fields: [textField('tool', 'Tool'), textField('bucket', 'Context'), numberField('requests', 'Requests', fmtNum),
        numberField('request_share', 'Share of requests', value => share(value)),
        numberField('cost_usd', 'Cost (list price)', value => money(value)), numberField('cost_share', 'Share of cost', value => share(value)),
        numberField('p50', 'Tool median context', value => tokens(value)), numberField('p90', 'Tool 90th percentile', value => tokens(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('requests', 'Requests of 200k tokens or more', fmtNum),
      numberField('cost_usd', 'Their cost (list price)', value => money(value))]} />
}
