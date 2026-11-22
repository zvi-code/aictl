import { createEffect, createMemo, createSignal, createUniqueId, For, lazy, Loading, Show, untrack } from 'solid-js'
import type { TurnMark } from '../../data/contract.gen'
import { fmtMs, fmtN } from '../../design/format'
import { Icon } from '../../ui/Icon'
import { PanelState } from '../../ui/PanelState'
import { Segmented } from '../../ui/Segmented'
import { Tooltip } from '../../ui/Tooltip'
import { eventIdentity, flowBounds, flowModel, skillPhase, type PlacedEvent } from '../flowModel'
import { createHover, EventList, HoverCard, Inspector, TurnScrubber } from '../FlowParts'
import { FLOW_PAGE, flowPages } from '../flowPages'
import { agentPath, labelOf, openAgent, Resource, type Reference, type TabProps } from '../shared'
import { kustoLink, saveFlowFilters } from '../kqlLink'
import { watchedDetail } from '../liveAgent'
import { SwimLanes } from '../SwimLanes'
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
  const [value, set] = createSignal(localStorage.getItem(key) || initial)
  return [value, (next: string) => { set(next); localStorage.setItem(key, next) }] as const
}

const matches = (event: PlacedEvent, reference: Reference) =>
  event[reference.field] === reference.id && (!reference.traceId || event.trace_id === reference.traceId)

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
  const [mode, setMode] = pref('aictl-pref-flow-mode', 'timeline')
  const [lanes, setLanes] = pref('aictl-pref-flow-lanes', 'individual')
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
  const model = createMemo(() => {
    const totals = summary()
    return flowModel(pages.events(), totals && { total_turns: totals.total_turns, omitted_events: pages.oldest() })
  })
  const events = () => model().events
  const marks = () => summary()?.turn_marks ?? []
  const picked = createMemo(() => {
    const id = selected()
    return id ? events().find(event => eventIdentity(event) === id) : undefined
  })
  const bound = () => wholeEnd() ?? props.agent()?.ended_at
  createEffect(() => ({ scope: scope(), applied: applied() }), current => {
    if (current.scope?.end != null && current.applied?.since == null && current.applied?.until == null &&
        current.applied?.category !== 'skills') rememberEnd(current.scope.end)
  })

  const show = (event?: PlacedEvent) => {
    if (!event) return
    const id = eventIdentity(event)
    select(id); setReveal({ id })
  }
  // A reference from another tab selects its event, reading older windows until the event is loaded.
  let found: Reference | undefined
  createEffect(() => ({ reference: props.entry.flowRef, events: events(), oldest: pages.oldest(),
    failed: pages.problem(), ready: read()?.data != null }), current => {
    const reference = current.reference
    if (!reference || !current.ready || found === reference) return
    const event = current.events.find(item => matches(item, reference))
    if (event) { found = reference; setMissing(false); show(event); return }
    if (current.oldest > 0 && !current.failed) void pages.loadOlder()
    else setMissing(true)
  })

  const update = <K extends keyof Filter>(key: K, value: Filter[K]) => {
    setDraft(old => ({ ...old, [key]: value })); setProblem('')
  }
  const apply = (value: Applied) => { setApplied(value); select(undefined); setVisible(undefined); setProblem('') }
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
  const reset = () => { setDraft(empty); apply({}) }

  const pick = async (mark: TurnMark) => {
    for (let attempt = 0; attempt < 4 && mark.offset < pages.oldest() && !pages.problem(); attempt++) {
      await pages.loadOlder(mark.offset)
    }
    show(events().find(event => event.type === 'user_message' && Math.abs(event.ts - mark.ts) < 1e-3)
      ?? events().find(event => event.ts >= mark.ts))
  }
  const older = () => { if (pages.oldest() > 0 && !pages.loading() && !pages.problem()) void pages.loadOlder() }
  const range = (first: number, last: number) => {
    const start = events()[first], end = events()[last]
    if (start && end) setVisible([start.ts, end.ts])
  }
  const openSource = (event: PlacedEvent) => openAgent(props, props.entry.id, 'evidence', { flowRef: event.step_key ?
    { field: 'step_key', id: event.step_key } : { field: 'turn_id', id: event.turn_id! } })
  const status = () => props.agent()?.ended_at != null ? ['ended', 'Session ended']
    : read.streaming() ? ['live', 'Live'] : ['paused', filtered() ? 'Filtered, not live' : 'Not live']

  const id = createUniqueId()
  const choices = (name: 'tool_name' | 'flow_agent' | 'skill_name', label: string, list?: readonly string[]) =>
    <label class={styles.field}>{label}
      <input class={styles.input} list={`${id}-${name}`} value={draft()[name]} onInput={event => update(name, event.currentTarget.value)} />
      <datalist id={`${id}-${name}`}><For each={list}>{value => <option value={value} />}</For></datalist>
    </label>

  return <div class={styles.flow}>
    <header class={styles.header}>
      <div class={styles.title}>
        <h3>Session flow</h3>
        <Show when={read()?.data}>
          <span class={styles.live} data-state={status()[0]}>{status()[1]}</span>
        </Show>
      </div>
      <Show when={read()?.data}>{data =>
        <dl class={styles.figures}>
          <div><dt>{filtered() ? 'Matching events' : 'Events'}</dt><dd>{fmtN(pages.matched())}</dd></div>
          <Show when={filtered()}><div><dt>All events</dt><dd>{fmtN(data().scope?.total)}</dd></div></Show>
          <div><dt>Turns</dt><dd>{fmtN(data().summary?.total_turns)}</dd></div>
          <div><dt>Tokens</dt><dd>{fmtN(data().summary?.cumulative_tokens ?? data().summary?.total_tokens)}</dd></div>
          <div><dt>Tool uses</dt><dd>{fmtN(data().summary?.total_tool_uses)}</dd></div>
          <div><dt>Failures</dt><dd data-tone={data().summary?.errors ? 'danger' : undefined}>{fmtN(data().summary?.errors)}</dd></div>
          <Show when={data().summary?.ttft_ms != null}><div><dt>First token</dt><dd>{fmtMs(data().summary.ttft_ms!)}</dd></div></Show>
        </dl>
      }</Show>
      <div class={styles.actions}>
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

    <Show when={usedEvidence()}>
      <div hidden={!evidence()}><Loading fallback={<PanelState state="loading" />}><SourceSteps {...props} /></Loading></div>
    </Show>

    <div class={styles.flow} hidden={evidence()}>
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
          <Show when={filtered()}>
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

      <Resource read={read}>{() => <>
        <Show when={marks().length > 1}>
          <TurnScrubber marks={marks()} loadedFrom={pages.oldest()} visible={visible()} hover={hover} pick={mark => void pick(mark)} />
        </Show>
        <div class={styles.toolbar}>
          <Segmented label="Flow diagram" value={mode()} onChange={setMode} options={[
            { id: 'timeline', label: 'Timeline', glyph: 'events' }, { id: 'swimlane', label: 'Swim-lane', glyph: 'flow' }]} />
          <Show when={mode() === 'swimlane'}>
            <Segmented label="Session streams" value={lanes()} onChange={setLanes} options={[
              { id: 'individual', label: 'Individual lanes' }, { id: 'grouped', label: 'Grouped lanes' }]} />
          </Show>
          <span class={styles.count} aria-live="polite">Showing {fmtN(Math.max(0, pages.matched() - pages.oldest()))} of {fmtN(pages.matched())} events</span>
          <div class={styles.paging}>
            <Show when={pages.oldest() > 0}>
              <button type="button" class={styles.button} disabled={pages.loading()} onClick={() => void pages.loadOlder()}>
                <Icon glyph="up" small />{`Load older events (${fmtN(pages.oldest())} not loaded)`}</button>
              <button type="button" class={styles.button} disabled={pages.loading()} onClick={() => void pages.loadOlder(0)}>Load all events</button>
            </Show>
            <Tooltip label="Jump to newest" text="Scroll to the newest event" class={styles.iconButton}
              disabled={!events().length} onClick={() => {
                const last = events().at(-1)
                if (last) setReveal({ id: eventIdentity(last) })
              }}><Icon glyph="last" small /></Tooltip>
          </div>
        </div>
        <Show when={pages.loading()}><p class={styles.notice} role="status"><Icon glyph="refresh" small />Loading older events…</p></Show>
        <Show when={pages.problem()}><p class={styles.problem} role="alert">Could not load older events: {pages.problem()}</p></Show>
        <Show when={missing()}><p class={styles.notice} role="status">No event matches this reference.</p></Show>
        <div class={styles.body} data-inspecting={picked() ? 'true' : 'false'}>
          <Show when={mode() === 'swimlane' && events().length} fallback={
            <EventList events={events()} selected={selected()} select={select} hover={hover} reveal={reveal()}
              onStart={older} onRange={range} empty={filtered() ? 'No events match these filters.' : 'No events reported for this session.'} />
          }>
            <SwimLanes events={events()} grouped={lanes() === 'grouped'} selected={selected()} select={select} hover={hover}
              reveal={reveal()} onStart={older} onRange={range} />
          </Show>
          <Show when={picked()}>{event =>
            <Inspector event={event()} close={() => select(undefined)}
              evidence={event().step_key || event().turn_id ? () => openSource(event()) : undefined} />
          }</Show>
        </div>
      </>}</Resource>
    </div>
    <HoverCard hover={hover} />
  </div>
}
