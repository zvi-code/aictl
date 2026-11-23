import { createMemo, createSignal, Show, untrack } from 'solid-js'
import type { ContextLocal, DetailContext } from '../../../data/contract.gen'
import { fmtNum, stamp as fmtStamp } from '../../../design/format'
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
const short = { input: 'Input', output: 'Output', cache_read: 'Cache read', cache_write: 'Cache write' } as const
const modelFields = [field('model', 'Model'), ...(['input', 'output', 'cache_read', 'cache_write'] as const).map(name =>
  metric(name, `procs.tool.telemetry.${name === 'input' || name === 'output' ? `${name}_tokens` : name}`, short[name])),
field('requests', 'Requests'), metric('cost_usd', 'procs.tool.telemetry.cost_usd', 'Cost')]
const errorFields = [field('ts', 'Time'), field('type', 'Type'), field('message', 'Message'), field('model', 'Model')]

/** A date the tool or the server wrote as text ("2026-11-23T21:11:52+00:00"), in the board's date format; text that is no date is not known. */
export const dated = (value: unknown) => {
  const ms = typeof value === 'string' && value ? Date.parse(value) : NaN
  return Number.isFinite(ms) ? fmtStamp(ms / 1000, true) : undefined
}

/** A lifetime row as the table shows it: dates as dates, and a cost basis nobody reported is left empty, not "unknown". */
type Shown = { as_of?: string; cost_quality?: string; token_quality?: string }
export function lifetimeRow<T extends { as_of?: string | null; cost_quality?: string | null; token_quality?: string | null }>(total: T):
  Omit<T, keyof Shown> & Shown {
  const known = (value: string | null | undefined) => value && value !== 'unknown' ? value : undefined
  return { ...total, as_of: dated(total.as_of), cost_quality: known(total.cost_quality), token_quality: known(total.token_quality) }
}

export function Lifetime(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const { bundles, result } = useContext(ctx, 'telemetry')
  const [selected, setSelected] = createSignal<string>()
  const data = createMemo(() => rowsFrom((bundles() ?? []).flatMap(({ node, node_id }) => (node.telemetry ?? [])
    .filter(total => isToolSelected(total.tool, ctx.tools())).map(total => ({ ...lifetimeRow(total), node_id, label: toolName(ctx, total.tool) }))),
  total => identity(total.node_id, total.tool)))
  const active = createMemo(() => data().find(entry => entry.id === selected())?.row as (Total & { label: string }) | undefined)
  return <View result={() => result().state === 'ready' && !data().length ? { state: 'empty' } : result()} retry={ctx.refresh} empty={def.empty}>
    <p class={styles.note}>{data().some(({ row }) => row.as_of != null)
      ? 'Tool-reported totals since installation, as of the time in each row; later usage is not included. The board time range does not apply.'
      : 'Tool-reported totals since installation. The board time range does not apply.'}</p>
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
            rows={rowsFrom(total().errors.map(row => ({ ...row, ts: dated(row.ts) }) as Row), row => identity(row.ts, row.type, row.model, row.message))} />
        </Show>
      </details>
    </>}</Show>
  </View>
}
