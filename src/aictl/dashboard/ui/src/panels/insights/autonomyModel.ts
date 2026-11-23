// ─── Work per instruction — the payload of /api/board/insights/autonomy and what the card states ─
// The longest run of main-agent tool calls between two turns of a person, per tool and time bin, and how long
// the person took to answer once the agent stopped. A figure the source does not report is null and reads
// "not reported", never 0.
import { dayLabel, fmtDur, fmtNum } from '../../design/format'
import { NOT_REPORTED, plural, type Hero, type InsightBase, type Label } from './insightsModel'

type Num = number | null
export type BinUnit = 'day' | 'week' | 'month'
/** The figures a tool row and a bin row share. */
export type AutonomyFigures = {
  tool: string; sessions: number; multi_sessions: number
  p50_longest: Num; p90_longest: Num; mean_longest: Num; p50_multi: Num; p90_multi: Num
  turns_answered: number; waits: number; queued: number; p50_wait_s: Num; over_5m: Num; over_5m_share: Num
}
export type AutonomyTool = AutonomyFigures & {
  reported: boolean
  active: number; prompted: number; scripted: number; store_only: number; start_unread: number; no_calls: number; unread: number
  unread_sessions: number
  instructions: number; calls: number; delegated: number; one_instruction: number; mean_multi: Num; resumed: number; no_stop: number
}
export type AutonomyBin = AutonomyFigures & { bin_ts: number }
export type AutonomyBody = InsightBase<'autonomy'> & {
  tools: AutonomyTool[]; bins: AutonomyBin[]; bin_unit: BinUnit | null; prompts_from: Num
  summary: { lead: string | null; sessions: number; multi_sessions: number; one_instruction: number; not_reported: string[] }
}

/** Below this many sessions with two or more instructions, a median is not shown as the lead or joined into a trend: with
 * fewer, the nearest-rank 90th percentile is the largest session. */
export const MIN_MULTI = 10
/** A wait median, a tool's or a bin's, is stated only over this many waits. */
export const MIN_WAITS = 10

const calls = (value: Num) => value == null ? NOT_REPORTED : `${fmtNum(value)} ${value === 1 ? 'call' : 'calls'}`
const names = (items: readonly string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

/** A bin starts at a UTC day, week or month: name the UTC day, whatever the viewer's zone. */
export const binDay = (ts: number) => dayLabel(ts + new Date(ts * 1000).getTimezoneOffset() * 60)

/** The tools with a measured session, then the tool picked (the lead when none is, or the pick has gone). */
export const measuredTools = (body: AutonomyBody) => body.tools.filter(tool => tool.sessions > 0)
export function pickedTool(body: AutonomyBody, picked: string | undefined) {
  const measured = measuredTools(body)
  return measured.find(tool => tool.tool === picked) ?? measured.find(tool => tool.tool === body.summary.lead) ?? measured[0]
}

/** The multi-instruction median is the lead only with enough sessions behind it. */
export const enoughMulti = (row: AutonomyFigures) => row.multi_sessions >= MIN_MULTI && row.p50_multi != null

/** The wait median rests on enough waits. */
export const enoughWaits = (row: AutonomyFigures) => row.p50_wait_s != null && row.waits >= MIN_WAITS

/** "1 min 50 s · 304 of 1,008 over 5 min · 31 queued", not reported when the view gave no median, or too few waits. */
export function waitFigure(row: AutonomyFigures) {
  if (row.p50_wait_s == null) return NOT_REPORTED
  if (!enoughWaits(row)) return `too few waits (n=${fmtNum(row.waits)}) · ${fmtNum(row.queued)} queued`
  return `${fmtDur(row.p50_wait_s)} · ${fmtNum(row.over_5m ?? 0)} of ${fmtNum(row.waits)} over 5 min · ${fmtNum(row.queued)} queued`
}

/** A bin's wait: the median only when it rests on enough waits. */
export const binWait = (row: AutonomyBin) => enoughWaits(row) ? fmtDur(row.p50_wait_s!) : '–'

export function autonomyHero(body: AutonomyBody, tool: AutonomyTool | undefined, label: Label): Hero | undefined {
  if (!tool) return undefined
  if (enoughMulti(tool)) {
    return { value: calls(tool.p50_multi), label: `median longest run of tool calls between a person's turns, ${label(tool.tool)} ` +
      `sessions with 2 or more instructions (n=${fmtNum(tool.multi_sessions)}); 90th percentile ${calls(tool.p90_multi)}` }
  }
  return { value: `too few sessions (n=${fmtNum(tool.multi_sessions)})`, label: `${label(tool.tool)} sessions with 2 or more ` +
    `instructions. All ${plural(tool.sessions, 'session')}: median ${calls(tool.p50_longest)}, including single-instruction ` +
    'sessions, which may be scripted' }
}

/** The change from the first to the last bin of a tool with enough multi-instruction sessions. It is stated as a change
 * only when every bin between with a median, enough sessions or not, moves the same way; otherwise as the range of those
 * bins, so a rise and fall does not read as a steady change. */
export function trend(body: AutonomyBody, tool: string) {
  const unit = body.bin_unit ?? 'day'
  const rows = body.bins.filter(row => row.tool === tool && row.p50_multi != null)
  const usable = rows.filter(enoughMulti)
  if (usable.length < 2) return `too few sessions per ${unit} to show a trend`
  const first = usable[0], last = usable[usable.length - 1]
  const span = rows.filter(row => row.bin_ts >= first.bin_ts && row.bin_ts <= last.bin_ts)
  const values = span.map(row => row.p50_multi!)
  const when = (ts: number) => unit === 'day' ? `on ${binDay(ts)}` : `in the ${unit} starting ${binDay(ts)}`
  const few = span.length > usable.length ? `; ${unit}s with fewer than ${MIN_MULTI} such sessions included` : ''
  if (values.every(value => value === values[0])) return `the median stayed at ${calls(values[0])} in each ${unit}${few}`
  const steady = values.every((value, i) => i === 0 || value >= values[i - 1]) || values.every((value, i) => i === 0 || value <= values[i - 1])
  if (steady) return `the median went from ${calls(first.p50_multi)} ${when(first.bin_ts)} to ${calls(last.p50_multi)} ${when(last.bin_ts)}`
  return `the median per ${unit} ranged from ${calls(Math.min(...values))} to ${calls(Math.max(...values))} with no steady change ` +
    `(${calls(first.p50_multi)} ${when(first.bin_ts)}, ${calls(last.p50_multi)} ${when(last.bin_ts)}${few})`
}

export function autonomyFinding(body: AutonomyBody, tool: AutonomyTool | undefined, label: Label) {
  if (!tool) {
    const silent = body.summary.not_reported
    return silent.length && !body.tools.some(row => row.reported)
      ? `aictl reads no prompts for the tools in this period (${names(silent.map(label))}), so work per instruction is not reported.`
      : 'No session with a person\'s instruction and a recorded tool call in this period.'
  }
  const name = label(tool.tool)
  const runs = enoughMulti(tool)
    ? `In ${name} sessions with two or more instructions (${fmtNum(tool.multi_sessions)}), the longest run of tool calls between ` +
      `a person's turns had a median of ${calls(tool.p50_multi)} (90th percentile ${calls(tool.p90_multi)}); ${trend(body, tool.tool)}.`
    : `${name} had too few sessions with two or more instructions for a median (n=${fmtNum(tool.multi_sessions)}); across all ` +
      `${plural(tool.sessions, 'session')} the longest run of tool calls between a person's turns had a median of ` +
      `${calls(tool.p50_longest)} (90th percentile ${calls(tool.p90_longest)}).`
  const wait = tool.p50_wait_s == null ? ' The wait for a person\'s answer is not reported.'
    : !enoughWaits(tool) ? ` Too few measured waits for a median wait (n=${fmtNum(tool.waits)}).`
    : ` People answered in a median ${fmtDur(tool.p50_wait_s)} (${fmtNum(tool.over_5m ?? 0)} of ${fmtNum(tool.waits)} over 5 minutes; ` +
      `${plural(tool.queued, 'prompt')} ${tool.queued === 1 ? 'was' : 'were'} queued while the agent worked).`
  const single = tool.one_instruction * 2 > tool.sessions
    ? ` Most sessions had a single instruction and may be scripted (${fmtNum(tool.one_instruction)} of ${fmtNum(tool.sessions)}).` : ''
  return runs + wait + single
}

/** Why a tool has no figures: aictl does not read its prompts (the tool keeps them in its own files), or every session
 * of it was left out. */
export const silence = (tool: AutonomyTool) => tool.reported ? 'no measured session (every session was left out)'
  : 'not reported (aictl does not read this tool\'s prompts)'

/** The log scale of the small multiples: one axis for every tool, from 1 call to the largest 90th percentile. */
export function logScale(bins: readonly AutonomyBin[], height: number) {
  const top = Math.max(2, ...bins.map(row => Math.max(row.p90_multi ?? 0, row.p90_longest ?? 0, row.p50_longest ?? 0)))
  const span = Math.log10(top)
  return { top, y: (value: number) => height - (Math.log10(Math.max(1, value)) / span) * height }
}
