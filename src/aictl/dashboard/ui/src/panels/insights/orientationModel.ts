// ─── Orientation cost at full width: the line under the title, the dot rows per project and the bars per tool ─
// The payload and the hovers are in insightsModel.ts (OrientationBody, orientationProjectHover, orientationToolHover, …).
import { fmtNum, fmtUsd, projectName } from '../../design/format'
import type { BarRow } from './Bars'
import type { DotMeasure, DotRow } from './charts/DotRows'
import { count, leftOut, money, orientationToolHover, orientationProjectHover, plural, type Label, type OrientationBody } from './insightsModel'
import { OTHER, repoColour, repoColourVar, repoName } from './repoSplit'

/** The one line under the title: what is measured, over which sessions; no figure. */
export function orientationLine(body: OrientationBody) {
  if (!body.summary.sessions) return 'No session started in this period.'
  return "Main-agent requests, and their list-price cost, before a session's first edit; medians per project over the sessions " +
    'that edit, and per tool the sessions with and without an edit.'
}

/** What keeps the cost figures from being misread: requests with no known price are left out of them. */
export const orientationUnpriced = (body: OrientationBody) => leftOut(body.summary.unpriced_requests).trim()

/** Per project, its median requests and median cost before the first edit, each on its own axis. A project that is one of
 * the ranked repositories takes that repository's colour when the view colours by repository. */
export function projectDots(body: OrientationBody, label: Label, byRepo: boolean): { measures: DotMeasure[]; rows: DotRow[] } {
  const requests = Math.max(0, ...body.projects.map(row => row.p50_requests ?? 0))
  const cost = Math.max(0, ...body.projects.map(row => row.p50_cost_usd ?? 0))
  return {
    measures: [{ key: 'requests', name: 'Median requests before the first edit', top: requests, topText: fmtNum(requests) },
      { key: 'cost', name: 'Median cost before the first edit', top: cost, topText: fmtUsd(cost) }],
    rows: body.projects.map(row => {
      const colour = repoColour(body.repo_order, row.project_path)
      const ranked = byRepo && colour !== OTHER
      const hover = orientationProjectHover(row, label) +
        (ranked ? ` Coloured as the repository ${repoName(body.repo_order, row.project_path)} in the legend.` : '')
      return {
        key: row.project_path, name: projectName(row.project_path), title: row.project_path,
        sub: `${plural(row.sessions, 'session')} · ${row.tools.map(label).join(', ')}`,
        colour: ranked ? repoColourVar(colour) : undefined, swatch: ranked,
        values: [{ value: row.p50_requests, text: `${count(row.p50_requests)} requests`, hover },
          { value: row.p50_cost_usd, text: money(row.p50_cost_usd), hover }],
      }
    }),
  }
}

/** Per tool, the list-price cost of the main-agent requests of its sessions with no edit, in one colour. */
export function neverCostRows(body: OrientationBody, label: Label): BarRow[] {
  const total = ` All tools: ${plural(body.summary.never, 'session')} with no edit, ${money(body.summary.never_cost_usd)} at list price.`
  return body.tools.filter(tool => tool.never).map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: plural(tool.never, 'session'), total: money(tool.never_cost_usd),
    parts: [{ key: 'never_cost', label: 'cost of the sessions with no edit', value: tool.never_cost_usd, tone: 7, text: money(tool.never_cost_usd),
      hover: orientationToolHover(tool, 'never', label) + total }],
  }))
}
