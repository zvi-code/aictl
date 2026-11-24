import { createEffect, createMemo, createSignal, createUniqueId, For, lazy, Loading, Show, untrack } from 'solid-js'
import type { DetailAgentFlow, FlowSummary, TurnMark } from '../../data/contract.gen'
import { fmtDur, fmtMs, fmtN, fmtUsd } from '../../design/format'
import { Box, BoxControls, createBoxes, HiddenBoxes } from '../../ui/Box'
import { Icon } from '../../ui/Icon'
import { Menu } from '../../ui/Menu'
import { PanelState } from '../../ui/PanelState'
import { Segmented } from '../../ui/Segmented'
import { Tooltip } from '../../ui/Tooltip'
import { json } from '../../panels/data'
import { flowBounds, flowModel, skillPhase, type PlacedEvent } from '../flowModel'
import { createHover, DroppedNotice, HoverCard, OlderButtons, StepInspector, StepList, TurnScrubber } from '../FlowParts'
import { ThinkingBlocks } from '../ThinkingBlocks'
import { FLOW_PAGE, flowPages, readDownTo } from '../flowPages'
import { definitions, openingRow, matchesReference, requestsOnlyNote, rowsOf, stepsOf, totalsOf, type FlowRow, type Totals } from '../flowSteps'
import { collapseRuns, repeatsOf, scalesOf, tracksOf, workCounts, type ChartRow } from '../chartModel'
import { chartColumns, FlowChart, WorkKey } from '../FlowChart'
import {
  arrangeColumns, clampWidth, emptyWidths, hideColumn, isDefault, moveColumn, readWidths, resolveWidths, writeWidths, type WidthState,
} from '../flowWidths'
import { agentPath, labelOf, openAgent, Resource, type TabProps } from '../shared'
import { kustoLink, saveFlowFilters } from '../kqlLink'
import { watchedDetail } from '../liveAgent'
import { flowStatus } from '../sessionSpan'
import styles from '../flow.module.css'

const categories = ['prompts', 'messages', 'models', 'tools', 'skills', 'agents', 'context', 'hooks', 'lifecycle']
const SourceSteps = lazy(() => import('./Evidence'))
const quick = [['', 'All events'], ['prompts', 'User prompts'], ['models', 'Model rounds'], ['tools', 'Tool uses'],
  ['agents', 'Subagents'], ['skills', 'Skills'], ['failed', 'Failed steps']]
const empty = { q: '', category: '', tool_name: '', flow_agent: '', skill_name: '', skill_phase: '', failed: false,
  range: 'whole', start: '', end: '' }
type Filter = typeof empty
type Applied = Parameters<typeof agentPath>[2]

function pref(key: string, initial: string) {
  const read = () => { try { return localStorage.getItem(key) } catch { return null } }
  const [value, set] = createSignal(read() || initial)
  return [value, (next: string) => { set(next); try { localStorage.setItem(key, next) } catch { /* not kept */ } }] as const
}

type Figure = { label: string; value: string; title: string; tone?: 'danger' }

/** The numbers of the whole flow scope, from the server's summary of every event in it. */
function scopeFigures(summary: FlowSummary, agentScope: boolean): Figure[] {
  const calls = summary.total_api_calls
  const priced = summary.priced_calls ?? 0
  return [
    { label: 'Steps', value: fmtN(summary.total_steps), title: 'Model rounds with their tool calls, plus prompts, subagents, compactions, skills and errors, in this flow.' },
    { label: 'Requests', value: fmtN(calls), title: 'Model requests in this flow.' },
    { label: 'Tool calls', value: fmtN(summary.total_tool_uses), title: 'Tool calls in this flow.' },
    { label: 'Failures', value: fmtN(summary.errors), title: 'Failed model requests, failed tool calls and errors in this flow.', tone: summary.errors ? 'danger' : undefined },
    agentScope
      ? { label: 'Task', value: summary.total_turns ? fmtN(summary.total_turns) : 'none recorded', title: 'The task the main agent gave this subagent: its prompt.' }
      : { label: 'Prompts', value: summary.total_turns || !calls ? fmtN(summary.total_turns) : 'none recorded',
        title: summary.total_turns || !calls ? 'Prompts a person gave the agent in this flow.'
          : 'This flow has model requests but no recorded prompt: the prompt rows are not in the store for this range.' },
    { label: 'Tokens in', value: fmtN(summary.total_input_tokens), title: definitions.input },
    { label: 'Tokens out', value: fmtN(summary.total_output_tokens), title: definitions.output },
    { label: 'Cache read', value: fmtN(summary.total_cache_tokens), title: definitions.cacheRead },
    ...summary.total_cache_creation_tokens != null ? [{ label: 'Cache write', value: fmtN(summary.total_cache_creation_tokens), title: definitions.cacheWrite }] : [],
    ...summary.total_cost_usd != null ? [{ label: 'Cost', value: fmtUsd(summary.total_cost_usd),
      title: `${definitions.cost} Summed over ${fmtN(priced)} of ${fmtN(calls)} requests that have a price.` }] : [],
    { label: 'Wall time', value: fmtDur(summary.duration_s), title: 'Time from the first event of this flow to the end of its last one.' },
  ]
}

/** The same numbers for the steps loaded in the browser. */
function loadedFigures(totals: Totals) {
  return [
    `${fmtN(totals.requests)} requests`, `${fmtN(totals.tools)} tool calls`,
    totals.failures ? `${fmtN(totals.failures)} failed` : '',
    `in ${fmtN(totals.input)} · out ${fmtN(totals.output)}`, totals.cacheRead ? `cache r ${fmtN(totals.cacheRead)}` : '',
    totals.costCalls ? fmtUsd(totals.cost) : '', `wall ${fmtDur(totals.wall)}`,
  ].filter(Boolean).join(' · ')
}

export default function Flow(props: TabProps) {
  const initial = () => props.entry.initialPrompts ? 'prompts' : props.entry.initialSkills ? 'skills' : ''
  const [draft, setDraft] = createSignal<Filter>({ ...empty, category: initial() })
  const [applied, setApplied] = createSignal<Applied>({ category: initial() })
  const [problem, setProblem] = createSignal('')
  const [more, setMore] = createSignal(false)
  const [selected, select] = createSignal<string>()
  const [reveal, setReveal] = createSignal<{ id: string }>()
  const [visible, setVisible] = createSignal<readonly [number, number]>()
  const [missing, setMissing] = createSignal(false)
  // The chart is the default; the list reads the steps as text. A stored "swimlane" from before the chart is the chart.
  const [storedMode, setMode] = pref('aictl-pref-flow-mode', 'chart')
  const mode = () => storedMode() === 'timeline' ? 'timeline' : 'chart'
  // Compact rows are the default; the key is new so an older stored choice does not override it.
  const [density, setDensity] = pref('aictl-pref-flow-density-v2', 'compact')
  const [runs, setRuns] = pref('aictl-pref-flow-runs', 'each')
  const [expandedRuns, setExpandedRuns] = createSignal<ReadonlySet<string>>(new Set())
  const boxes = createBoxes('aictl-pref-flow-boxes')
  const [wholeEnd, rememberEnd] = createSignal<number>()
  const [evidence, setEvidence] = createSignal(false)
  const [usedEvidence, useEvidence] = createSignal(false)
  const filtered = createMemo(() => Object.values(applied() ?? {}).some(Boolean))
  const read = watchedDetail(untrack(() => props.shell.ctx), 'flow', createMemo(() => props.entry.id),
    createMemo(() => agentPath(props, '/flow', { limit: FLOW_PAGE, ...applied() })), createMemo(() => !filtered()))
  const pages = flowPages(createMemo(() => read()?.data), createMemo(() => agentPath(props, '/flow', applied())),
    (offset, limit) => untrack(() => agentPath(props, '/flow', { ...applied(), offset, limit })))
  const hover = createHover()
  const scope = () => read()?.data?.scope
  const summary = () => read()?.data?.summary
  const flowScope = () => read()?.data?.flow_scope
  const agentScope = () => flowScope()?.kind === 'agent'
  // A long flow is read newest first: until its oldest events are read, its totals cover only the events read.
  const totalsLabel = () => `${agentScope() ? 'Subagent totals' : 'Session totals'}${pages.complete() ? '' : ' of the events read so far'}`
  const model = createMemo(() => {
    const totals = summary()
    return flowModel(pages.events(), totals && { total_turns: totals.total_turns, omitted_events: pages.more() ? Math.max(1, pages.unloaded()) : 0 })
  })
  const steps = createMemo(() => stepsOf(model().events))
  // In a subagent's own flow every step is the subagent's: no span to draw.
  const scopeAgent = () => agentScope() ? steps()[0]?.agent ?? '' : ''
  const [collapsedSpans, setCollapsedSpans] = createSignal<ReadonlySet<string>>(new Set())
  const toggleSpan = (agent: string) => setCollapsedSpans(old => {
    const next = new Set(old)
    if (!next.delete(agent)) next.add(agent)
    return next
  })
  const rows = createMemo(() => rowsOf(steps(), { collapsed: collapsedSpans(), scopeAgent: scopeAgent() }))
  const loaded = createMemo(() => totalsOf(steps()))
  // The chart: one scale per loaded flow for each column, a track per agent, repeats, and runs when the reader collapses them.
  const tracks = createMemo(() => tracksOf(steps(), scopeAgent()))
  const scales = createMemo(() => scalesOf(steps()))
  const repeats = createMemo(() => repeatsOf(steps()))
  const counts = createMemo(() => workCounts(steps()))
  const collapsing = () => runs() === 'collapsed'
  const chartRows = createMemo<readonly ChartRow[]>(() => collapsing() ? collapseRuns(rows(), expandedRuns()) : rows())
  const shownRows = (): readonly ChartRow[] => mode() === 'chart' ? chartRows() : rows()
  const toggleRun = (id: string) => setExpandedRuns(old => {
    const next = new Set(old)
    if (!next.delete(id)) next.add(id)
    return next
  })
  const widthKey = 'aictl-pref-flow-columns'
  const storage = () => { try { return localStorage } catch { return undefined } }
  const [widthState, setWidthState] = createSignal<WidthState>(readWidths(storage(), widthKey))
  const keepWidths = (next: WidthState) => { setWidthState(next); writeWidths(storage(), widthKey, next) }
  const columnList = createMemo(() => chartColumns(scales(), tracks().count))
  const widths = createMemo(() => resolveWidths(columnList(), widthState()))
  const arranged = createMemo(() => arrangeColumns(columnList(), widthState()))
  const placeColumn = (id: string, to: number) => keepWidths(moveColumn(widthState(), arranged().shown.map(column => column.id), id, to))
  const showColumn = (id: string, show = true) => keepWidths(hideColumn(widthState(), id, !show))
  const resize = (id: string, width: number) => {
    const column = columnList().find(item => item.id === id)
    keepWidths({ ...widthState(), widths: { ...widthState().widths, [id]: clampWidth(width, column?.min, column?.max) } })
  }
  const columnName = (id: string) => columnList().find(column => column.id === id)?.name ?? id
  /** A step inside a collapsed run: open the run so the step has a row. */
  const uncover = (id: string) => {
    if (!collapsing()) return
    const run = chartRows().find(row => row.type === 'run' && !row.expanded && row.steps.some(step => step.id === id))
    if (run) toggleRun(run.id)
  }
  const opening = (list: readonly ChartRow[]) => openingRow(list as readonly FlowRow[], selected())
  const compact = () => density() === 'compact'
  const marks = () => summary()?.turn_marks ?? []
  const picked = createMemo(() => {
    const id = selected()
    return id ? steps().find(step => step.id === id) : undefined
  })
  const bound = () => wholeEnd() ?? props.agent()?.last_activity_at
  createEffect(() => ({ scope: scope(), applied: applied() }), current => {
    if (current.scope?.end != null && current.applied?.since == null && current.applied?.until == null &&
        current.applied?.category !== 'skills') rememberEnd(current.scope.end)
  })

  const show = (event?: PlacedEvent) => {
    if (!event) return
    const step = steps().find(item => item.events.includes(event))
    if (step) { uncover(step.id); select(step.id); setReveal({ id: step.id }) }
  }
  // A reference from another tab selects its step, reading older windows until the event is loaded. A model call
  // named by its time (callAt) asks the server for its position first and reads down to it in large windows.
  let found: object | undefined
  let located: object | undefined
  const [locating, setLocating] = createSignal(false)
  const locate = async (reference: object, at: number) => {
    setLocating(true)
    try {
      await readDownTo(read()?.data?.summary?.flow_epoch,
        () => json<DetailAgentFlow>(untrack(() => agentPath(props, '/flow', { ...applied(), at, limit: 1 }))),
        target => reference === located ? pages.loadOlder(target) : Promise.resolve())
    } finally {
      setLocating(false)
    }
  }
  const reference = createMemo(() => props.entry.flowRef ?? (props.entry.failedAt != null ? { field: 'failed_at', id: String(props.entry.failedAt) }
    : props.entry.callAt != null ? { field: 'call_at', id: String(props.entry.callAt) } : undefined))
  createEffect(() => ({ reference: reference(), events: model().events, more: pages.more(),
    failed: pages.problem() || pages.dropped(), ready: read()?.data != null, locating: locating() }), current => {
    const reference = current.reference
    if (!reference || !current.ready || found === reference || current.locating) return
    const event = current.events.find(item => matchesReference(item, reference))
    if (event) { found = reference; setMissing(false); show(event); return }
    // A failed or dropped read says so itself (with Retry); only a flow read to its start lacks the event.
    if (current.failed) return
    if (!current.more) { setMissing(true); return }
    if (reference.field === 'call_at' && located !== reference) { located = reference; void locate(reference, Number(reference.id)) }
    else void pages.loadOlder()
  })

  const update = <K extends keyof Filter>(key: K, value: Filter[K]) => {
    setDraft(old => ({ ...old, [key]: value })); setProblem('')
  }
  const apply = (value: Applied) => {
    setApplied({ ...value, whole: applied()?.whole }); select(undefined); setVisible(undefined); setProblem('')
  }
  const preset = (name: string) => {
    const category = name === applied()?.category || name === 'failed' ? '' : name
    const failed = name === 'failed' && applied()?.failed !== '1'
    setDraft(old => ({ ...empty, q: old.q, category, failed })); apply({ q: applied()?.q, category, failed: failed ? '1' : undefined })
  }
  const pressed = (value: string) => value === 'failed' ? applied()?.failed === '1' : (applied()?.category ?? '') === value && !applied()?.failed
  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    const value = draft()
    const { error, ...times } = flowBounds(value.range, bound(), value.start, value.end)
    if (error) { setProblem(error); setMore(true); return }
    const skills = value.category === 'skills'
    apply({ ...times, q: value.q.trim(), category: value.category, flow_agent: value.flow_agent.trim(),
      tool_name: skills ? undefined : value.tool_name.trim(), skill_name: skills ? value.skill_name.trim() : undefined,
      skill_phase: skills ? value.skill_phase : undefined, failed: !skills && value.failed ? '1' : undefined })
  }
  const reset = () => { setDraft(empty); setApplied({ whole: applied()?.whole }); select(undefined); setVisible(undefined) }
  const toggleWhole = () => { setApplied(old => ({ ...old, whole: old?.whole ? undefined : '1' })); select(undefined); setVisible(undefined) }

  const pick = async (mark: TurnMark) => {
    for (let attempt = 0; attempt < 4 && mark.offset < pages.oldest() && !pages.problem(); attempt++) {
      await pages.loadOlder(mark.offset)
    }
    const events = model().events
    show(events.find(event => event.type === 'user_message' && Math.abs(event.ts - mark.ts) < 1e-3)
      ?? events.find(event => event.ts >= mark.ts))
  }
  const older = () => { if (pages.more() && !pages.loading() && !pages.problem() && !pages.dropped()) void pages.loadOlder() }
  const range = (first: number, last: number) => {
    const list = shownRows()
    const start = list[first], end = list[last]
    const at = (row: ChartRow) => row.type === 'step' ? row.step.ts : row.type === 'run' ? row.steps[0].ts : undefined
    const from = start && at(start), to = end && at(end)
    if (from != null && to != null) setVisible([from, to])
  }
  const openSource = (event: PlacedEvent) => openAgent(props, props.entry.id, 'evidence', { flowRef: event.step_key ?
    { field: 'step_key', id: event.step_key } : { field: 'turn_id', id: event.turn_id! } })
  // The recorded status of the session, not the stream: an ended session stays ended while its stream is open.
  const status = () => flowStatus(props.runtime()?.status ?? props.agent()?.status,
    { streaming: read.streaming(), filtered: filtered(), subagent: agentScope() })

  const id = createUniqueId()
  const choices = (name: 'tool_name' | 'flow_agent' | 'skill_name', label: string, list?: readonly string[]) =>
    <label class={styles.field}>{label}
      <input class={styles.input} list={`${id}-${name}`} value={draft()[name]} onInput={event => update(name, event.currentTarget.value)} />
      <datalist id={`${id}-${name}`}><For each={list}>{value => <option value={value} />}</For></datalist>
    </label>

  const goToAgent = (agent: string) => {
    if (collapsedSpans().has(agent)) toggleSpan(agent)
    const start = steps().find(step => step.agent === agent && step.kind === 'agent')
    if (start) { uncover(start.id); select(start.id); setReveal({ id: start.id }) }
  }

  return <div class={styles.flow}>
    <header class={styles.header}>
      <div class={styles.title}>
        <h3>{agentScope() ? 'Subagent flow' : 'Session flow'}</h3>
        <Show when={read()?.data}>
          <span class={styles.live} data-state={status().state}>{status().label}</span>
        </Show>
      </div>
      <div class={styles.actions}>
        <HiddenBoxes boxes={boxes} />
        <Show when={kustoLink(read()?.data?.session_kql_url)}>{href =>
          <a class={styles.button} href={href()} target="_blank" rel="noopener noreferrer"><Icon glyph="external" small />Open session in Kusto</a>
        }</Show>
        <button type="button" class={styles.button} onClick={() => {
          saveFlowFilters(props.shell.ctx, props.entry.id, applied()); props.shell.changeTab('kql')
        }}><Icon glyph="command" small />Query in Kusto</button>
        <button type="button" class={styles.toggle} aria-pressed={evidence() ? 'true' : 'false'}
          onClick={() => { useEvidence(true); setEvidence(value => !value) }}>
          <Icon glyph={evidence() ? 'flow' : 'sources'} small />{evidence() ? 'Show Flow' : 'Source steps'}</button>
      </div>
    </header>

    <Show when={flowScope()?.subagent}>
      <p class={styles.scopeNote} role="status">
        <Icon glyph="agents" small />
        <span>{agentScope() ? "This subagent's own steps. The numbers below count only them."
          : applied()?.whole ? 'The whole session of the main agent, every agent included.'
            : 'No steps are recorded for this subagent, so the whole session is shown.'}</span>
        <Show when={agentScope() || applied()?.whole}>
          <button type="button" class={styles.button} onClick={toggleWhole}>
            {applied()?.whole ? 'Show this subagent only' : 'Show the whole session'}</button>
        </Show>
      </p>
    </Show>

    <Show when={summary()}>{totals =>
      <Box boxes={boxes} id="totals" label={totalsLabel()} class={styles.strip} controls={['fold', 'hide']} corner>
        <dl class={styles.figures} aria-label={totalsLabel()}>
          <For each={scopeFigures(totals(), agentScope())}>{figure =>
            <div title={figure.title}><dt>{figure.label}</dt><dd data-tone={figure.tone}>{figure.value}</dd></div>
          }</For>
          <Show when={totals().ttft_ms != null}>
            <div title={`${definitions.ttft} Median over ${fmtN(totals().ttft_calls)} requests.`}><dt>First token</dt><dd>{fmtMs(totals().ttft_ms)}</dd></div>
          </Show>
        </dl>
        <p class={styles.loaded} title="The same numbers for the steps loaded below. Load older steps to widen the range.">
          <strong>Loaded {fmtN(steps().length)}{!filtered() && totals().total_steps != null ? ` of ${fmtN(totals().total_steps)}` : ''} steps</strong>
          <span>{loadedFigures(loaded())}</span>
        </p>
      </Box>
    }</Show>

    <Show when={!agentScope() && summary() && requestsOnlyNote(summary()!)}>{note =>
      <p class={styles.scopeNote} role="status" data-requests-only><Icon glyph="sources" small /><span>{note()}</span></p>
    }</Show>

    <Show when={usedEvidence()}>
      <div hidden={!evidence()}><Loading fallback={<PanelState state="loading" />}><SourceSteps {...props} /></Loading></div>
    </Show>

    <div class={styles.flow} hidden={evidence()}>
      <Box boxes={boxes} id="filters" label="Filters" class={styles.cornerBox} controls={['fold', 'hide']} corner>
      <form class={styles.filters} role="search" aria-label="Flow filters" onSubmit={submit}>
        <div class={styles.pills} role="group" aria-label="Event types"><For each={quick}>{([value, label]) =>
          <button type="button" class={styles.pill} aria-pressed={pressed(value) ? 'true' : 'false'} onClick={() => preset(value)}>{label}</button>
        }</For></div>
        <div class={styles.filterRow}>
          <label class={styles.search}>
            <Icon glyph="search" small />
            <input class={styles.searchInput} type="search" maxlength={160} value={draft().q}
              aria-label={draft().category === 'prompts' ? 'Search prompt text' : 'Search events'}
              placeholder={draft().category === 'prompts' ? 'Search prompt text' : 'Search events, tools, models and messages'}
              onInput={event => update('q', event.currentTarget.value)} />
          </label>
          <button type="submit" class={styles.primary}>Apply filters</button>
          <button type="button" class={styles.toggle} aria-expanded={more() ? 'true' : 'false'} aria-controls={`${id}-more`}
            onClick={() => setMore(value => !value)}><Icon glyph="filter" small />More filters</button>
          <Show when={Object.entries(applied() ?? {}).some(([key, value]) => key !== 'whole' && value)}>
            <button type="button" class={styles.button} onClick={reset}><Icon glyph="close" small />Reset filters</button>
          </Show>
        </div>
        <div id={`${id}-more`} class={styles.more} hidden={!more()}>
          <label class={styles.field}>Category
            <select class={styles.input} value={draft().category} onChange={event => update('category', event.currentTarget.value)}>
              <option value="">All categories</option>
              <For each={categories}>{value => <option value={value}>{value === 'prompts' ? 'User prompts only' : labelOf(value)}</option>}</For>
            </select>
          </label>
          <Show when={draft().category === 'skills'} fallback={choices('tool_name', 'Tool name', scope()?.tools)}>
            {choices('skill_name', 'Skill name', scope()?.skills)}
            <label class={styles.field}>Skill evidence
              <select class={styles.input} value={draft().skill_phase} onChange={event => update('skill_phase', event.currentTarget.value)}>
                <option value="">All evidence</option>
                <For each={['loaded', 'invoked', 'reported', 'resolved']}>{value => <option value={value}>{skillPhase(value)}</option>}</For>
              </select>
            </label>
          </Show>
          {choices('flow_agent', 'Agent ID', scope()?.agents)}
          <label class={styles.field}>Time range
            <select class={styles.input} value={draft().range} onChange={event => update('range', event.currentTarget.value)}>
              <option value="whole">Whole session</option>
              <option value="900" disabled={bound() == null}>Last 15 min of session</option>
              <option value="3600" disabled={bound() == null}>Last hour of session</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          <Show when={draft().range === 'custom'}>
            <label class={styles.field}>From (local)<input class={styles.input} type="datetime-local" value={draft().start} onInput={event => update('start', event.currentTarget.value)} /></label>
            <label class={styles.field}>To (local)<input class={styles.input} type="datetime-local" value={draft().end} onInput={event => update('end', event.currentTarget.value)} /></label>
          </Show>
          <Show when={draft().category !== 'skills'}>
            <label class={styles.check}><input type="checkbox" checked={draft().failed} onChange={event => update('failed', event.currentTarget.checked)} />Failures only</label>
          </Show>
        </div>
        <Show when={problem()}><p class={styles.problem} role="alert">{problem()}</p></Show>
      </form>
      </Box>

      <Resource read={read}>{() => <>
        <Show when={marks().length > 1}>
          <Box boxes={boxes} id="turns" label="Turn overview" class={styles.cornerBox} controls={['fold', 'hide']} corner>
            <TurnScrubber marks={marks()} loadedFrom={pages.oldest()} visible={visible()} hover={hover} pick={mark => void pick(mark)} />
          </Box>
        </Show>
        <Box boxes={boxes} id="chart" label="Flow chart" class={styles.chart} head={<div class={styles.toolbar}>
          <Segmented label="Flow view" value={mode()} onChange={setMode} options={[
            { id: 'chart', label: 'Chart: time, context and size of each step', glyph: 'bars', iconOnly: true },
            { id: 'timeline', label: 'List: each step with its numbers as text', glyph: 'events', iconOnly: true }]} />
          <Show when={mode() === 'chart'} fallback={
            <Segmented label="Row density" value={density()} onChange={setDensity} options={[
              { id: 'compact', label: 'Compact rows: one line per call', glyph: 'menu', iconOnly: true },
              { id: 'comfortable', label: 'Comfortable rows: the command on a second line', glyph: 'density', iconOnly: true }]} />}>
            <Tooltip label="Collapse runs" pressed={collapsing()} class={styles.iconButton}
              text={collapsing() ? 'Show every step on its own row' : 'One row for each run of 3 or more steps that call the same tool or program in a row'}
              onClick={() => { setRuns(collapsing() ? 'each' : 'collapsed'); setExpandedRuns(new Set<string>()) }}><Icon glyph="layout" small /></Tooltip>
            <Tooltip label="Reset columns" text="Back to the default column widths and order, with every column shown" class={styles.iconButton}
              disabled={isDefault(widthState())} onClick={() => keepWidths(emptyWidths())}><Icon glyph="refresh" small /></Tooltip>
            <Show when={arranged().hidden.length}>
              <span class={styles.hiddenLanes}>
                <Menu label={`Hidden columns (${arranged().hidden.length})`} items={[
                  ...arranged().hidden.map(column => ({ id: column.id, label: `Show ${columnName(column.id)}`, onSelect: () => showColumn(column.id) })),
                  { id: '#all', label: 'Show all columns', onSelect: () => keepWidths({ ...widthState(), hidden: [] }) },
                ]} />
              </span>
            </Show>
          </Show>
          <span class={styles.count} aria-live="polite">{pages.complete()
            ? `${fmtN(Math.max(0, pages.matched() - pages.oldest()))} of ${fmtN(pages.matched() - pages.first())} ${filtered() ? 'matching ' : ''}events loaded`
            : `${fmtN(Math.max(0, pages.matched() - pages.oldest()))} ${filtered() ? 'matching ' : ''}events loaded; older events are read on demand`}</span>
          <div class={styles.paging}>
            <OlderButtons pages={pages} />
            <Tooltip label="Jump to newest" text="Scroll to the newest step" class={styles.iconButton}
              disabled={!rows().length} onClick={() => {
                const last = rows().at(-1)
                if (last) setReveal({ id: last.id })
              }}><Icon glyph="last" small /></Tooltip>
          </div>
          <BoxControls boxes={boxes} id="chart" label="Flow chart" />
        </div>}>
        <Show when={pages.loading()}><p class={styles.notice} role="status"><Icon glyph="refresh" small />Loading older events…</p></Show>
        <DroppedNotice dropped={pages.dropped} retry={() => { pages.retry(); read.retry() }} />
        <Show when={pages.problem()}><p class={styles.problem} role="alert">Could not load older events: {pages.problem()}</p></Show>
        <Show when={missing()}><p class={styles.notice} role="status">No event matches this reference.</p></Show>
        <Show when={mode() === 'chart' && steps().length}><WorkKey counts={counts()} failed={loaded().failures} /></Show>
        <div class={styles.body} data-inspecting={picked() ? 'true' : 'false'}>
          <Show when={mode() === 'chart' && rows().length} fallback={
            <StepList rows={rows()} selected={selected()} select={select} hover={hover} reveal={reveal()} compact={compact()}
              initial={opening} toggleSpan={toggleSpan}
              onStart={older} onRange={range} empty={filtered() ? 'No events match these filters.' : 'No events reported for this flow.'} />
          }>
            <FlowChart rows={chartRows()} columns={arranged().shown} widths={widths()} tracks={tracks()} scales={scales()} repeats={repeats()}
              scopeAgent={scopeAgent()} selected={selected()} select={select} hover={hover} reveal={reveal()} onStart={older} onRange={range}
              initial={opening} toggleSpan={toggleSpan} toggleRun={toggleRun} close={() => select(undefined)}
              moveColumn={placeColumn} hideColumn={id => showColumn(id, false)} resize={resize} />
          </Show>
          <Show when={picked()}>{step =>
            <StepInspector step={step()} close={() => select(undefined)} evidence={openSource} openAgent={goToAgent}
              thinking={call => <Show when={read()?.data?.session_id}>{session =>
                <ThinkingBlocks ctx={props.shell.ctx} session={session()} call={call} />}</Show>} />
          }</Show>
        </div>
        </Box>
      </>}</Resource>
    </div>
    <HoverCard hover={hover} />
  </div>
}
