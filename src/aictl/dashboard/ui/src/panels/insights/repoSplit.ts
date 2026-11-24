// ─── Bars split by repository: one colour per repository for the whole Insights screen ─
// Every card answer carries `repo_order`: the 8 repositories of the period with the highest list-price cost, in rank
// order, and `repo_others` (every other repository, summed). A repository's colour is its position in repo_order
// (--color-chart-1 .. --color-chart-8); every other repository is "Other repositories", in grey. A bar the server split
// carries `repos`: its segments in repo_order order, "other" (repo '') last, each with the bar's measures, `share` (of
// this bar) and `of_repo` (of the repository's own total, where the card knows it), per measure.
//
// To split one more card's bars: the server gives its bar rows `repos` (insights.attach_repos); the card builds the
// bar's parts with repoParts(...) (Bars.tsx draws them) and places <RepoLegend> once above its charts. A chart drawn
// by another component colours a segment with repoColourVar(repoColour(order, repo)).
import { fmtNum, fmtShare } from '../../design/format'
import type { BarPart } from './Bars'

export type RepoRef = { repo: string; name: string | null; cost_usd?: number; requests?: number; sessions?: number }
export type RepoOthers = { repos: number; cost_usd: number; requests: number; sessions: number } | null
type Shares = Record<string, number | null>
/** One repository's part of a bar: the bar's measures under their own names, and their shares. */
export type RepoSegment = { repo: string; name: string | null; share: Shares; of_repo: Shares } & Record<string, unknown>
export type RepoSplit = { repo_order?: RepoRef[]; repo_others?: RepoOthers }

export const REPO_COLOURS = 8
/** The colour index of "Other repositories". */
export const OTHER = -1
export const OTHER_REPOS = 'Other repositories'

/** A repository's colour index: its position in repo_order, or OTHER for every other repository ('' included). */
export function repoColour(order: readonly RepoRef[] | undefined, repo: string): number {
  const at = repo ? (order ?? []).slice(0, REPO_COLOURS).findIndex(item => item.repo === repo) : -1
  return at < 0 ? OTHER : at
}
/** The CSS colour of a colour index, for an SVG fill or an inline style: a token, never a literal colour. */
export const repoColourVar = (colour: number) => colour === OTHER ? 'var(--color-border)' : `var(--color-chart-${colour + 1})`

/** The name a repository is shown by: the last folder of its root, or "Other repositories". */
export function repoName(order: readonly RepoRef[] | undefined, repo: string): string {
  if (!repo) return OTHER_REPOS
  const found = (order ?? []).find(item => item.repo === repo)
  return found?.name || repo.split(/[/\\]/).filter(Boolean).at(-1) || repo
}

/** Whether any bar of a card has an "other" segment (repositories outside the 8, or sessions with no folder). */
export const hasOther = (bars: readonly { repos?: readonly RepoSegment[] }[]) => bars.some(bar => bar.repos?.some(segment => !segment.repo))

/**
 * The legend of a card: each ranked repository with its colour and its cost, then "Other repositories" when the period
 * has repositories outside the 8 or a card's bar has an "other" segment (`other`). No legend without a ranked repository.
 */
export function repoLegend(split: RepoSplit, other = false): { key: string; label: string; colour: number; title: string }[] {
  const order = (split.repo_order ?? []).slice(0, REPO_COLOURS)
  const items = order.map((item, i) => ({
    key: item.repo, label: repoName(order, item.repo), colour: i,
    title: `${item.repo}${item.cost_usd == null ? '' : `: rank ${i + 1} by list-price cost of its requests in the period`}`,
  }))
  const others = split.repo_others?.repos ?? 0
  // With no ranked repository every segment is "other": a legend of one grey item says nothing.
  if (!order.length || (!others && !other)) return items
  return [...items, {
    key: '', label: OTHER_REPOS, colour: OTHER,
    title: `${others ? `${fmtNum(others)} ${others === 1 ? 'repository' : 'repositories'} outside the ${order.length} with the ` +
      'highest list-price cost, summed' : 'No repository outside the ranked ones'}; sessions with no folder are counted here too`,
  }]
}

/** The hover of one segment: repository · value · share of this bar · share of the repository's own total where known. */
export function repoHover(p: {
  bar: string; repo: string; name: string; value: string; share: number | null; ofRepo?: number | null; measure: string
}) {
  const own = p.ofRepo == null ? '' : ` · ${fmtShare(p.ofRepo)} of ${p.repo ? p.name : 'their'} own ${p.measure}`
  const where = p.repo ? ` (${p.repo})` : ' (every repository outside the 8 with the highest cost, summed)'
  return `${p.bar} — ${p.name}${where}: ${p.value}${p.share == null ? '' : ` · ${fmtShare(p.share)} of this bar`}${own}.`
}

/** What a hover says of a bar that is not split: its measure is not a sum, so its parts per repository do not add up. */
export const notSplitNote = (measure: string) =>
  `Not split by repository: the ${measure} of a whole is not the sum of the ${measure}s of its parts.`

/**
 * The parts of one bar, one per repository, for one measure of its segments: coloured by repo_order, valued by the
 * measure, with the hover of repoHover. `bar` names the bar in the hover; `measure` names the measure there; `detail`,
 * the bar's own hover (its whole figures, its formula), follows on every segment.
 */
export function repoParts(segments: readonly RepoSegment[] | undefined, key: string, order: readonly RepoRef[] | undefined,
  format: (value: number) => string, bar: string, measure: string, detail = ''): BarPart[] {
  return (segments ?? []).flatMap(segment => {
    const value = segment[key]
    if (typeof value !== 'number' || value <= 0) return []
    const name = repoName(order, segment.repo)
    return [{
      key: `repo:${segment.repo}`, label: name, value, text: format(value), tone: 7, repo: repoColour(order, segment.repo),
      hover: repoHover({ bar, repo: segment.repo, name, value: format(value), share: segment.share?.[key] ?? null,
        ofRepo: segment.of_repo?.[key] ?? null, measure }) + (detail ? ` ${detail}` : ''),
    }]
  })
}
