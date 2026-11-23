type Row = { x: number; values: readonly (number | null)[] }

// Counts, tokens and money add up over a range. A share, a gauge or a duration does
// not: ten buckets of 60 % are 60 %, not 600 %.
const averaged = new Set(['percent', 'ratio', 'seconds', 'bytes', 'rate_bps'])
export const aggregateFor = (unit: string | undefined) => unit !== undefined && averaged.has(unit) ? 'mean' : 'sum'

/** One value per column over the whole range, or null where no bucket has a value. */
export function rangeValues(rows: readonly Row[], units: readonly (string | undefined)[]): (number | null)[] {
  return units.map((unit, column) => {
    const values = rows.flatMap(row => row.values[column] == null ? [] : [row.values[column] as number])
    if (!values.length) return null
    const total = values.reduce((sum, value) => sum + value, 0)
    return aggregateFor(unit) === 'mean' ? total / values.length : total
  })
}
