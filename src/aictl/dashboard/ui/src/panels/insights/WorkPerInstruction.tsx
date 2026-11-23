import { createSignal, For, Show, untrack } from 'solid-js'
import { fmtDur, fmtNum, fmtShare, stamp } from '../../design/format'
import { Segmented } from '../../ui/Segmented'
import type { Field } from '../../ui/tableModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  autonomyFinding, autonomyHero, binDay, binWait, enoughMulti, logScale, measuredTools, MIN_MULTI, MIN_WAITS, pickedTool, silence,
  waitFigure,
  type AutonomyBin, type AutonomyBody, type AutonomyTool,
} from './autonomyModel'
import { NOT_REPORTED, plural, toolLabel, type Label } from './insightsModel'
import base from './Insights.module.css'
import styles from './WorkPerInstruction.module.css'

const W = 360, H = 92, TOP = 8, BOTTOM = 16, LEFT = 30, RIGHT = 6
const PLOT = H - TOP - BOTTOM

/** One tool: per bin, a p50–p90 bar with the multi-instruction median, the all-session median faint beside it. */
function ToolRow(props: { tool: AutonomyTool; bins: AutonomyBin[]; at: number[]; scale: ReturnType<typeof logScale>; unit: string; label: Label }) {
  const slot = () => (W - LEFT - RIGHT) / Math.max(1, props.at.length)
  const x = (ts: number) => LEFT + (props.at.indexOf(ts) + 0.5) * slot()
  const y = (value: number) => TOP + props.scale.y(value)
  const ticks = () => [1, 10, 100, 1000, 10000].filter(tick => tick <= props.scale.top)
  const joined = () => props.bins.filter(enoughMulti).map(row => `${x(row.bin_ts).toFixed(1)},${y(row.p50_multi!).toFixed(1)}`).join(' ')
  const name = () => props.label(props.tool.tool)
  return <li class={styles.tool} data-tool={props.tool.tool}>
    <h3>{name()} <small>{plural(props.tool.sessions, 'session')} · {fmtNum(props.tool.multi_sessions)} with 2 or more instructions</small></h3>
    <svg class={base.chart} style={{ 'max-inline-size': 'none' }} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${name()}: longest run of tool calls per ${props.unit}, median and 90th percentile, sessions with 2 or more instructions`}>
      <For each={ticks()}>{tick => <g>
        <line class={styles.grid} x1={LEFT} x2={W - RIGHT} y1={y(tick)} y2={y(tick)} />
        <text class={base.muted} x={LEFT - 4} y={y(tick) + 3} text-anchor="end">{fmtNum(tick)}</text>
      </g>}</For>
      <polyline class={styles.trend} points={joined()} data-trend />
      <For each={props.bins}>{row => {
        const multi = () => row.p50_multi != null
        return <g data-bin={row.bin_ts}>
          <Show when={multi() && row.p90_multi != null}>
            <line class={styles.range} x1={x(row.bin_ts)} x2={x(row.bin_ts)} y1={y(row.p50_multi!)} y2={y(row.p90_multi!)} />
          </Show>
          <Show when={row.p50_longest != null}>
            <circle class={styles.faint} cx={x(row.bin_ts) + 5} cy={y(row.p50_longest!)} r={2.5} data-all />
          </Show>
          <Show when={multi()}>
            <circle class={enoughMulti(row) ? styles.dot : styles.hollow} cx={x(row.bin_ts)} cy={y(row.p50_multi!)} r={3.5}
              data-multi={enoughMulti(row) ? 'joined' : 'few'}>
              <title>{`${binDay(row.bin_ts)}: median ${fmtNum(row.p50_multi)}, 90th percentile ${fmtNum(row.p90_multi)} calls over ` +
                `${plural(row.multi_sessions, 'session')} with 2 or more instructions; all ${plural(row.sessions, 'session')}: ` +
                `median ${fmtNum(row.p50_longest)}`}</title>
            </circle>
            <Show when={!enoughMulti(row)}>
              <text class={base.muted} x={x(row.bin_ts)} y={y(row.p50_multi!) - 6} text-anchor="middle">n={fmtNum(row.multi_sessions)}</text>
            </Show>
          </Show>
        </g>
      }}</For>
      <Show when={props.at.length}>
        <text class={base.muted} x={LEFT} y={H - 3}>{binDay(props.at[0])}</text>
        <text class={base.muted} x={W - RIGHT} y={H - 3} text-anchor="end">{binDay(props.at[props.at.length - 1])}</text>
      </Show>
    </svg>
    <div class={styles.strip} data-waits style={{ 'grid-template-columns': `${LEFT / W * 100}% repeat(${props.at.length}, minmax(0, 1fr))` }}>
      <span title="Median wait after the agent stopped, per bin">wait</span>
      <For each={props.at}>{ts => {
        const row = () => props.bins.find(bin => bin.bin_ts === ts)
        return <span title={row() ? `${binDay(ts)}: ${waitFigure(row()!)}` : `${binDay(ts)}: no session`}>{row() ? binWait(row()!) : '–'}</span>
      }}</For>
    </div>
  </li>
}

function Multiples(props: { body: AutonomyBody; label: Label; picked: AutonomyTool | undefined; pick: (tool: string) => void }) {
  const measured = () => measuredTools(props.body)
  const at = () => [...new Set(props.body.bins.map(row => row.bin_ts))].sort((a, b) => a - b)
  const scale = () => logScale(props.body.bins, PLOT)
  const silent = () => props.body.tools.filter(tool => !tool.sessions)
  const start = () => Math.max(props.body.range.since, props.body.prompts_from ?? 0)
  return <>
    <Show when={measured().length > 1}>
      <div class={styles.lead}>Lead figure for
        <Segmented label="Tool the lead figure and finding describe" value={props.picked?.tool ?? ''}
          options={measured().map(tool => ({ id: tool.tool, label: props.label(tool.tool) }))} onChange={props.pick} />
      </div>
    </Show>
    <Show when={props.picked}>{tool => <p class={styles.wait} data-wait>
      <span>Median wait after the agent stopped ({props.label(tool().tool)}): </span>{waitFigure(tool())}</p>}</Show>
    <Show when={props.body.prompts_from != null && props.body.prompts_from > props.body.range.since}>
      <p class={base.note}>Prompts are stored from {stamp(props.body.prompts_from, true)}; no session before that can be read.</p>
    </Show>
    <ul class={styles.multiples} aria-label={`Longest run of tool calls between a person's turns, per tool and ${props.body.bin_unit ?? 'bin'}`}>
      <For each={measured()}>{tool => <ToolRow tool={tool} bins={props.body.bins.filter(row => row.tool === tool.tool)} at={at()}
        scale={scale()} unit={props.body.bin_unit ?? 'bin'} label={props.label} />}</For>
    </ul>
    <Show when={measured().length}>
      <p class={base.note}>Dots: median of sessions with 2 or more instructions, bar to the 90th percentile, joined where a
        {' '}{props.body.bin_unit ?? 'bin'} has {MIN_MULTI} or more; hollow with n= below that. Faint dot: median of all sessions. Log
        {' '}scale, calls. Wait strip: the median wait where there are {MIN_WAITS} or more waits.{start() > 0 ? ` From ${stamp(start(), true)}.` : ''}</p>
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
  const [picked, setPicked] = createSignal<string>()
  const tool = (body: AutonomyBody) => pickedTool(body, picked())
  return <InsightCard<AutonomyBody> {...props} card="autonomy" title="Work per instruction" tab="flow"
    hero={body => autonomyHero(body, tool(body), label)}
    finding={body => autonomyFinding(body, tool(body), label)}
    visual={body => <Multiples body={body} label={label} picked={tool(body)} pick={setPicked} />}
    note={'A person\'s turn is a prompt of the main agent, or the answer to a question the agent asked: a call named ask_user, ' +
      'askuser, ask_question, askuserquestion or vscode_askquestions (a fixed list; ask tools served by an MCP server are ordinary ' +
      'calls). An answer starts a new run but is not an instruction. Session-control commands (/compact, /autocompact, /model, ' +
      '/clear, /effort) are not turns. A run is the main agent\'s tool calls from one turn to the next; subagent calls are not in ' +
      'it, and a call that starts a subagent counts once and as delegated. Each session counts its longest run that starts in the ' +
      'period, in the bin of its first instruction; a session with no recorded main-agent call is left out. Templates are counted ' +
      'per machine and tool: a prompt whose first 100 characters recur in 3 or more sessions, or a scheduled task, is not a person ' +
      'and does not end a run. A session is left out as started by a script when its first prompt is a template, or when its first ' +
      '40 characters, with digits ignored, open 3 or more sessions; this also catches a person who opens sessions the same way. ' +
      'Automation with unique text still looks like a person, so single-instruction sessions may be scripted: the lead figure uses ' +
      `sessions with 2 or more instructions and reads too few sessions under ${MIN_MULTI}. Where prompt text is not kept, templates cannot be ` +
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
