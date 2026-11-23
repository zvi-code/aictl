import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { detailRead } from '../../src/panels/data'

it('PNL-WAIT-10 · a panel loading from its own route says in plain words what it reads, and an error offers its message', () => {
  const loading = { status: 'loading' as const, data: undefined, error: null }
  expect(detailRead(loading, undefined, false, 'sessions')).toEqual({ state: 'loading', message: 'Reading sessions…' })
  expect(detailRead(undefined, undefined)).toEqual({ state: 'loading', message: undefined })
  const failed = { status: 'error' as const, data: undefined, error: new Error('HTTP 503') }
  expect(detailRead(failed, undefined, false, 'sessions')).toEqual({ state: 'error', message: 'HTTP 503' })
})

it('PNL-WAIT-11 · no waiting line names a server view or query (guard)', () => {
  const root = join(__dirname, '../../src')
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [])
  const offenders = files(root).flatMap(file => {
    const text = readFileSync(file, 'utf8')
    const calls = [...text.matchAll(/detailRead\(.*?'([^']*)'\)/g)].map(match => match[1])
    const waits = [...text.matchAll(/['`]Waiting for [^'`]*['`]/g)].map(match => match[0])
    return [...calls, ...waits].filter(words => /query|[a-z]+\.[a-z_]+/.test(words)).map(words => `${file}: ${words}`)
  })
  expect(offenders).toEqual([])
})
