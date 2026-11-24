import { describe, expect, it } from 'vitest'
import { pauseProjects, type PauseBody } from '../../src/panels/insights/insightsModel'

const row = (project: string | null, tool: string, extra: number | null, sessions = 3) =>
  ({ project, tool, requests: 10, sessions, cost_usd: 1, extra_usd: extra })

describe('INS-PROJ · A card split by project draws the five with the most at stake and sums the rest', () => {
  it('sums a project over its tools, keeps the five that cost the most extra and sums every other one', () => {
    const body = {
      tools: [{ tool: 'copilot-cli' }, { tool: 'claude-code' }],
      projects: [row('loop', 'copilot-cli', 100), row('loop', 'claude-code', 20, 1), row('b', 'copilot-cli', 50), row('c', 'copilot-cli', 40),
        row('d', 'copilot-cli', 30), row('e', 'copilot-cli', 20), row('f', 'copilot-cli', 10), row(null, 'copilot-cli', 500),
        row('g', 'copilot-desktop', 999)],
      summary: { extra_usd: 800 },
    } as unknown as PauseBody
    const split = pauseProjects(body)
    expect(split.top.map(item => [item.project, item.extra, item.sessions])).toEqual([['loop', 120, 4], ['b', 50, 3], ['c', 40, 3],
      ['d', 30, 3], ['e', 20, 3]])
    // f, the requests with no project and every project the card does not compare are in the rest.
    expect(split.rest).toBe(800 - 260)
  })
})
