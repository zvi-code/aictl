// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { DetailAgent } from '../../src/data/contract.gen'
import { agentName, partLabel } from '../../src/drawer/contextModel'
import type { TabProps } from '../../src/drawer/shared'
import Context from '../../src/drawer/tabs/Context'
import type { DrawerProps } from '../../src/shell/drawerTypes'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent)
const SID = '1f4c8ec7-7a9a-44a9-b1b5-056b06402d35'
const split = { ts: new Date(2026, 10, 16, 14, 51, 0).getTime() / 1000, current: 75162, system: 15355, conversation: 14388, tools: 45415 }
// A Copilot CLI session: the last model call reports 49,642 tokens of tool definitions, the shutdown split 45,415.
const detail = {
  agent: { id: SID }, subagents: [{ id: `${SID}/58f1831d`, title: 'task: check OpenTelemetry' }], tool_calls: [], checkpoints: [],
  context: { first: 55540, last: 74675, peak: 74675, calls: 18, tool_tokens: 49642, prompt_limit: 200000, limit_share: 0.37, series: [1, 2], split,
    by_agent: [{ agent_id: '', address: SID, calls: 18, first: 55540, last: 74675, peak: 74675 },
      { agent_id: '58f1831d', address: `${SID}/58f1831d`, calls: 3, first: 34101, last: 34865, peak: 34865 }],
    breakdown: { total: 74675, limit: 200000, parts: [{ key: 'tool_definitions', label: 'Tool definitions', tokens: 45415, estimated: false, items: [] },
      { key: 'system_prompt', label: 'System prompt', tokens: 15355, estimated: false, items: [] }] } },
} as unknown as DetailAgent
const tab = { shell: { ctx: { copy() {}, scope: () => 'local', nodeId: () => null, detail: () => Object.assign(() => undefined, { retry() {} }) } } as unknown as DrawerProps,
  entry: { type: 'agent', id: SID, tab: 'context' }, detail: Object.assign(() => ({ data: detail, status: 'ready', error: null }), { retry() {} }),
  agent: () => detail.agent, runtime: () => undefined, session: () => SID } as unknown as TabProps

beforeEach(() => { installDom(); layoutHeaders() })

describe('DRW-CX-01 · Context figures say what they measure', () => {
  it('names the source of the tool definitions in the tile and in the breakdown', () => {
    expect(partLabel({ key: 'tool_definitions', label: 'Tool definitions', tokens: 45415 }, split)).toMatch(/^Tool definitions, split at /)
    expect(partLabel({ key: 'tool_definitions', label: 'Tool definitions', tokens: 49642 }, split)).toBe('Tool definitions, last call')
    expect(partLabel({ key: 'tool_definitions', label: 'Tool definitions', tokens: 1 }, null)).toBe('Tool definitions, last call')
    expect(partLabel({ key: 'system_prompt', label: 'System prompt', estimated: true }, split)).toBe('System prompt (estimated)')
  })

  it('calls the main agent the main agent and a subagent by its name', () => {
    expect(agentName('')).toBe('main agent')
    expect(agentName('58f1831d', 'task: check OpenTelemetry')).toBe('task: check OpenTelemetry')
    expect(agentName('58f1831d')).toBe('58f1831d')
  })

  it('shows both tool-definition figures with their source, the window limit, and no blank agent', () => {
    const { host, dispose } = mount(() => <Context {...tab} />)
    const text = host.textContent!
    expect(text).toMatch(/Tool definitions, last call\s*49,?642/)
    expect(text).toMatch(/Tool definitions, split at/)
    expect(text).toMatch(/Context window\s*200,?000|Context window\s*200 k/)
    const byAgent = Array.from(host.querySelectorAll('section')).flatMap(section => bodyRows(section).map(cells))
      .filter(row => row.includes('18') && row.includes('55540') || row[0]?.startsWith('main agent') || row[0]?.startsWith('task:'))
    expect(byAgent.map(row => row[0])).toEqual(['main agent', 'task: check OpenTelemetry'])
    dispose()
  })
})
