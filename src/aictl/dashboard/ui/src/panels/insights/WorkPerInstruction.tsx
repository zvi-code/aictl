import { For, Show, untrack } from 'solid-js'
import { fmtDur, fmtNum, fmtShare, stamp } from '../../design/format'
import type { Field } from '../../ui/tableModel'
import { Tooltip } from '../../ui/Tooltip'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  autonomyLine, binDay, canTrend, MIN_MULTI, MIN_TREND_BINS, MIN_TREND_SESSIONS, MIN_WAITS, measuredTools, runStrip, silence, trendPoints, trendTicks,
  waitRows, type AutonomyBody, type AutonomyTool,
} from './autonomyModel'
import { Bars } from './Bars'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { PercentileStrip } from './charts/PercentileStrip'
import { NOT_REPORTED, toolLabel, type Label } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import base from './Insights.module.css'
import styles from './WorkPerInstruction.module.css'

const pct = (share: number) => `${(Math.max(0, Math.min(1, share)) * 100).toFixed(1)}%`

/** One tool's median longest run per bin, from the bins with enough sessions only, across the full width: a line through
 * every bin, a dot with its hover on each, the value written above the dots the model marks, the bins named under it. */
function TrendRow(props: { body: AutonomyBody; tool: AutonomyTool; label: Label }) {
  const unit = () => props.body.bin_unit ?? 'bin'
  const trend = () => trendPoints(props.body, props.tool.tool)
  return <li class={styles.trendRow} data-trend={props.tool.tool}>
    <span class={base.barName}>{props.label(props.tool.tool)}</span>
    <Show when={canTrend(props.body, props.tool.tool)} fallback={<span class={base.note} data-no-trend>
      Too few sessions per {unit()} to draw a trend ({MIN_TREND_BINS} {unit()}s with {MIN_TREND_SESSIONS} or more sessions of 2 or more
      {' '}instructions are needed).</span>}>
      <div class={styles.trend} role="group" aria-label={`${props.label(props.tool.tool)}: median longest run of tool calls per ${unit()}`}>
        <span class={styles.yTop} aria-hidden="true">{fmtNum(trend().top)}</span>
        <span class={styles.yZero} aria-hidden="true">0</span>
        <div class={styles.plot}>
          <svg class={styles.lineSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline class={styles.line} vector-effect="non-scaling-stroke"
              points={trend().points.map(point => `${(point.x * 100).toFixed(2)},${((1 - point.y) * 100).toFixed(2)}`).join(' ')} />
          </svg>
          <For each={trend().points}>{point => <span class={styles.point} data-point={point.ts}
            style={{ 'inset-inline-start': pct(point.x), 'inset-block-start': pct(1 - point.y) }}>
            <Show when={point.written}><span class={styles.value} data-value>{fmtNum(point.value)}</span></Show>
            <Tooltip class={styles.hit} label={`${binDay(point.ts)}: median ${fmtNum(point.value)} tool calls`} text={point.hover}
              onClick={() => undefined}><span class={point.written ? styles.dot : styles.smallDot} /></Tooltip>
          </span>}</For>
        </div>
        <div class={styles.ticks} aria-hidden="true">
          <For each={trendTicks(trend().points)}>{point => <span style={{ 'inset-inline-start': pct(point.x) }}>{binDay(point.ts)}</span>}</For>
        </div>
      </div>
    </Show>
  </li>
}

function Visual(props: { body: AutonomyBody; label: Label; mode: ColourMode; setMode: (mode: ColourMode) => void }) {
  const measured = () => measuredTools(props.body)
  const silent = () => props.body.tools.filter(tool => !tool.sessions)
  const start = () => Math.max(props.body.range.since, props.body.prompts_from ?? 0)
  const split = () => !!props.body.repo_order?.length && props.body.tools.some(tool => tool.repos?.length)
  const mode = (): ColourMode => split() && props.mode === 'repo' ? 'repo' : 'parts'
  const unit = () => props.body.bin_unit ?? 'bin'
  return <>
    <Show when={props.body.prompts_from != null && props.body.prompts_from > props.body.range.since}>
      <p class={base.note}>Prompts are stored from {stamp(props.body.prompts_from, true)}; no session before that can be read.</p>
    </Show>
    <Show when={measured().length}>
      <div class={styles.grid}>
        <PercentileStrip chart={runStrip(props.body, props.label)} />
        <div class={styles.waits}>
          <ColourMode parts="Answer time" value={mode()} onChange={props.setMode} split={split()} />
          <Show when={mode() === 'repo'}><RepoLegend split={props.body} other={hasOther(props.body.tools)} /></Show>
          <Bars name="autonomy-waits" title="Answered waits per tool" scale={mode() === 'repo' ? 'shared' : 'whole'}
            legend={mode() === 'repo' ? undefined : [{ label: 'Within 5 minutes', tone: 2 }, { label: 'After more than 5 minutes', tone: 1 }]}
            axis={mode() === 'repo' ? 'Length: answered waits, one linear scale from 0; a segment per repository.'
              : 'Each bar: the tool\'s answered waits (100%). Beside it: the median wait.'}
            rows={waitRows(props.body, props.label, mode())} />
        </div>
        <section class={styles.wide} aria-labelledby="autonomy-trend-title">
          <h3 class={base.subhead} id="autonomy-trend-title">Median longest run per {unit()} (tool calls)</h3>
          <p class={base.note}>Sessions with 2 or more instructions, in the {unit()} of their first instruction; a {unit()} is drawn
            {' '}with {MIN_TREND_SESSIONS} or more such sessions. Each tool on its own scale from 0.</p>
          <ol class={styles.trends} aria-label={`Median longest run of tool calls per ${unit()}, per tool`}>
            <For each={measured()}>{tool => <TrendRow body={props.body} tool={tool} label={props.label} />}</For>
          </ol>
          <Show when={start() > 0}><p class={base.note}>From {stamp(start(), true)}.</p></Show>
        </section>
      </div>
    </Show>
    <For each={silent()}>{tool => <p class={styles.silent} data-silent={tool.tool}>{props.label(tool.tool)}: {silence(tool)}</p>}</For>
  </>
}

type Row = Record<string, unknown>

/** A figure column whose missing value reads "not reported", never blank or 0. */
function figure(id: string, label: string, format: (value: number) => string): Field<Row> {
  return { id, label, numeric: true, read: row => typeof row[id] === 'number' ? row[id] as number : NOT_REPORTED,
    format: value => typeof value === 'number' ? format(value) : String(value) }
}

export default function WorkPerInstruction(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [mode, setMode] = useColourBy()
  return <InsightCard<AutonomyBody> {...props} card="autonomy" tab="flow"
    finding={body => autonomyLine(body, label)}
    visual={body => <Visual body={body} label={label} mode={mode()} setMode={setMode} />}
    note={'A person\'s turn is a prompt of the main agent, or the answer to a question the agent asked: a call named ask_user, ' +
      'askuser, ask_question, askuserquestion or vscode_askquestions (a fixed list; ask tools served by an MCP server are ordinary ' +
      'calls). An answer starts a new run but is not an instruction. Session-control commands (/compact, /autocompact, /model, ' +
      '/clear, /effort) are not turns. A run is the main agent\'s tool calls from one turn to the next; subagent calls are not in ' +
      'it, and a call that starts a subagent counts once and as delegated. Each session counts its longest run that starts in the ' +
      'period, in the bin of its first instruction; a session with no recorded main-agent call is left out. Templates are counted ' +
      'per machine and tool: a prompt whose first 100 characters recur in 3 or more sessions, or a scheduled task, is not a person ' +
      'and does not end a run. A session is left out as started by a script when its first prompt is a template, or when its first ' +
      '40 characters, with digits ignored, open 3 or more sessions; this also catches a person who opens sessions the same way. ' +
      'Automation with unique text is counted as a person. The lead figure uses ' +
      `sessions with 2 or more instructions and reads too few sessions under ${MIN_MULTI}. A trend uses only the bins with ` +
      `${MIN_TREND_SESSIONS} or more such sessions and is drawn only when there are ${MIN_TREND_BINS} of them. Where prompt text is not kept, templates cannot be ` +
      'recognised and the session counts as led by a person. Copilot sessions known only from the session store are left out (not ' +
      'comparable: the session store keeps shell commands only). A turn with no recorded call or reply is unread and is not ' +
      'counted (Copilot in VS Code turns outside its debug log); a run the log covers only in part can be undercounted. The agent ' +
      'stops at the latest end of its calls and replies: a duration over 24 hours counts as 0, and an unknown duration is stored ' +
      'as 0, so such a call ends at its start. For Claude Code the stop is the start of the last reply line, so its waits are ' +
      'slightly long; for Copilot CLI and the Copilot app it is the end of the turn, or the last call end where turn ends are not ' +
      'recorded; for Copilot in VS Code the end of the last model call. The wait runs to the person\'s next prompt. A gap under ' +
      '2 s is a queued prompt sent while the agent worked, not a wait (gaps of 2 to 5 s may also be queued); a gap over 24 hours ' +
      'is a resumed session, and a gap up to 24 hours, such as a session left open overnight, counts as a wait. In Copilot in ' +
      'VS Code a tool span may include time the agent waited for the person to confirm it, so a prompt sent instead of a ' +
      'confirmation can count as queued. The median wait is shown only when waits and queued prompts cover at least half of the ' +
      `answered turns, and only over ${MIN_WAITS} or more waits. Tools whose prompts aictl does not read (Codex CLI, Cursor) ` +
      'are not reported; Copilot in Visual Studio and JetBrains is not ' +
      'read. Prompts have their own retention: no session before the oldest stored prompt can be read. Bins are UTC days up to ' +
      '14 days, weeks up to 180 days, months beyond. The run strip draws the median and 90th percentile of sessions with 2 or ' +
      `more instructions, or, with fewer than ${MIN_MULTI} of them, of all sessions (grey). Medians and percentiles are not split ` +
      'by repository; "Colour by: Repository" splits the answered waits only.'}
    table={{
      label: 'Work per instruction by tool',
      rows: body => body.tools.map((row): Row => {
        // A tool whose prompts aictl does not read has no session counts: they read not reported, never 0.
        const count = (value: number) => row.reported ? value : null
        return {
        id: row.tool, tool: label(row.tool), status: row.sessions ? '' : silence(row),
        sessions: count(row.sessions), multi: count(row.multi_sessions), instructions: count(row.instructions),
        single: count(row.one_instruction),
        p50: row.p50_longest, p90: row.p90_longest, mean: row.mean_longest,
        p50_multi: row.p50_multi, p90_multi: row.p90_multi, mean_multi: row.mean_multi, delegated: count(row.delegated),
        answered: count(row.turns_answered), waits: count(row.waits), queued: count(row.queued), wait: row.p50_wait_s,
        over: row.over_5m, over_share: row.over_5m_share, resumed: count(row.resumed), scripted: row.scripted,
        store_only: row.store_only, unread: row.unread, unread_sessions: row.unread_sessions, no_calls: row.no_calls,
        start_unread: row.start_unread,
      } }),
      fields: [textField('tool', 'Tool'), textField('status', 'Status'), figure('sessions', 'Sessions', fmtNum),
        figure('multi', 'With 2 or more instructions', fmtNum), figure('instructions', 'Instructions', fmtNum),
        figure('single', 'Single-instruction sessions', fmtNum),
        figure('p50', 'Longest run, median', fmtNum), figure('p90', 'Longest run, 90th percentile', fmtNum),
        figure('mean', 'Longest run, mean', fmtNum), figure('p50_multi', 'Longest run, median (2+ instructions)', fmtNum),
        figure('p90_multi', 'Longest run, 90th percentile (2+ instructions)', fmtNum),
        figure('mean_multi', 'Longest run, mean (2+ instructions)', fmtNum), figure('delegated', 'Delegated calls', fmtNum),
        figure('answered', 'Turns answered', fmtNum), figure('waits', 'Waits', fmtNum),
        figure('queued', 'Queued prompts', fmtNum), figure('wait', 'Median wait', fmtDur),
        figure('over', 'Waits over 5 min', fmtNum), figure('over_share', 'Share of waits over 5 min', fmtShare),
        figure('resumed', 'Resumed after more than 24 h', fmtNum),
        numberField('scripted', 'Left out: started by a script', fmtNum),
        numberField('store_only', 'Left out: store only (not comparable: session store keeps shell commands only)', fmtNum),
        numberField('unread', 'Left out: unread turns', fmtNum),
        numberField('unread_sessions', 'Left out: sessions with every turn unread', fmtNum),
        numberField('no_calls', 'Left out: no recorded calls', fmtNum),
        numberField('start_unread', 'Prompt text not kept (counted as a person)', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('longest', 'Longest run (calls)', fmtNum), numberField('instructions', 'Instructions', fmtNum),
      numberField('calls', 'Calls', fmtNum), numberField('delegated', 'Delegated', fmtNum),
      textField('p50_wait_s', 'Median wait', row => typeof row.p50_wait_s === 'number'
        ? `${fmtDur(row.p50_wait_s)} · ${fmtNum(Number(row.queued ?? 0))} queued` : `${NOT_REPORTED} · ${fmtNum(Number(row.queued ?? 0))} queued`),
      textField('first_ts', 'First instruction', row => typeof row.first_ts === 'number' ? stamp(row.first_ts, true) : NOT_REPORTED),
      textField('single', 'Badge', row => row.single ? 'single instruction' : '')]} />
}
