// ─── What the agents changed at full width: the line under the title, and each chart in one encoding at a time ─
// The payload and the charts' rows are in workModel.ts (changeFilesChart, changeWritesChart, …); this file recolours them.
import { fmtLines, fmtMs, fmtNum, fmtShare, fmtUsd } from '../../design/format'
import type { DotMeasure, DotRow } from './charts/DotRows'
import { OTHER, repoColourVar } from './repoSplit'
import {
  changeFilesChart, changeRepoKindChart, FILE_KINDS, rowRepo, rowRepoNote,
  type BarChart, type BarRow, type ChangeBody, type ChangeRepo, type ColumnChart,
} from './workModel'

const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`

/** The one line under the title: what is counted, over what; no figure. */
export function changeLine(body: ChangeBody) {
  const s = body.summary
  if (!s.writes && !s.commits) return 'No agent changed a file or made a commit in this period.'
  return 'File writes and git commits made by agents in the period, per repository or folder; a file is one distinct path.'
}

/** Whether the answer splits any mark by repository: the view then offers the colour switch. */
export const changeSplit = (body: ChangeBody) => body.repos.some(repo => repo.repos?.length) || body.bins.some(bin => bin.repos?.length) ||
  body.files.some(file => file.repos?.length) || Object.values(body.summary.kind_repos ?? {}).some(segments => segments?.length)

/** The repositories the charts draw, in the order of the answer (most changed files first), at most `shown`. */
export const activeRepos = (body: ChangeBody, shown: number) => body.repos.filter(repo => repo.writes || repo.commits).slice(0, shown)

/** Changed files per repository, each bar split by kind of file; the value is the files and their share of all. */
export function filesByKind(body: ChangeBody): BarChart {
  const files = changeFilesChart(body), kinds = changeRepoKindChart(body)
  return { ...files, legend: kinds.legend,
    rows: files.rows.map((row, i) => ({ ...row, tracks: [{ ...row.tracks[0], parts: kinds.rows[i].tracks[0].parts }] })) }
}

/** All changed files of the period as one bar by kind of file; its hover holds the period's totals. */
export function kindTotal(body: ChangeBody): BarChart {
  const s = body.summary
  const total = FILE_KINDS.reduce((sum, kind) => sum + s.kinds[kind.id], 0)
  const row: BarRow = {
    key: 'all', name: 'All repositories', sub: plural(s.repos, 'repository or folder', 'repositories or folders'), small: false,
    tracks: [{ parts: FILE_KINDS.map(kind => ({ value: s.kinds[kind.id], tone: kind.tone, label: kind.label })), text: plural(total, 'file') }],
    hover: `All repositories: ${plural(total, 'changed file')}: ` +
      FILE_KINDS.map(kind => `${kind.label} ${fmtNum(s.kinds[kind.id])} (${total ? fmtShare(s.kinds[kind.id] / total) : 'not reported'})`).join(', ') +
      `. ${plural(s.writes, 'file write')} in ${plural(s.change_sessions, 'session')}, lines ${fmtLines(s.lines_added, s.lines_removed)}; ` +
      `a commit of the same session followed ${fmtNum(s.committed_writes)} (${s.committed_share == null ? 'not reported' : fmtShare(s.committed_share)}); ` +
      `${plural(s.commits, 'commit')}; ${plural(s.uncommitted_sessions, 'session')} changed files and made no commit; ` +
      `${plural(s.reworked, 'file')} written in 3 or more sessions or 5 or more times in one.`,
  }
  return { id: 'kind-total', title: 'Changed files by kind of file', axis: 'Bar: all changed files of the period, 100%.',
    legend: FILE_KINDS.map(kind => ({ tone: kind.tone, label: kind.label })), tops: [total], rows: [row] }
}

/**
 * A chart whose rows are repositories, drawn in each repository's colour: every bar of a row becomes one part of the
 * row's total in that colour, the legend goes (the view's repository legend replaces it), and the hover says the colour.
 * A row the answer did not split keeps its parts.
 */
export function inRepoColour(chart: BarChart, items: readonly ChangeRepo[], order: ChangeBody['repo_order']): BarChart {
  return { ...chart, legend: [], rows: chart.rows.map((row, i) => {
    const repo = rowRepo(items[i] ?? {}, order)
    if (repo == null) return row
    return { ...row, repo, hover: row.hover + rowRepoNote(items[i], order),
      tracks: row.tracks.map(track => ({ ...track, parts: [{ value: track.parts.reduce((sum, part) => sum + Math.max(0, part.value), 0),
        tone: 'c1', label: track.parts.map(part => part.label).join(' + '), repo }] })) }
  }) }
}

/** A column chart without its split by repository: one column per bin in one colour. */
export const plainColumns = (chart: ColumnChart): ColumnChart => ({ ...chart, columns: chart.columns.map(column => ({ ...column, parts: undefined })) })

/** Spend and agent working time per commit as dots, one row per repository; a repository with fewer than 3 commits has none. */
export function perCommitDots(body: ChangeBody, repos: readonly ChangeRepo[], byRepo: boolean): { measures: DotMeasure[]; rows: DotRow[] } {
  const spend = Math.max(0, ...repos.map(repo => repo.cost_per_commit ?? 0))
  const time = Math.max(0, ...repos.map(repo => repo.time_per_commit_ms ?? 0))
  const few = (repo: ChangeRepo) => `${repo.name}: ${plural(repo.commits, 'commit')}, fewer than 3, so no figure per commit.`
  return {
    measures: [{ key: 'spend', name: 'Spend per commit', top: spend, topText: fmtUsd(spend) },
      { key: 'time', name: 'Agent working time per commit', top: time, topText: fmtMs(time) }],
    rows: repos.map(repo => {
      const colour = byRepo ? rowRepo(repo, body.repo_order) : undefined
      const spent = `${repo.name}: ${fmtUsd(repo.cost_usd ?? 0)} at list price ÷ ${plural(repo.commits, 'commit')} = ${repo.cost_per_commit == null ? '' : fmtUsd(repo.cost_per_commit)}.`
      const worked = `${repo.name}: agent working time ${repo.agent_ms == null ? 'not reported' : fmtMs(repo.agent_ms)} ÷ ${plural(repo.commits, 'commit')} = ` +
        `${repo.time_per_commit_ms == null ? '' : fmtMs(repo.time_per_commit_ms)}.`
      return {
        key: repo.name, name: repo.name, sub: plural(repo.commits, 'commit'), title: repo.repo,
        colour: colour == null ? undefined : colour === OTHER ? repoColourVar(OTHER) : repoColourVar(colour), swatch: colour != null,
        values: [
          { value: repo.cost_per_commit, text: repo.cost_per_commit == null ? 'fewer than 3 commits' : fmtUsd(repo.cost_per_commit),
            hover: repo.cost_per_commit == null ? few(repo) : spent },
          { value: repo.time_per_commit_ms, text: repo.time_per_commit_ms == null ? (repo.cost_per_commit == null ? '' : 'not reported') : fmtMs(repo.time_per_commit_ms),
            hover: repo.time_per_commit_ms != null ? worked : repo.cost_per_commit == null ? few(repo) : `${repo.name}: agent working time not reported.` },
        ],
      }
    }),
  }
}
