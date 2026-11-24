// ─── The repository parts of an SVG bar (FlowsBars.tsx) of the Skills, MCP servers and Kusto queries views ─
import type { BarPart } from './flowBarModel'
import { repoColour, repoHover, repoName, type RepoRef, type RepoSegment } from './repoSplit'

/**
 * The parts of one bar, one per repository, for one measure (`key`) of its segments, in repo_order order: each coloured
 * by its repository, its hover repoHover, then `more(segment)` (that repository's figures the bar does not show), then
 * `detail`, the bar's own hover. A segment of 0 draws nothing.
 */
export function repoBarParts(order: readonly RepoRef[] | undefined, segments: readonly RepoSegment[] | undefined, key: string,
  format: (value: number) => string, bar: string, measure: string, detail = '', more?: (segment: RepoSegment) => string): BarPart[] {
  return (segments ?? []).flatMap(segment => {
    const value = segment[key]
    if (typeof value !== 'number' || value <= 0) return []
    const name = repoName(order, segment.repo)
    const hover = [repoHover({ bar, repo: segment.repo, name, value: format(value), share: segment.share?.[key] ?? null,
      ofRepo: segment.of_repo?.[key] ?? null, measure }), more?.(segment) ?? '', detail].filter(Boolean).join(' ')
    return [{ value, tone: 'muted' as const, key: `repo:${segment.repo}`, repo: repoColour(order, segment.repo), hover }]
  })
}

/** Whether an answer has a ranked repository and any of its rows carries a split. */
export const hasSplit = (order: readonly RepoRef[] | undefined, ...lists: readonly (readonly { repos?: readonly RepoSegment[] }[])[]) =>
  !!order?.length && lists.some(list => list.some(row => row.repos?.length))
