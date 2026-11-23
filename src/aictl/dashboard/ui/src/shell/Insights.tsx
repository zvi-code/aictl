import { createMemo, For, lazy, Loading, untrack } from 'solid-js'
import { stamp } from '../design/format'
import { insightWindow, INSIGHT_RANGES } from '../panels/insights/insightsModel'
import type { PanelContext } from '../panels/types'
import { createBoxes, HiddenBoxes } from '../ui/Box'
import { PanelState } from '../ui/PanelState'
import styles from '../panels/insights/Insights.module.css'

const cards = [
  lazy(() => import('../panels/insights/WorkPerInstruction')),
  lazy(() => import('../panels/insights/VerifiedCommits')),
  lazy(() => import('../panels/insights/PauseTax')),
  lazy(() => import('../panels/insights/ContextCarry')),
  lazy(() => import('../panels/insights/Subagents')),
  lazy(() => import('../panels/insights/AfterFailure')),
  lazy(() => import('../panels/insights/Rereads')),
  lazy(() => import('../panels/insights/TimeSplit')),
  lazy(() => import('../panels/insights/ContextWeight')),
  lazy(() => import('../panels/insights/Orientation')),
  lazy(() => import('../panels/insights/FixedContext')),
  lazy(() => import('../panels/insights/ProblemSessions')),
]

/** What months of agent history show: one finding per card, each computed in the store for the chosen period. */
export default function Insights(props: { ctx: PanelContext; search: string }) {
  const ctx = untrack(() => props.ctx)
  const boxes = createBoxes('aictl-insights-boxes')
  const period = createMemo(() => insightWindow(props.search, ctx.startedAt))
  const describe = () => period().id === 'all' ? `All stored history up to ${stamp(period().until, true)}`
    : `${stamp(period().since, true)} to ${stamp(period().until, true)}`
  return <div data-screen="insights" class={styles.screen}>
    <header class={styles.heading}>
      <h1>Insights</h1>
      <label class={styles.range}>Period
        <select value={period().id} onChange={event => ctx.navigate({ range: event.currentTarget.value, since: null, until: null, sel: null })}>
          <For each={INSIGHT_RANGES}>{range => <option value={range.id}>{range.label}</option>}</For>
          {period().id === 'custom' ? <option value="custom">Custom range</option> : null}
        </select>
      </label>
      <p>{describe()}. Each card says the period its figures cover. Cost is list price, not a bill.</p>
      <HiddenBoxes boxes={boxes} />
    </header>
    <div class={styles.cards}>
      <For each={cards}>{Card => <Loading fallback={<PanelState state="loading" />}>
        <Card ctx={ctx} boxes={boxes} since={period().since} until={period().until} />
      </Loading>}</For>
    </div>
  </div>
}
