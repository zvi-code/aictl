import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import type { DetailHooksStatus, DetailSettingsFiles, DetailSettingsTools, TopicConfigurationFile } from '../data/contract.gen'
import { writeUrl } from '../data/urlState'
import type { PanelContext } from '../panels/types'
import { auditSource } from './sources'
import {
  ENV_PREFIX, envName, isFileSource, labelOf, mergeFiles, nextSettings, readSettingsUrl, rowFilter, samePath,
  settingsParams, settingsSummary, toolEntries, withFindingIds, type Entry, type SettingsState, type Setting,
} from './model'

export function workspaceState(ctx: PanelContext, config: () => TopicConfigurationFile | undefined) {
  const initial = readSettingsUrl(location.search)
  const [state, setState] = createSignal(initial)
  const [query, setQuery] = createSignal('')
  const [nonDefault, setNonDefault] = createSignal(false)
  const [risky, setRisky] = createSignal(false)
  const [inspector, setInspector] = createSignal(!!initial.row)
  const [fileSource, setFileSource] = createSignal('')
  let returnTo: HTMLElement | undefined
  const rememberFocus = () => {
    if (!inspector() && document.activeElement instanceof HTMLElement) returnTo = document.activeElement
  }
  const close = () => {
    if (!inspector()) return
    const previous = returnTo
    returnTo = undefined
    setInspector(false)
    if (previous) queueMicrotask(() => { if (!untrack(inspector) && previous.isConnected) previous.focus() })
  }
  const change = (patch: Partial<SettingsState>) => {
    const before = state(), next = nextSettings(before, patch)
    if (before.view !== next.view || before.tool !== next.tool || before.sec !== next.sec) setFileSource('')
    if (!next.row) close()
    setState(next)
    writeUrl(settingsParams(next, ctx.scope() === 'local'))
  }
  createEffect(() => true, () => {
    const pop = () => {
      const current = readSettingsUrl(location.search)
      setState(current)
      setInspector(!!current.row)
      setFileSource('')
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  })
  const local = () => ctx.scope() === 'local'
  const toolDetails = ctx.detail<DetailSettingsTools>(() => local() ? '/api/settings/tools' : undefined)
  const entries = createMemo(() => toolEntries(config()?.tool_configs, toolDetails()?.data, ctx.tools()))
  const totals = createMemo(() => settingsSummary(entries()))
  const monitor = () => toolDetails()?.data?.monitor
  const aictl = () => monitor() && 'aictl'
  const tool = () => state().tool === 'aictl' && aictl() ? 'aictl'
    : entries().some(entry => entry.id === state().tool) ? state().tool : entries()[0]?.id ?? aictl() ?? ''
  const entry = () => entries().find(entry => entry.id === tool())
  const section = () => state().sec || entry()?.sections.find(sec => sec.rows.some(row => !row.unset))?.id ||
    entry()?.sections[0]?.id || (entry()?.envVars.length ? 'env' : '')
  const hookPath = () => local() && state().view === 'tool' && section() === 'hooks' ? '/api/hooks-status' : undefined
  const filesPath = () => local() && state().view === 'files' ? '/api/settings/files' : undefined
  const hookStatus = untrack(() => ctx.detail<DetailHooksStatus>(hookPath))
  const fileDetail = untrack(() => ctx.detail<DetailSettingsFiles>(filesPath))
  const files = createMemo(() => mergeFiles(fileDetail()?.data?.files, entries(), ctx.tools()))
  const auditActive = () => local() && state().view === 'findings'
  const { scan, rescan } = untrack(() => auditSource(auditActive, fileDetail.retry))
  const findings = createMemo(() => {
    const result = scan().audit
    return result ? withFindingIds(result.findings, ctx.tools()) : undefined
  })
  const selectedEntry = () => state().view === 'tool' ? entry() : entries().find(entry => entry.id === state().tool)
  const selectedSetting = () => settingOf(selectedEntry(), state().row)
  const selectedEnv = () => selectedEntry()?.envVars.find(env => env.name === envName(state().row))
  const selectedFile = () => files().find(file => samePath(file.path, state().row))
  const selectedFinding = () => findings()?.find(finding => finding.id === state().row)
  const select = (patch: Partial<SettingsState>) => { rememberFocus(); change(patch); setInspector(true) }
  const showInspector = () => { rememberFocus(); setInspector(true) }
  const selectSetting = (row: Setting) => select({
    view: state().view === 'topic' ? 'topic' : 'tool', row: row.key, tool: row.tool, sec: row.sec,
  })
  const selectEnvironment = (name: string, id?: string) => {
    if (!name) return
    const tool = entries().find(entry => id === entry.id && entry.envVars.some(env => env.name === name))
      ?? entries().find(entry => entry.envVars.some(env => env.name === name))
      ?? selectedEntry() ?? entries()[0]
    if (!tool) return
    select(state().view === 'topic' ? { tool: tool.id, row: ENV_PREFIX + name }
      : { view: 'tool', tool: tool.id, sec: 'env', row: ENV_PREFIX + name })
  }
  const openSource = (path: string, line?: number, id?: string) => {
    if (!local()) return
    const env = envName(path)
    if (env) selectEnvironment(env, id)
    else if (isFileSource(path)) ctx.openDetail({ type: 'file', path, line })
  }
  const pass = createMemo(() => rowFilter(query(), nonDefault(), risky(), state().unset))
  return {
    ctx, config, local, state, change, query, setQuery, nonDefault, setNonDefault, risky, setRisky,
    inspector, showInspector, close, select, selectSetting, selectEnvironment,
    entry, entries, tool, toolDetails, aictl, monitor, totals, section, hookStatus, fileDetail, files, scan,
    rescan, findings, selectedEntry, selectedSetting, selectedFile, selectedEnv, selectedFinding, openSource,
    fileSource, setFileSource, label: (id: string) => labelOf(id, toolDetails()?.data),
    pass,
  }
}
function settingOf(entry: Entry | undefined, key: string) {
  return entry?.rows.find(row => row.key === key)
}
export type Workspace = ReturnType<typeof workspaceState>
