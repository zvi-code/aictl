import type { BoardCredits } from '../../data/contract.gen'
import { fmtCredits, fmtN, fmtUsd } from '../../design/format'

/**
 * The board cost with Copilot at what it billed, when Copilot recorded credits in view.
 * GitHub publishes 1 AI credit = $0.01, so the credits are dollars, unlike a list-price estimate.
 */
export function billedCost(credits: BoardCredits | undefined): number | undefined {
  return credits?.usd != null && credits.cost_usd != null ? credits.cost_usd : undefined
}

/** What Copilot billed, then the list-price estimate of the same usage and what that estimate leaves out. */
export function copilotBilledText(credits: BoardCredits | undefined): string | undefined {
  if (credits?.usd == null || credits.amount == null) return undefined
  const left = credits.list_unpriced_tokens ? `, leaves out ${fmtN(credits.list_unpriced_tokens)} tokens with no list price` : ''
  return `Copilot billed ${fmtUsd(credits.usd)} (${fmtCredits(credits.amount)} AI credits at $${credits.usd_per_credit ?? 0.01})` +
    `${credits.approximate ? ', whole days' : ''}; list-price estimate ${fmtUsd(credits.list_usd)}${left}`
}
