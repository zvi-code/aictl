import type { SerializedDockview } from 'dockview-core'
import board from './layouts/board.json'
import health from './layouts/health.json'
import { object } from './data'
import type { PanelDef } from './types'

export type LayoutScreen = 'board' | 'health'
export type Placement = { id: string; span?: number; height?: number; params?: Record<string, unknown> }
type Section = { id: string; title: string; bands: Placement[][] }
export const sections: Record<LayoutScreen, Section[]> = { board: board.tree, health: health.tree }
export type SectionState = { id: string; open: boolean; height: number; tree: SerializedDockview; minHeights?: Record<string, number> }
export type DockNode = SerializedDockview['grid']['root']
export type GroupState = Exclude<DockNode['data'], DockNode[]>
export const isBranch = (node: DockNode): node is DockNode & { type: 'branch'; data: DockNode[] } =>
  node.type === 'branch' && Array.isArray(node.data)
export const isLeaf = (node: DockNode): node is DockNode & { type: 'leaf'; data: GroupState } =>
  node.type === 'leaf' && !Array.isArray(node.data)
export type Axis = `${SerializedDockview['grid']['orientation']}`
export const panelSizes = { small: 192, medium: 320, large: 432 }
export const crossAxis = (axis: Axis): Axis => axis === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL'
export const layoutKey = (screen: LayoutScreen) => `aictl-dock-${screen}-v1`

export function defaultSection(section: Section, defs: ReadonlyMap<string, PanelDef>, width: number): SectionState {
  const bands = section.bands.map(band => band.filter(panel => defs.has(panel.id))).filter(band => band.length)
  const heights = bands.map(band => Math.max(...band.map(({ id, height }) => height ?? panelSizes[defs.get(id)!.defaultSize])))
  const height = heights.reduce((total, size) => total + size, 0)
  const leaf = ({ id }: Placement, size: number): DockNode => ({
    type: 'leaf', size, data: { id, views: [id], activeView: id },
  })
  return { id: section.id, open: true, height, tree: {
    grid: { width, height, orientation: 'VERTICAL' as SerializedDockview['grid']['orientation'],
      root: { type: 'branch', size: width, data: bands.map((band, index) => {
        if (band.length === 1) return leaf(band[0], heights[index])
        const weight = band.reduce((total, panel) => total + (panel.span ?? 12 / band.length), 0)
        return { type: 'branch', size: heights[index], data: band.map(panel =>
          leaf(panel, Math.round(width * (panel.span ?? 12 / band.length) / weight))) }
      }) },
    },
    panels: Object.fromEntries(bands.flat().map(({ id, params }) =>
      [id, { id, title: defs.get(id)!.title, contentComponent: 'panel', tabComponent: 'label', params }])),
  } }
}

function minimum(node: DockNode, axis: Axis, parent: Axis): number {
  if (node.visible === false) return 0
  if (!isBranch(node)) return 100
  const split = crossAxis(parent)
  const children = node.data.map(child => minimum(child, axis, split))
  return split === axis ? children.reduce((total, size) => total + size, 0) : Math.max(0, ...children)
}

/** Project the saved integer weights into the current space with Dockview's minimum group size. */
export function splitSizes(nodes: readonly DockNode[], axis: Axis, space: number) {
  const min = nodes.map(node => minimum(node, axis, axis))
  const weight = nodes.reduce((sum, node) => sum + (node.visible === false ? 0 : node.size ?? 0), 0)
  const visible = nodes.filter(node => node.visible !== false).length
  const sizes = nodes.map((node, i) => node.visible === false ? 0 :
    Math.max(min[i], Math.round(weight ? (node.size ?? 0) * space / weight : space / visible)))
  let rest = space - sizes.reduce((sum, value) => sum + value, 0)
  for (let i = sizes.length - 1; i >= 0 && rest; i--) {
    if (nodes[i].visible === false) continue
    const change = Math.max(rest, min[i] - sizes[i])
    sizes[i] += change
    rest -= change
  }
  return sizes
}

export function fitGrid(tree: SerializedDockview, width: number, height: number): SerializedDockview {
  const axis = tree.grid.orientation
  const fit = (node: DockNode, axis: Axis, size: number, cross: number): DockNode => {
    if (!isBranch(node)) return { ...node, size: node.visible === false ? node.size : size }
    return { ...node, size, data: splitSizes(node.data, axis, cross)
      .map((childSize, i) => fit(node.data[i], crossAxis(axis), childSize, size)) }
  }
  return { ...tree, grid: {
    ...tree.grid, width, height,
    root: fit(tree.grid.root, axis, axis === 'HORIZONTAL' ? height : width, axis === 'HORIZONTAL' ? width : height),
  } }
}

export function resizeSplit(node: DockNode, path: readonly number[], axis: Axis, at: number, delta: number): DockNode {
  if (!isBranch(node)) return node
  const [head, ...tail] = path
  if (head != null) return { ...node, data: node.data.map((child, i) =>
    i === head ? resizeSplit(child, tail, crossAxis(axis), at, delta) : child) }
  const before = node.data[at], after = node.data[at + 1]
  if (!before || !after || before.visible === false || after.visible === false) return node
  const beforeSize = before.size ?? 0, afterSize = after.size ?? 0
  const change = Math.max(minimum(before, axis, axis) - beforeSize, Math.min(delta, afterSize - minimum(after, axis, axis)))
  return { ...node, data: node.data.map((child, i) =>
    i === at ? { ...child, size: beforeSize + change } : i === at + 1 ? { ...child, size: afterSize - change } : child) }
}

export function selectTab(tree: SerializedDockview, group: string, panel: string): SerializedDockview {
  const select = (node: DockNode): DockNode => {
    if (isBranch(node)) return { ...node, data: node.data.map(select) }
    return isLeaf(node) && node.data.id === group ? { ...node, data: { ...node.data, activeView: panel } } : node
  }
  return { ...tree, activeGroup: group, grid: { ...tree.grid, root: select(tree.grid.root) } }
}

/** The tree to draw: panels not shown leave their group, and a group or split left empty is
 * marked invisible. Positions stay, so paths into the saved tree still match. */
export function showOnly(node: DockNode, shown: (id: string) => boolean): DockNode {
  if (isBranch(node)) {
    const data = node.data.map(child => showOnly(child, shown))
    return data.some(child => child.visible !== false) ? { ...node, data } : { ...node, data, visible: false }
  }
  if (!isLeaf(node)) return node
  const views = node.data.views.filter(shown)
  if (views.length === node.data.views.length) return node
  if (!views.length) return { ...node, visible: false }
  const activeView = views.includes(node.data.activeView ?? '') ? node.data.activeView : views[0]
  return { ...node, data: { ...node.data, views, activeView } }
}

export function panelOrder(tree: SerializedDockview): string[] {
  const panels = (node: DockNode): string[] => isBranch(node) ? node.data.flatMap(panels) : isLeaf(node) ? node.data.views : []
  return panels(tree.grid.root)
}

/** Swap the two panel IDs in reading order, retaining the group geometry and panel parameters. */
export function reorderPanel(tree: SerializedDockview, id: string, step: -1 | 1): SerializedDockview {
  const order = panelOrder(tree), index = order.indexOf(id), neighbor = order[index + step]
  if (index < 0 || !neighbor) return tree
  const swap = (value: string) => value === id ? neighbor : value === neighbor ? id : value
  const visit = (node: DockNode): DockNode => {
    if (isBranch(node)) return { ...node, data: node.data.map(visit) }
    if (!isLeaf(node)) return node
    const views = node.data.views.map(swap)
    // Keep the moved panel selected, including when it lands in an inactive tab's slot.
    const activeView = views.includes(id) ? id : swap(node.data.activeView ?? node.data.views[0])
    return { ...node, data: { ...node.data, views, activeView } }
  }
  return { ...tree, grid: { ...tree.grid, root: visit(tree.grid.root) } }
}

export function restoreLayout(raw: string | null, screen: LayoutScreen): SectionState[] | undefined {
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    if (data.version !== 1 || data.screen !== screen || !Array.isArray(data.tree)) return
    const valid = new Set(sections[screen].map(section => section.id))
    for (const section of data.tree) {
      if (!valid.delete(section?.id) || typeof section.open !== 'boolean' || !Number.isInteger(section.height) ||
        section.height < 0 || section.height > 10000 || !object(section.tree?.panels) || !object(section.tree?.grid?.root) ||
        (section.minHeights !== undefined && (!object(section.minHeights) ||
          !Object.values(section.minHeights).every(n => Number.isInteger(n) && Number(n) >= 48 && Number(n) <= 10000)))) return
    }
    return valid.size ? undefined : data.tree as SectionState[]
  } catch { return undefined }
}

export function pruneDock(layout: SerializedDockview, known: ReadonlySet<string>, claimed: Set<string>): SerializedDockview {
  const panels = Object.fromEntries(Object.entries(layout.panels).filter(([id]) => known.has(id) && !claimed.has(id)))
  const used = new Set<string>()
  const groups = new Set<string>()
  type Node = SerializedDockview['grid']['root']
  const visit = (node: Node, depth: number): Node | undefined => {
    if (depth > 32 || !object(node) || node.size == null || !Number.isFinite(node.size) || node.size < 0) throw new Error('Invalid dock layout')
    if (node.type === 'branch' && Array.isArray(node.data)) {
      const data = node.data.flatMap(child => visit(child, depth + 1) ?? [])
      return data.length || depth === 0 ? { ...node, data } : undefined
    }
    if (node.type !== 'leaf' || !node.data || Array.isArray(node.data) || !Array.isArray(node.data.views) ||
        typeof node.data.id !== 'string' || groups.has(node.data.id)) {
      throw new Error('Invalid dock group')
    }
    const group = node.data
    const views = group.views.filter(id => {
      if (!Object.hasOwn(panels, id) || used.has(id)) return false
      if (panels[id]?.id !== id || panels[id].contentComponent !== 'panel') throw new Error('Invalid dock panel')
      used.add(id)
      return true
    })
    if (!views.length) return
    groups.add(group.id)
    return { ...node, data: { ...group, views, activeView: views.includes(group.activeView ?? '') ? group.activeView : views[0] } }
  }
  if (!['HORIZONTAL', 'VERTICAL'].includes(layout.grid.orientation) ||
      !Number.isFinite(layout.grid.height) || !Number.isFinite(layout.grid.width)) throw new Error('Invalid dock grid')
  const root = visit(layout.grid.root, 0)
  if (!root || root.type !== 'branch') throw new Error('Invalid dock root')
  used.forEach(id => claimed.add(id))
  return {
    grid: { ...layout.grid, root },
    panels: Object.fromEntries([...used].map(id => [id, panels[id]])),
    activeGroup: layout.activeGroup && groups.has(layout.activeGroup) ? layout.activeGroup : undefined,
  }
}
