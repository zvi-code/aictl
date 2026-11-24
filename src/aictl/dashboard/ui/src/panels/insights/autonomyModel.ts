// ─── Work per instruction — the payload of /api/board/insights/autonomy and what the card states ─
// The longest run of main-agent tool calls between two turns of a person, per tool and time bin, and how long
// the person took to answer once the agent stopped. A figure the source does not report is null and reads
// "not reported", never 0.
import { dayLabel, fmtDur, fmtNum, fmtShare } from '../../design/format'
import { EVIDENCE } from './evidence'
import type { BarRow } from './Bars'
import type { StripChart, StripMark, StripRow } from './charts/PercentileStrip'
import { count, NOT_REPORTED, plural, type Hero, type InsightBase, type Label } from './insightsModel'
import { notSplitNote, repoParts, type RepoSegment } from './repoSplit'

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
  /** The answered waits per repository (repoSplit.ts): `waits`, `over_5m`. */
  repos?: RepoSegment[]
}
export type AutonomyBin = AutonomyFigures & { bin_ts: number }
export type AutonomyBody = InsightBase<'autonomy'> & {
  tools: AutonomyTool[]; bins: AutonomyBin[]; bin_unit: BinUnit | null; prompts_from: Num
  summary: { lead: string | null; sessions: number; multi_sessions: number; one_instruction: number; not_reported: string[] }
}

/** Below this many sessions with two or more instructions, a tool's median of them is not shown: with fewer, the
 * nearest-rank 90th percentile is the largest session. */
export const MIN_MULTI = 10
/** A wait median is stated only over this many waits. */
export const MIN_WAITS = 10
/** A bin is drawn in a trend only with this many sessions of 2 or more instructions, and a trend only with this many such bins. */
export const MIN_TREND_SESSIONS = 5
export const MIN_TREND_BINS = 3

const calls = (value: Num) => value == null ? NOT_REPORTED : `${fmtNum(value)} ${value === 1 ? 'call' : 'calls'}`
const names = (items: readonly string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

/** A bin starts at a UTC day, week or month: name the UTC day, whatever the viewer's zone. */
export const binDay = (ts: number) => dayLabel(ts + new Date(ts * 1000).getTimezoneOffset() * 60)

/** The tools with a measured session, the most sessions first: the order of the card's rows. */
export const measuredTools = (body: AutonomyBody) => body.tools.filter(tool => tool.sessions > 0)
  .sort((a, b) => b.sessions - a.sessions || b.multi_sessions - a.multi_sessions)
/**
 * The tool the card leads with: the one with the most sessions of two or more instructions, which is what the
 * headline figure is a median of. A tool with many single-instruction sessions would lead with "too few sessions".
 */
export const leadTool = (body: AutonomyBody): AutonomyTool | undefined =>
  [...measuredTools(body)].sort((a, b) => b.multi_sessions - a.multi_sessions || b.sessions - a.sessions)[0]

/** The multi-instruction median is shown only with enough sessions behind it. */
export const enoughMulti = (row: AutonomyFigures) => row.multi_sessions >= MIN_MULTI && row.p50_multi != null

/** The wait median rests on enough waits. */
export const enoughWaits = (row: AutonomyFigures) => row.p50_wait_s != null && row.waits >= MIN_WAITS

/** A tool's longest unattended run as its bar draws it: the median and 90th percentile of sessions with 2 or more
 * instructions, or, with too few of those, of all sessions (drawn muted). Null when the tool reports neither. */
export function runRange(tool: AutonomyTool): { p50: number; p90: number | null; all: boolean } | null {
  if (enoughMulti(tool)) return { p50: tool.p50_multi!, p90: tool.p90_multi, all: false }
  if (tool.p50_longest != null) return { p50: tool.p50_longest, p90: tool.p90_longest, all: true }
  return null
}

/** The end of the shared, linear run axis: the largest 90th percentile (or median) any bar draws. */
export const runTop = (tools: readonly AutonomyTool[]) => Math.max(1, ...tools.map(tool => {
  const run = runRange(tool)
  return run ? Math.max(run.p50, run.p90 ?? 0) : 0
}))

/** "median 88 · 90th pct 286 tool calls in a row", written at the bar. */
export function runText(tool: AutonomyTool) {
  const run = runRange(tool)
  if (!run) return NOT_REPORTED
  const text = `median ${fmtNum(run.p50)} · 90th pct ${count(run.p90)} tool calls in a row`
  return run.all ? `all sessions: ${text} (too few sessions with 2 or more instructions for their own median: ` +
    `${fmtNum(tool.multi_sessions)}, ${fmtNum(MIN_MULTI)} needed)` : text
}

/** The hover of a tool's run bar: both medians, percentiles and means, the sessions behind them and the rule. */
export function runHover(tool: AutonomyTool, label: Label) {
  const run = runRange(tool)
  const name = label(tool.tool)
  const multi = `Sessions with 2 or more instructions (${fmtNum(tool.multi_sessions)} of ${fmtNum(tool.sessions)}): median ` +
    `${count(tool.p50_multi)}, 90th percentile ${count(tool.p90_multi)}, mean ${count(tool.mean_multi)} tool calls.`
  const all = `All ${plural(tool.sessions, 'session')}: median ${count(tool.p50_longest)}, 90th percentile ${count(tool.p90_longest)}, ` +
    `mean ${count(tool.mean_longest)} tool calls.`
  const drawn = !run ? 'No marks: not reported.' : run.all
    ? `Drawn grey from all sessions: fewer than ${fmtNum(MIN_MULTI)} sessions with 2 or more instructions.`
    : `Drawn from sessions with 2 or more instructions (${fmtNum(MIN_MULTI)} or more needed).`
  return `${name}: longest run of main-agent tool calls between two turns of a person, one value per session. ${multi} ${all} ` +
    `Dot: the median; ring: the 90th percentile. ${drawn}`
}

/** Tool calls per instruction, the average over the period; null with no instruction. */
export const perInstruction = (tool: AutonomyTool) => tool.instructions ? tool.calls / tool.instructions : null

/** "14.6 tool calls per instruction · 1,119 instructions in 32 sessions · 11 sessions ran on one instruction". */
export function figuresText(tool: AutonomyTool) {
  const per = perInstruction(tool)
  return [
    per == null ? null : `${fmtNum(per)} tool calls per instruction`,
    `${plural(tool.instructions, 'instruction')} in ${plural(tool.sessions, 'session')}`,
    `${plural(tool.one_instruction, 'session')} ran on one instruction`,
    tool.delegated ? `${plural(tool.delegated, 'call')} started a subagent` : null,
  ].filter(Boolean).join(' · ')
}

/** The answered waits split at 5 minutes: only when the tool reports waits and there are enough for a median. */
export function waitSplit(tool: AutonomyTool): { under: number; over: number; share: number } | null {
  if (!enoughWaits(tool) || tool.over_5m == null) return null
  const over = tool.over_5m
  return { under: Math.max(0, tool.waits - over), over, share: tool.over_5m_share ?? over / tool.waits }
}

/** The line written at the wait bar, or why there is no bar. */
export function waitText(tool: AutonomyTool) {
  if (tool.p50_wait_s == null) return NOT_REPORTED
  if (!enoughWaits(tool)) return `${plural(tool.waits, 'wait')} measured, too few for a median (${fmtNum(MIN_WAITS)} needed)`
  const split = waitSplit(tool)
  const parts = split ? `${fmtNum(split.under)} answered within 5 min · ${fmtNum(split.over)} after more than 5 min ` +
    `(${fmtShare(split.share)}) · ` : ''
  return `${parts}median wait ${fmtDur(tool.p50_wait_s)}`
}

/** The hover of one part of a tool's wait bar: the count, its share of the answered waits, the median and the rules. */
export function waitHover(tool: AutonomyTool, part: 'under' | 'over', label: Label) {
  const split = waitSplit(tool)
  if (!split) return `${label(tool.tool)}: ${waitText(tool)}`
  const n = part === 'under' ? split.under : split.over
  const when = part === 'under' ? 'within 5 minutes' : 'after more than 5 minutes'
  return `${label(tool.tool)}: ${fmtNum(n)} of ${fmtNum(tool.waits)} answered waits (${fmtShare(n / tool.waits)}) ended ${when}. ` +
    `Median wait ${fmtDur(tool.p50_wait_s)} over ${plural(tool.waits, 'wait')}; ${plural(tool.turns_answered, 'answered turn')}; ` +
    `${plural(tool.queued, 'prompt')} queued (sent less than 2 s after the agent stopped, not a wait); ` +
    `${plural(tool.resumed, 'gap')} over 24 hours counted as resumed, not a wait. A wait runs from the agent's stop to the person's next prompt.`
}

/** The hover of a trend dot: the bin, its median and 90th percentile and the sessions behind them, and the rule. */
export function trendHover(row: AutonomyBin, unit: BinUnit | null) {
  const bin = unit === 'day' || unit == null ? `${binDay(row.bin_ts)} (UTC day)` : `${unit} starting ${binDay(row.bin_ts)} (UTC)`
  return `${bin}: median ${count(row.p50_multi)}, 90th percentile ${count(row.p90_multi)} tool calls in the longest run, over ` +
    `${plural(row.multi_sessions, 'session')} with 2 or more instructions (${plural(row.sessions, 'session')} in all). ` +
    `A ${unit ?? 'bin'} is drawn with ${fmtNum(MIN_TREND_SESSIONS)} or more such sessions.`
}

/** "38 instructions were typed while the agent was still working"; empty when the tool reports no waits at all. */
export function queuedText(tool: AutonomyTool) {
  if (tool.p50_wait_s == null && !tool.queued) return ''
  return `${plural(tool.queued, 'instruction')} ${tool.queued === 1 ? 'was' : 'were'} typed while the agent was still working`
}

/** The bins of a tool a trend may use: a multi-instruction median over enough sessions, oldest first. */
export const trendBins = (body: AutonomyBody, tool: string) => body.bins
  .filter(row => row.tool === tool && row.p50_multi != null && row.multi_sessions >= MIN_TREND_SESSIONS)
  .sort((a, b) => a.bin_ts - b.bin_ts)
export const canTrend = (body: AutonomyBody, tool: string) => trendBins(body, tool).length >= MIN_TREND_BINS

export function autonomyHero(body: AutonomyBody, tool: AutonomyTool | undefined, label: Label): Hero | undefined {
  if (!tool) return undefined
  if (enoughMulti(tool)) {
    return { value: calls(tool.p50_multi), label: `median longest run of tool calls between a person's turns, ${label(tool.tool)} ` +
      `sessions with 2 or more instructions (n=${fmtNum(tool.multi_sessions)}); 90th percentile ${calls(tool.p90_multi)}` }
  }
  return { value: `too few sessions (n=${fmtNum(tool.multi_sessions)})`, label: `${label(tool.tool)} sessions with 2 or more ` +
    `instructions. All ${plural(tool.sessions, 'session')}: median ${calls(tool.p50_longest)}, including ` +
    `${plural(tool.one_instruction, 'single-instruction session')}` }
}

/** The change over the bins a trend may use. It is stated as a change only when every one of them moves the same way;
 * otherwise as their range, so a rise and fall does not read as a steady change. */
export function trend(body: AutonomyBody, tool: string) {
  const unit = body.bin_unit ?? 'day'
  const rows = trendBins(body, tool)
  if (rows.length < MIN_TREND_BINS) return `too few sessions per ${unit} to show a trend`
  const first = rows[0], last = rows[rows.length - 1]
  const values = rows.map(row => row.p50_multi!)
  const when = (ts: number) => unit === 'day' ? `on ${binDay(ts)}` : `in the ${unit} starting ${binDay(ts)}`
  if (values.every(value => value === values[0])) return `the median stayed at ${calls(values[0])} in each ${unit}`
  const steady = values.every((value, i) => i === 0 || value >= values[i - 1]) || values.every((value, i) => i === 0 || value <= values[i - 1])
  if (steady) return `the median went from ${calls(first.p50_multi)} ${when(first.bin_ts)} to ${calls(last.p50_multi)} ${when(last.bin_ts)}`
  return `the median per ${unit} ranged from ${calls(Math.min(...values))} to ${calls(Math.max(...values))} with no steady change ` +
    `(${calls(first.p50_multi)} ${when(first.bin_ts)}, ${calls(last.p50_multi)} ${when(last.bin_ts)})`
}

export function autonomyFinding(body: AutonomyBody, tool: AutonomyTool | undefined, label: Label) {
  if (!tool) {
    // Every tool with sessions was below the card's evidence minimum: the card names them in one line.
    if (body.summary.sessions > 0 && body.tools.every(row => !row.sessions)) {
      return `Every tool had too few sessions in this period to compare (fewer than ${fmtNum(EVIDENCE.autonomy.minimum)} each).`
    }
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
  const single = tool.one_instruction
    ? ` ${fmtNum(tool.one_instruction)} of ${fmtNum(tool.sessions)} ${name} sessions had a single instruction.` : ''
  return runs + wait + single
}

/** Why a tool has no figures: aictl does not read its prompts (the tool keeps them in its own files), or every session
 * of it was left out. */
export const silence = (tool: AutonomyTool) => tool.reported ? 'no measured session (every session was left out)'
  : 'not reported (aictl does not read this tool\'s prompts)'

/** What the hover of a median (the run bar, a trend dot) adds when the card's other bars are split by repository. */
export const medianNote = (body: AutonomyBody) => body.repo_order?.length ? ` ${notSplitNote('median')}` : ''

/** Per tool, its answered waits in a segment per repository, each with how many of them took more than 5 minutes; the
 * second bar under the wait bar. Only tools the server split. */
export function waitRepoRows(body: AutonomyBody, label: Label): BarRow[] {
  return measuredTools(body).filter(tool => tool.repos?.length && tool.waits > 0).map(tool => {
    const name = label(tool.tool)
    const detail = `${name}: ${plural(tool.waits, 'answered wait')} in all, ${tool.over_5m == null ? NOT_REPORTED : fmtNum(tool.over_5m)} ` +
      'after more than 5 minutes. A wait runs from the agent\'s stop to the person\'s next prompt.'
    const parts = repoParts(tool.repos, 'waits', body.repo_order, value => plural(value, 'wait'), `${name}, answered waits`, 'answered waits')
      .map(part => {
        const over = tool.repos!.find(segment => `repo:${segment.repo}` === part.key)?.over_5m
        return { ...part, hover: `${part.hover} ${typeof over === 'number' ? fmtNum(over) : NOT_REPORTED} of them after more than 5 minutes. ${detail}` }
      })
    return { key: tool.tool, label: name, sub: plural(tool.waits, 'answered wait'), parts,
      total: `${fmtNum(tool.waits)} · ${tool.over_5m == null ? NOT_REPORTED : fmtNum(tool.over_5m)} over 5 min` }
  })
}

// ─── The view: what each chart draws ───────────────────────────────────────────────────────────────────────────────

/** The one line under the title: what is measured, in what unit, over what; or why nothing is drawn. */
export function autonomyLine(body: AutonomyBody, label: Label): string {
  if (!measuredTools(body).length) return autonomyFinding(body, undefined, label)
  return 'Per session, the longest run of main-agent tool calls between two turns of a person (tool calls); per tool, the ' +
    'answered waits for a person, split at 5 minutes.'
}

/** "median 25 · p90 110", "median 8 · p90 30, all sessions": the figures written at the end of a run strip row. */
export function runLabel(tool: AutonomyTool) {
  const run = runRange(tool)
  if (!run) return NOT_REPORTED
  return `median ${fmtNum(run.p50)} · p90 ${count(run.p90)}${run.all ? ', all sessions' : ''}`
}

/** The longest run per session, per tool: the median and 90th percentile on one axis, muted when drawn from all
 * sessions (too few with 2 or more instructions). Every mark's hover holds both medians, the figures of the tool and the rule. */
export function runStrip(body: AutonomyBody, label: Label): StripChart {
  const rows = measuredTools(body).map((tool): StripRow => {
    const run = runRange(tool)
    const hover = `${runHover(tool, label)} ${figuresText(tool)}.${medianNote(body)}`
    const marks: StripMark[] = !run ? [] : [
      { key: 'median', shape: 'mid', label: 'median', value: run.p50, text: fmtNum(run.p50), hover: `Median: ${fmtNum(run.p50)} tool calls. ${hover}` },
      ...(run.p90 == null ? [] : [{ key: 'p90', shape: 'high' as const, label: '90th percentile', value: run.p90, text: fmtNum(run.p90),
        hover: `90th percentile: ${fmtNum(run.p90)} tool calls. ${hover}` }]),
    ]
    return { key: tool.tool, label: label(tool.tool), marks, text: runLabel(tool), muted: run?.all ?? false,
      sub: `${plural(tool.sessions, 'session')} · ${fmtNum(tool.multi_sessions)} with 2+ instructions` }
  })
  const top = runTop(measuredTools(body))
  return { name: 'autonomy-runs', title: 'Longest run of tool calls per session', rows, top, start: '0', end: `${fmtNum(top)} tool calls`,
    axis: 'Position: tool calls in a row, one linear scale from 0. Sessions with 2 or more instructions; grey: all sessions.',
    legend: [{ shape: 'mid', label: 'Median' }, { shape: 'high', label: '90th percentile' }] }
}

/** Per tool, its answered waits: a 100% bar split at 5 minutes, or (by repository) a bar of waits per repository on one
 * scale. A tool with too few waits keeps its row, with no bar and the reason written. */
export function waitRows(body: AutonomyBody, label: Label, mode: 'parts' | 'repo'): BarRow[] {
  if (mode === 'repo') {
    const split = waitRepoRows(body, label)
    return measuredTools(body).filter(tool => tool.waits > 0).map(tool => split.find(row => row.key === tool.tool) ?? {
      key: tool.tool, label: label(tool.tool), sub: plural(tool.waits, 'answered wait'), total: `${fmtNum(tool.waits)} waits`,
      parts: [{ key: 'whole', label: 'answered waits', value: tool.waits, tone: 7, text: plural(tool.waits, 'wait'),
        hover: `${label(tool.tool)}: ${plural(tool.waits, 'answered wait')}. Not split by repository in this answer.` }],
    })
  }
  return measuredTools(body).map(tool => {
    const split = waitSplit(tool)
    const part = (key: 'under' | 'over', value: number, tone: number) => ({ key, value, tone,
      label: key === 'under' ? 'within 5 minutes' : 'after more than 5 minutes',
      text: `${fmtNum(value)} · ${fmtShare(value / tool.waits)}`, hover: waitHover(tool, key, label) })
    return {
      key: tool.tool, label: label(tool.tool),
      sub: `${plural(tool.waits, 'answered wait')} · ${fmtNum(tool.queued)} queued`,
      total: !split ? waitText(tool) : `median wait ${fmtDur(tool.p50_wait_s)}`,
      parts: split ? [part('under', split.under, 2), part('over', split.over, 1)] : [],
    }
  })
}

/** One dot of a trend: its place (0 to 1 along the period, 0 to 1 up the scale), its value, whether it is written, its hover. */
export type TrendPoint = { ts: number; x: number; y: number; value: number; written: boolean; hover: string }
const MAX_WRITTEN = 12

/** A tool's trend: the bins it may use, placed on the period from the first to the last, each with its hover. With more
 * than 12 bins only the first, last, lowest and highest carry their value; every dot keeps its hover. */
export function trendPoints(body: AutonomyBody, tool: string): { points: TrendPoint[]; top: number } {
  const rows = trendBins(body, tool)
  const top = Math.max(1, ...rows.map(row => row.p50_multi!))
  const first = rows[0]?.bin_ts ?? 0, last = rows.at(-1)?.bin_ts ?? 0
  const values = rows.map(row => row.p50_multi!)
  const written = values.length <= MAX_WRITTEN ? new Set(values.map((_, i) => i))
    : new Set([0, values.length - 1, values.indexOf(Math.min(...values)), values.indexOf(Math.max(...values))])
  return { top, points: rows.map((row, i) => ({
    ts: row.bin_ts, x: last > first ? (row.bin_ts - first) / (last - first) : 0.5, y: row.p50_multi! / top, value: row.p50_multi!,
    written: written.has(i), hover: trendHover(row, body.bin_unit) + medianNote(body),
  })) }
}

const TICKS = 6
/** The bins named under a trend: every one up to 6, else 6 spread evenly with the first and the last. */
export function trendTicks(points: readonly TrendPoint[]): TrendPoint[] {
  if (points.length <= TICKS) return [...points]
  const step = (points.length - 1) / (TICKS - 1)
  return Array.from({ length: TICKS }, (_, i) => points[Math.round(i * step)])
}
