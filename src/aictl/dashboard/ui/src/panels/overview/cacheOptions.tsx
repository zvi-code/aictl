import type { PanelProps } from '../types'
import { Measures } from './aControls'
import { field } from './aFields'

export function cacheOptions({ ctx }: PanelProps) {
  return { summary: <Measures ctx={ctx} items={[
    { field: field('cached_share', 'Cached share', 'board.kpi.cached_share'), value: ctx.board('kpis')?.cached_share },
    { field: field('saved_usd', 'Estimated cache savings', 'board.saved_usd'),
      value: ctx.board('saved_usd'), detail: 'Extra cache-write cost is not deducted' },
  ]} /> }
}
