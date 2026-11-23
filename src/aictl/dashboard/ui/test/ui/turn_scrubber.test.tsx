// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { TurnMark } from '../../src/data/contract.gen'
import { createHover, TurnScrubber } from '../../src/drawer/FlowParts'
import { installDom, mount } from './dom'

const mark = (turn: number, extra: Partial<TurnMark> = {}): TurnMark =>
  ({ turn, offset: turn * 4, ts: 1000 + turn * 60, end_ts: 1030 + turn * 60, events: 4, tokens: 100, tools: 1, errors: 0, subagents: 0,
    prompt: turn ? `prompt ${turn}` : '', ...extra })

beforeEach(() => { installDom() })

describe('DRW-FL-06 · The turn overview counts prompts', () => {
  const show = (marks: TurnMark[]) => mount(() => <TurnScrubber marks={marks} loadedFrom={0} hover={createHover()} pick={() => {}} />)

  it('does not count the part of the session before the first prompt as a turn', () => {
    // Copilot CLI: the session start comes before prompt 1, so there are 8 bars for 7 prompts.
    const { host, dispose } = show([0, 1, 2, 3, 4, 5, 6, 7].map(turn => mark(turn)))
    expect(host.querySelector('header strong')?.textContent).toBe('7 turns')
    const bars = Array.from(host.querySelectorAll('button'))
    expect(bars).toHaveLength(8)
    expect(bars[0].getAttribute('aria-label')).toMatch(/^Before the first prompt/)
    expect(bars[1].getAttribute('aria-label')).toMatch(/^Turn 1 /)
    expect(host.querySelector('header span')?.getAttribute('title')).toContain('not counted as a turn')
    dispose()
  })

  it('counts every bar when the session has no segment before the first prompt', () => {
    const { host, dispose } = show([1, 2, 3].map(turn => mark(turn)))
    expect(host.querySelector('header strong')?.textContent).toBe('3 turns')
    expect(host.querySelector('header span')?.getAttribute('title')).not.toContain('not counted')
    dispose()
  })
})
