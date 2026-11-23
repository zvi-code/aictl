// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush } from 'solid-js'
import type { DetailAgent } from '../../src/data/contract.gen'
import Artifacts from '../../src/drawer/tabs/Artifacts'
import { cell, failure, harness } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const row = (extra: object) => ({ path: '/home/u/.copilot/session-state/s1/plan.md', name: 'plan.md', ext: 'md', kind: 'session-folder',
  folder: '', size_bytes: 2048, mtime: 1000, exists: null, writes: 0, first_ts: null, last_ts: null, viewable: false, source: 'kusto.queryable', ...extra })
const detail = (artifacts: object[]) => ({ artifacts, artifacts_total: artifacts.length, artifacts_bytes: 4096 }) as unknown as Partial<DetailAgent>
const inspect = (host: Element) => Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Inspect plan.md')
const click = (el: Element | null | undefined) => (el as HTMLElement).click()

describe('ART-UI · Artifacts tab', () => {
  it('shows each row\'s size from its own bytes, and says an unchecked presence is not checked', () => {
    const { tab } = harness({}, { detail: detail([row({}), row({ path: '/x/gone.txt', name: 'gone.txt', size_bytes: null, exists: false })]) })
    const { host, dispose } = mount(() => <Artifacts {...tab} />)
    const [first, second] = bodyRows(host)
    expect(cell(first, 'size_bytes')?.textContent).toBe('2.05 KB')
    expect(cell(first, 'exists_label')?.textContent).toBe('not checked')
    expect(cell(second, 'size_bytes')?.textContent).toContain('Not available')
    expect(cell(second, 'exists_label')?.textContent).toBe('missing')
    dispose()
  })

  it('reads a file the index does not call viewable, on this machine, and shows the error when it cannot', () => {
    const { tab, asked } = harness({ '/api/file': failure('File not readable') }, { detail: detail([row({})]) })
    const { host, dispose } = mount(() => <Artifacts {...tab} />)
    click(inspect(host))
    flush()
    expect(asked).toEqual([`/api/file?path=${encodeURIComponent('/home/u/.copilot/session-state/s1/plan.md')}`])
    expect(host.textContent).toContain('Could not load this: File not readable')
    expect(host.textContent).not.toContain('does not establish')
    dispose()
  })

  it('does not try to read a file the index knows to be missing', () => {
    const { tab, asked } = harness({}, { detail: detail([row({ exists: false })]) })
    const { host, dispose } = mount(() => <Artifacts {...tab} />)
    click(inspect(host))
    flush()
    expect(asked).toEqual([])
    dispose()
  })
})
