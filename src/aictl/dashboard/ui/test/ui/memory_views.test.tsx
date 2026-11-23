// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { flush, type Accessor } from 'solid-js'
import type { DetailAgent } from '../../src/data/contract.gen'
import { Checkpoints, MemoryChanges, MemoryVersions, type Checkpoint, type MemoryChange } from '../../src/drawer/MemoryViews'
import type { TabProps } from '../../src/drawer/shared'
import type { PanelContext } from '../../src/panels/types'
import type { DrawerEntry, DrawerProps } from '../../src/shell/drawerTypes'
import { createBoxes } from '../../src/ui/Box'
import { bodyRows, installDom, layoutHeaders, mount } from './dom'

const MEMORY = '/home/u/.claude/projects/-work-proj/memory/MEMORY.md'

/** A drawer shell whose detail reads answer from `routes` (by route, without the query) and record each path asked. */
function harness(routes: Record<string, (query: URLSearchParams) => unknown>) {
  const asked: string[] = []
  const opened: DrawerEntry[] = []
  const ctx = {
    scope: () => 'local', nodeId: () => null,
    detail: <T,>(target: Accessor<string | undefined>) => {
      const read = () => {
        const value = target()
        if (!value) return undefined
        if (!asked.includes(value)) asked.push(value)
        const [route, query = ''] = value.split('?')
        return { data: routes[route]?.(new URLSearchParams(query)) as T, status: 'ready' as const, error: null }
      }
      return Object.assign(read, { retry: () => {} })
    },
  } as unknown as PanelContext
  const shell = { ctx, stack: [], open: (entry: DrawerEntry) => opened.push(entry), back() {}, close() {}, changeTab() {} } as DrawerProps
  const tab = { shell, entry: { type: 'agent', id: 'sess-1', tab: 'changes' }, detail: () => undefined,
    agent: () => undefined, runtime: () => undefined, session: () => 'sess-1' } as unknown as TabProps
  return { asked, opened, shell, tab }
}

const change = (extra: Partial<MemoryChange>): MemoryChange => ({
  ts: 1000, path: MEMORY, mechanism: 'claude_auto_memory', operation: 'edit', tool_name: 'Edit', agent_id: '', actor: 'agent',
  prompt_id: 'p1', turn_index: 1, lines_added: 2, lines_removed: 1, before_hash: 'b1', after_hash: 'a1', before_bytes: 9,
  after_bytes: 20, before_source: 'tool_result', after_source: 'file_at_ingest', tool_call_id: 'tu-1', ...extra,
})
const side = (hash: string, text: string | null, state = text == null ? 'expired' : 'kept') =>
  ({ hash, state, bytes: text?.length ?? null, text })
const diff = (query: URLSearchParams) => {
  const texts: Record<string, string> = { b1: 'keep\nold', a1: 'keep\nnew', v0: 'first', v2: 'second' }
  const first = query.get('first') ?? '', second = query.get('second') ?? ''
  const a = side(first, texts[first] ?? null, first ? undefined : 'not_recorded')
  const b = side(second, texts[second] ?? null, second ? undefined : 'not_recorded')
  return { first: a, second: b, truncated: false, diff: a.text != null && b.text != null
    ? [...a.text.split('\n').map(text => ({ n: 1, text, kind: b.text!.includes(text) ? 'same' : 'del' })),
      ...b.text.split('\n').filter(text => !a.text!.includes(text)).map(text => ({ n: 1, text, kind: 'add' }))] : null }
}
const cellTexts = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent)
const button = (host: Element, text: string) => Array.from(host.querySelectorAll('button')).find(b => b.textContent === text)!

beforeEach(() => { installDom(); layoutHeaders() })

describe('MEM-UI-10 · memory and instruction changes in the Changes tab', () => {
  it('lists the changes newest first, with the file short name, its full path on hover and an empty actor as not known', () => {
    const { tab } = harness({})
    const rows = [change({ ts: 1000 }), change({ ts: 2000, actor: '', agent_id: 'sub9', lines_added: null, lines_removed: null })]
    const { host, dispose } = mount(() => { const boxes = createBoxes('t1'); return <MemoryChanges tab={tab} boxes={boxes} rows={rows} /> })
    const [newest, oldest] = bodyRows(host)
    expect(cellTexts(newest).slice(1, 9)).toEqual(['MEMORY.md', 'Claude Code auto memory', 'edit', 'not known', 'sub9', 'Turn 1',
      'not reported', '9 B → 20 B'])
    expect(cellTexts(oldest)[4]).toBe('Main agent')
    expect(newest.querySelector('td[data-col="path"]')?.getAttribute('title')).toBe(MEMORY)
    expect(host.textContent).not.toContain('user')
    expect(host.querySelector('h3')?.textContent).toBe('Memory and instructions · 2')
    expect(host.querySelectorAll('[data-box-control]').length).toBe(4)
    dispose()
  })

  it('loads the diff of a change when its row is expanded', () => {
    const { tab, asked } = harness({ '/api/board/memory/diff': diff })
    const { host, dispose } = mount(() => { const boxes = createBoxes('t2'); return <MemoryChanges tab={tab} boxes={boxes} rows={[change({})]} /> })
    expect(asked).toEqual([])
    button(host, 'Show diff').click()
    flush()
    expect(asked).toEqual(['/api/board/memory/diff?first=b1&second=a1'])
    const code = host.querySelector('pre')?.textContent ?? ''
    expect(code).toContain('− old')
    expect(code).toContain('+ new')
    dispose()
  })

  it('says why a side has no content instead of showing an empty diff', () => {
    const { tab } = harness({ '/api/board/memory/diff': diff })
    const rows = [change({ before_hash: '', before_source: 'unknown: the file changed after the write', after_hash: 'gone' })]
    const { host, dispose } = mount(() => { const boxes = createBoxes('t3'); return <MemoryChanges tab={tab} boxes={boxes} rows={rows} /> })
    button(host, 'Show diff').click()
    flush()
    expect(host.querySelector('[data-missing="first"]')?.textContent).toBe('Before: Not known: the file changed after the write')
    expect(host.querySelector('[data-missing="second"]')?.textContent).toBe('After: Not stored any more')
    expect(host.querySelector('pre')).toBeNull()
    dispose()
  })

  it('opens the step of the turn in Flow', () => {
    const { tab, opened } = harness({})
    const { host, dispose } = mount(() => { const boxes = createBoxes('t4'); return <MemoryChanges tab={tab} boxes={boxes} rows={[change({})]} /> })
    host.querySelector<HTMLButtonElement>('td[data-col="turn"] button')!.click()
    expect(opened).toEqual([{ type: 'agent', id: 'sess-1', tab: 'flow', flowRef: { field: 'tool_call_id', id: 'tu-1' } }])
    dispose()
  })
})

const checkpoint = (extra: Partial<Checkpoint>): Checkpoint => ({
  ts: 100, kind: 'compaction', agent_id: '', trigger: 'auto', message_id: '', path: '', detail: {}, before_tokens: 9000,
  after_tokens: 900, preserved_messages: 4, summary: { kind: 'compact_summary', seq: 1, title: 'Kept', text: null, hash: '', bytes: 4 },
  ...extra,
})

describe('MEM-UI-20 · checkpoints and memory recalls in the Context tab', () => {
  it('merges the checkpoints and the memory recalls in time order', () => {
    const { tab, asked } = harness({ '/api/board/agent/recalls': () => ({ recalls: [{ ts: 150, agent_id: '', tool: 'claude-code',
      trigger: 'nested_memory', path: MEMORY, content_hash: '', tool_call_id: '', prompt_id: '', turn_index: 2, bytes: 7 }] }) })
    const rows = [checkpoint({ ts: 200, kind: 'rewind_point', trigger: 'snapshot', message_id: 'u-1', files_count: 3, summary: null,
      before_tokens: null, after_tokens: null, preserved_messages: null }), checkpoint({})]
    const { host, dispose } = mount(() => { const boxes = createBoxes('t5'); return <Checkpoints tab={tab} boxes={boxes} rows={rows as DetailAgent['checkpoints']} /> })
    expect(asked).toEqual(['/api/board/agent/recalls?id=sess-1'])
    expect(bodyRows(host).map(row => row.querySelector('td[data-col="kind"]')?.textContent)).toEqual(
      ['Compaction', 'Memory recall', 'Rewind point'])
    expect(cellTexts(bodyRows(host)[0]).slice(6, 10)).toEqual(['9.0 k → 900', 'not reported', '4', 'Kept'])
    expect(bodyRows(host)[0].querySelector('td[data-col="tokens"]')?.getAttribute('title')).toBe(`${(9000).toLocaleString()} → 900 tokens`)
    expect(cellTexts(bodyRows(host)[2])[6]).toBe('not reported')
    dispose()
  })

  it('shows "text not kept" for a summary whose text is null', () => {
    const { tab } = harness({ '/api/board/agent/recalls': () => ({ recalls: [] }) })
    const { host, dispose } = mount(() => { const boxes = createBoxes('t6'); return <Checkpoints tab={tab} boxes={boxes} rows={[checkpoint({})]} /> })
    button(host, 'Show detail').click()
    flush()
    expect(host.querySelector('[data-summary="missing"]')?.textContent).toBe('Text not kept')
    dispose()
  })

  it('loads the files of a rewind point and the content only of a stored one', () => {
    const { tab, asked } = harness({
      '/api/board/agent/recalls': () => ({ recalls: [] }),
      '/api/board/agent/checkpoint/files': () => ({ message_id: 'u-1', files: [
        { path: MEMORY, ts: 1, origin: 'claude_file_history', mechanism: 'claude_auto_memory', version: 1, state: 'backup',
          blob_hash: 'v0', size_bytes: 5, lines: 1, lines_added: null, lines_removed: null },
        { path: '/work/a.py', ts: 1, origin: 'claude_file_history', mechanism: '', version: 2, state: 'backup', blob_hash: '',
          size_bytes: null, lines: null, lines_added: null, lines_removed: null }] }),
      '/api/board/memory/diff': diff,
    })
    const rows = [checkpoint({ kind: 'rewind_point', message_id: 'u-1', files_count: 2, summary: null })]
    const { host, dispose } = mount(() => { const boxes = createBoxes('t7'); return <Checkpoints tab={tab} boxes={boxes} rows={rows} /> })
    button(host, 'Show detail').click()
    flush()
    expect(asked).toContain('/api/board/agent/checkpoint/files?id=sess-1&message_id=u-1')
    const files = host.querySelector('table[aria-label="Files of this rewind point"]')!
    expect(Array.from(files.querySelectorAll('button')).filter(b => b.textContent === 'Show content').length).toBe(1)
    button(files, 'Show content').click()
    flush()
    expect(asked).toContain('/api/board/memory/diff?first=v0')
    expect(host.querySelector('pre')?.textContent).toBe('first')
    dispose()
  })
})

describe('MEM-UI-30 · versions of a memory file in the file detail', () => {
  const version = (ts: number, hash: string, extra = {}) => ({ ts, origin: 'write_event', session_id: 'sess-1', title: 'Fix bug',
    agent_id: '', actor: 'agent', operation: 'edit', content_hash: hash, size_bytes: 5, before_hash: '', before_source: '',
    after_source: 'file_at_ingest', lines_added: 1, lines_removed: 0, state: '', ...extra })

  it('lists the versions, links each session and diffs two selected versions', () => {
    const { shell, asked, opened } = harness({
      '/api/board/memory/versions': () => ({ path: MEMORY, mechanism: 'claude_auto_memory', versions: [
        version(10, 'v0', { origin: 'scan', session_id: '', title: '', actor: '', operation: '', after_source: '' }), version(20, 'v2')] }),
      '/api/board/memory/diff': diff,
    })
    const { host, dispose } = mount(() => { const boxes = createBoxes('t8'); return <MemoryVersions shell={shell} boxes={boxes} path={MEMORY} /> })
    const [scan, write] = bodyRows(host)
    expect(cellTexts(scan).slice(1, 6)).toEqual(['Inventory scan', 'not reported', 'not reported', 'not known', 'not reported'])
    expect(cellTexts(write).slice(1, 5)).toEqual(['Session change', 'Fix bug', 'Main agent', 'Main agent'])
    write.querySelector<HTMLButtonElement>('td[data-col="session"] button')!.click()
    expect(opened).toEqual([{ type: 'agent', id: 'sess-1', tab: 'changes' }])
    for (const row of bodyRows(host)) button(row, 'Select to compare').click()
    flush()
    expect(asked).toContain('/api/board/memory/diff?first=v0&second=v2')
    expect(host.querySelector('pre')?.textContent).toContain('+ second')
    dispose()
  })

  it('shows nothing for a file of no memory mechanism', () => {
    const { shell } = harness({ '/api/board/memory/versions': () => ({ path: '/a.py', mechanism: '', versions: [] }) })
    const { host, dispose } = mount(() => { const boxes = createBoxes('t9'); return <MemoryVersions shell={shell} boxes={boxes} path="/a.py" /> })
    expect(host.textContent).toBe('')
    dispose()
  })
})
