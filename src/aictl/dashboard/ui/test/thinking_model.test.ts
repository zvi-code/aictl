import { describe, expect, it } from 'vitest'
import type { FlowEvent } from '../src/data/contract.gen'
import { blockNote, blockTitle, missingNote, reportsThinking, thinkingQuery, type ThinkingBlock } from '../src/drawer/thinkingModel'

const call = (extra: Partial<FlowEvent> = {}): FlowEvent =>
  ({ type: 'api_call', ts: 1700000000.25, source: 'store', rt_tokens: null, cum_tokens: null, ...extra })
const block = (extra: Partial<ThinkingBlock> = {}): ThinkingBlock => ({
  thinking_key: 'k', request_key: 'r', ts: 1700000000, agent_id: '', model: 'm', turn_index: 1, block_index: 0,
  chars: 1204, tool: 'claude-code', text: '', text_state: 'kept', ...extra,
})

describe('Thinking text of a model call in the flow', () => {
  it('reads the blocks only of a call that reported thinking', () => {
    expect(reportsThinking(call())).toBe(false)
    expect(reportsThinking(call({ thinking_chars: 10 }))).toBe(true)
    expect(reportsThinking(call({ reasoning_tokens: 3 }))).toBe(true)
  })

  it('names the call by session, time and agent; the main agent sends no agent', () => {
    expect(thinkingQuery('s', call())).toEqual({ session_id: 's', ts: 1700000000.25, agent: undefined })
    expect(thinkingQuery('s', call({ agent_id: 'sub' }))).toEqual({ session_id: 's', ts: 1700000000.25, agent: 'sub' })
  })

  it('says why a block has no text, with the stored size, never an empty box', () => {
    expect(blockNote(block({ text_state: 'not_kept' }))).toBe('Text not kept: this node does not keep text (1,204 characters reported).')
    expect(blockNote(block({ text_state: 'expired', chars: null }))).toContain('an unknown number of characters')
    expect(blockNote(block({ text_state: 'not_stored' }))).toContain('No text was stored')
    expect(blockNote(block({ text: 'x' }))).toBe('')
    expect(blockTitle(block(), 1, 3)).toBe('Block 2 of 3 · 1,204 characters')
  })

  it('says what the call reported when no block is stored', () => {
    expect(missingNote(call({ thinking_chars: 5400 }))).toMatch(/^The model reported 5,400 characters of thinking/)
    expect(missingNote(call({ reasoning_tokens: 30 }))).toMatch(/^The model reported 30 tokens of thinking/)
  })
})
