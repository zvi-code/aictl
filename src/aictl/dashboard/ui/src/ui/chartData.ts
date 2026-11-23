import type uPlot from 'uplot'

export type ChartPoint = { x: number; values: readonly (number | null | undefined)[] }

export function alignChartData(points: readonly ChartPoint[], seriesCount: number): uPlot.AlignedData {
  const byX = new Map<number, ChartPoint['values']>()
  for (const point of points) {
    if (Number.isFinite(point.x)) byX.set(point.x, point.values)
  }
  const xs = [...byX.keys()].sort((a, b) => a - b)
  const series = Array.from({ length: seriesCount }, (_, column) => xs.map(x => {
    const value = byX.get(x)?.[column]
    return value != null && Number.isFinite(value) ? value : null
  }))
  return [xs, ...series]
}

// uPlot pads a flat series by a sliver of its own value, which gives an axis such as
// 16.5-17 with repeated labels. A flat or single-value series gets a range from zero.
export function flatRange(min: number | null, max: number | null): [number, number] | null {
  if (min == null || max == null || min !== max) return null
  if (min === 0) return [0, 1]
  return min > 0 ? [0, min * 1.5] : [min * 1.5, 0]
}

// Values with no neighbour on either side draw no line, so they are drawn as points.
export function isolatedIndices(values: readonly (number | null | undefined)[]): number[] {
  const has = (i: number) => values[i] != null
  return values.flatMap((_, i) => has(i) && !has(i - 1) && !has(i + 1) ? [i] : [])
}

// The x values of a category chart are 1, 2, 3 ...; a tick between two of them has no name.
// A name that does not fit its slot is cut and ends in an ellipsis (the full name is the hover title).
export function categoryLabels(names: readonly string[], xs: readonly number[], slotPx: number, charPx: number): string[] {
  const fit = Math.max(2, Math.floor(slotPx / charPx))
  return xs.map(x => {
    const name = Number.isInteger(x) ? names[x - 1] : undefined
    if (name == null) return ''
    return name.length <= fit ? name : `${name.slice(0, fit - 1)}…`
  })
}

const compact = (digits: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumSignificantDigits: digits })
const fixed = (digits: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })

// One label per tick, with only the digits that tell neighbouring ticks apart.
export function tickLabels(ticks: readonly number[], unit = ''): string[] {
  const steps = ticks.slice(1).map((tick, i) => Math.abs(tick - ticks[i])).filter(step => step > 0)
  const step = steps.length ? Math.min(...steps) : 1
  const decimals = step < 1 ? Math.min(6, Math.ceil(-Math.log10(step) - 1e-9)) : 0
  const labels = (format: (tick: number) => string) => ticks.map(tick => `${format(tick)}${unit}`)
  let result = decimals ? labels(tick => fixed(decimals).format(tick)) : labels(tick => compact(3).format(tick))
  for (let digits = 4; digits <= 8 && new Set(result).size < ticks.length; digits++) {
    result = labels(tick => compact(digits).format(tick))
  }
  return result
}
