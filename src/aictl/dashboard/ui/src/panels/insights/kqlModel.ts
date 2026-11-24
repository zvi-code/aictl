// ─── Kusto runs — the payload of /api/board/insights/kql, the sentence it states and the rows of its charts ─
// A period with fewer than 20 recognised runs in 3 sessions gives counts only: no failure share in its sentence.
import { fmtNum, projectName, stamp } from '../../design/format'
import { type BarLegend, type BarRow } from './flowBarModel'
import { bytes, hours, plural, share, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
type Figures = { runs: number; sessions: number; failures: number; changes: number; large: number; sum_ms: number; output_bytes: number }
export type KqlKind = 'query' | 'management' | 'unknown'
export type KqlShape = Figures & {
  shape_key: string; snippet: string; kind: KqlKind; verb: string | null; most_in_session: number | null; repeated_sessions: number
  repeat_runs: number
}
export type KqlLarge = { session_id: string; node_id: string; tool: string; ts: Num; route: string; kind: KqlKind; verb: string | null
  output_bytes: number; snippet: string; text: string; project_name: string | null }
export type KqlBody = Base<'kql'> & {
  coverage: { tool: string; runs: number; unrecognised: number; mcp: number; cli: number; script: number; with_text: number }[]
  kinds: (Figures & { kind: KqlKind; verb: string | null; change: boolean })[]
  failure_kinds: { failure: string; runs: number }[]
  targets: (Figures & { cluster: string | null; database: string | null })[]
  shapes: KqlShape[]
  projects: (Figures & { project: string })[]
  large: KqlLarge[]
  summary: Figures & {
    enough: boolean; failure_share: Num; large_bytes: number; with_text: number; top_failure: { failure: string; runs: number } | null
    change_verbs: string[]; top_shape: KqlShape | null; repeated: KqlShape | null; unrecognised: number
    routes: { mcp: number; cli: number; script: number }; small_projects: string[]
  }
}

export const FAILURE_LABELS: Record<string, string> = {
  syntax: 'syntax error', not_found: 'name not found', auth: 'not authorised', throttled: 'throttled', timeout: 'timed out',
  limits: 'query limits', network: 'network', other: 'other', not_recorded: 'error not recorded',
}
export const ROUTE_LABELS = { mcp: 'MCP tool', cli: 'Kusto command line', script: 'Script with an inline query' } as const
export const kindName = (kind: KqlKind, verb: string | null) => kind === 'management' ? `.${verb ?? '?'}` : kind === 'query' ? 'query' : 'text not kept'

const SHOWN = 8
const ratio = (part: number, whole: number) => whole ? part / whole : null

/** How many runs, in how many sessions, how many changed schema or data, failed or brought large results: counts only. */
export function kqlFinding(body: KqlBody) {
  const s = body.summary
  const blind = s.unrecognised ? ` ${plural(s.unrecognised, 'command line')} named kusto or kql and were not recognised as a run.` : ''
  if (!s.runs) return `No recognised Kusto run in this period.${blind}`
  if (!s.enough) return `${plural(s.runs, 'recognised Kusto run')} in ${plural(s.sessions, 'session')}: ${fmtNum(s.changes)} changed ` +
    `schema or data, ${fmtNum(s.failures)} failed. The card compares groups and gives a failure share from 20 runs in 3 sessions; ` +
    `the charts show the runs there are.${blind}`
  const verbs = s.changes && s.change_verbs.length ? ` (${s.change_verbs.map(verb => `.${verb}`).join(', ')})` : ''
  return `${plural(s.runs, 'recognised Kusto run')} in ${plural(s.sessions, 'session')}, ${hours(s.sum_ms)} of run time: ` +
    `${fmtNum(s.changes)} changed schema or data${verbs}, ${fmtNum(s.failures)} failed (${share(s.failure_share)}), ` +
    `${plural(s.large, 'result')} of 100 KB or more (${bytes(s.large_bytes)}).${blind}`
}

export const kqlHero = (body: KqlBody): Hero | undefined => body.summary.runs
  ? { value: fmtNum(body.summary.runs), label: `recognised Kusto runs in ${plural(body.summary.sessions, 'session')}` } : undefined

/** The recognised runs by how they were recognised. */
export function routeRows(body: KqlBody): BarRow[] {
  const s = body.summary, total = s.routes.mcp + s.routes.cli + s.routes.script
  return (['mcp', 'cli', 'script'] as const).filter(route => s.routes[route]).map(route => {
    const hover = `${ROUTE_LABELS[route]}: ${fmtNum(s.routes[route])} of ${plural(total, 'recognised run')} (${share(ratio(s.routes[route], total))})`
    return { key: route, name: ROUTE_LABELS[route], parts: [{ value: s.routes[route], tone: 'c1', hover }], hover,
      text: `${plural(s.routes[route], 'run')} (${share(ratio(s.routes[route], total))})` }
  })
}

export const kindLegend: BarLegend = [{ tone: 'c1', label: 'Reads and queries' }, { tone: 'c4', label: 'Changes schema or data' },
  { tone: 'bad', label: 'Failed' }]
export const runLegend: BarLegend = [{ tone: 'c1', label: 'Did not fail' }, { tone: 'bad', label: 'Failed' }]

/** Hover text of a run group: runs, sessions, failures, run time and bytes returned. */
export function runHover(name: string, item: Figures) {
  return `${name}: ${plural(item.runs, 'run')} in ${plural(item.sessions, 'session')}; ${fmtNum(item.failures)} failed ` +
    `(${share(ratio(item.failures, item.runs))}); ${fmtNum(item.changes)} changed schema or data; run time ${hours(item.sum_ms)}; ` +
    `${bytes(item.output_bytes)} returned`
}

const runRow = (key: string, name: string, item: Figures, sub: string, change = false): BarRow => ({
  key, name, sub, hover: runHover(name, item),
  parts: [{ value: item.runs - item.failures, tone: change ? 'c4' : 'c1', hover: `${name}: ${fmtNum(item.runs - item.failures)} of ${plural(item.runs, 'run')} did not fail` },
    { value: item.failures, tone: 'bad', hover: `${name}: ${fmtNum(item.failures)} of ${plural(item.runs, 'run')} failed (${share(ratio(item.failures, item.runs))})` }],
  text: `${plural(item.runs, 'run')} · ${fmtNum(item.failures)} failed`,
})

/** Runs by kind and management verb, split into failed and not. */
export const kindRows = (body: KqlBody): BarRow[] => body.kinds.slice(0, SHOWN).map(item => {
  const name = kindName(item.kind, item.verb)
  return runRow(name, name, item, item.change ? 'changes schema or data' : 'reads', item.change)
})

/** The failed runs by the kind of failure read from the stored error summary. */
export const failureRows = (body: KqlBody): BarRow[] => {
  const total = body.failure_kinds.reduce((sum, item) => sum + item.runs, 0)
  return body.failure_kinds.map(item => {
    const name = FAILURE_LABELS[item.failure] ?? item.failure
    const hover = `${name}: ${fmtNum(item.runs)} of ${plural(total, 'failed run')} (${share(ratio(item.runs, total))}), read from the stored error summary`
    return { key: item.failure, name, parts: [{ value: item.runs, tone: 'bad', hover }], hover, text: plural(item.runs, 'run') }
  })
}

/** Runs per cluster and database. */
export const targetRows = (body: KqlBody): BarRow[] => body.targets.slice(0, SHOWN).map(row => {
  const name = `${row.cluster ?? 'cluster not named'} · ${row.database ?? 'database not named'}`
  return runRow(`${row.cluster ?? ''}/${row.database ?? ''}`, name, row, `${plural(row.changes, 'change')} · ${plural(row.sessions, 'session')}`)
})

export const shapeLegend: BarLegend = [{ tone: 'c2', label: 'Runs in sessions that ran the shape 3 times or more' }, { tone: 'c1', label: 'Other runs' }]

/** Hover text of a query shape: runs, sessions, and the runs in sessions that ran it 3 times or more. */
export function shapeHover(shape: KqlShape) {
  return `${shape.snippet}: ${plural(shape.runs, 'run')} in ${plural(shape.sessions, 'session')}, ${fmtNum(shape.failures)} failed; ` +
    (shape.repeat_runs ? `${fmtNum(shape.repeat_runs)} of the runs in ${plural(shape.repeated_sessions, 'session')} that ran it 3 times ` +
      `or more, up to ${fmtNum(shape.most_in_session)} in one session` : 'no session ran it 3 times or more')
}

/** The query shapes run most: runs in sessions that ran the shape 3 times or more apart from the others. */
export const shapeRows = (body: KqlBody): BarRow[] => body.shapes.slice(0, 6).map(shape => {
  const hover = shapeHover(shape)
  return { key: shape.shape_key, name: shape.snippet || 'text not kept', hover,
    sub: `${kindName(shape.kind, shape.verb)} · ${plural(shape.sessions, 'session')}` +
      (shape.most_in_session ? ` · up to ${fmtNum(shape.most_in_session)} in one session` : ''),
    parts: [{ value: shape.repeat_runs, tone: 'c2', hover }, { value: shape.runs - shape.repeat_runs, tone: 'c1', hover }],
    text: plural(shape.runs, 'run') }
})

/** Hover text of a large result: its size, kind, route, time and project. */
export function largeHover(run: KqlLarge, label: Label) {
  return `${bytes(run.output_bytes)} returned by a ${kindName(run.kind, run.verb)} run through ${ROUTE_LABELS[run.route as keyof typeof ROUTE_LABELS] ?? run.route}` +
    ` (${label(run.tool)})` + (run.ts != null ? ` at ${stamp(run.ts, true)}` : '') +
    (run.project_name ? ` in ${projectName(run.project_name)}` : '')
}

/** The runs that brought 100 KB or more into the context, by bytes. */
export const largeRows = (body: KqlBody, label: Label): BarRow[] => body.large.slice(0, 6).map((run, index) => {
  const hover = largeHover(run, label)
  return { key: `${run.session_id}:${index}`, name: run.snippet || 'text not kept', sub: kindName(run.kind, run.verb),
    parts: [{ value: run.output_bytes, tone: 'c3', hover }], hover, text: bytes(run.output_bytes) }
})

/** Runs per project with 5 or more runs. */
export const kqlProjectRows = (body: KqlBody): BarRow[] => body.projects.slice(0, SHOWN).map(row =>
  runRow(row.project, projectName(row.project), row, `${plural(row.sessions, 'session')} · ${plural(row.changes, 'change')}`))

/** How runs were recognised per tool, and the groups too small to compare, in one line. */
export function kqlCoverage(body: KqlBody, label: Label) {
  const s = body.summary
  const routes = `Recognised: ${fmtNum(s.routes.mcp)} through an MCP tool, ${fmtNum(s.routes.cli)} by a Kusto command line, ` +
    `${fmtNum(s.routes.script)} by a script with an inline query; ${fmtNum(s.with_text)} with query text kept.`
  const tools = body.coverage.filter(item => item.unrecognised).map(item => `${label(item.tool)} ${fmtNum(item.unrecognised)}`)
  const blind = tools.length ? ` Not recognised (named kusto or kql): ${tools.join(', ')}.` : ''
  const small = s.small_projects.length ? ` Too small to compare: ${plural(s.small_projects.length, 'project')} with fewer than 5 runs.` : ''
  return routes + blind + small
}
