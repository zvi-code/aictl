// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import Evidence from '../../src/drawer/tabs/Evidence'
import { harness } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const step = (kind: string, n: number) => ({ step_key: `k${n}`, session_id: 's', kind, source: 'x', tool: 'copilot-cli', ts: 1000 + n, text_status: 'not_reported', phase: null })
const page = (rows: object[], extra: object = {}) => ({ session_id: 'sess-1', rows, has_more: false, offset: 0, limit: 100, ...extra })
const routes = (rows: object[], counts: object) => ({
  '/api/session-evidence': (query: URLSearchParams) => query.get('counts') ? counts : page(rows),
})
const options = (host: Element) => Array.from(host.querySelectorAll('option')).map(option => option.textContent)

describe('EVI-UI · Source steps tab', () => {
  it('counts the steps and offers the kinds the session has, with the count of each', () => {
    const { tab } = harness(routes([step('round', 1), step('agent_prompt', 2)],
      page([], { total: 190, kinds: [{ kind: 'round', steps: 120 }, { kind: 'agent_prompt', steps: 60 }, { kind: 'agent', steps: 10 }] })))
    const { host, dispose } = mount(() => <Evidence {...tab} />)
    expect(host.querySelector('h3')?.textContent).toBe('Source steps · 190')
    expect(options(host)).toEqual(['All kinds', 'round · 120', 'agent prompt · 60', 'agent · 10'])
    expect(host.textContent).toContain('Rows 1–2 of 190')
    expect(bodyRows(host).length).toBe(2)
    dispose()
  })

  it('says the steps are not imported when the session has none, not that nothing matched', () => {
    const { tab } = harness(routes([], page([], { total: 0, kinds: [] })))
    const { host, dispose } = mount(() => <Evidence {...tab} />)
    expect(host.textContent).toContain('Source steps are not imported for this session.')
    expect(host.textContent).not.toContain('No matching source steps.')
    dispose()
  })

  it('says nothing matched when the session has steps but the page shows none', () => {
    const { tab } = harness(routes([], page([], { total: 5, kinds: [{ kind: 'round', steps: 5 }] })))
    const { host, dispose } = mount(() => <Evidence {...tab} />)
    expect(host.textContent).toContain('No matching source steps.')
    expect(host.textContent).not.toContain('not imported')
    dispose()
  })
})
