import type { FlowEvent } from '../data/contract.gen'
import { eventIdentity } from './flowModel'

export type TokenMode = 'all' | 'fresh' | 'cached'

export function entityOf(event: FlowEvent) {
  switch (event.type) {
    case 'user_message': return 'Prompt'
    case 'api_call': case 'api_response': return event.model || 'Model'
    case 'tool_use': return event.to || event.name || 'Tool'
    case 'subagent': return event.to || 'Subagent'
    case 'compaction': return 'Compaction'
    case 'error': return 'Error'
    case 'hook': return event.hook_name || 'Hook'
    default: return event.type
  }
}

export function tokensFor(event: FlowEvent, mode: TokenMode) {
  if (!event.tokens) return undefined
  const { input, output, cache_read, cache_creation } = event.tokens
  const fresh = [input, output], cached = [cache_read, cache_creation]
  const values = mode === 'fresh' ? fresh : mode === 'cached' ? cached : [...fresh, ...cached]
  return values.some(value => value != null) ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : undefined
}

export type Slot = { id: string; event: FlowEvent } | { id: string; gap: number }
export function slotsOf(events: readonly FlowEvent[]) {
  const slots: Slot[] = []
  for (let index = 0; index < events.length; index++) {
    const event = events[index]
    const id = eventIdentity(event)
    if (index && event.ts - events[index - 1].ts > 30) slots.push({ id: `gap:${id}`, gap: event.ts - events[index - 1].ts })
    slots.push({ id, event })
  }
  return slots
}
