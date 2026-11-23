import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, rereadFinding, share, type Label, type RereadBody } from './insightsModel'
import styles from './Insights.module.css'

/** Per tool: file reads split into first reads and reads of a file the same agent had already read. */
function ReadBars(props: { body: RereadBody; label: Label }) {
  const width = (part: number, whole: number) => whole > 0 ? `${(part / whole * 100).toFixed(2)}%` : '0%'
  return <>
    <ul class={styles.legend}>
      <li><span class={`${styles.swatch} ${styles.first}`} />First read of a file</li>
      <li><span class={`${styles.swatch} ${styles.again}`} />Read again</li>
    </ul>
    <ol class={styles.bars} aria-label="File reads per tool">
      <For each={props.body.tools}>{tool => <li class={styles.barRow}>
        <span class={styles.barName}>{props.label(tool.tool)}<small>{fmtNum(tool.reads)} reads · {fmtNum(tool.files_5plus)} files read 5+ times</small></span>
        <span class={styles.barTrack}>
          <span class={styles.split} role="img" aria-label={`${props.label(tool.tool)}: ${fmtNum(tool.repeat_reads)} of ${fmtNum(tool.reads)} reads were repeats`}>
            <span class={styles.first} style={{ 'inline-size': width(tool.reads - tool.repeat_reads, tool.reads) }} />
            <span class={styles.again} style={{ 'inline-size': width(tool.repeat_reads, tool.reads) }} />
          </span>
          <span class={styles.splitText}>{share(tool.repeat_share)} repeated · {bytes(tool.repeat_bytes)} returned again · most reads of one file {fmtNum(tool.most_reads)}</span>
        </span>
      </li>}</For>
    </ol>
    <Show when={props.body.summary.unmatched}>
      <p class={styles.note}>{fmtNum(props.body.summary.unmatched)} reads had no recorded path and are not compared.</p>
    </Show>
  </>
}

export default function Rereads(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? tool
  return <InsightCard<RereadBody> {...props} card="rereads" title="Repeated file reads" tab="tools"
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
