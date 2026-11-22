import { createEffect, createSignal, For, Show } from 'solid-js'
import type { DetailNodes } from '../data/contract.gen'
import { json } from '../panels/data'
import { Icon } from '../ui/Icon'
import type { NodeScope } from '../panels/types'
import styles from './Shell.module.css'

export const scopeLabel = (scope: NodeScope, node?: string | null) =>
  scope === 'local' ? 'This node' : scope === 'fleet' ? 'All nodes' : node === 'legacy' ? 'Untagged node' : node || 'Named node'

type Nodes = Extract<DetailNodes, { view: 'nodes' }>
export function NodePicker(props: { scope: NodeScope; nodeId: string | null; select: (scope: NodeScope, node?: string) => void }) {
  const [open, setOpen] = createSignal(false)
  const [typed, setTyped] = createSignal('')
  const [visited, setVisited] = createSignal<readonly string[]>([])
  const [nodes, setNodes] = createSignal<Nodes>()
  const [error, setError] = createSignal(false)
  let popup!: HTMLElement, trigger!: HTMLButtonElement
  createEffect(() => props.nodeId, node => {
    if (node) setVisited(old => [node, ...old.filter(id => id !== node)].slice(0, 20))
  })
  createEffect(open, visible => {
    if (!visible) return
    const request = new AbortController()
    setError(false)
    void json<Nodes>('/api/board/nodes?view=nodes&scope=fleet', { signal: request.signal }).then(value => {
      if (value.view !== 'nodes' || value.scope !== 'fleet' || !Array.isArray(value.rows)) throw new Error('Invalid node list')
      if (!request.signal.aborted) setNodes(value)
    }).catch(() => { if (!request.signal.aborted) setError(true) })
    return () => request.abort()
  })
  const choose = (scope: NodeScope, node?: string) => {
    popup.hidePopover()
    trigger.focus()
    props.select(scope, node)
  }
  return <>
    <button ref={trigger} class={styles.button} type="button" popovertarget="node-picker"
      onClick={() => { if (!popup.matches(':popover-open')) setTyped(props.nodeId ?? '') }}
      aria-controls="node-picker" aria-expanded={open() ? 'true' : 'false'}><Icon glyph="node" />
      <span><span class={styles.srOnly}>Node scope: </span>{scopeLabel(props.scope, props.nodeId)}</span><Icon glyph="down" small /></button>
    <section ref={popup} id="node-picker" class={styles.popup} popover="auto" aria-label="Choose node scope"
      onToggle={event => setOpen(event.newState === 'open')}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); popup.hidePopover(); trigger.focus() }
      }}>
      <div class={styles.controls}>
        <button class={styles.secondary} type="button" onClick={() => choose('local')}>This node</button>
        <button class={styles.secondary} type="button" onClick={() => choose('fleet')}>All nodes</button>
      </div>
      <Show when={nodes()?.local_node?.node_id}>{id => <p>This node: <code>{id()}</code></p>}</Show>
      <form class={styles.controls} onSubmit={event => {
        event.preventDefault()
        if (typed().trim()) choose('node', typed().trim().toLowerCase())
      }}>
        <label>Node ID <input class={styles.input} value={typed()} onInput={event => setTyped(event.currentTarget.value)} /></label>
        <button class={styles.primary} type="submit" disabled={!typed().trim()}>Open node</button>
      </form>
      <Show when={error()}><p role="status">Could not list nodes. You can still enter a node ID.</p></Show>
      <Show when={!error() && !nodes()}><p role="status">Finding nodes…</p></Show>
      <Show when={nodes()?.rows.length === 0}><p>No reported nodes.</p></Show>
      <Show when={nodes()?.fleet_available === false}><p>Fleet history is not available from this source.</p></Show>
      <Show when={nodes()?.truncated}><p>Not all nodes are listed. You can still enter a node ID.</p></Show>
      <div class={styles.controls}>
        <For each={[...new Set([...visited(), ...(nodes()?.rows.map(row => row.node_id) ?? []), 'legacy'])]}>{id => {
          const date = () => nodes()?.rows.find(row => row.node_id === id)?.captured_at
          return <button class={styles.button} type="button" onClick={() => choose('node', id)}>
            {scopeLabel('node', id)}<Show when={date() != null}> — last report {new Date(date()! * 1000).toLocaleString()}</Show>
          </button>
        }}</For>
      </div>
    </section>
  </>
}
