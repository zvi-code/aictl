// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { readScreen } from '../../src/data/filters'
import { gapFinding, indexText, originText, type Compare, type IndexBody, type IndexNode } from '../../src/panels/index/indexModel'
import type { DetailState, PanelContext } from '../../src/panels/types'
import Index from '../../src/shell/Index'
import { setNodes } from '../../src/data/nodeNames'
import { installDom, layoutHeaders, mount } from './dom'

const label = (tool: string) => ({ 'copilot-cli': 'Copilot CLI', 'copilot-vscode': 'VS Code Copilot' }[tool] ?? tool)
const states = { complete: 0, reading: 0, changed: 0, waiting: 0, reread: 0, outside_window: 0, unreadable: 0 }
const compare = (values: Partial<Compare> & { tool: string }): Compare => ({
  on_disk: 0, stored: 0, matched: 0, comparable: true, reason: '', missing: {}, missing_ids: {}, stored_only: {},
  stored_only_ids: {}, files: 0, bytes: 0, ...values,
})
const copilot = compare({
  tool: 'copilot-cli', on_disk: 400, stored: 120, matched: 118, files: 410, bytes: 52_000_000,
  missing: { not_read: 280, folder_only: 2 }, missing_ids: { not_read: ['s-1', 's-2'], folder_only: ['s-3', 's-4'] },
  stored_only: { database: 2 }, stored_only_ids: { database: ['s-9', 's-8'] },
})
const live: IndexNode = {
  node_id: 'win-box', origin: 'live', computed_at: 1_700_000_000, duration_ms: 812.4, reader_state: 'running daemon',
  settings: {
    node_id: 'win-box', roots: ['C:\\Work'], ignored_dirs: ['node_modules'], history_days: 0, read_limit_bytes_per_poll: 134_217_728,
    read_limit_now_bytes: 67_108_864, store_host: 'c.kusto.windows.net', store_database: 'aictl', daemon_pid: 42,
    daemon_started_at: 1_699_990_000, polls: [{ reader: 'transcript-usage', enabled: true, last_poll_at: 1_699_999_000,
      last_completed_at: 1_699_999_100, last_error: null }],
  },
  homes: [{ tool: 'copilot-cli', path: 'D:\\Copilot', found_by: ['process environment', 'known-homes file (process environment)'],
    exists: true, session_folder: 'D:\\Copilot\\session-state', session_folder_exists: true, read_by: 'session reader' }],
  locations: [{ tool: 'copilot-cli', kind: 'session-state folder', path: 'D:\\Copilot\\session-state', exists: true, files: 410,
    bytes: 52_000_000, sessions: 400, newest: 1_699_999_000, oldest: 1_690_000_000, states: { ...states, complete: 130, waiting: 280 },
    bytes_read: 1, unreadable: [{ path: 'D:\\Copilot\\session-state\\x\\events.jsonl', reason: 'Permission denied' }], unclaimed: 0,
    reader: 'copilot-events', reader_version: 1, older_version_files: 0, folders_without_transcript: 2 }],
  databases: [{ tool: 'copilot-cli', path: 'D:\\Copilot\\session-store.db', exists: true, sessions: 900, with_events_file: 400,
    events_file_seen_before: 10, without_events_file: 490, outside_window: 0, usage_rows_read: false, app_sessions: null, error: '' }],
  compare: [copilot, compare({ tool: 'cursor', on_disk: null, stored: 3, matched: null, comparable: false,
    reason: 'aictl counts no session files of this tool on disk; stored sessions only' })],
  projects: [{ path: 'C:\\Work\\RepoA', found_by: ['discovered repository'], exists: true, git_root: 'C:\\Work\\RepoA',
    worktree_of: '', sessions: { 'copilot-cli': 7 }, last_activity: 1_699_999_000, instructions: 2, memory: 0, skills: 1, agents: 0,
    ignored: false, outside_roots: false }],
  context: [{ tool: 'copilot-cli', category: 'skills', scope: 'project', path: 'C:\\Work\\RepoA\\.github\\skills', exists: true,
    files: 1, bytes: 300, newest: 1_699_000_000, pattern: '', listed: ['C:\\Work\\RepoA\\.github\\skills\\deploy\\SKILL.md'] }],
  store_index: null,
}
const body: IndexBody = { generated_at: 1_700_000_000, scope: { kind: 'local', node_id: null }, project_filter: [], nodes: [live],
  tool_labels: { 'copilot-cli': 'Copilot CLI' } }

function context(state: DetailState<unknown>, scope = 'local', asked: string[] = [], copied: string[] = []) {
  return {
    scope: () => scope, nodeId: () => scope === 'node' ? 'win-box' : null, filters: () => ({ projects: ['C:\\Work\\RepoA'], repos: [] }),
    board: () => undefined, copy: (text: string) => copied.push(text),
    detail: (path: () => string | undefined) => Object.assign(() => { const p = path(); if (p) asked.push(p); return state },
      { retry() {} }),
  } as unknown as PanelContext
}

beforeEach(() => { installDom(); layoutHeaders(); history.replaceState(null, '', '/?screen=index') })

describe('Index screen', () => {
  it('is a screen of its own', () => {
    expect(readScreen('?screen=index')).toBe('index')
  })

  it('leads with the tools whose sessions on disk are not stored, and says where its figures come from', () => {
    expect(gapFinding([copilot], label)).toBe('Copilot CLI: 280 of 400 on disk not stored yet or unreadable ' +
      'Not stored for a stated reason (see below): Copilot CLI 2.')
    expect(gapFinding([compare({ tool: 'copilot-cli', on_disk: 3, stored: 3, matched: 3 })], label)).toBe(
      'Every session on disk that has something to store is stored.')
    expect(gapFinding([live.compare![1]], label)).toBe(
      'No tool could be compared: aictl counts no session files of this tool on disk; stored sessions only.')
    expect(originText(live)).toMatch(/^Live: computed on this node at .+, took 812 ms; read state from the running daemon\.$/)
    const published = { ...live, origin: 'published' as const, published_at: 1_700_000_000 - 600 }
    setNodes('desk', ['win-box']); flush()
    expect(originText(published, 1_700_000_000)).toMatch(/^Published snapshot: computed by node \[1\]'s daemon at .+ \(10 min ago\), read from the store\.$/)
    setNodes(null, []); flush()
    expect(indexText({ as_of: null, since_daemon_start: null, locations: [], compare: [] })).toContain('the daemon start is not known')
  })

  it('shows every section with concrete values and the session ids of a gap', () => {
    const asked: string[] = [], copied: string[] = []
    const { host, dispose } = mount(() => <Index ctx={context({ data: body, status: 'ready', error: null }, 'local', asked, copied)} />)
    flush()
    expect(asked.at(-1)).toBe('/api/board/index?project=C%3A%5CWork%5CRepoA')
    const node = host.querySelector('[data-node="win-box"]')!
    expect(node.querySelector('[data-origin="live"]')!.textContent).toContain('read state from the running daemon')
    // The node is written by its number, its host name one hover away; the data attribute keeps the id.
    setNodes('desk', ['win-box']); flush()
    expect(node.querySelector('h2')!.textContent).toBe('Node [1]')
    expect(node.querySelector('h2')!.getAttribute('title')).toBe('[1] win-box')
    const setting = [...host.querySelectorAll('dt')].find(dt => dt.textContent === 'Node')!.nextElementSibling!
    expect([setting.textContent, setting.getAttribute('title')]).toEqual(['[1]', '[1] win-box'])
    setNodes(null, []); flush()
    const text = node.textContent!
    for (const value of ['Copilot CLI: 280 of 400 on disk not stored yet or unreadable', 'D:\\Copilot\\session-state', 'process environment, known-homes file',
      'D:\\Copilot\\session-store.db', 'C:\\Work\\RepoA', 'node_modules', '0 (every session file still on disk)', 'pid 42',
      'Not stored · Not read yet', 's-1\ns-2', 'Only stored · Taken from the Copilot database', 'Permission denied']) {
      expect(text).toContain(value)
    }
    const button = [...node.querySelectorAll('button')].find(b => b.textContent === 'Copy ids')!
    button.click()
    expect(copied).toEqual(['s-1\ns-2'])
    dispose()
  })

  it('refuses a body whose node scope the server did not confirm', () => {
    const scoped = { ...body, scope: { kind: 'node', node_id: 'other' } }
    const { host, dispose } = mount(() => <Index ctx={context({ data: scoped, status: 'ready', error: null }, 'node')} />)
    flush()
    expect(host.textContent).toContain('The server did not confirm the requested node scope.')
    expect(host.querySelector('[data-node]')).toBeNull()
    dispose()
  })
})
