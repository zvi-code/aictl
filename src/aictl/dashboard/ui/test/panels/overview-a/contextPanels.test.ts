import { describe, expect, it, vi } from 'vitest'
import { excludedSummary, groupFigures, loadLabel, loadSplit, openFile, truncationNote } from '../../../src/panels/overview/contextData'
import { budgetNote, budgetSays } from '../../../src/panels/overview/contextOptions'
import { overviewA } from '../../../src/panels/overview/a'
import { overviewB } from '../../../src/panels/overview/b'
import { lifetimeRow } from '../../../src/panels/overview/b/Context'
import { stamp } from '../../../src/design/format'
import { rowAction } from '../../../src/panels/kinds/model'
import type { PanelContext } from '../../../src/panels/types'

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

describe('Files each tool reads lists context and folds the rest into one line', () => {
  it('sums the files that are not context by kind over tools and nodes, largest first', () => {
    // Found on Windows: 54,504 file records in folded groups named cache, credentials, database, hidden, logs, transcript.
    const sets = [
      { excluded: [{ kind: 'transcript', policy: 'no' as const, files: 40_000 }, { kind: 'hidden', policy: 'unknown' as const, files: 3 }] },
      { excluded: [{ kind: 'transcript', policy: 'no' as const, files: 9_000 }, { kind: 'database', policy: 'no' as const, files: 2 }] },
      {},
    ]
    expect(excludedSummary(sets)).toEqual({ files: 49_005, kinds: [
      { kind: 'transcript', files: 49_000 }, { kind: 'hidden (loading not known)', files: 3 }, { kind: 'database', files: 2 }] })
  })

  it('says in one line which tools have more context files than are listed', () => {
    // Found on Windows: "Copilot CLI (node) reports 11,011 files. The largest 400 are listed." nine times.
    const set = (tool: string, count: number, truncated: boolean, node_id?: string) =>
      ({ tool, count, truncated, node_id, files: Array.from({ length: truncated ? 400 : count }) })
    const name = (tool: string) => ({ 'copilot-cli': 'Copilot CLI' })[tool] ?? tool
    expect(truncationNote([set('copilot-cli', 1200, true, 'win-a'), set('copilot-cli', 900, true, 'win-b'), set('codex', 5, false)], name))
      .toBe('Each tool lists its 400 largest context files; Copilot CLI (win-a) has 1,200, Copilot CLI (win-b) has 900.')
    expect(truncationNote([set('codex', 5, false)], name)).toBeUndefined()
  })
})

describe('Workflows and prompt files tell rows apart and open in every scope', () => {
  it('shows the repository as its own column and opens the file drawer in fleet scope', () => {
    // Found on Windows: "create-chart" twice in a row, the Path column cut from the left, the rows not clickable.
    const def = overviewA.find(panel => panel.id === 'workflows')!
    expect(def.columns.map(column => column.path)).toEqual(['name', 'project', 'type', 'tool', 'tokens', 'mtime'])
    const openDetail = vi.fn()
    const ctx = { scope: () => 'fleet', openDetail } as unknown as PanelContext
    const path = 'C:\\Users\\me\\src\\web\\.github\\prompts\\create-chart.prompt.md'
    rowAction(def, ctx, { name: 'create-chart', project: 'web', path })!.run()
    expect(openDetail).toHaveBeenCalledWith({ type: 'file', path, line: 1 })
  })
})

describe('Lifetime totals read as dates and short labels', () => {
  it('shows the as-of date in the board format and leaves an unreported cost basis empty', () => {
    // Found on Windows: "+00:00" ISO strings in the notes and the As of column, and "Cost basis: unknown" on every row.
    const row = lifetimeRow({ tool: 'copilot-cli', as_of: '2026-11-23T21:11:52+00:00', cost_quality: 'unknown', token_quality: null })
    expect(row.as_of).toBe(stamp(Date.parse('2026-11-23T21:11:52+00:00') / 1000, true))
    expect(row.as_of).not.toContain('+00:00')
    expect([row.cost_quality, row.token_quality]).toEqual([undefined, undefined])
    expect(lifetimeRow({ as_of: 'not a date', cost_quality: 'reported' })).toMatchObject({ as_of: undefined, cost_quality: 'reported' })
  })

  it('labels every column in a few words', () => {
    // Found on Windows: "Input tokens consumed by thi…", "Total number of sessions rec…" cut off as headers.
    const def = overviewB.find(panel => panel.id === 'lifetime')!
    expect(def.columns.every(column => column.label && column.label.length <= 16)).toBe(true)
  })
})

describe('Agent memory group rows carry their files\' figures', () => {
  it('sums lines, keeps the latest change and names the nodes', () => {
    // Found on the fleet board: rows "memory" and "instructions" with n/a in Lines, Changed and Node.
    const files = [{ lines: 10, mtime: 100, node_id: 'win-a' }, { lines: 5, mtime: 300, node_id: 'win-b' }, { lines: 1, mtime: 200, node_id: 'win-a' }]
    expect(groupFigures(files)).toEqual({ lines: 16, mtime: 300, node_id: '2 nodes' })
    expect(groupFigures([{ lines: 3, mtime: 1, node_id: 'mac' }])).toEqual({ lines: 3, mtime: 1, node_id: 'mac' })
    // This machine's rows have no node, and a file whose lines are not known leaves the sum unknown, not smaller.
    expect(groupFigures([{ lines: 3, mtime: null }, { lines: null, mtime: 5 }])).toEqual({ lines: undefined, mtime: 5 })
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
    expect(budgetNote([tool('Codex CLI', 30, null, null)])).toBe('No share for Codex CLI: no model was observed or set.')
    // A reported node's budget counts host-wide files only, and says so.
    expect(budgetNote([tool('Cursor', 0, null, null)], true)).toBe('Not shown: Cursor (no host-wide file they load into the model was reported).')
  })
})
