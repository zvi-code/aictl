import { createEffect, createMemo, createSignal, For, getOwner, lazy, onCleanup, runWithOwner, Show, untrack, type Component } from 'solid-js'
import { render, type JSX } from '@solidjs/web'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, GripVertical } from 'lucide'
import type { DockviewApi } from 'dockview-core'
import { Icon } from '../ui/Icon'
import { Menu } from '../ui/Menu'
import { Panel } from '../ui/Panel'
import { eligible } from './registry'
import { defaultSection, fitGrid, layoutKey, panelOrder, panelSizes, pruneDock, reorderPanel, resizeSplit, restoreLayout, sections, selectTab,
  type LayoutScreen, type Placement, type SectionState } from './layout'
import { StaticDock, type Drop } from './StaticDock'
import type { PanelContext, PanelDef, PanelProps } from './types'
import styles from './DockScreen.module.css'

const Rows = lazy(() => import('./kinds/Rows'))
const Chart = lazy(() => import('./kinds/Series'))
const Stats = lazy(() => import('./kinds/Stats'))
const custom = new WeakMap<NonNullable<PanelDef['load']>, Component<PanelProps>>()
const intrinsicHeight = new Set(['kpis', 'attention', 'agentsT', 'byModel', 'byRole', 'healthHighlights'])

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
type Position = Parameters<DockviewApi['addPanel']>[0]['position']

export default function DockScreen(props: {
  screen: LayoutScreen; definitions: readonly PanelDef[]; ctx: PanelContext; order: (order: string[]) => void; heading?: JSX.Element
}) {
  const owner = getOwner()
  const defaults = untrack(() => sections[props.screen])
  // Board and Health are pages: panels take their content height and the page scrolls.
  const flow = untrack(() => props.screen === 'board' || props.screen === 'health')
  const defs = createMemo(() => new Map(props.definitions.filter(def =>
    eligible(def, props.ctx.client.store.meta.capabilities)).map(def => [def.id, def])))
  const [width, setWidth] = createSignal(1200)
  const defaultLayout = () => defaults.map(section => defaultSection(section, defs(), width()))
  const [layout, setLayout] = createSignal(untrack(defaultLayout))
  const [editing, setEditing] = createSignal(false)
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal(false)
  const [announcement, announce] = createSignal('')
  let editor: Module | undefined, disposed = false
  let root!: HTMLDivElement, toggle!: HTMLButtonElement
  const title = (id: string) => defs().get(id)?.title ?? id
  const now = (id: string) => untrack(layout).find(section => section.id === id)!
  const names = new Map(defaults.map(section => [section.id, section.title]))
  const store = (next: SectionState[]) => {
    setLayout(next)
    try { localStorage.setItem(layoutKey(props.screen), JSON.stringify({ version: 1, screen: props.screen, tree: next })) }
    catch { /* The active layout still works when storage is disabled. */ }
  }
  const update = (id: string, change: (section: SectionState) => SectionState) =>
    store(untrack(layout).map(section => section.id === id ? change(section) : section))

  const signature = createMemo(() => [...defs().keys()].join('\0'))
  createEffect(signature, () => {
    let restored: SectionState[] | undefined
    try {
      const claimed = new Set<string>(), known = new Set(defs().keys())
      restored = restoreLayout(localStorage.getItem(layoutKey(props.screen)), props.screen)?.map(section => {
        const tree = pruneDock(section.tree, known, claimed)
        return { ...section, tree, height: Object.keys(tree.panels).length ? section.height || panelSizes.medium : 0 }
      })
    } catch { /* Ignore an unreadable or invalid saved layout. */ }
    setLayout(restored ?? defaultLayout())
  })
  const order = createMemo(() => layout().map(section => section.id), { equals: (a, b) => a.join() === b.join() })
  createEffect(order, ids => props.order(ids))
  const present = createMemo(() => new Set(layout().flatMap(section => Object.keys(section.tree.panels))))
  const missing = () => [...defs().values()].filter(def => !present().has(def.id))
  const focusEdit = (id: string, action?: string) => queueMicrotask(() => {
    if (disposed || !untrack(editing)) return
    const box = document.getElementById(`p-${id}`)
    box?.querySelector<HTMLElement>(`[data-move="${action}"]:not(:disabled)`)?.focus()
    if (!box?.contains(document.activeElement)) (box?.querySelector<HTMLElement>('[data-move]:not(:disabled)') ??
      box?.querySelector<HTMLElement>('button') ?? box)?.focus()
  })
  async function toggleEdit() {
    if (pending()) return
    if (editing()) {
      setEditing(false)
      toggle.focus()
      return
    }
    setPending(true)
    setError(false)
    try {
      editor ??= await import('./DockEditor')
      if (!disposed) { setEditing(true); toggle.focus() }
    } catch {
      if (!disposed) setError(true)
    } finally { if (!disposed) setPending(false) }
  }
  function change(operation: () => void) {
    try { operation(); setError(false) }
    catch { setError(true) }
  }
  const editTree = (section: SectionState, edit: (api: DockviewApi) => void, height = section.height) =>
    editor!.editDock(fitGrid(section.tree, untrack(width), height), edit)
  const heightFor = (id: string) => untrack(() => panelSizes[defs().get(id)!.defaultSize])
  const add = (api: DockviewApi, id: string, position?: Position, params?: Placement['params']) =>
    api.addPanel({ id, title: untrack(() => title(id)), component: 'panel', params, position, initialHeight: heightFor(id) })

  function addPanel(id: string) {
    change(() => untrack(() => {
      const preferred = defaults.find(section => section.bands.some(band => band.some(panel => panel.id === id))) ?? defaults[0]
      const section = now(preferred.id)
      const height = Math.max(section.height, heightFor(id))
      const tree = editTree(section, api => add(api, id, api.activePanel ?
        { referencePanel: api.activePanel.id, direction: 'within' } : undefined,
      preferred.bands.flat().find(panel => panel.id === id)?.params), height)
      update(section.id, old => ({ ...old, tree, open: true, height }))
      announce(`Added ${untrack(() => title(id))} to ${preferred.title}.`)
      focusEdit(id)
    }))
  }
  function moveBetween(id: string, from: string, to: string, position?: Position) {
    const source = now(from), target = now(to)
    const tree = editTree(source, api => api.removePanel(api.getPanel(id)!))
    const height = target.height + (position?.direction === 'within' ? 0 : heightFor(id))
    const treeTo = editTree(target, api => add(api, id, position ?? (api.activePanel ?
      { referencePanel: api.activePanel.id, direction: 'below' } : undefined), source.tree.panels[id].params), height)
    const { [id]: minHeight, ...remaining } = source.minHeights ?? {}
    store(untrack(layout).map(section => section.id === from ? {
      ...section, tree, height: Object.keys(tree.panels).length ? section.height : 0, minHeights: remaining,
    } : section.id === to ? {
      ...section, tree: treeTo, height, open: true, minHeights: minHeight ? { ...section.minHeights, [id]: minHeight } : section.minHeights,
    } : section))
    announce(`Moved ${untrack(() => title(id))} to ${names.get(to)}.`)
    focusEdit(id)
  }
  function movePanel(section: string, id: string, step: -1 | 1) {
    let position = -1
    update(section, old => {
      const tree = reorderPanel(old.tree, id, step)
      position = panelOrder(tree).indexOf(id)
      return { ...old, tree }
    })
    announce(`Moved ${title(id)} to position ${position + 1} in ${names.get(section)}.`)
    focusEdit(id, step < 0 ? 'up' : 'down')
  }
  function moveSection(id: string, step: -1 | 1) {
    const next = [...untrack(layout)], index = next.findIndex(section => section.id === id), target = index + step
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    store(next)
    announce(`Moved ${names.get(id)} to section ${target + 1}.`)
    queueMicrotask(() => {
      const section = document.getElementById(`sec-${id}`)
      const actions = section?.querySelectorAll<HTMLButtonElement>('[data-section-move]:not(:disabled)')
      ;(actions?.[step < 0 ? 0 : actions.length - 1] ?? section)?.focus()
    })
  }
  const defaultHeights = new Map(defaults.flatMap(section => section.bands.flat().map(panel => [panel.id, panel.height] as const)))
  const estimate = (id: string) => defaultHeights.get(id) ?? heightFor(id)
  function options(def: PanelDef, section: string, stacked: boolean) {
    const id = def.id
    const modify = (operation: (panel: NonNullable<ReturnType<DockviewApi['getPanel']>>, api: DockviewApi) => void) =>
      () => change(() => untrack(() => {
        update(section, old => {
          const tree = editTree(old, api => { const p = api.getPanel(id); if (p) operation(p, api) })
          return { ...old, tree, height: Object.keys(tree.panels).length ? old.height : 0 }
        })
        focusEdit(id)
      }))
    return [
      { id: 'hide', label: 'Hide panel', onSelect: () => {
        modify((p, api) => api.removePanel(p))()
        announce(`Hid ${def.title}.`)
        queueMicrotask(() => { if (!document.getElementById(`p-${id}`)) document.getElementById(`sec-${section}`)?.focus() })
      } },
      { id: 'stack', label: stacked ? 'Unstack panel' : 'Stack with next panel',
        disabled: !stacked && panelOrder(layout().find(entry => entry.id === section)!.tree).length < 2,
        onSelect: modify((p, api) => {
          if (stacked) p.api.moveTo({ group: p.group, position: 'bottom' })
          else {
            const index = api.groups.indexOf(p.group)
            const group = api.groups[index + 1] ?? api.groups[index - 1]
            if (group) p.api.moveTo({ group, position: 'center' })
          }
        }) },
      { id: 'side', label: 'Place beside another panel', onSelect: modify((p, api) => {
        const index = api.groups.indexOf(p.group)
        const next = api.groups[index + 1], previous = api.groups[index - 1]
        if (next || previous) p.api.moveTo({ group: next ?? previous, position: next ? 'left' : 'right' })
      }) },
      ...([-1, 1] as const).map(step => ({ id: `width-${step}`, label: step < 0 ? 'Narrower' : 'Wider',
        onSelect: modify(p => p.group.api.setSize({ width: Math.max(100, p.api.width + step * 80) })) })),
      ...([-1, 1] as const).map(step => ({ id: `height-${step}`, label: step < 0 ? 'Shorter' : 'Taller',
        onSelect: () => update(section, old => flow ? { ...old, minHeights: { ...old.minHeights,
          [id]: Math.min(10000, Math.max(48, (old.minHeights?.[id] ?? (id === 'kpis' ? heightFor(id) : estimate(id))) + step * 64)) },
        } : { ...old, height: Math.min(10000, Math.max(144, old.height + step * 64)) }) })),
    ]
  }
  const moveButton = (label: string, step: -1 | 1, disabled: boolean, move: () => void, section = false) =>
    <button class={styles.iconButton} type="button" aria-label={label} title={label} disabled={disabled}
      data-move={section ? undefined : step < 0 ? 'up' : 'down'} data-section-move={section ? '' : undefined} onClick={move}>
      <Icon data={step < 0 ? ArrowUp : ArrowDown} />
    </button>

  function panel(id: string) {
    const element = document.createElement('div')
    element.className = styles.dockContent
    element.id = `p-${id}`
    element.tabIndex = -1
    const [where, setWhere] = createSignal<{ section: string; stacked: boolean }>()
    const section = () => layout().find(section => section.id === where()?.section)!
    const params = () => section()?.tree.panels[id]?.params ?? {}
    const [cachedHeight, rememberHeight] = createSignal<number>()
    // Keep offscreen estimates and loaded heights aligned so a section jump doesn't move away
    // from its target as nearby panels finish loading. Only intrinsic summaries collapse to their content.
    const height = () => section()?.minHeights?.[id] ?? (flow && !intrinsicHeight.has(id) ? estimate(id) : undefined)
    let dispose: (() => void) | undefined
    const hide = () => {
      if (!dispose) return
      const measured = element.getBoundingClientRect().height
      if (flow && measured) rememberHeight(measured)
      dispose()
      dispose = undefined
      placeholder()
    }
    function placeholder() {
      if (flow && !dispose) element.style.minBlockSize = `${untrack(size)}px`
    }
    const size = () => Math.max(height() ?? 0, cachedHeight() ?? (id === 'kpis' ? 192 : estimate(id)))
    createEffect(size, () => placeholder())
    placeholder()
    return {
      element, hide, setWhere, lease: 0,
      show() {
        const def = untrack(() => defs().get(id))
        if (!def || dispose) return
        element.style.removeProperty('min-block-size')
        dispose = runWithOwner(owner, () => render(() => {
          const View = panelView(def)
          const hideTitle = () => !editing() && (where()?.stacked || flow && def.id === 'kpis')
          return <Panel title={def.title} size={def.defaultSize} fill={!flow} flow={flow} height={height()}
            heading={hideTitle() ? 'sr-only' : 'visible'} observeViewport={false}
            actions={<Show when={editing() && section()?.tree.panels[id]}><div class={styles.panelActions}>
              <span class={styles.grip} title="Drag to arrange panels" draggable="true" aria-hidden="true"
                onDragStart={event => startDrag(id, section().id, event)} onDragEnd={() => { drag = undefined }}>
                <Icon data={GripVertical} />
              </span>
              {moveButton(`Move ${def.title} up`, -1, panelOrder(section().tree)[0] === id,
                () => movePanel(section().id, id, -1))}
              {moveButton(`Move ${def.title} down`, 1, panelOrder(section().tree).at(-1) === id,
                () => movePanel(section().id, id, 1))}
              <Menu label={`Options for ${def.title}`} items={options(def, section().id, where()!.stacked)} />
              <Show when={defaults.length > 1}>
                <select class={styles.select} aria-label={`Move ${def.title} to section`} value="" onChange={event => {
                  const target = event.currentTarget.value
                  event.currentTarget.value = ''
                  if (target) change(() => moveBetween(id, section().id, target))
                }}>
                  <option value="">Move to section…</option>
                  <For each={defaults.filter(next => next.id !== section().id)}>{next => <option value={next.id}>{next.title}</option>}</For>
                </select>
              </Show>
            </div></Show>}>
            <View def={def} ctx={props.ctx} params={params()} />
          </Panel>
        }, element))
      },
    }
  }
  const panels = new Map<string, ReturnType<typeof panel>>()
  const visibility = new Map<Element, ReturnType<typeof panel>>()
  // Mount near the viewport, but unmount only far away. One shared margin let
  // live height changes move edge panels in and out, which remounted their charts.
  const viewport = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) visibility.get(entry.target)?.show()
  }, { rootMargin: '96px 0px' })
  const retained = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting && !entry.target.contains(document.activeElement)) visibility.get(entry.target)?.hide()
    }
  }, { rootMargin: '150% 0px' })
  const boxResize = new ResizeObserver(() => setWidth(root.clientWidth || 1200))
  onCleanup(() => {
    disposed = true
    viewport.disconnect()
    retained.disconnect()
    boxResize.disconnect()
    for (const box of panels.values()) box.hide()
  })

  function connect(id: string, section: string, host: HTMLElement, stacked: boolean) {
    let box = panels.get(id)
    if (!box) {
      box = runWithOwner(owner, () => panel(id))!
      panels.set(id, box)
    }
    const selection = box, element = selection.element
    const lease = ++selection.lease
    selection.setWhere({ section, stacked })
    if (element.parentNode !== host) {
      if (host.isConnected && element.isConnected && host.moveBefore) host.moveBefore(element, null)
      else host.append(element)
    }
    if (!visibility.has(element)) {
      visibility.set(element, selection)
      viewport.observe(element)
      retained.observe(element)
    }
    return () => queueMicrotask(() => {
      if (selection.lease !== lease || element.parentNode !== host || disposed) return
      viewport.unobserve(element)
      retained.unobserve(element)
      visibility.delete(element)
      selection.hide()
      element.remove()
      panels.delete(id)
    })
  }

  let drag: { section: string; id: string } | undefined
  function startDrag(panel: string, section: string, event: DragEvent) {
    if (!event.dataTransfer || !editing()) return
    drag = { id: panel, section }
    event.dataTransfer.setData('application/x-aictl-panel', panel)
    event.dataTransfer.effectAllowed = 'move'
  }
  function drop(to: string, event: DragEvent, { group, position, index }: Drop) {
    if (!drag || !editing()) return
    event.preventDefault()
    const { section, id } = drag
    drag = undefined
    change(() => untrack(() => {
      if (section !== to) {
        const direction = ({ left: 'left', right: 'right', top: 'above', bottom: 'below', center: 'within' } as const)[position]
        moveBetween(id, section, to, { referenceGroup: group, direction, index })
      } else {
        update(section, old => ({ ...old, tree: editTree(old, api => {
          const target = api.groups.find(entry => entry.id === group)
          if (target) api.getPanel(id)?.api.moveTo({ group: target, position, index })
        }) }))
        focusEdit(id)
      }
    }))
  }

  return <div ref={element => { root = element; boxResize.observe(root) }} class={styles.root}
    data-dock-mode={editing() ? 'editor' : 'static'} data-flow={flow ? '' : undefined}
    onKeyDown={event => {
      if (event.key === 'Escape' && editing() && !event.defaultPrevented && !document.querySelector(':popover-open')) {
        event.preventDefault()
        event.stopPropagation()
        void toggleEdit()
      }
    }}>
    <div class={styles.toolbar}>
      {props.heading}
      <button ref={toggle} class={editing() ? styles.button : styles.quiet} data-edit-layout type="button" aria-pressed={editing() ? 'true' : 'false'}
        aria-busy={pending() ? 'true' : 'false'} onClick={() => void toggleEdit()}>{editing() ? 'Done editing' : 'Edit layout'}</button>
      <Show when={editing()}>
        <Menu label="Add panel" disabled={!missing().length}
          items={missing().map(def => ({ id: def.id, label: def.title, onSelect: () => addPanel(def.id) }))} />
        <button class={styles.button} type="button" onClick={() => { store(untrack(defaultLayout)); announce('Default layout restored.') }}>
          Reset layout
        </button>
      </Show>
      <Show when={error()}><span role="alert">Could not change the layout. Try again.</span></Show>
    </div>
    <span class={styles.srOnly} role="status">{announcement()}</span>
    <For each={order()}>{id => {
      const state = () => layout().find(section => section.id === id)!
      const tree = () => state().tree
      const count = () => Object.keys(tree().panels).length
      return <section id={`sec-${id}`} class={styles.section} aria-labelledby={`title-${id}`} tabindex={-1}>
        <div class={styles.heading}>
          <h2 id={`title-${id}`}>
            <button type="button" class={flow && id === 'top' && !editing() && state().open ? styles.summaryFold : styles.disclosure}
              aria-expanded={state().open ? 'true' : 'false'} aria-label={flow && id === 'top' ? 'Overview summary' : undefined}
              aria-controls={`dock-${id}`} onClick={() => update(id, old => ({ ...old, open: !old.open }))}>
              <Icon data={state().open ? ChevronDown : ChevronRight} />
              <span class={flow && id === 'top' && !editing() && state().open ? styles.srOnly : undefined}>{names.get(id)}</span>
            </button>
          </h2>
          <Show when={!state().open}><span>{count()} panels</span></Show>
          <Show when={editing()}>
            {moveButton(`Move ${names.get(id)} section up`, -1, order()[0] === id, () => moveSection(id, -1), true)}
            {moveButton(`Move ${names.get(id)} section down`, 1, order().at(-1) === id, () => moveSection(id, 1), true)}
          </Show>
        </div>
        <div id={`dock-${id}`} hidden={!state().open} class={styles.dock} data-height={state().height}
          style={{ height: flow ? undefined : `${state().height}px` }}>
          <StaticDock node={tree().grid.root} axis={tree().grid.orientation} width={width()} height={state().height} path={[]} flow={flow}
            editing={editing()} actions={{
              title,
              mount: (panel, host, stacked) => connect(panel, id, host, stacked),
              select: (group, panel) => update(id, section => ({ ...section, tree: selectTab(section.tree, group, panel) })),
              drag: (panel, event) => startDrag(panel, id, event),
              dragEnd: () => { drag = undefined },
              drop: (event, target) => drop(id, event, target),
              resize: (path, at, delta) => update(id, section => {
                const fitted = fitGrid(section.tree, untrack(width), section.height)
                return { ...section, tree: { ...fitted, grid: {
                  ...fitted.grid, root: resizeSplit(fitted.grid.root, path, fitted.grid.orientation, at, delta),
                } } }
              }),
            }} />
        </div>
        <Show when={!count() && state().open}><p class={styles.empty}>No panels in this section.</p></Show>
      </section>
    }}</For>
  </div>
}
