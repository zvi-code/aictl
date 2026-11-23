import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { ContextLocal, DetailContext } from '../../../data/contract.gen'
import { fmtNum } from '../../../design/format'
import { isToolSelected } from '../../../data/toolScope'
import { PanelState } from '../../../ui/PanelState'
import type { PanelProps, Row } from '../../types'
import { StatStrip, usable } from '../Summary'
import { field, metric } from '../b'
import { excludedSummary, loadLabel, openFile, truncationNote } from '../contextData'
import { DataTable, detailRead, displayField, identity, rowsFrom, scopedPath, scopeMatches, styles, toolName, View } from './View'

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

export function Inventory(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const { bundles, result } = useContext(ctx, 'files')
  const inventories = createMemo(() => (bundles() ?? []).flatMap(({ node, node_id }) => (node.files ?? [])
    .filter(tool => isToolSelected(tool.tool, ctx.tools())).map(tool => ({ ...tool, node_id }))))
  const categories = createMemo(() => (bundles() ?? []).flatMap(({ node }) => (node.categories ?? [])
    .filter(tool => isToolSelected(tool.tool, ctx.tools()))))
  const rows = createMemo(() => rowsFrom(inventories().flatMap(tool => (tool.files ?? []).map(file => ({
    ...file, tool: toolName(ctx, String(file.tool ?? tool.tool)), node_id: file.node_id ?? tool.node_id, load: loadLabel(file.load),
    session_count: Array.isArray(file.sessions) ? file.sessions.length : undefined,
  } as Row))), row => identity(row.node_id, row.tool, row.path)))
  const excluded = createMemo(() => excludedSummary(inventories()))
  const tokens = (value: number | undefined) => value == null ? undefined : displayField(ctx, metric('tokens', 'files.item.tokens')).format(value)
  const total = (key: 'tokens' | 'always') => usable(result()) && bundles()
    ? categories().reduce((sum, tool) => sum + tool[key], 0) : undefined
  return <div class={styles.stack}>
    <StatStrip label="Context file summary" items={[
      { label: 'Files tools can load into the model', value: usable(result()) && bundles()
        ? inventories().reduce((sum, tool) => sum + tool.count, 0) : undefined },
      { label: 'Their estimated tokens', value: tokens(total('tokens')) },
      { label: 'Loaded with every call', value: tokens(total('always')) },
    ]} />
    <View result={() => result().state === 'ready' && !rows().length ? { state: 'empty' } : result()} retry={ctx.refresh} empty={def.empty}>
      <Show when={truncationNote(inventories(), tool => toolName(ctx, tool))}>{note => <p class={styles.note}>{note()}</p>}</Show>
      <DataTable ctx={ctx} label={def.title} columns={def.columns} rows={rows()} action={{
        label: ({ row }) => openFile(ctx, row)?.label ?? '',
        run: ({ row }) => openFile(ctx, row)?.run(),
      }} />
    </View>
    <Show when={excluded().files > 0}>
      <details>
        <summary>Not model context: {fmtNum(excluded().files)} files</summary>
        <p class={styles.note}>{excluded().kinds.map(({ kind, files }) => `${kind} ${fmtNum(files)}`).join(' · ')}</p>
      </details>
    </Show>
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
