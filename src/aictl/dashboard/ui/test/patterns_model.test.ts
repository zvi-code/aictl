import { describe, expect, it } from 'vitest'
import {
  binsOf, mcpRows, requestRange, scaled, share, signalText, type ConvergenceRow, type McpBody, type StripCell,
} from '../src/panels/overview/b/patternsModel'
import { readDrawer, drawerPatch } from '../src/shell/viewState'

const figures = { calls: 3, failures: 1, fail_rate: 1 / 3, total_ms: 30, p50_ms: 10, p95_ms: 20, output_bytes: 8,
  est_tokens: 2, time_share: 0.05 }

describe('MCP servers panel rows', () => {
  it('folds each server over its tools and says when a session count is a lower bound', () => {
    const body: McpBody = {
      groups: [{ id: 'mcp:docs', kind: 'mcp', server: 'docs', label: 'docs', sessions: 5000, sessions_at_least: true, tool_count: 1,
        first_ts: 1, last_ts: 2, ...figures, tools: [{ name: 'mcp__docs__find', sessions: 4, last_ts: 2, ...figures }] }],
      totals: { calls: 3, failures: 1, sessions: 4, total_ms: 30, tool_names: 1, tool_names_shown: 1 },
      definitions: {}, query: null,
    }
    const rows = mcpRows(body)
    expect(rows.map(row => [row.id, row.parent, row.folded])).toEqual([
      ['mcp:docs', undefined, true], ['mcp:docs\u0000mcp__docs__find', 'mcp:docs', undefined]])
    expect(rows[0].row).toMatchObject({ name: 'docs', type: 'group', tools: 1, sessions_text: '≥ 5000' })
    expect(rows[1].row).toMatchObject({ name: 'mcp__docs__find', type: 'tool', sessions_text: '4' })
    expect(mcpRows(undefined)).toEqual([])
  })

  it('lists the built-in tools directly when no MCP server was used', () => {
    const body: McpBody = {
      groups: [{ id: 'builtin', kind: 'builtin', server: '', label: 'Built-in tools', sessions: 1, sessions_at_least: false,
        tool_count: 2, first_ts: 1, last_ts: 2, ...figures, tools: [
          { name: 'powershell', sessions: 1, last_ts: 2, ...figures }, { name: 'view', sessions: null, last_ts: 2, ...figures }] }],
      totals: { calls: 6, failures: 2, sessions: 1, total_ms: 60, tool_names: 2, tool_names_shown: 2 },
      definitions: {}, query: null,
    }
    const rows = mcpRows(body)
    expect(rows.map(row => [row.id, row.parent, row.folded])).toEqual([
      ['builtin\u0000powershell', undefined, undefined], ['builtin\u0000view', undefined, undefined]])
    expect(rows.map(row => [row.row.name, row.row.type, row.row.sessions_text])).toEqual([['powershell', 'tool', '1'], ['view', 'tool', undefined]])
  })

  it('writes shares with a decimal only below ten percent', () => {
    expect([share(0.054), share(0.5), share(null)]).toEqual(['5.4%', '50%', undefined])
  })

  it('opens a server drawer from the address', () => {
    const entry = { type: 'mcp', name: 'mcp:docs' } as const
    expect(readDrawer(`?detail=mcp&record=${encodeURIComponent('mcp:docs')}`)).toEqual(entry)
    expect(drawerPatch(entry)).toMatchObject({ detail: 'mcp', record: 'mcp:docs' })
  })
})

describe('Convergence', () => {
  it('lists every signal with its evidence', () => {
    const row = { signals: [{ id: 'retries', label: 'Retries after errors', weight: 2, evidence: '4 retries', values: {} },
      { id: 'compactions', label: 'Repeated compaction', weight: 1, evidence: 'context compacted 3 times', values: {} }] }
    expect(signalText(row as unknown as ConvergenceRow)).toBe('Retries after errors: 4 retries · Repeated compaction: context compacted 3 times')
  })

  it('scales strip bars to the largest bin and finds the bins of a request range', () => {
    const cell = (first: number, last: number, calls: number): StripCell =>
      ({ first, last, calls, tokens: 0, output_tokens: 0, errors: 0, edits: 0, accepted: 0, repeats: 0, retries: 0 })
    const cells = [cell(1, 10, 2), cell(11, 20, 4), cell(21, 25, 0)]
    expect(scaled(cells, 'calls')).toEqual([0.5, 1, 0])
    expect(scaled(cells, 'tokens')).toEqual([0, 0, 0])
    expect(binsOf(cells, 9, 12)).toEqual([0, 1])
    expect(binsOf(cells, 25, 25)).toEqual([2])
    expect([requestRange(3, 3), requestRange(3, 9)]).toEqual(['request 3', 'requests 3-9'])
  })
})
