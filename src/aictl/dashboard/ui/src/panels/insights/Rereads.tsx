import { Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars } from './Bars'
import { opening, opens } from './charts/Open'
import { ColourBy, useColourBy, drawnBy } from './charts/ColourBy'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { bytes, plural, rereadFinding, share, toolLabel, type Label, type RereadBody } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import { bytesRows, filesRows, readLegend, readRepoRows, readRows, rereadMeasured, rereadSplit, rereadTotal, type ToolBar } from './rereadsModel'
import styles from './CallsViews.module.css'

export default function Rereads(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const open = opens(ctx)
  /** A bar of one coding tool narrows the page to it; the bar of all tools names no one tool. */
  const product = (rows: ToolBar[]) => opening(rows, row => row.tool ? open.product(row.tool, label(row.tool)) : undefined)
  const [by, setBy] = useColourBy()
  return <InsightCard<RereadBody> {...props} card="rereads" tab="tools"
    hero={rereadTotal}
    finding={() => rereadMeasured}
    visual={body => {
      const repo = () => drawnBy(by(), rereadSplit(body)) === 'repo'
      const along = () => repo() ? '; a segment per repository' : ''
      return <div class={styles.charts}>
        <ColourBy parts="First read / again" split={rereadSplit(body)} value={by()} onChange={setBy} />
        {repo() ? <RepoLegend split={body} other={hasOther(body.tools)} /> : null}
        {repo()
          ? <Bars name="reread-reads-repos" title="File reads and reads again, by repository" rows={product(readRepoRows(body, label))}
            axis="Length: file reads with a recorded path, one scale for every row; a segment per repository." />
          : <Bars name="reread-reads" title="File reads: first read and read again" scale="whole" legend={readLegend} rows={product(readRows(body, label))}
            axis="Bar: a tool's file reads with a recorded path = 100%." />}
        <div class={styles.columns}>
          <Bars name="reread-bytes" title="Bytes returned by reads again" rows={product(bytesRows(body, label, repo()))}
            axis={`Length: bytes, one scale${along()}; estimated at the average result size per file.`} />
          <Bars name="reread-files" title="Files read 5 times or more by one agent" rows={product(filesRows(body, label, repo()))}
            axis={`Length: files, one scale${along()}. Beside: of all files the tool read.`} />
        </div>
        <Show when={body.summary.unmatched}>
          <p class={styles.note} data-unmatched>{plural(body.summary.unmatched, 'read')} had no recorded path and are not compared.</p>
        </Show>
        <details class={styles.totals} data-totals><summary>Totals of the period</summary><p>{rereadFinding(body)}</p></details>
      </div>
    }}
    note={'A read is a call of a file-read tool (Read, view, read_file and the like, as the tool detail classifies them). ' +
      'Files compare by a hash of their path, within one session and agent, so a read by a subagent of a file its parent ' +
      'read counts as a first read. A re-read can be deliberate, after the file changed. Bytes: the result size of the ' +
      'repeated reads, at the average size of reads of that file. Only reads in the period count. The bar of all tools ' +
      'counts every tool, those too small to compare among them.'}
    table={{
      label: 'Repeated file reads by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), reads: tool.reads, repeat_reads: tool.repeat_reads, share: tool.repeat_share ?? undefined,
        files: tool.files, files_5plus: tool.files_5plus, most_reads: tool.most_reads, repeat_bytes: tool.repeat_bytes ?? undefined,
        unmatched: tool.unmatched,
      })),
      fields: [{ ...textField('tool', 'Tool'), action: { label: row => open.product(String(row.id), String(row.tool))?.label,
        run: row => open.product(String(row.id), String(row.tool))?.run() } }, numberField('reads', 'Reads', fmtNum), numberField('repeat_reads', 'Repeated reads', fmtNum),
        numberField('share', 'Share repeated', value => share(value)), numberField('files', 'Files', fmtNum),
        numberField('files_5plus', 'Files read 5+ times', fmtNum), numberField('most_reads', 'Most reads of one file', fmtNum),
        numberField('repeat_bytes', 'Bytes read again', value => bytes(value)), numberField('unmatched', 'Reads without a path', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('repeat_reads', 'Repeated reads', fmtNum), numberField('reads', 'Reads', fmtNum),
      numberField('files_5plus', 'Files read 5+ times', fmtNum), numberField('most_reads', 'Most reads of one file', fmtNum)]} />
}
