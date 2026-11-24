// ─── A flow between two sets of states: nodes at the left and at the right, a band per pair, thickness by count ─
// Both columns share one linear scale: a node's height is the sum of its bands. Every node and band carries its own
// hover text (an SVG title); a node's name and its written value sit beside it.
import { For, Show } from 'solid-js'
import styles from './FlowDiagram.module.css'

/** `colour`: a CSS colour from the tokens (var(--color-chart-N)). */
export type FlowNode = { key: string; name: string; text: string; hover: string; colour?: string }
export type FlowLink = { from: string; to: string; value: number; hover: string; colour: string }

const W = 760, LABEL = 200, NODE = 10, GAP = 8, ROW = 30, PAD = 6
/** The least room a node takes, so that its two lines of label never meet the next node's. */
const SLOT = 28
const X0 = LABEL, X1 = W - LABEL - NODE

type Placed = FlowNode & { y: number; h: number; value: number }
/** Nodes of one column, top to bottom, each as tall as its bands and at least `SLOT` apart; nodes with no band are left out. */
function column(nodes: readonly FlowNode[], value: (key: string) => number, scale: number): Placed[] {
  let y = PAD
  return nodes.filter(node => value(node.key) > 0).map(node => {
    const h = Math.max(2, value(node.key) * scale)
    const placed = { ...node, y, h, value: value(node.key) }
    y += Math.max(h, SLOT) + GAP
    return placed
  })
}
const bottom = (nodes: Placed[]) => Math.max(0, ...nodes.map(node => node.y + Math.max(node.h, SLOT)))

/**
 * Where everything goes: the left and right nodes, and each band from its place on its left node to its place on its
 * right node. Bands leave a left node in the order of the right nodes and enter a right node in the order of the left.
 */
export function flowLayout(left: readonly FlowNode[], right: readonly FlowNode[], links: readonly FlowLink[]) {
  const shown = links.filter(link => link.value > 0)
  const sum = (key: string, side: 'from' | 'to') => shown.filter(link => link[side] === key).reduce((total, link) => total + link.value, 0)
  const total = shown.reduce((all, link) => all + link.value, 0)
  const count = Math.max(left.filter(node => sum(node.key, 'from')).length, right.filter(node => sum(node.key, 'to')).length, 1)
  const scale = total > 0 ? (Math.max(120, count * ROW) - GAP * (count - 1)) / total : 0
  const lefts = column(left, key => sum(key, 'from'), scale), rights = column(right, key => sum(key, 'to'), scale)
  const height = Math.max(bottom(lefts), bottom(rights)) + PAD
  const rank = (nodes: Placed[], key: string) => nodes.findIndex(node => node.key === key)
  const outAt = new Map(lefts.map(node => [node.key, node.y])), inAt = new Map(rights.map(node => [node.key, node.y]))
  const byRight = [...shown].sort((a, b) => rank(lefts, a.from) - rank(lefts, b.from) || rank(rights, a.to) - rank(rights, b.to))
  const bands = byRight.map(link => {
    const thick = Math.max(1, link.value * scale)
    return { ...link, thick, y0: 0, y1: 0 }
  })
  // Left side: within a left node, by the right node's order.
  for (const node of lefts) {
    for (const band of bands.filter(item => item.from === node.key).sort((a, b) => rank(rights, a.to) - rank(rights, b.to))) {
      band.y0 = outAt.get(node.key)!; outAt.set(node.key, band.y0 + band.thick)
    }
  }
  for (const node of rights) {
    for (const band of bands.filter(item => item.to === node.key)) { band.y1 = inAt.get(node.key)!; inAt.set(node.key, band.y1 + band.thick) }
  }
  return { width: W, height, left: lefts, right: rights, bands: bands.filter(band => rank(lefts, band.from) >= 0 && rank(rights, band.to) >= 0) }
}

/** The outline of a band: a ribbon from (X0+NODE, y0) to (X1, y1) with curved edges. */
const ribbon = (y0: number, y1: number, thick: number) => {
  const a = X0 + NODE, b = X1, mid = (a + b) / 2
  return `M${a},${y0} C${mid},${y0} ${mid},${y1} ${b},${y1} L${b},${y1 + thick} C${mid},${y1 + thick} ${mid},${y0 + thick} ${a},${y0 + thick} Z`
}

export function FlowDiagram(props: { name: string; title: string; axis: string; left: readonly FlowNode[]; right: readonly FlowNode[]
  links: readonly FlowLink[]; empty?: string; leftHead: string; rightHead: string }) {
  const layout = () => flowLayout(props.left, props.right, props.links)
  return <figure class={styles.figure} data-flow={props.name}>
    <figcaption class={styles.title}>{props.title}</figcaption>
    <Show when={layout().bands.length} fallback={<p class={styles.note}>{props.empty ?? 'Nothing to draw in this period.'}</p>}>
      <svg class={styles.svg} viewBox={`0 -18 ${layout().width} ${layout().height + 18}`} role="img" aria-label={props.title}>
        <text class={styles.head} x={X0 - 6} y={-6} text-anchor="end">{props.leftHead}</text>
        <text class={styles.head} x={X1 + NODE + 6} y={-6}>{props.rightHead}</text>
        <For each={layout().bands}>{band => <path class={styles.band} d={ribbon(band.y0, band.y1, band.thick)} style={{ fill: band.colour }}
          data-band={`${band.from}:${band.to}`}><title>{band.hover}</title></path>}</For>
        <For each={layout().left}>{node => <g data-node={`left:${node.key}`}>
          <rect class={styles.node} x={X0} y={node.y} width={NODE} height={node.h} style={node.colour ? { fill: node.colour } : undefined}>
            <title>{node.hover}</title></rect>
          <text x={X0 - 6} y={node.y + Math.max(node.h, SLOT) / 2 - 2} text-anchor="end">{node.name}<title>{node.hover}</title></text>
          <text class={styles.dim} x={X0 - 6} y={node.y + Math.max(node.h, SLOT) / 2 + 10} text-anchor="end" data-value>{node.text}</text>
        </g>}</For>
        <For each={layout().right}>{node => <g data-node={`right:${node.key}`}>
          <rect class={styles.node} x={X1} y={node.y} width={NODE} height={node.h} style={node.colour ? { fill: node.colour } : undefined}>
            <title>{node.hover}</title></rect>
          <text x={X1 + NODE + 6} y={node.y + Math.max(node.h, SLOT) / 2 - 2}>{node.name}<title>{node.hover}</title></text>
          <text class={styles.dim} x={X1 + NODE + 6} y={node.y + Math.max(node.h, SLOT) / 2 + 10} data-value>{node.text}</text>
        </g>}</For>
      </svg>
      <p class={styles.note}>{props.axis}</p>
    </Show>
  </figure>
}
