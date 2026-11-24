import { describe, expect, it } from 'vitest'
import type { FlowEvent } from '../src/data/contract.gen'
import { readScreen } from '../src/data/filters'
import { matchesReference } from '../src/drawer/flowSteps'
import {
  flowTarget, pageText, searchQuery, searchSummary, shareText, snippetText, type SearchBlock,
} from '../src/panels/thinking/thinkingSearchModel'

const block = (extra: Partial<SearchBlock> = {}): SearchBlock => ({
  thinking_key: 'k', request_key: 'r', ts: 1700000000, agent_id: '', model: 'm', turn_index: 1, block_index: 0, chars: 1000,
  tool: 'claude-code', session_id: 's', call_ts: 1700000000.5, snippet_at: 0, node_id: 'n', position: 1, title: 'A session',
  snippet: 'plan the parser', ...extra,
})

describe('Thinking search screen', () => {
  it('is a screen of its own', () => {
    expect(readScreen('?screen=thinking')).toBe('thinking')
  })

  it('sends the search, its order and page, and the page filters', () => {
    const query = searchQuery({ q: ' parser "empty input" ', sort: 'chars', ascending: true, offset: 50 },
      { since: 10, until: 20 }, ['claude-code', 'copilot-cli'], 'model-x')
    expect(Object.fromEntries(query)).toEqual({
      since: '10', until: '20', sort: 'chars', order: 'asc', offset: '50', limit: '50', q: 'parser "empty input"',
      tool: 'claude-code,copilot-cli', model: 'model-x',
    })
    const plain = searchQuery({ q: '', sort: 'ts', ascending: false, offset: 0 }, { since: 1, until: 2 }, null, 'all')
    expect(plain.has('q') || plain.has('tool') || plain.has('model')).toBe(false)
  })

  it('marks text left out around a snippet', () => {
    expect(snippetText(block({ snippet_at: 0, chars: 15 }))).toBe('plan the parser')
    expect(snippetText(block({ snippet_at: 120 }))).toBe('…plan the parser…')
    expect(snippetText(block({ snippet: '' }))).toBe('')
  })

  it('states counts and shares as concrete values', () => {
    expect(shareText(1204, 4816)).toBe('1,204 blocks · 25%')
    expect(pageText(50, 50, 4059)).toBe('51–100 of 4,059')
    expect(pageText(0, 0, 0)).toBe('0 of 0')
    expect(searchSummary({ q: '', terms: ['parser'], phrases: ['empty input'], sort: 'ts', ascending: false, offset: 0, limit: 50 }))
      .toBe('Blocks with whole terms “parser” and the text “empty input”')
  })

  it('opens the flow at the model call of a linked block, and the session for an unlinked one', () => {
    expect(flowTarget(block())).toEqual({ id: 's', extra: { callAt: 1700000000.5 } })
    expect(flowTarget(block({ call_ts: null }))).toEqual({ id: 's' })
    const call = { type: 'api_call', ts: 1700000000.5, source: 'store' } as FlowEvent
    expect(matchesReference(call, { field: 'call_at', id: '1700000000.5' })).toBe(true)
    expect(matchesReference({ ...call, type: 'tool_use' }, { field: 'call_at', id: '1700000000.5' })).toBe(false)
    expect(matchesReference(call, { field: 'call_at', id: '1700000001' })).toBe(false)
  })
})
