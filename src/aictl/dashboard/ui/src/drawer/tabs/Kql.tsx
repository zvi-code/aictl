import { createEffect, createMemo, createSignal, createUniqueId, For, Show, untrack } from 'solid-js'
import type { DetailAgentFlow, DetailKqlTemplates } from '../../data/contract.gen'
import { PanelState } from '../../ui/PanelState'
import { agentPath, Resource, Section, Stats, type TabProps } from '../shared'
import { kustoLink, lastFlowFilters } from '../kqlLink'
import { watchedDetail } from '../liveAgent'
import styles from '../drawer.module.css'

const route = '/api/board/agent/kql'
type Catalog = Extract<DetailKqlTemplates, { presets: unknown }>
type Preset = Catalog['presets'][number]
type Inputs = { session: string; reporting_node: string; model: string; tool: string; keyword: string; since: string; until: string }

function Complete(props: {
  label: string; value: string; suggestions: readonly string[]; editor?: boolean
  change: (value: string) => void; input?: (node: HTMLTextAreaElement) => void
}) {
  const id = createUniqueId()
  const [caret, setCaret] = createSignal<{ start: number; end: number; prefix: string }>()
  const [active, activate] = createSignal(-1)
  let node: HTMLInputElement | HTMLTextAreaElement
  const candidates = createMemo(() => {
    const position = caret()
    return position ? props.suggestions.filter(value => value.toLowerCase().startsWith(position.prefix.toLowerCase())).slice(0, 10) : []
  })
  const suggest = (force = false) => {
    const position = node.selectionStart ?? node.value.length
    if (!props.editor) setCaret({ start: 0, end: node.value.length, prefix: node.value })
    else {
      const prefix = node.value.slice(0, position).match(/[a-z_]\w*$/i)?.[0] ?? ''
      const suffix = node.value.slice(position).match(/^\w+/)?.[0] ?? ''
      setCaret(force || prefix ? { start: position - prefix.length, end: position + suffix.length, prefix } : undefined)
    }
    activate(-1)
  }
  const close = () => { setCaret(undefined); activate(-1) }
  const select = (value: string) => {
    const position = caret()
    if (!position) return
    const next = node.value.slice(0, position.start) + value + node.value.slice(position.end)
    props.change(next); node.value = next
    node.focus(); node.setSelectionRange(position.start + value.length, position.start + value.length)
    close()
  }
  const key = (event: KeyboardEvent) => {
    if (props.editor && event.ctrlKey && (event.code === 'Space' || event.key === ' ')) {
      event.preventDefault(); suggest(true); return
    }
    if (event.key === 'Tab') { close(); return }
    if (!candidates().length) {
      if (!props.editor && event.key === 'ArrowDown') { event.preventDefault(); suggest(true); activate(0) }
      return
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const count = candidates().length, delta = event.key === 'ArrowDown' ? 1 : -1
      activate(index => index < 0 && delta < 0 ? count - 1 : (index + delta + count) % count)
    } else if (event.key === 'Enter' && active() >= 0) { event.preventDefault(); select(candidates()[active()]) }
  }
  return <div class={styles.stack}>
    <label class={styles.field} for={id}>{props.label}</label>
    <Show when={props.editor} fallback={<input id={id} ref={element => { node = element }} value={props.value}
      onInput={event => { props.change(event.currentTarget.value); suggest() }} onKeyDown={key} onBlur={close}
      role="combobox" autocomplete="off" aria-autocomplete="list" aria-expanded={candidates().length ? 'true' : 'false'}
      aria-controls={candidates().length ? `${id}-choices` : undefined}
      aria-activedescendant={active() >= 0 ? `${id}-${active()}` : undefined} />}>
      <textarea class={styles.code} id={id} spellcheck={false} ref={element => { node = element; props.input?.(element) }}
        value={props.value} onInput={event => { props.change(event.currentTarget.value); suggest() }}
        onKeyDown={key} onBlur={close} aria-autocomplete="list" aria-controls={candidates().length ? `${id}-choices` : undefined}
        aria-activedescendant={active() >= 0 ? `${id}-${active()}` : undefined} />
    </Show>
    <Show when={candidates().length}>
      <ul class={styles.suggestions} id={`${id}-choices`} role="listbox" aria-label={`${props.label} suggestions`}>
        <For each={candidates()}>{(value, index) => <li id={`${id}-${index()}`} role="option" aria-selected={active() === index() ? 'true' : 'false'}
          onPointerDown={event => event.preventDefault()} onClick={() => select(value)}>{value}</li>}</For>
      </ul>
    </Show>
  </div>
}

function Builder(props: { tab: TabProps; flow?: DetailAgentFlow; catalog: Catalog }) {
  const ctx = untrack(() => props.tab.shell.ctx)
  const applied = untrack(() => lastFlowFilters(ctx, props.tab.entry.id))
  const [example, choose] = createSignal('steps')
  const [input, setInput] = createSignal<Inputs>(untrack(() => ({
    session: props.flow?.session_id ?? props.tab.session() ?? '',
    reporting_node: props.flow?.node_id ?? ctx.nodeId() ?? props.tab.agent()?.node_id ?? '',
    model: '', tool: '', keyword: '',
    since: String(applied?.since ?? ''), until: String(applied?.until ?? ''),
  })))
  const [request, setRequest] = createSignal<string>()
  const [consent, setConsent] = createSignal<string>()
  const [draft, setDraft] = createSignal('')
  const [notice, setNotice] = createSignal('')
  let editor!: HTMLTextAreaElement
  const selected = () => props.catalog.presets.find(item => item.id === example())
  const windowKey = (values: Inputs) => JSON.stringify([values.reporting_node, values.since, values.until])
  const authorized = () => consent() === windowKey(input())
  const read = ctx.detail<DetailKqlTemplates>(createMemo(request))
  const generated = () => {
    const value = read()?.data
    return value && 'query' in value ? value.query : undefined
  }
  createEffect(generated, value => { if (value != null) setDraft(value) })
  const choices = createMemo(() => [...new Set([...props.catalog.tables, ...props.catalog.fields, ...props.catalog.operators])])
  const sessions = createMemo(() => [...new Set([props.flow?.session_id, props.tab.session(),
    ...(ctx.board('agents') ?? []).map(row => row.native_session_id)].filter((value): value is string => !!value))])
  const update = (key: keyof Inputs, value: string) => {
    const previous = input()
    const next = { ...previous, [key]: value }
    setInput(next)
    if (selected()?.all_sessions && windowKey(previous) !== windowKey(next)) {
      setRequest(undefined); setDraft(''); setConsent(undefined)
    }
    setNotice('')
  }
  const allowed = (preset?: Preset, current = input(), consented = authorized()) => preset &&
    (preset.fleet || (!!current.reporting_node.trim() && (preset.all_sessions ? consented : !!current.session.trim())))
  const generate = (preset = selected(), current = input(), consented = authorized()) => {
    if (!preset || !allowed(preset, current, consented)) return
    const values = new URLSearchParams({ preset: preset.id, ...current })
    if (!preset.model) values.delete('model')
    if (!preset.tool) values.delete('tool')
    if (!preset.keyword) values.delete('keyword')
    if (preset.all_sessions) values.set('include_all_sessions', '1')
    const next = `${route}?${values}`
    if (next !== request()) { setNotice(''); setRequest(next) }
  }
  const pick = (id: string, current = input()) => {
    const changed = id !== example()
    if (changed) {
      setConsent(undefined); setRequest(undefined); setDraft(''); setNotice('')
    }
    choose(id)
    generate(props.catalog.presets.find(preset => preset.id === id), current, !changed && consent() === windowKey(current))
  }
  const browserLink = () => read()?.status === 'ready' || !request() ? kustoLink(props.flow?.session_kql_url, draft()) : undefined
  const copy = async () => {
    try { await navigator.clipboard.writeText(draft()); setNotice('Query copied.') }
    catch { editor.focus(); editor.select(); setNotice('Query selected. Use your device’s Copy command.') }
  }
  const sync = () => {
    if (!applied) return
    const current = { ...input(), tool: String(applied.tool_name ?? ''), keyword: String(applied.q ?? ''),
      since: String(applied.since ?? ''), until: String(applied.until ?? '') }
    setInput(current)
    if (selected()?.all_sessions && consent() !== windowKey(current)) { setConsent(undefined); setRequest(undefined); setDraft('') }
    pick(applied.failed ? 'failures' : applied.category === 'prompts' ? 'prompts' :
      applied.category === 'models' ? 'requests' : applied.category === 'agents' ? 'subagents' :
      applied.tool_name || applied.category === 'tools' ? 'tools' : example(), current)
  }
  createEffect(() => props.flow?.node_id ?? props.tab.agent()?.node_id, (node, previous) => {
    if (!previous) {
      const current = input()
      const initial = { ...current, reporting_node: current.reporting_node || node || '' }
      if (initial.reporting_node !== current.reporting_node) setInput(initial)
      generate(selected(), initial)
    }
  })
  return <>
    <Section title="Query in Kusto">
      <Stats items={[{ label: 'Presets', value: props.catalog.presets.length },
        { label: 'Tables', value: props.catalog.tables.length }, { label: 'Fields', value: props.catalog.fields.length }]} />
      <div class={styles.bar}><For each={props.catalog.presets}>{preset =>
        <button type="button" class={styles.button} aria-pressed={preset.id === example() ? 'true' : 'false'} onClick={() => pick(preset.id)}>{preset.label}</button>
      }</For></div>
      <form class={styles.stack} onSubmit={event => { event.preventDefault(); generate() }}>
        <div class={styles.bar}>
          <label class={styles.field}>Example<select value={example()} onChange={event => pick(event.currentTarget.value)}>
            <For each={props.catalog.presets}>{preset => <option value={preset.id}>{preset.title}</option>}</For>
          </select></label>
          <Show when={!selected()?.fleet}>
            <Show when={!selected()?.all_sessions}><Complete label="Session ID" value={input().session} suggestions={sessions()}
              change={value => update('session', value)} /></Show>
            <label class={styles.field}>Reporting node<input value={input().reporting_node} onInput={event => update('reporting_node', event.currentTarget.value)} /></label>
          </Show>
          <Show when={selected()?.model}><Complete label="Model" value={input().model} suggestions={props.flow?.scope?.models ?? []} change={value => update('model', value)} /></Show>
          <Show when={selected()?.tool}><Complete label="Tool name" value={input().tool} suggestions={props.flow?.scope?.tools ?? []} change={value => update('tool', value)} /></Show>
          <Show when={selected()?.keyword}><label class={styles.field}>Words to find<input value={input().keyword} onInput={event => update('keyword', event.currentTarget.value)} /></label></Show>
        </div>
        <div class={styles.bar}>
          <label class={styles.field}>Since (Unix seconds)<input type="number" step="any" min={0} value={input().since} onInput={event => update('since', event.currentTarget.value)} /></label>
          <label class={styles.field}>Until (Unix seconds)<input type="number" step="any" min={0} value={input().until} onInput={event => update('until', event.currentTarget.value)} /></label>
          <Show when={selected()?.all_sessions}><label><input type="checkbox" checked={authorized()} onChange={event => {
            const current = input()
            setConsent(event.currentTarget.checked ? windowKey(current) : undefined)
            if (event.currentTarget.checked) generate(selected(), current, true)
            else { setRequest(undefined); setDraft('') }
          }} /> Include all sessions for this node and window</label></Show>
          <button type="submit" class={styles.button} disabled={!allowed(selected())}>Generate query</button>
          <Show when={applied}><button type="button" class={styles.button} onClick={sync}>Use applied Flow filters</button></Show>
        </div>
      </form>
      <p class={styles.muted}>{selected()?.description}</p>
    </Section>
    <Section title="KQL editor">
      <Show when={request() && (!read() || read()?.status === 'loading')}>
        <PanelState state="loading" message="Generating KQL…" />
      </Show>
      <Show when={read()?.status === 'error'}><PanelState state="error" message={String(read()?.error)} onRetry={read.retry} /></Show>
      <Complete label="KQL query" value={draft()} suggestions={choices()} editor change={setDraft} input={node => { editor = node }} />
      <div class={styles.bar}>
        <Show when={browserLink()}>{href => <a class={styles.button} href={href()} target="_blank" rel="noopener noreferrer">Open in Kusto</a>}</Show>
        <button type="button" class={styles.button} disabled={!draft().trim()} onClick={() => void copy()}>Copy query</button>
        <Show when={generated() != null && generated() !== draft()}><button type="button" class={styles.button} onClick={() => setDraft(generated() ?? '')}>Restore example</button></Show>
        <span role="status">{notice()}</span>
      </div>
      <p class={styles.muted}>Press Ctrl+Space for suggestions. Opening the link does not run the query.</p>
    </Section>
  </>
}

export default function Kql(props: TabProps) {
  const ctx = untrack(() => props.shell.ctx)
  const meta = ctx.detail<Catalog>(() => route)
  const flow = watchedDetail(ctx, 'flow', createMemo(() => props.entry.id), createMemo(() => agentPath(props, '/flow')), () => true)
  return <Resource read={meta}>{catalog =>
    <Show when={!flow() || flow()?.status !== 'loading'} fallback={<PanelState state="loading" message="Reading session scope…" />}>
      <Builder tab={props} catalog={catalog()} flow={flow()?.data} />
    </Show>
  }</Resource>
}
