import type { DetailContextAudit, DetailSettingsFiles, DetailSettingsTools, SettingsToolConfig } from '../data/contract.gen'
import { isConfigSelected, isToolSelected } from '../utils/toolScope.js'
import { rowTip } from './tips'

export const MISSING = 'Not available from this source'
export const DASH = '—'
export const ENV_PREFIX = 'env:'
export const SECTIONS = [
  ['model', 'Model'], ['agents', 'Agents'], ['telemetry', 'Telemetry'], ['autonomy', 'Autonomy and safety'],
  ['context', 'Context files'], ['hooks', 'Hooks'], ['mcp', 'MCP servers'], ['extensions', 'Extensions and plugins'],
  ['startup', 'Updates and startup'], ['other', 'Other settings'],
] as const
const sectionTitles = new Map<string, string>(SECTIONS)
const scopeLabels: Record<string, string> = {
  default: 'Default', system: 'System', managed: 'Managed', policy: 'Policy', user: 'User', profile: 'Profile',
  project: 'Project', 'project-local': 'Project local', workspace: 'Workspace', env: 'Environment', cli: 'CLI',
}
type RawRow = NonNullable<SettingsToolConfig['sections']>[number]['rows'][number]
type RawEnvironment = NonNullable<SettingsToolConfig['env_vars']>[number]
export type ChainEntry = NonNullable<RawRow['chain']>[number]
export type Setting = RawRow & {
  uid: string; tool: string; sec: string; label: string; chain: ChainEntry[]; wins: number
  risky: boolean; unset: boolean; undocumented: boolean; tip: string
}
export type Scope = NonNullable<SettingsToolConfig['scopes']>[number] & { id: string }
export type Environment = RawEnvironment & { name: string; tool: string; uid: string }
export type Entry = ReturnType<typeof toolEntries>[number]
export type Audit = Exclude<DetailContextAudit, { status: string }>
export type Finding = Audit['findings'][number] & { id: string }
type ApiFile = DetailSettingsFiles['files'][number]
export type ConfigFile = Partial<ApiFile> & { path: string; name: string; tools: string[]; rows: Setting[] }

export function title(id: string) {
  return id.replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase())
}
export const basename = (path?: string | null) => path?.split(/[\\/]/).filter(Boolean).at(-1) ?? ''
const normPath = (path: string) => path.replaceAll('\\', '/').replace(/(.)\/+$/, '$1')
export const samePath = (a?: string | null, b?: string | null) => !!a && !!b && normPath(a) === normPath(b)
export const envName = (source?: string | null) => source?.startsWith(ENV_PREFIX) ? source.slice(ENV_PREFIX.length) : ''
export const isFileSource = (source?: string | null): source is string => !!source && !envName(source) && !(source in scopeLabels)
export const scopeLabel = (id?: string, scopes: readonly Scope[] = []) =>
  id ? scopes.find(s => s.id === id)?.label || scopeLabels[id] || title(id) : MISSING
export const isLockedEntry = (entry?: ChainEntry, scopes: readonly Scope[] = []) =>
  !!entry && (entry.locked === true || scopes.some(s => s.id === entry.scope && s.changeable === false))

export function labelOf(id: string, detail?: DetailSettingsTools) {
  return detail?.tools?.find(tool => tool.tool === id)?.label ??
    ({ vscode: 'VS Code', 'claude-code': 'Claude Code', 'copilot-cli': 'Copilot CLI',
      'codex-cli': 'Codex CLI', 'gemini-cli': 'Gemini CLI' } as Record<string, string>)[id] ?? id
}

function setting(raw: RawRow, tool: string, sec: string): Setting {
  const chain = raw.chain ?? []
  const given = raw.wins
  const wins = given != null && Number.isInteger(given) && given >= 0 && given < chain.length
    ? given : chain.findIndex(layer => layer.wins === true)
  return { ...raw, tool, sec, uid: `${tool}\u0001${sec}\u0001${raw.key}`, label: raw.label || raw.key,
    chain, wins, risky: raw.danger === true, unset: raw.set === false, undocumented: raw.documented === false,
    tip: rowTip(raw, sec) }
}

export function toolEntries(configs: readonly SettingsToolConfig[] | undefined, detail?: DetailSettingsTools,
  tools: string[] | null = null) {
  return (configs ?? []).filter(config => isConfigSelected(config, tools)).map(config => {
    // The stream deliberately omits unset rows and the process environment.
    // The local detail read supplies those fields without overriding configured values.
    const full = detail?.tool_configs?.find(tool => tool.tool === config.tool)
    const sections = new Map<string, { id: string; title: string; rows: Map<string, Setting> }>()
    for (const [source, onlyUnset] of [[config, false], [full, true]] as const) {
      for (const section of source?.sections ?? []) {
        const id = section.id || 'other'
        const current = sections.get(id) ?? { id, title: section.title || sectionTitles.get(id) || title(id), rows: new Map() }
        for (const raw of section.rows) {
          if (onlyUnset && raw.set !== false) continue
          if (!current.rows.has(raw.key)) current.rows.set(raw.key, setting(raw, config.tool, id))
        }
        if (current.rows.size) sections.set(id, current)
      }
    }
    const rank = (id: string) => [...sectionTitles.keys(), id].indexOf(id)
    const grouped = [...sections.values()].sort((a, b) => rank(a.id) - rank(b.id))
      .map(sec => ({ ...sec, rows: [...sec.rows.values()] }))
    const rows = grouped.flatMap(sec => sec.rows)
    const scopes = (config.scopes ?? []).flatMap(scope => scope.id ? [{ ...scope, id: scope.id }] : [])
    for (const id of new Set(rows.map(row => row.scope))) if (id && !scopes.some(scope => scope.id === id)) scopes.push({ id })
    const files = [...new Set([...(config.config_files ?? []), ...rows.flatMap(row => [
      row.source, ...row.chain.map(layer => layer.source), row.agent?.defined_in, row.agent?.pinned_in,
    ])].filter(isFileSource))]
    const env = new Map<string, Environment>()
    for (const variable of full?.env_vars ?? config.env_vars ?? []) {
      if (variable.name) env.set(variable.name, { ...variable, name: variable.name, tool: config.tool,
        uid: `${config.tool}\u0001${ENV_PREFIX}${variable.name}` })
    }
    for (const row of rows) for (const name of new Set([row.source, ...row.chain.map(layer => layer.source)].map(envName))) {
      if (!name) continue
      const variable = env.get(name) ?? { name, tool: config.tool, uid: `${config.tool}\u0001${ENV_PREFIX}${name}` }
      if (!variable.drives?.some(item => item.key === row.key)) {
        env.set(name, { ...variable, drives: [...(variable.drives ?? []), { key: row.key, label: row.label }] })
      }
    }
    const envVars = [...env.values()].sort((a, b) => Number(b.set === true) - Number(a.set === true))
    return { id: config.tool, label: labelOf(config.tool, detail), files, scopes, sections: grouped,
      rows, envVars, hints: config.hints }
  })
}

export function settingsSummary(entries: readonly Entry[]) {
  const rows = entries.flatMap(entry => entry.rows)
  return { set: rows.filter(row => !row.unset).length, unset: rows.filter(row => row.unset).length,
    knowsSet: rows.some(row => row.set === false), risky: rows.filter(row => row.risky).length,
    agents: rows.filter(row => row.agent).length }
}

export const agentInherits = (row: Setting) => row.agent?.inherits === true || row.value === 'inherits'
export function pinWins(row: Setting) {
  return !agentInherits(row) && samePath(row.chain[row.wins]?.source ?? row.source, row.agent?.pinned_in)
}

export function plainValue(value: unknown): string {
  if (value == null) return MISSING
  if (typeof value === 'string') return value || 'Empty string'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  return typeof value === 'number' ? String(value) : JSON.stringify(value) ?? MISSING
}

export function rowValue(row: Setting, compact = false) {
  const value = row.value
  if (row.unset && value == null) return 'Unset'
  if (agentInherits(row)) return 'Inherits session model'
  if (compact && value && typeof value === 'object') {
    const n = Object.keys(value).length
    return `${n} ${Array.isArray(value) ? (n === 1 ? 'item' : 'items') : (n === 1 ? 'field' : 'fields')}`
  }
  return plainValue(value)
}

export function matches(query: string, ...parts: unknown[]) {
  const q = query.trim().toLowerCase()
  return !q || parts.filter(part => part != null).join('\n').toLowerCase().includes(q)
}

export function rowFilter(q: string, nonDefault: boolean, risky: boolean, unset: boolean) {
  return (row: Setting) => (unset || !row.unset) && (!risky || row.risky)
    && (!nonDefault || (!row.unset && row.scope !== 'default' && !agentInherits(row)))
    && matches(q, row.label, row.key, plainValue(row.value), row.source, row.agent?.name, row.agent?.model,
      row.agent?.tools?.join(' '), row.agent?.defined_in, row.agent?.pinned_in)
}

export function topicMatrix(entries: readonly Entry[], sec: string, pass: (row: Setting) => boolean) {
  const tools = entries.filter(entry => entry.rows.some(row => row.sec === sec))
  const labelIndex = new Map<string, Comparison>()
  const keyIndex = new Map<string, Comparison>()
  const rows: Comparison[] = []
  const normal = (text: string) => text.toLowerCase().replace(/^github\.copilot\./, '').replace(/[^a-z0-9]/g, '')
  for (const tool of tools) for (const row of tool.rows) {
    if (row.sec !== sec) continue
    const label = normal(row.label), key = normal(row.key)
    let comparison = labelIndex.get(label) ?? keyIndex.get(key)
    if (!comparison || comparison.cells.has(tool.id)) {
      comparison = { id: row.uid, label: row.label, cells: new Map() }
      rows.push(comparison)
    }
    if (!labelIndex.has(label)) labelIndex.set(label, comparison)
    if (!keyIndex.has(key)) keyIndex.set(key, comparison)
    if (pass(row)) comparison.cells.set(tool.id, row)
  }
  return { tools, rows: rows.filter(row => row.cells.size > 0) }
}
export type Comparison = { id: string; label: string; cells: Map<string, Setting> }

export const LOCATIONS = [
  ['home', 'Home folder'], ['tool-home', 'Tool folders'], ['project', 'This project'],
  ['vscode-user', 'VS Code user folder'], ['other', 'Other'],
] as const
export const PURPOSES = [
  ['settings', 'Settings'], ['instructions', 'Instructions'], ['agents', 'Agents'], ['skills', 'Skills'],
  ['prompts', 'Prompts'], ['memory', 'Memory'], ['hooks', 'Hooks'], ['mcp', 'MCP'], ['other', 'Other'],
] as const
export const GIT_STATES = [
  ['tracked', 'Tracked'], ['ignored', 'Ignored'], ['untracked', 'Untracked'], ['outside', 'Outside a repository'],
] as const
export const locationLabel = (id?: string) => LOCATIONS.find(([key]) => key === id)?.[1] ?? id ?? MISSING
export const purposeLabel = (id?: string) => PURPOSES.find(([key]) => key === id)?.[1] ?? id ?? MISSING
export function gitCategory(file: ConfigFile) {
  const state = file.git_state?.toLowerCase() ?? ''
  if (/untracked|not tracked/.test(state)) return 'untracked'
  if (/ignored/.test(state)) return 'ignored'
  if (/outside/.test(state)) return 'outside'
  if (/tracked|modified/.test(state)) return 'tracked'
  return ''
}

export function mergeFiles(api: readonly ApiFile[] | undefined, entries: readonly Entry[], tools: string[] | null) {
  const out = new Map<string, ConfigFile>()
  const add = (file: Omit<ConfigFile, 'rows'>) => {
    const key = normPath(file.path)
    const old = out.get(key)
    if (old) { old.tools = [...new Set([...old.tools, ...file.tools])]; return old }
    const value = { ...file, rows: [] }
    out.set(key, value)
    return out.get(key)!
  }
  for (const file of api ?? []) add(file)
  for (const entry of entries) {
    for (const path of entry.files) add({ path, name: basename(path), tools: [entry.id] })
    for (const scope of entry.scopes) if (scope.path && scope.exists === false && scope.changeable === false) {
      add({ path: scope.path, name: basename(scope.path), scope: scope.id, exists: false, tools: [entry.id] })
    }
    for (const row of entry.rows) for (const path of new Set([row.source, ...row.chain.map(layer => layer.source)])) {
      if (isFileSource(path)) out.get(normPath(path))?.rows.push(row)
    }
  }
  return [...out.values()].filter(file => !file.tools.length || file.tools.some(tool => isToolSelected(tool, tools) ||
    entries.some(entry => entry.id === tool)))
}

export function isRecent(file: ConfigFile, now: number) {
  return file.mtime != null && file.mtime <= now && now - file.mtime < 86400
}
export const folderOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))) || path
export const findingTools = (finding: Audit['findings'][number]) => finding.tools?.length
  ? finding.tools : finding.tool ? [finding.tool] : []
export const SEVERITIES = ['high', 'medium', 'low', 'info'] as const
export function withFindingIds(findings: Audit['findings'], tools: string[] | null = null): Finding[] {
  const seen = new Map<string, number>()
  return findings.map(finding => {
    const base = [finding.rule ?? '', finding.path ?? '', finding.line ?? 0, finding.tool ?? '', finding.session_id ?? ''].join('|')
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return { ...finding, id: n ? `${base}#${n}` : base }
  }).filter(finding => !findingTools(finding).length || findingTools(finding).some(tool => isToolSelected(tool, tools)))
}
export function groupBy<T>(rows: readonly T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const group = groups.get(k)
    if (group) group.push(row)
    else groups.set(k, [row])
  }
  return groups
}

export const PIVOTS = [
  { id: 'tool', label: 'By tool' }, { id: 'topic', label: 'By topic' },
  { id: 'files', label: 'Files' }, { id: 'findings', label: 'Findings' },
] as const
export type Pivot = typeof PIVOTS[number]['id']
export function readSettingsUrl(search: string) {
  const q = new URLSearchParams(search)
  const get = (key: string) => q.get(key) ?? ''
  const scope = get('scope')
  return {
    view: PIVOTS.find(pivot => pivot.id === get('pivot'))?.id ?? 'tool' as Pivot,
    tool: get('tool'), sec: get('sec'), row: get('row'),
    scope: ['local', 'node', 'fleet'].includes(scope) ? '' : scope, unset: get('unset') === '1',
    group: get('group') === 'purpose' ? 'purpose' as const : 'location' as const,
    purpose: get('purpose'), fscope: get('fscope'), git: get('git'), recent: get('recent') === '1', cell: get('cell'),
  }
}
export type SettingsState = ReturnType<typeof readSettingsUrl>
export function nextSettings(state: SettingsState, patch: Partial<SettingsState>): SettingsState {
  if (!patch.view || patch.view === state.view) return { ...state, ...patch }
  const rows = (pivot: Pivot) => pivot === 'tool' || pivot === 'topic'
  return { ...state, ...(!(rows(state.view) && rows(patch.view)) && { tool: '', sec: '', row: '' }),
    scope: '', group: 'location', purpose: '', fscope: '', git: '', recent: false, cell: '', ...patch }
}
export function settingsParams(state: SettingsState, local: boolean) {
  return { pivot: state.view === 'tool' ? null : state.view, tool: state.tool || null,
    sec: state.sec || null, row: state.row || null, ...(local && { scope: state.scope || null }),
    unset: state.unset ? '1' : null, group: state.group === 'purpose' ? 'purpose' : null,
    purpose: state.purpose || null, fscope: state.fscope || null, git: state.git || null,
    recent: state.recent ? '1' : null, cell: state.cell || null }
}
export const listOf = (value: string) => value.split(',').filter(Boolean)
export function toggleIn(value: string, key: string) {
  return (listOf(value).includes(key) ? listOf(value).filter(item => item !== key) : [...listOf(value), key]).join(',')
}
