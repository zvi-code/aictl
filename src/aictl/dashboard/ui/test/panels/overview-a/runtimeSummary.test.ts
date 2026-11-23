import { describe, expect, it } from 'vitest'
import { overlayAgents, runtimeSummary, unlinkedProcesses } from '../../../src/data/runtimeAgents'
import { agentsCounts, agentsHeader, runningDetail, unlinkedText, type TreeAgent } from '../../../src/panels/overview/agentTree'
import { storeHarness } from '../../data/harness'
import { liveCapabilities, liveEntity } from '../../fixtures/live.fixture'

const reason = 'aictl has no per-process session source for the desktop app'

// One runtime report as the collector publishes it: three linked sessions, three processes with no session.
function runtime() {
  const { store, bootstrap, tick } = storeHarness()
  const session = (id: string, tool: string, status: string, activity: string) => liveEntity('runtime.agent', id, {
    id, session_id: id, native_session_id: id, tool, pids: [id.length], running: true, status, native_activity: activity,
    unlinked_reason: null })
  const process = (id: string, tool: string) => liveEntity('runtime.agent', id, {
    id, session_id: id, native_session_id: null, monitor_session_id: id, tool, pids: [id.length + 100], running: true,
    status: 'unknown', native_activity: 'unknown', unlinked_reason: reason })
  bootstrap([
    session('s-work', 'claude-code', 'running', 'working'),
    session('s-idle', 'claude-code', 'idle', 'idle'),
    session('s-quiet', 'copilot-cli', 'unknown', 'unknown'),
    process('claude-desktop:1:1', 'claude-desktop'),
    process('claude-desktop:2:1', 'claude-desktop'),
    process('copilot-desktop:3:1', 'copilot-desktop'),
  ])
  tick()
  return [...(store.topic('runtime.agent')?.values() ?? [])]
}

const ACTIVE = new Set(['running', 'looping', 'waiting'])

// The stored rows the board sends for the same moment: one subagent runs, one is idle, one ended.
const history = [
  { id: 's-work', status: 'running', tool: 'claude-code' },
  { id: 's-idle', status: 'idle', tool: 'claude-code' },
  { id: 's-quiet', status: 'running', tool: 'copilot-cli' },
  { id: 'a-run', parent_id: 's-work', kind: 'subagent', status: 'running', tool: 'claude-code' },
  { id: 'a-idle', parent_id: 's-work', kind: 'subagent', status: 'idle', tool: 'claude-code' },
  { id: 'a-done', parent_id: 's-idle', kind: 'subagent', status: 'ended', tool: 'claude-code' },
]
// kpis.subagents_running as board_projection counts it: subagents whose status is in ACTIVE_STATUSES.
const kpis = { idle: 1, subagents_running: history.filter(row => row.parent_id && ACTIVE.has(row.status)).length }

describe('live runtime summary', () => {
  it('counts sessions only and the processes with no session apart from them, per tool', () => {
    const summary = runtimeSummary(runtime())
    expect(summary.sessions).toBe(3)
    expect(summary.tools).toEqual([['claude-code', 2], ['copilot-cli', 1]])
    expect(summary.unlinked).toBe(3)
    expect(summary.unlinkedTools).toEqual([['claude-desktop', 2], ['copilot-desktop', 1]])
  })

  it('reports activity unknown for sessions only, never for a process with no session', () => {
    expect(runtimeSummary(runtime())).toMatchObject({ running: 1, idle: 1, unknown: 1 })
  })

  it('takes the running subagents from the stored rows, not from the runtime report', () => {
    // The runtime report has no subagent records: it must not say 0 while a subagent runs.
    expect(runningDetail(runtimeSummary(runtime()), kpis)).toBe('1 subagent running · 1 idle · 1 activity unknown')
  })
})

describe('Overview and Agents panel agree', () => {
  it('on sessions, unlinked processes and running subagents from one set of records', () => {
    const entities = runtime()
    const fields = liveCapabilities.topics['runtime.agent'].fields
    const rows = overlayAgents(history, entities, fields) as TreeAgent[]
    const unlinked = unlinkedProcesses(history, entities)
    const panel = agentsCounts(rows)
    const overview = runtimeSummary(entities)

    // Every listed session is live here, so both count the same sessions.
    expect(panel.sessions).toBe(overview.sessions)
    expect(unlinked.length).toBe(overview.unlinked)
    expect(panel.running).toBe(kpis.subagents_running)
    expect(agentsHeader(panel, unlinked.length)).toBe(
      '3 sessions with activity in the selected time · 3 subagents (1 running) · 3 unlinked processes (not sessions), listed below the table')
    // The Overview names them with the same words and the same number.
    expect(agentsHeader(panel, unlinked.length)).toContain(unlinkedText(overview.unlinked))
    expect(runningDetail(overview, kpis)).toMatch(new RegExp(`^${panel.running} subagent running`))
  })

  it('counts a live session with no line in the selected time apart from the sessions of that time', () => {
    const rows: TreeAgent[] = [
      { id: 'a', kind: 'main' }, { id: 'a/1', parent_id: 'a', kind: 'subagent', status: 'running' },
      { id: 'b', kind: 'main', no_history: 'No activity recorded in the selected time' },
    ]
    const counts = agentsCounts(rows)
    // The Recorded agent activity panel counts 1 session in the time: the header says 1, not 2.
    expect([counts.recorded, counts.liveOnly, counts.sessions]).toEqual([1, 1, 2])
    expect(agentsHeader(counts, 0)).toBe(
      '1 session with activity in the selected time · 1 more live now with none in it · 1 subagents (1 running)')
  })
})
