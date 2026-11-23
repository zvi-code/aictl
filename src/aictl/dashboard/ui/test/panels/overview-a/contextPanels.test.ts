import { describe, expect, it, vi } from 'vitest'
import { loadLabel, loadSplit, openFile } from '../../../src/panels/overview/contextData'

const plain = (value: number) => String(value)

describe('Tokens by category says when the context reaches the model', () => {
  it('splits tokens by when they load, largest first, and leaves out parts with none', () => {
    // Found on a fleet board: "0 sent · 1,046,654,647 never sent", a split that counted transcripts.
    expect(loadSplit({ always: 340, on_demand: 600, conditional: 0 }, plain)).toBe('600 on demand · 340 every call')
    expect(loadSplit({ always: 0, on_demand: 0, conditional: 0 }, plain)).toBe('no tokens')
  })

  it('names the load of a file in words, and an unknown load as not known', () => {
    expect([loadLabel('always'), loadLabel('on_demand'), loadLabel('conditional'), loadLabel('never')])
      .toEqual(['every call', 'on demand', 'conditional', undefined])
  })
})

describe('a file row opens the file drawer in every scope', () => {
  it('opens the drawer at the file, named by its file name', () => {
    // Found in fleet scope: "Preview <file>" links led to "Local contents are not available".
    const openDetail = vi.fn()
    const action = openFile({ openDetail }, { name: 'CLAUDE.md', path: 'C:\\r\\web\\CLAUDE.md' })!
    expect(action.label).toBe('Open CLAUDE.md')
    action.run()
    expect(openDetail).toHaveBeenCalledWith({ type: 'file', path: 'C:\\r\\web\\CLAUDE.md', line: 1 })
    expect(openFile({ openDetail }, { name: 'x' })).toBeUndefined()
  })
})
