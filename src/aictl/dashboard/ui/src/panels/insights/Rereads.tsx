import { Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  rereadHero, bytes, plural, rereadFilesHover, rereadFinding, rereadHover, share, toolLabel, type Label, type RereadBody,
} from './insightsModel'
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

function fileRows(body: RereadBody, label: Label): BarRow[] {
  return body.tools.map(tool => ({
    key: tool.tool, label: label(tool.tool), sub: `most reads of one file: ${fmtNum(tool.most_reads)}`,
    total: `${fmtNum(tool.files_5plus)} of ${plural(tool.files, 'file')}`,
    parts: [{ key: 'files', label: 'files read 5 times or more', value: tool.files_5plus, tone: 1, text: fmtNum(tool.files_5plus),
      hover: rereadFilesHover(tool, label) }],
  }))
}

function ReadBars(props: { body: RereadBody; label: Label }) {
  return <>
    <Bars name="reread-reads" title="File reads per tool: first reads and reads of a file already read" scale="whole"
      legend={[{ label: 'First read of a file by its agent', tone: 2 }, { label: 'Read again by the same agent', tone: 1 }]}
      axis="Bar: the tool's file reads with a recorded path (100%); segments: counts written on each."
      rows={readRows(props.body, props.label)} />
    <Bars name="reread-files" title="Files read 5 times or more by one agent, per tool"
      axis="Length: number of files, linear from 0." rows={fileRows(props.body, props.label)} />
    <Show when={props.body.summary.unmatched}>
      <p class={styles.note}>{fmtNum(props.body.summary.unmatched)} reads had no recorded path and are not compared.</p>
    </Show>
  </>
}

export default function Rereads(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<RereadBody> {...props} card="rereads" title="Repeated file reads" tab="tools"
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
