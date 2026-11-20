import { createEffect, createMemo, createSignal, For, lazy, Loading, Show, untrack, type Component } from 'solid-js'
import type { BoardAgentRow, DetailAgent, TopicConfigurationLoaded, TopicRuntimeAgent } from '../data/contract.gen'
import { fmtDur, isLive, projectName, stamp } from '../design/format'
import type { DrawerEntry, DrawerProps } from '../shell/drawerTypes'
import { Drawer } from '../ui/Drawer'
import { PanelState } from '../ui/PanelState'
import { agentView, watchedDetail } from './liveAgent'
import { SessionTabs } from './SessionTabs'
import { path, NA, type AgentEntry, type TabProps } from './shared'
import styles from './drawer.module.css'

const OtherDetail = lazy(() => import('./OtherDetail'))
const items = [
  ['flow', 'Flow', lazy(() => import('./tabs/Flow'))],
  ['context', 'Context', lazy(() => import('./tabs/Context'))],
  ['overview', 'Overview', lazy(() => import('./tabs/Overview'))],
  ['instructions', 'Instructions', lazy(() => import('./tabs/Instructions'))],
  ['transcript', 'Transcript', lazy(() => import('./tabs/Transcript'))],
  ['timeline', 'Timeline', lazy(() => import('./tabs/Timeline'))],
  ['turns', 'Turns', lazy(() => import('./tabs/Turns'))],
  ['tools', 'Tool calls', lazy(() => import('./tabs/Tools'))],
  ['errors', 'Failures and loops', lazy(() => import('./tabs/Errors'))],
  ['changes', 'Changes', lazy(() => import('./tabs/Changes'))],
  ['artifacts', 'Artifacts', lazy(() => import('./tabs/Artifacts'))],
  ['commits', 'Commits', lazy(() => import('./tabs/Commits'))],
  ['events', 'Events', lazy(() => import('./tabs/Events'))],
  ['team', 'Team', lazy(() => import('./tabs/Team'))],
  ['procs', 'Processes', lazy(() => import('./tabs/Processes'))],
  ['integrations', 'Integrations', lazy(() => import('./tabs/Integrations'))],
  ['evidence', 'Source steps', lazy(() => import('./tabs/Evidence'))],
  ['otel', 'OTel', lazy(() => import('./tabs/Otel'))],
  ['native', 'Native output', lazy(() => import('./tabs/NativeOutput'))],
  ['kql', 'KQL', lazy(() => import('./tabs/Kql'))],
] as const satisfies readonly (readonly [string, string, Component<TabProps>])[]

const pending = () => <PanelState state="loading" />

function detailCounts(data: DetailAgent): Partial<Record<typeof items[number][0], number>> {
  const loaded = new Set(data.context_files?.loaded?.map(row => row.path).filter(path => typeof path === 'string' && path))
  return {
    instructions: loaded.size || undefined,
    turns: data.turns?.length,
    tools: data.tool_calls?.length,
    errors: data.errors ? data.errors.length + Number(!!data.loop) : undefined,
    changes: data.files?.length,
    artifacts: data.artifacts_total,
    commits: data.commits?.length,
  }
}

export function evidenceSessionId(agent?: BoardAgentRow, runtime?: TopicRuntimeAgent) {
  if (agent?.native_session_id || runtime?.native_session_id) return agent?.native_session_id || runtime?.native_session_id || undefined
  if (agent?.placeholder || !agent || runtime?.native_session_id === null) return undefined
  return agent.session_id || agent.parent_id || agent.native_id || agent.id
}

function AgentDrawer(props: { shell: DrawerProps; entry: AgentEntry }) {
  const ctx = untrack(() => props.shell.ctx)
  const detail = watchedDetail(ctx, 'detail', createMemo(() => props.entry.id),
    createMemo(() => agentView(props.entry.tab) === 'detail'
      ? path(ctx, '/api/board/agent', { id: props.entry.id }) : undefined),
    createMemo(() => agentView(props.entry.tab) === 'detail'))
  const agent = createMemo(() => detail()?.data?.agent ?? ctx.board('agents')?.find(row => row.id === props.entry.id))
  const [counts, rememberCounts] = createSignal<ReturnType<typeof detailCounts>>({})
  // Keep the last known counts for this drawer when the watch switches to Flow or Transcript.
  createEffect(() => detail()?.data, data => { if (data) rememberCounts(detailCounts(data)) })
  const storedId = () => agent()?.native_id ?? props.entry.id
  const runtime = createMemo(() => {
    if (ctx.scope() !== 'local' || agent()?.parent_id) return
    for (const entity of ctx.client.store.topic('runtime.agent')?.values() ?? []) {
      const current = entity.data as TopicRuntimeAgent
      if (current.id === storedId() || current.native_session_id === storedId()) return current
    }
  })
  const session = () => evidenceSessionId(agent(), runtime())
  const loaded = createMemo(() => {
    if (ctx.scope() !== 'local') return
    const id = session() ?? runtime()?.session_id
    if (!id) return
    for (const entity of ctx.client.store.topic('configuration.loaded')?.values() ?? []) {
      const actual = entity.data as TopicConfigurationLoaded
      if (actual.native_session_id === id || actual.session_id === id) return actual
    }
  })
  const status = () => ctx.stopped(props.entry.id) ? 'stopped' : runtime()?.status ?? agent()?.status
  const started = () => runtime()?.started_at ?? agent()?.started_at
  const ended = () => runtime()?.running ? undefined : agent()?.ended_at
  const name = () => agent()?.parent_id ? `${agent()?.role || agent()?.title} (subagent)` : agent()?.title || runtime()?.title || props.entry.id
  const options = items.map(([id, label, Tab]) => ({
    id, label, groupStart: id === 'changes' || id === 'events',
    count: () => (id === 'tools' ? agent()?.tool_calls : undefined) ?? counts()[id],
    content: () => <Loading fallback={pending()}>
      <div class={styles.body}><Tab shell={props.shell} entry={props.entry} detail={detail} agent={agent} runtime={runtime} session={session} /></div>
    </Loading>,
  }))
  return <Drawer id="drawer" open title={name()} onClose={props.shell.close} onEscape={props.shell.back} resizable
    actions={<>
      <Show when={props.shell.stack.length > 1}><button type="button" class={styles.button} onClick={props.shell.back}>Back</button></Show>
      <button type="button" class={styles.button} aria-label={`Copy session ID ${props.entry.id}`}
        onClick={() => ctx.copy(session() ?? props.entry.id)}>Copy ID</button>
      <Show when={ctx.scope() === 'local' && !agent()?.parent_id && (isLive(status()) || runtime()?.running) && status() !== 'stopped'}>
        <button type="button" class={styles.button}
          onClick={() => ctx.stopAgent({ id: props.entry.id, title: name(), pids: runtime()?.pids ?? agent()?.pids })}>Stop</button>
      </Show>
    </>}
    metadata={<div class={styles.meta}>
      <span>{runtime()?.running && status() === 'unknown' ? 'Running · native activity unknown' : status() ?? NA}</span>
      <Show when={started()}><span title={`Started ${stamp(started(), true)}`}>{fmtDur((ended() ?? Date.now() / 1000) - started()!)}</span></Show>
      <Show when={ended()}><span>Ended {stamp(ended(), true)}</span></Show>
      <Show when={agent()?.tool || runtime()?.tool}>{tool => <span>{ctx.board('tool_labels')?.[tool()] ?? tool()}</span>}</Show>
      <Show when={agent()?.project || runtime()?.project}>{project => <span title={project()}>{projectName(project())}</span>}</Show>
      <Show when={agent()?.models?.length}><span>{agent()?.models.join(', ')}</span></Show>
      <Show when={agent()?.node_id}><span>Node: {agent()?.node_id}</span></Show>
    </div>}>
    <Show when={loaded()}>{evidence =>
      <details class={styles.section}>
        <summary>Effective runtime settings · {evidence().evidence.length} observations</summary>
        <Show when={evidence().effective_known} fallback={<p>{NA}</p>}>
          <dl><For each={evidence().evidence}>{item => <>
            <dt>{item.key} · {item.source}</dt>
            <dd>{JSON.stringify(item.value)} · {stamp(item.observed_at, true)}</dd>
          </>}</For></dl>
        </Show>
        <Show when={evidence().unknown.length}><p>Not observed: {evidence().unknown.join(', ')}</p></Show>
      </details>}
    </Show>
    <SessionTabs items={options} value={options.some(item => item.id === props.entry.tab) ? props.entry.tab : 'flow'}
      onChange={props.shell.changeTab} />
  </Drawer>
}

const identity = (entry: DrawerEntry | undefined, scope: string, node: string | null) => entry == null ? undefined
  : entry.type === 'agent' ? JSON.stringify([scope, node, entry.type, entry.id])
    : JSON.stringify([scope, node, entry.type, entry.path, entry.name, entry.key, entry.ts, entry.session_id, entry.record, entry.line])

export default function DrawerView(shell: DrawerProps) {
  const current = () => shell.stack.at(-1)
  return <Show keyed when={identity(current(), shell.ctx.scope(), shell.ctx.nodeId())}>
    {(key: string) => <Show when={key && current()?.type === 'agent'} fallback={<Loading fallback={pending()}>
      <OtherDetail shell={shell} entry={current() as Exclude<DrawerEntry, AgentEntry>} />
    </Loading>}>
      <AgentDrawer shell={shell} entry={current() as AgentEntry} />
    </Show>}
  </Show>
}
