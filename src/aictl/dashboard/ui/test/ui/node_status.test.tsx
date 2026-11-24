// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush } from 'solid-js'
import type { PanelContext } from '../../src/panels/types'
import { NodeStatusTable } from '../../src/panels/health/Nodes'
import { noticeText, readingSummary, statusPath, type StatusRow } from '../../src/panels/health/nodeStatus'
import { HistoryNotice } from '../../src/shell/Overview'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const NOW = 1_800_000_000
const GB = 1e9

function row(node: string, status: StatusRow['status'], reading: boolean, extra: Partial<StatusRow> = {}): StatusRow {
  return {
    node_id: node, reported_at: status === 'none' ? null : status === 'stale' ? NOW - 900 : NOW - 20, status, origin: 'store',
    record: status === 'none' ? null : {
      node_id: node, reported_at: NOW - 20, version: '2.4.0', layout: { version: 7, data_epoch: 'e1' },
      state: reading ? 'reading history' : 'current', daemon_started_at: NOW - 3600,
      history: {
        state: reading ? 'reading' : 'done', files: 2016, complete: reading ? 137 : 2016, reading: reading ? 1 : 0,
        waiting: reading ? 1878 : 0, outside_window: 0, bytes: 14.5 * GB, bytes_read: reading ? 3.1 * GB : 14.5 * GB,
        bytes_skipped: 0, bytes_to_read: reading ? 11.4 * GB : 0, percent: reading ? 21.4 : 100,
        rate_bps: reading ? 1.1e6 : null, eta_s: reading ? 9600 : null,
        by_tool: [{ tool: 'claude-code', files: 2016, complete: 137, reading: 1, waiting: 1878, bytes: 14.5 * GB,
          bytes_read: 3.1 * GB, bytes_to_read: 11.4 * GB }],
      },
      readers: [{ name: 'transcript-usage', label: 'Transcript reader', state: 'reading history', last_success_at: NOW - 30,
        last_error: null, rows_total: 4200, progress: null }],
      writer: { status: 'active', rows_queued: 1234, bytes_queued: 5e6, in_flight: 2, failures: 0, rows_dropped: 0,
        tables_failing: [], last_error: null },
      tasks: [{ name: 'schema', label: 'store schema', state: 'done', started_at: NOW - 3600, ended_at: NOW - 3598,
        progress: '', result: 'layout 7, data epoch e1', last_error: null }],
    },
    ...extra,
  }
}

const fleet = [row('mac', 'reported', true), row('win', 'reported', true), row('linux', 'reported', false),
  row('old', 'none', false), row('gone', 'stale', false)]

function context(rows: StatusRow[] | undefined, asked: string[] = []) {
  const navigations: unknown[] = []
  const ctx = {
    scope: () => 'fleet', nodeId: () => null, metadata: () => undefined,
    navigate: (patch: unknown) => navigations.push(patch),
    detail: (path: () => string | undefined) => Object.assign(() => {
      const p = path()
      if (p) asked.push(p)
      return rows ? { data: { view: 'status', rows }, status: 'ready', error: null } : undefined
    }, { retry: () => {} }),
  } as unknown as PanelContext
  return { ctx, navigations }
}

beforeEach(() => { installDom(); layoutHeaders() })

describe('node status', () => {
  it('counts the nodes that still read history and says it with figures', () => {
    const summary = readingSummary(fleet)!
    expect(summary).toEqual({ reading: 2, nodes: 4, complete: 274, files: 4032 })
    expect(noticeText(summary)).toBe('History is still being read on 2 of 4 nodes: 274 of 4,032 files; figures are incomplete')
    expect(readingSummary([row('mac', 'reported', false), row('old', 'none', false)])).toBeUndefined()
    expect(noticeText(readingSummary([row('mac', 'reported', true)])!)).toMatch(/^History is still being read on this node:/)
    expect(statusPath('node', 'win')).toBe('/api/board/nodes?view=status&scope=node&node_id=win')
  })

  it('shows one row per node with concrete figures, flags a silent node and an older one', () => {
    const { ctx } = context(undefined)
    const { host, dispose } = mount(() => <NodeStatusTable ctx={ctx} rows={fleet} now={() => NOW} />)
    const rows = bodyRows(host)
    const text = (i: number, col: string) => rows[i].querySelector(`td[data-col="${col}"]`)?.textContent ?? ''
    expect(rows.length).toBe(5)
    expect(text(0, 'status')).toContain('Reading history')
    expect(text(0, 'files')).toContain('137 of 2,016 files')
    expect(text(0, 'bytes')).toContain('3.1 GB of 14.5 GB (21.4%)')
    expect(text(0, 'left')).toContain('about 2 h 40 min')
    expect(text(0, 'queued')).toContain('1,234')
    expect(text(0, 'version')).toContain('2.4.0 · layout 7')
    expect(text(3, 'status')).toContain('No status reported')
    expect(text(4, 'status')).toContain('Not reporting for 15 min')
    // Each node with a record expands to its readers, tools, writer and tasks.
    expect(Array.from(host.querySelectorAll('summary')).map(s => s.textContent)).toEqual([
      'mac: readers, history per tool, writer and tasks', 'win: readers, history per tool, writer and tasks',
      'linux: readers, history per tool, writer and tasks', 'gone: readers, history per tool, writer and tasks'])
    const details = host.querySelector('details')!
    details.open = true
    details.dispatchEvent(new Event('toggle'))
    flush()
    expect(details.textContent).toContain('Transcript reader')
    expect(details.textContent).toContain('1,234 rows queued')
    expect(details.textContent).toContain('layout 7, data epoch e1')
    dispose()
  })

  it('puts a notice on the board while a node reads history, linking to Health, and none when all are done', () => {
    const asked: string[] = []
    const { ctx, navigations } = context(fleet, asked)
    const { host, dispose } = mount(() => <HistoryNotice ctx={ctx} />)
    const notice = host.querySelector('[data-history-notice]')!
    expect(notice.textContent).toContain('History is still being read on 2 of 4 nodes: 274 of 4,032 files; figures are incomplete')
    expect(asked).toContain('/api/board/nodes?view=status&scope=fleet')
    notice.querySelector('button')!.click()
    expect(navigations).toEqual([{ screen: 'health' }])
    dispose()
    const done = context([row('mac', 'reported', false)]).ctx
    const after = mount(() => <HistoryNotice ctx={done} />)
    expect(after.host.querySelector('[data-history-notice]')).toBeNull()
    after.dispose()
  })
})
