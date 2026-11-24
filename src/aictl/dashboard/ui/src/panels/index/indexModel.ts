// The Index screen's body (/api/board/index, built by src/aictl/index_breakdown.py) and its wording.
import { ago, fmtBytes, fmtNum, NA, stamp } from '../../design/format'
import { nodeNoun } from '../../data/nodeNames'

export type FileStates = Record<'complete' | 'reading' | 'changed' | 'waiting' | 'reread' | 'outside_window' | 'unreadable', number>
export type Home = {
  tool: string; path: string; found_by: string[]; exists: boolean; session_folder: string
  session_folder_exists: boolean | null; read_by: string
}
export type Location = {
  tool: string; kind: string; path: string; exists: boolean | null; files: number; bytes: number; sessions: number
  newest: number | null; oldest: number | null; states: FileStates; bytes_read: number
  unreadable: { path: string; reason: string }[]; unclaimed: number | null; reader: string; reader_version: number | null
  older_version_files: number | null; folders_without_transcript: number | null; indexed_at?: number | null
}
export type Database = {
  tool: string; path: string; exists: boolean; sessions: number; with_events_file: number; events_file_seen_before: number
  without_events_file: number; outside_window: number; usage_rows_read: boolean; app_sessions: number | null; error: string
}
export type Compare = {
  tool: string; on_disk: number | null; stored: number | null; matched: number | null; comparable: boolean; reason: string
  missing: Record<string, number>; missing_ids: Record<string, string[]>
  stored_only: Record<string, number>; stored_only_ids: Record<string, string[]>; files: number; bytes: number
}
export type Project = {
  path: string; found_by: string[]; exists: boolean | null; git_root: string; worktree_of: string
  sessions: Record<string, number>; last_activity: number | null; instructions: number; memory: number; skills: number
  agents: number; ignored: boolean; outside_roots: boolean
}
export type ContextFolder = {
  tool: string; category: string; scope: string; path: string; exists: boolean; files: number; bytes: number
  newest: number | null; pattern: string; listed: string[]
}
export type Poll = { reader: string; enabled: boolean; last_poll_at: number | null; last_completed_at: number | null; last_error: string | null }
export type Settings = {
  node_id: string; roots: string[]; ignored_dirs: string[]; history_days: number; read_limit_bytes_per_poll: number
  read_limit_now_bytes: number | null; store_host: string; store_database: string; daemon_pid: number | null
  daemon_started_at: number | null; polls: Poll[]
}
export type StoreIndex = { as_of: number | null; since_daemon_start: number | null; locations: Location[]; compare: Compare[] }
export type IndexNode = {
  node_id: string; origin: 'live' | 'published' | 'store'; computed_at: number; published_at?: number | null
  duration_ms?: number; reader_state: string; positions_saved_at?: number | null
  settings: Settings | null; homes: Home[] | null; locations: Location[] | null; databases: Database[] | null
  compare: Compare[] | null; projects: Project[] | null; context: ContextFolder[] | null; store_index: StoreIndex | null
  note?: string; truncated?: boolean
}
export type IndexBody = {
  generated_at: number; scope: { kind: string; node_id: string | null }; project_filter: string[]; nodes: IndexNode[]
  tool_labels?: Record<string, string>
}

// The server's reasons (index_breakdown.MISSING_REASONS, STORED_ONLY_REASONS), in plain words.
export const MISSING: Record<string, string> = {
  unreadable: 'A file of it cannot be read',
  not_read: 'Not read yet: in the reader’s backlog, or read up to a point',
  outside_window: 'Older than history_days: the reader does not read it',
  folder_only: 'Session folder without a transcript file (no events.jsonl)',
  database_no_row: 'Listed in the Copilot database, no stored row',
  read_no_row: 'Read to its end, no stored row: the reader stores no row for a file with no turn and no usage',
}
export const STORED_ONLY: Record<string, string> = {
  database: 'Taken from the Copilot database (session-store.db): no session file of it was found',
  live: 'Seen live by hooks or process monitoring: its id names no session file',
  gone: 'No session file found now: removed since, or kept where no reader looks',
}
export const STATES: [keyof FileStates, string][] = [
  ['complete', 'Read completely'], ['waiting', 'Not read yet'], ['reread', 'Waiting to be read again (newer reader)'],
  ['reading', 'Being read'], ['changed', 'Grew since read'], ['outside_window', 'Older than history_days'],
  ['unreadable', 'Unreadable'],
]

/** Where a node's figures come from, and how old they are, in one line. */
export function originText(node: IndexNode, now = Date.now() / 1000) {
  if (node.origin === 'live') {
    const took = node.duration_ms != null ? `, took ${fmtNum(Math.round(node.duration_ms))} ms` : ''
    const state = node.reader_state === 'running daemon' ? 'read state from the running daemon'
      : node.reader_state === 'saved read positions' ? `read state from the saved read positions${node.positions_saved_at ? ` (saved ${stamp(node.positions_saved_at, true)})` : ''}`
        : 'no saved read positions found: every file shows as not read'
    return `Live: computed on this node at ${stamp(node.computed_at, true)}${took}; ${state}.`
  }
  if (node.origin === 'published') {
    const at = node.published_at ?? node.computed_at
    return `Published snapshot: computed by ${nodeNoun(node.node_id)}'s daemon at ${stamp(at, true)} (${ago(at, now)}), read from the store.`
  }
  return 'From the store only: this node publishes no breakdown.'
}

export function indexText(index: StoreIndex, now = Date.now() / 1000) {
  const at = index.as_of != null ? `last file indexed ${stamp(index.as_of, true)} (${ago(index.as_of, now)})` : 'no indexed file'
  const since = index.since_daemon_start != null ? `; files the node's daemon found since its start at ${stamp(index.since_daemon_start, true)}`
    : '; every indexed file (the daemon start is not known, so a file removed since may still count)'
  return `From the store: the files the node's reader indexed (session_sources), ${at}${since}.`
}

const sum = (values: Record<string, number>) => Object.values(values).reduce((a, b) => a + b, 0)
export const notStored = (row: Compare) => sum(row.missing)
export const onlyStored = (row: Compare) => sum(row.stored_only)

// Reasons that mean the store is behind the disk: the reader has yet to read the session, or cannot.
export const OPEN_REASONS = ['not_read', 'unreadable', 'database_no_row'] as const
export const openGap = (row: Compare) => OPEN_REASONS.reduce((n, key) => n + (row.missing[key] ?? 0), 0)

/** The lead of the comparison: per tool, the sessions on disk the store does not hold yet, then those it holds no row
 * of for a stated reason (read with nothing to store, older than history_days, a folder without a transcript). */
export function gapFinding(rows: readonly Compare[], label: (tool: string) => string) {
  const compared = rows.filter(row => row.comparable)
  if (!compared.length) return rows.length ? 'No tool could be compared: ' + rows[0].reason + '.' : 'No session found on disk or in the store.'
  const open = compared.filter(row => openGap(row) > 0)
    .map(row => `${label(row.tool)}: ${fmtNum(openGap(row))} of ${fmtNum(row.on_disk)} on disk not stored yet or unreadable`)
  const known = compared.filter(row => notStored(row) - openGap(row) > 0)
    .map(row => `${label(row.tool)} ${fmtNum(notStored(row) - openGap(row))}`)
  const lead = open.length ? open.join(' · ') : 'Every session on disk that has something to store is stored.'
  return known.length ? `${lead} Not stored for a stated reason (see below): ${known.join(', ')}.` : lead
}

export const count = (n: number | null | undefined) => n == null ? NA : fmtNum(n)
export const size = (n: number | null | undefined) => n == null ? NA : fmtBytes(n)
export const when = (ts: number | null | undefined) => ts ? stamp(ts, true) : NA
export const yesNo = (value: boolean | null | undefined) => value == null ? 'not known' : value ? 'yes' : 'no'
export const sessionsText = (sessions: Record<string, number>, label: (tool: string) => string) =>
  Object.entries(sessions).sort((a, b) => b[1] - a[1]).map(([tool, n]) => `${label(tool)} ${fmtNum(n)}`).join(', ')
export const historyDays = (days: number | null | undefined) =>
  days == null ? NA : days ? `${days} (files changed in the last ${days} days)` : '0 (every session file still on disk)'
