import { createEffect, For, Show, untrack } from 'solid-js'
import { moveFocus } from '../ui/keyboard'
import { crossAxis, isBranch, isLeaf, splitSizes, type Axis, type DockNode, type GroupState } from './layout'
import styles from './DockScreen.module.css'

export type Drop = { group: string; position: 'left' | 'right' | 'top' | 'bottom' | 'center'; index?: number }
type Actions = {
  title(id: string): string
  mount(id: string, host: HTMLElement, stacked: boolean): () => void
  select(group: string, id: string): void
  drag(id: string, event: DragEvent): void
  dragEnd(): void
  drop(event: DragEvent, drop: Drop): void
  resize(path: number[], at: number, delta: number): void
}

function Slot(props: { id: string; mount: Actions['mount']; labelled: boolean }) {
  let host!: HTMLDivElement
  createEffect(() => props.labelled, stacked => props.mount(props.id, host, stacked))
  return <div class={styles.slot} id={`view-${props.id}`} role={props.labelled ? 'tabpanel' : undefined}
    aria-labelledby={props.labelled ? `tab-${props.id}` : undefined}
    ref={host} />
}

function Sash(props: { offset?: number; axis: Axis; resize: (delta: number) => void; label: string }) {
  let start: number | undefined
  const horizontal = () => props.axis === 'HORIZONTAL'
  const at = (event: PointerEvent) => horizontal() ? event.clientX : event.clientY
  return <button type="button" class={styles.sash} data-axis={props.axis} aria-label={props.label}
    style={props.offset == null ? undefined : horizontal() ? { left: `${props.offset}px` } : { top: `${props.offset}px` }}
    onPointerDown={event => {
      if (event.button !== 0 || !event.isPrimary) return
      start = at(event)
      event.currentTarget.setPointerCapture(event.pointerId)
    }}
    onPointerMove={event => {
      if (start != null) event.currentTarget.style.setProperty('--sash-delta', `${at(event) - start}px`)
    }}
    onLostPointerCapture={event => {
      start = undefined
      event.currentTarget.style.removeProperty('--sash-delta')
    }}
    onPointerUp={event => {
      if (start == null) return
      const delta = at(event) - start
      if (delta) props.resize(delta)
    }}
    onKeyDown={event => {
      const step = event.key === (horizontal() ? 'ArrowLeft' : 'ArrowUp') ? -16 :
        event.key === (horizontal() ? 'ArrowRight' : 'ArrowDown') ? 16 : 0
      if (!step) return
      event.preventDefault()
      event.stopPropagation()
      props.resize(step)
    }} />
}

function Group(props: { group: GroupState; actions: Actions; editing: boolean }) {
  const a = untrack(() => props.actions)
  const active = () => props.group.activeView ?? props.group.views[0]
  const multiple = () => props.group.views.length > 1
  const drop = (event: DragEvent) => {
    const group = event.currentTarget as HTMLElement
    const tab = (event.target as Element).closest<HTMLElement>('[data-dock-tab]')
    if (tab) {
      const index = props.group.views.indexOf(tab.dataset.dockTab!)
      const bounds = tab.getBoundingClientRect()
      return a.drop(event, { group: props.group.id, position: 'center',
        index: index + Number(event.clientX >= bounds.x + bounds.width / 2) })
    }
    const bounds = group.getBoundingClientRect()
    const x = (event.clientX - bounds.x) / bounds.width, y = (event.clientY - bounds.y) / bounds.height
    const edges = [['left', x], ['right', 1 - x], ['top', y], ['bottom', 1 - y]] as const
    const [edge, distance] = [...edges].sort((a, b) => a[1] - b[1])[0]
    a.drop(event, { group: props.group.id, position: distance < 0.25 ? edge : 'center' })
  }
  return <div class={styles.group} data-dock-group={props.group.id} data-stack={multiple() ? '' : undefined} onDrop={drop} onDragOver={event => {
    if (!props.editing || !event.dataTransfer?.types.includes('application/x-aictl-panel')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }}>
    <Show when={multiple()}><div class={styles.tabs} role="tablist"
      aria-label="Panels"
      onKeyDown={event => {
        const target = moveFocus(event, [...event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')], 'ArrowLeft', 'ArrowRight')
        if (target) {
          event.stopPropagation()
          a.select(props.group.id, target.dataset.dockTab!)
        }
      }}>
      <For each={props.group.views}>{id => <button type="button" class={styles.tab} data-dock-tab={id}
        id={`tab-${id}`} draggable={props.editing ? 'true' : 'false'} role="tab"
        aria-selected={id === active() ? 'true' : 'false'}
        aria-controls={`view-${id}`}
        tabindex={id !== active() ? -1 : 0} data-selected={id === active() ? '' : undefined}
        onClick={() => a.select(props.group.id, id)} onDragStart={event => a.drag(id, event)} onDragEnd={a.dragEnd}>
        {a.title(id)}
      </button>}</For>
    </div></Show>
    <For each={props.group.views}>{id => <Show when={id === active()}
      fallback={<div id={`view-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden />}>
      <Slot id={id} mount={a.mount} labelled={multiple()} />
    </Show>}</For>
  </div>
}

export function StaticDock(props: {
  node: DockNode; axis: Axis; width: number; height: number; path: number[]; actions: Actions; flow: boolean; editing: boolean
}) {
  const branch = () => isBranch(props.node) ? props.node : undefined
  const leaf = () => isLeaf(props.node) ? props.node : undefined
  const horizontal = () => props.axis === 'HORIZONTAL'
  const sizes = () => splitSizes(branch()?.data ?? [], props.axis, horizontal() ? props.width : props.height)
  return <>
    <Show when={branch()}>{node => <div class={styles.split} data-axis={props.axis} style={props.flow ? {
      '--dock-columns': horizontal() ? node().data.map(child => child.visible === false ? '0fr' :
        `minmax(0, ${Math.max(1, child.size ?? 0)}fr)`).join(' ') : undefined,
    } : {
      [horizontal() ? 'grid-template-columns' : 'grid-template-rows']: sizes().map(size => `${size}px`).join(' '),
    }}>
      <For each={node().data.map((_, i) => i)}>{i => <div class={styles.cell} hidden={node().data[i].visible === false}
        style={props.flow ? undefined : { [horizontal() ? 'grid-column' : 'grid-row']: i + 1 }}>
        <StaticDock node={node().data[i]} axis={crossAxis(props.axis)} actions={props.actions} flow={props.flow} editing={props.editing}
          width={horizontal() ? sizes()[i] : props.width} height={horizontal() ? props.height : sizes()[i]} path={[...props.path, i]} />
        <Show when={props.flow && props.editing && horizontal() && node().data[i].visible !== false &&
          node().data[i + 1]?.visible !== false && node().data[i + 1]}>
          <Sash axis={props.axis} label={`Resize columns ${i + 1} and ${i + 2}`}
            resize={delta => props.actions.resize(props.path, i, delta)} />
        </Show>
      </div>}</For>
      <Show when={!props.flow && props.editing}>
        <For each={node().data.slice(1).map((_, i) => i)}>{i => <Show when={sizes()[i] && sizes()[i + 1]}>
          <Sash axis={props.axis} offset={sizes().slice(0, i + 1).reduce((sum, size) => sum + size, 0)}
            label={`Resize ${horizontal() ? 'columns' : 'rows'} ${i + 1} and ${i + 2}`}
            resize={delta => props.actions.resize(props.path, i, delta)} />
        </Show>}</For>
      </Show>
    </div>}</Show>
    <Show when={leaf()}>{node => <Group group={node().data} actions={props.actions} editing={props.editing} />}</Show>
  </>
}
