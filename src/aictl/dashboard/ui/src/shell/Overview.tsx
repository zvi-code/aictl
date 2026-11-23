import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { TopicRuntimeAgent } from '../data/contract.gen'
import { RANGES } from '../data/filters'
import DockScreen from '../panels/DockScreen'
import { overviewA } from '../panels/overview/a'
import { overviewB } from '../panels/overview/b'
import { unlinkedText } from '../panels/overview/agentTree'
import { monitoredReport } from '../panels/overview/monitoredReport'
import { runtimeSummary } from '../data/runtimeAgents'
import type { PanelContext } from '../panels/types'
import { Meter } from '../ui/Meter'
import { scopeLabel } from './NodePicker'
import styles from './Shell.module.css'

const definitions = [...overviewA, ...overviewB]

function HistoryStart(props: { ctx: PanelContext; browse: () => void }) {
  const ctx = untrack(() => props.ctx)
  const history = createMemo(() => ctx.read({ field: 'kpis' }))
  const runtime = createMemo(() => ctx.read({ topic: 'runtime.agent' }))
  const reported = monitoredReport(ctx)
  const counts = createMemo(() => {
    const read = runtime(), agents = read.value as TopicRuntimeAgent[] | undefined
    if (!Array.isArray(agents)) return
    const summary = runtimeSummary(agents.map((data, i) => ({ id: read.rowKeys?.[i] ?? String(i), data })))
    return { ...summary, total: summary.sessions }
  })
  const toolLabel = (tool: string) => ctx.board('tool_labels')?.[tool] ?? (tool || 'Unreported tool')
  const period = () => ctx.filters().sel ? 'selected interval' :
    RANGES.find(r => r.id === ctx.filters().range.id)?.label ?? 'custom range'
  return <section class={styles.start} aria-labelledby="history-start-title">
    <h1 id="history-start-title">Overview</h1>
    <div class={styles.startBody}>
      <Show when={counts()}>{data => <section class={styles.runtime} aria-label="Monitored sessions by tool">
        <h2>{ctx.paused() || runtime().state === 'stale' || !ctx.client.status.connected ? 'Last received runtime' : 'Live runtime'} · This node</h2>
        <p><strong>{data().total.toLocaleString()}</strong> monitored {data().total === 1 ? 'session' : 'sessions'}</p>
        <For each={data().tools}>{([tool, n]) => <Meter label={toolLabel(tool)}
          value={n} max={data().total} display={`${n} of ${data().total}`} />}</For>
        <Show when={data().unlinked}>
          <p title="Processes of AI tools that aictl cannot link to a session by evidence. The Agents panel lists them below its table.">
            {unlinkedText(data().unlinked)}: {data().unlinkedTools.map(([tool, n]) => `${toolLabel(tool)} ${n}`).join(' · ')}
          </p>
        </Show>
        <small>Runtime counts are independent of history filters.</small>
      </section>}</Show>
      <Show when={reported()}>{sample => <section class={styles.runtime} aria-label="Reported monitored sessions">
        <h2>Reported runtime · {scopeLabel(ctx.scope(), ctx.nodeId())}</h2>
        <p><strong>{sample().count.toLocaleString()}</strong> monitored {sample().count === 1 ? 'session' : 'sessions'}</p>
        <small>{sample().hosts} reporting {sample().hosts === 1 ? 'node' : 'nodes'} · independent of history filters.</small>
      </section>}</Show>
      <section class={styles.historyStatus} aria-label="Selected history">
        <h2>{scopeLabel(ctx.scope(), ctx.nodeId())} · {period()} history</h2>
        <p role="status">{history().state === 'error' ? 'History could not be loaded.' :
          history().state === 'loading' ? 'Waiting for the first history result.' : 'No history result is available from this source.'}</p>
        <p>Usage, cost and failure trends appear when the selected history is available.</p>
        <Show when={history().message}>{reason => <details><summary>Read error</summary><p>{reason()}</p></details>}</Show>
        <div class={styles.controls}>
          <button type="button" class={styles.button} onClick={ctx.refresh}>Retry history</button>
          <button type="button" data-browse-panels class={styles.button} onClick={() => props.browse()}>Browse all panels</button>
        </div>
      </section>
    </div>
  </section>
}

export default function Overview(props: { ctx: PanelContext; order: (order: string[]) => void; anchor: string }) {
  const [browse, setBrowse] = createSignal(false)
  const hasHistory = createMemo(() => (['kpis', 'series', 'agents', 'attention', 'by_model', 'range'] as const)
    .some(field => props.ctx.board(field) != null))
  const entered = () => hasHistory() || (props.anchor !== '' && props.anchor !== '#sec-top')
  // An empty frame during a filter change must not unmount the layout a user is investigating.
  createEffect(entered, value => { if (value) setBrowse(true) })
  const showDock = () => browse() || entered()
  return <div data-screen="board" class={styles.overview}>
    <Show when={showDock()} fallback={<HistoryStart ctx={props.ctx} browse={() => setBrowse(true)} />}>
      <DockScreen screen="board" definitions={definitions} heading={<h1>Overview</h1>} ctx={props.ctx} order={props.order} />
    </Show>
  </div>
}
