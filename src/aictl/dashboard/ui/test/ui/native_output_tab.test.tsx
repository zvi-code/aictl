// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import NativeOutput from '../../src/drawer/tabs/NativeOutput'
import { harness } from './drawer_harness'
import { installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const line = (order: number, ts: number, extra: object = {}) => ({ session_id: 'sess-1', native_session_id: null, tool: 'copilot-cli', entry_id: `e${order}`,
  event_id: `v${order}`, order, kind: 'assistant.message', text: 'hello', ts, agent_id: null, progress: null, content_retained: true, text_suppressed: false,
  text_truncated: false, tail_truncated: false, ...extra })

describe('NAT-UI · Native output tab', () => {
  it('says when the newest line of a truncated tail was written, not "unknown"', () => {
    const { tab } = harness({}, { runtime: { session_id: 'sess-1' }, topics: { 'runtime.output': [line(1, 1795428000, { tail_truncated: true }), line(2, 1795428930)] } })
    const { host, dispose } = mount(() => <NativeOutput {...tab} />)
    expect(host.textContent).toContain('Only the recent tail is available')
    expect(host.textContent).toContain('Last updated')
    expect(host.textContent).not.toContain('Last updated: unknown')
    const time = host.querySelector('time')!
    expect(time.getAttribute('datetime')).toBe(new Date(1795428930 * 1000).toISOString())
    dispose()
  })
})
