import { expect, it } from 'vitest'
import { sections } from '../src/panels/layout'
import { overviewA } from '../src/panels/overview/a'
import { overviewB } from '../src/panels/overview/b'

// Panels of kind "custom" that draw a chart of their own.
const customCharts = new Set(['cpu'])

it('CHART-BAND · every chart band on the board has a fixed height', () => {
  const defs = new Map([...overviewA, ...overviewB].map(def => [def.id, def]))
  const bands = sections.board.flatMap(section => section.bands.flat())
  const charts = bands.filter(({ id }) => defs.get(id)?.kind === 'chart' || customCharts.has(id))
  expect(charts.map(({ id }) => id)).toEqual(expect.arrayContaining(['tokens', 'cost', 'cpu', 'ram']))
  expect(charts.filter(({ height }) => !Number.isInteger(height)).map(({ id }) => id)).toEqual([])
})
