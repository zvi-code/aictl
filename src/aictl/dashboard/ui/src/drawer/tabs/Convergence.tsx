import { createMemo, For, Show, untrack } from 'solid-js'
import { fmtN } from '../../design/format'
import { Definitions, QueryDetails } from '../../panels/overview/b/Patterns'
import { binsOf, requestRange, scaled, type SessionConvergence, type StripCell } from '../../panels/overview/b/patternsModel'
import { PanelState } from '../../ui/PanelState'
import { singleMarks, repeatFigures } from '../convergenceModel'
import { TOKENS_WITH_CACHE } from '../figures'
import { Resource, Rows, Section, sessionPath, Stats, type TabProps } from '../shared'
import styles from '../../panels/overview/b/patterns.module.css'

const lanes: readonly { key: keyof StripCell; label: string; css: string }[] = [
  { key: 'tokens', label: 'Tokens', css: styles.tokens },
  { key: 'calls', label: 'Tool calls', css: styles.calls },
  { key: 'errors', label: 'Failed calls', css: styles.errors },
  { key: 'accepted', label: 'File changes', css: styles.changes },
]

function cellText(cell: StripCell) {
  return `${requestRange(cell.first, cell.last)}: ${fmtN(cell.tokens)} tokens, ${cell.calls} tool calls, ${cell.errors} failed, ` +
    `${cell.accepted} accepted edits, ${cell.repeats} repeated calls, ${cell.retries} retries`
}

/** One bar per bin of requests for each measure, with repeat clusters, retry runs and compactions marked below. */
function Strip(props: { data: SessionConvergence }) {
  const cells = () => props.data.strip
  const width = () => Math.max(1, cells().length)
  const marks = createMemo(() => {
    const out: { css: string; bins: number[]; text: string; y: number }[] = []
    for (const cluster of props.data.clusters) out.push({ css: styles.repeatMark, bins: binsOf(cells(), cluster.first, cluster.last), y: 0,
      text: `${cluster.calls} identical calls (${cluster.label}) in ${requestRange(cluster.first, cluster.last)}` })
    for (const run of props.data.retry_runs) out.push({ css: styles.retryMark, bins: binsOf(cells(), run.first, run.last), y: 3.4,
      text: `${run.retries} retries after errors in ${requestRange(run.first, run.last)}` })
    const covered = (kind: 'repeat' | 'retry') => new Set(out.filter(mark => mark.css === (kind === 'repeat' ? styles.repeatMark : styles.retryMark)).flatMap(mark => mark.bins))
    for (const mark of singleMarks(cells(), { repeat: covered('repeat'), retry: covered('retry') }))
      out.push({ css: mark.kind === 'repeat' ? styles.repeatMark : styles.retryMark, bins: [mark.bin], y: mark.kind === 'repeat' ? 0 : 3.4, text: mark.text })
    for (const rn of props.data.compactions) out.push({ css: styles.compactMark, bins: binsOf(cells(), rn, rn), y: 6.8,
      text: `Context compacted at request ${rn}` })
    return out
  })
  return <div class={styles.strip} role="group" aria-label="Per-request strip">
    <For each={lanes}>{lane => {
      const heights = createMemo(() => scaled(cells(), lane.key))
      return <div class={styles.lane}>
        <span>{lane.label}</span>
        <svg viewBox={`0 0 ${width()} 10`} preserveAspectRatio="none" role="img"
          aria-label={`${lane.label} per bin of ${cells()[0] ? cells()[0].last - cells()[0].first + 1 : 1} requests`}>
          <For each={cells()}>{(cell, index) => <rect class={lane.css} x={index() + 0.1} width={0.8}
            y={10 - heights()[index()] * 10} height={heights()[index()] * 10}><title>{cellText(cell)}</title></rect>}</For>
        </svg>
      </div>
    }}</For>
    <div class={styles.lane}>
      <span>Marked runs</span>
      <svg viewBox={`0 0 ${width()} 10`} preserveAspectRatio="none" role="img" aria-label="Repeated calls, retry runs and compactions">
        <For each={marks()}>{mark => <For each={mark.bins}>{bin =>
          <rect class={mark.css} x={bin} width={1} y={mark.y} height={3}><title>{mark.text}</title></rect>}</For>}</For>
      </svg>
    </div>
  </div>
}

export default function Convergence(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const listed = (shown: number, total: number) => shown < total ? `${shown} of ${total} shown` : String(total)
  const read = ctx.detail<SessionConvergence>(createMemo(() => sessionPath(props, '/api/board/session/convergence')))
  return <Resource read={read} unavailable="This agent has no recorded session to check.">{data => {
    const figures = () => repeatFigures(data())
    return <>
    <Section title="Convergence">
      <p class={styles.verdict} role="status">{data().verdict}</p>
      <Show when={data().signals.length}>
        <ul class={styles.signals}><For each={data().signals}>{signal =>
          <li><span title={data().definitions[signal.id]}>{signal.label}</span>: {signal.evidence}</li>}</For></ul>
      </Show>
      <Stats items={[
        { label: 'Requests', value: data().requests, detail: data().truncated ? 'Cut at 20,000 rows.' : undefined },
        { label: TOKENS_WITH_CACHE, value: data().summary.tokens },
        { label: 'Repeated calls', ...figures().repeats }, { label: 'Retries after errors', ...figures().retries },
        { label: 'Accepted edits', value: data().summary.accepted }, { label: 'Commits', value: data().summary.commits },
        { label: 'Longest run without a change', value: data().summary.longest_dry, unit: 'requests' },
        { label: 'Requests since the last change', value: data().summary.tail_dry },
        { label: 'Compactions', value: data().summary.compactions },
      ]} />
    </Section>
    <Section title="Per request">
      <Show when={data().strip.length} fallback={<PanelState state="empty" message="No requests are recorded for this session." />}>
        <Strip data={data()} />
      </Show>
    </Section>
    <Section title={`Runs of identical calls · ${listed(data().clusters.length, data().clusters_total)}`}>
      <Rows label="Repeated identical calls" rows={data().clusters} identity={['label', 'first']} empty={figures().noRepeatRun}
        columns={['label', 'calls', 'failed', ['first', 'First request', 'number'], ['last', 'Last request', 'number']]} />
    </Section>
    <Section title={`Retry runs · ${listed(data().retry_runs.length, data().retry_runs_total)}`}>
      <Rows label="Retry runs" rows={data().retry_runs} identity={['first']} empty={figures().noRetryRun}
        columns={[['first', 'First request', 'number'], ['last', 'Last request', 'number'], 'retries']} />
    </Section>
    <Section title="Most edited files">
      <Rows label="Most edited files" rows={data().files} identity={['file']} empty="No edits recorded."
        columns={[['file', 'File', 'path'], 'edits', 'failed', ['first', 'First request', 'number'], ['last', 'Last request', 'number']]} />
    </Section>
    <Definitions items={data().definitions} title="How each signal is defined (heuristics)" />
    <QueryDetails query={data().query} copy={ctx.copy} />
  </>}}</Resource>
}
