// ─── Kusto runs — the payload of /api/board/insights/kql and the finding it states ─
// A period with fewer than 20 recognised runs in 3 sessions states no finding and no failure share.
import { fmtNum } from '../../design/format'
import { bytes, hours, plural, share, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
type Figures = { runs: number; sessions: number; failures: number; changes: number; large: number; sum_ms: number; output_bytes: number }
export type KqlKind = 'query' | 'management' | 'unknown'
export type KqlShape = Figures & {
  shape_key: string; snippet: string; kind: KqlKind; verb: string | null; most_in_session: number | null; repeated_sessions: number
  repeat_runs: number
}
export type KqlBody = Base<'kql'> & {
  coverage: { tool: string; runs: number; unrecognised: number; mcp: number; cli: number; script: number; with_text: number }[]
  kinds: (Figures & { kind: KqlKind; verb: string | null; change: boolean })[]
  failure_kinds: { failure: string; runs: number }[]
  targets: (Figures & { cluster: string | null; database: string | null })[]
  shapes: KqlShape[]
  projects: (Figures & { project: string })[]
  large: { session_id: string; node_id: string; tool: string; ts: Num; route: string; kind: KqlKind; verb: string | null
    output_bytes: number; snippet: string; text: string; project_name: string | null }[]
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
export const kindName = (kind: KqlKind, verb: string | null) => kind === 'management' ? `.${verb ?? '?'}` : kind === 'query' ? 'query' : 'text not kept'

/** How much Kusto the agents ran, the schema and data changes, the failure share and kind, the query run most, and the large results. */
export function kqlFinding(body: KqlBody) {
  const s = body.summary
  const blind = s.unrecognised ? ` ${plural(s.unrecognised, 'command line')} named kusto or kql but were not recognised as a run.` : ''
  if (!s.runs) return `No recognised Kusto run in this period.${blind}`
  if (!s.enough) return `Only ${plural(s.runs, 'recognised Kusto run')} in ${plural(s.sessions, 'session')}: too few to compare ` +
    `(the card needs 20 in 3 sessions).${blind}`
  const changes = s.changes ? ` ${plural(s.changes, 'run')} changed schema or data (${s.change_verbs.map(verb => `.${verb}`).join(', ')}).` : ' No run changed schema or data.'
  const failed = ` ${share(s.failure_share)} failed` + (s.top_failure ? `, most often ${FAILURE_LABELS[s.top_failure.failure] ?? s.top_failure.failure} ` +
    `(${fmtNum(s.top_failure.runs)}).` : '.')
  const repeated = s.repeated ? ` One query shape was run ${plural(s.repeated.repeat_runs, 'time')} in ${plural(s.repeated.repeated_sessions, 'session')}` +
    ` that ran it 3 times or more.` : ''
  const large = s.large ? ` ${plural(s.large, 'result')} of 100 KB or more brought ${bytes(s.large_bytes)} into the context.` : ''
  return `The agents ran Kusto ${plural(s.runs, 'time')} in ${plural(s.sessions, 'session')}, taking ${hours(s.sum_ms)}.` +
    changes + failed + repeated + large + blind
}

export const kqlHero = (body: KqlBody): Hero | undefined => body.summary.enough
  ? { value: fmtNum(body.summary.changes), label: `Kusto runs changed schema or data, of ${plural(body.summary.runs, 'run')}` } : undefined

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
