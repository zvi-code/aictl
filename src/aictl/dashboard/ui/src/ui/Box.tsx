import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { emptyBoxes, hiddenBoxes, readBoxes, reduceBoxes, writeBoxes, type BoxAction, type BoxEvent, type BoxState } from './boxState'
import { Icon, type Glyph } from './Icon'
import { Menu } from './Menu'
import styles from './Box.module.css'

export type { BoxAction }
export type Boxes = ReturnType<typeof createBoxes>

const storage = () => { try { return localStorage } catch { return undefined } }

/**
 * The boxes of one screen, kept per browser under `key`. Each Box registers its label so a hidden
 * box can be brought back from the one "Hidden (n)" control of the screen.
 */
export function createBoxes(key: string) {
  const [state, setState] = createSignal<BoxState>(readBoxes(storage(), key) ?? emptyBoxes())
  const [labels, setLabels] = createSignal<ReadonlyMap<string, string>>(new Map())
  const send = (event: BoxEvent) => {
    const next = reduceBoxes(state(), event)
    if (next === state()) return
    setState(next)
    writeBoxes(storage(), key, next)
  }
  const register = (id: string, label: string) => setLabels(old => old.get(id) === label ? old : new Map(old).set(id, label))
  const hidden = createMemo(() => hiddenBoxes(state(), labels()))
  return {
    state, send, register, hidden,
    is: (action: Exclude<BoxAction, 'full'>, id: string) => state()[action === 'fold' ? 'folded' : action === 'expand' ? 'expanded' : 'hidden'].includes(id),
    full: (id: string) => state().full === id,
  }
}

const words: Record<BoxAction, [on: string, off: string, glyphOn: Glyph, glyphOff: Glyph]> = {
  fold: ['Unfold', 'Fold', 'down', 'fold'],
  expand: ['Restore the size of', 'Expand', 'shrink', 'expand'],
  full: ['Exit full screen:', 'Full screen:', 'windowed', 'fullscreen'],
  hide: ['Show', 'Hide', 'eyeOff', 'eyeOff'],
}
const ALL: readonly BoxAction[] = ['fold', 'expand', 'full', 'hide']

/** Icon-only controls of a box, for its header line: fold, expand, full screen and hide. */
export function BoxControls(props: { boxes: Boxes; id: string; label: string; controls?: readonly BoxAction[]; corner?: boolean }) {
  const active = (action: BoxAction) => action === 'full' ? props.boxes.full(props.id) : props.boxes.is(action, props.id)
  return <span class={styles.controls} data-corner={props.corner ? 'true' : undefined} data-box-controls>
    <For each={props.controls ?? ALL}>{action => {
      const text = () => `${words[action][active(action) ? 0 : 1]} ${props.label}`
      return <button type="button" class={styles.control} data-box-control={action} aria-label={text()} title={text()}
        aria-pressed={action === 'hide' ? undefined : active(action) ? 'true' : 'false'}
        onClick={() => props.boxes.send({ type: action, id: props.id })}>
        <Icon glyph={words[action][active(action) ? 2 : 3]} small /></button>
    }}</For>
  </span>
}

/** The one control that lists the hidden boxes of a screen and brings each back. */
export function HiddenBoxes(props: { boxes: Boxes }) {
  return <Show when={props.boxes.hidden().length}>
    <span class={styles.hidden}>
      <Menu label={`Hidden (${props.boxes.hidden().length})`}
        items={props.boxes.hidden().map(box => ({ id: box.id, label: `Show ${box.label}`, onSelect: () => props.boxes.send({ type: 'restore', id: box.id }) }))} />
    </span>
  </Show>
}

/**
 * A box that can fold to its header line, expand to the room of its container, fill the screen or
 * hide. `head` stays when folded; without it the label is the folded line. With `corner`, the
 * controls sit at the top end of the box; otherwise the caller puts BoxControls in its own header.
 */
export function Box(props: {
  boxes: Boxes; id: string; label: string; class?: string; controls?: readonly BoxAction[]; corner?: boolean
  head?: JSX.Element; children: JSX.Element
}) {
  createEffect(() => [props.id, props.label] as const, ([id, label]) => { props.boxes.register(id, label) })
  const [element, setElement] = createSignal<HTMLElement>()
  const full = () => props.boxes.full(props.id)
  const folded = () => props.boxes.is('fold', props.id)
  // Full screen uses the browser's full screen when it is allowed, else covers the window; Escape returns.
  createEffect(() => ({ full: full(), node: element() }), current => {
    const node = current.node
    if (!node || !current.full) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    let native = false, left = false
    const leave = () => { if (document.fullscreenElement === node) void document.exitFullscreen().catch(() => undefined) }
    if (typeof node.requestFullscreen === 'function' && !document.fullscreenElement) {
      // The browser may enter full screen after the reader already left it (Escape right away): leave again.
      node.requestFullscreen().then(() => { native = true; if (left) leave() }, () => { /* the window cover stays */ })
    }
    node.focus({ preventScroll: true })
    const changed = () => { if (native && document.fullscreenElement !== node) props.boxes.send({ type: 'escape' }) }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // A menu or popover open inside the box closes first; otherwise Escape leaves full screen and
      // goes no further, so the drawer around the box stays open.
      if (event.target instanceof Element && event.target.closest(':popover-open')) return
      event.preventDefault()
      event.stopPropagation()
      props.boxes.send({ type: 'escape' })
    }
    document.addEventListener('fullscreenchange', changed)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('fullscreenchange', changed)
      document.removeEventListener('keydown', escape, true)
      left = true
      leave()
      queueMicrotask(() => {
        const control = node.querySelector<HTMLElement>('[data-box-control="full"]')
        ;(control ?? (opener?.isConnected ? opener : undefined))?.focus({ preventScroll: true })
      })
    }
  })
  onCleanup(() => { if (full()) props.boxes.send({ type: 'escape' }) })
  return <Show when={!props.boxes.is('hide', props.id)}>
    <section ref={setElement} class={`${styles.box}${props.class ? ` ${props.class}` : ''}`} aria-label={props.label} tabindex={-1}
      data-box={props.id} data-box-folded={folded() ? 'true' : 'false'} data-box-expanded={props.boxes.is('expand', props.id) ? 'true' : 'false'}
      data-box-full={full() ? 'true' : 'false'}>
      <Show when={props.corner}><BoxControls boxes={props.boxes} id={props.id} label={props.label} controls={props.controls} corner /></Show>
      {props.head}
      <Show when={!folded()} fallback={<Show when={!props.head}><span class={styles.foldedLine}>{props.label}</span></Show>}>
        {props.children}
      </Show>
    </section>
  </Show>
}
