/**
 * The turn rows, newest first, each with its number counted from the first prompt of the session.
 * The list holds the newest turns only, so the numbers count back from the session's prompt total when it is known.
 */
export function numberedTurns<T extends object>(turns: readonly T[] | null | undefined, prompts?: number | null) {
  if (turns == null) return undefined
  const last = Math.max(turns.length, prompts ?? 0)
  return turns.map((turn, index) => ({ ...turn, n: last - index }))
}
