import { describe, expect, it } from 'vitest'
import { flowStatus, sessionSpan, spanLabel } from '../src/drawer/sessionSpan'

describe('DRW-HDR-01 · The span of a session', () => {
  it('runs from the first to the last recorded activity, not from the process start or the process exit', () => {
    // Copilot CLI session: first event 08:10:49Z, last 12:45:26Z.
    const span = sessionSpan({ started_at: 1795421449.764, last_activity_at: 1795437926.225 })
    expect(span.seconds).toBeCloseTo(16476.461)
    expect(spanLabel(span)).toBe('4 h 35 min')
  })

  it('says which end is missing instead of showing a total', () => {
    expect(spanLabel(sessionSpan({ started_at: 1, last_activity_at: null }))).toBe('last activity not recorded')
    expect(spanLabel(sessionSpan({ started_at: null, last_activity_at: 5 }))).toBe('first activity not recorded')
    expect(sessionSpan({ started_at: 9, last_activity_at: 5 }).seconds).toBeUndefined()
  })
})

describe('DRW-HDR-02 · Flow status comes from the recorded status', () => {
  it('names an ended session as ended even while the stream is open', () => {
    expect(flowStatus('ended', { streaming: true, filtered: false, subagent: false })).toEqual({ state: 'ended', label: 'Session ended' })
    expect(flowStatus('ended', { streaming: false, filtered: false, subagent: true }).label).toBe('Subagent ended')
  })
  it('names an idle session as idle, and says whether the view follows it', () => {
    expect(flowStatus('idle', { streaming: true, filtered: false, subagent: false })).toEqual({ state: 'live', label: 'Live · idle' })
    expect(flowStatus('idle', { streaming: false, filtered: true, subagent: false })).toEqual({ state: 'paused', label: 'Filtered, not live · idle' })
  })
  it('says so when no status is recorded', () => {
    expect(flowStatus(undefined, { streaming: true, filtered: false, subagent: false }).label).toBe('Status not recorded')
  })
})
