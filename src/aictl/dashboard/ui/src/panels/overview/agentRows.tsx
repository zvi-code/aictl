import { createMemo, createSignal, Show } from 'solid-js'
import type { BoardAgentRow, DetailNodes } from '../../data/contract.gen'
import { overlayAgents } from '../../data/runtimeAgents'
import { at, detailPath, object } from '../data'
import { keyedRows } from '../kinds/model'
import type { KeyedRow, PanelProps, Read } from '../types'
import { Choice } from './aControls'
import { missing } from './aFields'
import { knownSum, modelAllocation } from './overviewMath'
import css from './overviewA.module.css'

const groupOptions = [['none', 'No groups'], ['project', 'Project'], ['tool', 'Tool'], ['model', 'Model']] as const
type Group = typeof groupOptions[number][0]
export function agentRows({ ctx, def }: PanelProps) {
  const [group, setGroup] = createSignal<Group>('none')
  const history = createMemo(() => ctx.read(def.sources[0]))
  const runtime = createMemo(() => ctx.read(def.sources[1]))
  const remote = ctx.detail<Extract<DetailNodes, { view: 'runtime' }>>(() =>
    ctx.scope() === 'local' ? undefined : detailPath(ctx, '/api/board/nodes', new URLSearchParams({ view: 'runtime' })))
  const hosts = createMemo(() => {
    const data = remote()?.data
    if (!data || data.view !== 'runtime' || data.scope !== ctx.scope() || !Array.isArray(data.rows) ||
      data.rows.some(row => !row.node_id || (ctx.scope() === 'node' && row.node_id !== ctx.nodeId()))) return
    return data.rows
  })
  const fresh = (at: number | null | undefined) => at != null && at > 0 && ctx.startedAt - at <= 300 && at <= ctx.startedAt + 60
  const records = createMemo(() => Array.isArray(history().value) ? history().value as BoardAgentRow[] : [])
  const covered = createMemo(() => hosts()?.filter(row => fresh(row.agents?.captured_at) && Array.isArray(row.agents?.rows)))
  const observed = createMemo(() => {
    if (ctx.scope() === 'local') return (Array.isArray(runtime().value) ? runtime().value as unknown[] : []).flatMap((raw, i) => {
      const data = object(raw), id = runtime().rowKeys?.[i]
      return data && id ? [{ id, data }] : []
    })
    return (covered() ?? []).flatMap(host => host.agents!.rows.flatMap(data => {
      const raw = data.native_session_id || data.session_id
      if (typeof raw !== 'string' || !raw) return []
      const id = JSON.stringify([host.node_id, raw])
      return [{ id, data: { ...data, id, session_id: id, node_id: host.node_id,
        title: typeof data.title === 'string' ? data.title : undefined } }]
    }))
  })
  const agents = createMemo(() => {
    const topics = object(ctx.client.store.meta.capabilities?.topics)
    const declared = at(topics?.['runtime.agent'], 'fields')
    const fields = ctx.scope() === 'local' ? (Array.isArray(declared) ? declared.filter((field): field is string => typeof field === 'string') : []) :
      ['node_id', 'tool', 'status', 'native_activity', 'running', 'cpu_percent', 'mem_mb', 'started_at']
    return overlayAgents(records().filter(agent => !agent.placeholder), observed(), fields, ctx.filters(), ctx.tools())
  })
  const keyed = createMemo(() => {
    const ids = new Map(records().map((row, i) => [row.id, history().rowKeys?.[i]]))
    const value = agents()
    return keyedRows({ state: 'ready', value, rowKeys: value.map(agent => ids.get(agent.id) ?? (
      agent.queryable ? JSON.stringify(Object.hasOwn(agent, 'node_id') ? [agent.node_id, agent.id, agent.parent_id] : [agent.id, agent.parent_id]) :
        `runtime:${agent.id}`)) }, ['id', 'parent_id'])
  })
  const rows = createMemo(() => {
    const byAgent = new Map(keyed().map(entry => [entry.row.id, entry]))
    const parents = new Set(keyed().flatMap(({ row }) => typeof row.parent_id === 'string' ? [row.parent_id] : []))
    const groups = new Map<string, KeyedRow>()
    const groupBy = group()
    const labels = ctx.board('tool_labels')
    return [...keyed().map(entry => {
      const a = entry.row
      let parent = byAgent.get(a.parent_id)?.id
      if (parent === entry.id) parent = undefined
      if (!parent && groupBy !== 'none') {
        const label = groupBy === 'model' ? a.primary_model ?? (Array.isArray(a.models) ? a.models[0] : undefined)
          : groupBy === 'tool' && typeof a.tool === 'string' ? labels?.[a.tool] ?? a.tool : a[groupBy]
        parent = JSON.stringify(['group', groupBy, label ?? null])
        if (!groups.has(parent)) groups.set(parent, { id: parent, folded: false, row: { title: label || missing } })
      }
      const processOnly = a.runtime_present === true && (a.status == null || a.status === 'unknown' || a.native_activity === 'unknown')
      const ended = typeof a.ended_at === 'number' ? a.ended_at : a.running === true ? ctx.startedAt : undefined
      return { ...entry, parent, folded: typeof a.id === 'string' && parents.has(a.id) ? false : undefined, row: {
        ...a,
        title: a.parent_id ? a.role || a.title : a.title || a.id,
        status: ctx.stopped(String(a.id)) ? 'Stopped' : processOnly || a.status === 'unknown' ? 'Activity unknown' : a.status,
        tool: typeof a.tool === 'string' ? labels?.[a.tool] ?? a.tool : a.tool,
        model_names: Array.isArray(a.models) && a.models.length ? a.models.join(', ') : undefined,
        messages: knownSum(['user', 'assistant', 'tool'].map(key => at(a, `msgs.${key}`))),
        duration: ended !== undefined && typeof a.started_at === 'number' ? Math.max(0, ended - a.started_at) : undefined,
        activity_total: Array.isArray(a.activity) ? knownSum(a.activity) : undefined,
        pid_text: Array.isArray(a.pid_list) ? a.pid_list.join(', ') : undefined,
      } }
    }), ...groups.values()]
  })
  const result = (): Read => {
    const base = history()
    if (rows().length && (base.state !== 'ready' || runtime().state === 'stale' || remote()?.status === 'stale')) {
      return { state: 'stale', value: agents(), message: base.message }
    }
    return rows().length ? base : base.value == null ? base : { state: 'empty' }
  }
  const placeholders = createMemo(() => records().filter(agent => agent.placeholder).length)
  return {
    result, rows,
    flowColumns: ['title', 'status', 'tool', 'messages', 'tool_calls', 'failures'],
    controls: <Choice label="Group agents by" items={groupOptions} value={group} change={setGroup} />,
    description: <p class={css.note}>
      Recorded agents: {ctx.board('scope')?.shown_agents?.toLocaleString() ?? missing}.
      <Show when={placeholders()}> {placeholders()} with processes only.</Show>
      <Show when={ctx.scope() !== 'local'}>
        {' '}Agent lists: {hosts() ? `${covered()?.length ?? 0} of ${hosts()!.length} nodes` : missing}.
      </Show>
    </p>,
  }
}

export function modelRows({ ctx, def }: PanelProps) {
  const result = createMemo(() => ctx.read(def.sources[0]))
  const models = createMemo(() => keyedRows(result(), ['model']))
  const agents = createMemo(() => new Map((ctx.board('agents') ?? []).map(agent => [agent.id, agent])))
  const rows = createMemo(() => models().flatMap(entry => {
    const children: KeyedRow[] = (Array.isArray(entry.row.agent_ids) ? entry.row.agent_ids as string[] : [])
      .flatMap(id => {
        const agent = agents().get(id)
        if (!agent) return []
        return [{ id: JSON.stringify([entry.id, id]), parent: entry.id, row: {
          title: agent.title, model: agent.parent_id ? `${agent.role || agent.title} (subagent)` : agent.title,
          agent_id: id, node_id: agent.node_id, agents: 1, ...modelAllocation(agent, entry.row.model),
        } }]
      })
    return [{ ...entry, folded: children.length ? true : undefined }, ...children]
  }))
  return { result, rows, flowColumns: ['model', 'agents', 'tokens', 'cost_usd'], description: <p class={css.note}>
    Unfold a model to see listed agents. Usage for agents with more than one model is not available from this source.
  </p> }
}

export const roleRows = ({ ctx, def }: PanelProps) => ({
  result: () => ctx.read(def.sources[0]), flowColumns: ['kind', 'runs', 'tokens'],
})
