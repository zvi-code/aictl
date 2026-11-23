// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Events, { calledTool } from '../../src/drawer/tabs/Events'
import { cell, harness } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const event = (kind: string, detail: object, extra: object = {}) => ({ ts: 1000, tool: 'copilot-cli', kind, seq: null, session_id: 's', pid: 0, detail, ...extra })
const rows = [
  event('otel:execute_tool view', { 'gen_ai.tool.name': 'view' }),
  event('otel:github.copilot.hook.start', { 'github.copilot.hook.tool_names': '["task_complete"]' }, { ts: 1001 }),
  event('otel:chat gemini-4-argon', { 'gen_ai.request.model': 'gemini-4-argon' }, { ts: 1002 }),
]
const routes = (events: object[]) => ({ '/api/events': () => events, '/api/events/count': () => ({ count: events.length }) })
const headerTexts = (host: Element) => Array.from(host.querySelectorAll('th[data-col]')).map(th => th.getAttribute('data-col'))

describe('EVT-UI · Events tab', () => {
  it('reads the called tool from the event, and none from an event about no tool', () => {
    expect(calledTool({ 'gen_ai.tool.name': 'bash' })).toBe('bash')
    expect(calledTool({ 'github.copilot.hook.tool_names': '["a","b"]' })).toBe('a, b')
    expect(calledTool({ 'github.copilot.hook.tool_names': 'not a list' })).toBeUndefined()
    expect(calledTool('text')).toBeUndefined()
    expect(calledTool(null)).toBeUndefined()
  })

  it('says it lists the OTel events, shows the called tool apart from the product, and drops a sequence column nothing fills', () => {
    const { tab } = harness(routes(rows), { agent: { started_at: 1, ended_at: null } })
    const { host, dispose } = mount(() => <Events {...tab} />)
    expect(host.querySelector('h3')?.textContent).toBe('OTel events (3)')
    expect(headerTexts(host)).toEqual(['ts', 'kind', 'called_tool', 'tool', '@actions'])
    const header = (id: string) => host.querySelector(`th[data-col="${id}"]`)?.textContent ?? ''
    expect(header('called_tool')).toContain('Called tool')
    expect(header('tool')).toContain('Product')
    const [view, hook, chat] = bodyRows(host)
    expect([cell(view, 'called_tool')?.textContent, cell(hook, 'called_tool')?.textContent, cell(chat, 'called_tool')?.textContent])
      .toEqual(['view', 'task_complete', ''])
    expect(cell(view, 'tool')?.textContent).toBe('copilot-cli')
    dispose()
  })

  it('shows the sequence when an event has one', () => {
    const { tab } = harness(routes([event('otel:x', {}, { seq: 7 })]), { agent: { started_at: 1, ended_at: null } })
    const { host, dispose } = mount(() => <Events {...tab} />)
    expect(headerTexts(host)).toContain('seq')
    dispose()
  })
})
