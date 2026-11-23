import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { previousText } from '../../../src/panels/overview/kpiCompare'

// Local times, so the expected dates do not depend on the test machine's time zone.
const t = (iso: string) => new Date(iso).getTime() / 1000
const prev = (covered: boolean, dataSince: number | null) => ({
  messages: 307, tokens: 26_819_716, cost_usd: 0.94, tool_calls: 82,
  since: t('2026-11-21T17:00:00'), until: t('2026-11-22T17:00:00'), data_since: dataSince, covered,
})

describe('KPI-PREV-10 · the comparison with the period before', () => {
  it('gives no percentage when the store does not cover the period before, and says since when it collects', () => {
    // 11,711 messages against 307 read "+3715% vs before" while the node collected only from Nov 23.
    const said = previousText(prev(false, t('2026-11-23T05:12:00')), 307, 11_711)!
    expect(said.text).toBe('collected since Nov 23')
    expect(said.text).not.toMatch(/%/)
    expect(said.title).toMatch(/^Period before: Nov 21, 5:00\sPM – Nov 22, 5:00\sPM\. Collected data starts Nov 23, 5:12\sAM\.$/)
  })

  it('compares a covered period and names it on hover', () => {
    const said = previousText(prev(true, t('2026-11-01T00:00:00')), 307, 614)!
    expect(said.text).toBe('+100% vs before')
    expect(said.title).toMatch(/^Compared with Nov 21, 5:00\sPM – Nov 22, 5:00\sPM$/)
  })

  it('says nothing when it knows neither a comparison nor a start of collection', () => {
    expect(previousText(prev(false, null), 307, 614)).toBeUndefined()
    expect(previousText(prev(true, t('2026-11-01T00:00:00')), null, 614)).toBeUndefined()
    expect(previousText(prev(true, t('2026-11-01T00:00:00')), 0, 614)).toBeUndefined()
    expect(previousText(undefined, 307, 614)).toBeUndefined()
  })

  it('is the only source of a "vs before" text in the board', () => {
    const root = join(__dirname, '../../../src')
    const owners: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(path) && readFileSync(path, 'utf8').includes('vs before')) owners.push(relative(root, path))
      }
    }
    walk(root)
    expect(owners).toEqual(['panels/overview/kpiCompare.ts'])
  })
})
