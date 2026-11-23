import { fmtDur, statusMeta } from '../design/format'

/**
 * The span of a session as its own records give it: the first and the last activity it recorded.
 * The process start (after a resume) and the process exit (a file time) are not the session's span.
 */
export interface SessionSpan { start?: number; end?: number; seconds?: number }

export function sessionSpan(agent?: { started_at?: number | null; last_activity_at?: number | null }): SessionSpan {
  const start = agent?.started_at ?? undefined, end = agent?.last_activity_at ?? undefined
  return { start, end, seconds: start != null && end != null && end >= start ? end - start : undefined }
}

/** "4 h 35 min", or the reason the span is not known. */
export const spanLabel = (span: SessionSpan) => span.seconds != null ? fmtDur(span.seconds)
  : span.start == null ? 'first activity not recorded' : 'last activity not recorded'

/** What the Flow header says about the session: its recorded status, and whether this view follows it live. */
export function flowStatus(status: string | null | undefined, options: { streaming: boolean; filtered: boolean; subagent: boolean }) {
  if (status == null || status === '') return { state: 'paused', label: 'Status not recorded' } as const
  const word = statusMeta(status).label
  if (status === 'ended' || status === 'failed' || status === 'stopped')
    return { state: 'ended', label: `${options.subagent ? 'Subagent' : 'Session'} ${word.toLowerCase()}` } as const
  const following = options.streaming ? 'Live' : options.filtered ? 'Filtered, not live' : 'Not live'
  return { state: options.streaming ? 'live' : 'paused', label: `${following} · ${word.toLowerCase()}` } as const
}
