// The thinking text of one model call in the flow: when the inspector reads it, and what it says when the text is
// not there. The text itself is read on demand (/api/board/thinking), never with the flow page.
import type { DetailThinking, FlowEvent } from '../data/contract.gen'
import { fmtNum } from '../design/format'

export type ThinkingBlock = DetailThinking['blocks'][number]

/** Whether the call reported thinking: only then does the inspector read its blocks. */
export const reportsThinking = (call: FlowEvent) => !!(call.thinking_chars || call.reasoning_tokens)

/** The query of the read of one call's blocks: the session, the call's time and its agent ("" for the main agent). */
export const thinkingQuery = (session: string, call: FlowEvent) =>
  ({ session_id: session, ts: call.ts, agent: call.agent_id || undefined })

const chars = (value: number | null | undefined) => value == null ? 'an unknown number of' : fmtNum(value)

/** Why a block shows no text, with the size the source reported. */
export function blockNote(block: ThinkingBlock): string {
  const size = `${chars(block.chars)} characters`
  switch (block.text_state) {
    case 'not_kept': return `Text not kept: this node does not keep text (${size} reported).`
    case 'expired': return `Text no longer kept: older than the text period (${size} reported).`
    case 'not_stored': return `No text was stored for this block (${size} reported).`
    default: return ''
  }
}

/** What a call that reported thinking says when none of its blocks is stored. */
export function missingNote(call: FlowEvent): string {
  const size = call.thinking_chars ? `${fmtNum(call.thinking_chars)} characters`
    : call.reasoning_tokens ? `${fmtNum(call.reasoning_tokens)} tokens` : 'thinking'
  return `The model reported ${size} of thinking for this call; no block of its text is stored now ` +
    '(removed by retention, kept without text, or not linked to this call by its source).'
}

/** "Block 2 of 3 · 1,204 characters". */
export const blockTitle = (block: ThinkingBlock, index: number, count: number) =>
  `Block ${index + 1} of ${count} · ${chars(block.chars)} characters`
