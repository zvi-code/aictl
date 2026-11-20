import { afterEach, expect, it, vi } from 'vitest'
import { json } from '../src/panels/data'

afterEach(() => vi.unstubAllGlobals())

const path = '/api/tool-config/claude-code'

it('forwards mutation options and the abort signal and decodes the JSON reply', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ saved: true }))
  vi.stubGlobal('fetch', fetch)
  const options = { method: 'PUT', body: '{}', signal: new AbortController().signal }
  await expect(json(path, options)).resolves.toEqual({ saved: true })
  expect(fetch).toHaveBeenCalledWith(path, options)
})

it('reports service errors and falls back to HTTP status for unreadable responses', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({ error: 'File changed' }, { status: 409 }))
    .mockResolvedValueOnce(new Response('Not JSON', { status: 502 }))
  vi.stubGlobal('fetch', fetch)
  await expect(json(path)).rejects.toThrow('File changed')
  await expect(json(path)).rejects.toThrow('HTTP 502')
})
