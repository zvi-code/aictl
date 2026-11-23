import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { DetailAgent, DetailCheckpointFiles, DetailMemoryDiff, DetailMemoryRecalls, DetailMemoryVersions } from '../data/contract.gen'
import { fmtBytes, fmtN, stamp } from '../design/format'
import type { PanelContext } from '../panels/types'
import type { DrawerProps } from '../shell/drawerTypes'
import { Box, type Boxes } from '../ui/Box'
import { CodeView } from '../ui/CodeView'
import { PanelState } from '../ui/PanelState'
import { Table } from '../ui/Table'
import type { Field } from '../ui/tableModel'
import { openAgent, path, Resource, rowId, type TabProps } from './shared'
import styles from './drawer.module.css'

export type MemoryChange = NonNullable<DetailAgent['memory_changes']>[number]
export type Checkpoint = NonNullable<DetailAgent['checkpoints']>[number]
type Recall = DetailMemoryRecalls['recalls'][number]
type Version = DetailMemoryVersions['versions'][number]
type RewindFile = DetailCheckpointFiles['files'][number]
type Side = DetailMemoryDiff['first']

export const NOT_REPORTED = 'not reported'
// A column of a checkpoint that a memory recall does not have.
const NOT_APPLICABLE = 'n/a'
const MECHANISMS: Record<string, string> = {
  claude_auto_memory: 'Claude Code auto memory', claude_md: 'CLAUDE.md', agents_md: 'AGENTS.md',
  copilot_instructions: 'Copilot instructions', copilot_store_memory: 'Copilot memory', vscode_memory: 'VS Code memory',
  codex_memory: 'Codex memory',
}
const ACTORS: Record<string, string> = { agent: 'Main agent', subagent: 'Subagent', outside_session: 'Outside the session' }
const KINDS: Record<string, string> = {
  compaction: 'Compaction', rewind_point: 'Rewind point', checkpoint: 'Checkpoint', truncation: 'Truncation',
  context_reset: 'Context reset', memory_recall: 'Memory recall',
}
const ORIGINS: Record<string, string> = {
  write_event: 'Session change', scan: 'Inventory scan', claude_file_history: 'Claude Code backup', copilot_rewind: 'Copilot snapshot',
}
const STATES: Record<Side['state'], string> = {
  kept: 'stored', absent: 'the file did not exist', not_recorded: 'not recorded', not_kept: 'not kept: text capture is off',
  expired: 'not stored any more',
}

const known = (value: string | null | undefined, labels: Record<string, string>) => value ? labels[value] ?? value : NOT_REPORTED
export const actorLabel = (actor: string | null | undefined) => actor ? ACTORS[actor] ?? actor : 'not known'
const count = (value: number | null | undefined) => value == null ? NOT_REPORTED : fmtN(value)
const size = (value: number | null | undefined) => value == null ? NOT_REPORTED : fmtBytes(value)
const lines = (added: number | null | undefined, removed: number | null | undefined) =>
  added == null && removed == null ? NOT_REPORTED : `+${count(added)} −${count(removed)}`
const turn = (index: number | null | undefined) => index == null ? NOT_REPORTED : `Turn ${fmtN(index)}`
/** The file name of a path or of a memory address (copilot-memory://scope/repo/subject). */
export function shortName(value: string) {
  const name = value.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || value
  try { return decodeURIComponent(name) } catch { return name }
}
/** A side's missing content in words: the capture's own reason ("unknown: …") first. */
export function missingReason(side: Side, source?: string | null) {
  if (source?.startsWith('unknown: ')) return `Not known: ${source.slice('unknown: '.length)}`
  const words = STATES[side.state]
  return words[0].toUpperCase() + words.slice(1)
}
const diffText = (diff: NonNullable<DetailMemoryDiff['diff']>) =>
  diff.map(row => `${row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : ' '} ${row.text}`).join('\n')

/** A section of the drawer in a Box: fold, expand, full screen and hide. */
export function BoxSection(props: { boxes: Boxes; id: string; label: string; heading?: string; children: JSX.Element }) {
  return <Box boxes={props.boxes} id={props.id} label={props.label} class={styles.section} corner
    head={<h3 class={styles.boxHead}>{props.heading ?? props.label}</h3>}>{props.children}</Box>
}

/** The diff of two contents by hash, fetched when shown. Each side without content says why. */
export function MemoryDiff(props: {
  ctx: PanelContext; label: string; first: string; second: string; absent?: 'first' | 'second'
  sources?: { first?: string | null; second?: string | null }; names?: [string, string]
  /** Only the first content is wanted: show it whole. */
  single?: boolean
}) {
  const ctx = untrack(() => props.ctx)
  const read = ctx.detail<DetailMemoryDiff>(createMemo(() => path(ctx, '/api/board/memory/diff',
    { first: props.first, second: props.second, absent: props.absent })))
  const names = () => props.names ?? ['Before', 'After']
  return <Resource read={read}>{data => {
    const missing = () => (props.single ? ['first'] as const : ['first', 'second'] as const).filter(side => data()[side].text == null)
    return <div class={styles.stack}>
      <For each={missing()}>{side =>
        <p class={styles.muted} data-missing={side}>{names()[side === 'first' ? 0 : 1]}: {missingReason(data()[side], props.sources?.[side])}</p>
      }</For>
      <Show when={!props.single && data().diff} fallback={
        <Show when={data().first.text ?? (props.single ? undefined : data().second.text)}>{whole =>
          <CodeView label={`${props.label}, ${names()[data().first.text != null ? 0 : 1]}`} text={whole()} wrap />}</Show>
      }>{diff => <Show when={diff().some(row => row.kind !== 'same')} fallback={<p class={styles.muted}>The two contents are the same</p>}>
        <CodeView label={props.label} text={diffText(diff())} wrap />
        <Show when={data().truncated}><p class={styles.muted}>Diff cut at {fmtN(diff().length)} lines</p></Show>
      </Show>}</Show>
    </div>
  }}</Resource>
}

/** A stored content by its hash, or why it is not there. */
function StoredContent(props: { ctx: PanelContext; label: string; hash: string }) {
  return <MemoryDiff ctx={props.ctx} label={props.label} first={props.hash} second="" names={['Content', 'Content']} single />
}

/** Show a row's detail, or hide it when it is the one shown. */
const pickToggle = <T,>(set: (update: (old: string | undefined) => string | undefined) => void, key: (row: T) => string) =>
  (row: T) => set(old => old === key(row) ? undefined : key(row))

const changeKey = (row: MemoryChange) => rowId(row.ts, row.path, row.tool_call_id, row.after_hash, row.agent_id)

/** Changes tab: every memory and instruction file change of the session, newest first, with its diff on demand. */
export function MemoryChanges(props: { tab: TabProps; boxes: Boxes; rows?: DetailAgent['memory_changes'] }) {
  const ctx = untrack(() => props.tab.shell.ctx)
  const [picked, pick] = createSignal<string>()
  const rows = createMemo(() => props.rows ? [...props.rows].sort((a, b) => b.ts - a.ts) : undefined)
  const toggle = pickToggle(pick, changeKey)
  const fields: Field<MemoryChange>[] = [
    { id: 'ts', label: 'Time', read: row => row.ts, format: value => stamp(Number(value), true) },
    { id: 'path', label: 'File', read: row => shortName(row.path), hint: row => row.path,
      action: { label: row => `Open ${row.path}`, run: row => props.tab.shell.open({ type: 'file', path: row.path, record: props.tab.entry.id }) } },
    { id: 'mechanism', label: 'Memory', read: row => known(row.mechanism, MECHANISMS), hint: row => row.mechanism || undefined },
    { id: 'operation', label: 'Operation', read: row => row.operation || NOT_REPORTED, hint: row => row.tool_name || undefined },
    { id: 'actor', label: 'Who', read: row => actorLabel(row.actor) },
    { id: 'agent', label: 'Agent', read: row => row.agent_id || 'Main agent' },
    { id: 'turn', label: 'Turn', read: row => turn(row.turn_index), hint: row => row.prompt_id || undefined,
      action: { label: row => row.tool_call_id ? `Open the step of ${turn(row.turn_index)} in Flow` : undefined,
        run: row => openAgent(props.tab, props.tab.entry.id, 'flow', { flowRef: { field: 'tool_call_id', id: row.tool_call_id! } }) } },
    { id: 'lines', label: 'Lines', read: row => lines(row.lines_added, row.lines_removed) },
    { id: 'size', label: 'Size', read: row => `${row.before_source === 'absent' ? 'no file' : size(row.before_bytes)} → ${size(row.after_bytes)}`,
      hint: row => `Before: ${row.before_hash || NOT_REPORTED} (${row.before_source || NOT_REPORTED}) · After: ${row.after_hash || NOT_REPORTED} (${row.after_source || NOT_REPORTED})` },
  ]
  const selected = () => rows()?.find(row => changeKey(row) === picked())
  return <BoxSection boxes={props.boxes} id="memory" label="Memory and instructions"
    heading={rows()?.length ? `Memory and instructions · ${fmtN(rows()!.length)}` : undefined}>
    <Show when={rows()} fallback={<PanelState state="unavailable" />}>{list =>
      <Show when={list().length} fallback={<PanelState state="empty" message="No memory or instruction file changes" />}>
        <Table label="Memory and instruction changes" tableId="drawer.memory-changes" fields={fields} rows={list()} rowId={changeKey}
          action={{ label: row => picked() === changeKey(row) ? 'Hide diff' : 'Show diff', run: toggle }} />
      </Show>}
    </Show>
    <Show when={selected()}>{row =>
      <section class={styles.section} aria-label={`Diff of ${row().path}`}>
        <h3>{shortName(row().path)} · {stamp(row().ts, true)}</h3>
        <p class={styles.muted} title={row().path}>{row().path}</p>
        <MemoryDiff ctx={ctx} label={`Diff of ${row().path}`} first={row().before_hash} second={row().after_hash}
          absent={row().before_source === 'absent' ? 'first' : row().after_source === 'absent' ? 'second' : undefined}
          sources={{ first: row().before_source, second: row().after_source }} />
      </section>
    }</Show>
  </BoxSection>
}

type Point = {
  key: string; ts: number; kind: string; trigger: string; turn_index?: number | null; files_count?: number | null
  lines_added?: number | null; lines_removed?: number | null; before_tokens?: number | null; after_tokens?: number | null
  dropped_messages?: number | null; dropped_tokens?: number | null; preserved_messages?: number | null; path: string
  title: string; tool_call_id?: string; message_id: string; checkpoint?: Checkpoint; recall?: Recall
}

export function timelinePoints(checkpoints: readonly Checkpoint[] = [], recalls: readonly Recall[] = []): Point[] {
  const points: Point[] = [
    ...checkpoints.map((row, index): Point => ({ ...row, key: rowId('c', row.ts, row.kind, row.message_id, index),
      title: row.summary?.title ?? '', checkpoint: row })),
    ...recalls.map((row, index): Point => ({ key: rowId('r', row.ts, row.path, row.tool_call_id, index), ts: row.ts, kind: 'memory_recall',
      trigger: row.trigger, turn_index: row.turn_index, path: row.path, title: '', tool_call_id: row.tool_call_id, message_id: '', recall: row })),
  ]
  return points.sort((a, b) => a.ts - b.ts)
}

/** Context tab: rewind points, checkpoints, compactions, truncations, context resets and memory recalls in time order. */
export function Checkpoints(props: { tab: TabProps; boxes: Boxes; rows?: DetailAgent['checkpoints'] }) {
  const ctx = untrack(() => props.tab.shell.ctx)
  const recalls = ctx.detail<DetailMemoryRecalls>(createMemo(() => path(ctx, '/api/board/agent/recalls', { id: props.tab.entry.id })))
  const [picked, pick] = createSignal<string>()
  const points = createMemo(() => props.rows || recalls()?.data
    ? timelinePoints(props.rows ?? [], recalls()?.data?.recalls ?? []) : undefined)
  const fields: Field<Point>[] = [
    { id: 'ts', label: 'Time', read: row => row.ts, format: value => stamp(Number(value), true) },
    { id: 'kind', label: 'Kind', read: row => known(row.kind, KINDS) },
    { id: 'trigger', label: 'Trigger', read: row => row.trigger || NOT_REPORTED },
    { id: 'turn', label: 'Turn', read: row => turn(row.turn_index),
      action: { label: row => row.tool_call_id ? `Open the step of ${turn(row.turn_index)} in Flow` : undefined,
        run: row => openAgent(props.tab, props.tab.entry.id, 'flow', { flowRef: { field: 'tool_call_id', id: row.tool_call_id! } }) } },
    { id: 'files', label: 'Files', read: row => row.recall ? (row.path ? shortName(row.path) : NOT_REPORTED) : count(row.files_count),
      hint: row => row.path || undefined },
    { id: 'lines', label: 'Lines', read: row => row.recall ? NOT_APPLICABLE : lines(row.lines_added, row.lines_removed) },
    { id: 'tokens', label: 'Tokens', read: row => row.recall ? NOT_APPLICABLE : row.before_tokens == null && row.after_tokens == null ? NOT_REPORTED
      : `${count(row.before_tokens)} → ${count(row.after_tokens)}`,
      hint: row => row.recall ? undefined : `${row.before_tokens?.toLocaleString() ?? NOT_REPORTED} → ${row.after_tokens?.toLocaleString() ?? NOT_REPORTED} tokens` },
    { id: 'dropped', label: 'Dropped', read: row => row.recall ? NOT_APPLICABLE
      : row.dropped_messages == null && row.dropped_tokens == null ? NOT_REPORTED
        : `${count(row.dropped_messages)} messages · ${count(row.dropped_tokens)} tokens`,
      hint: row => row.checkpoint?.cumulative_dropped_tokens == null ? undefined
        : `${fmtN(row.checkpoint.cumulative_dropped_tokens)} tokens dropped in all` },
    { id: 'preserved', label: 'Kept messages', read: row => row.recall ? NOT_APPLICABLE : count(row.preserved_messages) },
    { id: 'summary', label: 'Summary', read: row => row.recall ? NOT_APPLICABLE : row.checkpoint?.summary ? row.title || 'untitled' : 'none recorded' },
  ]
  const selected = () => points()?.find(row => row.key === picked())
  return <BoxSection boxes={props.boxes} id="checkpoints" label="Checkpoints"
    heading={points()?.length ? `Checkpoints · ${fmtN(points()!.length)}` : undefined}>
    <Show when={recalls()?.status === 'error'}>
      <PanelState state="error" message={`Memory recalls could not load: ${String(recalls()?.error ?? '').replace(/^Error: /, '')}`} onRetry={recalls.retry} />
    </Show>
    <Show when={points()} fallback={<PanelState state={recalls() ? 'loading' : 'unavailable'} />}>{list =>
      <Show when={list().length} fallback={<PanelState state="empty" message="No checkpoints, compactions or memory recalls" />}>
        <Table label="Checkpoints and memory recalls" tableId="drawer.checkpoints" fields={fields} rows={list()} rowId={row => row.key}
          action={{ label: row => picked() === row.key ? 'Hide detail' : 'Show detail', run: pickToggle(pick, (row: Point) => row.key) }} />
      </Show>}
    </Show>
    <Show when={selected()}>{row => <PointDetail ctx={ctx} tab={props.tab} point={row()} />}</Show>
  </BoxSection>
}

function PointDetail(props: { ctx: PanelContext; tab: TabProps; point: Point }) {
  const title = () => `${known(props.point.kind, KINDS)} · ${stamp(props.point.ts, true)}`
  return <section class={styles.section} aria-label={title()}>
    <h3>{title()}</h3>
    <Show when={props.point.recall} fallback={<>
      <Show when={props.point.checkpoint?.summary} fallback={<p class={styles.muted}>No summary recorded</p>}>{summary => <>
        <Show when={summary().title}><p><strong>{summary().title}</strong></p></Show>
        <Show when={summary().text != null} fallback={<p class={styles.muted} data-summary="missing">Text not kept</p>}>
          <CodeView label={`Summary of ${title()}`} text={summary().text!} wrap />
          <Show when={summary().bytes != null && summary().text!.length < summary().bytes!}>
            <p class={styles.muted}>Preview of {fmtBytes(summary().bytes)}</p></Show>
        </Show>
      </>}</Show>
      <Show when={props.point.kind === 'rewind_point' && props.point.message_id}>{message =>
        <RewindFiles ctx={props.ctx} tab={props.tab} message={message()} />}</Show>
    </>}>{recall => <>
      <Show when={recall().path}><p class={styles.muted} title={recall().path}>{recall().path}</p></Show>
      <Show when={recall().bytes != null}><p class={styles.muted}>Loaded {fmtBytes(recall().bytes)}</p></Show>
      <Show when={recall().content_hash} fallback={<p class={styles.muted} data-missing="first">Content: Not recorded</p>}>{hash =>
        <StoredContent ctx={props.ctx} label={`Recalled ${recall().path || 'memory'}`} hash={hash()} />}</Show>
    </>}</Show>
  </section>
}

/** The files a rewind point covers, fetched when shown; content only for files whose content is stored. */
function RewindFiles(props: { ctx: PanelContext; tab: TabProps; message: string }) {
  const ctx = untrack(() => props.ctx)
  const read = ctx.detail<DetailCheckpointFiles>(createMemo(() => path(ctx, '/api/board/agent/checkpoint/files',
    { id: props.tab.entry.id, message_id: props.message })))
  const [picked, pick] = createSignal<string>()
  const fields: Field<RewindFile>[] = [
    { id: 'path', label: 'File', read: row => shortName(row.path), hint: row => row.path },
    { id: 'state', label: 'State', read: row => row.state || NOT_REPORTED },
    { id: 'version', label: 'Version', read: row => count(row.version) },
    { id: 'mechanism', label: 'Memory', read: row => row.mechanism ? MECHANISMS[row.mechanism] ?? row.mechanism : 'none' },
    { id: 'size', label: 'Size', read: row => size(row.size_bytes) },
    { id: 'lines', label: 'Lines', read: row => lines(row.lines_added, row.lines_removed) },
  ]
  const selected = () => read()?.data?.files.find(row => row.path === picked())
  return <Resource read={read}>{data =>
    <Show when={data().files.length} fallback={<PanelState state="empty" message="No files recorded for this rewind point" />}>
      <Table label="Files of this rewind point" tableId="drawer.rewind-files" fields={fields} rows={data().files} rowId={row => row.path}
        action={{ label: row => row.blob_hash ? (picked() === row.path ? 'Hide content' : 'Show content') : '',
          run: pickToggle(pick, (row: RewindFile) => row.path) }} />
      <Show when={selected()}>{row => <StoredContent ctx={ctx} label={`Content of ${row().path}`} hash={row().blob_hash} />}</Show>
    </Show>
  }</Resource>
}

const versionKey = (row: Version) => rowId(row.ts, row.origin, row.session_id, row.content_hash)

/** File detail: every recorded version of a memory or instruction file, and the diff of two chosen versions. */
export function MemoryVersions(props: { shell: DrawerProps; boxes: Boxes; path: string; record?: string }) {
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<DetailMemoryVersions>(createMemo(() => path(ctx, '/api/board/memory/versions', { path: props.path, record: props.record })))
  const [chosen, choose] = createSignal<readonly string[]>([])
  const toggle = (row: Version) => choose(old => old.includes(versionKey(row)) ? old.filter(key => key !== versionKey(row))
    : [...old, versionKey(row)].slice(-2))
  const fields: Field<Version>[] = [
    { id: 'ts', label: 'Time', read: row => row.ts, format: value => stamp(Number(value), true) },
    { id: 'origin', label: 'Origin', read: row => known(row.origin, ORIGINS), hint: row => row.state || undefined },
    { id: 'session', label: 'Session', read: row => row.session_id ? row.title || row.session_id : NOT_REPORTED, hint: row => row.session_id || undefined,
      action: { label: row => row.session_id ? `Open session ${row.title || row.session_id}` : undefined,
        run: row => props.shell.open({ type: 'agent', id: row.session_id, tab: 'changes' }) } },
    { id: 'agent', label: 'Agent', read: row => row.session_id ? row.agent_id || 'Main agent' : NOT_REPORTED },
    { id: 'actor', label: 'Who', read: row => actorLabel(row.actor) },
    { id: 'operation', label: 'Operation', read: row => row.operation || NOT_REPORTED },
    { id: 'size', label: 'Size', read: row => size(row.size_bytes), hint: row => row.content_hash || undefined },
    { id: 'lines', label: 'Lines', read: row => lines(row.lines_added, row.lines_removed) },
  ]
  return <Resource read={read}>{data =>
    <Show when={data().mechanism}>
      <BoxSection boxes={props.boxes} id="versions" label="Versions" heading={`Versions · ${fmtN(data().versions.length)} · ${known(data().mechanism, MECHANISMS)}`}>
        <Show when={data().versions.length} fallback={<PanelState state="empty" message="No versions recorded" />}>
          <Table label="Versions" tableId="drawer.memory-versions" fields={fields} rows={data().versions} rowId={versionKey}
            action={{ label: row => chosen().includes(versionKey(row)) ? 'Unselect' : 'Select to compare', run: toggle }} />
        </Show>
        <Show when={chosen().length === 2 ? data().versions.filter(row => chosen().includes(versionKey(row))) : undefined}>{pair =>
          <section class={styles.section} aria-label="Diff of the selected versions">
            <h3>{stamp(pair()[0].ts, true)} → {stamp(pair()[1].ts, true)}</h3>
            <MemoryDiff ctx={ctx} label="Diff of the selected versions" first={pair()[0].content_hash} second={pair()[1].content_hash}
              sources={{ first: pair()[0].after_source, second: pair()[1].after_source }}
              names={[stamp(pair()[0].ts, true), stamp(pair()[1].ts, true)]} />
          </section>
        }</Show>
      </BoxSection>
    </Show>
  }</Resource>
}
