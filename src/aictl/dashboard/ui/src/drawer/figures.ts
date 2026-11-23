import type { Measure } from './shared'

/** The two token figures of a session have different scopes: each is named for what it counts. */
export const TOKENS_IO = 'Tokens in+out'
export const TOKENS_WITH_CACHE = 'Tokens incl. cache'

const sum = (values: readonly (number | null | undefined)[]) => values.some(value => value != null)
  ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : undefined

interface Usage { input?: number | null; output?: number | null; cache_read?: number | null; cache_write?: number | null }

/** Input and output tokens: what the model read fresh and wrote. */
export const tokensInOut = (usage?: Usage) => sum([usage?.input, usage?.output])
/** Input, output, cache read and cache write tokens together. */
export const tokensWithCache = (usage?: Usage) => sum([usage?.input, usage?.output, usage?.cache_read, usage?.cache_write])

/**
 * The model calls of a session on the same scope as its tokens, cost and tool calls. A main agent's figures include
 * its subagents, so its model calls do too, and the calls of the main agent alone are said beside them.
 */
export function modelCalls(agent?: { msgs?: { assistant?: number | null } | null; includes_subagents?: boolean | null },
  mainAgentCalls?: number | null): Measure {
  const all = agent?.msgs?.assistant
  if (all == null) return { label: 'Model calls', value: mainAgentCalls }
  return { label: 'Model calls', value: all,
    detail: agent?.includes_subagents && mainAgentCalls != null ? `${mainAgentCalls} by the main agent` : undefined }
}
