import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import { getContextAudit } from '../api.js'
import Drawer from '../components/board/Drawer.js'
import { buildFindings, buildSettings } from '../panels/overview/b/findings'
import type { DetailContextAudit } from '../data/contract.gen'
import { boardQuery, windowOf } from '../data/filters'
import { PreactIsland } from './PreactIsland'
import type { DrawerProps } from './islandTypes'

export default function DrawerIsland(props: DrawerProps) {
  const ctx = untrack(() => props.ctx)
  const [scan, rescan] = createSignal(0)
  const [audit, setAudit] = createSignal<{ loading?: boolean; audit?: DetailContextAudit; error?: string; scan?: unknown }>({})
  createEffect(() => props.stack.at(-1)?.type === 'hidden' && ctx.scope() === 'local' ? scan() : 0, count => {
    if (!count) return
    const request = new AbortController()
    setAudit(old => ({ ...old, loading: true, error: undefined }))
    void getContextAudit(true, scan => {
      if (!request.signal.aborted) setAudit(old => ({ ...old, scan }))
    }, { signal: request.signal }).then(
      data => { if (!request.signal.aborted) setAudit({ audit: data }) },
      error => { if (!request.signal.aborted) setAudit(old => ({ ...old, loading: false, error: String(error) })) },
    )
    return () => request.abort()
  })
  const act = untrack(() => ({
    openDrawer: props.open,
    drawerBack: props.back,
    drawerClose: props.close,
    setDrawerTab: props.changeTab,
    copy: ctx.copy,
    stopAgent: ctx.stopAgent,
    runCommand: ctx.runCommand,
    settingsPivot: (pivot: string) => ctx.navigate({ screen: 'settings', pivot, agent: null, tab: null, detail: null, record: null }),
    rescan: () => rescan(count => count + 1),
  }))
  const values = createMemo(() => {
    const scope = ctx.scope(), nodeId = ctx.nodeId(), filters = ctx.filters(), tools = ctx.tools()
    const raw = ctx.board('range'), range = raw ? { ...raw, buckets: raw.bucket_starts.length } : windowOf(filters.range, ctx.startedAt)
    const agents = ctx.board('agents') ?? []
    const settingToolIds = ctx.board('options')?.tools.map(tool => tool.id) ?? []
    const hidden = props.stack.at(-1)?.type === 'hidden' && scope === 'local'
    const scanData = { audit: audit().audit, effective: undefined, hooks: undefined, otel: undefined }
    const findings = hidden ? { ...audit(), list: buildFindings({ ...scanData, tools }),
      settings: buildSettings({ ...scanData, toolIds: settingToolIds }).rows } : { list: [], unavailable: 'No local context scan is loaded for this scope.' }
    return {
      stack: props.stack,
      act,
      ctx: {
        data: { agents, range, tool_labels: ctx.board('tool_labels') ?? {}, scope: ctx.board('scope') },
        stopped: Object.fromEntries(agents.filter(agent => ctx.stopped(agent.id)).map(agent => [agent.id, true])),
        nodeScope: scope, nodeId, remote: scope !== 'local',
        scopeName: scope === 'local' ? 'This node' : scope === 'fleet' ? 'All nodes' : nodeId ?? 'Named node',
        filters, tools, query: boardQuery(filters, tools, range),
        toolName: (id: string) => ctx.board('tool_labels')?.[id] ?? id,
        settingToolIds, findings,
      },
    }
  })
  return <PreactIsland component={Drawer} values={values()} client={ctx.client} local={ctx.scope() === 'local'}
    theme={props.theme} density={props.density} drawer />
}
