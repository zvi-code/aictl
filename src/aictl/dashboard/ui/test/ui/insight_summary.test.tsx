// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { FindingsSummary } from '../../src/panels/insights/FindingsSummary'
import Subagents from '../../src/panels/insights/Subagents'
import { findingText, reveal, type Finding, type SummaryBody } from '../../src/panels/insights/summaryModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const finding = (item: Partial<Finding> & Pick<Finding, 'kind' | 'card' | 'stake'>): Finding =>
  ({ unit: 'usd', share: null, sessions: null, project: null, session: null, opens: 'sessions', detail: {}, ...item })
const summary: SummaryBody = {
  card: 'summary', range: { since: 1_700_000_000, until: 1_700_086_400 }, computed_at: 1_700_086_000, total_usd: 4000, missing: ['rereads'],
  findings: [
    finding({ kind: 'top_session', card: 'problems', stake: 1000, share: 0.25, sessions: 1, opens: 'session',
      session: { session_id: 's-top', node_id: 'n', tool: 'copilot-cli' }, project: { name: 'loop', sessions: 1, stake: 1000 } }),
    finding({ kind: 'subagents', card: 'subagents', stake: 900, share: 0.225, sessions: 13,
      project: { name: 'loop', sessions: 8, stake: 450 }, detail: { subagents: 40, requests: 500 } }),
    finding({ kind: 'never_edited', card: 'orientation', stake: 130, share: 0.0325, sessions: 128, opens: 'card' }),
    finding({ kind: 'untested', card: 'verified', stake: 7, unit: 'sessions', share: 0.44, sessions: 7, detail: { edit_sessions: 16 } }),
  ],
}
const subagentBody = {
  card: 'subagents', view: 'insights.subagents', range: summary.range, data_range: { first_ts: 1, last_ts: 2 }, computed_at: 3,
  query: { view: 'insights.subagents', kql: 'requests', kusto_url: null },
  tools: [{ tool: 'copilot-cli', main: { requests: 10, priced: 10, cost_usd: 37 }, subagents: { requests: 30, priced: 30, cost_usd: 63, agents: 4 }, subagent_share: 0.63 }],
  summary: { main_cost_usd: 37, subagent_cost_usd: 63, subagent_share: 0.63, subagents: 4, subagent_requests: 30 },
  sessions: [{ session_id: 's-sub', node_id: 'n', tool: 'copilot-cli', requests: 30, cost_usd: 63, main_cost: 37, agents: 4 }],
}

function context(opened: string[], requested: string[]) {
  return {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined, filters: () => ({ projects: [], repos: [] }),
    openAgent(id: string) { opened.push(id) },
    detail: (path: () => string | undefined) => Object.assign(() => {
      const value = path()
      if (!value) return undefined
      requested.push(value)
      const data = value.includes('/summary') ? summary : subagentBody
      return { data, status: 'ready', error: null } as DetailState<unknown>
    }, { retry() {} }),
  } as unknown as PanelContext
}

let scrolled: string[] = []
beforeEach(() => {
  installDom(); layoutHeaders(); reveal(null); scrolled = []
  // jsdom lays nothing out, so it has no scrollIntoView: record which box was brought into view.
  Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this.getAttribute('data-box') ?? '') }
})

describe('INS-SUM · The findings summary ranks what the cards found by its stake', () => {
  it('lists each finding with its stake, its share and where it is, and says the stakes overlap', () => {
    const opened: string[] = [], requested: string[] = []
    const ctx = context(opened, requested)
    const { host, dispose } = mount(() => <FindingsSummary ctx={ctx} boxes={createBoxes('test-summary')} since={summary.range.since} until={summary.range.until} />)
    flush()
    const lines = [...host.querySelectorAll('[data-finding-kind]')]
    expect(lines.map(line => line.getAttribute('data-finding-kind'))).toEqual(['top_session', 'subagents', 'never_edited', 'untested'])
    expect(lines.map(line => line.querySelector('[data-stake]')!.textContent)).toEqual(['$1,000', '$900', '$130', '7 sessions'])
    expect(lines[0].textContent).toContain('One session cost $1,000 on its own.')
    expect(lines[0].textContent).toContain('25% of the period\'s cost · in loop')
    expect(lines[1].textContent).toContain('40 subagents in 13 sessions made 500 requests and cost $900.')
    expect(lines[1].textContent).toContain('most in loop: $450 (50%), 8 sessions')
    expect(lines[3].textContent).toContain('7 of 16 sessions that changed source code never ran a test.')
    expect(host.querySelector('[data-overlap]')!.textContent).toContain('do not add them up')
    expect(host.querySelector('[data-missing]')!.textContent).toContain('Repeated file reads')
    // One request for the whole list.
    expect(new Set(requested.filter(path => path.includes('insights/summary'))).size).toBe(1)
    expect(requested.every(path => path.includes('insights/summary'))).toBe(true)
    // The one-session finding opens the session itself.
    lines[0].querySelector('button')!.click()
    expect(opened).toEqual(['s-top'])
    dispose()
  })

  it('opens the session list of the card a finding points to once the card has loaded', () => {
    const opened: string[] = [], requested: string[] = []
    const ctx = context(opened, requested)
    const boxes = createBoxes('test-summary-open')
    const { host, dispose } = mount(() => <>
      <FindingsSummary ctx={ctx} boxes={boxes} since={summary.range.since} until={summary.range.until} />
      <Subagents ctx={ctx} boxes={boxes} since={summary.range.since} until={summary.range.until} />
    </>)
    flush()
    const sessions = () => host.querySelector<HTMLDetailsElement>('[data-box="insight-subagents"] details[data-sessions]')!
    expect(sessions().open).toBe(false)
    host.querySelector('[data-finding-kind="subagents"] button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flush()
    expect(sessions().open).toBe(true)
    expect(scrolled).toEqual(['insight-subagents'])
    expect(host.querySelector<HTMLDetailsElement>('[data-box="insight-subagents"] details[data-more]')!.open).toBe(true)
    dispose()
  })

  it('words a finding with no project or session plainly, from its own figures', () => {
    expect(findingText(finding({ kind: 'pause_tax', card: 'pause', stake: 39, sessions: 2,
      detail: { requests: 5, cost_usd: 40, baseline_usd: 1 } })))
      .toBe('5 requests came after a pause of over 5 minutes in 2 sessions and cost $40.00; without the pause they would cost ' +
        'about $1.00, so the pauses cost $39.00 more.')
    // With the cause of the long pauses: the same words as the card's own finding.
    const cause = { top: 'other_agent_working', top_usd: 20, top_share: 0.5, cost_usd: 40, busy_usd: 30, busy_share: 0.75,
      person_usd: 4, person_share: 0.1 } as const
    expect(findingText(finding({ kind: 'pause_tax', card: 'pause', stake: 39, sessions: 2,
      detail: { requests: 5, cost_usd: 40, baseline_usd: 1 }, cause })))
      .toBe('5 requests came after a pause of over 5 minutes in 2 sessions and cost $40.00; without the pause they would cost ' +
        'about $1.00, so the pauses cost $39.00 more. The largest cause by cost is another agent working (the main agent waits ' +
        'while subagents work): $20.00, 50% of the long-pause cost. The agent itself was busy for 75% of that cost (a call ' +
        'running or another agent working); it waited for the person for 10% (a new prompt, an approval or an answer).')
    expect(findingText(finding({ kind: 'failure_runs', card: 'failures', stake: 1, unit: 'runs', detail: { streak_calls: 3, longest: null } })))
      .toBe('1 run of 3 or more failed calls in a row, 3 calls in all.')
  })
})
