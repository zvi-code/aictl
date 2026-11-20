import { createMemo, createSignal, Show, untrack } from 'solid-js'
import { fmtBytes } from '../../design/format'
import { CodeView } from '../../ui/CodeView'
import { Markdown } from '../../ui/Markdown'
import { PanelState } from '../../ui/PanelState'
import { path, Resource, Rows, Section, Stats, text, type TabProps } from '../shared'
import styles from '../drawer.module.css'

export function FileText(props: { path: string; text: string }) {
  const [source, setSource] = createSignal(false)
  const markdown = () => /\.md(?:own)?$/i.test(props.path)
  return <>
    <Show when={markdown()}><button type="button" class={styles.button} aria-pressed={source() ? 'true' : 'false'}
      onClick={() => setSource(value => !value)}>Source</button></Show>
    <Show when={markdown() && !source()} fallback={<CodeView label="File text" text={props.text} copy wrap />}>
      <Markdown text={props.text} />
    </Show>
  </>
}

export default function Artifacts(props: TabProps) {
  const [filter, setFilter] = createSignal('')
  const [selected, select] = createSignal<{ path: string; viewable: boolean }>()
  const local = () => props.shell.ctx.scope() === 'local'
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<string>(createMemo(() =>
    local() && selected()?.viewable ? path(ctx, '/api/file', { path: selected()?.path }) : undefined), 'text')
  return <Resource read={props.detail}>{data => {
    const list = () => data().artifacts
    const rows = () => {
      const needle = filter().trim().toLowerCase()
      return list()?.filter(row => [row.path, row.name, row.kind, row.folder, row.ext].some(value => text(value)?.toLowerCase().includes(needle)))
    }
    return <Section title="Artifacts">
      <Stats items={[{ label: 'Artifacts', value: data().artifacts_total },
        { label: 'Total size', value: data().artifacts_bytes == null ? undefined : fmtBytes(data().artifacts_bytes) },
        { label: 'Missing', value: list()?.every(row => row.exists != null) ? list()?.filter(row => row.exists === false).length : undefined }]} />
      <Show when={data().artifacts_total != null && (list()?.length ?? 0) < data().artifacts_total}>
        <PanelState state="stale" message={`Showing ${list()?.length ?? 0} of ${data().artifacts_total} indexed artifacts.`} />
      </Show>
      <label class={styles.field}>Filter artifacts<input type="search" value={filter()} onInput={event => setFilter(event.currentTarget.value)} /></label>
      <Rows label="Artifacts" rows={rows()} identity={['path']}
        columns={['name', 'kind', 'folder', 'size', 'path', 'exists', ['mtime', 'Changed', 'time']]}
        empty={filter().trim() ? 'No artifacts match this filter.' : 'No indexed artifacts.'}
        action={{ label: row => `Inspect ${row.name ?? row.path}`, run: row => {
          const file = text(row.path)
          if (file) select({ path: file, viewable: row.viewable === true && row.exists !== false })
        } }} />
      <Show keyed when={selected()}>{item => <Section title={item.path}>
        <div class={styles.bar}>
          <button type="button" class={styles.button} onClick={() => props.shell.ctx.copy(item.path)}>Copy path</button>
          <Show when={local() && item.viewable}><button type="button" class={styles.button} onClick={() => props.shell.open({ type: 'file', path: item.path, line: 1 })}>Open as a file</button></Show>
          <button type="button" class={styles.button} onClick={() => select(undefined)}>Close file</button>
        </div>
        <Show when={local() && item.viewable} fallback={<PanelState state="unavailable"
          message="The index does not establish that the current file can be read from this source." />}><Resource read={read}>{value =>
          <FileText path={item.path} text={value()} />
        }</Resource></Show>
      </Section>}</Show>
    </Section>
  }}</Resource>
}
