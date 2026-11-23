import { describe, expect, it, vi } from 'vitest'
import { loadLabel, loadSplit, openFile } from '../../../src/panels/overview/contextData'
import { budgetNote, budgetSays } from '../../../src/panels/overview/contextOptions'

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

describe('Context window budget shows only rows that say something', () => {
  const tool = (label: string, tokens: number, model: string | null, window: number | null) =>
    ({ tool: label.toLowerCase(), label, always: tokens, on_demand: 0, conditional: 0, model, window })

  it('leaves out tools with no context tokens and names them, and the tools without a known limit, in one line', () => {
    // Found on this Mac: 9 rows of n/a and 0 with "no model observed or set", 2 useful.
    const rows = [tool('Claude Code', 300, 'claude-opus-5', 1_000_000), tool('Cursor', 0, null, null),
      tool('Claude Desktop', 0, null, null), tool('Copilot CLI', 50, 'gpt-6-astra', null), tool('Copilot CLI', 70, 'gpt-6-astra', null)]
    expect(rows.filter(budgetSays).map(row => row.label)).toEqual(['Claude Code', 'Copilot CLI', 'Copilot CLI'])
    expect(budgetNote(rows)).toBe('Not shown: Cursor, Claude Desktop (no file they load into the model was reported).'
      + ' No share for Copilot CLI: no context limit is known for gpt-6-astra.')
    expect(budgetNote([tool('Claude Code', 300, 'claude-opus-5', 1_000_000)])).toBeUndefined()
    // A reported node's budget counts host-wide files only, and says so.
    expect(budgetNote([tool('Cursor', 0, null, null)], true)).toBe('Not shown: Cursor (no host-wide file they load into the model was reported).')
  })
})
