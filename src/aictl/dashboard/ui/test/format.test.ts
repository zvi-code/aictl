import { describe, expect, it } from 'vitest'
import { ago, baseName, fmtAge, fmtBytes, fmtDur, fmtMem, fmtMoney, fmtMs, fmtNum, fmtPct, projectName } from '../src/design/format'
import { formatField } from '../src/ui/tableModel'
import { presentation } from '../src/panels/kinds/model'
import type { PanelContext } from '../src/panels/types'

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

// A unit that rounds up to its limit must show the next unit: "60 min" is "1 h".
const carried = /(^|\D)(60 min|60 s|24 h|1000 ms)/
const spans = [0.0004, 0.4, 0.9996, 1, 5.1, 9.96, 23.9, 59.4, 59.5, 59.6, 59.99, 60, 89.6, 119.5, 599.6, 3569, 3570, 3576, 3599.6,
  3600, 3629, 3630, 86370, 86399, 86400, 86400 * 6.99, 86400 * 7, 3_000_000]

describe('DURATION · every unit boundary carries into the next unit', () => {
  it('never shows 60 min, 60 s, 24 h or 1000 ms', () => {
    for (const seconds of spans) {
      for (const text of [fmtDur(seconds), fmtMs(seconds * 1000), fmtAge(seconds), fmtMs(seconds)]) {
        expect(text, `${seconds} -> ${text}`).not.toMatch(carried)
      }
    }
    for (let seconds = 0; seconds < 200_000; seconds += 7.31) expect(fmtDur(seconds)).not.toMatch(carried)
    for (let ms = 0; ms < 5_000; ms += 0.7) expect(fmtMs(ms)).not.toMatch(carried)
  })

  it('shows the named boundaries in the larger unit', () => {
    expect(fmtDur(59.6)).toBe('59.6 s')
    expect(fmtDur(59.96)).toBe('1 min')
    expect(fmtDur(3576)).toBe('1 h')
    expect(fmtDur(86370)).toBe('1 d')
    expect(fmtDur(8 * 3600 - 20)).toBe('8 h')
    expect(fmtMs(999.6)).toBe('1 s')
  })

  it('shows a time under a minute in ms or s, not "<1 min"', () => {
    expect(fmtDur(5.1)).toBe('5.1 s')
    expect(fmtDur(23.9)).toBe('23.9 s')
    expect(fmtDur(0.25)).toBe('250 ms')
    expect(fmtMs(1653.855)).toBe('1.7 s')
    expect(fmtMs(640.2)).toBe('640 ms')
    expect(fmtDur(90)).toBe('1 min 30 s')
    expect(fmtDur(26 * 3600)).toBe('1 d 2 h')
    expect(fmtDur(0)).toBe('0 ms')
  })

  it('keeps an age readable at each scale', () => {
    const now = 1_000_000
    expect(ago(now - 3576, now)).toBe('1 h ago')
    expect(ago(now - 86300, now)).toBe('1 d ago')
  })
})

describe('PRECISION · one rule per kind of value', () => {
  it('shows a percentage with one decimal, none when it is a whole number from 10 up', () => {
    expect([62.652, 62.04, 9.96, 5, 0, 100, 0.04].map(fmtPct)).toEqual(['62.7%', '62%', '10%', '5.0%', '0%', '100%', '0.0%'])
  })

  it('shows a size with three significant digits', () => {
    expect([597.172e6, 999.6e6, 1.5e9, 12_345, 2000, 83].map(fmtBytes)).toEqual(['597 MB', '1 GB', '1.5 GB', '12.3 KB', '2 KB', '83 B'])
    expect(fmtMem(597.172)).toBe('597 MB')
    expect(fmtMem(1234)).toBe('1.23 GB')
  })

  it('shows money with two decimals, four only below one cent', () => {
    expect([343.6428, 1234.5, 0, 0.0034, 0.5, 12].map(fmtMoney)).toEqual(['$343.64', '$1,234.50', '$0.00', '$0.0034', '$0.50', '$12.00'])
  })

  it('shows a plain number with three significant digits', () => {
    expect([83.804, 0.4567, 1234.5, 12, 1_206_000, 0].map(fmtNum)).toEqual(['83.8', '0.457', '1,235', '12', '1,206,000', '0'])
  })

  it('applies the rule to a table cell that has no formatter of its own', () => {
    const field = { id: 'rate', label: 'Rate', read: (row: number) => row }
    expect([83.804, 1234.5678, 7].map(row => formatField(field, row))).toEqual(['83.8', '1,235', '7'])
  })

  it('applies the rule to every value the panels present', () => {
    const ctx = { metadata: (key: string) => ({ unit: key }) } as unknown as PanelContext
    const show = (unit: string, value: number) => presentation(ctx, { path: unit, label: unit }).format(value)
    expect(show('usd', 343.6428)).toBe('$343.64')
    expect(show('percent', 62.652)).toBe('62.7%')
    expect(show('ratio', 0.62652)).toBe('62.7%')
    expect(show('bytes', 597.172e6)).toBe('597 MB')
    expect(show('seconds', 1206.2)).toBe('20 min')
    expect(show('seconds', 0.2)).toBe('200 ms')
    expect(show('count', 83.804)).toBe('83.8')
  })
})
