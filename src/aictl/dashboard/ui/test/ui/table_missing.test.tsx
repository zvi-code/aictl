// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { Table } from '../../src/ui/Table'
import { missingField, type Field } from '../../src/ui/tableModel'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

type Item = { id: string; name: string; lines: number | null; changed: string | null }
const fields: Field<Item>[] = [
  { id: 'name', label: 'Name', read: row => row.name },
  { id: 'lines', label: 'Lines', read: row => row.lines },
  // A field that reads the reason text itself, as some panels do for a missing group name.
  { id: 'changed', label: 'Changed', read: row => row.changed ?? missingField },
]
const rows: Item[] = [{ id: 'a', name: 'memory', lines: null, changed: null }]

beforeEach(() => { installDom(); layoutHeaders() })

describe.each([['virtual', undefined], ['paged', 10]] as const)('TBL-NA-10 · %s table, a value the source did not report', (_mode, pageSize) => {
  it('shows a short marker, with the full reason on hover and in the accessible name', () => {
    const { host, dispose } = mount(() => <Table label="Files" fields={fields} rows={rows} rowId={row => row.id} pageSize={pageSize} />)
    for (const id of ['lines', 'changed']) {
      const cell = bodyRows(host)[0].querySelector<HTMLTableCellElement>(`td[data-col="${id}"]`)!
      const marker = cell.querySelector<HTMLElement>('[data-missing]')
      expect(marker?.textContent).toBe('n/a')
      expect(marker?.title).toBe(missingField)
      // The visible text is the marker only; the reason is read by assistive technology.
      const visible = Array.from(cell.querySelectorAll('[aria-hidden="true"]')).map(node => node.textContent).join('')
      expect(visible).toBe('n/a')
      expect(cell.textContent).toBe(`n/a${missingField}`)
    }
    dispose()
  })
})

// Every table cell goes through the shared renderer, so no panel renders a reason as cell text of its own.
describe('TBL-NA-11 · table cells come from the shared renderer', () => {
  it('has no <td> outside the shared table, the Markdown table and the agents tree', () => {
    const root = join(__dirname, '../../src')
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (path.endsWith('.tsx')) files.push(path)
      }
    }
    walk(root)
    const owners = files.filter(path => /<td[\s>]/.test(readFileSync(path, 'utf8'))).map(path => relative(root, path)).sort()
    expect(owners).toEqual(['panels/overview/AgentsTree.tsx', 'ui/Markdown.tsx', 'ui/Table.tsx'])
  })
})
