import { createMemo, createSignal, For, onCleanup, Show, untrack } from 'solid-js'
import type { DetailContextAudit, DetailEffectiveModels, DetailHooksStatus, DetailOtelStatus } from '../../../data/contract.gen'
import { createResourceCache } from '../../../data/resource'
import { PanelState } from '../../../ui/PanelState'
import { isToolSelected } from '../../../data/toolScope'
import { json } from '../../data'
import type { PanelProps, Read, Row } from '../../types'
import { Bars, bins, severityLabel, severityTone, StatStrip, usable } from '../Summary'
import { buildFindings, buildSettings } from './findings'
import { DataTable, detailRead, identity, rowsFrom, styles, text, toolName, useCached, View, type Entry } from './View'

const auditCache = createResourceCache<string, DetailContextAudit>({
  load: (path, signal) => json(path, { signal }),
})

function useSources(ctx: PanelProps['ctx']) {
  const [poll, setPoll] = createSignal(0)
  const local = () => ctx.scope() === 'local'
  const project = () => ctx.filters().project
  const path = createMemo(() => {
    if (!local()) return
    const query = new URLSearchParams({ nowait: '1' })
    if (project() !== 'all') query.set('project', project())
    return `/api/context-audit?${query}`
  })
  const audit = useCached(auditCache, path, () => poll() + ctx.revision())
  const hooks = ctx.detail<DetailHooksStatus>(() => local() ? '/api/hooks-status' : undefined)
  const otel = ctx.detail<DetailOtelStatus>(() => local() ? '/api/otel-status' : undefined)
  const effective = ctx.detail<DetailEffectiveModels>(() => local() ? '/api/effective-models' : undefined)
  const progress = () => {
    const value = audit()?.data
    return value && 'status' in value && value.status === 'scanning' ? value : undefined
  }
  // Shared audit reads keep one poll active, even if both panels are visible.
  const advance = () => { if (!ctx.paused()) setPoll(n => n + 1) }
  const results = () => {
    const value = audit()?.data
    return {
      audit: value && 'findings' in value ? value : undefined,
      hooks: hooks()?.data, otel: otel()?.data, effective: effective()?.data,
    }
  }
  const state = (hasValues: boolean): Read => {
    if (!local()) return { state: 'unavailable', message: 'Local settings are not available from this source.' }
    const r = results()
    const reads = [detailRead(audit(), r.audit, ctx.paused()), detailRead(hooks(), r.hooks, ctx.paused()),
      detailRead(otel(), r.otel, ctx.paused()), detailRead(effective(), r.effective, ctx.paused())]
    const problem = reads.find(read => read.state === 'error' || read.state === 'unavailable')
    const pending = progress() || reads.some(read => read.state === 'loading')
    const partial = r.audit?.incomplete?.length || r.audit?.failed_steps?.length
    if (hasValues || r.audit || r.effective || r.hooks || r.otel) {
      if (problem || pending || partial || reads.some(read => read.state === 'stale')) {
        return { state: 'stale', message: 'Not all settings sources are current or available.' }
      }
      return { state: hasValues ? 'ready' : 'empty' }
    }
    if (pending) return { state: 'loading', message: progress() ? `Reading the settings: ${progress()?.step}` : undefined }
    return problem ?? { state: 'unavailable' }
  }
  return { results, state, progress, advance }
}

function ScanProgress(props: { scan: ReturnType<typeof useSources> }) {
  return <Show when={props.scan.progress()}>{progress => <Poll step={progress().step} advance={props.scan.advance} />}</Show>
}

function Poll(props: { step: string; advance: () => void }) {
  // The detail resource cancels in-flight reads when the panel hides.
  const [enabled, setEnabled] = createSignal(true)
  let attempts = 0
  const timer = setInterval(() => {
    if (++attempts < 120) props.advance()
    else { clearInterval(timer); setEnabled(false) }
  }, 1000)
  onCleanup(() => clearInterval(timer))
  return <PanelState state={enabled() ? 'loading' : 'error'} inline
    message={enabled() ? `Reading the settings: ${props.step}` : `The scan has not finished: ${props.step}`} />
}

export function Findings(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const scan = useSources(ctx)
  const data = createMemo(() => buildFindings({ ...scan.results(), tools: ctx.tools() }))
  const result = () => scan.state(Boolean(data().length))
  const reported = () => usable(result()) && (data().length || result().state === 'empty') ? data() : undefined
  const severity = createMemo(() => reported() && bins(reported()!.map(row => row.severity), severityLabel, severityTone))
  const groups = createMemo(() => {
    const grouped = new Map<string, ReturnType<typeof data>>()
    for (const item of data()) {
      const list = grouped.get(item.what)
      if (list) list.push(item)
      else grouped.set(item.what, [item])
    }
    return [...grouped.entries()]
  })
  const [open, setOpen] = createSignal(new Set<string>())
  const rows = createMemo(() => rowsFrom(groups().flatMap(([what, items]) => items.length < 3 || open().has(what)
    ? items.length < 3 ? items : [{ id: identity('group', what), what, effect: `${items.length} places`, fix: 'Fold places', group: true }, ...items]
    : [{ id: identity('group', what), what, effect: `${items.length} places`, fix: `Show ${items.length} places`, group: true }]) as Row[],
  row => String(row.id)))
  const toggle = (what: string) => setOpen(current => {
    const next = new Set(current)
    if (next.has(what)) next.delete(what)
    else next.add(what)
    return next
  })
  const apply = ({ row }: Entry) => {
    if (row.group && typeof row.what === 'string') { toggle(row.what); return }
    const command = text(row.command), action = text(row.action), path = text(row.path)
    if (command && action) {
      ctx.runCommand({ title: String(row.fix), lead: String(row.lead), command, action, done: String(row.done) })
    } else if (path) ctx.openDetail({ type: 'file', path, line: typeof row.line === 'number' && row.line > 0 ? row.line : undefined })
  }
  return <div class={styles.stack}>
    <StatStrip label="Findings summary" items={[{ label: 'Open findings', value: reported()?.length }]} />
    <Bars label="Findings by severity" items={severity()} max={reported()?.length} />
    <ScanProgress scan={scan} />
    <Show when={ctx.scope() === 'local'}>
      <div class={styles.actions}><button type="button" onClick={() => ctx.openDetail({ type: 'hidden' })}>See every source</button></div>
    </Show>
    <View result={result} retry={ctx.refresh} empty={def.empty} reserveStaleSpace>
      <Show when={rows().length}><DataTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={{
        label: ({ row }) => row.group || row.command || row.path ? String(row.fix) : '',
        run: apply,
      }} /></Show>
      <Show when={scan.results().audit?.incomplete?.length}><p class={styles.note}>
        The scan did not finish these steps: {scan.results().audit?.incomplete.join(', ')}.</p></Show>
      <Show when={scan.results().audit?.failed_steps?.length}><p class={styles.note}>
        The scan could not read some sources.</p></Show>
    </View>
  </div>
}

export function Settings(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const scan = useSources(ctx)
  const tools = createMemo(() => [...new Set([...(ctx.board('options')?.tools ?? []).map(tool => tool.id),
    ...(ctx.board('sources') ?? []).map(source => source.tool),
    ...Object.keys(scan.results().effective ?? {}),
    ...Object.keys(scan.results().hooks?.tools ?? {}),
  ])].filter(id => id !== 'error' && isToolSelected(id, ctx.tools())))
  const settings = createMemo(() => buildSettings({ ...scan.results(), toolIds: tools() }))
  const rows = createMemo(() => rowsFrom(settings().rows.filter(row => tools().some(id => row.values[id])),
    row => identity(row.label)))
  const result = () => scan.state(Boolean(rows().length))
  const reported = () => usable(result()) && (rows().length || result().state === 'empty') ? rows() : undefined
  const byTool = createMemo(() => reported() && tools().map(id => ({
    id, label: toolName(ctx, id), value: reported()!.filter(({ row }) => row.values?.[id] != null).length,
  })).filter(item => item.value > 0).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id)))
  const [selected, setSelected] = createSignal<string>()
  const active = createMemo(() => settings().rows.find(row => identity(row.label) === selected()))
  const fields = createMemo(() => tools().map(id => ({
    id, label: toolName(ctx, id), read: ({ row }: Entry) => {
      const value = settings().rows.find(item => item.label === row.label)?.values[id]
      return value ? [value.v, value.sub].filter(Boolean).join(' · ') : undefined
    },
  })))
  return <div class={styles.stack}>
    <StatStrip label="Effective settings summary" items={[
      { label: 'Settings with values', value: reported()?.length },
      { label: 'Tools with values', value: byTool()?.length },
    ]} />
    <Bars label="Top tools by reported setting values" items={byTool()} />
    <div class={styles.actions}><button type="button" onClick={() => ctx.navigate({ screen: 'settings' })}>Open the Settings screen</button></div>
    <ScanProgress scan={scan} />
    <View result={result} retry={ctx.refresh} empty={def.empty} reserveStaleSpace>
      <Show when={settings().note}><p class={styles.note}>{settings().note}</p></Show>
      <Show when={active()}>{row => <div class={styles.actions} role="group" aria-label="Setting sources">
        <For each={tools().filter(id => row().values[id]?.path)}>{id =>
          <button type="button" onClick={() => {
            const value = row().values[id]
            if (value?.path) ctx.openDetail({ type: 'file', path: value.path, line: value.line ?? undefined })
          }}>Open {toolName(ctx, id)} setting source</button>}
        </For>
      </div>}</Show>
      <Show when={rows().length}>
        <DataTable ctx={ctx} label={def.title} columns={def.columns} fields={fields()} rows={rows()} action={{
          label: ({ row }) => tools().some(id => settings().rows.find(item => item.label === row.label)?.values[id]?.path)
            ? `Sources for ${row.label}` : '',
          run: ({ id }) => setSelected(value => value === id ? undefined : id),
        }} />
      </Show>
    </View>
  </div>
}

export function Coverage(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = () => ctx.read(def.sources[0])
  const options = () => ctx.board('options')?.tools
  const tools = createMemo(() => (options() ?? []).filter(tool => isToolSelected(tool.id, ctx.tools())))
  const coverage = () => ctx.board('coverage')
  const rows = createMemo(() => rowsFrom(coverage()?.rows ?? [], row => identity(row.key)))
  const byKey = createMemo(() => new Map((coverage()?.rows ?? []).map(row => [row.key, row.cells])))
  const fields = createMemo(() => tools().map(tool => ({
    id: tool.id, label: tool.label ?? toolName(ctx, tool.id), read: ({ row }: Entry) => {
      const cell = byKey().get(String(row.key))?.[tool.id]
      return cell ? [cell.state, cell.why].filter(Boolean).join(' · ') : undefined
    },
  })))
  const state = (): Read => {
    const read = result()
    if (read.state !== 'ready') return read
    if (!options()) return { state: 'unavailable' }
    return tools().length ? read : { state: 'empty' }
  }
  const reported = () => usable(state()) && Array.isArray(coverage()?.rows) && Array.isArray(options())
  const states = createMemo(() => reported() ? bins(coverage()!.rows.flatMap(row => tools().map(tool => row.cells?.[tool.id]?.state)),
    id => ({ exact: 'Exact', estimated: 'Estimated', absent: 'Absent', estimate: 'Estimated', missing: 'Missing' })[id] ?? id,
    id => id === 'exact' ? 'positive' : ['estimate', 'estimated'].includes(id) ? 'warning' : 'neutral') : undefined)
  return <div class={styles.stack}>
    <StatStrip label="Coverage summary" items={[
      { label: 'Data types', value: reported() ? rows().length : undefined },
      { label: 'Selected tools', value: options() ? tools().length : undefined },
    ]} />
    <Bars label="Most common collection states" items={states()} max={reported() ? rows().length * tools().length : undefined} />
    <View result={state} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>{ctx.scope() === 'local'
      ? 'What aictl can collect for each tool, and how exact it is.'
      : 'Collection capabilities are global. Records apply to the selected node scope.'} Cost is a list-price estimate.</p>
    <DataTable ctx={ctx} label={def.title} columns={def.columns} fields={fields()} rows={rows()} />
    <For each={coverage()?.notes?.filter(note => tools().some(tool => tool.id === note.tool))}>
      {note => <p class={styles.note}>{note.text}</p>}
    </For>
    </View>
  </div>
}
