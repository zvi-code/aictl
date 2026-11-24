import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { nodeCell, nodeNoun, nodeOrder, nodeTag, nodeTags, nodeTitle, setNodes } from '../../src/data/nodeNames'
import { compareFieldValues } from '../../src/ui/tableModel'

describe('node numbers', () => {
  beforeEach(() => { setNodes('Desk-1', ['cpc-b', 'desk-1', 'cpc-a', 'legacy', 'CPC-A']); flush() })

  it('numbers the serving node 0 and the others in id order, each once', () => {
    expect(nodeOrder('Desk-1', ['cpc-b', 'desk-1', 'cpc-a', 'legacy', 'CPC-A'])).toEqual(['desk-1', 'cpc-a', 'cpc-b'])
    expect(nodeOrder(undefined, ['b', 'a'])).toEqual(['a', 'b'])
  })

  it('writes a node as its number, with the host name only where it is introduced', () => {
    expect([nodeTag('desk-1'), nodeTag('CPC-A'), nodeTag('cpc-b')]).toEqual(['[0]', '[1]', '[2]'])
    expect(nodeTitle('cpc-b')).toBe('[2] cpc-b')
    expect(nodeTags(['cpc-b', 'desk-1'])).toBe('[0], [2]')
  })

  it('gives a node column the number as its value, so it sorts in number order, and the host name as its hover', () => {
    setNodes('home', Array.from({ length: 10 }, (_, i) => `n-${String(i + 1).padStart(2, '0')}`)); flush()
    const cell = nodeCell<{ node?: string }>(row => row.node)
    const rows = [{ node: 'n-10' }, { node: 'n-02' }, { node: 'home' }, {}]
    expect(rows.map(cell.read).sort(compareFieldValues)).toEqual(['[0]', '[2]', '[10]', undefined])
    expect(cell.hint({ node: 'n-10' })).toBe('[10] n-10')
    expect(nodeNoun('n-02')).toBe('node [2]')
  })

  it('keeps the id of a node the list does not hold, and writes nothing for none', () => {
    expect(nodeTag('new-node')).toBe('new-node')
    expect(nodeTitle('new-node')).toBe('new-node')
    expect(nodeTag(null)).toBe('')
  })
})
