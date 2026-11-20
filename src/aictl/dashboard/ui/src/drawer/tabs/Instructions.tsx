import { createMemo, createSignal, Show } from 'solid-js'
import { PanelState } from '../../ui/PanelState'
import { Resource, Rows, Section, Stats, text, type TabProps } from '../shared'
import styles from '../drawer.module.css'

export default function Instructions(props: TabProps) {
  const [query, setQuery] = createSignal('')
  const local = () => props.shell.ctx.scope() === 'local'
  const open = (file: unknown) => {
    const path = text(file)
    if (path && local()) props.shell.open({ type: 'file', path, line: 1 })
  }
  return <Resource read={props.detail}>{data => {
    const sources = () => data().context_files
    const files = createMemo(() => {
      const source = sources()
      if (!source?.read) return undefined
      const root = source.git_root ? `${source.git_root.replaceAll('\\', '/').replace(/\/+$/, '')}/` : ''
      const loaded = new Set(source.loaded.map(row => row.path))
      const needle = query().trim().toLowerCase()
      return source.files.flatMap(row => {
        const path = text(row.path)
        if (!path || !path.toLowerCase().includes(needle)) return []
        const normalized = path.replaceAll('\\', '/')
        const file = normalized.slice(normalized.lastIndexOf('/') + 1)
        const folder = normalized.slice(0, normalized.length - file.length)
        return [{ ...row, path, file, folder: (root && folder.startsWith(root) ? folder.slice(root.length) : folder) || '/',
          observed: loaded.has(path) || row.loaded === true ? 'Observed' : undefined }]
      }).sort((a, b) => a.folder.localeCompare(b.folder) || a.file.localeCompare(b.file))
    })
    return <>
      <Section title="Instructions in effect">
        <Stats items={[{ label: 'Files in scope', value: sources()?.read ? sources()?.total : undefined },
          { label: 'Observed loads', value: sources()?.loaded?.length || undefined }]} />
        <Rows label="Observed loads" rows={sources()?.loaded} identity={['path', 'ts', 'how']}
          columns={['path', ['how', 'Load method'], ['detail', 'Details'], ['ts', 'Observed', 'time']]}
          empty="The session record contains no instruction load evidence."
          action={local() ? { label: row => `Open ${row.path}`, run: row => open(row.path) } : undefined} />
      </Section>
      <Section title="Files that can affect this session">
        <Show when={sources()?.git_root}><p class={styles.muted}>Folders are relative to {sources()?.git_root}.</p></Show>
        <Show when={(sources()?.files.length ?? 0) > 0}><label class={styles.field}>Filter files by name or folder
          <input type="search" value={query()} onInput={event => setQuery(event.currentTarget.value)} />
        </label></Show>
        <Show when={sources()?.read && sources()!.files.length < sources()!.total}>
          <PanelState state="stale" message={`Showing ${sources()!.files.length} of ${sources()!.total} indexed files.`} />
        </Show>
        <Rows label="Instruction files" rows={files()} identity={['path', 'tool', 'scope']}
          columns={['folder', 'file', 'scope', 'kind', 'loading', 'observed']}
          empty={query().trim() ? 'No file matches this filter.' : 'No applicable instruction files.'}
          action={local() ? { label: row => `Open ${row.path}`, run: row => open(row.path) } : undefined} />
      </Section>
    </>
  }}</Resource>
}
