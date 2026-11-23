import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { ContextLocal } from '../../data/contract.gen'
import { fmtN } from '../../design/format'
import { keyedRows, presentation } from '../kinds/model'
import { RowTable } from '../kinds/Rows'
import { States } from '../kinds/States'
import type { PanelProps } from '../types'
import { Choice } from './aControls'
import { missing, tokens } from './aFields'
import { useContext } from './contextData'
import { logWidth, mapRows, type MapDimension } from './overviewMath'
import css from './overviewA.module.css'

const dimensions = [['kind', 'Category'], ['scope', 'Scope'], ['project', 'Project'], ['policy', 'When loaded']] as const
const policies: Record<string, string> = { yes: 'with the session', 'on-demand': 'on demand', conditional: 'conditional' }
export default function ContextMap(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const [by, setBy] = createSignal<MapDimension>('kind')
  const [project, setProject] = createSignal<string>()
  const context = useContext(ctx)
  const source = createMemo(() => context.rows<ContextLocal['map']['rows'][number]>('map.rows'))
  const items = createMemo(() => context.rows<ContextLocal['map']['items'][number]>('map.items'))
  const named = createMemo(() => source().value?.map(row => ({ ...row, policy: policies[row.policy] ?? row.policy })) ?? [])
  const groups = createMemo(() => mapRows(named(), by()))
  const projects = createMemo(() => mapRows(named(), 'project'))
  const maximum = () => groups().reduce((max, row) => Math.max(max, row.tokens ?? 0), 0)
  const format = (value: number | null) => value === null ? missing : presentation(ctx, tokens('', 'Tokens')).format(value)
  return <>
    <Choice label="Map by" items={dimensions} value={by} change={setBy} />
    <States result={source} retry={context.retry} empty={def.empty} reserveStaleSpace>
      <p class={css.note}>Estimated tokens in the files tools can load into the model, not observed session load. Bar length uses a log scale.</p>
      <For each={groups()} keyed={row => row.key}>{row =>
        <div class={css.group}>
          <div>{row().key} · {format(row().tokens)} tokens · {row().files == null ? missing : fmtN(row().files)} files</div>
          <Show when={row().tokens !== null && maximum() > 0}>
            <div class={css.mapTrack} aria-hidden="true">
              <span class={css.mapBar} style={{ 'inline-size': `${logWidth(row().tokens!, maximum())}%` }}>
                <For each={row().segs.filter(seg => (seg.tokens ?? 0) > 0)} keyed={seg => seg.key}>{seg =>
                  <span style={{ 'flex-grow': seg().tokens! }} title={`${seg().key}: ${format(seg().tokens)} tokens`} />}</For>
              </span>
            </div>
          </Show>
          <span class={css.note}>{row().segs.map(seg => `${seg.key}: ${format(seg.tokens)}`).join(' · ')}</span>
        </div>
      }</For>
      <div class={css.controls} role="group" aria-label="Projects">
        <For each={projects()} keyed={row => row.key}>{row => <button type="button" class={css.button}
          aria-pressed={project() === row().key ? 'true' : 'false'} onClick={() => setProject(old => old === row().key ? undefined : row().key)}>
          {row().key}
        </button>}</For>
      </div>
      <Show when={project()}>{selected => <States result={() => {
        const state = items()
        if (state.state !== 'ready') return state
        return state.value?.some(item => item.project === selected()) ? state : { state: 'empty' }
      }} empty="No files are listed for this project." retry={context.retry}>
        <RowTable panel={props} label={`Files for ${selected()}`} rows={keyedRows({
          ...items(), value: items().value?.filter(item => item.project === selected()),
        }, ['project', 'kind', 'name'])} />
      </States>}</Show>
    </States>
  </>
}
