// ─── Work by repository as one grid: a row per repository, a column per measure ─
// Each row is a repository, drawn in the repository's colour of the screen (repoSplit.ts) where its root is one of
// repo_order, grey where it is not, so this view agrees with the legend of the others. Each column has its own linear
// scale from 0 to its largest value. The hover of every bar is built here, from the figures behind it.
import { fmtNum, fmtShare, fmtUsd } from '../../design/format'
import { gridLength, type GridCell, type GridColumn, type GridPart, type GridRow } from './charts/BarGrid'
import { OTHER, repoColour, repoColourVar, type RepoRef, type RepoSegment } from './repoSplit'
import {
  agentTime, repoName, repoOutputChart, repoPerCommitChart, repoSpendChart, repoStartChart, rowRepoNote, SHOWN, type Repo, type RepoBody,
} from './workModel'

type Num = number | null
type Order = readonly RepoRef[] | undefined
const usd = (value: Num) => value == null ? 'not reported' : fmtUsd(value)
const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`

/** The bar colour of a view without repository colours (an answer without repo_order). */
export const PLAIN_FILL = 'color-mix(in srgb, var(--color-accent) 70%, var(--color-surface))'

/** The line under the title: what the grid measures, in technical terms. */
export const REPOS_LINE = 'Per repository or folder, sessions active in the period: list-price spend, sessions, agent working time, ' +
  'commits, changed files. Each column has its own linear scale from 0.'

/** A repository's colour index (repoSplit.ts), or undefined when the answer ranks no repository. */
export function repoRowColour(order: Order, repo: string): number | undefined {
  return order?.length ? repoColour(order, repo) : undefined
}
/** The fill of a repository's bars: its colour, lightened as the split bars draw it; grey outside the 8; plain without ranks. */
export function repoFill(colour: number | undefined): string {
  if (colour == null) return PLAIN_FILL
  return colour === OTHER ? repoColourVar(OTHER) : `color-mix(in srgb, ${repoColourVar(colour)} 70%, var(--color-surface))`
}
/** What every hover of a row adds: the colour it is drawn in on every view, and why. */
const colourNote = (order: Order, repo: Repo) => order?.length ? rowRepoNote({ repos: [{ repo: repo.repo } as RepoSegment] }, order) : ''

/** The scale end of each column: the largest value among the shown repositories. */
function repoTops(body: RepoBody) {
  const shown = body.repos.slice(0, SHOWN)
  const top = (read: (repo: Repo) => Num) => Math.max(0, ...shown.map(repo => read(repo) ?? 0))
  return {
    spend: top(repo => repo.cost_usd), sessions: top(repo => repo.sessions), agent: top(repo => repo.agent_ms),
    commits: top(repo => repo.commits), files: top(repo => repo.files), perCommit: top(repo => repo.cost_per_commit),
  }
}

/** The grid's columns, each with its unit and its scale. */
export function repoColumns(body: RepoBody): GridColumn[] {
  const top = repoTops(body)
  return [
    { id: 'spend', label: 'Spend', scale: `$ at list price, 0 to ${fmtUsd(top.spend)}` },
    { id: 'sessions', label: 'Sessions', scale: `0 to ${fmtNum(top.sessions)}; solid by a person, striped by a script, grey not known` },
    { id: 'agent', label: 'Agent working time', scale: `hours, 0 to ${agentTime(top.agent)}` },
    { id: 'commits', label: 'Commits', scale: `0 to ${fmtNum(top.commits)}` },
    { id: 'files', label: 'Files changed', scale: `0 to ${fmtNum(top.files)}` },
    { id: 'per-commit', label: 'Spend per commit', scale: `$, 0 to ${fmtUsd(top.perCommit)}; needs 3 commits` },
  ]
}

const one = (key: string, label: string, value: number, fill: string, hover: string): GridPart[] =>
  value > 0 ? [{ key, label, value, fill, hover }] : []

/** The hover of one part of a repository's sessions bar: how many started this way, of its sessions. */
export function startHover(repo: Repo, part: string, count: number, detail: string) {
  return `${repoName(repo)}, sessions started ${part}: ${fmtNum(count)} of ${plural(repo.sessions, 'session')} ` +
    `(${fmtShare(repo.sessions ? count / repo.sessions : null)}). ${detail}`
}

/** The hover of a repository's agent working time bar. */
export const agentHover = (repo: Repo) => `${repoName(repo)}: ${agentTime(repo.agent_ms)} of agent working time in ` +
  `${fmtNum(repo.timed_sessions)} timed of ${plural(repo.sessions, 'session')}; the sum of each turn from its first to its last line.`

/** The rows of the grid: the first SHOWN repositories by spend, each bar in the repository's colour. */
export function repoGridRows(body: RepoBody): GridRow[] {
  const shown = body.repos.slice(0, SHOWN)
  const order = body.repo_order
  const top = repoTops(body)
  const hover = (rows: { key: string; hover: string }[]) => new Map(rows.map(row => [row.key, row.hover]))
  const spend = hover(repoSpendChart(body).rows), output = hover(repoOutputChart(body).rows)
  const perCommit = hover(repoPerCommitChart(body).rows), started = hover(repoStartChart(body).rows)
  return shown.map(repo => {
    const colour = repoRowColour(order, repo.repo), fill = repoFill(colour), note = colourNote(order, repo)
    const startDetail = (started.get(repo.name) ?? '') + note
    const cell = (value: Num, length: number, text: string, parts: GridPart[]): GridCell => ({ length: value == null ? 0 : length, text, parts })
    return {
      key: repo.name, label: repo.name, title: repo.repo, sub: repo.kind === 'folder' ? 'folder' : undefined,
      mark: colour == null ? undefined : fill, faded: repo.small, tag: repo.small ? 'too few requests' : undefined,
      cells: {
        spend: cell(repo.cost_usd, gridLength(repo.cost_usd, top.spend), `${usd(repo.cost_usd)} · ${repo.cost_share == null ? 'not reported' : fmtShare(repo.cost_share)}`,
          one('spend', 'spend', repo.cost_usd ?? 0, fill, (spend.get(repo.name) ?? '') + note)),
        sessions: cell(repo.sessions, gridLength(repo.sessions, top.sessions), `${fmtNum(repo.sessions)} · ${fmtNum(repo.idle_sessions)} changed nothing`, [
          ...one('person', 'by a person', repo.person, fill, startHover(repo, 'by a person', repo.person, startDetail)),
          ...one('script', 'by a script', repo.scripted, fill, startHover(repo, 'by a script', repo.scripted, startDetail))
            .map(part => ({ ...part, hatch: true })),
          ...one('unknown', 'start not known', repo.unclassified, 'var(--color-border)',
            startHover(repo, 'in a way not known', repo.unclassified, startDetail)),
        ]),
        agent: cell(repo.agent_ms, gridLength(repo.agent_ms, top.agent), agentTime(repo.agent_ms),
          one('agent', 'agent working time', repo.agent_ms ?? 0, fill, agentHover(repo) + note)),
        commits: cell(repo.commits, gridLength(repo.commits, top.commits), fmtNum(repo.commits),
          one('commits', 'commits', repo.commits, fill, (output.get(repo.name) ?? '') + note)),
        files: cell(repo.files, gridLength(repo.files, top.files), fmtNum(repo.files),
          one('files', 'changed files', repo.files, fill, (output.get(repo.name) ?? '') + note)),
        'per-commit': repo.cost_per_commit == null ? { length: 0, parts: [], text: 'fewer than 3 commits', muted: true }
          : cell(repo.cost_per_commit, gridLength(repo.cost_per_commit, top.perCommit), usd(repo.cost_per_commit),
            one('per-commit', 'spend per commit', repo.cost_per_commit, fill, (perCommit.get(repo.name) ?? '') + note)),
      },
    }
  })
}

/** The totals of the period, as text under the grid's columns. */
export function repoGridFoot(body: RepoBody): GridRow {
  const s = body.summary
  const text = (value: string, lines?: string[]): GridCell => ({ length: 0, parts: [], text: value, lines })
  return {
    key: 'all', label: `All ${plural(s.repos, 'repository or folder', 'repositories or folders')}`,
    cells: {
      spend: text(usd(s.cost_usd), s.unpriced ? [`${plural(s.unpriced, 'request')} unpriced, not counted`] : undefined),
      sessions: text(`${fmtNum(s.sessions)} · ${fmtNum(s.idle_sessions)} changed nothing`,
        [`${fmtNum(s.person)} by a person, ${fmtNum(s.scripted)} by a script`]),
      agent: text(agentTime(s.agent_ms)), commits: text(fmtNum(s.commits)), files: text(fmtNum(s.files)),
      'per-commit': text(usd(s.cost_per_commit)),
    },
  }
}
