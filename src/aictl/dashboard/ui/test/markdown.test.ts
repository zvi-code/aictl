import { expect, it } from 'vitest'
import { parseMarkdown } from '../src/ui/markdownModel'

it('preserves heading levels in retained text', () => {
  const markdown = Array.from({ length: 6 }, (_, index) => `${'#'.repeat(index + 1)} Heading ${index + 1}`).join('\n')
  expect(parseMarkdown(markdown).blocks).toEqual(Array.from({ length: 6 }, (_, index) => ({
    type: 'heading', level: index + 1, text: [`Heading ${index + 1}`],
  })))
})

it('recognizes inline emphasis, code, quotes, rules, and hard breaks', () => {
  expect(parseMarkdown('> **bold** *em* `code`  \n> next\n\n---').blocks).toEqual([
    { type: 'quote', blocks: [{ type: 'p', text: [
      { tag: 'strong', children: ['bold'] }, ' ', { tag: 'em', children: ['em'] }, ' ',
      { tag: 'code', children: ['code'] }, { tag: 'br' }, 'next',
    ] }] },
    { type: 'hr' },
  ])
})

it('assigns column alignment to retained Markdown tables', () => {
  expect(parseMarkdown('| a | b | c |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |').blocks).toEqual([
    { type: 'table', head: [['a'], ['b'], ['c']], rows: [[['1'], ['2'], ['3']]], align: ['left', 'center', 'right'] },
  ])
})
