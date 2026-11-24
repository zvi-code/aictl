// ─── The evidence rule of the Insights cards: the one place its minimums live ─
// A group (a tool, a model) below its card's minimum never drives a headline and never gets its own chart, bar or
// coloured cell: the card names it in one line ("Copilot Desktop: 2 sessions, too few to compare"). The totals of a
// card still count it. A card that splits by another group applies the same table to it.
import { fmtNum } from '../../design/format'
import type { Label } from './insightsModel'

export type EvidenceUnit = 'requests' | 'calls' | 'reads' | 'sessions' | 'commits'
/** Per card: what the card counts for a group, and the least a group needs to be compared. */
export const EVIDENCE: Record<string, { unit: EvidenceUnit; minimum: number }> = {
  pause: { unit: 'requests', minimum: 200 },
  carry: { unit: 'calls', minimum: 100 },
  subagents: { unit: 'requests', minimum: 200 },
  failures: { unit: 'calls', minimum: 100 },
  rereads: { unit: 'reads', minimum: 100 },
  time: { unit: 'requests', minimum: 200 },
  context: { unit: 'requests', minimum: 200 },
  orientation: { unit: 'sessions', minimum: 10 },
  fixed: { unit: 'sessions', minimum: 10 },
  problems: { unit: 'sessions', minimum: 10 },
  autonomy: { unit: 'sessions', minimum: 10 },
  verified: { unit: 'commits', minimum: 10 },
  models: { unit: 'sessions', minimum: 10 },
}
/** A model on the model report is compared only when it was seen in as many sessions as the card's minimum. */
export const MODEL_SESSIONS = EVIDENCE.models.minimum

const UNIT_ONE: Record<EvidenceUnit, string> = { requests: 'request', calls: 'call', reads: 'read', sessions: 'session', commits: 'commit' }
const count = (n: number, unit: EvidenceUnit) => `${fmtNum(n)} ${n === 1 ? UNIT_ONE[unit] : unit}`

/** A group left out of a card's comparison: a tool, or a model of a tool. */
export type Few = { tool: string; model?: string; count: number; unit: EvidenceUnit; minimum: number }

type Row = Record<string, unknown> & { tool: string }
const num = (value: unknown) => typeof value === 'number' ? value : 0
/** What each card counts for one of its tool rows; null when the tool does not record it (it is then not judged). */
const MEASURES: Record<string, (tool: Row) => number | null> = {
  pause: tool => (tool.buckets as { requests: number }[]).reduce((sum, cell) => sum + cell.requests, 0),
  carry: tool => num(tool.calls),
  subagents: tool => num((tool.main as Row).requests) + num((tool.subagents as Row).requests),
  failures: tool => num(tool.calls),
  rereads: tool => num(tool.reads),
  time: tool => num(tool.requests),
  // Requests with token counts: a tool that records none is "not reported", not a small group.
  context: tool => num(tool.reported),
  orientation: tool => num(tool.sessions),
  fixed: tool => num(tool.sessions),
  problems: tool => num(tool.sessions),
  autonomy: tool => num(tool.sessions),
  verified: tool => typeof tool.commits === 'number' ? tool.commits : null,
  models: tool => typeof tool.sessions === 'number' ? tool.sessions : null,
}

/** The tools of a card split by its minimum: those compared, and those named as too few. */
export function splitTools<T extends Row>(card: string, tools: readonly T[]): { kept: T[]; few: Few[] } {
  const rule = EVIDENCE[card], measure = MEASURES[card]
  if (!rule || !measure) return { kept: [...tools], few: [] }
  const kept: T[] = [], few: Few[] = []
  for (const tool of tools) {
    const n = measure(tool)
    // None at all is not a small group: the card already says the tool does not record it or has nothing in the period.
    if (n != null && n > 0 && n < rule.minimum) few.push({ tool: tool.tool, count: n, unit: rule.unit, minimum: rule.minimum })
    else kept.push(tool)
  }
  return { kept, few }
}

/**
 * A card's answer as its headline, visual and coloured cells may use it: the tools below the minimum taken out of
 * every per-tool list (and their models, skills, files and bins with them), with the groups taken out.
 */
export function withEvidence<T extends { card: string; tools?: unknown }>(body: T): { body: T; few: Few[] } {
  if (!Array.isArray(body.tools)) return { body, few: [] }
  const { kept, few } = splitTools(body.card, body.tools as Row[])
  const names = new Set(kept.map(tool => tool.tool))
  const keep = (rows: unknown) => Array.isArray(rows) ? (rows as Row[]).filter(row => names.has(row.tool)) : rows
  const out: Record<string, unknown> = { ...body, tools: kept }
  for (const key of ['tool_names', 'skills', 'top_skills', 'files', 'bins']) if (key in body) out[key] = keep((body as Record<string, unknown>)[key])
  if (body.card === 'models') {
    out.tools = kept.map(tool => {
      const models = (tool.models as (Row & { model: string; sessions: number })[]) ?? []
      for (const model of models.filter(row => row.sessions < MODEL_SESSIONS)) {
        few.push({ tool: tool.tool, model: model.model, count: model.sessions, unit: 'sessions', minimum: MODEL_SESSIONS })
      }
      return { ...tool, models: models.filter(row => row.sessions >= MODEL_SESSIONS) }
    })
  }
  return { body: out as T, few }
}

/** The one line that names the groups below the minimum, e.g. "Copilot Desktop: 2 sessions, too few to compare". */
export function fewText(few: readonly Few[], label: Label) {
  return few.map(item => `${item.model ?? label(item.tool)}${item.model ? ` (${label(item.tool)})` : ''}: ` +
    `${count(item.count, item.unit)}, too few to compare`).join('; ') + (few.length ? '.' : '')
}

/** The rule as the card's "how this is measured" text states it. */
export function evidenceNote(card: string) {
  const rule = EVIDENCE[card]
  if (!rule) return ''
  const models = card === 'models' ? ` A model is compared only when it was seen in ${count(MODEL_SESSIONS, 'sessions')} or more; ` +
    'when the periods of the two models compared do not overlap, the headline says so.' : ''
  return ` Evidence: a tool with fewer than ${count(rule.minimum, rule.unit)} in the period is not compared, charted or coloured; ` +
    `it is named in one line under the chart, and the totals still count it.${models}`
}
