import { createEffect, createMemo, createSignal, Show, untrack } from 'solid-js'
import { getContextAudit } from '../api.js'
import SettingsWorkspace from '../components/settings/SettingsWorkspace.js'
import { isStoredToolSelected } from '../utils/toolScope.js'
import type { DetailContextAudit, DetailHooksStatus, DetailSettingsTools } from '../data/contract.gen'
import { json, topic } from '../panels/data'
import { PanelState } from '../ui/PanelState'
import { PreactIsland } from './PreactIsland'
import type { IslandProps } from './islandTypes'

export default function Settings(props: IslandProps) {
  const ctx = untrack(() => props.ctx)
  const local = () => ctx.scope() === 'local'
  const config = () => local() ? topic(ctx.client, 'configuration.file', 'current') as DetailSettingsTools | undefined : undefined
  const status = () => ctx.read({ topic: 'configuration.file', entity: 'current' })
  const [hooks, setHooks] = createSignal<DetailHooksStatus>()
  const [audit, setAudit] = createSignal<{ loading?: boolean; audit?: DetailContextAudit; error?: string; scan?: unknown }>({})
  const [scan, rescan] = createSignal(0)
  createEffect(local, enabled => {
    setHooks(undefined)
    if (!enabled) return
    const controller = new AbortController()
    void json<DetailHooksStatus>('/api/hooks-status', { signal: controller.signal }).then(setHooks, () => {})
    return () => controller.abort()
  })
  createEffect(() => local() ? scan() : 0, count => {
    setAudit({})
    if (!count) return
    const controller = new AbortController()
    setAudit({ loading: true })
    void getContextAudit(true, scan => {
      if (!controller.signal.aborted) setAudit(old => ({ ...old, scan }))
    }, { signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) setAudit({ audit: data }) },
      error => { if (!controller.signal.aborted) setAudit({ error: String(error) }) },
    )
    return () => controller.abort()
  })
  const values = createMemo(() => ({
    note: '',
    source: local() ? {
      ...config(), toolConfigs: config()?.tool_configs ?? [], configuredOnly: true, keepUnsetControl: true,
      enabledTools: ctx.tools(), hooks: hooks(), refresh: ctx.refresh,
      openFile: (path: string, line: number) => ctx.openDetail({ type: 'file', path, line }),
      findings: { ...audit(), rescan: () => rescan(count => count + 1) },
      runtimeConfiguration: [...(ctx.client.store.topic('configuration.loaded')?.values() ?? [])]
        .map(entity => ({ id: entity.id, ...entity.data }))
        .filter(row => isStoredToolSelected('tool' in row ? row.tool : undefined, ctx.tools())),
    } : {
      toolConfigs: [], readonly: true, configuredOnly: true, keepUnsetControl: true,
      unavailable: 'Tool configuration files and policy findings are not reported for this scope.',
    },
  }))
  return <>
    <h1>Settings</h1>
    <Show when={!local() || config()} fallback={<PanelState state={status().state === 'error' ? 'error' :
      status().state === 'unavailable' ? 'unavailable' : 'loading'} message={status().message} onRetry={ctx.refresh} />}>
      <Show when={local() && status().state === 'stale'}><PanelState state="stale" message={status().message} /></Show>
      <PreactIsland component={SettingsWorkspace} values={values()} client={ctx.client} local={local()}
        theme={props.theme} density={props.density} />
    </Show>
  </>
}
