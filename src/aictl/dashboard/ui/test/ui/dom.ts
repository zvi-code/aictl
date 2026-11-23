// Shared jsdom set-up for component tests (*.test.tsx run with `@vitest-environment jsdom`).
import { flush } from 'solid-js'
import { render } from '@solidjs/web'
import type { JSX } from '@solidjs/web'

class NoResize { observe() {} unobserve() {} disconnect() {} }

export class MemoryStorage {
  data = new Map<string, string>()
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, String(value)) }
  removeItem(key: string) { this.data.delete(key) }
  clear() { this.data.clear() }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  get length() { return this.data.size }
}

export function installDom() {
  // Node's own localStorage global (empty without --localstorage-file) hides jsdom's.
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true })
  Object.assign(globalThis, { ResizeObserver: globalThis.ResizeObserver ?? NoResize })
  if (!globalThis.PointerEvent) {
    globalThis.PointerEvent = class extends MouseEvent {
      pointerId: number
      constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 0 }
    } as typeof PointerEvent
  }
  // The virtual table renders the rows that fit its scroll box.
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 400 } })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 800 } })
  globalThis.CSS ??= {} as typeof CSS
  CSS.escape ??= (value: string) => value.replace(/["\\[\]]/g, '\\$&')
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>
  // jsdom has no popover API: the menu only needs the open state and the toggle event.
  proto.showPopover ??= function (this: HTMLElement) {
    this.dataset.open = ''
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }))
  }
  proto.hidePopover ??= function (this: HTMLElement) {
    if (!('open' in this.dataset)) return
    delete this.dataset.open
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }))
  }
  if (!popoverMatches) {
    const matches = Element.prototype.matches
    popoverMatches = function (this: Element, selector: string) {
      if (selector === ':popover-open') return this instanceof HTMLElement && 'open' in this.dataset
      return matches.call(this, selector)
    }
    Element.prototype.matches = popoverMatches as typeof matches
  }
}
let popoverMatches: ((this: Element, selector: string) => boolean) | undefined

/** Each header cell is 100px wide, side by side in DOM order; a row is 20px; other boxes are 400px tall. */
export function layoutHeaders(width = 100) {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const cell = this.closest('th')
    if (!cell) {
      const height = this.matches('[data-row-ruler], tr') ? 20 : 400
      return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: height, width: 800, height, toJSON() {} } as DOMRect
    }
    const row = cell?.parentElement
    const index = cell && row ? Array.from(row.children).indexOf(cell) : 0
    const left = index * width
    return { x: left, y: 0, left, top: 0, right: left + width, bottom: 20, width, height: 20, toJSON() {} } as DOMRect
  }
}

export function mount(view: () => JSX.Element) {
  const host = document.createElement('div')
  document.body.append(host)
  const dispose = render(view, host)
  flush()
  return { host, dispose: () => { dispose(); host.remove() } }
}

export function pointer(target: EventTarget, type: string, clientX: number, extra: PointerEventInit = {}) {
  const Pointer = globalThis.PointerEvent ?? MouseEvent
  target.dispatchEvent(new Pointer(type, { bubbles: true, cancelable: true, clientX, button: 0, pointerId: 1, ...extra }))
  flush()
}

export function key(target: Element, keyName: string, init: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, ...init }))
  flush()
}

export const headerTexts = (host: Element) => Array.from(host.querySelectorAll('thead th')).map(th => th.getAttribute('data-col'))
export const bodyRows = (host: Element) => Array.from(host.querySelectorAll('tbody tr[data-row-id]'))
