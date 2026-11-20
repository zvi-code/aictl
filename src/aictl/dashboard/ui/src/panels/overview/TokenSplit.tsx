import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { ContextLocal } from '../../data/contract.gen'
import { object } from '../data'
import { keyedRows, presentation } from '../kinds/model'
import { RowTable } from '../kinds/Rows'
import { States } from '../kinds/States'
import type { PanelProps } from '../types'
import { missing, tokens } from './aFields'
import { useContext } from './contextData'
import { FilePreview } from './FilePreview'
import css from './overviewA.module.css'

type Category = ContextLocal['categories'][number] & { node_id?: string }
type FileSet = ContextLocal['files'][number]
const idOf = (row: Category) => JSON.stringify([row.node_id, row.tool])
export default function TokenSplit(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const context = useContext(ctx)
  const read = createMemo(() => context.rows<Category>('categories'))
  const inventory = createMemo(() => context.rows<FileSet>('files'))
  const [picked, setPicked] = createSignal<{ group: string; category: string }>()
  const [preview, setPreview] = createSignal<{ file: string; key: string }>()
  const group = () => read().value?.find(row => idOf(row) === picked()?.group)
  const files = createMemo(() => {
    const current = group()
    if (!current) return
    const set = inventory().value?.find(row => row.tool === current.tool && row.node_id === current.node_id)
    if (!Array.isArray(set?.files)) return
    const matches = set.files.filter(row => row.kind === picked()?.category)
    return { matches, set }
  })
  const showFile = () => {
    const selected = preview()
    return selected && files()?.matches.some(row => row.path === selected.file) ? selected : undefined
  }
  const format = (value: unknown) => typeof value === 'number' ? presentation(ctx, tokens('', 'Tokens')).format(value) : missing
  const choose = (row: Category, category: string) => {
    setPreview(undefined)
    setPicked(old => old?.group === idOf(row) && old.category === category ? undefined : { group: idOf(row), category })
  }
  const columns = def.columns
  return <States result={read} empty={def.empty} retry={context.retry} reserveStaleSpace>
    <p class={css.note}>Estimated tokens in files. Select a category to see its files.</p>
    <For each={read().value} keyed={idOf}>{value => {
      const categories = () => Array.isArray(value().kinds) ? value().kinds.flatMap(entry =>
        typeof entry.kind === 'string' ? [{ kind: entry.kind, tokens: entry.tokens }] : []) : []
      const selected = (category: string) => picked()?.group === idOf(value()) && picked()?.category === category
      return <div class={css.group}>
        <strong>{value().label || value().tool}{value().node_id ? ` · ${value().node_id}` : ''}</strong>
        <p class={css.note}>{format(value().sent)} sent · {format(value().never_sent)} never sent</p>
        <div class={css.bar}>
          <For each={categories().filter(category => typeof category.tokens === 'number' && category.tokens > 0)} keyed={entry => entry.kind}>
            {entry => <button type="button" class={css.button} style={{ 'flex-grow': Number(entry().tokens) }}
              aria-pressed={selected(entry().kind) ? 'true' : 'false'} aria-label={`${value().tool}: ${entry().kind}, ${format(entry().tokens)} tokens`}
              onClick={() => choose(value(), entry().kind)} />}
          </For>
        </div>
        <div class={css.controls}><For each={categories()} keyed={entry => entry.kind}>{entry =>
          <button type="button" class={css.button} aria-pressed={selected(entry().kind) ? 'true' : 'false'}
            onClick={() => choose(value(), entry().kind)}>{entry().kind} · {format(entry().tokens)}</button>}</For>
        </div>
      </div>
    }}</For>
    <Show when={group()}>
      <h4>Files: {picked()?.category}</h4>
      <States result={() => {
        const state = inventory(), matches = files()?.matches
        if (state.state !== 'ready') return state
        return { state: matches == null ? 'unavailable' : matches.length ? 'ready' : 'empty' }
      }} empty="No files of this category are listed." retry={context.retry}>
        <RowTable panel={props} label={`Files: ${picked()?.category}`} columns={columns}
          rows={keyedRows({ state: 'ready', value: files()?.matches.map(row => ({ ...row, node_id: group()?.node_id })) }, ['path'])}
          action={entry => {
            const name = object(entry.row)?.name, file = entry.row.path
            return typeof file === 'string' ? { label: `Preview ${name ?? file}`,
              run: () => setPreview(old => old?.key === entry.id ? undefined : { file, key: entry.id }) } : undefined
          }} />
      </States>
      <Show when={files()?.set.truncated}><p class={css.note}>The inventory lists only the largest files.</p></Show>
      <Show when={showFile()} keyed>{entry =>
        <FilePreview path={entry.file} ctx={ctx} close={() => setPreview(undefined)} />}</Show>
    </Show>
  </States>
}
