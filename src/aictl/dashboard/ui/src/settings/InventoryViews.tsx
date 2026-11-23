import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { Meter } from '../ui/Meter'
import { PanelState } from '../ui/PanelState'
import { Segmented } from '../ui/Segmented'
import { Table } from '../ui/Table'
import type { Field } from '../ui/tableModel'
import {
  basename, fileCounts, findingTools, folderOf, gitCategory, GIT_STATES, groupBy, isRecent, listOf, locationLabel, LOCATIONS,
  matches, MISSING, purposeLabel, PURPOSES, scopeLabel, SEVERITIES, title, toggleIn, type ConfigFile, type Finding,
} from './model'
import type { Workspace } from './workspaceState'
import styles from './Settings.module.css'

type Facet = 'sec' | 'tool' | 'purpose' | 'fscope' | 'git'
function passesFacet(value: string, key?: string | null) {
  return !value || (key != null && listOf(value).includes(key))
}
function fileMatches(file: ConfigFile, w: Workspace) {
  const state = w.state()
  const [purpose, location] = state.cell.split(':')
  return matches(w.query(), file.name, file.path, file.kind, file.rows.map(row => row.label))
    && passesFacet(state.sec, file.location)
    && passesFacet(state.purpose, file.kind)
    && passesFacet(state.fscope, file.scope)
    && passesFacet(state.git, gitCategory(file))
    && (!state.tool || file.tools.some(tool => passesFacet(state.tool, tool)))
    && (!state.recent || isRecent(file, w.ctx.startedAt))
    && (!state.cell || (file.kind === purpose && file.location === location))
}

function FacetControl(props: { w: Workspace; field: Facet; label: string; options: ReadonlyArray<readonly [string, string]> }) {
  const chosen = () => listOf(props.w.state()[props.field])
  return <div class={styles.controls}>
    <label class={styles.control}>{props.label}
      <select value="" onChange={event => {
        const key = event.currentTarget.value
        if (key) props.w.change({ [props.field]: toggleIn(props.w.state()[props.field], key), row: '' })
        event.currentTarget.value = ''
      }}>
        <option value="">All</option>
        <For each={props.options} keyed={item => item[0]}>{item =>
          <option value={item()[0]} disabled={chosen().includes(item()[0])}>{item()[1]}</option>}</For>
      </select>
    </label>
    <For each={chosen()} keyed={key => key}>{key =>
      <button type="button" aria-label={`Clear ${props.label}: ${props.options.find(item => item[0] === key())?.[1] ?? key()}`}
        onClick={() => props.w.change({ [props.field]: toggleIn(props.w.state()[props.field], key()), row: '' })}>
        {props.options.find(item => item[0] === key())?.[1] ?? key()} ×
      </button>}
    </For>
  </div>
}

type FileTreeItem = {
  id: string; label: string; level: number; count?: number; toggle?: boolean; expanded?: boolean; file?: ConfigFile
}
const fileFields: Field<FileTreeItem>[] = [
  { id: 'name', label: 'Name', read: row => `${'  '.repeat(row.level)}${row.label}`, sortable: false },
  { id: 'purpose', label: 'Purpose', read: row => row.file ? purposeLabel(row.file.kind) : 'Group', sortable: false },
  { id: 'scope', label: 'Scope', read: row => row.file ? scopeLabel(row.file.scope) : '—', sortable: false },
  { id: 'git', label: 'Git', read: row => row.file ? row.file.git_state : '—', sortable: false },
  { id: 'bytes', label: 'Bytes', read: row => row.file ? row.file.bytes ?? undefined : '—', sortable: false },
  { id: 'count', label: 'Items', read: row => row.count ?? (row.file ? fileCounts(row.file).text : undefined), sortable: false },
]

export function FilesView(props: { w: Workspace }) {
  const w = untrack(() => props.w)
  const read = w.fileDetail
  const [folds, setFolds] = createSignal<Record<string, boolean>>({})
  const [summary, setSummary] = createSignal(false)
  const countBy = (key: (file: ConfigFile) => string) => groupBy(w.files(), key)
  const observed = createMemo(() => w.files().filter(file => fileMatches(file, w)))
  const allTools = createMemo(() => [...new Set(w.files().flatMap(file => file.tools))])
  const scopes = createMemo(() => [...new Set(w.files().flatMap(file => file.scope ? [file.scope] : []))])
  const counts = createMemo(() => countBy(file => `${file.kind}:${file.location}`))
  const tree = createMemo(() => {
    const out: FileTreeItem[] = []
    const byPurpose = w.state().group === 'purpose'
    const keyOf = (file: ConfigFile) => file.exists === false ? 'missing' : file.is_dir ? 'watched'
      : (byPurpose ? file.kind : file.location) || 'unreported'
    const groups = groupBy(observed(), keyOf)
    const ordered = [...groups.keys()].sort((a, b) => Number(a === 'missing') - Number(b === 'missing') ||
      Number(a === 'watched') - Number(b === 'watched') || a.localeCompare(b))
    for (const key of ordered) {
      const files = groups.get(key)!
      const id = `${w.state().group}:${key}`
      const expanded = folds()[id] ?? (key !== 'missing')
      const label = key === 'missing' ? 'Absent managed locations' : key === 'watched' ? 'Watched folders'
        : key === 'unreported' ? 'Details not reported' : byPurpose ? purposeLabel(key) : locationLabel(key)
      out.push({ id, label, level: 0, count: files.length, toggle: true, expanded })
      if (!expanded) continue
      const folders = groupBy(files, file => folderOf(file.path))
      for (const [path, items] of folders) {
        const folderId = `${id}\u0001${path}`
        const folderOpen = folds()[folderId] ?? (files.length <= 8 || !!w.query() || !!w.state().row)
        if (key !== 'watched' && key !== 'missing') out.push({
          id: folderId, label: path, level: 1, count: items.length, toggle: true, expanded: folderOpen,
        })
        if (folderOpen || key === 'watched' || key === 'missing') for (const file of items) {
          out.push({ id: file.path, label: file.name, level: 2, file })
        }
      }
    }
    return out
  })
  return <section aria-label="Files" class={styles.stack}>
    <div class={styles.controls}>
      <Segmented label="Group files by" options={[{ id: 'location', label: 'Location' }, { id: 'purpose', label: 'Purpose' }]}
        value={w.state().group} onChange={group => w.change({ group: group === 'purpose' ? 'purpose' : 'location' })} />
      <FacetControl w={w} field="sec" label="Location filter" options={LOCATIONS} />
      <FacetControl w={w} field="tool" label="Read by" options={allTools().map(id => [id, w.label(id)])} />
      <FacetControl w={w} field="purpose" label="Purpose filter" options={PURPOSES} />
      <FacetControl w={w} field="fscope" label="Scope filter" options={scopes().map(id => [id, scopeLabel(id)])} />
      <FacetControl w={w} field="git" label="Git filter" options={GIT_STATES} />
      <button type="button" aria-pressed={w.state().recent ? 'true' : 'false'} onClick={() => w.change({ recent: !w.state().recent, row: '' })}>
        Changed in 24 h
      </button>
      <Show when={w.state().cell}><button type="button" onClick={() => w.change({ cell: '', row: '' })}>Clear matrix filter ×</button></Show>
    </div>
    <Show when={read()?.status === 'loading'}><PanelState inline state="loading" message="Loading file details…" /></Show>
    <Show when={read()?.status === 'error'}><PanelState inline state="error" message="File details could not be loaded."
      onRetry={read.retry} /></Show>
    <Show when={read()?.status === 'refreshing' || read()?.status === 'stale'}>
      <PanelState inline state="stale" message="Showing earlier file details." onRetry={read()?.status === 'stale' ? read.retry : undefined} />
    </Show>
    <Show when={read()?.status === 'ready' && !Array.isArray(read()?.data?.files)}>
      <PanelState inline state="unavailable" message="File details are not available from this source." />
    </Show>
    <Show when={allTools().length}><div class={styles.metrics}>
      <For each={allTools()} keyed={tool => tool}>{tool =>
        <Meter label={`${w.label(tool())} files`} value={w.files().filter(file => file.tools.includes(tool())).length}
          max={w.files().length} compact />}
      </For>
    </div></Show>
    <details onToggle={event => setSummary(event.currentTarget.open)}>
      <summary>Files by purpose and location</summary>
      <Show when={summary()}><div class={styles.stack}>
        <For each={PURPOSES}>{purpose => {
          const visible = () => LOCATIONS.filter(location => counts().has(`${purpose[0]}:${location[0]}`))
          return <Show when={visible().length}>
            <section aria-label={purpose[1]} class={styles.controls}>
              <strong>{purpose[1]}</strong>
              <For each={visible()}>{location => {
                const key = `${purpose[0]}:${location[0]}`
                return <button type="button" aria-pressed={w.state().cell === key ? 'true' : 'false'}
                  aria-label={`${purpose[1]} in ${location[1]}`}
                  onClick={() => w.change({ cell: w.state().cell === key ? '' : key, row: '' })}>
                  {location[1]} <b>{counts().get(key)?.length}</b>
                </button>
              }}</For>
            </section>
          </Show>
        }}</For>
      </div></Show>
    </details>
    <Show when={tree().length} fallback={<Show when={Array.isArray(read()?.data?.files)}>
      <PanelState inline state="empty" message="No matching files." /></Show>}>
      <Table label="Settings files" fields={fileFields} rows={tree()} rowId={row => row.id}
        action={{ label: row => row.toggle ? `${row.expanded ? 'Collapse' : 'Expand'} ${row.label}` : `Inspect ${row.label}`,
          run: row => row.toggle ? setFolds(current => ({ ...current, [row.id]: !row.expanded }))
            : w.select({ row: row.file?.path }) }} />
    </Show>
  </section>
}

type FindingRow = { id: string; finding?: Finding; label: string; severity?: string; count?: number; expanded?: boolean }
export function FindingsView(props: { w: Workspace }) {
  const w = untrack(() => props.w)
  const [folds, setFolds] = createSignal<Record<string, boolean>>({})
  const results = () => w.findings()
  const bySeverity = createMemo(() => groupBy(results() ?? [], row => row.severity ?? ''))
  const groups = createMemo(() => groupBy(results() ?? [], row => row.rule || 'other'))
  const rows = createMemo(() => {
    const out: FindingRow[] = []
    const rank = (severity?: string) => {
      const index = SEVERITIES.findIndex(s => s === severity)
      return index < 0 ? SEVERITIES.length : index
    }
    const ordered = [...groups()].map(([key, group]) => [key, [...group].sort((a, b) => rank(a.severity) - rank(b.severity))] as const)
      .sort((a, b) => rank(a[1][0].severity) - rank(b[1][0].severity) || b[1].length - a[1].length)
    for (const [key, group] of ordered) {
      if (w.state().sec && w.state().sec !== key) continue
      const matching = group.filter(item => matches(w.query(), item.rule, item.path, item.why, item.action, findingTools(item)))
      if (!matching.length) continue
      const expanded = folds()[key] ?? (matching.length <= 5 || !!w.state().sec || !!w.query())
      out.push({ id: key, label: title(key), count: matching.length, expanded, severity: matching[0].severity })
      if (expanded) for (const finding of matching) out.push({
        id: finding.id, finding, label: finding.path ? `  ${basename(finding.path) || finding.path}` : '  Finding',
        severity: finding.severity,
      })
    }
    return out
  })
  const fields = ([
    { id: 'rule', label: 'Rule or source', read: row => row.label },
    { id: 'severity', label: 'Severity', read: row => row.severity },
    { id: 'count', label: 'Findings', read: row => row.count ?? '—' },
    { id: 'tools', label: 'Tools', read: row => row.finding ? findingTools(row.finding).map(w.label).join(', ') || MISSING : '—' },
    { id: 'line', label: 'Line', read: row => row.finding?.line ? row.finding.line : '—' },
  ] satisfies Field<FindingRow>[]).map(field => ({ ...field, sortable: false }))
  const partial = () => [...(w.scan().audit?.incomplete ?? []), ...(w.scan().audit?.failed_steps ?? [])]
  return <section aria-label="Findings" class={styles.stack}>
    <div class={styles.controls}>
      <button type="button" disabled={w.scan().pending} onClick={w.rescan}>{w.scan().pending ? 'Scanning…' : 'Rescan'}</button>
      <Show when={groups().size}>
        <label class={styles.control}>Finding rule
          <select value={w.state().sec} onChange={event => w.change({ sec: event.currentTarget.value, row: '' })}>
            <option value="">All rules</option>
            <For each={[...groups().keys()]} keyed={key => key}>{rule =>
              <option value={rule()}>{title(rule())} ({groups().get(rule())?.length})</option>}
            </For>
          </select>
        </label>
      </Show>
    </div>
    <Show when={w.scan().pending || (!w.scan().error && !results())}>
      <PanelState inline state={results() ? 'stale' : 'loading'}
        message={w.scan().progress?.step ? `Scanning: ${w.scan().progress?.step}` : 'Scanning for findings…'} />
    </Show>
    <Show when={w.scan().error}>{error =>
      <PanelState inline state={results() ? 'stale' : 'error'} message={error()} onRetry={w.rescan} />}
    </Show>
    <Show when={partial().length}><PanelState inline state="stale" message={`Partial scan: ${partial().join(', ')}`} /></Show>
    <Show when={results()}>
      <div class={styles.metrics}>
        <For each={SEVERITIES}>{severity => <Meter label={`${title(severity)} severity`}
          value={bySeverity().get(severity)?.length ?? 0} max={results()?.length}
          tone={severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'neutral'} compact />}</For>
      </div>
      <Show when={rows().length} fallback={<PanelState inline state="empty" message="No matching findings." />}>
        <Table label="Policy findings" rows={rows()} fields={fields} rowId={row => row.id}
          action={{ label: row => row.finding ? `Inspect ${row.label.trim()}` : `${row.expanded ? 'Collapse' : 'Expand'} ${row.label}`,
            run: row => row.finding ? w.select({ row: row.finding.id })
              : setFolds(current => ({ ...current, [row.id]: !row.expanded })) }} />
      </Show>
    </Show>
  </section>
}
