import { Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  rereadHero, bytes, plural, repoPartsWith, rereadFilesHover, rereadFilesRepoMore, rereadFinding, rereadHover, rereadRepoMore, rereadToolHover,
  share, toolLabel, type Label, type RereadBody,
} from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther, notSplitNote } from './repoSplit'
import styles from './Insights.module.css'

function readRows(body: RereadBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `${plural(tool.files, 'file')} · ${bytes(tool.repeat_bytes)} returned again`,
    total: `${fmtNum(tool.repeat_reads)} of ${fmtNum(tool.reads)} again · ${share(tool.repeat_share)}`,
    parts: [
      { key: 'first', label: 'first read', value: tool.reads - tool.repeat_reads, tone: 2, text: fmtNum(tool.reads - tool.repeat_reads),
        hover: rereadHover(tool, 'first', label) },
      { key: 'again', label: 'read again', value: tool.repeat_reads, tone: 1, text: fmtNum(tool.repeat_reads), hover: rereadHover(tool, 'again', label) },
    ],
  }))
}

/** Per tool: its reads (or its reads of a file already read) in a segment per repository; the split by first read is the bar above. */
function repoReadRows(body: RereadBody, label: Label, of: 'reads' | 'again'): BarRow[] {
  return body.tools.filter(tool => tool.repos?.length && (of === 'reads' || tool.repeat_reads)).map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: plural(tool.files, 'file'),
    total: of === 'reads' ? plural(tool.reads, 'read') : `${plural(tool.repeat_reads, 'read')} again`,
    parts: repoPartsWith(tool.repos, of === 'reads' ? 'reads' : 'repeat_reads', body.repo_order, value => plural(value, 'read'),
      `${label(tool.tool)}, ${of === 'reads' ? 'file reads' : 'reads of a file already read'}`,
      of === 'reads' ? 'file reads' : 'reads again', of === 'reads' ? rereadToolHover(tool, label) : rereadHover(tool, 'again', label), rereadRepoMore),
  }))
}

function fileRows(body: RereadBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `most reads of one file: ${fmtNum(tool.most_reads)}`,
    total: `${fmtNum(tool.files_5plus)} of ${plural(tool.files, 'file')}`,
    parts: tool.repos?.length
      ? repoPartsWith(tool.repos, 'files_5plus', body.repo_order, value => plural(value, 'file'), `${label(tool.tool)}, files read 5 times or more`,
        'files read 5 times or more', `${rereadFilesHover(tool, label)} ${notSplitNote('maximum')}`, rereadFilesRepoMore)
      : [{ key: 'files', label: 'files read 5 times or more', value: tool.files_5plus, tone: 1, text: fmtNum(tool.files_5plus),
        hover: rereadFilesHover(tool, label) }],
  }))
}

function ReadBars(props: { body: RereadBody; label: Label }) {
  return <>
    <RepoLegend split={props.body} other={hasOther(props.body.tools)} />
    <Bars name="reread-reads" title="File reads per tool: first reads and reads of a file already read" scale="whole"
      legend={[{ label: 'First read of a file by its agent', tone: 2 }, { label: 'Read again by the same agent', tone: 1 }]}
      axis="Bar: the tool's file reads with a recorded path (100%); segments: counts written on each."
      rows={readRows(props.body, props.label)} />
    <Bars name="reread-reads-repos" title="File reads per tool, by repository"
      axis="Length: file reads with a recorded path, one linear scale from 0; a segment per repository."
      rows={repoReadRows(props.body, props.label, 'reads')} />
    <Bars name="reread-again-repos" title="Reads of a file the same agent had already read, per tool, by repository"
      axis="Length: reads again, one linear scale from 0; a segment per repository." rows={repoReadRows(props.body, props.label, 'again')} />
    <Bars name="reread-files" title="Files read 5 times or more by one agent, per tool"
      axis={`Length: number of files, linear from 0${props.body.tools.some(tool => tool.repos?.length) ? ', a segment per repository; ' +
        'the most reads of one file is not split' : ''}.`} rows={fileRows(props.body, props.label)} />
    <Show when={props.body.summary.unmatched}>
      <p class={styles.note}>{fmtNum(props.body.summary.unmatched)} reads had no recorded path and are not compared.</p>
    </Show>
  </>
}

export default function Rereads(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<RereadBody> {...props} card="rereads" tab="tools"
    hero={rereadHero}
    finding={body => rereadFinding(body)}
    visual={body => <ReadBars body={body} label={label} />}
    note={'A read is a call of a file-read tool (Read, view, read_file and the like, as the tool detail classifies them). ' +
      'Files compare by a hash of their path, within one session and agent, so a read by a subagent of a file its parent ' +
      'read counts as a first read. A re-read can be deliberate, after the file changed. Bytes: the result size of the ' +
      'repeated reads, at the average size of reads of that file. Only reads in the period count.'}
    table={{
      label: 'Repeated file reads by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), reads: tool.reads, repeat_reads: tool.repeat_reads, share: tool.repeat_share ?? undefined,
        files: tool.files, files_5plus: tool.files_5plus, most_reads: tool.most_reads, repeat_bytes: tool.repeat_bytes ?? undefined,
        unmatched: tool.unmatched,
      })),
      fields: [textField('tool', 'Tool'), numberField('reads', 'Reads', fmtNum), numberField('repeat_reads', 'Repeated reads', fmtNum),
        numberField('share', 'Share repeated', value => share(value)), numberField('files', 'Files', fmtNum),
        numberField('files_5plus', 'Files read 5+ times', fmtNum), numberField('most_reads', 'Most reads of one file', fmtNum),
        numberField('repeat_bytes', 'Bytes read again', value => bytes(value)), numberField('unmatched', 'Reads without a path', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('repeat_reads', 'Repeated reads', fmtNum), numberField('reads', 'Reads', fmtNum),
      numberField('files_5plus', 'Files read 5+ times', fmtNum), numberField('most_reads', 'Most reads of one file', fmtNum)]} />
}
