import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { fmtN, fmtUsd } from '../../design/format'
import { columnStyles, createColumnControls } from '../../ui/ColumnControls'
import { createColumnLayout, tableKey } from '../../ui/columnState'
import { States } from '../kinds/States'
import type { KeyedRow, PanelProps } from '../types'
import { agentRows } from './agentRows'
import {
  agentsCounts, agentsHeader, ago, buildTree, cellSpans, childrenOf, costBasisHint, costBasisText, duration, durationMissing, elapsed, isLive, lastMissing, missingReason, nameHint, subagentText, summarize,
  type TreeAgent, type TreeEntry,
} from './agentTree'
import css from './AgentsTree.module.css'

type Row = TreeAgent & { display?: string }
type Column = { id: string; label: string; help: string; numeric?: boolean }

// Each column says what it counts; the same words show on hover and in the column guide.
const columns: readonly Column[] = [
  { id: 'name', label: 'Agent', help: 'A session (main agent), or a subagent it started, indented under it. Hover a name to see where it comes from and the prompt.' },
  { id: 'status', label: 'Status', help: 'Running: wrote a line in the last 2 min or waits for a tool result. Waiting: needs your confirmation. Idle: live but quiet. Ended: finished, or quiet for 15 min (inferred). Hover for the evidence.' },
  { id: 'now', label: 'Now', help: 'For a running subagent: its newest tool call and what it acts on.' },
  { id: 'started', label: 'Started', help: 'When the session or subagent started (local time).' },
  { id: 'duration', label: 'Duration', help: 'Live rows: time since start, counting. Ended rows: start to last line.' },
  { id: 'last', label: 'Last activity', help: 'Time since the last transcript line or recorded call.' },
  { id: 'requests', label: 'Requests', help: 'Model calls recorded. A session counts its subagents too.', numeric: true },
  { id: 'tools', label: 'Tool calls', help: 'Tool calls recorded, and how many failed. A session counts its subagents too.', numeric: true },
  { id: 'tokens', label: 'Tokens in / out', help: 'In: input tokens, including cache reads and writes. Out: output tokens. A session counts its subagents too; hover for the split.', numeric: true },
  { id: 'cost', label: 'Cost', help: 'Billed: what Copilot recorded for the session (AI credits at $0.01). Estimate: list price of the recorded tokens, not a bill. A session counts its subagents too.', numeric: true },
]
const historyColumns: ReadonlySet<string> = new Set(['last', 'requests', 'tools', 'tokens', 'cost'])
// The agent name carries the tree, so it stays first and visible.
const specs = columns.map(column => ({ ...column, pin: column.id === 'name' ? 'start' as const : undefined }))
const pageRoots = 40
const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dateTime = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const full = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const text = (value: unknown) => typeof value === 'string' && value ? value : undefined
const shortModel = (model: string) => model.replace(/^claude-/, '').replace(/-\d{8}$/, '')

function stamp(seconds: number, now: number) {
  const date = new Date(seconds * 1000)
  return new Date(now * 1000).toDateString() === date.toDateString() ? time.format(date) : dateTime.format(date)
}

function tokensIn(row: Row) {
  const parts = [row.input, row.cache_read, row.cache_write].map(num)
  return parts.every(part => part === undefined) ? undefined : parts.reduce<number>((a, b) => a + (b ?? 0), 0)
}

function Missing(props: { why: string }) {
  return <span class={css.missing} title={props.why}>N/A<span class={css.hidden}>: {props.why}</span></span>
}

export default function AgentsTree(props: PanelProps) {
  const panel = untrack(() => props)
  const { ctx, def } = panel
  const setup = agentRows(panel)
  const layout = createColumnLayout({ key: () => tableKey(def.id), columns: () => specs })
  const controls = createColumnControls({ control: layout, label: () => def.title, columns: () => specs })
  const [folds, setFolds] = createSignal<ReadonlyMap<string, boolean>>(new Map())
  const [roots, setRoots] = createSignal(pageRoots)
  const [now, setNow] = createSignal(Date.now() / 1000)
  createEffect(() => true, () => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 5000)
    return () => clearInterval(timer)
  })
  const rows = createMemo(() => setup.rows().map((entry: KeyedRow): Row => {
    const row = entry.row as Record<string, unknown>
    return { ...row, id: entry.id, parent_id: entry.parent ?? null, status: text(row.state) ?? text(row.status),
      display: text(row.status), agent_id: row.id } as Row
  }))
  const kids = createMemo(() => childrenOf(rows()))
  const entries = createMemo(() => buildTree(rows(), folds()))
  const visible = createMemo(() => {
    let top = 0
    return entries().filter(entry => entry.depth > 0 || ++top <= roots())
  })
  const topCount = () => entries().filter(entry => entry.depth === 0).length
  // A row whose status changed since the last refresh is marked once, so its move is visible.
  let previous = new Map<string, unknown>()
  const changed = createMemo(() => {
    const next = new Map(rows().map(row => [row.id, row.status]))
    const moved = new Set([...next].filter(([id, status]) => previous.has(id) && previous.get(id) !== status).map(([id]) => id))
    previous = next
    return moved
  })
  const toggle = (entry: TreeEntry<Row>) => setFolds(old => new Map(old).set(entry.row.id, !entry.expanded))
  // A live session the tool's session file names opens too: the drawer reads its whole stored history.
  const openable = (row: Row) => row.queryable === true || (row.runtime_present === true && typeof row.native_session_id === 'string' && !!row.native_session_id)
  const open = (row: Row) => openable(row) && typeof row.agent_id === 'string' ? () => ctx.openAgent(row.agent_id as string, 'flow') : undefined
  let body!: HTMLTableSectionElement
  const focusRow = (id: string | undefined) => {
    if (id === undefined) return
    body.querySelector<HTMLElement>(`tr[data-row-id="${CSS.escape(id)}"]`)?.focus()
  }
  const keydown = (event: KeyboardEvent, entry: TreeEntry<Row>) => {
    if (event.target !== event.currentTarget) return
    const list = visible(), index = list.indexOf(entry)
    const move = (to: number) => { event.preventDefault(); focusRow(list[to]?.row.id) }
    if (event.key === 'ArrowDown') move(index + 1)
    else if (event.key === 'ArrowUp') move(index - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(list.length - 1)
    else if (event.key === 'ArrowRight' && entry.children) {
      event.preventDefault()
      if (!entry.expanded) toggle(entry)
      else focusRow(list[index + 1]?.row.id)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (entry.children && entry.expanded) toggle(entry)
      else focusRow(entry.parent)
    } else if (event.key === 'Enter') {
      const run = open(entry.row)
      if (run) { event.preventDefault(); run() }
    }
  }
  const counts = createMemo(() => agentsCounts(rows()))
  const unlinked = () => setup.unlinked()
  const unlinkedGroups = createMemo(() => {
    const labels = ctx.board('tool_labels')
    const groups = new Map<string, ReturnType<typeof setup.unlinked>>()
    for (const item of unlinked()) {
      const label = item.tool ? labels?.[item.tool] ?? item.tool : 'Unknown tool'
      groups.set(label, [...groups.get(label) ?? [], item])
    }
    return [...groups].sort(([a], [b]) => a.localeCompare(b))
  })
  const recorded = () => num(ctx.board('scope')?.shown_agents)
  const listedHistory = () => rows().filter(row => row.queryable === true).length
  return <div class={css.panel}>
    {setup.controls}
    <p class={css.note}>
      {agentsHeader(counts(), unlinked().length)}
      <Show when={setup.emptyCount() && !setup.showEmpty()}> · {setup.emptyCount()} with no activity (hidden)</Show>
      <Show when={recorded() !== undefined && recorded()! > listedHistory()}>
        {' '}· showing {listedHistory().toLocaleString()} of {recorded()!.toLocaleString()} recorded agents (the list holds 200 rows)
      </Show>
      . A session's numbers include its subagents.
    </p>
    <Show when={setup.emptyCount()}>
      <label class={css.note}>
        <input type="checkbox" checked={setup.showEmpty()} onChange={event => setup.setShowEmpty(event.currentTarget.checked)} />
        {' '}Show sessions with no activity ({setup.emptyCount()})
      </label>
    </Show>
    <details class={css.guide}>
      <summary>What the columns mean</summary>
      <dl><For each={columns}>{column => <><dt>{column.label}</dt><dd>{column.help}</dd></>}</For></dl>
    </details>
    <States result={setup.result} empty={def.empty} retry={ctx.refresh}>
      <div class={columnStyles.frame}>
      <div class={css.frame}>
        <table ref={controls.setTable} class={css.table} role="treegrid" aria-label={def.title}
          data-sized={controls.sized() ? '' : undefined} style={controls.tableStyle()}>
          <controls.ColGroup />
          <thead><tr>
            <For each={layout.visible()} keyed={column => column.id}>{column =>
              <th scope="col" class={columnStyles.header} data-col={column().id} data-pinned={column().pin ? '' : undefined}
                data-drop={controls.dropSide(column().id)} data-dragging={controls.dragging(column().id)}
                data-numeric={column().numeric ? '' : undefined} title={column().help}
                onPointerDown={event => controls.onHeaderPointerDown(column(), event)}
                onKeyDown={event => controls.onHeaderKeyDown(column(), event)}>
                {column().label}
                <controls.Tools column={column()} />
              </th>}
            </For>
          </tr></thead>
          <tbody ref={body}>
            <For each={visible()} keyed={entry => entry.row.id}>{entry => {
              const row = () => entry().row
              const summary = () => summarize(row(), kids().get(row().id) ?? [])
              const sub = () => !!row().parent_id && row().kind !== 'main' && row().kind !== 'group'
              const group = () => row().kind === 'group'
              const model = () => text(row().model_alias) ?? (text(row().resolved_model) ? shortModel(row().resolved_model as string)
                : text(row().primary_model) ? shortModel(row().primary_model as string) : undefined)
              const plain = () => row().queryable === false || row().no_activity === true
              const secondary = () => sub() ? text(row().prompt_line)
                : [subagentText(summary()), text(row().project)?.split(/[\\/]/).filter(Boolean).at(-1),
                  plain() ? text(row().short) : undefined,
                  row().no_activity === true && num(row().started_at) ? `started ${stamp(num(row().started_at)!, now())}` : undefined,
                ].filter(Boolean).join(' · ')
              const noHistory = () => text(row().no_history)
              const action = () => open(row())
              const dur = () => duration(row(), now())
              const last = () => num(row().last_activity_at)
              const calls = () => num(row().tool_calls)
              const requests = () => num((row().msgs as { assistant?: unknown } | undefined)?.assistant)
              const tin = () => tokensIn(row()), tout = () => num(row().output)
              const includes = () => row().includes_subagents === true ? summary().count : 0
              const tokenHint = () => {
                const lines = [`Input ${fmtN(num(row().input))} · cache read ${fmtN(num(row().cache_read))} · cache write ${fmtN(num(row().cache_write))} · output ${fmtN(tout())}`]
                if (includes()) {
                  lines.push(`Includes ${includes()} subagents. Main agent alone: ${fmtN(num(row().main_input))} input · ${fmtN(num(row().main_output))} output`)
                  if (summary().listed) lines.push(`Listed subagents: ${fmtN(summary().input)} input · ${fmtN(summary().output)} output`)
                }
                return lines.join('\n')
              }
              const nowText = () => text(row().now) ?? (row().pending ? `Waiting for you: ${(row().pending as { name?: string }).name ?? 'a confirmation'}` : undefined)
              const spans = createMemo(() => cellSpans(layout.visible().map(column => column.id), noHistory() ? historyColumns : undefined))
              const cells: Record<string, () => JSX.Element> = {
                  name: () => <td data-col="name" class={css.name}>
                    <div class={css.tree} style={{ '--depth': String(Math.min(entry().depth, 4)) }}>
                      <Show when={entry().depth > 0}><span class={css.connector} data-last={entry().last ? '' : undefined} aria-hidden="true" /></Show>
                      <Show when={entry().children} fallback={<span class={css.foldSpace} aria-hidden="true" />}>
                        <button type="button" class={css.fold} tabindex={-1} aria-expanded={entry().expanded ? 'true' : 'false'}
                          aria-label={`${entry().expanded ? 'Collapse' : 'Expand'} ${row().title}`} onClick={() => toggle(entry())}>
                          {entry().expanded ? '▾' : '▸'}
                        </button>
                      </Show>
                      <div class={css.label}>
                        <div class={css.line}>
                          <Show when={!group()}>
                            <span class={css.kind} data-kind={sub() ? 'subagent' : 'main'}>{sub() ? 'Subagent' : text(row().tool) ?? 'Session'}</span>
                          </Show>
                          <Show when={action()} fallback={<span class={css.title} title={nameHint(row())}>{row().title}</span>}>{run =>
                            <button type="button" class={css.titleButton} title={nameHint(row())} tabindex={-1}
                              aria-label={`${row().title}, open its flow`} onClick={() => run()()}>{row().title}</button>
                          }</Show>
                          <Show when={sub() && text(row().agent_type)}>
                            <span class={css.chip} title={`Agent type: ${row().agent_type}`}>{row().agent_type as string}</span>
                          </Show>
                          <Show when={!group() && model()}>
                            <span class={css.chip} title={`Model: ${[row().model_alias, row().resolved_model ?? row().primary_model].filter(Boolean).join(' → ')}`}>{model()}</span>
                          </Show>
                        </div>
                        <Show when={!group() && secondary()}>
                          <div class={css.secondary} title={sub() ? `Prompt, first line: ${secondary()}` : undefined}>{secondary()}</div>
                        </Show>
                      </div>
                    </div>
                  </td>,
                  status: () => <td data-col="status" title={text(row().status_evidence) ?? (group() ? undefined : 'No evidence recorded for this status')}>
                    <Show when={!group()}>
                      <span class={css.status} data-status={row().status ?? 'unknown'}>{row().display ?? 'Activity unknown'}</span>
                      <Show when={text(row().status_evidence)}>{evidence => <div class={css.secondary}>{evidence()}</div>}</Show>
                    </Show>
                  </td>,
                  now: () => <td data-col="now" class={css.nowCell} title={nowText()}>{nowText()}</td>,
                  started: () => <td data-col="started" title={num(row().started_at) ? full.format(new Date(num(row().started_at)! * 1000)) : undefined}>
                    <Show when={!group()}>
                      <Show when={num(row().started_at)} fallback={<Missing why="No start time recorded" />}>{at => stamp(at(), now())}</Show>
                    </Show>
                  </td>,
                  duration: () => <td data-col="duration" data-numeric="">
                    <Show when={!group()}>
                      <Show when={dur() !== undefined} fallback={<Missing why={durationMissing(row())} />}>
                        <span title={isLive(row().status) ? 'Running time so far' : 'Start to last line'}>{elapsed(dur()!)}</span>
                      </Show>
                    </Show>
                  </td>,
                  last: () => <td data-col="last" data-numeric="">
                    <Show when={!group()}>
                      <Show when={last()} fallback={<Missing why={lastMissing(row())} />}>
                        {at => <span title={full.format(new Date(at() * 1000))}>{ago(now() - at())} ago</span>}
                      </Show>
                    </Show>
                  </td>,
                  requests: () => <td data-col="requests" data-numeric="">
                    <Show when={!group()}>
                      <Show when={requests() !== undefined} fallback={<Missing why={missingReason(row(), 'requests')} />}>{fmtN(requests())}</Show>
                    </Show>
                  </td>,
                  tools: () => <td data-col="tools" data-numeric="">
                    <Show when={!group()}>
                      <Show when={calls() !== undefined} fallback={<Missing why={missingReason(row(), 'tool_calls')} />}>
                        {fmtN(calls())}<Show when={num(row().failures)}>{failed => <span class={css.failed}> · {failed()} failed</span>}</Show>
                      </Show>
                    </Show>
                  </td>,
                  tokens: () => <td data-col="tokens" data-numeric="" title={group() ? undefined : tokenHint()}>
                    <Show when={!group()}>
                      <Show when={tin() !== undefined || tout() !== undefined} fallback={<Missing why={missingReason(row(), 'tokens')} />}>
                        <span class={css.pair}><span>{fmtN(tin())} <small>in</small></span> <span>{fmtN(tout())} <small>out</small></span></span>
                      </Show>
                      <Show when={includes()}><div class={css.secondary}>incl. {includes()} subagents</div></Show>
                    </Show>
                  </td>,
                  cost: () => <td data-col="cost" data-numeric="">
                    <Show when={!group()}>
                      <Show when={num(row().cost_usd) !== undefined} fallback={<Missing why={missingReason(row(), 'cost')} />}>{fmtUsd(num(row().cost_usd))}
                        <Show when={costBasisText(row())}><div class={css.secondary} title={costBasisHint(row())}>{costBasisText(row())}</div></Show></Show>
                    </Show>
                  </td>,
              }
              return <tr data-row-id={row().id} tabindex={0} aria-level={entry().depth + 1}
                aria-expanded={entry().children ? (entry().expanded ? 'true' : 'false') : undefined}
                aria-posinset={entry().position} aria-setsize={entry().siblings}
                data-kind={group() ? 'group' : sub() ? 'subagent' : 'main'} data-live={isLive(row().status) ? '' : undefined}
                data-changed={changed().has(row().id) ? '' : undefined} onKeyDown={event => keydown(event, entry())}>
                {/* A row with no recorded history spans its history columns with one note. */}
                <For each={spans()}>{(cell, index) => cell.joined
                  ? <td data-col={cell.id} colspan={cell.span} class={css.secondary}>
                    {spans().findIndex(item => item.joined) === index() ? noHistory() : undefined}
                  </td>
                  : cells[cell.id]()
                }</For>
              </tr>
            }}</For>
          </tbody>
        </table>
      </div>
      <controls.Menu />
      <controls.Status />
      </div>
      <Show when={topCount() > roots()}>
        <button type="button" class={css.more} onClick={() => setRoots(roots() + pageRoots)}>
          Show {Math.min(pageRoots, topCount() - roots())} more of {topCount() - roots()} hidden sessions
        </button>
      </Show>
    </States>
    <Show when={unlinked().length}>
      <details class={css.guide} data-section="unlinked">
        <summary>Processes not linked to a session ({unlinked().length})</summary>
        <p class={css.note}>No evidence the tool wrote links these processes to a session, so they are not listed as sessions.</p>
        <For each={unlinkedGroups()}>{([label, items]) => <>
          <h4>{label} ({items.length})</h4>
          <ul>
            <For each={items}>{item => <li data-unlinked={item.id}>
              {item.pids.length === 1 ? 'pid' : 'pids'} {item.pids.slice(0, 6).join(', ')}{item.pids.length > 6 ? ` … (${item.pids.length})` : ''}
              <Show when={item.started_at}>{at => <> · started {stamp(at(), now())}</>}</Show>
              <Show when={item.project}>{project => <> · {project()}</>}</Show>
              <Show when={item.cpu_percent !== undefined}> · CPU {item.cpu_percent!.toFixed(1)}%</Show>
              <Show when={item.mem_mb !== undefined}> · {fmtN(Math.round(item.mem_mb!))} MB</Show>
              <div class={css.secondary}>Not linked: {item.reason}</div>
            </li>}</For>
          </ul>
        </>}</For>
      </details>
    </Show>
  </div>
}
