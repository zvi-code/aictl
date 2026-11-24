import { afterEach, describe, expect, it } from 'vitest'
import { resolveDefaultScope } from '../../src/data/defaultScope'
import { boardNodeScope, defaultNodeScope, setDefaultNodeScope } from '../../src/data/urlState'

const answer = (body: unknown, ok = true) => async () => ({ ok, json: async () => body }) as Response
const nodes = (fleetAvailable: boolean) => ({ view: 'nodes', scope: 'fleet', fleet_available: fleetAvailable, rows: [] })

afterEach(() => setDefaultNodeScope('fleet'))

describe('The default scope of an address with no scope', () => {
  it('is All nodes when the daemon has a shared history store', async () => {
    const asked: string[] = []
    const fellBack = await resolveDefaultScope('?range=24h', async path => { asked.push(path); return answer(nodes(true))() })
    expect(fellBack).toBe(false)
    expect(asked).toEqual(['/api/board/nodes?view=nodes&scope=fleet'])
    expect(boardNodeScope('?range=24h')).toBe('fleet')
  })

  it.each([
    ['no shared store', answer(nodes(false))],
    ['an error status', answer({ error: 'x' }, false)],
    ['an answer of another shape', answer({ view: 'identity' })],
    ['no answer', async () => { throw new Error('offline') }],
  ])('falls back to This node with %s', async (_name, request) => {
    expect(await resolveDefaultScope('', request)).toBe(true)
    expect(defaultNodeScope()).toBe('local')
    expect(boardNodeScope('')).toBe('local')
    expect(boardNodeScope('?scope=fleet')).toBe('fleet')
  })

  it('does not ask when the address names its scope', async () => {
    const asked: string[] = []
    const request = async (path: string) => { asked.push(path); return answer(nodes(false))() }
    expect(await resolveDefaultScope('?scope=local', request)).toBe(false)
    expect(await resolveDefaultScope('?scope=fleet', request)).toBe(false)
    expect(await resolveDefaultScope('?node_id=box', request)).toBe(false)
    expect(asked).toEqual([])
  })
})
