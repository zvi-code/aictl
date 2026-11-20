import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { ContextLocal, DetailContext } from '../../../data/contract.gen'
import { createResourceCache } from '../../../data/resource'
import { CodeView } from '../../../ui/CodeView'
import { Segmented } from '../../../ui/Segmented'
import { isToolSelected } from '../../../utils/toolScope.js'
import { PanelState } from '../../../ui/PanelState'
import type { PanelProps, Row } from '../../types'
import { Bars, measured, StatStrip, usable } from '../Summary'
import { field, metric } from '../b'
import { DataTable, detailRead, identity, rowsFrom, scopedPath, scopeMatches, styles, text, toolName, useCached, View } from './View'

function useContext(ctx: PanelProps['ctx'], field: 'files' | 'telemetry') {
  const resource = ctx.detail<DetailContext>(() => {
    const tools = ctx.tools()
    const query = new URLSearchParams()
    if (tools) query.set('tool', tools.length ? tools.join(',') : '-')
    return ctx.scope() === 'local' ? `/api/board/context${query.size ? `?${query}` : ''}` : scopedPath(ctx, 'context', query)
  })
  const wrongScope = () => {
    const data = resource()?.data
    return data && ctx.scope() !== 'local' && (!('nodes' in data) || !scopeMatches(ctx, data) ||
      data.nodes.some(node => !node.node_id || (ctx.scope() === 'node' && node.node_id !== ctx.nodeId())))
  }
  const bundles = createMemo(() => {
    const data = resource()?.data
    if (!data || wrongScope()) return
    if ('nodes' in data) return data.nodes.map(node => ({ node, node_id: node.node_id }))
    return [{ node: data, node_id: undefined }]
  })
  const result = () => {
    if (wrongScope()) return { state: 'error', message: 'The server did not confirm the requested node scope.' } as const
    const items = bundles()
    if (!items) return detailRead(resource(), undefined)
    if (items.some(({ node }) => !Array.isArray(node[field]))) {
      return items.some(({ node }) => node[field]?.length)
        ? { state: 'stale', message: 'Some node data is not available from this source.' } as const : { state: 'unavailable' } as const
    }
    return detailRead(resource(), items.flatMap(({ node }) => Array.from<unknown>(node[field])), ctx.paused())
  }
  return { bundles, result }
}

const previewCache = createResourceCache<string, string>({
  load: async (path, signal, fetch) => {
    const response = await fetch(path, { signal })
    if (!response.ok) throw new Error(`Could not read the file (HTTP ${response.status}).`)
    return response.text()
  },
})

function Preview(props: { ctx: PanelProps['ctx']; row: Row; close: () => void }) {
  const path = () => text(props.row.path)
  const local = () => props.ctx.scope() === 'local'
  const content = useCached(previewCache,
    () => local() && path() ? `/api/file?${new URLSearchParams({ path: path()! })}` : undefined, () => props.ctx.revision())
  return <section class={styles.stack} aria-label="File preview">
    <p class={styles.previewPath}>{path()}</p>
    <div class={styles.actions}>
      <button type="button" onClick={() => {
        const file = path()
        if (file) props.ctx.openDetail({ type: 'file', path: file, record: text(props.row.record) })
      }}>Open at source</button>
      <button type="button" onClick={() => props.close()}>Close preview</button>
    </div>
    <Show when={local()} fallback={<PanelState state="unavailable" message="Local file contents are not available from this source." />}>
      <View result={() => detailRead(content(), content()?.data, props.ctx.paused())} retry={props.ctx.refresh} reserveStaleSpace={false}>
        <CodeView label="File contents" text={content()?.data ?? ''} wrap />
      </View>
    </Show>
  </section>
}

export function Inventory(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const { bundles, result } = useContext(ctx, 'files')
  const [group, setGroup] = createSignal('kind')
  const [selected, setSelected] = createSignal<string>()
  const inventories = createMemo(() => (bundles() ?? []).flatMap(({ node, node_id }) => (node.files ?? [])
    .filter(tool => isToolSelected(tool.tool, ctx.tools())).map(tool => ({ ...tool, node_id }))))
  const agents = createMemo(() => new Map((ctx.board('agents') ?? []).flatMap(agent =>
    [agent.id, agent.session_id].flatMap(id => id ? [[id, agent.title] as const] : []))))
  const rows = createMemo(() => rowsFrom(inventories().flatMap(tool => (tool.files ?? []).map(file => {
    const editor = text(file.changed_by)
    return { ...file, tool: file.tool ?? tool.tool, node_id: file.node_id ?? tool.node_id,
      session_count: Array.isArray(file.sessions) ? file.sessions.length : undefined,
      editor: editor && (agents().get(editor) ?? editor) } as Row
  })), row => identity(row.node_id, row.tool, row.path)))
  const groups = createMemo(() => {
    const out = new Map<string, typeof rows extends () => infer L ? L : never>()
    for (const entry of rows()) {
      const value = text(entry.row[group()])
      const name = value ? (group() === 'tool' ? toolName(ctx, value) : value) : 'Not available from this source'
      const list = out.get(name)
      if (list) list.push(entry)
      else out.set(name, [entry])
    }
    return [...out.entries()].sort(([a], [b]) => a.localeCompare(b))
  })
  const active = createMemo(() => rows().find(entry => entry.id === selected())?.row)
  const action = {
    label: ({ row }: { row: Row }) => `Preview ${text(row.name) ?? row.path}`,
    run: ({ id }: { id: string }) => setSelected(value => value === id ? undefined : id),
  }
  const counts = createMemo(() => {
    if (!usable(result()) || !bundles()) return
    const tools = new Map<string, number | undefined>()
    for (const { tool, count } of inventories()) {
      const previous = tools.has(tool) ? tools.get(tool) : 0
      tools.set(tool, previous == null || measured(count) == null ? undefined : previous + count)
    }
    return [...tools]
  })
  const ranked = createMemo(() => counts()?.flatMap(([id, value]) => value == null ? [] : [{ id, label: toolName(ctx, id), value }])
    .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id)))
  const total = createMemo(() => counts()?.reduce<number | undefined>((sum, [, count]) =>
    sum == null || count == null ? undefined : sum + count, 0))
  return <div class={styles.stack}>
    <StatStrip label="File inventory summary" items={[
      { label: 'Reported file records', value: total() },
      { label: 'Listed file records', value: counts() ? rows().length : undefined },
    ]} />
    <Bars label="Top tools by reported files" items={counts()?.length && !ranked()?.length ? undefined : ranked()} />
    <View result={() => result().state === 'ready' && !rows().length ? { state: 'empty' } : result()} retry={ctx.refresh} empty={def.empty}>
    <Segmented label="Group files by" value={group()} onChange={setGroup} options={[
      { id: 'kind', label: 'Kind' }, { id: 'tool', label: 'Tool' }, { id: 'none', label: 'No groups' },
    ]} />
    <Show when={ctx.scope() !== 'local'}><p class={styles.note}>Recorded file metadata. Local contents are not available.</p></Show>
    <For each={inventories().filter(tool => tool.truncated)}>{tool =>
      <p class={styles.note}>{toolName(ctx, tool.tool)}{tool.node_id ? ` (${tool.node_id})` : ''} reports {tool.count.toLocaleString()} files. The largest {tool.files.length.toLocaleString()} are listed.</p>}
    </For>
    <Show when={active()}>{row => <Preview ctx={ctx} row={row()} close={() => setSelected(undefined)} />}</Show>
    <Show when={group() === 'none'} fallback={<For each={groups()} keyed={group => group[0]}>{group =>
      <details>
        <summary>{group()[0]} ({group()[1].length} files)</summary>
        <Show when={(group()[1]).length}><DataTable ctx={ctx} label={`${def.title}: ${group()[0]}`}
          columns={def.columns} rows={group()[1]} action={action} /></Show>
      </details>}
    </For>}>
      <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={action} />
    </Show>
    </View>
  </div>
}

type Total = ContextLocal['telemetry'][number]
const modelFields = [field('model', 'Model'), ...['input', 'output', 'cache_read', 'cache_write'].map(name =>
  metric(name, `procs.tool.telemetry.${['input', 'output'].includes(name) ? `${name}_tokens` : name}`)),
field('requests', 'Requests'), metric('cost_usd', 'procs.tool.telemetry.cost_usd', 'Cost')]
const errorFields = [field('ts', 'Time'), field('type', 'Type'), field('message', 'Message'), field('model', 'Model')]

export function Lifetime(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const { bundles, result } = useContext(ctx, 'telemetry')
  const [selected, setSelected] = createSignal<string>()
  const data = createMemo(() => rowsFrom((bundles() ?? []).flatMap(({ node, node_id }) => (node.telemetry ?? [])
    .filter(total => isToolSelected(total.tool, ctx.tools())).map(total => ({ ...total, node_id, label: toolName(ctx, total.tool) }))),
  total => identity(total.node_id, total.tool)))
  const active = createMemo(() => data().find(entry => entry.id === selected())?.row as Total | undefined)
  return <View result={() => result().state === 'ready' && !data().length ? { state: 'empty' } : result()} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>Tool-reported totals since installation. The Overview time range does not apply.</p>
    <For each={data().filter(({ row }) => row.as_of)}>{entry =>
      <p class={styles.note}>{entry.row.label} reports cached totals as of {entry.row.as_of}. Later usage is not included.</p>}
    </For>
    <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={data()} action={{
      label: ({ row }) => `Breakdown for ${row.label}`,
      run: ({ id }) => setSelected(value => value === id ? undefined : id),
    }} />
    <Show when={active()}>{total => <>
      <details><summary>Models for {total().label}</summary>
        <Show when={Array.isArray(total().by_model)} fallback={<PanelState state="unavailable" />}>
          <DataTable ctx={ctx} label="Lifetime models" columns={modelFields} rows={rowsFrom(total().by_model, row => identity(row.model))} />
        </Show>
      </details>
      <details><summary>Errors for {total().label}</summary>
        <Show when={Array.isArray(total().errors)} fallback={<PanelState state="unavailable" />}>
          <DataTable ctx={ctx} label="Lifetime errors" columns={errorFields}
            rows={rowsFrom(total().errors, row => identity(row.ts, row.type, row.model, row.message))} />
        </Show>
      </details>
    </>}</Show>
  </View>
}
