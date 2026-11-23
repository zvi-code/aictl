import { createMemo, For, Show, untrack } from 'solid-js'
import type { DetailSessionTeam } from '../../data/contract.gen'
import { Meter } from '../../ui/Meter'
import { PanelState } from '../../ui/PanelState'
import { indent, treeOrder } from '../hierarchy'
import { labelOf, openAgent, Resource, Rows, Section, sessionPath, Stats, type TabProps } from '../shared'
import styles from '../drawer.module.css'

export default function Team(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const raw = ctx.detail<DetailSessionTeam>(createMemo(() => ctx.scope() === 'local' ? sessionPath(props, '/api/session-stats') : undefined))
  const team = Object.assign(createMemo(() => {
    const state = raw()
    return state?.status === 'error' && 'status' in Object(state.error) && (state.error as {status?: number}).status === 404
      ? { ...state, status: 'ready' as const, data: { error: 'session not found' }, error: null } : state
  }), { retry: raw.retry })
  return <>
    <Resource read={props.detail}>{data => <Section title="Subagents">
      <Stats items={[{ label: 'Subagents', value: data().subagents?.length },
        { label: 'Running', value: data().subagents?.filter(agent => ['running', 'waiting', 'looping'].includes(agent.status)).length }]} />
      <Rows label="Subagents" rows={data().subagents?.map(agent => ({ ...agent, model: agent.primary_model ?? agent.resolved_model ?? undefined,
        duration_s: agent.started_at != null && agent.ended_at != null && agent.ended_at >= agent.started_at ? agent.ended_at - agent.started_at : undefined }))}
        identity={['id']} columns={['title', 'role', 'status', 'model', ['started_at', 'Started', 'time'], ['ended_at', 'Ended', 'time'],
          ['duration_s', 'Duration (s)', 'number'], ['status_evidence', 'Why this status'], ['input', 'Input, cache excluded'],
          ['cache_read', 'Cache read'], ['cache_write', 'Cache write'], 'output', 'tool_calls']}
        action={{ label: row => `Open ${row.title}`, run: row => openAgent(props, row.id, 'overview') }} />
    </Section>}</Resource>
    <Show when={ctx.scope() === 'local' && props.session()} fallback={<PanelState state="unavailable"
      message="Live task status is not available from this source." />}>
      <Resource read={team}>{data => {
      const observed = () => {
        const reply = data()
        return 'agents' in reply ? reply : undefined
      }
      return <Show when={observed()} fallback={<PanelState state="empty" message="This session has no hook-reported team." />}>{value => <>
        <Section title="Hook-reported team">
          <Stats items={[{ label: 'Agents', value: value().agents.length }, { label: 'Tasks', value: value().tasks.length }]} />
          <Rows label="Team agents" rows={treeOrder(value().agents.slice().sort((a, b) => (a.started_at ?? 0) - (b.started_at ?? 0)),
            row => row.agent_id, row => row.parent_agent_id).map(({ row, depth }) => ({ ...row, agent: indent(row.agent_type || row.agent_id, depth) }))}
            identity={['agent_id']} columns={['agent', ['parent_agent_id', 'Parent agent'], 'model', 'relationship', 'task', 'state',
              'input_tokens', 'output_tokens', 'tool_calls', 'duration_s']} />
        </Section>
        <Section title="Tasks">
          <div class={styles.stats}><For each={['pending', 'active', 'done']}>{state => {
            const tasks = () => value().tasks.filter(row => (row.state || 'pending') === state)
            return <div class={styles.stack}>
              <Meter label={labelOf(state)} value={tasks().length} max={Math.max(1, value().tasks.length)} tone={state === 'done' ? 'positive' : 'neutral'} />
              <Rows label={`${labelOf(state)} tasks`} rows={tasks()} identity={['task_id']}
                columns={['name', 'agent_id', ['created_at', 'Created', 'time']]} empty="No tasks." />
            </div>
          }}</For></div>
        </Section>
      </>}</Show>
    }}</Resource></Show>
  </>
}
