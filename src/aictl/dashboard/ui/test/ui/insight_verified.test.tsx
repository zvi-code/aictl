// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import VerifiedCommits from '../../src/panels/insights/VerifiedCommits'
import { passMissingText, shareText, untestedText, verifiedFinding, verifiedHero, type VerifiedBody, type VerifiedTool } from '../../src/panels/insights/verifiedModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import { drawerPatch, nextAddress } from '../../src/shell/viewState'
import { createBoxes } from '../../src/ui/Box'
import { installDom, layoutHeaders, mount } from './dom'

const label = (tool: string) => ({ 'copilot-cli': 'Copilot CLI', 'copilot-desktop': 'Copilot app', 'claude-code': 'Claude Code' }[tool] ?? tool)
const zero = {
  passed: 0, unreported: 0, failed: 0, changed_after: 0, never_tested: 0, no_change: 0, unknown_change: 0, not_recorded: 0,
  by_subagent: 0, own_unseen: 0, commit_sessions: 0, top_session_commits: 0, edit_sessions: 0, untested_sessions: 0, commands: 10,
  commands_with_text: 10, test_runs: 0, test_results: 0, remote_commits: 0, edits_no_file: 0, sessions_no_text: 0,
  sessions_edits_unrecorded: 0, unchecked: 0,
}
const tool = (values: Partial<VerifiedTool> & { tool: string; commits: number | null }): VerifiedTool => ({
  ...zero, classified: null, unseen: null, checked: false, unseen_share: null, own_unseen_share: null,
  pass_tool: ['copilot-cli', 'copilot-desktop'].includes(values.tool), ...values,
} as VerifiedTool)
const cli = tool({
  tool: 'copilot-cli', commits: 506, passed: 0, unreported: 190, changed_after: 211, never_tested: 4, no_change: 6, not_recorded: 95,
  own_unseen: 170, top_session_commits: 48, edit_sessions: 59, untested_sessions: 13, test_results: 269, classified: 411, unseen: 215,
  checked: true, unseen_share: 215 / 411, own_unseen_share: 170 / 411, unchecked: 95,
})
const app = tool({
  tool: 'copilot-desktop', commits: 141, passed: 2, changed_after: 3, not_recorded: 136, top_session_commits: 116, edit_sessions: 23,
  untested_sessions: 22, classified: 5, unseen: 3, checked: false, unchecked: 141,
})
const claude = tool({
  tool: 'claude-code', commits: 10, passed: null, unreported: 4, failed: 2, changed_after: 2, never_tested: 1, no_change: 1,
  unknown_change: 0, own_unseen: 1, top_session_commits: 3, edit_sessions: 6, untested_sessions: 2, classified: 10, unseen: 3,
  checked: true, unseen_share: 0.3, own_unseen_share: 0.1,
})
const codex = tool({
  tool: 'codex-cli', commits: null, passed: null, unreported: null, failed: null, changed_after: null, never_tested: null,
  no_change: null, unknown_change: null, not_recorded: null, own_unseen: null, untested_sessions: null, commands_with_text: 0,
  sessions_no_text: 3, unchecked: null,
})
const base = {
  card: 'verified', view: 'insights.verified_commits', range: { since: 1_700_000_000, until: 1_700_086_400 },
  data_range: { first_ts: 1_700_000_100, last_ts: 1_700_080_000 }, computed_at: 1_700_086_000,
  query: { view: 'insights.verified_commits', kql: '// aictl view insights.verified_commits\ntool_invocations | take 1', kusto_url: 'https://c.kusto.windows.net/db' },
}
const summary = {
  commits: 506, classified: 411, unseen: 215, unseen_share: 215 / 411, own_unseen: 170, own_unseen_share: 170 / 411, changed_after: 211,
  never_tested: 4, failed: 0, passed: 0, unchecked: 95, edit_sessions: 59, untested_sessions: 13, remote_commits: 0, sessions_no_text: 0,
  checked_tools: ['copilot-cli'], not_reported: [], not_classified: [], one_session: [],
}
const only = { ...base, tools: [cli], summary, sessions: [] } as unknown as VerifiedBody
const fleet = {
  ...base, tools: [cli, app, claude, codex],
  summary: { ...summary, commits: 657, classified: 421, unseen: 218, unseen_share: 218 / 421, own_unseen: 171, own_unseen_share: 171 / 421,
    failed: 2, unchecked: 236, edit_sessions: 88, untested_sessions: 37, checked_tools: ['copilot-cli', 'claude-code'],
    not_reported: ['codex-cli'], not_classified: ['copilot-desktop'], one_session: ['copilot-desktop'], sessions_no_text: 3 },
  sessions: [{ session_id: 's-commit', node_id: 'n', tool: 'copilot-cli', commits: 48, unseen: 30, never_tested: 1, own_unseen: 20,
    by_subagent: 5, last_commit: 1_700_050_000 }],
} as unknown as VerifiedBody

function context(state: DetailState<unknown> | undefined, opened: string[] = []) {
  const ctx = {
    scope: () => 'local', nodeId: () => null, paused: () => false, copy() {}, board: () => undefined,
    openAgent(id: string, tab = 'flow') {
      opened.push(`${id}:${tab}`)
      history.pushState(null, '', nextAddress(drawerPatch({ type: 'agent', id, tab })))
    },
    detail: (path: () => string | undefined) => Object.assign(() => path() ? state : undefined, { retry() {} }),
  } as unknown as PanelContext
  return ctx
}
const props = (ctx: PanelContext) => ({ ctx, boxes: createBoxes('test-verified'), since: base.range.since, until: base.range.until })

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=insights&range=all') })

describe('INS-11 · Verified before commit', () => {
  it('states the share of checked commits no test run saw, the own-agent share and the untested sessions', () => {
    expect(verifiedFinding(only, label)).toBe('215 of the 411 Copilot CLI commits that can be checked (52%) were made after ' +
      "source changes no test run had seen (41% counting only the committing agent's own work), and 13 of the 59 Copilot CLI " +
      'sessions that changed source files never ran a recognised test. 95 more commits could not be checked because the tool did not ' +
      'record what they changed.')
    expect(verifiedHero(only)).toEqual({ value: '52%',
      label: 'of classified agent commits were made after source changes no test run saw (215 of 411)' })
  })

  it('adds failing runs and one-session tools, and names no tool when several are pooled', () => {
    const text = verifiedFinding(fleet, label)
    expect(text).toMatch(/^218 of the 421 Copilot CLI and Claude Code commits that can be checked \(52%\)/)
    expect(text).toContain(' 236 more commits could not be checked')
    expect(text).toContain(' 2 commits followed a failing test run with no source change in between.')
    // Untested sessions per tool, so that no tool is credited with another tool's sessions.
    expect(text).toContain('and 13 of the 59 Copilot CLI sessions, 22 of the 23 Copilot app sessions and 2 of the 6 Claude Code ' +
      'sessions that changed source files never ran a recognised test.')
    expect(text).toMatch(/ Most of Copilot app's commits come from one session\.$/)
    const three = { ...fleet, summary: { ...fleet.summary, checked_tools: ['copilot-cli', 'claude-code', 'copilot-vscode'] } } as VerifiedBody
    expect(verifiedFinding(three, label)).toMatch(/^218 of the 421 commits that can be checked/)
  })

  it('never reads a figure the source does not keep as zero', () => {
    const none = { ...base, tools: [codex], sessions: [], summary: { ...summary, commits: null, classified: null, unseen: null,
      unseen_share: null, own_unseen: null, own_unseen_share: null, changed_after: null, never_tested: null, failed: null, passed: null,
      unchecked: null, edit_sessions: null, untested_sessions: null, checked_tools: [], not_reported: ['codex-cli'] } } as unknown as VerifiedBody
    expect(verifiedFinding(none, label)).toBe('The sources in this period keep no command text (codex-cli), so their commits cannot be seen.')
    expect(verifiedHero(none)).toBeUndefined()
    expect(shareText(codex)).toBe('commits not reported: command text not kept')
    expect(untestedText(codex)).toBe('sessions that never tested: not reported')
    expect(shareText(app)).toBe('not classified: edits not recorded')
    const unchecked = { ...base, tools: [app], sessions: [], summary: { ...summary, commits: 141, classified: 0, unseen: null,
      unseen_share: null, own_unseen: null, own_unseen_share: null, unchecked: 141, edit_sessions: 23, untested_sessions: 22,
      checked_tools: [], not_classified: ['copilot-desktop'], one_session: ['copilot-desktop'] } } as unknown as VerifiedBody
    expect(verifiedFinding(unchecked, label)).toBe('None of the 141 commits in this period can be checked because the tool did not ' +
      "record what they changed, and 22 of the 23 Copilot app sessions that changed source files never ran a recognised test. Most of Copilot app's " +
      'commits come from one session.')
    expect(verifiedHero(unchecked)).toBeUndefined()
    const quiet = { ...base, tools: [tool({ tool: 'copilot-cli', commits: 0, edit_sessions: 2, untested_sessions: 2 })], sessions: [],
      summary: { ...summary, commits: 0, classified: 0, unseen: null, unseen_share: null, own_unseen: null, own_unseen_share: null,
        unchecked: 0, edit_sessions: 2, untested_sessions: 2, checked_tools: [] } } as unknown as VerifiedBody
    expect(verifiedFinding(quiet, label)).toBe('No agent commit in this period; 2 of the 2 Copilot CLI sessions that changed source files never ran a recognised test.')
  })

  it('draws a 100% bar per tool, with a pass segment only where the tool records one, and opens a session', () => {
    const opened: string[] = []
    const ctx = context({ data: fleet, status: 'ready', error: null }, opened)
    const { host, dispose } = mount(() => <VerifiedCommits {...props(ctx)} />)
    const box = host.querySelector('[data-box="insight-verified"]')!
    expect(box.querySelector('[data-hero] strong')!.textContent).toBe('52%')
    const row = box.querySelector('[data-tool="copilot-cli"]')!
    expect(row.textContent).toContain('copilot-cli · 506 commits')
    expect(row.querySelector('[data-share]')!.textContent).toBe('52% no test saw (own agent 41%) · 215 of 411 classified')
    expect(row.querySelector('[data-untested]')!.textContent).toBe('13 of 59 sessions that changed source files never tested')
    const segments = [...row.querySelectorAll('[data-segment]')]
    expect(segments.map(segment => segment.getAttribute('data-segment'))).toEqual(
      ['unreported', 'changed_after', 'never_tested', 'no_change', 'unclassified'])
    expect(segments[1].getAttribute('title')).toBe('Changed after last test: 211, 42% of all commits')
    expect(segments[1].getAttribute('style')).toContain('inline-size: 41.70%')
    const claudeRow = box.querySelector('[data-tool="claude-code"]')!
    expect(claudeRow.querySelector('[data-pass]')!.textContent).toBe('pass not recorded by this tool')
    expect(claudeRow.querySelector('[data-segment="passed"]')).toBeNull()
    expect(box.querySelector('[data-tool="copilot-desktop"] [data-segment="passed"]')).not.toBeNull()
    expect(box.querySelector('[data-tool="copilot-desktop"] [data-share]')!.textContent).toBe('not classified: edits not recorded')
    const text = box.querySelector('[data-tool="codex-cli"]')!
    expect(text.querySelector('[data-missing]')!.textContent).toBe('commits not reported: command text not kept')
    expect(text.querySelector('[role="img"]')).toBeNull()
    const sessions = host.querySelector<HTMLDetailsElement>('[data-sessions]')!
    sessions.open = true
    flush()
    host.querySelector<HTMLButtonElement>('button[aria-label="Open session s-commit"]')!.click()
    flush()
    expect(opened).toEqual(['s-commit:flow'])
    dispose()
  })

  it('names the tool of every untested session, also one with no commit beside a pooled tool', () => {
    const idle = tool({ tool: 'copilot-cli', commits: 0, edit_sessions: 2, untested_sessions: 2 })
    const pooled = { ...claude, untested_sessions: 0, edit_sessions: 5 }
    const body = { ...base, tools: [pooled, idle], sessions: [], summary: { ...summary, commits: 10, classified: 10, unseen: 3,
      unseen_share: 0.3, own_unseen: null, own_unseen_share: null, no_change: 1, failed: 0, unchecked: 0, edit_sessions: 7,
      untested_sessions: 2, checked_tools: ['claude-code'] } } as unknown as VerifiedBody
    expect(verifiedFinding(body, label)).toBe('3 of the 10 Claude Code commits that can be checked (30%) were made after source ' +
      'changes no test run had seen, and 0 of the 5 Claude Code sessions and 2 of the 2 Copilot CLI sessions that changed ' +
      'source files never ran a recognised test.')
  })

  it('gives no lead figure when no checked commit followed a source change, and says why', () => {
    const cli4 = tool({ tool: 'copilot-cli', commits: 4, passed: null, failed: null, no_change: 4, edit_sessions: 3, untested_sessions: 3,
      classified: 4, unseen: 0, checked: true, unseen_share: 0, own_unseen_share: 0 })
    const body = { ...base, tools: [cli4], sessions: [], summary: { ...summary, commits: 4, classified: 4, unseen: 0, unseen_share: 0,
      own_unseen: 0, own_unseen_share: 0, no_change: 4, failed: null, passed: null, unchecked: 0, edit_sessions: 3,
      untested_sessions: 3, checked_tools: ['copilot-cli'] } } as unknown as VerifiedBody
    expect(verifiedHero(body)).toBeUndefined()
    expect(verifiedFinding(body, label)).toBe('None of the 4 Copilot CLI commits that can be checked followed a source change, and ' +
      '3 of the 3 Copilot CLI sessions that changed source files never ran a recognised test.')
    const most = { ...body, summary: { ...body.summary, classified: 10, unseen: 2, unseen_share: 0.2, own_unseen_share: null,
      no_change: 6 } } as unknown as VerifiedBody
    expect(verifiedHero(most)!.value).toBe('20%')
    expect(verifiedFinding(most, label)).toContain('never ran a recognised test. 6 of the 10 checked commits followed no source change.')
  })

  it('says a Copilot pass is missing for want of a recorded result, not because the tool never records one', () => {
    const quietCli = tool({ tool: 'copilot-cli', commits: 4, passed: null, failed: null, no_change: 4, test_results: 0, classified: 4,
      unseen: 0, checked: true, unseen_share: 0 })
    expect(passMissingText(quietCli)).toBe('no test run with a recorded result in this period')
    expect(passMissingText(claude)).toBe('pass not recorded by this tool')
    const body = { ...base, tools: [quietCli, claude], sessions: [], summary: { ...summary, commits: 14 } } as unknown as VerifiedBody
    const { host, dispose } = mount(() => <VerifiedCommits {...props(context({ data: body, status: 'ready', error: null }))} />)
    expect(host.querySelector('[data-tool="copilot-cli"] [data-pass]')!.textContent).toBe('no test run with a recorded result in this period')
    expect(host.querySelector('[data-tool="claude-code"] [data-pass]')!.textContent).toBe('pass not recorded by this tool')
    dispose()
  })

  it('draws only a recorded pass in the success colour', () => {
    const css = readFileSync(join(__dirname, '../../src/panels/insights/VerifiedCommits.module.css'), 'utf8')
    const rules = Object.fromEntries([...css.matchAll(/^\.(\w+)\s*\{([^}]*)\}/gm)].map(match => [match[1], match[2]]))
    expect(rules.passed).toContain('--color-success')
    expect(Object.entries(rules).filter(([, body]) => body.includes('--color-success')).map(([name]) => name)).toEqual(['passed'])
  })

  it('keeps its own loading and error state', () => {
    const failing = mount(() => <VerifiedCommits {...props(context({ data: undefined, status: 'error',
      error: new Error('Kusto view insights.verified_commits failed') }))} />)
    expect(failing.host.textContent).toContain('Could not load Verified before commit: Kusto view insights.verified_commits failed')
    failing.dispose()
  })
})
