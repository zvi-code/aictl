// ─── Repeated file reads: the bars of the view, drawn by first read and read again, or by repository ─
// A tool's file reads with a recorded path are one whole: first reads of a file by its agent, and reads of a file the
// same agent had already read.
import { fmtNum } from '../../design/format'
import type { BarPart, BarRow } from './Bars'
import {
  bytes, plural, repoPartsWith, rereadFilesHover, rereadFilesRepoMore, rereadHover, rereadRepoMore, rereadToolHover, segmentValue, share,
  type Hero, type Label, type RereadBody, type RereadTool,
} from './insightsModel'
import { notSplitNote, type RepoSegment } from './repoSplit'

export const READ_TONE = { first: 2, again: 1 }
export const readLegend = [{ label: 'First read of a file by its agent', tone: READ_TONE.first },
  { label: 'Read again by the same agent', tone: READ_TONE.again }]

const ratio = (part: number, whole: number) => whole > 0 ? part / whole : null

/** The line under the title: what is measured, in technical terms. */
export const rereadMeasured = 'File reads with a recorded path, per tool; read again: a file the same session and agent had already read in the period.'

/** The headline: the reads of a file already read, of all file reads with a path. */
export const rereadTotal = (body: RereadBody): Hero | undefined => body.summary.reads
  ? { value: fmtNum(body.summary.repeat_reads), label: `reads of a file the same agent had already read, of ${plural(body.summary.reads, 'file read')} ` +
    `with a recorded path (${share(body.summary.repeat_share)})` }
  : undefined

/** The hover of a part of the bar of every tool: first reads or reads again, from the period's summary. */
export function rereadAllHover(body: RereadBody, part: 'first' | 'again') {
  const s = body.summary
  const n = part === 'first' ? s.reads - s.repeat_reads : s.repeat_reads
  return `All tools, ${part === 'first' ? 'first read of a file by its agent' : 'read of a file the same agent had already read'}: ` +
    `${plural(n, 'read')}, ${share(ratio(n, s.reads))} of ${plural(s.reads, 'read')} with a recorded path` +
    (part === 'again' ? `; ${bytes(s.repeat_bytes)} returned again.` : '.')
}

const readParts = (first: number, again: number, hover: (part: 'first' | 'again') => string): BarPart[] => [
  { key: 'first', label: 'first read', value: first, tone: READ_TONE.first, text: fmtNum(first), hover: hover('first') },
  { key: 'again', label: 'read again', value: again, tone: READ_TONE.again, text: fmtNum(again), hover: hover('again') },
]

/** Per tool, and first for every tool together: its reads as 100%, first reads and reads again. */
export function readRows(body: RereadBody, label: Label): BarRow[] {
  const s = body.summary
  const all: BarRow[] = body.tools.length > 1 && s.reads ? [{
    key: 'all', label: 'All tools', sub: plural(s.reads, 'read'), total: `${fmtNum(s.repeat_reads)} again · ${share(s.repeat_share)}`,
    parts: readParts(s.reads - s.repeat_reads, s.repeat_reads, part => rereadAllHover(body, part)),
  }] : []
  return [...all, ...body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `${plural(tool.reads, 'read')} · ${plural(tool.files, 'file')}`,
    total: `${fmtNum(tool.repeat_reads)} again · ${share(tool.repeat_share)}`,
    parts: readParts(tool.reads - tool.repeat_reads, tool.repeat_reads, part => rereadHover(tool, part, label)),
  }))]
}

/** Per tool: its reads, and its reads of a file already read, each a row of segments per repository on one scale. */
export function readRepoRows(body: RereadBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.repos?.length).flatMap(tool => [
    { key: `${tool.tool}:reads`, label: `${label(tool.tool)}: all reads`, total: plural(tool.reads, 'read'),
      parts: repoPartsWith(tool.repos, 'reads', body.repo_order, value => plural(value, 'read'), `${label(tool.tool)}, file reads`,
        'file reads', rereadToolHover(tool, label), rereadRepoMore) },
    { key: `${tool.tool}:again`, label: `${label(tool.tool)}: read again`, total: `${plural(tool.repeat_reads, 'read')} again`,
      parts: repoPartsWith(tool.repos, 'repeat_reads', body.repo_order, value => plural(value, 'read'),
        `${label(tool.tool)}, reads of a file already read`, 'reads again', rereadHover(tool, 'again', label), rereadRepoMore) },
  ].filter(row => row.parts.length))
}

/** The hover of a tool's bytes returned again. */
export function rereadBytesHover(tool: RereadTool, label: Label) {
  return `${label(tool.tool)}: ${bytes(tool.repeat_bytes)} returned by ${plural(tool.repeat_reads, 'read')} of a file the same agent had ` +
    'already read, each at the average result size of reads of that file.'
}
const bytesRepoMore = (segment: RepoSegment) => `${plural(segmentValue(segment, 'repeat_reads') ?? 0, 'read')} again in this repository.`

/** Per tool: the bytes its reads of a file already read returned, whole or by repository. */
export function bytesRows(body: RereadBody, label: Label, repo: boolean): BarRow[] {
  return body.tools.filter(tool => tool.repeat_reads).map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `${plural(tool.repeat_reads, 'read')} again`, total: bytes(tool.repeat_bytes),
    parts: repo && tool.repos?.length
      ? repoPartsWith(tool.repos, 'repeat_bytes', body.repo_order, value => bytes(value), `${label(tool.tool)}, bytes returned again`,
        'bytes returned again', rereadBytesHover(tool, label), bytesRepoMore)
      : [{ key: 'bytes', label: 'bytes returned again', value: tool.repeat_bytes, tone: READ_TONE.again, text: bytes(tool.repeat_bytes),
        hover: rereadBytesHover(tool, label) }],
  }))
}

/** Per tool: its files read 5 times or more by one agent, whole or by repository; the most reads of one file is not split. */
export function filesRows(body: RereadBody, label: Label, repo: boolean): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `most reads of one file: ${fmtNum(tool.most_reads)}`,
    total: `${fmtNum(tool.files_5plus)} of ${plural(tool.files, 'file')}`,
    parts: repo && tool.repos?.length
      ? repoPartsWith(tool.repos, 'files_5plus', body.repo_order, value => plural(value, 'file'), `${label(tool.tool)}, files read 5 times or more`,
        'files read 5 times or more', `${rereadFilesHover(tool, label)} ${notSplitNote('maximum')}`, rereadFilesRepoMore)
      : [{ key: 'files', label: 'files read 5 times or more', value: tool.files_5plus, tone: READ_TONE.again, text: fmtNum(tool.files_5plus),
        hover: rereadFilesHover(tool, label) }],
  }))
}

/** Whether the answer carries a repository split for any tool. */
export const rereadSplit = (body: RereadBody) => !!body.repo_order?.length && body.tools.some(tool => tool.repos?.length)
