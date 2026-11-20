import type { DetailAgentTranscript, TranscriptTurn, UsageTokens } from '../data/contract.gen'

export function responseOf(turn: TranscriptTurn) {
  const chunks = new Set<string>()
  const add = (value?: string | null) => { if (value?.trim()) chunks.add(value.trim()) }
  add(turn.response)
  for (const action of turn.actions) if (action.kind === 'api_response') add(action.text)
  return [...chunks].join('\n\n')
}

export function visibleTurns(transcript: DetailAgentTranscript) {
  return 'turns' in transcript ? transcript.turns : []
}

export function transcriptIdentity(turn: TranscriptTurn) {
  // The full-turn route addresses the turn by this same timestamp.
  return String(turn.ts)
}

export function tokenParts(tokens: UsageTokens) {
  return ([
    ['Input', tokens.input], ['Cache read', tokens.cache_read], ['Output', tokens.output],
  ] as const).flatMap(([label, count]) => count != null && count > 0 ? [{ label, count }] : [])
}
