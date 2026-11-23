import { createMemo, createSignal, Show, untrack } from 'solid-js'
import { fmtBytes } from '../../design/format'
import { CodeView } from '../../ui/CodeView'
import { Markdown } from '../../ui/Markdown'
import type { Row } from '../../panels/types'
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

/** What the index says of a file's presence: it is not checked unless a source read the disk. */
export const existence = (exists: unknown) => exists === true ? 'yes' : exists === false ? 'missing' : 'not checked'

export default function Artifacts(props: TabProps) {
  const [filter, setFilter] = createSignal('')
  const [selected, select] = createSignal<string>()
  const local = () => props.shell.ctx.scope() === 'local'
  const ctx = untrack(() => props.shell.ctx)
  // The index does not say whether a file can be read; this machine's own files are read to find out.
  const read = ctx.detail<string>(createMemo(() => local() && selected() ? path(ctx, '/api/file', { path: selected() }) : undefined), 'text')
  return <Resource read={props.detail}>{data => {
    const list = () => data().artifacts
    const rows = () => {
      const needle = filter().trim().toLowerCase()
      return list()?.filter(row => [row.path, row.name, row.kind, row.folder, row.ext].some(value => text(value)?.toLowerCase().includes(needle)))
        .map((row): Row => ({ ...row, exists_label: existence(row.exists) }))
    }
    return <Section title="Artifacts">
      <Stats items={[{ label: 'Artifacts', value: data().artifacts_total },
        { label: 'Total size', value: data().artifacts_bytes == null ? undefined : fmtBytes(data().artifacts_bytes) },
        { label: 'Missing', value: list()?.every(row => row.exists != null) ? list()?.filter(row => row.exists === false).length : 'not checked' }]} />
      <Show when={data().artifacts_total != null && (list()?.length ?? 0) < data().artifacts_total}>
        <PanelState state="stale" message={`Showing ${list()?.length ?? 0} of ${data().artifacts_total} indexed artifacts.`} />
      </Show>
      <label class={styles.field}>Filter artifacts<input type="search" value={filter()} onInput={event => setFilter(event.currentTarget.value)} /></label>
      <Rows label="Artifacts" rows={rows()} identity={['path']}
        columns={['name', 'kind', 'folder', ['size_bytes', 'Size', 'bytes'], ['path', 'Path', 'path'], ['exists_label', 'Exists'], ['mtime', 'Changed', 'time']]}
        empty={filter().trim() ? 'No artifacts match this filter.' : 'No indexed artifacts.'}
        action={{ label: row => `Inspect ${row.name ?? row.path}`, run: row => {
          const file = text(row.path)
          if (file && row.exists !== false) select(file)
        } }} />
      <Show keyed when={selected()}>{file => <Section title={file}>
        <div class={styles.bar}>
          <button type="button" class={styles.button} onClick={() => props.shell.ctx.copy(file)}>Copy path</button>
          <Show when={local()}><button type="button" class={styles.button} onClick={() => props.shell.open({ type: 'file', path: file, line: 1 })}>Open as a file</button></Show>
          <button type="button" class={styles.button} onClick={() => select(undefined)}>Close file</button>
        </div>
        <Show when={local()} fallback={<PanelState state="unavailable" message="This file is on another node; its text is not served from here." />}>
          <Resource read={read}>{value => <FileText path={file} text={value()} />}</Resource>
        </Show>
      </Section>}</Show>
    </Section>
  }}</Resource>
}
