// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush } from 'solid-js'
import { createBoxes } from '../../src/ui/Box'
import type { PanelContext, PanelDef } from '../../src/panels/types'
import { HealthContext } from '../../src/panels/health/healthData'
import { Facts, fact, field, HealthBox, HealthTable, Reasons } from '../../src/panels/health/HealthParts'
import { HealthMeter, StatTiles } from '../../src/panels/health/HealthVisuals'
import { bodyRows, headerTexts, installDom, layoutHeaders, mount } from './dom'

const ctx = { metadata: () => undefined } as unknown as PanelContext
type Row = { id: string; name: string; size?: number; note?: string; hidden?: string }
const rows: Row[] = [{ id: 'a', name: 'alpha', size: 0, note: '' }, { id: 'b', name: 'beta', note: 'seen' }]
const cell = (host: Element, row: number, column: string) =>
  bodyRows(host)[row].querySelector<HTMLElement>(`td[data-col="${column}"]`)!

beforeEach(() => { installDom(); layoutHeaders() })

describe('Health tables and values', () => {
  it('drops a column no row reports and marks the three kinds of empty value differently', () => {
    const { host, dispose } = mount(() => <HealthTable ctx={ctx} label="Things" rows={rows} rowId={row => row.id}
      fields={[field('name', 'Name'), field('size', 'Size'), field('note', 'Note'), field('hidden', 'Compressed size')]} />)
    expect(headerTexts(host)).toEqual(['name', 'size', 'note'])
    expect(cell(host, 0, 'size').textContent).toContain('0')
    expect(cell(host, 1, 'size').textContent).toContain('n/a')
    expect(cell(host, 1, 'size').title).toBe('Size: Not reported by this source')
    expect(cell(host, 0, 'note').textContent).toContain('none')
    expect(host.textContent).not.toContain('Not available from this source')
    dispose()
  })

  it('shows n/a with its reason in a fact and in a tile instead of a long sentence', () => {
    const { host, dispose } = mount(() => <>
      <Facts ctx={ctx} items={[fact('Threads', undefined), fact('Pid', 0), fact('Scope', '')]} />
      <StatTiles items={[{ label: 'Rows dropped' }, { label: 'Tables', value: 0 }]} />
    </>)
    const facts = Array.from(host.querySelectorAll('dl dd')).map(dd => dd.textContent?.trim())
    expect(facts.slice(0, 3)).toEqual(['n/a', '0', 'none'])
    expect(host.querySelector('dd[title]')?.getAttribute('title')).toBe('Threads: Not reported by this source')
    expect(host.querySelector('[title="Rows dropped: Not reported by this source"]')).not.toBeNull()
    expect(host.textContent).not.toContain('Not available from this source')
    dispose()
  })

  it('shows a meter only for a reported value', () => {
    const { host, dispose } = mount(() => <><HealthMeter label="Cluster CPU" /><HealthMeter label="Host CPU" value={0} /></>)
    expect(host.querySelectorAll('meter').length).toBe(1)
    expect(host.textContent).toContain('Cluster CPU n/a')
    expect(host.textContent).not.toContain('Not available from this source')
    dispose()
  })

  it('lists the reasons of a status with their level', () => {
    const { host, dispose } = mount(() => <Reasons reasons={[{ level: 'warning', text: '9,876 rows dropped in the last 24 h' },
      { level: 'pending', text: 'Store client: unknown.' }]} />)
    expect(Array.from(host.querySelectorAll('li')).map(li => li.textContent)).toEqual([
      'Warning 9,876 rows dropped in the last 24 h', 'Pending Store client: unknown.'])
    dispose()
  })
})

describe('Health panel controls', () => {
  const def = { id: 'storeHealth', title: 'Store, capacity and requests' } as PanelDef
  const mountBox = () => {
    const boxes = createBoxes('aictl-pref-health-boxes')
    const view = mount(() => <HealthContext value={{ boxes } as never}><HealthBox def={def}><p>content</p></HealthBox></HealthContext>)
    return { ...view, boxes }
  }

  it('gives a panel fold, expand, full screen and hide controls, kept under one key for the screen', () => {
    const { host, dispose, boxes } = mountBox()
    const controls = Array.from(host.querySelectorAll('[data-box-control]')).map(button => button.getAttribute('data-box-control'))
    expect(controls).toEqual(['fold', 'expand', 'full', 'hide'])
    host.querySelector<HTMLButtonElement>('[data-box-control="fold"]')!.click()
    flush()
    expect(host.textContent).not.toContain('content')
    expect(JSON.parse(localStorage.getItem('aictl-pref-health-boxes')!)).toMatchObject({ folded: ['storeHealth'] })
    expect(boxes.is('fold', 'storeHealth')).toBe(true)
    dispose()
  })

  it('leaves a button to bring a hidden panel back', () => {
    const { host, dispose } = mountBox()
    host.querySelector<HTMLButtonElement>('[data-box-control="hide"]')!.click()
    flush()
    expect(host.textContent).not.toContain('content')
    host.querySelector<HTMLButtonElement>('button')!.click()
    flush()
    expect(host.textContent).toContain('content')
    dispose()
  })
})
