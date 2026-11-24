// ─── Labelled bar charts of the Flows, Skills, MCP and Kusto cards: the rows a model builds and the scale ─
// A row is one bar on a shared linear scale: its parts are stacked from 0, each with its own hover text; the value text
// is written beside the bar. A tick marks a second figure of the same row on the same scale (a 95th percentile).

export type BarTone = 'c1' | 'c2' | 'c3' | 'c4' | 'good' | 'bad' | 'muted'
/** `repo`: the part is one repository's share of the bar (repoSplit.ts), filled with that repository's colour instead of
 * `tone`; `key` names the part in the markup. */
export type BarPart = { value: number; tone: BarTone; hover: string; repo?: number; key?: string }
export type BarRow = {
  key: string; name: string; sub?: string; parts: BarPart[]; text: string; hover: string
  tick?: { value: number; hover: string }
}
export type BarLegend = { tone: BarTone; label: string }[]

/** The top of the shared scale: the largest stacked total or tick of the rows. */
export const barTop = (rows: readonly BarRow[]) => Math.max(0, ...rows.map(row =>
  Math.max(row.parts.reduce((sum, part) => sum + Math.max(0, part.value), 0), row.tick?.value ?? 0)))

/** The axis line under a chart: what the bar length measures and the range of the linear scale. */
export const axisText = (measure: string, top: string) => `Bar length: ${measure}, linear scale from 0 to ${top}.`

const width = (value: number, top: number) => top > 0 ? Math.max(0, value) / top * 100 : 0
/** The parts of a row placed on a 0 to 100 scale, each from where the one before it ends; parts of 0 are left out. */
export function placeParts(row: BarRow, top: number) {
  let start = 0
  return row.parts.flatMap(part => {
    const w = width(part.value, top)
    const placed = { ...part, x: start, width: Math.max(0.6, w) }
    start += w
    return part.value > 0 ? [placed] : []
  })
}
export const tickAt = (row: BarRow, top: number) => row.tick ? width(row.tick.value, top) : null
