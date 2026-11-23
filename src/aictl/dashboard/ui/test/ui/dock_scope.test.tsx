// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush } from 'solid-js'
import DockScreen from '../../src/panels/DockScreen'
import { sections } from '../../src/panels/layout'
import { overviewA } from '../../src/panels/overview/a'
import { overviewB } from '../../src/panels/overview/b'
import { liveOnly, LOCAL_ONLY, RECORDED, shownInScope } from '../../src/panels/scopeRules'
import type { NodeScope, PanelContext, PanelDef } from '../../src/panels/types'
import { installDom, mount } from './dom'

const board = [...overviewA, ...overviewB]
const byId = new Map(board.map(def => [def.id, def]))

class SeeAll {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) { this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
  unobserve() {}
  disconnect() {}
}

const view = (id: string) => () => Promise.resolve({ default: () => <p data-view={id}>{id}</p> })
const def = (id: string, sources: PanelDef['sources']): PanelDef => ({
  id, title: `Title ${id}`, kind: 'custom', sources, columns: [], actions: [], defaultSize: 'medium', requiredCapabilities: [], load: view(id),
})
// One panel per section of the board, with the sources of the real panel of that id.
const panels = ['kpis', 'tokens', 'alerts', 'cpu', 'findings', 'settings', 'coverage'].map(id => def(id, byId.get(id)!.sources))

function screen(scope: NodeScope) {
  const ctx = { client: { store: { meta: { capabilities: {} } } }, scope: () => scope } as unknown as PanelContext
  let order: string[] = []
  const { host, dispose } = mount(() => <DockScreen screen="board" definitions={panels} ctx={ctx}
    order={ids => { order = ids }} shown={panel => shownInScope(panel, scope)} />)
  flush()
  return { host, dispose, order: () => order }
}

beforeEach(() => {
  installDom()
  Object.assign(globalThis, { IntersectionObserver: SeeAll })
})

describe('BRD-SCOPE-01 · A panel with nothing to say in the scope is not drawn', () => {
  it('draws a live-only panel on This node and leaves it out in fleet scope', () => {
    const local = screen('local')
    expect(local.host.querySelector('#p-alerts')).not.toBeNull()
    expect(local.host.querySelector('#sec-effect')).not.toBeNull()
    expect(local.order()).toContain('effect')
    local.dispose()

    const fleet = screen('fleet')
    expect(fleet.host.querySelector('#p-alerts')).toBeNull()
    expect(fleet.host.querySelector('#p-findings')).toBeNull()
    // The Machine section keeps the panel that reads recorded history.
    expect(fleet.host.querySelector('#p-cpu')).not.toBeNull()
    fleet.dispose()
  })

  it('leaves a section with no drawn panel off the page and out of the rail', () => {
    const fleet = screen('fleet')
    expect(fleet.host.querySelector('#sec-effect')).toBeNull()
    expect(fleet.host.textContent).not.toContain('No panels in this section')
    expect(fleet.order()).not.toContain('effect')
    expect(fleet.order()).toContain('resources')
    fleet.dispose()
  })

  it('shows every panel again in the editor, with the empty section kept as a drop target', () => {
    const fleet = screen('fleet')
    ;(fleet.host.querySelector('[data-edit-layout]') as HTMLButtonElement).click()
    return new Promise<void>(resolve => setTimeout(resolve, 50)).then(() => {
      flush()
      expect(fleet.host.querySelector('#sec-effect')).not.toBeNull()
      expect(fleet.host.querySelector('#p-findings')).toBeNull()
      fleet.dispose()
    })
  })
})

describe('BRD-SCOPE-02 · Every board panel has a decided scope (guard)', () => {
  it('hides exactly the panels that read only this node in fleet and node scope', () => {
    // A new panel that reads only this node's stream joins this list on purpose, not by accident.
    const hidden = (scope: NodeScope) => board.filter(panel => !shownInScope(panel, scope)).map(panel => panel.id).sort()
    expect(hidden('fleet')).toEqual(['alerts', 'findings', 'settings'])
    expect(hidden('node')).toEqual(hidden('fleet'))
    expect(hidden('local')).toEqual([])
  })

  it('names only real board panels in the exception lists, and only where the sources do not already tell', () => {
    const placed = new Set(sections.board.flatMap(section => section.bands.flat().map(panel => panel.id)))
    for (const id of Object.keys(LOCAL_ONLY)) {
      expect([id, placed.has(id), liveOnly(byId.get(id)!.sources)]).toEqual([id, true, false])
    }
    for (const id of Object.keys(RECORDED)) {
      expect([id, placed.has(id), liveOnly(byId.get(id)!.sources)]).toEqual([id, true, true])
    }
  })

  it('leaves no board section empty in fleet scope except Settings in effect', () => {
    const empty = sections.board.filter(section =>
      !section.bands.flat().some(panel => byId.has(panel.id) && shownInScope(byId.get(panel.id)!, 'fleet'))).map(section => section.id)
    expect(empty).toEqual(['effect'])
  })
})

describe('BRD-SIZE-01 · A panel takes the room its content needs', () => {
  it('uses the layout height as the most a panel takes, never the least', () => {
    const local = screen('local')
    const cap = sections.board.flatMap(section => section.bands.flat()).find(panel => panel.id === 'coverage')!.height
    const panel = local.host.querySelector<HTMLElement>('#p-coverage > section')!
    expect(panel.style.maxBlockSize).toBe(`${cap}px`)
    expect(panel.style.minBlockSize).toBe('')
    expect(panel.hasAttribute('data-capped')).toBe(true)
    // A mounted panel keeps no placeholder height.
    expect(local.host.querySelector<HTMLElement>('#p-coverage')!.style.minBlockSize).toBe('')
    // A summary without a layout height has neither a cap nor a floor.
    const kpis = local.host.querySelector<HTMLElement>('#p-kpis > section')!
    expect([kpis.style.maxBlockSize, kpis.style.minBlockSize]).toEqual(['', ''])
    local.dispose()
  })
})
