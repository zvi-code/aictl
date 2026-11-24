import { createEffect, createMemo, createSignal, For, lazy, Loading, onCleanup, Show, Switch, Match, untrack } from 'solid-js'
import { render } from '@solidjs/web'
import { boardLiveRequest, boardRangePatch, clearedFilters, filtersToParams, parseFilters, PERIODS, readScreen, type Screen } from '../data/filters'
import type { LiveClient } from '../data/live'
import { isRuntimeSession } from '../data/runtimeAgents'
import { agentLinkOf, boardNodeScope, CLEAR_SETTINGS_PARAMS, loadToolFilter, mergeSearch, redirectOf, scopeParam, toolsToParams, writeUrl, type UrlPatch } from '../data/urlState'
import { agentView, selectAgentWatch, supportsLiveAgent } from '../drawer/liveAgent'
import { drawerStack } from '../drawer/navigation'
import { at, detailPath, json, panelData, statuses, topic } from '../panels/data'
import { FIND_EVENT, rowState } from '../panels/overview/sessionFinder'
import type { DetailSessions } from '../data/contract.gen'
import { sections } from '../panels/layout'
import type { Command, NodeScope, PanelContext } from '../panels/types'
import { AppShell } from '../ui/AppShell'
import { Dialog } from '../ui/Dialog'
import { Icon, type Glyph } from '../ui/Icon'
import { PanelState } from '../ui/PanelState'
import { Tooltip } from '../ui/Tooltip'
import { BoardControls } from './BoardControls'
import type { DrawerEntry } from './drawerTypes'
import { NodePicker } from './NodePicker'
import { Palette, type PaletteCommand, type SessionLookup } from './Palette'
import { PeriodPicker } from './PeriodPicker'
import { ProjectChips, ProjectPicker } from './ProjectPicker'
import { sectionSummary } from './railSummary'
import { ScopeStatus } from './ScopeStatus'
import { clearDrawer, drawerPatch, nextAddress, readDrawer, remember, stored } from './viewState'
import '../design/tokens.css'
import styles from './Shell.module.css'

const Overview = lazy(() => import('./Overview'))
const Health = lazy(() => import('./Health'))
const Insights = lazy(() => import('./Insights'))
const Thinking = lazy(() => import('./Thinking'))
const Settings = lazy(() => import('./Settings'))
const Index = lazy(() => import('./Index'))
const Drawer = lazy(() => import('../drawer/DrawerView'))
const screenNames = { board: 'Overview', health: 'Health', insights: 'Insights', thinking: 'Thinking', index: 'Index', settings: 'Settings' }
// The top row names three places. Health holds the store's index and the settings as its parts, and Insights holds
// the search of thinking text: each part keeps its own address (`screen=`), so links to it still open it.
const places: { id: Screen; holds: Screen[] }[] = [
  { id: 'board', holds: ['board'] },
  { id: 'health', holds: ['health', 'index', 'settings'] },
  { id: 'insights', holds: ['insights', 'thinking'] },
]
const partNames: Partial<Record<Screen, string>> = {
  health: 'Nodes and store', index: 'Index', settings: 'Settings', insights: 'Cards', thinking: 'Thinking text',
}
const screenGlyphs: Record<Screen, Glyph> = { board: 'top', health: 'health', insights: 'spark', thinking: 'search', index: 'sources', settings: 'settings' }
const sectionGlyphs: Record<string, Glyph> = {
  top: 'top', usage: 'usage', agents: 'agents', sessions: 'clock', prompts: 'prompts', context: 'context', tools: 'tools',
  changes: 'changes', resources: 'resources', effect: 'effect', sources: 'sources',
}
const posted = (value: object): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
})

type Theme = 'light' | 'dark'
type Decision = { title: string; lead: string; command: string; label: string; apply(): Promise<string> }

function Shell(props: { client: LiveClient; startedAt: number; notice?: string }) {
  const { client, startedAt, notice: opening } = untrack(() => props)
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
  const [rail, setRail] = createSignal(stored('aictl-shell-rail', ['open', 'closed'], 'closed') === 'open')
  const [order, setOrder] = createSignal(sections.board.map(section => section.id))
  const [palette, setPalette] = createSignal(false)
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
      scope: scopeParam(scope()) }
    const search = mergeSearch(location.search, patch)
    // The board's address says the range it shows.
    go(location.pathname + (next === 'board' ? mergeSearch(search, boardRangePatch(search) ?? {}) : search))
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
  if (opening) onNotice(opening)
  const refresh = () => {
    if (scope() === 'local') client.resync()
    bump(i => i + 1)
  }
  // The URL is the one record of an open drawer: every change of the drawers writes it.
  const showDrawers = (next: readonly DrawerEntry[], replace: boolean) => {
    setStack(next)
    go(nextAddress(drawerPatch(next.at(-1))), replace, next)
  }
  const open = (entry: DrawerEntry, resetStack = false) => {
    landOnFlow = false
    if (!stack().length) drawerReturn = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    showDrawers(resetStack ? [entry] : [...stack(), entry], false)
  }
  const close = () => {
    landOnFlow = false
    showDrawers([], true)
    drawerReturn?.focus()
  }
  const back = () => {
    if (stack().length < 2) { close(); return }
    showDrawers(stack().slice(0, -1), true)
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
    openAgent(id: string, tab = 'flow', extra?: Record<string, unknown>) {
      if (id) open({ ...extra, type: 'agent', id, tab } as DrawerEntry, true)
    },
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
  } satisfies Omit<PanelContext, 'board' | 'read' | 'need' | 'metadata' | 'detail'>
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
    navigate({ ...clearDrawer, scope: scopeParam(next), node_id: next === 'node' ? id : null,
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
  // A pasted or restored board address with a range the board cannot show is corrected in place.
  createEffect(() => screen() === 'board' ? boardRangePatch(search()) : undefined, patch => { if (patch) go(nextAddress(patch), true) })
  createEffect(theme, value => { document.documentElement.dataset.theme = value; remember('aictl-theme', value) })
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
      isRuntimeSession(data) ? [data.session_id as string] : []))
    const agent = list.find(agent => agent.status === 'running' || active.has(agent.id)) ?? list[0]
    landOnFlow = false
    // Landing on the running session's Flow puts it in the URL, as a link to it would.
    showDrawers([{ type: 'agent', id: agent.id, tab: 'flow' }], true)
  })
  const sectionList = () => order().flatMap(id => sections.board.find(section => section.id === id) ?? [])
  const commands = (): PaletteCommand[] => [
    ...(Object.entries(screenNames) as [Screen, string][]).map(([id, name]) =>
      ({ id: `screen-${id}`, label: `Open ${name}`, run: () => changeScreen(id) })),
    ...sectionList().filter(section => section.id !== 'top').map(section => ({ id: `section-${section.id}`, label: `Go to ${section.title}`, run: () => jump(section.id) })),
    ...PERIODS.map(range => ({ id: `range-${range.id}`, label: `Time range: ${range.label}`, run: () => {
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
    ...screen() === 'settings' ? [] : [{ id: 'layout', label: 'Edit layout', run: () => {
      const edit = () => document.querySelector<HTMLButtonElement>('[data-edit-layout]')?.click()
      const browse = document.querySelector<HTMLButtonElement>('[data-browse-panels]')
      if (browse) { browse.click(); requestAnimationFrame(edit) } else edit()
    } }],
    ...agents().slice(0, 100).map(agent => ({ id: `agent-${agent.id}`, label: `Open agent: ${agent.title}`, run: () => ctx.openAgent(agent.id) })),
  ]
  // Any stored session by name, id or text, not only the agents of the current window.
  const sessionLookup: SessionLookup = async (text, signal) => {
    const query = new URLSearchParams({ q: text, sort: 'last_activity', order: 'desc', limit: '8', offset: '0' })
    const page = await json<DetailSessions>(detailPath(ctx, '/api/board/sessions', query), { signal })
    return { total: page.total, rows: page.rows.map(row => {
      const view = rowState(row)
      const tool = ctx.board('tool_labels')?.[row.tool] ?? row.tool
      return {
        id: `session-${row.node_id ?? ''}-${row.id}`,
        label: `${view.opens ? 'Open' : 'Find'} session: ${row.title} · ${tool} · ${view.label.replace('● ', '')}` +
          (view.opens ? '' : ' (cannot open: not imported yet)'),
        run: () => {
          if (view.opens) { ctx.openAgent(row.id, 'flow'); return }
          writeUrl({ fq: row.session_id ?? row.id, fsort: 'last_activity' })
          jump('sessions')
          document.dispatchEvent(new CustomEvent(FIND_EVENT, { detail: { q: row.session_id ?? row.id } }))
        },
      }
    }) }
  }
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
      setPalette(value => !value)
      return
    }
    if (document.querySelector('dialog[open], :popover-open')) return
    if (event.key === 'Escape' && stack().length) back()
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
  // The screens whose data is per project. Health (this daemon and the store) and Settings (tool
  // configuration on disk) are not: the chosen projects stay in the address but do not apply there.
  const place = () => places.find(item => item.holds.includes(screen())) ?? places[0]
  const projectScreen = () => screen() === 'board' || screen() === 'insights' || screen() === 'thinking'
  const sourceRows = createMemo(() => scope() === 'local' ? statuses(client) : [])
  const stream = () => {
    const health = topic(client, 'runtime.health', 'local')
    return health && 'pipeline' in health ? health.pipeline.stream : undefined
  }
  // This node's live link in words. Reported nodes have none: their state is the status each of them reports.
  const liveStatus = () => {
    if (paused()) return 'Live paused'
    if (client.status.error) return client.store.meta.ready ? 'Live disconnected — last received data' : 'Live source unavailable'
    if (!client.status.connected || !client.store.meta.ready) return 'Waiting for live sources'
    const age = stream()?.snapshot_age_s
    if (typeof age === 'number' && age > 60) return 'Collector snapshot is stale'
    if (sourceRows().some(row => 'error' in row && row.error || 'stale' in row && row.stale)) return 'Live — some sources are delayed or unavailable'
    return 'Live connected'
  }
  const liveTone = () => {
    const status = liveStatus()
    return status === 'Live connected' ? 'live' : status === 'Live paused' || status.startsWith('Waiting') ? 'idle' : 'warning'
  }
  const actions = <div class={`${styles.controls} ${styles.headerControls}`}>
    <ScopeStatus ctx={ctx} live={scope() === 'local' ? { text: liveStatus(), tone: liveTone() } : undefined} />
    <Show when={projectScreen()}>
      <PeriodPicker ctx={ctx} custom={custom()} setCustom={setCustom} resolved={screen() === 'board' ? ctx.board('range', true) : undefined} />
      <ProjectPicker ctx={ctx} />
    </Show>
    <NodePicker scope={scope()} nodeId={nodeId()} select={selectScope} />
    <span class={styles.divider} aria-hidden="true" />
    <Tooltip class={styles.iconButton} label={paused() ? 'Resume live' : 'Pause live'} disabled={scope() !== 'local'}
      text={paused() ? 'Resume live updates' : 'Pause live updates and keep the current values'} onClick={() => setPaused(old => !old)}>
      <Icon glyph={paused() ? 'play' : 'pause'} /></Tooltip>
    <Tooltip class={styles.iconButton} label="Refresh" text="Reload the current data" onClick={refresh}><Icon glyph="refresh" /></Tooltip>
    <Tooltip class={styles.iconButton} label="Dark theme" pressed={theme() === 'dark'}
      text={theme() === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
      onClick={() => setTheme(old => old === 'dark' ? 'light' : 'dark')}><Icon glyph={theme() === 'dark' ? 'sun' : 'moon'} /></Tooltip>
    <button class={styles.commandButton} type="button" aria-keyshortcuts="Control+K Meta+K" title="Commands (Ctrl K)"
      onClick={() => setPalette(true)}>
      <Icon glyph="command" /><span class={styles.srOnly}>Commands</span></button>
  </div>
  // The board's search and filters sit in the middle of the top row, so the page below starts with its content.
  const center = <Show when={screen() === 'board'}>
    <BoardControls ctx={ctx} clear={clear} text={findText()} search={searchFor} />
  </Show>
  // The section list of Overview opens from the top-left corner, where it stays while the page scrolls.
  const lead = <Show when={screen() === 'board'}>
    <button class={styles.iconButton} type="button" aria-label="Sections" title={rail() ? 'Hide the section list' : 'Show the section list'}
      aria-controls="overview-sections" aria-expanded={rail() ? 'true' : 'false'} onClick={() => setRail(old => !old)}>
      <Icon glyph="menu" /></button>
  </Show>
  return <AppShell title="aictl" actions={actions} center={center} lead={lead}
    home={{ open: () => { if (screen() !== 'board') changeScreen('board') }, current: screen() === 'board', label: 'Overview' }}
    navigation={<nav class={styles.screens} aria-label="Screens"><For each={places.filter(place => place.id !== 'board')}>{place =>
      <button class={styles.screen} type="button" aria-current={place.holds.includes(screen()) ? 'page' : undefined}
        onClick={() => { if (!place.holds.includes(screen())) changeScreen(place.id) }}>
        <Icon glyph={screenGlyphs[place.id]} />{screenNames[place.id]}</button>}</For></nav>}>
    <div class={styles.work} data-rail={rail() && screen() === 'board' ? '' : undefined}>
        <Show when={screen() === 'board'}>
          <nav class={styles.sections} id="overview-sections" aria-label="Overview sections" hidden={!rail()}>
            <For each={sectionList()} keyed={section => section.id}>{section => {
              const stat = createMemo(() => sectionSummary(section().id, field => ctx.board(field)))
              return <a href={`#sec-${section().id}`} aria-current={(query().hash || '#sec-top') === `#sec-${section().id}` ? 'location' : undefined}
                title={stat() ? `${section().title}: ${stat()}` : section().title}
                aria-describedby={stat() ? `rail-stat-${section().id}` : undefined}
                onClick={event => { event.preventDefault(); jump(section().id) }}><Icon glyph={sectionGlyphs[section().id] ?? 'detail'} />
                <span class={styles.sectionText}><span>{section().title}</span>
                  <Show when={stat()}><span class={styles.sectionStat} id={`rail-stat-${section().id}`} aria-hidden="true">{stat()}</span></Show></span></a>
            }}</For>
          </nav>
        </Show>
        <div class={styles.canvas}>
        <ProjectChips ctx={ctx} applies={projectScreen()} />
        <Show when={place().holds.length > 1}>
          <nav class={styles.parts} aria-label={`Parts of ${screenNames[place().id]}`}><For each={place().holds}>{id =>
            <button class={styles.part} type="button" aria-current={screen() === id ? 'page' : undefined}
              onClick={() => changeScreen(id)}>{partNames[id]}</button>}</For></nav>
        </Show>
        <Loading fallback={<PanelState state="loading" />}>
          <Switch>
            <Match when={screen() === 'board'}><Overview ctx={ctx} anchor={query().hash} order={sectionOrder} /></Match>
            <Match when={screen() === 'health'}><Health ctx={ctx} order={sectionOrder} /></Match>
            <Match when={screen() === 'insights'}><Insights ctx={ctx} search={search()} /></Match>
            <Match when={screen() === 'thinking'}><Thinking ctx={ctx} search={search()} /></Match>
            <Match when={screen() === 'index'}><Index ctx={ctx} /></Match>
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
            showDrawers([...stack().slice(0, -1), next], true)
          }} />
      </Loading>
    </Show>
    <Palette open={palette()} close={() => setPalette(false)} commands={commands} sessions={sessionLookup} />
    <Dialog title={decision()?.title ?? 'Confirm action'} open={Boolean(decision())} onClose={cancel}
      blockClose={pending()} actions={<>
        <button class={styles.secondary} type="button" disabled={pending()} onClick={cancel}>Cancel</button>
        <button class={styles.primary} type="button" disabled={pending()} onClick={() => void apply()}>
          {pending() ? 'Applying…' : decision()?.label}</button>
      </>}>
      <p>{decision()?.lead}</p><pre class={styles.command}>{decision()?.command}</pre>
      <button class={styles.secondary} type="button" onClick={() => copy(decision()?.command ?? '')}>Copy command</button>
      <Show when={pending()}><p role="status">Action pending</p></Show>
    </Dialog>
    <Show when={notice()}>{value => <div class={styles.notice} role="status">{value().text}
      <Show when={value().undo}><button class={styles.secondary} type="button" onClick={() => value().undo?.()}>Undo</button></Show>
    </div>}</Show>
  </AppShell>
}

export function mount(app: HTMLElement, client: LiveClient, startedAt: number, notice?: string) {
  const redirect = redirectOf(location.search)
  if (redirect !== null) history.replaceState(history.state, '', location.pathname + redirect + location.hash)
  const dispose = render(() => <Shell client={client} startedAt={startedAt} notice={notice} />, app)
  window.addEventListener('pagehide', event => { if (!event.persisted) { client.stop(); dispose() } })
}
