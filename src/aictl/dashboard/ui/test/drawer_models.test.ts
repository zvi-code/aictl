import { describe, expect, it, vi } from 'vitest'
import type { FlowEvent, TranscriptTurn } from '../src/data/contract.gen'
import { reloadMissingChunk } from '../src/drawer/chunkRecovery'
import { eventIdentity, flowBounds, flowModel, lanesOf } from '../src/drawer/flowModel'
import { sessionProcesses, treeOrder } from '../src/drawer/hierarchy'
import { kustoLink } from '../src/drawer/kqlLink'
import { drawerStack } from '../src/drawer/navigation'
import { buckets, median, runDelta } from '../src/drawer/overviewModel'
import { slotsOf, tokensFor } from '../src/drawer/timelineModel'
import { mcpTotals } from '../src/drawer/toolModel'
import { responseOf, tokenParts, transcriptIdentity } from '../src/drawer/transcriptModel'

const event = (type: string, ts: number, extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type, ts, source: 'recorded', rt_tokens: null, cum_tokens: null, ...extra })

describe('DRW-FL-01/02 · Flow placement, scope and identity', () => {
  it('merges split prompt evidence once without dropping recorded token counts', () => {
    const step = { step_key: 's-1', turn_id: 't-1' }
    const model = flowModel([
      event('user_message', 10, { ...step, redacted: true,
        tokens: { input: 180, output: null, cache_read: null, cache_creation: null } }),
      event('user_message', 10, { ...step, message: 'Retained text' }),
      event('tool_use', 11, { ...step, to: 'Read' }),
      event('tool_use', 12, { ...step, to: 'Grep' }),
      event('subagent_end', 13, { ...step, from: 'Review' }),
      event('user_message', 20, { step_key: 's-2' }),
    ], { total_turns: 4, omitted_events: 8 })
    expect(model.turnGroups).toEqual([3, 4])
    expect(model.events[0]).toMatchObject({ redacted: false, message: 'Retained text', tokens: { input: 180 } })
    expect(model.events[3]).toMatchObject({ _from: 'Subagents · Review', _to: 'Assistant' })
    expect(lanesOf(model.events, false)).toEqual(expect.arrayContaining(['Tools · Read', 'Tools · Grep']))
    expect(lanesOf(model.events, true)).toEqual(expect.arrayContaining(['Tools', 'Subagents']))
    expect(new Set(model.events.map(eventIdentity)).size).toBe(5)
  })

  it('anchors relative presets to the session end and rejects unreported or inverted bounds', () => {
    expect(flowBounds('900', 1900.1)).toEqual({ since: 1000, until: 1901 })
    expect(flowBounds('900')).toHaveProperty('error')
    expect(flowBounds('custom', null, '2026-03-02T10:00', '2026-03-01T10:00')).toHaveProperty('error')
  })
})

it('DRW-TL-01 · folds only pauses over 30 s and keeps unmeasured token classes unknown', () => {
  const rows = [event('user_message', 1), event('tool_use', 31), event('api_call', 62, {
    tokens: { input: 5, output: 2, cache_read: 100, cache_creation: null },
  })]
  expect(slotsOf(rows).map(slot => 'gap' in slot ? slot.gap : slot.event.ts)).toEqual([1, 31, 31, 62])
  expect(['all', 'fresh', 'cached'].map(mode => tokensFor(rows[2], mode as 'all' | 'fresh' | 'cached'))).toEqual([107, 7, 100])
  expect(tokensFor(rows[1], 'all')).toBeUndefined()
})

it('DRW-OV-03 · compares only measured runs and leaves sparse series gaps unfilled', () => {
  expect(median([null, 8, 4, Number.NaN, 10, 6])).toBe(7)
  expect(runDelta(102, 100)).toBe('Within 5% of median')
  expect(runDelta(110, 100)).toBe('+10% vs median')
  expect(runDelta(0, undefined)).toBeUndefined()
  const points = [{ ts: 12, value: 0 }, { ts: 12.5, value: 4 }, { ts: 14, value: null }]
  expect(buckets(points, 12, 35, false).values.slice(0, 3)).toEqual([2, null, null])
  expect(buckets(points, 12, 35, true).values.slice(0, 3)).toEqual([4, null, null])
})

it('DRW-TR-01 · identifies a turn by its deep-read timestamp and preserves only distinct replies', () => {
  const turn = { ts: 123.25, response: 'A', actions: [{ kind: 'tool_use', text: 'Not a reply' },
    { kind: 'api_response', text: 'A' }, { kind: 'api_response', text: 'B' }] } as unknown as TranscriptTurn
  expect(responseOf(turn)).toBe('A\n\nB')
  expect(transcriptIdentity(turn)).toBe('123.25')
  expect(tokenParts({ input: 4, output: null, cache_read: 120, cache_creation: null })).toEqual([
    { label: 'Input', count: 4 }, { label: 'Cache read', count: 120 },
  ])
})

it('DRW-01 · restores stack-only references without applying stale state to a different URL', () => {
  const stack = [{ type: 'agent', id: 'my-agent', tab: 'evidence' }, { type: 'file', path: 'example.md', line: 42 }]
  expect(drawerStack('?detail=file&record=example.md', { boardDrawers: stack })).toBe(stack)
  expect(drawerStack('?detail=file&record=other.md', { boardDrawers: stack })).toEqual([
    { type: 'file', path: 'other.md', record: undefined },
  ])
  expect(drawerStack('', { boardDrawers: stack })).toEqual([])
})

it('DRW-KQ-01 · links to the exact edited query only with autorun disabled and safe HTTPS', () => {
  const safe = 'https://example.kusto.windows.net/records?web=1&autorun=true#not-kept'
  const query = "print text='A & B'\n"
  const url = new URL(kustoLink(safe, query)!)
  expect(url.searchParams.get('query')).toBe(query)
  expect(url.searchParams.get('autorun')).toBe('false')
  expect(url.hash).toBe('')
  expect(kustoLink('http://example.test/records', query)).toBeUndefined()
  expect(kustoLink('https://user@example.test/records', query)).toBeUndefined()
})

it('DRW-01 · reloads once for a missing deploy chunk, not for application exceptions', () => {
  const store = new Map<string, string>()
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value) } }
  const reload = vi.fn()
  const gone = new TypeError('Failed to fetch dynamically imported module')
  expect(reloadMissingChunk(gone, 100_000, storage, reload)).toBe(true)
  expect(reloadMissingChunk(gone, 100_001, storage, reload)).toBe(false)
  expect(reloadMissingChunk(new Error('Invalid capture state'), 180_000, storage, reload)).toBe(false)
  expect(reload).toHaveBeenCalledTimes(1)
})

it('DRW-TM-01 · keeps children under their recorded parent and does not lose orphan or cyclic evidence', () => {
  const rows = [
    { id: 'b', parent: 'a' }, { id: 'a' }, { id: 'c', parent: 'not-in-record' },
    { id: 'x', parent: 'y' }, { id: 'y', parent: 'x' },
  ]
  expect(treeOrder(rows, row => row.id, row => row.parent).map(({ row, depth }) => [row.id, depth]))
    .toEqual([['a', 0], ['b', 1], ['c', 0], ['x', 0], ['y', 1]])
})

it('DRW-PR-01 · includes descendants but excludes processes assigned to another session or a recycled PID', () => {
  const process = (pid: number, ppid: number, session_id: string | null, created_at = pid) => ({
    pid, ppid, session_id, created_at, name: String(pid), tool: '', cwd: null, cpu_percent: null, memory_rss_bytes: null, present: true,
  })
  const source = [
    process(3, 2, null), process(2, 1, null), process(1, 0, 'session'), process(4, 1, 'other'),
    process(5, 1, null, 0), { ...process(6, 1, null), present: false }, process(7, 0, null),
  ]
  expect(sessionProcesses(source, [1, 2], new Set(['session'])).map(({ row, depth }) => [row.pid, depth]))
    .toEqual([[1, 0], [2, 1], [3, 2]])
})

it('DRW-TO-01 · groups MCP calls without adding percentiles or treating missing bytes as zero', () => {
  const first = { name: 'lookup', mcp_server: 'docs', calls: 2, failed: 1, total_ms: null, max_ms: null, p50_ms: 10, p95_ms: 30,
    input_bytes: null, output_bytes: 0, avg_input_bytes: null, avg_output_bytes: null, max_output_bytes: null,
    confirms: 0, blocked: 0 }
  const result = mcpTotals([first, { ...first, name: 'pull', calls: 3, failed: 0, output_bytes: null },
    { ...first, mcp_server: null }])
  expect(result).toEqual([{ server: 'docs', calls: 5, failed: 1, output: 0, partial: true }])
})
