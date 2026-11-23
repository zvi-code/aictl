// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush } from 'solid-js'
import { Table } from '../../src/ui/Table'
import type { Field } from '../../src/ui/tableModel'
import { tableKey } from '../../src/ui/columnState'
import { bodyRows, headerTexts, installDom, key, layoutHeaders, mount, pointer } from './dom'

type Agent = { id: string; name: string; status: string; tokens: number }
const fields: Field<Agent>[] = [
  { id: 'name', label: 'Name', read: row => row.name },
  { id: 'status', label: 'Status', read: row => row.status },
  { id: 'tokens', label: 'Tokens', read: row => row.tokens },
]
const rows: Agent[] = [
  { id: 'a', name: 'alpha', status: 'running', tokens: 30 },
  { id: 'b', name: 'beta', status: 'idle', tokens: 10 },
  { id: 'c', name: 'gamma', status: 'ended', tokens: 20 },
]
const stored = (label: string) => JSON.parse(localStorage.getItem(tableKey(label)) ?? 'null')
const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.getAttribute('data-col'))
const headerButton = (host: Element, id: string) => host.querySelector<HTMLButtonElement>(`th[data-col="${id}"] button`)!
const columnsButton = (host: Element) => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"][data-columns]')!

beforeEach(() => { installDom(); layoutHeaders() })

describe.each([['virtual', undefined], ['paged', 10]] as const)('TBL-COL-10 · %s table columns', (_mode, pageSize) => {
  it('removes a hidden column from the header and every row, in the stored order', () => {
    localStorage.setItem(tableKey('Agents'), JSON.stringify({ order: ['tokens', 'name', 'status'], hidden: ['status'], widths: {} }))
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    expect(headerTexts(host)).toEqual(['tokens', 'name'])
    expect(host.textContent).not.toContain('running')
    expect(bodyRows(host).length).toBe(3)
    for (const row of bodyRows(host)) expect(cells(row)).toEqual(['tokens', 'name'])
    expect(Array.from(host.querySelectorAll('colgroup col')).map(col => col.getAttribute('data-col'))).toEqual(['tokens', 'name'])
    dispose()
  })

  it('hides a column from its header, counts it on the columns control and shows it again from the menu', () => {
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    expect(columnsButton(host).querySelector('[data-hidden-count]')).toBeNull()
    const hide = host.querySelector<HTMLButtonElement>('th[data-col="status"] button[aria-label="Hide Status column"]')!
    expect(hide.title).toBe('Hide Status column')
    hide.click()
    expect(headerTexts(host)).toEqual(['name', 'tokens'])
    expect(cells(bodyRows(host)[0])).toEqual(['name', 'tokens'])
    expect(stored('Agents')).toMatchObject({ hidden: ['status'] })
    expect(columnsButton(host).querySelector('[data-hidden-count]')?.textContent).toBe('1')
    expect(columnsButton(host).getAttribute('aria-label')).toBe('Agents columns, 1 hidden')
    expect(document.activeElement).toBe(columnsButton(host))

    columnsButton(host).click()
    const items = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]'))
    expect(items.map(item => [item.textContent, item.getAttribute('aria-checked')])).toEqual([
      ['Name', 'true'], ['Status', 'false'], ['Tokens', 'true']])
    items[1].click()
    expect(headerTexts(host)).toEqual(['name', 'status', 'tokens'])
    expect(columnsButton(host).querySelector('[data-hidden-count]')).toBeNull()
    dispose()
  })

  it('never hides the last visible column', () => {
    localStorage.setItem(tableKey('Agents'), JSON.stringify({ hidden: ['status', 'tokens'] }))
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    expect(host.querySelector('th[data-col="name"] button[aria-label="Hide Name column"]')).toBeNull()
    columnsButton(host).click()
    const name = host.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!
    expect(name.getAttribute('aria-disabled')).toBe('true')
    name.click()
    expect(headerTexts(host)).toEqual(['name'])
    dispose()
  })

  it('resets order, widths and visibility from the menu', () => {
    localStorage.setItem(tableKey('Agents'), JSON.stringify({ order: ['tokens', 'status', 'name'], hidden: ['status'], widths: { name: 50 } }))
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    columnsButton(host).click()
    host.querySelector<HTMLButtonElement>('[role="menuitem"][data-reset]')!.click()
    expect(headerTexts(host)).toEqual(['name', 'status', 'tokens'])
    expect(host.querySelector('table')!.hasAttribute('data-sized')).toBe(false)
    expect(localStorage.getItem(tableKey('Agents'))).toBeNull()
    dispose()
  })

  it('resizes from the keyboard and resets with Home', () => {
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    const grip = host.querySelector<HTMLElement>('th[data-col="status"] [role="separator"]')!
    expect(grip.getAttribute('aria-orientation')).toBe('vertical')
    expect(grip.getAttribute('aria-label')).toBe('Resize Status column')
    expect(grip.tabIndex).toBe(0)
    key(grip, 'ArrowLeft')
    // The first resize fixes every visible column at its measured width.
    expect(stored('Agents').widths).toEqual({ name: 100, status: 84, tokens: 100 })
    expect(host.querySelector('table')!.hasAttribute('data-sized')).toBe(true)
    expect(host.querySelector<HTMLElement>('col[data-col="status"]')!.style.inlineSize).toBe('84px')
    expect(host.querySelector<HTMLElement>('th[data-col="status"] [role="separator"]')!.getAttribute('aria-valuenow')).toBe('84')
    key(host.querySelector('th[data-col="status"] [role="separator"]')!, 'Home')
    expect(stored('Agents').widths).toEqual({ name: 100, status: 100, tokens: 100 })
    dispose()
  })

  it('resizes by dragging the edge without sorting, and commits only at the end of the drag', () => {
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    const firstCell = bodyRows(host)[0].querySelector('td')
    const grip = host.querySelector<HTMLElement>('th[data-col="name"] [role="separator"]')!
    pointer(grip, 'pointerdown', 100)
    pointer(grip, 'pointermove', 40)
    expect(host.querySelector<HTMLElement>('col[data-col="name"]')!.style.inlineSize).toBe('40px')
    expect(localStorage.getItem(tableKey('Agents'))).toBeNull()
    pointer(grip, 'pointermove', 10)
    pointer(grip, 'pointerup', 10)
    grip.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(stored('Agents').widths.name).toBe(32)
    expect(host.querySelector('th[aria-sort]')).toBeNull()
    // Rows were not rendered again.
    expect(bodyRows(host)[0].querySelector('td')).toBe(firstCell)
    host.querySelector('th[data-col="name"] [role="separator"]')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(stored('Agents').widths.name).toBe(100)
    dispose()
  })

  it('moves a column by dragging its header, with a drop indicator, and the click after the drag does not sort', () => {
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    const name = headerButton(host, 'name')
    pointer(name, 'pointerdown', 50)
    pointer(name, 'pointermove', 220)
    expect(host.querySelector('th[data-col="tokens"]')!.getAttribute('data-drop')).toBe('before')
    pointer(name, 'pointermove', 280)
    expect(host.querySelector('th[data-col="tokens"]')!.getAttribute('data-drop')).toBe('after')
    pointer(name, 'pointerup', 280)
    name.click()
    expect(headerTexts(host)).toEqual(['status', 'tokens', 'name'])
    expect(host.querySelector('[data-drop]')).toBeNull()
    expect(host.querySelector('th[aria-sort]')).toBeNull()
    expect(cells(bodyRows(host)[0])).toEqual(['status', 'tokens', 'name'])
    // A plain click still sorts.
    headerButton(host, 'tokens').click()
    flush()
    expect(host.querySelector('th[aria-sort]')?.getAttribute('data-col')).toBe('tokens')
    dispose()
  })

  it('moves a column with Alt+Arrow keys, keeps focus and announces the move', () => {
    const { host, dispose } = mount(() => <Table label="Agents" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    const name = headerButton(host, 'name')
    expect(name.getAttribute('aria-keyshortcuts')).toBe('Alt+ArrowLeft Alt+ArrowRight')
    name.focus()
    key(name, 'ArrowRight', { altKey: true })
    expect(headerTexts(host)).toEqual(['status', 'name', 'tokens'])
    expect(document.activeElement).toBe(headerButton(host, 'name'))
    expect(host.querySelector('[aria-live="polite"][data-columns-status]')!.textContent).toBe('Name moved to position 2 of 3')
    key(headerButton(host, 'name'), 'ArrowLeft', { altKey: true })
    expect(headerTexts(host)).toEqual(['name', 'status', 'tokens'])
    expect(host.querySelector('th[aria-sort]')).toBeNull()
    dispose()
  })
})

describe('TBL-COL-11 · pinned columns', () => {
  it('keeps a tree table first column and the actions column in place and visible', () => {
    localStorage.setItem(tableKey('Tree'), JSON.stringify({ order: ['tokens', 'status', 'name'], hidden: ['name'] }))
    const { host, dispose } = mount(() => <Table label="Tree" fields={fields} rows={rows} rowId={row => row.id}
      primaryCell={(_row, _value, content) => content} action={{ label: () => 'Open', run: () => {} }} />)
    expect(headerTexts(host)).toEqual(['name', 'tokens', 'status', '@actions'])
    expect(cells(bodyRows(host)[0])).toEqual(['name', 'tokens', 'status', '@actions'])
    expect(host.querySelector('th[data-col="name"] button[aria-label^="Hide"]')).toBeNull()
    expect(host.querySelector('th[data-col="@actions"] button[aria-label^="Hide"]')).toBeNull()
    expect(host.querySelector('th[data-col="@actions"] [role="separator"]')).not.toBeNull()
    columnsButton(host).click()
    expect(Array.from(host.querySelectorAll('[role="menuitemcheckbox"]')).map(item => item.getAttribute('aria-disabled'))).toEqual(['true', null, null, 'true'])
    dispose()
  })

  it('starts with the default-hidden columns hidden and counts them', () => {
    const { host, dispose } = mount(() => <Table label="Defaults" fields={fields} rows={rows} rowId={row => row.id} defaultHidden={['tokens']} />)
    expect(headerTexts(host)).toEqual(['name', 'status'])
    expect(columnsButton(host).querySelector('[data-hidden-count]')?.textContent).toBe('1')
    dispose()
  })

  it('stores by the explicit table id when one is given', () => {
    const { host, dispose } = mount(() => <Table label="Files for a.md" tableId="files" fields={fields} rows={rows} rowId={row => row.id} />)
    host.querySelector<HTMLButtonElement>('button[aria-label="Hide Tokens column"]')!.click()
    expect(stored('files').hidden).toEqual(['tokens'])
    dispose()
  })
})
