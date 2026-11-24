import { For, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { fmtDur, fmtNum, fmtShare, stamp } from '../../design/format'
import type { Field } from '../../ui/tableModel'
import { Tooltip } from '../../ui/Tooltip'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  autonomyFinding, autonomyHero, binDay, canTrend, figuresText, leadTool, measuredTools, MIN_MULTI, MIN_TREND_BINS,
  medianNote, MIN_TREND_SESSIONS, MIN_WAITS, queuedText, runHover, runRange, runText, runTop, silence, trendBins, trendHover,
  waitHover, waitRepoRows, waitSplit, waitText,
  type AutonomyBody, type AutonomyTool,
} from './autonomyModel'
import { Bars } from './Bars'
import { NOT_REPORTED, plural, toolLabel, type Label } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import base from './Insights.module.css'
import styles from './WorkPerInstruction.module.css'

const pct = (value: number, top: number) => `${(Math.max(0, Math.min(1, value / top)) * 100).toFixed(1)}%`

/** One mark of an HTML bar: its value written on it (visually hidden when the mark is too narrow), its detail on hover. */
function Mark(props: { class: string; style?: JSX.CSSProperties; text: string; hover: string; wide?: boolean; data: string }) {
  return <span class={`${props.class} ${styles.mark}`} style={props.style} {...{ [`data-${props.data}`]: '' }}>
    <Tooltip label={props.text} text={props.hover} class={styles.hit} onClick={() => {}}>
      <span class={props.wide === false ? styles.clip : undefined}>{props.text}</span>
    </Tooltip>
  </span>
}

/** One tool on the shared linear axis: a bar to the median longest run, a thin line on to the 90th percentile. */
function RunRow(props: { tool: AutonomyTool; top: number; label: Label; note: string }) {
  const run = () => runRange(props.tool)
  return <li class={base.barRow} data-run={props.tool.tool}>
    <span class={base.barName}>{props.label(props.tool.tool)}
      <small>{plural(props.tool.sessions, 'session')} · {fmtNum(props.tool.multi_sessions)} with 2 or more instructions</small></span>
    <span class={styles.figures}>
      <Show when={run()} fallback={<span class={styles.text}>{NOT_REPORTED}</span>}>{range => <>
        <span class={styles.track} role="group" aria-label={`${props.label(props.tool.tool)}: ${runText(props.tool)}`}>
          <Mark class={range().all ? styles.runAll : styles.run} style={{ 'inline-size': pct(range().p50, props.top) }} data="median"
            wide={range().p50 / props.top >= 0.12} text={fmtNum(range().p50)} hover={runHover(props.tool, props.label) + props.note} />
          <Show when={range().p90 != null && range().p90! > range().p50}>
            <Mark class={range().all ? styles.tailAll : styles.tail} data="p90" wide={false}
              style={{ 'inset-inline-start': pct(range().p50, props.top), 'inline-size': pct(range().p90! - range().p50, props.top) }}
              text={`90th percentile ${fmtNum(range().p90)}`} hover={runHover(props.tool, props.label) + props.note} />
          </Show>
        </span>
        <span class={styles.text} data-run-text>{runText(props.tool)}</span>
      </>}</Show>
      <small data-figures>{figuresText(props.tool)}</small>
    </span>
  </li>
}

/** One tool's answered waits, split at 5 minutes, with the median wait and the queued instructions written out. */
function WaitRow(props: { tool: AutonomyTool; label: Label }) {
  const split = () => waitSplit(props.tool)
  return <li class={base.barRow} data-wait={props.tool.tool}>
    <span class={base.barName}>{props.label(props.tool.tool)}
      <small>{plural(props.tool.waits, 'answered wait')}</small></span>
    <span class={styles.figures}>
      <Show when={split()}>{parts => <span class={styles.split} role="group" aria-label={waitText(props.tool)}>
        <Show when={parts().under}><Mark class={styles.quick} style={{ 'flex-grow': parts().under }} data="under"
          wide={parts().under / props.tool.waits >= 0.15} text={`${fmtNum(parts().under)} · ${fmtShare(parts().under / props.tool.waits)}`}
          hover={waitHover(props.tool, 'under', props.label)} /></Show>
        <Show when={parts().over}><Mark class={styles.slow} style={{ 'flex-grow': parts().over }} data="over"
          wide={parts().over / props.tool.waits >= 0.15} text={`${fmtNum(parts().over)} · ${fmtShare(parts().over / props.tool.waits)}`}
          hover={waitHover(props.tool, 'over', props.label)} /></Show>
      </span>}</Show>
      <span class={styles.text} data-wait-text>{waitText(props.tool)}</span>
      <Show when={queuedText(props.tool)}>{text => <small data-queued>{text()}</small>}</Show>
    </span>
  </li>
}

const TW = 360, TH = 66, TTOP = 16, TBOTTOM = 14, TSIDE = 14
const MAX_LABELS = 12

/** A tool's median longest run per bin, from the bins with enough sessions only; every dot carries its value. */
function TrendRow(props: { body: AutonomyBody; tool: AutonomyTool; label: Label }) {
  const unit = () => props.body.bin_unit ?? 'bin'
  const rows = () => trendBins(props.body, props.tool.tool)
  const top = () => Math.max(1, ...rows().map(row => row.p50_multi!))
  const first = () => rows()[0].bin_ts, last = () => rows()[rows().length - 1].bin_ts
  const x = (ts: number) => TSIDE + (last() > first() ? (ts - first()) / (last() - first()) : 0.5) * (TW - 2 * TSIDE)
  const y = (value: number) => TTOP + (1 - value / top()) * (TH - TTOP - TBOTTOM)
  // With many bins, the first, last, lowest and highest carry the dots and values; the line still passes every bin.
  const marked = () => {
    const values = rows().map(row => row.p50_multi!)
    if (values.length <= MAX_LABELS) return new Set(values.map((_, i) => i))
    return new Set([0, values.length - 1, values.indexOf(Math.min(...values)), values.indexOf(Math.max(...values))])
  }
  return <li class={styles.trendRow} data-trend={props.tool.tool}>
    <span class={base.barName}>{props.label(props.tool.tool)}</span>
    <Show when={canTrend(props.body, props.tool.tool)} fallback={<span class={base.note} data-no-trend>
      Too few sessions per {unit()} to draw a trend ({MIN_TREND_BINS} {unit()}s with {MIN_TREND_SESSIONS} or more sessions of 2 or more
      {' '}instructions are needed).</span>}>
      <svg class={base.chart} viewBox={`0 0 ${TW} ${TH}`} role="img"
        aria-label={`${props.label(props.tool.tool)}: median longest run of tool calls per ${unit()}`}>
        <text class={base.muted} x={0} y={9}>tool calls, median</text>
        <line class={base.axis} x1={TSIDE} x2={TW - TSIDE} y1={y(0)} y2={y(0)} />
        <polyline class={styles.line} points={rows().map(row => `${x(row.bin_ts).toFixed(1)},${y(row.p50_multi!).toFixed(1)}`).join(' ')} />
        <For each={rows()}>{(row, i) => <g data-point={row.bin_ts}>
          <circle class={styles.dot} cx={x(row.bin_ts)} cy={y(row.p50_multi!)} r={marked().has(i()) ? 3 : 2}>
            <title>{trendHover(row, props.body.bin_unit) + medianNote(props.body)}</title>
          </circle>
          <Show when={marked().has(i())}>
            <text x={x(row.bin_ts)} y={y(row.p50_multi!) - 6} text-anchor="middle">{fmtNum(row.p50_multi)}</text>
          </Show>
        </g>}</For>
        <text class={base.muted} x={TSIDE} y={TH - 2}>{binDay(first())}</text>
        <text class={base.muted} x={TW - TSIDE} y={TH - 2} text-anchor="end">{binDay(last())}</text>
      </svg>
    </Show>
  </li>
}

function Visual(props: { body: AutonomyBody; label: Label }) {
  const measured = () => measuredTools(props.body)
  const top = () => runTop(measured())
  const silent = () => props.body.tools.filter(tool => !tool.sessions)
  const start = () => Math.max(props.body.range.since, props.body.prompts_from ?? 0)
  return <>
    <Show when={props.body.prompts_from != null && props.body.prompts_from > props.body.range.since}>
      <p class={base.note}>Prompts are stored from {stamp(props.body.prompts_from, true)}; no session before that can be read.</p>
    </Show>
    <Show when={measured().length}>
      <RepoLegend split={props.body} other={hasOther(props.body.tools)} />
      <h3 class={base.subhead}>Longest run of tool calls between a person's turns, per session (tool calls)</h3>
      <ol class={base.bars} aria-label="Longest run of tool calls between a person's turns, per tool">
        <For each={measured()}>{tool => <RunRow tool={tool} top={top()} label={props.label} note={medianNote(props.body)} />}</For>
      </ol>
      <div class={styles.scaleRow} aria-hidden="true" data-run-axis><span />
        <span class={styles.scale}><span>0</span><span>{fmtNum(top())} tool calls</span></span></div>
      <ul class={base.legend}>
        <li><span class={`${base.swatch} ${styles.run}`} />Median, sessions with 2 or more instructions</li>
        <li><span class={`${base.swatch} ${styles.runAll}`} />Median, all sessions (fewer than {MIN_MULTI} with 2 or more instructions)</li>
        <li><span class={`${base.swatch} ${styles.tailSwatch}`} />On to the 90th percentile</li>
      </ul>
      <p class={base.note}>One linear scale for every tool, 0 to {fmtNum(top())} tool calls.</p>
      <h3 class={base.subhead}>Answered waits per tool: time from the agent's stop to the person's next prompt (waits; share)</h3>
      <ul class={base.legend}>
        <li><span class={`${base.swatch} ${styles.quick}`} />Answered within 5 minutes</li>
        <li><span class={`${base.swatch} ${styles.slow}`} />Answered after more than 5 minutes</li>
      </ul>
      <ol class={base.bars} aria-label="Answered waits split at 5 minutes, per tool">
        <For each={measured()}>{tool => <WaitRow tool={tool} label={props.label} />}</For>
      </ol>
      <Bars name="autonomy-waits-repos" title="Answered waits per tool, by repository (waits)"
        axis="Length: answered waits, one linear scale for every tool from 0; a segment per repository. Beside it: all waits · those over 5 minutes."
        rows={waitRepoRows(props.body, props.label)} />
      <h3 class={base.subhead}>Median longest run per {props.body.bin_unit ?? 'bin'} (tool calls; sessions with 2 or more
        {' '}instructions; {props.body.bin_unit ?? 'bin'}s with {MIN_TREND_SESSIONS} or more such sessions)</h3>
      <ol class={base.bars} aria-label={`Median longest run of tool calls per ${props.body.bin_unit ?? 'bin'}, per tool`}>
        <For each={measured()}>{tool => <TrendRow body={props.body} tool={tool} label={props.label} />}</For>
      </ol>
      <Show when={start() > 0}><p class={base.note}>From {stamp(start(), true)}.</p></Show>
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
  return <InsightCard<AutonomyBody> {...props} card="autonomy" tab="flow"
    hero={body => autonomyHero(body, leadTool(body), label)}
    finding={body => autonomyFinding(body, leadTool(body), label)}
    visual={body => <Visual body={body} label={label} />}
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
      '14 days, weeks up to 180 days, months beyond.'}
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
