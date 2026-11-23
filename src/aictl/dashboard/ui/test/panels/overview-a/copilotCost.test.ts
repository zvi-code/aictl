import { describe, expect, it } from 'vitest'
import { billedCost, copilotBilledText } from '../../../src/panels/overview/copilotCost'

const credits = {
  amount: 1277, by_tool: { 'copilot-cli': 1277 }, approximate: false, unit: 'ai_credits' as const,
  usd: 12.77, usd_per_credit: 0.01, list_usd: 6.6, list_unpriced_tokens: 10_300_000, cost_usd: 12.77,
}

describe('Copilot cost', () => {
  it('leads with what Copilot billed and names the list price as an estimate with what it leaves out', () => {
    expect(billedCost(credits)).toBe(12.77)
    expect(copilotBilledText(credits)).toBe(
      'Copilot billed $12.77 (1,277 AI credits at $0.01); list-price estimate $6.60, leaves out 10.3 M tokens with no list price')
  })

  it('says when whole days stand for a window that cuts through them', () => {
    expect(copilotBilledText({ ...credits, approximate: true, list_unpriced_tokens: 0 })).toBe(
      'Copilot billed $12.77 (1,277 AI credits at $0.01), whole days; list-price estimate $6.60')
  })

  it('keeps the list price when no credits were recorded', () => {
    const none = { ...credits, amount: null, usd: null, cost_usd: null }
    expect(billedCost(none)).toBeUndefined()
    expect(copilotBilledText(none)).toBeUndefined()
    expect(billedCost(null)).toBeUndefined()
  })
})
