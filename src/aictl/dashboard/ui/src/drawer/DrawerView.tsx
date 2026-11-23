import { createEffect, createMemo, createSignal, For, lazy, Loading, Show, untrack, type Component } from 'solid-js'
import type { BoardAgentRow, DetailAgent, TopicConfigurationLoaded, TopicRuntimeAgent } from '../data/contract.gen'
import { isLive, projectName, stamp } from '../design/format'
import { statusText } from '../data/runtimeAgents'
import type { DrawerEntry, DrawerProps } from '../shell/drawerTypes'
import { Drawer } from '../ui/Drawer'
import { Icon, type Glyph } from '../ui/Icon'
import { Tooltip } from '../ui/Tooltip'
import { PanelState } from '../ui/PanelState'
import { agentView, watchedDetail } from './liveAgent'
import { SessionTabs } from './SessionTabs'
import { sessionSpan, spanLabel } from './sessionSpan'
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
  ['convergence', 'Convergence', lazy(() => import('./tabs/Convergence'))],
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

const glyphs: Record<typeof items[number][0], Glyph> = {
  flow: 'flow', context: 'context', overview: 'detail', instructions: 'book', transcript: 'prompts', timeline: 'clock',
  turns: 'table', tools: 'tools', errors: 'warn', convergence: 'refresh', changes: 'changes', artifacts: 'file', commits: 'commit',
  events: 'events', team: 'agents', procs: 'resources', integrations: 'sources', evidence: 'check', otel: 'effect',
  native: 'terminal', kql: 'command',
}

const pending = () => <PanelState state="loading" />

function detailCounts(data: DetailAgent): Partial<Record<typeof items[number][0], number>> {
  const loaded = new Set(data.context_files?.loaded?.map(row => row.path).filter(path => typeof path === 'string' && path))
  // A memory file the session edited is in both lists: it counts once.
  const changed = data.files || data.memory_changes
    ? new Set([...(data.files ?? []).map(row => row.path), ...(data.memory_changes ?? []).map(row => row.path)]).size : undefined
  return {
    context: data.checkpoints?.length,
    instructions: loaded.size || undefined,
    turns: data.turns?.length,
    tools: data.tool_calls?.length,
    errors: data.errors ? data.errors.length + Number(!!data.loop) : undefined,
    changes: changed,
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
  const endpoint = createMemo(() => path(ctx, '/api/board/agent', { id: props.entry.id }))
  const detail = watchedDetail(ctx, 'detail', createMemo(() => props.entry.id),
    createMemo(() => agentView(props.entry.tab) === 'detail' ? endpoint() : undefined),
    createMemo(() => agentView(props.entry.tab) === 'detail'))
  // Flow, Transcript, Timeline and KQL read their own routes. The header and the tab counts come from the
  // agent detail, so it is read for them too, once, when the tab does not already watch it.
  const header = ctx.detail<DetailAgent>(createMemo(() => agentView(props.entry.tab) === 'detail' ? undefined : endpoint()))
  const known = () => detail()?.data ?? header()?.data
  const agent = createMemo(() => known()?.agent ?? ctx.board('agents')?.find(row => row.id === props.entry.id))
  const [counts, rememberCounts] = createSignal<ReturnType<typeof detailCounts>>({})
  // Keep the last known counts for this drawer when the watch switches to Flow or Transcript.
  createEffect(known, data => { if (data) rememberCounts(detailCounts(data)) })
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
  const evidence = () => ctx.stopped(props.entry.id) ? undefined : runtime()?.status_evidence ?? agent()?.status_evidence
  // The span is the session's own first and last recorded activity: the runtime process starts again at every resume.
  const span = createMemo(() => sessionSpan(agent()))
  const name = () => agent()?.parent_id ? `${agent()?.role || agent()?.title} (subagent)` : agent()?.title || runtime()?.title || props.entry.id
  const options = items.map(([id, label, Tab]) => ({
    id, label, glyph: glyphs[id], groupStart: id === 'changes' || id === 'events',
    count: () => (id === 'tools' ? agent()?.tool_calls : undefined) ?? counts()[id],
    content: () => <Loading fallback={pending()}>
      <div class={styles.body}><Tab shell={props.shell} entry={props.entry} detail={detail} agent={agent} runtime={runtime} session={session} /></div>
    </Loading>,
  }))
  return <Drawer id="drawer" open title={name()} onClose={props.shell.close} onEscape={props.shell.back} resizable
    actions={<>
      <Show when={props.shell.stack.length > 1}><button type="button" class={styles.button} onClick={props.shell.back}>
        <Icon glyph="back" />Back</button></Show>
      <Show when={ctx.scope() === 'local' && !agent()?.parent_id && (isLive(status()) || runtime()?.running) && status() !== 'stopped'}>
        <button type="button" class={styles.danger}
          onClick={() => ctx.stopAgent({ id: props.entry.id, title: name(), pids: runtime()?.pids ?? agent()?.pids })}>
          <Icon glyph="stop" />Stop</button>
      </Show>
      <Tooltip class={styles.iconButton} label={`Copy session ID ${props.entry.id}`} text="Copy session ID"
        onClick={() => ctx.copy(session() ?? props.entry.id)}><Icon glyph="copy" /></Tooltip>
    </>}
    metadata={<div class={styles.meta}>
      <span class={styles.statusWord} data-status={status()} title={evidence() ?? undefined}>{runtime()?.running && status() === 'unknown' ? 'Running · native activity unknown'
        : statusText(status(), runtime() ? undefined : agent()?.end_reason) ?? NA}</span>
      <Show when={evidence()}>{words => <span class={styles.statusEvidence} title="Why the status is what it is">{words()}</span>}</Show>
      <span title="From the first to the last activity the session recorded">
        {span().start != null ? stamp(span().start, true) : 'start not recorded'} → {span().end != null ? stamp(span().end, true) : 'end not recorded'} · {spanLabel(span())}
      </span>
      <Show when={agent()?.tool || runtime()?.tool}>{tool => <span>{ctx.board('tool_labels')?.[tool()] ?? tool()}</span>}</Show>
      <Show when={agent()?.project || runtime()?.project}>{project => <span title={project()}>{projectName(project())}</span>}</Show>
      <Show when={agent()?.models?.length}><span>{agent()?.models.join(', ')}</span></Show>
      <Show when={agent()?.node_id}><span>Node: {agent()?.node_id}</span></Show>
    </div>}>
    <Show when={loaded()}>{evidence =>
      <details class={styles.section}>
        <summary>Effective runtime settings · {evidence().evidence.length} {evidence().evidence.length === 1 ? 'observation' : 'observations'}</summary>
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
