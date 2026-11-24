import { For, Show, untrack } from 'solid-js'
import { fmtDur, fmtNum, projectName } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  pauseHero, BUCKET_LABELS, CAUSE_LABELS, money, PAUSE_CAUSES, pauseCauseBars, pauseFinding, pauseProjects, plural, scaled, share,
  toolLabel, type Label, type PauseBody,
} from './insightsModel'
import styles from './Insights.module.css'

const W = 300, H = 172, TOP = 34, BOTTOM = 36, SIDE = 6
const SLOT = (W - 2 * SIDE) / 4, BAR = SLOT * 0.56

/** Average cost per request for each pause bucket of one tool, with the 5-minute cache limit marked. */
function ToolChart(props: { tool: PauseBody['tools'][number]; index: number; label: Label }) {
  const largest = () => Math.max(0, ...props.tool.buckets.map(cell => cell.avg_cost_usd ?? 0))
  const plot = H - TOP - BOTTOM
  const fill = () => props.tool.cache_reported ? styles[`s${props.index % 4}`] : styles.unreported
  return <figure class={styles.flow}>
    <h3>{props.label(props.tool.tool)}<Show when={!props.tool.cache_reported}> · cache not reported</Show></h3>
    <svg class={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${props.label(props.tool.tool)}: average cost per request by pause before it` +
        (props.tool.cache_reported ? '' : '; this source reports no cache writes')}>
      <line class={styles.axis} x1={SIDE} x2={W - SIDE} y1={H - BOTTOM} y2={H - BOTTOM} />
      <For each={props.tool.buckets}>{(cell, i) => {
        const height = () => scaled(cell.avg_cost_usd, largest()) * plot
        const x = () => SIDE + i() * SLOT + (SLOT - BAR) / 2
        return <g>
          <rect class={fill()} x={x()} width={BAR} y={H - BOTTOM - height()} height={height()}>
            <title>{`${BUCKET_LABELS[cell.bucket]}: ${fmtNum(cell.requests)} requests, ${money(cell.avg_cost_usd)} per request, ` +
              `${money(cell.cost_usd)} in all, cache hits ${share(cell.cache_hit_share)} of input`}</title>
          </rect>
          <text x={x() + BAR / 2} y={H - BOTTOM - height() - 4} text-anchor="middle">{money(cell.avg_cost_usd)}</text>
          <text x={x() + BAR / 2} y={H - BOTTOM + 14} text-anchor="middle">{BUCKET_LABELS[cell.bucket]}</text>
          <text class={styles.muted} x={x() + BAR / 2} y={H - BOTTOM + 28} text-anchor="middle">{fmtNum(cell.requests)} req</text>
        </g>
      }}</For>
      <line class={styles.limit} x1={SIDE + 2 * SLOT} x2={SIDE + 2 * SLOT} y1={8} y2={H - BOTTOM} />
      <text class={styles.limitText} x={SIDE + 2 * SLOT + 4} y={12}>5 min: cache lapses</text>
    </svg>
  </figure>
}

/** The extra cost of long pauses per project: the five that cost the most, the rest summed. */
function ProjectBars(props: { body: PauseBody }) {
  const split = () => pauseProjects(props.body)
  const largest = () => Math.max(split().rest, ...split().top.map(row => row.extra))
  const width = (value: number) => largest() > 0 ? `${(value / largest() * 100).toFixed(2)}%` : '0%'
  return <Show when={split().top.length}>
    <ol class={styles.bars} aria-label="Extra cost of pauses over 5 minutes per project" data-pause-projects>
      <For each={split().top}>{row => <li class={styles.barRow}>
        <span class={styles.barName} title={row.project}>{projectName(row.project)}<small>{plural(row.sessions, 'session')} · {plural(row.requests, 'request')}</small></span>
        <span class={styles.barTrack}>
          <span class={styles.split} role="img" aria-label={`${projectName(row.project)}: ${money(row.extra)} more after long pauses`}>
            <span class={styles.s0} style={{ 'inline-size': width(row.extra) }} />
          </span>
          <span class={styles.splitText}>{money(row.extra)} more than without the pause</span>
        </span>
      </li>}</For>
      <Show when={split().rest}>
        <li class={styles.barRow} data-rest>
          <span class={styles.barName}>Other projects<small>summed</small></span>
          <span class={styles.barTrack}>
            <span class={styles.split} role="img" aria-label={`Other projects: ${money(split().rest)} more after long pauses`}>
              <span class={styles.unreported} style={{ 'inline-size': width(split().rest) }} />
            </span>
            <span class={styles.splitText}>{money(split().rest)} more than without the pause</span>
          </span>
        </li>
      </Show>
    </ol>
  </Show>
}

/** The long-pause cost of each tool by cause: what the session recorded while the cache lapsed. */
function CauseBars(props: { body: PauseBody; label: Label }) {
  const bars = () => pauseCauseBars(props.body)
  const shown = () => PAUSE_CAUSES.filter(cause => bars().some(bar => bar.causes.some(row => row.cause === cause)))
  const width = (cost: number | null, total: number) => `${(total > 0 ? (cost ?? 0) / total * 100 : 0).toFixed(2)}%`
  return <Show when={bars().length}>
    <ul class={styles.legend} aria-label="Causes of pauses over 5 minutes">
      <For each={shown()}>{cause => <li><span class={`${styles.swatch} ${styles[`c${PAUSE_CAUSES.indexOf(cause)}`]}`} />{CAUSE_LABELS[cause]}</li>}</For>
    </ul>
    <ol class={styles.bars} aria-label="Cost of pauses over 5 minutes by cause, per tool" data-pause-causes>
      <For each={bars()}>{bar => <li class={styles.barRow} data-tool={bar.tool}>
        <span class={styles.barName}>{props.label(bar.tool)}<small>{plural(bar.requests, 'request')} after a pause over 5 min</small></span>
        <span class={styles.barTrack}>
          <span class={styles.split} role="img" aria-label={`${props.label(bar.tool)}, cost after pauses over 5 minutes by cause: ` +
            bar.causes.map(row => `${CAUSE_LABELS[row.cause]} ${money(row.cost_usd)} (${share(row.share)})`).join(', ')}>
            <For each={bar.causes}>{row => <span class={styles[`c${PAUSE_CAUSES.indexOf(row.cause)}`]}
              style={{ 'inline-size': width(row.cost_usd, bar.total) }}
              title={`${CAUSE_LABELS[row.cause]}: ${plural(row.requests, 'request')}, ${money(row.cost_usd)}, ${share(row.share)}`} />}</For>
          </span>
          <span class={styles.splitText}>{money(bar.total)} in all</span>
        </span>
      </li>}</For>
    </ol>
  </Show>
}

/** The calls that ran through a pause: the one that ran longest in each pause where a call was still running. */
function CauseTools(props: { body: PauseBody; label: Label }) {
  return <Show when={props.body.cause_tools?.length}>
    <section>
      <h3>Calls still running through a pause</h3>
      <ol class={styles.rankList} aria-label="Calls that ran longest through pauses over 5 minutes" data-pause-tools>
        <For each={props.body.cause_tools}>{row => <li>
          <span>{row.tool_name ?? 'unnamed call'}{row.program ? ` (${row.program})` : ''} · {props.label(row.tool)}</span>
          <span>{plural(row.requests, 'pause')}, {money(row.cost_usd)} after them; the call ran {fmtDur(row.p50_call_s)} at the
            median, {fmtDur(row.max_call_s)} at most</span>
        </li>}</For>
      </ol>
    </section>
  </Show>
}

type Row = Record<string, unknown>

export default function PauseTax(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<PauseBody> {...props} card="pause" title="Pause tax" tab="flow"
    hero={pauseHero}
    finding={body => pauseFinding(body, label)}
    visual={body => <>
      <ProjectBars body={body} />
      <CauseBars body={body} label={label} />
      <CauseTools body={body} label={label} />
      <div class={styles.flows}>
        <For each={body.tools}>{(tool, i) => <ToolChart tool={tool} index={i()} label={label} />}</For>
      </div>
    </>}
    note={'Pause: from the end of the previous request of the same session and agent to the start of this one. ' +
      'Only requests in the period count, so a session that started before it loses its first pause. Average cost per ' +
      'priced request; cost is list price, not a bill. "Cache not reported": the source writes no cache tokens, so its ' +
      'costs cannot show a lapsed cache and it is left out of the finding. Per project: the cost of its requests after a ' +
      'pause of over 5 minutes less the same number at its tool\'s under-1-minute average; the five projects that cost the ' +
      'most extra are drawn, every other project and the requests with no project are summed. Cause of a pause over 5 ' +
      'minutes, the first that holds: the agent\'s own calls ran for at least half the pause (a call still running; a call ' +
      'that starts a subagent is not counted); another agent of the session made a request in it, or a call that starts a ' +
      'subagent ran for half of it (another agent working); a call waited for a person to approve it or answer; a prompt ' +
      'arrived; the agent made only short or untimed calls; nothing was recorded. A call is placed by its start time.'}
    table={{
      label: 'Pause tax by tool and pause',
      rows: body => body.tools.flatMap(tool => tool.buckets.map((cell): Row => ({
        id: `${tool.tool}:${cell.bucket}`, tool: label(tool.tool), pause: BUCKET_LABELS[cell.bucket], requests: cell.requests,
        cache_hit_share: cell.cache_hit_share ?? undefined, avg_cost_usd: cell.avg_cost_usd ?? undefined,
        cost_usd: cell.cost_usd ?? undefined, cache: tool.cache_reported ? 'reported' : 'not reported',
      }))),
      fields: [textField('tool', 'Tool'), textField('pause', 'Pause'), numberField('requests', 'Requests', fmtNum),
        numberField('cache_hit_share', 'Cache hits (share of input)', value => share(value)),
        numberField('avg_cost_usd', 'Average cost (list price)', value => money(value)),
        numberField('cost_usd', 'Cost (list price)', value => money(value)), textField('cache', 'Cache writes')],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('requests', 'Requests after a pause over 5 min', fmtNum),
      numberField('cost_usd', 'Their cost (list price)', value => money(value))]} />
}
