import { createMemo, createSignal, Show, untrack } from 'solid-js'
import type { ContextLocal } from '../../data/contract.gen'
import { keyedRows } from '../kinds/model'
import { RowTable } from '../kinds/Rows'
import { SeriesView } from '../kinds/Series'
import { States } from '../kinds/States'
import type { KeyedRow, PanelProps } from '../types'
import { field, missing } from './aFields'
import { useContext } from './contextData'
import { FilePreview } from './FilePreview'
import { memoryGroups } from './overviewMath'
import css from './overviewA.module.css'

type Entry = ContextLocal['memory']['entries'][number]
type Sample = ContextLocal['memory']['growth'][number]
export default function Memory(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const context = useContext(ctx)
  const listing = createMemo(() => context.rows<Entry>('memory.entries'))
  const growth = createMemo(() => context.rows<Sample>('memory.growth'))
  const [preview, setPreview] = createSignal<{ id: string; path: string }>()
  const grouped = createMemo(() => memoryGroups(listing().value ?? []))
  const rows = createMemo(() => grouped().flatMap(group => {
    const id = JSON.stringify(['source', group.source])
    const first: KeyedRow = { id, folded: grouped().length > 1, row: { name: group.label ?? missing, tokens: group.tokens } }
    return [first, ...group.profiles.flatMap(profile => {
      const profileId = JSON.stringify(['profile', group.source, profile.profile])
      const header: KeyedRow = { id: profileId, parent: id, folded: profile.items.length > 5,
        row: { name: profile.profile || 'No profile', tokens: profile.tokens } }
      return [header, ...keyedRows({ state: 'ready', value: profile.items }, ['source', 'profile', 'file'])
        .map(row => ({ ...row, parent: profileId }))]
    })]
  }))
  const axis = createMemo(() => [...new Set(growth().value?.map(row => row.ts))].sort((a, b) => a - b))
  const series = createMemo(() => {
    const samples = new Map<string, Map<number, number>>()
    for (const point of growth().value ?? []) {
      const label = point.node_id ?? 'Memory tokens'
      if (!samples.has(label)) samples.set(label, new Map())
      samples.get(label)!.set(point.ts, point.mem_tokens)
    }
    return [...samples].map(([label, points]) => ({ label, values: axis().map(ts => points.get(ts) ?? null) }))
  })
  const selected = () => rows().some(row => row.id === preview()?.id) ? preview() : undefined
  return <>
    <p class={css.note}>{ctx.scope() === 'local' ? 'Estimated file tokens. Growth uses its own time range.' :
      'Recorded file metadata. Trends are per reporting node; missing samples are gaps.'}</p>
    <SeriesView panel={props} label="Agent memory growth" description="Estimated tokens in memory files over time." time namedControls
      columns={() => series().map(({ label }, i) => field(String(i), label, 'memory.growth_chart'))}
      source={() => growth().value?.length ? { ...growth(), value: Object.fromEntries(series().map(({ values }, i) => [i, values])) } : growth()}
      axis={() => ({ ...growth(), value: growth().value == null ? undefined : axis() })}
      retry={context.retry} empty="No memory growth samples." />
    <States result={listing} empty={def.empty} retry={context.retry} reserveStaleSpace>
      <RowTable panel={props} rows={rows()} action={entry => {
        const path = entry.row.file
        return typeof path === 'string' ? { label: `Preview ${entry.row.name ?? path}`,
          run: () => setPreview(old => old?.id === entry.id ? undefined : { id: entry.id, path }) } : undefined
      }} />
      <Show when={selected()} keyed>{entry => <FilePreview path={entry.path} ctx={ctx} close={() => setPreview(undefined)} />}</Show>
    </States>
  </>
}
