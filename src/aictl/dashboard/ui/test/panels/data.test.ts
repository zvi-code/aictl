import { createRoot, flush } from 'solid-js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { parseFilters } from '../../src/data/filters'
import { createLiveClient } from '../../src/data/live'
import { panelData } from '../../src/panels/data'
import type { NodeScope } from '../../src/panels/types'

// Exercise the client effects in Node without mounting a DOM.
vi.mock('solid-js', () => vi.importActual('../../node_modules/solid-js/dist/solid.js'))

beforeEach(() => vi.stubGlobal('location', { origin: 'http://dashboard.test' }))
afterEach(() => vi.unstubAllGlobals())

function board(scope: NodeScope, returnedNode = 'node-a') {
  const fetch = vi.fn<typeof globalThis.fetch>(async path => {
    const url = new URL(String(path), location.origin)
    if (url.pathname === '/api/datapoints') return Response.json([])
    return Response.json({
      node_scope: scope === 'node' ? { kind: 'node', node_id: returnedNode } : { kind: scope },
      series: { tokens: [url.searchParams.get('view') === 'charts' ? 100 : 10] },
    })
  })
  vi.stubGlobal('fetch', fetch)
  const filters = parseFilters('?range=1h&sel=6600-6900&project=repo&model=m&status=ended&q=find')
  const result = createRoot(dispose => {
    const data = panelData({
      client: createLiveClient(),
      scope: () => scope, nodeId: () => scope === 'node' ? 'node-a' : null,
      filters: () => filters, tools: () => ['copilot'], startedAt: 7200,
      paused: () => false, revision: () => 0,
      navigate() {}, jump() {}, select() {}, openAgent() {}, openDetail() {},
      stopped: () => false, stopAgent() {}, runCommand() {}, copy() {}, refresh() {},
    }, () => 'board')
    return { data, dispose }
  })
  flush()
  const requests = () => fetch.mock.calls.map(([url]) => new URL(String(url), location.origin))
    .filter(url => url.pathname !== '/api/datapoints')
    .map(url => [url.pathname, Object.fromEntries(url.searchParams)])
  return { ...result, requests }
}

it.each<NodeScope>(['local', 'node', 'fleet'])('reads only the required %s windows', async scope => {
  const { data, dispose, requests } = board(scope)
  try {
    const params = {
      tool: 'copilot', project: 'repo', model: 'm', status: 'ended', q: 'find',
      ...(scope === 'local' ? {} : { scope }),
      ...(scope === 'node' ? { node_id: 'node-a' } : {}),
    }
    expect(requests()).toEqual([
      ...(scope === 'local' ? [] : [['/api/history/board', { ...params, since: '6600', until: '6900' }]]),
      ['/api/history/board', { ...params, since: '3600', until: '7200', buckets: '12', view: 'charts' }],
    ])
    await vi.waitFor(() => {
      expect(data.read({ field: 'series', path: 'tokens', wholeRange: true })).toMatchObject({
        state: 'ready', value: [100],
      })
      if (scope !== 'local') {
        expect(data.read({ field: 'series', path: 'tokens' })).toMatchObject({ state: 'ready', value: [10] })
      }
    })
  } finally { dispose() }
})

it('does not present a response for a different node', async () => {
  const { data, dispose } = board('node', 'node-b')
  try {
    await vi.waitFor(() => {
      expect(data.read({ field: 'series' })).toEqual({
        state: 'error', message: expect.stringContaining('did not confirm the requested node scope'),
      })
    })
  } finally { dispose() }
})
