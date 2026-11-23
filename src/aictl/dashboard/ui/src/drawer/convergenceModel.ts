import { requestRange, type SessionConvergence, type StripCell } from '../panels/overview/b/patternsModel'

/**
 * The bars of a strip that hold a repeated call or a retry, so the strip shows what the totals count. A run of three
 * or more identical calls, or of two or more retries, has a mark of its own; a smaller repeat is marked on its own bar.
 */
export function singleMarks(cells: readonly StripCell[], covered: { repeat: ReadonlySet<number>; retry: ReadonlySet<number> }) {
  const marks: { kind: 'repeat' | 'retry'; bin: number; text: string }[] = []
  cells.forEach((cell, bin) => {
    if (cell.repeats > 0 && !covered.repeat.has(bin))
      marks.push({ kind: 'repeat', bin, text: `${cell.repeats} repeated ${cell.repeats === 1 ? 'call' : 'calls'} in ${requestRange(cell.first, cell.last)}` })
    if (cell.retries > 0 && !covered.retry.has(bin))
      marks.push({ kind: 'retry', bin, text: `${cell.retries} ${cell.retries === 1 ? 'retry' : 'retries'} after an error in ${requestRange(cell.first, cell.last)}` })
  })
  return marks
}

const count = (value: number | null | undefined, one: string, many: string) => value == null ? undefined : `${value} ${value === 1 ? one : many}`

/**
 * What the repeat and retry totals count, and how many of them reach the size the lists below show: a run of three or more
 * identical calls, or of two or more retries. The totals and the lists read the same requests.
 */
export function repeatFigures(data: Pick<SessionConvergence, 'summary' | 'clusters_total' | 'retry_runs_total'>) {
  const repeats = data.summary.repeats, retries = data.summary.retries
  return {
    repeats: { value: repeats, detail: count(data.clusters_total, 'run of 3 or more identical calls', 'runs of 3 or more identical calls') },
    retries: { value: retries, detail: count(data.retry_runs_total, 'run of 2 or more retries', 'runs of 2 or more retries') },
    noRepeatRun: repeats ? `${count(repeats, 'call repeated', 'calls repeated')} an earlier call, none 3 or more times.` : 'No call repeated an earlier call.',
    noRetryRun: retries ? `${count(retries, 'retry', 'retries')} after an error, no run of 2 or more.` : 'No retries after errors.',
  }
}
