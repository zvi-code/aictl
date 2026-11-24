import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { fmtNum } from '../design/format'
import { detailPath, detailRead } from '../panels/data'
import { toolLabel } from '../panels/insights/insightsModel'
import {
  gapFinding, historyDays, indexText, MISSING, notStored, onlyStored, openGap, originText, sessionsText, size, STATES,
  STORED_ONLY, when, yesNo, type Compare, type ContextFolder, type Database, type Home, type IndexBody, type IndexNode,
  type Location, type Project, type Settings,
} from '../panels/index/indexModel'
import type { PanelContext } from '../panels/types'
import { PanelState } from '../ui/PanelState'
import { Table } from '../ui/Table'
import type { Field } from '../ui/tableModel'
import styles from '../panels/index/Index.module.css'

type Label = (tool: string) => string

const text = <T,>(id: string, label: string, read: (row: T) => string, extra: Partial<Field<T>> = {}): Field<T> =>
  ({ id, label, read, ...extra })
const folder = <T,>(id: string, label: string, read: (row: T) => string): Field<T> =>
  ({ id, label, read, clip: 'start', hint: read })
const num = <T,>(id: string, label: string, read: (row: T) => number | null | undefined, format = fmtNum): Field<T> =>
  ({ id, label, numeric: true, read: row => read(row) ?? undefined, format: value => typeof value === 'number' ? format(value) : String(value) })
// Room for every column: a table wider than the screen scrolls sideways instead of cutting its paths short.
const wide = (fields: readonly unknown[]) => `${Math.max(40, fields.length * 8)}rem`
const time = <T,>(id: string, label: string, read: (row: T) => number | null | undefined): Field<T> =>
  ({ id, label, numeric: true, read: row => read(row) || undefined, format: value => when(Number(value)) })

/** One reason of a gap: its count, the session ids the server listed, and a copy of them. */
function Ids(props: { reason: string; count: number; ids: string[]; copy: (text: string) => void }) {
  return <li class={styles.ids}>
    <div>
      <span>{props.reason}: <strong>{fmtNum(props.count)}</strong></span>
      <button type="button" onClick={() => props.copy(props.ids.join('\n'))}>Copy ids</button>
      <Show when={props.ids.length < props.count}><span class={styles.note}>the first {fmtNum(props.ids.length)} are listed</span></Show>
    </div>
    <code aria-label={`Session ids: ${props.reason}`}>{props.ids.join('\n')}</code>
  </li>
}

function Comparison(props: { title: string; rows: Compare[]; note: string; label: Label; copy: (text: string) => void; id: string }) {
  const label = untrack(() => props.label)
  const fields: Field<Compare>[] = [
    text('tool', 'Tool', row => label(row.tool)),
    num('on_disk', 'On disk', row => row.on_disk), num('stored', 'Stored', row => row.stored),
    num('matched', 'In both', row => row.matched),
    { ...num<Compare>('not_stored', 'Not stored', row => row.comparable ? notStored(row) : null), title: 'On disk, not stored' },
    { ...num<Compare>('open', 'Not read yet', row => row.comparable ? openGap(row) : null),
      title: 'Of the sessions not stored: not read yet or unreadable' },
    { ...num<Compare>('only_stored', 'Only stored', row => row.comparable ? onlyStored(row) : null), title: 'Stored, not on disk' },
    num('files', 'Session files', row => row.files), num('bytes', 'Size on disk', row => row.bytes, size),
    text('reason', 'Why not compared', row => row.reason || '', { hint: row => row.reason || undefined }),
  ]
  const gaps = () => props.rows.filter(row => row.comparable && (notStored(row) || onlyStored(row)))
  return <section class={styles.section} aria-labelledby={props.id}>
    <h3 id={props.id}>{props.title}</h3>
    <p class={props.rows.some(row => row.comparable && openGap(row) > 0) ? `${styles.lead} ${styles.gap}` : styles.lead}>
      {gapFinding(props.rows, label)}</p>
    <p class={styles.note}>{props.note}</p>
    <Table label={props.title} tableId={`index-${props.id}`} fields={fields} minWidth={wide(fields)} rows={props.rows} rowId={row => row.tool} />
    <For each={gaps()}>{row => <details class={styles.more}>
      <summary>{label(row.tool)}: {fmtNum(notStored(row))} on disk not stored, {fmtNum(onlyStored(row))} stored not on disk · session ids</summary>
      <ul class={styles.reasons}>
        <For each={Object.entries(row.missing)}>{([key, n]) =>
          <Ids reason={`Not stored · ${MISSING[key] ?? key}`} count={n} ids={row.missing_ids[key] ?? []} copy={props.copy} />}</For>
        <For each={Object.entries(row.stored_only)}>{([key, n]) =>
          <Ids reason={`Only stored · ${STORED_ONLY[key] ?? key}`} count={n} ids={row.stored_only_ids[key] ?? []} copy={props.copy} />}</For>
      </ul>
    </details>}</For>
  </section>
}

function Locations(props: { rows: Location[]; label: Label; title: string; id: string; note?: string }) {
  const label = untrack(() => props.label)
  const fields: Field<Location>[] = [
    folder('path', 'Folder', row => row.path), text('tool', 'Tool', row => label(row.tool)),
    text('kind', 'Kind', row => row.kind), text('exists', 'Exists', row => yesNo(row.exists)),
    num('files', 'Files', row => row.files), num('bytes', 'Size', row => row.bytes, size),
    num('sessions', 'Sessions', row => row.sessions),
    ...STATES.map(([key, label]) => num<Location>(key, label, row => row.states[key])),
    time('newest', 'Newest file', row => row.newest), time('oldest', 'Oldest file', row => row.oldest),
    num('unclaimed', 'Files of an unknown form', row => row.unclaimed),
    num('folders', 'Session folders without events.jsonl', row => row.folders_without_transcript),
    num('older', 'Read by an older reader', row => row.older_version_files),
    text('reader', 'Reader', row => row.reader ? `${row.reader} v${row.reader_version}` : ''),
    time('indexed', 'Last indexed', row => row.indexed_at),
  ]
  const unreadable = () => props.rows.flatMap(row => row.unreadable)
  return <section class={styles.section} aria-labelledby={props.id}>
    <h3 id={props.id}>{props.title}</h3>
    <Show when={props.note}><p class={styles.note}>{props.note}</p></Show>
    <Table label={props.title} tableId={`index-${props.id}`} fields={fields} minWidth={wide(fields)} rows={props.rows} rowId={row => `${row.tool}|${row.path}`}
      defaultHidden={['indexed', 'reader']} />
    <Show when={unreadable().length}><details class={styles.more}>
      <summary>{fmtNum(unreadable().length)} unreadable files and why</summary>
      <ul class={styles.files}><For each={unreadable()}>{bad => <li>{bad.path}: {bad.reason}</li>}</For></ul>
    </details></Show>
  </section>
}

function Databases(props: { rows: Database[] }) {
  const fields: Field<Database>[] = [
    folder('path', 'Database', row => row.path), text('exists', 'Exists', row => yesNo(row.exists)),
    num('sessions', 'Sessions in it', row => row.sessions), num('with', 'With an events.jsonl now', row => row.with_events_file),
    num('before', 'events.jsonl read before, gone now', row => row.events_file_seen_before),
    num('without', 'Never had an events.jsonl here', row => row.without_events_file),
    num('old', 'Of those, older than history_days', row => row.outside_window),
    text('usage', 'Usage rows read', row => row.usage_rows_read ? 'yes' : 'no: only the default home’s are read'),
    num('app', 'App sessions (data.db)', row => row.app_sessions), text('error', 'Error', row => row.error),
  ]
  return <section class={styles.section} aria-labelledby="index-databases">
    <h3 id="index-databases">Copilot databases</h3>
    <p class={styles.note}>Copilot keeps every session in session-store.db, also after it removed the session's folder. The reader stores
      a session it has no events.jsonl of from the database.</p>
    <Table label="Copilot databases" tableId="index-databases" fields={fields} minWidth={wide(fields)} rows={props.rows} rowId={row => row.path} />
  </section>
}

function Homes(props: { rows: Home[]; label: Label }) {
  const label = untrack(() => props.label)
  const fields: Field<Home>[] = [
    folder('path', 'Folder', row => row.path), text('tool', 'Tool', row => label(row.tool)),
    text('exists', 'Exists', row => yesNo(row.exists)), text('found_by', 'Named by', row => row.found_by.join(', ')),
    folder('session_folder', 'Session folder', row => row.session_folder),
    text('session_exists', 'Session folder exists', row => row.session_folder ? yesNo(row.session_folder_exists) : ''),
    text('read_by', 'Read by', row => row.read_by),
  ]
  return <section class={styles.section} aria-labelledby="index-homes">
    <h3 id="index-homes">Tool homes</h3>
    <p class={styles.note}>Every folder a tool can keep its state in, how aictl learnt of it (its default location, an environment
      variable such as COPILOT_HOME, a running tool process, or the known-homes file of earlier finds) and whether it exists.
      A home that is missing was a candidate that was checked.</p>
    <Table label="Tool homes" tableId="index-homes" fields={fields} minWidth={wide(fields)} rows={props.rows} rowId={row => `${row.tool}|${row.path}`} />
  </section>
}

function Projects(props: { rows: Project[]; label: Label }) {
  const label = untrack(() => props.label)
  const fields: Field<Project>[] = [
    folder('path', 'Folder', row => row.path), text('found_by', 'Found as', row => row.found_by.join(', ')),
    text('exists', 'Exists', row => yesNo(row.exists)), folder('git', 'Git work tree', row => row.git_root),
    folder('worktree', 'Worktree of', row => row.worktree_of),
    text('sessions', 'Stored sessions', row => sessionsText(row.sessions, label)),
    time('last', 'Last activity', row => row.last_activity),
    num('instructions', 'Instruction files', row => row.instructions), num('memory', 'Memory files', row => row.memory),
    num('skills', 'Skills', row => row.skills), num('agents', 'Agents', row => row.agents),
    text('ignored', 'In ignored_dirs', row => row.ignored ? 'yes' : ''),
    text('outside', 'Outside the roots', row => row.outside_roots ? 'yes' : ''),
  ]
  return <section class={styles.section} aria-labelledby="index-projects">
    <h3 id="index-projects">Projects and repositories ({fmtNum(props.rows.length)})</h3>
    <p class={styles.note}>The folders aictl started in (roots), the repositories discovery found under them, the working folders of
      stored sessions, and the folders memory files belong to. Files and skills are counted in the folder and below it.</p>
    <Table label="Projects" tableId="index-projects" fields={fields} minWidth={wide(fields)} rows={props.rows} rowId={row => row.path} pageSize={50} />
  </section>
}

function Context(props: { rows: ContextFolder[]; label: Label }) {
  const label = untrack(() => props.label)
  const [open, setOpen] = createSignal<string>()
  const key = (row: ContextFolder) => `${row.category}|${row.tool}|${row.path}`
  const fields: Field<ContextFolder>[] = [
    folder('path', 'Folder', row => row.path), text('category', 'Kind', row => row.category),
    text('tool', 'Tool', row => label(row.tool)), text('scope', 'Scope', row => row.scope),
    text('exists', 'Exists', row => yesNo(row.exists)), num('files', 'Files', row => row.files),
    num('bytes', 'Size', row => row.bytes, size), time('newest', 'Newest', row => row.newest),
    text('pattern', 'Path catalog pattern', row => row.pattern),
  ]
  const shown = () => props.rows.find(row => key(row) === open())
  return <section class={styles.section} aria-labelledby="index-context">
    <h3 id="index-context">Instruction, skill, agent and memory folders</h3>
    <p class={styles.note}>Folders that hold files of these kinds, and the user-level folders the path catalog names for this system, also
      when they hold none. A project-level folder is listed where a file was found in it.</p>
    <Table label="Context folders" tableId="index-context" fields={fields} minWidth={wide(fields)} rows={props.rows} rowId={key} pageSize={50}
      action={{ label: row => row.files ? `Show ${fmtNum(row.files)} files` : 'No files', run: row => setOpen(old => old === key(row) ? undefined : key(row)) }} />
    <Show when={shown()}>{row => <div>
      <p class={styles.note}>{row().category} files of {label(row().tool)} in {row().path}</p>
      <ul class={styles.files}><For each={row().listed}>{file => <li>{file}</li>}</For></ul>
    </div>}</Show>
  </section>
}

function SettingsList(props: { settings: Settings }) {
  const s = () => props.settings
  return <section class={styles.section} aria-labelledby="index-settings">
    <h3 id="index-settings">Daemon settings that decide the above</h3>
    <dl class={styles.settings}>
      <dt>Node</dt><dd>{s().node_id}</dd>
      <dt>Roots</dt><dd>{s().roots?.join(', ') || 'none'}</dd>
      <dt>ignored_dirs</dt><dd>{s().ignored_dirs?.join(', ')}</dd>
      <dt>history_days</dt><dd>{historyDays(s().history_days)}</dd>
      <dt>Read limit per poll</dt><dd>{size(s().read_limit_bytes_per_poll)} of backlog{s().read_limit_now_bytes != null
        ? `, now ${size(s().read_limit_now_bytes)}` : ''}</dd>
      <dt>Store</dt><dd>{s().store_host || 'none'} · database {s().store_database || 'none'}</dd>
      <dt>Daemon</dt><dd>{s().daemon_pid ? `pid ${s().daemon_pid}, started ${when(s().daemon_started_at)}` : 'not running here: saved read positions are used'}</dd>
      <For each={s().polls ?? []}>{poll => <>
        <dt>Last poll · {poll.reader}</dt>
        <dd>{poll.enabled ? `completed ${when(poll.last_completed_at)}, started ${when(poll.last_poll_at)}` : 'not enabled: no source found'}
          {poll.last_error ? ` · error: ${poll.last_error}` : ''}</dd>
      </>}</For>
    </dl>
  </section>
}

function NodeView(props: { node: IndexNode; label: Label; copy: (text: string) => void }) {
  const node = () => props.node
  const id = (part: string) => `index-${part}-${node().node_id}`
  return <article class={styles.node} data-node={node().node_id}>
    <header>
      <h2>{node().node_id}</h2>
      <p class={styles.origin} data-origin={node().origin}>{originText(node())}</p>
      <Show when={node().note}><p class={styles.note}>{node().note}</p></Show>
      <Show when={node().truncated}><p class={styles.note}>The published snapshot was cut to fit the store: some lists are shortened.</p></Show>
    </header>
    <Show when={node().compare}>{rows => <Comparison id={id('compare')} title="Sessions on disk against sessions stored" rows={rows()}
      label={props.label} copy={props.copy} note={'A session is on disk when a session file, a session folder or the Copilot database ' +
      'holds it; stored when the store holds a session row of this node. A tool aictl reads no session files of is listed with its ' +
      'stored sessions only.'} />}</Show>
    <Show when={node().store_index}>{index => <>
      <Comparison id={id('stored-compare')} title="Indexed files in the store against sessions stored" rows={index().compare}
        label={props.label} copy={props.copy} note={indexText(index())} />
      <Show when={index().locations.length}>
        <Locations id={id('stored-locations')} title="Session folders as indexed in the store" rows={index().locations} label={props.label}
          note="Folders are recognized from the indexed file paths; files, sessions and read states as the node's reader last reported them." />
      </Show>
    </>}</Show>
    <Show when={node().locations}>{rows => <Locations id={id('locations')} title="Session locations" rows={rows()} label={props.label}
      note="Every folder the session readers take files from, with how far the reader got with each file." />}</Show>
    <Show when={node().databases?.length}><Databases rows={node().databases ?? []} /></Show>
    <Show when={node().homes}>{rows => <Homes rows={rows()} label={props.label} />}</Show>
    <Show when={node().projects}>{rows => <Projects rows={rows()} label={props.label} />}</Show>
    <Show when={node().context}>{rows => <Context rows={rows()} label={props.label} />}</Show>
    <Show when={node().settings}>{settings => <SettingsList settings={settings()} />}</Show>
  </article>
}

/** Everything the daemon found and indexed: this node live, another node or the fleet from the store. */
export default function Index(props: { ctx: PanelContext }) {
  const ctx = untrack(() => props.ctx)
  // detailPath adds the chosen projects, as it does for every detail route.
  const path = createMemo(() => detailPath(ctx, '/api/board/index'))
  const read = untrack(() => ctx.detail<IndexBody>(path))
  const body = () => {
    const value = read()?.data
    if (!value || ctx.scope() === 'local') return value
    return value.scope?.kind === ctx.scope() && (ctx.scope() !== 'node' || value.scope.node_id === ctx.nodeId()) ? value : undefined
  }
  const state = () => {
    if (read()?.data && !body()) return { state: 'error' as const, message: 'The server did not confirm the requested node scope.' }
    return detailRead(read(), body(), false, { reading: 'tool folders, session files and stored sessions' })
  }
  const label: Label = tool => body()?.tool_labels?.[tool] ?? ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const waiting = () => {
    const value = state().state
    return value === 'ready' ? 'loading' : value
  }
  return <div data-screen="index" class={styles.screen}>
    <header class={styles.heading}>
      <h1>Index</h1>
      <p>Everything the daemon found and indexed: tool homes, the folders and databases sessions are read from and how far each file
        was read, the sessions on disk against the sessions stored, projects, and the folders of instructions, skills, agents and
        memory. This node is computed live on request; another node shows what it published to the store.</p>
      <button type="button" onClick={() => read.retry()}>Compute again</button>
    </header>
    <Show when={body()} fallback={<PanelState state={waiting()} message={state().message} onRetry={read.retry} />}>{data => <>
      <Show when={state().state === 'stale'}><PanelState inline state="stale" message="Computing again…" updatedAt={data().generated_at} /></Show>
      <Show when={data().project_filter.length}>
        <p class={styles.note}>Project filter: {data().project_filter.join(', ')}. Stored sessions and project folders are kept to it.</p>
      </Show>
      <For each={data().nodes}>{node => <NodeView node={node} label={label} copy={ctx.copy} />}</For>
      <Show when={!data().nodes.length}><PanelState state="empty" message="No node has reported to the store." /></Show>
    </>}</Show>
  </div>
}
