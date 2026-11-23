import { describe, expect, it } from 'vitest'
import { presentFields } from '../../src/panels/kinds/model'

type Row = Record<string, unknown>
type F = { id: string; label: string; read: (row: Row) => unknown; clip?: 'start'; title?: string }
const field = (id: string, label: string): F => ({ id, label, read: (row: Row) => row[id] })

describe('every panel table shows its columns by one rule', () => {
  it('leaves out a column no row has a value for, but keeps the first column', () => {
    // Found on real data: Lifetime totals had 6 of 15 columns 'Not available' in every row.
    const rows = [{ name: 'a', calls: 1, cost: null }, { name: 'b', calls: 2, cost: 'Not available from this source' }]
    const shown = presentFields([field('name', 'Name'), field('calls', 'Calls'), field('cost', 'Cost')], rows)
    expect(shown.map(f => f.id)).toEqual(['name', 'calls'])
    expect(presentFields([field('name', 'Name'), field('cost', 'Cost')], []).map(f => f.id)).toEqual(['name', 'cost'])
  })

  it('drops a first word that three later headers repeat and keeps the full name on hover', () => {
    const rows = [{ t: 'x', i: 1, o: 2, c: 3, s: 'y' }]
    const shown = presentFields([field('t', 'Tool'), field('i', 'Lifetime input'), field('o', 'Lifetime output'),
      field('c', 'Lifetime cache read'), field('s', 'Last seen')], rows)
    expect(shown.map(f => [f.label, f.title])).toEqual([['Tool', 'Tool'], ['Input', 'Lifetime input'],
      ['Output', 'Lifetime output'], ['Cache read', 'Lifetime cache read'], ['Last seen', 'Last seen']])
  })

  it('clips a column of paths at its start, so the file name stays visible', () => {
    const rows = [{ file: '/Users/me/.claude/commands/review.md' }, { file: '/Users/me/p/.github/prompts/a.prompt.md' }]
    expect(presentFields([field('file', 'File')], rows)[0].clip).toBe('start')
    expect(presentFields([field('file', 'File')], [{ file: 'two words' }])[0].clip).toBeUndefined()
  })
})
