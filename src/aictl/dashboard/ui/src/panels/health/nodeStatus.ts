import type { NodeStatus } from '../../data/contract.gen'
import { ago, fmtBps, fmtBytes, fmtDur, fmtNum, fmtPct, NA } from '../../design/format'

/** One node's status row of /api/board/nodes (view=status, or node_status of view=health). */
export type StatusRow = NodeStatus
export type StatusRecord = NonNullable<NodeStatus['record']>
export type HistoryRead = NonNullable<StatusRecord['history']>
type Scope = 'local' | 'node' | 'fleet'

export function statusPath(scope: Scope, nodeId?: string | null) {
  const query = new URLSearchParams({ view: 'status', scope })
  if (scope === 'node') {
    if (!nodeId) return
    query.set('node_id', nodeId)
  }
  return '/api/board/nodes?' + query
}

/** The rows of a status answer, or undefined when the answer is not one. */
export function statusRows(value: unknown): StatusRow[] | undefined {
  const body = value as { view?: unknown; rows?: unknown } | undefined
  return body?.view === 'status' && Array.isArray(body.rows) ? body.rows as StatusRow[] : undefined
}

const reading = (row: StatusRow) => row.status !== 'none' && row.record?.history?.state === 'reading'

/** Files within the history window: those read, being read and waiting. */
export const windowFiles = (h: HistoryRead) => h.complete + h.reading + h.waiting

export const filesText = (h: HistoryRead) => `${fmtNum(h.complete)} of ${fmtNum(windowFiles(h))} files`

export function bytesText(h: HistoryRead) {
  if (h.bytes == null || h.bytes_read == null) return NA
  const readable = h.bytes - (h.bytes_skipped ?? 0)
  return `${fmtBytes(h.bytes_read)} of ${fmtBytes(readable)}${h.percent != null ? ` (${fmtPct(h.percent)})` : ''}`
}

export function leftText(h: HistoryRead) {
  if (h.state !== 'reading') return 'done'
  if (h.eta_s == null) return 'not known yet'
  return `about ${fmtDur(h.eta_s)}`
}

export const rateText = (h: HistoryRead) => h.rate_bps == null ? NA : fmtBps(h.rate_bps)

const STATE_LABEL: Record<string, string> = {
  'reading history': 'Reading history', current: 'Current', errors: 'Errors', working: 'Working',
}

/** What a row says of its node, and how loud it is. */
export function nodeState(row: StatusRow, now: number): { label: string; level: 'ok' | 'busy' | 'warning' | 'muted' } {
  if (row.status === 'none' || !row.record) return { label: 'No status reported', level: 'muted' }
  if (row.status === 'stale') return { label: `Not reporting for ${fmtDur(now - (row.reported_at ?? now))}`, level: 'warning' }
  if (row.status === 'unknown') return { label: 'Report time not valid', level: 'warning' }
  const state = row.record.state ?? 'current'
  return {
    label: STATE_LABEL[state] ?? state,
    level: state === 'errors' ? 'warning' : state === 'reading history' || state === 'working' ? 'busy' : 'ok',
  }
}

export const reportAge = (row: StatusRow, now: number) => row.reported_at == null ? NA : ago(row.reported_at, now)

export function lastError(record: StatusRecord | null | undefined) {
  if (!record) return undefined
  const reader = record.readers?.find(r => r.last_error)
  if (reader) return `${reader.label}: ${reader.last_error}`
  if (record.writer?.last_error) return `Writer: ${record.writer.last_error}`
  const task = record.tasks?.find(t => t.last_error)
  return task ? `${task.label}: ${task.last_error}` : undefined
}

export const runningTasks = (record: StatusRecord | null | undefined) =>
  (record?.tasks ?? []).filter(t => t.state === 'running' || t.state === 'queued')

export type ReadingSummary = { reading: number; nodes: number; complete: number; files: number }

/** How many nodes in scope still read their history, with their files: undefined when none does. */
export function readingSummary(rows: readonly StatusRow[] | undefined): ReadingSummary | undefined {
  const reported = (rows ?? []).filter(row => row.status !== 'none')
  const busy = reported.filter(reading)
  if (!busy.length) return
  return {
    reading: busy.length, nodes: reported.length,
    complete: busy.reduce((n, row) => n + (row.record!.history!.complete ?? 0), 0),
    files: busy.reduce((n, row) => n + windowFiles(row.record!.history!), 0),
  }
}

export function noticeText(s: ReadingSummary) {
  const where = s.nodes === 1 ? 'on this node' : `on ${fmtNum(s.reading)} of ${fmtNum(s.nodes)} nodes`
  return `History is still being read ${where}: ${fmtNum(s.complete)} of ${fmtNum(s.files)} files; figures are incomplete`
}

/** This node's live link, in words and as a tone: only the local scope has one. */
export type LiveLink = { text: string; tone: 'live' | 'idle' | 'warning' }
export type ScopeBadge = { count: string; tone: 'ok' | 'idle' | 'warning'; reading: boolean; lines: string[] }

/** The top row's status mark: the nodes of the scope that report now, whether any still reads its history, and the
    live link. A node that stopped reporting is counted out and named on hover; the mark warns when none reports. */
export function scopeBadge(rows: readonly StatusRow[] | undefined, where: string, live?: LiveLink): ScopeBadge {
  const known = (rows ?? []).filter(row => row.status !== 'none')
  const reporting = known.filter(row => row.status !== 'stale' && row.status !== 'unknown').length
  const summary = readingSummary(rows)
  const nodes = !rows ? 'node status not received yet'
    : reporting === known.length ? `${fmtNum(reporting)} ${reporting === 1 ? 'node reports' : 'nodes report'}`
      : `${fmtNum(reporting)} of ${fmtNum(known.length)} nodes report`
  return {
    count: rows ? fmtNum(reporting) : '',
    tone: live?.tone === 'warning' || (rows && !reporting) ? 'warning' : !rows || live?.tone === 'idle' ? 'idle' : 'ok',
    reading: Boolean(summary),
    lines: [`${where}: ${nodes}.`, ...summary ? [noticeText(summary) + '.'] : [], ...live ? [live.text + '.'] : []],
  }
}
