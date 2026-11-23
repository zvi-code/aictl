// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import AgentsTree from '../../src/panels/overview/AgentsTree'
import { cellSpans } from '../../src/panels/overview/agentTree'
import { tableKey } from '../../src/ui/columnState'
import type { PanelProps } from '../../src/panels/types'
import { bodyRows, headerTexts, installDom, key, layoutHeaders, mount } from './dom'

const now = Math.floor(Date.now() / 1000)
const agents = [
  { id: 'one', title: 'First session', kind: 'main', tool: 'claude-code', status: 'ended', queryable: true, started_at: now - 600,
    last_activity_at: now - 60, tool_calls: 4, msgs: { assistant: 3, user: 1 }, input: 100, output: 20, cost_usd: 0.5 },
  { id: 'two', title: 'Second session', kind: 'main', tool: 'claude-code', status: 'ended', queryable: true, started_at: now - 900,
    last_activity_at: now - 300, tool_calls: 1, msgs: { assistant: 1, user: 1 }, input: 10, output: 2, no_history: 'No transcript on this machine' },
]

function panel(): PanelProps {
  const reads: Record<string, unknown> = {
    history: { state: 'ready', value: agents, rowKeys: agents.map(agent => agent.id) },
    runtime: { state: 'ready', value: [], rowKeys: [] },
  }
  const ctx = {
    read: (source: { id: string }) => reads[source.id], detail: () => () => undefined, scope: () => 'local', nodeId: () => undefined,
    client: { store: { meta: {} } }, filters: () => ({}), tools: () => null, board: () => undefined, stopped: () => false,
    startedAt: now, refresh: () => {}, openAgent: () => {},
  }
  const def = { id: 'agents', title: 'Agents', empty: 'None', sources: [{ id: 'history' }, { id: 'runtime' }], columns: [], actions: [] }
  return { ctx, def, params: {} } as unknown as PanelProps
}

beforeEach(() => { installDom(); layoutHeaders() })

describe('TBL-COL-20 · agents tree columns', () => {
  it('joins adjacent history columns into one cell, wherever they sit', () => {
    const joined = new Set(['last', 'cost'])
    expect(cellSpans(['name', 'last', 'cost', 'status'], joined)).toEqual([
      { id: 'name', span: 1, joined: false }, { id: 'last', span: 2, joined: true }, { id: 'status', span: 1, joined: false }])
    expect(cellSpans(['last', 'name', 'cost'], joined).map(cell => cell.span)).toEqual([1, 1, 1])
    expect(cellSpans(['name', 'cost'])).toEqual([{ id: 'name', span: 1, joined: false }, { id: 'cost', span: 1, joined: false }])
  })

  it('reads the same saved layout as every table: hidden columns leave header and rows, order follows the layout', () => {
    localStorage.setItem(tableKey('agents'), JSON.stringify({ order: ['cost', 'name', 'status'], hidden: ['now', 'started', 'tools'] }))
    const { host, dispose } = mount(() => <AgentsTree {...panel()} />)
    expect(headerTexts(host)).toEqual(['name', 'cost', 'status', 'duration', 'last', 'requests', 'tokens'])
    const [first, second] = bodyRows(host)
    const cols = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => [td.getAttribute('data-col'), td.colSpan])
    expect(cols(first)).toEqual([['name', 1], ['cost', 1], ['status', 1], ['duration', 1], ['last', 1], ['requests', 1], ['tokens', 1]])
    // The row with no history spans its history columns that sit together, and keeps one note.
    expect(cols(second)).toEqual([['name', 1], ['cost', 1], ['status', 1], ['duration', 1], ['last', 3]])
    expect(second.textContent).toContain('No transcript on this machine')
    expect(host.querySelector('button[data-columns]')!.getAttribute('aria-label')).toBe('Agents columns, 3 hidden')
    expect(host.querySelector('th[data-col="name"] button[data-hide]')).toBeNull()
    dispose()
  })

  it('hides, moves and resizes from its headers with the shared controls', () => {
    const { host, dispose } = mount(() => <AgentsTree {...panel()} />)
    host.querySelector<HTMLButtonElement>('th[data-col="now"] button[aria-label="Hide Now column"]')!.click()
    expect(headerTexts(host)).not.toContain('now')
    expect(bodyRows(host)[0].querySelector('td[data-col="now"]')).toBeNull()
    const hide = host.querySelector<HTMLButtonElement>('th[data-col="status"] [data-hide]')!
    key(hide, 'ArrowRight', { altKey: true })
    expect(headerTexts(host).slice(0, 3)).toEqual(['name', 'started', 'status'])
    expect(document.activeElement).toBe(host.querySelector('th[data-col="status"] [data-hide]'))
    key(host.querySelector('th[data-col="cost"] [role="separator"]')!, 'ArrowLeft')
    expect(host.querySelector('table')!.hasAttribute('data-sized')).toBe(true)
    expect(JSON.parse(localStorage.getItem(tableKey('agents'))!)).toMatchObject({ hidden: ['now'], widths: { cost: 84 } })
    dispose()
  })
})
