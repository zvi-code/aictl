import { expect, it } from 'vitest'
import { sectionSummary } from '../src/shell/railSummary'
import type { BoardFields } from '../src/data/contract.gen'

type Files = BoardFields['memory_files']

const row = (path: string, category?: string) =>
  ({ path, category, declared_for: 'claude-code', scope: 'project', tokens: 1, lines_added: null, lines_removed: null, changed_by: null, changed_ts: null })
const summary = (files: Files | undefined) =>
  sectionSummary('context', ((field: string) => (field === 'memory_files' ? files : undefined)) as never)

it('counts memory files and instruction files as two numbers, each under its own label', () => {
  const files = [row('/m/a.md', 'memory'), row('/m/b.md', 'memory'), row('/p/CLAUDE.md', 'instructions'),
    row('/p/AGENTS.md', 'instructions'), row('/p/.github/copilot-instructions.md', 'instructions')]
  expect(summary(files)).toBe('2 memory files · 3 instruction files')
})

it('uses the singular for one file of a kind and shows a kind with none as zero', () => {
  expect(summary([row('/m/a.md', 'memory')])).toBe('1 memory file · 0 instruction files')
  expect(summary([row('/p/CLAUDE.md', 'instructions')])).toBe('0 memory files · 1 instruction file')
})

it('shows nothing until the board has delivered the field', () => {
  expect(summary(undefined)).toBe('')
})
