// @vitest-environment jsdom
// Tool confirmations, Failures and errors and Changes: each figure is a label with its value, an error is said
// in words, and a row opens from its first cell.
import { beforeEach, describe, expect, it } from 'vitest'
import { Changes, Confirmations, errorView, NO_ERROR_TEXT, reportedTotals } from '../../src/panels/overview/b/History'
import { installDom, layoutHeaders, mount } from './dom'
import { def, pairs, panel } from './overviewPanel'

beforeEach(() => { installDom(); layoutHeaders() })

describe('Tool confirmations', () => {
  const confirms = { asked: 0, auto: 10271, approved: 0, denied: 0, blocked: 23, not_reported: 712, p95_wait_s: null,
    pending: [], by_tool: [{ name: 'powershell', auto: 9000, approved: 0, denied: 0, blocked: 3, not_reported: 12, median_wait_s: null }] }

  it('pairs each outcome with its value and names a figure the source lacks once', () => {
    const { props, opened } = panel('confirms', { reads: [{ state: 'ready', value: confirms }] })
    const { host, dispose } = mount(() => <Confirmations {...props} />)
    expect(pairs(host, 'Confirmation outcomes')).toEqual([['Asked you', '0'], ['Auto approved', '10,271'], ['You approved', '0'],
      ['You denied', '0'], ['Blocked by a rule', '23'], ['Confirmation not reported', '712']])
    expect(host.textContent).toContain('Not reported by this source: p95 wait (s).')
    expect(host.textContent).not.toContain('Not available from this source')
    // The tool cell opens the tool; there is no Actions column to cut the label.
    expect(Array.from(host.querySelectorAll('thead th')).map(th => th.getAttribute('data-col'))).not.toContain('@actions')
    const open = host.querySelector<HTMLButtonElement>('tbody button[aria-label="Open tool powershell"]')!
    expect(open.textContent).toBe('powershell')
    open.click()
    expect(opened).toEqual([{ type: 'tool', name: 'powershell' }])
    dispose()
  })

  it('keeps only the totals with a number', () => {
    expect(reportedTotals([{ path: 'a', label: 'A' }, { path: 'b', label: 'B' }], { a: 0, b: null })).toEqual({
      shown: [{ path: 'a', label: 'A' }], missing: ['B'] })
  })
})

describe('Failures and errors', () => {
  it('names the tool and the reason in words, not the grouping key', () => {
    expect(errorView({ key: 'tool:powershell:', kind: 'Tool', sample: null })).toEqual({ source: 'powershell', reason: NO_ERROR_TEXT })
    expect(errorView({ key: 'tool:Bash:<tool_use_error>File has not been read', kind: 'Tool', sample: '<tool_use_error>File has not been read yet</tool_use_error>' }))
      .toEqual({ source: 'Bash', reason: 'File has not been read yet' })
    expect(errorView({ key: 'tool:view:Path does not exist', kind: 'Tool', sample: null })).toEqual({ source: 'view', reason: 'Path does not exist' })
    expect(errorView({ key: 'api:api_error:529', kind: 'API', sample: 'api_error 529' }))
      .toEqual({ source: 'Model API', reason: 'API error, HTTP 529 (overloaded)' })
    expect(errorView({ key: 'api:rate_limit_error:', kind: 'API' })).toEqual({ source: 'Model API', reason: 'Rate limit error' })
  })

  it('shows no internal key column', () => {
    expect(def('errors').columns.map(column => column.path)).toEqual(['source', 'reason', 'count', 'agents', 'last_ts'])
  })
})

describe('Changes', () => {
  it('explains "Outside any project" on the row it marks, and the file cell opens the file', () => {
    const files = [{ path: '/tmp/notes.txt', project: null, node_id: 'node-a', record: 'r1', lines_added: 2, lines_removed: 0, edits: 1, sessions: 1, last_ts: 1 }]
    const { props, opened } = panel('changesT', {
      reads: [{ state: 'ready', value: { totals: { files: 1, outside_projects: { files: 1, lines_added: 2, lines_removed: 0 } } } }],
      board: { changes: { files } },
    })
    const { host, dispose } = mount(() => <Changes {...props} />)
    const cell = host.querySelector('tbody td[data-col="project"]')!
    expect(cell.textContent).toBe('Outside any project')
    expect(cell.getAttribute('title')).toContain('not under a known project folder')
    host.querySelector<HTMLButtonElement>('tbody button[aria-label="Open file /tmp/notes.txt"]')!.click()
    expect(opened).toEqual([{ type: 'file', path: '/tmp/notes.txt', record: 'r1' }])
    dispose()
  })
})
