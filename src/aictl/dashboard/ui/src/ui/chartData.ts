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
