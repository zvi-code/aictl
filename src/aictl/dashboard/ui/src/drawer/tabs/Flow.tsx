import { createEffect, createMemo, createSignal, createUniqueId, For, lazy, Loading, Show, untrack } from 'solid-js'
import { fmtMs, stamp } from '../../design/format'
import { CodeView } from '../../ui/CodeView'
import { PanelState } from '../../ui/PanelState'
import { Segmented } from '../../ui/Segmented'
import { describe, eventIdentity, flowBounds, flowModel, inputOf, outputOf, skillPhase } from '../flowModel'
import { agentPath, clip, labelOf, openAgent, Resource, Rows, Section, Series, Stats, type TabProps } from '../shared'
import { kustoLink, saveFlowFilters } from '../kqlLink'
import { watchedDetail } from '../liveAgent'
import { SwimLanes } from '../SwimLanes'
import styles from '../drawer.module.css'

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

export default function Flow(props: TabProps) {
  const initial = () => props.entry.initialPrompts ? 'prompts' : props.entry.initialSkills ? 'skills' : ''
  const [draft, setDraft] = createSignal<Filter>({ ...empty, category: initial() })
  const [applied, setApplied] = createSignal<Applied>({ category: initial() })
  const [limit, setLimit] = createSignal(500)
  const [problem, setProblem] = createSignal('')
  const [selected, select] = createSignal<string>()
  const [turn, setTurn] = createSignal(0)
  const [mode, setMode] = pref('aictl-pref-flow-mode', 'timeline')
  const [lanes, setLanes] = pref('aictl-pref-flow-lanes', 'individual')
  const [wholeEnd, rememberEnd] = createSignal<number>()
  const [evidence, setEvidence] = createSignal(false)
  const [usedEvidence, useEvidence] = createSignal(false)
  const read = watchedDetail(untrack(() => props.shell.ctx), 'flow', createMemo(() => props.entry.id),
    createMemo(() => agentPath(props, '/flow', { limit: limit(), ...applied() })),
    createMemo(() => limit() === 500 && !Object.values(applied() ?? {}).some(Boolean)))
  const scope = () => read()?.data?.scope
  const model = createMemo(() => {
    const data = read()?.data
    return flowModel(data?.turns ?? [], data?.summary)
  })
  const events = createMemo(() => {
    const reference = props.entry.flowRef
    return model().events.filter(event => (!turn() || event._turnIndex === turn()) &&
      (!reference || event[reference.field] === reference.id && (!reference.traceId || event.trace_id === reference.traceId)))
  })
  const bound = () => wholeEnd() ?? props.agent()?.ended_at
  createEffect(() => ({ scope: scope(), applied: applied() }), current => {
    if (current.scope?.end != null && current.applied?.since == null && current.applied?.until == null &&
        current.applied?.category !== 'skills') rememberEnd(current.scope.end)
  })
  const update = <K extends keyof Filter>(key: K, value: Filter[K]) => {
    setDraft(old => ({ ...old, [key]: value })); setProblem('')
  }
  const apply = (value: Applied) => { setApplied(value); setLimit(500); setTurn(0); select(undefined); setProblem('') }
  const preset = (name: string) => {
    const category = name === applied()?.category || name === 'failed' ? '' : name
    const failed = name === 'failed' && applied()?.failed !== '1'
    setDraft({ ...empty, category, failed }); apply({ category, failed: failed ? '1' : undefined })
  }
  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    const value = draft()
    const { error, ...times } = flowBounds(value.range, bound(), value.start, value.end)
    if (error) { setProblem(error); return }
    const skills = value.category === 'skills'
    apply({ ...times, q: value.q.trim(), category: value.category, flow_agent: value.flow_agent.trim(),
      tool_name: skills ? undefined : value.tool_name.trim(), skill_name: skills ? value.skill_name.trim() : undefined,
      skill_phase: skills ? value.skill_phase : undefined, failed: !skills && value.failed ? '1' : undefined })
  }
  const id = createUniqueId()
  const choices = (name: 'tool_name' | 'flow_agent' | 'skill_name', label: string, list?: readonly string[]) =>
    <label class={styles.field}>{label}
      <input list={`${id}-${name}`} value={draft()[name]} onInput={event => update(name, event.currentTarget.value)} />
      <datalist id={`${id}-${name}`}><For each={list}>{value => <option value={value} />}</For></datalist>
    </label>
  return <>
    <div class={styles.bar}>
      <button type="button" class={styles.button} aria-pressed={evidence() ? 'true' : 'false'}
        onClick={() => { useEvidence(true); setEvidence(value => !value) }}>{evidence() ? 'Show Flow' : 'Source steps'}</button>
    </div>
    <Show when={usedEvidence()}>
      <div hidden={!evidence()}><Loading fallback={<PanelState state="loading" />}><SourceSteps {...props} /></Loading></div>
    </Show>
    <div class={styles.stack} hidden={evidence()}>
    <Resource read={read}>{data => {
      return <>
        <Section title="Session flow">
          <Stats items={[
            { label: 'Shown', value: events().length }, { label: 'Matched', value: data().scope?.matched },
            { label: 'All events', value: data().scope?.total }, { label: 'Turns', value: data().summary?.total_turns },
            { label: 'Tokens', value: data().summary?.cumulative_tokens }, { label: 'Largest turn', value: data().summary?.largest_turn_tokens, unit: 'tokens' },
            { label: 'First token', value: data().summary?.ttft_ms == null ? undefined : fmtMs(data().summary.ttft_ms) },
          ]} />
          <Show when={events().some(event => event.cum_tokens != null)}>
            <Series label="Cumulative tokens" time x={events().map(event => event.ts)} values={events().map(event => event.cum_tokens)} />
          </Show>
          <div class={styles.bar}>
            <Show when={kustoLink(data().session_kql_url)}>{href => <a class={styles.button} href={href()} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>}</Show>
            <button type="button" class={styles.button} onClick={() => {
              saveFlowFilters(props.shell.ctx, props.entry.id, applied()); props.shell.changeTab('kql')
            }}>Query in Kusto</button>
          </div>
        </Section>
      </>
    }}</Resource>
    <Section title="Filters">
      <form class={styles.stack} role="search" aria-label="Flow filters" onSubmit={submit}>
        <div class={styles.bar}><For each={quick}>{([value, label]) =>
          <button type="button" class={styles.button} aria-pressed={(value === 'failed' ? applied()?.failed === '1' : (applied()?.category ?? '') === value && !applied()?.failed) ? 'true' : 'false'}
            onClick={() => preset(value)}>{label}</button>
        }</For></div>
        <div class={styles.bar}>
          <label class={styles.field}>{draft().category === 'prompts' ? 'Search prompt text' : 'Search events'}
            <input type="search" maxlength={160} value={draft().q} onInput={event => update('q', event.currentTarget.value)} />
          </label>
          <label class={styles.field}>Category <select value={draft().category} onChange={event => update('category', event.currentTarget.value)}>
            <option value="">All categories</option><For each={categories}>{value => <option value={value}>{value === 'prompts' ? 'User prompts only' : labelOf(value)}</option>}</For>
          </select></label>
          <Show when={draft().category === 'skills'} fallback={choices('tool_name', 'Tool name', scope()?.tools)}>
            {choices('skill_name', 'Skill name', scope()?.skills)}
            <label class={styles.field}>Skill evidence <select value={draft().skill_phase} onChange={event => update('skill_phase', event.currentTarget.value)}>
              <option value="">All evidence</option><For each={['loaded', 'invoked', 'reported', 'resolved']}>{value => <option value={value}>{skillPhase(value)}</option>}</For>
            </select></label>
          </Show>
          {choices('flow_agent', 'Agent ID', scope()?.agents)}
          <label class={styles.field}>Time range <select value={draft().range} onChange={event => update('range', event.currentTarget.value)}>
            <option value="whole">Whole session</option><option value="900" disabled={bound() == null}>Last 15 min of session</option>
            <option value="3600" disabled={bound() == null}>Last hour of session</option><option value="custom">Custom range</option>
          </select></label>
          <Show when={draft().range === 'custom'}>
            <label class={styles.field}>From (local)<input type="datetime-local" value={draft().start} onInput={event => update('start', event.currentTarget.value)} /></label>
            <label class={styles.field}>To (local)<input type="datetime-local" value={draft().end} onInput={event => update('end', event.currentTarget.value)} /></label>
          </Show>
        </div>
        <div class={styles.bar}>
          <Show when={draft().category !== 'skills'}><label><input type="checkbox" checked={draft().failed} onChange={event => update('failed', event.currentTarget.checked)} />Failures only</label></Show>
          <button type="submit" class={styles.button}>Apply filters</button>
          <button type="button" class={styles.button} onClick={() => { setDraft(empty); apply({}) }}>Reset filters</button>
        </div>
        <Show when={problem()}><div role="alert">{problem()}</div></Show>
      </form>
    </Section>
    <Show when={read()?.data}>{data => {
      const picked = () => events().find(event => eventIdentity(event) === selected()) ?? (props.entry.flowRef ? events()[0] : undefined)
      const rows = createMemo(() => events().map(event => ({
        ...event, identity: eventIdentity(event), label: clip(describe(event), 150),
      })))
      return <Section title="Events">
        <div class={styles.bar}>
          <Segmented label="Flow diagram" options={[{ id: 'timeline', label: 'Timeline' }, { id: 'swimlane', label: 'Swim-lane' }]} value={mode()} onChange={setMode} />
          <Show when={mode() === 'swimlane'}>
            <Segmented label="Session streams" options={[{ id: 'individual', label: 'Individual lanes' }, { id: 'grouped', label: 'Grouped lanes' }]} value={lanes()} onChange={setLanes} />
          </Show>
          <Show when={model().turnGroups.length}>
            <label class={styles.field}>Turn
              <select value={turn()} onChange={event => { setTurn(Number(event.currentTarget.value)); select(undefined) }}>
                <option value={0}>All turns</option><For each={model().turnGroups}>{index => <option value={index}>Turn {index}</option>}</For>
              </select>
            </label>
          </Show>
        </div>
        <Show when={mode() === 'swimlane' && events().length} fallback={
          <Rows label="Flow timeline" rows={rows()} identity={['identity']}
            columns={[[ 'ts', 'Time', 'time' ], ['label', 'Event'], ['rt_tokens', 'Turn tokens', 'number'], 'source']}
            empty={props.entry.flowRef ? 'No event matches this reference.' : 'No events match these filters.'}
            action={{ label: row => `Inspect ${row.label}`, run: row => select(row.identity) }} />
        }>
          <SwimLanes events={events()} grouped={lanes() === 'grouped'} selected={selected()} select={select} />
        </Show>
        <Show when={picked()}>{event =>
          <Section title="Event inspector">
            <p>{describe(event())} · {stamp(event().ts, true)} · {event().source}</p>
            <Show when={inputOf(event())}>{value => <CodeView label="Event input" text={value()} wrap />}</Show>
            <Show when={outputOf(event())}>{value => <CodeView label="Event output" text={value()} wrap />}</Show>
            <Show when={event().step_key || event().turn_id}><button class={styles.button} type="button" onClick={() =>
              openAgent(props, props.entry.id, 'evidence', { flowRef: event().step_key ?
                { field: 'step_key', id: event().step_key! } : { field: 'turn_id', id: event().turn_id! } })}>Open source evidence</button></Show>
          </Section>
        }</Show>
        <Show when={(data().summary?.omitted_events ?? 0) > 0}>
          <button type="button" class={styles.button} disabled={limit() >= 5000}
            onClick={() => setLimit(value => Math.min(5000, value + 1000))}>Load older events ({data().summary.omitted_events} omitted)</button>
        </Show>
      </Section>
    }}</Show>
    </div>
  </>
}
