import { createEffect, createMemo, createSignal, For, getOwner, lazy, onCleanup, runWithOwner, Show, untrack, type Component } from 'solid-js'
import { render } from '@solidjs/web'
import type { DockviewApi, IContentRenderer } from 'dockview-core'
import { Menu } from '../ui/Menu'
import { Panel } from '../ui/Panel'
import { eligible } from './registry'
import { defaultSection, fitGrid, layoutKey, panelSizes, pruneDock, resizeSplit, restoreLayout, sections, selectTab,
  type LayoutScreen, type Placement, type SectionState } from './layout'
import { StaticDock, type Drop } from './StaticDock'
import type { PanelContext, PanelDef, PanelProps } from './types'
import styles from './DockScreen.module.css'

const Rows = lazy(() => import('./kinds/Rows'))
const Chart = lazy(() => import('./kinds/Series'))
const Stats = lazy(() => import('./kinds/Stats'))
const custom = new WeakMap<NonNullable<PanelDef['load']>, Component<PanelProps>>()

function panelView(def: PanelDef) {
  if (!def.load) return def.kind === 'chart' ? Chart : def.kind === 'stat' ? Stats : Rows
  let view = custom.get(def.load)
  if (!view) {
    view = lazy(def.load)
    custom.set(def.load, view)
  }
  return view
}

type Module = typeof import('./DockEditor')
type Editor = ReturnType<Module['makeEditor']>
type Edit = () => void
export default function DockScreen(props: {
  screen: LayoutScreen; definitions: readonly PanelDef[]; ctx: PanelContext; reset: () => number; order: (order: string[]) => void
}) {
  const owner = getOwner()
  const defaults = untrack(() => sections[props.screen])
  const defs = createMemo(() => new Map(props.definitions.filter(def =>
    eligible(def, props.ctx.client.store.meta.capabilities)).map(def => [def.id, def])))
  const [width, setWidth] = createSignal(1200)
  let model = untrack(() => defaults.map(section => defaultSection(section, defs(), width())))
  const [layout, setLayout] = createSignal(model)
  const changeLayout = (next: SectionState[]) => { model = next; setLayout(next) }
  const [attached, setAttached] = createSignal(false)
  const [error, setError] = createSignal(false)
  const docks = new Map<string, HTMLElement>()
  const editors = new Map<string, Editor>()
  let editorModule: Module | undefined
  let loading: Promise<Module> | undefined
  let pendingMounts: Set<() => void> | undefined
  let changing = false, disposed = false
  const title = (id: string) => defs().get(id)?.title ?? id
  const current = (id: string) => model.find(section => section.id === id)!
  const hostWidth = (id: string) => { const fallback = width(); return docks.get(id)?.clientWidth || fallback }
  const defaultLayout = () => defaults.map(section => defaultSection(section, defs(), hostWidth(section.id)))
  const store = (next: SectionState[]) => {
    changeLayout(next)
    try { localStorage.setItem(layoutKey(props.screen), JSON.stringify({ version: 1, screen: props.screen, tree: next })) }
    catch { /* The active layout still works when storage is disabled. */ }
  }
  const update = (id: string, change: (section: SectionState) => SectionState) =>
    store(model.map(section => section.id === id ? change(section) : section))

  function saveEditors() {
    if (changing || disposed || !editors.size) return
    store(model.map(section => ({ ...section, tree: editors.get(section.id)?.api.toJSON() ?? section.tree })))
  }

  function panel(id: string) {
    const element = document.createElement('div')
    element.className = styles.dockContent
    element.id = `p-${id}`
    const [where, setWhere] = createSignal<{ section: string; params: Placement['params'] }>()
    let dispose: (() => void) | undefined
    const hide = () => { dispose?.(); dispose = undefined }
    return {
      element, hide, setWhere, lease: 0,
      show() {
        const def = untrack(() => defs().get(id))
        if (!def || dispose) return
        dispose = runWithOwner(owner, () => render(() => {
          const View = panelView(def)
          return <Panel title={def.title} size={def.defaultSize} fill observeViewport={false}
            actions={<Menu label={`${def.title} layout`} items={panelItems(def, where()!.section)} />}>
            <View def={def} ctx={props.ctx} params={where()?.params ?? {}} />
          </Panel>
        }, element))
      },
    }
  }
  const panels = new Map<string, ReturnType<typeof panel>>()
  const visibility = new Map<Element, ReturnType<typeof panel>>()
  const viewport = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const box = visibility.get(entry.target)
      if (entry.isIntersecting) box?.show()
      else box?.hide()
    }
  })
  onCleanup(() => {
    disposed = true
    viewport.disconnect()
    for (const edit of editors.values()) edit.dispose()
    for (const box of panels.values()) box.hide()
  })

  function connect(id: string, section: string, host: HTMLElement, params?: Placement['params']) {
    let box = panels.get(id)
    if (!box) {
      box = runWithOwner(owner, () => panel(id))!
      panels.set(id, box)
    }
    const selection = box
    const element = selection.element
    const lease = ++selection.lease
    selection.setWhere({ section, params })
    if (element.parentNode !== host) {
      // Move the existing root, so pending REST reads, chart state and focus survive the switch.
      if (host.isConnected && element.isConnected && host.moveBefore) host.moveBefore(element, null)
      else host.append(element)
    }
    if (!visibility.has(element)) {
      visibility.set(element, selection)
      viewport.observe(element)
    }
    return () => queueMicrotask(() => {
      // Static and Dockview hosts can release and acquire the same panel in one turn.
      if (selection.lease !== lease || element.parentNode !== host || disposed) return
      viewport.unobserve(element)
      visibility.delete(element)
      selection.hide()
      element.remove()
      panels.delete(id)
    })
  }

  function dockContent(id: string, section: string): IContentRenderer {
    const element = document.createElement('div')
    element.className = styles.slot
    let params: Placement['params'], shown = false
    let release: (() => void) | undefined
    const mount = () => {
      if (!shown) return
      if (pendingMounts) pendingMounts.add(mount)
      else release = connect(id, section, element, params)
    }
    const hide = () => { shown = false; release?.(); release = undefined }
    return {
      element,
      init: event => { params = event.params },
      update: event => { params = event.params; if (shown) mount() },
      onShow() { shown = true; mount() },
      onHide: hide,
      dispose: hide,
    }
  }

  function setEditorLayout(section: SectionState, api: DockviewApi) {
    const tree = fitGrid(section.tree, hostWidth(section.id), section.height)
    api.layout(tree.grid.width, tree.grid.height)
    if (Object.keys(tree.panels).length) api.fromJSON(tree)
    else api.clear()
  }

  function attach(module: Module) {
    const focused = document.activeElement as HTMLElement | null
    const tab = focused?.dataset.dockTab
    const x = window.scrollX, y = window.scrollY
    changing = true
    const mounts = pendingMounts = new Set()
    try {
      for (const section of model) {
        const host = docks.get(section.id)!
        editors.set(section.id, module.makeEditor(host, fitGrid(section.tree, hostWidth(section.id), section.height),
          title, id => dockContent(id, section.id), saveEditors))
      }
      pendingMounts = undefined
      for (const mount of mounts) mount()
      editorModule = module
      setAttached(true)
      if (tab) {
        const label = root.querySelector(`[data-dock-tab="${CSS.escape(tab)}"]:not(button)`)
        label?.closest<HTMLElement>('[role="tab"]')?.focus({ preventScroll: true })
      } else if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true })
      if (x !== window.scrollX || y !== window.scrollY) window.scrollTo(x, y)
    } catch (reason) {
      for (const editor of editors.values()) editor.dispose()
      editors.clear()
      throw reason
    } finally { pendingMounts = undefined; changing = false }
  }

  const loadEditor = () => loading ??= import('./DockEditor').catch(reason => {
    loading = undefined
    throw reason
  })
  function edit(operation: Edit) {
    const run = (module: Module) => untrack(() => {
      if (disposed) return
      if (!editorModule) attach(module)
      setError(false)
      operation()
      saveEditors()
    })
    if (editorModule) run(editorModule)
    else void loadEditor().then(run).catch(() => { if (!disposed) setError(true) })
  }

  const signature = createMemo(() => [...defs().keys()].join('\0'))
  createEffect(signature, () => {
    let next: SectionState[] | undefined
    try {
      const claimed = new Set<string>()
      next = restoreLayout(localStorage.getItem(layoutKey(props.screen)), props.screen)?.map(section => {
        const tree = pruneDock(section.tree, new Set(defs().keys()), claimed)
        return { ...section, tree, height: Object.keys(tree.panels).length ? section.height || panelSizes.medium : 0 }
      })
    } catch { /* Ignore an unreadable or invalid saved layout. */ }
    changeLayout(next ?? defaultLayout())
    if (editorModule) for (const section of model) setEditorLayout(section, editors.get(section.id)!.api)
  })
  createEffect(() => layout().map(section => section.id), ids => { if (ids.length) props.order(ids) })
  const reset = () => edit(() => untrack(() => {
    const next = defaultLayout()
    store(next)
    for (const section of next) setEditorLayout(section, editors.get(section.id)!.api)
  }))
  createEffect(() => props.reset(), value => { if (value) reset() })

  const present = createMemo(() => new Set(layout().flatMap(section => Object.keys(section.tree.panels))))
  const open = (id: string) => update(id, section => ({ ...section, open: true }))
  const resize = (id: string, height: number) => {
    update(id, section => ({ ...section, height }))
    const host = docks.get(id)
    if (host && height) editors.get(id)!.api.layout(hostWidth(id), height)
  }
  function add(id: string, section: string, position?: Parameters<DockviewApi['addPanel']>[0]['position'],
    params?: Placement['params']) {
    const def = defs().get(id)
    if (!def) return
    editors.get(section)!.api.addPanel({ id, title: def.title, component: 'panel', params,
      position, initialHeight: panelSizes[def.defaultSize] })
  }
  function moveBetween(id: string, from: string, to: string, position?: Parameters<DockviewApi['addPanel']>[0]['position']) {
    const source = editors.get(from)!.api, target = editors.get(to)!.api
    const p = source.getPanel(id), def = defs().get(id)
    if (!p || !def) return
    const params = p.params
    source.removePanel(p)
    if (!source.panels.length) resize(from, 0)
    if (!position || position.direction !== 'within') resize(to, current(to).height + panelSizes[def.defaultSize])
    add(id, to, position ?? (target.activePanel ? { referencePanel: target.activePanel.id, direction: 'below' } : undefined), params)
    open(to)
    props.ctx.jump(to)
  }
  function panelItems(def: PanelDef, section: string) {
    const withPanel = (operation: (panel: NonNullable<ReturnType<DockviewApi['getPanel']>>, api: DockviewApi) => void) =>
      () => edit(() => {
        const api = editors.get(section)!.api
        const panel = api.getPanel(def.id)
        if (panel) operation(panel, api)
      })
    return [
      { id: 'hide', label: 'Hide panel', onSelect: withPanel((p, api) => untrack(() => {
        api.removePanel(p)
        if (!api.panels.length) resize(section, 0)
      })) },
      ...(['left', 'right', 'top', 'bottom'] as const).map(position => ({
        id: position, label: `Move ${position}`, onSelect: withPanel((p, api) => {
          p.api.moveTo({ group: api.groups.find(group => group.id !== p.group.id) ?? p.group, position })
        }),
      })),
      { id: 'stack', label: 'Stack with another panel', onSelect: withPanel((p, api) => {
        const group = api.groups.find(group => group.id !== p.group.id)
        if (group) p.api.moveTo({ group, position: 'center' })
      }) },
      ...([-1, 1] as const).flatMap(step => [
        { id: `width${step}`, label: step < 0 ? 'Narrower' : 'Wider', onSelect: withPanel(p =>
          p.group.api.setSize({ width: Math.max(160, p.api.width + step * 80) })) },
        { id: `height${step}`, label: step < 0 ? 'Shorter' : 'Taller', onSelect: withPanel(() =>
          untrack(() => resize(section, Math.max(144, Math.min(10000, current(section).height + step * 64))))) },
      ]),
      ...defaults.filter(next => next.id !== section).map(next => ({
        id: `move-${next.id}`, label: `Move to ${next.title}`, onSelect: () => edit(() => untrack(() => moveBetween(def.id, section, next.id))),
      })),
    ]
  }
  const moveSection = (id: string, step: number) => edit(() => untrack(() => {
    const next = [...model], index = next.findIndex(section => section.id === id), target = index + step
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    store(next)
  }))
  let drag: { section: string; id: string } | undefined
  function drop(to: string, event: DragEvent, { group, position, index }: Drop) {
    if (!drag) return
    event.preventDefault()
    const { section, id } = drag
    drag = undefined
    edit(() => untrack(() => {
      const target = editors.get(to)!.api.groups.find(entry => entry.id === group)
      if (!target) return
      if (section !== to) {
        const direction = ({ left: 'left', right: 'right', top: 'above', bottom: 'below', center: 'within' } as const)[position]
        moveBetween(id, section, to, { referenceGroup: group, direction, index })
      } else editors.get(section)!.api.getPanel(id)?.api.moveTo({ group: target, position, index })
    }))
  }
  let root!: HTMLDivElement
  const observeWidth = new ResizeObserver(() => setWidth(root.clientWidth || 1200))
  onCleanup(() => observeWidth.disconnect())
  return <div ref={element => { root = element; observeWidth.observe(root) }} data-dock-mode={attached() ? 'editor' : 'static'}>
    <div class={styles.toolbar}>
      <Menu label="Add panel" disabled={[...defs().keys()].every(id => present().has(id))}
        items={[...defs().values()].filter(def => !present().has(def.id)).map(def => ({
          id: def.id, label: def.title, onSelect: () => edit(() => untrack(() => {
            const section = (defaults.find(section => section.bands.some(band => band.some(panel => panel.id === def.id))) ?? defaults[0]).id
            const api = editors.get(section)!.api
            resize(section, Math.max(current(section).height, panelSizes[def.defaultSize]))
            add(def.id, section, api.activePanel ? { referencePanel: api.activePanel.id, direction: 'within' } : undefined)
            open(section)
            props.ctx.jump(section)
          })),
        }))} />
      <button class={styles.button} type="button" onClick={reset}>Reset layout</button>
      <Show when={error()}><span role="alert">Could not open the layout editor. Try the action again.</span></Show>
    </div>
    <For each={layout().map(section => section.id)}>{id => {
      const section = defaults.find(section => section.id === id)!
      const state = () => layout().find(section => section.id === id)!
      const tree = () => state().tree
      const count = () => Object.keys(tree().panels).length
      return <section id={`sec-${id}`} class={styles.section} aria-labelledby={`title-${id}`} tabindex={-1}>
        <div class={styles.heading}>
          <h2 id={`title-${id}`}><button class={styles.button} type="button" aria-expanded={state().open ? 'true' : 'false'}
            aria-controls={`dock-${id}`} onClick={() => update(id, section => ({ ...section, open: !section.open }))}>{section.title}</button></h2>
          <Show when={!state().open}><span>{count()} panels</span></Show>
          <Menu label={`${section.title} section layout`} items={[
            { id: 'up', label: 'Move section up', disabled: layout()[0]?.id === id, onSelect: () => moveSection(id, -1) },
            { id: 'down', label: 'Move section down', disabled: layout().at(-1)?.id === id, onSelect: () => moveSection(id, 1) },
          ]} />
        </div>
        <div id={`dock-${id}`} hidden={!state().open} class={styles.dock} data-height={state().height} style={{ height: `${state().height}px` }}
          ref={host => { docks.set(id, host); onCleanup(() => docks.delete(id)) }}>
          <Show when={!attached()}>
            <StaticDock node={tree().grid.root} axis={tree().grid.orientation} width={hostWidth(id)} height={state().height} path={[]} actions={{
              title,
              mount: (panel, host) => connect(panel, id, host, current(id).tree.panels[panel]?.params),
              select: (group, panel) => update(id, section => ({ ...section, tree: selectTab(section.tree, group, panel) })),
              drag: (panel, event) => {
                if (!event.dataTransfer) return
                drag = { id: panel, section: id }
                event.dataTransfer.setData('application/x-aictl-panel', panel)
                event.dataTransfer.effectAllowed = 'move'
                void loadEditor().catch(() => {})
              },
              dragEnd: () => { drag = undefined },
              drop: (event, target) => drop(id, event, target),
              resize: (path, at, delta) => update(id, section => untrack(() => {
                const fitted = fitGrid(section.tree, hostWidth(id), section.height)
                return { ...section, tree: { ...fitted, grid: {
                  ...fitted.grid, root: resizeSplit(fitted.grid.root, path, fitted.grid.orientation, at, delta),
                } } }
              })),
            }} />
          </Show>
        </div>
        <Show when={!count() && state().open}><p class={styles.empty}>No panels in this section.</p></Show>
      </section>
    }}</For>
  </div>
}
