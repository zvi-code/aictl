import { describe, expect, it } from 'vitest'
import {
  ago, buildTree, duration, durationMissing, elapsed, lastMissing, missingReason, nameHint, subagentText, summarize, type TreeAgent,
} from '../../../src/panels/overview/agentTree'

const T = 1_800_000_000
const session = (id: string, status: string, started: number, extra: Partial<TreeAgent> = {}): TreeAgent =>
  ({ id, status, started_at: started, kind: 'main', ...extra })
const sub = (id: string, parent: string, status: string, started: number, extra: Partial<TreeAgent> = {}): TreeAgent =>
  ({ id, parent_id: parent, status, started_at: started, kind: 'subagent', ...extra })

function snapshot(activity: number): TreeAgent[] {
  // The server sends rows in any order; only last_activity_at differs between the two snapshots.
  return [
    sub('s-late', 'p1', 'running', T + 300, { last_activity_at: T + activity }),
    session('p2', 'ended', T + 900, { last_activity_at: T + 950 }),
    sub('s-early', 'p1', 'ended', T + 100, { last_activity_at: T + 200 }),
    session('p1', 'running', T, { last_activity_at: T + activity, subagent_count: 3, subagents_running: 2 }),
    sub('s-mid', 'p1', 'running', T + 200, { last_activity_at: T + activity - 5 }),
    session('p3', 'idle', T + 50),
  ]
}

describe('agents tree order', () => {
  it('keeps order and keys when only activity times change', () => {
    const first = buildTree(snapshot(1000), new Map())
    const second = buildTree([...snapshot(1060)].reverse(), new Map())
    expect(second.map(entry => entry.row.id)).toEqual(first.map(entry => entry.row.id))
    // Running first, idle next, ended last; subagents in spawn order under their session, whatever their status.
    expect(first.map(entry => [entry.row.id, entry.depth])).toEqual([
      ['p1', 0], ['s-early', 1], ['s-mid', 1], ['s-late', 1], ['p3', 0], ['p2', 0]])
    expect(first.find(entry => entry.row.id === 's-late')).toMatchObject({ last: true, parent: 'p1', position: 3, siblings: 3 })
  })

  it('folds by the user choice and starts live sessions unfolded, ended ones folded', () => {
    const rows = [session('a', 'ended', T), sub('a1', 'a', 'ended', T + 1), session('b', 'running', T - 5), sub('b1', 'b', 'running', T)]
    expect(buildTree(rows, new Map()).map(entry => entry.row.id)).toEqual(['b', 'b1', 'a'])
    expect(buildTree(rows, new Map([['a', true], ['b', false]])).map(entry => entry.row.id)).toEqual(['b', 'a', 'a1'])
  })

  it('moves a session once, when its status group changes', () => {
    const before = buildTree([session('a', 'running', T), session('b', 'running', T + 10)], new Map())
    const after = buildTree([session('a', 'running', T), session('b', 'ended', T + 10)], new Map())
    expect(before.map(entry => entry.row.id)).toEqual(['b', 'a'])
    expect(after.map(entry => entry.row.id)).toEqual(['a', 'b'])
  })

  it('lists a subagent whose session is not listed as a top row', () => {
    expect(buildTree([sub('orphan', 'missing', 'running', T)], new Map())).toMatchObject([{ depth: 0, row: { id: 'orphan' } }])
  })

  it('orders sessions under a grouping row like top rows', () => {
    const rows = [{ id: 'g', kind: 'group', title: 'claude-code' }, session('old', 'running', T, { parent_id: 'g' }),
      session('new', 'running', T + 5, { parent_id: 'g' })]
    expect(buildTree(rows, new Map()).map(entry => entry.row.id)).toEqual(['g', 'new', 'old'])
  })
})

describe('parent summary', () => {
  it('counts subagents and adds up the listed children', () => {
    const rows = snapshot(1000).map(row => row.parent_id ? { ...row, input: 10, output: 2, cost_usd: 0.5 } : row)
    const children = rows.filter(row => row.parent_id === 'p1')
    const summary = summarize(rows.find(row => row.id === 'p1')!, children)
    expect(summary).toMatchObject({ count: 3, running: 2, listed: 3, input: 30, output: 6, cost: 1.5 })
    expect(subagentText(summary)).toBe('3 subagents · 2 running')
  })

  it('says when fewer subagents are listed than the session has, and never invents a zero', () => {
    const summary = summarize(session('p', 'running', T, { subagent_count: 12, subagents_running: 0 }), [sub('x', 'p', 'ended', T)])
    expect(subagentText(summary)).toBe('12 subagents · 1 listed')
    expect(summary.input).toBeNull()
    expect(subagentText(summarize(session('q', 'ended', T, { subagent_count: 0 }), []))).toBe('')
  })
})

describe('row text', () => {
  it('formats ages and running time', () => {
    expect([ago(12), ago(600), ago(4 * 3600), ago(3 * 86400)]).toEqual(['12 s', '10 min', '4 h', '3 d'])
    expect([elapsed(65), elapsed(3725)]).toEqual(['1:05', '1:02:05'])
    expect(duration(session('a', 'running', T), T + 90)).toBe(90)
    expect(duration(session('a', 'ended', T, { ended_at: T + 30 }), T + 999)).toBe(30)
    expect(duration({ id: 'x', status: 'ended' }, T)).toBeUndefined()
  })

  it('names where a name comes from and keeps the prompt as secondary text', () => {
    const hint = nameHint(sub('a1', 'p', 'running', T, { title: 'Item 5: session finder', name_source: 'caller',
      prompt_line: 'You are implementing one bounded feature' }))
    expect(hint).toContain('Subagent started by its session: Item 5: session finder')
    expect(hint).toContain('the description its session gave the Agent call')
    expect(hint).toContain('Prompt: You are implementing one bounded feature')
  })

  it('says why a number is missing', () => {
    expect(missingReason(sub('a', 'p', 'running', T), 'tokens')).toMatch(/transcript has not been imported/)
    expect(missingReason({ id: 'r', queryable: false }, 'tokens')).toMatch(/runtime report only/)
    expect(missingReason({ id: 'r', input: 5 }, 'cost')).toMatch(/No list price/)
    expect(lastMissing({ id: 'old' })).toBe('Not reported by this data source')
    expect(lastMissing({ id: 'new', last_activity_at: null })).toMatch(/No line or call recorded/)
    expect(durationMissing({ id: 'x' })).toBe('No start time recorded')
    expect(durationMissing({ id: 'x', started_at: T, status: 'unknown' })).toMatch(/No end time/)
  })
})
