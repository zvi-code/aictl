import { expect, it } from 'vitest'
import { ago, baseName, fmtBytes, projectName } from '../src/design/format'

it('formats byte sizes and separates zero from unavailable', () => {
  expect([null, 0, 512, 2000, 5e6, 2.5e9].map(fmtBytes)).toEqual([
    'n/a', '0 B', '512 B', '2 KB', '5 MB', '2.5 GB',
  ])
})

it('formats an age at the right scale', () => {
  const now = 1_000_000
  expect([null, now - 20, now - 120, now - 7200, now - 172800].map(value => ago(value, now))).toEqual([
    'Never', '20 s ago', '2 min ago', '2 h ago', '2 d ago',
  ])
})

it('uses the last path segment in labels for POSIX, drive, and UNC paths', () => {
  expect(baseName('/path/to/file.md')).toBe('file.md')
  expect(baseName('C:\\path\\to\\file.md')).toBe('file.md')
  expect(projectName('\\\\server\\share\\Example\\')).toBe('Example')
  expect(projectName('/')).toBe('/')
  expect(projectName('C:\\')).toBe('C:')
})
