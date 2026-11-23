// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush } from 'solid-js'
import { File } from '../../src/drawer/OtherDetail'
import type { Detail } from '../../src/panels/types'
import { failure, harness, type Routes } from './drawer_harness'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

beforeEach(() => { installDom(); layoutHeaders() })

const FILE = '/work/proj/a.py'
const edit = { ts: 1000, agent_id: 'sess-1', title: 'Fix it', lines_added: 3, lines_removed: 1 }
const fileRoute = (query: URLSearchParams) => query.has('since') ? { path: FILE, edits: [], diff: null, diff_as_of: null }
  : { path: FILE, edits: [edit], diff: null, diff_as_of: null }
const versions = () => ({ path: FILE, mechanism: null, versions: [] })
const mountFile = (routes: Routes, entry: Detail) => {
  const { tab, asked, retried } = harness(routes)
  return { asked, retried, ...mount(() => <File shell={tab.shell} entry={entry} />) }
}

describe('FILE-UI · file detail opened from a session', () => {
  it('asks for the file without the board range, so the session\'s own edits are listed', () => {
    const { host, asked, dispose } = mountFile({ '/api/board/file': fileRoute, '/api/board/memory/versions': versions },
      { type: 'file', path: FILE, record: 'sess-1' })
    expect(asked[0]).toBe(`/api/board/file?path=${encodeURIComponent(FILE)}&record=sess-1`)
    expect(bodyRows(host).length).toBe(1)
    expect(host.textContent).toContain('Recorded edits')
    expect(host.textContent).not.toContain('Edits in this time')
    dispose()
  })

  it('keeps the board range for a file opened from the board', () => {
    const { host, asked, dispose } = mountFile({ '/api/board/file': fileRoute, '/api/board/memory/versions': versions },
      { type: 'file', path: FILE })
    expect(asked[0]).toContain('since=')
    expect(host.textContent).toContain('Edits in this time')
    dispose()
  })

  it('names the sub-request that failed, offers a retry and keeps the rest of the file detail', () => {
    const { host, asked, retried, dispose } = mountFile({
      '/api/board/file': fileRoute, '/api/board/memory/versions': failure('No such route'),
    }, { type: 'file', path: FILE, record: 'sess-1' })
    expect(host.textContent).toContain('Could not load the file versions: No such route')
    expect(bodyRows(host).length).toBe(1)
    const retry = Array.from(host.querySelectorAll('button')).find(button => /retry/i.test(button.textContent ?? ''))!
    retry.click()
    flush()
    expect(retried).toEqual([asked.find(path => path.startsWith('/api/board/memory/versions'))])
    dispose()
  })
})
