import { stamp } from '../design/format'

/** The tile of the tool definitions reads the last model call. */
export const TOOL_DEFINITIONS_TILE = 'Tool definitions, last call'

/**
 * The label of a part of the context breakdown. Tool definitions are measured twice: the last model call reports them,
 * and a session's shutdown report splits the context. The part says which of the two it holds.
 */
export function partLabel(part: { key?: unknown; label?: unknown; estimated?: unknown; tokens?: unknown },
  split: { ts?: number | null; tools?: number | null } | null | undefined) {
  const label = typeof part.label === 'string' ? part.label : 'Context'
  const base = `${label}${part.estimated ? ' (estimated)' : ''}`
  if (part.key !== 'tool_definitions') return base
  return split?.tools != null && split.tools === part.tokens
    ? `${base}, split at ${split.ts != null ? stamp(split.ts, true) : 'shutdown'}` : `${base}, last call`
}

/** The agent of a row of the per-agent table: the main agent has no id of its own, a subagent has its name on the board. */
export const agentName = (agentId: string | null | undefined, title?: string | null) => agentId ? title || agentId : 'main agent'
