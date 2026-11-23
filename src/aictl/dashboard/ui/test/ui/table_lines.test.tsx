// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { Table } from '../../src/ui/Table'
import type { Field } from '../../src/ui/tableModel'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

type Role = { kind: string; runs: number }
const prompt = 'You are implementing one bounded change in the aictl repository (your working directory is an isolated git ' +
  'worktree of it). Do the work yourself; do not delegate.\n\nRead AGENTS.md first and follow it.'
const fields: Field<Role>[] = [
  { id: 'kind', label: 'Kind of agent', read: row => row.kind },
  { id: 'runs', label: 'Runs', read: row => row.runs, numeric: true },
]

beforeEach(() => { installDom(); layoutHeaders() })

describe.each([['virtual', undefined], ['paged', 10]] as const)('TBL-LINE-10 · %s table, a long text', (mode, pageSize) => {
  it('keeps one line and shows the full text on hover', () => {
    const { host, dispose } = mount(() => <Table label="Roles" fields={fields} rows={[{ kind: prompt, runs: 2 }]}
      rowId={row => row.kind} pageSize={pageSize} />)
    const cell = bodyRows(host)[0].querySelector<HTMLTableCellElement>('td[data-col="kind"]')!
    expect(cell.title).toBe(prompt)
    // The paged table wraps text by default; its text cells clamp to one line.
    if (mode === 'paged') expect(cell.querySelector('[data-line]')?.textContent).toBe(prompt)
    dispose()
  })
})

describe('TBL-LINE-11 · the one-line rule is in the table styles', () => {
  it('clamps the line box to one line', () => {
    const css = readFileSync(join(__dirname, '../../src/ui/Table.module.css'), 'utf8')
    const rule = css.match(/\.line \{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toMatch(/-webkit-line-clamp: 1;/)
    expect(rule).toMatch(/overflow: hidden;/)
  })
})
