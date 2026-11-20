import { createEffect, createMemo, createSignal, For, lazy, Loading, onCleanup, Show, Switch, Match, untrack } from 'solid-js'
import { render } from '@solidjs/web'
import { boardLiveRequest, clearedFilters, filtersToParams, parseFilters, RANGES, readScreen, type Screen } from '../data/filters'
import type { LiveClient } from '../data/live'
import { agentLinkOf, boardNodeScope, CLEAR_SETTINGS_PARAMS, loadToolFilter, mergeSearch, redirectOf, toolsToParams, type UrlPatch } from '../data/urlState'
import { agentView, selectAgentWatch, supportsLiveAgent } from '../drawer/liveAgent'
import { drawerStack } from '../drawer/navigation'
import { at, json, panelData, statuses, topic } from '../panels/data'
import { sections } from '../panels/layout'
import type { Command, NodeScope, PanelContext } from '../panels/types'
import { AppShell } from '../ui/AppShell'
import { Dialog } from '../ui/Dialog'
import { Freshness, PanelState } from '../ui/PanelState'
import { Popover } from '../ui/Popover'
import { BoardControls } from './BoardControls'
import type { DrawerEntry } from './drawerTypes'
import { NodePicker, scopeLabel } from './NodePicker'
import { Palette, type PaletteCommand } from './Palette'
import { clearDrawer, drawerPatch, nextAddress, readDrawer, remember, stored, typing } from './viewState'
import '../design/tokens.css'
import styles from './Shell.module.css'

const Overview = lazy(() => import('./Overview'))
const Health = lazy(() => import('./Health'))
const Settings = lazy(() => import('./Settings'))
const Drawer = lazy(() => import('../drawer/DrawerView'))
const screenNames = { board: 'Overview', health: 'Health', settings: 'Settings' }
const posted = (value: object): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
})

type Theme = 'light' | 'dark'
type Density = 'compact' | 'comfortable'
type Decision = { title: string; lead: string; command: string; label: string; apply(): Promise<string> }

function Shell(props: { client: LiveClient; startedAt: number }) {
  const { client, startedAt } = untrack(() => props)
  const [address, setAddress] = createSignal(location.pathname + location.search + location.hash)
  const query = createMemo(() => new URL(address(), location.origin))
  const search = createMemo(() => query().search)
  const screen = createMemo(() => readScreen(search()))
  const scope = createMemo(() => boardNodeScope(search()))
  const nodeId = createMemo(() => scope() === 'node' ? query().searchParams.get('node_id')?.trim().toLowerCase() || null : null)
  const filters = createMemo(() => parseFilters(search()))
  const tools = createMemo(() => loadToolFilter(search()))
  const [findText, setFindText] = createSignal(filters().q)
  const [paused, setPaused] = createSignal(false)
  const [revision, bump] = createSignal(0)
  const [theme, setTheme] = createSignal<Theme>(stored('aictl-theme', ['light', 'dark'], 'light'))
  const [density, setDensity] = createSignal<Density>(stored('aictl-shell-density', ['compact', 'comfortable'], 'compact'))
  const [rail, setRail] = createSignal(stored('aictl-shell-rail', ['open', 'closed'], 'closed') === 'open')
  const [order, setOrder] = createSignal(sections.board.map(section => section.id))
  const [palette, setPalette] = createSignal(false)
  const [shortcuts, setShortcuts] = createSignal(false)
  const [custom, setCustom] = createSignal(false)
  const [decision, setDecision] = createSignal<Decision>()
  const [pending, setPending] = createSignal(false)
  const [notice, noticeOf] = createSignal<{ text: string; undo?: () => void }>()
  const [stopped, setStopped] = createSignal<ReadonlySet<string>>(new Set())
  const [stack, setStack] = createSignal(drawerStack(search(), history.state))
  createEffect(() => {
    const entry = stack().at(-1)
    if (scope() !== 'local' || entry?.type !== 'agent' || !supportsLiveAgent(client)) return ''
    return `${agentView(entry.tab)}:${entry.id}`
  }, key => {
    const entry = untrack(stack).at(-1)
    if (key && entry?.type === 'agent') selectAgentWatch(client, entry.id, entry.tab)
    else selectAgentWatch(client)
  })
  let landOnFlow = !location.search && !location.hash
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let findTimer: ReturnType<typeof setTimeout> | undefined
  let find: HTMLInputElement | undefined
  let drawerReturn: HTMLElement | undefined

  const go = (target: string, replace = false, boardDrawers?: readonly DrawerEntry[]) => {
    const same = target === location.pathname + location.search + location.hash
    if (!same || boardDrawers) {
      try {
        const state = replace ? history.state : null
        history[replace ? 'replaceState' : 'pushState'](boardDrawers ? { ...state, boardDrawers } : state, '', target)
      }
      catch { /* Continue with local navigation when history is disabled. */ }
    }
    setAddress(target)
  }
  const navigate = (patch: UrlPatch) => go(nextAddress(patch))
  const scroll = (id: string, focus = false) => {
    const element = document.getElementById(`sec-${id}`)
    element?.scrollIntoView({ block: 'start' })
    if (focus) element?.focus({ preventScroll: true })
  }
  const changeScreen = (next: Screen) => {
    landOnFlow = false
    setStack([])
    setOrder(sections.board.map(section => section.id))
    const patch = { ...CLEAR_SETTINGS_PARAMS, ...clearDrawer, screen: next === 'board' ? null : next,
      scope: scope() === 'local' ? null : scope() }
    go(location.pathname + mergeSearch(location.search, patch))
    window.scrollTo(0, 0)
  }
  const jump = (id: string) => {
    if (screen() !== 'board' && id !== 'health') changeScreen('board')
    go(location.pathname + location.search + '#sec-' + id)
    scroll(id, true)
  }
  const onNotice = (text: string, undo?: () => void) => {
    clearTimeout(noticeTimer)
    noticeOf({ text, undo })
    noticeTimer = setTimeout(() => noticeOf(undefined), undo ? 8000 : 5000)
  }
  const refresh = () => {
    if (scope() === 'local') client.resync()
    bump(i => i + 1)
  }
  const open = (entry: DrawerEntry, resetStack = false) => {
    landOnFlow = false
    if (!stack().length) drawerReturn = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const next = resetStack ? [entry] : [...stack(), entry]
    setStack(next)
    go(nextAddress(drawerPatch(entry)), false, next)
  }
  const close = () => {
    landOnFlow = false
    setStack([])
    go(nextAddress(clearDrawer), true, [])
    drawerReturn?.focus()
  }
  const back = () => {
    if (stack().length < 2) { close(); return }
    const next = stack().slice(0, -1)
    setStack(next)
    go(nextAddress(drawerPatch(next.at(-1))), true, next)
  }
  const copy = (text: string) => {
    const task = navigator.clipboard?.writeText(text)
    if (!task) { onNotice('Clipboard is not available.'); return }
    void task.then(() => onNotice('Copied to the clipboard.'), () => onNotice('Could not copy to the clipboard.'))
  }
  const runCommand = (command: Command) => {
    if (scope() !== 'local' || pending()) return
    setDecision({
      ...command, label: command.applyLabel ?? 'Run this command',
      async apply() {
        await json('/api/board/action', posted({ action: command.action, args: command.args ?? {}, confirm: true }))
        return command.done
      },
    })
  }
  const context = {
    client, scope, nodeId, filters, tools, paused, startedAt, revision, navigate, jump, openDetail: open, refresh, copy, runCommand,
    openAgent(id: string, tab = 'flow') { if (id) open({ type: 'agent', id, tab }, true) },
    select(window: { since: number; until: number } | null) {
      navigate({ sel: window ? `${Math.floor(window.since)}-${Math.floor(window.until)}` : null })
    },
    stopped: (id: string) => stopped().has(id),
    stopAgent(agent: Parameters<PanelContext['stopAgent']>[0]) {
      if (scope() !== 'local' || agent.parent_id || agent.role === 'subagent' || pending()) return
      setDecision({
        title: 'Stop this agent?', lead: `Stop ${agent.title}? Its files are not changed. You can resume the session in its tool.`,
        command: `aictl session kill ${agent.id}`, label: 'Stop agent',
        async apply() {
          const result = await json<{ signaled?: unknown[]; failed?: unknown[] }>('/api/session-kill',
            posted({ session_id: agent.id, confirm: true, signal: 'TERM' }))
          const succeeded = result.signaled?.length ?? 0, failed = result.failed?.length ?? 0
          if (succeeded && !failed) setStopped(old => new Set([...old, agent.id]))
          return `Stopped ${succeeded} ${succeeded === 1 ? 'process' : 'processes'} for ${agent.title}${failed ? `; ${failed} could not be stopped` : ''}.`
        },
      })
    },
  } satisfies Omit<PanelContext, 'board' | 'read' | 'metadata' | 'detail'>
  const ctx: PanelContext = { ...context, ...untrack(() => panelData(context, screen)) }
  const cancel = () => { if (!pending()) setDecision(undefined) }
  const apply = async () => {
    const action = decision()
    if (!action || pending() || scope() !== 'local') return
    setPending(true)
    try { onNotice(await action.apply()); refresh() }
    catch (error) { onNotice(`Could not apply this action: ${error instanceof Error ? error.message : String(error)}`) }
    finally { setPending(false); setDecision(undefined) }
  }
  const selectScope = (next: NodeScope, id?: string) => {
    if (pending() || (scope() === next && (next !== 'node' || nodeId() === id))) return
    landOnFlow = false
    setDecision(undefined)
    setStack([])
    navigate({ ...clearDrawer, scope: next === 'local' ? null : next, node_id: next === 'node' ? id : null,
      row: null, cell: null, session: null, session_id: null })
  }
  const clear = () => {
    clearTimeout(findTimer)
    const previous = { ...filtersToParams(filters()), ...toolsToParams(tools()) }
    navigate({ ...filtersToParams(clearedFilters(filters())), tools: null })
    onNotice('Filters cleared.', () => { navigate(previous); noticeOf(undefined) })
  }
  const searchFor = (text: string) => {
    setFindText(text)
    clearTimeout(findTimer)
    findTimer = setTimeout(() => go(nextAddress({ q: text || null }), true), 250)
  }
  createEffect(() => filters().q, value => { setFindText(value) })
  createEffect(screen, () => { clearTimeout(findTimer) })
  createEffect(theme, value => { document.documentElement.dataset.theme = value; remember('aictl-theme', value) })
  createEffect(density, value => { document.documentElement.dataset.density = value; remember('aictl-shell-density', value) })
  createEffect(rail, value => remember('aictl-shell-rail', value ? 'open' : 'closed'))
  const transport = createMemo(() => boardLiveRequest(filters(), tools(), screen(), startedAt))
  createEffect(() => [scope(), transport().query, transport().history, paused()] as const, ([current]) => {
    if (current !== 'local') { client.stop(); return }
    client.configure({ ...transport(), live: !paused() })
    client.start()
  })
  const agents = createMemo(() => ctx.board('agents')?.filter(agent => agent.id && !agent.parent_id && !agent.placeholder &&
    at(agent, 'queryable') !== false) ?? [])
  createEffect(agents, list => {
    if (!landOnFlow || !list.length || untrack(screen) !== 'board') return
    const active = new Set([...(client.store.topic('runtime.agent')?.values() ?? [])].flatMap(({ data }) =>
      data.running === true && !data.parent_id && typeof data.session_id === 'string' ? [data.session_id] : []))
    const agent = list.find(agent => agent.status === 'running' || active.has(agent.id)) ?? list[0]
    landOnFlow = false
    setStack([{ type: 'agent', id: agent.id, tab: 'flow' }])
  })
  const sectionList = () => order().flatMap(id => sections.board.find(section => section.id === id) ?? [])
  const commands = (): PaletteCommand[] => [
    ...(Object.entries(screenNames) as [Screen, string][]).map(([id, name]) =>
      ({ id: `screen-${id}`, label: `Open ${name}`, run: () => changeScreen(id) })),
    ...sectionList().filter(section => section.id !== 'top').map(section => ({ id: `section-${section.id}`, label: `Go to ${section.title}`, run: () => jump(section.id) })),
    ...RANGES.map(range => ({ id: `range-${range.id}`, label: `Time range: ${range.label}`, run: () => {
      if (screen() !== 'board') changeScreen('board')
      navigate({ range: range.id, since: null, until: null, sel: null })
    } })),
    ...(ctx.board('options')?.tools ?? []).map(tool => ({ id: `tool-${tool.id}`, label: `Toggle tool: ${tool.label || tool.id}`, run: () => {
      const current = new Set(tools() ?? ctx.board('options')?.tools.map(item => item.id) ?? [])
      if (current.has(tool.id)) current.delete(tool.id)
      else current.add(tool.id)
      navigate(toolsToParams([...current]))
    } })),
    { id: 'theme', label: `Use ${theme() === 'light' ? 'dark' : 'light'} theme`, run: () => setTheme(theme() === 'light' ? 'dark' : 'light') },
    { id: 'density', label: `Use ${density() === 'compact' ? 'comfortable' : 'compact'} density`, run: () => setDensity(density() === 'compact' ? 'comfortable' : 'compact') },
    ...screen() === 'settings' ? [] : [{ id: 'layout', label: 'Edit layout', run: () => {
      const edit = () => document.querySelector<HTMLButtonElement>('[data-edit-layout]')?.click()
      const browse = document.querySelector<HTMLButtonElement>('[data-browse-panels]')
      if (browse) { browse.click(); requestAnimationFrame(edit) } else edit()
    } }],
    { id: 'shortcuts', label: 'Show keyboard shortcuts', run: () => setShortcuts(true) },
    ...agents().slice(0, 100).map(agent => ({ id: `agent-${agent.id}`, label: `Open agent: ${agent.title}`, run: () => ctx.openAgent(agent.id) })),
  ]
  const onPop = () => {
    landOnFlow = false
    clearTimeout(findTimer)
    const next = redirectOf(location.search)
    go(location.pathname + (next ?? location.search) + location.hash, true)
    setStack(drawerStack(location.search, history.state))
    setDecision(undefined)
  }
  const onHash = () => setAddress(location.pathname + location.search + location.hash)
  const onSession = (event: Event) => {
    const detail = (event as CustomEvent<{ sessionId?: string; nodeId?: string; node_id?: string }>).detail
    const node = detail?.nodeId || detail?.node_id
    if (!detail?.sessionId || (!node && scope() !== 'local')) return
    landOnFlow = false
    go(location.pathname + agentLinkOf(location.search, detail.sessionId, node), false)
    const entry = readDrawer(location.search)
    setStack(entry ? [entry] : [])
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k' && !decision() && !custom()) {
      event.preventDefault()
      setShortcuts(false)
      setPalette(value => !value)
      return
    }
    if (document.querySelector('dialog[open], :popover-open')) return
    if (event.key === 'Escape' && stack().length) { back(); return }
    if (typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === '/' && screen() === 'board') { event.preventDefault(); find?.focus() }
    else if (event.key === '?') { event.preventDefault(); setShortcuts(true) }
    else if (event.key.toLowerCase() === 's') { event.preventDefault(); changeScreen('settings') }
    else if (screen() === 'board' && /^[1-9]$/.test(event.key)) {
      const section = sectionList().filter(section => section.id !== 'top')[Number(event.key) - 1]
      if (section) { event.preventDefault(); jump(section.id) }
    } else if (screen() === 'board' && (event.key === '[' || event.key === ']')) {
      const list = sectionList(), index = list.findIndex(section => query().hash === `#sec-${section.id}`)
      const next = Math.max(0, Math.min(list.length - 1, (index < 0 ? 0 : index) + (event.key === ']' ? 1 : -1)))
      if (list[next]) { event.preventDefault(); jump(list[next].id) }
    }
  }
  window.addEventListener('popstate', onPop)
  window.addEventListener('hashchange', onHash)
  document.addEventListener('keydown', onKey)
  document.addEventListener('aictl:select-session', onSession)
  onCleanup(() => {
    clearTimeout(noticeTimer); clearTimeout(findTimer)
    window.removeEventListener('popstate', onPop)
    window.removeEventListener('hashchange', onHash)
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('aictl:select-session', onSession)
  })
  const sectionOrder = (ids: string[]) => {
    if (screen() === 'board') setOrder(ids)
    const hash = location.hash
    if (hash.startsWith('#sec-')) requestAnimationFrame(() => { if (hash === location.hash) scroll(hash.slice(5)) })
  }
  const sourceRows = createMemo(() => scope() === 'local' ? statuses(client) : [])
  const stream = () => {
    const health = topic(client, 'runtime.health', 'local')
    return health && 'pipeline' in health ? health.pipeline.stream : undefined
  }
  const liveStatus = () => {
    if (scope() !== 'local') return 'Node reports and scoped history; no local values substituted'
    if (paused()) return 'Live paused'
    if (client.status.error) return client.store.meta.ready ? 'Live disconnected — last received data' : 'Live source unavailable'
    if (!client.status.connected || !client.store.meta.ready) return 'Waiting for live sources'
    const age = stream()?.snapshot_age_s
    if (typeof age === 'number' && age > 60) return 'Collector snapshot is stale'
    if (sourceRows().some(row => 'error' in row && row.error || 'stale' in row && row.stale)) return 'Live — some sources are delayed or unavailable'
    return 'Live connected'
  }
  const actions = <div class={`${styles.controls} ${styles.headerControls}`}>
    <NodePicker scope={scope()} nodeId={nodeId()} select={selectScope} />
    <button class={styles.button} type="button" disabled={scope() !== 'local'} onClick={() => setPaused(old => !old)}>
      {paused() ? 'Resume live' : 'Pause live'}</button>
    <button class={styles.button} type="button" onClick={refresh}>Refresh</button>
    <label>Theme <select class={styles.input} value={theme()} onChange={event => setTheme(event.currentTarget.value as Theme)}>
      <option value="light">Light</option><option value="dark">Dark</option>
    </select></label>
    <label>Density <select class={styles.input} value={density()} onChange={event => setDensity(event.currentTarget.value as Density)}>
      <option value="compact">Compact</option><option value="comfortable">Comfortable</option>
    </select></label>
    <button class={styles.button} type="button" onClick={() => setPalette(true)}>Commands</button>
    <button class={styles.button} type="button" onClick={() => setShortcuts(true)}>Shortcuts</button>
  </div>
  return <AppShell title="aictl" actions={actions}
    navigation={<nav class={styles.controls} aria-label="Screens"><For each={Object.keys(screenNames) as Screen[]}>{id =>
      <button class={styles.button} type="button" aria-current={screen() === id ? 'page' : undefined}
        onClick={() => changeScreen(id)}>{screenNames[id]}</button>}</For></nav>}>
    <div class={styles.work} data-rail={rail() && screen() === 'board' ? '' : undefined}>
        <div class={styles.controls}>
          <Show when={screen() === 'board'}>
            <button class={styles.quiet} type="button" aria-controls="overview-sections" aria-expanded={rail() ? 'true' : 'false'}
              onClick={() => setRail(old => !old)}>Sections</button>
          </Show>
          <span role="status">{scopeLabel(scope(), nodeId())} · {liveStatus()}</span>
          <Show when={scope() === 'local' && liveStatus() === 'Collector snapshot is stale'}>
            <Freshness updatedAt={stream()?.snapshot_ts} />
          </Show>
          <Popover label="Source status" title="Data sources">
            <Show when={scope() === 'local'} fallback={<p>Uses reported data for {scopeLabel(scope(), nodeId())}.</p>}>
              <dl class={styles.sources}>
                <For each={['Runtime', 'Historical', 'Local configuration', 'Native output']}>{(label, i) => <div>
                  <dt>{label}</dt><dd>{String(at(client.store.meta.capabilities, `source_policy.${['agent_state', 'historical_sessions', 'configured_on_disk', 'native_output'][i()]}`) ?? 'Not available from this source')}</dd>
                </div>}</For>
              </dl>
              <For each={sourceRows()}>{status => <p>{'topic' in status ? status.topic : 'component' in status ? status.component : status.producer}
                {' — '}{'error' in status && status.error ? status.error : 'stale' in status && status.stale ? 'Stale' :
                  'ready' in status ? status.ready ? 'Ready' : 'Waiting' : 'Reported'}</p>}</For>
            </Show>
          </Popover>
        </div>
        <Show when={screen() === 'board'}>
          <nav class={styles.sections} id="overview-sections" aria-label="Overview sections" hidden={!rail()}>
            <For each={sectionList()} keyed={section => section.id}>{section =>
              <a href={`#sec-${section().id}`} aria-current={(query().hash || '#sec-top') === `#sec-${section().id}` ? 'location' : undefined}
                onClick={event => { event.preventDefault(); jump(section().id) }}>{section().title}</a>}</For>
          </nav>
        </Show>
        <div class={styles.canvas}>
        <Show when={screen() === 'board'}>
          <BoardControls ctx={ctx} find={element => { find = element }} clear={clear} custom={custom()} setCustom={setCustom} text={findText()} search={searchFor} />
        </Show>
        <Loading fallback={<PanelState state="loading" />}>
          <Switch>
            <Match when={screen() === 'board'}><Overview ctx={ctx} anchor={query().hash} order={sectionOrder} /></Match>
            <Match when={screen() === 'health'}><Health ctx={ctx} order={sectionOrder} /></Match>
            <Match when={screen() === 'settings'}><Settings ctx={ctx} /></Match>
          </Switch>
        </Loading>
        </div>
    </div>
    <Show when={stack().length}>
      <Loading fallback={<div class={styles.drawerLoading}><PanelState state="loading" message="Loading detail…" /></div>}>
        <Drawer ctx={ctx} stack={stack()} open={open} back={back} close={close}
          changeTab={tab => {
            const last = stack().at(-1)
            if (last?.type !== 'agent') return
            const next = { ...last, tab }
            const updated = [...stack().slice(0, -1), next]
            setStack(updated)
            go(nextAddress(drawerPatch(next)), true, updated)
          }} />
      </Loading>
    </Show>
    <Palette open={palette()} close={() => setPalette(false)} commands={commands} />
    <Dialog title="Keyboard shortcuts" open={shortcuts()} onClose={() => setShortcuts(false)}>
      <dl class={styles.sources}>
        <dt>Ctrl/Cmd+K</dt><dd>Open the command palette</dd>
        <dt>/</dt><dd>Focus Find</dd>
        <dt>1–9, [ and ]</dt><dd>Jump to Overview sections</dd>
        <dt>S</dt><dd>Open Settings</dd>
        <dt>?</dt><dd>Open this list</dd>
        <dt>Escape</dt><dd>Close the current menu or detail</dd>
      </dl>
    </Dialog>
    <Dialog title={decision()?.title ?? 'Confirm action'} open={Boolean(decision())} onClose={cancel}
      blockClose={pending()} actions={<>
        <button class={styles.button} type="button" disabled={pending()} onClick={cancel}>Cancel</button>
        <button class={styles.button} type="button" disabled={pending()} onClick={() => void apply()}>
          {pending() ? 'Applying…' : decision()?.label}</button>
      </>}>
      <p>{decision()?.lead}</p><pre class={styles.command}>{decision()?.command}</pre>
      <button class={styles.button} type="button" onClick={() => copy(decision()?.command ?? '')}>Copy command</button>
      <Show when={pending()}><p role="status">Action pending</p></Show>
    </Dialog>
    <Show when={notice()}>{value => <div class={styles.notice} role="status">{value().text}
      <Show when={value().undo}><button class={styles.button} type="button" onClick={() => value().undo?.()}>Undo</button></Show>
    </div>}</Show>
  </AppShell>
}

export function mount(app: HTMLElement, client: LiveClient, startedAt: number) {
  const redirect = redirectOf(location.search)
  if (redirect !== null) history.replaceState(history.state, '', location.pathname + redirect + location.hash)
  const dispose = render(() => <Shell client={client} startedAt={startedAt} />, app)
  window.addEventListener('pagehide', event => { if (!event.persisted) { client.stop(); dispose() } })
}
