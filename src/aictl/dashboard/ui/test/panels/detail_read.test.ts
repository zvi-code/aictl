import { expect, it } from 'vitest'
import { detailRead } from '../../src/panels/data'

it('PNL-WAIT-10 · a panel loading from its own route says what it waits for, and an error offers its message', () => {
  const loading = { status: 'loading' as const, data: undefined, error: null }
  expect(detailRead(loading, undefined, false, 'the server to run the tools.mcp query'))
    .toEqual({ state: 'loading', message: 'Waiting for the server to run the tools.mcp query…' })
  expect(detailRead(undefined, undefined)).toEqual({ state: 'loading', message: undefined })
  const failed = { status: 'error' as const, data: undefined, error: new Error('HTTP 503') }
  expect(detailRead(failed, undefined, false, 'the server')).toEqual({ state: 'error', message: 'HTTP 503' })
})
