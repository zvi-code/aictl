import { describe, expect, it } from 'vitest'
import { alignChartData } from '../src/ui/chartData'
import { parseMarkdown } from '../src/ui/markdownModel'
import { createTableModel, formatField, makeColumns, updateTableModel, type Field } from '../src/ui/tableModel'

describe('table model', () => {
  type SampleRow = { key: string; input?: number | null }
  const field: Field<SampleRow> = { id: 'input', label: 'Input tokens', read: row => row.input, format: n => `${n} tokens` }
  const rows: SampleRow[] = [{ key: 'first', input: 20 }, { key: 'missing', input: null }, { key: 'zero', input: 0 }]

  it('keeps the contract ID when it sorts or replaces a row and keeps missing values last', () => {
    const table = createTableModel<SampleRow>(row => row.key)
    const cols = makeColumns([field])
    const order = (desc: boolean) => [{ id: 'input', desc }]
    expect(updateTableModel(table, rows, cols, order(false)).map(row => row.id)).toEqual(['zero', 'first', 'missing'])
    expect(updateTableModel(table, rows, cols, order(true)).map(row => row.id)).toEqual(['first', 'zero', 'missing'])
    const changed = [{ ...rows[0], input: -1 }, ...rows.slice(1)]
    expect(updateTableModel(table, changed, cols, order(false)).map(row => row.id)).toEqual(['first', 'zero', 'missing'])
  })

  it('does not show a missing value as zero', () => {
    expect(formatField(field, rows[1])).toBe('Not available from this source')
    expect(formatField(field, rows[2])).toBe('0 tokens')
  })
})

describe('chart data', () => {
  it('orders samples, keeps the last sample at each x, and preserves gaps and zero', () => {
    expect(alignChartData([
      { x: 2, values: [100, 8] }, { x: 1, values: [0, undefined] },
      { x: 2, values: [Infinity, 4] }, { x: NaN, values: [42, 42] },
    ], 2)).toEqual([[1, 2], [0, null], [null, 4]])
  })
})

describe('markdown parsing', () => {
  it('keeps HTML as text and does not create links with unsupported schemes', () => {
    const doc = parseMarkdown('<b>literal</b> [file](file:///example) [docs](https://example.com) ![sample](https://example.com/i)')
    expect(doc.blocks).toEqual([{ type: 'p', text: [
      '<b>literal</b> ', { tag: 'span', children: ['file'] }, ' ',
      { tag: 'a', href: 'https://example.com', children: ['docs'] }, ' ',
      { tag: 'image', url: 'https://example.com/i', label: 'sample' },
    ] }])
  })

  it('reads front matter, nested tasks, escaped table cells and fenced code', () => {
    const doc = parseMarkdown('---\r\nscope: local\r\n---\r\n- [x] Done\r\n  - **Detail**\r\n\r\n| Field | Value |\r\n| --- | ---: |\r\n| a\\|b | 2 |\r\n\r\n~~~json\r\n{}\r\n~~~')
    expect(doc.front).toEqual([['scope', 'local']])
    expect(doc.blocks[0]).toMatchObject({ type: 'list', ordered: false, items: [{ task: true, blocks: [{ type: 'p' }, { type: 'list' }] }] })
    expect(doc.blocks[1]).toMatchObject({ type: 'table', rows: [[['a|b'], ['2']]], align: [undefined, 'right'] })
    expect(doc.blocks[2]).toEqual({ type: 'code', language: 'json', text: '{}' })
  })
})
