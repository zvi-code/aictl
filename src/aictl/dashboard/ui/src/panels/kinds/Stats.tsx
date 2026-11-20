import { createMemo, For, untrack } from 'solid-js'
import { Stat } from '../../ui/Stat'
import { at } from '../data'
import type { PanelProps } from '../types'
import { presentation, scalar } from './model'
import { States } from './States'
import styles from './kinds.module.css'

export default function Stats(props: PanelProps) {
  const { ctx, def } = untrack(() => props)
  const result = createMemo(() => ctx.read(def.sources[0]))
  return <States result={result} empty={def.empty} retry={ctx.refresh} reserveStaleSpace>
    <div class={styles.stats}><For each={def.columns}>{field => {
      const display = () => presentation(ctx, field)
      const value = () => scalar(at(result().value, field.path))
      return <Stat label={display().label} value={value() == null ? null : display().format(value()!)} />
    }}</For></div>
  </States>
}
