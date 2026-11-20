import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { Meter, type MeterTone } from '../ui/Meter'
import { PanelState } from '../ui/PanelState'
import { Stat } from '../ui/Stat'
import { Table } from '../ui/Table'
import { Tabs } from '../ui/Tabs'
import type { Field } from '../ui/tableModel'
import {
  DASH, MISSING, agentInherits, basename, envName, matches, pinWins, rowValue, samePath, scopeLabel, title, topicMatrix,
  type Comparison, type Entry, type Environment, type Setting,
} from './model'
import { derivePermissions } from './permissions'
import type { Workspace } from './workspaceState'
import styles from './Settings.module.css'

const settingsFields: Field<Setting>[] = [
  { id: 'key', label: 'Setting', read: row => row.label },
  { id: 'value', label: 'Configured value', read: row => typeof row.value === 'number' ? row.value : rowValue(row, true) },
  { id: 'state', label: 'State', read: row => [row.locked && 'Locked', row.risky && 'Risky', row.unset && 'Unset',
    row.undocumented && 'Undocumented'].filter(Boolean).join(' · ') || DASH },
  { id: 'scope', label: 'Scope', read: row => scopeLabel(row.scope) },
  { id: 'source', label: 'Set in', read: row => row.source
    ? `${envName(row.source) || basename(row.source)}${row.line ? `:${row.line}` : ''}` : row.scope === 'default' ? 'Default' : undefined },
]
const agentFields: Field<Setting>[] = [
  { id: 'name', label: 'Agent definition', read: row => row.agent?.name || row.label },
  { id: 'tool', label: 'Tool', read: row => row.tool },
  { id: 'model', label: 'Model', read: row => rowValue(row) },
  { id: 'policy', label: 'Model decision', read: row => agentInherits(row) ? 'Inherited'
    : pinWins(row) ? 'Pinned' : row.agent?.model_policy === 'required' ? 'Required' : row.agent?.model },
  { id: 'tools', label: 'Available tools', read: row => row.agent?.tools?.length },
  { id: 'scope', label: 'Scope', read: row => scopeLabel(row.agent?.scope_defined || row.scope) },
  { id: 'source', label: 'Definition', read: row => basename(row.agent?.defined_in) || undefined },
]
const envFields: Field<Environment>[] = [
  { id: 'name', label: 'Name', read: row => row.name },
  { id: 'value', label: 'Value', read: environmentValue },
  { id: 'origin', label: 'Origin', read: row => [
    row.in_process === true ? 'Process' : '', ...(row.persisted ?? []).map(item => item.origin),
  ].filter(Boolean).join(' · ') || undefined },
  { id: 'drives', label: 'Driven settings', read: row => row.drives?.length },
]
export function environmentValue(env: Environment) {
  if (env.masked !== false) return env.masked ? 'Masked' : env.set === false ? 'Unset' : undefined
  if (env.set === false) return 'Unset'
  return env.value === '' ? 'Empty string' : env.value
}

function Rows(props: { w: Workspace; rows: Setting[]; agents?: boolean; label: string }) {
  return <Table label={props.label} fields={props.agents ? agentFields : settingsFields} rows={props.rows}
    rowId={row => row.uid} action={{ label: row => `Inspect ${row.label}`, run: props.w.selectSetting }} />
}

export function ToolView(props: { w: Workspace }) {
  const w = untrack(() => props.w)
  const tools = () => [...w.entries(), ...(w.aictl() ? [{ id: 'aictl', label: 'aictl' }] : [])]
  return <section aria-label="By tool" class={styles.stack}>
    <Show when={tools().length} fallback={<PanelState state="empty" message="No tool settings to show." />}>
      <label class={styles.control}>Tool
        <select value={w.tool()} onChange={event => w.change({ tool: event.currentTarget.value, sec: '', scope: '', row: '' })}>
          <For each={tools()} keyed={tool => tool.id}>{tool => <option value={tool().id}>{tool().label}</option>}</For>
        </select>
      </label>
      <Show when={w.tool() === 'aictl'}><CollectorView w={w} /></Show>
      <Show when={w.entry()}>{entry => <ToolSections w={w} entry={entry()} />}</Show>
    </Show>
  </section>
}

function ToolSections(props: { w: Workspace; entry: Entry }) {
  const w = untrack(() => props.w)
  const rows = () => props.entry.rows.filter(row => w.pass()(row) && (!w.state().scope || row.scope === w.state().scope) &&
    (!w.fileSource() || samePath(row.source, w.fileSource()) || row.chain.some(layer => samePath(layer.source, w.fileSource()))))
  const showUnset = createMemo(() => w.state().unset)
  const items = createMemo(() => [
    ...props.entry.sections.filter(sec => showUnset() || sec.rows.some(row => !row.unset))
      .map(sec => ({ id: sec.id, label: sec.title, content: () => <>
        <Show when={sec.id === 'autonomy'}><PermissionView entries={[props.entry]} w={w} /></Show>
        <Show when={sec.id === 'hooks'}><HookView w={w} id={props.entry.id} /></Show>
        <Rows w={w} label={`${props.entry.label} ${sec.title}`} rows={rows().filter(row => row.sec === sec.id)}
          agents={sec.id === 'agents'} />
      </> })),
    ...(props.entry.envVars.length ? [{ id: 'env', label: 'Environment variables', content: () => <EnvironmentView w={w} entry={props.entry} /> }] : []),
  ])
  const active = () => items().some(item => item.id === w.section()) ? w.section() : items()[0]?.id ?? ''
  const [sources, setSources] = createSignal(false)
  return <>
    <div class={styles.controls}>
      <For each={props.entry.scopes} keyed={scope => scope.id}>{scope =>
        <button type="button" aria-pressed={w.state().scope === scope().id ? 'true' : 'false'}
          onClick={() => w.change({ scope: w.state().scope === scope().id ? '' : scope().id, row: '' })}>
          {scopeLabel(scope().id, props.entry.scopes)}
          {scope().changeable === false && ' · Locked'}{scope().exists === false && ' · Not present'}
          {!!scope().vars?.length && ` · ${scope().vars!.length}`}
        </button>}
      </For>
      <Show when={w.fileSource()}><button type="button" onClick={() => w.setFileSource('')}>Clear source filter</button></Show>
    </div>
    <Show when={items().length} fallback={<PanelState state="unavailable" message="No settings sections reported." />}>
      <Tabs label="Tool sections" items={items()} value={active()} onChange={sec => w.change({ sec, row: '' })} />
    </Show>
    <Show when={props.entry.files.length}>
      <details onToggle={event => setSources(event.currentTarget.open)}>
        <summary>Configuration sources ({props.entry.files.length})</summary>
        <Show when={sources()}><SourceTable w={w} entry={props.entry} /></Show>
      </details>
    </Show>
    <Show when={props.entry.hints?.length}><details><summary>Configuration notes</summary>
      <ul><For each={props.entry.hints}>{hint => <li>{hint}</li>}</For></ul>
    </details></Show>
  </>
}

function SourceTable(props: { w: Workspace; entry: Entry }) {
  const rows = () => props.entry.files.map(path => ({ path, count: props.entry.rows.filter(row => samePath(row.source, path)).length }))
  const max = () => props.entry.rows.length
  return <div class={styles.stack}>
    <Meter label={`${props.entry.label} configuration files`} value={props.entry.files.length} max={Math.max(props.entry.files.length, max())}
      display={String(props.entry.files.length)} compact />
    <Table label="Configuration sources" rows={rows()} rowId={row => row.path}
      fields={[{ id: 'path', label: 'Path', read: row => row.path }, { id: 'count', label: 'Settings', read: row => row.count }]}
      action={{ label: row => `Filter by ${basename(row.path)}`, run: row => {
        const sec = props.entry.rows.find(setting => samePath(setting.source, row.path))?.sec
        if (sec) props.w.change({ sec, scope: '', row: '' })
        props.w.setFileSource(row.path)
      } }} />
    <Show when={props.w.fileSource()}>{path =>
      <button type="button" onClick={() => props.w.openSource(path())}>Open source file</button>}
    </Show>
  </div>
}

function EnvironmentView(props: { w: Workspace; entry: Entry }) {
  const rows = () => props.entry.envVars.filter(row => (props.w.state().unset || row.set !== false) &&
    matches(props.w.query(), row.name, row.label, row.description, environmentValue(row), row.drives?.map(drive => drive.label)))
  return <div class={styles.stack}>
    <div class={styles.stats}>
      <Stat label="Set variables" value={props.entry.envVars.filter(row => row.set === true).length} />
      <Stat label="Masked variables" value={props.entry.envVars.filter(row => row.masked).length} />
    </div>
    <Table label="Environment variables" fields={envFields} rows={rows()} rowId={row => row.uid}
      action={{ label: row => `Inspect ${row.name}`, run: row => props.w.selectEnvironment(row.name, row.tool) }} />
  </div>
}

export function TopicView(props: { w: Workspace }) {
  const w = untrack(() => props.w)
  const sections = () => {
    const all = w.entries().flatMap(entry => entry.sections)
    return [...new Map(all.map(sec => [sec.id, sec.title]))]
  }
  const active = () => sections().some(([id]) => id === w.state().sec) ? w.state().sec : sections()[0]?.[0] ?? ''
  return <section aria-label="By topic" class={styles.stack}>
    <Show when={sections().length} fallback={<PanelState state="empty" message="No topics reported by the selected tools." />}>
      <Tabs label="Topics" value={active()} onChange={sec => w.change({ sec, row: '' })}
        items={sections().map(([id, label]) => ({ id, label, content: () => <TopicSection w={w} sec={id} label={label} /> }))} />
    </Show>
  </section>
}

function TopicSection(props: { w: Workspace; sec: string; label: string }) {
  const w = untrack(() => props.w)
  const matrix = createMemo(() => topicMatrix(w.entries(), props.sec, w.pass()))
  const [picked, setPicked] = createSignal('')
  const selected = () => matrix().rows.find(row => row.id === picked())
  let chooser: HTMLElement | undefined
  return <div class={styles.stack}>
    <Show when={props.sec === 'autonomy'}><PermissionView entries={w.entries()} w={w} /></Show>
    <Show when={props.sec !== 'agents'} fallback={
      <Rows w={w} label="Agent definitions by tool" agents rows={w.entries().flatMap(entry => entry.rows.filter(row =>
        row.sec === 'agents' && w.pass()(row)))} />}>
      <Table label={`${props.label} comparison`} rows={matrix().rows} rowId={row => row.id}
        fields={[{ id: 'label', label: 'Setting', read: row => row.label }, ...matrix().tools.map(tool => ({
          id: tool.id, label: tool.label, read: (row: Comparison) => {
            const cell = row.cells.get(tool.id)
            return cell ? rowValue(cell, true) : DASH
          },
        }))]}
        action={{ label: row => `Compare ${row.label}`, run: row => {
          if (row.cells.size === 1) { w.selectSetting(row.cells.values().next().value!); return }
          setPicked(row.id)
          queueMicrotask(() => chooser?.querySelector('button')?.focus())
        } }} />
      <Show when={selected()}>{row =>
        <section ref={chooser} class={styles.controls} aria-label={`Inspect ${row().label} by tool`}>
          <For each={[...row().cells.values()]} keyed={cell => cell.uid}>{cell =>
            <button type="button" onClick={() => w.selectSetting(cell())}
              aria-label={`Inspect ${row().label} for ${w.label(cell().tool)}`}>
              {w.label(cell().tool)} · {rowValue(cell(), true)}
            </button>}
          </For>
        </section>}
      </Show>
    </Show>
  </div>
}

type Permission = NonNullable<ReturnType<typeof derivePermissions>>
const tones: Record<Permission['cells'][number]['state'], MeterTone> = {
  allowed: 'danger', denied: 'positive', asks: 'warning', mixed: 'neutral',
}
function PermissionView(props: { entries: Entry[]; w: Workspace }) {
  const matrices = () => props.entries.flatMap(entry => {
    const data = derivePermissions(entry)
    return data ? [{ entry, data }] : []
  })
  return <Show when={matrices().length} fallback={<PanelState inline state="unavailable" message="No permission matrix reported." />}>
    <section class={styles.stack} aria-label="Autonomy matrix">
      <h3>Autonomy matrix</h3>
      <For each={matrices()} keyed={row => row.entry.id}>{row =>
        <section class={styles.stack} aria-label={`${row().entry.label} permissions`}>
          <h4>{row().entry.label}</h4>
          <div class={styles.metrics}>
            <For each={Object.keys(tones) as Array<keyof typeof tones>}>{state => {
              const count = () => row().data.cells.filter(cell => cell.state === state).length
              return <Meter label={title(state)} value={count()} max={row().data.cells.length}
                display={`${count()} / ${row().data.cells.length}`} tone={tones[state]} compact />
            }}</For>
          </div>
          <div class={styles.controls}>
            <For each={row().data.cells} keyed={cell => cell.cap}>{cell => {
              const setting = () => row().entry.rows.find(item => item.key === cell().key)
              return <button type="button" data-tone={tones[cell().state]} title={cell().title}
                disabled={!setting()} onClick={() => { const item = setting(); if (item) props.w.selectSetting(item) }}>
                {cell().label}: {title(cell().text)}{setting()?.locked ? ' · Locked' : ''}
              </button>
            }}</For>
          </div>
          <Show when={row().data.notes.length}><p>{row().data.notes.join(' · ')}</p></Show>
        </section>}
      </For>
    </section>
  </Show>
}

function HookView(props: { w: Workspace; id: string }) {
  const res = untrack(() => props.w.hookStatus)
  const tool = () => res()?.data?.tools?.[props.id]
  const [expanded, setExpanded] = createSignal(false)
  return <section class={styles.stack} aria-label="Hook registration">
    <Show when={tool()} fallback={<PanelState inline state={res()?.status === 'loading' ? 'loading' : 'unavailable'}
      message={res()?.status === 'loading' ? 'Loading hook registration…' : undefined} />}>{hook => <>
        <Show when={res()?.status === 'stale' || res()?.status === 'refreshing'}><PanelState inline state="stale" /></Show>
        <div class={styles.metrics}>
          <Stat label="Hook registration" value={hook().configured == null ? undefined : hook().configured ? 'Registered' : 'Not registered'} />
          <Meter label="Configured hook events" value={hook().configured_events?.length}
            max={(hook().configured_events?.length ?? 0) + (hook().missing_events?.length ?? 0)}
            tone={hook().configured ? 'positive' : 'warning'} compact />
          <Stat label="Fired in 24 h" value={hook().fired_24h} />
        </div>
        <details onToggle={event => setExpanded(event.currentTarget.open)}><summary>Hook events and sources</summary>
          <Show when={expanded()}>
          <p>Configured: {hook().configured_events?.join(', ') || (hook().configured_events ? 'None' : MISSING)}</p>
          <p>Missing: {hook().missing_events?.join(', ') || (hook().missing_events ? 'None' : MISSING)}</p>
          <p>Last fire: {hook().last_fire_ts == null ? MISSING : new Date(hook().last_fire_ts! * 1000).toLocaleString()}</p>
          <For each={hook().warnings} keyed={warning => warning}>{warning => <p>{
            String(warning().message ?? warning().detail ?? warning().kind ?? MISSING)}</p>}</For>
          <Table label="Hook sources" rows={hook().sources ?? []} rowId={source => `${source.scope}\u0001${source.path}`}
            fields={[{ id: 'path', label: 'Path', read: row => row.path }, { id: 'scope', label: 'Scope', read: row => row.scope },
              { id: 'events', label: 'Configured events', read: row => row.configured_count }]}
            action={{ label: row => row.exists ? `Open ${basename(row.path)}` : '', run: row => props.w.openSource(row.path) }} />
          </Show>
        </details>
    </>}</Show>
  </section>
}

function CollectorView(props: { w: Workspace }) {
  const w = untrack(() => props.w)
  const collectors = () => Object.entries(w.monitor()?.diagnostics ?? {}).map(([name, value]) => {
    const detail = value && typeof value === 'object' && !Array.isArray(value) ? value : undefined
    return { name, mode: typeof detail?.mode === 'string' ? detail.mode : undefined,
      status: typeof detail?.status === 'string' ? detail.status : undefined,
      detail: typeof detail?.detail === 'string' ? detail.detail : undefined }
  })
  const roots = () => [...new Set([...(w.monitor()?.workspace_paths ?? []), ...(w.monitor()?.state_paths ?? [])])]
  return <div class={styles.stack}>
    <div class={styles.stats}><Stat label="Collectors" value={collectors().length} /><Stat label="Watched folders" value={roots().length} /></div>
    <Table label="Collectors" rows={collectors().filter(row => matches(w.query(), row.name, row.mode, row.status))}
      rowId={row => row.name} fields={[{ id: 'name', label: 'Collector', read: row => row.name },
        { id: 'mode', label: 'Mode', read: row => row.mode }, { id: 'status', label: 'Status', read: row => row.status },
        { id: 'detail', label: 'Detail', read: row => row.detail }]} />
    <Table label="Watched folders" rows={roots().filter(path => matches(w.query(), path)).map(path => ({ path }))}
      rowId={row => row.path} fields={[{ id: 'path', label: 'Folder', read: row => row.path }]} />
  </div>
}
