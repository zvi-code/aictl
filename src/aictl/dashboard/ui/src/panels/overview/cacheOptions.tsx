import type { PanelProps } from '../types'
import { Measures } from './aControls'
import { field } from './aFields'
import { usageSplit } from './usageSplit'

/** The cache hit rate of each group (cached input over all its input per bucket; a gap where it had too
 * little input), drawn after the rate of all input. */
export function cacheOptions({ ctx, def }: PanelProps) {
  const { read, columns, controls } = usageSplit(ctx, { source: def.sources[1], measure: 'cached_share',
    datapoint: 'board.series.cache_rate', label: 'Split cache hit rate by',
    lead: { field: field('all', 'All input', 'board.series.cache_rate'), values: () => ctx.read(def.sources[0]).value } })
  return { read, columns, controls, summary: <Measures ctx={ctx} items={[
    { field: field('cached_share', 'Cached share', 'board.kpi.cached_share'), value: ctx.board('kpis')?.cached_share },
    { field: field('saved_usd', 'Estimated cache savings', 'board.saved_usd'),
      value: ctx.board('saved_usd'), detail: 'Extra cache-write cost is not deducted' },
  ]} /> }
}
