import { createMemo, lazy, Loading, Show, untrack, type Component } from 'solid-js'
import type { CardProps } from '../panels/insights/InsightCard'
import { insightWindow, type CardId } from '../panels/insights/insightsModel'
import { insightView } from '../panels/insights/views'
import type { PanelContext } from '../panels/types'
import { PanelState } from '../ui/PanelState'
import styles from '../panels/insights/Insights.module.css'

const views: Record<CardId, Component<CardProps>> = {
  autonomy: lazy(() => import('../panels/insights/WorkPerInstruction')),
  verified: lazy(() => import('../panels/insights/VerifiedCommits')),
  models: lazy(() => import('../panels/insights/ModelReport')),
  pause: lazy(() => import('../panels/insights/PauseTax')),
  carry: lazy(() => import('../panels/insights/ContextCarry')),
  subagents: lazy(() => import('../panels/insights/Subagents')),
  failures: lazy(() => import('../panels/insights/AfterFailure')),
  rereads: lazy(() => import('../panels/insights/Rereads')),
  time: lazy(() => import('../panels/insights/TimeSplit')),
  context: lazy(() => import('../panels/insights/ContextWeight')),
  orientation: lazy(() => import('../panels/insights/Orientation')),
  fixed: lazy(() => import('../panels/insights/FixedContext')),
  problems: lazy(() => import('../panels/insights/ProblemSessions')),
  repos: lazy(() => import('../panels/insights/Repositories')),
  durations: lazy(() => import('../panels/insights/Durations')),
  changes: lazy(() => import('../panels/insights/Changes')),
  flows: lazy(() => import('../panels/insights/Flows')),
  skills: lazy(() => import('../panels/insights/Skills')),
  mcp: lazy(() => import('../panels/insights/Mcp')),
  kql: lazy(() => import('../panels/insights/Kql')),
}

/** One analysis at a time, each a view of its own computed in the store for the chosen period. The list of the
    analyses is in the shell, at the left; the address names the one shown (`view=`). */
export default function Insights(props: { ctx: PanelContext; search: string }) {
  const ctx = untrack(() => props.ctx)
  const period = createMemo(() => insightWindow(props.search, ctx.startedAt))
  const shown = createMemo(() => insightView(new URLSearchParams(props.search).get('view')).id)
  return <div data-screen="insights" class={styles.screen}>
    <Show when={shown()} keyed>{id => {
      const View = views[id]
      return <Loading fallback={<PanelState state="loading" />}>
        <View ctx={ctx} since={period().since} until={period().until} />
      </Loading>
    }}</Show>
  </div>
}
