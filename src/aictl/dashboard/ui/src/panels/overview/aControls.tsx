import { For, Show, type Accessor } from 'solid-js'
import { Segmented } from '../../ui/Segmented'
import { presentation, scalar } from '../kinds/model'
import type { FieldRef, PanelContext } from '../types'
import { missing } from './aFields'
import css from './overviewA.module.css'

export function Choice<T extends string>(props: {
  label: string; items: readonly (readonly [T, string])[]; value: Accessor<T>; change: (value: T) => void
}) {
  return <div class={css.controls}><Segmented label={props.label}
    options={props.items.map(([id, label]) => ({ id, label }))} value={props.value()} onChange={id => props.change(id as T)} /></div>
}

export function Measures(props: { ctx: PanelContext; items: readonly { field: FieldRef; value: unknown; detail?: string }[] }) {
  return <dl class={css.measures}><For each={props.items} keyed={item => item.field.path}>{item => {
    const meta = () => presentation(props.ctx, item().field)
    const value = () => scalar(item().value)
    return <div><dt>{meta().label}</dt><dd>{value() === undefined ? missing : meta().format(value()!)}
      <Show when={item().detail}> · {item().detail}</Show></dd></div>
  }}</For></dl>
}
